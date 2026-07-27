import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QrScanner } from 'writer-qr/scan';
import { QrScanInput } from './QrScanInput';

const scannerReturning = (values: string[]): QrScanner => ({
  capability: () => Promise.resolve('native'),
  scanImage: () => Promise.resolve(values),
});

const failingScanner = (): QrScanner => ({
  capability: () => Promise.resolve('polyfill'),
  scanImage: () => Promise.reject(new Error('decode failed')),
});

const labels = {
  fileLabel: 'Upload a photo of the code',
  pasteLabel: 'Or paste the code',
  submitLabel: 'Use this code',
  unreadableLabel: 'No code found in that image.',
};

const imageFile = () =>
  new File([new Uint8Array([1, 2, 3])], 'code.png', { type: 'image/png' });

describe('file fallback', () => {
  it('reports the payload decoded from an uploaded image', async () => {
    const onScan = vi.fn();
    render(
      <QrScanInput {...labels} scanner={scannerReturning(['PAYLOAD-1'])} onScan={onScan} />,
    );
    await userEvent.upload(screen.getByLabelText(labels.fileLabel), imageFile());
    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('PAYLOAD-1');
    });
  });

  it('reports the first code when an image happens to contain several', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning(['A', 'B'])} onScan={onScan} />);
    await userEvent.upload(screen.getByLabelText(labels.fileLabel), imageFile());
    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('A');
    });
  });

  it('says so when the image holds no code, rather than failing silently', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={onScan} />);
    await userEvent.upload(screen.getByLabelText(labels.fileLabel), imageFile());
    expect(await screen.findByRole('status')).toHaveTextContent(labels.unreadableLabel);
    expect(onScan).not.toHaveBeenCalled();
  });

  it('surfaces a decoder failure the same way', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={failingScanner()} onScan={onScan} />);
    await userEvent.upload(screen.getByLabelText(labels.fileLabel), imageFile());
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(onScan).not.toHaveBeenCalled();
  });
});

describe('paste fallback', () => {
  it('accepts a payload typed or pasted by hand', async () => {
    // The last link in the accessibility chain: no camera, no image, no photo.
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={onScan} />);
    await userEvent.type(screen.getByLabelText(labels.pasteLabel), 'PASTED-PAYLOAD');
    await userEvent.click(screen.getByRole('button', { name: labels.submitLabel }));
    expect(onScan).toHaveBeenCalledWith('PASTED-PAYLOAD');
  });

  it('trims surrounding whitespace a copy tends to bring along', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={onScan} />);
    await userEvent.type(screen.getByLabelText(labels.pasteLabel), '  PADDED  ');
    await userEvent.click(screen.getByRole('button', { name: labels.submitLabel }));
    expect(onScan).toHaveBeenCalledWith('PADDED');
  });

  it('does not submit an empty value', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={onScan} />);
    await userEvent.click(screen.getByRole('button', { name: labels.submitLabel }));
    expect(onScan).not.toHaveBeenCalled();
  });

  it('submits on Enter as well as the button', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={onScan} />);
    await userEvent.type(screen.getByLabelText(labels.pasteLabel), 'TYPED{Enter}');
    expect(onScan).toHaveBeenCalledWith('TYPED');
  });
});

describe('accessibility', () => {
  it('labels both inputs so neither depends on a placeholder', async () => {
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={vi.fn()} />);
    expect(screen.getByLabelText(labels.fileLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.pasteLabel)).toBeInTheDocument();
  });

  it('is fully operable from the keyboard', async () => {
    const onScan = vi.fn();
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={onScan} />);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByLabelText(labels.pasteLabel)).toHaveFocus();
    await userEvent.keyboard('KEYBOARD{Enter}');
    expect(onScan).toHaveBeenCalledWith('KEYBOARD');
  });

  it('announces the outcome politely rather than stealing focus', async () => {
    render(<QrScanInput {...labels} scanner={scannerReturning([])} onScan={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText(labels.fileLabel), imageFile());
    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
