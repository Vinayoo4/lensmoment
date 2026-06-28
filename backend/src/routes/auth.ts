import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { readJson, writeJson } from '../storage/index.js';
import { hashPassword, verifyPassword } from '../auth/crypto.js';
import type { User } from '../../../shared/types/index.js';

const router = Router();

// In production, JWT_SECRET must be set (enforced in server.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.use(authLimiter);

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const users = await readJson<User[]>('users.json', []);
  if (users.find(u => u.name === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = {
    id: uuidv4(),
    name: username,
    passwordHash: await hashPassword(password),
    role: role || 'Workspace Admin',
    workspaceId: 'w_01'
  };

  await writeJson('users.json', [...users, newUser]);

  const token = jwt.sign({ id: newUser.id, role: newUser.role, workspaceId: newUser.workspaceId }, JWT_SECRET, { expiresIn: '24h' });

  res.status(201).json({ token, id: newUser.id, name: newUser.name, role: newUser.role, workspaceId: newUser.workspaceId });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  // Users stored in users.json have passwordHash which is not in the standard User type
  const users = await readJson<(User & { passwordHash: string })[]>('users.json', []);
  const user = users.find(u => u.name === username);

  const isValid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, workspaceId: user.workspaceId }, JWT_SECRET, { expiresIn: '24h' });

  res.json({ token, id: user.id, name: user.name, role: user.role, workspaceId: user.workspaceId });
});

export default router;
