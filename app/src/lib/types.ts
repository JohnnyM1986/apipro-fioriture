import type { PhaseCode } from '../data/catalog'

export type LocationSource = 'gps' | 'map' | 'search' | 'site'

export interface Site {
  id: string
  name: string
  lat: number
  lon: number
  created_at: string
}

export interface Observation {
  id: string
  participant_id: string
  site_id: string | null
  species_id: string
  phase_code: PhaseCode
  observed_on: string // YYYY-MM-DD
  created_at: string
  updated_at: string
  lat: number
  lon: number
  location_source: LocationSource | null
  photo_url: string | null
  note: string | null
  qc_flags: string[]
}

export type ObservationInput = Omit<Observation, 'id' | 'participant_id' | 'created_at' | 'updated_at' | 'qc_flags' | 'photo_url'> & {
  photo?: Blob | null
  keep_photo_url?: string | null
}
