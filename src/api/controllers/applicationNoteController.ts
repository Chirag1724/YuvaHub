import { Request, Response } from "express";
import { dbCommand, dbQuery } from "../db.js";
import { AppError } from "../../lib/AppError.js";
import { sendSuccess } from "../../lib/apiResponse.js";
import { applicationNoteInputSchema } from "../../models/applicationNoteSchema.js";
import { z } from "zod";

const MEMORY_APPLICATION_NOTES: any[] = [];

export const getApplicationNote = async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.query.userId as string;
  const { applicationId } = req.params;

  if (!applicationId) {
    throw AppError.badRequest("Missing applicationId");
  }

  if (!dbQuery) {
    const note = MEMORY_APPLICATION_NOTES.find(
      (n) => n.applicationId === applicationId && (n.ownerId === userId || n.sharedWith?.includes(userId))
    );
    return sendSuccess(res, { note: note || null });
  }

  const note = await dbQuery.collection("application_notes").findOne({
    applicationId,
    $or: [{ ownerId: userId }, { sharedWith: userId }],
  });

  return sendSuccess(res, { note: note || null });
};

export const saveApplicationNote = async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.body.ownerId || "anon_user";
  const { applicationId } = req.params;

  if (!applicationId) {
    throw AppError.badRequest("Missing applicationId");
  }

  try {
    const validatedData = applicationNoteInputSchema.parse({
      ...req.body,
      applicationId,
    });

    const now = new Date();
    const updateData = {
      ...validatedData,
      ownerId: userId,
      updatedAt: now,
    };

    if (!dbCommand) {
      let existing = MEMORY_APPLICATION_NOTES.find(
        (n) => n.applicationId === applicationId && n.ownerId === userId
      );
      if (existing) {
        Object.assign(existing, updateData);
      } else {
        existing = {
          _id: `app_note_${Date.now()}`,
          id: `app_note_${Date.now()}`,
          ...updateData,
          sharedWith: [],
          createdAt: now,
        };
        MEMORY_APPLICATION_NOTES.push(existing);
      }
      return sendSuccess(res, { note: existing });
    }

    const result = await dbCommand.collection("application_notes").findOneAndUpdate(
      { ownerId: userId, applicationId },
      {
        $set: updateData,
        $setOnInsert: { createdAt: now, sharedWith: [] },
      },
      { upsert: true, returnDocument: "after" }
    );

    return sendSuccess(res, { note: result.value || result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw AppError.badRequest((error as any).errors.map((e: any) => e.message).join(", "));
    }
    throw error;
  }
};

export const shareApplicationNote = async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.body.userId;
  const { noteId } = req.params;
  const { addEmail, removeUserId } = req.body;

  if (!noteId) {
    throw AppError.badRequest("Missing noteId");
  }

  if (!dbCommand) {
    const note = MEMORY_APPLICATION_NOTES.find((n) => n.id === noteId || n._id === noteId);
    if (!note) throw AppError.notFound("Note not found");
    if (addEmail && !note.sharedWith.includes(addEmail)) {
      note.sharedWith.push(addEmail);
    }
    if (removeUserId) {
      note.sharedWith = note.sharedWith.filter((u: string) => u !== removeUserId);
    }
    return sendSuccess(res, { note });
  }

  const update: any = {};
  if (addEmail) update.$addToSet = { sharedWith: addEmail };
  if (removeUserId) update.$pull = { sharedWith: removeUserId };

  const result = await dbCommand.collection("application_notes").findOneAndUpdate(
    { $or: [{ _id: noteId }, { id: noteId }] },
    update,
    { returnDocument: "after" }
  );

  return sendSuccess(res, { note: result.value || result });
};
