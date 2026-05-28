<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 font-sans">
    <header class="bg-indigo-600 text-white p-4 flex justify-between items-center shadow">
      <h1 class="text-xl font-bold">Quantify Suite</h1>
      <div class="flex items-center space-x-4">
        <div v-if="!appStore.isOnline" class="bg-red-500 text-white text-xs px-2 py-1 rounded">
          Offline Mode ({{ appStore.offlineQueue.length }} queued)
        </div>
        <button @click="logout" class="text-sm bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-800">Logout</button>
      </div>
    </header>

    <main class="p-4 max-w-4xl mx-auto space-y-6">
      <!-- AI Suggestions -->
      <section v-if="data.suggestions.length" class="bg-yellow-50 p-4 rounded shadow border border-yellow-200">
        <h2 class="text-lg font-semibold text-yellow-800 mb-2">AI Insights & Alerts</h2>
        <ul class="space-y-2">
          <li v-for="sug in data.suggestions" :key="sug.id" class="text-yellow-700 bg-yellow-100 p-2 rounded text-sm">
            {{ sug.text }}
          </li>
        </ul>
      </section>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Add KPI -->
        <section class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-semibold mb-4">Add KPI Entry</h2>
          <form @submit.prevent="addKpi" class="space-y-4">
            <div>
              <label class="block text-sm font-medium">KPI Type</label>
              <select v-model="form.kpiId" class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border">
                <option value="k_traffic">Daily Foot Traffic</option>
                <option value="k_sales">Daily Sales</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium">Value</label>
              <input type="number" v-model="form.value" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border" />
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full">Save Entry</button>
          </form>
        </section>

        <!-- Add Transaction -->
        <section class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-semibold mb-4">Add Transaction</h2>
          <form @submit.prevent="addTransaction" class="space-y-4">
            <div>
              <label class="block text-sm font-medium">Amount</label>
              <input type="number" step="0.01" v-model="txForm.amount" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border" />
            </div>
            <div>
              <label class="block text-sm font-medium">Description</label>
              <input type="text" v-model="txForm.description" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border" />
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full">Save Transaction</button>
          </form>
        </section>
      </div>

      <!-- Lists -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-semibold mb-4">Recent KPIs</h2>
          <ul class="space-y-2">
            <li v-for="kpi in data.kpis" :key="kpi.id" class="text-sm border-b pb-2">
              <span class="font-medium">{{ kpi.kpiId === 'k_traffic' ? 'Traffic' : 'Sales' }}</span>: {{ kpi.value }} ({{ kpi.date }})
              <span v-if="!kpi.isSynced" class="text-xs text-orange-500 ml-2">Syncing...</span>
            </li>
          </ul>
        </section>

        <section class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-semibold mb-4">Transactions (Reconciliation)</h2>
          <ul class="space-y-2">
            <li v-for="tx in data.transactions" :key="tx.id" class="text-sm flex justify-between items-center border-b pb-2">
              <div>
                <div class="font-medium">{{ tx.description }}</div>
                <div class="text-gray-500">${{ tx.amount }}</div>
              </div>
              <div>
                <span v-if="tx.status === 'reconciled'" class="text-green-600 text-xs px-2 py-1 bg-green-100 rounded">Reconciled</span>
                <button v-else @click="reconcile(tx.id)" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Mark Reconciled</button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app';
import { API_BASE_URL } from '../config';

const appStore = useAppStore();
const router = useRouter();

const data = ref({
  kpis: [] as any[],
  transactions: [] as any[],
  suggestions: [] as any[],
});

const form = ref({ kpiId: 'k_traffic', value: '' });
const txForm = ref({ amount: '', description: '' });

const loadDashboard = async () => {
  if (!appStore.user) {
    router.push('/');
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard?workspaceId=${appStore.user.workspaceId}`, {
      headers: { 'Authorization': `Bearer ${appStore.user?.token}` }
    });
    if (res.ok) {
      data.value = await res.json();
    }
  } catch (e) {
    // Suppress noise in production
  }
};

const addKpi = async () => {
  const payload = {
    kpiId: form.value.kpiId,
    date: new Date().toISOString().split('T')[0],
    value: Number(form.value.value),
    workspaceId: appStore.user.workspaceId
  };

  if (!appStore.isOnline) {
    const tempKpi = { ...payload, id: 'temp_' + Date.now(), isSynced: false };
    data.value.kpis.push(tempKpi);
    await appStore.addToOfflineQueue({ type: 'CREATE_KPI', payload });
  } else {
    try {
      await fetch(`${API_BASE_URL}/api/kpi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appStore.user?.token}`
        },
        body: JSON.stringify(payload)
      });
      await loadDashboard();
    } catch (e) {
      // Offline fallback already handled
    }
  }
  form.value.value = '';
};

const addTransaction = async () => {
  const payload = {
    date: new Date().toISOString().split('T')[0],
    amount: Number(txForm.value.amount),
    description: txForm.value.description,
    workspaceId: appStore.user.workspaceId
  };

  if (!appStore.isOnline) {
    const tempTx = { ...payload, id: 'temp_' + Date.now(), status: 'unreconciled' };
    data.value.transactions.push(tempTx);
    await appStore.addToOfflineQueue({ type: 'CREATE_TRANSACTION', payload });
  } else {
    try {
      await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appStore.user?.token}`
        },
        body: JSON.stringify(payload)
      });
      await loadDashboard();
    } catch (e) {
      // Offline fallback already handled
    }
  }
  txForm.value.amount = '';
  txForm.value.description = '';
};

const logout = () => {
  appStore.setUser(null);
  router.push('/');
};

const reconcile = async (id: string) => {
  if (!appStore.isOnline) {
    const tx = data.value.transactions.find(t => t.id === id);
    if (tx) tx.status = 'reconciled';
    await appStore.addToOfflineQueue({ type: 'RECONCILE_TRANSACTION', payload: { id } });
  } else {
    try {
      await fetch(`${API_BASE_URL}/api/transactions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appStore.user?.token}`
        },
        body: JSON.stringify({ status: 'reconciled' })
      });
      await loadDashboard();
    } catch (e) {
      // Offline fallback already handled
    }
  }
};

const updateOnlineStatus = () => appStore.setOnlineStatus(navigator.onLine);

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  appStore.loadQueue();
  loadDashboard();
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>
