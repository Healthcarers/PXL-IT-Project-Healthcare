
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/Authstore.ts'
import HomeView from '../views/HomeView.vue'
import CreateRoomView from '../views/CreateRoomView.vue'
import RoomView from '../views/RoomView.vue'
import HostDashboardView from '../views/HostDashboardView.vue'
import RegistrationView from '../views/registration/RegistrationView.vue'
import LoginView from '../views/login/LoginView.vue'
import MonitorView from '../views/MonitorView.vue'
import DashboardView from '../views/DashboardView.vue'
import UnauthorizedView from '../views/UnauthorizedView.vue'
import AdminDashboardView from "../views/admin/AdminDashboardView.vue";
import type { Person } from "../models/Person.ts";
import CursistDashboard from "../views/CursistDashboard.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true, role: 'CURSIST' },
    },
    {
      path: '/registration',
      name: 'registration',
      component: RegistrationView,
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/rooms/new',
      name: 'create-room',
      component: CreateRoomView,
      meta: { requiresAuth: true, role: 'LECTOR' },
    },
    {
      path: '/rooms/:code',
      name: 'room',
      component: RoomView,
      props: true,
      meta: { requiresAuth: true, role: 'CURSIST' },
    },
    {
      path: "/monitor",
      name: "monitor",
      component: CursistDashboard,
      meta: { requiresAuth: true, role: "CURSIST" },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, role: 'LECTOR' },
    },
    {
      path: '/host/rooms/:code',
      name: 'host-dashboard',
      component: HostDashboardView,
      props: true,
      meta: { requiresAuth: true, role: 'LECTOR' },
    },
    {
      path: "/admin",
      name: "admin",
      component: AdminDashboardView,
      meta: { requiresAuth: true, role: "ADMIN" },
    },
    {
      path: "/unauthorized",
      name: "unauthorized",
      component: UnauthorizedView,
      meta: { requiresAuth: false },
    },
  ],
})

router.beforeEach(async (to) => {
  const store = useAuthStore()

  let person

  try {
    person = await store.isAuthenticated()
  } catch {
    if (to.meta.requiresAuth) {
      return { name: 'login' }
    }

    return true
  }

  // Ingelogde gebruikers mogen niet terug naar login of registratie.
  if (to.meta.guestOnly) {
    return person.role === 'LECTOR'
      ? { name: 'create-room' }
      : { name: 'home' }
  }

  // Startpagina: cursist krijgt Join Room, lector krijgt Create Room.
  if (to.name === 'home') {
    return person.role === 'LECTOR'
      ? { name: 'create-room' }
      : true
  }

  // Controleer de vereiste gebruikersrol.
  if (to.meta.role && to.meta.role !== person.role) {
    return { name: 'unauthorized' }
  }

  return true
})

export default router
