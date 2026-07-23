import { useTranslation } from 'react-i18next';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { Button } from '@/components/ui/Button';
import type { EditorFont, EditorSize } from '@/lib/editorTypography';
import { useUI } from '@/store/ui';
import { FontRow } from './EditorTypographyControl/FontRow';
import { SizeRow } from './EditorTypographyControl/SizeRow';

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

interface EditorTypographyControlProps {
  doc: Doc;
  readOnly?: boolean;
}

export const EditorTypographyControl = ({
  doc,
  readOnly = false,
}: EditorTypographyControlProps) => {
  const { t } = useTranslation('chrome');
  const globalFont = useUI((s) => s.editorFont);
  const globalSize = useUI((s) => s.editorSize);
  const hasOverride =
    doc.editorFont !== undefined || doc.editorSize !== undefined;

  if (readOnly) return null;

  const handleFont = (font: EditorFont): void => {
    setOverride(doc.id, { editorFont: font });
  };
  const handleSize = (size: EditorSize): void => {
    setOverride(doc.id, { editorSize: size });
  };

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
      <FontRow doc={doc} globalFont={globalFont} onSelect={handleFont} />
      <SizeRow doc={doc} globalSize={globalSize} onSelect={handleSize} />
    </div>
  );
};
