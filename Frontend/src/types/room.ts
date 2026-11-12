
export type RoomStatus = 'OPEN' | 'STARTED' | 'CLOSED'

export interface Room {
  id: string
  code: string
  name: string
  description: string | null
  createdAt: string
  status: RoomStatus
  ownerId: string
  participantCount: number
}

export interface RoomParticipant {
  id: string
  userId: string
  joinedAt: string
}

export interface CreateRoomRequest {
  name: string
  description: string | null
}
