import {
  APP_MENU_LINKS,
  appMenuLink,
  appMenuLinksFor,
  popoverAppMenuLink,
  sheetAppMenuLinks,
} from './appMenuLinks';

describe('appMenuLinks', () => {
  it('has unique ids', () => {
    const ids = APP_MENU_LINKS.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every dual-surface link both a popover and a sheet label', () => {
    for (const link of APP_MENU_LINKS) {
      if (link.surfaces.includes('popover')) {
        expect(link.popoverLabelKey, link.id).toBeTruthy();
        expect(link.popoverTestId, link.id).toBeTruthy();
      }
      if (link.surfaces.includes('sheet')) {
        expect(link.sheetLabelKey, link.id).toBeTruthy();
      }
    }
  });

  it('offers Accessibility and Account on both surfaces', () => {
    for (const id of ['accessibility', 'profile']) {
      expect(appMenuLink(id).surfaces).toEqual(
        expect.arrayContaining(['popover', 'sheet']),
      );
    }
  });

  it('keeps Contact to the sheet only', () => {
    expect(appMenuLink('contact').surfaces).toEqual(['sheet']);
    expect(appMenuLink('contact').external).toBe(true);
  });

  it('resolves the sheet App group with Accessibility and Account before Contact', () => {
    const ids = sheetAppMenuLinks().map((link) => link.id);
    expect(ids).toContain('accessibility');
    expect(ids).toContain('profile');
    expect(ids.indexOf('accessibility')).toBeLessThan(ids.indexOf('contact'));
    expect(ids.indexOf('profile')).toBeLessThan(ids.indexOf('contact'));
  });

  it('resolves popover links to a href, label key and test id', () => {
    const about = popoverAppMenuLink('about');
    expect(about.href).toBe('/about');
    expect(about.testId).toBe('quick-settings-about');
    expect(about.labelKey).toBe('quickSettings.about');
  });

  it('filters links by surface', () => {
    expect(appMenuLinksFor('popover').every((l) => l.surfaces.includes('popover'))).toBe(
      true,
    );
    expect(appMenuLinksFor('popover').some((l) => l.id === 'contact')).toBe(false);
  });

  it('throws on an unknown id', () => {
    expect(() => appMenuLink('nope')).toThrow(/unknown app menu link/i);
  });
});
