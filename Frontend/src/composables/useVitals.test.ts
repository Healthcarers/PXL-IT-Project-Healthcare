// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { provideMonitorRoom } from './useMonitorRoom'
import { useVitals, type VitalsResponse } from './useVitals'
import api from '../services/refreshService'
import { subscribeTopic } from '../services/stompClient'

vi.mock('../services/refreshService', () => ({ default: { get: vi.fn() } }))
vi.mock('../services/stompClient', () => ({ connected: ref(true), subscribeTopic: vi.fn() }))
const first: VitalsResponse = { heartRate: 132.5, spo2: 89, respRate: 26, etco2: 48, ampScale: 1.4, sysIbp: 275, diasIbp: 160 }
const second: VitalsResponse = { ...first, heartRate: 75, sysIbp: 120, diasIbp: 80 }
const listeners = new Map<string, (vitals: VitalsResponse) => void>()
const cleanup = vi.fn()
const wrappers: ReturnType<typeof mount>[] = []
const Consumer = defineComponent({
  setup() {
    const { vitals } = useVitals()
    return () => h('output', JSON.stringify(vitals.value))
  },
})
function monitor(code: string) {
  const wrapper = mount(defineComponent({
    props: { code: { type: String, required: true } },
    setup(props) {
      provideMonitorRoom(() => props.code)
      return () => h(Consumer)
    },
  }), { props: { code } })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.clearAllMocks()
  listeners.clear()
  vi.mocked(subscribeTopic).mockImplementation((topic, handler) => {
    listeners.set(topic, handler)
    return cleanup
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
})

it('keeps all exact scenario values isolated between room monitors', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ data: second })
  const a = monitor('abc123')
  const b = monitor('DEF456')
  await flushPromises()
  expect(api.get).toHaveBeenCalledWith('/rooms/ABC123/vitals')
  expect(JSON.parse(a.text())).toEqual(first)
  expect(JSON.parse(b.text())).toEqual(second)
  listeners.get('/topic/rooms/ABC123/vitals')!({ ...first, heartRate: 40 })
  await nextTick()
  expect(JSON.parse(a.text()).heartRate).toBe(40)
  expect(JSON.parse(b.text()).heartRate).toBe(75)
})

it('ignores a stale fetch after a live update and cleans subscriptions on room switches', async () => {
  let resolve!: (response: { data: VitalsResponse }) => void
  vi.mocked(api.get).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    .mockResolvedValueOnce({ data: second })
  const wrapper = monitor('ABC123')
  const oldListener = listeners.get('/topic/rooms/ABC123/vitals')!
  oldListener(first)
  resolve({ data: second })
  await flushPromises()
  expect(JSON.parse(wrapper.text())).toEqual(first)
  await wrapper.setProps({ code: 'DEF456' })
  await flushPromises()
  expect(cleanup).toHaveBeenCalledOnce()
  oldListener(first)
  await nextTick()
  expect(JSON.parse(wrapper.text())).toEqual(second)
  wrapper.unmount()
  expect(cleanup).toHaveBeenCalledTimes(2)
})
