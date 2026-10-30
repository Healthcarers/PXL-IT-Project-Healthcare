<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Filler
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import type { Point } from '../../types/waveform'

ChartJS.register(LineElement, PointElement, LinearScale, Filler)

const props = withDefaults(defineProps<{
  points: Point[]
  windowMs?: number
  yMin: number
  yMax: number
  color?: string
  lineWidth?: number
  gridColor?: string
  gridStepX?: number
  gridStepY?: number
}>(), {
  windowMs: 400,
  color: '#22c55e',
  lineWidth: 1.5,
  gridColor: 'transparent',
  gridStepX: 200,
  gridStepY: 0.5
})

const chartData = computed<ChartData<'line', Point[]>>(() => ({
  datasets: [
    {
      data: props.points,
      borderColor: props.color,
      borderWidth: props.lineWidth,
      pointRadius: 0,
      tension: 0
    }
  ]
}))

const chartOptions = computed<ChartOptions<'line'>>(() => {
  const latest = props.points.at(-1)?.x ?? 0

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    events: [],
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: {
        type: 'linear',
        min: latest - props.windowMs,
        max: latest,
        ticks: { display: false, stepSize: props.gridStepX },
        grid: { color: props.gridColor, tickLength: 0 },
        border: { display: false }
      },
      y: {
        min: props.yMin,
        max: props.yMax,
        ticks: { display: false, stepSize: props.gridStepY },
        grid: { color: props.gridColor, tickLength: 0 },
        border: { display: false }
      }
    }
  }
})
</script>

<template>
  <div class="relative h-full w-full">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
