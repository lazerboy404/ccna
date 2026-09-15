// Auditoría de UI con Playwright: recorre muchos laboratorios generados y detecta
// solapamientos de equipos (placas), elementos fuera del lienzo, popup de puertos
// desbordado y errores de runtime. Uso: npm run audit:ui
import { chromium } from 'playwright'
import { createServer } from 'vite'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const PORT = 5199
const ITERS = 90
const shotsDir = path.join(os.tmpdir(), 'opencode', 'audit-shots')
fs.mkdirSync(shotsDir, { recursive: true })

const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' })
await server.listen()
const url = `http://localhost:${PORT}`

const browser = await chromium.launch()
let overlaps = 0, outCanvas = 0, popupBad = 0, builds = 0, labs = 0, tinyLabels = 0
const errors = []
const examples = []

async function auditOnce(page) {
  const info = await page.evaluate(() => {
    const svg = document.querySelector('#topo')
    const sr = svg.getBoundingClientRect()
    const vb = (svg.getAttribute('viewBox') || '0 0 960 540').split(' ').map(Number)
    const plates = [...svg.querySelectorAll('g.devg > rect.plate')].map((r) => {
      const b = r.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    })
    const label = svg.querySelector('g.devg .devlabel')
    const fs = label ? parseFloat(getComputedStyle(label).fontSize) : 0
    return { isBuild: (vb[3] || 540) > 560, devs: svg.querySelectorAll('g.devg').length, plates, sr: { x: sr.x, y: sr.y, w: sr.width, h: sr.height }, fontPx: fs }
  })
  labs++
  if (info.isBuild) builds++
  if (info.fontPx && info.fontPx < 7) tinyLabels++
  for (let a = 0; a < info.plates.length; a++) {
    const P = info.plates[a]
    if (P.x < info.sr.x - 1 || P.x + P.w > info.sr.x + info.sr.w + 1) { outCanvas++; if (examples.length < 6) examples.push('placa fuera del lienzo (x)') }
    for (let b = a + 1; b < info.plates.length; b++) {
      const Q = info.plates[b]
      if (P.x < Q.x + Q.w && Q.x < P.x + P.w && P.y < Q.y + Q.h && Q.y < P.y + P.h) { overlaps++; if (examples.length < 6) examples.push('placas encimadas') }
    }
  }
  return info
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('#topo')

  const newLab = page.getByRole('button', { name: /Nuevo Laboratorio/ })
  for (let i = 0; i < ITERS; i++) {
    await newLab.click()
    await page.waitForTimeout(70)
    await auditOnce(page)
  }
  await page.screenshot({ path: path.join(shotsDir, 'desktop.png') })

  // Confirmación de acciones destructivas
  let confirmOK = false
  await page.getByRole('button', { name: /Reiniciar/ }).click()
  await page.waitForTimeout(80)
  confirmOK = (await page.locator('[role="dialog"]').count()) > 0
  if (confirmOK) await page.getByRole('button', { name: /Cancelar/ }).click()

  // Contador de pistas y deshabilitado al agotarse
  let hintDisabled = false
  const hintBtn = page.getByRole('button', { name: /Pista/ })
  for (let i = 0; i < 30; i++) { if (await hintBtn.isDisabled()) break; await hintBtn.click(); await page.waitForTimeout(25) }
  hintDisabled = await hintBtn.isDisabled()

  // Pestañas de ayuda IOS
  let helpTabsOK = false
  await page.locator('summary', { hasText: 'Ayuda rápida' }).click()
  await page.waitForTimeout(50)
  const ruteo = page.getByRole('button', { name: 'Ruteo' })
  if (await ruteo.count()) { await ruteo.click(); await page.waitForTimeout(50); helpTabsOK = (await page.getByText(/router ospf 1/).count()) > 0 }

  // Popup de puertos dentro del contenedor
  await page.getByRole('button', { name: /Cablear/ }).click()
  await page.waitForTimeout(80)
  const dev = page.locator('#topo g.devg').nth(1)
  if (await dev.count()) {
    await dev.click()
    await page.waitForTimeout(80)
    const pop = await page.evaluate(() => {
      const p = document.querySelector('.portpopup')
      const wrap = p && p.closest('.relative')
      if (!p || !wrap) return null
      const b = p.getBoundingClientRect(), w = wrap.getBoundingClientRect()
      return { p: { x: b.x, y: b.y, w: b.width, h: b.height }, w: { x: w.x, y: w.y, w: w.width, h: w.height } }
    })
    if (!pop) { popupBad++; examples.push('no apareció el popup de puertos') }
    else if (pop.p.x < pop.w.x - 1 || pop.p.y < pop.w.y - 1 || pop.p.x + pop.p.w > pop.w.x + pop.w.w + 1 || pop.p.y + pop.p.h > pop.w.y + pop.w.h + 1) { popupBad++; examples.push('popup desbordado') }
  }

  // Vista móvil
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(url, { waitUntil: 'networkidle' })
  await mobile.waitForSelector('#topo')
  await mobile.screenshot({ path: path.join(shotsDir, 'mobile.png') })
  const mInfo = await mobile.evaluate(() => {
    const svg = document.querySelector('#topo')
    const label = svg.querySelector('g.devg .devlabel')
    return { svgW: svg.getBoundingClientRect().width, fontPx: label ? parseFloat(getComputedStyle(label).fontSize) : 0 }
  })
  console.log('Móvil 390px → SVG ancho ' + mInfo.svgW.toFixed(0) + 'px, fuente etiqueta ' + mInfo.fontPx.toFixed(1) + 'px')

  console.log('\n=== Auditoría UI ===')
  console.log('Labs auditados: ' + labs + ' (construcción: ' + builds + ')')
  console.log('Placas solapadas: ' + overlaps)
  console.log('Placas fuera del lienzo: ' + outCanvas)
  console.log('Popup desbordado: ' + popupBad)
  console.log('Etiquetas < 7px: ' + tinyLabels)
  console.log('Confirmación al Reiniciar: ' + (confirmOK ? 'OK' : 'FALLA'))
  console.log('Pista se deshabilita al agotarse: ' + (hintDisabled ? 'OK' : 'FALLA'))
  console.log('Pestañas de ayuda IOS: ' + (helpTabsOK ? 'OK' : 'FALLA'))
  console.log('Errores de runtime: ' + errors.length)
  if (errors.length) console.log(errors.slice(0, 8).join('\n'))
  if (examples.length) console.log('Ejemplos: ' + [...new Set(examples)].join(' | '))
  console.log('Capturas: ' + shotsDir)
} finally {
  await browser.close()
  await server.close()
}
