import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const SessionStatusSchema = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const AvailabilityStatusSchema = z.enum([
  "open",
  "booked",
  "blocked",
  "cancelled",
]);

export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const VerificationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const ActionItemStatusSchema = z.enum(["open", "in_progress", "done"]);

export type ActionItemStatus = z.infer<typeof ActionItemStatusSchema>;

export const ActionItemPrioritySchema = z.enum(["low", "medium", "high"]);

export type ActionItemPriority = z.infer<typeof ActionItemPrioritySchema>;

export const NoteAuthorRoleSchema = z.enum(["mentor", "student"]);

export type NoteAuthorRole = z.infer<typeof NoteAuthorRoleSchema>;

// ─── Sub-documents ─────────────────────────────────────────────────────────────

export const ActionItemSchema = z.object({
  itemId: z.string(),
  title: z.string().trim().min(1).max(300),
  assignee: z.enum(["mentor", "student", "both"]).default("student"),
  priority: ActionItemPrioritySchema.default("medium"),
  status: ActionItemStatusSchema.default("open"),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

export const SessionNoteSchema = z.object({
  noteId: z.string(),
  authorUid: z.string().trim().min(1),
  authorName: z.string().trim().default("Participant"),
  authorRole: NoteAuthorRoleSchema,
  content: z.string().trim().min(1).max(10000),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SessionNote = z.infer<typeof SessionNoteSchema>;

export const SessionFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(""),
  submittedBy: z.string().trim().min(1),
  submittedAt: z.coerce.date(),
});

export type SessionFeedback = z.infer<typeof SessionFeedbackSchema>;

export const StatusHistoryEntrySchema = z.object({
  status: SessionStatusSchema,
  at: z.coerce.date(),
  by: z.string().trim().min(1),
});

export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>;

// ─── Documents ────────────────────────────────────────────────────────────────

export const AvailabilitySlotSchema = z.object({
  _id: z.string().optional(),
  mentorUid: z.string().trim().min(1),
  mentorName: z.string().trim().default("YuvaHub Mentor"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:mm (24h)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:mm (24h)"),
  timezone: z.string().trim().default("Asia/Kolkata"),
  status: AvailabilityStatusSchema.default("open"),
  sessionId: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

export const MentorProfileSchema = z.object({
  mentorUid: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().default(""),
  avatarUrl: z.string().trim().default(""),
  company: z.string().trim().max(120).default(""),
  role: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  experienceYears: z.number().int().min(0).max(60).default(0),
  headline: z.string().trim().max(200).default(""),
  bio: z.string().trim().max(4000).default(""),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  domains: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  timezone: z.string().trim().default("Asia/Kolkata"),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  verificationStatus: VerificationStatusSchema.default("pending"),
  isActive: z.boolean().default(true),
  stats: z
    .object({
      sessionsCompleted: z.number().int().min(0).default(0),
      totalHoursMentored: z.number().min(0).default(0),
      avgRating: z.number().min(0).max(5).default(0),
      totalRatings: z.number().int().min(0).default(0),
    })
    .default({
      sessionsCompleted: 0,
      totalHoursMentored: 0,
      avgRating: 0,
      totalRatings: 0,
    }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  approvedAt: z.coerce.date().optional(),
});

export type MentorProfile = z.infer<typeof MentorProfileSchema>;

export const MentorshipSessionSchema = z.object({
  _id: z.string().optional(),
  sessionId: z.string().trim().min(1),
  mentorUid: z.string().trim().min(1),
  mentorName: z.string().trim().min(1),
  mentorCompany: z.string().trim().default(""),
  studentUid: z.string().trim().min(1),
  studentName: z.string().trim().default("Student"),
  topic: z.string().trim().min(1).max(300),
  agenda: z.string().trim().max(4000).default(""),
  slot: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().trim().default("Asia/Kolkata"),
  }),
  slotDateTime: z.string().default(""),
  meetingUrl: z.string().trim().url().default(""),
  status: SessionStatusSchema.default("pending"),
  statusHistory: z.array(StatusHistoryEntrySchema).default([]),
  notes: z.array(SessionNoteSchema).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  feedback: SessionFeedbackSchema.optional(),
  reminderTimestamps: z
    .object({
      t24hSent: z.coerce.date().optional(),
      t1hSent: z.coerce.date().optional(),
      feedbackRequestSent: z.coerce.date().optional(),
    })
    .default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MentorshipSession = z.infer<typeof MentorshipSessionSchema>;

export const MentorApplicationSchema = z.object({
  applicationId: z.string().trim().min(1),
  applicantUid: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  avatarUrl: z.string().trim().default(""),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  collegeCompany: z.string().trim().max(160).default(""),
  field: z.string().trim().max(120).default(""),
  experienceYears: z.number().int().min(0).max(60),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  availability: z.array(z.string().trim()).max(20).default([]),
  whyMentor: z.string().trim().min(10).max(4000),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  reviewedBy: z.string().optional(),
  reviewedAt: z.coerce.date().optional(),
  reviewNote: z.string().trim().max(2000).default(""),
  createdAt: z.coerce.date(),
});

export type MentorApplication = z.infer<typeof MentorApplicationSchema>;

// ─── Input schemas (used with validateRequest middleware) ─────────────────────

export const BookSessionInputSchema = z.object({
  mentorUid: z.string().trim().min(1),
  slotId: z.string().trim().min(1),
  topic: z.string().trim().min(1).max(300),
  agenda: z.string().trim().max(4000).optional(),
  studentName: z.string().trim().max(120).optional(),
});

export const CreateAvailabilityInputSchema = z.object({
  slots: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:mm (24h)"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:mm (24h)"),
        timezone: z.string().trim().optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const UpdateAvailabilityInputSchema = z.object({
  status: z.enum(["open", "blocked", "cancelled"]).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const UpdateSessionStatusInputSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  status: SessionStatusSchema,
});

export const AddNoteInputSchema = z.object({
  content: z.string().trim().min(1).max(10000),
});

export const UpdateNoteInputSchema = z.object({
  content: z.string().trim().min(1).max(10000),
});

export const AddActionItemInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  assignee: z.enum(["mentor", "student", "both"]).optional(),
  priority: ActionItemPrioritySchema.optional(),
});

export const UpdateActionItemInputSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  status: ActionItemStatusSchema.optional(),
  priority: ActionItemPrioritySchema.optional(),
});

export const FeedbackInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const MentorProfileInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  headline: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(4000).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  domains: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  timezone: z.string().trim().optional(),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const MentorApplicationInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  collegeCompany: z.string().trim().max(160).optional(),
  field: z.string().trim().max(120).optional(),
  experienceYears: z.number().int().min(0).max(60),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  availability: z.array(z.string().trim()).max(20).optional(),
  whyMentor: z.string().trim().min(10).max(4000),
});

export const ReviewApplicationInputSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().max(2000).optional(),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic, collision-resistant local id (prefix + timestamp + random suffix). */
export function generateMentorshipId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
