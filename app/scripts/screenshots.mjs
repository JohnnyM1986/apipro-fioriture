// Schermate della veste grafica per la documentazione (docs/img/grafica_A_*.png).
// Uso, dalla cartella app (servono le previsioni in public/data/predictions.json: python model/run.py forecast):
//   npx playwright install chromium   (una volta sola)
//   npm run screenshots
// Simula il 12/05/2027 (stagione in corso, si vedono «oggi» e il misuratore) e il punto Crocetta del Montello.
// Controlla anche che a 360 px non ci sia scorrimento orizzontale.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const appDir = fileURLToPath(new URL('..', import.meta.url))
const outDir = fileURLToPath(new URL('../../docs/img/', import.meta.url))
const DAY = new Date('2027-05-12T09:30:00+02:00')

// dati dimostrativi (modalità DEMO, solo nel browser della prova)
const sites = [
  { id: 's1', name: 'Apiario Montello', lat: 45.8205, lon: 12.0612, created_at: '2027-03-02T10:00:00Z' },
  { id: 's2', name: 'Bosco di Ciano', lat: 45.8312, lon: 12.0221, created_at: '2027-03-10T10:00:00Z' }
]
const ob = (id, species_id, phase_code, observed_on, site_id) => ({
  id, participant_id: 'demo', site_id, species_id, phase_code, observed_on, lat: 45.82, lon: 12.06,
  location_source: 'site', photo_url: null, note: null, qc_flags: [], created_at: observed_on + 'T10:00:00Z', updated_at: observed_on + 'T10:00:00Z'
})
const obs = [ob('o1', 'tarassaco', 'F3', '2027-04-02', 's1'), ob('o2', 'colza', 'F3', '2027-04-28', 's1'), ob('o3', 'robinia', 'F1', '2027-05-10', 's2')]

const server = await createServer({ root: appDir, logLevel: 'error', server: { port: 5199, strictPort: true } })
await server.listen()
const url = 'http://localhost:5199/'
const browser = await chromium.launch()

async function open(width, height = 844) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'it-IT', timezoneId: 'Europe/Rome' })
  await ctx.addInitScript(([s, o]) => {
    if (localStorage.getItem('apipro.seeded')) return
    localStorage.setItem('apipro.seeded', '1')
    localStorage.setItem('apipro.pid', JSON.stringify('demo-0000-screens'))
    localStorage.setItem('apipro.sites', JSON.stringify(s))
    localStorage.setItem('apipro.obs', JSON.stringify(o))
    localStorage.setItem('apipro.forecastPoint', 'crocetta')
  }, [sites, obs])
  const page = await ctx.newPage()
  await page.clock.setFixedTime(DAY)
  await page.goto(url)
  await page.waitForSelector('.near-card')
  await page.evaluate(() => document.fonts.ready)
  return page
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const nav = (page, label) => page.locator('nav.bottom button', { hasText: label }).click()

async function toPhaseStep(page) {
  await page.locator('.bottom .fab:visible, .top-new:visible').first().click()
  await page.locator('.report-card', { hasText: 'Una fioritura' }).click()
  await page.locator('.choice', { hasText: 'Apiario Montello' }).click()
  await page.getByRole('button', { name: 'Avanti' }).click()
  await page.locator('.choice', { hasText: 'Acacia (robinia)' }).click()
  await page.locator('.phase-card', { hasText: 'Piena fioritura' }).click()
  await page.getByRole('button', { name: 'Indietro' }).click()
  await page.waitForSelector('.phase-card.sel')
}

// telefono, tablet e PC: node scripts/screenshots.mjs --sizes <cartella>
const SIZES = [[360, 780], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]]
async function sizes(dir) {
  dir = dir.replace(/[\/]?$/, '/')
  const report = {}
  for (const [w, h] of SIZES) {
    const p = await open(w, h)
    const r = (report[w] = {})
    const shot = async (n) => { await p.waitForTimeout(300); r[n] = await overflow(p); await p.screenshot({ path: `${dir}${w}_${n}.png` }) }
    const go = async (label) => {
      const top = p.locator('.top-nav button', { hasText: label })
      if (await top.isVisible()) await top.click(); else await nav(p, label)
    }
    await shot('inizio')
    await go('Previsioni'); await p.waitForSelector('.fc-card'); await shot('previsioni')
    await p.getByRole('button', { name: 'Scegli sulla mappa' }).click(); await p.waitForSelector('.fc-picker .leaflet-container'); await shot('previsioni_mappa')
    await go('Le mie'); await shot('le_mie')
    await go('Info'); await shot('info')
    await p.locator('.bottom .fab:visible, .top-new:visible').first().click()
    await p.waitForSelector('.report-cards'); await shot('scelta')
    await p.locator('.report-card', { hasText: 'Una fioritura' }).click()
    await p.locator('.choice', { hasText: 'Nuovo luogo' }).click(); await p.waitForSelector('.leaflet-container'); await shot('luogo_mappa')
    await p.locator('.icon-btn').click()
    await toPhaseStep(p); await shot('fase')
    await p.context().close()
  }
  console.log('Scorrimento orizzontale per larghezza (0 = nessuno):', JSON.stringify(report))
}

