import { Router, Response } from 'express';
import { db, hashPassword } from './db';
import { runQuantifyEngine } from './engine';
import { authenticateToken, signJWT, AuthenticatedRequest, rateLimiter, requireRole } from './auth';
import { UserRole } from '../src/shared/types';
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

const router = Router();

// Helper to log audit actions securely
async function logAudit(req: AuthenticatedRequest, action: string, details: string) {
  if (req.user) {
    await db.createAuditLog(req.user.id, action, details);
  }
}

// Subscription validation middleware
async function enforceSubscription(req: AuthenticatedRequest, res: Response, next: any) {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }

  try {
    const ws = await db.getWorkspaceById(req.user!.workspaceId);
    if (!ws) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const today = '2026-07-13';
    if (ws.subscriptionExpiresAt && ws.subscriptionExpiresAt < today) {
      return res.status(402).json({
        error: `Your workspace subscription expired on ${ws.subscriptionExpiresAt}. Please contact your administrator or renew to restore full SaaS workspace access.`,
        subscriptionExpired: true,
        expiresAt: ws.subscriptionExpiresAt,
        plan: ws.subscriptionPlan
      });
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Subscription verification error: ' + error.message });
  }
}

// -------------------------------------------------------------------------
// Unauthenticated Routes
// -------------------------------------------------------------------------

// GET /health - Unauthenticated health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/auth/register - Create workspace and user
router.post('/api/auth/register', rateLimiter(30), async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required registration fields: name, email, password' });
  }

  try {
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Create a new Workspace for this user
    const workspaceName = `${name}'s Workspace`;
    const workspace = await db.createWorkspace(workspaceName);

    // Hash password & create user
    const hashedPassword = hashPassword(password);
    const resolvedRole: UserRole = role || 'Workspace Admin';

    const user = await db.createUser({
      workspaceId: workspace.id,
      name: email,
      role: resolvedRole,
      password: hashedPassword
    });

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId
    };
    const token = signJWT(tokenPayload);

    // Log action
    await db.createAuditLog(user.id, 'USER_REGISTER', `Created workspace "${workspaceName}" and registered as ${resolvedRole}`);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal registration error: ' + error.message });
  }
});

// POST /api/auth/login - User validation & JWT payload response
router.post('/api/auth/login', rateLimiter(100), async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required credentials: email, password' });
  }

  try {
    const user = await db.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const hashedInput = hashPassword(password);
    if (user.password !== hashedInput) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId
    };
    const token = signJWT(tokenPayload);

    // Log action
    await db.createAuditLog(user.id, 'USER_LOGIN', `Logged in from IP ${req.ip}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal login error: ' + error.message });
  }
});

// -------------------------------------------------------------------------
// Authenticated Workspace-Scoped Routes
// -------------------------------------------------------------------------

router.use('/api', (req: any, res: any, next: any) => {
  const normPath = req.path.replace(/\/$/, '');
  if (normPath === '/api/auth/login' || normPath === '/api/auth/register') {
    return next();
  }
  authenticateToken(req, res, () => {
    if (
      normPath === '/api/workspaces/current' ||
      normPath === '/api/workspaces/current/renew' ||
      normPath === '/api/users/profile' ||
      normPath === '/api/users/security'
    ) {
      return next();
    }
    enforceSubscription(req as any, res, next);
  });
});

// GET /api/dashboard - Combined operational metrics
router.get('/api/dashboard', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const workspaceId = req.user!.workspaceId;
  try {
    const kpis = await db.getKPIs(workspaceId);
    const transactions = await db.getTransactions(workspaceId);
    const suggestions = await db.getAISuggestions(workspaceId);
    
    // Fetch all entries for this workspace's KPIs
    const entries = await db.getKPIEntries(workspaceId);

    res.json({
      workspaceId,
      kpis,
      entries,
      transactions: transactions.slice(0, 10), // return last 10 transactions
      suggestions: suggestions.filter(s => s.status === 'todo') // active suggestions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/ai-summary - AI-powered transaction analysis for last 7 days
router.get('/api/dashboard/ai-summary', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.user!.workspaceId;
    const transactions = await db.getTransactions(workspaceId);

    // Filter last 7 days of transactions from simulated current local time 2026-07-13
    const todayStr = '2026-07-13';
    const cutoffDate = new Date(todayStr);
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let recentTxs = transactions.filter(t => t.date >= cutoffStr && t.date <= todayStr);
    if (recentTxs.length === 0) {
      // Fallback to most recent 7 transactions
      recentTxs = transactions.slice(0, 7);
    }

    if (recentTxs.length === 0) {
      return res.json({
        insight: 'No recent transactions found to analyze. Please log business income or expenses to view automated financial insights.'
      });
    }

    // Check if GEMINI_API_KEY environment variable is defined
    if (!process.env.GEMINI_API_KEY) {
      // Professional rule-based fallback when key is not provided (Demo/offline mode)
      const totalAmount = recentTxs.reduce((sum, t) => sum + t.amount, 0);
      const isNegative = totalAmount < 0;
      const statusText = isNegative
        ? `Net outflow of ₹${Math.abs(totalAmount).toLocaleString()} detected over the last 7 days; focus on reducing recurring operating expenditures.`
        : `Positive cashflow of ₹${totalAmount.toLocaleString()} observed; ensure pending bills are reconciled to secure your working capital.`;

      return res.json({
        insight: `[Demo Mode] ${statusText}`
      });
    }

    const ai = getGeminiClient();
    const prompt = `Analyze the following list of business transactions from the last 7 days and provide a one-sentence high-level financial health insight.
Transactions:
${recentTxs.map(t => `- ${t.date}: ${t.description} (₹${t.amount})`).join('\n')}

Guidelines:
- Return ONLY a single sentence under 25 words summarizing the financial health or highlighting a key risk/success.
- Be concise, direct, professional, and practical.
- Do not mention details of our formatting or prompt constraints in the output.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const insight = response.text ? response.text.trim() : 'Steady transaction flow observed; keep reconciling pending ledger records.';
    res.json({ insight });
  } catch (error: any) {
    res.json({
      insight: `Financial health is steady, but unable to compute AI insights: ${error.message}`
    });
  }
});

