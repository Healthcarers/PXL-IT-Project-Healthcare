
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRoomStore } from './roomStore'
import type { Room } from '../types/room'

const mockRoom: Room = {
  id: 'room-1',
  code: 'ABC123',
  name: 'Testroom',
  description: 'Een testroom',
  createdAt: '2026-11-13T10:00:00',
  status: 'OPEN',
  ownerId: 'user-1',
  participantCount: 1,
}

describe('roomStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('start zonder geselecteerde room', () => {
    const store = useRoomStore()

    expect(store.currentRoom).toBeNull()
  })

  it('slaat een room op', () => {
    const store = useRoomStore()

    store.setRoom(mockRoom)

    expect(store.currentRoom).toEqual(mockRoom)
  })

  it('vervangt de huidige room', () => {
    const store = useRoomStore()
    const anotherRoom = {
      ...mockRoom,
      id: 'room-2',
      code: 'XYZ789',
      name: 'Andere room',
    }

    store.setRoom(mockRoom)
    store.setRoom(anotherRoom)

    expect(store.currentRoom).toEqual(anotherRoom)
  })

  it('wist de huidige room', () => {
    const store = useRoomStore()

    store.setRoom(mockRoom)
    store.clearRoom()

    expect(store.currentRoom).toBeNull()
  })

  it('kan een room opnieuw opslaan nadat deze gewist is', () => {
    const store = useRoomStore()

    store.setRoom(mockRoom)
    store.clearRoom()
    store.setRoom(mockRoom)

    expect(store.currentRoom).toEqual(mockRoom)
  })
})
