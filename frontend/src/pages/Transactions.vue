<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div class="max-w-6xl mx-auto space-y-6">
        <h1 class="text-2xl font-bold text-gray-900">Transactions</h1>

        <!-- Stats Bar -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded shadow border border-gray-100">
            <p class="text-sm text-gray-500 font-medium">Net Balance</p>
            <p class="text-2xl font-bold" :class="netBalance >= 0 ? 'text-green-600' : 'text-red-600'">₹{{ netBalance.toLocaleString() }}</p>
          </div>
          <div class="bg-white p-4 rounded shadow border border-gray-100">
            <p class="text-sm text-gray-500 font-medium">Reconciled</p>
            <p class="text-2xl font-bold text-gray-900">₹{{ reconciledTotal.toLocaleString() }} <span class="text-sm font-normal text-gray-500">({{ reconciledCount }})</span></p>
          </div>
          <div class="bg-white p-4 rounded shadow border border-gray-100">
            <p class="text-sm text-gray-500 font-medium">Unreconciled</p>
            <p class="text-2xl font-bold text-gray-900">₹{{ unreconciledTotal.toLocaleString() }} <span class="text-sm font-normal text-gray-500">({{ unreconciledCount }})</span></p>
          </div>
        </div>

        <!-- Filters & Actions -->
        <div class="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded shadow border border-gray-100">
          <div class="flex flex-1 space-x-4">
            <input v-model="search" type="text" placeholder="Search description..." class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-gray-50 p-2 border">
            <select v-model="filterStatus" class="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-gray-50 p-2 border w-40">
              <option value="all">All Status</option>
              <option value="reconciled">Reconciled</option>
              <option value="unreconciled">Unreconciled</option>
            </select>
          </div>
          <div class="flex space-x-2">
            <button @click="showBulk = !showBulk" class="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm font-medium">Bulk Import</button>
            <button @click="showAdd = !showAdd" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium">Add Manual</button>
          </div>
        </div>

        <!-- Add Manual Form -->
        <form v-if="showAdd" @submit.prevent="addTransaction" class="bg-white p-4 rounded shadow border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label class="block text-xs font-medium text-gray-700">Date</label>
            <input v-model="form.date" type="date" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700">Amount (₹)</label>
            <input v-model="form.amount" type="number" step="0.01" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700">Description</label>
            <input v-model="form.description" type="text" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border">
          </div>
          <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full h-[42px]">Save Transaction</button>
        </form>

        <!-- Bulk Import Form -->
        <div v-if="showBulk" class="bg-white p-4 rounded shadow border border-gray-200">
          <label class="block text-xs font-medium text-gray-700 mb-1">Paste JSON Array of Transactions</label>
          <textarea v-model="bulkJson" rows="5" class="block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50 border font-mono text-xs mb-2" placeholder='[{"date":"2023-10-01", "amount":100, "description":"Sale"}]'></textarea>
          <button @click="importBulk" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">Import JSON</button>
        </div>

        <!-- Table -->
        <div class="bg-white shadow rounded border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="tx in filteredTransactions" :key="tx.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ tx.date }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ tx.description }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" :class="tx.amount < 0 ? 'text-red-600' : 'text-green-600'">₹{{ tx.amount.toLocaleString() }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span :class="tx.status === 'reconciled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button v-if="tx.status === 'unreconciled'" @click="toggleStatus(tx.id, 'reconciled')" class="text-indigo-600 hover:text-indigo-900">Reconcile</button>
                    <button v-else @click="toggleStatus(tx.id, 'unreconciled')" class="text-gray-500 hover:text-gray-700">Undo</button>
                  </td>
                </tr>
                <tr v-if="filteredTransactions.length === 0">
                  <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No transactions found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { API_BASE_URL } from '../config';
import AppSidebar from '../components/layout/AppSidebar.vue';

const appStore = useAppStore();

const transactions = ref<any[]>([]);
const search = ref('');
const filterStatus = ref('all');

const showAdd = ref(false);
const showBulk = ref(false);
const form = ref({ date: new Date().toISOString().split('T')[0], amount: '', description: '' });
const bulkJson = ref('');

const getHeaders = () => {
   return { 'Authorization': `Bearer ${appStore.user?.token}` };
};

const loadTransactions = async () => {
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  try {
    const res = await fetch(`${API_BASE_URL}/api/transactions?workspaceId=${wsId}`, { headers: getHeaders() });
    if (res.ok) {
      transactions.value = await res.json();
      transactions.value.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (e) {
    console.warn("Offline or failed to load");
  }
};

const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    const matchSearch = tx.description.toLowerCase().includes(search.value.toLowerCase());
    const matchStatus = filterStatus.value === 'all' || tx.status === filterStatus.value;
    return matchSearch && matchStatus;
  });
});

const netBalance = computed(() => transactions.value.reduce((sum, t) => sum + t.amount, 0));
const reconciledTx = computed(() => transactions.value.filter(t => t.status === 'reconciled'));
const unreconciledTx = computed(() => transactions.value.filter(t => t.status === 'unreconciled'));

const reconciledTotal = computed(() => reconciledTx.value.reduce((sum, t) => sum + t.amount, 0));
const unreconciledTotal = computed(() => unreconciledTx.value.reduce((sum, t) => sum + t.amount, 0));
const reconciledCount = computed(() => reconciledTx.value.length);
const unreconciledCount = computed(() => unreconciledTx.value.length);

const addTransaction = async () => {
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  const payload = {
    workspaceId: wsId,
    date: form.value.date,
    amount: Number(form.value.amount),
    description: form.value.description,
    status: 'unreconciled'
  };

  if (!appStore.isOnline) {
    transactions.value.unshift({ ...payload, id: 'temp_' + Date.now() });
    await appStore.addToOfflineQueue({ type: 'CREATE_TRANSACTION', payload });
  } else {
    try {
      await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify(payload)
      });
      loadTransactions();
    } catch (e) {}
  }
  form.value.amount = '';
  form.value.description = '';
  showAdd.value = false;
};

const importBulk = async () => {
  try {
    const parsed = JSON.parse(bulkJson.value);
    if (!Array.isArray(parsed)) throw new Error("Must be array");
    const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;

    for (const item of parsed) {
       const payload = {
         workspaceId: wsId,
         date: item.date || new Date().toISOString().split('T')[0],
         amount: Number(item.amount),
         description: item.description || 'Imported',
         status: item.status || 'unreconciled'
       };
       if (!appStore.isOnline) {
          await appStore.addToOfflineQueue({ type: 'CREATE_TRANSACTION', payload });
       } else {
          await fetch(`${API_BASE_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getHeaders() },
            body: JSON.stringify(payload)
          });
       }
    }
    loadTransactions();
    bulkJson.value = '';
    showBulk.value = false;
  } catch (e) {
    alert("Invalid JSON format");
  }
};

const toggleStatus = async (id: string, newStatus: string) => {
  const tx = transactions.value.find(t => t.id === id);
  if (tx) tx.status = newStatus;

  if (!appStore.isOnline) {
    await appStore.addToOfflineQueue({ type: 'RECONCILE_TRANSACTION', payload: { id } });
  } else {
    try {
      await fetch(`${API_BASE_URL}/api/transactions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status: newStatus })
      });
      loadTransactions();
    } catch (e) {}
  }
};

onMounted(() => {
  loadTransactions();
});
</script>
