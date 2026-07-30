import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { openCoveredContext } from './_helpers';

/**
 * Pairing two devices, end to end.
 *
 * Each side runs in its own browser context so the two hold separate device
 * identities and separate storage — the same context would pair a device with
 * itself and prove nothing. The camera-free paste path carries the symbols,
 * because a headless run has no camera to point at a screen.
 */

/**
 * Long enough to cover the engine's candidate-gathering deadline. Gathering
 * routinely stalls short of `complete` on a host whose mDNS responder cannot
 * bind — a CI runner among them — so a code can legitimately take the full
 * deadline to appear. This waits on the code, never on the clock.
 */
const GATHERING_TIMEOUT = 30_000;

const openPairing = async (page: Page): Promise<void> => {
  await page.goto('/#/settings?tab=deviceSync');
  await expect(page.getByTestId('pair-device-open')).toBeVisible();
  await page.getByTestId('pair-device-open').click();
  // One step at a time: the dialog opens on the choice between showing a code
  // and scanning one, so neither device is left guessing whose turn it is.
  await expect(page.getByTestId('pairing-start-step')).toBeVisible();
};

/**
 * Take the showing half, and wait for the code itself rather than the screen
 * around it: the step appears at once and names the wait while the device is
 * still gathering, so stopping at the step would hand the next assertion an
 * empty frame.
 */
const showCode = async (page: Page): Promise<void> => {
  await page.getByTestId('pairing-start-show').click();
  await expect(page.getByTestId('pairing-offer-step')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Pairing code from this device' })).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
};

/** Open the way in that needs no camera, from the start choice. */
const openScanner = async (page: Page): Promise<void> => {
  await page.getByTestId('pairing-start-scan').click();
  await expect(page.getByTestId('pairing-code-scanner')).toBeVisible();
};

/** The same scanner, reached from a device that has been showing its code. */
const scanReply = async (page: Page): Promise<void> => {
  await page.getByTestId('pairing-scan-start').click();
  await expect(page.getByTestId('pairing-code-scanner')).toBeVisible();
};

/**
 * Ask the reading device for its reply. The step arrives under the press that
 * finished the scan, so the code waits behind a reveal rather than sharing a
 * screen with the action that dismisses it.
 */
const revealReply = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('pairing-reply-step')).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
  await page.getByTestId('pairing-reply-reveal').click();
  await expect(page.getByRole('img', { name: 'Reply code from this device' })).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
};

/** Read every symbol of the code currently on screen, stepping the pager. */
const readSymbols = async (page: Page): Promise<string[]> => {
  const field = page.getByTestId('pairing-code-payload');
  await expect(field).toBeVisible({ timeout: GATHERING_TIMEOUT });
  const next = page.getByRole('button', { name: 'Next' });
  const symbols: string[] = [];
  for (;;) {
    symbols.push(await field.inputValue());
    if (!(await next.isVisible()) || (await next.isDisabled())) return symbols;
    await next.click();
  }
};

/** Hand symbols to the other device the way a user without a camera would. */
const pasteSymbols = async (page: Page, symbols: readonly string[]): Promise<void> => {
  for (const symbol of symbols) {
    await page.getByLabel('Or paste the code text').fill(symbol);
    await page.getByRole('button', { name: 'Use this code' }).click();
  }
};

const verificationCode = (page: Page) => page.getByTestId('pairing-verification-code');

