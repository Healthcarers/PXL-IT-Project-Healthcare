import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from "../stores/Authstore.ts";
import type { Person } from "../models/Person.ts";
import HomeView from '../views/HomeView.vue'
import CreateRoomView from '../views/CreateRoomView.vue'
import RoomView from '../views/RoomView.vue'
import HostDashboardView from '../views/HostDashboardView.vue'
import RegistrationView from "../views/registration/RegistrationView.vue";
import LoginView from "../views/login/LoginView.vue";
import MonitorView from "../views/MonitorView.vue";
import DashboardView from "../views/DashboardView.vue";
import UnauthorizedView from "../views/UnauthorizedView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
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
      path: '/rooms/new',
      name: 'create-room',
      component: CreateRoomView,
    },
    {
      path: "/monitor",
      name: "monitor",
      component: MonitorView,
      meta: { requiresAuth: true, role: "CURSIST" },
    },
    {
      path: '/rooms/:code',
      name: 'room',
      component: RoomView,
      props: true,
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardView,
      meta: { requiresAuth: true, role: "LECTOR" },
    },
    {
      path: '/host/rooms/:code',
      name: 'host-dashboard',
      component: HostDashboardView,
      props: true,
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

export default router
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
