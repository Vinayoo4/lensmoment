<template>
  <div class="app-wrapper">
    <UpdateBanner />
    <InstallPrompt />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import UpdateBanner from './components/pwa/UpdateBanner.vue';
import InstallPrompt from './components/pwa/InstallPrompt.vue';
</script>
