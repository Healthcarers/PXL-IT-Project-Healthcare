<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import type { ChartOptions, ChartData } from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, Legend)

const props = defineProps<{
  samples: number[]
  sampleRateHz?: number
}>()

const rate = props.sampleRateHz ?? 250

const chartData = computed<ChartData<'line', { x: number; y: number }[]>>(() => ({
  datasets: [
    {
      label: 'ECG Lead II',
      data: props.samples.map((y, i) => ({ x: (i / rate) * 1000, y })),
      borderColor: '#22c55e',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0
    }
  ]
}))

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  scales: {
    x: {
      type: 'linear',
      title: { display: true, text: 'Time (ms)' },
      ticks: { maxTicksLimit: 10 }
    },
    y: {
      title: { display: true, text: 'Amplitude (mV)' },
      min: -1,
      max: 2
    }
  },
  plugins: { legend: { display: false } }
}
</script>

<template>
  <div style="position: relative; width: 100%; height: 300px">
    <Line :data="chartData" :options="options" />
  </div>
</template>

<style scoped>

</style>