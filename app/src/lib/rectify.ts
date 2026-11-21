// Raddrizzamento prospettico del favo (dall'artefatto stima-api-favo): l'utente tocca i 4 angoli,
// la foto viene «stirata» in un rettangolo. Tutto avviene sul dispositivo: la foto non viene mai inviata né salvata.

export interface Pt { x: number; y: number }
export interface Homography { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number }

/** Omografia dal quadrato unitario (u,v ∈ [0,1]) ai 4 angoli p0 alto-sx, p1 alto-dx, p2 basso-dx, p3 basso-sx. */
export function computeHomography(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Homography {
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    return { a: p1.x - p0.x, b: p2.x - p1.x, c: p0.x, d: p1.y - p0.y, e: p2.y - p1.y, f: p0.y, g: 0, h: 0 }
  }
  const den = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / den
  const h = (dx1 * dy3 - dx3 * dy1) / den
  return { a: p1.x - p0.x + g * p1.x, b: p3.x - p0.x + h * p3.x, c: p0.x, d: p1.y - p0.y + g * p1.y, e: p3.y - p0.y + h * p3.y, f: p0.y, g, h }
}

export function mapUV(H: Homography, u: number, v: number): Pt {
  const w = H.g * u + H.h * v + 1
  return { x: (H.a * u + H.b * v + H.c) / w, y: (H.d * u + H.e * v + H.f) / w }
}

const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y)

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

/** Raddrizza la foto: `corners` in frazioni (0–1) della foto, nell'ordine alto-sx, alto-dx, basso-dx, basso-sx. */
export async function rectify(src: string, corners: { u: number; v: number }[]): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImage(src)
  const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight))
  const sw = Math.max(1, Math.round(img.naturalWidth * scale)), sh = Math.max(1, Math.round(img.naturalHeight * scale))
  const sc = document.createElement('canvas')
  sc.width = sw; sc.height = sh
  const sctx = sc.getContext('2d')!
  sctx.drawImage(img, 0, 0, sw, sh)
  const sd = sctx.getImageData(0, 0, sw, sh).data
  const [p0, p1, p2, p3] = corners.map((p) => ({ x: p.u * sw, y: p.v * sh }))
  const avgW = (dist(p0, p1) + dist(p3, p2)) / 2, avgH = (dist(p0, p3) + dist(p1, p2)) / 2
  const k = Math.min(1.6, 900 / Math.max(avgW, avgH, 1))
  const dw = Math.max(300, Math.round(avgW * k)), dh = Math.max(200, Math.round(avgH * k))
  const H = computeHomography(p0, p1, p2, p3)
  const dc = document.createElement('canvas')
  dc.width = dw; dc.height = dh
  const dctx = dc.getContext('2d')!
  const out = dctx.createImageData(dw, dh)
  const od = out.data
  for (let py = 0; py < dh; py++) {
    const v = py / (dh - 1)
    for (let px = 0; px < dw; px++) {
      const { x, y } = mapUV(H, px / (dw - 1), v)
      const sx = Math.round(x), sy = Math.round(y), o = (py * dw + px) * 4
      if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
        const s = (sy * sw + sx) * 4
        od[o] = sd[s]; od[o + 1] = sd[s + 1]; od[o + 2] = sd[s + 2]
      } else { od[o] = 20; od[o + 1] = 15; od[o + 2] = 8 }
      od[o + 3] = 255
    }
  }
  dctx.putImageData(out, 0, 0)
  const blob: Blob = await new Promise((r) => dc.toBlob((b) => r(b!), 'image/jpeg', 0.88))
  return { url: URL.createObjectURL(blob), width: dw, height: dh }
}
