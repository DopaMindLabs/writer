import { useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createDoc as createDocInRepo } from '@/lib/docs';
import { routes } from '@/lib/routes';
import type { Space } from '@/db/schema';
import type { AddController, AddingState } from './Sidebar.types';
import { resolveDefaultName } from './sidebarHelpers';
import { useFocusOnMount } from './useFocusOnMount';
import { useTopTemplateMap } from './useTopTemplateMap';

const createDoc = async (
  spaceId: string,
  sectionId: string,
  name: string,
): Promise<string> => {
  const doc = await createDocInRepo({ spaceId, sectionId, name });
  return doc.id;
};

export const useAddDoc = (spaceId: string, space: Space | undefined) => {
  const { t } = useTranslation(['chrome', 'common']);
  const navigate = useNavigate();
  const [adding, setAdding] = useState<AddingState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusOnMount(adding !== null, inputRef);
  const topTemplateDefByLabel = useTopTemplateMap(space);

  const startAdd = (
    sectionId: string,
    parentLabel: string,
    subLabel: string | null,
  ) => {
    const untitled = t('untitled', { ns: 'common' });
    const value = resolveDefaultName(
      topTemplateDefByLabel,
      parentLabel,
      subLabel,
      untitled,
    );
    setAdding({ sectionId, value });
  };

  const commitAdd = async () => {
    if (!adding) return;
    const name = adding.value.trim() || t('untitled', { ns: 'common' });
    const id = await createDoc(spaceId, adding.sectionId, name);
    setAdding(null);
    void navigate(routes.docWrite(spaceId, id));
  };

  const commitOnBlur = async () => {
    if (!adding) return;
    const trimmed = adding.value.trim();
    if (!trimmed) {
      setAdding(null);
      return;
    }
    await createDoc(spaceId, adding.sectionId, trimmed);
    setAdding(null);
  };

  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdding(null);
    }
  };

  const add: AddController = {
    adding,
    inputRef,
    onChange: (v) => { setAdding((prev) => (prev ? { ...prev, value: v } : prev)); },
    onKeyDown: onAddKey,
    onBlur: () => { void commitOnBlur(); },
  };

  return { add, startAdd };
};
