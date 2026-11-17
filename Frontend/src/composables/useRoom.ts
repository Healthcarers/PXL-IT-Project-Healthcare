
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '../stores/roomStore'
import { roomService } from '../services/roomService'
import type {
  CreateRoomRequest,
  RoomParticipant,
} from '../types/room'

export function useRoom() {
  const roomStore = useRoomStore()
  const { currentRoom } = storeToRefs(roomStore)

  const participants = ref<RoomParticipant[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function setError(err: unknown, fallback: string) {
    error.value =
      err instanceof Error ? err.message : fallback
  }

  async function createRoom(data: CreateRoomRequest) {
    loading.value = true
    error.value = null

    try {
      const room = await roomService.create(data)
      roomStore.setRoom(room)
      await loadParticipants(room.code)
      return room
    } catch (err) {
      setError(err, 'De room kon niet worden aangemaakt.')
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
      setError(err, 'De room kon niet worden opgehaald.')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadParticipants(code: string) {
    try {
      participants.value = await roomService.getParticipants(code)
      return participants.value
    } catch (err) {
      setError(err, 'De deelnemers konden niet worden opgehaald.')
      throw err
    }
  }

  async function joinRoom() {
    const room = currentRoom.value

    if (!room) {
      error.value = 'Er is geen room geselecteerd.'
      return
    }

    loading.value = true
    error.value = null

    try {
      await roomService.join(room.code)
      await loadRoom(room.code)
      await loadParticipants(room.code)
    } catch (err) {
      setError(err, 'Deelnemen aan de room is mislukt.')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function startRoom() {
    const room = currentRoom.value

    if (!room) {
      error.value = 'Er is geen room geselecteerd.'
      return
    }

    loading.value = true
    error.value = null

    try {
      const updatedRoom = await roomService.start(room.code)
      roomStore.setRoom(updatedRoom)
      return updatedRoom
    } catch (err) {
      setError(err, 'De room kon niet worden gestart.')
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
      setError(err, 'De room kon niet worden gesloten.')
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearRoom() {
    roomStore.clearRoom()
    participants.value = []
    error.value = null
  }

  return {
    currentRoom,
    participants,
    loading,
    error,
    createRoom,
    loadRoom,
    loadParticipants,
    joinRoom,
    startRoom,
    closeRoom,
    clearRoom,
  }
}
