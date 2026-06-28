<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div class="max-w-5xl mx-auto space-y-6">
        <h1 class="text-2xl font-bold text-gray-900">KPI Management</h1>

        <!-- Definitions Section -->
        <section class="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div class="flex justify-between items-center mb-4">
             <h2 class="text-lg font-semibold text-gray-900">KPI Definitions</h2>
             <button @click="showDefForm = !showDefForm" class="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700">
               {{ showDefForm ? 'Cancel' : 'Add KPI' }}
             </button>
          </div>

          <form v-if="showDefForm" @submit.prevent="saveKpiDef" class="mb-6 p-4 bg-gray-50 rounded border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label class="block text-xs font-medium text-gray-700">Name</label>
              <input v-model="defForm.name" type="text" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Unit</label>
              <input v-model="defForm.unit" type="text" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Target Value</label>
              <input v-model="defForm.targetValue" type="number" step="0.01" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border">
            </div>
            <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full md:w-auto h-10">Save</button>
          </form>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="def in kpiDefs" :key="def.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ def.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ def.unit }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button @click="deleteKpiDef(def.id)" class="text-red-600 hover:text-red-900 ml-4">Delete</button>
                  </td>
                </tr>
                <tr v-if="kpiDefs.length === 0">
                  <td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500">No KPIs defined yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Entry Section -->
        <section class="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Add KPI Entry</h2>

          <div class="mb-4">
             <div class="flex space-x-4 border-b border-gray-200">
                <button @click="entryMode = 'single'" :class="entryMode === 'single' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'" class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm">Single Entry</button>
                <button @click="entryMode = 'bulk'" :class="entryMode === 'bulk' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'" class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm">Bulk CSV Entry</button>
             </div>
          </div>

          <!-- Single -->
          <form v-if="entryMode === 'single'" @submit.prevent="saveEntry" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label class="block text-xs font-medium text-gray-700">KPI</label>
              <select v-model="entryForm.kpiId" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border">
                <option v-for="def in kpiDefs" :key="def.id" :value="def.id">{{ def.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Date</label>
              <input v-model="entryForm.date" type="date" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Value</label>
              <input v-model="entryForm.value" type="number" step="0.01" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border">
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full md:w-auto h-10">Add Entry</button>
          </form>

          <!-- Bulk -->
          <div v-else>
             <label class="block text-xs font-medium text-gray-700 mb-1">KPI Type</label>
             <select v-model="bulkForm.kpiId" required class="block w-full md:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border mb-4">
                <option v-for="def in kpiDefs" :key="def.id" :value="def.id">{{ def.name }}</option>
             </select>
             <label class="block text-xs font-medium text-gray-700 mb-1">Paste CSV Data (date,value per line)</label>
             <textarea v-model="bulkForm.csv" rows="5" placeholder="2023-10-01,150.5&#10;2023-10-02,160.0" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border mb-4 font-mono text-xs"></textarea>
             <button @click="processBulk" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Process Bulk Data</button>
             <p v-if="bulkMsg" class="mt-2 text-sm text-green-600">{{ bulkMsg }}</p>
          </div>

          <div v-if="!appStore.isOnline" class="mt-4 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            You are offline. Entries will be queued and marked with a pending badge until reconnected.
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { API_BASE_URL } from '../config';
import AppSidebar from '../components/layout/AppSidebar.vue';
import type { KPIDefinition } from '../../../shared/types/index';

const appStore = useAppStore();

const kpiDefs = ref<KPIDefinition[]>([]);
const showDefForm = ref(false);
const defForm = ref({ name: '', unit: '', targetValue: '' });

const entryMode = ref('single');
const entryForm = ref({ kpiId: '', date: new Date().toISOString().split('T')[0], value: '' });
const bulkForm = ref({ kpiId: '', csv: '' });
const bulkMsg = ref('');

const getHeaders = () => {
   return { 'Authorization': `Bearer ${appStore.user?.token}` };
};

const loadDefs = async () => {
  try {
    const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
    const res = await fetch(`${API_BASE_URL}/api/kpis?workspaceId=${wsId}`, { headers: getHeaders() });
    if (res.ok) kpiDefs.value = await res.json();
  } catch (e) {
    // Expected in offline mode
  }
};

const saveKpiDef = async () => {
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  const payload = { ...defForm.value, targetValue: Number(defForm.value.targetValue), workspaceId: wsId };
  if (appStore.isOnline) {
    await fetch(`${API_BASE_URL}/api/kpis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(payload)
    });
    showDefForm.value = false;
    defForm.value = { name: '', unit: '', targetValue: '' };
    loadDefs();
  } else {
    alert("Must be online to create KPI definitions.");
  }
};

const deleteKpiDef = async (id: string) => {
  if (!appStore.isOnline) return alert("Must be online to delete.");
  if (confirm("Delete this KPI definition?")) {
    await fetch(`${API_BASE_URL}/api/kpis/${id}`, { method: 'DELETE', headers: getHeaders() });
    loadDefs();
  }
};

const saveEntry = async () => {
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  const payload = {
    kpiId: entryForm.value.kpiId,
    date: entryForm.value.date,
    value: Number(entryForm.value.value),
    workspaceId: wsId
  };

  if (!appStore.isOnline) {
    await appStore.addToOfflineQueue({ type: 'CREATE_KPI', payload });
    alert("Entry queued for offline sync.");
  } else {
    await fetch(`${API_BASE_URL}/api/kpis/${payload.kpiId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(payload)
    });
    alert("Entry saved.");
  }
  entryForm.value.value = '';
};

const processBulk = async () => {
  if (!bulkForm.value.kpiId || !bulkForm.value.csv) return;
  const lines = bulkForm.value.csv.split('\n').map(l => l.trim()).filter(Boolean);
  let successCount = 0;

  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;

  for (const line of lines) {
    const [date, valStr] = line.split(',');
    if (!date || !valStr || isNaN(Number(valStr))) continue;

    const payload = { kpiId: bulkForm.value.kpiId, date, value: Number(valStr), workspaceId: wsId };

    if (!appStore.isOnline) {
      await appStore.addToOfflineQueue({ type: 'CREATE_KPI', payload });
      successCount++;
    } else {
      try {
        await fetch(`${API_BASE_URL}/api/kpis/${payload.kpiId}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders() },
          body: JSON.stringify(payload)
        });
        successCount++;
      } catch (e) {}
    }
  }
  bulkMsg.value = `Processed ${successCount} entries.`;
  bulkForm.value.csv = '';
  setTimeout(() => bulkMsg.value = '', 3000);
};

onMounted(() => {
  loadDefs();
});
</script>
