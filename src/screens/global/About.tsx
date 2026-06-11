import { useTranslation } from 'react-i18next';
import { Info, Smile, Lightbulb } from '@/components/libs/icons';
import { BlockQuote } from '@/components/ui/block-quote';
import { Link } from '@/components/ui/Link';
import {
  TypographyH1,
  TypographyLabel,
  TypographyLead,
  TypographyP,
} from '@/components/ui/typography';
import { PageNav } from '@/components/chrome/PageNav';
import { EXTERNAL_LINKS } from '@/lib/routes';
import { APP_VERSION_LABEL } from '@/lib/version';

export const AboutScreen = () => {
  const { t } = useTranslation(['screens', 'common']);
  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper text-ink">
      <PageNav />

      <div
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-2xl flex-col px-5 pt-10 pb-16 md:px-12 md:pt-16 md:pb-24"
      >
        <TypographyH1>{t('about.greeting')}</TypographyH1>
        <div className="mt-12 space-y-6">
          <TypographyP>{t('about.paragraph1')}</TypographyP>
          <TypographyP>
            {t('about.paragraph2Before')}
            <Smile className="inline-block h-4 w-4" />
            {t('about.paragraph2After')}
          </TypographyP>
          <TypographyP>{t('about.paragraph3')}</TypographyP>

          <TypographyP>
            {t('about.paragraph4Before')}
            <Link
              href={EXTERNAL_LINKS.license}
              className="underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
            >
              {t('about.licenseLinkText')}
            </Link>
          </TypographyP>
          <BlockQuote cite={<>&mdash; ARSI &ldquo;HAKITA&rdquo; PATALA</>}>
            <p>
              &lsquo;Culture shouldn&rsquo;t exist only for those who can afford
              it&rsquo;
            </p>
          </BlockQuote>
        </div>

        <AboutStatusSection />

        <section className="mt-8 border-t border-rule pt-8">
          <TypographyLabel className="tracking-[0.12em]">
            {t('about.sourceLabel')}
          </TypographyLabel>
          <TypographyLead className="mt-3">
            <Link
              href={EXTERNAL_LINKS.githubSource}
              className="underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
            >
              {t('github', { ns: 'common' })}
            </Link>
          </TypographyLead>
        </section>
      </div>
    </div>
  );
};

const AboutStatusSection = () => {
  const { t } = useTranslation(['screens', 'common']);
  return (
    <section className="mt-12 border-t border-rule pt-8">
      <TypographyLabel
        className="tracking-[0.12em] text-info"
      >
        {t('about.statusLabel')}
      </TypographyLabel>
      <div className="mt-3 flex gap-3 rounded-sm border-l-2 border-info bg-info-bg px-4 py-3">
        <Info className="mt-1 h-4 w-4 shrink-0 text-info" />
        <TypographyLead className="text-info">
          <strong className="font-semibold">
            {t('about.statusValueStrong', { version: APP_VERSION_LABEL })}
          </strong>
          {t('about.statusValueRest')}
        </TypographyLead>
      </div>
      <div className="mt-6 space-y-6">
        <TypographyP>
          {t('about.feedbackBefore')}
          <Lightbulb className="inline-block h-4 w-4" />
          {t('about.feedbackAfter')}
        </TypographyP>
      </div>
    </section>
  );
};
