import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc, expectNoA11yViolations } from './_helpers';

const PASSPHRASE = 'a-strong-passphrase';
// Colour-contrast is asserted only in the high-contrast themes across the suite.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

/** Tick the evaluation-account acknowledgement so sign-in can proceed. */
const acknowledgeSignIn = async (page: import('@playwright/test').Page) => {
  await expect(page.getByTestId('cloud-signin-ack-dialog')).toBeVisible();
  await page.getByTestId('cloud-signin-ack-checkbox').click();
  await page.getByTestId('cloud-signin-ack-continue').click();
};

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
    await page.goto('/#/settings?tab=cloudSync');
    await expect(page.getByRole('heading', { name: /^Cloud sync$/ })).toBeVisible();
    await expect(page.getByTestId('cloud-section')).toHaveCount(0);
    await expectNoA11yViolations(page, { context: 'cloud sync tab without the flag', ...STRUCTURE_ONLY });
  });

  test('?cloud-sync=on reveals the section, strips the param and survives reload', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    // The activation param is stripped from the URL once consumed.
    expect(page.url()).not.toContain('cloud-sync');
    // Sign-in is available before a passphrase exists (a clean device signs in first).
    await expect(page.getByTestId('cloud-sign-in')).toBeEnabled();
    await expectNoA11yViolations(page, { context: 'cloud sync tab with the flag', ...STRUCTURE_ONLY });
    // The opt-in persists across a reload.
    await page.reload();
    await expect(page.getByTestId('cloud-section')).toBeVisible();
  });

  test('sign-in is available before a passphrase exists', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    // A clean device may sign in first; the button is no longer disabled.
    await expect(page.getByTestId('cloud-sign-in')).toBeEnabled();
  });

  test('a device with unencrypted writing is turned back until it sets up a passphrase', async ({
    page,
  }) => {
    // Reseed in cloud mode so the seeded rows are plaintext at rest on this
    // keyless device — the exact "unencrypted writing" the guard turns back.
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    // The device is turned back with a "set up first" notice (after the
    // evaluation acknowledgement, which always precedes sign-in).
    await page.getByTestId('cloud-sign-in').click();
    await acknowledgeSignIn(page);
    await expect(page.getByTestId('cloud-sign-in-error')).toContainText(
      /unencrypted writing/i,
    );
    // Once a passphrase seals that writing, sign-in proceeds to the login step.
    await setUpEncryption(page);
    await page.getByTestId('cloud-sign-in').click();
    await acknowledgeSignIn(page);
    await expect(page.getByTestId('cloud-login-dialog')).toBeVisible();
  });

  test('unlocking before an escrow has arrived tells the user to sign in first', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await page.getByTestId('cloud-unlock').click();
    await page.getByTestId('unlock-input').fill('some-passphrase');
    await page.getByTestId('unlock-submit').click();
    // Not "wrong passphrase" — there is simply no key on this device yet.
    await expect(page.getByTestId('unlock-error')).toContainText(/sign in first/i);
    // The dialog dismisses cleanly, leaving the device keyless.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('passphrase-unlock-dialog')).toHaveCount(0);
  });

  test('sign-in requires the evaluation acknowledgement to be ticked', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await page.getByTestId('cloud-sign-in').click();
    const dialog = page.getByTestId('cloud-signin-ack-dialog');
    await expect(dialog).toBeVisible();
    // The demo/evaluation terms are stated and must be acknowledged.
    await expect(dialog).toContainText(/no server of its own/i);
    await expect(dialog).toContainText(/valid for 3 days/i);
    await expect(page.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
    // The optional backup tick alone does not unlock continue.
    await page.getByTestId('cloud-signin-ack-backup').click();
    await expect(page.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
    await page.getByTestId('cloud-signin-ack-checkbox').click();
    await expect(page.getByTestId('cloud-signin-ack-continue')).toBeEnabled();
    // Cancel backs out without signing in — no login step appears.
    await page.getByTestId('cloud-signin-ack-cancel').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('cloud-login-dialog')).toHaveCount(0);
    // Reopening starts unticked: every sign-in re-acknowledges.
    await page.getByTestId('cloud-sign-in').click();
    await expect(page.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
  });

  test('the acknowledgement also dismisses with Escape, without signing in', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await page.getByTestId('cloud-sign-in').click();
    await expect(page.getByTestId('cloud-signin-ack-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cloud-signin-ack-dialog')).toHaveCount(0);
    await expect(page.getByTestId('cloud-login-dialog')).toHaveCount(0);
  });

  test('forget encryption on this device returns it to the keyless state', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await setUpEncryption(page);
    // With a key present the row offers sign-in/forget; forgetting drops the
    // key and the keyless actions (set-up, unlock) return.
    await page.getByTestId('cloud-forget').click();
    await expect(page.getByTestId('cloud-setup')).toBeVisible();
    await expect(page.getByTestId('cloud-unlock')).toBeVisible();
  });

  test('sign-in opens the email step and cancel dismisses it', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await setUpEncryption(page);
    await page.getByTestId('cloud-sign-in').click();
    await acknowledgeSignIn(page);
    await expect(page.getByTestId('cloud-login-dialog')).toBeVisible();
    await expect(page.getByTestId('cloud-login-input')).toBeVisible();
    await page.getByTestId('cloud-login-cancel').click();
    await expect(page.getByTestId('cloud-login-dialog')).toHaveCount(0);
  });

  test('?cloud-sync=off hides the section again', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await page.goto('/?cloud-sync=off#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toHaveCount(0);
  });
});

