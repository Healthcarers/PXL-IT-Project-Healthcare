import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Room } from '../types/room'

export const useRoomStore = defineStore('room', () => {
  const currentRoom = ref<Room | null>(null)

  function setRoom(room: Room) {
    currentRoom.value = room
  }

  function clearRoom() {
    currentRoom.value = null
  }

  return {
    currentRoom,
    setRoom,
    clearRoom,
  }
})
