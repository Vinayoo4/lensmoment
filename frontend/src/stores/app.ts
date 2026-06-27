import { defineStore } from 'pinia';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL } from '../config';
import type { User, OfflineAction } from '../../../shared/types/index';

async function generatePayloadHash(payload: unknown) {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const useAppStore = defineStore('app', {
  state: () => ({
    isOnline: navigator.onLine,
    offlineQueue: [] as OfflineAction[],
    user: null as User & { token?: string } | null,
    isSyncing: false
  }),
  actions: {
    setUser(user: User & { token?: string } | null) {
      this.user = user;
      if (user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('auth_user');
      }
    },
    loadUser() {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        try {
          this.user = JSON.parse(stored);
        } catch (e) {
          this.user = null;
        }
      }
    },
    setOnlineStatus(status: boolean) {
      this.isOnline = status;
      if (status && !this.isSyncing) {
        this.processOfflineQueue();
      }
    },
    async addToOfflineQueue(action: Omit<OfflineAction, 'queueId' | 'timestamp' | 'retryCount' | 'payloadHash'>) {
      const payloadHash = await generatePayloadHash(action.payload);

      // Duplicate prevention
      if (this.offlineQueue.some(item => item.type === action.type && item.payloadHash === payloadHash)) {
        console.log('Skipping duplicate offline action');
        return;
      }

      const actionWithId: OfflineAction = {
        ...action,
        queueId: uuidv4(),
        timestamp: Date.now(),
        retryCount: 0,
        payloadHash
      };

      this.offlineQueue.push(actionWithId);

      // Sort chronologically just in case
      this.offlineQueue.sort((a, b) => a.timestamp - b.timestamp);

      await localforage.setItem('offlineQueue', JSON.parse(JSON.stringify(this.offlineQueue)));
    },
    async processOfflineQueue() {
      if (this.isSyncing) return;
      this.isSyncing = true;

      const queue = await localforage.getItem<OfflineAction[]>('offlineQueue') || [];
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      const failedQueue = await localforage.getItem<OfflineAction[]>('failed_queue') || [];
      const remainingQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'CREATE_KPI' && 'kpiId' in action.payload) {
            await fetch(`${API_BASE_URL}/api/kpis/${action.payload.kpiId}/entries`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.user?.token}` },
              body: JSON.stringify(action.payload)
            });
          } else if (action.type === 'CREATE_TRANSACTION') {
            await fetch(`${API_BASE_URL}/api/transactions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.user?.token}` },
              body: JSON.stringify(action.payload)
            });
          } else if (action.type === 'RECONCILE_TRANSACTION' && 'id' in action.payload) {
            await fetch(`${API_BASE_URL}/api/transactions/${action.payload.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.user?.token}` },
              body: JSON.stringify({ status: 'reconciled' })
            });
          } else if (action.type === 'SAVE_RECONCILIATION_DRAFT') {
            await fetch(`${API_BASE_URL}/api/reconciliation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.user?.token}` },
              body: JSON.stringify(action.payload)
            });
          }
        } catch (e) {
          console.error('Failed to sync action', action, e);
          action.retryCount = (action.retryCount || 0) + 1;

          if (action.retryCount >= 3) {
             console.error('Action permanently failed, moving to failed_queue', action);
             failedQueue.push({ ...action, error: String(e) });
             // notify user visually (e.g. via toast) - left out for brevity
          } else {
             remainingQueue.push(action);
          }
          // break out of loop if we hit a network error to maintain chronological order for next sync
          break;
        }
      }

      this.offlineQueue = remainingQueue;
      await localforage.setItem('offlineQueue', JSON.parse(JSON.stringify(remainingQueue)));
      await localforage.setItem('failed_queue', JSON.parse(JSON.stringify(failedQueue)));
      this.isSyncing = false;
    },
    async loadQueue() {
      const queue = await localforage.getItem<OfflineAction[]>('offlineQueue') || [];
      this.offlineQueue = queue.sort((a, b) => a.timestamp - b.timestamp);
    },
    initNetworkListeners() {
      window.addEventListener('online', () => {
        this.setOnlineStatus(true);
      });
      window.addEventListener('offline', () => {
        this.setOnlineStatus(false);
      });
    }
  }
});
