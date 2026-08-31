import { Router } from "express";
import { z } from "zod";
import {
  bookSessionHandler,
  getMentorAvailability,
  getSessions,
  updateSessionStatus,
} from "../controllers/mentorshipController.js";
import {
  addActionItem,
  addNote,
  applyToBecomeMentorHandler,
  createAvailability,
  getAnalyticsHandler,
  getMentorDetailHandler,
  getMyApplication,
  getMyAvailability,
  getMyProfile,
  getSessionDetail,
  listApplications,
  listMentors,
  removeAvailabilitySlot,
  removeNote,
  reviewApplicationHandler,
  submitFeedback,
  updateActionItem,
  updateMyProfile,
  updateNote,
  updateSessionStatusById,
} from "../controllers/mentorStudioController.js";
import { adminOnly, authMiddleware } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";
import {
  AddActionItemInputSchema,
  AddNoteInputSchema,
  BookSessionInputSchema,
  CreateAvailabilityInputSchema,
  FeedbackInputSchema,
  MentorApplicationInputSchema,
  MentorProfileInputSchema,
  UpdateActionItemInputSchema,
  UpdateNoteInputSchema,
  UpdateSessionStatusInputSchema,
} from "../../models/mentorshipSchema.js";

const router = Router();

// --- Advisory Board / public discovery ---
router.get("/mentors", cacheMiddleware(300), listMentors);
router.get("/mentors/:uid", cacheMiddleware(3600, (req: any) => `mentor:${req.params.uid}`), getMentorDetailHandler);

// --- Legacy compatibility ---
router.get("/mentorship/availability", getMentorAvailability);
router.post(
  "/mentorship/book",
  authMiddleware,
  validateRequest(z.object({ body: BookSessionInputSchema })),
  bookSessionHandler,
);
router.get("/mentorship/sessions", authMiddleware, getSessions);
router.patch(
  "/mentorship/sessions/status",
  authMiddleware,
  validateRequest(z.object({ body: UpdateSessionStatusInputSchema })),
  updateSessionStatus,
);

// --- Mentor Studio: profile & availability ---
router.get("/mentor-studio/profile", authMiddleware, getMyProfile);
router.put(
  "/mentor-studio/profile",
  authMiddleware,
  validateRequest(z.object({ body: MentorProfileInputSchema })),
  updateMyProfile,
);
router.get("/mentor-studio/availability", authMiddleware, getMyAvailability);
router.post(
  "/mentor-studio/availability",
  authMiddleware,
  validateRequest(z.object({ body: CreateAvailabilityInputSchema })),
  createAvailability,
);
router.delete("/mentor-studio/availability/:slotId", authMiddleware, removeAvailabilitySlot);

// --- Sessions ---
router.get("/mentor-studio/sessions/:id", authMiddleware, getSessionDetail);
router.patch(
  "/mentor-studio/sessions/:id/status",
  authMiddleware,
  validateRequest(z.object({ body: UpdateSessionStatusInputSchema })),
  updateSessionStatusById,
);
router.post(
  "/mentor-studio/sessions/:id/notes",
  authMiddleware,
  validateRequest(z.object({ body: AddNoteInputSchema })),
  addNote,
);
router.put(
  "/mentor-studio/sessions/:id/notes/:noteId",
  authMiddleware,
  validateRequest(z.object({ body: UpdateNoteInputSchema })),
  updateNote,
);
router.delete("/mentor-studio/sessions/:id/notes/:noteId", authMiddleware, removeNote);
router.post(
  "/mentor-studio/sessions/:id/action-items",
  authMiddleware,
  validateRequest(z.object({ body: AddActionItemInputSchema })),
  addActionItem,
);
router.put(
  "/mentor-studio/sessions/:id/action-items/:actionId",
  authMiddleware,
  validateRequest(z.object({ body: UpdateActionItemInputSchema })),
  updateActionItem,
);
router.post(
  "/mentor-studio/sessions/:id/feedback",
  authMiddleware,
  validateRequest(z.object({ body: FeedbackInputSchema })),
  submitFeedback,
);

// --- Analytics ---
router.get("/mentor-studio/analytics", authMiddleware, getAnalyticsHandler);

// --- Become a mentor ---
router.post(
  "/mentor-applications",
  authMiddleware,
  validateRequest(z.object({ body: MentorApplicationInputSchema })),
  applyToBecomeMentorHandler,
);
router.get("/mentor-applications/me", authMiddleware, getMyApplication);
router.get("/mentor-applications", authMiddleware, adminOnly, listApplications);
router.patch(
  "/mentor-applications/:applicationId/review",
  authMiddleware,
  adminOnly,
  validateRequest(
    z.object({
      body: z.object({
        decision: z.enum(["approved", "rejected"]),
        reviewNote: z.string().optional(),
      }),
    }),
  ),
  reviewApplicationHandler,
);

export default router;
