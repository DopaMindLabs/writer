import { Navigate, useParams } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import { WorldRail } from '@/components/chrome/WorldRail';
import { Topbar } from '@/components/chrome/Topbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useWorld } from '@/hooks/useWorlds';
import { useCitations } from '@/hooks/useCitations';
import { useUI } from '@/store/ui';
import { parseBibtexFile, importCitations } from '@/lib/bibtex';

export function CitationsScreen() {
  const { worldId } = useParams<{ worldId: string }>();
  const world = useWorld(worldId);
  const citations = useCitations(worldId);
  const setCurrentWorldId = useUI((s) => s.setCurrentWorldId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (worldId) setCurrentWorldId(worldId);
  }, [worldId, setCurrentWorldId]);

  if (!worldId) return <Navigate to="/" replace />;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !worldId) return;
    setStatus(`Parsing ${file.name}…`);
    try {
      const parsed = await parseBibtexFile(file, worldId);
      const { added, skipped } = await importCitations(parsed);
      setStatus(
        `Imported ${added} citation${added === 1 ? '' : 's'}${
          skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''
        }.`,
      );
    } catch (err) {
      console.error(err);
      setStatus(
        `Failed to parse: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex h-full w-full">
      <WorldRail activeWorldId={worldId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          worldId={worldId}
          docId={null}
          docName="Citations"
          worldName={world?.name}
          mode="normal"
        />
        <main className="flex-1 overflow-auto bg-paper px-12 py-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-ink">
                  Citations
                </h1>
                <p className="mt-1 text-sm text-ink-3">
                  {citations.length === 0
                    ? 'No citations yet — import a .bib file to get started.'
                    : `${citations.length} citation${citations.length === 1 ? '' : 's'} for ${world?.name ?? 'this world'}.`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import .bib
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bib,.bibtex,text/x-bibtex,application/x-bibtex"
                  className="hidden"
                  onChange={handleFile}
                />
                {status && (
                  <p className="text-xs text-ink-3" role="status">
                    {status}
                  </p>
                )}
              </div>
            </div>

            {citations.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-3">
                {citations.map((c) => (
                  <Card key={c.id}>
                    <CardHeader>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="font-serif text-base">
                            {c.title}
                          </CardTitle>
                          <CardDescription className="mt-0.5">
                            {c.authors}
                          </CardDescription>
                        </div>
                        <span className="shrink-0 rounded-full border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                          {c.type}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3 font-mono text-xs text-ink-3">
                      <span>@{c.key}</span>
                      {c.year > 0 && (
                        <>
                          <span className="text-ink-4">·</span>
                          <span>{c.year}</span>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <FileText className="h-8 w-8 text-ink-4" />
        <div>
          <p className="font-serif text-lg text-ink">No citations yet</p>
          <p className="mt-1 text-sm text-ink-3">
            Click <span className="font-medium text-ink">Import .bib</span> to add
            a BibTeX file. Duplicates (by citation key) are skipped automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
