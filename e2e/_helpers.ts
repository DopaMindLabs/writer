import type { Page } from '@playwright/test';

/**
 * Navigate to the app with `?reseed=1`, which wipes IndexedDB and reseeds
 * the default Bioinformatics template before the router mounts. Waits for
 * the boot sequence to finish (i.e. the "Booting…" placeholder is gone).
 */
export async function reseedAndGoHome(page: Page): Promise<void> {
  await page.goto('/?reseed=1#/');
  await page.waitForFunction(() => !document.body.innerText.includes('Booting…'));
}

/**
 * Resolve the first space's UUID from the SpaceRail tag link tooltip target.
 * Used by tests that want to skip the home page and jump directly into a doc.
 */
export async function getFirstSpaceIdFromHome(page: Page): Promise<string> {
  const continueLink = page.getByRole('link', { name: /Continue writing/i });
  const href = await continueLink.getAttribute('href');
  if (!href) throw new Error('Expected "Continue writing" link to be present after reseed');
  const match = href.match(/\/s\/([^/?#]+)/);
  if (!match) throw new Error(`Could not parse spaceId from href: ${href}`);
  return match[1];
}
