import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { observationToRow } from './csv'
import type { AccessRequest, AccessRequestInput, Beekeeper, EventInput, GenericEvent, Observation, ObservationInput, Site, StrengthStatus, StrengthVisit, StrengthVisitInput } from './types'

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

  // altre segnalazioni (release 0.4)
  listEvents(): Promise<GenericEvent[]>
  saveEvent(e: EventInput): Promise<GenericEvent>
  deleteEvent(id: string): Promise<void>

  // forza degli alveari
  strengthStatus(): Promise<StrengthStatus>
  /** invia la richiesta; `notified` = la mail ai responsabili è partita */
  requestStrengthAccess(r: AccessRequestInput): Promise<{ notified: boolean }>
  /** collega il dispositivo all'apicoltore; restituisce il nome */
  redeemCode(code: string): Promise<string>
  listVisits(): Promise<StrengthVisit[]>
  saveVisit(v: StrengthVisitInput): Promise<StrengthVisit>
  deleteVisit(id: string): Promise<void>

  // responsabili
  claimAdmin(code: string): Promise<boolean>
  adminRequests(): Promise<AccessRequest[]>
  adminBeekeepers(): Promise<Beekeeper[]>
  adminApprove(requestId: string): Promise<{ beekeeperId: string; code: string; mail: MailResult }>
  adminReject(requestId: string): Promise<void>
  adminUpdateBeekeeper(id: string, patch: Partial<Pick<Beekeeper, 'active' | 'trained_on' | 'protocol_delivered'>>): Promise<void>
  adminRenewCode(id: string): Promise<string>
  adminSendCode(id: string): Promise<MailResult>
  exportStrength(): Promise<Record<string, unknown>[]>
  exportEvents(): Promise<Record<string, unknown>[]>
}

/** esito dell'invio di una mail: inviata, servizio non ancora configurato (chiave Brevo), errore, oppure DEMO */
export type MailResult = 'inviata' | 'non_configurato' | 'errore' | 'demo'

