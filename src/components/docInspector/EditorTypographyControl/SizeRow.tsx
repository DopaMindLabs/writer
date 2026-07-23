import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/Chip';
import type { Doc } from '@/db/schema';
import { EDITOR_SIZES, type EditorSize } from '@/lib/editorTypography';

interface SizeRowProps {
  doc: Doc;
  globalSize: EditorSize;
  onSelect: (size: EditorSize) => void;
}

export const SizeRow = ({ doc, globalSize, onSelect }: SizeRowProps) => {
  const { t } = useTranslation('chrome');
  const active = doc.editorSize ?? globalSize;
  return (
    <div className="border-b border-rule/60 py-2">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('inspector.typography.sizeLabel')}
      </div>
      <div
        role="group"
        aria-label={t('inspector.typography.sizeLabel')}
        className="flex flex-wrap gap-1.5"
      >
        {EDITOR_SIZES.map((size) => (
          <Chip
            key={size}
            active={size === active}
            onClick={() => { onSelect(size); }}
            data-testid={`inspector-editor-size-${size}`}
          >
            {t(`inspector.typography.sizeOptions.${size}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
};
