import { describe, expect, it } from 'vitest';
import { asOperationId, asPrincipalId } from '@/lib/syncProviders/ids';
import type { HybridLogicalTimestamp } from './hybridLogicalClock';
import { createEntityMetadata, updateEntityMetadata } from './entityMetadata';

const at = (millis: number, counter = 0): HybridLogicalTimestamp => ({ millis, counter });

describe('createEntityMetadata', () => {
  it('records the principal as both author and last editor', () => {
    const meta = createEntityMetadata({
      accessScopeId: 'space-1',
      principal: asPrincipalId('person-1'),
      mutationId: asOperationId('op-1'),
      at: at(1000),
    });

    expect(meta).toEqual({
      accessScopeId: 'space-1',
      createdBy: 'person-1',
      updatedBy: 'person-1',
      mutationId: 'op-1',
      logicalUpdatedAt: at(1000),
    });
  });
});

describe('updateEntityMetadata', () => {
  const original = createEntityMetadata({
    accessScopeId: 'space-1',
    principal: asPrincipalId('author'),
    mutationId: asOperationId('op-1'),
    at: at(1000),
  });

  it('preserves the original author and scope', () => {
    const next = updateEntityMetadata(original, {
      principal: asPrincipalId('editor'),
      mutationId: asOperationId('op-2'),
      at: at(2000),
    });

    expect(next.createdBy).toBe('author');
    expect(next.accessScopeId).toBe('space-1');
  });

  it('advances the editor, mutation id and logical time', () => {
    const next = updateEntityMetadata(original, {
      principal: asPrincipalId('editor'),
      mutationId: asOperationId('op-2'),
      at: at(2000),
    });

    expect(next.updatedBy).toBe('editor');
    expect(next.mutationId).toBe('op-2');
    expect(next.logicalUpdatedAt).toEqual(at(2000));
  });

  it('does not mutate the previous metadata', () => {
    updateEntityMetadata(original, {
      principal: asPrincipalId('editor'),
      mutationId: asOperationId('op-2'),
      at: at(2000),
    });

    expect(original.updatedBy).toBe('author');
    expect(original.mutationId).toBe('op-1');
  });
});
