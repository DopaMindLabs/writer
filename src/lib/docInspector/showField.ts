// Whether a Doc Inspector field should be shown for a document. A field shows
// when its feature is effectively enabled OR the document already has a value
// for it — so disabling a feature never hides a document that already carries a
// limit, deadline or non-draft status.

import type { Doc } from '@/db/schema';
import { assertNever } from '@/lib/invariant';
import type { InspectorFeature } from './features';
import { resolveStatus } from './status';

export const docHasValue = (feature: InspectorFeature, doc: Doc): boolean => {
  switch (feature) {
    case 'wordLimit':
      return (doc.meta.wordLimit ?? 0) > 0;
    case 'charLimit':
      return (doc.meta.charLimit ?? 0) > 0;
    case 'status':
      return resolveStatus(doc.meta.status) !== 'draft';
    case 'dueDate':
      return doc.meta.dueDate !== undefined;
    default:
      return assertNever(feature);
  }
};

export const showField = (
  feature: InspectorFeature,
  effectiveEnabled: boolean,
  doc: Doc,
): boolean => effectiveEnabled || docHasValue(feature, doc);
