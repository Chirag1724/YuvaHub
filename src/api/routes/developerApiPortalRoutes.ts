import { Router, Request, Response } from 'express';

const router = Router();

interface KeyProvisionPayload {
  keyName: string;
  environment: 'PRODUCTION' | 'STAGING' | 'SANDBOX';
  rateLimitReqSec?: number;
  allowedIpRanges?: string;
}

class DeveloperApiPortalService {
  private apiKeys = [
    {
      id: 'api-101',
      keyName: 'Production AI Matcher Service Key',
      environment: 'PRODUCTION',
      apiKeyMasked: 'yh_live_99812********************x821',
      monthlyQuotaUsagePercent: 64.2,
      rateLimitReqSec: 100,
      allowedIpRanges: '104.21.82.0/24',
      status: 'ACTIVE',
    },
  ];

  public getApiKeys() {
    return this.apiKeys;
  }

  public provisionKey(payload: KeyProvisionPayload) {
    const newKey = {
      id: `api_${Math.random().toString(36).substr(2, 9)}`,
      keyName: payload.keyName,
      environment: payload.environment,
      apiKeyMasked: `yh_${payload.environment.toLowerCase()}_${Math.random().toString(36).substr(2, 5)}********************${Math.random().toString(36).substr(2, 4)}`,
      monthlyQuotaUsagePercent: 0.0,
      rateLimitReqSec: payload.rateLimitReqSec || 50,
      allowedIpRanges: payload.allowedIpRanges || '0.0.0.0/0',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.apiKeys.push(newKey);
    return newKey;
  }
}

const apiPortalService = new DeveloperApiPortalService();

router.get('/developer/keys', (req: Request, res: Response) => {
  res.json({ success: true, data: apiPortalService.getApiKeys() });
});

router.post('/developer/provision-key', (req: Request, res: Response) => {
  const result = apiPortalService.provisionKey(req.body);
  res.json({ success: true, data: result });
});

export default router;
