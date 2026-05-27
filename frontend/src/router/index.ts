import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../pages/Dashboard.vue';
import Login from '../pages/Login.vue';
import { useAppStore } from '../stores/app';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Login',
      component: Login,
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const appStore = useAppStore();
  appStore.loadUser(); // Ensure user state is loaded

  if (to.meta.requiresAuth && !appStore.user) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && appStore.user) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;
