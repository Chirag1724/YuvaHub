import { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { isToxic } from '../services/toxicity.js';

/**
 * Express middleware for checking toxicity.
 * Scans req.body.content or req.body.text and rejects flagged content with 400.
 *
 * The heavy lifting (keyword + Gemini classification) lives in the
 * `isToxic` service function; this module only adapts it to Express.
 */
export function createToxicityMiddleware(getGenAI: () => GoogleGenAI | null) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const content = req.body.content || req.body.text;
    if (!content) {
      return next();
    }

    const genAI = getGenAI();
    const toxic = await isToxic(content, genAI);

    if (toxic) {
      return res.status(400).json({
        error: "Your content has been flagged as toxic and cannot be saved."
      });
    }

    next();
  };
}
