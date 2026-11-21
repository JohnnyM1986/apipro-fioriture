import { useEffect, useState, type ReactNode } from 'react'
import { MapPicker } from '../components/MapPicker'
import { SideScorer } from '../components/SideScorer'
import { IconClose, IconHive, IconPin, IconPlus } from '../components/Icons'
import type { DataStore } from '../lib/store'
import type { Site, StrengthStatus, StrengthVisit } from '../lib/types'
import { combProblems, summarize } from '../lib/strength'
import { todayRome } from '../lib/validation'

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT')
const fmt1 = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 1 })

// =====================================================================
// Pagina «Forza degli alveari»: accesso (richiesta o codice) e storico
// =====================================================================
export function StrengthHome({ store, onNew, flash }: { store: DataStore; onNew: () => void; flash: (t: string) => void }) {
  const [status, setStatus] = useState<StrengthStatus | null>(null)
  const [visits, setVisits] = useState<StrengthVisit[]>([])
  const [panel, setPanel] = useState<'none' | 'request' | 'code'>('none')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = async () => {
    try {
      const s = await store.strengthStatus()
      setStatus(s)
      if (s.active) setVisits(await store.listVisits())
    } catch (e) {
      setErr('Non riesco a leggere i dati: ' + (e as Error).message)
    }
  }
  useEffect(() => { load() }, [])

  if (!status) return <section className="forza"><h2>Forza degli alveari</h2><p className="hint">{err || 'Caricamento…'}</p></section>

  if (!status.active)
    return (
      <section className="forza">
        <h2>Forza degli alveari</h2>
        <div className="forza-intro card">
          <span className="ico-tile big"><IconHive size={30} /></span>
          <div>
            <p>Stima a vista della forza delle famiglie con il <b>metodo dei sesti</b>: fotografi il favo, l'app lo raddrizza e lo divide in 6 sesti, tu indichi quante api vedi in ognuno.</p>
            <p>È riservata agli apicoltori che partecipano al progetto ApiPRO e hanno seguito la formazione. Le foto restano sul telefono: si salvano solo i numeri.</p>
          </div>
        </div>
        {status.beekeeperName && <p className="warning">Il codice di {status.beekeeperName} non è più attivo su questo dispositivo: chiedi un nuovo codice ai responsabili.</p>}
        {status.pending && panel === 'none' && (
          <p className="card ok-note">Richiesta inviata ✓ Riceverai il tuo codice per email dopo l'approvazione dei responsabili. Su questo telefono la sezione si attiverà da sola.</p>
        )}
        <div className="forza-actions">
          {!status.pending && <button className="btn ocra" onClick={() => setPanel(panel === 'request' ? 'none' : 'request')}>Chiedi di partecipare</button>}
          <button className="btn secondary" onClick={() => setPanel(panel === 'code' ? 'none' : 'code')}>Ho un codice</button>
          {status.pending && <button className="btn link" onClick={load}>Controlla se è stata approvata</button>}
        </div>
        {panel === 'request' && <AccessRequestForm store={store} onDone={(notified) => { setPanel('none'); flash(notified ? 'Richiesta inviata ✓' : 'Richiesta registrata ✓'); load() }} />}
        {panel === 'code' && <CodeForm store={store} onDone={(name) => { setPanel('none'); flash(`Benvenuto, ${name.split(' ')[0]} ✓`); load() }} />}
      </section>
    )

  return (
    <section className="forza">
      <div className="forza-top">
        <div>
          <h2>Forza degli alveari</h2>
          <p className="hint">Apicoltore: <b>{status.beekeeperName}</b> · le foto restano sul telefono, si salvano solo i valori dei sesti.</p>
        </div>
        <button className="btn ocra" onClick={onNew}><IconPlus size={20} /> Nuova stima</button>
      </div>
      <details className="fc-how">
        <summary>Come si fa (promemoria)</summary>
        <ol className="plain">
          <li>Scegli l'apiario, scrivi il nome o il numero dell'arnia.</li>
          <li>Per ogni favo fotografa il lato A, tocca i 4 angoli del favo (in alto a sinistra, in alto a destra, in basso a destra, in basso a sinistra): l'app raddrizza la foto e la divide in 6 sesti.</li>
          <li>Per ogni sesto indica quanti sesti della sua superficie sono coperti di api, da 0 (vuoto) a 6 (pieno). Poi fai lo stesso con il lato B.</li>
          <li>Se la foto non viene bene puoi valutare il favo «senza foto», direttamente a vista.</li>
        </ol>
        <p className="fc-small">Segui il protocollo consegnato durante la formazione. [Protocollo in PDF: DA VERIFICARE]</p>
      </details>

      <h3>Le tue stime ({visits.length})</h3>
      {!visits.length && <p className="hint">Non hai ancora salvato stime.</p>}
      <ul className="visit-list">
        {visits.map((v) => {
          const s = summarize(v.combs)
          return (
            <li key={v.id} className={open === v.id ? 'open' : ''}>
              <button className="visit-row" onClick={() => setOpen(open === v.id ? null : v.id)} aria-expanded={open === v.id}>
                <span className="ico-tile"><IconHive size={22} /></span>
                <span className="visit-main">
                  <b>{v.hive_label}</b>
                  <small>{fmtDate(v.visited_on)}{v.site_name ? ` · ${v.site_name}` : ''}</small>
                </span>
                <span className="visit-num"><b>{s.total}</b><small>{s.combs} {s.combs === 1 ? 'favo' : 'favi'}</small></span>
              </button>
              {open === v.id && (
                <div className="visit-detail">
                  <table>
                    <thead><tr><th>Favo</th><th>Lato A</th><th>Lato B</th></tr></thead>
                    <tbody>
                      {v.combs.map((c) => (
                        <tr key={c.n}><td>{c.n}</td><td>{c.a ? c.a.join(' ') + ` (${c.a.reduce((x, y) => x + y, 0)})` : '—'}</td><td>{c.b ? c.b.join(' ') + ` (${c.b.reduce((x, y) => x + y, 0)})` : '—'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="hint">Totale {s.total} su {s.max} · media per lato {s.meanPerSide != null ? fmt1(s.meanPerSide) : '—'} su 36{v.note ? ` · ${v.note}` : ''}</p>
                  <button className="btn link" onClick={async () => { if (confirm('Eliminare questa stima?')) { await store.deleteVisit(v.id); flash('Stima eliminata'); load() } }}>Elimina</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function AccessRequestForm({ store, onDone }: { store: DataStore; onDone: (notified: boolean) => void }) {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', farm: '', municipality: '' })
  const [privacy, setPrivacy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())
  const ok = f.full_name.trim().length >= 2 && emailOk && f.municipality.trim().length >= 2 && privacy

  const send = async () => {
    setBusy(true); setErr('')
    try {
      const r = await store.requestStrengthAccess({
        full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim() || null, farm: f.farm.trim() || null, municipality: f.municipality.trim()
      })
      onDone(r.notified)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card form-card">
      <h3>Chiedi di partecipare</h3>
      <label className="field"><span>Nome e cognome *</span><input value={f.full_name} onChange={set('full_name')} maxLength={120} autoComplete="name" /></label>
      <label className="field"><span>Email * <small>(qui riceverai il codice)</small></span><input type="email" value={f.email} onChange={set('email')} maxLength={200} autoComplete="email" /></label>
      <label className="field"><span>Telefono</span><input type="tel" value={f.phone} onChange={set('phone')} maxLength={40} autoComplete="tel" /></label>
      <label className="field"><span>Azienda apistica</span><input value={f.farm} onChange={set('farm')} maxLength={120} autoComplete="organization" /></label>
      <label className="field"><span>Comune degli apiari *</span><input value={f.municipality} onChange={set('municipality')} maxLength={120} /></label>
      <label className="check">
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
        <span>Accetto che nome e contatti siano usati dal Gruppo Operativo ApiPRO solo per gestire la mia partecipazione alla stima della forza degli alveari. [Informativa completa: DA VERIFICARE]</span>
      </label>
      {f.email && !emailOk && <p className="error">Controlla l'indirizzo email.</p>}
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={!ok || busy} onClick={send}>{busy ? 'Invio…' : 'Invia la richiesta'}</button>
    </div>
  )
}

function CodeForm({ store, onDone }: { store: DataStore; onDone: (name: string) => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true); setErr('')
    try { onDone(await store.redeemCode(code)) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="card form-card">
      <h3>Inserisci il tuo codice</h3>
      <p className="hint">È nella mail ricevuta dopo l'approvazione, per esempio APR-7K3F-2M9Q. Basta inserirlo una volta su ogni telefono o tablet.</p>
      <input className="full code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="APR-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} />
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={code.replace(/[^A-Za-z0-9]/g, '').length < 8 || busy} onClick={go}>{busy ? 'Verifico…' : 'Conferma'}</button>
    </div>
  )
}

// =====================================================================
// Nuova stima: apiario, arnia, favi (lato A e B) con griglia dei sesti
// =====================================================================
type DraftComb = { n: number; a: (number | null)[] | null; b: (number | null)[] | null }
interface Draft { date: string; siteId: string | null; siteName: string; lat: number | null; lon: number | null; hive: string; note: string; combs: DraftComb[] }
const DRAFT_KEY = 'apipro.forzaBozza'

function loadDraft(): Draft | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null } catch { return null }
}

export function StrengthVisitForm({ store, sites, badge, onCancel, onSaved }: { store: DataStore; sites: Site[]; badge?: ReactNode; onCancel: () => void; onSaved: () => void }) {
  const today = todayRome()
  const [restored] = useState(() => loadDraft())
  const [d, setD] = useState<Draft>(() => restored ?? { date: today, siteId: null, siteName: '', lat: null, lon: null, hive: '', note: '', combs: [{ n: 1, a: null, b: null }] })
  const [newPlace, setNewPlace] = useState(() => (restored ? !restored.siteId && restored.lat != null : sites.length === 0))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // bozza sul dispositivo (solo i numeri, mai le foto): si riprende se la pagina si chiude per sbaglio
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* memoria piena o non disponibile */ } }, [d])
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* */ } }

  const setComb = (i: number, side: 'a' | 'b', v: (number | null)[] | null) =>
    setD((x) => ({ ...x, combs: x.combs.map((c, k) => (k === i ? { ...c, [side]: v } : c)) }))
  const addComb = () => setD((x) => ({ ...x, combs: [...x.combs, { n: Math.max(0, ...x.combs.map((c) => c.n)) + 1, a: null, b: null }] }))
  const removeComb = (i: number) => setD((x) => ({ ...x, combs: x.combs.filter((_, k) => k !== i) }))

  const problems = [
    (d.lat == null || d.lon == null) && 'Indica l\'apiario',
    !d.hive.trim() && 'Scrivi il nome o il numero dell\'arnia',
    (!d.date || d.date > today) && 'Indica una data valida (non futura)',
    ...combProblems(d.combs)
  ].filter(Boolean) as string[]
  const sum = summarize(d.combs.map((c) => ({ n: c.n, a: c.a?.every((x) => x != null) ? (c.a as number[]) : null, b: c.b?.every((x) => x != null) ? (c.b as number[]) : null })))

  const save = async () => {
    if (problems.length) return setErr(problems.join('. ') + '.')
    setBusy(true); setErr('')
    try {
      await store.saveVisit({
        visited_on: d.date, site_id: d.siteId, site_name: d.siteName || null, lat: d.lat!, lon: d.lon!, hive_label: d.hive.trim(), note: d.note.trim() || null,
        combs: d.combs.map((c, k) => ({ n: k + 1, a: c.a as number[] | null, b: c.b as number[] | null }))
      })
      clearDraft()
      onSaved()
    } catch (e) {
      setErr('Salvataggio non riuscito: ' + ((e as Error).message || 'riprova'))
    } finally {
      setBusy(false)
    }
  }
  const cancel = () => {
    const touched = d.combs.some((c) => c.a || c.b) || d.hive
    if (!touched || confirm('Uscire? La stima non salvata verrà persa.')) { clearDraft(); onCancel() }
  }

  return (
    <div className="wizard forza-form">
      <div className="step-head">
        <p className="step-no">Stima della forza</p>
        {badge}
        <button type="button" className="icon-btn" onClick={cancel} aria-label="Chiudi la stima"><IconClose /></button>
      </div>
      {restored && <p className="hint">Ho ripreso la stima che non avevi salvato (le foto non vengono conservate).</p>}

      <section className="forza-where">
        <h2>Apiario e arnia</h2>
        {sites.length > 0 && (
          <div className="site-chips">
            {sites.map((s) => (
              <button key={s.id} type="button" className={'chip' + (d.siteId === s.id ? ' on' : '')}
                onClick={() => { setD({ ...d, siteId: s.id, siteName: s.name, lat: s.lat, lon: s.lon }); setNewPlace(false) }}>
                <IconPin />{s.name}
              </button>
            ))}
            <button type="button" className={'chip' + (newPlace ? ' on' : '')} onClick={() => { setNewPlace(true); setD({ ...d, siteId: null, siteName: '', lat: null, lon: null }) }}>
              <IconPlus size={14} />Altro punto
            </button>
          </div>
        )}
        {newPlace && (
          <>
            <MapPicker lat={d.lat} lon={d.lon} onChange={(a, b) => setD((x) => ({ ...x, lat: a, lon: b }))} height={260} hint="Tocca la mappa nel punto dell'apiario." />
            <label className="field"><span>Nome dell'apiario (facoltativo)</span><input value={d.siteName} maxLength={80} onChange={(e) => setD({ ...d, siteName: e.target.value })} /></label>
          </>
        )}
        <div className="field-row">
          <label className="field"><span>Arnia *</span><input value={d.hive} maxLength={40} placeholder="Es. Arnia 12" onChange={(e) => setD({ ...d, hive: e.target.value })} /></label>
          <label className="field"><span>Data</span><input type="date" value={d.date} max={today} onChange={(e) => setD({ ...d, date: e.target.value })} /></label>
        </div>
      </section>

      <section>
        <h2>Favi</h2>
        <p className="hint">Per ogni favo valuta il lato A e il lato B. I sesti sono numerati 1 2 3 in alto e 4 5 6 in basso.</p>
        {d.combs.map((c, i) => (
          <div key={c.n} className="comb-card">
            <div className="comb-head">
              <b>Favo {i + 1}</b>
              {d.combs.length > 1 && <button type="button" className="btn link" onClick={() => { if (!(c.a || c.b) || confirm(`Togliere il favo ${i + 1}?`)) removeComb(i) }}>Togli favo</button>}
            </div>
            <div className="comb-sides">
              <SideScorer label="Lato A" value={c.a} onChange={(v) => setComb(i, 'a', v)} />
              <SideScorer label="Lato B" value={c.b} onChange={(v) => setComb(i, 'b', v)} />
            </div>
          </div>
        ))}
        <button type="button" className="btn secondary add-comb" onClick={addComb}><IconPlus size={18} /> Aggiungi favo</button>
      </section>

      <section>
        <div className="card forza-sum">
          <div><b>{sum.combs}</b><small>{sum.combs === 1 ? 'favo' : 'favi'}</small></div>
          <div><b>{sum.sides}</b><small>lati completi</small></div>
          <div><b>{sum.total}</b><small>totale sesti</small></div>
          <div><b>{sum.meanPerSide != null ? fmt1(sum.meanPerSide) : '—'}</b><small>media per lato (su 36)</small></div>
        </div>
        <h2>Note (facoltative)</h2>
        <textarea className="full" rows={3} maxLength={1000} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Meteo, ora della visita, stato della famiglia…" />
        {problems.length > 0 && <p className="hint">Per salvare: {problems.join(' · ')}.</p>}
        {err && <p className="error">{err}</p>}
      </section>

      <div className="wizard-nav">
        <button type="button" className="btn secondary" onClick={cancel}>Annulla</button>
        <button type="button" className="btn" disabled={busy || problems.length > 0} onClick={save}>{busy ? 'Salvataggio…' : 'Salva stima'}</button>
      </div>
    </div>
  )
}

export default StrengthHome
