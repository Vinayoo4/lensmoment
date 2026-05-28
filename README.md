# Quantify Suite PWA

Quantify Suite is a unified Progressive Web App (PWA) built for SALTEDHASH. It provides business intelligence (KPI tracking) and automated accounting (transaction reconciliation) in a single mobile-first interface.

## Tech Stack
*   **Frontend:** Vue 3, Vite, TailwindCSS, Pinia, Vue Router, localforage.
*   **Backend:** Node.js, Express, native `crypto` (salted hashes), `jsonwebtoken`.
*   **Storage:** Local JSON files acting as a NoSQL-style database.

## Architecture & Features
*   **Local-First / PWA:** The frontend uses VitePWA to register a service worker. The app is fully installable and caches static assets and essential API responses.
*   **Offline Queue:** If the user is offline, modifications (KPI inputs, Transaction creations, Reconciliations) are stored via `localforage`. When the app detects network restoration, it safely replays the queue utilizing the stored JWT.
*   **AI Rules Engine:** A local backend rules engine parses KPI trends and un-reconciled transactions to generate contextual AI suggestions dynamically.
*   **Secure Authentication:** User accounts are protected using salted hash passwords and JWTs with role-based routing constraints.

## Setup & Running

### Requirements
*   Node.js (v18+)
*   npm

### Installation
1.  Install backend dependencies:
    ```bash
    cd backend
    npm install
    ```
2.  Install frontend dependencies:
    ```bash
    cd frontend
    npm install
    ```

### Development
Start the backend server:
```bash
cd backend
npm run build && node dist/backend/src/server.js
```

Start the frontend dev server:
```bash
cd frontend
npm run dev
```

### Production Build
Build the backend:
```bash
cd backend
npx tsc
```

Build the frontend:
```bash
cd frontend
npm run build
```

## Environment Config
Create a `.env` file in `/backend` to customize:
*   `PORT=3000`
*   `JWT_SECRET=your_secure_random_string`

Create a `.env` file in `/frontend` to customize:
*   `VITE_API_URL=http://localhost:3000`
