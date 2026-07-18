/// <reference types="node" />
import { request as playwrightRequest } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { validateWriterPreviewOrigin } from './scripts/preview-origin.mjs';

export const PREVIEW_AUTH_DIR = '.preview-auth';
export const PREVIEW_STORAGE_STATE = path.join(PREVIEW_AUTH_DIR, 'storageState.json');

const writeState = (state: { cookies: unknown[]; origins: unknown[] }): void => {
  fs.mkdirSync(PREVIEW_AUTH_DIR, { recursive: true });
  fs.writeFileSync(PREVIEW_STORAGE_STATE, JSON.stringify(state));
};

/**
 * Global setup for the deployed-preview run. It validates `E2E_BASE_URL` against
 * the Writer allow-list, then — only if the deployment is protected — sends the
 * Vercel bypass secret **once**, to that validated origin, to obtain an
 * origin-scoped bypass **cookie**. Only the cookie is saved to temporary storage
 * state; the secret is never attached to the browser context, so no test request
 * (including cross-origin ones to Dexie Cloud) can leak it.
 */
export default async function globalSetup(): Promise<void> {
  const origin = validateWriterPreviewOrigin(process.env.E2E_BASE_URL ?? '');
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!secret) {
    // Unprotected deployment: no secret to scope, start with a clean state.
    writeState({ cookies: [], origins: [] });
    return;
  }

  const context = await playwrightRequest.newContext({ baseURL: origin });
  try {
    await context.get('/', {
      headers: {
        'x-vercel-protection-bypass': secret,
        'x-vercel-set-bypass-cookie': 'true',
      },
    });
    const state = await context.storageState();
    // Persist only cookies (the origin-scoped bypass cookie), never localStorage,
    // and never the secret — it lived only in the request header above.
    writeState({ cookies: state.cookies, origins: [] });
  } catch (error) {
    fs.rmSync(PREVIEW_STORAGE_STATE, { force: true });
    throw error;
  } finally {
    await context.dispose();
  }
}
