<script>
import { connected } from "../services/stompClient.ts";
import { defineComponent } from "vue";
import EcgPanel from "../components/charts/EcgPanel.vue";
import HeartRateCard from "../components/charts/HeartRateCard.vue";
import SpO2Panel from "../components/charts/SpO2Panel.vue";
import SpO2Card from "../components/charts/SpO2Card.vue";

export default defineComponent({
  components: {Spo2Card: SpO2Card, SpO2Panel, HeartRateCard, EcgPanel },
  computed: {
    connected() {
      return connected;
    },
  },
});
</script>

<template>
  <div
      class="flex h-screen flex-col box-border bg-[#050506] text-white"
  >
    <header
        class="flex h-13 shrink-0 items-center gap-4 border-b border-[#1a1a1d] px-5"
    >
      <img
          src="../assets/pxl_logo.png"
          alt="PXL Logo"
          class="h-8 w-auto object-contain"
      />

      <span
          class="ml-auto size-2.5 rounded-full"
          :class="connected ? 'bg-green-500' : 'bg-[#555]'"
          :title="connected ? 'Connected' : 'Disconnected'"
      />
    </header>

    <main
        class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 box-border"
    >
      <section class="flex min-h-0 flex-col gap-3.5 [&>*]:flex-1 [&>*:first-child]:flex-[1.25]">
        <EcgPanel />
        <SpO2Panel />
      </section>

      <section class="flex min-h-0 flex-col gap-3.5 [&>*]:flex-1">
        <HeartRateCard />
        <Spo2Card />
      </section>
    </main>
  </div>
</template>
