import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { observationToRow } from './csv'
import type { Observation, ObservationInput, Site } from './types'

/** Accesso ai dati: Supabase (produzione/test) oppure archivio locale (modalità demo). */
export interface DataStore {
  mode: 'supabase' | 'demo'
  init(): Promise<string> // restituisce l'identificativo del partecipante
  listSites(): Promise<Site[]>
  saveSite(s: Omit<Site, 'id' | 'created_at'> & { id?: string }): Promise<Site>
  archiveSite(id: string): Promise<void>
  listObservations(): Promise<Observation[]>
  saveObservation(o: ObservationInput & { id?: string }, qc: string[]): Promise<Observation>
  deleteObservation(id: string): Promise<void>
  isAdmin(): Promise<boolean>
  exportRows(): Promise<Record<string, unknown>[]>
}

const uuid = () =>
  (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

/** Riduce la foto (lato lungo max `max` px, JPEG) per contenere peso e consumi di rete. */
export async function resizeImage(file: Blob, max = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', quality))
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(b)
  })

// ---------------------------------------------------------------------------
// Modalità DEMO: tutto nel browser (localStorage). Per prove senza database.
// ---------------------------------------------------------------------------
class LocalStore implements DataStore {
  mode = 'demo' as const
  private k = (n: string) => 'apipro.' + n
  private read<T>(n: string, d: T): T {
    try {
      return JSON.parse(localStorage.getItem(this.k(n)) ?? '') as T
    } catch {
      return d
    }
  }
  private write(n: string, v: unknown) {
    localStorage.setItem(this.k(n), JSON.stringify(v))
  }
  private pid = ''
  async init() {
    this.pid = this.read<string>('pid', '') || uuid()
    this.write('pid', this.pid)
    return this.pid
  }
  async listSites() {
    return this.read<(Site & { archived?: boolean })[]>('sites', []).filter((s) => !s.archived)
  }
  async saveSite(s: Omit<Site, 'id' | 'created_at'> & { id?: string }) {
    const all = this.read<Site[]>('sites', [])
    const now = new Date().toISOString()
    const site: Site = { id: s.id ?? uuid(), name: s.name, lat: s.lat, lon: s.lon, created_at: now }
    const i = all.findIndex((x) => x.id === site.id)
    if (i >= 0) all[i] = { ...all[i], ...site, created_at: all[i].created_at }
    else all.push(site)
    this.write('sites', all)
    return site
  }
  async archiveSite(id: string) {
    this.write('sites', this.read<(Site & { archived?: boolean })[]>('sites', []).map((s) => (s.id === id ? { ...s, archived: true } : s)))
  }
  async listObservations() {
    return this.read<Observation[]>('obs', []).sort((a, b) => (a.observed_on < b.observed_on ? 1 : -1))
  }
  async saveObservation(o: ObservationInput & { id?: string }, qc: string[]) {
    const all = this.read<Observation[]>('obs', [])
    const now = new Date().toISOString()
    const prev = all.find((x) => x.id === o.id)
    let photo_url = o.keep_photo_url ?? null
    if (o.photo) photo_url = await blobToDataUrl(await resizeImage(o.photo, 480, 0.7))
    const { photo: _p, keep_photo_url: _k, ...rest } = o
    const obs: Observation = {
      ...rest,
      id: o.id ?? uuid(),
      participant_id: this.pid,
      created_at: prev?.created_at ?? now,
      updated_at: now,
      photo_url,
      qc_flags: qc
    }
    const next = prev ? all.map((x) => (x.id === obs.id ? obs : x)) : [...all, obs]
    this.write('obs', next)
    return obs
  }
  async deleteObservation(id: string) {
    this.write('obs', this.read<Observation[]>('obs', []).filter((x) => x.id !== id))
  }
  async isAdmin() {
    return true // in demo l'esportazione è disponibile per provarla
  }
  async exportRows() {
    return (await this.listObservations()).map(observationToRow)
  }
}

