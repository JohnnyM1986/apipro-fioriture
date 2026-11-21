import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { createStore } from './lib/store'
import type { GenericEvent, Observation, Site } from './lib/types'
import { NewObservation } from './screens/NewObservation'
import { MyObservations } from './screens/MyObservations'
import { Sites } from './screens/Sites'
import { Info } from './screens/Info'
import { Forecast } from './screens/Forecast'
import { Home } from './screens/Home'
import { ChooseReport } from './screens/ChooseReport'
import { EventReport } from './screens/EventReport'
import { IconForecast, IconHome, IconInfo, IconList, IconPin, IconPlus } from './components/Icons'
import { shortPlace } from './lib/forecast'
import { useForecast } from './lib/useForecast'

// sezioni usate da pochi: caricate solo quando si aprono (l'app resta leggera per chi segnala le fioriture)
const StrengthHome = lazy(() => import('./screens/Strength').then((m) => ({ default: m.StrengthHome })))
const StrengthVisitForm = lazy(() => import('./screens/Strength').then((m) => ({ default: m.StrengthVisitForm })))
const Admin = lazy(() => import('./screens/Admin'))

type View = 'home' | 'choose' | 'new' | 'event' | 'mine' | 'sites' | 'info' | 'admin' | 'forecast' | 'forza' | 'forza-new'
/** schermate a tutta pagina con pulsanti fissi in basso (niente barra di navigazione su telefono) */
const FULL: View[] = ['new', 'event', 'forza-new']

export default function App() {
  const store = useMemo(() => createStore(), [])
  const [pid, setPid] = useState('')
  const [ready, setReady] = useState(false)
  const [fatal, setFatal] = useState('')
  const [view, setView] = useState<View>('home')
  const [sites, setSites] = useState<Site[]>([])
  const [obs, setObs] = useState<Observation[]>([])
  const [events, setEvents] = useState<GenericEvent[]>([])
  const [editing, setEditing] = useState<Observation | null>(null)
  const [admin, setAdmin] = useState(false)
  const [toast, setToast] = useState('')
  const fc = useForecast(sites)
  const envLabel = (import.meta.env.VITE_ENV_LABEL as string | undefined) ?? (store.mode === 'demo' ? 'DEMO' : '')

  const refresh = useCallback(async () => {
    const [s, o, e] = await Promise.all([store.listSites(), store.listObservations(), store.listEvents().catch(() => [] as GenericEvent[])])
    setSites(s); setObs(o); setEvents(e)
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
  const full = FULL.includes(view)
  const showHeader = !full && view !== 'forecast'
  const adminLink = (admin || store.mode === 'demo') && (
    <button className="btn link" onClick={() => go('admin')}>Area responsabili{store.mode === 'demo' ? ' (prova)' : ''}</button>
  )
  const loading = <p className="hint">Caricamento…</p>

  return (
    <>
      {/* su telefono la testata manca nelle schermate a tutta pagina e in Previsioni; su PC c'è sempre, con il menu */}
      <header className={'top' + (showHeader ? '' : ' desk-only')}>
        <button className="brand" onClick={() => go('home')} aria-label="ApiPro Fioriture – Inizio">
          <img src="./img/brand/apipro-logo.png" alt="ApiPro" height={64} />
        </button>
        {badge}
        <nav className="top-nav" aria-label="Menu principale">
          {([['home', 'Inizio'], ['forecast', 'Previsioni'], ['forza', 'Forza alveari'], ['mine', 'Le mie'], ['info', 'Info']] as const).map(([v, label]) => (
            <button key={v} className={view === v || (v === 'mine' && view === 'sites') || (v === 'forza' && view === 'forza-new') ? 'on' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>{label}</button>
          ))}
        </nav>
        {fc.point && view !== 'forecast' && (
          <button className="place-chip" onClick={() => go('forecast')} aria-label={`Punto delle previsioni: ${fc.point.name}`}>
            <IconPin /><span>{shortPlace(fc.point.name)}</span>
          </button>
        )}
        <button className="btn ocra small top-new" onClick={() => go('choose')}><IconPlus size={18} /> Segnala</button>
      </header>

      <main className={'wrap' + (full ? ' wizard-wrap' : '')}>
        {toast && <div className="toast" role="status">{toast}</div>}

        {view === 'home' && (
          <Home
            fc={fc}
            nObs={obs.length + events.length}
            nSites={sites.length}
            onNew={() => go('new')}
            onForecast={() => go('forecast')}
            onMine={() => go('mine')}
            onSites={() => go('sites')}
            onStrength={() => go('forza')}
            footer={adminLink}
          />
        )}

        {view === 'choose' && <ChooseReport onFlowering={() => go('new')} onEvent={() => go('event')} onStrength={() => go('forza')} />}

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

        {view === 'event' && (
          <EventReport store={store} sites={sites} badge={badge} onCancel={() => go('home')}
            onSaved={async () => { await refresh(); go('home'); flash('Grazie! Segnalazione inviata ✓') }} />
        )}

        {view === 'mine' && (
          <MyObservations
            observations={obs}
            events={events}
            sites={sites}
            onNew={() => go('choose')}
            onEdit={(o) => { setEditing(o); setView('new'); window.scrollTo(0, 0) }}
            onDelete={async (o) => { await store.deleteObservation(o.id); await refresh(); flash('Segnalazione eliminata') }}
            onDeleteEvent={async (e) => { await store.deleteEvent(e.id); await refresh(); flash('Segnalazione eliminata') }}
            onStrength={() => go('forza')}
          />
        )}
        {view === 'sites' && <Sites store={store} sites={sites} onChanged={refresh} />}
        {view === 'info' && <Info participantId={pid} mode={store.mode} onAdmin={() => go('admin')} />}
        {view === 'forecast' && <Forecast fc={fc} badge={badge} sites={sites} />}

        <Suspense fallback={loading}>
          {view === 'forza' && <StrengthHome store={store} onNew={() => go('forza-new')} flash={flash} />}
          {view === 'forza-new' && (
            <StrengthVisitForm store={store} sites={sites} badge={badge} onCancel={() => go('forza')}
              onSaved={() => { go('forza'); flash('Stima salvata ✓ Puoi scaricare il PDF') }} />
          )}
          {view === 'admin' && <Admin store={store} isAdmin={admin || store.mode === 'demo'} onBecameAdmin={() => { setAdmin(true); flash('Accesso responsabili attivo ✓') }} flash={flash} />}
        </Suspense>
      </main>

      {!full && (
        <nav className="bottom" aria-label="Menu principale">
          <button className={view === 'home' ? 'on' : ''} aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><IconHome /><span>Inizio</span></button>
          <button className={view === 'forecast' ? 'on' : ''} aria-current={view === 'forecast' ? 'page' : undefined} onClick={() => go('forecast')}><IconForecast /><span>Previsioni</span></button>
          <button className="fab" onClick={() => go('choose')} aria-label="Nuova segnalazione"><i><IconPlus size={30} /></i></button>
          <button className={['mine', 'sites', 'forza'].includes(view) ? 'on' : ''} aria-current={view === 'mine' ? 'page' : undefined} onClick={() => go('mine')}><IconList /><span>Le mie</span></button>
          <button className={view === 'info' || view === 'admin' ? 'on' : ''} aria-current={view === 'info' ? 'page' : undefined} onClick={() => go('info')}><IconInfo /><span>Info</span></button>
        </nav>
      )}
    </>
  )
}
