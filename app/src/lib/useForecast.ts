import { useEffect, useMemo, useState } from 'react'
import { SPECIES, type Species } from '../data/catalog'
import type { Site } from './types'
import { describe, fetchElevation, loadForecast, nearestPoint, phaseOn, seasonDoy, type ForecastFile, type MyPlace, type ForecastPoint, type PhaseNow, type SpeciesForecast, type Status } from './forecast'

const STORE_KEY = 'apipro.forecastPoint'
const PLACE_KEY = 'apipro.forecastPlace'
const NOW_RANK: Record<PhaseNow, number> = { F3: 0, F2: 1, F1: 2, F4: 3, F0: 4, F5: 5 }

export interface SpeciesCard {
  s: Species
  f: SpeciesForecast
  st: Status
  /** fase attesa oggi (solo a stagione iniziata) */
  phase: PhaseNow | null
  /** giorni all'inizio della fioritura (per ordinare) */
  wait: number
}

export interface ForecastState {
  data: ForecastFile | null | undefined
  point: ForecastPoint | undefined
  /** scelta della postazione dall'elenco (cancella il punto scelto) */
  choose: (id: string) => void
  /** punto scelto con GPS, mappa o luogo salvato: usa la postazione più vicina e ne ricorda il punto */
  pickPlace: (lat: number, lon: number, label: string) => void
  place: MyPlace | null
  todayDoy: number | null
  seasonStarted: boolean
  cards: SpeciesCard[]
}

/** Previsioni del punto scelto (condivise tra Inizio e Previsioni). */
export function useForecast(sites: Site[]): ForecastState {
  const [data, setData] = useState<ForecastFile | null | undefined>(undefined)
  const [pointId, setPointId] = useState<string>(() => {
    try { return localStorage.getItem(STORE_KEY) ?? '' } catch { return '' }
  })

  const [place, setPlace] = useState<MyPlace | null>(() => {
    try { return JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null') as MyPlace | null } catch { return null }
  })

  useEffect(() => { loadForecast().then(setData) }, [])

  // punto iniziale: scelta precedente, altrimenti il più vicino al primo luogo salvato, altrimenti Treviso
  useEffect(() => {
    if (!data || (pointId && data.points.some((p) => p.id === pointId))) return
    const s = sites[0]
    const near = s ? nearestPoint(data.points, s.lat, s.lon)?.point.id : undefined
    setPointId(near ?? data.points.find((p) => p.id === 'treviso')?.id ?? data.points[0]?.id ?? '')
  }, [data, sites, pointId])

  const savePoint = (id: string) => { setPointId(id); try { localStorage.setItem(STORE_KEY, id) } catch { /* memoria non disponibile */ } }
  const savePlace = (p: MyPlace | null) => {
    setPlace(p)
    try { if (p) localStorage.setItem(PLACE_KEY, JSON.stringify(p)); else localStorage.removeItem(PLACE_KEY) } catch { /* memoria non disponibile */ }
  }
  const choose = (id: string) => { savePoint(id); savePlace(null) }
  const pickPlace = (lat: number, lon: number, label: string) => {
    if (!data) return
    const n = nearestPoint(data.points, lat, lon)
    if (!n) return
    savePoint(n.point.id)
    const p: MyPlace = { lat, lon, label, elevation: null }
    savePlace(p)
    // la quota arriva dopo (serve la rete); senza rete resta solo l'avviso di distanza
    fetchElevation(lat, lon).then((elevation) => {
      if (elevation == null) return
      setPlace((cur) => {
        if (!cur || cur.lat !== lat || cur.lon !== lon) return cur // nel frattempo è stato scelto un altro punto
        const next = { ...cur, elevation }
        try { localStorage.setItem(PLACE_KEY, JSON.stringify(next)) } catch { /* memoria non disponibile */ }
        return next
      })
    })
  }

  const point = data?.points.find((p) => p.id === pointId)
  const today = new Date()
  const todayDoy = data ? seasonDoy(data.season, today) : null
  const seasonStarted = !!data && data.season === today.getFullYear()

  const cards = useMemo(() => {
    if (!data || !point || todayDoy == null) return []
    const preds = data.predictions[point.id] ?? {}
    return SPECIES.filter((s) => preds[s.id]).map((s) => {
      const raw = preds[s.id]
      const phase = seasonStarted ? phaseOn(raw, todayDoy) : null
      const f = seasonStarted ? { ...raw, phase_today: phase } : raw
      const st = describe(data.season, f, todayDoy)
      const order = st.key === 'now' ? 0 : st.key === 'before' ? 1 : st.key === 'after' ? 2 : 3
      // in fioritura ora: prima piena, aumento e inizio, poi quelle in calo; a parità le più recenti
      const rank = phase ? NOW_RANK[phase] : 0
      return { s, f, st, phase, order, rank, wait: (raw.F1?.p50 ?? 999) - todayDoy }
    }).sort((a, b) => a.order - b.order || (a.order === 0 ? a.rank - b.rank || b.wait - a.wait : a.wait - b.wait))
  }, [data, point, todayDoy, seasonStarted])

  return { data, point, choose, pickPlace, place, todayDoy, seasonStarted, cards }
}
