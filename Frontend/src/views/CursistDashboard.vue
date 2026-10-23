<script>

import {connected} from "../services/stompClient.ts";
import {defineComponent} from "vue";
import EcgPanel from "../components/charts/EcgPanel.vue";

export default defineComponent({
  components: {EcgPanel},
  computed: {
    connected() {
      return connected
    }
  }
})

</script>

<template>
  <main class="dashboard">
    <span
      class="status"
      :class="{ online: connected }"
      :title="connected ? 'Connected' : 'Disconnected'"
    />
    <section class="panels">
      <EcgPanel />
    </section>
  </main>
</template>

<style scoped>
.dashboard {
  position: relative;
  height: 100vh;
  padding: 8px;
  box-sizing: border-box;
  background: #000;
}

.panels {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.status {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #555;
}

.status.online {
  background: #22c55e;
}
</style>
