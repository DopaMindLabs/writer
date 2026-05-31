import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ConfirmDialog } from './ConfirmDialog';

const Harness = ({ onConfirm }: { onConfirm: () => void }) => {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete everything?"
      description="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      confirmKind="dangerous"
      onConfirm={onConfirm}
    />
  );
};

describe('ConfirmDialog', () => {
  it('renders the title and description when open', () => {
    renderWithProviders(<Harness onConfirm={() => undefined} />);
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete everything?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm and closes when the confirm button is clicked', async () => {
    let confirmed = 0;
    renderWithProviders(<Harness onConfirm={() => { confirmed += 1; }} />);
    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(confirmed).toBe(1);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('closes without confirming when cancel is clicked', async () => {
    let confirmed = 0;
    renderWithProviders(<Harness onConfirm={() => { confirmed += 1; }} />);
    await userEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(confirmed).toBe(0);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });
});
