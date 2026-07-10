import { describe, it, expect, vi } from 'vitest';
import { authenticateJWT, requireRole } from '../../middleware/auth.js';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  it('authenticateJWT should return 401 if no header', () => {
    const req: any = { headers: {} };
    const res: any = { sendStatus: vi.fn() };
    const next = vi.fn();
    authenticateJWT(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(401);
  });

  it('authenticateJWT should return 403 on invalid token', () => {
    const req: any = { headers: { authorization: 'Bearer invalid_token' } };
    const res: any = { sendStatus: vi.fn() };
    const next = vi.fn();
    vi.spyOn(jwt, 'verify').mockImplementation((token, secret, cb: any) => cb(new Error('Invalid token')));
    authenticateJWT(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });

  it('requireRole should return 403 if role mismatch', () => {
    const req: any = { user: { role: 'user' } };
    const res: any = { sendStatus: vi.fn() };
    const next = vi.fn();
    const middleware = requireRole(['admin']);
    middleware(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });

  it('requireRole should call next if role match', () => {
    const req: any = { user: { role: 'admin' } };
    const res: any = { sendStatus: vi.fn() };
    const next = vi.fn();
    const middleware = requireRole(['admin']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
