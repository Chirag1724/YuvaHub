import { Request, Response } from "express";
import { dbQuery } from "../db.js";
import { sendSuccess, sendError } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/AppError.js";

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    if (!dbQuery) {
      throw AppError.serviceUnavailable("Database not available");
    }

    // Fetch top 50 users sorted by points descending
    const topUsers = await dbQuery
      .collection("users")
      .find(
        { points: { $exists: true, $gt: 0 } },
        { projection: { uid: 1, name: 1, avatarUrl: 1, points: 1, badges: 1 } }
      )
      .sort({ points: -1 })
      .limit(50)
      .toArray();

    return sendSuccess(res, { leaderboard: topUsers });
  } catch (err: any) {
    console.error("Fetch Leaderboard Error:", err);
    return sendError(res, "Internal Server Error", 500);
  }
};
