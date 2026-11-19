// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HostDashboardView from './HostDashboardView.vue'
import { useRoom } from '../composables/useRoom'
import { useAuthStore } from '../stores/Authstore'
import type { Room, RoomParticipant } from '../types/room'

const { pushMock, replaceMock, loadRoomMock, loadParticipantsMock, startRoomMock, closeRoomMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    replaceMock: vi.fn(),
    loadRoomMock: vi.fn(),
    loadParticipantsMock: vi.fn(),
    startRoomMock: vi.fn(),
    closeRoomMock: vi.fn(),
  }))

vi.mock('../config/api', () => ({
  API_BASE_URL: 'http://localhost:8090/api',
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
  }
})

vi.mock('../composables/useRoom', () => ({
  useRoom: vi.fn(),
}))

describe('HostDashboardView.vue', () => {
  let currentRoom: ReturnType<typeof ref<Room | null>>
  let participants: ReturnType<typeof ref<RoomParticipant[]>>
  let loading: ReturnType<typeof ref<boolean>>
  let error: ReturnType<typeof ref<string | null>>

  const baseRoom: Room = {
    id: 'room-1',
    code: '48K7QX',
    name: 'Reanimatie 2B',
    description: 'Start de simulatie',
    createdAt: '2026-01-01T10:00:00Z',
    status: 'OPEN',
    ownerId: 'lector-1',
    participantCount: 2,
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    const authStore = useAuthStore()
    authStore.person = {
      id: 'lector-1',
      firstname: 'Inge',
      lastname: 'Maes',
      role: 'LECTOR',
    }

    currentRoom = ref<Room | null>(baseRoom)
    participants = ref<RoomParticipant[]>([
      {
        id: 'p-1',
        userId: 'lector-1',
        firstname: 'Inge',
        lastname: 'Maes',
        joinedAt: '2026-01-01T10:00:00Z',
      },
    ])
    loading = ref(false)
    error = ref<string | null>(null)

    loadRoomMock.mockResolvedValue(baseRoom)
    loadParticipantsMock.mockResolvedValue(participants.value)
    startRoomMock.mockResolvedValue({ ...baseRoom, status: 'STARTED' })

    vi.mocked(useRoom).mockReturnValue({
      currentRoom,
      participants,
      loading,
      error,
      loadRoom: loadRoomMock,
      loadParticipants: loadParticipantsMock,
      startRoom: startRoomMock,
      closeRoom: closeRoomMock,
    } as unknown as ReturnType<typeof useRoom>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('navigeert naar het lectordashboard nadat de simulatie wordt gestart', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))

    const wrapper = mount(HostDashboardView, {
      props: { code: '48K7QX' },
    })
    await flushPromises()

    const startButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Simulatie starten'))
    expect(startButton).toBeDefined()

    await startButton!.trigger('click')
    await flushPromises()

    expect(startRoomMock).toHaveBeenCalledOnce()
    expect(pushMock).toHaveBeenCalledWith({
      name: 'lector-dashboard',
      params: { code: '48K7QX' },
    })
  })

  it('stuurt de host direct door naar het lectordashboard wanneer de room al gestart is', async () => {
    currentRoom.value = { ...baseRoom, status: 'STARTED' }
    loadRoomMock.mockResolvedValue(currentRoom.value)

    mount(HostDashboardView, {
      props: { code: '48K7QX' },
    })
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith({
      name: 'lector-dashboard',
      params: { code: '48K7QX' },
    })
  })
})
