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
      class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-5 overflow-y-auto overscroll-contain p-5 box-border bg-[#050506] text-white"
  >
    <MonitorChartsWrapper
        class="min-h-[480px]"
        :preview="preview"
        :show-defibrillator="!preview && showDefibrillator"
    >
      <template #defibrillator>
        <slot name="defibrillator" />
      </template>
    </MonitorChartsWrapper>

    <section class="flex min-h-0 flex-col gap-3.5 [&>*]:min-h-[160px] [&>*]:flex-1">
      <HeartRateCard :preview="preview" />
      <SpO2Card :preview="preview" />
      <Etco2Card :preview="preview" />
      <IbpCard :preview="preview" />
      <NibpCard :preview="preview" />
    </section>
  </main>
</template>