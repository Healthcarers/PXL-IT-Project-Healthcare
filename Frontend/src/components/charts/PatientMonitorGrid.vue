<script setup lang="ts">
import MonitorChartsWrapper from "./MonitorChartsWrapper.vue";
import HeartRateCard from "./HeartRateCard.vue";
import SpO2Card from "./SpO2Card.vue";
import Etco2Card from "./Etco2Card.vue";
import IbpCard from "./IbpCard.vue";
import NibpCard from "./NibpCard.vue";

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
      class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(180px,22vw,300px)] gap-3 lg:gap-5 overflow-hidden overscroll-contain p-3 sm:p-4 lg:p-5 box-border bg-[#050506] text-white"
  >
    <MonitorChartsWrapper
        class="min-h-0"
        :preview="preview"
        :show-defibrillator="!preview && showDefibrillator"
    >
      <template #defibrillator>
        <slot name="defibrillator" />
      </template>
    </MonitorChartsWrapper>

    <section class="flex min-h-0 flex-col gap-2.5 lg:gap-3.5 [&>*]:min-h-0 [&>*]:flex-1">
      <HeartRateCard :preview="preview" />
      <SpO2Card :preview="preview" />
      <Etco2Card :preview="preview" />
      <IbpCard :preview="preview" />
      <NibpCard :preview="preview" />
    </section>
  </main>
</template>