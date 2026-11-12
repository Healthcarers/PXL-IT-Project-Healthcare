<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border border-pxl-black/10 bg-pxl-white shadow-[0_1px_2px_rgba(3,2,3,0.03)]"
  >
    <div
      class="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
    >
      <h2 class="font-heading text-base text-pxl-black sm:text-lg">
        {{ title }}
      </h2>

      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </section>
</template>
