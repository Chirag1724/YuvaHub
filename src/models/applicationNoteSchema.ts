import { z } from "zod";

/**
 * A single row inside a "checklist" block.
 */
export const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().max(1000).optional().default(""),
  done: z.boolean().optional().default(false),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/**
 * One content block in an application workspace note.
 *
 * `type` decides which of the optional fields carry meaning:
 *   - "text"      -> `text`
 *   - "checklist" -> `items`
 *   - "link"      -> `url`, `text` (used as the label)
 *   - "reminder"  -> `text`, `dueAt` (ISO / datetime-local string), `done`
 *
 * A single permissive shape (rather than a discriminated union) keeps the
 * document easy to store in MongoDB and easy to evolve as new block types
 * are added.
 */
export const noteBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "checklist", "link", "reminder"]),
  text: z.string().max(10000).optional().default(""),
  url: z.string().max(2000).optional(),
  items: z.array(checklistItemSchema).max(200).optional().default([]),
  dueAt: z.string().max(40).optional(),
  done: z.boolean().optional().default(false),
});

export type NoteBlock = z.infer<typeof noteBlockSchema>;

/**
 * Full ApplicationNote document as stored in the `application_notes` collection.
 *
 * Server-managed fields (`ownerId`, `sharedWith`, timestamps) are never trusted
 * from the client — the API derives `ownerId` from the auth token and mutates
 * `sharedWith` only through the dedicated share route.
 */
export const applicationNoteSchema = z.object({
  ownerId: z.string().min(1),
  applicationId: z.string().min(1),
  title: z.string().max(200).optional().default("Application Workspace"),
  blocks: z.array(noteBlockSchema).max(100).optional().default([]),
  sharedWith: z.array(z.string().min(1)).max(50).optional().default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ApplicationNote = z.infer<typeof applicationNoteSchema>;

/**
 * The only fields a client may send when creating or updating a note body.
 * `applicationId` links the note to a tracked application.
 */
export const applicationNoteInputSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required"),
  title: z.string().max(200).optional(),
  blocks: z.array(noteBlockSchema).max(100).optional(),
});

export type ApplicationNoteInput = z.infer<typeof applicationNoteInputSchema>;
