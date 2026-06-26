<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div class="max-w-4xl mx-auto space-y-6">
        <h1 class="text-2xl font-bold text-gray-900">Financial Reports</h1>

        <!-- Generate Section (Admin/Manager only) -->
        <section v-if="canGenerate" class="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h2>
          <form @submit.prevent="generateReport" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
             <div>
                <label class="block text-sm font-medium text-gray-700">Report Month</label>
                <input v-model="form.month" type="month" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-white border focus:ring-indigo-500 focus:border-indigo-500">
             </div>
             <div>
                <label class="block text-sm font-medium text-gray-700">Report Title</label>
                <input v-model="form.title" type="text" placeholder="e.g. Oct 2023 Summary" required class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-white border focus:ring-indigo-500 focus:border-indigo-500">
             </div>
             <button type="submit" :disabled="isGenerating" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full h-[42px] disabled:bg-indigo-400">
                {{ isGenerating ? 'Computing...' : 'Generate' }}
             </button>
          </form>
        </section>

        <!-- Reports List -->
        <section class="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Reports</h2>
          <div v-if="loading" class="animate-pulse space-y-4">
             <div v-for="i in 3" :key="i" class="h-16 bg-gray-100 rounded"></div>
          </div>
          <div v-else-if="reports.length === 0" class="text-center py-8 text-gray-500">
             No reports generated yet.
          </div>
          <div v-else class="space-y-4">
             <div v-for="report in reports" :key="report.id" class="border border-gray-200 rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-50">
                <div>
                   <h3 class="font-bold text-gray-900">{{ report.title }}</h3>
                   <p class="text-xs text-gray-500 mt-1">Generated: {{ new Date(report.createdAt).toLocaleDateString() }}</p>
                </div>
                <div class="mt-3 md:mt-0 space-x-2">
                   <button @click="viewReport(report)" class="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-200">View</button>
                   <button @click="exportReport(report)" class="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded border border-indigo-200 hover:bg-indigo-100">Export .txt</button>
                </div>
             </div>
          </div>
        </section>

        <!-- View Modal -->
        <div v-if="activeReport" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
           <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                 <h3 class="text-xl font-bold">{{ activeReport.title }}</h3>
                 <button @click="activeReport = null" class="text-gray-400 hover:text-gray-600">
                   <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div class="p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-gray-50 text-gray-800">
{{ activeReport.content }}
              </div>
              <div class="p-4 border-t border-gray-200 flex justify-end space-x-3">
                 <button @click="activeReport = null" class="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">Close</button>
                 <button @click="exportReport(activeReport)" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Export as .txt</button>
              </div>
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
import type { Report, Transaction } from '../../../shared/types/index';

const appStore = useAppStore();

const reports = ref<Report[]>([]);
const loading = ref(true);
const isGenerating = ref(false);

const form = ref({ month: '', title: '' });
const activeReport = ref<Report | null>(null);

const canGenerate = computed(() => {
  return ['Workspace Admin', 'Financial Manager', 'superadmin'].includes(appStore.user?.role || '');
});

const getHeaders = () => {
   return { 'Authorization': `Bearer ${appStore.user?.token}` };
};

const loadReports = async () => {
  loading.value = true;
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports?workspaceId=${wsId}`, { headers: getHeaders() });
    if (res.ok) {
      reports.value = await res.json();
      reports.value.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (e) {
    console.warn("Offline");
  } finally {
    loading.value = false;
  }
};

const generateReport = async () => {
  isGenerating.value = true;
  const wsId = appStore.user?.workspaceId === 'w_all' ? 'w_01' : appStore.user?.workspaceId;

  try {
    const txRes = await fetch(`${API_BASE_URL}/api/transactions?workspaceId=${wsId}`, { headers: getHeaders() });
    const transactions = await txRes.json();

    const [year, month] = form.value.month.split('-');
    const filteredTx = transactions.filter((t: Transaction) => t.date.startsWith(`${year}-${month}`));

    const totalIncome = filteredTx.filter((t: Transaction) => t.amount > 0).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const totalExpenses = filteredTx.filter((t: Transaction) => t.amount < 0).reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);
    const netPosition = totalIncome - totalExpenses;
    const unreconciled = filteredTx.filter((t: Transaction) => t.status === 'unreconciled').length;

    const content = `QUANTIFY AI - FINANCIAL REPORT
==============================
Workspace: ${wsId}
Period:    ${form.value.month}
Generated: ${new Date().toISOString()}
------------------------------

SUMMARY
-------
Total Income:    ₹${totalIncome.toLocaleString()}
Total Expenses:  ₹${totalExpenses.toLocaleString()}
Net Position:    ₹${netPosition.toLocaleString()}

STATUS
------
Transactions:    ${filteredTx.length}
Unreconciled:    ${unreconciled}

TOP TRANSACTIONS
----------------
${filteredTx.slice(0, 5).map((t: Transaction) => `${t.date} | ${t.description.padEnd(20)} | ₹${t.amount}`).join('\n')}

==============================
End of Report
`;

    await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({
         workspaceId: wsId,
         title: form.value.title,
         content
      })
    });

    form.value.title = '';
    form.value.month = '';
    loadReports();
  } catch (e) {
    alert("Error generating report. Check connection.");
  } finally {
    isGenerating.value = false;
  }
};

const viewReport = (report: Report) => {
  activeReport.value = report;
};

const exportReport = (report: Report) => {
  const blob = new Blob([report.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title.replace(/\s+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

onMounted(() => {
  loadReports();
});
</script>
