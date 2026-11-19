<script>
import { connected } from "../services/stompClient.ts";
import { defineComponent } from "vue";
import PatientMonitorGrid from "../components/charts/PatientMonitorGrid.vue";

export default defineComponent({
  components: {
    PatientMonitorGrid,
  },
  computed: {
    connected() {
      return connected.value;
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

    <PatientMonitorGrid />
  </div>
</template>
