import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, hashPassword } from './db';
import { UserRole } from '../src/shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'quantify_development_secret_key_9988_xyz';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing in production!');
  process.exit(1);
}

// Custom lightweight, zero-dependency JWT implementation using native crypto
export function signJWT(payload: object, expiryInHours = 24): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  
  const exp = Math.floor(Date.now() / 1000) + (expiryInHours * 3600);
  const fullPayload = { ...payload, exp };
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = hmac.digest('base64url');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function verifyJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignature = hmac.digest('base64url');
    
    if (signatureB64 !== expectedSignature) return null;
    
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}

// Extend Request interface to include user property
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: UserRole;
    workspaceId: string;
  };
}

// JWT Authentication Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }
  
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token is invalid or expired.' });
  }
  
  req.user = decoded;
  next();
}

// Role authorization middleware
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is unauthenticated.' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient privileges.' });
    }
    
    next();
  };
}

// Simple rate limiter state
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

// Simple IP-based Rate Limiter (100 requests per 15 minutes)
export function rateLimiter(limit = 100, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    let rateData = ipRequestCounts.get(ip);
    if (!rateData || now > rateData.resetTime) {
      rateData = { count: 1, resetTime: now + windowMs };
      ipRequestCounts.set(ip, rateData);
    } else {
      rateData.count++;
    }
    
    if (rateData.count > limit) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    next();
  };
}
