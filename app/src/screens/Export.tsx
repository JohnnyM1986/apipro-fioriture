import { useState } from 'react'
import { downloadCsv, toCsv } from '../lib/csv'
import type { DataStore } from '../lib/store'

/** Esportazione CSV per i responsabili ApiPRO: archivio completo, una riga per osservazione, nessun dato personale. */
export function Export({ store }: { store: DataStore }) {
  const [msg, setMsg] = useState('')
  const run = async () => {
    setMsg('Preparo il file…')
    try {
      const rows = await store.exportRows()
      const d = new Date().toISOString().slice(0, 10)
      downloadCsv(toCsv(rows), `apipro_osservazioni_${d}.csv`)
      setMsg(`Esportate ${rows.length} osservazioni.`)
    } catch (e) {
      setMsg('Esportazione non riuscita: ' + (e as Error).message)
    }
  }
  return (
    <section>
      <h2>Esportazione dati (responsabili ApiPRO)</h2>
      <p>Scarica l'intero archivio delle osservazioni in formato CSV (separatore punto e virgola, apribile con Excel). Ogni riga è una osservazione; non sono inclusi dati personali.</p>
      {store.mode === 'demo' && <p className="hint">Modalità dimostrativa: il file contiene solo le segnalazioni fatte su questo dispositivo.</p>}
      <button className="btn" onClick={run}>Scarica CSV</button>
      {msg && <p className="hint">{msg}</p>}
    </section>
  )
}
