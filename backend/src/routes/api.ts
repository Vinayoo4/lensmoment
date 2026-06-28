import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { getDashboardData, createKpi, createTransaction, updateTransactionStatus } from '../controllers/api.js';
import { getWorkspaces, createWorkspace, getWorkspaceStats } from '../controllers/workspaces.js';
import { getKpis, createKpiDef, updateKpiDef, deleteKpiDef, getKpiEntries, createKpiEntry } from '../controllers/kpis.js';
import { getTransactions, updateTransaction, deleteTransaction } from '../controllers/transactions.js';
import { getReconciliations, createOrUpdateReconciliation } from '../controllers/reconciliation.js';
import { getReports, createReport } from '../controllers/reports.js';
import { getAuditLogs } from '../controllers/audit.js';
import { getSuggestions, updateSuggestion } from '../controllers/suggestions.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// Dashboard
router.get('/dashboard', getDashboardData);

// Workspaces
router.get('/workspaces', requireRole(['superadmin']), getWorkspaces);
router.post('/workspaces', requireRole(['superadmin']), createWorkspace);
router.get('/workspaces/:id/stats', requireRole(['superadmin']), getWorkspaceStats);

// KPIs
router.get('/kpis', getKpis);
router.post('/kpis', createKpiDef);
router.patch('/kpis/:id', updateKpiDef);
router.delete('/kpis/:id', deleteKpiDef);
router.get('/kpis/:id/entries', getKpiEntries);
router.post('/kpis/:id/entries', createKpiEntry);
router.post('/kpi', createKpi);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.patch('/transactions/:id', updateTransaction);
router.put('/transactions/:id/status', updateTransactionStatus);
router.delete('/transactions/:id', deleteTransaction);

// Reconciliation
router.get('/reconciliation', getReconciliations);
router.post('/reconciliation', createOrUpdateReconciliation);

// Reports
router.get('/reports', getReports);
router.post('/reports', createReport);

// Suggestions
router.get('/suggestions', getSuggestions);
router.patch('/suggestions/:id', updateSuggestion);

// Audit Logs
router.get('/audit', requireRole(['superadmin']), getAuditLogs);

export default router;
