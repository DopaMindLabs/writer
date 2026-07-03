import { useState } from 'react';
import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { DeleteDocDialog } from './DeleteDocDialog';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

// Isolate the dialog from the real cascade (covered by deleteDocCascade.test.ts).
const { deleteDocCascadeMock } = vi.hoisted(() => ({
  deleteDocCascadeMock: vi.fn(),
}));
vi.mock('@/lib/docs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/docs')>();
  return { ...actual, deleteDocCascade: deleteDocCascadeMock };
});

const Harness = ({ isActiveDoc = false }: { isActiveDoc?: boolean }) => {
  const [open, setOpen] = useState(true);
  return (
    <DeleteDocDialog
      doc={sampleDoc}
      isActiveDoc={isActiveDoc}
      open={open}
      onOpenChange={setOpen}
    />
  );
};

describe('DeleteDocDialog', () => {
  beforeEach(async () => {
    navigateSpy.mockClear();
    deleteDocCascadeMock.mockReset();
    deleteDocCascadeMock.mockImplementation(async (id: string) => {
      await db.docs.delete(id);
    });
    await seedBasicSpace();
  });

  it('shows the document name and a destructive warning', async () => {
    renderWithProviders(<Harness />);
    expect(
      await screen.findByRole('dialog', { name: 'Delete document' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/“Sample Doc” and its version history/),
    ).toBeInTheDocument();
  });

  it('deletes the document and closes on confirm', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(deleteDocCascadeMock).toHaveBeenCalledWith(sampleDoc.id);
    });
    await waitFor(async () => {
      expect(await db.docs.get(sampleDoc.id)).toBeUndefined();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  it('leaves the document in place on cancel', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-cancel'));

    expect(deleteDocCascadeMock).not.toHaveBeenCalled();
    expect(await db.docs.get(sampleDoc.id)).toBeDefined();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates to the space only when the deleted doc is the open one', async () => {
    renderWithProviders(<Harness isActiveDoc />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith('/s/s1');
    });
  });

  it('does not navigate when the deleted doc is not open', async () => {
    renderWithProviders(<Harness isActiveDoc={false} />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(deleteDocCascadeMock).toHaveBeenCalled();
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('logs and does not navigate when the delete fails', async () => {
    deleteDocCascadeMock.mockRejectedValueOnce(new Error('boom'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<Harness isActiveDoc />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to delete document',
        expect.any(Error),
      );
    });
    expect(navigateSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
