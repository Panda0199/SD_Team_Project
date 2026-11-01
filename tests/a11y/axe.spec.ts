import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Session 9: the accessibility check. Run it with: npm run a11y
// It opens the start page and lists serious and critical problems.
// Add a line for each page your users visit, for example '/booking'.
const pages = ['/'];

for (const path of pages) {
  test(`no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of serious) console.log(`${v.impact}: ${v.id}, ${v.help} (${v.nodes.length} places)`);
    expect(serious).toEqual([]);
  });
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of serious) console.log(`${v.impact}: ${v.id}, ${v.help} (${v.nodes.length} places)`);
  expect(serious).toEqual([]);
}

test.describe('demo accessibility views', () => {
  test.beforeEach(() => {
    test.skip(!!process.env.BASE_URL, 'Demo role controls are unavailable on the live sign-in page');
  });

  const roles = ['Student', 'Instructor', 'Teaching Assistant', 'Admin'];
  const languages = ['EN', 'ET'];

  for (const role of roles) {
    for (const language of languages) {
      test(`no serious accessibility problems in ${role} view (${language})`, async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: role, exact: true }).click();
        await page.getByRole('button', { name: language, exact: true }).click();
        await expect(page.locator('main').first()).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      });
    }
  }

  for (const language of languages) {
    test(`no serious accessibility problems in Student conversation view (${language})`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Student', exact: true }).click();
      await page.getByRole('button', { name: language, exact: true }).click();
      await expect(page.locator('main.workspace')).toBeVisible();
      await page.locator('.conversation-list .conversation-card').first().click();
      await expect(page.locator('.thread-panel .thread-heading')).toBeVisible();
      await expectNoSeriousAxeViolations(page);
    });
  }
});
