import { z } from "zod";

export const InterviewExperienceSchema = z.object({
  company: z.string().trim().min(2, "Company name must be at least 2 characters").max(100),
  role: z.string().trim().min(2, "Role must be at least 2 characters").max(100),
  difficulty: z.number().int().min(1).max(5),
  rounds: z.array(z.string().trim().min(1, "Round description cannot be empty")).min(1, "At least one round is required"),
  isAnonymous: z.boolean().default(false),
  userId: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type InterviewExperienceInput = z.infer<typeof InterviewExperienceSchema>;
