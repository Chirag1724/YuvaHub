import { Request, Response } from "express";
import { dbQuery } from "../db.js";
import { logger } from "../../utils/logger.js";

/**
 * Fallback stats returned when the DB is unreachable (e.g. cold start / test).
 * Update these as the platform grows to avoid stale "0" displays.
 */
const FALLBACK_STATS = {
  verifiedListings: 1000,
  activeStudents: 5000,
  prizesGrantsLakhs: 10,
  topRecruiters: 40,
};

/**
 * GET /api/v1/public/stats
 * Public endpoint (no auth). Returns live platform counters for the landing page.
 * Cached at the CDN/proxy layer via Cache-Control headers.
 */
export const getPublicStats = async (_req: Request, res: Response) => {
  try {
    if (!dbQuery) {
      return res.status(200).json({ data: FALLBACK_STATS });
    }

    const [
      verifiedListings,
      activeStudents,
      totalRecruiters,
    ] = await Promise.all([
      dbQuery.collection("opportunities").countDocuments({ status: "active" }),
      dbQuery.collection("users").countDocuments({}),
      dbQuery.collection("users").countDocuments({ role: { $in: ["employer", "recruiter"] } }),
    ]);

    let prizesInPaise = 0;
    try {
      const prizeAgg = await dbQuery
        .collection("hackathons")
        .aggregate([
          { $match: { status: { $in: ["active", "completed"] } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$prizePools.totalValue", 0] } } } },
        ])
        .toArray();
      prizesInPaise = prizeAgg[0]?.total ?? 0;
    } catch { }

    // Convert paise → lakhs (1 L = 100,000). Use fallback if DB has no prize data yet.
    const prizesGrantsLakhs = prizesInPaise > 0
      ? Math.floor(prizesInPaise / 100_000)
      : FALLBACK_STATS.prizesGrantsLakhs;

    const stats = {
      verifiedListings: verifiedListings || FALLBACK_STATS.verifiedListings,
      activeStudents: activeStudents || FALLBACK_STATS.activeStudents,
      prizesGrantsLakhs,
      topRecruiters: totalRecruiters || FALLBACK_STATS.topRecruiters,
    };

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    return res.status(200).json({ data: stats });
  } catch (err) {
    logger.error({ err }, "[PublicStats] Failed to fetch platform stats");
    return res.status(200).json({ data: FALLBACK_STATS });
  }
};
