import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── In-memory MongoDB mock ─────────────────────────────────────────────────

type Col = Map<string, any>;

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function setPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  const last = parts.pop()!;
  const target = parts.reduce((acc, k) => {
    if (acc[k] == null || typeof acc[k] !== "object") acc[k] = {};
    return acc[k];
  }, obj);
  target[last] = value;
}

function matches(filter: any, doc: any): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (key === "$or") {
      if (!(cond as any[]).some((sub) => matches(sub, doc))) return false;
      continue;
    }
    const value = key.includes(".") ? getPath(doc, key) : doc[key];
    if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof RegExp)) {
      if ("$gte" in cond && !(value >= cond.$gte)) return false;
      if ("$lte" in cond && !(value <= cond.$lte)) return false;
      if ("$in" in cond && !(cond.$in as any[]).some((v) => String(v) === String(value))) return false;
      continue;
    }
    if (cond instanceof RegExp) {
      if (!(typeof value === "string" && cond.test(value))) return false;
      continue;
    }
    if (value !== cond) return false;
  }
  return true;
}

/** Apply $set / $push / $pull updates (including positional "array.$" sets). */
function applyUpdate(doc: any, update: any, filter: any): void {
  if (update.$set && "_id" in update.$set) {
    throw new Error("Performing an update on the path '_id' would modify the immutable field '_id'");
  }
  for (const [key, value] of Object.entries(update.$set || {})) {
    if (key.includes(".$")) {
      const [arrayPath, rest] = key.split(".$", 2);
      const arr = getPath(doc, arrayPath);
      if (!Array.isArray(arr)) continue;
      let index = -1;
      for (const [fk, fv] of Object.entries(filter)) {
        if (fk.startsWith(`${arrayPath}.`) && fk.split(".").length === 2) {
          const field = fk.split(".")[1];
          index = arr.findIndex((it: any) => it[field] === fv);
          if (index >= 0) break;
        }
      }
      if (index < 0) continue;
      if (rest === "") arr[index] = value;
      else setPath(arr[index], rest, value);
    } else {
      setPath(doc, key, value);
    }
  }
  for (const [k, v] of Object.entries(update.$push || {})) {
    if (!Array.isArray(doc[k])) doc[k] = [];
    doc[k].push(v);
  }
  for (const [k, v] of Object.entries(update.$pull || {})) {
    if (!Array.isArray(doc[k])) continue;
    doc[k] = doc[k].filter((item: any) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return !Object.entries(v).every(([fk, fv]) => item[fk] === fv);
      }
      return item !== v;
    });
  }
}

function createMemoryDb() {
  const stores = new Map<string, Col>();
  const col = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  const findOne = (name: string, filter: any) => {
    for (const doc of col(name).values()) {
      if (matches(filter, doc)) return { ...doc };
    }
    return null;
  };
  const list = (name: string, filter: any) =>
    [...col(name).values()].filter((d) => matches(filter, d)).map((d) => ({ ...d }));

  const db = {
    collection(name: string) {
      return {
        async findOne(filter: any, _opts?: any) {
          return findOne(name, filter);
        },
        async findOneAndUpdate(filter: any, update: any, _opts?: any) {
          const existing = findOne(name, filter);
          if (!existing) return null;
          const doc = col(name).get(existing._id);
          if (!doc) return null;
          applyUpdate(doc, update, filter);
          return { ...doc };
        },
        find(filter: any) {
          return {
            sort() {
              return this;
            },
            skip() {
              return this;
            },
            limit() {
              return this;
            },
            toArray: async () => list(name, filter),
          };
        },
        async countDocuments(filter: any) {
          return list(name, filter).length;
        },
        async insertOne(doc: any) {
          const key = doc._id ?? `doc_${Math.random().toString(36).slice(2)}`;
          col(name).set(key, { ...doc, _id: key });
          return { insertedId: key };
        },
        async insertMany(docs: any[]) {
          for (const d of docs) await this.insertOne(d);
          return { insertedCount: docs.length };
        },
        async updateOne(filter: any, update: any, _opts?: any) {
          let doc: any = null;
          for (const stored of col(name).values()) {
            if (matches(filter, stored)) {
              doc = stored;
              break;
            }
          }
          if (!doc) return { modifiedCount: 0 };
          applyUpdate(doc, update, filter);
          return { modifiedCount: 1 };
        },
        async deleteOne(filter: any) {
          for (const [k, v] of col(name)) {
            if (matches(filter, v)) {
              col(name).delete(k);
              return { deletedCount: 1 };
            }
          }
          return { deletedCount: 0 };
        },
      };
    },
  };
  return {
    db,
    col,
    reset() {
      stores.forEach((c) => c.clear());
    },
  };
}

// Shared in-memory store exposed to the service through mocked db bindings.
const mem = createMemoryDb();

vi.mock("../src/api/db.js", () => ({
  get dbCommand() {
    return mem.db;
  },
  get dbQuery() {
    return mem.db;
  },
}));

