import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  describe('kind variants', () => {
    it('should apply primary classes by default', () => {
      render(<Button data-testid="btn">click me</Button>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('bg-ink', 'text-paper');
      expect(btn).toHaveAttribute('type', 'button');
    });

    it('should apply secondary classes', () => {
      render(<Button kind="secondary" data-testid="btn">s</Button>);
      expect(screen.getByTestId('btn')).toHaveClass('border', 'border-ink');
    });

    it('should apply ghost classes with compound height/padding override', () => {
      render(<Button kind="ghost" data-testid="btn">g</Button>);
      expect(screen.getByTestId('btn')).toHaveClass('border-b', 'h-auto', 'px-0');
    });

    it('should apply dangerous classes', () => {
      render(<Button kind="dangerous" data-testid="btn">d</Button>);
      expect(screen.getByTestId('btn')).toHaveClass('bg-ink', 'text-paper');
    });
  });

  describe('size variants', () => {
    it('should apply sm size classes', () => {
      render(<Button size="sm" data-testid="btn">s</Button>);
      expect(screen.getByTestId('btn')).toHaveClass('h-7', 'text-xs');
    });

    it('should apply lg size classes', () => {
      render(<Button size="lg" data-testid="btn">l</Button>);
      expect(screen.getByTestId('btn')).toHaveClass('h-11', 'text-sm');
    });
  });

  describe('ghost compound variants', () => {
    it('should override height and padding for ghost+sm', () => {
      render(
        <Button kind="ghost" size="sm" data-testid="btn">
          g
        </Button>,
      );
      expect(screen.getByTestId('btn')).toHaveClass('h-auto', 'px-0', 'pb-[2px]', 'text-xs');
    });

    it('should override height and padding for ghost+lg', () => {
      render(
        <Button kind="ghost" size="lg" data-testid="btn">
          g
        </Button>,
      );
      expect(screen.getByTestId('btn')).toHaveClass('h-auto', 'px-0', 'pb-[2px]', 'text-sm');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is set', () => {
      render(<Button disabled data-testid="btn">disabled</Button>);
      expect(screen.getByTestId('btn')).toBeDisabled();
    });
  });

  describe('event handling', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      render(<Button data-testid="btn" onClick={onClick}>click</Button>);
      await userEvent.click(screen.getByTestId('btn'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const onClick = vi.fn();
      render(
        <Button disabled data-testid="btn" onClick={onClick}>
          click
        </Button>,
      );
      await userEvent.click(screen.getByTestId('btn'), {
        pointerEventsCheck: 0,
      });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('asChild', () => {
    it('should render as the child element and omit type attribute', () => {
      render(
        <Button asChild>
          <a href="/foo" data-testid="btn">link button</a>
        </Button>,
      );
      const link = screen.getByTestId('btn');
      expect(link).toHaveClass('bg-ink');
      expect(link).not.toHaveAttribute('type');
    });
  });

  it('should merge custom className with variant classes', () => {
    render(<Button className="custom-class" data-testid="btn">btn</Button>);
    expect(screen.getByTestId('btn')).toHaveClass('custom-class', 'bg-ink');
  });

  it('should forward explicit type attribute', () => {
    render(<Button type="submit" data-testid="btn">submit</Button>);
    expect(screen.getByTestId('btn')).toHaveAttribute('type', 'submit');
  });
});
