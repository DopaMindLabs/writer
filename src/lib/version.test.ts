import { APP_VERSION_LABEL } from './version';

describe('APP_VERSION_LABEL', () => {
  it('is the build version verbatim, a valid semver with an optional pre-release', () => {
    expect(APP_VERSION_LABEL).toBe(__APP_VERSION__);
    expect(APP_VERSION_LABEL).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
  });
});
