import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import HostDashboardView from './HostDashboardView.vue'
import { useRoom } from '../composables/useRoom'
import { roomService } from '../services/roomService'
import { scenarioService } from '../services/scenarioService'
import { connected, subscribeTopic } from '../services/stompClient'
import type { Room, RoomParticipant } from '../types/room'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../composables/useRoom', () => ({ useRoom: vi.fn() }))
vi.mock('../stores/Authstore', () => ({ useAuthStore: () => ({ person: { id: 'host-1' } }) }))
vi.mock('../services/roomService', () => ({
  roomService: { getScenario: vi.fn(), assignScenario: vi.fn(), getParticipants: vi.fn() },
}))
vi.mock('../services/scenarioService', () => ({ scenarioService: { list: vi.fn() } }))
vi.mock('../services/stompClient', async () => {
  const { ref } = await import('vue')
  return { connected: ref(false), subscribeTopic: vi.fn(() => () => {}) }
})

beforeEach(() => {
  vi.resetAllMocks()
  connected.value = false
  vi.mocked(roomService.getParticipants).mockResolvedValue([])
})

it('sluit een gestarte room en keert na vijf seconden terug naar Room aanmaken', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
  const room: Room = {
    id: 'room-1', code: 'ABC123', name: 'Testroom', description: null, status: 'STARTED',
    ownerId: 'host-1', createdAt: '2026-11-13T10:00:00', participantCount: 2,
  }
  const currentRoom = ref<Room | null>(room)
  const clearRoom = vi.fn()
  const closeRoom = vi.fn(async () => {
    const closed: Room = { ...room, status: 'CLOSED' }
    currentRoom.value = closed
    return closed
  })

  vi.mocked(useRoom).mockReturnValue({
    currentRoom, participants: ref([]), loading: ref(false), error: ref(null),
    loadRoom: vi.fn(), loadParticipants: vi.fn(), closeRoom, clearRoom,
    createRoom: vi.fn(), joinRoom: vi.fn(), startRoom: vi.fn(),
  })
  const wrapper = mount(HostDashboardView, { props: { code: room.code } })
  try {
    await flushPromises()
    const closeButton = wrapper.findAll('button').find(button => button.text() === 'Room sluiten')
    expect(closeButton).toBeDefined()
    await closeButton?.trigger('click')
    await flushPromises()

    expect(closeRoom).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('over 5 seconden')
    await vi.advanceTimersByTimeAsync(4999)
    expect(replace).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(clearRoom).toHaveBeenCalledOnce()
    expect(replace).toHaveBeenCalledWith({ name: 'create-room' })
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  }
})

it('toont alleen gepubliceerde opties en bewaart de gekozen startwaarden bij de room', async () => {
  const room: Room = {
    id: 'room-1', code: 'ABC123', name: 'Testroom', description: 'Testopdracht', status: 'OPEN',
    ownerId: 'host-1', createdAt: '2026-11-13T10:00:00', participantCount: 1,
  }
  const currentRoom = ref<Room | null>(room)
  vi.mocked(useRoom).mockReturnValue({
    currentRoom, participants: ref([]), loading: ref(false), error: ref(null),
    loadRoom: vi.fn(), loadParticipants: vi.fn(), closeRoom: vi.fn(), clearRoom: vi.fn(),
    createRoom: vi.fn(), joinRoom: vi.fn(), startRoom: vi.fn(),
  })
  const published = {
    id: 'published', name: 'Monitorsimulatie', description: 'Oefening', feedbackItems: ['Evaluatiepunt'],
    status: 'PUBLISHED' as const,
    initialVitals: { heartRate: 102, spo2: 98, etco2: 38, respRate: 15, ampScale: 1,
      sysBloodPressure: 120, diasBloodPressure: 80 },
  }
  vi.mocked(scenarioService.list).mockResolvedValue([published, { ...published, id: 'draft', status: 'DRAFT' }])
  vi.mocked(roomService.getScenario).mockResolvedValueOnce(undefined).mockResolvedValueOnce(published)
  vi.mocked(roomService.assignScenario).mockResolvedValueOnce(published)
  const wrapper = mount(HostDashboardView, { props: { code: room.code } })
  await flushPromises()

  const select = wrapper.get<HTMLSelectElement>('#room-scenario')
  expect(Array.from(select.element.options, option => option.value)).toEqual(['', 'published'])
  await select.setValue('published')
  await flushPromises()
  expect(roomService.assignScenario).toHaveBeenCalledWith(room.code, 'published')
  expect(wrapper.get('[aria-label="Basiswaarden"]').text()).toContain('HF 102')
  wrapper.unmount()

  currentRoom.value = { ...room, status: 'STARTED' }
  const reopened = mount(HostDashboardView, { props: { code: room.code } })
  await flushPromises()
  expect(reopened.get<HTMLSelectElement>('#room-scenario').element.value).toBe('published')
  expect(reopened.get<HTMLSelectElement>('#room-scenario').element.disabled).toBe(true)
  reopened.unmount()
})

