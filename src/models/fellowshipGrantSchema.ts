/**
 * Fellowship Grant Schema — Pure TypeScript (no Mongoose dependency)
 */

export type FellowshipStatus = 'OPEN_APPLICATIONS' | 'INTERVIEW_PHASE' | 'AWARDED';

export interface IFellowshipGrant {
  id: string;
  fellowshipTitle: string;
  grantProvider: string;
  eligibleDomain: string;
  stipendAmountMonthlyINR: number;
  durationMonths: number;
  aiEligibilityMatchScore: number;
  applicationDeadline: string;
  status: FellowshipStatus;
  keyRequirement: string;
  createdAt: string;
  updatedAt: string;
}

const FELLOWSHIP_STATUSES: readonly FellowshipStatus[] = [
  'OPEN_APPLICATIONS',
  'INTERVIEW_PHASE',
  'AWARDED',
];

export function createFellowshipGrant(
  partial: Pick<IFellowshipGrant, 'fellowshipTitle' | 'grantProvider' | 'eligibleDomain' | 'keyRequirement'> &
    Partial<Omit<IFellowshipGrant, 'fellowshipTitle' | 'grantProvider' | 'eligibleDomain' | 'keyRequirement'>>,
): IFellowshipGrant {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? `fg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    fellowshipTitle: partial.fellowshipTitle,
    grantProvider: partial.grantProvider,
    eligibleDomain: partial.eligibleDomain,
    stipendAmountMonthlyINR: partial.stipendAmountMonthlyINR ?? 50000,
    durationMonths: partial.durationMonths ?? 12,
    aiEligibilityMatchScore: partial.aiEligibilityMatchScore ?? 90.0,
    applicationDeadline: partial.applicationDeadline ?? 'Dec 31, 2026',
    status: partial.status ?? 'OPEN_APPLICATIONS',
    keyRequirement: partial.keyRequirement,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function isValidFellowshipStatus(value: string): value is FellowshipStatus {
  return (FELLOWSHIP_STATUSES as readonly string[]).includes(value);
}

export function validateFellowshipGrant(
  data: Record<string, unknown>,
): { valid: true; grant: IFellowshipGrant } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof data.fellowshipTitle !== 'string' || data.fellowshipTitle.trim().length === 0) {
    errors.push('fellowshipTitle is required');
  }
  if (typeof data.grantProvider !== 'string' || data.grantProvider.trim().length === 0) {
    errors.push('grantProvider is required');
  }
  if (typeof data.eligibleDomain !== 'string' || data.eligibleDomain.trim().length === 0) {
    errors.push('eligibleDomain is required');
  }
  if (typeof data.keyRequirement !== 'string' || data.keyRequirement.trim().length === 0) {
    errors.push('keyRequirement is required');
  }
  if (data.stipendAmountMonthlyINR !== undefined && Number(data.stipendAmountMonthlyINR) < 0) {
    errors.push('stipendAmountMonthlyINR must be non-negative');
  }
  if (data.durationMonths !== undefined && Number(data.durationMonths) < 1) {
    errors.push('durationMonths must be at least 1');
  }
  if (data.aiEligibilityMatchScore !== undefined) {
    const score = Number(data.aiEligibilityMatchScore);
    if (score < 0 || score > 100) errors.push('aiEligibilityMatchScore must be 0-100');
  }
  if (data.status !== undefined && !isValidFellowshipStatus(String(data.status))) {
    errors.push(`status must be one of: ${FELLOWSHIP_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    grant: createFellowshipGrant({
      fellowshipTitle: data.fellowshipTitle as string,
      grantProvider: data.grantProvider as string,
      eligibleDomain: data.eligibleDomain as string,
      keyRequirement: data.keyRequirement as string,
      stipendAmountMonthlyINR: data.stipendAmountMonthlyINR as number | undefined,
      durationMonths: data.durationMonths as number | undefined,
      aiEligibilityMatchScore: data.aiEligibilityMatchScore as number | undefined,
      applicationDeadline: data.applicationDeadline as string | undefined,
      status: data.status as FellowshipStatus | undefined,
    }),
  };
}
