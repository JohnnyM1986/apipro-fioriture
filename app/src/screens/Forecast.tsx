import { useEffect, useMemo, useState } from 'react'
import { SPECIES } from '../data/catalog'
import { SpeciesBadge } from '../components/SpeciesBadge'
import type { Site } from '../lib/types'
import { dateToDoy, describe, doyToDate, loadForecast, nearestPoint, type ForecastFile } from '../lib/forecast'

const MONTHS = ['feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott']
const BAR_START = 32 // 1 febbraio
const BAR_END = 304 // 31 ottobre
const pct = (doy: number) => `${Math.min(100, Math.max(0, ((doy - BAR_START) / (BAR_END - BAR_START)) * 100))}%`
const width = (a: number, b: number) => `calc(${pct(b)} - ${pct(a)})`

const STORE_KEY = 'apipro.forecastPoint'

export function Forecast({ sites }: { sites: Site[] }) {
  const [data, setData] = useState<ForecastFile | null | undefined>(undefined)
  const [pointId, setPointId] = useState<string>(() => {
    try { return localStorage.getItem(STORE_KEY) ?? '' } catch { return '' }
  })
  const [gpsMsg, setGpsMsg] = useState('')

  useEffect(() => { loadForecast().then(setData) }, [])

  // punto iniziale: scelta precedente, altrimenti il più vicino al primo luogo salvato, altrimenti Treviso
  useEffect(() => {
    if (!data || (pointId && data.points.some((p) => p.id === pointId))) return
    const s = sites[0]
    const near = s ? nearestPoint(data.points, s.lat, s.lon)?.point.id : undefined
    setPointId(near ?? data.points.find((p) => p.id === 'treviso')?.id ?? data.points[0]?.id ?? '')
  }, [data, sites, pointId])

  const choose = (id: string) => { setPointId(id); try { localStorage.setItem(STORE_KEY, id) } catch { /* memoria non disponibile */ } }

  const useGps = () => {
    if (!data || !navigator.geolocation) return setGpsMsg('Posizione non disponibile su questo dispositivo.')
    setGpsMsg('Cerco la tua posizione…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = nearestPoint(data.points, pos.coords.latitude, pos.coords.longitude)
        if (n) { choose(n.point.id); setGpsMsg(`Punto di riferimento più vicino: ${n.point.name} (${n.km.toFixed(0)} km).`) }
      },
      () => setGpsMsg('Non riesco a leggere la posizione: scegli il punto dall\'elenco.'),
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const point = data?.points.find((p) => p.id === pointId)
  const today = new Date()
  const todayDoy = data && data.season === today.getFullYear() ? dateToDoy(today) : null

  const cards = useMemo(() => {
    if (!data || !point) return []
    const preds = data.predictions[point.id] ?? {}
    return SPECIES.filter((s) => preds[s.id]).map((s) => {
      const f = preds[s.id]
      const st = describe(data.season, f, todayDoy)
      const order = st.key === 'now' ? 0 : st.key === 'before' ? 1 : st.key === 'after' ? 2 : 3
      return { s, f, st, order, model: data.species[s.id]?.model }
    }).sort((a, b) => a.order - b.order || (a.f.F1?.p50 ?? 999) - (b.f.F1?.p50 ?? 999))
  }, [data, point, todayDoy])

  if (data === undefined) return <p className="hint">Caricamento delle previsioni…</p>
  if (data === null)
    return (
      <section>
        <h1 className="serif">Previsioni</h1>
        <p className="card muted">Le previsioni non sono ancora disponibili: il calcolo notturno non ha prodotto dati. Riprova più tardi.</p>
      </section>
    )

  const sorted = [...data.points].sort((a, b) => a.name.localeCompare(b.name, 'it'))
  const upd = new Date(data.generated_at).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="forecast">
      <div className="fc-head">
        <h1 className="serif">Previsioni {data.season}</h1>
      </div>
      <div className="fc-place">
        <label>
          <span>Zona di riferimento</span>
          <select value={pointId} onChange={(e) => choose(e.target.value)}>
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.elevation != null ? ` · ${Math.round(p.elevation)} m` : ''}</option>
            ))}
          </select>
        </label>
        <button className="btn secondary small" onClick={useGps}>📍 Vicino a me</button>
      </div>
      {gpsMsg && <p className="hint">{gpsMsg}</p>}
      <p className="fc-note">
        Aggiornate il {upd} · versione sperimentale {data.model_version}
        {todayDoy == null && ` · stagione ${data.season} non ancora iniziata: date dalla media degli ultimi 30 anni`}
      </p>

      {cards.map(({ s, f, st, model }) => (
        <article key={s.id} className={`fc-card ${st.key}`}>
          <div className="fc-row">
            <SpeciesBadge s={s} size={46} />
            <div className="fc-t">
              <b>{s.label}</b>
              <span>{st.detail}</span>
            </div>
            <span className={`fc-pill ${st.key}`}>{st.label}</span>
          </div>
          {f.F1 && f.F5 && (
            <div className="fc-bar" aria-hidden="true">
              <div className="track" />
              <div className="band" style={{ left: pct(f.F1.p10), width: width(f.F1.p10, f.F5.p90) }} />
              {f.F3 && <div className="core" style={{ left: pct(f.F3.p10), width: width(f.F3.p10, Math.max(f.F3.p90, f.F3.p10 + 2)) }} />}
              {todayDoy != null && todayDoy >= BAR_START && todayDoy <= BAR_END && <div className="today" style={{ left: pct(todayDoy) }} />}
            </div>
          )}
          {f.F1 && f.F5 && <div className="fc-months">{MONTHS.map((m) => <span key={m}>{m}</span>)}</div>}
          {model === 'calendar' && <p className="fc-small">Solo calendario da letteratura: la data dipende da semina o gestione e verrà affinata con le vostre segnalazioni.</p>}
        </article>
      ))}

      <details className="fc-how">
        <summary>Come funziona la previsione</summary>
        <p>
          Ogni notte il modello somma il calore accumulato dal 1° gennaio (gradi giorno sopra 5 °C) con le temperature
          misurate e previste a 16 giorni (Open-Meteo, dati ERA5-Land del programma europeo Copernicus). Ogni specie fiorisce
          quando supera la propria soglia, ricavata dalle finestre di fioritura della letteratura scientifica. Oltre i 16 giorni
          si usa il meteo degli anni 1991–2020: la barra chiara indica il margine, quella scura la piena fioritura.
          Con le vostre segnalazioni le soglie verranno ricalibrate sul Veneto.
        </p>
        <p className="fc-small">
          Date calcolate per {point?.name}
          {point?.elevation != null ? ` (${Math.round(point.elevation)} m)` : ''}. In zone a quota diversa la fioritura può
          anticipare o ritardare. Dati meteo: Open-Meteo.com, CC BY 4.0. Stagione {data.season}, inizio barra {doyToDate(data.season, BAR_START).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })}.
        </p>
      </details>
    </section>
  )
}
