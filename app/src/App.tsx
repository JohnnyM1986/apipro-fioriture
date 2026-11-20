import { useCallback, useEffect, useMemo, useState } from 'react'
import { createStore } from './lib/store'
import type { Observation, Site } from './lib/types'
import { NewObservation } from './screens/NewObservation'
import { MyObservations } from './screens/MyObservations'
import { Sites } from './screens/Sites'
import { Info } from './screens/Info'
import { Export } from './screens/Export'
import { Forecast } from './screens/Forecast'
import { speciesById } from './data/catalog'
import { Istituzionale } from './components/Istituzionale'

type View = 'home' | 'new' | 'mine' | 'sites' | 'info' | 'export' | 'forecast'

export default function App() {
  const store = useMemo(() => createStore(), [])
  const [pid, setPid] = useState('')
  const [ready, setReady] = useState(false)
  const [fatal, setFatal] = useState('')
  const [view, setView] = useState<View>('home')
  const [sites, setSites] = useState<Site[]>([])
  const [obs, setObs] = useState<Observation[]>([])
  const [editing, setEditing] = useState<Observation | null>(null)
  const [admin, setAdmin] = useState(false)
  const [toast, setToast] = useState('')
  const envLabel = (import.meta.env.VITE_ENV_LABEL as string | undefined) ?? (store.mode === 'demo' ? 'DEMO' : '')

  const refresh = useCallback(async () => {
    const [s, o] = await Promise.all([store.listSites(), store.listObservations()])
    setSites(s); setObs(o)
  }, [store])

  useEffect(() => {
    store
      .init()
      .then(async (id) => {
        setPid(id)
        await refresh()
        setAdmin(await store.isAdmin())
        setReady(true)
      })
      .catch((e) => setFatal('Impossibile collegarsi all\'archivio: ' + (e as Error).message))
  }, [store, refresh])

  const go = (v: View) => { setEditing(null); setView(v); window.scrollTo(0, 0) }
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3500) }

  if (fatal) return <main className="wrap"><p className="error">{fatal}</p></main>
  if (!ready) return <main className="wrap"><p className="hint">Caricamento…</p></main>

  const last = obs[0]

  return (
    <>
      <header className="top">
        <button className="brand" onClick={() => go('home')}>
          <img src="./img/brand/apipro-logo-bianco.png" alt="ApiPro" height={30} />
          <span>Fioriture</span>
        </button>
        {envLabel && <span className="env">{envLabel}</span>}
      </header>

      <main className="wrap">
        {toast && <div className="toast" role="status">{toast}</div>}

        {view === 'home' && (
          <section className="home">
            <img className="home-logo" src="./img/brand/apipro-logo.png" alt="ApiPro – Apicoltura e Innovazione per la Produzione Regionale Ottimizzata" />
            <h1>Segnala le fioriture per le api</h1>
            <p>Indica luogo, pianta, fase della fioritura e data: bastano meno di un minuto e aiuti a prevedere le fioriture in Veneto.</p>
            <button className="btn big" onClick={() => go('new')}>🌼 Nuova segnalazione</button>
            {last && (
              <p className="hint">Ultima segnalazione: {speciesById(last.species_id)?.label}, {last.phase_code}, {new Date(last.observed_on + 'T12:00:00').toLocaleDateString('it-IT')}.</p>
            )}
            <div className="tiles">
              <button onClick={() => go('mine')}><b>{obs.length}</b><span>Le mie osservazioni</span></button>
              <button onClick={() => go('sites')}><b>{sites.length}</b><span>I miei luoghi</span></button>
              <button onClick={() => go('info')}><b>?</b><span>Come partecipare</span></button>
            </div>
            <button className="card fc-teaser" onClick={() => go('forecast')}>
              <b>Previsioni delle fioriture ›</b>
              <span>Quando fioriscono acacia, castagno, tiglio e le altre specie nella tua zona (versione sperimentale).</span>
            </button>
            {admin && store.mode === 'supabase' && <button className="btn link" onClick={() => go('export')}>Esportazione dati (responsabili)</button>}
            {store.mode === 'demo' && <button className="btn link" onClick={() => go('export')}>Prova l'esportazione CSV</button>}
            <Istituzionale />
          </section>
        )}

        {view === 'new' && (
          <NewObservation
            store={store}
            sites={sites}
            observations={obs}
            editing={editing}
            onCancel={() => go(editing ? 'mine' : 'home')}
            onSitesChanged={refresh}
            onSaved={async () => {
              const wasEdit = !!editing
              await refresh()
              go(wasEdit ? 'mine' : 'home')
              flash(wasEdit ? 'Correzione salvata ✓' : 'Grazie! Segnalazione inviata ✓')
            }}
          />
        )}

        {view === 'mine' && (
          <MyObservations
            observations={obs}
            sites={sites}
            onNew={() => go('new')}
            onEdit={(o) => { setEditing(o); setView('new'); window.scrollTo(0, 0) }}
            onDelete={async (o) => { await store.deleteObservation(o.id); await refresh(); flash('Segnalazione eliminata') }}
          />
        )}
        {view === 'sites' && <Sites store={store} sites={sites} onChanged={refresh} />}
        {view === 'info' && <Info participantId={pid} mode={store.mode} />}
        {view === 'export' && <Export store={store} />}
        {view === 'forecast' && <Forecast sites={sites} />}
      </main>

      <nav className="bottom">
        <button className={view === 'home' ? 'on' : ''} onClick={() => go('home')}>🏠<span>Inizio</span></button>
        <button className={view === 'forecast' ? 'on' : ''} onClick={() => go('forecast')}>🌸<span>Previsioni</span></button>
        <button className={view === 'new' ? 'on' : ''} onClick={() => go('new')}>➕<span>Segnala</span></button>
        <button className={view === 'mine' ? 'on' : ''} onClick={() => go('mine')}>📋<span>Mie</span></button>
        <button className={view === 'info' ? 'on' : ''} onClick={() => go('info')}>ℹ️<span>Info</span></button>
      </nav>
    </>
  )
}
