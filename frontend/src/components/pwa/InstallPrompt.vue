<template>
  <div v-if="showPrompt" class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 flex items-center justify-between">
    <div>
      <h3 class="font-bold text-gray-900">Install Quantify AI</h3>
      <p class="text-sm text-gray-600">Install our app for offline access and a better experience.</p>
    </div>
    <div class="flex items-center space-x-2">
      <button @click="dismiss" class="text-gray-400 hover:text-gray-600">
        <span class="sr-only">Dismiss</span>
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button @click="install" class="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Install
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const showPrompt = ref(false);
let deferredPrompt: any = null;

const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault();
  deferredPrompt = e;
  showPrompt.value = true;
};

const install = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
  }
  deferredPrompt = null;
  showPrompt.value = false;
};

const dismiss = () => {
  showPrompt.value = false;
  deferredPrompt = null;
};

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});
</script>
