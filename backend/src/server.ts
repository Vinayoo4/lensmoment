import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is missing in production.');
  process.exit(1);
}
import cors from 'cors';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import { runSeed } from './seed/index.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

runSeed().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