try {
  if (process.argv.includes('--sizes')) {
    await sizes(process.argv[process.argv.indexOf('--sizes') + 1])
    process.exit(0)
  }
  mkdirSync(outDir, { recursive: true })
  const shots = process.argv.includes('--check') ? null : outDir
  const page = await open(390)
  const results = []
  const snap = async (name) => {
    await page.waitForTimeout(250)
    if (shots) await page.screenshot({ path: shots + name })
    results.push(name)
  }
  await snap('grafica_A_inizio.png')
  await nav(page, 'Previsioni'); await page.waitForSelector('.fc-card'); await snap('grafica_A_previsioni.png')
  await toPhaseStep(page); await snap('grafica_A_fase.png')

  // PC (1366 × 768): Inizio e Previsioni
  if (shots) {
    const pc = await open(1366, 768)
    await pc.waitForTimeout(250); await pc.screenshot({ path: shots + 'grafica_A_pc_inizio.png' })
    await pc.locator('.top-nav button', { hasText: 'Previsioni' }).click(); await pc.waitForSelector('.fc-card')
    await pc.waitForTimeout(250); await pc.screenshot({ path: shots + 'grafica_A_pc_previsioni.png' })
    results.push('grafica_A_pc_inizio.png', 'grafica_A_pc_previsioni.png')
  }

  // 360 px: nessuno scorrimento orizzontale in tutte le schermate
  const small = await open(360)
  const report = {}
  report.inizio = await overflow(small)
  await nav(small, 'Previsioni'); await small.waitForSelector('.fc-card'); report.previsioni = await overflow(small)
  await nav(small, 'Le mie'); report.le_mie = await overflow(small)
  await nav(small, 'Info'); report.info = await overflow(small)
  await nav(small, 'Inizio'); await toPhaseStep(small); report.fase = await overflow(small)
  for (const step of ['Avanti', 'Avanti', 'Avanti']) await small.getByRole('button', { name: step }).click()
  report.conferma = await overflow(small)
  // schermate di controllo facoltative: node scripts/screenshots.mjs --extra <cartella>
  const extraAt = process.argv.indexOf('--extra')
  if (extraAt > 0) {
    const dir = process.argv[extraAt + 1].replace(/[\/]?$/, '/')
    const p = await open(390)
    const shot = async (n) => { await p.waitForTimeout(250); await p.screenshot({ path: dir + n + '.png', fullPage: true }) }
    await nav(p, 'Le mie'); await shot('le_mie')
    await nav(p, 'Info'); await shot('info')
    await nav(p, 'Inizio'); await p.locator('.stat', { hasText: 'luoghi' }).click(); await shot('luoghi')
    await nav(p, 'Inizio'); await p.getByRole('button', { name: 'Segnala una fioritura' }).first().click(); await shot('passo_luogo')
    await p.locator('.choice', { hasText: 'Apiario Montello' }).click(); await p.getByRole('button', { name: 'Avanti' }).click(); await shot('passo_specie')
    await p.locator('.choice', { hasText: 'Castagno' }).click(); await p.locator('.phase-card', { hasText: 'Primi fiori' }).click(); await shot('passo_data')
    await p.getByRole('button', { name: 'Avanti' }).click(); await shot('passo_foto')
    await p.getByRole('button', { name: 'Avanti' }).click(); await shot('passo_conferma')
    await p.locator('.icon-btn').click(); await nav(p, 'Previsioni'); await p.waitForSelector('.fc-card'); await shot('previsioni_intera')
    // scelta del punto sulla mappa: un tocco verso nord (Prealpi) e avviso di quota
    await p.getByRole('button', { name: 'Scegli sulla mappa' }).click()
    await p.waitForSelector('.fc-picker .leaflet-container'); await p.waitForTimeout(800); await shot('previsioni_mappa')
    const box = await p.locator('.fc-picker .leaflet-container').boundingBox()
    await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.08)
    await p.getByRole('button', { name: 'Usa questo punto' }).click()
    await p.waitForSelector('.fc-place-note'); await p.waitForTimeout(2500)
    console.log('Avviso:', await p.locator('.fc-place-note').innerText())
    await p.screenshot({ path: dir + 'previsioni_punto.png' })
    console.log('Scorrimento a 390 px con avviso:', await overflow(p))
  }
  console.log(shots ? `Schermate salvate in docs/img: ${results.join(', ')}` : 'Solo controllo (nessuna schermata)')
  console.log('Scorrimento orizzontale a 360 px (0 = nessuno):', JSON.stringify(report))
  if (Object.values(report).some((v) => v > 0)) process.exitCode = 1
} finally {
  await browser.close()
  await server.close()
}
