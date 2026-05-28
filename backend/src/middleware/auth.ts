import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function getJwtSecret(): string {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing in production.');
    process.exit(1);
  }
  return process.env.JWT_SECRET || 'dev_secret_key_change_in_production';
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, getJwtSecret(), (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      (req as any).user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header missing' });
  }
}
