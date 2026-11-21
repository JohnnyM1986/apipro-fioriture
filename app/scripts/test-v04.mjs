// Prova nel browser delle funzioni della release 0.4 (modalità DEMO, dati solo nel browser della prova):
// altra segnalazione, richiesta di partecipazione, approvazione, nuova stima di forza con foto e griglia dei sesti.
// Uso (dalla cartella app): node scripts/test-v04.mjs <cartella schermate> <foto di un favo .jpg>
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const [dir0, photo] = process.argv.slice(2)
if (!dir0 || !photo) { console.error('Uso: node scripts/test-v04.mjs <cartella> <foto.jpg>'); process.exit(2) }
const dir = dir0.replace(/[\\/]?$/, '/')
const appDir = fileURLToPath(new URL('..', import.meta.url))
const DAY = new Date('2027-05-12T09:30:00+02:00')
// angoli del favo nella foto di prova (frazioni), come li toccherebbe l'apicoltore
const CORNERS = [[0.125, 0.1333], [0.875, 0.2], [0.8333, 0.8444], [0.1667, 0.7778]]

const server = await createServer({ root: appDir, logLevel: 'error', server: { port: 5198, strictPort: true } })
await server.listen()
const browser = await chromium.launch()
const log = []
const check = (ok, msg) => { log.push(`${ok ? 'OK ' : 'ERRORE'} ${msg}`); if (!ok) process.exitCode = 1 }

async function run(width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'it-IT', timezoneId: 'Europe/Rome' })
  await ctx.addInitScript(() => {
    if (localStorage.getItem('apipro.seeded')) return
    localStorage.setItem('apipro.seeded', '1')
    localStorage.setItem('apipro.forecastPoint', 'crocetta')
    localStorage.setItem('apipro.sites', JSON.stringify([{ id: 's1', name: 'Apiario Montello', lat: 45.8205, lon: 12.0612, created_at: '2027-03-02T10:00:00Z' }]))
  })
  const p = await ctx.newPage()
  p.on('dialog', (d) => d.accept())
  await p.clock.setFixedTime(DAY)
  await p.goto('http://localhost:5198/')
  await p.waitForSelector('.hero')
  const shot = async (n) => { await p.waitForTimeout(300); await p.screenshot({ path: `${dir}${tag}_${n}.png`, fullPage: true }) }
  const over = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const plus = () => p.locator('.bottom .fab:visible, .top-new:visible').first().click()

  // 1. altra segnalazione
  await plus(); await p.waitForSelector('.report-cards'); await shot('1_scelta')
  check((await over()) === 0, `${tag} scelta senza scorrimento orizzontale`)
  await p.locator('.report-card', { hasText: 'Un altro evento' }).click()
  await p.locator('.type-card', { hasText: 'Sciame' }).click()
  await p.locator('.choice', { hasText: 'Apiario Montello' }).click()
  await p.locator('textarea').fill('Sciame posato su un ramo di ciliegio')
  await shot('2_evento')
  check((await over()) === 0, `${tag} modulo evento senza scorrimento orizzontale`)
  await p.getByRole('button', { name: 'Invia segnalazione' }).click()
  await p.waitForSelector('.toast')
  check((await p.locator('.toast').innerText()).includes('inviata'), `${tag} evento inviato`)

  // 2. richiesta di partecipazione
  await p.locator('.strength-card').first().click()
  await p.getByRole('button', { name: 'Chiedi di partecipare' }).click()
  await p.getByLabel('Nome e cognome *').fill('Mario Rossi')
  await p.getByLabel(/^Email/).fill('mario.rossi@example.com')
  await p.getByLabel('Comune degli apiari *').fill('Crocetta del Montello')
  await p.locator('.form-card .check input').check()
  await shot('3_richiesta')
  await p.getByRole('button', { name: 'Invia la richiesta' }).click()
  await p.waitForSelector('.ok-note')
  check(true, `${tag} richiesta registrata (in attesa)`)

  // 3. area responsabili: approvazione e codice
  await p.goto('http://localhost:5198/') // ricomincia dalla home
  await p.waitForSelector('.hero')
  await p.getByRole('button', { name: /Area responsabili/ }).click()
  await p.getByRole('button', { name: 'Approva e invia il codice' }).click()
  await p.waitForSelector('.result')
  const code = await p.locator('.result code').innerText()
  check(/^APR-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), `${tag} codice generato ${code}`)
  await p.getByRole('tab', { name: 'Apicoltori' }).click()
  await p.waitForSelector('.bk-code')
  await shot('4_responsabili')
  check((await over()) === 0, `${tag} area responsabili senza scorrimento orizzontale`)

  // 4. nuova stima di forza
  const forza = p.locator('.top-nav button', { hasText: 'Forza alveari' })
  if (await forza.isVisible()) await forza.click(); else { await p.locator('.bottom button', { hasText: 'Le mie' }).click(); await p.locator('.strength-card').last().click() }
  await p.getByRole('button', { name: /Nuova stima/ }).click()
  await p.locator('.chip', { hasText: 'Apiario Montello' }).click()
  await p.getByLabel('Arnia *').fill('Arnia 12')
  await p.locator('.side').first().locator('input[type=file]').first().setInputFiles(photo)
  await p.waitForSelector('.corner-img img')
  await p.waitForTimeout(300)
  await shot('5_angoli')
  await p.waitForTimeout(700) // la pagina scorre da sola per mostrare la foto intera
  const box = await p.locator('.corner-img').boundingBox()
  check(box.y >= 0 && box.y + box.height <= (p.viewportSize()?.height ?? 0), `${tag} foto intera sullo schermo per toccare gli angoli`)
  for (const [u, v] of CORNERS) await p.mouse.click(box.x + u * box.width, box.y + v * box.height)
  try { await p.waitForSelector('.sesti img', { timeout: 8000 }) } catch (e) { await shot('ERRORE_angoli'); console.log('testo:', await p.locator('.side').first().innerText()); throw e }
  const vals = [3, 4, 5, 2, 3, 1]
  for (const v of vals) await p.locator('.side').first().locator('.value-bar button', { hasText: String(v) }).click()
  check((await p.locator('.side').first().locator('.side-total').innerText()).startsWith('18'), `${tag} lato A: totale 18`)
  await p.locator('.side').nth(1).getByRole('button', { name: 'Valuta senza foto' }).click()
  for (let i = 0; i < 6; i++) await p.locator('.side').nth(1).locator('.value-bar button', { hasText: '4' }).click()
  await p.locator('.side').first().scrollIntoViewIfNeeded()
  await shot('6_griglia')
  check((await over()) === 0, `${tag} stima senza scorrimento orizzontale`)
  await p.getByRole('button', { name: 'Salva stima' }).click()
  await p.waitForSelector('.visit-list li')
  await p.locator('.visit-row').first().click()
  await shot('7_stime')
  const txt = await p.locator('.visit-detail').innerText()
  check(txt.includes('3 4 5 2 3 1 (18)') && txt.includes('4 4 4 4 4 4 (24)'), `${tag} stima salvata con i valori giusti`)
  await ctx.close()
}

try {
  await run(390, 844, 'tel')
  await run(1366, 768, 'pc')
  console.log(log.join('\n'))
} finally {
  await browser.close()
  await server.close()
}
