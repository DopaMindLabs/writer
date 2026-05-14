import { useTranslation } from 'react-i18next';

interface TabHeaderProps {
  titleKey: string;
  subtitleKey: string;
  breadcrumbKey?: string;
}

export function TabHeader({
  titleKey,
  subtitleKey,
  breadcrumbKey = 'settings.breadcrumb',
}: TabHeaderProps) {
  const { t } = useTranslation('screens');
  return (
    <>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        {t(breadcrumbKey)}
      </div>
      <h1 className="mb-2 font-serif text-[32px] font-normal leading-tight tracking-tight text-ink">
        {t(titleKey)}
      </h1>
      <p className="mb-6 max-w-[540px] font-serif text-[14px] italic text-ink-3">
        {t(subtitleKey)}
      </p>
    </>
  );
}
