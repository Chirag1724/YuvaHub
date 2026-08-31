import { Router, Request, Response } from 'express';

const router = Router();

interface StartupPayload {
  startupName: string;
  sectorDomain: string;
  foundingLead: string;
  requestedGrantINR: number;
}

class IncubationAcceleratorService {
  private startups = [
    {
      id: 'inc-901',
      startupName: 'Nexus AI - MedTech Diagnostics',
      sectorDomain: 'Healthcare & Clinical AI',
      foundingLead: 'Priya Sharma',
      totalGrantDisbursedINR: 2500000,
      milestoneStage: 'MILESTONE_2_TRACTION',
      investorReadinessScore: 94.8,
      status: 'FUNDED',
    },
  ];

  public getStartups() {
    return this.startups;
  }

  public applyStartup(payload: StartupPayload) {
    const newStartup = {
      id: `inc_${Math.random().toString(36).substr(2, 9)}`,
      startupName: payload.startupName,
      sectorDomain: payload.sectorDomain,
      foundingLead: payload.foundingLead,
      totalGrantDisbursedINR: payload.requestedGrantINR || 1000000,
      milestoneStage: 'MILESTONE_1_MVP',
      investorReadinessScore: 85.0,
      status: 'IN_AUDIT',
      createdAt: new Date().toISOString(),
    };
    this.startups.push(newStartup);
    return newStartup;
  }
}

const incubationService = new IncubationAcceleratorService();

router.get('/incubation/startups', (req: Request, res: Response) => {
  res.json({ success: true, data: incubationService.getStartups() });
});

router.post('/incubation/apply', (req: Request, res: Response) => {
  const result = incubationService.applyStartup(req.body);
  res.json({ success: true, data: result });
});

export default router;
