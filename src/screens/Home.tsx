import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/db/db';

export function HomeScreen() {
  const [firstSpaceId, setFirstSpaceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const w = await db.spaces.orderBy('updatedAt').reverse().first();
      if (cancelled) return;
      if (w) setFirstSpaceId(w.id);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = loaded && !firstSpaceId;

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10 md:px-12 md:py-16">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          a writing space
        </div>
        <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-ink md:text-6xl">
          LIpsum{' '}
          <span className="italic font-light text-ink-2">Writer</span>
        </h1>
        <p className="mt-4 font-serif text-[18px] italic text-ink-2">
          {isEmpty
            ? 'Your first space is a blank one. Pick a template to get started, or start from nothing.'
            : 'A clutter-free space for long-form writing — fiction, research, essays, journals.'}
        </p>

        {loaded && (
          <div className="mt-12 border-y border-rule">
            {firstSpaceId && (
              <Link
                to={`/s/${firstSpaceId}`}
                className="flex items-baseline justify-between border-b border-rule px-2 py-5 transition-colors hover:bg-paper-2"
              >
                <span className="font-serif text-[18px] text-ink md:text-[22px]">
                  Continue writing
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  →
                </span>
              </Link>
            )}
            <Link
              to="/new"
              className="flex items-baseline justify-between px-2 py-5 transition-colors hover:bg-paper-2"
            >
              <span
                className={
                  isEmpty
                    ? 'font-serif text-[20px] italic text-ink md:text-[26px]'
                    : 'font-serif text-[18px] italic text-ink md:text-[22px]'
                }
              >
                Start a new space
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                →
              </span>
            </Link>
          </div>
        )}

        <div className="mt-10 flex items-center gap-5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          <Link to="/about" className="hover:text-ink">
            About
          </Link>
          {/* TODO: replace with GitHub URL */}
          <a
            href="#"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            GitHub
          </a>
          <span className="flex-1" />
          <span className="italic normal-case text-ink-4">
            experimental · local only
          </span>
        </div>
      </div>
    </div>
  );
}
