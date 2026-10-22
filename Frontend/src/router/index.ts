import {createRouter, createWebHistory} from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/cursist',
            name: 'cursist-dashboard',
            component: () => import('../views/CursistDashboard.vue'),
        },
    ]
});

export default router;
