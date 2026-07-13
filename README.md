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

## Deployment: Vercel + Appwrite

This repository has been fully architected to deploy to **Vercel** serverless environments, with an **Appwrite** backend.

### 1. Appwrite Database Setup
1. Create a project in Appwrite Cloud or your self-hosted instance.
2. Go to **API Keys** and generate a new key. Grant it all `databases.*` scopes (read, write).
3. Set your environment variables in `.env` based on `.env.example`:
   * `APPWRITE_ENDPOINT` (e.g., `https://cloud.appwrite.io/v1`)
   * `APPWRITE_PROJECT_ID`
   * `APPWRITE_API_KEY`
   * `APPWRITE_DATABASE_ID` (e.g., `quantify_db`)
4. Start the application locally or deploy it.
5. **Auto-Seeding**: The application will automatically create the required Appwrite database, collections, attributes, and demo accounts on the first request if they do not exist.

### 2. Vercel Deployment
The repository includes a `vercel.json` and a serverless entry point in `api/index.ts`.
To deploy:
1. Connect your GitHub repository to Vercel.
2. In the Vercel dashboard, configure the following **Environment Variables**:
   * `JWT_SECRET` (Required)
   * `APPWRITE_ENDPOINT`
   * `APPWRITE_PROJECT_ID`
   * `APPWRITE_API_KEY`
   * `APPWRITE_DATABASE_ID`
   * `ALLOWED_ORIGINS` (e.g., `https://your-deployment-url.vercel.app`)
   * `VITE_API_BASE_URL` (Set this to `/api`)
3. Deploy! Vercel will build the frontend and correctly route `/api/*` requests to the serverless functions.

---

## ⚙️ Local Development Setup

### Prerequisites
* Node.js v20+
* npm

### Installation
1. Install base dependencies: `npm install`
2. Establish local environment configuration: `cp .env.example .env`
3. Spin up the unified full-stack dev server: start the dev script.

*(If Appwrite environment variables are missing, the system gracefully falls back to local file-based `data.json` storage for quick testing, but Appwrite is required for Vercel deployment).*

