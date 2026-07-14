import { Databases, AppwriteException, Client } from 'node-appwrite';
import { databases, APPWRITE_DB_ID, COLLECTIONS, isAppwriteEnabled } from './appwrite';
import * as dotenv from 'dotenv';
dotenv.config();

export async function setupAppwriteSchema() {
  if (!isAppwriteEnabled) return;

  console.log('Ensuring Appwrite Database and Collections exist...');

  try {
    try {
      await databases.get(APPWRITE_DB_ID);
      console.log('Appwrite Database found.');
    } catch (e: any) {
      if (e.code === 404) {
        console.log('Appwrite Database not found, creating...');
        await databases.create(APPWRITE_DB_ID, 'Quantify DB');
      } else {
        throw e;
      }
    }

    const collectionsToCreate = [
      { id: COLLECTIONS.workspaces, name: 'Workspaces', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'subscriptionPlan', type: 'string', size: 50, required: false },
        { key: 'subscriptionExpiresAt', type: 'string', size: 50, required: false }
      ]},
      { id: COLLECTIONS.users, name: 'Users', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'role', type: 'string', size: 50, required: true },
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'displayName', type: 'string', size: 255, required: false },
        { key: 'email', type: 'string', size: 255, required: false },
        { key: 'password', type: 'string', size: 1024, required: false },
        { key: 'notificationPreferences', type: 'string', size: 2048, required: false }
      ]},
      { id: COLLECTIONS.kpiDefinitions, name: 'KPI Definitions', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'unit', type: 'string', size: 50, required: true },
        { key: 'targetValue', type: 'float', required: false }
      ]},
      { id: COLLECTIONS.kpiEntries, name: 'KPI Entries', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'kpiId', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'date', type: 'string', size: 50, required: true },
        { key: 'value', type: 'float', required: true },
        { key: 'isSynced', type: 'boolean', required: false, default: true }
      ]},
      { id: COLLECTIONS.transactions, name: 'Transactions', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'date', type: 'string', size: 50, required: true },
        { key: 'amount', type: 'float', required: true },
        { key: 'description', type: 'string', size: 1024, required: true },
        { key: 'status', type: 'string', size: 50, required: true }
      ]},
      { id: COLLECTIONS.reconciliationStates, name: 'Reconciliation States', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'month', type: 'string', size: 50, required: true },
        { key: 'discrepanciesCount', type: 'integer', required: true },
        { key: 'isDraft', type: 'boolean', required: true }
      ]},
      { id: COLLECTIONS.aiSuggestions, name: 'AI Suggestions', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'type', type: 'string', size: 100, required: true },
        { key: 'trigger', type: 'string', size: 255, required: true },
        { key: 'text', type: 'string', size: 4096, required: true },
        { key: 'status', type: 'string', size: 50, required: true }
      ]},
      { id: COLLECTIONS.reports, name: 'Reports', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'workspaceId', type: 'string', size: 100, required: true },
        { key: 'title', type: 'string', size: 255, required: true },
        { key: 'content', type: 'string', size: 1000000, required: true },
        { key: 'createdAt', type: 'string', size: 50, required: true }
      ]},
      { id: COLLECTIONS.auditLogs, name: 'Audit Logs', attributes: [
        { key: 'id', type: 'string', size: 100, required: true },
        { key: 'timestamp', type: 'string', size: 50, required: true },
        { key: 'userId', type: 'string', size: 100, required: true },
        { key: 'action', type: 'string', size: 255, required: true },
        { key: 'details', type: 'string', size: 4096, required: true }
      ]},
      { id: COLLECTIONS.meta, name: 'Meta', attributes: [
        { key: 'seeded', type: 'boolean', required: true, default: false }
      ]}
    ];

    for (const coll of collectionsToCreate) {
      try {
        await databases.getCollection(APPWRITE_DB_ID, coll.id);
      } catch (e: any) {
        if (e.code === 404) {
          console.log(`Creating collection ${coll.id}...`);
          await databases.createCollection(APPWRITE_DB_ID, coll.id, coll.name);

          for (const attr of coll.attributes) {
            try {
              if (attr.type === 'string') {
                await databases.createStringAttribute(APPWRITE_DB_ID, coll.id, attr.key, attr.size!, attr.required, (attr as any).default);
              } else if (attr.type === 'float') {
                await databases.createFloatAttribute(APPWRITE_DB_ID, coll.id, attr.key, attr.required);
              } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(APPWRITE_DB_ID, coll.id, attr.key, attr.required);
              } else if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(APPWRITE_DB_ID, coll.id, attr.key, attr.required, (attr as any).default);
              }
            } catch (attrError: any) {
              console.error(`Error creating attribute ${attr.key} on ${coll.id}:`, attrError.message);
            }
          }
          // Waiting a bit for attributes to be created (Appwrite creates them asynchronously sometimes)
          await new Promise(res => setTimeout(res, 2000));
        } else {
          throw e;
        }
      }
    }
    console.log('Appwrite schema setup complete.');
  } catch (error) {
    console.error('Failed to setup Appwrite schema:', error);
  }
}
