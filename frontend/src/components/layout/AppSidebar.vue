<template>
  <aside class="bg-gray-900 text-white w-64 min-h-screen flex-shrink-0 hidden md:flex md:flex-col">
    <div class="p-4 bg-gray-900 border-b border-gray-800">
      <h2 class="text-xl font-bold truncate">{{ appStore.user?.workspaceId === 'w_all' ? 'All Workspaces' : 'Quantify AI' }}</h2>
      <div class="flex items-center mt-2 space-x-2">
        <span class="w-3 h-3 rounded-full" :class="appStore.isOnline ? 'bg-green-500' : 'bg-red-500'"></span>
        <span class="text-sm text-gray-400">{{ appStore.isOnline ? 'Online' : 'Offline' }}</span>
        <span v-if="appStore.offlineQueue.length" class="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-auto">
          {{ appStore.offlineQueue.length }}
        </span>
      </div>
    </div>

    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <router-link to="/dashboard" class="block px-3 py-2 rounded-md text-base font-medium" active-class="bg-gray-800 text-white" :class="$route.name === 'Dashboard' ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'">
        Dashboard
      </router-link>
      <router-link v-if="canManage" to="/kpis" class="block px-3 py-2 rounded-md text-base font-medium" active-class="bg-gray-800 text-white" :class="$route.name === 'KpiManager' ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'">
        KPIs
      </router-link>
      <router-link v-if="canManage" to="/transactions" class="block px-3 py-2 rounded-md text-base font-medium" active-class="bg-gray-800 text-white" :class="$route.name === 'Transactions' ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'">
        Transactions
      </router-link>
      <router-link v-if="canManage" to="/reconciliation" class="block px-3 py-2 rounded-md text-base font-medium" active-class="bg-gray-800 text-white" :class="$route.name === 'Reconciliation' ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'">
        Reconciliation
      </router-link>
      <router-link to="/reports" class="block px-3 py-2 rounded-md text-base font-medium" active-class="bg-gray-800 text-white" :class="$route.name === 'Reports' ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'">
        Reports
      </router-link>
      <router-link v-if="isAdmin" to="/admin" class="block px-3 py-2 rounded-md text-base font-medium" active-class="bg-gray-800 text-white" :class="$route.name === 'Admin' ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'">
        Admin
      </router-link>
    </nav>

    <div class="p-4 bg-gray-900 border-t border-gray-800">
      <div class="flex items-center">
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-white truncate">{{ appStore.user?.name }}</p>
          <p class="text-xs font-medium text-gray-400 truncate">{{ appStore.user?.role }}</p>
        </div>
        <button @click="logout" class="ml-auto flex-shrink-0 text-gray-400 hover:text-white">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile nav -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-40">
    <router-link to="/dashboard" class="flex flex-col items-center text-gray-500" active-class="text-indigo-600">
      <span class="text-xs mt-1">Dash</span>
    </router-link>
    <router-link v-if="canManage" to="/kpis" class="flex flex-col items-center text-gray-500" active-class="text-indigo-600">
      <span class="text-xs mt-1">KPIs</span>
    </router-link>
    <router-link v-if="canManage" to="/transactions" class="flex flex-col items-center text-gray-500" active-class="text-indigo-600">
      <span class="text-xs mt-1">Txns</span>
    </router-link>
    <router-link to="/reports" class="flex flex-col items-center text-gray-500" active-class="text-indigo-600">
      <span class="text-xs mt-1">Reports</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
const router = useRouter();

const canManage = computed(() => {
  return ['Workspace Admin', 'Financial Manager', 'superadmin'].includes(appStore.user?.role || '');
});

const isAdmin = computed(() => {
  return appStore.user?.role === 'superadmin';
});

const logout = () => {
  appStore.setUser(null);
  router.push('/');
};
</script>
