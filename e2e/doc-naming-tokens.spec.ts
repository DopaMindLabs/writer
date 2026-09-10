import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  createSpaceFromTemplate,
  openSectionAddDoc,
} from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test("prefills a new document with the section's date token expanded", async ({
  page,
}) => {
  // The journal template's first section names new documents `{{date}}`; every
  // other template uses a literal, so nothing else expands a token.
  await createSpaceFromTemplate(page, 'journal');

  const input = await openSectionAddDoc(page);
  // isoDate is UTC, so compare against the same clock the app uses rather than
  // the runner's local date.
  const today = new Date().toISOString().slice(0, 10);
  await expect(input).toHaveValue(today);

  await input.press('Enter');
  await expect(
    page.locator('aside').last().getByText(today, { exact: true }).first(),
  ).toBeVisible();
});
