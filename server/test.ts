import assert from 'assert';
import crypto from 'crypto';
import { db, hashPassword, readDB, writeDB } from './db';
import { runQuantifyEngine } from './engine';
import { signJWT, verifyJWT } from './auth';

async function runTests() {
  console.log('--- STARTING QUANTIFY AI BACKEND TESTS ---');

  // Back up current DB
  let dbBackup: any = null;
  try {
    dbBackup = await readDB();
  } catch (e) {}

  // Set up clean test database environment
  const testW1 = 'test-ws-1';
  const testW2 = 'test-ws-2';
  
  const testDb = {
    workspaces: [
      { id: testW1, name: 'Test Corp A' },
      { id: testW2, name: 'Test Corp B' }
    ],
    users: [
      {
        id: 'user-admin',
        workspaceId: testW1,
        name: 'test-admin@corp.com',
        role: 'Workspace Admin' as const,
        password: hashPassword('admin123')
      },
      {
        id: 'user-ops',
        workspaceId: testW1,
        name: 'test-ops@corp.com',
        role: 'Operations Staff' as const,
        password: hashPassword('ops123')
      },
      {
        id: 'user-super',
        workspaceId: 'super-ws',
        name: 'test-super@quantify.com',
        role: 'superadmin' as const,
        password: hashPassword('super123')
      }
    ],
    kpiDefinitions: [],
    kpiEntries: [],
    transactions: [],
    reconciliationStates: [],
    aiSuggestions: [],
    reports: [],
    auditLogs: [],
    meta: { seeded: true }
  };

  await writeDB(testDb);

  try {
    // 1. Password Hashing & Verification
    console.log('Testing: Password Hashing...');
    const hashed = hashPassword('my-secret-password');
    assert.strictEqual(hashed, hashPassword('my-secret-password'), 'Hashed passwords should be deterministic');
    assert.notStrictEqual(hashed, hashPassword('different-password'), 'Different passwords should have different hashes');

    // 2. JWT Generation & Verification
    console.log('Testing: Custom JWT sign/verify...');
    const payload = { id: 'user-admin', workspaceId: testW1, role: 'Workspace Admin' };
    const token = signJWT(payload);
    assert.ok(token, 'Should generate a JWT token');
    const verified = verifyJWT(token);
    assert.ok(verified, 'Should successfully decode signed token');
    assert.strictEqual(verified.id, 'user-admin', 'Decoded token should preserve properties');
    assert.strictEqual(verified.workspaceId, testW1);

    // 3. User Lookup
    console.log('Testing: User Lookup & Credentials...');
    const user = await db.getUserByEmail('test-admin@corp.com');
    assert.ok(user, 'User should be found by email');
    assert.strictEqual(user.id, 'user-admin');
    
    const wrongUser = await db.getUserByEmail('nonexistent@corp.com');
    assert.strictEqual(wrongUser, undefined, 'Nonexistent email should return undefined');

    // 4. KPI Definition CRUD
    console.log('Testing: KPI CRUD Operations...');
    const newKpi = await db.createKPI({
      workspaceId: testW1,
      name: 'Net Margin',
      unit: '%',
      targetValue: 20
    });
    assert.ok(newKpi.id, 'Created KPI should have an auto-generated ID');
    assert.strictEqual(newKpi.name, 'Net Margin');
    
    // Read
    const kpis = await db.getKPIs(testW1);
    assert.strictEqual(kpis.length, 1);
    assert.strictEqual(kpis[0].id, newKpi.id);

    // Update
    const updatedKpi = await db.updateKPI(newKpi.id, testW1, { targetValue: 25 });
    assert.strictEqual(updatedKpi?.targetValue, 25, 'KPI should be updated successfully');

    // 5. Workspace Isolation Tests (CRITICAL)
    console.log('Testing: Workspace isolation...');
    // User from testW2 tries to access/update testW1 KPI
    const updatedKpiFromOtherWorkspace = await db.updateKPI(newKpi.id, testW2, { targetValue: 99 });
    assert.strictEqual(updatedKpiFromOtherWorkspace, undefined, 'Updating a KPI from another workspace must fail');
    
    // Verify targetValue is still 25
    const originalKpi = await db.getKPIById(newKpi.id, testW1);
    assert.strictEqual(originalKpi?.targetValue, 25, 'KPI should remain untouched by other workspace edits');

    const listKpisW2 = await db.getKPIs(testW2);
    assert.strictEqual(listKpisW2.length, 0, 'Workspace 2 should have 0 KPIs');

    // 6. Transaction CRUD
    console.log('Testing: Transaction CRUD...');
    const tx = await db.createTransaction({
      workspaceId: testW1,
      date: '2026-07-11',
      amount: -4500,
      description: 'Server cloud subscription cost',
      status: 'unreconciled'
    });
    assert.ok(tx.id);
    assert.strictEqual(tx.amount, -4500);

    const txs = await db.getTransactions(testW1);
    assert.strictEqual(txs.length, 1);
    
    // Check Isolation
    const txsW2 = await db.getTransactions(testW2);
    assert.strictEqual(txsW2.length, 0, 'Transactions list should be isolated');

    // Update Status
    const reconciledTx = await db.updateTransaction(tx.id, testW1, { status: 'reconciled' });
    assert.strictEqual(reconciledTx?.status, 'reconciled');

    // 7. Reconciliation States (Upsert)
    console.log('Testing: Reconciliation state upsert...');
    const rec1 = await db.upsertReconciliationState(testW1, '2026-07', 3, true);
    assert.strictEqual(rec1.isDraft, true);
    assert.strictEqual(rec1.discrepanciesCount, 3);

    // Upsert update
    const rec2 = await db.upsertReconciliationState(testW1, '2026-07', 0, false);
    assert.strictEqual(rec2.isDraft, false);
    assert.strictEqual(rec2.discrepanciesCount, 0);

    const recs = await db.getReconciliationStates(testW1);
    assert.strictEqual(recs.length, 1, 'Upsert should update existing records, not double-insert');

    // 8. Suggestion Rule Engine Logic
    console.log('Testing: AI Operational Rule Engine...');
    // Create more than 5 unreconciled transactions to trigger Rule 5 and Rule 6 (> 10k)
    for (let i = 0; i < 6; i++) {
      await db.createTransaction({
        workspaceId: testW1,
        date: '2026-07-11',
        amount: -2000,
        description: `Unreconciled test transaction ${i}`,
        status: 'unreconciled'
      });
    }

    await runQuantifyEngine(testW1);
    const suggestions = await db.getAISuggestions(testW1);
    
    const countWarning = suggestions.find(s => s.type === 'unreconciled_count_warning');
    const valueWarning = suggestions.find(s => s.type === 'unreconciled_value_warning');

    assert.ok(countWarning, 'Should generate suggestion when unreconciled count exceeds 5');
    assert.ok(valueWarning, 'Should generate suggestion when unreconciled total exceeds 10,000');
    assert.strictEqual(countWarning.status, 'todo');

    console.log('--- ALL BACKEND TEST SUITES COMPLETED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('TEST FAIL:', error);
    process.exit(1);
  } finally {
    // Restore DB backup to not contaminate production data
    if (dbBackup) {
      await writeDB(dbBackup);
    }
  }
}

runTests();
