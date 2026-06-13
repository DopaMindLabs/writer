import { vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import { MediaUploadButton } from './MediaUploadButton';

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn((args: { data: ArrayBuffer }) => {
    const head = new Uint8Array(args.data.slice(0, 4));
    const isPdf = head[0] === 0x25 && head[1] === 0x50;
    return {
      promise: isPdf
        ? Promise.resolve({ numPages: 4, destroy: () => Promise.resolve() })
        : Promise.reject(new Error('bad')),
    };
  }),
}));

const pickFile = (file: File) => {
  const input = document.querySelector<HTMLInputElement>(
    'input[data-testid="media-upload-input"]',
  );
  if (!input) throw new Error('file input not found');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

describe('MediaUploadButton', () => {
  it('validates and stores a picked PDF, reporting the new id', async () => {
    const onUploaded = vi.fn();
    renderWithProviders(<MediaUploadButton spaceId="s1" onUploaded={onUploaded} />);

    pickFile(new File([PDF_HEADER], 'paper.pdf', { type: 'application/pdf' }));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
    const stored = await db.media.where('spaceId').equals('s1').toArray();
    expect(stored.map((m) => m.name)).toEqual(['paper.pdf']);
  });

  it('shows an error and stores nothing for a non-PDF file', async () => {
    renderWithProviders(<MediaUploadButton spaceId="s1" />);

    pickFile(new File(['hi'], 'note.txt', { type: 'text/plain' }));

    await waitFor(() => {
      expect(screen.getByTestId('media-upload-error')).toBeInTheDocument();
    });
    expect(await db.media.count()).toBe(0);
  });
});
