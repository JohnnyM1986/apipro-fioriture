import { describe, expect, it } from 'vitest'
import { reportModel } from './strengthPdf'

const visit = {
  id: '1234abcd-0000-4000-8000-000000000000', visited_on: '2027-05-12', site_id: null, site_name: 'Apiario Montello',
  lat: 45.8205, lon: 12.0612, hive_label: 'Arnia 12 / bis', note: null, created_at: '2027-05-12T08:00:00Z',
  combs: [{ n: 1, a: [3, 4, 5, 2, 3, 1], b: [4, 4, 4, 4, 4, 4] }, { n: 2, a: [6, 6, 6, 6, 6, 6], b: null }]
}

describe('report PDF della forza', () => {
  it('riporta dati, totali e nome del file', () => {
    const m = reportModel(visit, 'Mario Rossi')
    expect(m.info).toContainEqual(['Apicoltore', 'Mario Rossi'])
    expect(m.info).toContainEqual(['Arnia', 'Arnia 12 / bis'])
    expect(m.info.some(([k]) => k === 'Note')).toBe(false)
    expect(m.summary[2]).toEqual(['78 / 108', 'totale dei sesti'])
    expect(m.summary[3][0]).toBe('26')
    expect(m.combs[0].sides.map((s) => s.total)).toEqual([18, 24])
    expect(m.combs[1].sides[1]).toEqual({ label: 'Lato B', values: null, total: null })
    expect(m.fileName).toBe('ApiPRO_forza_2027-05-12_Arnia-12-bis.pdf')
    expect(m.id).toBe('1234abcd')
  })
})
