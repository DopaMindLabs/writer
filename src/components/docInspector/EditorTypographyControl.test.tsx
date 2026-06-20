import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { EditorTypographyControl } from './EditorTypographyControl';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { useUI } from '@/store/ui';

const baseDoc: Doc = {
  id: 'doc-1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Test',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

beforeEach(async () => {
  localStorage.clear();
  await db.docs.clear();
  await db.docs.put(baseDoc);
  useUI.setState({ editorFont: 'serif', editorSize: 'base' });
});

describe('EditorTypographyControl', () => {
  it('renders both per-doc controls when not readOnly', () => {
    renderWithProviders(<EditorTypographyControl doc={baseDoc} />);
    expect(screen.getByTestId('inspector-typography')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-editor-font-serif')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-editor-size-base')).toBeInTheDocument();
  });

  it('renders nothing when readOnly', () => {
    renderWithProviders(<EditorTypographyControl doc={baseDoc} readOnly />);
    expect(screen.queryByTestId('inspector-typography')).toBeNull();
  });

  it('reflects the universal default when no per-doc override is set', () => {
    useUI.setState({ editorFont: 'sans', editorSize: 'lg' });
    renderWithProviders(<EditorTypographyControl doc={baseDoc} />);
    expect(
      screen.getByTestId('inspector-editor-font-sans').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByTestId('inspector-editor-size-lg').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('selecting a font writes the per-doc override to the database', async () => {
    renderWithProviders(<EditorTypographyControl doc={baseDoc} />);
    fireEvent.click(screen.getByTestId('inspector-editor-font-mono'));
    await waitFor(async () => {
      const fresh = await db.docs.get(baseDoc.id);
      expect(fresh?.editorFont).toBe('mono');
    });
  });

  it('selecting a size writes the per-doc override to the database', async () => {
    renderWithProviders(<EditorTypographyControl doc={baseDoc} />);
    fireEvent.click(screen.getByTestId('inspector-editor-size-xl'));
    await waitFor(async () => {
      const fresh = await db.docs.get(baseDoc.id);
      expect(fresh?.editorSize).toBe('xl');
    });
  });

  it('shows the "use default" action only when at least one override is set', () => {
    const { rerender } = renderWithProviders(
      <EditorTypographyControl doc={baseDoc} />,
    );
    expect(screen.queryByTestId('inspector-typography-reset')).toBeNull();
    rerender(
      <EditorTypographyControl doc={{ ...baseDoc, editorFont: 'sans' }} />,
    );
    expect(screen.getByTestId('inspector-typography-reset')).toBeInTheDocument();
  });

  it('clicking "use default" clears both overrides on the document', async () => {
    const overridden: Doc = {
      ...baseDoc,
      editorFont: 'sans',
      editorSize: 'lg',
    };
    await db.docs.put(overridden);
    renderWithProviders(<EditorTypographyControl doc={overridden} />);
    fireEvent.click(screen.getByTestId('inspector-typography-reset'));
    await waitFor(async () => {
      const fresh = await db.docs.get(overridden.id);
      expect(fresh?.editorFont).toBeUndefined();
      expect(fresh?.editorSize).toBeUndefined();
    });
  });
});
