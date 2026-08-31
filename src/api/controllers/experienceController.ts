import { Request, Response } from "express";
import { dbCommand, dbQuery } from "../db.js";
import { InterviewExperienceSchema } from "../../models/interviewExperienceSchema.js";
import { ObjectId } from "mongodb";

export const getExperiences = async (req: Request, res: Response) => {
  try {
    if (!dbQuery) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { company, role } = req.query;
    const filter: any = {};
    if (company) {
      filter.company = { $regex: new RegExp(company as string, 'i') };
    }
    if (role) {
      filter.role = { $regex: new RegExp(role as string, 'i') };
    }

    const experiences = await dbQuery
      .collection("experiences")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Secondary safety measure: strip userId for anonymous posts
    const safeExperiences = experiences.map((exp: any) => {
      if (exp.isAnonymous) {
        delete exp.userId;
      }
      return exp;
    });

    res.json({
      status: "success",
      experiences: safeExperiences,
    });
  } catch (err: any) {
    console.error("GET /api/v1/experiences error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

export const createExperience = async (req: Request, res: Response) => {
  try {
    if (!dbCommand) {
      return res.status(503).json({ error: "Database not available" });
    }

    // Since we don't have getAuthenticatedUser imported properly and we might not need auth to submit anonymous ones 
    // or maybe we do. We will use req.body.userId if they pass it, or from auth middleware if they use it.
    // Assuming auth middleware places `req.user` or similar, but the user prompt didn't specify strict auth requirement.
    // For now, let's assume `userId` is passed in `req.body` or injected by `authenticateUser`.
    
    // Using `any` for user to mimic existing auth setup in controller, if present.
    // Wait, let's look at how other controllers handle auth if needed. But for this scope, let's stick to the prompt.
    // The prompt says: "If isAnonymous is true, the API must strip the userId before saving or returning data to the frontend."

    const data = req.body;
    
    // Strip userId if anonymous
    if (data.isAnonymous) {
        delete data.userId;
    }

    const parsed = InterviewExperienceSchema.parse({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await dbCommand.collection("experiences").insertOne(parsed);

    // Fetch the newly created doc to return it
    const created = await dbQuery.collection("experiences").findOne({ _id: result.insertedId });

    if (created && created.isAnonymous) {
        delete created.userId;
    }

    res.status(201).json({
      status: "success",
      experience: created,
    });
  } catch (err: any) {
    console.error("POST /api/v1/experiences error:", err);
    res.status(400).json({ error: err.message || "Bad Request" });
  }
};
