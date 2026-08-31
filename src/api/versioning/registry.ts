export type ApiVersionStatus = "active" | "deprecated";

export interface ApiVersionInfo {
  version: string;
  status: ApiVersionStatus;
  introducedAt: string;
  deprecatedAt?: string;
  sunsetAt?: string;
  migrationTarget?: string;
  docsUrl: string;
}

export interface LegacyAliasInfo {
  targets: string;
  status: ApiVersionStatus;
  deprecatedAt: string;
  sunsetAt: string;
  docsUrl: string;
}

export const API_VERSIONING_POLICY_URL =
  "https://github.com/uditt490-pixel/YuvaHub/blob/main/docs/API_VERSIONING.md";

export const API_V1_DOCS_URL = `${API_VERSIONING_POLICY_URL}#api-v1`;

export const versions: Record<string, ApiVersionInfo> = {
  v1: {
    version: "v1",
    status: "active",
    introducedAt: "2025-01-01",
    docsUrl: API_V1_DOCS_URL,
  },
};

export const legacyAliases: Record<string, LegacyAliasInfo> = {
  root: {
    targets: "v1",
    status: "deprecated",
    deprecatedAt: "2026-08-01",
    sunsetAt: "2027-06-30",
    docsUrl: API_VERSIONING_POLICY_URL,
  },
};

export function getVersionInfo(version: string): ApiVersionInfo | undefined {
  return versions[version];
}

export function isVersionDeprecated(version: string): boolean {
  return versions[version]?.status === "deprecated";
}

export function getLegacyAliasInfo(key: string): LegacyAliasInfo | undefined {
  return legacyAliases[key];
}

export function toHttpDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toUTCString();
}

export function listDeprecatedVersions(): string[] {
  return Object.values(versions)
    .filter((version) => version.status === "deprecated")
    .map((version) => version.version);
}
