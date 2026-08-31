/**
 * Incubation Startup Schema — Pure TypeScript (no Mongoose dependency)
 *
 * Defines the shape of an incubation startup cohort record and provides
 * lightweight validation / default-factory helpers that mirror what a
 * Mongoose model would do at the application layer.
 */

// ---------------------------------------------------------------------------
// Types & Enums
// ---------------------------------------------------------------------------

export type MilestoneStage =
  | 'MILESTONE_1_MVP'
  | 'MILESTONE_2_TRACTION'
  | 'MILESTONE_3_SCALE';

export type IncubationStatus = 'GRANT_APPROVED' | 'IN_AUDIT' | 'FUNDED';

// ---------------------------------------------------------------------------
// Core Interface
// ---------------------------------------------------------------------------

export interface IIncubationStartup {
  id: string;
  startupName: string;
  sectorDomain: string;
  foundingLead: string;
  totalGrantDisbursedINR: number;
  milestoneStage: MilestoneStage;
  investorReadinessScore: number;
  cohortYear: string;
  status: IncubationStatus;
  keyTractionMetric: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const MILESTONE_STAGES: readonly MilestoneStage[] = [
  'MILESTONE_1_MVP',
  'MILESTONE_2_TRACTION',
  'MILESTONE_3_SCALE',
];

const INCUBATION_STATUSES: readonly IncubationStatus[] = [
  'GRANT_APPROVED',
  'IN_AUDIT',
  'FUNDED',
];

/**
 * Returns a new {@link IIncubationStartup} with sensible defaults for every
 * optional / auto-generated field. The caller only needs to supply the
 * business-critical data.
 */
export function createIncubationStartup(
  partial: Pick<
    IIncubationStartup,
    'startupName' | 'sectorDomain' | 'foundingLead' | 'keyTractionMetric'
  > &
    Partial<Omit<IIncubationStartup, 'startupName' | 'sectorDomain' | 'foundingLead' | 'keyTractionMetric'>>,
): IIncubationStartup {
  const now = new Date().toISOString();

  return {
    id: partial.id ?? generateId(),
    startupName: partial.startupName,
    sectorDomain: partial.sectorDomain,
    foundingLead: partial.foundingLead,
    totalGrantDisbursedINR: partial.totalGrantDisbursedINR ?? 0,
    milestoneStage: partial.milestoneStage ?? 'MILESTONE_1_MVP',
    investorReadinessScore: partial.investorReadinessScore ?? 80.0,
    cohortYear: partial.cohortYear ?? `Cohort ${new Date().getFullYear()}-Q1`,
    status: partial.status ?? 'IN_AUDIT',
    keyTractionMetric: partial.keyTractionMetric,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidMilestoneStage(value: string): value is MilestoneStage {
  return (MILESTONE_STAGES as readonly string[]).includes(value);
}

export function isValidIncubationStatus(value: string): value is IncubationStatus {
  return (INCUBATION_STATUSES as readonly string[]).includes(value);
}

export function validateIncubationStartup(
  data: Record<string, unknown>,
): { valid: true; startup: IIncubationStartup } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof data.startupName !== 'string' || data.startupName.trim().length === 0) {
    errors.push('startupName is required and must be a non-empty string');
  }

  if (typeof data.sectorDomain !== 'string' || data.sectorDomain.trim().length === 0) {
    errors.push('sectorDomain is required and must be a non-empty string');
  }

  if (typeof data.foundingLead !== 'string' || data.foundingLead.trim().length === 0) {
    errors.push('foundingLead is required and must be a non-empty string');
  }

  if (typeof data.keyTractionMetric !== 'string' || data.keyTractionMetric.trim().length === 0) {
    errors.push('keyTractionMetric is required and must be a non-empty string');
  }

  if (data.totalGrantDisbursedINR !== undefined) {
    const grant = Number(data.totalGrantDisbursedINR);
    if (Number.isNaN(grant) || grant < 0) {
      errors.push('totalGrantDisbursedINR must be a non-negative number');
    }
  }

  if (data.investorReadinessScore !== undefined) {
    const score = Number(data.investorReadinessScore);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      errors.push('investorReadinessScore must be a number between 0 and 100');
    }
  }

  if (data.milestoneStage !== undefined && !isValidMilestoneStage(String(data.milestoneStage))) {
    errors.push(`milestoneStage must be one of: ${MILESTONE_STAGES.join(', ')}`);
  }

  if (data.status !== undefined && !isValidIncubationStatus(String(data.status))) {
    errors.push(`status must be one of: ${INCUBATION_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    startup: createIncubationStartup({
      startupName: data.startupName as string,
      sectorDomain: data.sectorDomain as string,
      foundingLead: data.foundingLead as string,
      keyTractionMetric: data.keyTractionMetric as string,
      totalGrantDisbursedINR: data.totalGrantDisbursedINR as number | undefined,
      milestoneStage: data.milestoneStage as MilestoneStage | undefined,
      investorReadinessScore: data.investorReadinessScore as number | undefined,
      cohortYear: data.cohortYear as string | undefined,
      status: data.status as IncubationStatus | undefined,
    }),
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function generateId(): string {
  return `inc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}
