import { describe, expect, it } from 'vitest'
import { computeHomography, mapUV } from './rectify'

describe('raddrizzamento del favo', () => {
  it('porta gli angoli del quadrato unitario sui 4 punti toccati', () => {
    const pts = [{ x: 12, y: 30 }, { x: 410, y: 8 }, { x: 395, y: 290 }, { x: 25, y: 270 }]
    const H = computeHomography(pts[0], pts[1], pts[2], pts[3])
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]]
    uv.forEach(([u, v], i) => {
      const p = mapUV(H, u, v)
      expect(p.x).toBeCloseTo(pts[i].x, 6)
      expect(p.y).toBeCloseTo(pts[i].y, 6)
    })
  })
  it('con un rettangolo è una semplice scala', () => {
    const H = computeHomography({ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 200 }, { x: 0, y: 200 })
    expect(mapUV(H, 0.5, 0.5)).toEqual({ x: 150, y: 100 })
  })
})
