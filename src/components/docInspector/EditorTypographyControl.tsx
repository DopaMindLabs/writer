import { useTranslation } from 'react-i18next';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import {
  EDITOR_FONTS,
  EDITOR_SIZES,
  editorFontStack,
  type EditorFont,
  type EditorSize,
} from '@/lib/editorTypography';
import { useUI } from '@/store/ui';

const setOverride = (
  docId: string,
  patch: Partial<Pick<Doc, 'editorFont' | 'editorSize'>>,
): void => {
  void db.docs.update(docId, { ...patch, updatedAt: Date.now() });
};

const clearOverrides = (docId: string): void => {
  void db.docs.update(docId, {
    editorFont: undefined,
    editorSize: undefined,
    updatedAt: Date.now(),
  });
};

interface InspectorTypographyProps {
  doc: Doc;
  readOnly?: boolean;
}

const FontRow = ({
  doc,
  globalFont,
}: {
  doc: Doc;
  globalFont: EditorFont;
}) => {
  const { t } = useTranslation('chrome');
  const active = doc.editorFont ?? globalFont;
  return (
    <div className="border-b border-rule/60 py-2">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('inspector.typography.fontLabel')}
      </div>
      <div role="group" aria-label={t('inspector.typography.fontLabel')} className="flex flex-wrap gap-1.5">
        {EDITOR_FONTS.map((font) => (
          <Chip
            key={font}
            active={font === active}
            onClick={() => { setOverride(doc.id, { editorFont: font }); }}
            data-testid={`inspector-editor-font-${font}`}
            style={{ fontFamily: editorFontStack(font) }}
          >
            {t(`inspector.typography.fontOptions.${font}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
};

const SizeRow = ({
  doc,
  globalSize,
}: {
  doc: Doc;
  globalSize: EditorSize;
}) => {
  const { t } = useTranslation('chrome');
  const active = doc.editorSize ?? globalSize;
  return (
    <div className="border-b border-rule/60 py-2">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('inspector.typography.sizeLabel')}
      </div>
      <div role="group" aria-label={t('inspector.typography.sizeLabel')} className="flex flex-wrap gap-1.5">
        {EDITOR_SIZES.map((size) => (
          <Chip
            key={size}
            active={size === active}
            onClick={() => { setOverride(doc.id, { editorSize: size }); }}
            data-testid={`inspector-editor-size-${size}`}
          >
            {t(`inspector.typography.sizeOptions.${size}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export const EditorTypographyControl = ({
  doc,
  readOnly = false,
}: InspectorTypographyProps) => {
  const { t } = useTranslation('chrome');
  const globalFont = useUI((s) => s.editorFont);
  const globalSize = useUI((s) => s.editorSize);
  const hasOverride =
    doc.editorFont !== undefined || doc.editorSize !== undefined;

  if (readOnly) return null;

  return (
    <div data-testid="inspector-typography" className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-4">
          {t('inspector.typography.title')}
        </span>
        {hasOverride && (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => { clearOverrides(doc.id); }}
            data-testid="inspector-typography-reset"
          >
            {t('inspector.typography.useDefault')}
          </Button>
        )}
      </div>
      <FontRow doc={doc} globalFont={globalFont} />
      <SizeRow doc={doc} globalSize={globalSize} />
    </div>
  );
};
