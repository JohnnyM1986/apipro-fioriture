import { useState, type ReactNode } from 'react'
import { MapPicker } from '../components/MapPicker'
import { IconClose, IconPin, IconPlus } from '../components/Icons'
import type { DataStore } from '../lib/store'
import type { EventType, LocationSource, Site } from '../lib/types'
import { todayRome } from '../lib/validation'

export const EVENT_TYPES: { id: EventType; label: string; hint: string }[] = [
  { id: 'sciame', label: 'Sciame', hint: 'Uno sciame posato o in volo' },
  { id: 'moria', label: 'Moria o spopolamento', hint: 'Api morte davanti agli alveari o famiglie che si spopolano all\'improvviso' },
  { id: 'vespa_velutina', label: 'Calabrone asiatico', hint: 'Vespa velutina vicino agli alveari o un suo nido' },
  { id: 'altro', label: 'Altro', hint: 'Un altro evento da segnalare: descrivilo nelle note' }
]
export const eventLabel = (t: string) => EVENT_TYPES.find((e) => e.id === t)?.label ?? t

interface Props {
  store: DataStore
  sites: Site[]
  badge?: ReactNode
  onCancel: () => void
  onSaved: () => void
}

/** Segnalazione di un evento diverso dalla fioritura: tipo, data, posizione e nota. Nessuna foto. */
export function EventReport({ store, sites, badge, onCancel, onSaved }: Props) {
  const today = todayRome()
  const [type, setType] = useState<EventType | null>(null)
  const [date, setDate] = useState(today)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [newPlace, setNewPlace] = useState(sites.length === 0)
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [src, setSrc] = useState<LocationSource | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const problems = [
    !type && 'Scegli che cosa hai visto',
    (lat == null || lon == null) && 'Indica il luogo',
    (!date || date > today) && 'Indica una data valida (non futura)',
    type === 'altro' && !note.trim() && 'Per «Altro» descrivi l\'evento nelle note'
  ].filter(Boolean) as string[]

  const pickSite = (s: Site) => { setSiteId(s.id); setLat(s.lat); setLon(s.lon); setSrc('site'); setNewPlace(false) }

  const submit = async () => {
    if (problems.length || !type) return setErr(problems.join('. ') + '.')
    setBusy(true); setErr('')
    try {
      await store.saveEvent({ event_type: type, observed_on: date, lat: lat!, lon: lon!, location_source: src, note: note.trim() || null })
      onSaved()
    } catch (e) {
      setErr('Invio non riuscito: ' + ((e as Error).message || 'riprova'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wizard event-form">
      <div className="step-head">
        <p className="step-no">Altra segnalazione</p>
        {badge}
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Chiudi la segnalazione"><IconClose /></button>
      </div>

      <section>
        <h2>Che cosa hai visto?</h2>
        <div className="type-grid">
          {EVENT_TYPES.map((t) => (
            <button key={t.id} type="button" className={'type-card' + (type === t.id ? ' sel' : '')} aria-pressed={type === t.id} onClick={() => setType(t.id)}>
              <b>{t.label}</b>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
        {type === 'vespa_velutina' && <p className="hint">Non avvicinarti ai nidi. Se puoi, segnala anche alle autorità competenti [DA VERIFICARE canale ufficiale].</p>}
      </section>

      <section>
        <h2>Dove?</h2>
        {sites.length > 0 && (
          <div className="choice-list">
            {sites.map((s) => (
              <button key={s.id} type="button" className={'choice' + (siteId === s.id && !newPlace ? ' sel' : '')} onClick={() => pickSite(s)}>
                <span className="ico-tile"><IconPin /></span>
                <span><b>{s.name}</b><small>Luogo salvato</small></span>
              </button>
            ))}
            <button type="button" className={'choice' + (newPlace ? ' sel' : '')} onClick={() => { setNewPlace(true); setSiteId(null); setLat(null); setLon(null) }}>
              <span className="ico-tile"><IconPlus size={18} /></span>
              <span><b>Un altro punto</b><small>Indicalo sulla mappa o con la tua posizione</small></span>
            </button>
          </div>
        )}
        {newPlace && (
          <MapPicker lat={lat} lon={lon} onChange={(a, b, s) => { setLat(a); setLon(b); setSrc(s) }} hint="Tocca la mappa nel punto in cui hai visto l'evento." />
        )}
      </section>

      <section>
        <h2>Quando?</h2>
        <input className="full" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        <h2>Note {type === 'altro' ? '' : '(facoltative)'}</h2>
        <textarea className="full" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Cosa hai visto, quante api o famiglie, da quanto tempo…" />
        {err && <p className="error">{err}</p>}
      </section>

      <div className="wizard-nav">
        <button type="button" className="btn secondary" onClick={onCancel}>Annulla</button>
        <button type="button" className="btn" disabled={busy || problems.length > 0} onClick={submit}>{busy ? 'Invio…' : 'Invia segnalazione'}</button>
      </div>
    </div>
  )
}
