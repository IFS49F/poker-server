export type Suit = '♤' | '♧' | '♡' | '♢'
export type Score = number | string | null

export interface Player {
  id: string
  name: string
  suit: Suit
  score: Score
  voted: boolean
}

export interface RoomState {
  team: Player[]
  show: boolean
}

export type ActionType = 'vote' | 'show' | 'clear'

export interface Action {
  type: ActionType
  playerId: string
}

export interface StateUpdatePayload extends RoomState {
  action?: Action
}

export interface ServerToClientEvents {
  stateUpdate: (state: StateUpdatePayload, isClearAction?: boolean) => void
}

export interface ClientToServerEvents {
  join: (room: string) => void
  play: (player: string | { name: string; suit?: string }) => void
  vote: (score: string) => void
  show: () => void
  clear: () => void
}
