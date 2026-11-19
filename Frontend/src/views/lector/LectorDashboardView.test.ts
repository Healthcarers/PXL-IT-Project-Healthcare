// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LectorDashboardView from './LectorDashboardView.vue'
import router from '../../router/index.ts'
import api from '../../services/refreshService.ts'
import { useRoom } from '../../composables/useRoom'
import { useHeartbeatSound } from '../../composables/useHeartbeatSound'
import { useAuthStore } from '../../stores/Authstore'
import type { Room, RoomParticipant } from '../../types/room'

const {
  pushMock,
  loadRoomMock,
  loadParticipantsMock,
  closeRoomMock,
  subscribeTopicMock,
  heartbeatSoundMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loadRoomMock: vi.fn(),
  loadParticipantsMock: vi.fn(),
  closeRoomMock: vi.fn(),
  subscribeTopicMock: vi.fn(() => vi.fn()),
  heartbeatSoundMock: vi.fn(),
}))

vi.mock('../../config/api', () => ({
  API_BASE_URL: 'http://localhost:8090/api',
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
    }),
  }
})

vi.mock('../../composables/useRoom', () => ({
  useRoom: vi.fn(),
}))

vi.mock('../../composables/useHeartbeatSound.ts', () => ({
  useHeartbeatSound: heartbeatSoundMock,
}))

vi.mock('../../services/stompClient', () => ({
  connected: ref(true),
  subscribeTopic: subscribeTopicMock,
}))

vi.mock('../../services/stompClient.ts', () => ({
  connected: ref(true),
  subscribeTopic: subscribeTopicMock,
}))

vi.mock('vue-chartjs', () => ({
  Line: defineComponent({
    name: 'MockLine',
    setup() {
      return () => h('canvas', { 'data-testid': 'mock-waveform-canvas' })
    },
  }),
}))

