<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />

    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top header for mobile -->
      <header class="md:hidden bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-30">
        <h1 class="text-xl font-bold">Quantify AI</h1>
        <div class="flex items-center space-x-2">
           <span class="w-3 h-3 rounded-full" :class="appStore.isOnline ? 'bg-green-400' : 'bg-red-400'"></span>
           <button @click="logout" class="text-sm bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-800">Logout</button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        <div class="max-w-7xl mx-auto space-y-6">

          <!-- Loading & Error -->
          <div v-if="loading" class="animate-pulse space-y-4">
             <div class="h-8 bg-gray-200 rounded w-1/4"></div>
             <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div v-for="i in 3" :key="i" class="h-32 bg-gray-200 rounded"></div>
             </div>
          </div>

          <div v-else-if="error" class="bg-red-50 text-red-700 p-4 rounded-md">
            {{ error }}
          </div>

          <template v-else>
            <!-- Stats Bar -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div class="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Total KPIs Tracked</p>
                <p class="text-2xl font-bold text-gray-900">{{ uniqueKpisCount }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Unreconciled Transactions</p>
                <p class="text-2xl font-bold text-gray-900">{{ unreconciledTxCount }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Pending Suggestions</p>
                <p class="text-2xl font-bold text-gray-900">{{ data.suggestions.length }}</p>
              </div>
            </div>

            <!-- Date Range Selector -->
            <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900">KPI Performance</h2>
              <select v-model="dateRange" class="block rounded-md border-gray-300 shadow-sm py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            <!-- KPI Cards with Sparklines -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="summary in kpiSummaries" :key="summary.id" class="bg-white p-5 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-start">
                    <h3 class="text-sm font-medium text-gray-500 truncate">{{ summary.name }}</h3>
                    <span :class="summary.trend > 0 ? 'text-green-600' : (summary.trend < 0 ? 'text-red-600' : 'text-gray-500')" class="flex items-center text-sm font-semibold">
                      <svg v-if="summary.trend > 0" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      <svg v-else-if="summary.trend < 0" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      <span v-else class="mr-1">-</span>
                      {{ Math.abs(summary.trendPercent).toFixed(1) }}%
                    </span>
                  </div>
                  <p class="mt-2 text-3xl font-extrabold text-gray-900">{{ summary.latestValue }} <span class="text-sm font-normal text-gray-500">{{ summary.unit }}</span></p>
                </div>

                <!-- SVG Sparkline (pure logic) -->
                <div class="mt-4 h-10 w-full overflow-hidden">
                   <svg viewBox="0 0 100 40" class="w-full h-full" preserveAspectRatio="none">
                     <polyline :points="getSparklinePoints(summary.recentValues)" fill="none" :stroke="summary.trend >= 0 ? '#10B981' : '#EF4444'" stroke-width="2" vector-effect="non-scaling-stroke" />
                   </svg>
                </div>
              </div>
            </div>

            <!-- AI Suggestions Panel -->
            <section v-if="data.suggestions.length" class="bg-yellow-50 p-5 rounded-lg shadow border border-yellow-200 mt-6">
              <h2 class="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                AI Insights & Action Items
              </h2>
              <ul class="space-y-3">
                <li v-for="sug in data.suggestions" :key="sug.id" class="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-yellow-100">
                  <span class="text-gray-800 text-sm font-medium">{{ sug.text }}</span>
                  <div class="flex space-x-2 flex-shrink-0 ml-4">
                    <button @click="updateSuggestion(sug.id, 'done')" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 font-medium">Mark Done</button>
                    <button @click="updateSuggestion(sug.id, 'dismissed')" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 font-medium">Dismiss</button>
                  </div>
                </li>
              </ul>
            </section>

            <p class="text-xs text-gray-400 text-right mt-8">Last synced: {{ lastSynced }}</p>

          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app';
import { API_BASE_URL } from '../config';
import AppSidebar from '../components/layout/AppSidebar.vue';
import type { KPIEntry, Transaction, AISuggestion, KPIDefinition } from '../../../shared/types/index';

const appStore = useAppStore();
const router = useRouter();

const data = ref({
  kpis: [] as KPIEntry[],
  transactions: [] as Transaction[],
  suggestions: [] as AISuggestion[],
  kpiDefs: [] as KPIDefinition[]
});

const loading = ref(true);
const error = ref('');
const dateRange = ref('30');
const lastSynced = ref('');

const getHeaders = () => {
   return { 'Authorization': `Bearer ${appStore.user?.token}` };
};

const loadDashboard = async () => {
  if (!appStore.user) return;
  loading.value = true;
  error.value = '';

  try {
    const wsId = appStore.user.workspaceId;

    const [dashRes, defRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/dashboard?workspaceId=${wsId === 'w_all' ? 'w_01' : wsId}`, { headers: getHeaders() }),
      fetch(`${API_BASE_URL}/api/kpis?workspaceId=${wsId === 'w_all' ? 'w_01' : wsId}`, { headers: getHeaders() })
    ]);

    if (!dashRes.ok || !defRes.ok) throw new Error('Failed to fetch');

    const dashData = await dashRes.json();
    data.value.kpiDefs = await defRes.json();
    data.value.kpis = dashData.kpis;
    data.value.transactions = dashData.transactions;
    data.value.suggestions = dashData.suggestions;

    lastSynced.value = new Date().toLocaleTimeString();
  } catch (e) {
    if (!appStore.isOnline) {
       error.value = 'Offline mode: Showing cached data from local store if available.';
    } else {
       error.value = 'Failed to load dashboard data.';
    }
  } finally {
    loading.value = false;
  }
};

const uniqueKpisCount = computed(() => {
  return new Set(data.value.kpis.map(k => k.kpiId)).size;
});

const unreconciledTxCount = computed(() => {
  return data.value.transactions.filter(t => t.status === 'unreconciled').length;
});

const kpiSummaries = computed(() => {
  const range = parseInt(dateRange.value, 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - range);

  const summaries: { id: string; name: string; unit: string; latestValue: number; trend: number; trendPercent: number; recentValues: number[] }[] = [];

  data.value.kpiDefs.forEach(def => {
    let entries = data.value.kpis.filter(k => k.kpiId === def.id && new Date(k.date) >= cutoffDate);
    entries = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (entries.length === 0) return;

    const latestValue = entries[entries.length - 1].value;
    const previousValue = entries.length > 1 ? entries[entries.length - 2].value : latestValue;
    const trend = latestValue - previousValue;
    const trendPercent = previousValue !== 0 ? (trend / previousValue) * 100 : 0;

    const recentValues = entries.slice(-7).map(e => e.value);

    summaries.push({
      id: def.id,
      name: def.name,
      unit: def.unit,
      latestValue,
      trend,
      trendPercent,
      recentValues
    });
  });

  return summaries;
});

const getSparklinePoints = (values: number[]) => {
  if (values.length < 2) return "0,20 100,20";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((val, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 40 - (((val - min) / range) * 40);
    return `${x},${y}`;
  }).join(' ');
};

const updateSuggestion = async (id: string, status: string) => {
  const idx = data.value.suggestions.findIndex(s => s.id === id);
  if (idx !== -1) {
    data.value.suggestions.splice(idx, 1);
  }

  if (appStore.isOnline) {
    try {
      await fetch(`${API_BASE_URL}/api/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status })
      });
    } catch(e) {
      // Expected in offline mode
    }
  }
};

const logout = () => {
  appStore.setUser(null);
  router.push('/');
};

watch(() => appStore.isOnline, (newVal) => {
  if (newVal) loadDashboard();
});

onMounted(() => {
  loadDashboard();
});
</script>
