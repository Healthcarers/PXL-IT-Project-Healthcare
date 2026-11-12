import { createApp } from 'vue'
import { createPinia } from "pinia";
import App from './App.vue'
import router from './router'
import './tailwind.css'
import "./style.css";


const app = createApp(App);

createApp(App).mount('#app')

app.use(createPinia())
app.use(router)

app.mount('#app')