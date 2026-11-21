// Forza degli alveari – metodo dei sesti (variante Liebefeld), valutazione a vista.
// Ogni lato del favo è diviso in 6 sesti: 3 colonne × 2 righe (due linee verticali, una orizzontale).
// Per ogni sesto si indica quanti sesti di superficie sono coperti da api: 0 (vuoto) – 6 (pieno).
import type { Comb, SideScores } from './types'

export const SESTI = 6
export const MAX_VALUE = 6
export const GRID_COLS = 3
export const GRID_ROWS = 2

/** Posizione del sesto nella griglia (indice 0–5 → riga, colonna). */
export const cellOf = (i: number) => ({ row: Math.floor(i / GRID_COLS), col: i % GRID_COLS })

export const emptySide = (): (number | null)[] => Array(SESTI).fill(null)

export const isComplete = (s: (number | null)[] | null | undefined): s is SideScores =>
  !!s && s.length === SESTI && s.every((v) => typeof v === 'number' && v >= 0 && v <= MAX_VALUE)

export const sideTotal = (s: (number | null)[] | null | undefined) => (s ?? []).reduce<number>((a, v) => a + (v ?? 0), 0)

/** Primo sesto senza valore dopo `from` (giro circolare), null se completo. */
export function nextEmpty(s: (number | null)[], from: number): number | null {
  for (let k = 1; k <= SESTI; k++) {
    const i = (from + k) % SESTI
    if (s[i] == null) return i
  }
  return null
}

export interface VisitSummary { combs: number; sides: number; total: number; max: number; meanPerSide: number | null }

/** Totali di una stima: somma dei sesti, massimo possibile, media per lato valutato. */
export function summarize(combs: Comb[]): VisitSummary {
  let sides = 0, total = 0
  for (const c of combs) for (const s of [c.a, c.b]) if (s) { sides++; total += sideTotal(s) }
  return { combs: combs.length, sides, total, max: sides * SESTI * MAX_VALUE, meanPerSide: sides ? total / sides : null }
}

/** Problemi che impediscono il salvataggio (vuoto = si può salvare). */
export function combProblems(combs: { n: number; a: (number | null)[] | null; b: (number | null)[] | null }[]): string[] {
  const p: string[] = []
  if (!combs.length) p.push('Aggiungi almeno un favo')
  combs.forEach((c) => {
    if (!c.a && !c.b) p.push(`Favo ${c.n}: valuta almeno un lato`)
    for (const [k, s] of [['A', c.a], ['B', c.b]] as const) if (s && !isComplete(s)) p.push(`Favo ${c.n}, lato ${k}: mancano dei sesti`)
  })
  return p
}