it('ververst bij een WebSocket-signaal meteen en blijft automatisch verversen zonder verbinding', async () => {
  vi.useFakeTimers()
  const room: Room = {
    id: 'room-1', code: 'ABC123', name: 'Testroom', description: null, status: 'OPEN',
    ownerId: 'host-1', createdAt: '2026-11-13T10:00:00', participantCount: 1,
  }
  const currentRoom = ref<Room | null>(room)
  const host: RoomParticipant = {
    id: 'member-1', userId: room.ownerId, firstname: 'Demo', lastname: 'Lector', joinedAt: room.createdAt,
  }
  const first = { ...host, id: 'member-2', userId: 'student-1', firstname: 'Eerste', lastname: 'Cursist' }
  const second = { ...first, id: 'member-3', userId: 'student-2', firstname: 'Tweede' }
  vi.mocked(useRoom).mockReturnValue({
    currentRoom, participants: ref([]), loading: ref(false), error: ref(null),
    loadRoom: vi.fn(), loadParticipants: vi.fn(), closeRoom: vi.fn(), clearRoom: vi.fn(),
    createRoom: vi.fn(), joinRoom: vi.fn(), startRoom: vi.fn(),
  })
  vi.mocked(scenarioService.list).mockResolvedValue([])
  const getParticipants = vi.mocked(roomService.getParticipants)
  getParticipants.mockResolvedValueOnce([host]).mockResolvedValueOnce([host, first])
    .mockResolvedValue([host, first, second])
  const unsubscribe = vi.fn()
  vi.mocked(subscribeTopic).mockReturnValue(unsubscribe)
  connected.value = true
  const wrapper = mount(HostDashboardView, { props: { code: room.code } })
  try {
    await flushPromises()
    const status = wrapper.get('[aria-label="Roomstatus"]')
    expect(status.text()).toContain('Wacht op cursisten')
    expect(status.classes()).toContain('bg-amber-100')

    expect(subscribeTopic).toHaveBeenCalledWith('/topic/rooms/room-1/members-changed', expect.any(Function))
    vi.mocked(subscribeTopic).mock.calls[0]?.[1](true)
    await flushPromises()
    expect(status.text()).toContain('1 cursist in de room')
    expect(status.classes()).toContain('bg-green-100')

    connected.value = false
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)
    expect(status.text()).toContain('2 cursisten in de room')
    expect(wrapper.text()).toContain('Tweede Cursist')

    connected.value = true
    await flushPromises()
    expect(getParticipants).toHaveBeenCalledTimes(4)

    currentRoom.value = { ...room, status: 'STARTED' }
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(status.text()).toContain('Simulatie gestart')
    expect(getParticipants).toHaveBeenCalledTimes(4)
    expect(unsubscribe).toHaveBeenCalledOnce()
  } finally {
    wrapper.unmount()
    vi.useRealTimers()
  }
})
