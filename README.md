# Quantify Precision AI PWA

Quantify Suite is a unified PWA business intelligence platform combining KPI tracking and accounting. It offers role-based access, AI-generated suggestions, full offline capability using an action queue, and JWT-secured Express endpoints.

## Architecture & Stack
- **Frontend**: Vue 3, Vite, TailwindCSS, Pinia, Vue Router, `localforage` (IndexedDB offline queue), `vite-plugin-pwa`.
- **Backend**: Node.js, Express, `jsonwebtoken` (JWT), `bcrypt` (salted hashes), atomic JSON-first local storage.
- **Shared**: TypeScript interfaces.

## Setup & Run
1. Install dependencies for the root, frontend, and backend:
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```
2. Configure environments by duplicating `.env.example` to `.env` in both `frontend/` and `backend/`. Ensure `JWT_SECRET` is populated for the backend.
3. Start the application by running the dev scripts for both frontend and backend.

## Deployment
- Build frontend: `cd frontend && npm run build`
- Build backend: `cd backend && npm run build`
- Run backend production: `cd backend && npm start`

## Demo Credentials
Check `docs/DEMO_CREDENTIALS.md` for seeded users to test role-based access.

## Data Reseeding
To reset the application to its demo state, simply delete `backend/data/meta.json` and restart the backend server. The seeder will repopulate `workspaces`, `users`, `kpis`, and `transactions` automatically.
