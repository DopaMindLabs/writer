import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '@/db/db';
import { BlockQuote } from '@/components/ui/block-quote';
import { Link } from '@/components/ui/Link';
import { TypographyH1, TypographyP } from '@/components/ui/typography';
import { PageNav } from '@/components/chrome/PageNav';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { routes } from '@/lib/routes';
import { useAutoTour } from '@/tours';

export const HomeScreen = () => {
  const { t } = useTranslation(['screens', 'common']);
  const [firstSpaceId, setFirstSpaceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useAutoTour('welcome', { ready: loaded });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const w = await db.spaces.orderBy('updatedAt').reverse().first();
      if (cancelled) return;
      if (w) setFirstSpaceId(w.id);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = loaded && !firstSpaceId;

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper text-ink">
      <PageNav showBack={false} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10 md:px-12 md:py-16">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {t('home.subtitle')}
        </div>
        <TypographyH1>
          {t('home.titleMain')}{' '}
          <span className="italic font-light text-ink-2">{t('home.titleAccent')}</span>
        </TypographyH1>
        <TypographyP variant="tagline" className="mt-4">
          {isEmpty ? t('home.emptyTagline') : t('home.tagline')}
        </TypographyP>

        <BlockQuote cite={<>&mdash; ARSI &ldquo;HAKITA&rdquo; PATALA</>}>
          <p>
            &lsquo;Culture shouldn&rsquo;t exist only for those who can afford
            it&rsquo;
          </p>
        </BlockQuote>

        {loaded && (
          <div className="mt-12 border-y border-rule">
            {firstSpaceId && (
              <Link
                to={routes.spaceWrite(firstSpaceId)}
                data-tour="tour-continue-writing"
                className="flex items-baseline justify-between border-b border-rule px-2 py-5 transition-colors hover:bg-paper-2"
              >
                <span className="font-serif text-[18px] text-ink md:text-[22px]">
                  {t('home.continueWriting')}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  →
                </span>
              </Link>
            )}
            <Link
              to={routes.templates()}
              data-tour="tour-start-space"
              className="flex items-baseline justify-between px-2 py-5 transition-colors hover:bg-paper-2"
            >
              <span
                className={
                  isEmpty
                    ? 'font-serif text-[20px] italic text-ink md:text-[26px]'
                    : 'font-serif text-[18px] italic text-ink md:text-[22px]'
                }
              >
                {t('home.startNewSpace')}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                →
              </span>
            </Link>
          </div>
        )}

        <div className="mt-10 flex items-center justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="cursor-help rounded-sm border border-[color:var(--warning)] bg-[color:var(--warning-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--warning)]"
              >
                {t('home.statusLine')}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <div className="font-medium">{t('home.warningTitle')}</div>
              <div className="mt-0.5 text-[11px] opacity-80">
                {t('home.warningBody')}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
