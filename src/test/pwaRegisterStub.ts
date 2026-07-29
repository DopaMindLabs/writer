/**
 * Test stand-in for `virtual:pwa-register`, which only exists inside a
 * `vite-plugin-pwa` build. Aliased in `vite.config.ts`'s `test` section so unit
 * tests resolve the module hermetically; suites that assert on it replace this
 * with `vi.mock`.
 */
export const registerSW =
  (): ((reloadPage?: boolean) => Promise<void>) =>
  async () => {};
