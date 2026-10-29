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
    class="sweep-chart"
    role="button"
    :aria-pressed="active"
    :aria-label="active ? 'Stop display' : 'Start display'"
    @click="toggleActive"
  >
    <Line
      v-if="active"
      :data="chartData"
      :options="chartOptions"
    />
    <div v-else class="placeholder">
      <span class="hint">Tap to start</span>
    </div>
  </div>
</template>

<style scoped>
.sweep-chart {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  outline: none;
}

.sweep-chart:focus-visible {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  border-radius: 6px;
}

.placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Flat baseline so an inactive lead still reads as a trace slot */
.placeholder::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: #2a2a2f;
}

.hint {
  position: relative;
  padding: 4px 10px;
  font-size: 12px;
  color: #6b6b73;
  background: #111113;
  border-radius: 999px;
}

.sweep-chart:hover .hint {
  color: #a0a0a8;
}
</style>