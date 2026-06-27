import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth/crypto.js';

describe('Crypto', () => {
  it('hashes and verifies a password correctly', async () => {
    const pwd = 'my_super_secret_password';
    const hashed = await hashPassword(pwd);

    expect(hashed).not.toBe(pwd);

    expect(await verifyPassword(pwd, hashed)).toBe(true);
    expect(await verifyPassword('wrong_password', hashed)).toBe(false);
  });
});
