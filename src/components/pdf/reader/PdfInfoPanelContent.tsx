import { useTranslation } from 'react-i18next';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { TypographyP } from '@/components/ui/typography';
import { formatBytes } from '@/components/settings/sync/syncFormat';
import { cn } from '@/lib/utils';

interface PdfInfoPanelContentProps {
  name: string;
  pageCount: number;
  size: number;
  createdAt: number;
  annotationCount: number;
}

const formatAdded = (createdAt: number): string =>
  new Date(createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * The reader's Document-info panel body: quiet key/value rows for the file, then
 * a hairline and the highlight count. Presentational — every value is a prop, so
 * the panel shell owns no data fetching.
 */
export const PdfInfoPanelContent = ({
  name,
  pageCount,
  size,
  createdAt,
  annotationCount,
}: PdfInfoPanelContentProps) => {
  const { t } = useTranslation('screens');

  const rows = [
    { label: t('pdfReader.rows.name'), value: name, truncate: true },
    { label: t('pdfReader.rows.pages'), value: String(pageCount) },
    { label: t('pdfReader.rows.size'), value: formatBytes(size) },
    { label: t('pdfReader.rows.added'), value: formatAdded(createdAt) },
  ];

  return (
    <div data-testid="pdf-info-panel">
      {rows.map((row) => (
        <div key={row.label} className="flex h-8 items-center gap-3 px-5">
          <Eyebrow size={9} className="w-[88px] shrink-0">
            {row.label}
          </Eyebrow>
          <TypographyP
            variant="caption"
            title={row.truncate ? row.value : undefined}
            className={cn('min-w-0 not-italic text-ink-2', row.truncate && 'truncate')}
          >
            {row.value}
          </TypographyP>
        </div>
      ))}
      <div className="mx-5 my-2 h-px bg-rule" />
      <div className="flex h-8 items-center gap-3 px-5">
        <Eyebrow size={9} className="w-[88px] shrink-0">
          {t('pdfReader.rows.highlights')}
        </Eyebrow>
        <TypographyP
          variant="caption"
          data-testid="pdf-info-highlights"
          className="not-italic text-ink-2"
        >
          {String(annotationCount)}
        </TypographyP>
      </div>
    </div>
  );
};
