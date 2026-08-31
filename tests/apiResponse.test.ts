import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../src/lib/apiResponse.js';

describe('API Response Helpers', () => {
  it('should format a success response correctly', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    sendSuccess(res, { user: 'test' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, user: 'test' });
  });

  it('should format an error response correctly', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    sendError(res, 'Internal Failure', 500);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal Failure' });
  });

  it('should format a bad request error with code', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    sendBadRequest(res, 'Invalid payload');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
  });

  it('should format an unauthorized error with code', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    sendUnauthorized(res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  });
});
