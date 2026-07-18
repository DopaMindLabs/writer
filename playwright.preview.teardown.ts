/// <reference types="node" />
import fs from 'node:fs';
import { PREVIEW_AUTH_DIR } from './playwright.preview.setup';

/** Remove the temporary bypass-cookie storage state after the preview run. */
export default function globalTeardown(): void {
  fs.rmSync(PREVIEW_AUTH_DIR, { recursive: true, force: true });
}
