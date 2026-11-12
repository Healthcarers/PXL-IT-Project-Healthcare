<script setup lang="ts">
const emit = defineEmits<{
  logout: [];
}>();
</script>

<template>
  <header class="w-full bg-pxl-black text-pxl-white">
    <div
      class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8"
    >
      <div class="flex items-center gap-3.5">
        <img
          src="../../assets/pxl_logo.png"
          alt="PXL"
          class="h-6 w-auto object-contain sm:h-7"
        />
        <span class="h-5 w-px bg-white/35" aria-hidden="true"></span>
        <span class="font-body text-xs text-pxl-white/90 sm:text-sm">
          Virtuele monitor-defibrillator
        </span>
      </div>

      <div class="flex items-center gap-2.5">
        <span
          class="font-body inline-flex items-center rounded-full border border-pxl-gold bg-pxl-black px-4 py-1.5 text-xs font-medium text-pxl-gold"
        >
          Beheerder
        </span>
        <button
          type="button"
          class="font-body cursor-pointer rounded-full border border-white/60 bg-pxl-black px-4 py-1.5 text-xs font-medium text-pxl-white transition hover:border-pxl-gold focus:outline-none focus:ring-2 focus:ring-pxl-gold"
          @click="emit('logout')"
        >
          Uitloggen
        </button>
      </div>
    </div>
  </header>
</template>
