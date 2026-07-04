import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc, expectNoA11yViolations } from './_helpers';

const PASSPHRASE = 'a-strong-passphrase';
// Colour-contrast is asserted only in the high-contrast themes across the suite.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

/** Set up encryption so sign-in becomes available (passphrase before sign-in). */
const setUpEncryption = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('cloud-setup').click();
  await page.getByTestId('passphrase-input').fill(PASSPHRASE);
  await page.getByTestId('passphrase-confirm').fill(PASSPHRASE);
  await page.getByTestId('passphrase-submit').click();
  await expect(page.getByTestId('recovery-code-dialog')).toBeVisible();
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
};

test.describe('cloud sync beta gating', () => {
  test('the cloud section is absent without the flag', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/settings?tab=account');
    await expect(page.getByTestId('account-privacy-notice')).toBeVisible();
    await expect(page.getByTestId('cloud-section')).toHaveCount(0);
    await expectNoA11yViolations(page, { context: 'account tab without cloud sync', ...STRUCTURE_ONLY });
  });

  test('?cloud-sync=on reveals the section, strips the param and survives reload', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=account');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    // The activation param is stripped from the URL once consumed.
    expect(page.url()).not.toContain('cloud-sync');
    // Signed out, sign-in stays disabled until a passphrase exists.
    await expect(page.getByTestId('cloud-sign-in')).toBeDisabled();
    await expectNoA11yViolations(page, { context: 'account tab with cloud sync', ...STRUCTURE_ONLY });
    // The opt-in persists across a reload.
    await page.reload();
    await expect(page.getByTestId('cloud-section')).toBeVisible();
  });

  test('setting up a passphrase enables sign-in', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=account');
    await expect(page.getByTestId('cloud-sign-in')).toBeDisabled();
    await setUpEncryption(page);
    await expect(page.getByTestId('cloud-sign-in')).toBeEnabled();
  });

  test('sign-in opens the email step and cancel dismisses it', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=account');
    await setUpEncryption(page);
    await page.getByTestId('cloud-sign-in').click();
    await expect(page.getByTestId('cloud-login-dialog')).toBeVisible();
    await expect(page.getByTestId('cloud-login-input')).toBeVisible();
    await page.getByTestId('cloud-login-cancel').click();
    await expect(page.getByTestId('cloud-login-dialog')).toHaveCount(0);
  });

  test('?cloud-sync=off hides the section again', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=account');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await page.goto('/?cloud-sync=off#/settings?tab=account');
    await expect(page.getByTestId('cloud-section')).toHaveCount(0);
  });
});

test.describe('cloud sync encrypted reads (real IndexedDB)', () => {
  test('reads content back after unlock without an IndexedDB transaction crash', async ({
    page,
  }) => {
    // The encryption middleware must keep the IndexedDB transaction alive across
    // the async decrypt of every read. When it didn't, the first encrypted read
    // once a key was present threw "InvalidStateError: The transaction has
    // finished" and the app fell to its error boundary. Real Chromium reproduces
    // the auto-commit timing that fake-indexeddb (the unit suite) does not, so
    // this is the regression's home: it exercises the content reads a user hits
    // on a fresh cloud-enabled load — Home listing spaces, then opening a doc.
    const uncaught: string[] = [];
    page.on('pageerror', (error) => uncaught.push(error.message));

    // Seed straight into a cloud-enabled database and set a passphrase, so a
    // content key seals and opens every synced-table read. (Reseeding into the
    // plain database first and enabling cloud afterwards does not carry the rows
    // across the addon's IndexedDB version bump.) setUpEncryption only succeeds
    // when the cloud section is live, so this also proves the path is active.
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=account');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await setUpEncryption(page);

    // A full reload boots the app cloud-enabled with the key hydrated from the
    // keystore before anything reads the database.
    await page.reload();

    // Home queries the encrypted `spaces` table; a divergent transaction would
    // crash here instead of rendering the seeded space.
    await page.goto('/#/');
    await expect(page.getByRole('link', { name: /Continue writing/i })).toBeVisible();

    // Opening a document reads the encrypted `docs` row and lists its siblings —
    // the exact `query`/`get` paths that threw before the fix.
    const { docId } = await gotoFirstDoc(page);
    expect(docId).toBeTruthy();

    await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
    expect(uncaught, `uncaught page errors:\n${uncaught.join('\n')}`).toEqual([]);
  });
});
