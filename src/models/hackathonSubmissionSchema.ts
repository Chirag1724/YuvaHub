/**
 * Hackathon Submission Schema — Pure TypeScript (no Mongoose dependency)
 */

export type JudgeStatus = 'EVALUATED' | 'UNDER_REVIEW' | 'FLAGGED_PLAGIARISM';

export interface IHackathonSubmission {
  id: string;
  projectName: string;
  trackName: string;
  teamLead: string;
  technicalComplexityScore: number;
  innovationOriginalityScore: number;
  codeQualityScore: number;
  totalWeightedScore: number;
  judgeStatus: JudgeStatus;
  githubRepoUrl: string;
  createdAt: string;
  updatedAt: string;
}

const JUDGE_STATUSES: readonly JudgeStatus[] = ['EVALUATED', 'UNDER_REVIEW', 'FLAGGED_PLAGIARISM'];

export function createHackathonSubmission(
  partial: Pick<IHackathonSubmission, 'projectName' | 'trackName' | 'teamLead' | 'githubRepoUrl'> &
    Partial<Omit<IHackathonSubmission, 'projectName' | 'trackName' | 'teamLead' | 'githubRepoUrl'>>,
): IHackathonSubmission {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? `hs_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    projectName: partial.projectName,
    trackName: partial.trackName,
    teamLead: partial.teamLead,
    technicalComplexityScore: partial.technicalComplexityScore ?? 90.0,
    innovationOriginalityScore: partial.innovationOriginalityScore ?? 90.0,
    codeQualityScore: partial.codeQualityScore ?? 90.0,
    totalWeightedScore: partial.totalWeightedScore ?? 90.0,
    judgeStatus: partial.judgeStatus ?? 'UNDER_REVIEW',
    githubRepoUrl: partial.githubRepoUrl,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function isValidJudgeStatus(value: string): value is JudgeStatus {
  return (JUDGE_STATUSES as readonly string[]).includes(value);
}

export function validateHackathonSubmission(
  data: Record<string, unknown>,
): { valid: true; submission: IHackathonSubmission } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof data.projectName !== 'string' || data.projectName.trim().length === 0) errors.push('projectName is required');
  if (typeof data.trackName !== 'string' || data.trackName.trim().length === 0) errors.push('trackName is required');
  if (typeof data.teamLead !== 'string' || data.teamLead.trim().length === 0) errors.push('teamLead is required');
  if (typeof data.githubRepoUrl !== 'string' || data.githubRepoUrl.trim().length === 0) errors.push('githubRepoUrl is required');

  for (const field of ['technicalComplexityScore', 'innovationOriginalityScore', 'codeQualityScore', 'totalWeightedScore']) {
    const val = Number(data[field]);
    if (data[field] !== undefined && (Number.isNaN(val) || val < 0 || val > 100)) {
      errors.push(`${field} must be a number between 0 and 100`);
    }
  }

  if (data.judgeStatus !== undefined && !isValidJudgeStatus(String(data.judgeStatus))) {
    errors.push(`judgeStatus must be one of: ${JUDGE_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    submission: createHackathonSubmission({
      projectName: data.projectName as string,
      trackName: data.trackName as string,
      teamLead: data.teamLead as string,
      githubRepoUrl: data.githubRepoUrl as string,
      technicalComplexityScore: data.technicalComplexityScore as number | undefined,
      innovationOriginalityScore: data.innovationOriginalityScore as number | undefined,
      codeQualityScore: data.codeQualityScore as number | undefined,
      totalWeightedScore: data.totalWeightedScore as number | undefined,
      judgeStatus: data.judgeStatus as JudgeStatus | undefined,
    }),
  };
}
