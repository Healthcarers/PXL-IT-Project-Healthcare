<script setup lang="ts">
import EcgPanel from "./EcgPanel.vue";
import SpO2Panel from "./SpO2Panel.vue";
import Etco2Panel from "./Etco2Panel.vue";
import IbpPanel from "./IbpPanel.vue";
import HeartRateCard from "./HeartRateCard.vue";
import SpO2Card from "./SpO2Card.vue";
import Etco2Card from "./Etco2Card.vue";
import IbpCard from "./IbpCard.vue";

withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});
</script>

<template>
  <main
      class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 box-border bg-[#050506] text-white"
  >
    <section class="flex min-h-0 flex-col gap-3.5 [&>*]:flex-1">
      <EcgPanel :preview="preview" />
      <SpO2Panel :preview="preview" />
      <Etco2Panel :preview="preview" />
      <IbpPanel :preview="preview" />
    </section>

    <section class="flex min-h-0 flex-col gap-3.5 [&>*]:flex-1">
      <HeartRateCard :preview="preview" />
      <SpO2Card :preview="preview" />
      <Etco2Card :preview="preview" />
      <IbpCard :preview="preview" />
    </section>
  </main>
</template>
