import { expect, test } from '@playwright/test'

test('student opens a course conversation and sends a tagged question', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  const courseConversation = page.getByRole('button', { name: /Research Methods/ })
  await courseConversation.focus()
  await courseConversation.press('Enter')
  await expect(page.getByRole('heading', { name: 'Dr. Lina Kask' })).toBeVisible()

  await page.getByLabel('Ask a question about Research Methods').fill('When should we begin the survey?')
  await page.getByRole('button', { name: 'Send question' }).click()

  const sentMessage = page.getByRole('region', { name: 'Research Methods conversation' })
    .getByText('When should we begin the survey?')
  await expect(sentMessage).toBeVisible()
  await expect(page.getByText('Tagged to Research Methods')).toBeVisible()
  await expect(page.getByText('Sent', { exact: true }).last()).toBeVisible()
})

test('student can see Sent, Seen, and Replied conversation states', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Replied', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Seen', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Sent', { exact: true }).first()).toBeVisible()
})
