import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { SecretField } from './SecretField';

describe('SecretField', () => {
  it('renders a labelled field and reports typed values', async () => {
    const values: string[] = [];
    renderWithProviders(
      <SecretField
        label="Passphrase"
        value=""
        data-testid="secret"
        onValue={(v) => values.push(v)}
      />,
    );
    const input = screen.getByTestId('secret');
    expect(input).toHaveAccessibleName('Passphrase');
    await userEvent.type(input, 'ab');
    expect(values).toEqual(['a', 'b']);
  });

  it('marks the field invalid when error is set', () => {
    renderWithProviders(
      <SecretField label="Code" value="x" error data-testid="secret" onValue={() => {}} />,
    );
    expect(screen.getByTestId('secret')).toHaveAttribute('aria-invalid', 'true');
  });
});
