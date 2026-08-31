import { dbCommand, dbQuery } from "../api/db.js";
import { getSocketIO } from "../api/socketInstance.js";
import { AppError } from "../lib/AppError.js";
import {
  generateMentorshipId,
  SessionStatus,
  AvailabilitySlot,
  MentorProfile,
  MentorshipSession,
  SessionNote,
  ActionItem,
  MentorApplication,
} from "../models/mentorshipSchema.js";


// ─── Local helpers ─────────────────────────────────────────────────────────────

function assertDb() {
  if (!dbCommand || !dbQuery) {
    throw AppError.serviceUnavailable("Database not available");
  }
}

/** Convert an "HH:MM" local time string to a Date interpreted in IST (UTC+5:30). */
export function localSlotDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

/** Whole-hours duration between two HH:mm strings. */
export function slotDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export function buildSlotDateTime(date: string, startTime: string): string {
  return `${date} at ${startTime} IST`;
}

function toSerializable<T extends { _id?: any }>(doc: T): Omit<T, "_id"> & { id?: string } {
  if (!doc) return doc as any;
  const { _id, ...rest } = doc as any;
  return { ...rest, ...(_id ? { id: String(_id) } : {}) };
}

// ─── Notifications ─────────────────────────────────────────────────────────────

/** Resolve a user's email address for direct email delivery. */
export async function getUserEmail(uid: string): Promise<string | undefined> {
  try {
    if (!dbQuery) return undefined;
    const user = await dbQuery
      .collection("users")
      .findOne({ $or: [{ uid }, { firebaseUid: uid }] });
    const email = user && typeof user.email === "string" ? user.email.trim() : "";
    return email || undefined;
  } catch (err) {
    console.error("[Mentorship] getUserEmail error:", err);
    return undefined;
  }
}

/** Best-effort invalidation of the cached `/mentors/:uid` detail response. */
async function invalidateMentorDetailCache(mentorUid: string) {
  try {
    if (process.env.NODE_ENV === "test") return;
    const { cacheDel } = await import("../api/redis.js");
    await cacheDel(`mentor:${mentorUid}`);
  } catch (err) {
    console.warn("[Mentorship] Mentor detail cache invalidation skipped:", err);
  }
}

export async function notifyParticipant(
  uid: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, any>,
) {
  try {
    if (!dbCommand) return;
    const notifDoc = {
      userId: uid,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      metadata: metadata || {},
    };
    const insertResult = await dbCommand.collection("notifications").insertOne(notifDoc);
    const inserted = { ...notifDoc, id: insertResult?.insertedId?.toString?.() || "mock_id" };
    const io = getSocketIO();
    if (io) io.to(uid).emit("notification", inserted);
  } catch (err) {
    console.error("[Mentorship] Notification dispatch error:", err);
  }
}

// ─── Mentor profiles ───────────────────────────────────────────────────────────

export async function isMentor(uid: string): Promise<boolean> {
  if (!dbQuery) return false;
  const profile = await dbQuery
    .collection("mentor_profiles")
    .findOne({ mentorUid: uid, verificationStatus: "approved", isActive: true });
  return Boolean(profile);
}

