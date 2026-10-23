import { apiRequest } from './api'
import type { Room, CreateRoomRequest } from '../types/room'

export const roomService = {
  create(data: CreateRoomRequest): Promise<Room> {
    return apiRequest<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getByCode(code: string): Promise<Room> {
    return apiRequest<Room>(`/rooms/${encodeURIComponent(code)}`)
  },

  close(code: string): Promise<Room> {
    return apiRequest<Room>(
      `/rooms/${encodeURIComponent(code)}/close`,
      {
        method: 'PATCH',
      },
    )
  },
}