vi.mock("../src/api/socketInstance.js", () => ({
  getSocketIO: () => null,
  setSocketIO: () => {},
}));

import {
  addActionItem,
  addNote,
  bookSession,
  buildSlotDateTime,
  deleteNote,
  getSessionLedger,
  localSlotDate,
  slotDurationHours,
  submitFeedback,
  transitionSessionStatus,
  updateAvailabilitySlot,
  upsertMentorProfile,
} from "../src/services/mentorshipService";

const openSlot = {
  _id: "slot_open_1",
  mentorUid: "mentor_1",
  mentorName: "Ananya Sharma",
  date: "2026-08-20",
  startTime: "17:00",
  endTime: "18:00",
  timezone: "Asia/Kolkata",
  status: "open",
};

const mentorProfile = {
  mentorUid: "mentor_1",
  name: "Ananya Sharma",
  company: "Google",
  skills: ["System Design"],
  verificationStatus: "approved",
  isActive: true,
};

function seedSession(status: string, overrides: Record<string, any> = {}) {
  mem.col("mentorship_sessions").set("s1", {
    _id: "s1",
    sessionId: "sess_1",
    mentorUid: "mentor_1",
    mentorName: "Ananya Sharma",
    studentUid: "student_1",
    studentName: "Rahul",
    topic: "Resume Review",
    slotDateTime: "2026-08-20 at 17:00 IST",
    meetingUrl: "https://meet.jit.si/yuvahub-mentorship-sess_1",
    slot: { date: "2026-08-20", startTime: "17:00", endTime: "18:00" },
    status,
    statusHistory: [],
    notes: [],
    actionItems: [],
    reminderTimestamps: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

beforeEach(() => {
  mem.reset();
});

describe("mentorshipService helpers", () => {
  it("localSlotDate interprets times in IST (UTC+05:30)", () => {
    const d = localSlotDate("2026-08-20", "17:00");
    expect(d.getTime()).toBe(Date.parse("2026-08-20T11:30:00Z"));
  });

  it("slotDurationHours computes whole-hour durations", () => {
    expect(slotDurationHours("17:00", "18:00")).toBe(1);
    expect(slotDurationHours("09:00", "17:30")).toBe(8.5);
    expect(slotDurationHours("18:00", "17:00")).toBe(0);
  });

  it("buildSlotDateTime renders a readable string", () => {
    expect(buildSlotDateTime("2026-08-20", "17:00")).toBe("2026-08-20 at 17:00 IST");
  });
});

describe("mentorshipService booking", () => {
  it("books an open slot atomically and creates a pending session", async () => {
    mem.col("mentor_profiles").set("p1", { ...mentorProfile });
    mem.col("mentor_availability").set(openSlot._id, { ...openSlot });

    const session = await bookSession({
      studentUid: "student_1",
      studentName: "Rahul",
      mentorUid: "mentor_1",
      slotId: "slot_open_1",
      topic: "System Design Review",
    });

    expect(session.sessionId).toMatch(/^sess_/);
    expect(session.status).toBe("pending");
    expect(session.mentorName).toBe("Ananya Sharma");
    expect(session.studentUid).toBe("student_1");
    expect(session.meetingUrl).toContain("meet.jit.si");

    const slotAfter = mem.col("mentor_availability").get("slot_open_1");
    expect(slotAfter.status).toBe("booked");
    expect(slotAfter.sessionId).toBe(session.sessionId);
  });

  it("rejects booking when the slot is already taken", async () => {
    mem.col("mentor_profiles").set("p1", { ...mentorProfile });
    mem.col("mentor_availability").set("slot_taken", { ...openSlot, _id: "slot_taken", status: "booked" });

    await expect(
      bookSession({
        studentUid: "student_1",
        mentorUid: "mentor_1",
        slotId: "slot_taken",
        topic: "System Design Review",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects booking for a mentor who is not approved", async () => {
    mem.col("mentor_profiles").set("p1", { ...mentorProfile, verificationStatus: "pending" });
    mem.col("mentor_availability").set("slot_x", { ...openSlot, _id: "slot_x" });

    await expect(
      bookSession({
        studentUid: "student_1",
        mentorUid: "mentor_1",
        slotId: "slot_x",
        topic: "System Design Review",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("mentorshipService status transitions", () => {
  it("allows a student to cancel a pending session", async () => {
    seedSession("pending");
    const session = await transitionSessionStatus({
      sessionId: "sess_1",
      actorUid: "student_1",
      status: "cancelled",
    });
    expect(session.status).toBe("cancelled");
  });

  it("allows a mentor to confirm a pending session", async () => {
    seedSession("pending");
    const session = await transitionSessionStatus({
      sessionId: "sess_1",
      actorUid: "mentor_1",
      actorRole: "mentor",
      status: "confirmed",
    });
    expect(session.status).toBe("confirmed");
  });

  it("forbids a student from confirming a pending session", async () => {
    seedSession("pending");
    await expect(
      transitionSessionStatus({
        sessionId: "sess_1",
        actorUid: "student_1",
        status: "confirmed",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("forbids a non-participant from changing status", async () => {
    seedSession("pending");
    await expect(
      transitionSessionStatus({
        sessionId: "sess_1",
        actorUid: "stranger_1",
        status: "cancelled",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("completes a session only from in_progress by the mentor", async () => {
    seedSession("in_progress");
    const session = await transitionSessionStatus({
      sessionId: "sess_1",
      actorUid: "mentor_1",
      actorRole: "mentor",
      status: "completed",
    });
    expect(session.status).toBe("completed");
  });
});

describe("mentorshipService profile upsert", () => {
  it("updates an existing profile without touching the immutable _id", async () => {
    mem.col("mentor_profiles").set("p1", {
      _id: "p1",
      mentorUid: "mentor_1",
      name: "Ananya Sharma",
      email: "ananya@example.com",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    const profile = await upsertMentorProfile("mentor_1", {
      company: "Google",
      headline: "Staff SWE",
    });

    expect(profile.company).toBe("Google");
    const stored = mem.col("mentor_profiles").get("p1");
    expect(stored._id).toBe("p1");
    expect(stored.company).toBe("Google");
    expect(stored.headline).toBe("Staff SWE");
  });
});

describe("mentorshipService availability updates", () => {
  it("rejects rescheduling a booked slot", async () => {
    mem.col("mentor_availability").set("slot_booked", {
      _id: "slot_booked",
      mentorUid: "mentor_1",
      mentorName: "Ananya Sharma",
      date: "2026-08-20",
      startTime: "17:00",
      endTime: "18:00",
      timezone: "Asia/Kolkata",
      status: "booked",
      sessionId: "sess_1",
    });

    await expect(
      updateAvailabilitySlot({
        slotId: "slot_booked",
        mentorUid: "mentor_1",
        patch: { startTime: "18:00" },
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("allows updating a non-booked slot", async () => {
    mem.col("mentor_availability").set("slot_open", {
      _id: "slot_open",
      mentorUid: "mentor_1",
      mentorName: "Ananya Sharma",
      date: "2026-08-20",
      startTime: "17:00",
      endTime: "18:00",
      timezone: "Asia/Kolkata",
      status: "open",
    });

    const slot = await updateAvailabilitySlot({
      slotId: "slot_open",
      mentorUid: "mentor_1",
      patch: { startTime: "18:00" },
    });
    expect(slot.startTime).toBe("18:00");
  });
});

describe("mentorshipService ledger, action items & feedback", () => {
  it("returns only sessions the user participates in", async () => {
    seedSession("pending", { sessionId: "sess_1" });
    mem.col("mentorship_sessions").set("s2", {
      _id: "s2",
      sessionId: "sess_2",
      mentorUid: "mentor_2",
      studentUid: "other_student",
      topic: "B",
      status: "pending",
      notes: [],
      actionItems: [],
      createdAt: new Date(),
    });

    const result = await getSessionLedger({ uid: "student_1" });
    expect(result.sessions.map((s: any) => s.sessionId)).toEqual(["sess_1"]);
    expect(result.total).toBe(1);
  });

  it("adds an action item only for session participants", async () => {
    seedSession("pending");

    const item = await addActionItem({
      sessionId: "sess_1",
      actorUid: "student_1",
      title: "Redo resume bullet points",
    });
    expect(item.itemId).toMatch(/^item_/);
    expect(item.status).toBe("open");

    await expect(
      addActionItem({ sessionId: "sess_1", actorUid: "outsider", title: "Nope" }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("persists notes and action items on the session document", async () => {
    seedSession("pending");
    const note = await addNote({
      sessionId: "sess_1",
      actorUid: "student_1",
      content: "Fix the intro paragraph",
    });
    const item = await addActionItem({
      sessionId: "sess_1",
      actorUid: "student_1",
      title: "Redo resume bullet points",
    });

    const stored = mem.col("mentorship_sessions").get("s1");
    expect(stored.notes.map((n: any) => n.noteId)).toContain(note.noteId);
    expect(stored.actionItems.map((i: any) => i.itemId)).toContain(item.itemId);

    await deleteNote({ sessionId: "sess_1", actorUid: "student_1", noteId: note.noteId });
    expect(mem.col("mentorship_sessions").get("s1").notes.map((n: any) => n.noteId)).not.toContain(
      note.noteId,
    );
  });

  it("allows feedback only after completion, by the student", async () => {
    seedSession("completed");

    const result = await submitFeedback({
      sessionId: "sess_1",
      actorUid: "student_1",
      rating: 5,
      comment: "Super helpful",
    });
    expect(result.rating).toBe(5);

    await expect(
      submitFeedback({ sessionId: "sess_1", actorUid: "mentor_1", rating: 4 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