export async function listMentorProfiles(params: {
  search?: string;
  skills?: string[];
  page?: number;
  limit?: number;
} = {}) {
  if (!dbQuery) return { profiles: [], total: 0, page: 1, limit: 20 };
  const { search, skills, page = 1, limit = 20 } = params;
  const filter: any = { verificationStatus: "approved", isActive: true };
  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { company: re }, { role: re }, { headline: re }, { skills: re }];
  }
  if (skills && skills.length > 0) {
    filter.skills = { $in: skills.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) };
  }
  const skip = (page - 1) * limit;
  const [profiles, total] = await Promise.all([
    dbQuery
      .collection("mentor_profiles")
      .find(filter)
      .sort({ "stats.sessionsCompleted": -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    dbQuery.collection("mentor_profiles").countDocuments(filter),
  ]);
  return { profiles: profiles.map(toSerializable), total, page, limit };
}

export async function getMentorProfile(mentorUid: string) {
  if (!dbQuery) return null;
  const profile = await dbQuery.collection("mentor_profiles").findOne({ mentorUid });
  return profile ? toSerializable(profile) : null;
}

export async function getMentorDetail(mentorUid: string) {
  if (!dbQuery) throw AppError.notFound("Mentor not found");
  const profile = await dbQuery
    .collection("mentor_profiles")
    .findOne({ mentorUid, verificationStatus: "approved", isActive: true });
  if (!profile) throw AppError.notFound("Mentor not found");
  const today = new Date().toISOString().slice(0, 10);
  const upcomingSlots = await dbQuery
    .collection("mentor_availability")
    .find({ mentorUid, status: "open", date: { $gte: today } })
    .sort({ date: 1, startTime: 1 })
    .limit(20)
    .toArray();
  return {
    profile: toSerializable(profile),
    upcomingSlots: upcomingSlots.map(toSerializable),
  };
}

export async function upsertMentorProfile(mentorUid: string, input: Partial<MentorProfile>) {
  assertDb();
  const existing = await dbCommand.collection("mentor_profiles").findOne({ mentorUid });
  const now = new Date();
  const { _id: _existingId, ...existingDoc } = existing || { mentorUid, createdAt: now };
  const doc = {
    ...existingDoc,
    ...input,
    mentorUid,
    updatedAt: now,
  };
  await dbCommand
    .collection("mentor_profiles")
    .updateOne({ mentorUid }, { $set: doc }, { upsert: true });
  return toSerializable(doc);
}

// ─── Availability / office hours ───────────────────────────────────────────────

export async function listAvailability(params: {
  mentorUid?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  if (!dbQuery) return { slots: [], total: 0, page: 1, limit: 50 };
  const { mentorUid, from, to, status, page = 1, limit = 50 } = params;
  const filter: any = {};
  if (mentorUid) filter.mentorUid = mentorUid;
  if (status) filter.status = status;
  if (from) filter.date = { ...(filter.date || {}), $gte: from };
  if (to) filter.date = { ...(filter.date || {}), $lte: to };
  if (filter.date && (filter.date.$gte || filter.date.$lte) === undefined) delete filter.date;
  const skip = (page - 1) * limit;
  const [slots, total] = await Promise.all([
    dbQuery
      .collection("mentor_availability")
      .find(filter)
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    dbQuery.collection("mentor_availability").countDocuments(filter),
  ]);
  return { slots: slots.map(toSerializable), total, page, limit };
}

export async function bulkCreateAvailability(params: {
  mentorUid: string;
  mentorName?: string;
  slots: { date: string; startTime: string; endTime: string; timezone?: string }[];
}) {
  assertDb();
  const { mentorUid, mentorName = "YuvaHub Mentor", slots } = params;

  const existing = await dbQuery
    .collection("mentor_availability")
    .find({
      mentorUid,
      status: { $in: ["open", "booked"] },
      $or: slots.map((s) => ({ date: s.date })),
    })
    .toArray();

  const conflicts: string[] = [];
  const newSlots: AvailabilitySlot[] = [];

  for (const s of slots) {
    const overlap = existing.some(
      (e: any) =>
        e.date === s.date &&
        e.startTime < s.endTime &&
        s.startTime < e.endTime,
    );
    if (overlap) {
      conflicts.push(`${s.date} ${s.startTime}-${s.endTime}`);
      continue;
    }
    newSlots.push({
      _id: generateMentorshipId("slot"),
      mentorUid,
      mentorName,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      timezone: s.timezone || "Asia/Kolkata",
      status: "open",
      createdAt: new Date(),
    });
  }

  if (newSlots.length > 0) {
    await dbCommand.collection("mentor_availability").insertMany(newSlots);
  }
  invalidateMentorDetailCache(mentorUid).catch(() => {});
  return { created: newSlots.length, conflicts };
}

export async function updateAvailabilitySlot(params: {
  slotId: string;
  mentorUid: string;
  patch: Partial<Pick<AvailabilitySlot, "date" | "startTime" | "endTime" | "status">>;
}) {
  assertDb();
  const { slotId, mentorUid, patch } = params;
  const slot = await dbQuery
    .collection("mentor_availability")
    .findOne({ _id: slotId, mentorUid });
  if (!slot) throw AppError.notFound("Availability slot not found");
  if (slot.status === "booked") {
    const reschedules = Boolean(patch.date || patch.startTime || patch.endTime);
    if (reschedules || (patch.status && patch.status !== "booked")) {
      throw AppError.conflict("Cannot modify a booked slot. Cancel the session first.");
    }
  }
  await dbCommand
    .collection("mentor_availability")
    .updateOne({ _id: slotId }, { $set: { ...patch, mentorUid } });
  invalidateMentorDetailCache(mentorUid).catch(() => {});
  return toSerializable({ ...slot, ...patch });
}

export async function deleteAvailabilitySlot(params: { slotId: string; mentorUid: string }) {
  assertDb();
  const { slotId, mentorUid } = params;
  const slot = await dbQuery
    .collection("mentor_availability")
    .findOne({ _id: slotId, mentorUid });
  if (!slot) throw AppError.notFound("Availability slot not found");
  if (slot.status === "booked") {
    throw AppError.conflict("Cannot delete a booked slot. Cancel the session first.");
  }
  await dbCommand
    .collection("mentor_availability")
    .updateOne({ _id: slotId }, { $set: { status: "cancelled" } });
  invalidateMentorDetailCache(mentorUid).catch(() => {});
  return { slotId, status: "cancelled" };
}

// ─── Booking ───────────────────────────────────────────────────────────────────

export async function bookSession(params: {
  studentUid: string;
  studentName?: string;
  mentorUid: string;
  slotId: string;
  topic: string;
  agenda?: string;
}) {
  assertDb();
  const { studentUid, studentName = "Student", mentorUid, slotId, topic, agenda = "" } = params;

  const mentor = await dbQuery
    .collection("mentor_profiles")
    .findOne({ mentorUid, verificationStatus: "approved", isActive: true });
  if (!mentor) {
    throw AppError.notFound("Mentor not found or not yet approved");
  }
  if (mentorUid === studentUid) {
    throw AppError.badRequest("You cannot book a session with yourself");
  }

  const sessionId = generateMentorshipId("sess");

  // Atomic slot lock: only succeeds if the slot is still open.
  const locked = await dbCommand.collection("mentor_availability").findOneAndUpdate(
    { _id: slotId, mentorUid, status: "open" },
    { $set: { status: "booked", sessionId } },
    { returnDocument: "after" },
  );
  const lockedSlot = locked && (locked.value !== undefined ? locked.value : locked);
  if (!lockedSlot) {
    throw AppError.conflict("This time slot has just been booked. Please select another slot.");
  }

  const now = new Date();
  const slot = {
    date: lockedSlot.date,
    startTime: lockedSlot.startTime,
    endTime: lockedSlot.endTime,
    timezone: lockedSlot.timezone || "Asia/Kolkata",
  };
  const sessionDoc: MentorshipSession = {
    sessionId,
    mentorUid,
    mentorName: lockedSlot.mentorName || mentor.name || "YuvaHub Mentor",
    mentorCompany: mentor.company || "",
    studentUid,
    studentName,
    topic,
    agenda,
    slot,
    slotDateTime: buildSlotDateTime(lockedSlot.date, lockedSlot.startTime),
    meetingUrl: `https://meet.jit.si/yuvahub-mentorship-${sessionId}`,
    status: "pending",
    statusHistory: [{ status: "pending", at: now, by: studentUid }],
    notes: [],
    actionItems: [],
    reminderTimestamps: {},
    createdAt: now,
    updatedAt: now,
  };

  await dbCommand.collection("mentorship_sessions").insertOne({ ...sessionDoc, _id: undefined });

  invalidateMentorDetailCache(mentorUid).catch(() => {});
  await notifyParticipant(
    mentorUid,
    "mentorship_booking",
    "New mentorship request",
    `${studentName} requested a 1-on-1 session on ${sessionDoc.slotDateTime} (${topic}).`,
    { sessionId, studentUid },
  );
  await notifyParticipant(
    studentUid,
    "mentorship_booking",
    "Mentorship request sent",
    `Your session with ${sessionDoc.mentorName} on ${sessionDoc.slotDateTime} is pending mentor confirmation.`,
    { sessionId, mentorUid },
  );

  scheduleSessionReminders(sessionDoc).catch((err) =>
    console.error("[Mentorship] Reminder scheduling error:", err),
  );
  publishMentorshipEvent("SessionBooked", {
    sessionId,
    mentorUid,
    studentUid,
    topic,
    slotDateTime: sessionDoc.slotDateTime,
  });

  return toSerializable(sessionDoc);
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string) {
  if (!dbQuery) return null;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  return session ? toSerializable(session) : null;
}

export async function getSessionLedger(params: {
  uid: string;
  page?: number;
  limit?: number;
  status?: string;
}) {
  if (!dbQuery) return { sessions: [], total: 0, page: 1, limit: 20 };
  const { uid, page = 1, limit = 20, status } = params;
  const filter: any = { $or: [{ studentUid: uid }, { mentorUid: uid }] };
  if (status && status !== "all") filter.status = status;
  const skip = (page - 1) * limit;
  const [sessions, total] = await Promise.all([
    dbQuery
      .collection("mentorship_sessions")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    dbQuery.collection("mentorship_sessions").countDocuments(filter),
  ]);
  return { sessions: sessions.map(toSerializable), total, page, limit };
}

// Allowed status transitions keyed by acting role.
const TRANSITIONS: Record<SessionStatus, Record<"mentor" | "student", SessionStatus[]>> = {
  pending: {
    mentor: ["confirmed", "cancelled"],
    student: ["cancelled"],
  },
  confirmed: {
    mentor: ["in_progress", "cancelled"],
    student: ["cancelled"],
  },
  in_progress: {
    mentor: ["completed", "no_show"],
    student: [],
  },
  completed: { mentor: [], student: [] },
  cancelled: { mentor: [], student: [] },
  no_show: { mentor: [], student: [] },
};

export async function transitionSessionStatus(params: {
  sessionId: string;
  actorUid: string;
  actorRole?: string;
  status: SessionStatus;
}) {
  assertDb();
  const { sessionId, actorUid, status } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");

  const isMentor = session.mentorUid === actorUid;
  const isStudent = session.studentUid === actorUid;
  const isAdmin = ["admin", "superadmin"].includes(params.actorRole || "");
  if (!isMentor && !isStudent && !isAdmin) {
    throw AppError.forbidden("You are not a participant of this session");
  }

  if (status === session.status) return toSerializable(session);

  const role: "mentor" | "student" = isMentor ? "mentor" : "student";
  const allowed = isAdmin
    ? Object.values(TRANSITIONS).flatMap((r) => [...r.mentor, ...r.student])
    : TRANSITIONS[session.status]?.[role] || [];
  if (!allowed.includes(status)) {
    throw AppError.conflict(
      `Cannot transition session from "${session.status}" to "${status}" as ${role}`,
    );
  }

  const now = new Date();
  const updated = await dbCommand
    .collection("mentorship_sessions")
    .findOneAndUpdate(
      { sessionId, status: session.status },
      {
        $set: { status, updatedAt: now },
        $push: { statusHistory: { status, at: now, by: actorUid } },
      },
      { returnDocument: "after" },
    );
  const updatedSession = updated && (updated.value !== undefined ? updated.value : updated);
  if (!updatedSession) {
    throw AppError.conflict(
      `Session status changed concurrently; cannot transition from "${session.status}" to "${status}"`,
    );
  }

  if (status === "confirmed") {
    const other = session.studentUid === actorUid ? session.mentorUid : session.studentUid;
    await notifyParticipant(other, "mentorship_confirmed", "Session confirmed", `Your session ${session.topic} on ${session.slotDateTime} was confirmed.`, { sessionId });
  }
  if (status === "completed") {
    await notifyParticipant(session.studentUid, "mentorship_completed", "Session completed", `Your session with ${session.mentorName} was marked completed. Share feedback in the ledger.`, { sessionId });
    await notifyParticipant(session.mentorUid, "mentorship_completed", "Session completed", `Your session on ${session.topic} was marked completed.`, { sessionId });
    updateMentorStats(session.mentorUid).catch((err) =>
      console.error("[Mentorship] Stats update error:", err),
    );
    enqueueFeedbackRequest({ ...session, status: "completed" }).catch((err) =>
      console.error("[Mentorship] Feedback scheduling error:", err),
    );
    publishMentorshipEvent("SessionCompleted", {
      sessionId,
      mentorUid: session.mentorUid,
      studentUid: session.studentUid,
      topic: session.topic,
    });
  }

  return toSerializable(updatedSession);
}

export async function cancelSessionBySlot(params: { slotId: string; actorUid: string }) {
  assertDb();
  const slot = await dbQuery.collection("mentor_availability").findOne({ _id: params.slotId });
  if (!slot || slot.status !== "booked" || !slot.sessionId) {
    throw AppError.notFound("No booked session found for this slot");
  }
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId: slot.sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== params.actorUid && session.mentorUid !== params.actorUid) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  await transitionSessionStatus({ sessionId: slot.sessionId, actorUid: params.actorUid, status: "cancelled" });
  await dbCommand
    .collection("mentor_availability")
    .updateOne({ _id: params.slotId }, { $set: { status: "cancelled", sessionId: "" } });
  invalidateMentorDetailCache(slot.mentorUid).catch(() => {});
  return { slotId: params.slotId, status: "cancelled" };
}

async function updateMentorStats(mentorUid: string) {
  try {
    if (!dbCommand) return;
    const sessions = await dbCommand
      .collection("mentorship_sessions")
      .find({ mentorUid })
      .toArray();
    const completed = sessions.filter((s: any) => s.status === "completed");
    const hours = completed.reduce((acc: number, s: any) => {
      return acc + slotDurationHours(s.slot?.startTime || "00:00", s.slot?.endTime || "00:00");
    }, 0);
    const ratings = completed
      .filter((s: any) => s.feedback && typeof s.feedback.rating === "number")
      .map((s: any) => s.feedback.rating);
    const avgRating = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
    await dbCommand.collection("mentor_profiles").updateOne(
      { mentorUid },
      {
        $set: {
          "stats.sessionsCompleted": completed.length,
          "stats.totalHoursMentored": hours,
          "stats.avgRating": avgRating,
          "stats.totalRatings": ratings.length,
        },
      },
    );
  } catch (err) {
    console.error("[Mentorship] updateMentorStats error:", err);
  }
}

// ─── Notes ─────────────────────────────────────────────────────────────────────

export async function addNote(params: {
  sessionId: string;
  actorUid: string;
  actorName?: string;
  content: string;
}) {
  assertDb();
  const { sessionId, actorUid, content } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== actorUid && session.mentorUid !== actorUid) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  const authorRole: "mentor" | "student" = session.mentorUid === actorUid ? "mentor" : "student";
  const now = new Date();
  const note: SessionNote = {
    noteId: generateMentorshipId("note"),
    authorUid: actorUid,
    authorName: params.actorName || (authorRole === "mentor" ? session.mentorName : session.studentName),
    authorRole,
    content,
    createdAt: now,
    updatedAt: now,
  };
  await dbCommand
    .collection("mentorship_sessions")
    .updateOne({ sessionId }, { $push: { notes: note }, $set: { updatedAt: now } });
  return note;
}

