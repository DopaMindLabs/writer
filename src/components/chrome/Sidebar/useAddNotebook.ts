import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/lib/errorMessage';
import { routes } from '@/lib/routes';
import { createWriterNotebookSdk } from '@/lib/writerNotebookIntegration';

export const useAddNotebook = (spaceId: string) => {
  const { t } = useTranslation('chrome');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const createAndOpen = async (): Promise<void> => {
    const sdk = createWriterNotebookSdk(spaceId);
    const notebook = await sdk.createNotebook(t('sidebar.notebookUntitled'));
    await navigate(routes.writerNotebook(spaceId, notebook.id));
  };

  const addNotebook = (): void => {
    setError(null);
    // Radix menu selection is synchronous; keep persistence errors in visible UI state.
    void createAndOpen().catch((cause: unknown) => { setError(errorMessage(cause)); });
  };

  return { addNotebook, error };
};
