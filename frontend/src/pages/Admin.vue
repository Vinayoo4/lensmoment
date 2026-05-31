<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-gray-900">Admin Inspector</h1>
          <div class="space-x-2">
            <button @click="exportData" class="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 text-sm font-medium">Export Full JSON</button>
            <button @click="reseed" class="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 text-sm font-medium">Reset & Re-seed</button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
           <!-- Tabs -->
           <div class="border-b border-gray-200 bg-gray-50 flex overflow-x-auto">
             <button v-for="tab in tabs" :key="tab" @click="activeTab = tab" :class="activeTab === tab ? 'border-b-2 border-indigo-500 text-indigo-600 bg-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'" class="px-6 py-3 font-medium text-sm whitespace-nowrap outline-none">
               {{ tab }}
             </button>
           </div>

           <!-- Content -->
           <div class="p-0">
             <div class="overflow-x-auto max-h-[60vh]">
               <table class="min-w-full divide-y divide-gray-200">
                 <thead class="bg-gray-50 sticky top-0 z-10">
                   <tr>
                     <th v-for="col in columns" :key="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ col }}</th>
                   </tr>
                 </thead>
                 <tbody class="bg-white divide-y divide-gray-200 text-sm">
                   <tr v-for="(item, idx) in currentData" :key="idx" class="hover:bg-gray-50">
                     <td v-for="col in columns" :key="col" class="px-6 py-4 whitespace-nowrap text-gray-700">
                       <span v-if="typeof item[col] === 'object'" class="font-mono text-xs">{{ JSON.stringify(item[col]).slice(0, 30) }}...</span>
                       <span v-else>{{ item[col] }}</span>
                     </td>
                   </tr>
                 </tbody>
               </table>
               <div v-if="currentData.length === 0" class="p-8 text-center text-gray-500">No data available for {{ activeTab }}.</div>
             </div>
           </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { API_BASE_URL } from '../config';
import AppSidebar from '../components/layout/AppSidebar.vue';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();

const tabs = ['Workspaces', 'KPIs', 'Transactions', 'Suggestions', 'Reports', 'Audit Log'];
const activeTab = ref('Workspaces');

const db = ref({
  Workspaces: [],
  KPIs: [],
  Transactions: [],
  Suggestions: [],
  Reports: [],
  'Audit Log': []
});

const getHeaders = () => {
   return { 'Authorization': `Bearer ${appStore.user?.token}` };
};

const loadAdminData = async () => {
  try {
     const [ws, kpis, txs, sugs, reps, aud] = await Promise.all([
       fetch(`${API_BASE_URL}/api/workspaces`, { headers: getHeaders() }),
       fetch(`${API_BASE_URL}/api/kpis`, { headers: getHeaders() }),
       fetch(`${API_BASE_URL}/api/transactions`, { headers: getHeaders() }),
       fetch(`${API_BASE_URL}/api/suggestions`, { headers: getHeaders() }),
       fetch(`${API_BASE_URL}/api/reports`, { headers: getHeaders() }),
       fetch(`${API_BASE_URL}/api/audit`, { headers: getHeaders() })
     ]);

     if(ws.ok) db.value.Workspaces = await ws.json();
     if(kpis.ok) db.value.KPIs = await kpis.json();
     if(txs.ok) db.value.Transactions = await txs.json();
     if(sugs.ok) db.value.Suggestions = await sugs.json();
     if(reps.ok) db.value.Reports = await reps.json();
     if(aud.ok) db.value['Audit Log'] = await aud.json();
  } catch(e) {
     console.error('Failed to load admin data');
  }
};

const currentData = computed(() => db.value[activeTab.value as keyof typeof db.value] || []);

const columns = computed(() => {
  if (currentData.value.length === 0) return [];
  return Object.keys(currentData.value[0]).filter(k => k !== 'passwordHash');
});

const exportData = () => {
  const blob = new Blob([JSON.stringify(db.value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quantify_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const reseed = () => {
  if (confirm('WARNING: This will wipe all current data and reseed the database. Proceed?')) {
    alert("In a real app, this would hit POST /api/admin/reseed. For MVP, please delete backend/data/meta.json and restart the server.");
  }
};

onMounted(() => {
  loadAdminData();
});
</script>
