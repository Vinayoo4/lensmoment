import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../storage/index.js';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../auth/crypto.js';
import { getJwtSecret } from '../middleware/auth.js';
import type { User } from '../../../shared/types/index.js';

const router = Router();

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
    passwordHash: hashPassword(password),
    role: role || 'Workspace Admin',
    workspaceId: 'w_01'
  };

  await writeJson('users.json', [...users, newUser]);

  const token = jwt.sign({ id: newUser.id, role: newUser.role, workspaceId: newUser.workspaceId }, getJwtSecret(), { expiresIn: '7d' });

  res.status(201).json({ token, id: newUser.id, name: newUser.name, role: newUser.role, workspaceId: newUser.workspaceId });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const users = await readJson<any[]>('users.json', []);
  const user = users.find(u => u.name === username);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, workspaceId: user.workspaceId }, getJwtSecret(), { expiresIn: '7d' });

  res.json({ token, id: user.id, name: user.name, role: user.role, workspaceId: user.workspaceId });
});

export default router;
