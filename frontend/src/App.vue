<template>
  <div class="app-wrapper">
    <UpdateBanner />
    <InstallPrompt />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import UpdateBanner from './components/pwa/UpdateBanner.vue';
import InstallPrompt from './components/pwa/InstallPrompt.vue';
import { useAppStore } from './stores/app';

const appStore = useAppStore();

onMounted(() => {
  appStore.initNetworkListeners();
  appStore.loadQueue();
});
</script>
