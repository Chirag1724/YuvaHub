import { Router } from "express";
import { getLeaderboard } from "../controllers/leaderboardController.js";

const router = Router();

router.get("/leaderboard", getLeaderboard);

export default router;
