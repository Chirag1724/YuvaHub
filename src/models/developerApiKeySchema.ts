/**
 * Developer API Key Schema — Pure TypeScript (no Mongoose dependency)
 */

export type ApiKeyEnvironment = 'PRODUCTION' | 'STAGING' | 'SANDBOX';
export type ApiKeyStatus = 'ACTIVE' | 'RATE_LIMITED' | 'REVOKED';

export interface IDeveloperApiKey {
  id: string;
  keyName: string;
  environment: ApiKeyEnvironment;
  apiKeyMasked: string;
  monthlyQuotaUsagePercent: number;
  rateLimitReqSec: number;
  allowedIpRanges: string;
  status: ApiKeyStatus;
  createdAt: string;
  updatedAt: string;
}

const API_KEY_ENVIRONMENTS: readonly ApiKeyEnvironment[] = ['PRODUCTION', 'STAGING', 'SANDBOX'];
const API_KEY_STATUSES: readonly ApiKeyStatus[] = ['ACTIVE', 'RATE_LIMITED', 'REVOKED'];

export function createDeveloperApiKey(
  partial: Pick<IDeveloperApiKey, 'keyName' | 'apiKeyMasked'> &
    Partial<Omit<IDeveloperApiKey, 'keyName' | 'apiKeyMasked'>>,
): IDeveloperApiKey {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? `dak_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    keyName: partial.keyName,
    environment: partial.environment ?? 'PRODUCTION',
    apiKeyMasked: partial.apiKeyMasked,
    monthlyQuotaUsagePercent: partial.monthlyQuotaUsagePercent ?? 0.0,
    rateLimitReqSec: partial.rateLimitReqSec ?? 50,
    allowedIpRanges: partial.allowedIpRanges ?? '0.0.0.0/0',
    status: partial.status ?? 'ACTIVE',
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function isValidApiKeyEnvironment(value: string): value is ApiKeyEnvironment {
  return (API_KEY_ENVIRONMENTS as readonly string[]).includes(value);
}

export function isValidApiKeyStatus(value: string): value is ApiKeyStatus {
  return (API_KEY_STATUSES as readonly string[]).includes(value);
}

export function validateDeveloperApiKey(
  data: Record<string, unknown>,
): { valid: true; apiKey: IDeveloperApiKey } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof data.keyName !== 'string' || data.keyName.trim().length === 0) errors.push('keyName is required');
  if (typeof data.apiKeyMasked !== 'string' || data.apiKeyMasked.trim().length === 0) errors.push('apiKeyMasked is required');

  if (data.environment !== undefined && !isValidApiKeyEnvironment(String(data.environment))) {
    errors.push(`environment must be one of: ${API_KEY_ENVIRONMENTS.join(', ')}`);
  }
  if (data.status !== undefined && !isValidApiKeyStatus(String(data.status))) {
    errors.push(`status must be one of: ${API_KEY_STATUSES.join(', ')}`);
  }
  if (data.monthlyQuotaUsagePercent !== undefined) {
    const val = Number(data.monthlyQuotaUsagePercent);
    if (Number.isNaN(val) || val < 0 || val > 100) errors.push('monthlyQuotaUsagePercent must be 0-100');
  }
  if (data.rateLimitReqSec !== undefined && Number(data.rateLimitReqSec) < 1) {
    errors.push('rateLimitReqSec must be at least 1');
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    apiKey: createDeveloperApiKey({
      keyName: data.keyName as string,
      apiKeyMasked: data.apiKeyMasked as string,
      environment: data.environment as ApiKeyEnvironment | undefined,
      monthlyQuotaUsagePercent: data.monthlyQuotaUsagePercent as number | undefined,
      rateLimitReqSec: data.rateLimitReqSec as number | undefined,
      allowedIpRanges: data.allowedIpRanges as string | undefined,
      status: data.status as ApiKeyStatus | undefined,
    }),
  };
}
