import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  openSectionAddDoc,
} from './_helpers';
import type { Page } from '@playwright/test';

const activeDocId = (page: Page): string => {
  const match = new URL(page.url()).hash.match(/\/d\/([^/?]+)/);
  if (!match) throw new Error(`no docId in ${page.url()}`);
  return match[1];
};

/** Hover the row so the desktop-hidden menu trigger reveals, then open the menu. */
const openRowMenu = async (page: Page, docId: string): Promise<void> => {
  await page.getByTestId(`sidebar-doc-${docId}`).hover();
  await page.getByTestId(`sidebar-doc-${docId}-menu`).click();
};

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('deletes a non-active document and leaves the open one untouched', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const firstDocId = activeDocId(page);

  // Add a second doc; creating it navigates to it, so the first doc is now inactive.
  const sidebar = page.locator('aside').last();
  const input = await openSectionAddDoc(page, sidebar);
  await input.fill('Keeper');
  await input.press('Enter');
  await page.waitForURL(
    (url) => /\/d\/[^/?]+/.test(url.hash) && !url.hash.includes(firstDocId),
  );
  const keeperDocId = activeDocId(page);

  await openRowMenu(page, firstDocId);
  await page.getByTestId(`sidebar-doc-${firstDocId}-delete`).click();
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(page.getByTestId(`sidebar-doc-${firstDocId}`)).toHaveCount(0);
  // Still viewing the doc we never deleted.
  expect(activeDocId(page)).toBe(keeperDocId);
});

test('deletes the open document and redirects to a remaining one', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const openDocId = activeDocId(page);

  await openRowMenu(page, openDocId);
  await page.getByTestId(`sidebar-doc-${openDocId}-delete`).click();
  await page.getByTestId('confirm-dialog-confirm').click();

  // The deleted doc was active → redirect lands on another doc.
  await page.waitForURL(
    (url) => /\/d\/[^/?]+/.test(url.hash) && !url.hash.includes(openDocId),
  );
  await expect(page.getByTestId('document-body')).toBeVisible();
  await expect(page.getByTestId(`sidebar-doc-${openDocId}`)).toHaveCount(0);
});

test('cancelling the confirmation keeps the document', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docId = activeDocId(page);

  await openRowMenu(page, docId);
  await page.getByTestId(`sidebar-doc-${docId}-delete`).click();
  await page.getByTestId('confirm-dialog-cancel').click();

  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
  await expect(page.getByTestId(`sidebar-doc-${docId}`)).toBeVisible();
});
