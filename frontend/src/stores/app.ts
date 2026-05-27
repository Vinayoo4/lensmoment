import { defineStore } from 'pinia';
import localforage from 'localforage';

export const useAppStore = defineStore('app', {
  state: () => ({
    isOnline: navigator.onLine,
    offlineQueue: [] as any[],
    user: null as any | null,
  }),
  actions: {
    setUser(user: any) {
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
      if (status) {
        this.processOfflineQueue();
      }
    },
    async addToOfflineQueue(action: any) {
      const actionWithId = { ...action, queueId: Date.now() + Math.random() };
      this.offlineQueue.push(actionWithId);
      await localforage.setItem('offlineQueue', JSON.parse(JSON.stringify(this.offlineQueue)));
    },
    async processOfflineQueue() {
      const queue = await localforage.getItem<any[]>('offlineQueue') || [];
      if (queue.length === 0) return;

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      for (const action of queue) {
        try {
          if (action.type === 'CREATE_KPI') {
            await fetch(`${API_BASE_URL}/api/kpi`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload)
            });
          } else if (action.type === 'CREATE_TRANSACTION') {
            await fetch(`${API_BASE_URL}/api/transactions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload)
            });
          } else if (action.type === 'RECONCILE_TRANSACTION') {
            await fetch(`${API_BASE_URL}/api/transactions/${action.payload.id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'reconciled' })
            });
          }
        } catch (e) {
          console.error('Failed to sync action', action, e);
          return; // stop processing if one fails
        }
      }

      this.offlineQueue = [];
      await localforage.setItem('offlineQueue', []);
    },
    async loadQueue() {
      const queue = await localforage.getItem<any[]>('offlineQueue') || [];
      this.offlineQueue = queue;
    }
  }
});
