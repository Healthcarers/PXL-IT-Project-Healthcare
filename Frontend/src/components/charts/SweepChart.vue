<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, LinearScale } from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import type { SweepPoint } from '../../composables/useSweepWaveform'

ChartJS.register(LineElement, PointElement, LinearScale);

const props = withDefaults(defineProps<{
  points: SweepPoint[]
  cursorX: number
  windowMs: number
  yMin: number
  yMax: number
  color?: string
  cursorColor?: string
  lineWidth?: number
  gridColor?: string
  gridStepX?: number
  gridStepY?: number
  showCursor?: boolean
}>(), {
  color: '#22c55e',
  cursorColor: 'rgba(255, 255, 255, 0.6)',
  lineWidth: 1.5,
  gridColor: 'transparent',
  gridStepX: 200,
  gridStepY: 0.5,
  showCursor: true
});

const active = defineModel<boolean>('active', { default: false });

function toggleActive() {
  active.value = !active.value;
}

const chartData = computed<ChartData<'line', SweepPoint[]>>(() => {
  const datasets: any[] = [
    {
      data: props.points,
      borderColor: props.color,
      borderWidth: props.lineWidth,
      pointRadius: 0,
      tension: 0,
      spanGaps: false
    }
  ];

  if (props.showCursor) {
    datasets.push({
      data: [
        { x: props.cursorX, y: props.yMin },
        { x: props.cursorX, y: props.yMax }
      ],
      borderColor: props.cursorColor,
      borderWidth: 1,
      pointRadius: 0
    })
  }

  return { datasets };
});

const chartOptions = computed<ChartOptions<'line'>>(() => ({
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
      min: 0,
      max: props.windowMs,
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
}));
</script>

<template>
  <div
      class="relative h-full w-full cursor-pointer outline-none focus-visible:rounded-md focus-visible:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
      role="button"
      tabindex="0"
      :aria-pressed="active"
      :aria-label="active ? 'Stop display' : 'Start display'"
      @click="toggleActive"
      @keydown.enter.prevent="toggleActive"
      @keydown.space.prevent="toggleActive"
  >
    <Line
        v-if="active"
        :data="chartData"
        :options="chartOptions"
    />

    <div
        v-else
        class="relative flex h-full w-full items-center justify-center before:absolute before:left-0 before:right-0 before:top-1/2 before:h-px before:bg-[#2a2a2f] before:content-['']"
    >
      <span
          class="relative rounded-full bg-[#111113] px-2.5 py-1 text-xs text-[#6b6b73] transition-colors hover:text-[#a0a0a8]"
      >
        Tap to start
      </span>
    </div>
  </div>
</template>
