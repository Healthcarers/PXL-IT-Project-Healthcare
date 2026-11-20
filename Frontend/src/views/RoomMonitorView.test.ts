import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { expect, it, vi } from 'vitest'
import RoomMonitorView from './RoomMonitorView.vue'
import { useRoomStore } from '../stores/roomStore'
import { roomService } from '../services/roomService'
import type { Room } from '../types/room'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../services/roomService', () => ({ roomService: { getByCode: vi.fn() } }))
vi.mock('./CursistDashboard.vue', () => ({ default: { template: '<main>Grafieken</main>' } }))

it('verbergt de grafieken zodra de room sluit en navigeert na vijf seconden naar room joinen', async () => {
  vi.useFakeTimers()
  const pinia = createPinia()
  const room: Room = {
    id: 'room-1', code: 'ABC123', name: 'Testroom', description: null, status: 'STARTED',
    ownerId: 'host-1', createdAt: '2026-11-13T10:00:00', participantCount: 2,
  }
  const store = useRoomStore(pinia)
  store.setRoom(room)
  vi.mocked(roomService.getByCode).mockResolvedValueOnce(room).mockResolvedValue({ ...room, status: 'CLOSED' })
  const wrapper = mount(RoomMonitorView, { props: { code: room.code }, global: { plugins: [pinia] } })
  try {
    await flushPromises()
    expect(wrapper.text()).toContain('Grafieken')

    await vi.advanceTimersByTimeAsync(2000)
    expect(roomService.getByCode).toHaveBeenLastCalledWith(room.code)
    expect(wrapper.text()).not.toContain('Grafieken')
    expect(wrapper.get('dialog').text()).toContain('De room waar je in zat is gesloten')
    await vi.advanceTimersByTimeAsync(4999)
    expect(replace).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(store.currentRoom).toBeNull()
    expect(replace).toHaveBeenCalledExactlyOnceWith({ name: 'home' })
  } finally {
    wrapper.unmount()
    vi.useRealTimers()
  }
})
