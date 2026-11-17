
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomeView from './HomeView.vue'

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

describe('HomeView.vue', () => {
  beforeEach(() => {
    push.mockReset()
  })

  it('toont de titel en het roomcodeformulier', () => {
    const wrapper = mount(HomeView)

    expect(wrapper.get('h1').text()).toBe('Healthcare Simulator')
    expect(wrapper.find('#code').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').text()).toBe('Room openen')
  })

  it('toont een foutmelding wanneer de roomcode leeg is', async () => {
    const wrapper = mount(HomeView)

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Vul een roomcode in.',
    )
    expect(push).not.toHaveBeenCalled()
  })

  it('navigeert naar de room met een geldige roomcode', async () => {
    const wrapper = mount(HomeView)

    await wrapper.get('#code').setValue('abc123')
    await wrapper.get('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({
      name: 'room',
      params: { code: 'ABC123' },
    })
  })

  it('verwijdert spaties rond de roomcode', async () => {
    const wrapper = mount(HomeView)

    await wrapper.get('#code').setValue('  abc123  ')
    await wrapper.get('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({
      name: 'room',
      params: { code: 'ABC123' },
    })
  })
})
