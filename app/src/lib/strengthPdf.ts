// Report PDF di una stima di forza (release 0.4.1): si crea sul dispositivo, senza passare dal server.
// L'apicoltore se lo conserva; i dati restano comunque nel database del progetto.
import type { StrengthVisit } from './types'
import { GRID_COLS, MAX_VALUE, SESTI, summarize } from './strength'

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
const fmt1 = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 1 })

/** Contenuto del report (separato dal disegno, così si può verificare). */
export function reportModel(v: StrengthVisit, beekeeper: string | null) {
  const s = summarize(v.combs)
  return {
    title: 'Stima della forza dell\'alveare',
    subtitle: 'Metodo dei sesti – valutazione a vista',
    info: [
      ['Apicoltore', beekeeper ?? '—'],
      ['Data della visita', fmtDate(v.visited_on)],
      ['Apiario', v.site_name || '—'],
      ['Posizione', `${v.lat.toFixed(5)}, ${v.lon.toFixed(5)}`],
      ['Arnia', v.hive_label],
      ...(v.note ? [['Note', v.note]] : [])
    ] as [string, string][],
    summary: [
      [String(s.combs), s.combs === 1 ? 'favo valutato' : 'favi valutati'],
      [String(s.sides), s.sides === 1 ? 'lato valutato' : 'lati valutati'],
      [`${s.total} / ${s.max}`, 'totale dei sesti'],
      [s.meanPerSide != null ? fmt1(s.meanPerSide) : '—', 'media per lato (su 36)']
    ] as [string, string][],
    combs: v.combs.map((c) => ({
      n: c.n,
      sides: (['a', 'b'] as const).map((k) => ({ label: `Lato ${k.toUpperCase()}`, values: c[k], total: c[k] ? c[k]!.reduce((x, y) => x + y, 0) : null }))
    })),
    fileName: `ApiPRO_forza_${v.visited_on}_${v.hive_label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arnia'}.pdf`,
    id: v.id.slice(0, 8)
  }
}

async function dataUrl(path: string): Promise<{ url: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch(path)).blob()
    const url: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob) })
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    return { url, w: img.naturalWidth, h: img.naturalHeight }
  } catch {
    return null // senza rete o immagine mancante: il report si crea lo stesso
  }
}

// colori del brand (RGB)
const GREEN: [number, number, number] = [54, 61, 45]
const MUTED: [number, number, number] = [107, 101, 85]
const LINE: [number, number, number] = [214, 204, 184]
const PAPER: [number, number, number] = [243, 238, 227]
const OCRA: [number, number, number] = [210, 137, 60]
/** colore della cella: dal color carta (0) all'ocra (6) */
const cellColor = (v: number): [number, number, number] => PAPER.map((p, i) => Math.round(p + (OCRA[i] - p) * (v / MAX_VALUE))) as [number, number, number]

/** Crea e scarica il PDF della stima. */
export async function downloadVisitPdf(v: StrengthVisit, beekeeper: string | null, version: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const m = reportModel(v, beekeeper)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = 210, H = 297, X = 16
  const [logo, loghi] = await Promise.all([dataUrl('./img/brand/apipro-logo.png'), dataUrl('./img/brand/loghi-istituzionali.jpg')])

  const footer = () => {
    const y = H - 30
    if (loghi) { const w = 70, h = (w * loghi.h) / loghi.w; doc.addImage(loghi.url, 'JPEG', (W - w) / 2, y, w, h, 'loghi', 'FAST') }
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...MUTED)
    doc.text('Intervento cofinanziato dal Fondo europeo agricolo per lo sviluppo rurale (FEASR) – CSR Veneto 2023-2027, Intervento SRG01 – Gruppo Operativo ApiPRO – CUP B69H26001250009', W / 2, H - 11, { align: 'center', maxWidth: W - 2 * X })
    doc.setFont('helvetica', 'normal')
    doc.text(`Creato con ApiPRO Fioriture ${version} il ${new Date().toLocaleDateString('it-IT')} · stima ${m.id}`, X, H - 6)
  }

  // intestazione
  let y = 14
  if (logo) { const h = 24, w = (h * logo.w) / logo.h; doc.addImage(logo.url, 'PNG', X, y, w, h, 'logo', 'FAST') }
  doc.setTextColor(...GREEN); doc.setFont('times', 'bold'); doc.setFontSize(19)
  doc.text(m.title, W - X, y + 10, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...MUTED)
  doc.text(m.subtitle, W - X, y + 17, { align: 'right' })
  y += 32

  // dati della visita
  doc.setDrawColor(...LINE); doc.setFillColor(255, 253, 248)
  const infoH = 6 + m.info.length * 6.2
  doc.roundedRect(X, y, W - 2 * X, infoH, 3, 3, 'FD')
  let iy = y + 7
  for (const [k, val] of m.info) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(k, X + 5, iy)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    doc.text(doc.splitTextToSize(val, W - 2 * X - 50)[0] as string, X + 45, iy)
    iy += 6.2
  }
  y += infoH + 6

  // riepilogo
  const sw = (W - 2 * X - 9) / 4
  m.summary.forEach(([big, small], i) => {
    const sx = X + i * (sw + 3)
    doc.setFillColor(...PAPER); doc.roundedRect(sx, y, sw, 18, 3, 3, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(154, 90, 23); doc.text(big, sx + sw / 2, y + 8.5, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(small, sx + sw / 2, y + 14, { align: 'center' })
  })
  y += 26

  doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text('Per ogni sesto: quanti sesti della sua superficie sono coperti di api, da 0 (nessuna ape) a 6 (pieno). Sesti 1 2 3 in alto, 4 5 6 in basso.', X, y, { maxWidth: W - 2 * X })
  y += 9

  // favi: due griglie 3 × 2 per favo
  const cw = 13, ch = 9.5, blockH = 2 * ch + 14
  for (const c of m.combs) {
    if (y + blockH > H - 36) { footer(); doc.addPage(); y = 18 }
    doc.setFont('times', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...GREEN)
    doc.text(`Favo ${c.n}`, X, y + 5)
    c.sides.forEach((s, k) => {
      const gx = X + 26 + k * 82, gy = y
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...GREEN)
      doc.text(s.label, gx, gy + 3.5)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
      doc.text(s.total == null ? 'non valutato' : `totale ${s.total} / 36`, gx + 3 * cw, gy + 3.5, { align: 'right' })
      for (let i = 0; i < SESTI; i++) {
        const cx = gx + (i % GRID_COLS) * cw, cy = gy + 6 + Math.floor(i / GRID_COLS) * ch
        const val = s.values?.[i]
        doc.setDrawColor(...LINE)
        if (val != null) { doc.setFillColor(...cellColor(val)); doc.rect(cx, cy, cw, ch, 'FD') } else doc.rect(cx, cy, cw, ch, 'S')
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED); doc.text(String(i + 1), cx + 1.2, cy + 2.8)
        if (val != null) { doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN); doc.text(String(val), cx + cw / 2, cy + ch / 2 + 1.6, { align: 'center' }) }
      }
    })
    y += blockH
    doc.setDrawColor(...LINE); doc.line(X, y - 5, W - X, y - 5)
  }
  footer()

  // numero di pagina
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(...MUTED); doc.text(`Pagina ${p} di ${pages}`, W - X, H - 6, { align: 'right' }) }

  doc.save(m.fileName)
}