export async function updateNote(params: {
  sessionId: string;
  actorUid: string;
  noteId: string;
  content: string;
}) {
  assertDb();
  const { sessionId, actorUid, noteId, content } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== actorUid && session.mentorUid !== actorUid) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  const note = (session.notes || []).find((n: any) => n.noteId === noteId);
  if (!note) throw AppError.notFound("Note not found");
  if (note.authorUid !== actorUid) throw AppError.forbidden("You can only edit your own notes");
  const updatedNote = { ...note, content, updatedAt: new Date() };
  await dbCommand
    .collection("mentorship_sessions")
    .updateOne(
      { sessionId, "notes.noteId": noteId },
      { $set: { "notes.$": updatedNote, updatedAt: new Date() } },
    );
  return updatedNote;
}

export async function deleteNote(params: { sessionId: string; actorUid: string; noteId: string }) {
  assertDb();
  const { sessionId, actorUid, noteId } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== actorUid && session.mentorUid !== actorUid) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  const note = (session.notes || []).find((n: any) => n.noteId === noteId);
  if (!note) throw AppError.notFound("Note not found");
  if (note.authorUid !== actorUid) throw AppError.forbidden("You can only delete your own notes");
  await dbCommand
    .collection("mentorship_sessions")
    .updateOne({ sessionId }, { $pull: { notes: { noteId } }, $set: { updatedAt: new Date() } });
  return { noteId, deleted: true };
}

