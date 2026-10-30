import { createRouter, createWebHistory } from "vue-router";
import RegistrationView from "../views/registration/RegistrationView.vue";
import LoginView from "../views/LoginView.vue";
import CursistDashboard from "../views/CursistDashboard.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: "/registration",
      name: "registration",
      component: RegistrationView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
        path: '/cursist',
        name: 'cursist-dashboard',
        component: CursistDashboard,
    },
  ],
});

export default router;
