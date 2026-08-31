import { Queue } from "bullmq";
import { connection, isRedisReady } from "./connection";

export interface MentorshipReminderJobData {
  jobType: "session_reminder" | "feedback_request";
  sessionId: string;
  mentorUid: string;
  studentUid: string;
  horizon?: "t24h" | "t1h";
  topic?: string;
  slotDateTime?: string;
  meetingUrl?: string;
  mentorName?: string;
  studentName?: string;
}

export const mentorshipQueue = new Queue("mentorship-reminders", {
  connection: connection as any,
});

/**
 * Schedule a delayed mentorship job (session reminder / feedback request).
 * Fails open into an in-memory timer when Redis is offline so reminders
 * still fire in local development.
 */
export async function addMentorshipReminderJob(
  data: MentorshipReminderJobData,
  delayMs: number,
) {
  if (!isRedisReady()) {
    console.log(
      `[MentorshipQueue Fallback] Redis offline. Scheduling in-memory ${data.jobType} for session ${data.sessionId} in ${Math.round(delayMs / 1000)}s`,
    );
    const timer = setTimeout(() => {
      import("../workers/mentorshipWorker.js")
        .then(({ processMentorshipReminder }) => processMentorshipReminder(data))
        .catch((err) => console.error("[MentorshipQueue Fallback] Processor error:", err));
    }, Math.max(delayMs, 0));
    if (typeof timer === "object" && "unref" in timer) (timer as any).unref();
    return { id: `local_mentorship_${Date.now()}`, data, fallback: true };
  }
  return await mentorshipQueue.add(data.jobType, data, {
    delay: Math.max(delayMs, 0),
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}
