import type { Db } from "mongodb";

const NOTIFICATION_RETENTION_SECONDS = 60 * 60 * 24 * 90;

export async function ensureDataModelIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("applications").createIndex(
      { userId: 1, createdAt: -1 },
      { name: "applications_user_history" },
    ),
    db.collection("applications").createIndex(
      { opportunityId: 1, createdAt: -1 },
      { name: "applications_opportunity_history" },
    ),
    db.collection("applications").createIndex(
      { userId: 1, opportunityId: 1 },
      {
        name: "applications_unique_user_opportunity",
        unique: true,
        partialFilterExpression: {
          userId: { $type: "string" },
          opportunityId: { $type: "string" },
        },
      },
    ),

    db.collection("notifications").createIndex(
      { userId: 1, read: 1, createdAt: -1 },
      { name: "notifications_user_unread" },
    ),
    db.collection("notifications").createIndex(
      { expiresAt: 1 },
      {
        name: "notifications_expiry",
        expireAfterSeconds: 0,
        partialFilterExpression: {
          expiresAt: { $type: "date" },
        },
      },
    ),
    db.collection("notifications").createIndex(
      { createdAt: 1 },
      {
        name: "notifications_legacy_retention",
        expireAfterSeconds: NOTIFICATION_RETENTION_SECONDS,
        partialFilterExpression: {
          expiresAt: { $exists: false },
          createdAt: { $type: "date" },
        },
      },
    ),

    db.collection("scholarships").createIndex(
      { deadline: 1 },
      {
        name: "scholarships_deadline",
        partialFilterExpression: {
          deadline: { $type: "date" },
        },
      },
    ),

    db.collection("teams").createIndex(
      { "members.uid": 1 },
      { name: "teams_member_uid" },
    ),
    db.collection("teams").createIndex(
      { opportunityId: 1, status: 1, createdAt: -1 },
      { name: "teams_opportunity_status" },
    ),
    db.collection("team_requests").createIndex(
      { teamId: 1, applicantUid: 1, status: 1 },
      {
        name: "team_requests_one_pending",
        unique: true,
        partialFilterExpression: {
          status: "pending",
        },
      },
    ),

    db.collection("bounties").createIndex(
      { createdBy: 1, createdAt: -1 },
      { name: "bounties_creator_history" },
    ),

    db.collection("mentor_profiles").createIndex(
      { mentorUid: 1 },
      { name: "mentor_profiles_uid", unique: true, sparse: true },
    ),
    db.collection("mentor_profiles").createIndex(
      { verificationStatus: 1, isActive: 1, "stats.sessionsCompleted": -1 },
      { name: "mentor_profiles_public_feed" },
    ),
    db.collection("mentor_availability").createIndex(
      { mentorUid: 1, date: 1, startTime: 1 },
      { name: "mentor_availability_slot_window" },
    ),
    db.collection("mentor_availability").createIndex(
      { status: 1, mentorUid: 1, date: 1 },
      { name: "mentor_availability_open_slots" },
    ),
    db.collection("mentorship_sessions").createIndex(
      { studentUid: 1, createdAt: -1 },
      { name: "mentorship_sessions_student" },
    ),
    db.collection("mentorship_sessions").createIndex(
      { mentorUid: 1, createdAt: -1 },
      { name: "mentorship_sessions_mentor" },
    ),
    db.collection("mentorship_sessions").createIndex(
      { sessionId: 1 },
      { name: "mentorship_sessions_session_id", unique: true, sparse: true },
    ),
    db.collection("mentorship_applications").createIndex(
      { applicantUid: 1, createdAt: -1 },
      { name: "mentorship_applications_applicant" },
    ),
    db.collection("mentorship_applications").createIndex(
      { status: 1, createdAt: -1 },
      { name: "mentorship_applications_status" },
    ),
  ]);
}
