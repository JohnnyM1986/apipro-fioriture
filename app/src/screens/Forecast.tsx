import { useState, type ReactNode } from 'react'
import { GROUPS, type SpeciesGroup } from '../data/catalog'
import { SpeciesBadge } from '../components/SpeciesBadge'
import { Meter } from '../components/Meter'
import { IconClock, IconLocate, IconMap, IconPin } from '../components/Icons'
import { MapPicker } from '../components/MapPicker'
import type { Site } from '../lib/types'
import { doyToDate, placeNote, placeWord, updatedLabel } from '../lib/forecast'
import type { ForecastState } from '../lib/useForecast'

function fmtStart(mmdd: string | null | undefined): string {
  if (!mmdd || mmdd === '01-01') return '1° gennaio'
  const [m, d] = mmdd.split('-').map(Number)
  const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
  return `${d === 1 ? '1°' : d} ${mesi[m - 1]}`
}

/** "Piena fioritura 2–9 maggio": le date in grassetto. */
function boldDates(text: string): ReactNode {
  const m = text.match(/^(\D+?)\s(\d.*)$/)
  return m ? <>{m[1]} <b>{m[2]}</b></> : text
}

const MONTHS = ['mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set']
const BAR_START = 60 // 1 marzo
const BAR_END = 273 // 30 settembre
const pct = (doy: number) => `${Math.min(100, Math.max(0, ((doy - BAR_START) / (BAR_END - BAR_START)) * 100))}%`
const width = (a: number, b: number) => `calc(${pct(b)} - ${pct(a)})`

