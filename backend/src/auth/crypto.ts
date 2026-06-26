import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Backwards compatibility for old PBKDF2 hashes
  if (storedHash.includes(':')) {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const verifyHash = crypto.pbkdf2Sync(password, salt as string, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
  return await bcrypt.compare(password, storedHash);
}
