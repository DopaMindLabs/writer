import { useEffect, useState } from 'react';

// Creates an object URL for a Blob and revokes it when the blob changes or the
// component unmounts, so previews never leak. Returns null until/unless a blob
// is provided.
export const useObjectUrl = (blob: Blob | null | undefined): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [blob]);

  return url;
};
