import { phaseByCode, speciesById } from '../data/catalog'
import { PhaseIcon } from '../components/PhaseIcon'
import type { GenericEvent, Observation, Site } from '../lib/types'
import { IconAlert, IconHive } from '../components/Icons'
import { eventLabel } from './EventReport'
import { WARNING_TEXT } from '../lib/validation'

interface Props {
  observations: Observation[]
  events: GenericEvent[]
  sites: Site[]
  onEdit: (o: Observation) => void
  onDelete: (o: Observation) => void
  onDeleteEvent: (e: GenericEvent) => void
  onStrength: () => void
  onNew: () => void
}

const day = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT')

/** Altre segnalazioni (sciami, morie…) e collegamento alle stime di forza. */
function OtherReports({ events, onDeleteEvent, onStrength }: Pick<Props, 'events' | 'onDeleteEvent' | 'onStrength'>) {
  return (
    <>
      {events.length > 0 && (
        <>
          <h3>Altre segnalazioni ({events.length})</h3>
          <ul className="obs-list">
            {events.map((e) => (
              <li key={e.id}>
                <span className="ico-tile"><IconAlert size={22} /></span>
                <div className="obs-body">
                  <b>{eventLabel(e.event_type)}</b>
                  <small>{day(e.observed_on)} · {e.lat.toFixed(4)}, {e.lon.toFixed(4)}</small>
                  {e.note && <small>{e.note}</small>}
                </div>
                <div className="obs-actions">
                  <button className="btn link small" onClick={() => confirm('Eliminare questa segnalazione?') && onDeleteEvent(e)}>Elimina</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <button className="strength-card" onClick={onStrength}>
        <span className="ico-tile"><IconHive size={26} /></span>
        <span><b>Le mie stime di forza</b><small>Forza degli alveari con il metodo dei sesti</small></span>
        <span className="chev" aria-hidden="true">›</span>
      </button>
    </>
  )
}

export function MyObservations({ observations, events, sites, onEdit, onDelete, onDeleteEvent, onStrength, onNew }: Props) {
  if (!observations.length && !events.length)
    return (
      <section className="empty">
        <h2>Le mie osservazioni</h2>
        <p>Non hai ancora inviato segnalazioni.</p>
        <button className="btn" onClick={onNew}>Nuova segnalazione</button>
        <OtherReports events={events} onDeleteEvent={onDeleteEvent} onStrength={onStrength} />
      </section>
    )
  return (
    <section>
      <h2>Le mie osservazioni ({observations.length})</h2>
      <ul className="obs-list">
        {observations.map((o) => {
          const sp = speciesById(o.species_id)
          const ph = phaseByCode(o.phase_code)
          const place = o.site_id ? sites.find((s) => s.id === o.site_id)?.name ?? 'Luogo salvato' : `Occasionale (${o.lat.toFixed(4)}, ${o.lon.toFixed(4)})`
          return (
            <li key={o.id}>
              <PhaseIcon code={o.phase_code} size={48} />
              <div className="obs-body">
                <b>{sp?.label ?? o.species_id}</b>
                <span>{o.phase_code} · {ph?.label}</span>
                <small>{new Date(o.observed_on + 'T12:00:00').toLocaleDateString('it-IT')} · {place}{o.photo_url ? ' · 📷' : ''}</small>
                {o.qc_flags.map((f) => <small key={f} className="warning-inline">⚠️ {WARNING_TEXT[f] ?? f}</small>)}
              </div>
              <div className="obs-actions">
                <button className="btn secondary small" onClick={() => onEdit(o)}>Correggi</button>
                <button className="btn link small" onClick={() => confirm('Eliminare questa segnalazione?') && onDelete(o)}>Elimina</button>
              </div>
            </li>
          )
        })}
      </ul>
      <OtherReports events={events} onDeleteEvent={onDeleteEvent} onStrength={onStrength} />
    </section>
  )
}
