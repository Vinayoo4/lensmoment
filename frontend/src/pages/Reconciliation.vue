<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div class="max-w-4xl mx-auto space-y-6">
        <h1 class="text-2xl font-bold text-gray-900">Reconciliation</h1>

        <div v-if="loading" class="animate-pulse space-y-4">
           <div class="h-32 bg-gray-200 rounded"></div>
        </div>

        <template v-else>
          <!-- Current Month Warning -->
          <div v-if="currentDiscrepancy > 0" class="bg-red-50 p-4 rounded border border-red-200">
            <h3 class="text-lg font-semibold text-red-800">Action Required</h3>
            <p class="text-red-700 mt-1">You have an outstanding discrepancy of ₹{{ currentDiscrepancy.toLocaleString() }} for the current month.</p>
            <button @click="startReconciliation" class="mt-3 bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 text-sm font-medium">Start Reconciliation Process</button>
          </div>

          <!-- Active Process UI -->
          <div v-if="activeProcess" class="bg-white p-6 rounded-lg shadow border border-indigo-200">
             <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Reconciling {{ activeMonth }}</h2>
                <div class="space-x-2">
                  <button @click="saveDraft" class="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded border border-yellow-200 hover:bg-yellow-100 text-sm font-medium">Save as Draft</button>
                  <button @click="finalize" class="bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 text-sm font-medium shadow">Finalize</button>
                </div>
             </div>

             <p class="text-sm text-gray-500 mb-4">Review the unreconciled transactions below. If offline, progress is saved locally as a draft.</p>

             <div class="overflow-y-auto max-h-96 border border-gray-200 rounded">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Txn Date</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desc</th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mark</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                     <tr v-for="tx in unreconciledTx" :key="tx.id" :class="{'bg-green-50': tx.localReconciled}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ tx.date }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ tx.description }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">₹{{ tx.amount.toLocaleString() }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                           <input type="checkbox" v-model="tx.localReconciled" class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
                        </td>
                     </tr>
                  </tbody>
                </table>
             </div>
          </div>

          <!-- History Grid -->
          <h2 class="text-lg font-bold text-gray-900 mt-8 mb-4">Reconciliation History</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
             <div v-for="rec in history" :key="rec.id" class="bg-white p-4 rounded shadow border" :class="rec.isDraft ? 'border-yellow-300' : 'border-gray-100'">
                <div class="flex justify-between items-start">
                   <h3 class="font-bold text-gray-900">{{ rec.month }}</h3>
                   <span v-if="rec.isDraft" class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold">Draft</span>
                   <span v-else class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">Finalized</span>
                </div>
                <div class="mt-4 text-sm text-gray-600">
                   <p>Discrepancies: <span :class="rec.discrepanciesCount > 0 ? 'text-red-600 font-bold' : ''">{{ rec.discrepanciesCount }}</span></p>
                </div>
                <button v-if="rec.isDraft" @click="resumeDraft(rec)" class="mt-4 w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-1.5 rounded text-sm font-medium">Resume</button>
             </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { API_BASE_URL } from '../config';
import AppSidebar from '../components/layout/AppSidebar.vue';
import type { ReconciliationState, Transaction } from '../../../shared/types/index';

const appStore = useAppStore();

const loading = ref(true);
const history = ref<ReconciliationState[]>([]);
const transactions = ref<Transaction[]>([]);

const activeProcess = ref(false);
const activeMonth = ref('');

const unreconciledTx = ref<(Transaction & { localReconciled?: boolean })[]>([]);

const getHeaders = () => {
   return { 'Authorization': `Bearer ${appStore.user?.token}` };
};

const loadData = async () => {
  loading.value = true;
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;

  try {
    const [recRes, txRes] = await Promise.all([
       fetch(`${API_BASE_URL}/api/reconciliation?workspaceId=${wsId}`, { headers: getHeaders() }),
       fetch(`${API_BASE_URL}/api/transactions?workspaceId=${wsId}`, { headers: getHeaders() })
    ]);

    if (recRes.ok) history.value = await recRes.json();
    if (txRes.ok) transactions.value = await txRes.json();

    // Sort history
    history.value.sort((a, b) => b.month.localeCompare(a.month));
  } catch (e) {
    // Expected in offline mode
  } finally {
    loading.value = false;
  }
};

const currentDiscrepancy = computed(() => {
  return transactions.value.filter(t => t.status === 'unreconciled').reduce((sum, t) => sum + t.amount, 0);
});

const startReconciliation = () => {
  const d = new Date();
  activeMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  unreconciledTx.value = transactions.value
    .filter(t => t.status === 'unreconciled')
    .map(t => ({ ...t, localReconciled: false }));

  activeProcess.value = true;
};

const resumeDraft = (rec: ReconciliationState) => {
  activeMonth.value = rec.month;
  unreconciledTx.value = transactions.value
    .filter(t => t.status === 'unreconciled')
    .map(t => ({ ...t, localReconciled: false }));
  activeProcess.value = true;
};

const saveDraft = async () => {
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  const remainingCount = unreconciledTx.value.filter(t => !t.localReconciled).length;

  const payload = {
    workspaceId: wsId,
    month: activeMonth.value,
    discrepanciesCount: remainingCount,
    isDraft: true
  };

  if (!appStore.isOnline) {
    await appStore.addToOfflineQueue({ type: 'SAVE_RECONCILIATION_DRAFT', payload });
  } else {
    try {
      await fetch(`${API_BASE_URL}/api/reconciliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify(payload)
      });
    } catch(e) {}
  }

  activeProcess.value = false;
  loadData();
};

const finalize = async () => {
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  const remainingCount = unreconciledTx.value.filter(t => !t.localReconciled).length;

  const payload = {
    workspaceId: wsId,
    month: activeMonth.value,
    discrepanciesCount: remainingCount,
    isDraft: false
  };

  const toUpdate = unreconciledTx.value.filter(t => t.localReconciled);

  if (!appStore.isOnline) {
     for (const tx of toUpdate) {
        await appStore.addToOfflineQueue({ type: 'RECONCILE_TRANSACTION', payload: { id: tx.id } });
     }
     await appStore.addToOfflineQueue({ type: 'SAVE_RECONCILIATION_DRAFT', payload });
  } else {
     try {
       for (const tx of toUpdate) {
          await fetch(`${API_BASE_URL}/api/transactions/${tx.id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getHeaders() },
            body: JSON.stringify({ status: 'reconciled' })
          });
       }
       await fetch(`${API_BASE_URL}/api/reconciliation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders() },
          body: JSON.stringify(payload)
       });
     } catch(e) {}
  }

  activeProcess.value = false;
  loadData();
};

onMounted(() => {
  loadData();
});
</script>
