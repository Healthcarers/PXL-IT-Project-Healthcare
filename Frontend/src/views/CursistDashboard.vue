<script setup lang="ts">

import EcgChart from "../components/ECGChart.vue";
</script>

<template>
  <h1>test</h1>
  <EcgChart :samples="[0, 0.1, 0.9, -0.2, 0, 0.05 /* ... */]" :sample-rate-hz="250" />
</template>

<style scoped>

</style>