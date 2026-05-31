<template>
  <div v-if="needRefresh" class="fixed top-0 left-0 right-0 bg-indigo-600 text-white px-4 py-3 shadow-md z-50 flex items-center justify-between">
    <div class="flex items-center">
      <span class="flex p-2 rounded-lg bg-indigo-800">
        <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <p class="ml-3 font-medium truncate">
        <span class="md:hidden">Update available!</span>
        <span class="hidden md:inline">A new version of Quantify AI is available.</span>
      </p>
    </div>
    <div class="flex-shrink-0 flex space-x-2">
      <button @click="() => updateServiceWorker(true)" class="bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-md text-sm font-medium">
        Refresh
      </button>
      <button @click="close" class="text-white hover:text-indigo-200 px-3 py-2 rounded-md text-sm font-medium">
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) {
    console.log('SW Registered:', r);
  },
  onRegisterError(error) {
    console.log('SW registration error', error);
  },
});

const close = () => {
  needRefresh.value = false;
};
</script>
