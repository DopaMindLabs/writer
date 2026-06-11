import { APP_VERSION_LABEL } from './version';

describe('APP_VERSION_LABEL', () => {
  it('is the build version with the alpha channel as a semver pre-release', () => {
    expect(APP_VERSION_LABEL).toMatch(/^\d+\.\d+\.\d+-alpha$/);
    expect(APP_VERSION_LABEL).toBe(`${__APP_VERSION__}-alpha`);
  });
});
