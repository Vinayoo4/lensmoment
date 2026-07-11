import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is missing in production.');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import { runSeed } from './seed/index.js';

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:8080'];

// Only allow no-origin requests to /health
app.get('/health', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  }
}), (req, res) => {
  res.json({ status: 'ok' });
});

// Strictly enforce origin matching for all other routes
app.use(cors({
  origin: function (origin, callback) {
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

runSeed().then(() => {
  app.listen(port, () => {
    // Keep port log for infra purposes, but generally production hardening wants minimal logs
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Server running on port ${port}`);
    }
  });
});
