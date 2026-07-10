import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PillToggle } from '@/components/ui/PillToggle';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pin, RotateCcw } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import { useUI, type DiffMode } from '@/store/ui';
import { useRevisions } from '@/hooks/useRevisions';
import { db } from '@/db/db';
import type { Doc, Revision } from '@/db/schema';
import {
  computeInlineDiff,
  computeSideBySideDiff,
  lexicalJsonToPlainText,
  restoreRevision,
} from '@/lib/revisions';
import { cn } from '@/lib/utils';
import {
  formatRevisionAge,
  formatRevisionSubtitle,
} from './revisionDisplay';

interface VersionHistoryModalProps {
  doc: Doc;
}

export const VersionHistoryModal = ({ doc }: VersionHistoryModalProps) => {
  const { t } = useTranslation('chrome');
  const open = useUI((s) => s.versionModalOpen);
  const setOpen = useUI((s) => s.setVersionModalOpen);
  const revisions = useRevisions(doc.id);
  const compare = useUI((s) => s.compareRevisionIds);
  const setCompare = useUI((s) => s.setCompareRevisionIds);

  useEffect(() => {
    if (!open) return;
    const stillValid = revisions.some((r) => r.id === compare.base);
    if (!stillValid) {
      setCompare({ base: revisions[0]?.id ?? null, compare: null });
    }
  }, [open, revisions, compare.base, setCompare]);

  const selected = revisions.find((r) => r.id === compare.base) ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="version-history-modal"
        className="flex h-[70vh] max-w-3xl flex-col gap-0 p-0"
      >
        <DialogHeader className="border-b border-rule px-5 py-4 text-left">
          <DialogTitle>{t('versionModal.title')}</DialogTitle>
          <DialogDescription>
            {t('versionModal.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <RevisionList
            revisions={revisions}
            selectedId={compare.base}
            onSelect={(id) => { setCompare({ base: id, compare: null }); }}
          />
          <DiffPanel doc={doc} selected={selected} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface RevisionListProps {
  revisions: Revision[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const RevisionList = ({ revisions, selectedId, onSelect }: RevisionListProps) => {
  const { t } = useTranslation('chrome');
  return (
    <div
      data-testid="version-modal-list"
      className="w-56 shrink-0 overflow-auto border-r border-rule"
      aria-label={t('versionModal.listLabel')}
    >
      {revisions.length === 0 ? (
        <p className="px-4 py-3 font-serif text-[12px] italic text-ink-3">
          {t('versionModal.empty')}
        </p>
      ) : (
        revisions.map((rev, i) => (
          <RevisionListItem
            key={rev.id}
            revision={rev}
            isNewest={i === 0}
            selected={rev.id === selectedId}
            onSelect={() => { onSelect(rev.id); }}
          />
        ))
      )}
    </div>
  );
};

interface RevisionListItemProps {
  revision: Revision;
  isNewest: boolean;
  selected: boolean;
  onSelect: () => void;
}

const RevisionListItem = ({
  revision,
  isNewest,
  selected,
  onSelect,
}: RevisionListItemProps) => {
  const { t } = useTranslation('chrome');
  const togglePin = (): void => {
    void db.revisions.update(revision.id, { pinned: !revision.pinned });
  };
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-rule/60 px-3 py-2',
        selected && 'bg-paper-2',
      )}
    >
      <button
        type="button"
        data-testid={`version-modal-item-${revision.id}`}
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-1.5 font-serif text-[12px] text-ink">
          <span className={cn(isNewest && 'font-medium')}>
            {formatRevisionAge(revision.createdAt, t)}
          </span>
          {isNewest && (
            <Eyebrow asChild size={9} tone="paper">
              <span className="bg-ink px-1">{t('inspector.history.now')}</span>
            </Eyebrow>
          )}
        </div>
        <div className="truncate font-serif text-[11px] italic text-ink-3">
          {formatRevisionSubtitle(revision, t)}
        </div>
      </button>
      <IconButton
        icon={Pin}
        label={t(revision.pinned ? 'versionModal.unpin' : 'versionModal.pin')}
        onClick={togglePin}
        className={cn('h-5 w-5', revision.pinned ? 'text-ink' : 'text-ink-4')}
      />
    </div>
  );
};

interface DiffPanelProps {
  doc: Doc;
  selected: Revision | null;
}

const DiffPanel = ({ doc, selected }: DiffPanelProps) => {
  const { t } = useTranslation('chrome');
  const diffMode = useUI((s) => s.diffMode);
  const setDiffMode = useUI((s) => s.setDiffMode);
  const setOpen = useUI((s) => s.setVersionModalOpen);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const currentText = lexicalJsonToPlainText(doc.body);

  const restore = (): void => {
    if (!selected) return;
    void restoreRevision(doc.id, selected.id)
      .then(() => { setOpen(false); })
      .catch((err: unknown) => {
        console.error('Failed to restore revision', err);
      });
  };

  if (!selected) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="font-serif text-[13px] italic text-ink-3">
          {t('versionModal.selectBase')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <DiffToolbar diffMode={diffMode} setDiffMode={setDiffMode} />
      <div className="min-h-0 flex-1 overflow-auto p-4" data-testid="diff-view">
        {diffMode === 'inline' ? (
          <DiffInline oldText={selected.text} newText={currentText} />
        ) : (
          <DiffSideBySide oldText={selected.text} newText={currentText} />
        )}
      </div>
      <div className="flex justify-end border-t border-rule px-4 py-3">
        <Button
          kind="secondary"
          size="sm"
          data-testid="modal-restore"
          onClick={() => { setConfirmOpen(true); }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('versionModal.restore')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('versionModal.restoreTitle')}
        description={t('versionModal.restoreConfirm')}
        confirmLabel={t('versionModal.restore')}
        cancelLabel={t('versionModal.cancel')}
        confirmKind="dangerous"
        onConfirm={restore}
      />
    </div>
  );
};

interface DiffToolbarProps {
  diffMode: DiffMode;
  setDiffMode: (mode: DiffMode) => void;
}

const DiffToolbar = ({ diffMode, setDiffMode }: DiffToolbarProps) => {
  const { t } = useTranslation('chrome');
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
      <Eyebrow size={9} tone="ink3">
        {t('versionModal.compareWith')}
      </Eyebrow>
      <div className="flex items-center gap-2">
        <Eyebrow size={9} tone="ink4">
          {t('versionModal.inline')}
        </Eyebrow>
        <PillToggle
          on={diffMode === 'side-by-side'}
          onToggle={() => {
            setDiffMode(diffMode === 'side-by-side' ? 'inline' : 'side-by-side');
          }}
          label={t('versionModal.diffModeLabel')}
          data-testid="diff-mode-toggle"
        />
        <Eyebrow size={9} tone="ink4">
          {t('versionModal.sideBySide')}
        </Eyebrow>
      </div>
    </div>
  );
};

interface DiffTextProps {
  oldText: string;
  newText: string;
}

const DiffInline = ({ oldText, newText }: DiffTextProps) => {
  const { t } = useTranslation('chrome');
  const segments = computeInlineDiff(oldText, newText);
  const changed = segments.some((s) => s.op !== 'equal');
  if (!changed) {
    return (
      <p className="font-serif text-[13px] italic text-ink-3">
        {t('versionModal.identical')}
      </p>
    );
  }
  return (
    <p className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-ink">
      {segments.map((seg, i) => (
        <span
          key={i}
          className={cn(
            seg.op === 'added' && 'bg-success-bg text-success',
            seg.op === 'removed' && 'bg-danger-bg text-danger line-through',
          )}
        >
          {seg.value}
        </span>
      ))}
    </p>
  );
};

const DiffSideBySide = ({ oldText, newText }: DiffTextProps) => {
  const { t } = useTranslation('chrome');
  const rows = computeSideBySideDiff(oldText, newText);
  const changed = rows.some((r) => r.kind !== 'equal');
  if (!changed) {
    return (
      <p className="font-serif text-[13px] italic text-ink-3">
        {t('versionModal.identical')}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-px bg-rule font-serif text-[12px] leading-relaxed">
      {rows.map((row, i) => (
        <DiffRow key={i} row={row} />
      ))}
    </div>
  );
};

const DiffRow = ({
  row,
}: {
  row: { kind: string; left: string; right: string };
}) => (
  <>
    <div
      className={cn(
        'min-h-[1.5em] whitespace-pre-wrap bg-paper px-2 py-0.5 text-ink',
        (row.kind === 'removed' || row.kind === 'changed') &&
          'bg-danger-bg text-danger',
      )}
    >
      {row.left}
    </div>
    <div
      className={cn(
        'min-h-[1.5em] whitespace-pre-wrap bg-paper px-2 py-0.5 text-ink',
        (row.kind === 'added' || row.kind === 'changed') &&
          'bg-success-bg text-success',
      )}
    >
      {row.right}
    </div>
  </>
);
