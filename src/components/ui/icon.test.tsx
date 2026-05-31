import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { ChevronLeft } from '@/components/libs/icons';
import { render, screen } from '@/test/test-utils';
import { Icon, IconButton } from './icon';

describe('Icon', () => {
  it('renders the passed lucide icon with default size sm (h-3.5 w-3.5)', () => {
    const { container } = render(<Icon icon={ChevronLeft} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('class')).toContain('h-3.5');
    expect(svg!.getAttribute('class')).toContain('w-3.5');
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies xs size class', () => {
    const { container } = render(<Icon icon={ChevronLeft} size="xs" />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('class')).toContain('h-3');
    expect(svg!.getAttribute('class')).toContain('w-3');
    expect(svg!.getAttribute('class')).not.toContain('h-3.5');
  });

  it('applies md size class', () => {
    const { container } = render(<Icon icon={ChevronLeft} size="md" />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('class')).toContain('h-4');
    expect(svg!.getAttribute('class')).toContain('w-4');
  });

  it('merges custom className and forwards strokeWidth', () => {
    const { container } = render(
      <Icon icon={ChevronLeft} className="text-red-500" strokeWidth={3} />,
    );
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('class')).toContain('text-red-500');
    expect(svg!.getAttribute('stroke-width')).toBe('3');
  });
});

describe('IconButton', () => {
  it('renders default sm/sm variant', () => {
    const { container } = render(
      <IconButton icon={ChevronLeft} label="Test" />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders a <button type="button"> with aria-label and an inner svg', () => {
    render(<IconButton icon={ChevronLeft} label="Go back" />);
    const button = screen.getByRole('button', { name: 'Go back' });
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('allows the caller to override type', () => {
    render(<IconButton icon={ChevronLeft} label="Submit" type="submit" />);
    expect(
      screen.getByRole('button', { name: 'Submit' }).getAttribute('type'),
    ).toBe('submit');
  });

  it('omits aria-pressed when active is undefined', () => {
    render(<IconButton icon={ChevronLeft} label="Maybe" />);
    expect(
      screen.getByRole('button', { name: 'Maybe' }).hasAttribute('aria-pressed'),
    ).toBe(false);
  });

  it('sets aria-pressed when active is a boolean', () => {
    const { rerender } = render(
      <IconButton icon={ChevronLeft} label="Toggle" active={false} />,
    );
    expect(
      screen.getByRole('button', { name: 'Toggle' }).getAttribute('aria-pressed'),
    ).toBe('false');
    rerender(<IconButton icon={ChevronLeft} label="Toggle" active />);
    expect(
      screen.getByRole('button', { name: 'Toggle' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('applies the sm buttonSize variant (h-7 w-7)', () => {
    render(<IconButton icon={ChevronLeft} label="Small" buttonSize="sm" />);
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button.className).toContain('h-7');
    expect(button.className).toContain('w-7');
  });

  it('applies the md buttonSize variant (h-9 w-9)', () => {
    render(<IconButton icon={ChevronLeft} label="Medium" buttonSize="md" />);
    const button = screen.getByRole('button', { name: 'Medium' });
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('w-9');
  });

  it('passes iconSize through to the inner Icon', () => {
    const { container } = render(
      <IconButton icon={ChevronLeft} label="Big" iconSize="md" />,
    );
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('class')).toContain('h-4');
  });

  it('forwards refs to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} icon={ChevronLeft} label="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.getAttribute('aria-label')).toBe('With ref');
  });

  it('invokes onClick when clicked', async () => {
    const onClick = vi.fn();
    render(
      <IconButton icon={ChevronLeft} label="Click me" onClick={onClick} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <IconButton
        icon={ChevronLeft}
        label="Disabled"
        onClick={onClick}
        disabled
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
