import { createServer } from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
import { expect, test } from '@playwright/test'

let viteServer: ChildProcess | undefined
let authUrl = ''

async function findAvailablePort() {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not allocate a local port for the sign-in test.')
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
  return address.port
}

test.beforeAll(async () => {
  const port = await findAvailablePort()
  authUrl = `http://127.0.0.1:${port}`
  viteServer = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_DEMO_MODE: 'false',
      VITE_SUPABASE_URL: 'http://127.0.0.1:9',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    },
    stdio: 'inherit',
  })

  await expect.poll(async () => {
    try {
      return (await fetch(authUrl)).ok
    } catch {
      return false
    }
  }, { timeout: 30_000 }).toBe(true)
})

test.afterAll(async () => {
  if (!viteServer || viteServer.exitCode !== null) return
  await new Promise<void>((resolve) => {
    viteServer!.once('exit', () => resolve())
    viteServer!.kill('SIGTERM')
  })
})

test('sign-in hero adapts to mobile and keeps its copy readable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(authUrl)

  await expect(page.getByRole('heading', { name: 'Sign in to Quickly' })).toBeVisible()
  await expect(page.locator('.auth-hero')).toBeVisible()
  await expect(page.locator('.auth-tagline')).toBeVisible()
  const qrTile = page.locator('.auth-qr-tile')
  const qrImage = qrTile.locator('img')
  await expect(qrImage).toHaveAttribute('src', '/quickly-qr.svg')
  await expect(qrImage).toHaveAttribute('alt', 'QR code that opens Quickly')
  await expect(qrImage).toHaveAttribute('width', '132')
  await expect(qrImage).toHaveAttribute('height', '132')
  await expect(qrTile.getByText('Scan to open Quickly on your phone')).toBeVisible()
  await expect(page.getByRole('button', { name: 'EN' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  const username = page.getByLabel('University ID or email')
  await expect(username).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.locator('.auth-form')).toHaveCSS('animation-name', 'gentle-rise')

  const taglineBounds = await page.locator('.auth-tagline').boundingBox()
  const cardBounds = await page.locator('.auth-form').boundingBox()
  if (!taglineBounds || !cardBounds) throw new Error('The sign-in hero and card must have measurable bounds.')
  expect(taglineBounds.x + taglineBounds.width).toBeLessThanOrEqual(cardBounds.x)

  const desktopContrast = await page.evaluate(() => {
    const luminance = (value: string) => {
      const channels = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }
    const ratio = (foreground: string, background: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      return (values[0] + 0.05) / (values[1] + 0.05)
    }
    const text = [
      '.auth-tagline',
      '.auth-benefits li',
      '.auth-qr-tile p',
      '.auth-form h1',
      '.auth-form>p:not(.eyebrow)',
      '.auth-form label',
    ].map((selector) => getComputedStyle(document.querySelector(selector)!).color)
    const backgroundSamples = ['rgb(238, 240, 255)', 'rgb(243, 232, 255)', 'rgb(224, 242, 254)', 'rgb(255, 255, 255)']
    return text.map((foreground) => Math.min(...backgroundSamples.map((background) => ratio(foreground, background))))
  })
  expect(desktopContrast.every((contrast) => contrast >= 4.5)).toBe(true)
  await expect(qrTile).toHaveCSS('background-color', 'rgb(255, 255, 255)')

  await username.focus()
  await expect.poll(() => username.evaluate((input) => getComputedStyle(input.parentElement!, '::after').opacity)).toBe('1')
  await expect.poll(() => username.evaluate((input) => getComputedStyle(input.parentElement!, '::after').transitionProperty)).toBe('opacity')

  const signInButton = page.getByRole('button', { name: 'Sign in', exact: true })
  await signInButton.hover()
  await page.mouse.down()
  await expect(signInButton).toHaveCSS('transform', 'matrix(0.98, 0, 0, 0.98, 0, 0)')
  await page.mouse.up()

  await page.getByRole('button', { name: 'ET' }).click()
  await expect(page.locator('.auth-tagline')).toHaveText('Küsi õppejõult. Saa vastus kiiremini.')
  await expect(page.getByText('Näe, millal sinu sõnum on loetud')).toBeVisible()
  await expect(qrTile.getByText('Skanni, et avada Quickly telefonis')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.auth-hero')).toBeHidden()
  await expect(qrTile).toBeHidden()
  await expect(page.locator('.auth-mobile-tagline')).toBeVisible()
  await expect(page.locator('.auth-form')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.auth-form')).toHaveCSS('animation-name', 'none')
})
