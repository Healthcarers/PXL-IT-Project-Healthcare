<script setup lang="ts">
import { onUnmounted, watch } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    cancelLabel?: string;
    confirmLabel?: string;
    loading?: boolean;
  }>(),
  {
    cancelLabel: "Annuleren",
    confirmLabel: "Bevestigen",
    loading: false,
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open && !props.loading) {
    emit("cancel");
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) window.addEventListener("keydown", onKeydown);
    else window.removeEventListener("keydown", onKeydown);
  },
  { immediate: true },
);

onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    @click.self="!loading && emit('cancel')"
  >
    <div class="w-full max-w-[440px] rounded-3xl bg-white p-7 text-[#0b0b0d] shadow-2xl sm:p-8">
      <h2 class="!m-0 text-2xl font-extrabold tracking-tight text-[#0b0b0d]">{{ title }}</h2>
      <p class="mt-3 text-sm leading-relaxed text-[#52525b]">{{ message }}</p>
      <div class="mt-7 flex items-center justify-end gap-3">
        <button
          type="button"
          :disabled="loading"
          class="rounded-full border border-[#18181b] bg-white px-6 py-2.5 text-sm font-semibold text-[#0b0b0d] transition hover:bg-gray-100 disabled:opacity-50"
          @click="emit('cancel')"
        >{{ cancelLabel }}</button>
        <button
          type="button"
          :disabled="loading"
          class="rounded-full bg-[#0b0b0d] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#232329] disabled:opacity-50"
          @click="emit('confirm')"
        >{{ loading ? "Bezig..." : confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>
