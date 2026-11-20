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
  species: Record<string, { model: 'thermal_time' | 'calendar'; window: unknown; thresholds_gdd: Record<string, number> | null }>
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

export function nearestPoint(points: ForecastPoint[], lat: number, lon: number): { point: ForecastPoint; km: number } | null {
  let best: { point: ForecastPoint; km: number } | null = null
  for (const p of points) {
    const km = distKm(lat, lon, p.lat, p.lon)
    if (!best || km < best.km) best = { point: p, km }
  }
  return best
}

export type Status = { key: 'before' | 'now' | 'after' | 'none'; label: string; detail: string }

/** Frase principale e stato rispetto a oggi (todayDoy = null se la stagione non è quella in corso). */
export function describe(season: number, f: SpeciesForecast, todayDoy: number | null): Status {
  if (!f.F1 || !f.F5) return { key: 'none', label: 'Non prevista', detail: 'In questa zona la fioritura non raggiunge la soglia del modello.' }
  const f3 = f.F3 ?? f.F1
  const full = `Piena fioritura ${formatRange(season, f3.p10, f3.p90)}`
  if (todayDoy == null) return { key: 'before', label: `Stagione ${season}`, detail: full }
  if (todayDoy < f.F1.p50) {
    const days = f.F1.p50 - todayDoy
    const label = days <= 13 ? `Tra ${days} giorni` : days < 60 ? `Tra ${Math.round(days / 7)} sett.` : `Tra ${Math.round(days / 30)} mesi`
    return { key: 'before', label, detail: `Inizio atteso ${formatRange(season, f.F1.p10, f.F1.p90)}` }
  }
  if (todayDoy <= f.F5.p50) {
    const ph = f.phase_today
    const label = ph === 'F3' ? 'Piena fioritura' : ph === 'F4' ? 'In calo' : 'In fioritura'
    return { key: 'now', label, detail: `Fine attesa ${formatRange(season, f.F5.p10, f.F5.p90)}` }
  }
  return { key: 'after', label: 'Finita', detail: `Terminata intorno al ${formatRange(season, f.F5.p50, f.F5.p50)}` }
}
