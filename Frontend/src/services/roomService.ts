
import { apiRequest } from './api'
import type {
  Room,
  RoomParticipant,
  CreateRoomRequest,
} from '../types/room'

export const roomService = {
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
