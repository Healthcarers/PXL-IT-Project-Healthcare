import { computed, inject, provide, toValue, type ComputedRef, type InjectionKey, type MaybeRefOrGetter } from 'vue'

const monitorRoom: InjectionKey<ComputedRef<string | undefined>> = Symbol('monitor-room')

export function provideMonitorRoom(code: MaybeRefOrGetter<string>) {
  provide(monitorRoom, computed(() => toValue(code).toUpperCase()))
}

export function useMonitorRoom() {
  return inject(monitorRoom, computed(() => undefined))
}

export function monitorTopic(code: string | undefined, topic: string) {
  return code ? `/topic/rooms/${code}/${topic}` : `/topic/${topic}`
}
