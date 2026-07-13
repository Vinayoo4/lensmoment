import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { seedDatabase } from './server/db';
import apiRouter from './server/routes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // Mount API Router before Vite middleware
  app.use(apiRouter);

  // Seed the JSON Database (creates files and demo values if not seeded)
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Failed to seed database:', err);
  }

  // Configure Vite Development middleware or static production asset serving
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
