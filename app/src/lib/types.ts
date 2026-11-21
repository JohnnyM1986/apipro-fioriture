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

// ---- Altre segnalazioni (release 0.4) ----
export type EventType = 'sciame' | 'moria' | 'vespa_velutina' | 'altro'

export interface GenericEvent {
  id: string
  participant_id: string
  event_type: EventType
  observed_on: string // YYYY-MM-DD
  lat: number
  lon: number
  location_source: LocationSource | null
  note: string | null
  created_at: string
}
export type EventInput = Pick<GenericEvent, 'event_type' | 'observed_on' | 'lat' | 'lon' | 'location_source' | 'note'>

// ---- Forza degli alveari (metodo dei sesti, valutazione a vista) ----
/** 6 valori 0–6 per lato; sesti numerati per righe: 1 2 3 in alto, 4 5 6 in basso. */
export type SideScores = number[]
export interface Comb { n: number; a: SideScores | null; b: SideScores | null }

export interface StrengthVisit {
  id: string
  visited_on: string
  site_id: string | null
  site_name: string | null
  lat: number
  lon: number
  hive_label: string
  combs: Comb[]
  note: string | null
  created_at: string
}
export type StrengthVisitInput = Omit<StrengthVisit, 'id' | 'created_at'> & { id?: string }

export interface StrengthStatus {
  beekeeperName: string | null
  active: boolean
  pending: boolean
}
export interface AccessRequestInput {
  full_name: string
  email: string
  phone: string | null
  farm: string | null
  municipality: string
}
export interface AccessRequest extends AccessRequestInput {
  id: string
  status: 'in_attesa' | 'approvata' | 'rifiutata'
  created_at: string
}
export interface Beekeeper {
  id: string
  full_name: string
  email: string
  phone: string | null
  farm: string | null
  municipality: string | null
  code: string
  active: boolean
  trained_on: string | null
  protocol_delivered: boolean
  code_sent_at: string | null
  created_at: string
}
