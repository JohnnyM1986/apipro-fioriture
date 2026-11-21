import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { IconCamera } from './Icons'
import { rectify } from '../lib/rectify'
import { GRID_COLS, GRID_ROWS, MAX_VALUE, SESTI, emptySide, nextEmpty, sideTotal } from '../lib/strength'

const CORNERS = ['alto a sinistra', 'alto a destra', 'basso a destra', 'basso a sinistra']
type Mode = 'idle' | 'corners' | 'working' | 'grid'

interface Props {
  label: string // «Lato A»
  value: (number | null)[] | null
  onChange: (v: (number | null)[] | null) => void
}

/**
 * Un lato del favo: foto (solo sul dispositivo), 4 angoli per raddrizzarla, griglia dei sesti
 * 3 colonne × 2 righe e valutazione a vista 0–6 per ogni sesto. La foto non viene mai salvata né inviata.
 */
export function SideScorer({ label, value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>(value ? 'grid' : 'idle')
  const [photo, setPhoto] = useState<string | null>(null) // foto originale (URL locale)
  const [pts, setPts] = useState<{ u: number; v: number }[]>([])
  const [flat, setFlat] = useState<{ url: string; width: number; height: number } | null>(null)
  const [sel, setSel] = useState<number | null>(value ? nextEmpty(value, -1) : 0)
  const [err, setErr] = useState('')
  const urls = useRef<string[]>([])
  const box = useRef<HTMLDivElement>(null)

  // le foto restano in memoria solo finché la pagina è aperta
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])
  // foto e griglia sempre intere sullo schermo: si toccano angoli e sesti senza dover scorrere
  useEffect(() => {
    if (mode === 'corners' || mode === 'grid') box.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [mode, photo])
  const keep = (u: string) => { urls.current.push(u); return u }

  const pickFile = (f: File | undefined) => {
    if (!f) return
    setErr('')
    setPhoto(keep(URL.createObjectURL(f)))
    setPts([]); setFlat(null); setMode('corners')
  }

  const tap = async (e: MouseEvent<HTMLDivElement>) => {
    if (pts.length >= 4 || !photo) return
    const r = e.currentTarget.getBoundingClientRect()
    const next = [...pts, { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height }]
    setPts(next)
    if (next.length === 4) await finish(next)
  }

  const finish = async (corners: { u: number; v: number }[]) => {
    setMode('working')
    try {
      const out = await rectify(photo!, corners)
      keep(out.url)
      setFlat(out)
      if (!value) onChange(emptySide())
      setSel(value ? nextEmpty(value, -1) : 0)
      setMode('grid')
    } catch {
      setErr('Non riesco a raddrizzare la foto: rifai i 4 angoli.')
      setPts([]); setMode('corners')
    }
  }

  const setVal = (n: number) => {
    if (sel == null || !value) return
    const v = [...value]
    v[sel] = n
    onChange(v)
    setSel(nextEmpty(v, sel))
  }

  const total = sideTotal(value)
  const done = !!value && value.every((x) => x != null)

  return (
    <div className="side">
      <div className="side-head">
        <b>{label}</b>
        {value && <span className={'side-total' + (done ? ' done' : '')}>{total} / {SESTI * MAX_VALUE}</span>}
      </div>

      {mode === 'idle' && (
        <div className="side-start">
          <label className="btn secondary side-photo">
            <IconCamera /> Foto del lato
            <input type="file" accept="image/*" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
          <button type="button" className="btn quiet" onClick={() => { onChange(emptySide()); setSel(0); setMode('grid') }}>Valuta senza foto</button>
        </div>
      )}

      {(mode === 'corners' || mode === 'working') && photo && (
        <div className="corners">
          <p className="corner-step">
            {mode === 'working' ? 'Raddrizzo la foto…' : <>Tocca l'angolo del favo <b>{CORNERS[pts.length]}</b> ({pts.length + 1}/4)</>}
          </p>
          <div className="corner-img" ref={box} onClick={tap} role="button" aria-label={`Tocca l'angolo ${CORNERS[pts.length] ?? ''}`}>
            <img src={photo} alt={`Foto del favo, ${label}`} draggable={false} />
            {pts.map((p, i) => <span key={i} className="corner-dot" style={{ left: `${p.u * 100}%`, top: `${p.v * 100}%` }}>{i + 1}</span>)}
          </div>
          <div className="row-actions">
            <button type="button" className="btn link" disabled={!pts.length} onClick={() => setPts(pts.slice(0, -1))}>Annulla ultimo punto</button>
            <button type="button" className="btn link" onClick={() => finish([{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 }])}>Usa la foto intera</button>
          </div>
          {err && <p className="error">{err}</p>}
        </div>
      )}

      {mode === 'grid' && value && (
        <>
          <div
            ref={box}
            className={'sesti' + (flat ? '' : ' no-photo')}
            style={{ aspectRatio: flat ? `${flat.width} / ${flat.height}` : '3 / 2' }}
          >
            {flat && <img src={flat.url} alt={`Favo raddrizzato, ${label}`} />}
            <div className="sesti-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}>
              {value.map((v, i) => (
                <button key={i} type="button" className={'sesto' + (sel === i ? ' sel' : '') + (v != null ? ' set' : '')}
                  aria-label={`Sesto ${i + 1}: ${v == null ? 'da valutare' : v}`} aria-pressed={sel === i} onClick={() => setSel(i)}>
                  <small>{i + 1}</small>
                  <span>{v ?? '–'}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="value-bar" role="group" aria-label={sel != null ? `Valore del sesto ${sel + 1}` : 'Scegli un sesto'}>
            {Array.from({ length: MAX_VALUE + 1 }, (_, n) => (
              <button key={n} type="button" disabled={sel == null} className={sel != null && value[sel] === n ? 'on' : ''} onClick={() => setVal(n)}>{n}</button>
            ))}
          </div>
          <p className="hint value-legend">
            {sel != null ? <>Sesto <b>{sel + 1}</b>: quanti sesti della sua superficie sono coperti di api? </> : <>Tutti i sesti sono valutati. Tocca un sesto per correggerlo. </>}
            0 = nessuna ape, 6 = pieno.
          </p>
          <div className="row-actions">
            {photo && <button type="button" className="btn link" onClick={() => { setPts([]); setMode('corners') }}>Rifai gli angoli</button>}
            <label className="btn link side-photo-link">
              {flat ? 'Cambia foto' : 'Aggiungi una foto'}
              <input type="file" accept="image/*" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            <button type="button" className="btn link" onClick={() => { if (!value.some((x) => x != null) || confirm(`Togliere i valori del ${label.toLowerCase()}?`)) { onChange(null); setFlat(null); setPhoto(null); setMode('idle') } }}>Togli lato</button>
          </div>
        </>
      )}
    </div>
  )
}
