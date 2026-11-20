import { describe, expect, it } from 'vitest'
import { qcWarnings, requiredErrors, todayRome } from './validation'
import { toCsv, observationToRow, CSV_COLUMNS } from './csv'
import type { Observation } from './types'

const ok = { lat: 45.8, lon: 12.1, species_id: 'robinia', phase_code: 'F3', observed_on: '2026-05-01' }

const obs = (p: Partial<Observation>): Observation => ({
  id: 'x', participant_id: 'p', site_id: null, species_id: 'robinia', phase_code: 'F3', observed_on: '2026-05-01',
  created_at: '2026-05-01T10:00:00Z', updated_at: '2026-05-01T10:00:00Z', lat: 45.8, lon: 12.1,
  location_source: 'map', photo_url: null, note: null, qc_flags: [], ...p
})

describe('controlli indispensabili', () => {
  it('accetta una segnalazione completa', () => expect(requiredErrors(ok, '2026-05-02')).toEqual([]))
  it('richiede luogo, specie, fase e data', () => {
    const e = requiredErrors({ lat: null, lon: null, species_id: null, phase_code: null, observed_on: null }, '2026-05-02')
    expect(e).toHaveLength(4)
  })
  it('rifiuta le date future', () => expect(requiredErrors({ ...ok, observed_on: '2026-05-03' }, '2026-05-02')).toContain('La data non può essere futura'))
  it('rifiuta specie e fasi non in catalogo', () => {
    expect(requiredErrors({ ...ok, species_id: 'quercia' }, '2026-05-02')).toContain('Scegli la pianta')
    expect(requiredErrors({ ...ok, phase_code: 'F9' }, '2026-05-02')).toContain('Scegli la fase della fioritura')
  })
  it('accetta una prima osservazione F5 (nessuna sequenza obbligatoria)', () =>
    expect(requiredErrors({ ...ok, phase_code: 'F5' }, '2026-05-02')).toEqual([]))
  it('todayRome restituisce YYYY-MM-DD', () => expect(todayRome(new Date('2026-11-20T23:30:00Z'))).toBe('2026-11-21'))
})

describe('controlli facoltativi', () => {
  it('segnala possibile duplicato entro 50 m', () =>
    expect(qcWarnings({ ...ok, site_id: null }, [obs({ id: 'a', lat: 45.8002, lon: 12.1 })])).toContain('possibile_duplicato'))
  it('non segnala duplicato oltre 50 m', () =>
    expect(qcWarnings({ ...ok, site_id: null }, [obs({ id: 'a', lat: 45.81 })])).not.toContain('possibile_duplicato'))
  it('segnala fase regressiva nello stesso luogo', () =>
    expect(qcWarnings({ ...ok, phase_code: 'F1', site_id: 's1', observed_on: '2026-05-08' }, [obs({ id: 'a', site_id: 's1', phase_code: 'F4' })])).toContain('fase_regressiva'))
  it('non confronta osservazioni di oltre 120 giorni prima', () =>
    expect(qcWarnings({ ...ok, phase_code: 'F1', site_id: 's1', observed_on: '2027-04-01' }, [obs({ id: 'a', site_id: 's1', phase_code: 'F4' })])).not.toContain('fase_regressiva'))
  it('ignora la stessa osservazione in correzione', () =>
    expect(qcWarnings({ ...ok, site_id: null, id: 'a' }, [obs({ id: 'a' })])).toEqual([]))
})

describe('esportazione CSV', () => {
  it('ha le colonne della specifica e una riga per osservazione', () => {
    const csv = toCsv([observationToRow(obs({ note: 'sfalcio; parziale' }))])
    const lines = csv.replace('﻿', '').split('\r\n')
    expect(lines[0].split(';')).toEqual([...CSV_COLUMNS])
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('"sfalcio; parziale"')
    expect(lines[1]).toContain('Robinia pseudoacacia')
  })
})
