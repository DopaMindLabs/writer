import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFileDrop } from './useFileDrop';

const Harness = ({ onFiles }: { onFiles: (files: File[]) => void }) => {
  const drop = useFileDrop(onFiles);
  return (
    <div data-testid="zone" {...drop.handlers}>
      {drop.dragging ? 'dragging' : 'idle'}
    </div>
  );
};

const fileDrag = (files: File[] = []) => ({
  dataTransfer: { types: ['Files'], files },
});

describe('useFileDrop', () => {
  it('flags dragging on enter and clears it on the matching leave', () => {
    render(<Harness onFiles={vi.fn()} />);
    const zone = screen.getByTestId('zone');
    expect(zone).toHaveTextContent('idle');
    fireEvent.dragEnter(zone, fileDrag());
    expect(zone).toHaveTextContent('dragging');
    fireEvent.dragLeave(zone, fileDrag());
    expect(zone).toHaveTextContent('idle');
  });

  it('rides out flicker across nested enters and leaves', () => {
    render(<Harness onFiles={vi.fn()} />);
    const zone = screen.getByTestId('zone');
    fireEvent.dragEnter(zone, fileDrag());
    fireEvent.dragEnter(zone, fileDrag());
    fireEvent.dragLeave(zone, fileDrag());
    // One leave of two enters — still dragging.
    expect(zone).toHaveTextContent('dragging');
  });

  it('hands dropped files to the callback and resets', () => {
    const onFiles = vi.fn();
    render(<Harness onFiles={onFiles} />);
    const zone = screen.getByTestId('zone');
    const file = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
    fireEvent.dragEnter(zone, fileDrag([file]));
    fireEvent.drop(zone, fileDrag([file]));
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(zone).toHaveTextContent('idle');
  });

  it('ignores a drag that carries no files (the app row-drag payload)', () => {
    const onFiles = vi.fn();
    render(<Harness onFiles={onFiles} />);
    const zone = screen.getByTestId('zone');
    fireEvent.dragEnter(zone, {
      dataTransfer: { types: ['application/x-lipsum-media-id'], files: [] },
    });
    expect(zone).toHaveTextContent('idle');
    fireEvent.drop(zone, {
      dataTransfer: { types: ['application/x-lipsum-media-id'], files: [] },
    });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
