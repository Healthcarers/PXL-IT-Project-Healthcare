<script setup lang="ts">
defineProps<{
  label: string
  color: string
  unit?: string
}>()
</script>

<template>
  <div class="card">
    <div class="card-header">
      <span class="label" :style="{ color }">{{ label }}</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 18px;
  box-sizing: border-box;
  background: #111113;
  border: 1px solid #232327;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.unit {
  color: #6b6b73;
  font-size: 12px;
  font-weight: 400;
}

.card-body {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>