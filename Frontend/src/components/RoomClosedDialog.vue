<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const emit = defineEmits<{ acknowledge: [] }>()
const dialog = ref<HTMLDialogElement>()
let redirectTimer: ReturnType<typeof setTimeout> | undefined

function acknowledge() {
  if (redirectTimer === undefined) return

  clearTimeout(redirectTimer)
  redirectTimer = undefined
  emit('acknowledge')
}

onMounted(() => {
  dialog.value?.showModal()
  redirectTimer = setTimeout(acknowledge, 5000)
})

onUnmounted(() => clearTimeout(redirectTimer))
</script>

<template>
  <dialog ref="dialog" aria-labelledby="closed-room-message" aria-describedby="closed-room-redirect"
    class="m-auto w-[min(90%,420px)] rounded-xl border border-gray-200 bg-white p-6 text-black shadow-lg backdrop:bg-black/60"
    @cancel.prevent="acknowledge">
    <h1 id="closed-room-message" class="text-xl font-bold">De room waar je in zat is gesloten</h1>
    <p id="closed-room-redirect" class="mt-2 text-sm text-gray-600">
      Over 5 seconden kun je een nieuwe roomcode ingeven.
    </p>
    <button type="button" class="mt-5 rounded-lg bg-black px-4 py-2 font-semibold text-white"
      @click="acknowledge">
      Naar room joinen
    </button>
  </dialog>
</template>