/** Codice personale nel formato APR-XXXX-XXXX (usato solo in modalità DEMO: in Supabase lo genera il database). */
export function demoCode(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const r = Array.from({ length: 8 }, () => a[Math.floor(Math.random() * a.length)]).join('')
  return `APR-${r.slice(0, 4)}-${r.slice(4)}`
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')

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

  // ---- altre segnalazioni ----
  async listEvents() {
    return this.read<(GenericEvent & { deleted?: boolean })[]>('events', []).filter((e) => !e.deleted).sort((a, b) => (a.observed_on < b.observed_on ? 1 : -1))
  }
  async saveEvent(e: EventInput) {
    const ev: GenericEvent = { ...e, id: uuid(), participant_id: this.pid, created_at: new Date().toISOString() }
    this.write('events', [...this.read<GenericEvent[]>('events', []), ev])
    return ev
  }
  async deleteEvent(id: string) {
    this.write('events', this.read<(GenericEvent & { deleted?: boolean })[]>('events', []).map((e) => (e.id === id ? { ...e, deleted: true } : e)))
  }

  // ---- forza degli alveari (DEMO: richieste, codici e stime restano su questo dispositivo) ----
  private beekeepers() { return this.read<Beekeeper[]>('bk', []) }
  private linked(): Beekeeper | undefined {
    const id = this.read<string>('bkdev', '')
    return this.beekeepers().find((b) => b.id === id)
  }
  async strengthStatus() {
    const b = this.linked()
    return { beekeeperName: b?.full_name ?? null, active: !!b?.active, pending: this.read<AccessRequest[]>('sreq', []).some((r) => r.status === 'in_attesa') }
  }
  async requestStrengthAccess(r: AccessRequestInput) {
    const all = this.read<AccessRequest[]>('sreq', [])
    if (all.some((x) => x.status === 'in_attesa')) throw new Error('Hai già una richiesta in attesa')
    this.write('sreq', [...all, { ...r, id: uuid(), status: 'in_attesa', created_at: new Date().toISOString() }])
    return { notified: false }
  }
  async redeemCode(code: string) {
    const b = this.beekeepers().find((x) => x.active && normCode(x.code) === normCode(code))
    if (!b) throw new Error('Codice non valido o non più attivo')
    this.write('bkdev', b.id)
    return b.full_name
  }
  async listVisits() {
    return this.read<(StrengthVisit & { deleted?: boolean })[]>('visits', []).filter((v) => !v.deleted).sort((a, b) => (a.visited_on < b.visited_on ? 1 : -1))
  }
  async saveVisit(v: StrengthVisitInput) {
    if (!this.linked()?.active) throw new Error('Serve il codice personale')
    const all = this.read<StrengthVisit[]>('visits', [])
    const prev = all.find((x) => x.id === v.id)
    const visit: StrengthVisit = { ...v, id: v.id ?? uuid(), created_at: prev?.created_at ?? new Date().toISOString() }
    this.write('visits', prev ? all.map((x) => (x.id === visit.id ? visit : x)) : [...all, visit])
    return visit
  }
  async deleteVisit(id: string) {
    this.write('visits', this.read<(StrengthVisit & { deleted?: boolean })[]>('visits', []).map((v) => (v.id === id ? { ...v, deleted: true } : v)))
  }

  // ---- responsabili (in DEMO chiunque lo è, per provare) ----
  async claimAdmin() { return true }
  async adminRequests() { return this.read<AccessRequest[]>('sreq', []).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) }
  async adminBeekeepers() { return this.beekeepers().sort((a, b) => a.full_name.localeCompare(b.full_name, 'it')) }
  async adminApprove(requestId: string) {
    const reqs = this.read<AccessRequest[]>('sreq', [])
    const r = reqs.find((x) => x.id === requestId && x.status === 'in_attesa')
    if (!r) throw new Error('Richiesta non trovata')
    const b: Beekeeper = {
      id: uuid(), full_name: r.full_name, email: r.email, phone: r.phone, farm: r.farm, municipality: r.municipality,
      code: demoCode(), active: true, trained_on: null, protocol_delivered: false, code_sent_at: null, created_at: new Date().toISOString()
    }
    this.write('bk', [...this.beekeepers(), b])
    this.write('sreq', reqs.map((x) => (x.id === r.id ? { ...x, status: 'approvata' } : x)))
    this.write('bkdev', b.id) // in DEMO la richiesta è partita da questo dispositivo
    return { beekeeperId: b.id, code: b.code, mail: 'demo' as MailResult }
  }
  async adminReject(requestId: string) {
    this.write('sreq', this.read<AccessRequest[]>('sreq', []).map((x) => (x.id === requestId ? { ...x, status: 'rifiutata' } : x)))
  }
  async adminUpdateBeekeeper(id: string, patch: Partial<Beekeeper>) {
    this.write('bk', this.beekeepers().map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }
  async adminRenewCode(id: string) {
    const code = demoCode()
    this.write('bk', this.beekeepers().map((b) => (b.id === id ? { ...b, code, code_sent_at: null } : b)))
    if (this.read<string>('bkdev', '') === id) this.write('bkdev', '')
    return code
  }
  async adminSendCode() { return 'demo' as MailResult }
  async exportStrength() {
    const bk = this.linked()
    return (await this.listVisits()).flatMap((v) => strengthRows(v, bk))
  }
  async exportEvents() {
    return (await this.listEvents()).map((e) => ({
      id_segnalazione: e.id, id_partecipante: e.participant_id, tipo: e.event_type, data_evento: e.observed_on,
      data_inserimento: e.created_at, latitudine: e.lat.toFixed(6), longitudine: e.lon.toFixed(6), note: e.note
    }))
  }
}

