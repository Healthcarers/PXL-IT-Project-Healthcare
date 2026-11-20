<script setup lang="ts">
import MonitorChartsWrapper from "./MonitorChartsWrapper.vue";
import HeartRateCard from "./HeartRateCard.vue";
import SpO2Card from "./SpO2Card.vue";
import Etco2Card from "./Etco2Card.vue";
import IbpCard from "./IbpCard.vue";
import TemperatureCard from "./TemperatureCard.vue";

withDefaults(defineProps<{
  preview?: boolean;
  showDefibrillator?: boolean;
}>(), {
  preview: false,
  showDefibrillator: false,
});
</script>

<template>
  <main
      class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 box-border bg-[#050506] text-white"
  >
    <MonitorChartsWrapper
      :preview="preview"
      :show-defibrillator="!preview && showDefibrillator"
    >
      <template #defibrillator>
        <slot name="defibrillator" />
      </template>
    </MonitorChartsWrapper>

    <section class="flex min-h-0 flex-col gap-3.5 overflow-y-auto [&>*]:min-h-[112px] [&>*]:flex-1">
      <HeartRateCard :preview="preview" />
      <SpO2Card :preview="preview" />
      <Etco2Card :preview="preview" />
      <IbpCard :preview="preview" />
      <TemperatureCard :preview="preview" />
    </section>
  </main>
</template>
