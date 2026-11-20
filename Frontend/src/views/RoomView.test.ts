
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import RoomView from './RoomView.vue'
import { useRoom } from '../composables/useRoom'
import { useAuthStore } from '../stores/Authstore'
import type { Room, RoomParticipant } from '../types/room'

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('../composables/useRoom', () => ({
  useRoom: vi.fn(),
}))

vi.mock('../stores/Authstore', () => ({
  useAuthStore: vi.fn(),
}))

const mockRoom: Room = {
  id: 'room-1',
  code: 'ABC123',
  name: 'Testroom',
  description: 'Testbeschrijving',
  createdAt: '2026-11-13T10:00:00',
  status: 'OPEN',
  ownerId: 'host-1',
  participantCount: 2,
}

const host: RoomParticipant = {
  id: 'participant-1',
  userId: 'host-1',
  firstname: 'Ada',
  lastname: 'Lovelace',
  joinedAt: '2026-11-13T10:00:00',
}

const participant: RoomParticipant = {
  id: 'participant-2',
  userId: 'user-2',
  firstname: 'Alan',
  lastname: 'Turing',
  joinedAt: '2026-11-13T10:05:00',
}

describe('RoomView', () => {
  let currentRoom: ReturnType<typeof ref<Room | null>>
  let participants: ReturnType<typeof ref<RoomParticipant[]>>
  let loading: ReturnType<typeof ref<boolean>>
  let error: ReturnType<typeof ref<string | null>>
  let authPerson: { id: string; role: string } | null

  const loadRoomMock = vi.fn()
  const loadParticipantsMock = vi.fn()
  const joinRoomMock = vi.fn()
  const startRoomMock = vi.fn()
  const closeRoomMock = vi.fn()
  const clearRoomMock = vi.fn()
  const isAuthenticatedMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()

    currentRoom = ref<Room | null>(mockRoom)
    participants = ref<RoomParticipant[]>([host, participant])
    loading = ref(false)
    error = ref<string | null>(null)
    authPerson = { id: 'host-1', role: 'LECTOR' }

    loadRoomMock.mockResolvedValue(mockRoom)
    loadParticipantsMock.mockResolvedValue([host, participant])
    joinRoomMock.mockResolvedValue(undefined)
    startRoomMock.mockResolvedValue(undefined)
    closeRoomMock.mockResolvedValue(undefined)
    isAuthenticatedMock.mockResolvedValue(true)

    vi.mocked(useRoom).mockReturnValue({
      currentRoom,
      participants,
      loading,
      error,
      loadRoom: loadRoomMock,
      loadParticipants: loadParticipantsMock,
      joinRoom: joinRoomMock,
      startRoom: startRoomMock,
      closeRoom: closeRoomMock,
      clearRoom: clearRoomMock,
    } as unknown as ReturnType<typeof useRoom>)

    vi.mocked(useAuthStore).mockReturnValue({
      person: authPerson,
      isAuthenticated: isAuthenticatedMock,
    } as unknown as ReturnType<typeof useAuthStore>)
  })

  function mountView(code = 'ABC123') {
    return mount(RoomView, {
      props: { code },
    })
  }

  function findButton(wrapper: ReturnType<typeof mount>, label: string) {
    const button = wrapper.findAll('button').find((button) =>
      button.text().includes(label),
    )

    if (!button) {
      throw new Error(`Knop "${label}" niet gevonden`)
    }

    return button
  }

  it('laadt de room en de deelnemers bij het openen', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(loadRoomMock).toHaveBeenCalledWith('ABC123')
    expect(loadParticipantsMock).toHaveBeenCalledWith('ABC123')

    wrapper.unmount()
  })

  it('toont de roomgegevens en deelnemers', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Testroom')
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('Testbeschrijving')
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('Alan Turing')
    expect(wrapper.text()).toContain('Wacht op deelnemers')

    wrapper.unmount()
  })

  it('herkent de host en toont het hostdashboard', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Jouw room')
    expect(wrapper.text()).toContain('Host dashboard')
    expect(wrapper.text()).toContain('Simulatie starten')
    expect(wrapper.text()).toContain('Room sluiten')

    wrapper.unmount()
  })

  it('start de simulatie wanneer de host op starten klikt', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Simulatie starten').trigger('click')
    await flushPromises()

    expect(startRoomMock).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('laat een cursist deelnemen aan een open room', async () => {
    authPerson = { id: 'user-3', role: 'CURSIST' }

    vi.mocked(useAuthStore).mockReturnValue({
      person: authPerson,
      isAuthenticated: isAuthenticatedMock,
    } as unknown as ReturnType<typeof useAuthStore>)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Gedeelde room')
    expect(wrapper.text()).toContain('Deelnemen aan room')

    await findButton(wrapper, 'Deelnemen aan room').trigger('click')
    await flushPromises()

    expect(joinRoomMock).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('navigeert een cursist naar de monitor als de room gestart is', async () => {
    const startedRoom = {
      ...mockRoom,
      status: 'STARTED' as const,
    }

    currentRoom.value = startedRoom
    loadRoomMock.mockResolvedValue(startedRoom)
    authPerson = { id: 'user-2', role: 'CURSIST' }

    vi.mocked(useAuthStore).mockReturnValue({
      person: authPerson,
      isAuthenticated: isAuthenticatedMock,
    } as unknown as ReturnType<typeof useAuthStore>)

    const wrapper = mountView()
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({ name: 'monitor', query: { code: 'ABC123' } })
    expect(wrapper.text()).toContain('Simulatie gestart')

    wrapper.unmount()
  })

  it('stuurt een wachtende deelnemer via de sluitingsmelding terug naar room joinen', async () => {
    vi.useFakeTimers()
    vi.mocked(useAuthStore).mockReturnValue({
      person: { id: participant.userId, role: 'CURSIST' },
    } as ReturnType<typeof useAuthStore>)
    loadRoomMock.mockResolvedValueOnce(mockRoom).mockResolvedValue({ ...mockRoom, status: 'CLOSED' })
    const wrapper = mountView()
    try {
      await flushPromises()
      await vi.advanceTimersByTimeAsync(2000)

      expect(wrapper.get('dialog').text()).toContain('De room waar je in zat is gesloten')
      expect(replaceMock).not.toHaveBeenCalled()
      await wrapper.get('dialog button').trigger('click')
      expect(clearRoomMock).toHaveBeenCalledOnce()
      await vi.advanceTimersByTimeAsync(5000)
      expect(replaceMock).toHaveBeenCalledExactlyOnceWith({ name: 'home' })
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it('sluit de room niet wanneer de host annuleren kiest', async () => {
    const confirmMock = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', confirmMock)

    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Room sluiten').trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(
      'Ben je zeker dat je deze room wilt sluiten?',
    )
    expect(closeRoomMock).not.toHaveBeenCalled()

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('sluit de room wanneer de host bevestigt', async () => {
    const confirmMock = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirmMock)

    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Room sluiten').trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(
      'Ben je zeker dat je deze room wilt sluiten?',
    )
    expect(closeRoomMock).toHaveBeenCalledOnce()

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('toont een foutmelding wanneer het laden mislukt', async () => {
    error.value = 'Room kon niet worden opgehaald.'

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text())
      .toBe('Room kon niet worden opgehaald.')

    wrapper.unmount()
  })

  it('toont een melding wanneer er geen room beschikbaar is', async () => {
    currentRoom.value = null

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Room niet beschikbaar')

    wrapper.unmount()
  })
})
