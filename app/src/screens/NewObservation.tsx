import { useMemo, useState, type ReactNode } from 'react'
import { PHASES, SPECIES, phaseByCode, speciesById, type PhaseCode } from '../data/catalog'
import { MapPicker } from '../components/MapPicker'
import { PhaseIcon } from '../components/PhaseIcon'
import { SpeciesBadge } from '../components/SpeciesBadge'
import { IconCheck, IconClose, IconPin, IconPlus } from '../components/Icons'
import type { DataStore } from '../lib/store'
import type { LocationSource, Observation, Site } from '../lib/types'
import { WARNING_TEXT, qcWarnings, requiredErrors, todayRome } from '../lib/validation'

interface Props {
  store: DataStore
  sites: Site[]
  observations: Observation[]
  editing?: Observation | null
  onSaved: (o: Observation) => void
  onSitesChanged: () => void
  onCancel: () => void
  badge?: ReactNode
}

const STEPS = ['Luogo', 'Pianta', 'Fase', 'Data', 'Foto e note', 'Conferma']

export function NewObservation({ store, sites, observations, editing, onSaved, onSitesChanged, onCancel, badge }: Props) {
  const today = todayRome()
  const [step, setStep] = useState(editing ? 5 : 0)
  const [siteId, setSiteId] = useState<string | null>(editing?.site_id ?? null)
  const [lat, setLat] = useState<number | null>(editing?.lat ?? null)
  const [lon, setLon] = useState<number | null>(editing?.lon ?? null)
  const [locSrc, setLocSrc] = useState<LocationSource | null>(editing?.location_source ?? null)
  const [newPlace, setNewPlace] = useState(editing ? !editing.site_id : sites.length === 0)
  const [saveAsSite, setSaveAsSite] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [speciesId, setSpeciesId] = useState<string | null>(editing?.species_id ?? null)
  const [filter, setFilter] = useState('')
  const [phase, setPhase] = useState<PhaseCode | null>(editing?.phase_code ?? null)
  const [date, setDate] = useState(editing?.observed_on ?? today)
  const [note, setNote] = useState(editing?.note ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [keepPhoto, setKeepPhoto] = useState<string | null>(editing?.photo_url ?? null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const draft = { lat, lon, species_id: speciesId, phase_code: phase, observed_on: date, site_id: siteId, id: editing?.id }
  const errors = requiredErrors(draft, today)
  const warnings = useMemo(() => qcWarnings(draft, observations), [lat, lon, speciesId, phase, date, siteId, observations])
  const species = speciesId ? speciesById(speciesId) : undefined
  const chip = species && <span className="sp-chip"><SpeciesBadge s={species} size={30} />{species.label}</span>

  const stepOk = [
    lat != null && lon != null && (!newPlace || !saveAsSite || siteName.trim().length > 0),
    !!speciesId,
    !!phase,
    !requiredErrors({ ...draft }, today).some((e) => e.includes('data') || e.includes('futura')),
    true,
    errors.length === 0
  ]

  const pickSite = (s: Site) => {
    setSiteId(s.id); setLat(s.lat); setLon(s.lon); setLocSrc('site'); setNewPlace(false)
  }

  const submit = async () => {
    if (errors.length) return setErr(errors.join('. '))
    setBusy(true); setErr('')
    try {
      let sId = siteId
      if (newPlace && saveAsSite && siteName.trim()) {
        const s = await store.saveSite({ name: siteName.trim(), lat: lat!, lon: lon! })
        sId = s.id
        onSitesChanged()
      }
      const saved = await store.saveObservation(
        {
          id: editing?.id,
          site_id: newPlace ? sId : siteId,
          species_id: speciesId!,
          phase_code: phase!,
          observed_on: date,
          lat: lat!,
          lon: lon!,
          location_source: locSrc,
          note: note.trim() || null,
          photo,
          keep_photo_url: photo ? null : keepPhoto
        },
        warnings
      )
      onSaved(saved)
    } catch (e) {
      setErr('Salvataggio non riuscito: ' + ((e as Error).message || 'riprova'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wizard">
      <ol className="progress" aria-label="Passaggi">
        {STEPS.map((s, i) => (
          <li key={s} className={i <= step ? 'done' : ''}>
            <button type="button" onClick={() => (i <= step || stepOk.slice(0, i).every(Boolean)) && setStep(i)} aria-current={i === step ? 'step' : undefined} aria-label={`Passo ${i + 1}: ${s}`} />
          </li>
        ))}
      </ol>
      <div className="step-head">
        <p className="step-no">Passo {step + 1} di {STEPS.length}</p>
        {badge}
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Chiudi la segnalazione"><IconClose /></button>
      </div>

      {step === 0 && (
        <section>
          <h2>Dove si trovano le piante?</h2>
          <div className={'luogo' + (newPlace ? ' with-map' : '')}>
          {sites.length > 0 && (
            <div className="choice-list luogo-choices">
              {sites.map((s) => (
                <button key={s.id} type="button" className={'choice' + (siteId === s.id && !newPlace ? ' sel' : '')} onClick={() => pickSite(s)}>
                  <span className="ico-tile"><IconPin /></span>
                  <span><b>{s.name}</b><small>Luogo salvato</small></span>
                </button>
              ))}
              <button type="button" className={'choice' + (newPlace ? ' sel' : '')} onClick={() => { setNewPlace(true); setSiteId(null); setLat(null); setLon(null) }}>
                <span className="ico-tile"><IconPlus size={18} /></span>
                <span><b>Nuovo luogo</b><small>Segnalazione occasionale o nuovo luogo abituale</small></span>
              </button>
            </div>
          )}
          {newPlace && (
            <>
              <div className="luogo-map">
                <MapPicker lat={lat} lon={lon} onChange={(a, b, src) => { setLat(a); setLon(b); setLocSrc(src) }} />
              </div>
              <div className="luogo-extra">
              <label className="check">
                <input type="checkbox" checked={saveAsSite} onChange={(e) => setSaveAsSite(e.target.checked)} />
                Salva come luogo abituale (ci tornerò)
              </label>
              {saveAsSite && (
                <input className="full" maxLength={80} value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Nome del luogo (es. Apiario Montello, prato dietro casa)" />
              )}
              </div>
            </>
          )}
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2>Quale pianta hai riconosciuto?</h2>
          <p className="hint">Segnala solo le piante che riconosci con sicurezza. Una pianta per segnalazione.</p>
          <input className="full" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cerca la pianta" />
          <div className="choice-list">
            {SPECIES.filter((s) => (s.label + ' ' + s.scientific).toLowerCase().includes(filter.toLowerCase())).map((s) => (
              <button key={s.id} type="button" className={'choice' + (speciesId === s.id ? ' sel' : '')} onClick={() => { setSpeciesId(s.id); setStep(2) }}>
                <SpeciesBadge s={s} />
                <span><b>{s.label}</b><small><i>{s.scientific}</i> · {s.habitat}</small></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>In che fase è la fioritura?</h2>
          {chip}
          <p className="hint">Guarda l'aspetto generale del gruppo di piante, non un singolo fiore. Non servono percentuali.{species?.hint ? ' ' + species.hint + '.' : ''}</p>
          <div className="phase-grid">
            {PHASES.map((p) => (
              <button key={p.code} type="button" className={'phase-card' + (phase === p.code ? ' sel' : '')} aria-pressed={phase === p.code} onClick={() => { setPhase(p.code); setStep(3) }}>
                <span className="phase-tile">
                  <PhaseIcon code={p.code} size={96} />
                  <small className="phase-code">{p.code}</small>
                  {phase === p.code && <span className="phase-check"><IconCheck /></span>}
                </span>
                <b>{p.label}</b>
                <small>{p.definition}</small>
              </button>
            ))}
          </div>
          <p className="hint">Se non sei sicuro della fase, è meglio aspettare la prossima visita.</p>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>Quando hai visto le piante?</h2>
          {chip}
          <input className="full" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          <p className="hint">Se compili più tardi, indica la data reale dell'osservazione.</p>
          {date > today && <p className="error">La data non può essere futura.</p>}
        </section>
      )}

      {step === 4 && (
        <section>
          <h2>Foto e note (facoltative)</h2>
          {chip}
          <label className="file">
            📷 {photo ? photo.name : keepPhoto ? 'Sostituisci la foto' : 'Aggiungi una foto'}
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          {(photo || keepPhoto) && (
            <div className="photo-prev">
              <img src={photo ? URL.createObjectURL(photo) : keepPhoto!} alt="Foto della segnalazione" />
              <button type="button" className="btn link" onClick={() => { setPhoto(null); setKeepPhoto(null) }}>Rimuovi foto</button>
            </div>
          )}
          <textarea className="full" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note. Segnala qui eventi come sfalcio, raccolta o rimozione della vegetazione." />
          <p className="hint">Se la fioritura è finita per uno sfalcio o una raccolta, scrivilo qui e non indicare F5 solo per questo.</p>
        </section>
      )}

      {step === 5 && (
        <section>
          <h2>{editing ? 'Correggi la segnalazione' : 'Controlla e invia'}</h2>
          <dl className="summary">
            <dt>Pianta</dt><dd>{species ? <>{species.label} <i>({species.scientific})</i></> : '—'} <button type="button" className="btn link" onClick={() => setStep(1)}>modifica</button></dd>
            <dt>Fase</dt><dd>{phase ? `${phase} · ${phaseByCode(phase)?.label}` : '—'} <button type="button" className="btn link" onClick={() => setStep(2)}>modifica</button></dd>
            <dt>Data</dt><dd>{date ? new Date(date + 'T12:00:00').toLocaleDateString('it-IT') : '—'} <button type="button" className="btn link" onClick={() => setStep(3)}>modifica</button></dd>
            <dt>Luogo</dt><dd>{siteId ? sites.find((s) => s.id === siteId)?.name : saveAsSite && siteName ? siteName + ' (nuovo)' : 'Segnalazione occasionale'} <button type="button" className="btn link" onClick={() => setStep(0)}>modifica</button></dd>
            {note && (<><dt>Note</dt><dd>{note}</dd></>)}
            {(photo || keepPhoto) && (<><dt>Foto</dt><dd>presente</dd></>)}
          </dl>
          {lat != null && lon != null && <MapPicker lat={lat} lon={lon} onChange={() => {}} readOnly height={180} />}
          {warnings.map((w) => <p key={w} className="warning">⚠️ {WARNING_TEXT[w] ?? w} Puoi comunque inviare.</p>)}
          {errors.length > 0 && <p className="error">{errors.join('. ')}.</p>}
          {err && <p className="error">{err}</p>}
        </section>
      )}

      <div className="wizard-nav">
        <button type="button" className="btn secondary" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>{step === 0 ? 'Annulla' : 'Indietro'}</button>
        {step < 5 ? (
          <button type="button" className="btn" disabled={!stepOk[step]} onClick={() => setStep(step + 1)}>Avanti</button>
        ) : (
          <button type="button" className="btn" disabled={busy || errors.length > 0} onClick={submit}>{busy ? 'Salvataggio…' : editing ? 'Salva correzione' : 'Invia segnalazione'}</button>
        )}
      </div>
    </div>
  )
}
