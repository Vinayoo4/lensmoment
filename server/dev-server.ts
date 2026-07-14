import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiApp from '../api/index';

async function startServer() {
  const PORT = process.env.PORT || 3000;

  // Use the exact same app setup from api/index.ts for local dev
  const app = express();

  // Delegate all /api requests to the serverless app handler
  app.use(apiApp);

  // Configure Vite Development middleware or static production asset serving
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting local dev server with Vite middleware...');
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

  app.listen(PORT, () => {
    console.log(`Quantify AI Dev Server running on port ${PORT}`);
  });
}

startServer();
