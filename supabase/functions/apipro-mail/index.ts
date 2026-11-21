// ApiPRO – funzione «apipro-mail» (release 0.4): mail automatiche con Brevo.
//   { action: "nuova_richiesta", id }      -> avvisa i responsabili di una nuova richiesta (forza degli alveari)
//   { action: "invia_codice", beekeeper_id } -> manda all'apicoltore il suo codice personale (solo responsabili)
// Segreti (Supabase → Edge Functions → Secrets):
//   BREVO_API_KEY  obbligatorio (chiave API di Brevo)
//   NOTIFY_EMAIL   facoltativo, predefinito info@morettofarm.it
//   SENDER_EMAIL   facoltativo, predefinito info@aquanatura.it (mittente abilitato su Brevo)
//   APP_URL        facoltativo, predefinito https://johnnym1986.github.io/apipro-fioriture/
import { createClient } from 'npm:@supabase/supabase-js@2'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') ?? 'info@morettofarm.it'
const SENDER = { name: 'ApiPRO – Progetto fioriture', email: Deno.env.get('SENDER_EMAIL') ?? 'info@aquanatura.it' }
const APP_URL = Deno.env.get('APP_URL') ?? 'https://johnnym1986.github.io/apipro-fioriture/'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function sendMail(to: { email: string; name?: string }, subject: string, html: string, text: string) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: SENDER, to: [to], subject, htmlContent: html, textContent: text })
  })
  if (!r.ok) throw new Error(`brevo ${r.status}: ${await r.text()}`)
}

const page = (body: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2f24;max-width:560px">${body}
  <p style="color:#6b6555;font-size:12px;margin-top:24px">Gruppo Operativo ApiPRO – Intervento cofinanziato dal FEASR, CSR Veneto 2023-2027, Intervento SRG01.</p></div>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'metodo_non_ammesso' })
  if (!BREVO_API_KEY) return json(503, { error: 'brevo_non_configurato' })

  let body: { action?: string; id?: string; beekeeper_id?: string }
  try { body = await req.json() } catch { return json(400, { error: 'richiesta_non_valida' }) }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    if (body.action === 'nuova_richiesta' && body.id) {
      // solo richieste recenti e non ancora notificate: evita invii ripetuti o abusi
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: r } = await admin.from('strength_requests')
        .select('id, full_name, email, phone, farm, municipality, created_at')
        .eq('id', body.id).eq('status', 'in_attesa').is('notified_at', null).gte('created_at', since).maybeSingle()
      if (!r) return json(404, { error: 'richiesta_non_trovata' })
      const rows: [string, unknown][] = [['Nome', r.full_name], ['Email', r.email], ['Telefono', r.phone], ['Azienda', r.farm], ['Comune degli apiari', r.municipality]]
      await sendMail(
        { email: NOTIFY_EMAIL },
        `ApiPRO – nuova richiesta per la forza degli alveari: ${r.full_name}`,
        page(`<p>È arrivata una nuova richiesta per partecipare alla <b>stima della forza degli alveari</b>.</p>
          <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#6b6555">${k}</td><td><b>${esc(v || '—')}</b></td></tr>`).join('')}</table>
          <p>Per approvarla apri l'app, <b>Area responsabili → Richieste</b>: il codice verrà mandato in automatico all'apicoltore.</p>
          <p><a href="${APP_URL}">${APP_URL}</a></p>`),
        `Nuova richiesta per la forza degli alveari.\n${rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n')}\n\nApprovala da ${APP_URL} → Area responsabili → Richieste.`
      )
      await admin.from('strength_requests').update({ notified_at: new Date().toISOString() }).eq('id', r.id)
      return json(200, { ok: true })
    }

    if (body.action === 'invia_codice' && body.beekeeper_id) {
      // solo i responsabili: si verifica con le credenziali di chi chiama
      const user = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
      const { data: isAdmin } = await user.rpc('is_admin')
      if (isAdmin !== true) return json(403, { error: 'solo_responsabili' })
      const { data: b } = await admin.from('beekeepers').select('id, full_name, email, code, active').eq('id', body.beekeeper_id).maybeSingle()
      if (!b || !b.active) return json(404, { error: 'apicoltore_non_trovato' })
      const name = String(b.full_name).split(' ')[0]
      await sendMail(
        { email: b.email, name: b.full_name },
        'ApiPRO – il tuo codice per la stima della forza degli alveari',
        page(`<p>Ciao ${esc(name)},</p>
          <p>sei abilitato alla <b>stima della forza degli alveari</b> nell'app ApiPRO Fioriture. Il tuo codice personale è:</p>
          <p style="font-size:26px;font-weight:bold;letter-spacing:2px;background:#f3eee3;border-radius:12px;padding:12px 18px;display:inline-block">${esc(b.code)}</p>
          <ol>
            <li>Apri l'app: <a href="${APP_URL}">${APP_URL}</a> (consigliato: aggiungila alla schermata Home del telefono).</li>
            <li>Vai in <b>Forza degli alveari</b> e scegli <b>Ho un codice</b>.</li>
            <li>Inserisci il codice: basta farlo una volta per ogni telefono o tablet.</li>
          </ol>
          <p>Sul telefono da cui hai fatto la richiesta la sezione è già attiva. Il codice è personale: non condividerlo.
          Segui il protocollo che ti è stato consegnato durante la formazione.</p>`),
        `Ciao ${name},\nsei abilitato alla stima della forza degli alveari nell'app ApiPRO Fioriture.\nIl tuo codice personale: ${b.code}\n\n1. Apri ${APP_URL}\n2. Forza degli alveari → Ho un codice\n3. Inserisci il codice (una volta per dispositivo).\n\nIl codice è personale: non condividerlo.`
      )
      await admin.from('beekeepers').update({ code_sent_at: new Date().toISOString() }).eq('id', b.id)
      return json(200, { ok: true })
    }

    return json(400, { error: 'azione_non_valida' })
  } catch (e) {
    console.error(e)
    return json(502, { error: 'invio_non_riuscito' })
  }
})
