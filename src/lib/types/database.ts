export type GameType = 'ongeki' | 'chunithm' | 'maimai'
export type TournamentStatus = 'upcoming' | 'active' | 'ended'
export type SubmissionMethod = 'bookmarklet' | 'image' | 'both'
export type Difficulty = 'basic' | 'advanced' | 'expert' | 'master' | 'ultima' | 'world_end'
export type ScoreStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  display_name: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  deleted_at: string | null
}

export interface Song {
  id: string
  game_type: GameType
  title: string
  artist: string | null
  difficulty: Difficulty
  level: number
  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  organizer_id: string
  title: string
  description: string | null
  game_type: GameType
  submission_method: SubmissionMethod
  start_at: string
  end_at: string
  is_public: boolean
  rules: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TournamentSong {
  id: string
  tournament_id: string
  song_id: string
  created_at: string
}

export interface Participant {
  id: string
  tournament_id: string
  user_id: string
  joined_at: string
}

export interface Score {
  id: string
  tournament_id: string
  user_id: string
  song_id: string
  score: number
  status: ScoreStatus
  image_url: string | null
  submitted_via: string
  submitted_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface Notification {
  id: string
  user_id: string
  message: string
  is_read: boolean
  created_at: string
  tournament_id?: string | null
  link_url?: string | null
}
