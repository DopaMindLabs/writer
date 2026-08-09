import { useEffect, useState } from 'react';
import type { PageRotation } from 'writer-notebook/core';
import { useTranslation } from 'react-i18next';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { useSafeVectorDocument } from '@/hooks/useSafeVectorDocument';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeVectorPage } from './SafeVectorPage';

interface NotebookPageViewerProps {
  readonly blob: Blob;
  readonly vectorBlob?: Blob;
  readonly pageNumber: number;
  readonly rotation: PageRotation;
}

type PageView = 'original' | 'vector';

export const NotebookPageViewer = ({ blob, vectorBlob, pageNumber, rotation }: NotebookPageViewerProps) => {
  const { t } = useTranslation('screens');
  const url = useObjectUrl(blob);
  const vector = useSafeVectorDocument(vectorBlob);
  const [view, setView] = useState<PageView>('original');

  useEffect(() => { setView(vector.document ? 'vector' : 'original'); }, [vector.document]);

  const changeView = (next: string): void => {
    if (next === 'original' || (next === 'vector' && vector.document)) setView(next);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper-2">
      <div className="flex justify-center border-b border-rule bg-paper px-3 py-1">
        <Tabs value={view} onValueChange={changeView}>
          <TabsList>
            <TabsTrigger value="original">{t('notebook.originalView')}</TabsTrigger>
            {vectorBlob ? <TabsTrigger value="vector" disabled={!vector.document}>{t('notebook.vectorView')}</TabsTrigger> : null}
          </TabsList>
        </Tabs>
      </div>
      {vector.invalid ? <InlineBanner kind="warning">{t('notebook.vectorInvalid')}</InlineBanner> : null}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 md:p-8">
        {view === 'vector' && vector.document ? (
          <SafeVectorPage document={vector.document} pageNumber={pageNumber} rotation={rotation} />
        ) : url ? (
          <img src={url} alt={`Page ${String(pageNumber)}`} style={{ transform: `rotate(${String(rotation)}deg)` }} className="max-h-full max-w-full border border-rule bg-paper object-contain" />
        ) : null}
      </div>
    </div>
  );
};
