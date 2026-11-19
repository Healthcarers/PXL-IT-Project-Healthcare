
import { apiRequest } from './api'
import type {
  Room,
  RoomParticipant,
  RoomScenario,
  CreateRoomRequest,
} from '../types/room'

export const roomService = {
  getActive(signal: AbortSignal): Promise<Pick<Room, 'code'> | undefined> {
    return apiRequest<Pick<Room, 'code'> | undefined>('/rooms/mine/active', { signal })
  },

  async create(data: CreateRoomRequest): Promise<Room> {
    const createdRoom = await apiRequest<{ code: string }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    return this.getByCode(createdRoom.code)
  },

  getByCode(code: string): Promise<Room> {
    return apiRequest<Room>(`/rooms/${encodeURIComponent(code)}`)
  },

  getScenario(code: string): Promise<RoomScenario | undefined> {
    return apiRequest<RoomScenario | undefined>(`/rooms/${encodeURIComponent(code)}/scenario`)
  },

  assignScenario(code: string, scenarioId: string | null): Promise<RoomScenario | undefined> {
    return apiRequest<RoomScenario | undefined>(`/rooms/${encodeURIComponent(code)}/scenario`, {
      method: 'PUT',
      body: JSON.stringify({ scenarioId }),
    })
  },

  async close(code: string): Promise<Room> {
    await apiRequest<unknown>(
      `/rooms/${encodeURIComponent(code)}/close`,
      { method: 'PATCH' },
    )

    return this.getByCode(code)
  },

  join(code: string): Promise<RoomParticipant> {
    return apiRequest<RoomParticipant>(
      `/rooms/${encodeURIComponent(code)}/join`,
      { method: 'POST' },
    )
  },

  getParticipants(code: string): Promise<RoomParticipant[]> {
    return apiRequest<RoomParticipant[]>(
      `/rooms/${encodeURIComponent(code)}/members`,
    )
  },

  async start(code: string): Promise<Room> {
    await apiRequest<unknown>(
      `/rooms/${encodeURIComponent(code)}/start`,
      { method: 'POST' },
    )

    return this.getByCode(code)
  },
}
