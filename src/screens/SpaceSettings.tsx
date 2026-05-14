import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useSpace } from '@/hooks/useSpaces';
import { db } from '@/db/db';
import type { Space } from '@/db/schema';
import { PageNav } from '@/components/chrome/PageNav';
import {
  SettingsTabs,
  type SettingsTabDef,
} from '@/components/settings/SettingsTabs';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TAB_IDS = [
  'general',
  'sharing',
  'template',
  'members',
  'danger',
] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as readonly string[]).includes(value);
}

export function SpaceSettingsScreen() {
  const { t } = useTranslation(['screens', 'chrome', 'common']);
  const { spaceId } = useParams<{ spaceId: string }>();
  const space = useSpace(spaceId);
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const activeTab: TabId = isTabId(rawTab) ? rawTab : 'general';

  const tabs: SettingsTabDef[] = TAB_IDS.map((id) => ({
    id,
    label: t(`settings.space.tabs.${id}`),
  }));

  function selectTab(id: string) {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
  }

  return (
    <div className="flex h-full w-full flex-col bg-paper text-ink">
      <PageNav backTo={spaceId ? `/s/${spaceId}` : '/'} />
      <div className="flex min-h-0 flex-1">
        <SettingsTabs tabs={tabs} active={activeTab} onSelect={selectTab} />
        <main className="flex-1 overflow-auto bg-paper px-10 py-8">
          {space ? (
            <>
              {activeTab === 'general' && <GeneralTab space={space} />}
              {activeTab === 'sharing' && <SharingTab />}
              {activeTab === 'template' && <TemplateTab />}
              {activeTab === 'members' && <MembersTab />}
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
        </main>
      </div>
    </div>
  );
}

function GeneralTab({ space }: { space: Space }) {
  const { t } = useTranslation('screens');
  const [name, setName] = useState(space.name);
  const [tag, setTag] = useState(space.tag);

  async function commitName() {
    const next = name.trim();
    if (!next) {
      setName(space.name);
      return;
    }
    if (next === space.name) return;
    await db.spaces.update(space.id, { name: next, updatedAt: Date.now() });
  }

  async function commitTag() {
    const next = tag.trim();
    if (!next) {
      setTag(space.tag);
      return;
    }
    if (next === space.tag) return;
    await db.spaces.update(space.id, { tag: next, updatedAt: Date.now() });
  }

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
}

function SharingTab() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.sharing.title"
        subtitleKey="settings.space.sharing.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <div className="mx-auto mt-8 max-w-md border border-dashed border-rule bg-paper-2/40 p-8 text-center">
        <div className="inline-block rounded-sm bg-paper-2 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">
          {t('settings.comingSoonBadge')}
        </div>
        <p className="mt-4 font-serif text-[14px] italic text-ink-2">
          {t('settings.space.sharing.comingSoonBody')}
        </p>
      </div>
    </section>
  );
}

function TemplateTab() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.template.title"
        subtitleKey="settings.space.template.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <div className="mx-auto mt-8 max-w-md border border-dashed border-rule bg-paper-2/40 p-8 text-center">
        <div className="inline-block rounded-sm bg-paper-2 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">
          {t('settings.comingSoonBadge')}
        </div>
        <p className="mt-4 font-serif text-[14px] italic text-ink-2">
          {t('settings.space.template.comingSoonBody')}
        </p>
      </div>
    </section>
  );
}

function MembersTab() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.members.title"
        subtitleKey="settings.space.members.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <div className="mx-auto mt-8 max-w-md border border-dashed border-rule bg-paper-2/40 p-8 text-center">
        <div className="inline-block rounded-sm bg-paper-2 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">
          {t('settings.comingSoonBadge')}
        </div>
        <p className="mt-4 font-serif text-[14px] italic text-ink-2">
          {t('settings.space.members.comingSoonBody')}
        </p>
      </div>
    </section>
  );
}

function DangerTab({ space }: { space: Space }) {
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
        <h2 className="font-serif text-[18px] font-medium tracking-tight text-ink">
          {t('settings.space.danger.deleteCardTitle')}
        </h2>
        <p className="mt-2 max-w-[480px] font-serif text-[13px] italic text-ink-3">
          {t('settings.space.danger.deleteCardBody')}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex items-center gap-2 border border-[color:var(--danger)] bg-transparent px-3.5 py-1.5 text-[12px] font-medium tracking-[0.01em] text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-bg)]"
        >
          <Trash2 className="h-3.5 w-3.5 text-[color:var(--danger)]" />
          {t('settings.space.danger.deleteButton')}
        </button>
      </div>

      <DeleteSpaceDialog space={space} open={open} onOpenChange={setOpen} />
    </section>
  );
}

interface DeleteSpaceDialogProps {
  space: Space;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

function DeleteSpaceDialog({
  space,
  open,
  onOpenChange,
}: DeleteSpaceDialogProps) {
  const { t } = useTranslation('screens');
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canDelete = typed.trim() === space.name && !submitting;

  function handleOpenChange(next: boolean) {
    if (!next) setTyped('');
    onOpenChange(next);
  }

  async function handleConfirm() {
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
  }

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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('settings.space.danger.cancel')}
          </Button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canDelete}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 border border-[color:var(--danger)] bg-transparent px-4 text-sm font-medium text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-bg)]',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
            )}
          >
            <Trash2 className="h-3.5 w-3.5 text-[color:var(--danger)]" />
            {t('settings.space.danger.confirm')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      await db.spaces.delete(spaceId);
    },
  );
}
