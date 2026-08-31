import { Worker, Job } from "bullmq";
import { connection } from "../queues/connection";
import { MentorshipReminderJobData } from "../queues/mentorshipQueue";
import { getSession, getUserEmail, notifyParticipant } from "../services/mentorshipService";
import { enqueueEmail } from "../queues/emailQueue";
import { enqueuePushNotification } from "../queues/pushQueue";

function markerKeyFor(jobType: string, horizon?: string): "t24hSent" | "t1hSent" | "feedbackRequestSent" {
  if (jobType === "session_reminder") {
    return horizon === "t24h" ? "t24hSent" : "t1hSent";
  }
  return "feedbackRequestSent";
}

/**
 * Shared handler used by both the BullMQ worker and the in-memory fallback path.
 */
export async function processMentorshipReminder(data: MentorshipReminderJobData): Promise<void> {
  const {
    jobType,
    sessionId,
    mentorUid,
    studentUid,
    horizon,
    topic = "your session",
    slotDateTime,
    meetingUrl,
    mentorName = "your mentor",
  } = data;

  // Skip sessions that are no longer active and reminders already delivered.
  const session = await getSession(sessionId);
  if (!session) return;
  if (jobType === "session_reminder") {
    if (["cancelled", "completed", "no_show"].includes(session.status)) return;
  } else if (session.status !== "completed") {
    return;
  }
  const marker = (session.reminderTimestamps || {})[markerKeyFor(jobType, horizon)];
  if (marker) return;

  if (jobType === "session_reminder") {
    const when = horizon === "t24h" ? "tomorrow" : "in about an hour";
    for (const uid of [mentorUid, studentUid]) {
      const title =
        uid === mentorUid
          ? "Upcoming mentorship session"
          : `Session with ${mentorName} is coming up`;
      const message = `Reminder: "${topic}" is scheduled ${when} (${slotDateTime}). Join at ${meetingUrl}.`;
      await notifyParticipant(uid, "mentorship_reminder", title, message, {
        sessionId,
        horizon,
        meetingUrl,
      });
      await enqueuePushNotification({ userId: uid, message });
      const to = await getUserEmail(uid);
      if (to) {
        await enqueueEmail({
          to,
          subject: title,
          body: `${message}\n\nSession link: ${meetingUrl}`,
        });
      } else {
        console.warn(`[MentorshipWorker] No email address for ${uid}; skipping "${title}" email`);
      }
    }
  } else if (jobType === "feedback_request") {
    const message = `Your session "${topic}" completed. Share your feedback to help ${mentorName} keep improving.`;
    await notifyParticipant(studentUid, "mentorship_feedback", "Rate your mentorship session", message, {
      sessionId,
    });
    await enqueuePushNotification({ userId: studentUid, message });
    const to = await getUserEmail(studentUid);
    if (to) {
      await enqueueEmail({
        to,
        subject: "How was your mentorship session?",
        body: `${message}\n\nSession link: ${meetingUrl}`,
      });
    } else {
      console.warn(`[MentorshipWorker] No email address for ${studentUid}; skipping feedback email`);
    }
  }

  // Best-effort idempotency marker on the session doc.
  try {
    const key =
      jobType === "session_reminder"
        ? horizon === "t24h"
          ? "reminderTimestamps.t24hSent"
          : "reminderTimestamps.t1hSent"
        : "reminderTimestamps.feedbackRequestSent";
    const { dbCommand } = await import("../api/db.js");
    if (dbCommand) {
      await dbCommand
        .collection("mentorship_sessions")
        .updateOne({ sessionId }, { $set: { [key]: new Date() } });
    }
  } catch (err) {
    console.error("[MentorshipWorker] Reminder marker update error:", err);
  }
}

export const mentorshipWorker = new Worker<MentorshipReminderJobData>(
  "mentorship-reminders",
  async (job: Job<MentorshipReminderJobData>) => {
    console.log(`[MentorshipWorker] Processing ${job.data.jobType} for session ${job.data.sessionId}`);
    await processMentorshipReminder(job.data);
  },
  { connection: connection as any, concurrency: 3 },
);

mentorshipWorker.on("completed", (job) => {
  console.log(`[MentorshipWorker] Job ${job.id} completed`);
});

mentorshipWorker.on("failed", (job, err) => {
  console.error(`[MentorshipWorker] Job ${job?.id} failed: ${err.message}`);
});

let mentorshipWorkerErrorLogged = false;
mentorshipWorker.on("error", (err) => {
  if (!mentorshipWorkerErrorLogged) {
    console.warn("[MentorshipWorker] Redis connection offline. Worker listening paused.");
    mentorshipWorkerErrorLogged = true;
  }
});
