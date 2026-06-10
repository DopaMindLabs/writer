export {
  createRevision,
  MAX_AUTO_REVISIONS_PER_DOC,
  AUTO_REVISION_MIN_INTERVAL_MS,
  type CreateRevisionOpts,
} from './createRevision';
export {
  captureAutoRevision,
  captureBaselineRevision,
  resetAutoThrottle,
} from './captureAutoRevision';
export { restoreRevision, type RestoreRevisionOpts } from './restoreRevision';
export {
  computeInlineDiff,
  computeSideBySideDiff,
  type DiffSegment,
  type SegmentOp,
  type SideBySideRow,
  type RowKind,
} from './diff';
export {
  lexicalJsonToPlainText,
  isParseableBody,
  countWords,
  countCharacters,
} from './lexicalJsonToPlainText';
