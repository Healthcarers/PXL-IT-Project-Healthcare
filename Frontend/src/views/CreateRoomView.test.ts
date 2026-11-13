
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import CreateRoomView from './CreateRoomView.vue'
import { useRoom } from '../composables/useRoom'

const { replaceMock, createRoomMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  createRoomMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock('../composables/useRoom', () => ({
  useRoom: vi.fn(),
}))

describe('CreateRoomView', () => {
  let loading: ReturnType<typeof ref<boolean>>
  let error: ReturnType<typeof ref<string | null>>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    loading = ref(false)
    error = ref<string | null>(null)

    vi.mocked(useRoom).mockReturnValue({
      loading,
      error,
      createRoom: createRoomMock,
    } as unknown as ReturnType<typeof useRoom>)
  })

  function mountView() {
    return mount(CreateRoomView)
  }

  it('toont het formulier om een room aan te maken', () => {
    const wrapper = mountView()

    expect(wrapper.find('h1').text()).toBe('Room aanmaken')
    expect(wrapper.find('#name').exists()).toBe(true)
    expect(wrapper.find('#description').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Room aanmaken')
  })

  it('maakt geen room aan wanneer de naam leeg is', async () => {
    const wrapper = mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createRoomMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('maakt geen room aan wanneer de naam alleen spaties bevat', async () => {
    const wrapper = mountView()

    await wrapper.find('#name').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(createRoomMock).not.toHaveBeenCalled()
  })

  it('maakt een room aan met getrimde invoer', async () => {
    createRoomMock.mockResolvedValue({ code: 'ABC123' })

    const wrapper = mountView()

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

    const wrapper = mountView()

    await wrapper.find('#name').setValue('Testroom')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createRoomMock).toHaveBeenCalledWith({
      name: 'Testroom',
      description: null,
    })
  })

  it('toont een foutmelding wanneer er een fout is', () => {
    error.value = 'De room kon niet worden aangemaakt.'

    const wrapper = mountView()

    expect(wrapper.find('[role="alert"]').text())
      .toBe('De room kon niet worden aangemaakt.')
  })

  it('toont de loading-status en schakelt de knop uit', () => {
    loading.value = true

    const wrapper = mountView()
    const button = wrapper.find('button[type="submit"]')

    expect(button.text()).toBe('Room wordt aangemaakt...')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
  })
})
