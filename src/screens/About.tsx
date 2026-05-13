import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Smile, Lightbulb } from 'lucide-react';

export function AboutScreen() {
  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-rule px-12 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          back
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
          about
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col px-12 pt-16 pb-24">
        <h1 className="font-serif text-6xl leading-[1.05] tracking-tight text-ink">
          Hi,
        </h1>
        <div className="mt-12 space-y-6 font-serif text-[18px] leading-relaxed text-ink-2">
          <p>This is for the writer who keeps starting over.  The one who opens a new document, types three sentences (or none),
            then spends 40mins  adjusting the font. The one whose best
            ideas arrive at 2am and get distracted. The one with fourteen
            tabs, six notebooks, and a draft that hasn't moved in a month.
          </p>
          <p>
            I know, because that's me <Smile className="inline-block h-4 w-4" />. I have ADHD, Autism, probably other -isms hasn't been diagnosed yet. I need something that understands my chaotic but wonderful
            brain. Somewhere to dump everything before it disappears (or start writing). The
            fragments, the half-thoughts, the 3am connections. All of it, in
            one place.
          </p>
          <p>So I built this space for us.I hope it gives your dopamine rush just as much it give me to build this.</p>

        </div>

        <section className="mt-12 border-t border-rule pt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--warning)]">
            Status
          </div>
          <div className="mt-3 flex gap-3 rounded-sm border-l-2 border-[color:var(--warning)] bg-[color:var(--warning-bg)] px-4 py-3">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
            <p className="font-serif text-[17px] leading-relaxed text-[color:var(--warning)]">
              <strong className="font-semibold">Experimental</strong> — there
              is no data sync. All data is saved in IndexedDB in your local
              browser. If you clear your browser cache, your work will be lost.
            </p>

          </div>
          <div className="mt-6 space-y-6 font-serif text-[18px] leading-relaxed text-ink-2">
            <p>I am still building this and I have alot ideas <Lightbulb className="inline-block h-4 w-4" />. I'd love to hear what works, what doesn't, and
              what you wish existed. Feedback is welcome.</p>
          </div>
        </section>

        <section className="mt-8 border-t border-rule pt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            Source
          </div>
          <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-2">
            {/* TODO: replace with GitHub URL */}
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
            >
              GitHub
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
