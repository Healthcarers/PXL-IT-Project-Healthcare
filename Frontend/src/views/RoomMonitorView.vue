<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CursistDashboard from './CursistDashboard.vue'
import RoomClosedDialog from '../components/RoomClosedDialog.vue'
import { roomService } from '../services/roomService'
import { useRoomStore } from '../stores/roomStore'
import { provideMonitorRoom } from '../composables/useMonitorRoom'

const props = defineProps<{ code: string }>()
provideMonitorRoom(() => props.code)
const router = useRouter()
const roomStore = useRoomStore()
const state = ref<'checking' | 'started' | 'closed' | 'unavailable'>('checking')

function returnToJoinPage() {
  roomStore.clearRoom()
  return router.replace({ name: 'home' })
}

watch(() => props.code, (code, _, onCleanup) => {
  let active = true
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => {
    active = false
    clearTimeout(timer)
  })

  state.value = 'checking'
  if (!code) {
    void returnToJoinPage()
    return
  }

  async function checkStatus() {
    try {
      const room = await roomService.getByCode(code)
      if (!active) return

      if (room.status === 'CLOSED') {
        state.value = 'closed'
        return
      }
      if (room.status === 'OPEN') {
        await router.replace({ name: 'room', params: { code } })
        return
      }
      state.value = 'started'
    } catch {
      if (active) state.value = 'unavailable'
    }

    if (active) timer = setTimeout(checkStatus, 2000)
  }

  void checkStatus()
}, { immediate: true })
</script>

<template>
  <CursistDashboard v-if="state === 'started'" />
  <RoomClosedDialog v-else-if="state === 'closed'" @acknowledge="returnToJoinPage" />
  <main v-else class="flex flex-col items-center justify-center gap-4 bg-[#f7f5f0] p-4 text-black">
    <p v-if="state === 'checking'" role="status">Roomstatus controleren...</p>
    <template v-else>
      <p role="alert">De roomstatus kan niet worden opgehaald. We proberen het opnieuw.</p>
      <button type="button" class="underline" @click="returnToJoinPage">Naar room joinen</button>
    </template>
  </main>
</template>
