# Quantify AI — Business Intelligence & Ledger Compliance Console

Quantify AI is a production-quality, multi-tenant Business Intelligence (BI) and lightweight accounting SaaS platform. Built on standard full-stack React and Express, it integrates advanced performance-metric evaluation, custom operational rules, and an offline-resilient transactional synchronizer.

---

## 🚀 Key Features & Capabilities

1. **Multi-Tenant Workspace Isolation**: Access-controlled routing ensures ledger postings, metrics definitions, and suggestions remain isolated between distinct corporate tenants.
2. **Granular Role-Based Access Control (RBAC)**: Supports 5 distinct roles (Superadmin, Workspace Admin, Financial Manager, Operations Staff, Client Portal User) with custom write/read boundaries.
3. **Monthly Reconciliation Workspace**: Dynamic close-books module that audits discrepancy backlogs, compiles states, and bulk-reconciles ledger transactions.
4. **Offline Synchronization Queue**: Fully-featured client-side queue that stores operations during disconnects, avoids duplication using transaction payload hashes, and provides manual retry logs.
5. **Operational Intelligence Engine**: A robust automated rule scanner evaluating metric trends (such as declining margins or rising CAC) to trigger actionable suggestions.
6. **Global System Audit Logging**: Unified journal recording administrative changes, tenant creation, and login attempts across the system.

---

## 🔑 Pre-Seeded Demo Credentials (Fast Testing)

The database engine is automatically pre-seeded with these accounts for immediate testing. You can click on any card on the landing page to auto-fill these credentials:

| Organization Tenant | Account Role | Email Address | Password | Privileges & Actions |
| :--- | :--- | :--- | :--- | :--- |
| **Acme Corp** | Workspace Admin | `admin@acme.com` | `admin123` | Create KPIs, record transactions, close books, delete records. |
| **Acme Corp** | Financial Manager | `finance@acme.com` | `finance123` | Read dashboard, create KPIs, log entries, close books. |
| **Acme Corp** | Operations Staff | `ops@acme.com` | `ops123` | View metrics, log entries, record transaction ledger lines. |
| **Acme Corp** | Client Portal User | `client@acme.com` | `client123` | View-only dashboard access. Restricted from postings/edits. |
| **System-wide** | Superadmin | `superadmin@quantify.com` | `superadmin123` | View all tenants, provision new workspaces, inspect system audit logs. |

---

## 🛠️ Architecture & Core Components

```
                +---------------------------------------------------+
                |                     FRONTEND                      |
                |   Vite + React (App.tsx) Styled with Tailwind     |
                +-------------------------+-------------------------+
                                          |
                        [Axios/Fetch REST Requests]
                                          |
                +-------------------------v-------------------------+
                |                     BACKEND                       |
                |               Express Server (Node)               |
                +-------------------------+-------------------------+
                                          |
                  [AsyncLock Transaction Queue & DB Operations]
                                          |
                +-------------------------v-------------------------+
                |                    DATABASE                       |
                |             data.json (Atomic File Writes)        |
                +---------------------------------------------------+
```

### 1. Unified Backend Process (`server.ts` & `server/routes.ts`)
A lightweight, fast, and secure API engine using Express, JWT-based state-less authentication, and rate-limiting. It mounts Vite in development to support live client editing while serving static bundles in production.

### 2. Concurrency-Safe Storage Engine (`server/db.ts`)
To support reliable database state mutations without a massive SQL instance, the backend uses a JSON-based file database backed by custom-built **AsyncLock** queueing. All database write operations (`writeDatabase()`) are queued serially per tenant key, completely eliminating write conflicts and filesystem corruption.

### 3. Operational Rule Engine (`server/engine.ts`)
Compiles KPI records and evaluates multi-point trends:
* **Monthly Revenue Drops**: Triggers an alert if monthly sales revenue declines by more than 10%.
* **Cost of Acquisition Check**: Flags warning if Customer Acquisition Cost (CAC) rises above target.
* **Customer Retention Rate**: Warns if user retention slides under 80%.
* **Discrepancy Audit**: Analyzes ledger reconciliation states to flag unresolved backlogs.

---

## 📡 Offline Resilience & Replay Protocol

When internet connections drop, the client's synchronizer takes over seamlessly:
1. **Optimistic UI Postings**: Transactions and KPI logs are registered in memory with a temporary `optimistic_` ID to keep the UI active.
2. **Duplicate Prevention**: A SHA-like string hash is calculated based on payload contents (`description + amount + date`). If the same transaction is logged twice in offline state, the queue merges them to avoid duplicate ledger postings.
3. **Manual Sync Manager**: Users can track pending packets, review specific network rejection messages, retry individual packet dispatches, or clear failed synchronization queues directly from the main dashboard console.

---

## ⚙️ Local Development Setup

### Prerequisites
* Node.js v18 or later
* npm v9 or later

### Installation
1. Install base dependencies:
   ```bash
   npm install
   ```

2. Establish local environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Spin up the unified full-stack dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view your workspace.

---

## 🧪 Verification & Testing

### Running Tests
We have implemented a comprehensive mock testing rig inside `/server/test.ts` to verify JWT creation, CRUD security limits, and tenant workspace isolation rules.
```bash
npm run test
```

### Building for Production
Compiles frontend static assets and bundles the backend server into a single file under `dist/server.cjs`:
```bash
npm run build
```

---

## 🐳 Containerized Production Deployments

### Build & Run via Docker
To package the app as a secure, stateless container binding to port 3000:
```bash
docker build -t quantify-ai .
docker run -p 3000:3000 -e JWT_SECRET="your_secure_secret" quantify-ai
```

### Run Multi-Container Setup via Docker Compose
To ensure your JSON ledger databases persist across container restarts, spin up the Docker-Compose volume pipeline:
```bash
docker-compose up -d
```
All database records will write into a persistent local volume named `quantify_data`.
