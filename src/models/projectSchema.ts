import { z } from "zod";

export const ProjectDifficultyEnum = z.enum(["Beginner", "Intermediate", "Advanced"]);
export type ProjectDifficulty = z.infer<typeof ProjectDifficultyEnum>;

export const ProjectCategoryEnum = z.enum([
  "AI & Machine Learning",
  "Full Stack Web",
  "Mobile Apps",
  "Cloud & DevOps",
  "Web3 & Blockchain",
  "Open Source Tools",
  "Cybersecurity",
  "Data Science & Analytics",
  "IoT & Hardware",
  "Other"
]);
export type ProjectCategory = z.infer<typeof ProjectCategoryEnum>;

export const ProjectStatusEnum = z.enum(["Active", "Archived"]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const MaintainerSchema = z.object({
  name: z.string().trim().min(1, "Maintainer name is required").max(120),
  handle: z.string().trim().max(100).optional(),
  avatar: z.string().url().or(z.string()).optional(),
  email: z.string().email().optional(),
  uid: z.string().trim().max(160).optional()
});

export const ProjectSchema = z.object({
  title: z.string().trim().min(2, "Project title must be at least 2 characters").max(160),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  techStack: z.array(z.string().trim().min(1).max(60)).min(1, "At least one technology is required").max(30),
  difficulty: ProjectDifficultyEnum.default("Intermediate"),
  category: ProjectCategoryEnum.default("Full Stack Web"),
  maintainer: MaintainerSchema,
  repoUrl: z.string().trim().url("Valid GitHub repository URL required"),
  demoUrl: z.string().trim().url("Valid demo URL required").optional().or(z.literal("")),
  goodFirstIssues: z.boolean().default(true),
  openIssuesCount: z.number().int().min(0).default(0),
  stars: z.number().int().min(0).default(0),
  views: z.number().int().min(0).default(0),
  upvotes: z.number().int().min(0).default(0),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  status: ProjectStatusEnum.default("Active"),
  isOpenSource: z.boolean().default(true),
  isBeginnerFriendly: z.boolean().default(false),
  isRemoteCollaboration: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date())
});

export type Project = z.infer<typeof ProjectSchema> & {
  _id?: any;
  id?: string;
};

export const CreateProjectInputSchema = z.object({
  title: z.string().trim().min(2, "Project title must be at least 2 characters").max(160),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  techStack: z.array(z.string().trim().min(1).max(60)).or(z.string().transform(s => s.split(',').map(t => t.trim()).filter(Boolean))),
  difficulty: ProjectDifficultyEnum.optional().default("Intermediate"),
  category: ProjectCategoryEnum.optional().default("Full Stack Web"),
  maintainerName: z.string().trim().min(1).max(120).optional(),
  maintainerHandle: z.string().trim().max(100).optional(),
  repoUrl: z.string().trim().url("Valid repository URL is required"),
  demoUrl: z.string().trim().url().optional().or(z.literal("")),
  goodFirstIssues: z.boolean().optional().default(true),
  openIssuesCount: z.number().int().min(0).optional().default(0),
  tags: z.array(z.string().trim().min(1).max(60)).or(z.string().transform(s => s.split(',').map(t => t.trim()).filter(Boolean))).optional().default([]),
  status: ProjectStatusEnum.optional().default("Active"),
  isOpenSource: z.boolean().optional().default(true),
  isBeginnerFriendly: z.boolean().optional().default(false),
  isRemoteCollaboration: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false)
});
