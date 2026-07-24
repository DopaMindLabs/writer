import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { TextField } from '@/components/ui/TextField';
import type { Doc } from '@/db/schema';
import { cn } from '@/lib/utils';
import type { InlineRename } from './Sidebar.types';

interface DocLinkBodyProps {
  doc: Doc;
  href: string;
  active: boolean;
  wordCount: number;
  rename: InlineRename;
}

export const DocLinkBody = ({
  doc,
  href,
  active,
  wordCount,
  rename,
}: DocLinkBodyProps) => {
  const { t } = useTranslation('chrome');
  if (rename.editing) {
    return (
      <TextField
        variant="bare"
        autoFocus
        value={rename.draft}
        onChange={(e) => { rename.setDraft(e.target.value); }}
        onBlur={() => { void rename.commit(); }}
        onFocus={(e) => { e.currentTarget.select(); }}
        onKeyDown={rename.onKeyDown}
        aria-label={t('sidebar.renameDocAria', { name: doc.name })}
        data-testid={`sidebar-doc-${doc.id}-rename-input`}
        className="flex-1 py-1.5 text-[13px]"
      />
    );
  }
  return (
    <Link
      to={href}
      onDoubleClick={rename.beginEdit}
      title={t('sidebar.renameDocHint')}
      data-testid={`sidebar-doc-${doc.id}`}
      className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
    >
      <span
        data-testid={`sidebar-doc-${doc.id}-name`}
        className={cn(
          'flex-1 truncate text-[13px]',
          active ? 'font-medium text-ink' : 'text-ink-2',
        )}
      >
        {doc.name}
      </span>
      <span
        data-testid={`sidebar-doc-${doc.id}-count`}
        className="inline-flex h-3 min-w-3 items-center justify-center font-mono text-[10px] text-ink-4"
      >
        {wordCount > 0 ? wordCount.toLocaleString() : '◌'}
      </span>
    </Link>
  );
};
