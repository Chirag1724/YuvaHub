import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  API_VERSIONING_POLICY_URL,
  getLegacyAliasInfo,
  getVersionInfo,
  toHttpDate,
} from "./registry.js";

const VERSION_SEGMENT_PATTERN = /^v(\d+)$/;

export interface ParsedApiVersion {
  version?: string;
  legacyAlias?: string;
}

export function parseVersionFromRequest(
  req: Pick<Request, "baseUrl" | "path">,
): ParsedApiVersion | null {
  const pathSegments = req.path.split("/").filter(Boolean);
  if (pathSegments[0] === "docs") return null;

  const segments = [...req.baseUrl.split("/"), ...pathSegments].filter(Boolean);

  for (const segment of segments) {
    const match = VERSION_SEGMENT_PATTERN.exec(segment);
    if (match) return { version: `v${match[1]}` };
  }

  if (segments.length > 0) return { legacyAlias: "root" };

  return null;
}

export function apiVersionHeaders(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (res.locals.apiVersioningApplied) {
      return next();
    }
    res.locals.apiVersioningApplied = true;

    try {
      const parsed = parseVersionFromRequest(req);

      if (parsed?.version) {
        res.setHeader("X-API-Version", parsed.version);
        const info = getVersionInfo(parsed.version);
        if (info?.status === "deprecated") {
          applyDeprecationHeaders(res, info.sunsetAt, info.docsUrl);
        }
      } else if (parsed?.legacyAlias) {
        const alias = getLegacyAliasInfo(parsed.legacyAlias);
        if (alias) {
          res.setHeader("X-API-Version", alias.targets);
          applyDeprecationHeaders(res, alias.sunsetAt, alias.docsUrl);
        }
      }
    } catch {
      // header bookkeeping must never break the request
    }

    next();
  };
}

function applyDeprecationHeaders(
  res: Response,
  sunsetAt: string | undefined,
  docsUrl: string,
): void {
  res.setHeader("Deprecation", "true");
  const sunset = sunsetAt ? toHttpDate(sunsetAt) : "";
  if (sunset) res.setHeader("Sunset", sunset);
  res.append("Link", `<${docsUrl}>; rel="deprecation"; type="text/html"`);
  res.append(
    "Link",
    `<${API_VERSIONING_POLICY_URL}>; rel="sunset"; type="text/html"`,
  );
}
