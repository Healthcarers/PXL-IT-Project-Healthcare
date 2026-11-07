import { createRouter, createWebHistory } from "vue-router";
import RegistrationView from "../views/registration/RegistrationView.vue";
import LoginView from "../views/login/LoginView.vue";
import MonitorView from "../views/MonitorView.vue";
import { useAuthStore } from "../stores/Authstore.ts";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: "/registration",
      name: "registration",
      component: RegistrationView,
      meta: { requiresAuth: false },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: "/monitor",
      name: "monitor",
      component: MonitorView,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const store = useAuthStore();
  if (!to.meta.requiresAuth) {
    return true;
  }
  try {
    await store.isAuthenticated();
    return true;
  } catch (err) {
    return { name: "login" };
  }
});

export default router;
