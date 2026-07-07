import { useUI, DEFAULT_PDF_READER_PREF } from '@/store/ui';
import { IconButton } from '@/components/ui/icon';
import type { LucideIcon } from '@/components/libs/icons';

interface PdfReaderToggleProps {
  mediaId: string;
  icon: LucideIcon;
  label: string;
  testId: string;
  /** Which per-document boolean this toggles. */
  field: 'thumbs' | 'railHidden';
  /** `railHidden` reads inverted: pressed means the rail is shown. */
  invert?: boolean;
}

/**
 * A topbar toggle bound to one per-document reader preference. Self-contained —
 * it reads and writes the store for its media id — so the screen just drops it in
 * the Topbar's leading/trailing slot.
 */
export const PdfReaderToggle = ({
  mediaId,
  icon,
  label,
  testId,
  field,
  invert = false,
}: PdfReaderToggleProps) => {
  const value = useUI(
    (s) => (s.pdfReaderPrefs[mediaId] ?? DEFAULT_PDF_READER_PREF)[field],
  );
  const setPdfReaderPref = useUI((s) => s.setPdfReaderPref);

  return (
    <IconButton
      icon={icon}
      label={label}
      data-testid={testId}
      active={invert ? !value : value}
      onClick={() => {
        setPdfReaderPref(
          mediaId,
          field === 'thumbs' ? { thumbs: !value } : { railHidden: !value },
        );
      }}
      className="hidden md:inline-flex"
    />
  );
};
