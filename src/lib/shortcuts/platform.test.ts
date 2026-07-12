import { getModifierLabel, isApplePlatform } from './platform';

describe('shortcuts/platform', () => {
  describe('isApplePlatform', () => {
    it('detects macOS via userAgentData.platform', () => {
      expect(isApplePlatform({ userAgentData: { platform: 'macOS' } })).toBe(
        true,
      );
    });

    it('detects an Apple mobile platform via navigator.platform', () => {
      expect(isApplePlatform({ platform: 'iPhone' })).toBe(true);
      expect(isApplePlatform({ platform: 'MacIntel' })).toBe(true);
    });

    it('returns false for Windows and Linux', () => {
      expect(isApplePlatform({ platform: 'Win32' })).toBe(false);
      expect(isApplePlatform({ userAgentData: { platform: 'Linux' } })).toBe(
        false,
      );
    });

    it('prefers userAgentData over the legacy platform string', () => {
      expect(
        isApplePlatform({
          userAgentData: { platform: 'Windows' },
          platform: 'MacIntel',
        }),
      ).toBe(false);
    });

    it('returns false when no platform information is available', () => {
      expect(isApplePlatform({})).toBe(false);
    });
  });

  describe('getModifierLabel', () => {
    it('is ⌘ on Apple platforms', () => {
      expect(getModifierLabel({ platform: 'MacIntel' })).toBe('⌘');
    });

    it('is Ctrl elsewhere', () => {
      expect(getModifierLabel({ platform: 'Win32' })).toBe('Ctrl');
    });
  });
});
