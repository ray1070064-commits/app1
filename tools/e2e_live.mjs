import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const BASE_URL = process.env.E2E_BASE_URL || 'https://ray1070064-commits.github.io/app1/'
const API_URL = process.env.E2E_API_URL || 'https://capital-life-api.onrender.com'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'zh-TW',
})
const page = await context.newPage()
page.setDefaultTimeout(60_000)

const browserErrors = []
page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`))
page.on('console', msg => {
  if (msg.type() === 'error') browserErrors.push(`console: ${msg.text()}`)
})

async function waitJsonResponse(urlPart, method = null) {
  const response = await page.waitForResponse(resp => {
    const matchesUrl = resp.url().includes(urlPart)
    const matchesMethod = method ? resp.request().method() === method : true
    return matchesUrl && matchesMethod
  }, { timeout: 90_000 })
  const body = await response.json().catch(() => null)
  assert.equal(response.ok(), true, `${method || ''} ${urlPart} failed: HTTP ${response.status()} ${JSON.stringify(body)}`)
  return { response, body }
}

try {
  console.log(`E2E frontend: ${BASE_URL}`)
  console.log(`E2E backend:  ${API_URL}`)

  // 0. Backend must be live before exercising the browser flow.
  const health = await context.request.get(`${API_URL}/api/v1/health`, { timeout: 90_000 })
  assert.equal(health.ok(), true, `health failed: HTTP ${health.status()}`)
  const healthBody = await health.json()
  assert.equal(healthBody.ok, true)
  assert.equal(healthBody.service, 'capital-life-private-api')
  console.log('✓ Render FastAPI health')

  // 1. Load the real GitHub Pages frontend.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.getByRole('heading', { name: '資本人生' }).waitFor()
  await page.getByRole('heading', { name: '🎲 隨機開始' }).waitFor()
  console.log('✓ GitHub Pages launch screen')

  // 2. Create a real backend game through the UI (tests CORS + POST + X-Game-Id setup).
  const createPromise = waitJsonResponse('/api/v1/games', 'POST')
  await page.getByRole('button', { name: '進入市場' }).click()
  const created = await createPromise
  assert.ok(created.body?.gameId, 'create game did not return gameId')
  const firstGameId = created.body.gameId
  await page.getByText('下單', { exact: true }).waitFor({ timeout: 90_000 })
  await page.getByRole('button', { name: '👤 人生／經營' }).waitFor()
  console.log(`✓ New game created (${firstGameId.slice(0, 8)}…)`)

  // 3. Buy one unit using the actual Spot market-order UI.
  const orderPromise = waitJsonResponse('/api/v1/orders', 'POST')
  await page.getByRole('button', { name: '確認買入' }).click()
  const order = await orderPromise
  assert.equal(order.body?.ok, true)
  const positions = order.body?.positions || order.body?.snapshot?.positions || []
  assert.ok(Array.isArray(positions), 'order response did not contain positions array')
  console.log('✓ Spot market buy')

  // 4. Advance one real game day and verify the UI Day increments.
  const dayText = page.locator('.terminal-topbar .top-stats').getByText(/^Day \d+$/).first()
  const beforeText = await dayText.textContent()
  const beforeDay = Number((beforeText || '').match(/\d+/)?.[0] || 0)
  assert.ok(beforeDay >= 1, `could not read initial day from ${beforeText}`)
  const advancePromise = waitJsonResponse('/api/v1/time/advance', 'POST')
  await page.getByRole('button', { name: '+1 日' }).click()
  const advanced = await advancePromise
  assert.equal(advanced.body?.ok, true)
  assert.equal(advanced.body?.currentDay, beforeDay + 1)
  await page.waitForFunction(expected => {
    const nodes = [...document.querySelectorAll('.terminal-topbar .top-stats span')]
    return nodes.some(node => node.textContent?.trim() === `Day ${expected}`)
  }, beforeDay + 1)
  console.log(`✓ GameDay advance Day ${beforeDay} → ${beforeDay + 1}`)

  // 5. Enter the real life/management center and verify all seven sections exist.
  await page.getByRole('button', { name: '👤 人生／經營' }).click()
  await page.getByRole('button', { name: '總覽' }).waitFor({ timeout: 90_000 })
  for (const label of ['總覽', '職涯', '家庭', '公司', '權力／風險', '人生記憶', '存檔']) {
    assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 1, `missing life tab: ${label}`)
  }
  await page.getByText(`Day ${beforeDay + 1}`, { exact: true }).first().waitFor()
  console.log('✓ Life/management center APIs + navigation')

  // 6. Save the authoritative GameState through FastAPI and verify localStorage.
  await page.getByRole('button', { name: '存檔', exact: true }).click()
  await page.getByText('瀏覽器存檔', { exact: true }).waitFor()
  const savePromise = waitJsonResponse('/api/v1/save/export', 'GET')
  await page.getByRole('button', { name: '立即保存' }).click()
  const saved = await savePromise
  assert.equal(saved.body?.ok, true)
  assert.ok(String(saved.body?.code || '').startsWith('CL181.'), 'save code does not use CL181 format')
  await page.getByText('已保存到這個瀏覽器', { exact: true }).waitFor()
  const localSave = await page.evaluate(() => localStorage.getItem('capital-life-public-save-v181'))
  assert.ok(localSave?.startsWith('CL181.'), 'browser localStorage save missing')
  assert.equal(localSave, saved.body.code, 'browser localStorage differs from exported save')
  console.log(`✓ Portable save → localStorage (${localSave.length.toLocaleString()} chars)`)

  // 7. Simulate a fresh page load. The launch screen must detect the local save.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.getByRole('heading', { name: '歡迎回來' }).waitFor({ timeout: 90_000 })
  await page.getByRole('button', { name: '▶ 繼續這段人生' }).waitFor()
  console.log('✓ Reload detects browser save')

  // 8. Restore into a new backend session and verify the saved day survives.
  const restorePromise = waitJsonResponse('/api/v1/save/restore', 'POST')
  await page.getByRole('button', { name: '▶ 繼續這段人生' }).click()
  const restored = await restorePromise
  assert.equal(restored.body?.ok, true)
  assert.ok(restored.body?.gameId, 'restore did not return gameId')
  assert.notEqual(restored.body.gameId, firstGameId, 'restore should create a new backend session id')
  assert.equal(restored.body?.snapshot?.day, beforeDay + 1, 'restored day does not match saved day')
  await page.getByText('下單', { exact: true }).waitFor({ timeout: 90_000 })
  await page.waitForFunction(expected => {
    const nodes = [...document.querySelectorAll('.terminal-topbar .top-stats span')]
    return nodes.some(node => node.textContent?.trim() === `Day ${expected}`)
  }, beforeDay + 1)
  console.log(`✓ Save restore → new session (${restored.body.gameId.slice(0, 8)}…)`)

  // 9. Fail on genuine browser/runtime errors that occurred during the flow.
  const meaningfulErrors = browserErrors.filter(text => !/favicon|Failed to load resource.*404/i.test(text))
  assert.deepEqual(meaningfulErrors, [], `browser console errors:\n${meaningfulErrors.join('\n')}`)

  console.log('\nLIVE E2E PASSED')
  console.log('GitHub Pages → Render FastAPI → GameState → React → localStorage → restore: OK')
} catch (error) {
  await fs.mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/e2e-failure.png', fullPage: true }).catch(() => {})
  console.error('\nLIVE E2E FAILED')
  console.error(error)
  if (browserErrors.length) console.error('Browser errors:', browserErrors)
  process.exitCode = 1
} finally {
  await browser.close()
}
