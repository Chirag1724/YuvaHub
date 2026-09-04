import { Router } from "express";
import { getPublicStats } from "../controllers/publicStatsController.js";

const router = Router();

/**
 * GET /api/v1/public/stats
 * No authentication required — used by the public landing page.
 */
router.get("/public/stats", getPublicStats);

export default router;