test('two devices pair over QR symbols and agree on one verification code', async ({
  page,
  browser,
  browserName,
}) => {
  const joiner = await openCoveredContext(browser, browserName);

  await openPairing(page);
  await openPairing(joiner);

  // Whichever device reads first becomes the reader; nobody was asked which
  // half to play, only what to do next. Here the first device shows and the
  // second reads.
  await showCode(page);
  const offered = await readSymbols(page);
  await openScanner(joiner);
  await pasteSymbols(joiner, offered);

  // Answering is what binds the transcript, so the reading device knows the
  // digits first — its peer learns them only once it has read the reply back.
  await revealReply(joiner);
  const reply = await readSymbols(joiner);
  await scanReply(page);
  await pasteSymbols(page, reply);

  // The reader moves on when the user says the code was taken: nothing arrives
  // on this device when the other one reads it.
  await joiner.getByTestId('pairing-reply-shown').click();

  await expect(verificationCode(page)).toBeVisible({ timeout: GATHERING_TIMEOUT });
  await expect(verificationCode(joiner)).toBeVisible({ timeout: GATHERING_TIMEOUT });
  const shown = await verificationCode(page).innerText();
  expect(shown).toMatch(/^\d{6}$/);
  await expect(verificationCode(joiner)).toHaveText(shown);

  // Neither side completes on authentication alone.
  await expect(page.getByTestId('pair-device-complete')).toHaveCount(0);

  await page.getByTestId('pairing-verification-confirm').click();
  await joiner.getByTestId('pairing-verification-confirm').click();

  await expect(page.getByTestId('pair-device-complete')).toBeVisible();
  await expect(joiner.getByTestId('pair-device-complete')).toBeVisible();
});

test('a reply pressed past can be shown again', async ({ page, browser, browserName }) => {
  // The exchange this protects: the reading device cannot mint a second reply,
  // so a press on "they have scanned it" before the other device has actually
  // read the code used to cost both devices the whole pairing.
  const joiner = await openCoveredContext(browser, browserName);

  await openPairing(page);
  await openPairing(joiner);
  await showCode(page);
  await openScanner(joiner);
  await pasteSymbols(joiner, await readSymbols(page));
  await revealReply(joiner);
  const reply = await readSymbols(joiner);

  // The misclick: moving on before the peer has read anything.
  await joiner.getByTestId('pairing-reply-shown').click();
  await expect(verificationCode(joiner)).toBeVisible();

  await joiner.getByTestId('pairing-reply-show-code').click();

  // The same reply, symbol for symbol — a re-minted one would move the digits
  // the peer is about to compare against.
  await expect(joiner.getByRole('img', { name: 'Reply code from this device' })).toBeVisible();
  expect(await readSymbols(joiner)).toEqual(reply);
  await expect(verificationCode(joiner)).toHaveCount(0);

  // And the exchange still finishes from there, on the code that survived.
  await scanReply(page);
  await pasteSymbols(page, reply);
  await joiner.getByTestId('pairing-reply-shown').click();
  await page.getByTestId('pairing-verification-confirm').click();
  await joiner.getByTestId('pairing-verification-confirm').click();

  await expect(page.getByTestId('pair-device-complete')).toBeVisible();
  await expect(joiner.getByTestId('pair-device-complete')).toBeVisible();
});

/** How much padding the advertised description carries. See below. */
const PAD_CHARACTERS = 3200;

/**
 * Make this device advertise a session description too long for one symbol.
 *
 * A device on a host with several network interfaces gathers a description that
 * outgrows the symbol on its own; a headless runner with one interface never
 * does, so the multi-symbol path would otherwise be unreachable from here. Only
 * the description this device *advertises* is padded — the connection keeps the
 * real one, and the padding is an attribute the peer's parser ignores — so the
 * pairing that follows is a real one, carried in parts.
 *
 * The padding is deterministic and high-entropy on purpose: the payload is
 * DEFLATE-compressed before it is split, and repetitive padding would compress
 * away to nothing without ever reaching a second symbol.
 */
const advertiseAnOversizedDescription = (page: Page): Promise<void> =>
  page.addInitScript((count: number) => {
    // xorshift32, kept in 32-bit lanes: a multiplicative generator overflows
    // JavaScript's integer precision and decays into a repeating sequence,
    // which would compress away and never reach a second symbol.
    let seed = 0x2f6e2b1;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const noise = Array.from({ length: count }, () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      seed |= 0;
      return alphabet[Math.abs(seed) % alphabet.length];
    }).join('');

    const own = Object.getOwnPropertyDescriptor(
      RTCPeerConnection.prototype,
      'localDescription',
    );
    const read = own?.get;
    if (!own || !read) return;
    Object.defineProperty(RTCPeerConnection.prototype, 'localDescription', {
      ...own,
      get(this: RTCPeerConnection): RTCSessionDescription | null {
        const description = read.call(this) as RTCSessionDescription | null;
        if (description === null || description.type !== 'offer') return description;
        return {
          ...description,
          type: description.type,
          sdp: `${description.sdp}a=x-writer-pad:${noise}\r\n`,
        } as RTCSessionDescription;
      },
    });
  }, PAD_CHARACTERS);

