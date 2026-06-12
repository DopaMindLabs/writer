import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { Route, Routes } from 'react-router-dom';
import { db } from '@/db/db';
import { seedRichSpace } from '@/test/fixtures';
import { buildSpaceArchiveFor } from '@/lib/format/buildSpaceArchive';
import { ExportImportTab } from './ExportImportTab';

const renderTab = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ExportImportTab />} />
      <Route path="/s/:spaceId" element={<div data-testid="space-screen" />} />
    </Routes>,
  );

const archiveFile = async (): Promise<File> => {
  await seedRichSpace();
  const { blob, filename } = await buildSpaceArchiveFor('s1');
  return new File([new Uint8Array(await blob.arrayBuffer())], filename, {
    type: 'application/zip',
  });
};

describe('ExportImportTab', () => {
  it('renders the import row with an accessible file input', () => {
    renderTab();
    expect(screen.getByTestId('settings-import-space')).toHaveTextContent(
      /import a space/i,
    );
    expect(
      screen.getByLabelText(/import a space/i, { selector: 'input' }),
    ).toHaveAttribute('type', 'file');
    expect(screen.getByTestId('settings-import-button')).toBeEnabled();
  });

  it('imports a valid archive as a new space and navigates to it', async () => {
    const file = await archiveFile();
    const user = userEvent.setup();
    renderTab();

    await user.upload(screen.getByTestId('settings-import-file-input'), file);

    await waitFor(async () => {
      expect(await db.spaces.count()).toBe(2);
    });
    expect(await screen.findByTestId('space-screen')).toBeInTheDocument();

    const spaces = await db.spaces.toArray();
    const imported = spaces.find((s) => s.id !== 's1');
    expect(imported?.name).toBe('Test Space');
    expect(await db.docs.where({ spaceId: imported!.id }).count()).toBe(1);
  });

  it('the choose-archive button opens the hidden file picker', async () => {
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderTab();

    await user.click(screen.getByTestId('settings-import-button'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('does nothing when the file dialog is dismissed without a file', async () => {
    renderTab();
    const input = screen.getByTestId('settings-import-file-input');
    fireEvent.change(input, { target: { files: [] } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-import-button')).toBeEnabled();
    expect(await db.spaces.count()).toBe(0);
  });

  it('surfaces a clear error for files that are not Writer archives', async () => {
    const user = userEvent.setup();
    renderTab();

    const junk = new File(['not a zip'], 'junk.zip', {
      type: 'application/zip',
    });
    await user.upload(screen.getByTestId('settings-import-file-input'), junk);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/import failed/i);
    expect(alert).toHaveTextContent(/not a readable \.zip/i);
    expect(await db.spaces.count()).toBe(0);
  });
});
