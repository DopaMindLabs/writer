import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from '@/components/libs/icons';
import { useSpace } from '@/hooks/useSpaces';
import { useBackups } from '@/hooks/useBackups';
import { db } from '@/db/db';
import type { Backup, Space } from '@/db/schema';
import { SettingsShell } from '@/components/settings/SettingsShell';
import type { SettingsTabGroup } from '@/components/settings/SettingsTabs';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import {
  TypographyH2,
  TypographyLabel,
  TypographyP,
} from '@/components/ui/typography';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  MAX_BACKUPS_PER_SPACE,
  createSpaceBackup,
} from '@/lib/backup/createSpaceBackup';
import { backupFilename } from '@/lib/backup/buildSpaceMarkdownZip';
import { downloadBlob } from '@/lib/file-download';
import { ComingSoonBadge } from '@/components/settings/ComingSoonBadge';
import { ComingSoon } from '@/components/settings/ComingSoon';
import {
  SpaceTemplatePlaceholder,
  SpacePalettePlaceholder,
  SpaceSharingPlaceholder,
  SpaceMembersPlaceholder,
  SpaceExportPlaceholder,
} from '@/components/settings/placeholders/SpaceSettingsPlaceholders';

const TAB_IDS = [
  'general',
  'template',
  'palette',
  'sharing',
  'members',
  'backups',
  'export',
  'danger',
] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as readonly string[]).includes(value);
}

export const SpaceSettingsScreen = () => {
  const { t } = useTranslation(['screens', 'chrome', 'common']);
  const { spaceId } = useParams<{ spaceId: string }>();
  const space = useSpace(spaceId);
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const activeTab: TabId = isTabId(rawTab) ? rawTab : 'general';

  const groups: SettingsTabGroup[] = [
    {
      label: t('settings.space.groups.thisSpace'),
      tabs: (['general', 'template', 'palette'] as const).map((id) => ({
        id,
        label: t(`settings.space.tabs.${id}`),
      })),
    },
    {
      label: t('settings.space.groups.sharingMembers'),
      tabs: (['sharing', 'members'] as const).map((id) => ({
        id,
        label: t(`settings.space.tabs.${id}`),
      })),
    },
    {
      label: t('settings.space.groups.data'),
      tabs: (['backups', 'export', 'danger'] as const).map((id) => ({
        id,
        label: t(`settings.space.tabs.${id}`),
      })),
    },
  ];

  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
  };

  return (
    <SettingsShell
      variant="space"
      space={space ?? null}
      activeSpaceId={spaceId ?? null}
      groups={groups}
      active={activeTab}
      onSelect={selectTab}
    >
      {space ? (
        <>
          {activeTab === 'general' && <GeneralTab space={space} />}
          {activeTab === 'template' && <TemplateTab />}
          {activeTab === 'palette' && <PaletteTab />}
          {activeTab === 'sharing' && <SharingTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'backups' && <BackupsTab space={space} />}
          {activeTab === 'export' && <ExportTab />}
          {activeTab === 'danger' && <DangerTab space={space} />}
        </>
      ) : (
        <p
          data-testid="space-settings-loading"
          className="font-serif text-[14px] italic text-ink-3"
        >
          {t('settings.space.loading')}
        </p>
      )}
    </SettingsShell>
  );
};

const GeneralTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const [name, setName] = useState(space.name);
  const [tag, setTag] = useState(space.tag);

  const commitName = async () => {
    const next = name.trim();
    if (!next) {
      setName(space.name);
      return;
    }
    if (next === space.name) return;
    await db.spaces.update(space.id, { name: next, updatedAt: Date.now() });
  };

  const commitTag = async () => {
    const next = tag.trim();
    if (!next) {
      setTag(space.tag);
      return;
    }
    if (next === space.tag) return;
    await db.spaces.update(space.id, { tag: next, updatedAt: Date.now() });
  };

  return (
    <section>
      <TabHeader
        titleKey="settings.space.general.title"
        subtitleKey="settings.space.general.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      <SettingRow
        label={t('settings.space.general.nameLabel')}
        hint={t('settings.space.general.nameHint')}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void commitName()}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') setName(space.name);
          }}
          aria-label={t('settings.space.general.nameLabel')}
          className="w-full max-w-[320px] border-b border-rule bg-transparent py-1 text-[14px] text-ink outline-none focus:border-ink"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.space.general.tagLabel')}
        hint={t('settings.space.general.tagHint')}
      >
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onBlur={() => void commitTag()}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') setTag(space.tag);
          }}
          aria-label={t('settings.space.general.tagLabel')}
          className="w-full max-w-[120px] border-b border-rule bg-transparent py-1 font-mono text-[12px] uppercase tracking-wider text-ink outline-none focus:border-ink"
        />
      </SettingRow>
    </section>
  );
};

const SharingTab = () => {
  return (
    <ComingSoon overlay>
      <SpaceSharingPlaceholder />
    </ComingSoon>
  );
};

const TemplateTab = () => {
  return (
    <ComingSoon overlay>
      <SpaceTemplatePlaceholder />
    </ComingSoon>
  );
};

const MembersTab = () => {
  return (
    <ComingSoon overlay>
      <SpaceMembersPlaceholder />
    </ComingSoon>
  );
};

const PaletteTab = () => {
  return (
    <ComingSoon overlay>
      <SpacePalettePlaceholder />
    </ComingSoon>
  );
};

const ExportTab = () => {
  return (
    <ComingSoon overlay>
      <SpaceExportPlaceholder />
    </ComingSoon>
  );
};

const BackupsTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const backups = useBackups(space.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSnapshot = async () => {
    setBusy(true);
    setError(null);
    try {
      const { backup, filename } = await createSpaceBackup(space.id);
      downloadBlob(backup.payload, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = (backup: Backup) => {
    downloadBlob(backup.payload, backupFilename(space.name, backup.when));
  };

  const handleDelete = async (backup: Backup) => {
    const ok = window.confirm(t('settings.space.backups.deleteConfirm'));
    if (!ok) return;
    await db.backups.delete(backup.id);
  };

  return (
    <section>
      <TabHeader
        titleKey="settings.space.backups.title"
        subtitleKey="settings.space.backups.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <TypographyP variant="caption">
          {t('settings.space.backups.retentionHint', {
            count: MAX_BACKUPS_PER_SPACE,
          })}
        </TypographyP>
        <div className="flex items-center gap-4 text-[12px]">
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-4"
          >
            {t('settings.space.backups.restoreLabel')}
            <ComingSoonBadge />
          </span>
          <Button size="sm" onClick={() => void handleSnapshot()} disabled={busy}>
            {busy
              ? t('settings.space.backups.snapshotting')
              : t('settings.space.backups.snapshotNow')}
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink"
        >
          {t('settings.space.backups.snapshotFailed', { message: error })}
        </p>
      )}

      <div className="mt-6">
        <TypographyLabel asChild>
          <h3>{t('settings.space.backups.historyTitle')}</h3>
        </TypographyLabel>
        {backups.length === 0 ? (
          <div className="mx-auto mt-6 max-w-md border border-dashed border-rule bg-paper-2/40 p-6 text-center">
            <TypographyP variant="caption" className="text-[14px] text-ink-2">
              {t('settings.space.backups.empty')}
            </TypographyP>
          </div>
        ) : (
          <table
            data-testid="backups-history"
            className="mt-3 w-full border-collapse text-[13px]"
          >
            <thead>
              <tr className="border-b border-rule font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                <th className="py-2 text-left font-normal">
                  {t('settings.space.backups.columns.when')}
                </th>
                <th className="py-2 text-left font-normal">
                  {t('settings.space.backups.columns.kind')}
                </th>
                <th className="py-2 text-right font-normal">
                  {t('settings.space.backups.columns.size')}
                </th>
                <th className="py-2 text-right font-normal">
                  {t('settings.space.backups.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr
                  key={b.id}
                  data-testid={`backup-row-${b.id}`}
                  className="border-b border-rule"
                >
                  <td className="py-2.5 font-mono text-[12px] text-ink">
                    {formatRelativeTime(b.when, t)}
                  </td>
                  <td className="py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-2">
                    {t(`settings.space.backups.kind.${b.kind}`)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[12px] text-ink-2">
                    {formatBytes(b.size)}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3 text-[12px]">
                      <button
                        type="button"
                        onClick={() => handleDownload(b)}
                        className="text-ink underline underline-offset-4 hover:text-ink-2"
                      >
                        {t('settings.space.backups.download')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(b)}
                        aria-label={t('settings.space.backups.delete')}
                        className="text-ink-3 hover:text-ink"
                      >
                        {t('settings.space.backups.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// TODO: move to utils and add tests
function formatRelativeTime(
  when: number,
  t: (key: string) => string,
  now: number = Date.now(),
): string {
  const diffSec = Math.max(0, Math.floor((now - when) / 1000));
  if (diffSec < 60) return t('settings.space.backups.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return new Date(when).toISOString().slice(0, 10);
}

const DangerTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const [open, setOpen] = useState(false);

  return (
    <section>
      <TabHeader
        titleKey="settings.space.danger.title"
        subtitleKey="settings.space.danger.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      <div className="border border-rule p-6">
        <TypographyH2>{t('settings.space.danger.deleteCardTitle')}</TypographyH2>
        <TypographyP variant="caption" className="mt-2 max-w-[480px]">
          {t('settings.space.danger.deleteCardBody')}
        </TypographyP>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          className="mt-5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('settings.space.danger.deleteButton')}
        </Button>
      </div>

      <DeleteSpaceDialog space={space} open={open} onOpenChange={setOpen} />
    </section>
  );
};

interface DeleteSpaceDialogProps {
  space: Space;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const DeleteSpaceDialog = ({
  space,
  open,
  onOpenChange,
}: DeleteSpaceDialogProps) => {
  const { t } = useTranslation('screens');
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canDelete = typed.trim() === space.name && !submitting;

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped('');
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!canDelete) return;
    setSubmitting(true);
    try {
      await deleteSpaceCascade(space.id);
      onOpenChange(false);
      setTyped('');
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {t('settings.space.danger.dialogTitle', { name: space.name })}
          </DialogTitle>
          <DialogDescription>
            {t('settings.space.danger.dialogBody')}
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {t('settings.space.danger.typeToConfirm', { name: space.name })}
          </span>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label={t('settings.space.danger.typeToConfirm', {
              name: space.name,
            })}
            className="w-full border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            {t('settings.space.danger.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={!canDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('settings.space.danger.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export async function deleteSpaceCascade(spaceId: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.spaces,
      db.sections,
      db.docs,
      db.notes,
      db.annotations,
      db.citations,
      db.connections,
      db.palettes,
      db.backups,
    ],
    async () => {
      const docIds = await db.docs.where({ spaceId }).primaryKeys();
      if (docIds.length > 0) {
        await db.annotations.where('docId').anyOf(docIds).delete();
      }
      await db.docs.where({ spaceId }).delete();
      await db.sections.where({ spaceId }).delete();
      await db.notes.where({ spaceId }).delete();
      await db.citations.where({ spaceId }).delete();
      await db.connections.where({ spaceId }).delete();
      await db.palettes.where({ spaceId }).delete();
      await db.backups.where('scope').equals(spaceId).delete();
      await db.spaces.delete(spaceId);
    },
  );
}
