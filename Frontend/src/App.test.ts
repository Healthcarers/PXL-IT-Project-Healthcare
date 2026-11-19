import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import router from './router'

const auth = vi.hoisted(() => ({
  person: null as { role: 'LECTOR' | 'CURSIST' } | null,
  isAuthenticated: vi.fn(),
}))
const rooms = vi.hoisted(() => ({ getActive: vi.fn(), create: vi.fn() }))
const scenarios = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn() }))
const published = {
  id: 'scenario-1', name: 'Monitorsimulatie', status: 'PUBLISHED',
  initialVitals: { heartRate: 105, spo2: 98, respRate: 15, sysBloodPressure: 120, diasBloodPressure: 80 },
}

vi.mock('./stores/Authstore', () => ({ useAuthStore: () => auth }))
vi.mock('./services/roomService', () => ({ roomService: rooms }))
vi.mock('./services/scenarioService', () => ({ scenarioService: scenarios }))
vi.mock('./views/HostDashboardView.vue', () => ({
  default: { props: ['code'], template: '<h1>Hostdashboard {{ code }}</h1>' },
}))

describe('Scenario navigation', () => {
  it('opent eerst het overzicht en pas na Scenario toevoegen het formulier', async () => {
    auth.person = { role: 'LECTOR' }
    auth.isAuthenticated.mockResolvedValue(auth.person)
    scenarios.list.mockResolvedValue([published])
    await router.push('/host/rooms/ABC123')
    const wrapper = mount(App, { global: { plugins: [router] } })

    const link = wrapper.get('nav a[href="/scenarios"]')
    expect(link.text()).toBe("Scenario's")
    await link.trigger('click')
    await vi.waitFor(() => expect(wrapper.get('h1').text()).toBe('Scenario’s beheren'))
    expect(wrapper.text()).toContain('Monitorsimulatie')
    expect(wrapper.text()).toContain('Gepubliceerd')
    expect(wrapper.find('#scenario-name').exists()).toBe(false)

    await wrapper.get('a[href="/scenarios/new"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('h1').text()).toBe('Scenario toevoegen'))
    expect(wrapper.find('#scenario-name').exists()).toBe(true)
    expect(link.classes()).toContain('app-nav-link-active')

    await wrapper.get('main a[href="/scenarios"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('h1').text()).toBe('Scenario’s beheren'))
    wrapper.unmount()
  })

  it('verwijdert een opgeslagen scenario vanuit het overzicht na bevestiging', async () => {
    auth.person = { role: 'LECTOR' }
    auth.isAuthenticated.mockResolvedValue(auth.person)
    scenarios.list.mockResolvedValue([published])
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    await router.push('/scenarios')
    const wrapper = mount(App, { global: { plugins: [router] } })
    try {
      await flushPromises()
      const remove = wrapper.get('[aria-label="Verwijder scenario: Monitorsimulatie"]')
      await remove.trigger('click')
      expect(scenarios.remove).not.toHaveBeenCalled()
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('alle bijbehorende beoordelingen'))
      await remove.trigger('click')
      await flushPromises()
      expect(scenarios.remove).toHaveBeenCalledExactlyOnceWith(published.id)
      expect(wrapper.text()).not.toContain('Monitorsimulatie')
      expect(wrapper.get('[role="status"]').text()).toBe('Scenario verwijderd.')
    } finally {
      vi.unstubAllGlobals()
      wrapper.unmount()
    }
  })

  it('hides the link and blocks direct navigation for a cursist', async () => {
    auth.person = { role: 'CURSIST' }
    auth.isAuthenticated.mockResolvedValue(auth.person)
    await router.push('/')
    const wrapper = mount(App, { global: { plugins: [router], stubs: { RouterView: true } } })

    expect(wrapper.find('a[href="/scenarios"]').exists()).toBe(false)
    for (const path of ['/scenarios', '/scenarios/new', '/scenarios/scenario-1']) {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('unauthorized')
    }
    wrapper.unmount()
  })

  it('toont voor een cursist alleen Room joinen en navigeert vanuit een room terug naar de startpagina', async () => {
    auth.person = { role: 'CURSIST' }
    auth.isAuthenticated.mockResolvedValue(auth.person)
    await router.push('/rooms/ABC123')
    const wrapper = mount(App, { global: { plugins: [router], stubs: { RouterView: true } } })

    const nav = wrapper.get('nav[aria-label="Cursistnavigatie"]')
    expect(nav.findAll('a').map(link => link.text())).toEqual(['Room joinen'])
    expect(wrapper.get('header').text()).toContain('Cursist')
    expect(wrapper.get('header').text()).not.toContain('Lector')
    await nav.get('a').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('home'))
    expect(nav.get('a').attributes('aria-current')).toBe('page')
    wrapper.unmount()
  })

  it('keert via Room aanmaken vanuit Scenario’s terug naar dezelfde actieve room', async () => {
    auth.person = { role: 'LECTOR' }
    auth.isAuthenticated.mockResolvedValue(auth.person)
    rooms.getActive.mockResolvedValue({ code: 'ABC123' })
    await router.push('/host/rooms/ABC123')
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })

    await wrapper.get('nav a[href="/scenarios"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('scenarios'))
    await wrapper.get('nav a[href="/rooms/new"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('h1').text()).toBe('Hostdashboard ABC123'))

    expect(router.currentRoute.value.fullPath).toBe('/host/rooms/ABC123')
    expect(rooms.create).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
