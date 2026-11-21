import { describe as d, expect, it } from 'vitest'
import { METER_LEVEL, dateToDoy, describe, doyToDate, formatRange, nearestPoint, phaseOn, placeWord, seasonDoy, shortPlace, shortSpecies } from './forecast'

const f = (a: number, b: number, c: number) => ({ p10: a, p50: b, p90: c, n: 30, fixed: false })
const robinia = { F1: f(110, 115, 120), F3: f(122, 126, 130), F5: f(138, 142, 147), phase_today: 'F0' }

d('previsioni', () => {
  it('converte giorno dell\'anno e data', () => {
    expect(dateToDoy(new Date(2027, 0, 1))).toBe(1)
    expect(doyToDate(2027, 32).getUTCMonth()).toBe(1)
  })
  it('formatta gli intervalli in italiano', () => {
    expect(formatRange(2027, 122, 129)).toBe('2–9 maggio')
    expect(formatRange(2027, 118, 126)).toContain('aprile – ')
  })
  it('sceglie il punto più vicino', () => {
    const pts = [
      { id: 'treviso', name: 'Treviso', zone: 'pianura', lat: 45.667, lon: 12.243, elevation: 15 },
      { id: 'crocetta', name: 'Crocetta', zone: 'collina', lat: 45.826, lon: 12.035, elevation: 150 }
    ]
    expect(nearestPoint(pts, 45.83, 12.04)?.point.id).toBe('crocetta')
  })
  it('descrive lo stato rispetto a oggi', () => {
    expect(describe(2027, robinia, 100).label).toBe('Tra 2 sett.')
    expect(describe(2027, robinia, -40).detail).toContain('Piena fioritura')
    expect(describe(2027, { ...robinia, phase_today: 'F3' }, 126).key).toBe('now')
    expect(describe(2027, robinia, 200).key).toBe('after')
    expect(describe(2027, robinia, null).detail).toContain('Piena fioritura')
    expect(describe(2027, { ...robinia, F1: null }, 100).key).toBe('none')
    expect(describe(2027, robinia, 106).wait).toBe('9 giorni')
    expect(describe(2027, { ...robinia, phase_today: 'F3' }, 126).label).toBe('In piena')
    expect(describe(2027, { ...robinia, phase_today: 'F4' }, 133).tone).toBe('calo')
  })
  it('ricava la fase di oggi come il modello e la traduce in tacche', () => {
    expect(phaseOn(robinia, 100)).toBe('F0')
    expect(phaseOn(robinia, 116)).toBe('F1')
    expect(phaseOn(robinia, 121)).toBe('F2')
    expect(phaseOn(robinia, 126)).toBe('F3')
    expect(phaseOn(robinia, 135)).toBe('F4')
    expect(phaseOn(robinia, 150)).toBe('F5')
    expect(phaseOn({ ...robinia, F5: null }, 120)).toBeNull()
    expect([phaseOn(robinia, 100), phaseOn(robinia, 116), phaseOn(robinia, 121), phaseOn(robinia, 126), phaseOn(robinia, 135), phaseOn(robinia, 150)].map((p) => METER_LEVEL[p!])).toEqual([0, 1, 3, 4, 2, 0])
  })
  it('accorcia i nomi', () => {
    expect(shortPlace('Crocetta del Montello')).toBe('Crocetta d. M.')
    expect(shortPlace('Treviso')).toBe('Treviso')
    expect(placeWord('Crocetta del Montello')).toBe('Crocetta')
    expect(shortSpecies('Acacia (robinia)')).toBe('Acacia')
    expect(seasonDoy(2027, new Date(2027, 4, 12))).toBe(132)
    expect(seasonDoy(2027, new Date(2026, 11, 31))).toBe(0)
  })
})
