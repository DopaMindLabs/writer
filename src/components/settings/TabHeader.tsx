import { useTranslation } from 'react-i18next';
import {
  TypographyH1,
  TypographyLabel,
  TypographyP,
} from '@/components/ui/typography';

interface TabHeaderProps {
  titleKey: string;
  subtitleKey: string;
  breadcrumbKey?: string;
}

export const TabHeader = ({
  titleKey,
  subtitleKey,
  breadcrumbKey = 'settings.breadcrumb',
}: TabHeaderProps) => {
  const { t } = useTranslation('screens');
  return (
    <>
      <TypographyLabel className="mb-1 tracking-[0.1em]">
        {t(breadcrumbKey)}
      </TypographyLabel>
      <TypographyH1 variant="section" className="mb-2">
        {t(titleKey)}
      </TypographyH1>
      <TypographyP variant="caption" className="mb-6 max-w-[540px] text-[14px]">
        {t(subtitleKey)}
      </TypographyP>
    </>
  );
};
