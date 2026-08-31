import { Router } from "express";
import { getExperiences, createExperience } from "../controllers/experienceController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/experiences", getExperiences);
// Ensure we use auth if needed or leave it open if anonymous is allowed. 
// Assuming auth is required to protect the endpoint from spam, but users can check the `isAnonymous` box.
router.post("/experiences", authMiddleware, createExperience);

export default router;
