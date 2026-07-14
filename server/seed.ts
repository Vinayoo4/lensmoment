import { isAppwriteEnabled, databases, APPWRITE_DB_ID, COLLECTIONS } from './appwrite';
import { setupAppwriteSchema } from './appwrite-setup';
import { seedDatabase as localSeedDatabase, hashPassword } from './db';
import { appwriteDb } from './appwrite-db';

export async function dynamicSeedDatabase(): Promise<void> {
  if (isAppwriteEnabled) {
    await setupAppwriteSchema();

    try {
      // Check if seeded
      const metaRes = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.meta);
      if (metaRes.documents.length > 0 && metaRes.documents[0].seeded) {
        console.log('Appwrite Database already seeded.');
        return;
      }

      console.log('Seeding demo data into Appwrite database...');

      const w1Id = 'ws-acme-123';
      const w2Id = 'ws-beta-456';

      await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.workspaces, w1Id, { id: w1Id, name: 'Acme Corp', subscriptionPlan: '1_year', subscriptionExpiresAt: '2027-07-15' });
      await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.workspaces, w2Id, { id: w2Id, name: 'Beta Logistics', subscriptionPlan: '6_months', subscriptionExpiresAt: '2027-01-15' });

      const users = [
        { id: 'usr-admin', workspaceId: w1Id, name: 'admin@acme.com', role: 'Workspace Admin', password: hashPassword('admin123') },
        { id: 'usr-finance', workspaceId: w1Id, name: 'finance@acme.com', role: 'Financial Manager', password: hashPassword('finance123') },
        { id: 'usr-ops', workspaceId: w1Id, name: 'ops@acme.com', role: 'Operations Staff', password: hashPassword('ops123') },
        { id: 'usr-client', workspaceId: w1Id, name: 'client@acme.com', role: 'Client Portal User', password: hashPassword('client123') },
        { id: 'usr-superadmin', workspaceId: 'ws-superadmin-000', name: 'superadmin@quantify.com', role: 'superadmin', password: hashPassword('superadmin123') }
      ];

      for(const u of users) await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.users, u.id, u);

      const kpis = [
        { id: 'kpi-revenue', workspaceId: w1Id, name: 'Monthly Revenue', unit: '₹', targetValue: 500000 },
        { id: 'kpi-cac', workspaceId: w1Id, name: 'Customer Acquisition Cost', unit: '₹', targetValue: 1500 },
        { id: 'kpi-retention', workspaceId: w1Id, name: 'Customer Retention Rate', unit: '%', targetValue: 90 }
      ];
      for(const k of kpis) await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.kpiDefinitions, k.id, k);

      // We just seed a few entries to avoid exceeding rate limits or taking forever on Appwrite
      const today = new Date();
      for(let i = 2; i >= 0; i--) {
        const entryDate = new Date(today);
        entryDate.setDate(today.getDate() - i);
        const dateStr = entryDate.toISOString().split('T')[0];

        await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.kpiEntries, `entry-rev-${dateStr}`, { id: `entry-rev-${dateStr}`, kpiId: 'kpi-revenue', workspaceId: w1Id, date: dateStr, value: 450000, isSynced: true });
      }

      await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.transactions, 'tx-1', { id: 'tx-1', workspaceId: w1Id, date: '2026-07-01', amount: 45000, description: 'Client Retainer - Sunrise Tech', status: 'reconciled' });
      await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.transactions, 'tx-2', { id: 'tx-2', workspaceId: w1Id, date: '2026-07-02', amount: -2500, description: 'Office Internet Subscription', status: 'unreconciled' });

      // Mark as seeded
      await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.meta, 'meta', { seeded: true });

      console.log('Appwrite Database successfully seeded!');
    } catch (e) {
      console.error('Failed to seed Appwrite database:', e);
    }
  } else {
    return localSeedDatabase();
  }
}
