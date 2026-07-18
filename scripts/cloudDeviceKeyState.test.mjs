import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyKeyState,
  isErrorKeyState,
  isTerminalKeyState,
} from './cloudDeviceKeyState.mjs';

test('keyed when the forget affordance is present', () => {
  assert.equal(classifyKeyState(['cloud-forget']), 'keyed');
});

test('unlock when the keyless-locked banner is present (escrow exists)', () => {
  assert.equal(classifyKeyState(['cloud-keyless-locked']), 'unlock');
});

test('setup when the no-key banner is present (no escrow)', () => {
  assert.equal(classifyKeyState(['cloud-keyless-nokey']), 'setup');
});

test('pending while still checking, or before anything resolves', () => {
  assert.equal(classifyKeyState(['cloud-keyless-checking']), 'pending');
  assert.equal(classifyKeyState([]), 'pending');
});

test('a loaded key beats a stale keyless banner', () => {
  assert.equal(classifyKeyState(['cloud-forget', 'cloud-keyless-locked']), 'keyed');
});

test('errors take priority and are reported distinctly', () => {
  assert.equal(classifyKeyState(['cloud-device-limit', 'cloud-forget']), 'error:device-limit');
  assert.equal(classifyKeyState(['cloud-device-revoked']), 'error:revoked');
  assert.equal(classifyKeyState(['cloud-keyless-offline']), 'error:offline');
  assert.equal(classifyKeyState(['cloud-keyless-fetch-failed']), 'error:fetch-failed');
});

test('terminal and error helpers', () => {
  assert.equal(isTerminalKeyState('pending'), false);
  assert.equal(isTerminalKeyState('keyed'), true);
  assert.equal(isTerminalKeyState('error:revoked'), true);
  assert.equal(isErrorKeyState('error:offline'), true);
  assert.equal(isErrorKeyState('setup'), false);
});
