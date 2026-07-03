import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { Profile } from '@/lib/account/profile';
import { collabStore } from '@/lib/collab/collabStore';
import { makeProviderFactory } from '@/lib/collab/yjs/providerFactory';
import { LexicalEditor } from './LexicalEditor';

const PROFILE: Profile = {
  authorId: 'a1',
  displayName: 'Ada',
  presenceHue: 'presence-1',
};

describe('LexicalEditor collaborative mount', () => {
  it('mounts the collaborative editor and renders the document body', async () => {
    const providerFactory = makeProviderFactory(collabStore, PROFILE, 'tab-1');
    const ref = createRef<HTMLDivElement>();

    renderWithProviders(
      <div ref={ref}>
        <LexicalEditor
          docId="doc-1"
          providerFactory={providerFactory}
          username={PROFILE.displayName}
          cursorColor={`var(--${PROFILE.presenceHue})`}
          cursorsContainerRef={ref}
          onChange={() => undefined}
          mode="write"
        />
      </div>,
    );

    expect(await screen.findByTestId('document-body')).toBeInTheDocument();
  });
});
