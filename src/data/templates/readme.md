# Templates

Templates define the starting structure for a new space on `/new`.

Each template lives in its own `*-template.ts` file and exports one default
`Template` object. The registry in `index.ts` loads these files with
`import.meta.glob`, so adding a new `example-template.ts` file is enough to make
it available to the template system.

## Template Metadata

Every template should include:

```ts
const template: Template = {
  id: 'example',
  label: 'Example',
  tag: 'EX',
  version: '0.1.0',
  beta: true,
  enabled: true,
  description: 'short picker description',
  pickerOrder: 1,
  sections: [],
  seedDocs: [],
};
```

### Fields

- `id`: Stable unique identifier. Do not rename this after release unless you
  also handle any migration paths that depend on it.
- `label`: Human-readable name shown in the template picker.
- `tag`: Default two- or three-letter space tag.
- `version`: Template version. Use semver-style strings such as `0.1.0`.
- `beta`: Optional beta flag. Use `true` while a template is still experimental.
- `enabled`: Controls picker visibility. Disabled templates remain loadable by
  id via `getTemplate()`, but are hidden from `listTemplates()`.
- `description`: Short supporting text shown below the label in the picker.
- `pickerOrder`: Sort order in the picker. Lower numbers appear first.
- `sections`: Initial section tree for the space.
- `seedDocs`: Initial documents placed into sections.
- `seedNotes`: Optional canvas notes seeded into the space.

## Sections

Sections define the sidebar structure. A section can also contain nested
subsections:

```ts
sections: [
  {
    label: 'Methods',
    order: 1,
    sections: [
      { label: 'Pipeline', order: 0, defaultDocName: 'Step' },
      { label: 'Stats', order: 1, defaultDocName: 'Analysis' },
    ],
  },
];
```

`defaultDocName` controls the default title when creating new documents in that
section. Supported placeholders:

- `{{date}}`: ISO date, for example `2026-05-12`
- `{{datetime}}`: ISO date plus time
- `{{day}}`: Weekday name

If omitted, new documents default to `Untitled`.

## Seed Docs

Seed docs must reference an existing section label. To place a document inside a
subsection, include both labels:

```ts
seedDocs: [
  { sectionLabel: 'Methods', subsectionLabel: 'Pipeline', name: 'Quality control' },
];
```

Keep seed docs lightweight. They should give the space a useful starting shape
without making the template feel pre-written.

## Adding A Template

1. Create `src/data/templates/my-template.ts`.
2. Export a default `Template` object.
3. Set `enabled: true` when it should appear on `/new`.
4. Pick a unique `pickerOrder`.
5. Run `npx tsc --noEmit`.

Use `enabled: false` for drafts that should stay out of the picker while still
being kept in source control.
