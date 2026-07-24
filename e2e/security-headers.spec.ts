import { test, expect } from './_helpers';

// The e2e preview server (vite preview) does not apply vercel.json's headers by
// default, so the production Content-Security-Policy — the exact constraint that
// governs how pdf.js loads its worker and bytes — is invisible to the e2e suite.
// The vercel-headers plugin restores parity; these specs prove it.
test.describe('production security headers on the preview server', () => {
  test('preview serves the production content security policy', async ({
    page,
  }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const csp = response?.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("script-src 'self'");
  });

  test('preview serves nosniff and frame protections', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });
});
