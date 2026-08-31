import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import apiRoutes from "../src/api/routes/index";
import {
  apiVersionHeaders,
  parseVersionFromRequest,
} from "../src/api/versioning/middleware";
import {
  API_VERSIONING_POLICY_URL,
  getLegacyAliasInfo,
  getVersionInfo,
  isVersionDeprecated,
  legacyAliases,
  listDeprecatedVersions,
  toHttpDate,
  versions,
} from "../src/api/versioning/registry";

const servers: Array<ReturnType<express.Express["listen"]>> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function startTestServer() {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRoutes);

  app.get("*splat", (_req, res) => {
    res.status(404).json({ error: "SPA fallback reached" });
  });

  const server = app.listen(0, "127.0.0.1");
  servers.push(server);

  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function startTransitionServer() {
  const app = express();
  app.use(express.json());
  app.use("/api", apiVersionHeaders());

  const legacyRouter = express.Router();
  legacyRouter.get("/ping", (_req, res) => res.json({ pong: "legacy" }));

  const v1Router = express.Router();
  v1Router.get("/ping", (_req, res) => res.json({ pong: "v1" }));

  const v2Router = express.Router();
  v2Router.get("/ping", (_req, res) => res.json({ pong: "v2" }));

  app.use("/api/v2", apiVersionHeaders(), v2Router);
  app.use("/api/v1", apiVersionHeaders(), v1Router);
  app.use("/api", legacyRouter);

  const server = app.listen(0, "127.0.0.1");
  servers.push(server);

  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function stripVolatile(body: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...body };
  delete copy.timestamp;
  return copy;
}

describe("parseVersionFromRequest", () => {
  it("detects a version from the request path", () => {
    expect(
      parseVersionFromRequest({ baseUrl: "/api", path: "/v1/health" }),
    ).toEqual({ version: "v1" });
  });

  it("detects a version from the router mount baseUrl", () => {
    expect(
      parseVersionFromRequest({ baseUrl: "/api/v1", path: "/health" }),
    ).toEqual({ version: "v1" });
  });

  it("supports future versions (v2)", () => {
    expect(
      parseVersionFromRequest({ baseUrl: "/api/v2", path: "/ping" }),
    ).toEqual({ version: "v2" });
  });

  it("flags unversioned requests as the legacy alias", () => {
    expect(
      parseVersionFromRequest({ baseUrl: "/api", path: "/opportunities" }),
    ).toEqual({ legacyAlias: "root" });
  });

  it("ignores documentation paths", () => {
    expect(
      parseVersionFromRequest({ baseUrl: "/api", path: "/docs" }),
    ).toBeNull();
  });
});

describe("API version registry", () => {
  it("registers v1 as the active version", () => {
    expect(getVersionInfo("v1")?.status).toBe("active");
    expect(isVersionDeprecated("v1")).toBe(false);
  });

  it("registers the legacy /api alias as deprecated", () => {
    const alias = getLegacyAliasInfo("root");
    expect(alias?.status).toBe("deprecated");
    expect(alias?.targets).toBe("v1");
    expect(alias?.sunsetAt).toBe("2027-06-30");
    expect(legacyAliases.root).toBeDefined();
  });

  it("lists no deprecated versions while v1 is active", () => {
    expect(listDeprecatedVersions()).toEqual([]);
  });

  it("formats sunset dates as RFC 1123 HTTP dates", () => {
    expect(toHttpDate("2027-06-30")).toBe("Wed, 30 Jun 2027 00:00:00 GMT");
  });
});

