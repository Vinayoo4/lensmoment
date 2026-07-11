# Quantify Precision AI PWA

Quantify Suite is a unified PWA business intelligence platform combining KPI tracking and accounting. It offers role-based access, AI-generated suggestions, full offline capability using an action queue, and JWT-secured Express endpoints.

## Architecture & Stack
- **Frontend**: Vue 3, Vite, TailwindCSS, Pinia, Vue Router, `localforage` (IndexedDB offline queue), `vite-plugin-pwa`.
- **Backend**: Node.js, Express, `jsonwebtoken` (JWT), `bcrypt` (salted hashes), atomic JSON-first local storage.
- **Shared**: TypeScript interfaces.
- **Persistence**: Abstracted storage interface (defaulting to JSON).
- **Deployment**: Dockerized with two services (frontend and backend API) for scale and Appwrite readiness.

## Setup & Run
1. Install dependencies for the root, frontend, and backend:
   ```bash
   npm run install:all
   ```
2. Configure environments by duplicating `.env.example` to `.env` in both `frontend/` and `backend/`. Ensure `JWT_SECRET` is populated for the backend.
3. Start the application:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

## Deployment
- Build all: `npm run build:all`
- Run via Docker Compose: `docker-compose up --build`
- **Appwrite Sites**: Ensure `VITE_API_BASE_URL` is set in Appwrite Environment Variables. Uses `npm install && npm run build` with output in `dist` and fallback behavior for SPA routing.

## Testing
- Backend unit tests: `npm run test:backend`
- Playwright E2E: `npm run test:e2e`
- All tests: `npm run test:all`

## Demo Credentials
Check `docs/DEMO_CREDENTIALS.md` for seeded users to test role-based access.

## Data Reseeding
To reset the application to its demo state, simply delete `backend/data/meta.json` or `data/meta.json` and restart the backend server. The seeder will repopulate `workspaces`, `users`, `kpis`, and `transactions` automatically.