export function Forecast({ fc, badge, sites }: { fc: ForecastState; badge?: ReactNode; sites: Site[] }) {
  const { data, point, choose, pickPlace, place, todayDoy, seasonStarted, cards } = fc
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<{ lat: number; lon: number } | null>(null)
  const closePicker = () => { setPicking(false); setDraft(null) }
  const [gpsMsg, setGpsMsg] = useState('')
  const [group, setGroup] = useState<SpeciesGroup | 'all'>('all')

  const useGps = () => {
    if (!data || !navigator.geolocation) return setGpsMsg('Posizione non disponibile su questo dispositivo.')
    setGpsMsg('Cerco la tua posizione…')
    navigator.geolocation.getCurrentPosition(
      (pos) => { pickPlace(pos.coords.latitude, pos.coords.longitude, 'te'); setGpsMsg(''); closePicker() },
      () => setGpsMsg('Non riesco a leggere la posizione: scegli il punto dall\'elenco.'),
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  if (data === undefined) return <p className="hint">Caricamento delle previsioni…</p>
  if (data === null)
    return (
      <section>
        <div className="page-head"><h1>Previsioni</h1>{badge}</div>
        <p className="card muted">Le previsioni non sono ancora disponibili: il calcolo notturno non ha prodotto dati. Riprova più tardi.</p>
      </section>
    )

  const sorted = [...data.points].sort((a, b) => a.name.localeCompare(b.name, 'it'))
  const shown = cards.filter((c) => group === 'all' || c.s.group === group)

  return (
    <section className="forecast">
      <div className="page-head">
        <h1>Previsioni</h1>
        <label className="place-chip select">
          <IconPin />
          <span>{point ? placeWord(point.name) : '—'}{point?.elevation != null ? ` · ${Math.round(point.elevation)} m` : ''}</span>
          <span className="caret" aria-hidden="true">▾</span>
          <select aria-label="Zona di riferimento" value={point?.id ?? ''} onChange={(e) => choose(e.target.value)}>
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.elevation != null ? ` · ${Math.round(p.elevation)} m` : ''}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="fc-tools">
        <button className="btn quiet" onClick={useGps}><IconLocate /> Usa la mia posizione</button>
        <button className="btn quiet" onClick={() => (picking ? closePicker() : setPicking(true))} aria-expanded={picking}><IconMap /> Scegli sulla mappa</button>
      </div>
      {gpsMsg && <p className="hint">{gpsMsg}</p>}

      {picking && (
        <div className="fc-picker">
          <b>Per quale punto vuoi le previsioni?</b>
          {sites.length > 0 && (
            <div className="site-chips" aria-label="I tuoi luoghi salvati">
              {sites.map((s) => (
                <button key={s.id} className="chip" onClick={() => { pickPlace(s.lat, s.lon, s.name); closePicker() }}><IconPin />{s.name}</button>
              ))}
            </div>
          )}
          <MapPicker
            lat={draft?.lat ?? null}
            lon={draft?.lon ?? null}
            onChange={(a, b) => setDraft({ lat: a, lon: b })}
            height={260}
            hint="Tocca la mappa nel punto che ti interessa, per esempio il tuo apiario. Le date saranno quelle della postazione più vicina."
          />
          <div className="fc-picker-actions">
            <button className="btn secondary small" onClick={closePicker}>Annulla</button>
            <button className="btn small" disabled={!draft} onClick={() => { if (draft) { pickPlace(draft.lat, draft.lon, 'il punto scelto'); closePicker() } }}>Usa questo punto</button>
          </div>
        </div>
      )}

      {place && point && !picking && (() => {
        const n = placeNote(place, point)
        return (
          <div className={'fc-place-note' + (n.warn ? ' warn' : '')} role="status">
            <p>{n.text}</p>
            {n.warn && <p className="w">{n.warn}</p>}
          </div>
        )
      })()}

      <div className="seg" role="tablist" aria-label="Gruppo di piante">
        {[{ id: 'all' as const, label: 'Tutte' }, ...GROUPS].map((g) => (
          <button key={g.id} role="tab" aria-selected={group === g.id} className={group === g.id ? 'on' : ''} onClick={() => setGroup(g.id)}>{g.label}</button>
        ))}
      </div>

      <p className="fc-note"><IconClock /> {updatedLabel(data.generated_at, new Date())} · versione sperimentale{badge}</p>
      {!seasonStarted && <p className="fc-small">La stagione {data.season} non è ancora iniziata: date calcolate con il meteo degli ultimi 20 anni.</p>}

      {shown.map(({ s, f, st, phase }) => {
        const info = data.species[s.id]
        return (
          <article key={s.id} className={`fc-card ${st.key}`}>
            <div className="fc-row">
              <SpeciesBadge s={s} size={50} />
              <div className="fc-t">
                <b>{s.label}</b>
                <span>{boldDates(st.detail)}</span>
              </div>
              <span className={`pill ${st.tone}`}>{st.label}</span>
            </div>
            {f.F1 && f.F5 && (
              <>
                <div className="fc-bar" aria-hidden="true">
                  <div className="track" />
                  <div className="band" style={{ left: pct(f.F1.p10), width: width(f.F1.p10, f.F5.p90) }} />
                  {f.F3 && <div className="core" style={{ left: pct(f.F3.p10), width: width(f.F3.p10, Math.max(f.F3.p90, f.F3.p10 + 2)) }} />}
                  {todayDoy != null && todayDoy >= BAR_START && todayDoy <= BAR_END && <div className="today" style={{ left: pct(todayDoy) }}><span>oggi</span></div>}
                </div>
                <div className="fc-months">{MONTHS.map((m) => <span key={m}>{m}</span>)}</div>
              </>
            )}
            {(seasonStarted || st.key === 'before') && st.key !== 'none' && (
              <div className="fc-today"><Meter phase={phase} wait={st.key === 'before' ? st.wait : undefined} inline compact /></div>
            )}
            {info?.model === 'calendar' && <p className="fc-small">Solo calendario da letteratura: la data dipende da semina o gestione e verrà affinata con le vostre segnalazioni.</p>}
            {info?.validation && (
              <p className="fc-small">Soglie dell'Università di Padova (gradi giorno dal {fmtStart(info.accumulation_start)}): stima per test preliminare, in validazione.</p>
            )}
          </article>
        )
      })}
      {shown.length === 0 && <p className="card muted">Nessuna specie di questo gruppo ha una previsione per questa zona.</p>}

      <details className="fc-how">
        <summary>Come funziona la previsione</summary>
        <p>
          Ogni notte il modello somma il calore accumulato (gradi giorno sopra 5 °C) con le temperature
          misurate e previste a 16 giorni (Open-Meteo, dati ERA5-Land del programma europeo Copernicus). Ogni specie fiorisce
          quando supera la propria soglia: per acacia, castagno e tiglio le soglie indicate dall'Università di Padova
          (accumulo dal 1° marzo), per le altre specie soglie ricavate dalle finestre di fioritura della letteratura scientifica.
          Oltre i 16 giorni si usa il meteo dei 20 anni precedenti: la barra chiara indica il margine, quella scura la piena fioritura.
          Le tacchette indicano quanto è intensa la fioritura attesa oggi.
          Con le vostre segnalazioni le soglie verranno ricalibrate sul Veneto.
        </p>
        <p className="fc-small">
          Date calcolate per {point?.name}
          {point?.elevation != null ? ` (${Math.round(point.elevation)} m)` : ''}. In zone a quota diversa la fioritura può
          anticipare o ritardare. Dati meteo: Open-Meteo.com, CC BY 4.0. Stagione {data.season}, modello {data.model_version}, barra
          dal {doyToDate(data.season, BAR_START).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })} al {doyToDate(data.season, BAR_END).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })}.
        </p>
      </details>
    </section>
  )
}
