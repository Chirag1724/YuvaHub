import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request to include a request ID
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate or propagate request ID
  req.id = req.headers['x-request-id'] as string || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Structured JSON log for observability platforms
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
      timestamp: new Date().toISOString()
    }));
  });

  next();
};
