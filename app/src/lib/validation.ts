import { PHASES, SPECIES, phaseByCode } from '../data/catalog'
import type { Observation } from './types'

/** Data di oggi nel fuso Europe/Rome, formato YYYY-MM-DD. */
export function todayRome(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export interface Draft {
  lat: number | null
  lon: number | null
  species_id: string | null
  phase_code: string | null
  observed_on: string | null
}

/**
 * Controlli INDISPENSABILI (specifica Birolo): luogo, specie, fase, data valida (non futura).
 * Restituisce l'elenco dei messaggi di errore; vuoto = si può inviare.
 */
export function requiredErrors(d: Draft, today: string = todayRome()): string[] {
  const e: string[] = []
  if (d.lat == null || d.lon == null || !isFinite(d.lat) || !isFinite(d.lon) || Math.abs(d.lat) > 90 || Math.abs(d.lon) > 180)
    e.push('Indica il luogo delle piante osservate')
  if (!d.species_id || !SPECIES.some((s) => s.id === d.species_id)) e.push('Scegli la pianta')
  if (!d.phase_code || !PHASES.some((p) => p.code === d.phase_code)) e.push('Scegli la fase della fioritura')
  if (!d.observed_on || !/^\d{4}-\d{2}-\d{2}$/.test(d.observed_on) || isNaN(Date.parse(d.observed_on)))
    e.push('Indica una data valida')
  else if (d.observed_on > today) e.push('La data non può essere futura')
  return e
}

/** Distanza approssimata in metri (sufficiente per i controlli di duplicato). */
export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toR = (x: number) => (x * Math.PI) / 180
  const dLat = toR(lat2 - lat1)
  const dLon = toR(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Controlli FACOLTATIVI: avvisi che non bloccano l'invio.
 *  - possibile_duplicato: stessa specie e data, stesso luogo salvato o entro 50 m
 *  - fase_regressiva: nello stesso luogo salvato, l'osservazione precedente (ultimi 120 giorni) aveva una fase più avanzata
 */
export function qcWarnings(
  d: Draft & { site_id: string | null; id?: string },
  existing: Observation[]
): string[] {
  const w: string[] = []
  if (d.lat == null || d.lon == null || !d.species_id || !d.observed_on || !d.phase_code) return w
  const others = existing.filter((o) => o.id !== d.id && o.species_id === d.species_id)

  const dup = others.some(
    (o) =>
      o.observed_on === d.observed_on &&
      ((d.site_id && o.site_id === d.site_id) || distanceM(o.lat, o.lon, d.lat!, d.lon!) < 50)
  )
  if (dup) w.push('possibile_duplicato')

  if (d.site_id) {
    const cur = phaseByCode(d.phase_code)?.rank ?? 0
    const limit = new Date(Date.parse(d.observed_on) - 120 * 86400000).toISOString().slice(0, 10)
    const prev = others
      .filter((o) => o.site_id === d.site_id && o.observed_on < d.observed_on! && o.observed_on > limit)
      .sort((a, b) => (a.observed_on < b.observed_on ? 1 : -1))[0]
    if (prev && (phaseByCode(prev.phase_code)?.rank ?? 0) > cur) w.push('fase_regressiva')
  }
  return w
}

export const WARNING_TEXT: Record<string, string> = {
  possibile_duplicato: 'Hai già una segnalazione di questa pianta nello stesso luogo e nello stesso giorno.',
  fase_regressiva: 'Nella visita precedente in questo luogo la fioritura risultava più avanzata. Controlla la fase o la data.'
}
