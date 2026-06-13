export type MediaSelection =
  | { kind: 'library'; mediaItemId: string }
  | { kind: 'url'; url: string };
