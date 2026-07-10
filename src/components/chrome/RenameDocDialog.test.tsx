import { useState } from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { RenameDocDialog } from './RenameDocDialog';

const Harness = ({ initialOpen = true }: { initialOpen?: boolean }) => {
  const [open, setOpen] = useState(initialOpen);
  return (
    <RenameDocDialog
      docId={sampleDoc.id}
      docName={sampleDoc.name}
      open={open}
      onOpenChange={setOpen}
    />
  );
};

describe('RenameDocDialog', () => {
  beforeEach(async () => {
    await seedBasicSpace();
  });

  it('does not render its form when closed', () => {
    renderWithProviders(<Harness initialOpen={false} />);
    expect(screen.queryByTestId('rename-doc-input')).not.toBeInTheDocument();
  });

  it('renders a labelled, pre-filled input with title and description', async () => {
    renderWithProviders(<Harness />);
    expect(
      await screen.findByRole('dialog', { name: 'Rename document' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Choose a new name for this document.'),
    ).toBeInTheDocument();
    const input = screen.getByTestId('rename-doc-input');
    expect(input).toHaveValue(sampleDoc.name);
    expect(input).toHaveAccessibleName('Document name');
  });

  it('renames the document on submit and closes', async () => {
    renderWithProviders(<Harness />);
    const input = await screen.findByTestId('rename-doc-input');
    await userEvent.clear(input);
    await userEvent.type(input, '  New name  ');
    await userEvent.click(screen.getByTestId('rename-doc-submit'));
    await waitFor(async () => {
      expect((await db.docs.get(sampleDoc.id))?.name).toBe('New name');
    });
    expect(screen.queryByTestId('rename-doc-dialog')).not.toBeInTheDocument();
  });

  it('keeps the existing name when submitted empty', async () => {
    renderWithProviders(<Harness />);
    const input = await screen.findByTestId('rename-doc-input');
    await userEvent.clear(input);
    await userEvent.click(screen.getByTestId('rename-doc-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('rename-doc-dialog')).not.toBeInTheDocument();
    });
    expect((await db.docs.get(sampleDoc.id))?.name).toBe(sampleDoc.name);
  });

  it('does not rename when cancelled', async () => {
    renderWithProviders(<Harness />);
    const input = await screen.findByTestId('rename-doc-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Discarded');
    await userEvent.click(screen.getByTestId('rename-doc-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('rename-doc-dialog')).not.toBeInTheDocument();
    });
    expect((await db.docs.get(sampleDoc.id))?.name).toBe(sampleDoc.name);
  });
});
