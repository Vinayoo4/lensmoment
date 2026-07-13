import express from 'express';
import apiRouter from '../server/routes';

const app = express();

app.use(express.json());

// Set up CORS properly for Vercel
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Seed demo credentials before handling requests
// Because serverless functions can be cold-started, we just call seedDatabase here
// (It handles 'already seeded' internally or in Appwrite)
import { dynamicSeedDatabase } from '../server/seed';

let seedPromise: Promise<void> | null = null;
app.use(async (req, res, next) => {
  if (!seedPromise) {
    seedPromise = dynamicSeedDatabase().catch(err => {
      console.error('Seed failed', err);
    });
  }
  await seedPromise;
  next();
});

// The routes are already prefixed with /api in routes.ts,
// so we just mount the router directly on the app.
app.use(apiRouter);

// Export for Vercel Serverless
export default app;
