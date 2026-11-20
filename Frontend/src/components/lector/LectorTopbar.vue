<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    roomCode: string;
    lectorName: string;
    cursistCount: number;
    closing?: boolean;
  }>(),
  {
    closing: false,
  },
);

const emit = defineEmits<{
  "close-room": [];
  "request-logout": [];
}>();

const profileOpen = ref(false);
const profileMenuRef = ref<HTMLElement | null>(null);

const cursistCountLabel = computed(() =>
  props.cursistCount === 1
    ? "1 cursist verbonden"
    : `${props.cursistCount} cursisten verbonden`,
);

function toggleProfileMenu() {
  profileOpen.value = !profileOpen.value;
}

function handleLogoutClick() {
  profileOpen.value = false;
  emit("request-logout");
}

function handleDocumentClick(event: MouseEvent) {
  if (!profileOpen.value) return;
  const target = event.target as Node | null;
  if (profileMenuRef.value && target && !profileMenuRef.value.contains(target)) {
    profileOpen.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && profileOpen.value) {
    profileOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <header class="w-full border-b border-[#18181f] bg-[#050506] text-white">
    <div class="mx-auto flex min-h-[54px] w-full max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
      <div class="flex min-w-0 items-center gap-3.5">
        <img
          src="../../assets/pxl_logo.png"
          alt="PXL"
          class="h-6 w-auto shrink-0 object-contain"
        />

        <span class="h-5 w-px shrink-0 bg-white/30" aria-hidden="true"></span>

        <p class="!m-0 text-xs font-semibold text-[#e4e4e7]">
          <span>Room {{ roomCode }}</span>
          <span class="mx-2 text-[#71717a]" aria-hidden="true">·</span>
          <span>Lector: {{ lectorName }}</span>
          <span class="mx-2 text-[#71717a]" aria-hidden="true">·</span>
          <span>{{ cursistCountLabel }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          :disabled="closing"
          class="rounded-xl border border-white/75 bg-[#0b0b0e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          @click="emit('close-room')"
        >
          Room sluiten
        </button>

        <div ref="profileMenuRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/75 bg-[#0b0b0e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            aria-haspopup="menu"
            aria-controls="lector-profile-menu"
            :aria-expanded="profileOpen"
            @click.stop="toggleProfileMenu"
          >
            <span>Lector</span>
            <svg
              class="h-3 w-3 transition-transform"
              :class="{ 'rotate-180': profileOpen }"
              viewBox="0 0 12 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2.5 4.25L6 7.75L9.5 4.25H2.5Z" />
            </svg>
          </button>

          <div
            v-if="profileOpen"
            id="lector-profile-menu"
            role="menu"
            class="absolute right-0 z-40 mt-2.5 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white text-[#0b0b0d] shadow-2xl"
          >
            <div class="px-5 py-3.5">
              <p class="!m-0 text-xs font-medium text-[#71717a]">Ingelogd</p>
              <p class="!m-0 mt-0.5 text-sm font-bold text-[#0b0b0d]">Mijn account</p>
            </div>

            <div class="border-t border-gray-200">
              <button
                type="button"
                role="menuitem"
                class="w-full px-5 py-3.5 text-left text-sm font-semibold text-[#dc2626] transition hover:bg-red-50"
                @click="handleLogoutClick"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
