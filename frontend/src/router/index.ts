import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../pages/Dashboard.vue';
import Login from '../pages/Login.vue';
import Admin from '../pages/Admin.vue';
import KpiManager from '../pages/KpiManager.vue';
import Reconciliation from '../pages/Reconciliation.vue';
import Reports from '../pages/Reports.vue';
import Transactions from '../pages/Transactions.vue';
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
    {
      path: '/admin',
      name: 'Admin',
      component: Admin,
      meta: { requiresAuth: true }
    },
    {
      path: '/kpis',
      name: 'KpiManager',
      component: KpiManager,
      meta: { requiresAuth: true }
    },
    {
      path: '/reconciliation',
      name: 'Reconciliation',
      component: Reconciliation,
      meta: { requiresAuth: true }
    },
    {
      path: '/reports',
      name: 'Reports',
      component: Reports,
      meta: { requiresAuth: true }
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: Transactions,
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'Dashboard' }
    }
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
