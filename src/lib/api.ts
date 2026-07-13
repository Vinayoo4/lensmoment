/**
 * Typed API Wrapper for Quantify AI Client
 * Automatically handles JWT Authorization headers and error states.
 */

import {
  User,
  KPIDefinition,
  KPIEntry,
  Transaction,
  ReconciliationState,
  AISuggestion,
  Report,
  AuditLog,
  UserRole
} from '../shared/types';

// Custom error classes for clear programmatic handling
export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export class SessionExpiredError extends APIError {
  constructor() {
    super('Your session has expired. Please log in again.', 401);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Retrieve the active JWT token from localStorage
 */
export function getStoredToken(): string | null {
  return localStorage.getItem('quantify_token');
}

/**
 * Helper to execute fetch requests with automated JWT inclusion and error handling
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  
  // Build and merge headers
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  // Handle unauthorized or forbidden session states
  if (response.status === 401 || response.status === 403) {
    // Dispatch custom event so AppProvider / App can react and clean local state
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new SessionExpiredError();
  }

  // Parse response body
  let data: any;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    const errorMessage = data.error || data.message || `API request failed with status ${response.status}`;
    throw new APIError(errorMessage, response.status);
  }

  return data as T;
}

/**
 * Typed Endpoints for Quantify AI API
 */
export const api = {
  /**
   * Health and diagnostics
   */
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return apiFetch('/health');
  },

  /**
   * User Authentication routes
   */
  auth: {
    async register(
      name: string,
      email: string,
      role: UserRole
    ): Promise<{ token: string; user: User }> {
      return apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: 'password123', role }),
      });
    },

    async login(email: string): Promise<{ token: string; user: User }> {
      return apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'password123' }),
      });
    },
  },

  /**
   * Dashboard combined stats
   */
  dashboard: {
    async get(): Promise<{
      workspaceId: string;
      kpis: KPIDefinition[];
      entries: KPIEntry[];
      transactions: Transaction[];
      suggestions: AISuggestion[];
    }> {
      return apiFetch('/api/dashboard');
    },
  },

  /**
   * Key Performance Indicators (KPIs)
   */
  kpis: {
    async list(): Promise<KPIDefinition[]> {
      return apiFetch('/api/kpis');
    },

    async create(kpi: Omit<KPIDefinition, 'id' | 'workspaceId'>): Promise<KPIDefinition> {
      return apiFetch('/api/kpis', {
        method: 'POST',
        body: JSON.stringify(kpi),
      });
    },

    async update(
      id: string,
      kpi: Partial<Omit<KPIDefinition, 'id' | 'workspaceId'>>
    ): Promise<KPIDefinition> {
      return apiFetch(`/api/kpis/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(kpi),
      });
    },

    async delete(id: string): Promise<{ success: boolean }> {
      return apiFetch(`/api/kpis/${id}`, {
        method: 'DELETE',
      });
    },

    async getEntries(kpiId: string): Promise<KPIEntry[]> {
      return apiFetch(`/api/kpis/${kpiId}/entries`);
    },

    async addEntry(kpiId: string, entry: { date: string; value: number }): Promise<KPIEntry> {
      return apiFetch(`/api/kpis/${kpiId}/entries`, {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },
  },

  /**
   * Financial Ledger Transactions
   */
  transactions: {
    async list(): Promise<Transaction[]> {
      return apiFetch('/api/transactions');
    },

    async create(tx: Omit<Transaction, 'id' | 'workspaceId'>): Promise<Transaction> {
      return apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(tx),
      });
    },

    async updateStatus(
      id: string,
      status: Transaction['status']
    ): Promise<Transaction> {
      return apiFetch(`/api/transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },

    async update(
      id: string,
      tx: Partial<Omit<Transaction, 'id' | 'workspaceId'>>
    ): Promise<Transaction> {
      return apiFetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(tx),
      });
    },

    async delete(id: string): Promise<{ success: boolean }> {
      return apiFetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * Reconciliation state & workflows
   */
  reconciliation: {
    async list(): Promise<ReconciliationState[]> {
      return apiFetch('/api/reconciliation');
    },

    async save(
      rec: Omit<ReconciliationState, 'id' | 'workspaceId'>
    ): Promise<ReconciliationState> {
      return apiFetch('/api/reconciliation', {
        method: 'POST',
        body: JSON.stringify(rec),
      });
    },
  },

  /**
   * Generative reports
   */
  reports: {
    async list(): Promise<Report[]> {
      return apiFetch('/api/reports');
    },

    async create(report: { title: string; content?: string }): Promise<Report> {
      return apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify(report),
      });
    },
  },

  /**
   * AI Suggestions & Actions
   */
  suggestions: {
    async list(): Promise<AISuggestion[]> {
      return apiFetch('/api/suggestions');
    },

    async resolve(
      id: string,
      status: AISuggestion['status']
    ): Promise<AISuggestion> {
      return apiFetch(`/api/suggestions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  /**
   * Security & Telemetry logs (Superadmin restricted)
   */
  audit: {
    async list(): Promise<AuditLog[]> {
      return apiFetch('/api/audit');
    },
  },
};
