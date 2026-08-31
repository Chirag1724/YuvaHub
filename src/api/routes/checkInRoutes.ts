import { Router } from "express";
import { checkInAttendee, getCheckInStats } from "../controllers/checkInController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// Check in an attendee by scanning QR code (organizer-only)
router.post("/events/:eventId/checkin", authMiddleware, checkInAttendee);

// Get live check-in statistics for an event (organizer-only)
router.get("/events/:eventId/checkin-stats", authMiddleware, getCheckInStats);

export default router;
