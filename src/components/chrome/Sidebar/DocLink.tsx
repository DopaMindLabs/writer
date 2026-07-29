import { renameDoc } from '@/lib/docs';
import type { Doc } from '@/db/schema';
import { cn } from '@/lib/utils';
import { DocRowMenu } from '@/components/chrome/DocRowMenu';
import { DocLinkBody } from './DocLinkBody';
import { useInlineRename } from './useInlineRename';

export const DocLink = ({
  doc,
  href,
  active,
  canManage,
  indented = false,
}: {
  doc: Doc;
  href: string;
  active: boolean;
  /** Passed to the row menu to gate structural actions (move to section). */
  canManage: boolean;
  indented?: boolean;
}) => {
  const wordCount = doc.meta.wordCount;
  const rename = useInlineRename(doc.name, (next) => renameDoc(doc.id, next));
  return (
    <div
      className={cn(
        'group -ml-px flex items-center gap-2 border-l-2 transition-colors',
        indented ? 'pl-7' : 'pl-5',
        active
          ? 'border-ink bg-paper'
          : 'border-transparent hover:bg-paper',
      )}
    >
      <DocLinkBody
        doc={doc}
        href={href}
        active={active}
        wordCount={wordCount}
        rename={rename}
      />
      <DocRowMenu
        doc={doc}
        active={active}
        onRename={rename.beginEdit}
        canManage={canManage}
      />
    </div>
  );
};