test('a code too long for one symbol is carried across in parts', async ({
  page,
  browser,
  browserName,
}) => {
  test.slow();

  const shower = await openCoveredContext(browser, browserName);
  await advertiseAnOversizedDescription(shower);

  await openPairing(shower);
  await showCode(shower);

  // The pager belongs to this case and this case only: several symbols, stepped
  // by hand, each naming its place in the sequence.
  await expect(shower.getByText(/^Symbol 1 of [2-8]$/)).toBeVisible();
  const symbols = await readSymbols(shower);
  expect(symbols.length).toBeGreaterThan(1);

  await openPairing(page);
  await openScanner(page);
  await pasteSymbols(page, symbols.slice(0, 1));

  // Mid-scan, the outstanding symbol is named as a symbol rather than left as a
  // bare count that reads as "two more to go".
  await expect(page.getByTestId('pairing-scan-progress')).toHaveText(
    `Read 1 of ${String(symbols.length)} symbols. Still to scan: symbol 2.`,
  );

  await pasteSymbols(page, symbols.slice(1));

  // Answering proves the parts were reassembled into the payload that was
  // split, not merely collected: a mis-joined description would not validate.
  await expect(page.getByTestId('pairing-reply-step')).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
});

test('a symbol from an unrelated session is refused mid-scan', async ({
  page,
  browser,
  browserName,
}) => {
  // Three contexts, two of them gathering a session description of their own
  // against the engine's deadline, so this one legitimately outruns the default
  // budget on a loaded runner.
  test.slow();

  // Two devices showing codes, so there are two distinct sessions to confuse.
  // The first is padded into several symbols, because the guard protects a scan
  // that is still collecting — a single-symbol code completes before a stray
  // one could arrive.
  const first = await openCoveredContext(browser, browserName);
  const second = await openCoveredContext(browser, browserName);
  await advertiseAnOversizedDescription(first);

  await openPairing(first);
  await openPairing(second);
  await showCode(first);
  await showCode(second);

  const [fromFirst] = await readSymbols(first);
  const [fromSecond] = await readSymbols(second);

  await openPairing(page);
  await openScanner(page);
  await pasteSymbols(page, [fromFirst]);
  await expect(page.getByTestId('pairing-scan-progress')).toBeVisible();

  await pasteSymbols(page, [fromSecond]);

  // Adopting the stray would let a substituted code take over a scan the user
  // believes is still collecting their own device's answer.
  await expect(page.getByTestId('pairing-scan-problem')).toBeVisible();
});

test('a photographed code is read from an uploaded image', async ({
  page,
  browser,
  browserName,
}) => {
  // The path a user without a paired camera takes: point a phone at the screen,
  // then upload the picture. Rendering the symbol and reading it back proves
  // the encoder and the detector agree on a real image, not on a fixture.
  const shower = await openCoveredContext(browser, browserName);
  await openPairing(shower);
  await showCode(shower);

  const symbol = shower.getByRole('img', { name: 'Pairing code from this device' });
  await expect(symbol).toBeVisible({ timeout: GATHERING_TIMEOUT });
  const photograph = await symbol.screenshot();

  await openPairing(page);
  await openScanner(page);
  await page
    .getByLabel('Upload a photo of the code')
    .setInputFiles({ name: 'code.png', mimeType: 'image/png', buffer: photograph });

  // Either the payload was complete and this device answered, or it was one of
  // several symbols and the scanner says which are outstanding. Both mean the
  // image was decoded; neither is the unreadable-image message. The reply step
  // stands in for the answer rather than the code itself, which waits behind
  // its reveal.
  await expect(
    page
      .getByTestId('pairing-scan-progress')
      .or(page.getByTestId('pairing-reply-step'))
      .or(page.getByTestId('pair-device-authenticating')),
  ).toBeVisible({ timeout: GATHERING_TIMEOUT });
});

