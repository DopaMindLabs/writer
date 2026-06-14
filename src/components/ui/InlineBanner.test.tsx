import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import type { LucideIcon } from '@/components/libs/icons';
import { InlineBanner } from './InlineBanner';

describe('InlineBanner', () => {
  it('renders a status role with title, body, and icon', () => {
    const { container } = render(
      <InlineBanner kind="warning" title="Permission lapsed">
        Reconnect to resume syncing.
      </InlineBanner>,
    );
    expect(screen.getByRole('status')).toHaveClass('bg-warning-bg', 'border-warning');
    expect(screen.getByText('Permission lapsed')).toBeInTheDocument();
    expect(screen.getByText('Reconnect to resume syncing.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('fires onAction when the action link is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <InlineBanner kind="info" action="Reconnect" onAction={onAction}>
        body
      </InlineBanner>,
    );
    await user.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('shows a dismiss control only when dismissible', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <InlineBanner kind="info" dismissible onDismiss={onDismiss}>
        body
      </InlineBanner>,
    );
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('omits the dismiss control by default', () => {
    render(<InlineBanner kind="info">body</InlineBanner>);
    expect(
      screen.queryByRole('button', { name: 'Dismiss' }),
    ).not.toBeInTheDocument();
  });

  it('renders a title-only banner with no body', () => {
    render(<InlineBanner kind="success" title="Imported" />);
    expect(screen.getByText('Imported')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('text-success');
  });

  it('renders no leading icon when icon is null', () => {
    const { container } = render(
      <InlineBanner kind="error" icon={null} title="No glyph" />,
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders an overridden icon in place of the default glyph', () => {
    const Custom = ((props: { className?: string }) => (
      <svg data-testid="custom-icon" {...props} />
    )) as unknown as LucideIcon;
    render(
      <InlineBanner kind="error" icon={Custom} title="Custom glyph">
        body
      </InlineBanner>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  describe('snapshot', () => {
    it('should match the snapshot across kinds, action, and dismiss states', () => {
      const { container } = render(
        <div>
          <InlineBanner kind="error" title="Sync failed">
            The remote rejected the last push.
          </InlineBanner>
          <InlineBanner kind="warning" title="Permission lapsed">
            Reconnect to resume syncing.
          </InlineBanner>
          <InlineBanner kind="success" title="Imported" />
          <InlineBanner kind="info" action="Reconnect">
            Body copy.
          </InlineBanner>
          <InlineBanner kind="info" dismissible>
            Dismissible body.
          </InlineBanner>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
