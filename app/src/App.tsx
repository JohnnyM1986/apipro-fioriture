import { useCallback, useEffect, useMemo, useState } from 'react'
import { createStore } from './lib/store'
import type { Observation, Site } from './lib/types'
import { NewObservation } from './screens/NewObservation'
import { MyObservations } from './screens/MyObservations'
import { Sites } from './screens/Sites'
import { Info } from './screens/Info'
import { Export } from './screens/Export'
import { Forecast } from './screens/Forecast'
import { Home } from './screens/Home'
import { IconForecast, IconHome, IconInfo, IconList, IconPin, IconPlus } from './components/Icons'
import { shortPlace } from './lib/forecast'
import { useForecast } from './lib/useForecast'

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
  const fc = useForecast(sites)
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

  const badge = envLabel ? <span className="env">{envLabel}</span> : null
  const showHeader = view !== 'new' && view !== 'forecast'
  const exportLink =
    (admin && store.mode === 'supabase' && <button className="btn link" onClick={() => go('export')}>Esportazione dati (responsabili)</button>) ||
    (store.mode === 'demo' && <button className="btn link" onClick={() => go('export')}>Prova l'esportazione CSV</button>) ||
    null

  return (
    <>
      {/* su telefono la testata manca in Segnala e Previsioni; su PC c'è sempre, con il menu */}
      <header className={'top' + (showHeader ? '' : ' desk-only')}>
        <button className="brand" onClick={() => go('home')} aria-label="ApiPro Fioriture – Inizio">
          <img src="./img/brand/apipro-logo.png" alt="ApiPro" height={64} />
        </button>
        {badge}
        <nav className="top-nav" aria-label="Menu principale">
          {([['home', 'Inizio'], ['forecast', 'Previsioni'], ['mine', 'Le mie'], ['info', 'Info']] as const).map(([v, label]) => (
            <button key={v} className={view === v || (v === 'mine' && view === 'sites') ? 'on' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>{label}</button>
          ))}
        </nav>
        {fc.point && view !== 'forecast' && (
          <button className="place-chip" onClick={() => go('forecast')} aria-label={`Punto delle previsioni: ${fc.point.name}`}>
            <IconPin /><span>{shortPlace(fc.point.name)}</span>
          </button>
        )}
        <button className="btn ocra small top-new" onClick={() => go('new')}><IconPlus size={18} /> Segnala</button>
      </header>

      <main className={'wrap' + (view === 'new' ? ' wizard-wrap' : '')}>
        {toast && <div className="toast" role="status">{toast}</div>}

        {view === 'home' && (
          <Home
            fc={fc}
            nObs={obs.length}
            nSites={sites.length}
            onNew={() => go('new')}
            onForecast={() => go('forecast')}
            onMine={() => go('mine')}
            onSites={() => go('sites')}
            footer={exportLink}
          />
        )}

        {view === 'new' && (
          <NewObservation
            store={store}
            sites={sites}
            observations={obs}
            editing={editing}
            badge={badge}
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
        {view === 'forecast' && <Forecast fc={fc} badge={badge} sites={sites} />}
      </main>

      {view !== 'new' && (
        <nav className="bottom" aria-label="Menu principale">
          <button className={view === 'home' ? 'on' : ''} aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><IconHome /><span>Inizio</span></button>
          <button className={view === 'forecast' ? 'on' : ''} aria-current={view === 'forecast' ? 'page' : undefined} onClick={() => go('forecast')}><IconForecast /><span>Previsioni</span></button>
          <button className="fab" onClick={() => go('new')} aria-label="Segnala una fioritura"><i><IconPlus size={30} /></i></button>
          <button className={view === 'mine' || view === 'sites' ? 'on' : ''} aria-current={view === 'mine' ? 'page' : undefined} onClick={() => go('mine')}><IconList /><span>Le mie</span></button>
          <button className={view === 'info' ? 'on' : ''} aria-current={view === 'info' ? 'page' : undefined} onClick={() => go('info')}><IconInfo /><span>Info</span></button>
        </nav>
      )}
    </>
  )
}
