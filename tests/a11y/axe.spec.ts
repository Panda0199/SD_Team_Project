import { test, expect } from '@playwright/test';
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
