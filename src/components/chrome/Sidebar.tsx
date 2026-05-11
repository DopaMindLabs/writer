import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useWorld } from '@/hooks/useWorlds';
import { useSections, useDocuments } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

interface SidebarProps {
  worldId: string;
  activeDocId: string | null;
}

export function Sidebar({ worldId, activeDocId }: SidebarProps) {
  const world = useWorld(worldId);
  const sections = useSections(worldId);
  const docs = useDocuments(worldId);
  const params = useParams();

  const docsBySection = useMemo(() => {
    const map = new Map<string, typeof docs>();
    for (const d of docs) {
      const arr = map.get(d.sectionId) ?? [];
      arr.push(d);
      map.set(d.sectionId, arr);
    }
    return map;
  }, [docs]);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-rule bg-paper-2">
      <div className="border-b border-rule px-5 pb-4 pt-5">
        <div className="font-serif text-lg font-medium leading-tight tracking-tight text-ink">
          {world?.name ?? '…'}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {world?.shared ? 'SHARED' : 'PRIVATE · LOCAL'}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {sections.map((sec) => {
          const list = docsBySection.get(sec.id) ?? [];
          return (
            <div key={sec.id} className="mb-2">
              <div className="px-5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4">
                {sec.label}
              </div>
              {list.length === 0 && (
                <div className="px-5 py-1.5 text-xs italic text-ink-4">
                  (empty)
                </div>
              )}
              {list.map((d) => {
                const isActive = d.id === activeDocId;
                const wordCount = countWords(d.body);
                return (
                  <Link
                    key={d.id}
                    to={
                      params.mode === 'focus'
                        ? `/w/${worldId}/d/${d.id}/focus`
                        : `/w/${worldId}/d/${d.id}`
                    }
                    className={cn(
                      '-ml-px flex items-center gap-2 border-l-2 px-5 py-1.5 transition-colors',
                      isActive
                        ? 'border-ink bg-paper'
                        : 'border-transparent hover:bg-paper',
                    )}
                  >
                    <span
                      className={cn(
                        'flex-1 truncate text-[13px]',
                        isActive ? 'font-medium text-ink' : 'text-ink-2',
                      )}
                    >
                      {d.name}
                    </span>
                    <span className="font-mono text-[10px] text-ink-4">
                      {wordCount > 0 ? wordCount.toLocaleString() : '◌'}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function countWords(body: string): number {
  if (!body) return 0;
  try {
    const parsed = JSON.parse(body) as { root?: unknown };
    if (parsed?.root) {
      return extractTextFromLexicalState(parsed.root).trim().split(/\s+/).filter(Boolean).length;
    }
  } catch {
    /* not JSON, treat as plain text */
  }
  return body.trim().split(/\s+/).filter(Boolean).length;
}

function extractTextFromLexicalState(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const obj = node as { text?: string; children?: unknown[] };
  if (typeof obj.text === 'string') return obj.text;
  if (Array.isArray(obj.children)) {
    return obj.children.map(extractTextFromLexicalState).join(' ');
  }
  return '';
}
