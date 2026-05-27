import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import router from './router';
import './style.css';

registerSW({ immediate: true });

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
