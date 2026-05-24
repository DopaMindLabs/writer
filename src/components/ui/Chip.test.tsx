import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders children with aria-pressed=false when inactive', () => {
    renderWithProviders(<Chip>label</Chip>);
    const btn = screen.getByRole('button', { name: 'label' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('reflects active state via aria-pressed=true', () => {
    renderWithProviders(<Chip active>on</Chip>);
    expect(screen.getByRole('button', { name: 'on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    renderWithProviders(<Chip onClick={onClick}>tap</Chip>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('forwards type override and other props', () => {
    renderWithProviders(
      <Chip type="submit" disabled className="custom">
        submit
      </Chip>,
    );
    const btn = screen.getByRole('button', { name: 'submit' });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toBeDisabled();
    expect(btn).toHaveClass('custom');
  });
});
