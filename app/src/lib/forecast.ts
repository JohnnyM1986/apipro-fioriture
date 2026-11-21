// Previsioni di fioritura: lettura del file generato ogni notte dal modello (model/run.py forecast).

export interface PhaseForecast { p10: number; p50: number; p90: number; n: number; fixed: boolean }
export type PhaseKey = 'F1' | 'F3' | 'F5'
export interface SpeciesForecast {
  F1: PhaseForecast | null
  F3: PhaseForecast | null
  F5: PhaseForecast | null
  phase_today: string | null
}
export interface ForecastPoint { id: string; name: string; zone: string; lat: number; lon: number; elevation: number | null }
export interface ForecastFile {
  generated_at: string
  model_version: string
  season: number
  issued: string
  known_until: string
  sources: string[]
  species: Record<string, {
    model: 'thermal_time' | 'calendar'
    window: unknown
    thresholds_gdd: Record<string, number> | null
    threshold_source?: string | null
    accumulation_start?: string | null
    validation?: string | null
  }>
  points: ForecastPoint[]
  predictions: Record<string, Record<string, SpeciesForecast>>
}

export async function loadForecast(): Promise<ForecastFile | null> {
  try {
    const r = await fetch('./data/predictions.json', { cache: 'no-cache' })
    if (!r.ok) return null
    return (await r.json()) as ForecastFile
  } catch {
    return null
  }
}

export function doyToDate(season: number, doy: number): Date {
  return new Date(Date.UTC(season, 0, doy, 12))
}

export function dateToDoy(d: Date): number {
  const start = Date.UTC(d.getFullYear(), 0, 1)
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000) + 1
}

const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' })

/** "2–9 maggio", "28 aprile – 6 maggio" */
export function formatRange(season: number, a: number, b: number): string {
  const da = doyToDate(season, a), db = doyToDate(season, b)
  if (a === b) return fmt(da)
  if (da.getUTCMonth() === db.getUTCMonth()) return `${da.getUTCDate()}–${fmt(db)}`
  return `${fmt(da)} – ${fmt(db)}`
}

function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180
  const x = (bLon - aLon) * r * Math.cos(((aLat + bLat) / 2) * r)
  const y = (bLat - aLat) * r
  return Math.sqrt(x * x + y * y) * 6371
}

/** Distanza in km tra due coordinate (approssimazione valida per il Veneto). */
export const distanceKm = distKm

/**
 * Punto scelto dall'utente (GPS, mappa o luogo salvato): le previsioni restano quelle della postazione più vicina,
 * ma si avvisa se il punto è lontano o a quota diversa.
 */
export interface MyPlace { lat: number; lon: number; label: string; elevation: number | null }

/** Soglie dell'avviso [DA VERIFICARE con UNIPD]. */
export const FAR_KM = 15
export const ELEV_DIFF_M = 150

export interface PlaceNote { text: string; warn: string | null }

/** Frase su quale postazione si usa e, se serve, l'avviso di distanza o di quota. */
export function placeNote(place: MyPlace, station: ForecastPoint): PlaceNote {
  const km = distKm(place.lat, place.lon, station.lat, station.lon)
  const kmTxt = km < 1 ? 'a meno di 1 km' : `a ${Math.round(km)} km`
  const se = station.elevation != null ? Math.round(station.elevation) : null
  const pe = place.elevation != null ? Math.round(place.elevation) : null
  const from = place.label.startsWith('il ') ? 'dal ' + place.label.slice(3) : 'da ' + place.label
  const text = `Date della postazione ${station.name}${se != null ? ` (${se} m)` : ''}, ${kmTxt} ${from}${pe != null ? ` (${pe} m)` : ''}.`
  if (pe != null && se != null && Math.abs(pe - se) >= ELEV_DIFF_M) {
    const later = pe > se
    return { text, warn: `Il tuo punto è a ${pe} m, la postazione a ${se} m: qui la fioritura può arrivare ${later ? 'più tardi' : 'prima'} delle date indicate.` }
  }
  if (km > FAR_KM) return { text, warn: 'Il tuo punto è lontano dalla postazione: considera le date solo indicative.' }
  return { text, warn: null }
}

