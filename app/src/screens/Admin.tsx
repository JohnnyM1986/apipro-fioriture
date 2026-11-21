import { useEffect, useState } from 'react'
import { IconCopy } from '../components/Icons'
import { EVENT_COLUMNS, STRENGTH_COLUMNS, downloadCsv, toCsv, toCsvColumns } from '../lib/csv'
import type { DataStore, MailResult } from '../lib/store'
import type { AccessRequest, Beekeeper } from '../lib/types'

type Tab = 'richieste' | 'apicoltori' | 'esportazioni'

const mailText: Record<MailResult, string> = {
  inviata: 'mail inviata all\'apicoltore',
  non_configurato: 'mail NON inviata: il servizio mail non è ancora attivo (manca la chiave Brevo). Copia il codice e mandalo tu',
  errore: 'mail NON inviata per un errore: copia il codice e mandalo tu, oppure riprova con «Reinvia mail»',
  demo: 'modalità dimostrativa: nessuna mail inviata'
}
const fmtDate = (s: string) => new Date(s).toLocaleDateString('it-IT')

/** Area riservata ai responsabili ApiPRO: richieste di partecipazione, codici degli apicoltori, esportazioni CSV. */
export function Admin({ store, isAdmin, onBecameAdmin, flash }: { store: DataStore; isAdmin: boolean; onBecameAdmin: () => void; flash: (t: string) => void }) {
  const [tab, setTab] = useState<Tab>('richieste')
  if (!isAdmin) return <AdminLogin store={store} onOk={onBecameAdmin} />
  return (
    <section className="admin">
      <h2>Area responsabili</h2>
      <div className="seg" role="tablist" aria-label="Sezioni">
        {([['richieste', 'Richieste'], ['apicoltori', 'Apicoltori'], ['esportazioni', 'Esportazioni']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'richieste' && <Requests store={store} flash={flash} />}
      {tab === 'apicoltori' && <Beekeepers store={store} flash={flash} />}
      {tab === 'esportazioni' && <Exports store={store} />}
    </section>
  )
}

function AdminLogin({ store, onOk }: { store: DataStore; onOk: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true); setErr('')
    try { if (await store.claimAdmin(code)) onOk(); else setErr('Codice non valido.') } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <section className="admin">
      <h2>Area responsabili</h2>
      <div className="card form-card">
        <p>Riservata ai responsabili del progetto ApiPRO. Inserisci il <b>codice responsabili</b>: basta farlo una volta su questo dispositivo.</p>
        <input className="full" type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Codice responsabili" autoComplete="off" />
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={code.length < 10 || busy} onClick={go}>{busy ? 'Verifico…' : 'Entra'}</button>
      </div>
    </section>
  )
}

function CodeBox({ code, flash }: { code: string; flash: (t: string) => void }) {
  return (
    <span className="code-box">
      <code>{code}</code>
      <button className="icon-btn" aria-label="Copia il codice" onClick={async () => { try { await navigator.clipboard.writeText(code); flash('Codice copiato ✓') } catch { flash('Copia non riuscita: selezionalo a mano') } }}><IconCopy /></button>
    </span>
  )
}

function Requests({ store, flash }: { store: DataStore; flash: (t: string) => void }) {
  const [list, setList] = useState<AccessRequest[] | null>(null)
  const [result, setResult] = useState<{ name: string; code: string; mail: MailResult } | null>(null)
  const [busy, setBusy] = useState('')
  const load = () => store.adminRequests().then(setList).catch((e) => flash((e as Error).message))
  useEffect(() => { load() }, [])
  if (!list) return <p className="hint">Caricamento…</p>
  const pending = list.filter((r) => r.status === 'in_attesa')
  const others = list.filter((r) => r.status !== 'in_attesa')
  const approve = async (r: AccessRequest) => {
    setBusy(r.id)
    try { const out = await store.adminApprove(r.id); setResult({ name: r.full_name, code: out.code, mail: out.mail }); load() } catch (e) { flash((e as Error).message) } finally { setBusy('') }
  }
  return (
    <>
      {result && (
        <div className={'card result ' + (result.mail === 'inviata' ? 'ok' : 'warn')}>
          <p><b>{result.name}</b> è abilitato. Codice: <CodeBox code={result.code} flash={flash} /></p>
          <p className="hint">{mailText[result.mail]}.</p>
        </div>
      )}
      <h3>Da approvare ({pending.length})</h3>
      {!pending.length && <p className="hint">Nessuna richiesta in attesa.</p>}
      <ul className="admin-list">
        {pending.map((r) => (
          <li key={r.id} className="card">
            <b>{r.full_name}</b>
            <small>{r.email}{r.phone ? ` · ${r.phone}` : ''}</small>
            <small>{[r.farm, r.municipality].filter(Boolean).join(' · ')} · richiesta del {fmtDate(r.created_at)}</small>
            <div className="row-actions">
              <button className="btn small" disabled={busy === r.id} onClick={() => approve(r)}>{busy === r.id ? 'Approvo…' : 'Approva e invia il codice'}</button>
              <button className="btn link small" onClick={async () => { if (confirm(`Rifiutare la richiesta di ${r.full_name}?`)) { await store.adminReject(r.id); load() } }}>Rifiuta</button>
            </div>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <details className="fc-how">
          <summary>Richieste già gestite ({others.length})</summary>
          <ul className="plain">{others.map((r) => <li key={r.id}>{r.full_name} – {r.status} ({fmtDate(r.created_at)})</li>)}</ul>
        </details>
      )}
    </>
  )
}

function Beekeepers({ store, flash }: { store: DataStore; flash: (t: string) => void }) {
  const [list, setList] = useState<Beekeeper[] | null>(null)
  const load = () => store.adminBeekeepers().then(setList).catch((e) => flash((e as Error).message))
  useEffect(() => { load() }, [])
  if (!list) return <p className="hint">Caricamento…</p>
  const update = async (b: Beekeeper, patch: Partial<Pick<Beekeeper, 'active' | 'trained_on' | 'protocol_delivered'>>) => { await store.adminUpdateBeekeeper(b.id, patch); load() }
  return (
    <>
      <h3>Apicoltori abilitati ({list.length})</h3>
      {!list.length && <p className="hint">Nessun apicoltore abilitato: approva una richiesta.</p>}
      <ul className="admin-list">
        {list.map((b) => (
          <li key={b.id} className={'card' + (b.active ? '' : ' off')}>
            <div className="bk-head"><b>{b.full_name}</b><span className={'pill ' + (b.active ? 'soon' : 'muted')}>{b.active ? 'Attivo' : 'Ritirato'}</span></div>
            <small>{b.email}{b.phone ? ` · ${b.phone}` : ''}</small>
            <small>{[b.farm, b.municipality].filter(Boolean).join(' · ')}</small>
            <p className="bk-code">Codice: <CodeBox code={b.code} flash={flash} />{b.code_sent_at ? <small> · mail inviata il {fmtDate(b.code_sent_at)}</small> : <small> · mail non ancora inviata</small>}</p>
            <div className="bk-fields">
              <label className="field"><span>Formato il</span><input type="date" value={b.trained_on ?? ''} onChange={(e) => update(b, { trained_on: e.target.value || null })} /></label>
              <label className="check"><input type="checkbox" checked={b.protocol_delivered} onChange={(e) => update(b, { protocol_delivered: e.target.checked })} /> Protocollo consegnato</label>
            </div>
            <div className="row-actions">
              {b.active && <button className="btn small secondary" onClick={async () => { const m = await store.adminSendCode(b.id); flash(m === 'inviata' ? 'Mail inviata ✓' : mailText[m]); load() }}>Reinvia mail</button>}
              <button className="btn link small" onClick={async () => { if (confirm('Creare un nuovo codice? Il vecchio non varrà più e l\'apicoltore dovrà inserire il nuovo su ogni dispositivo.')) { const c = await store.adminRenewCode(b.id); flash(`Nuovo codice: ${c}`); load() } }}>Nuovo codice</button>
              <button className="btn link small" onClick={() => { if (confirm(b.active ? `Ritirare il codice di ${b.full_name}? Non potrà più salvare stime.` : `Riattivare ${b.full_name}?`)) update(b, { active: !b.active }) }}>{b.active ? 'Ritira codice' : 'Riattiva'}</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function Exports({ store }: { store: DataStore }) {
  const [msg, setMsg] = useState('')
  const day = () => new Date().toISOString().slice(0, 10)
  const run = async (what: 'fioriture' | 'forza' | 'eventi') => {
    setMsg('Preparo il file…')
    try {
      if (what === 'fioriture') { const r = await store.exportRows(); downloadCsv(toCsv(r), `apipro_osservazioni_${day()}.csv`); setMsg(`Esportate ${r.length} osservazioni.`) }
      if (what === 'forza') { const r = await store.exportStrength(); downloadCsv(toCsvColumns(r, STRENGTH_COLUMNS), `apipro_forza_alveari_${day()}.csv`); setMsg(`Esportate ${r.length} righe (una per lato di favo).`) }
      if (what === 'eventi') { const r = await store.exportEvents(); downloadCsv(toCsvColumns(r, EVENT_COLUMNS), `apipro_altre_segnalazioni_${day()}.csv`); setMsg(`Esportate ${r.length} segnalazioni.`) }
    } catch (e) {
      setMsg('Esportazione non riuscita: ' + (e as Error).message)
    }
  }
  return (
    <>
      <p>File CSV con separatore punto e virgola, apribili con Excel.</p>
      <div className="export-grid">
        <button className="card export-card" onClick={() => run('fioriture')}><b>Fioriture</b><small>Una riga per osservazione, nessun dato personale.</small></button>
        <button className="card export-card" onClick={() => run('forza')}><b>Forza degli alveari</b><small>Una riga per lato di favo, con apicoltore, arnia e i 6 sesti.</small></button>
        <button className="card export-card" onClick={() => run('eventi')}><b>Altre segnalazioni</b><small>Sciami, morie, calabrone asiatico e altro.</small></button>
      </div>
      {store.mode === 'demo' && <p className="hint">Modalità dimostrativa: i file contengono solo i dati di questo dispositivo.</p>}
      {msg && <p className="hint">{msg}</p>}
    </>
  )
}

export default Admin
