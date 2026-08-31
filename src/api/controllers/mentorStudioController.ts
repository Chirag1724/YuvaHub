import { Request, Response } from "express";
import {
  addActionItem as addActionItemToSession,
  addNote as addNoteToSession,
  bulkCreateAvailability,
  createMentorApplication,
  deleteAvailabilitySlot,
  deleteNote as deleteNoteFromSession,
  getAnalytics,
  getMentorDetail,
  getMentorProfile,
  getMyApplication as getMyMentorApplication,
  getSession,
  listApplications as listAllApplications,
  listAvailability,
  listMentorProfiles,
  reviewApplication,
  submitFeedback as submitFeedbackForSession,
  transitionSessionStatus,
  updateActionItem as updateActionItemInSession,
  updateNote as updateNoteInSession,
  upsertMentorProfile,
} from "../../services/mentorshipService.js";
import { AppError } from "../../lib/AppError.js";
import { sendPaginated, sendSuccess } from "../../lib/apiResponse.js";
import { parsePagination } from "../../lib/utils.js";

const getUid = (req: Request) => req.user?.uid as string | undefined;

/**
 * Mentor Studio & Advisory Board endpoints.
 */

export const listMentors = async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query);
  const result = await listMentorProfiles({
    page,
    limit,
    search: (req.query.search as string) || undefined,
    skills: req.query.skills
      ? (req.query.skills as string).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
  });
  return sendPaginated(res, result.profiles, result.page, result.limit, result.total);
};

export const getMentorDetailHandler = async (req: Request, res: Response) => {
  const mentor = await getMentorDetail(req.params.uid as string);
  return sendSuccess(res, { mentor });
};

export const getMyProfile = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const profile = await getMentorProfile(uid);
  return sendSuccess(res, { profile });
};

export const updateMyProfile = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const profile = await upsertMentorProfile(uid, req.body);
  return sendSuccess(res, { profile });
};

export const getMyAvailability = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const { page, limit } = parsePagination(req.query);
  const result = await listAvailability({
    mentorUid: uid,
    page,
    limit,
    from: (req.query.from as string) || undefined,
    to: (req.query.to as string) || undefined,
    status: (req.query.status as string) || undefined,
  });
  return sendPaginated(res, result.slots, result.page, result.limit, result.total);
};

export const createAvailability = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const result = await bulkCreateAvailability({ mentorUid: uid, slots: req.body.slots });
  return sendSuccess(res, result, 201);
};

export const removeAvailabilitySlot = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const removed = await deleteAvailabilitySlot({ slotId: req.params.slotId as string, mentorUid: uid });
  return sendSuccess(res, { removed });
};

export const getSessionDetail = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const session = await getSession(req.params.id as string);
  if (!session) throw AppError.notFound("Session not found");
  if (
    session.studentUid !== uid &&
    session.mentorUid !== uid &&
    !["admin", "superadmin"].includes(req.user?.role)
  ) {
    throw AppError.forbidden("You are not a participant of this session");
  }
  return sendSuccess(res, { session });
};

export const updateSessionStatusById = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const session = await transitionSessionStatus({
    sessionId: req.params.id as string,
    actorUid: uid,
    actorRole: req.user?.role,
    status: req.body.status,
  });
  return sendSuccess(res, { sessionId: session.sessionId, status: session.status, session });
};

export const addNote = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const note = await addNoteToSession({ sessionId: req.params.id as string, actorUid: uid, content: req.body.content });
  return sendSuccess(res, { note }, 201);
};

export const updateNote = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const note = await updateNoteInSession({
    sessionId: req.params.id as string,
    actorUid: uid,
    noteId: req.params.noteId as string,
    content: req.body.content,
  });
  return sendSuccess(res, { note });
};

export const removeNote = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const result = await deleteNoteFromSession({ sessionId: req.params.id as string, actorUid: uid, noteId: req.params.noteId as string });
  return sendSuccess(res, { result });
};

export const addActionItem = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const item = await addActionItemToSession({
    sessionId: req.params.id as string,
    actorUid: uid,
    title: req.body.title,
    assignee: req.body.assignee,
    priority: req.body.priority,
  });
  return sendSuccess(res, { item }, 201);
};

export const updateActionItem = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const item = await updateActionItemInSession({
    sessionId: req.params.id as string,
    actorUid: uid,
    itemId: req.params.actionId as string,
    patch: req.body,
  });
  return sendSuccess(res, { item });
};

export const submitFeedback = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const feedback = await submitFeedbackForSession({
    sessionId: req.params.id as string,
    actorUid: uid,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  return sendSuccess(res, { feedback });
};

export const getAnalyticsHandler = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const analytics = await getAnalytics(uid);
  return sendSuccess(res, { analytics });
};

export const applyToBecomeMentorHandler = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const application = await createMentorApplication(uid, req.body);
  return sendSuccess(res, { application }, 201);
};

export const getMyApplication = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const application = await getMyMentorApplication(uid);
  return sendSuccess(res, { application });
};

export const listApplications = async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query);
  const result = await listAllApplications({
    page,
    limit,
    status: (req.query.status as string) || undefined,
  });
  return sendPaginated(res, result.applications, result.page, result.limit, result.total);
};

export const reviewApplicationHandler = async (req: Request, res: Response) => {
  const uid = getUid(req);
  if (!uid) throw AppError.unauthorized("Not authenticated");
  const application = await reviewApplication({
    applicationId: req.params.applicationId as string,
    decision: req.body.decision,
    reviewNote: req.body.reviewNote,
    reviewerUid: uid,
  });
  return sendSuccess(res, { application });
};
