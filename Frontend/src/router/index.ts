import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CreateRoomView from '../views/CreateRoomView.vue'
import RoomView from '../views/RoomView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/rooms/new',
      name: 'create-room',
      component: CreateRoomView,
    },
    {
      path: '/rooms/:code',
      name: 'room',
      component: RoomView,
      props: true,
    },
  ],
})

export default router