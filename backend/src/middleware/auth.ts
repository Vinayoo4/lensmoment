import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// In production, JWT_SECRET must be set (enforced in server.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

import type { User } from '../../../shared/types/index.js';

export interface AuthRequest extends Request {
  user?: User;
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      (req as AuthRequest).user = user as User;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) return res.sendStatus(401);
    if (!roles.includes(user.role)) return res.sendStatus(403);
    next();
  };
}
