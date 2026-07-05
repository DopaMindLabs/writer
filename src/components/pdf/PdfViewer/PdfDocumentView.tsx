import { useState, type ReactNode } from 'react';
import { Document, type DocumentProps } from '@/lib/pdf/pdfAdapter';

type LoadSuccessArg = Parameters<NonNullable<DocumentProps['onLoadSuccess']>>[0];

interface PdfDocumentViewProps {
  file: { data: Uint8Array };
  onLoadSuccess: (numPages: number) => void;
  onLoadError: () => void;
  children: ReactNode;
}

/**
 * The only component that renders react-pdf's `<Document>`. The page mounts
 * strictly after a successful load of the *current* bytes: `loaded` is derived
 * from file identity (`loadedFile === file`), so a fresh copy — a reload, or a
 * different document — re-gates the children until its own parse succeeds,
 * without an effect that could race the load callback. react-pdf's own
 * loading/error UI is suppressed; the viewer renders status itself.
 */
export const PdfDocumentView = ({
  file,
  onLoadSuccess,
  onLoadError,
  children,
}: PdfDocumentViewProps) => {
  const [loadedFile, setLoadedFile] = useState<{ data: Uint8Array } | null>(null);
  const loaded = loadedFile === file;

  const handleLoadSuccess = (pdf: LoadSuccessArg): void => {
    setLoadedFile(file);
    onLoadSuccess(pdf.numPages);
  };

  const handleLoadError = (): void => {
    setLoadedFile(null);
    onLoadError();
  };

  return (
    <Document
      file={file}
      loading={null}
      error={null}
      noData={null}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={handleLoadError}
    >
      {loaded ? children : null}
    </Document>
  );
};
