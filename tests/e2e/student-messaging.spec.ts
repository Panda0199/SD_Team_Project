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
    .locator('article')
    .filter({ hasText: 'When should we begin the survey?' })
  await expect(sentMessage).toBeVisible()
  await expect(sentMessage.getByText('Sent', { exact: true })).toBeVisible()
  await expect(page.getByText('Tagged to Research Methods')).toBeVisible()
})

test('student can see Sent, Seen, and Replied conversation states', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Replied', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Seen', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Sent', { exact: true }).first()).toBeVisible()
})

test('away availability and the two-hour urgent flag are visible to students', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /Academic Writing/ }).click()

  const conversation = page.getByRole('region', { name: 'Academic Writing conversation' })
  await expect(conversation.getByText('Away', { exact: true })).toBeVisible()
  await expect(conversation.getByText('This instructor is away; replies may be delayed.')).toBeVisible()
  await expect(conversation.getByText('Waiting over 2 hours')).toBeVisible()
  await conversation.getByRole('button', { name: 'Flag as urgent' }).click()
  await expect(conversation.getByRole('status').getByText('Urgent')).toBeVisible()
  await page.getByRole('button', { name: 'Inbox' }).click()
  await expect(page.getByRole('button', { name: /Academic Writing/ }).getByText('Urgent')).toBeVisible()
})

test('conversation can be resolved with its history still readable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.getByRole('button', { name: /Research Methods/ }).click()
  const conversation = page.getByRole('region', { name: 'Research Methods conversation' })
  await expect(conversation.getByText('Should our survey include open-ended questions?')).toBeVisible()
  await conversation.getByRole('button', { name: 'Mark as resolved' }).click()

  await expect(conversation.getByText('This conversation is resolved. You can still read its history.')).toBeVisible()
  await expect(conversation.getByText('Should our survey include open-ended questions?')).toBeVisible()
  await expect(conversation.getByRole('button', { name: 'Mark as resolved' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Resolved', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Research Methods/ })).toBeVisible()
})

test('changing conversation filters clears a selection that may not match', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Research Methods/ }).click()
  await expect(page.getByRole('region', { name: 'Research Methods conversation' })).toBeVisible()

  await page.getByRole('button', { name: 'Resolved', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Research Methods conversation' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Select a conversation' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Marketing Principles/ })).toBeVisible()

  await page.getByRole('button', { name: 'Active', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Select a conversation' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Research Methods/ })).toBeVisible()
})

test('student can search by course, instructor, or message keyword', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('searchbox', { name: 'Search conversations' })

  await search.fill('Karin')
  await expect(page.getByRole('button', { name: /Business Statistics/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Research Methods/ })).toHaveCount(0)

  await search.fill('open-ended')
  await expect(page.getByRole('button', { name: /Research Methods/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Business Statistics/ })).toHaveCount(0)
})

test('mobile composer and send action remain within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /Business Statistics/ }).click()

  const composer = page.locator('.composer')
  const sendButton = page.getByRole('button', { name: 'Send question' })
  const composerBox = await composer.boundingBox()
  const sendBox = await sendButton.boundingBox()
  expect(composerBox).not.toBeNull()
  expect(sendBox).not.toBeNull()
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844)
  expect(sendBox!.y + sendBox!.height).toBeLessThanOrEqual(844)
})

test('student message becomes an instructor notification and reply returns to the student', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /Business Statistics/ }).click()
  await page.getByLabel('Ask a question about Business Statistics').fill('Can you explain the median?')
  await page.getByRole('button', { name: 'Send question' }).click()
  const questionThread = page.getByRole('region', { name: 'Business Statistics conversation' })
  await expect(questionThread.getByText('Can you explain the median?')).toBeVisible()
  await expect(questionThread.getByText('Sent', { exact: true }).last()).toBeVisible()

  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  const instructorCard = page.getByRole('button', { name: /Business Statistics/ })
  await expect(instructorCard).toContainText(/Jordan Doe.*Can you explain the median\?.*New message/)
  await instructorCard.click()

  const instructorThread = page.getByRole('region', { name: 'Business Statistics conversation' })
  await expect(instructorThread.getByText('Seen', { exact: true })).toBeVisible()
  await page.getByLabel('Reply to Jordan Doe · Business Statistics').fill('The median is the middle value in an ordered set.')
  await page.getByRole('button', { name: 'Send reply' }).click()

  await page.getByRole('button', { name: 'Student', exact: true }).click()
  const studentCard = page.getByRole('button', { name: /Business Statistics/ })
  await expect(studentCard).toContainText(/The median is the middle value in an ordered set\..*New reply/)
  await studentCard.click()
  const studentThread = page.getByRole('region', { name: 'Business Statistics conversation' })
  await expect(studentThread.getByText('The median is the middle value in an ordered set.')).toBeVisible()
  await expect(studentThread.getByText('Replied', { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Teaching Assistant', exact: true }).click()

  await expect(page.getByText(/Sam Lee can access Research Methods only/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Research Methods/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Business Statistics/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Academic Writing/ })).toHaveCount(0)

  await page.getByRole('button', { name: /Research Methods/ }).click()
  await page.getByLabel('Reply to Jordan Doe · Research Methods').fill('I can help with this course question.')
  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByRole('region', { name: 'Research Methods conversation' })
    .getByText('I can help with this course question.')).toBeVisible()
})
