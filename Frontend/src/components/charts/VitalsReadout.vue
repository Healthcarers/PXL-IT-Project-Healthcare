<script setup lang="ts">
defineProps<{
  label: string
  value: number | null
  unit: string
}>();
</script>

<template>
  <div class="readout">
    <span class="label">{{ label }}</span>
    <span class="value">{{ value ?? '--' }}</span>
    <span class="unit">{{ unit }}</span>
  </div>
</template>

<style scoped>
.readout {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  padding: 0 12px;
  color: #22c55e;
  font-family: monospace;
  border-left: 1px solid rgba(255, 60, 60, 0.18);
}

.label {
  font-size: 1.1rem;
  opacity: 0.8;
}

.value {
  font-size: 4rem;
  line-height: 1;
  font-weight: bold;
}

.unit {
  font-size: 1rem;
  opacity: 0.8;
}
</style>