import { Request, Response } from "express";
import {
  bookSession,
  getSessionLedger,
  listAvailability,
  transitionSessionStatus,
} from "../../services/mentorshipService.js";
import { parsePagination } from "../../lib/utils.js";
import { AppError } from "../../lib/AppError.js";
import { sendSuccess, sendPaginated } from "../../lib/apiResponse.js";

/**
 * Legacy-compatible mentorship handlers, now backed by the mentorship service
 * (atomic slot locking, session lifecycle, reminders, notifications).
 */

export const getMentorAvailability = async (req: Request, res: Response) => {
  const mentorUid = (req.query.mentorUid as string) || "mentor_default";
  const from = (req.query.from as string) || undefined;
  const to = (req.query.to as string) || undefined;
  const status = (req.query.status as string) || undefined;
  const { page, limit } = parsePagination(req.query);

  const { slots, total } = await listAvailability({
    mentorUid,
    from,
    to,
    status: status || "open",
    page,
    limit,
  });

  return sendSuccess(res, {
    mentorUid,
    timezone: "IST (UTC+5:30)",
    maxSessionsPerWeek: 5,
    availableSlots: slots,
    slots,
    total,
    page,
    limit,
  });
};

export const bookSessionHandler = async (req: Request, res: Response) => {
  const studentUid = req.user?.uid || (req.body.studentUid as string);
  if (!studentUid || !req.body.mentorUid || !req.body.slotId) {
    throw AppError.badRequest(
      "Missing required booking details (studentUid, mentorUid, slotId)",
    );
  }

  const session = await bookSession({
    studentUid,
    studentName: (req.body.studentName as string) || req.user?.name || "Student",
    mentorUid: req.body.mentorUid,
    slotId: req.body.slotId,
    topic: req.body.topic || "Career Strategy & Resume Review",
    agenda: (req.body.agenda as string) || "",
  });

  return sendSuccess(res, { session }, 201);
};

export const getSessions = async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query);
  const uid = (req.user?.uid as string) || (req.query.uid as string) || "user_default";
  const status = (req.query.status as string) || undefined;

  const result = await getSessionLedger({ uid, page, limit, status });
  return sendPaginated(res, result.sessions, result.page, result.limit, result.total);
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  const { sessionId, status } = req.body;
  if (!sessionId || !status) {
    throw AppError.badRequest("Missing sessionId or status");
  }
  const actorUid = (req.user?.uid as string) || undefined;
  if (!actorUid) throw AppError.unauthorized("Not authenticated");

  const session = await transitionSessionStatus({
    sessionId,
    actorUid,
    actorRole: req.user?.role,
    status,
  });

  sendSuccess(res, { sessionId, status: session.status, session });
};
