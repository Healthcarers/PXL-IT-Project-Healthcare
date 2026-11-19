
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import CreateRoomView from './CreateRoomView.vue'
import { useRoom } from '../composables/useRoom'

const { replaceMock, createRoomMock, getActiveMock, getByCodeMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  createRoomMock: vi.fn(),
  getActiveMock: vi.fn(),
  getByCodeMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock('../composables/useRoom', () => ({
  useRoom: vi.fn(),
}))

vi.mock('../services/roomService', () => ({
  roomService: { getActive: getActiveMock, getByCode: getByCodeMock },
}))

describe('CreateRoomView', () => {
  let loading: ReturnType<typeof ref<boolean>>
  let error: ReturnType<typeof ref<string | null>>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    getActiveMock.mockResolvedValue(undefined)

    loading = ref(false)
    error = ref<string | null>(null)

    vi.mocked(useRoom).mockReturnValue({
      loading,
      error,
      createRoom: createRoomMock,
    } as unknown as ReturnType<typeof useRoom>)
  })

  async function mountView() {
    const wrapper = mount(CreateRoomView)
    await flushPromises()
    return wrapper
  }

  it('toont het formulier als er geen actieve room is', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('h1').text()).toBe('Room aanmaken')
    expect(wrapper.find('#name').exists()).toBe(true)
    expect(wrapper.find('#description').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Room aanmaken')
  })

  it.each([
    ['OPEN', 'host-dashboard'],
    ['STARTED', 'lector-dashboard'],
  ])('hervat een room met status %s op %s', async (status, routeName) => {
    getActiveMock.mockResolvedValue({ code: 'ABC123' })
    getByCodeMock.mockResolvedValue({ code: 'ABC123', status })
    const wrapper = await mountView()

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith({
      name: routeName, params: { code: 'ABC123' },
    })
    expect(createRoomMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('toont geen aanmaakformulier bij een fout en laat opnieuw proberen', async () => {
    getActiveMock.mockRejectedValueOnce(new Error('API niet bereikbaar'))
    const wrapper = await mountView()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('kon niet worden geopend')
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
    expect(createRoomMock).not.toHaveBeenCalled()
  })

  it('maakt geen room aan wanneer de naam leeg is', async () => {
    const wrapper = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createRoomMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('maakt geen room aan wanneer de naam alleen spaties bevat', async () => {
    const wrapper = await mountView()

    await wrapper.find('#name').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(createRoomMock).not.toHaveBeenCalled()
  })

  it('maakt een room aan met getrimde invoer', async () => {
    createRoomMock.mockResolvedValue({ code: 'ABC123' })

    const wrapper = await mountView()

    await wrapper.find('#name').setValue('  Testroom  ')
    await wrapper.find('#description').setValue('  Testbeschrijving  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createRoomMock).toHaveBeenCalledWith({
      name: 'Testroom',
      description: 'Testbeschrijving',
    })

    expect(replaceMock).toHaveBeenCalledWith({
      name: 'host-dashboard',
      params: { code: 'ABC123' },
    })
  })

  it('stuurt null als beschrijving wanneer deze leeg is', async () => {
    createRoomMock.mockResolvedValue({ code: 'XYZ789' })

    const wrapper = await mountView()

    await wrapper.find('#name').setValue('Testroom')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createRoomMock).toHaveBeenCalledWith({
      name: 'Testroom',
      description: null,
    })
  })

  it('toont een foutmelding wanneer er een fout is', async () => {
    error.value = 'De room kon niet worden aangemaakt.'

    const wrapper = await mountView()

    expect(wrapper.find('[role="alert"]').text())
      .toBe('De room kon niet worden aangemaakt.')
  })

  it('toont de loading-status en schakelt de knop uit', async () => {
    loading.value = true

    const wrapper = await mountView()
    const button = wrapper.find('button[type="submit"]')

    expect(button.text()).toBe('Room wordt aangemaakt...')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
  })
})
