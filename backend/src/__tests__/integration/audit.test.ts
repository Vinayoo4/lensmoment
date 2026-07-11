import { describe, it, expect, vi } from 'vitest';
import { getAuditLogs } from '../../controllers/audit.js';
import * as storage from '../../storage/index.js';

describe('Audit Controller', () => {
  it('should return audit logs', async () => {
    vi.spyOn(storage, 'readJson').mockResolvedValue([{ id: '1', action: 'test' }]);
    const req: any = {};
    const res: any = { json: vi.fn() };
    await getAuditLogs(req, res);
    expect(res.json).toHaveBeenCalledWith([{ id: '1', action: 'test' }]);
  });
});
