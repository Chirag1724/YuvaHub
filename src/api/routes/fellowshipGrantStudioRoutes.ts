import { Router, Request, Response } from 'express';

const router = Router();

interface FellowshipPayload {
  fellowshipTitle: string;
  grantProvider: string;
  eligibleDomain: string;
  stipendAmountMonthlyINR: number;
}

class FellowshipGrantStudioService {
  private grants = [
    {
      id: 'fel-701',
      fellowshipTitle: 'PM Research Fellowship (PMRF) - DeepTech AI',
      grantProvider: 'Ministry of Education & IIT Council',
      eligibleDomain: 'Artificial Intelligence & Robotics',
      stipendAmountMonthlyINR: 80000,
      durationMonths: 24,
      aiEligibilityMatchScore: 96.5,
      status: 'OPEN_APPLICATIONS',
    },
  ];

  public getGrants() {
    return this.grants;
  }

  public applyFellowship(payload: FellowshipPayload) {
    const newGrant = {
      id: `fel_${Math.random().toString(36).substr(2, 9)}`,
      fellowshipTitle: payload.fellowshipTitle,
      grantProvider: payload.grantProvider,
      eligibleDomain: payload.eligibleDomain,
      stipendAmountMonthlyINR: payload.stipendAmountMonthlyINR || 60000,
      durationMonths: 12,
      aiEligibilityMatchScore: 92.0,
      status: 'INTERVIEW_PHASE',
      createdAt: new Date().toISOString(),
    };
    this.grants.push(newGrant);
    return newGrant;
  }
}

const fellowshipService = new FellowshipGrantStudioService();

router.get('/fellowships/grants', (req: Request, res: Response) => {
  res.json({ success: true, data: fellowshipService.getGrants() });
});

router.post('/fellowships/apply', (req: Request, res: Response) => {
  const result = fellowshipService.applyFellowship(req.body);
  res.json({ success: true, data: result });
});

export default router;