test.describe('cloud sync key conflict', () => {
  test('surfaces the conflict banner and resolves it via the erase step', async ({
    page,
  }) => {
    // The real trigger (a fingerprint mismatch) needs a live two-device sign-in;
    // the ?cloud-mismatch affordance forces the signal so the conflict surface is
    // drivable headlessly. It is gated to the e2e/dev build only.
    await page.goto('/?cloud-sync=on&reseed=1&cloud-mismatch=1#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await expect(page.getByText(/locked on another device/i)).toBeVisible();

    // Open the resolution dialog and reach both steps.
    await page.getByRole('button', { name: /unlock now/i }).click();
    await expect(page.getByTestId('cloud-conflict-dialog')).toBeVisible();
    await expect(page.getByTestId('cloud-conflict-passphrase')).toBeVisible();
    await page
      .getByRole('button', { name: /don't have that passphrase/i })
      .click();
    // The irreversible erase is armed only by typing the confirmation word.
    const eraseButton = page.getByTestId('cloud-conflict-erase');
    await expect(eraseButton).toBeVisible();
    await expect(eraseButton).toBeDisabled();
    await page.getByTestId('cloud-conflict-erase-input').fill('ERASE');
    await expect(eraseButton).toBeEnabled();

    // Erasing resolves the mismatch: the banner and dialog fall away.
    await eraseButton.click();
    await expect(page.getByText(/locked on another device/i)).toHaveCount(0);
    await expect(page.getByTestId('cloud-conflict-dialog')).toHaveCount(0);
  });
});

test.describe('cloud sync four-device beta limit', () => {
  test('a blocked device sees the hard-block banner and no key action', async ({
    page,
  }) => {
    // The real trigger (a signed-in fifth device against a full registry) needs
    // a live account; the ?cloud-devices affordance forces the blocked signal so
    // the surface is drivable headlessly. Gated to the e2e/dev build only.
    await page.goto('/?cloud-sync=on&reseed=1&cloud-devices=full#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();

    await expect(page.getByTestId('cloud-device-limit')).toBeVisible();
    await expect(page.getByText(/supports four devices/i)).toBeVisible();
    // The blocked banner offers no key-minting action of its own.
    await expect(page.getByTestId('cloud-keyless-locked')).toHaveCount(0);
    await expect(page.getByTestId('cloud-keyless-nokey')).toHaveCount(0);
    await expect(page.getByTestId('cloud-keyless-checking')).toHaveCount(0);

    // Leaving settings tears the panel down cleanly (unsubscribes its stores).
    await page.goto('/#/');
    await expect(page.getByTestId('cloud-section')).toHaveCount(0);
  });

  test('the beta notice names the four-device limit', async ({ page }) => {
    await page.goto('/?cloud-sync=on#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await expect(page.getByText(/four devices per account/i)).toBeVisible();
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
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
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
