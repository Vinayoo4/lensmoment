import { Client, Databases, ID, Query, Users } from 'node-appwrite';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client();

if (process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && process.env.APPWRITE_API_KEY) {
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

export const databases = new Databases(client);

export const APPWRITE_DB_ID = process.env.APPWRITE_DATABASE_ID || 'quantify_db';
export const isAppwriteEnabled = !!process.env.APPWRITE_PROJECT_ID && !!process.env.APPWRITE_API_KEY;

export const COLLECTIONS = {
  workspaces: 'workspaces',
  users: 'users',
  kpiDefinitions: 'kpiDefinitions',
  kpiEntries: 'kpiEntries',
  transactions: 'transactions',
  reconciliationStates: 'reconciliationStates',
  aiSuggestions: 'aiSuggestions',
  reports: 'reports',
  auditLogs: 'auditLogs',
  meta: 'meta'
};
