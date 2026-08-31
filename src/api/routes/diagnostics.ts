import { Router, Request, Response } from 'express';
import { getDbCommand } from '../db.js';

const router = Router();

/**
 * @route GET /health
 * @desc Liveness probe. Returns 200 if the HTTP server is up.
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @route GET /ready
 * @desc Readiness probe. Checks underlying dependencies like MongoDB.
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const db = getDbCommand();
    if (!db) {
      throw new Error('Database connection is not initialized');
    }
    
    // Attempt a lightweight ping or command to ensure DB is responsive
    if (typeof db.command === 'function') {
      await db.command({ ping: 1 });
    }

    res.status(200).json({ 
      status: 'ready', 
      db: 'connected', 
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error('[Diagnostics] Readiness probe failed:', error.message);
    res.status(503).json({ 
      status: 'error', 
      message: 'Service dependencies are not ready', 
      error: error.message 
    });
  }
});

export default router;
