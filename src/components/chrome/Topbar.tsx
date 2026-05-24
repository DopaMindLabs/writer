import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Quote, Menu, Search, MoreHorizontal } from '@/components/libs/icons';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconButton } from '@/components/ui/icon';
import { Link } from '@/components/ui/Link';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { routes } from '@/lib/routes';
import { ModeTabs, FocusToggle, type Mode } from './ModeToggle';
import { MobileNavDrawer } from './MobileNavDrawer';
import { cn } from '@/lib/utils';

interface TopbarProps {
  spaceId: string;
  docId: string | null;
  docName?: string;
  spaceName?: string;
  mode: Mode;
  fallbackDocId?: string | null;
}

export const Topbar = ({
  spaceId,
  docId,
  docName,
  spaceName,
  mode,
  fallbackDocId,
}: TopbarProps) => {
  const { t } = useTranslation('chrome');
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const openCitationsDrawer = useUI((s) => s.openCitationsDrawer);
  const inspectorMode = useUI((s) => s.inspectorMode);
  const toggleInspector = useUI((s) => s.toggleInspector);
  const setInspectorMode = useUI((s) => s.setInspectorMode);
  const onCitations = location.pathname.endsWith('/citations');
  const inspectorOpen = inspectorMode !== 'none';

  const [editingDoc, setEditingDoc] = useState(false);
  const [draftDocName, setDraftDocName] = useState(docName ?? '');

  useEffect(() => {
    if (!editingDoc) setDraftDocName(docName ?? '');
  }, [docName, editingDoc]);

  useEffect(() => {
    if (focus && inspectorMode !== 'none') setInspectorMode('none');
  }, [focus, inspectorMode, setInspectorMode]);

  const commitDocName = async () => {
    setEditingDoc(false);
    if (!docId) return;
    const next = draftDocName.trim();
    if (!next || next === docName) return;
    await db.docs.update(docId, { name: next, updatedAt: Date.now() });
  };

  const onDocKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraftDocName(docName ?? '');
      setEditingDoc(false);
    }
  };

  const citeContent = focus ? (
    <Quote className="h-3.5 w-3.5" />
  ) : (
    <span>{t('topbar.cite')}</span>
  );
  const citeBaseClass = focus
    ? 'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors'
    : 'inline-flex items-center rounded-md px-2 py-1 font-sans text-[12px] lowercase transition-colors';
  const citeRestClass = onCitations
    ? 'text-ink hover:bg-paper-2'
    : 'text-ink-3 hover:bg-paper-2 hover:text-ink';

  const citationsTrigger = onCitations ? (
    <Link
      to={routes.citations(spaceId)}
      data-tour="tour-topbar-citations"
      aria-label={t('topbar.citations')}
      className={cn(citeBaseClass, citeRestClass)}
    >
      {citeContent}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => openCitationsDrawer()}
      data-tour="tour-topbar-citations"
      aria-label={t('topbar.citations')}
      className={cn(citeBaseClass, citeRestClass)}
    >
      {citeContent}
    </button>
  );

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-rule bg-paper px-3 md:gap-3 md:px-4">
      <IconButton
        icon={Menu}
        iconSize="md"
        label={t('topbar.openNav')}
        onClick={() => setMobileNavOpen(true)}
        className="md:hidden"
      />
      <div className="flex items-center gap-1.5 font-serif text-[14px] text-ink-3">
        {!focus && <span className="hidden md:inline">{spaceName ?? '…'}</span>}
        {docName && (
          <>
            {!focus && (
              <span className="hidden text-ink-4 md:inline">/</span>
            )}
            {editingDoc ? (
              <input
                autoFocus
                value={draftDocName}
                onChange={(e) => setDraftDocName(e.target.value)}
                onBlur={commitDocName}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={onDocKeyDown}
                aria-label={t('topbar.renameDoc')}
                className="w-40 border-0 bg-transparent p-0 font-serif text-[14px] font-medium text-ink outline-none"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={() => docId && setEditingDoc(true)}
                disabled={!docId}
                title={docId ? t('topbar.renameDoc') : undefined}
                className="cursor-text font-medium text-ink hover:text-ink"
              >
                {docName}
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex-1" />
      {!onCitations && (
        <div data-tour="tour-topbar-modes" className="inline-flex items-center">
          <ModeTabs
            mode={mode}
            spaceId={spaceId}
            docId={docId}
            fallbackDocId={fallbackDocId}
          />
        </div>
      )}
      {!focus && !onCitations && (
        <span className="hidden h-3.5 w-px bg-rule md:inline-block" aria-hidden />
      )}
      {!focus && (
        <ComingSoon hint={t('topbar.findInDoc')} side="bottom" className="hidden md:inline-flex">
          <span
            aria-label={t('topbar.findInDoc')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3"
          >
            <Search className="h-3.5 w-3.5" />
          </span>
        </ComingSoon>
      )}
      {focus ? (
        <Tooltip>
          <TooltipTrigger asChild>{citationsTrigger}</TooltipTrigger>
          <TooltipContent side="bottom">{t('topbar.citations')}</TooltipContent>
        </Tooltip>
      ) : (
        citationsTrigger
      )}
      {!onCitations && (mode === 'dump' || docId) && (
        <FocusToggle mode={mode} spaceId={spaceId} docId={docId} />
      )}
      {!focus &&
        !onCitations &&
        docId &&
        (mode === 'write' || mode === 'read') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                icon={MoreHorizontal}
                label={t('topbar.inspector')}
                active={inspectorOpen}
                strokeWidth={inspectorOpen ? 2.6 : 2}
                onClick={toggleInspector}
                className="hidden md:inline-flex"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('topbar.inspector')}
            </TooltipContent>
          </Tooltip>
        )}
      <MobileNavDrawer spaceId={spaceId} activeDocId={docId} />
    </header>
  );
};
