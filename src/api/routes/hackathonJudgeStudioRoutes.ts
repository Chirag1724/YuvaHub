import { Router, Request, Response } from 'express';

const router = Router();

interface EvaluationPayload {
  projectName: string;
  trackName: string;
  technicalComplexityScore: number;
  innovationOriginalityScore: number;
  codeQualityScore: number;
}

class HackathonJudgeStudioService {
  private submissions = [
    {
      id: 'sub-301',
      projectName: 'NeuroShield - Real-Time EEG Seizure Prediction',
      trackName: 'AI & Healthcare Track',
      teamLead: 'Siddharth Varma',
      technicalComplexityScore: 98.0,
      innovationOriginalityScore: 95.5,
      codeQualityScore: 94.0,
      totalWeightedScore: 96.2,
      judgeStatus: 'EVALUATED',
    },
  ];

  public getSubmissions() {
    return this.submissions;
  }

  public submitEvaluation(payload: EvaluationPayload) {
    const totalWeightedScore = Number(((payload.technicalComplexityScore * 0.4) + (payload.innovationOriginalityScore * 0.35) + (payload.codeQualityScore * 0.25)).toFixed(1));
    const newSubmission = {
      id: `sub_${Math.random().toString(36).substr(2, 9)}`,
      projectName: payload.projectName,
      trackName: payload.trackName,
      teamLead: 'Anonymous Team Lead',
      technicalComplexityScore: payload.technicalComplexityScore,
      innovationOriginalityScore: payload.innovationOriginalityScore,
      codeQualityScore: payload.codeQualityScore,
      totalWeightedScore,
      judgeStatus: 'EVALUATED',
      createdAt: new Date().toISOString(),
    };
    this.submissions.push(newSubmission);
    return newSubmission;
  }
}

const judgeService = new HackathonJudgeStudioService();

router.get('/hackathon/submissions', (req: Request, res: Response) => {
  res.json({ success: true, data: judgeService.getSubmissions() });
});

router.post('/hackathon/evaluate', (req: Request, res: Response) => {
  const result = judgeService.submitEvaluation(req.body);
  res.json({ success: true, data: result });
});

export default router;
