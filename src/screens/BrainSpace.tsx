import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { BrainSpaceCanvas } from '@/components/surfaces/BrainSpaceCanvas';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { useSpace } from '@/hooks/useSpaces';
import { useDocuments } from '@/hooks/useDocuments';
import { useNotes } from '@/hooks/useNotes';
import { useUI } from '@/store/ui';
import { useAutoTour } from '@/tours';
import { TypographyP } from '@/components/ui/typography';

export function BrainSpaceScreen() {
  const { t } = useTranslation('screens');
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const notes = useNotes(spaceId);
  const docs = useDocuments(spaceId);
  const lastDocId = useUI((s) => s.currentDocId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);

  useAutoTour('brainspace', { ready: !!spaceId && !focus });

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  const fallbackDocId = useMemo(() => {
    if (lastDocId && docs.some((d) => d.id === lastDocId)) return lastDocId;
    return docs[0]?.id ?? null;
  }, [docs, lastDocId]);

  if (!spaceId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        {focus ? (
          <FocusRail activeSpaceId={spaceId} />
        ) : (
          <>
            <SpaceRail activeSpaceId={spaceId} />
            <Sidebar spaceId={spaceId} activeDocId={null} />
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={null}
          docName={t('dump.headerCount', { count: notes.length })}
          spaceName={space?.name}
          mode="dump"
          fallbackDocId={fallbackDocId}
        />
        <BrainSpaceMobileNotice spaceId={spaceId} />
        <main className="hidden flex-1 overflow-hidden md:flex">
          <BrainSpaceCanvas spaceId={spaceId} />
          <CitationsSidePanel spaceId={spaceId} />
        </main>
        {!focus && (
          <>
            <MobileTabs spaceId={spaceId} />
            <MobileMoreSheet spaceId={spaceId} />
          </>
        )}
      </div>
    </div>
  );
}

function BrainSpaceMobileNotice({ spaceId }: { spaceId: string }) {
  const { t } = useTranslation('screens');
  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-6 py-10 md:hidden">
      <div className="max-w-sm text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {t('dump.title')}
        </div>
        <TypographyP variant="tagline" className="mt-3">
          {t('dump.mobileWarning')}
        </TypographyP>
        <TypographyP variant="description" className="mt-2">
          {t('dump.mobileNote')}
        </TypographyP>
        <Link
          to={`/s/${spaceId}`}
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-wider text-ink underline underline-offset-4 hover:text-ink-2"
        >
          {t('dump.openInWrite')}
        </Link>
      </div>
    </div>
  );
}
