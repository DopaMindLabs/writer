import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { listTemplates, type Template } from '@/data/templates';
import { createWorldFromTemplate } from '@/db/seed';
import { cn } from '@/lib/utils';

export function TemplatesScreen() {
  const templates = useMemo(() => listTemplates(), []);
  const [selectedId, setSelectedId] = useState<string>(
    templates[0]?.id ?? '',
  );
  const selected = templates.find((t) => t.id === selectedId);
  const [name, setName] = useState<string>(selected?.label ?? '');
  const [tag, setTag] = useState<string>(selected?.tag ?? '');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function onSelect(t: Template) {
    setSelectedId(t.id);
    setName(t.label);
    setTag(t.tag);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const cleanTag = tag.trim().slice(0, 3).toUpperCase() || selected.tag;
      const cleanName = name.trim() || selected.label;
      const newId = await createWorldFromTemplate(
        selected,
        cleanName,
        cleanTag,
      );
      navigate(`/w/${newId}`);
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = `enter ${name.trim() || selected?.label || '…'} →`;

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper">
      <header className="flex items-center justify-between border-b border-rule px-12 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          back
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
          new world
        </div>
      </header>

      <form
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-12 py-16"
      >
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            01 — A KIND OF ROOM
          </div>
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-ink">
            What kind of world{' '}
            <span className="italic font-light text-ink-2">
              are you starting?
            </span>
          </h1>
        </div>

        <fieldset className="border-y border-rule">
          <legend className="sr-only">Choose a template</legend>
          {templates.map((t, i) => {
            const active = t.id === selectedId;
            const sectionPreview = t.sections.map((s) => s.label).join(' · ');
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className={cn(
                  'grid w-full grid-cols-[2rem_14rem_1fr_2rem] items-baseline gap-6 border-b border-rule px-2 py-5 text-left transition-colors last:border-b-0 hover:bg-paper-2',
                  active && 'bg-paper-2',
                )}
                aria-pressed={active}
              >
                <span className="font-mono text-[12px] text-ink-3">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex flex-col">
                  <span className="font-serif text-[18px] leading-tight text-ink">
                    {t.label}
                  </span>
                  {t.description && (
                    <span className="mt-1 font-serif text-[13px] italic text-ink-3">
                      {t.description}
                    </span>
                  )}
                </span>
                <span className="font-serif text-[14px] italic text-ink-2">
                  {sectionPreview}
                </span>
                <span className="flex justify-end">
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      active
                        ? 'border-ink bg-ink'
                        : 'border-rule bg-transparent',
                    )}
                    aria-hidden="true"
                  >
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-paper" />
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </fieldset>

        <div className="grid grid-cols-[1fr_8rem] gap-6">
          <div>
            <label
              htmlFor="world-name"
              className="block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3"
            >
              Name
            </label>
            <input
              id="world-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border-0 border-b border-rule bg-transparent py-2 font-serif text-[22px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div>
            <label
              htmlFor="world-tag"
              className="block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3"
            >
              Tag
            </label>
            <input
              id="world-tag"
              type="text"
              maxLength={3}
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase())}
              className="mt-1 w-full border-0 border-b border-rule bg-transparent py-2 text-center font-mono text-[18px] tracking-widest text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-rule pt-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-5 w-9 cursor-not-allowed items-center rounded-full bg-paper-2 px-0.5 opacity-60"
              role="switch"
              aria-checked="false"
              aria-disabled="true"
              title="Cloud sync is unavailable — this app is local-only for now."
            >
              <span className="h-4 w-4 rounded-full bg-ink-4" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              cloud sync —{' '}
              <span className="italic text-ink-4">off, local</span>
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting || !selected}
            className="font-serif text-[18px] italic text-ink underline underline-offset-4 hover:text-ink-2 disabled:opacity-50"
          >
            {submitting ? 'creating…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
