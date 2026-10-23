
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '../stores/roomStore'
import { roomService } from '../services/roomService'
import type { CreateRoomRequest } from '../types/room'

export function useRoom() {
  const roomStore = useRoomStore()
  const { currentRoom } = storeToRefs(roomStore)

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createRoom(data: CreateRoomRequest) {
    loading.value = true
    error.value = null

    try {
      const room = await roomService.create(data)
      roomStore.setRoom(room)
      return room
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Er is een onbekende fout opgetreden.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadRoom(code: string) {
    loading.value = true
    error.value = null

    try {
      const room = await roomService.getByCode(code)
      roomStore.setRoom(room)
      return room
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'De room kon niet worden opgehaald.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function closeRoom() {
    const room = currentRoom.value

    if (!room) {
      error.value = 'Er is geen room geselecteerd.'
      return
    }

    loading.value = true
    error.value = null

    try {
      const updatedRoom = await roomService.close(room.code)
      roomStore.setRoom(updatedRoom)
      return updatedRoom
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'De room kon niet worden gesloten.'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearRoom() {
    roomStore.clearRoom()
    error.value = null
  }

  return {
    currentRoom,
    loading,
    error,
    createRoom,
    loadRoom,
    closeRoom,
    clearRoom,
  }
}
