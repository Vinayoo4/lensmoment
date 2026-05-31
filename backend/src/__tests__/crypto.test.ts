import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth/crypto.js';

describe('Crypto', () => {
  it('hashes and verifies a password correctly', () => {
    const pwd = 'my_super_secret_password';
    const hashed = hashPassword(pwd);

    expect(hashed).not.toBe(pwd);
    expect(hashed).toContain(':');

    expect(verifyPassword(pwd, hashed)).toBe(true);
    expect(verifyPassword('wrong_password', hashed)).toBe(false);
  });
});
