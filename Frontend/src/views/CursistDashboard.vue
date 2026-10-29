<script>
import {connected} from "../services/stompClient.ts";
import {defineComponent} from "vue";
import EcgPanel from "../components/charts/EcgPanel.vue";
import HeartRateCard from "../components/charts/HeartRateCard.vue";

export default defineComponent({
  components: {HeartRateCard, EcgPanel},
  computed: {
    connected() {
      return connected
    }
  }
})

</script>

<template>
  <div class="dashboard">
    <header class="topbar">
      <span class="brand">PXL</span>
      <span
          class="status"
          :class="{ online: connected }"
          :title="connected ? 'Connected' : 'Disconnected'"
      />
    </header>

    <main class="grid">
      <section class="column waves">
        <EcgPanel />
      </section>
      <section class="column vitals">
        <HeartRateCard />
      </section>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #050506;
  color: #fff;
  box-sizing: border-box;
}

.topbar {
  flex-shrink: 0;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid #1a1a1d;
}

.brand {
  font-weight: 800;
  letter-spacing: 0.04em;
}

.status {
  margin-left: auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #555;
}

.status.online {
  background: #22c55e;
}

.grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.waves > * {
  flex: 1;
}
.waves > :first-child {
  flex: 1.25;
}

.vitals > * {
  flex: 1;
}
</style>
