import { useTranslation } from 'react-i18next';
import { AlertTriangle, Smile, Lightbulb } from 'lucide-react';
import { BlockQuote } from '@/components/ui/block-quote';
import { PageNav } from '@/components/chrome/PageNav';

export function AboutScreen() {
  const { t } = useTranslation(['screens', 'common']);
  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper text-ink">
      <PageNav />

      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pt-10 pb-16 md:px-12 md:pt-16 md:pb-24">
        <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-ink md:text-6xl">
          {t('about.greeting')}
        </h1>
        <div className="mt-12 space-y-6 font-serif text-base leading-relaxed text-ink-2 md:text-[18px]">
          <p>{t('about.paragraph1')}</p>
          <p>
            {t('about.paragraph2Before')}
            <Smile className="inline-block h-4 w-4" />
            {t('about.paragraph2After')}
          </p>
          <p>{t('about.paragraph3')}</p>

          <p>
            {t('about.paragraph4Before')}
            <a
              href="https://github.com/DopaMindLabs/Writer?tab=License-1-ov-file"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
            >
              {t('about.licenseLinkText')}
            </a>
          </p>
          <BlockQuote cite={<>&mdash; ARSI &ldquo;HAKITA&rdquo; PATALA</>}>
                    <p>
                      &lsquo;Culture shouldn&rsquo;t exist only for those who can afford
                      it&rsquo;
                    </p>
                  </BlockQuote>

        </div>

        <section className="mt-12 border-t border-rule pt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--warning)]">
            {t('about.statusLabel')}
          </div>
          <div className="mt-3 flex gap-3 rounded-sm border-l-2 border-[color:var(--warning)] bg-[color:var(--warning-bg)] px-4 py-3">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
            <p className="font-serif text-[17px] leading-relaxed text-[color:var(--warning)]">
              <strong className="font-semibold">{t('about.statusValueStrong')}</strong>
              {t('about.statusValueRest')}
            </p>

          </div>
          <div className="mt-6 space-y-6 font-serif text-base leading-relaxed text-ink-2 md:text-[18px]">
            <p>
              {t('about.feedbackBefore')}
              <Lightbulb className="inline-block h-4 w-4" />
              {t('about.feedbackAfter')}
            </p>
          </div>
        </section>

        <section className="mt-8 border-t border-rule pt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {t('about.sourceLabel')}
          </div>
          <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-2">
            {/* TODO: replace with GitHub URL */}
            <a
              href="https://github.com/DopaMindLabs/writer/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
            >
              {t('github', { ns: 'common' })}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
