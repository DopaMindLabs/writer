import { useTranslation } from 'react-i18next';

export const SectionEmpty = ({
  sectionId,
  indented = false,
}: {
  sectionId: string;
  indented?: boolean;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <div
      data-testid={`sidebar-section-${sectionId}-empty`}
      className={
        indented
          ? 'px-5 pl-7 py-1 text-[11px] italic text-ink-4'
          : 'px-5 py-1.5 text-xs italic text-ink-4'
      }
    >
      {t('chrome:sidebar.empty')}
    </div>
  );
};
