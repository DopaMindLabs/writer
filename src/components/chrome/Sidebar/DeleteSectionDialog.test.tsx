import { useState } from 'react';
import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSection, seedBasicSpace } from '@/test/fixtures';
import { DeleteSectionDialog } from './DeleteSectionDialog';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

// Isolate the dialog from the real cascade (covered by deleteSectionCascade.test.ts).
const { deleteSectionCascadeMock } = vi.hoisted(() => ({
  deleteSectionCascadeMock: vi.fn(),
}));
vi.mock('@/lib/sections', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sections')>();
  return { ...actual, deleteSectionCascade: deleteSectionCascadeMock };
});

const Harness = ({
  docCount = 3,
  containsActiveDoc = false,
}: {
  docCount?: number;
  containsActiveDoc?: boolean;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <DeleteSectionDialog
      section={sampleSection}
      docCount={docCount}
      containsActiveDoc={containsActiveDoc}
      open={open}
      onOpenChange={setOpen}
    />
  );
};

describe('DeleteSectionDialog', () => {
  beforeEach(async () => {
    navigateSpy.mockClear();
    deleteSectionCascadeMock.mockReset();
    deleteSectionCascadeMock.mockImplementation(async (id: string) => {
      await db.sections.delete(id);
    });
    await seedBasicSpace();
  });

  it('warns with the document count when the section is not empty', async () => {
    renderWithProviders(<Harness docCount={3} />);
    expect(
      await screen.findByRole('dialog', { name: 'Delete section' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/“Drafts” and its 3 documents will be permanently deleted/),
    ).toBeInTheDocument();
  });

  it('uses the singular form for a single document', async () => {
    renderWithProviders(<Harness docCount={1} />);
    expect(
      await screen.findByText(/“Drafts” and its 1 document will be permanently/),
    ).toBeInTheDocument();
  });

  it('shows the lighter warning when the section is empty', async () => {
    renderWithProviders(<Harness docCount={0} />);
    expect(
      await screen.findByText(/“Drafts” will be permanently deleted/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/document/)).not.toBeInTheDocument();
  });

  it('deletes the section and closes on confirm', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(deleteSectionCascadeMock).toHaveBeenCalledWith(sampleSection.id);
    });
    await waitFor(async () => {
      expect(await db.sections.get(sampleSection.id)).toBeUndefined();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  it('leaves the section in place on cancel', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-cancel'));

    expect(deleteSectionCascadeMock).not.toHaveBeenCalled();
    expect(await db.sections.get(sampleSection.id)).toBeDefined();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates to the space only when the open document is inside the section', async () => {
    renderWithProviders(<Harness containsActiveDoc />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith('/s/s1');
    });
  });

  it('does not navigate when the open document is elsewhere', async () => {
    renderWithProviders(<Harness containsActiveDoc={false} />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(deleteSectionCascadeMock).toHaveBeenCalled();
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('logs and does not navigate when the delete fails', async () => {
    deleteSectionCascadeMock.mockRejectedValueOnce(new Error('boom'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<Harness containsActiveDoc />);
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to delete section',
        expect.any(Error),
      );
    });
    expect(navigateSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
