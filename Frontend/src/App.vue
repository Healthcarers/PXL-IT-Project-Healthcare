
<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useAuthStore } from "./stores/Authstore";

const route = useRoute();
const auth = useAuthStore();
const showLectorNav = computed(() => auth.person?.role === 'LECTOR' && route.meta.role === 'LECTOR');
const showCursistNav = computed(() => auth.person?.role === 'CURSIST' && route.meta.role === 'CURSIST');
</script>

<template>
  <div :class="showCursistNav ? 'grid min-h-dvh grid-rows-[auto_1fr]' : 'contents'">
    <header v-if="showLectorNav || showCursistNav" class="bg-pxl-black text-pxl-white">
      <div class="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 sm:px-8
        md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <RouterLink :to="{ name: showLectorNav ? 'create-room' : 'home' }"
          class="flex items-center gap-3 justify-self-start py-4 text-xs lg:text-sm">
          <img src="./assets/pxl_logo.png" alt="PXL" class="h-6 w-auto object-contain" />
          <span class="border-l border-pxl-gold pl-3">Virtuele monitor-defibrillator</span>
        </RouterLink>
        <nav :aria-label="showLectorNav ? 'Lectornavigatie' : 'Cursistnavigatie'"
          class="order-last col-span-2 flex justify-center gap-1 md:order-none md:col-span-1">
          <template v-if="showLectorNav">
            <RouterLink :to="{ name: 'create-room' }" class="app-nav-link">Room aanmaken</RouterLink>
            <RouterLink :to="{ name: 'scenarios' }" class="app-nav-link"
              :class="{ 'app-nav-link-active': route.matched.some(record => record.path === '/scenarios') }">Scenario's</RouterLink>
          </template>
          <RouterLink v-else :to="{ name: 'home' }" class="app-nav-link">Room joinen</RouterLink>
        </nav>
        <span class="justify-self-end rounded-full border border-pxl-gold px-3 py-1 text-xs">
          {{ showLectorNav ? 'Lector' : 'Cursist' }}
        </span>
      </div>
    </header>
    <RouterView />
  </div>
</template>

<style>
html,
body,
#app {
  margin: 0;
  min-height: 100%;
}

body {
  min-width: 320px;
}

.app-nav-link {
  padding: 1rem;
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
}

.app-nav-link:hover,
.app-nav-link-active,
.app-nav-link[aria-current="page"] {
  border-color: var(--color-pxl-gold);
}
</style>
