import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageTab } from './LanguageTab';
import i18n from '@/i18n';

describe('LanguageTab', () => {
  afterEach(async () => {
    if (i18n.language !== 'en') {
      await i18n.changeLanguage('en');
    }
  });

  it('renders the language picker with supported locales', () => {
    render(<LanguageTab />);
    const select = screen.getByLabelText(/interface language/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const codes = Array.from(select.options).map((o) => o.value);
    expect(codes).toContain('en');
    expect(codes).toContain('es');
  });

  it('shows the machine-translation notice', () => {
    render(<LanguageTab />);
    expect(
      screen.getByTestId('language-machine-translation-notice'),
    ).toBeInTheDocument();
  });

  it('changes the active i18n language when a new option is selected', async () => {
    render(<LanguageTab />);
    const select = screen.getByLabelText(/interface language/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'es' } });
    expect(i18n.language).toBe('es');
  });
});
