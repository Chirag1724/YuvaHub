import { Request, Response, NextFunction } from "express";
import { dbCommand } from "../db.js";

const POINT_VALUES: Record<string, number> = {
  create_post: 20,
  reply_forum: 10,
  share_resource: 15,
  review_resume: 15,
  upvote_received: 5,
};

const BADGE_THRESHOLDS = [
  { threshold: 50, badge: "Rising Star 🌟" },
  { threshold: 150, badge: "Top Helper 🏅" },
  { threshold: 500, badge: "Community Legend 👑" },
];

export const rewardPoints = (actionType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", async () => {
      // Only reward points if the request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Identify user. In this system, user info might be in req.user
          const userId = req.user?.uid;
          if (!userId || !dbCommand) return;

          const amount = POINT_VALUES[actionType] || 5;

          // Record the transaction
          await dbCommand.collection("point_transactions").insertOne({
            userId,
            amount,
            actionType,
            timestamp: new Date(),
          });

          // Fetch the user to check their current points and badges
          const user = await dbCommand.collection("users").findOne({ uid: userId });
          const currentPoints = (user?.points || 0) + amount;
          const currentBadges: string[] = user?.badges || [];
          
          let newBadges: string[] = [];
          
          // Check for new badges
          for (const level of BADGE_THRESHOLDS) {
            if (currentPoints >= level.threshold && !currentBadges.includes(level.badge)) {
              newBadges.push(level.badge);
            }
          }

          const updatePayload: any = {
            $inc: { points: amount },
          };

          if (newBadges.length > 0) {
            updatePayload.$push = { badges: { $each: newBadges } };
          }

          await dbCommand.collection("users").updateOne(
            { uid: userId },
            updatePayload
          );

        } catch (error) {
          console.error(`[Gamification] Failed to reward points for ${actionType}:`, error);
        }
      }
    });

    next();
  };
};