// ─── Action items ──────────────────────────────────────────────────────────────

export async function addActionItem(params: {
  sessionId: string;
  actorUid: string;
  title: string;
  assignee?: "mentor" | "student" | "both";
  priority?: "low" | "medium" | "high";
}) {
  assertDb();
  const { sessionId, actorUid, title } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== actorUid && session.mentorUid !== actorUid) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  const now = new Date();
  const item: ActionItem = {
    itemId: generateMentorshipId("item"),
    title,
    assignee: params.assignee || "student",
    priority: params.priority || "medium",
    status: "open",
    createdAt: now,
  };
  await dbCommand
    .collection("mentorship_sessions")
    .updateOne({ sessionId }, { $push: { actionItems: item }, $set: { updatedAt: now } });
  return item;
}

export async function updateActionItem(params: {
  sessionId: string;
  actorUid: string;
  itemId: string;
  patch: Partial<Pick<ActionItem, "title" | "status" | "priority">>;
}) {
  assertDb();
  const { sessionId, actorUid, itemId, patch } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== actorUid && session.mentorUid !== actorUid) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  const item = (session.actionItems || []).find((i: any) => i.itemId === itemId);
  if (!item) throw AppError.notFound("Action item not found");
  const updated = {
    ...item,
    ...patch,
    ...(patch.status === "done" && item.status !== "done" ? { completedAt: new Date() } : {}),
  };
  await dbCommand
    .collection("mentorship_sessions")
    .updateOne(
      { sessionId, "actionItems.itemId": itemId },
      { $set: { "actionItems.$": updated, updatedAt: new Date() } },
    );
  return updated;
}

