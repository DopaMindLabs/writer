# Note types

Note types define the kinds of card available on the BrainSpace canvas, and how
each one presents itself.

Each type lives in its own `*.note-type.ts` file and exports one default
`NoteTypeDescriptor`. The registry in `index.ts` loads these files with
`import.meta.glob`, so adding a new `example.note-type.ts` file (plus its
`NoteKind` enum value) is enough to make it available to the card system.

## Descriptor metadata

```ts
const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Example,
  label: 'example',
  layout: NoteLayout.Text,
  version: '1.0.0',
  stage: TemplateStage.Beta, // optional maturity
  toolbarOrder: 120, // optional sort order
};
```

### Fields

- `kind`: The `NoteKind` enum value this descriptor configures (its stable id).
- `label`: Human-readable name shown on the card and the canvas toolbar.
- `layout`: Default presentation (`NoteLayout`). The layout — not the kind —
  owns the capabilities (`allowsText`, `allowsImages`, `imageFirst`) via
  `NOTE_LAYOUT_CONFIG` in `types.ts`, so a per-note layout override stays
  coherent.
- `version`: Semver-style version. Bump when the type's shape or behaviour
  changes; it is stamped onto new cards as `Note.typeVersion` to anchor any
  future per-card migration.
- `stage`: Optional maturity stage (reuses the template maturity ladder).
- `toolbarOrder`: Optional toolbar sort order; lower appears first.

## Layouts

Rendering dispatches on `NoteLayout` with an exhaustive `switch` closed by
`assertNever`, so adding a new layout forces every renderer to handle it. To add
a presentation mode:

1. Add the value to the `NoteLayout` enum in `src/db/schema.ts`.
2. Add its capabilities to `NOTE_LAYOUT_CONFIG` in `types.ts`.
3. Handle the new `case` wherever a layout is dispatched (the type checker will
   point these out).

## Adding a note type

1. Add the value to the `NoteKind` enum in `src/db/schema.ts`.
2. Create `src/data/note-types/my-kind.note-type.ts` exporting a default
   `NoteTypeDescriptor`.
3. Add the kind to the relevant template `noteKinds` lists so it appears on the
   toolbar.
4. Run `npx tsc --noEmit`.
