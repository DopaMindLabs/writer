import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from '@/components/libs/icons';
import { useSpace } from '@/hooks/useSpaces';
import { useBackups } from '@/hooks/useBackups';
import { useDeleteSpace } from '@/hooks/useDeleteSpace';
import { db } from '@/db/db';
import type { Backup, Space } from '@/db/schema';
import { SettingsShell } from '@/components/settings/SettingsShell';
import type { SettingsTabGroup } from '@/components/settings/SettingsTabs';
import { TabHeader } from '@/components/settings/TabHeader';
import { TypographyH2, TypographyP } from '@/components/ui/typography';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
import { backupFilename } from '@/lib/backup/buildSpaceMarkdownZip';
import { downloadBlob } from '@/lib/file-download';
import { SpaceSyncTab } from '@/components/settings/SpaceSyncTab';
import { SpaceTextSetting } from '@/components/settings/SpaceTextSetting';
import { DeleteConfirmField } from '@/components/settings/DeleteConfirmField';
import { BackupsToolbar } from '@/components/settings/backups/BackupsToolbar';
import { BackupsHistoryTable } from '@/components/settings/backups/BackupsHistoryTable';
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
  'sync',
  'export',
  'danger',
] as const;
type TabId = (typeof TAB_IDS)[number];

const isTabId = (value: string | null): value is TabId =>
  value !== null && (TAB_IDS as readonly string[]).includes(value);

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
      tabs: (['backups', 'sync', 'export', 'danger'] as const).map((id) => ({
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
        <SpaceTabContent activeTab={activeTab} space={space} />
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

const SpaceTabContent = ({
  activeTab,
  space,
}: {
  activeTab: TabId;
  space: Space;
}) => (
  <>
    {activeTab === 'general' && <GeneralTab space={space} />}
    {activeTab === 'template' && <TemplateTab />}
    {activeTab === 'palette' && <PaletteTab />}
    {activeTab === 'sharing' && <SharingTab />}
    {activeTab === 'members' && <MembersTab />}
    {activeTab === 'backups' && <BackupsTab space={space} />}
    {activeTab === 'sync' && <SpaceSyncTab space={space} />}
    {activeTab === 'export' && <ExportTab />}
    {activeTab === 'danger' && <DangerTab space={space} />}
  </>
);

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
    <section data-testid="space-settings-tab-general">
      <TabHeader
        titleKey="settings.space.general.title"
        subtitleKey="settings.space.general.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      <SpaceTextSetting
        label={t('settings.space.general.nameLabel')}
        hint={t('settings.space.general.nameHint')}
        ariaLabel={t('settings.space.general.nameLabel')}
        testId="space-settings-name-input"
        value={name}
        onChange={setName}
        onCommit={() => void commitName()}
        onReset={() => {
          setName(space.name);
        }}
        inputClassName="max-w-[320px]"
      />

      <SpaceTextSetting
        label={t('settings.space.general.tagLabel')}
        hint={t('settings.space.general.tagHint')}
        ariaLabel={t('settings.space.general.tagLabel')}
        testId="space-settings-tag-input"
        value={tag}
        onChange={setTag}
        onCommit={() => void commitTag()}
        onReset={() => {
          setTag(space.tag);
        }}
        inputClassName="max-w-[120px] font-mono text-[12px] uppercase tracking-wider"
      />
    </section>
  );
};

const SharingTab = () => {
  return (
    <ComingSoon overlay>
      <div data-testid="space-settings-tab-sharing">
        <SpaceSharingPlaceholder />
      </div>
    </ComingSoon>
  );
};

const TemplateTab = () => {
  return (
    <ComingSoon overlay>
      <div data-testid="space-settings-tab-template">
        <SpaceTemplatePlaceholder />
      </div>
    </ComingSoon>
  );
};

const MembersTab = () => {
  return (
    <ComingSoon overlay>
      <div data-testid="space-settings-tab-members">
        <SpaceMembersPlaceholder />
      </div>
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
    <section data-testid="space-settings-tab-backups">
      <TabHeader
        titleKey="settings.space.backups.title"
        subtitleKey="settings.space.backups.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      <BackupsToolbar busy={busy} onSnapshot={() => void handleSnapshot()} />

      {error && (
        <StatusGlyph kind="error" role="alert" className="mt-3">
          {t('settings.space.backups.snapshotFailed', { message: error })}
        </StatusGlyph>
      )}

      <BackupsHistoryTable
        backups={backups}
        onDownload={handleDownload}
        onDelete={(b) => void handleDelete(b)}
      />
    </section>
  );
};

const DangerTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const [open, setOpen] = useState(false);

  return (
    <section data-testid="space-settings-tab-danger">
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
          data-testid="space-settings-danger-delete-trigger"
          kind="dangerous"
          size="sm"
          onClick={() => { setOpen(true); }}
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
  const { typed, setTyped, canDelete, handleOpenChange, handleConfirm } =
    useDeleteSpace(space, onOpenChange);

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

        <DeleteConfirmField
          label={t('settings.space.danger.typeToConfirm', { name: space.name })}
          value={typed}
          onChange={setTyped}
          testId="space-settings-delete-dialog-input"
        />

        <div className="flex items-center justify-end gap-2">
          <Button
            data-testid="space-settings-delete-dialog-cancel"
            kind="secondary"
            onClick={() => {
              handleOpenChange(false);
            }}
          >
            {t('settings.space.danger.cancel')}
          </Button>
          <Button
            data-testid="space-settings-delete-dialog-confirm"
            kind="dangerous"
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
