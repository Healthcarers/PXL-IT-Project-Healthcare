
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import LectorConfirmModal from "./components/lector/LectorConfirmModal.vue";
import { useAuthStore } from "./stores/Authstore";

const route = useRoute();
const auth = useAuthStore();
const showLectorNav = computed(() => auth.person?.role === 'LECTOR' && route.meta.role === 'LECTOR');
const isLectorDashboard = computed(() => showLectorNav.value && route.name === 'lector-dashboard');
const showCursistNav = computed(() => auth.person?.role === 'CURSIST' && route.meta.role === 'CURSIST');
const profileOpen = ref(false);
const profileMenuRef = ref<HTMLElement | null>(null);
const profileButton = ref<HTMLButtonElement | null>(null);
const logoutModalOpen = ref(false);
const logoutNotice = ref('');

function requestLogout() {
  profileOpen.value = false;
  logoutModalOpen.value = true;
}

function confirmLogout() {
  logoutModalOpen.value = false;
  logoutNotice.value = "Uitlogfunctionaliteit wordt gekoppeld zodra de logout-branch is gemerged.";
}

function handleDocumentClick(event: MouseEvent) {
  if (event.target instanceof Node && !profileMenuRef.value?.contains(event.target)) {
    profileOpen.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && profileOpen.value) {
    profileOpen.value = false;
    profileButton.value?.focus();
  }
}

watch(() => route.fullPath, () => {
  profileOpen.value = false;
  logoutModalOpen.value = false;
  logoutNotice.value = '';
});

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);
});
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);
});
</script>

<template>
  <div :class="showCursistNav ? 'grid min-h-dvh grid-rows-[auto_1fr]' : 'contents'">
    <header v-if="(showLectorNav && !isLectorDashboard) || showCursistNav" class="bg-pxl-black text-pxl-white">
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
        <div v-if="showLectorNav" ref="profileMenuRef" class="relative justify-self-end">
          <button ref="profileButton" type="button"
            class="rounded-full border border-pxl-gold px-3 py-1 text-xs hover:bg-white/10"
            :aria-expanded="profileOpen" aria-controls="lector-profile-menu"
            @click="profileOpen = !profileOpen">Lector</button>
          <div v-if="profileOpen" id="lector-profile-menu"
            class="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-gray-200 bg-white text-black shadow-xl">
            <p class="border-b border-gray-200 px-4 py-3 text-sm font-bold">Mijn account</p>
            <button type="button" class="w-full rounded-b-xl px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
              @click="requestLogout">Uitloggen</button>
          </div>
        </div>
        <span v-else class="justify-self-end rounded-full border border-pxl-gold px-3 py-1 text-xs">Cursist</span>
      </div>
    </header>
    <div v-if="showLectorNav && logoutNotice" role="status"
      class="flex items-center justify-between gap-3 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-8">
      <span>{{ logoutNotice }}</span>
      <button type="button" class="font-semibold underline" aria-label="Sluit melding" @click="logoutNotice = ''">Sluiten</button>
    </div>
    <RouterView v-slot="{ Component }">
      <component :is="Component" v-if="isLectorDashboard" @request-logout="requestLogout" />
      <component :is="Component" v-else />
    </RouterView>
    <LectorConfirmModal :open="showLectorNav && logoutModalOpen" title="Uitloggen?"
      message="Weet je zeker dat je wilt uitloggen?" confirm-label="Uitloggen"
      @cancel="logoutModalOpen = false" @confirm="confirmLogout" />
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
