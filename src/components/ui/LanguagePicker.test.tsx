import { act, render, screen } from '@testing-library/react';
import { LanguagePicker } from './LanguagePicker';
import i18n from '@/i18n';

describe('LanguagePicker', () => {
  afterEach(async () => {
    if (i18n.language !== 'en') {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });

  it('renders each supported locale as Native (English)', () => {
    render(<LanguagePicker ariaLabel="Language" />);
    const select = screen.getByLabelText('Language') as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.text);

    expect(labels).toContain('English');
    expect(labels.some((l) => l.endsWith('(Spanish)'))).toBe(true);
    expect(labels.some((l) => l.endsWith('(Japanese)'))).toBe(true);
  });

  it('does not change the option labels when the active language switches', async () => {
    render(<LanguagePicker ariaLabel="Language" />);
    const before = Array.from(
      (screen.getByLabelText('Language') as HTMLSelectElement).options,
    ).map((o) => o.text);

    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    const after = Array.from(
      (screen.getByLabelText('Language') as HTMLSelectElement).options,
    ).map((o) => o.text);

    expect(after).toEqual(before);
  });
});
