import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWriterPreviewOrigin } from './preview-origin.mjs';

const ok = (url) => validateWriterPreviewOrigin(url);
const rejects = (url, env) =>
  assert.throws(() => validateWriterPreviewOrigin(url, env));

test('accepts the production hosts', () => {
  assert.equal(ok('https://lipsumwriter.vercel.app'), 'https://lipsumwriter.vercel.app');
  assert.equal(ok('https://lipsumwriter.com/'), 'https://lipsumwriter.com');
});

test('accepts a valid project + owner preview host (git-branch and hash forms)', () => {
  assert.equal(
    ok('https://lipsumwriter-git-feat-collaborative-editing-shavindra.vercel.app'),
    'https://lipsumwriter-git-feat-collaborative-editing-shavindra.vercel.app',
  );
  assert.equal(
    ok('https://lipsumwriter-abc123def-shavindra.vercel.app'),
    'https://lipsumwriter-abc123def-shavindra.vercel.app',
  );
});

test('rejects non-https', () => {
  rejects('http://lipsumwriter.vercel.app');
});

test('rejects credentials, ports, paths, queries, fragments', () => {
  rejects('https://user:pass@lipsumwriter.vercel.app');
  rejects('https://lipsumwriter.vercel.app:8443');
  rejects('https://lipsumwriter.vercel.app/secret');
  rejects('https://lipsumwriter.vercel.app/?x=1');
  rejects('https://lipsumwriter.vercel.app/#frag');
});

test('rejects deceptive suffixes and foreign projects/owners', () => {
  rejects('https://lipsumwriter.vercel.app.evil.com');
  rejects('https://lipsumwriter.com.evil.com');
  rejects('https://evil-lipsumwriter.vercel.app');
  rejects('https://otherproject-git-x-shavindra.vercel.app');
  rejects('https://lipsumwriter-git-x-someoneelse.vercel.app');
  rejects('https://lipsumwriter.someone.vercel.app');
});

test('rejects whitespace and malformed input', () => {
  rejects(' https://lipsumwriter.vercel.app ');
  rejects('not a url');
  rejects('');
});

test('honours env-configured owner/project/hosts', () => {
  const env = {
    WRITER_VERCEL_OWNER: 'acme',
    WRITER_VERCEL_PROJECT: 'writerapp',
    WRITER_PRODUCTION_HOSTS: 'writer.example.com',
  };
  assert.equal(
    validateWriterPreviewOrigin('https://writerapp-git-main-acme.vercel.app', env),
    'https://writerapp-git-main-acme.vercel.app',
  );
  assert.equal(
    validateWriterPreviewOrigin('https://writer.example.com', env),
    'https://writer.example.com',
  );
  // The defaults no longer apply under the overriding env.
  rejects('https://lipsumwriter.vercel.app', env);
});