// ─── Feedback ──────────────────────────────────────────────────────────────────

export async function submitFeedback(params: {
  sessionId: string;
  actorUid: string;
  rating: number;
  comment?: string;
}) {
  assertDb();
  const { sessionId, actorUid, rating, comment = "" } = params;
  const session = await dbQuery.collection("mentorship_sessions").findOne({ sessionId });
  if (!session) throw AppError.notFound("Session not found");
  if (session.studentUid !== actorUid) {
    throw AppError.forbidden("Only the student can submit feedback for a session");
  }
  if (session.status !== "completed") {
    throw AppError.conflict("Feedback can only be submitted for completed sessions");
  }
  await dbCommand
    .collection("mentorship_sessions")
    .updateOne(
      { sessionId },
      {
        $set: {
          feedback: { rating, comment, submittedBy: actorUid, submittedAt: new Date() },
          updatedAt: new Date(),
        },
      },
    );
  updateMentorStats(session.mentorUid).catch((err) =>
    console.error("[Mentorship] Stats update error:", err),
  );
  return { sessionId, rating, comment };
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export async function getAnalytics(uid: string) {
  if (!dbQuery) return { role: "student", student: emptyStudentAnalytics(), mentor: null };
  const mentorProfile = await dbQuery.collection("mentor_profiles").findOne({ mentorUid: uid });
  if (mentorProfile && mentorProfile.verificationStatus === "approved") {
    const mentor = await getMentorAnalytics(uid);
    const student = await getStudentAnalytics(uid);
    return { role: "mentor", mentor, student };
  }
  return { role: "student", mentor: null, student: await getStudentAnalytics(uid) };
}

function emptyStudentAnalytics() {
  return {
    totalSessions: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    upcoming: 0,
    hoursBooked: 0,
    completionRate: 0,
    actionItemsCompleted: 0,
    actionItemsOpen: 0,
    topicsCovered: 0,
    avgRatingGiven: 0,
    trend: [] as { week: string; count: number }[],
  };
}

async function getStudentAnalytics(studentUid: string) {
  const sessions = await dbQuery
    .collection("mentorship_sessions")
    .find({ studentUid })
    .toArray();
  const base = emptyStudentAnalytics();
  if (!sessions.length) return base;

  const completed = sessions.filter((s: any) => s.status === "completed");
  const cancellations = sessions.filter((s: any) => s.status === "cancelled");
  const noShow = sessions.filter((s: any) => s.status === "no_show");
  const upcoming = sessions.filter((s: any) =>
    ["pending", "confirmed", "in_progress"].includes(s.status),
  );

  const hoursBooked = sessions.reduce((acc: number, s: any) => {
    return acc + slotDurationHours(s.slot?.startTime || "00:00", s.slot?.endTime || "00:00");
  }, 0);

  let actionItemsCompleted = 0;
  let actionItemsOpen = 0;
  const topics = new Set<string>();
  for (const s of sessions) {
    for (const item of s.actionItems || []) {
      if (item.status === "done") actionItemsCompleted += 1;
      else actionItemsOpen += 1;
    }
    if (s.topic) topics.add(s.topic);
  }

  const ratings = completed
    .filter((s: any) => s.feedback && s.feedback.submittedBy === studentUid)
    .map((s: any) => s.feedback.rating);

  const decided = completed.length + cancellations.length + noShow.length;

  return {
    totalSessions: sessions.length,
    completed: completed.length,
    cancelled: cancellations.length,
    noShow: noShow.length,
    upcoming: upcoming.length,
    hoursBooked,
    completionRate: decided ? Math.round((completed.length / decided) * 100) : 0,
    actionItemsCompleted,
    actionItemsOpen,
    topicsCovered: topics.size,
    avgRatingGiven: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0,
    trend: buildTrend(completed),
  };
}

async function getMentorAnalytics(mentorUid: string) {
  const sessions = await dbQuery
    .collection("mentorship_sessions")
    .find({ mentorUid })
    .toArray();
  const completed = sessions.filter((s: any) => s.status === "completed");
  const cancellations = sessions.filter((s: any) => s.status === "cancelled");
  const noShow = sessions.filter((s: any) => s.status === "no_show");
  const upcoming = sessions.filter((s: any) => ["pending", "confirmed", "in_progress"].includes(s.status));
  const pendingRequests = sessions.filter((s: any) => s.status === "pending");

  const hours = completed.reduce((acc: number, s: any) => {
    return acc + slotDurationHours(s.slot?.startTime || "00:00", s.slot?.endTime || "00:00");
  }, 0);

  const ratings = completed
    .filter((s: any) => s.feedback && typeof s.feedback.rating === "number")
    .map((s: any) => s.feedback.rating);

  const topics = new Map<string, number>();
  for (const s of sessions) {
    if (s.topic) topics.set(s.topic, (topics.get(s.topic) || 0) + 1);
  }

  const decided = completed.length + cancellations.length + noShow.length;

  return {
    sessionsCompleted: completed.length,
    totalHoursMentored: hours,
    avgRating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0,
    totalRatings: ratings.length,
    completionRate: decided ? Math.round((completed.length / decided) * 100) : 0,
    upcoming: upcoming.length,
    pendingRequests: pendingRequests.length,
    studentsMentored: new Set(sessions.map((s: any) => s.studentUid)).size,
    topTopics: [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    trend: buildTrend(completed),
  };
}

function buildTrend(sessions: any[]): { week: string; count: number }[] {
  const buckets: { week: string; count: number }[] = [];
  const now = new Date();
  for (let w = 7; w >= 1; w--) {
    const end = new Date(now.getTime() - (w - 1) * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const count = sessions.filter((s: any) => {
      const at = s.createdAt ? new Date(s.createdAt) : null;
      return at && at >= start && at < end;
    }).length;
    buckets.push({ week: start.toISOString().slice(0, 10), count });
  }
  return buckets;
}

// ─── Mentor applications ───────────────────────────────────────────────────────

export async function createMentorApplication(
  applicantUid: string,
  input: {
    name: string;
    email: string;
    linkedinUrl?: string;
    collegeCompany?: string;
    field?: string;
    experienceYears: number;
    skills?: string[];
    availability?: string[];
    whyMentor: string;
  },
) {
  assertDb();
  const existing = await dbQuery
    .collection("mentorship_applications")
    .findOne({ applicantUid, status: "pending" });
  if (existing) {
    throw AppError.conflict("You already have a pending mentor application");
  }
  const now = new Date();
  const doc: MentorApplication = {
    applicationId: generateMentorshipId("app"),
    applicantUid,
    name: input.name,
    email: input.email,
    avatarUrl: "",
    reviewNote: "",
    linkedinUrl: input.linkedinUrl || "",
    collegeCompany: input.collegeCompany || "",
    field: input.field || "",
    experienceYears: input.experienceYears,
    skills: input.skills || [],
    availability: input.availability || [],
    whyMentor: input.whyMentor,
    status: "pending",
    createdAt: now,
  };
  await dbCommand.collection("mentorship_applications").insertOne({ ...doc, _id: undefined });
  await notifyParticipant(
    applicantUid,
    "mentorship_application",
    "Application received",
    "Your mentor application was submitted. Our team will review it shortly.",
    { applicationId: doc.applicationId },
  );
  publishMentorshipEvent("MentorApplicationSubmitted", {
    applicationId: doc.applicationId,
    applicantUid,
    name: input.name,
  });
  return doc;
}

export async function getMyApplication(applicantUid: string) {
  if (!dbQuery) return null;
  const app = await dbQuery
    .collection("mentorship_applications")
    .findOne({ applicantUid }, { sort: { createdAt: -1 } });
  return app ? toSerializable(app) : null;
}

export async function listApplications(params: { page?: number; limit?: number; status?: string } = {}) {
  if (!dbQuery) return { applications: [], total: 0, page: 1, limit: 20 };
  const { page = 1, limit = 20, status } = params;
  const filter: any = {};
  if (status && status !== "all") filter.status = status;
  const skip = (page - 1) * limit;
  const [applications, total] = await Promise.all([
    dbQuery
      .collection("mentorship_applications")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    dbQuery.collection("mentorship_applications").countDocuments(filter),
  ]);
  return { applications: applications.map(toSerializable), total, page, limit };
}

export async function reviewApplication(params: {
  applicationId: string;
  decision: "approved" | "rejected";
  reviewNote?: string;
  reviewerUid: string;
}) {
  assertDb();
  const { applicationId, decision, reviewNote = "", reviewerUid } = params;
  const app = await dbQuery.collection("mentorship_applications").findOne({ applicationId });
  if (!app) throw AppError.notFound("Application not found");
  if (app.status !== "pending") {
    throw AppError.conflict(`Application already reviewed (${app.status})`);
  }

  await dbCommand.collection("mentorship_applications").updateOne(
    { applicationId },
    {
      $set: {
        status: decision,
        reviewedBy: reviewerUid,
        reviewedAt: new Date(),
        reviewNote,
      },
    },
  );

  if (decision === "approved") {
    await upsertMentorProfile(app.applicantUid, {
      name: app.name,
      email: app.email,
      avatarUrl: app.avatarUrl || "",
      company: app.collegeCompany || "",
      skills: app.skills || [],
      experienceYears: app.experienceYears,
      timezone: "Asia/Kolkata",
      verificationStatus: "approved",
      isActive: true,
      approvedAt: new Date(),
    });
  }

  await notifyParticipant(
    app.applicantUid,
    "mentorship_application",
    decision === "approved" ? "Application approved" : "Application not approved",
    decision === "approved"
      ? "Congratulations! Your mentor profile is now live. Publish office hours to start accepting students."
      : `Your mentor application was not approved. ${reviewNote || "Please reapply with more details."}`,
    { applicationId },
  );
  return { applicationId, status: decision };
}

// ─── Reminders & events (best-effort, never block the request) ────────────────

async function scheduleSessionReminders(session: MentorshipSession) {
  try {
    const { addMentorshipReminderJob } = await import("../queues/mentorshipQueue.js");
    const start = localSlotDate(session.slot.date, session.slot.startTime).getTime();
    const now = Date.now();
    const delays = {
      t24h: start - 24 * 60 * 60 * 1000 - now,
      t1h: start - 60 * 60 * 1000 - now,
    };
    const base = {
      sessionId: session.sessionId,
      mentorUid: session.mentorUid,
      studentUid: session.studentUid,
      topic: session.topic,
      slotDateTime: session.slotDateTime,
      meetingUrl: session.meetingUrl,
      mentorName: session.mentorName,
      studentName: session.studentName,
    };
    if (delays.t24h > 0) {
      await addMentorshipReminderJob({ ...base, jobType: "session_reminder", horizon: "t24h" }, delays.t24h);
    }
    if (delays.t1h > 0) {
      await addMentorshipReminderJob({ ...base, jobType: "session_reminder", horizon: "t1h" }, delays.t1h);
    }
  } catch (err) {
    console.error("[Mentorship] scheduleSessionReminders error:", err);
  }
}

async function enqueueFeedbackRequest(session: any) {
  try {
    const { addMentorshipReminderJob } = await import("../queues/mentorshipQueue.js");
    await addMentorshipReminderJob(
      {
        jobType: "feedback_request",
        sessionId: session.sessionId,
        mentorUid: session.mentorUid,
        studentUid: session.studentUid,
        topic: session.topic,
        slotDateTime: session.slotDateTime,
        meetingUrl: session.meetingUrl,
        mentorName: session.mentorName,
        studentName: session.studentName,
      },
      60 * 60 * 1000,
    );
  } catch (err) {
    console.error("[Mentorship] enqueueFeedbackRequest error:", err);
  }
}

async function publishMentorshipEvent(eventType: string, payload: Record<string, any>) {
  try {
    const { eventBus } = await import("../events/eventBus.js");
    if (eventBus?.publish) {
      await eventBus.publish(`mentorship.${eventType.toLowerCase()}`, {
        eventType,
        payload,
        publishedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn(`[Mentorship] Event publish (${eventType}) skipped:`, err);
  }
}
