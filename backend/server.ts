import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, seedDatabase } from '../server/db';
import apiRouter from '../server/routes';
import { UserRole } from '../src/shared/types';

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'quantify_development_secret_key_9988_xyz';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing in production!');
}

// Custom zero-dependency JWT Sign & Verify
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
    
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}

// Extended Request Interface
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

/**
 * Robust requireRole middleware to handle workspace-level authorization for the application.
 * Ensures the authenticated user has an appropriate role, and implements strict workspace tenant isolation.
 */
export function requireRole(allowedRoles: UserRole[], enforceWorkspaceMatch = true) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is unauthenticated.' });
    }
    
    const { role, workspaceId } = req.user;
    
    // Superadmin role has absolute system-wide access and bypasses tenant matching rules
    if (role === 'superadmin') {
      return next();
    }
    
    // Check if the user's role is permitted
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient role privileges.' });
    }
    
    // Enforce workspace tenant isolation if requested
    if (enforceWorkspaceMatch) {
      // Determine target workspace from params, query, or body
      const targetWorkspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
      if (targetWorkspaceId && targetWorkspaceId !== workspaceId) {
        return res.status(403).json({ error: 'Access denied: Cross-workspace tenant isolation breach detected.' });
      }
    }
    
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. JSON Parsing setup
  app.use(express.json());

  // 2. CORS setup (Custom secure headers)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // 3. JWT Authentication Routes
  
  // POST /api/auth/register - Create workspace and user
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password' });
    }

    try {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists.' });
      }

      // Create a new Workspace for this user
      const workspaceName = `${name}'s Workspace`;
      const workspace = await db.createWorkspace(workspaceName);

      // Hash password & create user
      const hashedPassword = hashPassword(password);
      const resolvedRole: UserRole = role || 'Workspace Admin';

      const user = await db.createUser({
        workspaceId: workspace.id,
        name: email,
        role: resolvedRole,
        password: hashedPassword
      });

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId
      };
      const token = signJWT(tokenPayload);

      // Log action in audit logs
      await db.createAuditLog(user.id, 'USER_REGISTER', `Created workspace "${workspaceName}" and registered as ${resolvedRole}`);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal registration error: ' + error.message });
    }
  });

  // POST /api/auth/login - User validation & JWT payload response
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required credentials: email, password' });
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const hashedInput = hashPassword(password);
      if (user.password !== hashedInput) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId
      };
      const token = signJWT(tokenPayload);

      // Log action in audit logs
      await db.createAuditLog(user.id, 'USER_LOGIN', `Logged in from IP ${req.ip}`);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal login error: ' + error.message });
    }
  });

  // 4. Mount standard API Router before Vite middleware to support all other routes
  app.use(apiRouter);

  // Seed the JSON Database (creates files and demo values if not seeded)
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Failed to seed database:', err);
  }

  // 5. Configure Vite Development middleware or static production asset serving
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting Express server in development mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting Express server in production mode serving static assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html as fallback for React SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quantify AI Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
