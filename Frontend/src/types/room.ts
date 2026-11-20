
import type { VitalsResponse } from '../composables/useVitals'

export type RoomStatus = 'OPEN' | 'STARTED' | 'CLOSED'

export interface RoomScenario {
  id: string
  name: string
  initialVitals: VitalsResponse
}

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
  firstname: string
  lastname: string
  joinedAt: string
}

export interface CreateRoomRequest {
  name: string
  description: string | null
}