describe('LectorDashboardView.vue', () => {
  let currentRoom: ReturnType<typeof ref<Room | null>>
  let participants: ReturnType<typeof ref<RoomParticipant[]>>
  let loading: ReturnType<typeof ref<boolean>>
  let error: ReturnType<typeof ref<string | null>>

  const startedRoom: Room = {
    id: 'room-1',
    code: '48K7QX',
    name: 'Reanimatie 2B',
    description: null,
    createdAt: '2026-01-01T10:00:00Z',
    status: 'STARTED',
    ownerId: 'lector-1',
    participantCount: 4,
  }

  const roomParticipants: RoomParticipant[] = [
    {
      id: 'p-host',
      userId: 'lector-1',
      firstname: 'Inge',
      lastname: 'Maes',
      joinedAt: '2026-01-01T10:00:00Z',
    },
    {
      id: 'p-1',
      userId: 'cursist-1',
      firstname: 'Jan',
      lastname: 'Peeters',
      joinedAt: '2026-01-01T10:01:00Z',
    },
    {
      id: 'p-2',
      userId: 'cursist-2',
      firstname: 'Lotte',
      lastname: 'Janssens',
      joinedAt: '2026-01-01T10:02:00Z',
    },
    {
      id: 'p-3',
      userId: 'cursist-3',
      firstname: 'Bram',
      lastname: 'Willems',
      joinedAt: '2026-01-01T10:03:00Z',
    },
  ]

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

    currentRoom = ref<Room | null>(startedRoom)
    participants = ref<RoomParticipant[]>(roomParticipants)
    loading = ref(false)
    error = ref<string | null>(null)

    loadRoomMock.mockResolvedValue(startedRoom)
    loadParticipantsMock.mockResolvedValue(roomParticipants)
    closeRoomMock.mockResolvedValue({ ...startedRoom, status: 'CLOSED' })

    vi.mocked(useRoom).mockReturnValue({
      currentRoom,
      participants,
      loading,
      error,
      loadRoom: loadRoomMock,
      loadParticipants: loadParticipantsMock,
      closeRoom: closeRoomMock,
    } as unknown as ReturnType<typeof useRoom>)

    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/vitals') {
        return Promise.resolve({
          data: {
            heartRate: 75,
            spo2: 98,
            etco2: 38,
            respRate: 15,
            ampScale: 1.0,
            sysIbp: 120,
            diasIbp: 80,
          },
        })
      }
      return Promise.reject(new Error('Unexpected GET ' + url))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountDashboard() {
    return mount(LectorDashboardView, {
      props: { code: '48K7QX' },
    })
  }

  it('toont roomcode, lector, cursistenaantal, live preview zonder audio en geen prototype-knop', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    const headerText = wrapper.get('header').text()
    expect(headerText).toContain('Room 48K7QX')
    expect(headerText).toContain('Lector: Inge Maes')
    expect(headerText).toContain('3 cursisten verbonden')
    expect(headerText).not.toContain('Helderheid')
    expect(headerText).toContain('Room sluiten')
    expect(headerText).toContain('Profiel')

    expect(wrapper.text()).toContain('Wat de cursist ziet')
    expect(wrapper.text()).toContain('LIVE')
    expect(wrapper.findAll('[data-testid="mock-waveform-canvas"]')).toHaveLength(4)
    expect(useHeartbeatSound).not.toHaveBeenCalled()

    expect(wrapper.text()).not.toContain('PROTOTYPE: TOON FOUTMELDING')
    expect(wrapper.text()).not.toContain('Waarde buiten bereik')

    wrapper.unmount()
  })

  it('klapt het cursistscherm in en uit via Inklappen en Cursistscherm tonen', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    const collapseBtn = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Inklappen'))
    expect(collapseBtn).toBeDefined()

    await collapseBtn!.trigger('click')
    expect(wrapper.text()).not.toContain('Wat de cursist ziet')
    expect(wrapper.text()).toContain('Cursistscherm tonen')

    const expandBtn = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Cursistscherm tonen'))
    await expandBtn!.trigger('click')
    expect(wrapper.text()).toContain('Wat de cursist ziet')

    wrapper.unmount()
  })

  it('ondersteunt lokale parameterinteractie zonder PATCH /vitals te sturen', async () => {
    const patchSpy = vi.spyOn(api, 'patch')
    const wrapper = mountDashboard()
    await flushPromises()

    // HF +1
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('75')
    await wrapper.get('button[aria-label="Hartfrequentie verhogen"]').trigger('click')
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('76')

    // Bloeddruk wisselen tussen systolisch en diastolisch
    expect(wrapper.get('[data-testid="bp-systolic"]').text()).toBe('120')
    expect(wrapper.get('[data-testid="bp-diastolic"]').text()).toBe('80')
    await wrapper.get('[data-testid="bp-diastolic"]').trigger('click')
    await wrapper.get('button[aria-label="Bloeddruk verhogen"]').trigger('click')
    expect(wrapper.get('[data-testid="bp-diastolic"]').text()).toBe('81')

    // etCO2 -> AF schakelaar
    expect(wrapper.get('[data-testid="capno-resp-value"]').text()).toBe('38')
    const afRadio = wrapper
      .findAll('button[role="radio"]')
      .find((btn) => btn.text().includes('AF'))
    await afRadio!.trigger('click')
    expect(wrapper.get('[data-testid="capno-resp-value"]').text()).toBe('16')
    expect(wrapper.text()).toContain('bereik 2–40 /min')

    // Temperatuur +0,1 °C
    expect(wrapper.get('[data-testid="temp-value"]').text()).toBe('36,8')
    await wrapper.get('button[aria-label="Temperatuur verhogen"]').trigger('click')
    expect(wrapper.get('[data-testid="temp-value"]').text()).toBe('36,9')

    // Ritme dropdown
    const rhythmBtn = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Ritme: Sinusritme'))
    await rhythmBtn!.trigger('click')
    const afibOption = wrapper
      .findAll('button[role="option"]')
      .find((btn) => btn.text().includes('Atriumfibrillatie'))
    await afibOption!.trigger('click')
    expect(wrapper.text()).toContain('Ritme: Atriumfibrillatie')

    expect(patchSpy).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('toont de foutmelding en rode rand zonder de limiet te overschrijden en wist die bij een geldige aanpassing', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[data-testid="parameter-range-alert"]').exists()).toBe(false)

    // Zet HF eerst via de slider op 200 (End-toets) en klik daarna op + -> blijft op 200 maar toont waarschuwing
    const hfSlider = wrapper.get('[aria-label="Hartfrequentie regelaar"]')
    await hfSlider.trigger('keydown', { key: 'End' })
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('200')
    expect(wrapper.find('[data-testid="parameter-range-alert"]').exists()).toBe(false)

    await wrapper.get('button[aria-label="Hartfrequentie verhogen"]').trigger('click')
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('200')

    const alert = wrapper.get('[data-testid="parameter-range-alert"]')
    expect(alert.text()).toContain(
      'De hartslag moet tussen 20 en 200 bpm liggen. De waarde is niet doorgestuurd naar de cursisten.',
    )

    const hfCard = wrapper.get('article[aria-label="Hartfrequentie"]')
    expect(hfCard.classes()).toContain('border-[#ef4444]')
    expect(hfCard.text()).toContain('buiten bereik 20–200')

    // Geldige verlaging naar 199 -> foutmelding en rode rand verdwijnen
    await wrapper.get('button[aria-label="Hartfrequentie verlagen"]').trigger('click')
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('199')
    expect(wrapper.find('[data-testid="parameter-range-alert"]').exists()).toBe(false)
    expect(hfCard.classes()).not.toContain('border-[#ef4444]')
    expect(hfCard.text()).toContain('bereik 20–200 bpm')

    // Ondergrens testen: zet op 20 (Home) en klik - -> blijft op 20 en toont waarschuwing
    await hfSlider.trigger('keydown', { key: 'Home' })
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('20')
    await wrapper.get('button[aria-label="Hartfrequentie verlagen"]').trigger('click')
    expect(wrapper.get('[data-testid="hf-value"]').text()).toBe('20')
    expect(wrapper.find('[data-testid="parameter-range-alert"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('opent het Profiel-menu en de Uitloggen-bevestigingsmodal', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    const profileBtn = wrapper
      .findAll('header button')
      .find((btn) => btn.text().includes('Profiel'))
    await profileBtn!.trigger('click')
    expect(wrapper.text()).toContain('Mijn account')

    await wrapper.get('button[role="menuitem"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Uitloggen?')
    expect(dialog.text()).toContain('Weet je zeker dat je wilt uitloggen?')

    // Annuleren sluit de modal
    await dialog
      .findAll('button')
      .find((btn) => btn.text().trim() === 'Annuleren')!
      .trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    // Bevestigen toont tijdelijke melding
    await profileBtn!.trigger('click')
    await wrapper.get('button[role="menuitem"]').trigger('click')
    await wrapper
      .get('[role="dialog"]')
      .findAll('button')
      .find((btn) => btn.text().trim() === 'Uitloggen')!
      .trigger('click')

    expect(wrapper.get('[role="status"]').text()).toContain('Uitlogfunctionaliteit')

    wrapper.unmount()
  })

  it('sluit de room na bevestiging en navigeert terug naar /rooms/new', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    const closeBtn = wrapper
      .findAll('header button')
      .find((btn) => btn.text().trim() === 'Room sluiten')
    await closeBtn!.trigger('click')

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Room sluiten?')

    await dialog
      .findAll('button')
      .find((btn) => btn.text().trim() === 'Room sluiten')!
      .trigger('click')
    await flushPromises()

    expect(closeRoomMock).toHaveBeenCalledOnce()
    expect(pushMock).toHaveBeenCalledWith({ name: 'create-room' })

    wrapper.unmount()
  })

  it('beveiligt de /host/rooms/:code/dashboard route voor alleen de LECTOR-rol', async () => {
    const lectorRoute = router
      .getRoutes()
      .find((r) => r.name === 'lector-dashboard')
    expect(lectorRoute).toBeDefined()
    expect(lectorRoute?.meta).toEqual({ requiresAuth: true, role: 'LECTOR' })

    const store = useAuthStore()

    const authSpy = vi
      .spyOn(store, 'isAuthenticated')
      .mockRejectedValue(new Error('Not authenticated'))
    await router.push('/host/rooms/48K7QX/dashboard')
    expect(router.currentRoute.value.name).toBe('login')

    authSpy.mockResolvedValue({
      id: 'cursist-1',
      firstname: 'Test',
      lastname: 'Cursist',
      role: 'CURSIST',
    })
    await router.push('/host/rooms/48K7QX/dashboard')
    expect(router.currentRoute.value.name).toBe('unauthorized')

    authSpy.mockResolvedValue({
      id: 'lector-1',
      firstname: 'Inge',
      lastname: 'Maes',
      role: 'LECTOR',
    })
    await router.push('/host/rooms/48K7QX/dashboard')
    expect(router.currentRoute.value.name).toBe('lector-dashboard')
  })
})
