import { describe, expect, it, vi } from 'vitest';
import { asPrincipalId } from 'writer-sync/core';
import {
  currentPrincipal,
  newEntityMetadata,
  touchedMetadataFields,
} from './writerEntityMetadata';
import { compareTimestamps } from 'writer-sync/core';

vi.mock('@/lib/account/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'author-1',
    displayName: 'A. Writer',
    presenceHue: 'presence-1',
  }),
}));

describe('currentPrincipal', () => {
  it('is the local profile’s stable author id — never a name or email', async () => {
    await expect(currentPrincipal()).resolves.toBe('author-1');
  });
});

describe('newEntityMetadata', () => {
  it('stamps scope, attribution and a fresh mutation id', () => {
    const meta = newEntityMetadata('space-1', asPrincipalId('author-1'));

    expect(meta.accessScopeId).toBe('space-1');
    expect(meta.createdBy).toBe('author-1');
    expect(meta.updatedBy).toBe('author-1');
    expect(meta.mutationId).toBeTruthy();
  });

  it('mints a distinct mutation id and a later logical time per call', () => {
    const first = newEntityMetadata('space-1', asPrincipalId('author-1'));
    const second = newEntityMetadata('space-1', asPrincipalId('author-1'));

    expect(second.mutationId).not.toBe(first.mutationId);
    expect(
      compareTimestamps(second.logicalUpdatedAt, first.logicalUpdatedAt),
    ).toBeGreaterThan(0);
  });
});

describe('touchedMetadataFields', () => {
  it('refreshes only the editor, mutation id and logical time', () => {
    const touched = touchedMetadataFields(asPrincipalId('editor-1'));

    expect(Object.keys(touched).sort()).toEqual([
      'logicalUpdatedAt',
      'mutationId',
      'updatedBy',
    ]);
    expect(touched.updatedBy).toBe('editor-1');
  });
});
