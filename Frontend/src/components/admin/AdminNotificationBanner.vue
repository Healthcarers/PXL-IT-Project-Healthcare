<script setup lang="ts">
import type { AdminNotification } from "../../types/admin";

defineProps<{
  notification: AdminNotification | null;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();
</script>

<template>
  <div
    v-if="notification"
    role="status"
    aria-live="polite"
    :class="[
      'flex items-center justify-between gap-3 rounded-lg border px-4 py-3',
      notification.type === 'success'
        ? 'border-[#2E9E5B]/60 bg-[#EDF7F0]'
        : 'border-pxl-gold/70 bg-pxl-white',
    ]"
  >
    <div class="flex items-center gap-3">
      <span
        :class="[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-pxl-white',
          notification.type === 'success' ? 'bg-[#168A45]' : 'bg-pxl-black',
        ]"
        aria-hidden="true"
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.42l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
      <p class="font-body text-xs text-pxl-black sm:text-sm">
        {{ notification.message }}
      </p>
    </div>

    <button
      type="button"
      class="font-body cursor-pointer rounded px-2 py-0.5 text-xs text-pxl-black/60 transition hover:text-pxl-black focus:outline-none focus:ring-2 focus:ring-pxl-gold"
      aria-label="Sluit melding"
      @click="emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>
