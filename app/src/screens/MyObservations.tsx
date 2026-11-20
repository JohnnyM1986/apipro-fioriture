import { phaseByCode, speciesById } from '../data/catalog'
import { PhaseIcon } from '../components/PhaseIcon'
import type { Observation, Site } from '../lib/types'
import { WARNING_TEXT } from '../lib/validation'

interface Props {
  observations: Observation[]
  sites: Site[]
  onEdit: (o: Observation) => void
  onDelete: (o: Observation) => void
  onNew: () => void
}

export function MyObservations({ observations, sites, onEdit, onDelete, onNew }: Props) {
  if (!observations.length)
    return (
      <section className="empty">
        <h2>Le mie osservazioni</h2>
        <p>Non hai ancora inviato segnalazioni.</p>
        <button className="btn" onClick={onNew}>Nuova segnalazione</button>
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
    </section>
  )
}
