import { describe, expect, it } from "vitest";
import {
  BookSessionInputSchema,
  CreateAvailabilityInputSchema,
  FeedbackInputSchema,
  MentorApplicationInputSchema,
  UpdateSessionStatusInputSchema,
} from "../src/models/mentorshipSchema";

describe("mentorship input schemas", () => {
  it("accepts a valid booking payload", () => {
    const result = BookSessionInputSchema.safeParse({
      mentorUid: "m_1",
      slotId: "slot_1",
      topic: "System Design",
      agenda: "Review my architecture",
      studentName: "Rahul",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a booking without a slotId", () => {
    const result = BookSessionInputSchema.safeParse({
      mentorUid: "m_1",
      topic: "System Design",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a booking with an empty topic", () => {
    const result = BookSessionInputSchema.safeParse({
      mentorUid: "m_1",
      slotId: "slot_1",
      topic: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("enforces YYYY-MM-DD and HH:mm formats on availability slots", () => {
    expect(
      CreateAvailabilityInputSchema.safeParse({
        slots: [{ date: "2026-08-20", startTime: "17:00", endTime: "18:00" }],
      }).success,
    ).toBe(true);

    expect(
      CreateAvailabilityInputSchema.safeParse({
        slots: [{ date: "20-08-2026", startTime: "5 PM", endTime: "18:00" }],
      }).success,
    ).toBe(false);
  });

  it("requires at least one slot when bulk-publishing availability", () => {
    const result = CreateAvailabilityInputSchema.safeParse({ slots: [] });
    expect(result.success).toBe(false);
  });

  it("accepts feedback ratings 1..5 and rejects out-of-range ratings", () => {
    expect(FeedbackInputSchema.safeParse({ rating: 5, comment: "Great" }).success).toBe(true);
    expect(FeedbackInputSchema.safeParse({ rating: 1 }).success).toBe(true);
    expect(FeedbackInputSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(FeedbackInputSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(FeedbackInputSchema.safeParse({ rating: 2.5 }).success).toBe(false);
  });

  it("accepts valid session status values only", () => {
    expect(UpdateSessionStatusInputSchema.safeParse({ status: "confirmed" }).success).toBe(true);
    expect(UpdateSessionStatusInputSchema.safeParse({ status: "no_show" }).success).toBe(true);
    expect(UpdateSessionStatusInputSchema.safeParse({ status: "Confirmed" }).success).toBe(false);
    expect(UpdateSessionStatusInputSchema.safeParse({ status: "declined" }).success).toBe(false);
  });

  it("rejects mentor applications with a too-short motivation", () => {
    const base = {
      name: "Ananya Sharma",
      email: "ananya@example.com",
      experienceYears: 5,
      whyMentor: "short",
    };
    const result = MentorApplicationInputSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("rejects mentor applications with an invalid email", () => {
    const base = {
      name: "Ananya Sharma",
      email: "not-an-email",
      experienceYears: 5,
      whyMentor: "I want to give back by mentoring students in system design interviews.",
    };
    const result = MentorApplicationInputSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("accepts a complete, valid mentor application", () => {
    const result = MentorApplicationInputSchema.safeParse({
      name: "Ananya Sharma",
      email: "ananya@example.com",
      linkedinUrl: "https://linkedin.com/in/ananya",
      collegeCompany: "Google",
      field: "ML Engineering",
      experienceYears: 6,
      skills: ["Python", "Machine Learning"],
      availability: ["Weekends"],
      whyMentor: "I want to give back by mentoring students in system design interviews.",
    });
    expect(result.success).toBe(true);
  });
});
