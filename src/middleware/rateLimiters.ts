import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";

/**
 * Shared Redis client used to back the rate-limit counters.
 *
 * The client is created lazily-tolerant: if Redis is unreachable the app keeps
 * running and the rate limiters "fail open" (see `createFailOpenStore`).
 */
let redisClient: Redis;
try {
  redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      return Math.min(times * 50, 2000);
    }
  });

  let redisErrorLogged = false;
  redisClient.on('error', (err) => {
    if (!redisErrorLogged) {
      console.warn('[Redis] Connection failed or Redis is not running. Bypassing rate limiting (fail-open mode).');
      redisErrorLogged = true;
    }
  });
  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully');
    redisErrorLogged = false;
  });
} catch (e: any) {
  console.error('[Redis] Init error:', e.message);
}

export { redisClient };

/**
 * Builds a Redis-backed rate-limit store that "fails open" when Redis is
 * unavailable: instead of throwing (and blocking every request), it returns a
 * synthetic low hit count so traffic is allowed through. Availability is
 * preferred over strict limiting when the counter store is down.
 */
export const createFailOpenStore = (prefix: string) => {
  const store = new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return redisClient.call(command, ...commandArgs) as Promise<any>;
    },
    prefix: prefix,
  });

  return {
    ...store,
    increment: async (key: string) => {
      if (!redisClient || redisClient.status !== 'ready') {
        console.error(`[RateLimit] Redis disconnected. Failing open for key: ${key}`);
        return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
      }
      try {
        return await store.increment(key);
      } catch (err: any) {
        console.error(`[RateLimit] Redis error. Failing open for key: ${key}`);
        return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
      }
    },
    decrement: async (key: string) => {
      if (!redisClient || redisClient.status !== 'ready') return;
      try { return await store.decrement(key); } catch(e) {}
    },
    resetKey: async (key: string) => {
      if (!redisClient || redisClient.status !== 'ready') return;
      try { return await store.resetKey(key); } catch(e) {}
    },
  };
};

/** Rate limiter for resume review endpoints: 5 requests / 15 minutes. */
export const resumeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: true,
  validate: false,
  store: createFailOpenStore('rate-limit:ai-resume:'),
  message: { error: "Too many resume review requests. Please try again later." }
});

/** Rate limiter for AI generation endpoints: 30 requests / minute, keyed by userId. */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: true,
  validate: false,
  store: createFailOpenStore('rate-limit:ai-chat:'),
  keyGenerator: (req) => {
    return req.body?.userId || req.ip || "unknown";
  },
  message: { error: "Too many AI generation requests. Please try again after a minute." }
});
