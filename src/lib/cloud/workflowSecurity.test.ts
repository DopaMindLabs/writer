import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string): string =>
  readFileSync(path.join(root, file), 'utf8');

const preview = read('.github/workflows/e2e-preview.yml');
const whitelist = read('.github/workflows/whitelist-dexie-cloud.yml');
const toolPackage = JSON.parse(
  read('.github/tools/dexie-cloud-cli/package.json'),
) as {
  dependencies: Record<string, string>;
  overrides: Record<string, string>;
};
const toolLock = JSON.parse(
  read('.github/tools/dexie-cloud-cli/package-lock.json'),
) as {
  packages: Record<string, { version?: string; integrity?: string }>;
};

const expectReadOnlyCheckout = (workflow: string): void => {
  expect(workflow).toContain('permissions:\n  contents: read');
  expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}');
  expect(workflow).toContain('persist-credentials: false');
};

describe('GitHub Actions security policy', () => {
  it('runs preview smoke from a trusted harness, never deployment code', () => {
    expectReadOnlyCheckout(preview);
    expect(preview).not.toContain('github.event.deployment.sha');
    expect(preview).toContain('npm ci --ignore-scripts');
    expect(preview).not.toMatch(/\bnpx\b/);
  });

  it('installs a lockfile-pinned Dexie CLI before credentials are available', () => {
    expectReadOnlyCheckout(whitelist);
    expect(toolPackage.dependencies['dexie-cloud']).toBe('3.0.4');
    expect(toolPackage.overrides['brace-expansion']).toBe('5.0.8');
    const lockedCli = toolLock.packages['node_modules/dexie-cloud'];
    expect(lockedCli?.version).toBe('3.0.4');
    expect(lockedCli?.integrity).toMatch(/^sha512-/);
    expect(whitelist).toContain(
      'npm ci --ignore-scripts --prefix .github/tools/dexie-cloud-cli',
    );
    expect(whitelist).toContain(
      '$GITHUB_WORKSPACE/.github/tools/dexie-cloud-cli/node_modules/.bin/dexie-cloud',
    );
    expect(whitelist).not.toMatch(/\bnpx\b/);

    const validationStep = whitelist.indexOf('- name: Validate origin');
    const credentialStep = whitelist.indexOf('- name: Whitelist validated origin');
    expect(validationStep).toBeGreaterThan(-1);
    expect(credentialStep).toBeGreaterThan(validationStep);
    expect(whitelist.slice(0, credentialStep)).not.toContain('DEXIE_CLOUD_KEY');
  });
});
