import { createRouter, createWebHistory } from "vue-router";
import RegistrationView from "../views/registration/RegistrationView.vue";
import LoginView from "../views/login/LoginView.vue";
import { useAuthStore } from "../stores/Authstore.ts";
import DashboardView from "../views/DashboardView.vue";
import type { Person } from "../models/Person.ts";
import UnauthorizedView from "../views/UnauthorizedView.vue";
import CursistDashboard from "../views/CursistDashboard.vue";

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
      component: CursistDashboard,
      meta: { requiresAuth: true, role: "CURSIST" },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardView,
      meta: { requiresAuth: true, role: "LECTOR" },
    },
    {
      path: "/unauthorized",
      name: "unauthorized",
      component: UnauthorizedView,
      meta: { requiresAuth: false },
    },
  ],
});

router.beforeEach(async (to) => {
  const store = useAuthStore();

  if (!to.meta.requiresAuth) {
    return true;
  }

  try {
    const person: Person = await store.isAuthenticated();

    if (to.meta.role && to.meta.role !== person.role) {
      return { name: "unauthorized" };
    }

    return true;
  } catch (err) {
    return { name: "login" };
  }
});

export default router;