test('the pairing dialog is reachable and named from Device sync settings', async ({
  page,
}) => {
  await openPairing(page);

  await expect(page.getByRole('dialog', { name: 'Pair another device' })).toBeVisible();
  // Nothing protocol-shaped on the first screen: no code, so no pager reading
  // "Symbol 1 of 2" before anyone has asked for one, and no scanner either.
  await expect(page.getByRole('img', { name: 'Pairing code from this device' })).toHaveCount(0);
  await expect(page.getByTestId('pairing-code-scanner')).toHaveCount(0);
  await expect(page.getByTestId('pairing-start-show')).toBeEnabled();
  await expect(page.getByTestId('pairing-start-scan')).toBeEnabled();

  // One code and one way in — never a code beside a live scanner.
  await showCode(page);
  await expect(page.getByRole('img', { name: 'Pairing code from this device' })).toBeVisible();
  await expect(page.getByTestId('pairing-scan-start')).toBeEnabled();
  await expect(page.getByTestId('pairing-code-scanner')).toHaveCount(0);
});

test('a typical pairing code fits a single symbol, with no pager', async ({ page }) => {
  await openPairing(page);
  await showCode(page);

  // The pager is carriage detail for an oversized payload; an ordinary offer
  // should never surface it.
  await expect(page.getByTestId('pairing-code-payload')).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
  await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0);
});

/**
 * The camera path, driven against Chromium's synthetic capture device (see the
 * launch args in `playwright.config.ts`). The fake device emits a rolling
 * pattern rather than a code, so scanning runs and finds nothing — which is
 * exactly the loop worth exercising here. That the reading device *can* start,
 * report, and release a camera is what the unit suite cannot prove.
 */
test('the reading device can start and stop its camera', async ({ page }) => {
  await openPairing(page);
  await openScanner(page);

  const start = page.getByRole('button', { name: 'Use the camera' });
  await expect(start).toBeVisible();
  // Nothing is asked for until the user asks: no viewfinder before the press.
  await expect(page.getByTestId('qr-scan-camera')).toBeHidden();

  await start.click();

  await expect(page.getByTestId('qr-scan-camera')).toBeVisible();
  await expect(
    page.getByTestId('pairing-code-scanner').getByRole('status'),
  ).toHaveText('Looking for a code…');

  const stop = page.getByRole('button', { name: 'Stop the camera' });
  await expect(stop).toBeVisible();
  await stop.click();

  // Back to the resting state, viewfinder gone — the camera is not left running.
  await expect(start).toBeVisible();
  await expect(page.getByTestId('qr-scan-camera')).toBeHidden();
});

test('the camera never displaces the ways in that need no permission', async ({
  page,
}) => {
  await openPairing(page);
  await openScanner(page);

  await page.getByRole('button', { name: 'Use the camera' }).click();
  await expect(page.getByTestId('qr-scan-camera')).toBeVisible();

  // Both camera-free paths stay put while the camera is live, so a user who
  // gives up on it has somewhere to go without closing the dialog.
  await expect(page.getByLabel('Upload a photo of the code')).toBeVisible();
  await expect(page.getByLabel('Or paste the code text')).toBeVisible();
});

test('Device sync lists no devices until one is paired', async ({ page }) => {
  await page.goto('/#/settings?tab=deviceSync');

  await expect(page.getByTestId('trusted-devices-empty')).toBeVisible();
  // The entry point to pairing lives with the list it fills.
  await expect(page.getByTestId('pair-device-open')).toBeVisible();
  // Retention moved here from Account: it governs how long a device can be away
  // and still catch up, which is meaningless without other devices.
  await expect(page.getByTestId('setting-journal-retention')).toBeVisible();
});

test('Profile no longer carries the pairing entry point', async ({ page }) => {
  await page.goto('/#/settings?tab=profile');

  await expect(page.getByTestId('pair-device-open')).toHaveCount(0);
  await expect(page.getByTestId('setting-journal-retention')).toHaveCount(0);
});