/** Quota del punto (modello del terreno di Open-Meteo, circa 90 m). null se non disponibile. */
export async function fetchElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`)
    if (!r.ok) return null
    const j = (await r.json()) as { elevation?: number[] }
    const e = j.elevation?.[0]
    return typeof e === 'number' && Number.isFinite(e) ? e : null
  } catch {
    return null
  }
}

export function nearestPoint(points: ForecastPoint[], lat: number, lon: number): { point: ForecastPoint; km: number } | null {
  let best: { point: ForecastPoint; km: number } | null = null
  for (const p of points) {
    const km = distKm(lat, lon, p.lat, p.lon)
    if (!best || km < best.km) best = { point: p, km }
  }
  return best
}

/** Giorno della stagione per la data indicata (negativo se la stagione inizia il prossimo anno). */
export function seasonDoy(season: number, d: Date): number {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(season, 0, 1)) / 86400000) + 1
}

export type PhaseNow = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5'

/**
 * Fase attesa in un giorno, dalle date mediane: stessa regola di model/apipro_model/thermal.py (phase_today),
 * ricalcolata sul giorno del dispositivo. Il modello non distingue F1 e F2 ("inizio/aumento"):
 * solo per il misuratore la prima metà di quel periodo è F1 e la seconda F2.
 */
export function phaseOn(f: SpeciesForecast, doy: number): PhaseNow | null {
  if (!f.F1 || !f.F5) return null
  const f1 = f.F1.p50, f5 = f.F5.p50
  const f3 = f.F3 ? f.F3.p50 : Math.round((f1 + f5) / 2)
  if (doy < f1) return 'F0'
  if (doy < f3 - 2) return doy < (f1 + f3 - 2) / 2 ? 'F1' : 'F2'
  if (doy <= f3 + 2) return 'F3'
  if (doy <= f5) return 'F4'
  return 'F5'
}

/** Tacche piene del misuratore (su 5) per la fase attesa oggi. */
export const METER_LEVEL: Record<PhaseNow, number> = { F0: 0, F1: 1, F2: 3, F3: 4, F4: 2, F5: 0 }

export const PHASE_NOW_LABEL: Record<PhaseNow, string> = {
  F0: 'non ancora in fiore',
  F1: 'primi fiori aperti',
  F2: 'fioritura in aumento',
  F3: 'piena fioritura',
  F4: 'fioritura in diminuzione',
  F5: 'fioritura terminata'
}

/** Tono della pillola di stato: ocra (ora), verde (in arrivo), beige (in calo / finita). */
export type Tone = 'now' | 'soon' | 'calo' | 'muted'
export type Status = { key: 'before' | 'now' | 'after' | 'none'; label: string; detail: string; tone: Tone; wait?: string }

function waitLabel(days: number): string {
  return days <= 13 ? `${days} ${days === 1 ? 'giorno' : 'giorni'}` : days < 60 ? `${Math.round(days / 7)} sett.` : `${Math.round(days / 30)} mesi`
}

/** Frase principale e stato rispetto a oggi (todayDoy = null se la stagione non è quella in corso). */
export function describe(season: number, f: SpeciesForecast, todayDoy: number | null): Status {
  if (!f.F1 || !f.F5) return { key: 'none', label: 'Non prevista', detail: 'In questa zona la fioritura non raggiunge la soglia del modello.', tone: 'muted' }
  const f3 = f.F3 ?? f.F1
  const full = `Piena fioritura ${formatRange(season, f3.p10, f3.p90)}`
  if (todayDoy == null) return { key: 'before', label: `Stagione ${season}`, detail: full, tone: 'soon' }
  if (todayDoy < f.F1.p50) {
    const days = f.F1.p50 - todayDoy
    const wait = waitLabel(days)
    return { key: 'before', label: `Tra ${wait}`, wait, detail: days > 45 ? full : `Inizio atteso ${formatRange(season, f.F1.p10, f.F1.p90)}`, tone: 'soon' }
  }
  if (todayDoy <= f.F5.p50) {
    const ph = f.phase_today
    if (ph === 'F4') return { key: 'now', label: 'In calo', detail: `Fine attesa ${formatRange(season, f.F5.p10, f.F5.p90)}`, tone: 'calo' }
    return { key: 'now', label: ph === 'F3' ? 'In piena' : 'Ora', detail: full, tone: 'now' }
  }
  return { key: 'after', label: 'Finita', detail: `Terminata intorno al ${formatRange(season, f.F5.p50, f.F5.p50)}`, tone: 'muted' }
}

/** "Crocetta del Montello" → "Crocetta d. M." (etichetta corta del punto). */
export function shortPlace(name: string): string {
  return name.replace(/\s+(?:del|della|dello|dei|delle|di|de)\s+(\S)\S*/gi, (_m, c: string) => ` d. ${c.toUpperCase()}.`)
}

/** "Crocetta del Montello" → "Crocetta" (etichetta del punto nelle Previsioni). */
export function placeWord(name: string): string {
  return name.split(/\s+(?:del|della|dello|dei|delle|di|de)\s+/i)[0]
}

/** "Acacia (robinia)" → "Acacia" */
export const shortSpecies = (label: string) => label.split(' (')[0]

/** "Aggiornate stanotte", "Aggiornate ieri", "Aggiornate il 21 nov 2026". */
export function updatedLabel(generatedAt: string, now: Date): string {
  const g = new Date(generatedAt)
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((day(now) - day(g)) / 86400000)
  if (diff === 0) return g.getHours() < 8 ? 'Aggiornate stanotte' : `Aggiornate oggi alle ${g.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
  if (diff === 1) return g.getHours() >= 18 ? 'Aggiornate stanotte' : 'Aggiornate ieri'
  return `Aggiornate il ${g.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