describe("legacy alias stability sniff (Issue #674)", () => {
  it.each(["/health", "/opportunities"])(
    "legacy %s stays stable against /api/v1",
    async (path) => {
      const baseUrl = await startTestServer();

      const [legacy, versioned] = await Promise.all([
        fetch(`${baseUrl}/api${path}`),
        fetch(`${baseUrl}/api/v1${path}`),
      ]);

      expect(legacy.status).toBe(versioned.status);
      expect(stripVolatile(await legacy.json())).toEqual(
        stripVolatile(await versioned.json()),
      );
    },
  );

  it("marks the legacy alias as deprecated with Sunset + Link headers", async () => {
    const baseUrl = await startTestServer();
    const response = await fetch(`${baseUrl}/api/opportunities`);
    const link = response.headers.get("link") || "";

    expect(response.status).toBe(200);
    expect(response.headers.get("x-api-version")).toBe("v1");
    expect(response.headers.get("deprecation")).toBe("true");
    expect(response.headers.get("sunset")).toBe(
      toHttpDate(getLegacyAliasInfo("root")?.sunsetAt || ""),
    );
    expect(link).toContain(API_VERSIONING_POLICY_URL);
    expect(link).toContain('rel="deprecation"');
    expect(link).toContain('rel="sunset"');
  });

  it("does not deprecate the canonical /api/v1 namespace", async () => {
    const baseUrl = await startTestServer();
    const response = await fetch(`${baseUrl}/api/v1/opportunities`);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-api-version")).toBe("v1");
    expect(response.headers.get("deprecation")).toBeNull();
    expect(response.headers.get("sunset")).toBeNull();
  });
});

describe("concurrent v1/v2 operation during transition", () => {
  it("serves legacy, v1, and v2 simultaneously", async () => {
    const baseUrl = await startTransitionServer();

    const legacy = await fetch(`${baseUrl}/api/ping`);
    expect(legacy.status).toBe(200);
    expect(await legacy.json()).toEqual({ pong: "legacy" });
    expect(legacy.headers.get("deprecation")).toBe("true");
    expect(legacy.headers.get("x-api-version")).toBe("v1");

    const v1 = await fetch(`${baseUrl}/api/v1/ping`);
    expect(v1.status).toBe(200);
    expect(await v1.json()).toEqual({ pong: "v1" });
    expect(v1.headers.get("deprecation")).toBeNull();
    expect(v1.headers.get("x-api-version")).toBe("v1");

    const v2 = await fetch(`${baseUrl}/api/v2/ping`);
    expect(v2.status).toBe(200);
    expect(await v2.json()).toEqual({ pong: "v2" });
    expect(v2.headers.get("deprecation")).toBeNull();
    expect(v2.headers.get("x-api-version")).toBe("v2");
  });

  it("emits each deprecation Link header only once", async () => {
    const baseUrl = await startTransitionServer();
    const response = await fetch(`${baseUrl}/api/ping`);
    const link = response.headers.get("link") || "";

    expect(link.split('rel="deprecation"').length - 1).toBe(1);
    expect(link.split('rel="sunset"').length - 1).toBe(1);
  });
});

describe("deprecated version advertises Sunset + Deprecation", () => {
  beforeEach(() => {
    versions.v2 = {
      version: "v2",
      status: "deprecated",
      introducedAt: "2026-08-01",
      deprecatedAt: "2026-08-15",
      sunsetAt: "2027-08-15",
      docsUrl: `${API_VERSIONING_POLICY_URL}#api-v2`,
    };
  });

  afterEach(() => {
    delete versions.v2;
  });

  it("emits Deprecation and Sunset headers for /api/v2", async () => {
    const baseUrl = await startTransitionServer();
    const response = await fetch(`${baseUrl}/api/v2/ping`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pong: "v2" });
    expect(response.headers.get("x-api-version")).toBe("v2");
    expect(response.headers.get("deprecation")).toBe("true");
    expect(response.headers.get("sunset")).toBe(
      toHttpDate("2027-08-15"),
    );
    expect(response.headers.get("link")).toContain('rel="deprecation"');
  });

  it("appears in the deprecated version list", () => {
    expect(isVersionDeprecated("v2")).toBe(true);
    expect(listDeprecatedVersions()).toContain("v2");
  });
});