/** Righe di esportazione della forza (una per lato di favo), come la vista export_strength del database. */
function strengthRows(v: StrengthVisit, b?: Beekeeper): Record<string, unknown>[] {
  return v.combs.flatMap((c) =>
    (['a', 'b'] as const).filter((k) => c[k]).map((k) => {
      const sc = c[k]!
      return {
        id_stima: v.id, data_visita: v.visited_on, apicoltore: b?.full_name ?? '', azienda: b?.farm ?? '', comune: b?.municipality ?? '',
        apiario: v.site_name, latitudine: v.lat.toFixed(6), longitudine: v.lon.toFixed(6), arnia: v.hive_label, favo: c.n, lato: k.toUpperCase(),
        sesto_1: sc[0], sesto_2: sc[1], sesto_3: sc[2], sesto_4: sc[3], sesto_5: sc[4], sesto_6: sc[5],
        totale_lato: sc.reduce((a, x) => a + x, 0), note: v.note, data_inserimento: v.created_at
      }
    })
  )
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

  private async selectAll(view: string, order: string) {
    const out: Record<string, unknown>[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from(view).select('*').order(order).range(from, from + 999)
      if (error) throw error
      out.push(...(data as Record<string, unknown>[]))
      if (!data || data.length < 1000) break
    }
    return out
  }
  private async mail(body: Record<string, unknown>): Promise<MailResult> {
    const { error } = await this.sb.functions.invoke('apipro-mail', { body })
    if (!error) return 'inviata'
    const status = (error as { context?: Response }).context?.status
    return status === 503 ? 'non_configurato' : 'errore'
  }

  // ---- altre segnalazioni ----
  async listEvents() {
    const { data, error } = await this.sb.from('events').select('*').eq('participant_id', this.uid).eq('deleted', false).order('observed_on', { ascending: false })
    if (error) throw error
    return data as GenericEvent[]
  }
  async saveEvent(e: EventInput) {
    const { data, error } = await this.sb.from('events').insert(e).select('*').single()
    if (error) throw error
    return data as GenericEvent
  }
  async deleteEvent(id: string) {
    const { error } = await this.sb.from('events').update({ deleted: true }).eq('id', id)
    if (error) throw error
  }

  // ---- forza degli alveari ----
  async strengthStatus() {
    const { data, error } = await this.sb.rpc('my_strength_status')
    if (error) throw error
    const r = (Array.isArray(data) ? data[0] : data) as { beekeeper_name: string | null; active: boolean; pending: boolean } | undefined
    return { beekeeperName: r?.beekeeper_name ?? null, active: !!r?.active, pending: !!r?.pending }
  }
  async requestStrengthAccess(r: AccessRequestInput) {
    const { data, error } = await this.sb.from('strength_requests').insert({ ...r, privacy_accepted: true }).select('id').single()
    if (error) throw new Error(error.code === '23505' ? 'Hai già una richiesta in attesa' : error.message)
    return { notified: (await this.mail({ action: 'nuova_richiesta', id: (data as { id: string }).id })) === 'inviata' }
  }
  async redeemCode(code: string) {
    const { data, error } = await this.sb.rpc('redeem_beekeeper_code', { p_code: code })
    if (error) throw new Error(error.message.includes('codice_non_valido') ? 'Codice non valido o non più attivo' : error.message)
    return data as string
  }
  async listVisits() {
    const { data, error } = await this.sb.from('strength_visits').select('id,visited_on,site_id,site_name,lat,lon,hive_label,combs,note,created_at')
      .eq('participant_id', this.uid).eq('deleted', false).order('visited_on', { ascending: false })
    if (error) throw error
    return data as StrengthVisit[]
  }
  async saveVisit(v: StrengthVisitInput) {
    const { data, error } = await this.sb.from('strength_visits').upsert(v).select('id,visited_on,site_id,site_name,lat,lon,hive_label,combs,note,created_at').single()
    if (error) throw new Error(error.message.includes('codice_richiesto') ? 'Serve il codice personale' : error.message)
    return data as StrengthVisit
  }
  async deleteVisit(id: string) {
    const { error } = await this.sb.from('strength_visits').update({ deleted: true }).eq('id', id)
    if (error) throw error
  }

  // ---- responsabili ----
  async claimAdmin(code: string) {
    const { data, error } = await this.sb.rpc('claim_admin', { p_code: code })
    if (error) throw error
    return data === true
  }
  async adminRequests() {
    const { data, error } = await this.sb.from('strength_requests').select('id,full_name,email,phone,farm,municipality,status,created_at').order('created_at', { ascending: false })
    if (error) throw error
    return data as AccessRequest[]
  }
  async adminBeekeepers() {
    const { data, error } = await this.sb.from('beekeepers').select('*').order('full_name')
    if (error) throw error
    return data as Beekeeper[]
  }
  async adminApprove(requestId: string) {
    const { data, error } = await this.sb.rpc('approve_strength_request', { p_request: requestId })
    if (error) throw error
    const r = (Array.isArray(data) ? data[0] : data) as { beekeeper_id: string; code: string }
    return { beekeeperId: r.beekeeper_id, code: r.code, mail: await this.mail({ action: 'invia_codice', beekeeper_id: r.beekeeper_id }) }
  }
  async adminReject(requestId: string) {
    const { error } = await this.sb.from('strength_requests').update({ status: 'rifiutata' }).eq('id', requestId)
    if (error) throw error
  }
  async adminUpdateBeekeeper(id: string, patch: Partial<Beekeeper>) {
    const { error } = await this.sb.from('beekeepers').update(patch).eq('id', id)
    if (error) throw error
  }
  async adminRenewCode(id: string) {
    const { data, error } = await this.sb.rpc('renew_beekeeper_code', { p_beekeeper: id })
    if (error) throw error
    return data as string
  }
  async adminSendCode(id: string) {
    return this.mail({ action: 'invia_codice', beekeeper_id: id })
  }
  async exportStrength() { return this.selectAll('export_strength', 'data_visita') }
  async exportEvents() { return this.selectAll('export_events', 'data_evento') }
}

export function createStore(): DataStore {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return url && key ? new SupabaseStore(url, key) : new LocalStore()
}
