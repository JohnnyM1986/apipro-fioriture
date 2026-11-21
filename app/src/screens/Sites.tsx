import { useState } from 'react'
import { MapPicker } from '../components/MapPicker'
import type { DataStore } from '../lib/store'
import type { Site } from '../lib/types'
import { IconPin } from '../components/Icons'

interface Props {
  store: DataStore
  sites: Site[]
  onChanged: () => void
}

/** Luoghi abituali: apiari, boschi, appezzamenti o percorsi frequentati. La posizione è quella delle piante. */
export function Sites({ store, sites, onChanged }: Props) {
  const [edit, setEdit] = useState<Partial<Site> | null>(null)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!edit?.name?.trim() || edit.lat == null || edit.lon == null) return setErr('Indica nome e posizione sulla mappa')
    try {
      await store.saveSite({ id: edit.id, name: edit.name.trim(), lat: edit.lat, lon: edit.lon })
      setEdit(null); setErr(''); onChanged()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  if (edit)
    return (
      <section>
        <h2>{edit.id ? 'Modifica luogo' : 'Nuovo luogo abituale'}</h2>
        <input className="full" maxLength={80} value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Nome (es. Apiario Montello)" />
        <MapPicker lat={edit.lat ?? null} lon={edit.lon ?? null} onChange={(lat, lon) => setEdit({ ...edit, lat, lon })} />
        {err && <p className="error">{err}</p>}
        <div className="wizard-nav">
          <button className="btn secondary" onClick={() => { setEdit(null); setErr('') }}>Annulla</button>
          <button className="btn" onClick={save}>Salva luogo</button>
        </div>
      </section>
    )

  return (
    <section>
      <h2>I miei luoghi</h2>
      <p className="hint">Salva i luoghi che frequenti per segnalare più velocemente, senza reinserire la posizione.</p>
      <ul className="obs-list">
        {sites.map((s) => (
          <li key={s.id}>
            <span className="ico-tile"><IconPin /></span>
            <div className="obs-body"><b>{s.name}</b><small>{s.lat.toFixed(5)}, {s.lon.toFixed(5)}</small></div>
            <div className="obs-actions">
              <button className="btn secondary small" onClick={() => setEdit(s)}>Modifica</button>
              <button className="btn link small" onClick={async () => { if (confirm('Togliere questo luogo dall\'elenco? Le segnalazioni già inviate restano.')) { await store.archiveSite(s.id); onChanged() } }}>Togli</button>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn" onClick={() => setEdit({})}>Aggiungi luogo</button>
    </section>
  )
}
