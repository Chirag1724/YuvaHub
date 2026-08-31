import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../src/api/db.js", () => ({
  dbCommand: null,
  dbQuery: null,
}));

vi.mock("../src/api/socketInstance.js", () => ({
  getSocketIO: () => null,
  setSocketIO: () => {},
}));

vi.mock("../src/api/redis.js", () => ({
  redisClient: null,
  createFailOpenStore: () => ({
    increment: async () => ({ hits: 0, resetTime: new Date(Date.now() + 15 * 60 * 1000) }),
    decrement: async () => {},
    resetKey: async () => {},
  }),
  DEFAULT_CACHE_TTL: 300,
  normalizeCacheTtl: (ttl: unknown, fallback: number = 300) =>
    Number.isSafeInteger(ttl) && (ttl as number) > 0 ? ttl : fallback,
  cacheSet: async () => false,
  cacheGet: async () => null,
  getOrSet: async (_key: string, factory: () => Promise<unknown>) => factory(),
}));

import mentorshipRoutes from "../src/api/routes/mentorshipRoutes";
import { adminOnly, authMiddleware } from "../src/api/middlewares/auth.js";

function listRoutes(): { method: string; path: string }[] {
  const out: { method: string; path: string }[] = [];
  for (const layer of (mentorshipRoutes as any).stack || []) {
    if (layer.route) {
      const method = Object.keys(layer.route.methods).join(",").toUpperCase();
      out.push({ method, path: (layer.route.path as string) || "" });
    }
  }
  return out;
}

function routeHandlers(method: string, path: string): any[] {
  const layer = (mentorshipRoutes as any).stack.find(
    (l: any) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  return layer ? layer.route.stack.map((h: any) => h.handle) : [];
}

describe("mentorship routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the legacy compatibility endpoints", () => {
    const paths = listRoutes().map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain("GET /mentorship/availability");
    expect(paths).toContain("POST /mentorship/book");
    expect(paths).toContain("GET /mentorship/sessions");
    expect(paths).toContain("PATCH /mentorship/sessions/status");
  });

  it("registers the advisory board discovery endpoints", () => {
    const paths = listRoutes().map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain("GET /mentors");
    expect(paths).toContain("GET /mentors/:uid");
  });

  it("registers the mentor studio endpoints", () => {
    const paths = listRoutes().map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain("GET /mentor-studio/profile");
    expect(paths).toContain("PUT /mentor-studio/profile");
    expect(paths).toContain("GET /mentor-studio/availability");
    expect(paths).toContain("POST /mentor-studio/availability");
    expect(paths).toContain("DELETE /mentor-studio/availability/:slotId");
    expect(paths).toContain("GET /mentor-studio/sessions/:id");
    expect(paths).toContain("PATCH /mentor-studio/sessions/:id/status");
    expect(paths).toContain("POST /mentor-studio/sessions/:id/notes");
    expect(paths).toContain("POST /mentor-studio/sessions/:id/action-items");
    expect(paths).toContain("POST /mentor-studio/sessions/:id/feedback");
    expect(paths).toContain("GET /mentor-studio/analytics");
  });

  it("registers the mentor application endpoints", () => {
    const paths = listRoutes().map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain("POST /mentor-applications");
    expect(paths).toContain("GET /mentor-applications/me");
    expect(paths).toContain("GET /mentor-applications");
    expect(paths).toContain("PATCH /mentor-applications/:applicationId/review");
  });

  it("protects write and user-scoped endpoints with auth middleware", () => {
    const protectedRoutes: [string, string][] = [
      ["post", "/mentorship/book"],
      ["get", "/mentorship/sessions"],
      ["patch", "/mentorship/sessions/status"],
      ["get", "/mentor-studio/profile"],
      ["put", "/mentor-studio/profile"],
      ["post", "/mentor-studio/availability"],
      ["delete", "/mentor-studio/availability/:slotId"],
      ["get", "/mentor-studio/sessions/:id"],
      ["patch", "/mentor-studio/sessions/:id/status"],
      ["post", "/mentor-applications"],
      ["get", "/mentor-applications/me"],
      ["patch", "/mentor-applications/:applicationId/review"],
    ];
    for (const [method, path] of protectedRoutes) {
      expect(routeHandlers(method, path)).toContain(authMiddleware);
    }
  });

  it("protects the mentor application review endpoint with admin auth", () => {
    expect(routeHandlers("patch", "/mentor-applications/:applicationId/review")).toContain(adminOnly);
    expect(routeHandlers("get", "/mentor-applications")).toContain(adminOnly);
  });
});
