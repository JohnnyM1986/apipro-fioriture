import { describe, expect, it } from 'vitest'
import { cellOf, combProblems, isComplete, nextEmpty, sideTotal, summarize } from './strength'

describe('metodo dei sesti', () => {
  it('griglia 3 colonne × 2 righe, numerata per righe', () => {
    expect([0, 1, 2, 3, 4, 5].map(cellOf)).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
    ])
  })
  it('somma, completezza e prossimo sesto vuoto', () => {
    expect(sideTotal([1, 2, 3, null, 0, 6])).toBe(12)
    expect(isComplete([1, 2, 3, 4, 5, 6])).toBe(true)
    expect(isComplete([1, 2, 3, null, 5, 6])).toBe(false)
    expect(isComplete([1, 2, 3, 4, 5, 7])).toBe(false)
    expect(nextEmpty([1, null, 3, null, 5, 6], 1)).toBe(3)
    expect(nextEmpty([1, null, 3, 4, 5, 6], 3)).toBe(1)
    expect(nextEmpty([1, 2, 3, 4, 5, 6], 0)).toBeNull()
  })
  it('riepilogo della stima', () => {
    const s = summarize([{ n: 1, a: [6, 6, 6, 6, 6, 6], b: [3, 3, 3, 3, 3, 3] }, { n: 2, a: [0, 0, 0, 0, 0, 0], b: null }])
    expect(s).toEqual({ combs: 2, sides: 3, total: 54, max: 108, meanPerSide: 18 })
  })
  it('blocca il salvataggio se mancano dati', () => {
    expect(combProblems([])).toEqual(['Aggiungi almeno un favo'])
    expect(combProblems([{ n: 1, a: null, b: null }])).toEqual(['Favo 1: valuta almeno un lato'])
    expect(combProblems([{ n: 1, a: [1, 1, null, 1, 1, 1], b: null }])).toEqual(['Favo 1, lato A: mancano dei sesti'])
    expect(combProblems([{ n: 1, a: [1, 1, 1, 1, 1, 1], b: null }])).toEqual([])
  })
})
