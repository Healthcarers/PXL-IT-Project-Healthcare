export type RoomStatus = 'OPEN' | 'CLOSED'

export interface Room {
  id: string
  code: string
  name: string
  description: string | null
  createdAt: string
  status: RoomStatus
}

export interface CreateRoomRequest {
  name: string
  description: string | null
}