import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, OfflineAction, KPIEntry, Transaction, ReconciliationState } from '../shared/types';
import { getOfflineQueue, getFailedQueue, saveOfflineQueue, saveFailedQueue, queueAction } from '../lib/sync';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: User | null;
  token: string | null;
  isOnline: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  registerUser: (name: string, email: string, role: string) => Promise<boolean>;
  
  // Cache and states
  currentWorkspace: any;
  dashboardData: any;
  kpis: any[];
  transactions: any[];
  reconciliationStates: any[];
  reports: any[];
  suggestions: any[];
  auditLogs: any[];
  
  // Offline and Sync States
  offlineQueue: OfflineAction[];
  failedQueue: OfflineAction[];
  clearFailedQueue: () => void;
  retryFailedAction: (actionId: string) => Promise<void>;
  
  // Loading and Error flags
  isLoading: boolean;
  apiError: string | null;
  
  // Action Handlers (Online + Offline compatible)
  postKPIEntry: (kpiId: string, value: number, date: string) => Promise<void>;
  postTransaction: (tx: Omit<Transaction, 'id' | 'workspaceId'>) => Promise<void>;
  changeTransactionStatus: (txId: string, status: Transaction['status']) => Promise<void>;
  postReconciliation: (rec: Omit<ReconciliationState, 'id' | 'workspaceId'>) => Promise<void>;
  
  // Fresh fetches
  fetchCurrentWorkspace: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchKPIs: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchReconciliations: () => Promise<void>;
  fetchReports: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  createReport: (title: string, content?: string) => Promise<void>;
  resolveSuggestion: (sugId: string, status: 'done' | 'dismissed') => Promise<void>;
  renewSubscription: (pack: '6_months' | '1_year') => Promise<boolean>;
  updateUserProfile: (displayName: string, notificationPreferences: any) => Promise<boolean>;
  updateUserSecurity: (currentPassword: string, newPassword: string) => Promise<boolean>;
  apiCall: (path: string, options?: RequestInit) => Promise<any>;
  
  // Notifications
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('quantify_active_tab') || 'dashboard';
  });
  
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [kpis, setKpis] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reconciliationStates, setReconciliationStates] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(getOfflineQueue());
  const [failedQueue, setFailedQueue] = useState<OfflineAction[]>(getFailedQueue());
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('quantify_active_tab', tab);
  }, []);

  // Toast Management
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('You are back online! Replaying offline sync queue...', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Transactions & KPI logs will be safely queued locally.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Auth Recovery on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('quantify_token');
      const storedUser = localStorage.getItem('quantify_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {}
  }, []);

  // Listen for auth:expired events
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      showToast('Your session has expired. Please log in again.', 'error');
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  // Hydrate Cache when auth loads
  useEffect(() => {
    if (token) {
      // Warm up offline cache
      try {
        const cachedWs = localStorage.getItem('cache_current_workspace');
        if (cachedWs) setCurrentWorkspace(JSON.parse(cachedWs));
        const cachedDash = localStorage.getItem('cache_dashboard');
        if (cachedDash) setDashboardData(JSON.parse(cachedDash));
        const cachedKpis = localStorage.getItem('cache_kpis');
        if (cachedKpis) setKpis(JSON.parse(cachedKpis));
        const cachedTxs = localStorage.getItem('cache_transactions');
        if (cachedTxs) setTransactions(JSON.parse(cachedTxs));
        const cachedRecs = localStorage.getItem('cache_reconciliations');
        if (cachedRecs) setReconciliationStates(JSON.parse(cachedRecs));
        const cachedReports = localStorage.getItem('cache_reports');
        if (cachedReports) setReports(JSON.parse(cachedReports));
        const cachedSugs = localStorage.getItem('cache_suggestions');
        if (cachedSugs) setSuggestions(JSON.parse(cachedSugs));
      } catch {}

      // Fresh fetch
      fetchAllData();
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('quantify_token', newToken);
    localStorage.setItem('quantify_user', JSON.stringify(newUser));
    showToast(`Logged in successfully as ${newUser.name}`, 'success');
  }, [showToast]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('quantify_token');
    localStorage.removeItem('quantify_user');
    // Clear caches
    localStorage.removeItem('cache_dashboard');
    localStorage.removeItem('cache_kpis');
    localStorage.removeItem('cache_transactions');
    localStorage.removeItem('cache_reconciliations');
    localStorage.removeItem('cache_reports');
    localStorage.removeItem('cache_suggestions');
    localStorage.removeItem('quantify_active_tab');
    setActiveTab('dashboard');
    showToast('Logged out cleanly.', 'info');
  }, [showToast]);

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!token) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        showToast('You have been logged out due to 30 minutes of inactivity.', 'info');
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Initialize timer
    resetTimer();

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [token, logout, showToast]);

  const registerUser = async (name: string, email: string, role: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: 'password123', role }) // standard simple password for registration demo
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Registration failed', 'error');
        return false;
      }
      login(data.token, data.user);
      return true;
    } catch (err: any) {
      showToast('Registration error: ' + err.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Base Scoped Request helper
  const apiCall = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!token) throw new Error('Unauthenticated api call');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    };

    const res = await fetch(path, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server error');
    }
    return data;
  }, [token]);

  // Bulk Refetchers
  const fetchCurrentWorkspace = async () => {
    try {
      const data = await apiCall('/api/workspaces/current');
      setCurrentWorkspace(data);
      localStorage.setItem('cache_current_workspace', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchDashboard = async () => {
    try {
      const data = await apiCall('/api/dashboard');
      setDashboardData(data);
      localStorage.setItem('cache_dashboard', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchKPIs = async () => {
    try {
      const data = await apiCall('/api/kpis');
      setKpis(data);
      localStorage.setItem('cache_kpis', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiCall('/api/transactions');
      setTransactions(data);
      localStorage.setItem('cache_transactions', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchReconciliations = async () => {
    try {
      const data = await apiCall('/api/reconciliation');
      setReconciliationStates(data);
      localStorage.setItem('cache_reconciliations', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await apiCall('/api/reports');
      setReports(data);
      localStorage.setItem('cache_reports', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await apiCall('/api/suggestions');
      setSuggestions(data);
      localStorage.setItem('cache_suggestions', JSON.stringify(data));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchAuditLogs = async () => {
    if (user?.role !== 'superadmin') return;
    try {
      const data = await apiCall('/api/audit');
      setAuditLogs(data);
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const fetchAllData = () => {
    setIsLoading(true);
    setApiError(null);
    Promise.all([
      fetchCurrentWorkspace(),
      fetchDashboard(),
      fetchKPIs(),
      fetchTransactions(),
      fetchReconciliations(),
      fetchReports(),
      fetchSuggestions(),
      fetchAuditLogs()
    ]).finally(() => setIsLoading(false));
  };

  // Mutative Wrapper: KPI Entry
  const postKPIEntry = async (kpiId: string, value: number, date: string) => {
    const payload = { kpiId, value, date };
    
    // Optimistic Update: append entry to local list if viewing
    const tempEntry = { id: `optimistic_${Date.now()}`, kpiId, date, value, isSynced: false };
    if (dashboardData?.entries) {
      setDashboardData((prev: any) => ({
        ...prev,
        entries: [...(prev?.entries || []), tempEntry]
      }));
    }

    if (!isOnline) {
      const result = queueAction('create_kpi_entry', payload);
      setOfflineQueue(getOfflineQueue());
      if (result.queued) {
        showToast('You are offline. KPI entry queued locally for synchronization.', 'info');
      }
      return;
    }

    try {
      await apiCall(`/api/kpis/${kpiId}/entries`, {
        method: 'POST',
        body: JSON.stringify({ date, value })
      });
      showToast('KPI Entry posted successfully!', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast('Failed to save KPI Entry: ' + err.message, 'error');
    }
  };

  // Mutative Wrapper: Create Transaction
  const postTransaction = async (tx: Omit<Transaction, 'id' | 'workspaceId'>) => {
    const tempTx = { ...tx, id: `optimistic_${Date.now()}`, workspaceId: user?.workspaceId || '', isSynced: false };
    setTransactions(prev => [tempTx, ...prev]);

    if (!isOnline) {
      const result = queueAction('create_transaction', tx);
      setOfflineQueue(getOfflineQueue());
      if (result.queued) {
        showToast('You are offline. Transaction queued locally for synchronization.', 'info');
      }
      return;
    }

    try {
      await apiCall('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(tx)
      });
      showToast('Transaction created successfully!', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast('Failed to create transaction: ' + err.message, 'error');
    }
  };

  // Mutative Wrapper: Update Transaction Status
  const changeTransactionStatus = async (txId: string, status: Transaction['status']) => {
    // Optimistically update status in UI
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status } : t));

    if (!isOnline) {
      const result = queueAction('update_transaction_status', { txId, status });
      setOfflineQueue(getOfflineQueue());
      if (result.queued) {
        showToast('Offline state: Status update queued locally.', 'info');
      }
      return;
    }

    try {
      await apiCall(`/api/transactions/${txId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Transaction successfully marked ${status}!`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  // Mutative Wrapper: Reconciliation Save
  const postReconciliation = async (rec: Omit<ReconciliationState, 'id' | 'workspaceId'>) => {
    // Optimistically update
    const tempRec = { ...rec, id: `optimistic_${Date.now()}`, workspaceId: user?.workspaceId || '' };
    setReconciliationStates(prev => {
      const exists = prev.findIndex(r => r.month === rec.month);
      if (exists !== -1) {
        const next = [...prev];
        next[exists] = { ...next[exists], ...rec };
        return next;
      }
      return [...prev, tempRec];
    });

    if (!isOnline) {
      const result = queueAction('save_reconciliation', rec);
      setOfflineQueue(getOfflineQueue());
      if (result.queued) {
        showToast('Offline state: Reconciliation draft saved locally.', 'info');
      }
      return;
    }

    try {
      await apiCall('/api/reconciliation', {
        method: 'POST',
        body: JSON.stringify(rec)
      });
      showToast(`Reconciliation ${rec.isDraft ? 'Draft Saved' : 'Finalized'} successfully!`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast('Failed to save reconciliation: ' + err.message, 'error');
    }
  };

  // Create Report
  const createReport = async (title: string, content?: string) => {
    try {
      setIsLoading(true);
      await apiCall('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ title, content })
      });
      showToast(`Operational Report "${title}" generated!`, 'success');
      fetchReports();
    } catch (err: any) {
      showToast('Failed to create report: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss / Solve Suggestion
  const resolveSuggestion = async (sugId: string, status: 'done' | 'dismissed') => {
    try {
      await apiCall(`/api/suggestions/${sugId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      showToast(`Suggestion marked as ${status}`, 'success');
      fetchSuggestions();
    } catch (err: any) {
      showToast('Failed to update suggestion: ' + err.message, 'error');
    }
  };

  const renewSubscription = async (pack: '6_months' | '1_year'): Promise<boolean> => {
    try {
      setIsLoading(true);
      const data = await apiCall('/api/workspaces/current/renew', {
        method: 'POST',
        body: JSON.stringify({ pack })
      });
      if (data.success) {
        showToast(`Subscription pack updated to ${pack === '1_year' ? '1-Year Premium' : '6-Month Standard'}!`, 'success');
        await fetchCurrentWorkspace();
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast('Subscription renewal failed: ' + err.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (displayName: string, notificationPreferences: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const data = await apiCall('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, notificationPreferences })
      });
      if (data.success) {
        showToast('Profile updated successfully!', 'success');
        setUser(data.user);
        localStorage.setItem('quantify_user', JSON.stringify(data.user));
        await fetchAuditLogs();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast('Profile update failed: ' + err.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserSecurity = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const data = await apiCall('/api/users/security', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (data.success) {
        showToast('Password updated successfully!', 'success');
        await fetchAuditLogs();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast('Password update failed: ' + err.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Background Sync Queue Processor (Triggered automatically when online)
  const processOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0 || !isOnline || !token) return;

    showToast(`Syncing ${queue.length} offline operation(s) with server...`, 'info');
    
    let processedCount = 0;
    const remainingQueue: OfflineAction[] = [];
    const failedList = getFailedQueue();

    for (const action of queue) {
      try {
        if (action.type === 'create_kpi_entry') {
          const { kpiId, value, date } = action.payload;
          await apiCall(`/api/kpis/${kpiId}/entries`, {
            method: 'POST',
            body: JSON.stringify({ date, value })
          });
        } else if (action.type === 'create_transaction') {
          await apiCall('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(action.payload)
          });
        } else if (action.type === 'update_transaction_status') {
          const { txId, status } = action.payload;
          await apiCall(`/api/transactions/${txId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
          });
        } else if (action.type === 'save_reconciliation') {
          await apiCall('/api/reconciliation', {
            method: 'POST',
            body: JSON.stringify(action.payload)
          });
        }
        processedCount++;
      } catch (err: any) {
        console.error('Failed to sync action:', action, err);
        // Retry logic: If it failed due to logical errors (400, etc.), push to failed queue
        action.isFailed = true;
        action.errorMessage = err.message || 'Unknown network sync error';
        failedList.push(action);
      }
    }

    saveOfflineQueue(remainingQueue);
    saveFailedQueue(failedList);
    setOfflineQueue(remainingQueue);
    setFailedQueue(failedList);

    if (processedCount > 0) {
      showToast(`Successfully synced ${processedCount} pending operation(s) to ledger!`, 'success');
      fetchAllData();
    } else if (failedList.length > 0) {
      showToast(`${failedList.length} sync operation(s) failed. Check sync log in dashboard.`, 'error');
    }
  }, [isOnline, token, apiCall, showToast]);

  // Periodically check/process queue
  useEffect(() => {
    if (isOnline && token) {
      processOfflineQueue();
    }
  }, [isOnline, token, processOfflineQueue]);

  const clearFailedQueue = () => {
    saveFailedQueue([]);
    setFailedQueue([]);
    showToast('Failed sync queue cleared.', 'info');
  };

  const retryFailedAction = async (actionId: string) => {
    const list = getFailedQueue();
    const idx = list.findIndex(a => a.id === actionId);
    if (idx === -1) return;

    const action = list[idx];
    try {
      showToast('Retrying synchronization...', 'info');
      
      if (action.type === 'create_kpi_entry') {
        const { kpiId, value, date } = action.payload;
        await apiCall(`/api/kpis/${kpiId}/entries`, {
          method: 'POST',
          body: JSON.stringify({ date, value })
        });
      } else if (action.type === 'create_transaction') {
        await apiCall('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(action.payload)
        });
      } else if (action.type === 'update_transaction_status') {
        const { txId, status } = action.payload;
        await apiCall(`/api/transactions/${txId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status })
        });
      } else if (action.type === 'save_reconciliation') {
        await apiCall('/api/reconciliation', {
          method: 'POST',
          body: JSON.stringify(action.payload)
        });
      }

      showToast('Action synced successfully on retry!', 'success');
      // Remove from failed list
      const nextList = list.filter(a => a.id !== actionId);
      saveFailedQueue(nextList);
      setFailedQueue(nextList);
      fetchAllData();
    } catch (err: any) {
      showToast('Sync retry failed again: ' + err.message, 'error');
      // Update error message
      list[idx].errorMessage = err.message;
      saveFailedQueue(list);
      setFailedQueue(list);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      isOnline,
      activeTab,
      setActiveTab: handleSetActiveTab,
      login,
      logout,
      registerUser,
      currentWorkspace,
      dashboardData,
      kpis,
      transactions,
      reconciliationStates,
      reports,
      suggestions,
      auditLogs,
      offlineQueue,
      failedQueue,
      clearFailedQueue,
      retryFailedAction,
      isLoading,
      apiError,
      postKPIEntry,
      postTransaction,
      changeTransactionStatus,
      postReconciliation,
      fetchCurrentWorkspace,
      fetchDashboard,
      fetchKPIs,
      fetchTransactions,
      fetchReconciliations,
      fetchReports,
      fetchSuggestions,
      fetchAuditLogs,
      createReport,
      resolveSuggestion,
      renewSubscription,
      updateUserProfile,
      updateUserSecurity,
      apiCall,
      toasts,
      showToast,
      removeToast
    }}>
      {children}
      {/* Dynamic Floating Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`p-4 rounded-xl shadow-lg border text-sm flex items-start justify-between gap-3 animate-fade-in backdrop-blur-md transition-all ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                : toast.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-800 dark:text-slate-300'
            }`}
          >
            <div>{toast.message}</div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="text-xs font-bold hover:opacity-75 transition-opacity focus:outline-none"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
