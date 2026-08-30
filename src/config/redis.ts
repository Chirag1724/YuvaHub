 feat/hackathon-workspace-sync
import { redisClient as apiRedisClient } from '../api/redis.js';

export const redisClient = apiRedisClient;
export const redis = apiRedisClient;
export default redisClient;

import { redisClient } from '../api/redis.js';

export { redisClient };
export const redis = redisClient;
 main
