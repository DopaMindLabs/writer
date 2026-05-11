import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '@/db/db';

export function BootScreen() {
  const [firstWorldId, setFirstWorldId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const w = await db.worlds.orderBy('updatedAt').reverse().first();
      if (!cancelled && w) setFirstWorldId(w.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (firstWorldId) return <Navigate to={`/w/${firstWorldId}`} replace />;

  return (
    <div className="flex h-full items-center justify-center font-sans text-ink-3">
      <p className="text-sm">Preparing your workspace…</p>
    </div>
  );
}