// GET & POST /api/kpis - KPI Definitions
router.get('/api/kpis', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const kpis = await db.getKPIs(req.user!.workspaceId);
    res.json(kpis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/kpis', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { name, unit, targetValue } = req.body;
  if (!name || !unit) {
    return res.status(400).json({ error: 'Missing name or unit' });
  }

  try {
    const newKpi = await db.createKPI({
      workspaceId: req.user!.workspaceId,
      name,
      unit,
      targetValue: targetValue !== undefined ? Number(targetValue) : undefined
    });

    await logAudit(req, 'KPI_CREATE', `Created KPI Definition "${name}" (${unit})`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.status(201).json(newKpi);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH & DELETE /api/kpis/:id
router.patch('/api/kpis/:id', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, unit, targetValue } = req.body;

  try {
    const updated = await db.updateKPI(id, req.user!.workspaceId, {
      name,
      unit,
      targetValue: targetValue !== undefined ? Number(targetValue) : undefined
    });

    if (!updated) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    await logAudit(req, 'KPI_UPDATE', `Updated KPI definition "${updated.name}"`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/kpis/:id', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.deleteKPI(id, req.user!.workspaceId);
    if (!deleted) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    await logAudit(req, 'KPI_DELETE', `Deleted KPI definition: ${id}`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET & POST /api/kpis/:id/entries - KPI value history
router.get('/api/kpis/:id/entries', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    // Confirm KPI is scoped correctly
    const kpi = await db.getKPIById(id, req.user!.workspaceId);
    if (!kpi) {
      return res.status(404).json({ error: 'KPI definition not found' });
    }
    const entries = await db.getKPIEntries(req.user!.workspaceId, id);
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/kpis/:id/entries', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { date, value } = req.body;

  if (!date || value === undefined) {
    return res.status(400).json({ error: 'Missing date or value' });
  }

  try {
    const kpi = await db.getKPIById(id, req.user!.workspaceId);
    if (!kpi) {
      return res.status(404).json({ error: 'KPI definition not found' });
    }

    const newEntry = await db.createKPIEntry({
      kpiId: id,
      workspaceId: req.user!.workspaceId,
      date,
      value: Number(value)
    });

    await logAudit(req, 'KPI_ENTRY_CREATE', `Entered KPI value ${value} for "${kpi.name}" on ${date}`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.status(201).json(newEntry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET & POST & PATCH & DELETE /api/transactions
router.get('/api/transactions', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const txs = await db.getTransactions(req.user!.workspaceId);
    res.json(txs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/transactions', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { date, amount, description, status } = req.body;
  if (!date || amount === undefined || !description) {
    return res.status(400).json({ error: 'Missing date, amount, or description' });
  }

  try {
    const tx = await db.createTransaction({
      workspaceId: req.user!.workspaceId,
      date,
      amount: Number(amount),
      description,
      status: status || 'unreconciled'
    });

    await logAudit(req, 'TRANSACTION_CREATE', `Created transaction "${description}" of ₹${amount}`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.status(201).json(tx);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions/bulk
router.post('/api/transactions/bulk', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { transactions: bulkTxs } = req.body;

  if (!Array.isArray(bulkTxs) || bulkTxs.length === 0) {
    return res.status(400).json({ error: 'An array of transactions is required.' });
  }

  try {
    const validated = [];
    for (let i = 0; i < bulkTxs.length; i++) {
      const item = bulkTxs[i];
      if (!item.date || item.amount === undefined || !item.description) {
        return res.status(400).json({ error: `Row ${i + 1} has missing fields (date, amount, description).` });
      }
      const numAmount = Number(item.amount);
      if (isNaN(numAmount)) {
        return res.status(400).json({ error: `Row ${i + 1} has an invalid numeric amount: "${item.amount}".` });
      }
      validated.push({
        workspaceId: req.user!.workspaceId,
        date: item.date,
        amount: numAmount,
        description: item.description,
        status: item.status || 'unreconciled'
      });
    }

    const createdTxs = [];
    for (const txData of validated) {
      const created = await db.createTransaction(txData);
      createdTxs.push(created);
    }

    await db.createAuditLog(
      req.user!.id,
      'TRANSACTION_BULK_IMPORT',
      `Imported ${createdTxs.length} transactions via secure CSV bulk-import`
    );

    await runQuantifyEngine(req.user!.workspaceId);

    res.status(201).json({ success: true, count: createdTxs.length, transactions: createdTxs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/api/transactions/:id', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { date, amount, description, status } = req.body;

  try {
    const updated = await db.updateTransaction(id, req.user!.workspaceId, {
      date,
      amount: amount !== undefined ? Number(amount) : undefined,
      description,
      status
    });

    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await logAudit(req, 'TRANSACTION_UPDATE', `Updated transaction "${updated.description}"`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/transactions/:id', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const tx = await db.getTransactionById(id, req.user!.workspaceId);
    const deleted = await db.deleteTransaction(id, req.user!.workspaceId);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await logAudit(req, 'TRANSACTION_DELETE', `Deleted transaction: ${tx?.description || id}`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/transactions/:id/status', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'reconciled' && status !== 'unreconciled') {
    return res.status(400).json({ error: 'Status must be reconciled or unreconciled' });
  }

  try {
    const updated = await db.updateTransaction(id, req.user!.workspaceId, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await logAudit(req, 'TRANSACTION_STATUS', `Set transaction status of "${updated.description}" to ${status}`);
    await runQuantifyEngine(req.user!.workspaceId);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET & POST /api/reconciliation
router.get('/api/reconciliation', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const states = await db.getReconciliationStates(req.user!.workspaceId);
    res.json(states);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/reconciliation', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { month, discrepanciesCount, isDraft } = req.body;
  if (!month || discrepanciesCount === undefined || isDraft === undefined) {
    return res.status(400).json({ error: 'Missing month, discrepanciesCount, or isDraft' });
  }

  try {
    const state = await db.upsertReconciliationState(
      req.user!.workspaceId,
      month,
      Number(discrepanciesCount),
      Boolean(isDraft)
    );

    await logAudit(
      req, 
      'RECONCILIATION_SAVE', 
      `${isDraft ? 'Saved draft' : 'Finalized'} reconciliation for ${month} with ${discrepanciesCount} discrepancies`
    );

    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET & POST /api/reports
router.get('/api/reports', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const reports = await db.getReports(req.user!.workspaceId);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/reports', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { title, content } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Missing report title' });
  }

  try {
    let finalContent = content;
    
    // If no custom content, auto-generate a beautiful summary of current workspace status
    if (!finalContent) {
      const kpis = await db.getKPIs(req.user!.workspaceId);
      const transactions = await db.getTransactions(req.user!.workspaceId);
      const unreconciled = transactions.filter(t => t.status === 'unreconciled');
      
      let kpisSummary = '';
      for (const kpi of kpis) {
        const entries = await db.getKPIEntries(req.user!.workspaceId, kpi.id);
        const lastVal = entries.length > 0 ? entries[entries.length - 1].value : 'No entry';
        kpisSummary += `* **${kpi.name}**: ${lastVal} ${kpi.unit} (Target: ${kpi.targetValue || 'N/A'})\n`;
      }

      finalContent = `
# Operational Intelligence Report — ${title}
Generated on: ${new Date().toLocaleDateString()}

This executive digest aggregates cash flows, ledger reconciliations, and critical KPI histories within the workspace.

## 1. Key Performance Indicators
${kpisSummary || '* No KPIs configured for this workspace.'}

## 2. Cash Flow & Ledger Summary
* **Total Transactions Tracked**: ${transactions.length}
* **Pending Reconciliation**: ${unreconciled.length} transaction(s)
* **Reconciliation Outstandings Volume**: ₹${unreconciled.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}

## 3. Operational Strategy Recommendations
* Review all outstanding discrepancies for ledger reconciliation.
* Track customer attrition and retention KPIs daily to ensure compliance with threshold limits.
      `.trim();
    }

    const report = await db.createReport(req.user!.workspaceId, title, finalContent);
    await logAudit(req, 'REPORT_CREATE', `Created Operational Report: "${title}"`);

    res.status(201).json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET & PATCH /api/suggestions
router.get('/api/suggestions', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const suggestions = await db.getAISuggestions(req.user!.workspaceId);
    res.json(suggestions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/api/suggestions/:id', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'todo' && status !== 'done' && status !== 'dismissed') {
    return res.status(400).json({ error: 'Status must be todo, done, or dismissed' });
  }

  try {
    const updated = await db.updateAISuggestionStatus(id, req.user!.workspaceId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    await logAudit(req, 'SUGGESTION_STATUS', `Set AI Suggestion "${id}" to status ${status}`);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------------------
// Superadmin Only Routes
// -------------------------------------------------------------------------

// GET & POST /api/workspaces (Superadmin only)
router.get('/api/workspaces', authenticateToken as any, requireRole(['superadmin']) as any, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaces = await db.getWorkspaces();
    res.json(workspaces);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/workspaces', authenticateToken as any, requireRole(['superadmin']) as any, async (req: AuthenticatedRequest, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing workspace name' });
  }

  try {
    const ws = await db.createWorkspace(name);
    await logAudit(req, 'WORKSPACE_CREATE', `Superadmin created new tenant workspace "${name}"`);
    res.status(201).json(ws);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workspaces/current
router.get('/api/workspaces/current', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const ws = await db.getWorkspaceById(req.user!.workspaceId);
    if (!ws) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.json(ws);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workspaces/current/renew
router.post('/api/workspaces/current/renew', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { pack } = req.body;
  if (pack !== '6_months' && pack !== '1_year') {
    return res.status(400).json({ error: 'Invalid subscription pack type.' });
  }

  try {
    const ws = await db.getWorkspaceById(req.user!.workspaceId);
    if (!ws) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const todayStr = '2026-07-13';
    const today = new Date(todayStr);
    let start = today;
    if (ws.subscriptionExpiresAt && new Date(ws.subscriptionExpiresAt) > today) {
      start = new Date(ws.subscriptionExpiresAt);
    }

    const durationDays = pack === '6_months' ? 180 : 365;
    const expiry = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expiresStr = expiry.toISOString().split('T')[0];

    const updated = await db.updateWorkspaceSubscription(ws.id, pack, expiresStr);
    await db.createAuditLog(req.user!.id, 'SUBSCRIPTION_RENEWAL', `Workspace renewed subscription to "${pack}" package. New expiry date set: ${expiresStr}`);

    res.json({ success: true, workspace: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/profile
router.patch('/api/users/profile', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { displayName, notificationPreferences } = req.body;

  try {
    const updated = await db.updateUser(req.user!.id, {
      displayName,
      notificationPreferences
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.createAuditLog(req.user!.id, 'PROFILE_UPDATE', `Updated user display name to "${displayName || updated.name}"`);

    res.json({
      success: true,
      user: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        role: updated.role,
        name: updated.name,
        displayName: updated.displayName,
        notificationPreferences: updated.notificationPreferences
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/security
router.patch('/api/users/security', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    const user = await db.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedCurrent = hashPassword(currentPassword);
    if (user.password !== hashedCurrent) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedNew = hashPassword(newPassword);
    await db.updateUser(req.user!.id, {
      password: hashedNew
    });

    await db.createAuditLog(req.user!.id, 'SECURITY_CREDENTIAL_UPDATE', `Changed account password`);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/workspaces/current
router.patch('/api/workspaces/current', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Workspace name is required.' });
  }

  try {
    if (req.user!.role !== 'Workspace Admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Only Workspace Admins can modify workspace settings.' });
    }

    const updated = await db.updateWorkspace(req.user!.workspaceId, { name });
    if (!updated) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    await db.createAuditLog(req.user!.id, 'WORKSPACE_SETTINGS_UPDATE', `Updated workspace name to "${name}"`);

    res.json({ success: true, workspace: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workspaces/current/users
router.get('/api/workspaces/current/users', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const allUsers = await db.getUsers();
    const wsUsers = allUsers.filter(u => u.workspaceId === req.user!.workspaceId);
    const safeUsers = wsUsers.map(u => ({
      id: u.id,
      workspaceId: u.workspaceId,
      role: u.role,
      name: u.name,
      displayName: u.displayName
    }));
    res.json(safeUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/workspaces/current/users/:id/role
router.patch('/api/workspaces/current/users/:id/role', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required.' });
  }

  try {
    if (req.user!.role !== 'Workspace Admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Only Workspace Admins can modify user roles.' });
    }

    const targetUser = await db.getUserById(id);
    if (!targetUser || targetUser.workspaceId !== req.user!.workspaceId) {
      return res.status(404).json({ error: 'User not found in this workspace' });
    }

    const updated = await db.updateUser(id, { role });
    await db.createAuditLog(req.user!.id, 'USER_ROLE_UPDATE', `Updated user role of "${targetUser.name}" to "${role}"`);

    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workspaces/:id/stats (Superadmin only)
router.get('/api/workspaces/:id/stats', authenticateToken as any, requireRole(['superadmin']) as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const ws = await db.getWorkspaceById(id);
    if (!ws) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const kpis = await db.getKPIs(id);
    const entries = await db.getKPIEntries(id);
    const transactions = await db.getTransactions(id);
    const suggestions = await db.getAISuggestions(id);

    res.json({
      workspaceId: id,
      workspaceName: ws.name,
      subscriptionPlan: ws.subscriptionPlan || 'free',
      subscriptionExpiresAt: ws.subscriptionExpiresAt || '',
      kpisCount: kpis.length,
      entriesCount: entries.length,
      transactionsCount: transactions.length,
      suggestionsCount: suggestions.length,
      totalTxVolume: transactions.reduce((sum, t) => sum + t.amount, 0)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/workspaces/:id/subscription (Superadmin only)
router.patch('/api/workspaces/:id/subscription', authenticateToken as any, requireRole(['superadmin']) as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { plan, expiresAt } = req.body;

  if (!plan || !expiresAt) {
    return res.status(400).json({ error: 'Missing plan or expiresAt' });
  }

  try {
    const updated = await db.updateWorkspaceSubscription(id, plan, expiresAt);
    if (!updated) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    await logAudit(req, 'WORKSPACE_SUBSCRIPTION_UPDATE', `Superadmin updated workspace "${updated.name}" subscription to: ${plan} (Expires: ${expiresAt})`);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/audit (Superadmin only)
router.get('/api/audit', authenticateToken as any, requireRole(['superadmin']) as any, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await db.getAuditLogs();
    // Include user email/name in the response logs for display
    const users = await db.getUsers();
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    const detailedLogs = logs.map(log => ({
      ...log,
      userEmail: userMap.get(log.userId) || 'Unknown User'
    }));

    res.json(detailedLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