// ---------------------------------------------------------------------------
// Modalità SUPABASE: accesso anonimo (nessuna registrazione), dati sul server.
// ---------------------------------------------------------------------------
class SupabaseStore implements DataStore {
  mode = 'supabase' as const
  private sb: SupabaseClient
  private uid = ''
  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  async init() {
    const { data } = await this.sb.auth.getSession()
    if (data.session) this.uid = data.session.user.id
    else {
      const { data: d, error } = await this.sb.auth.signInAnonymously()
      if (error) throw error
      this.uid = d.user!.id
    }
    return this.uid
  }
  async listSites() {
    const { data, error } = await this.sb.from('sites').select('id,name,lat,lon,created_at').eq('participant_id', this.uid).eq('archived', false).order('name')
    if (error) throw error
    return data as Site[]
  }
  async saveSite(s: Omit<Site, 'id' | 'created_at'> & { id?: string }) {
    const q = s.id
      ? this.sb.from('sites').update({ name: s.name, lat: s.lat, lon: s.lon }).eq('id', s.id)
      : this.sb.from('sites').insert({ name: s.name, lat: s.lat, lon: s.lon })
    const { data, error } = await q.select('id,name,lat,lon,created_at').single()
    if (error) throw error
    return data as Site
  }
  async archiveSite(id: string) {
    const { error } = await this.sb.from('sites').update({ archived: true }).eq('id', id)
    if (error) throw error
  }
  async listObservations() {
    const { data, error } = await this.sb
      .from('observations')
      .select('*')
      .eq('participant_id', this.uid)
      .eq('deleted', false)
      .order('observed_on', { ascending: false })
    if (error) throw error
    const rows = data as (Observation & { photo_path: string | null })[]
    const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[]
    const urls: Record<string, string> = {}
    if (paths.length) {
      const { data: signed } = await this.sb.storage.from('observation-photos').createSignedUrls(paths, 3600)
      signed?.forEach((s) => s.path && s.signedUrl && (urls[s.path] = s.signedUrl))
    }
    return rows.map((r) => ({ ...r, photo_url: r.photo_path ? urls[r.photo_path] ?? null : null }))
  }
  async saveObservation(o: ObservationInput & { id?: string }, _qc: string[]) {
    const id = o.id ?? uuid()
    let photo_path: string | undefined
    if (o.photo) {
      photo_path = `${this.uid}/${id}.jpg`
      const { error } = await this.sb.storage
        .from('observation-photos')
        .upload(photo_path, await resizeImage(o.photo), { upsert: true, contentType: 'image/jpeg' })
      if (error) throw error
    }
    const { photo: _p, keep_photo_url, ...rest } = o
    const payload: Record<string, unknown> = { ...rest, id }
    if (photo_path) payload.photo_path = photo_path
    else if (!keep_photo_url) payload.photo_path = null
    // qc_flags è calcolato anche dal database (trigger), qui non viene inviato
    const { data, error } = await this.sb.from('observations').upsert(payload).select('*').single()
    if (error) throw error
    return { ...(data as Observation), photo_url: keep_photo_url ?? null }
  }
  async deleteObservation(id: string) {
    const { error } = await this.sb.from('observations').update({ deleted: true }).eq('id', id)
    if (error) throw error
  }
  async isAdmin() {
    const { data } = await this.sb.rpc('is_admin')
    return data === true
  }
  async exportRows() {
    const out: Record<string, unknown>[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from('export_observations').select('*').order('data_osservazione').range(from, from + 999)
      if (error) throw error
      out.push(...(data as Record<string, unknown>[]).map((r) => ({ ...r, foto_presente: r.foto_presente ? 'si' : 'no' })))
      if (!data || data.length < 1000) break
    }
    return out
  }
}

export function createStore(): DataStore {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return url && key ? new SupabaseStore(url, key) : new LocalStore()
}
