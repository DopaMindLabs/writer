import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { Section } from '@/db/schema';
import type { AddSectionController } from './Sidebar.types';

const createSection = async (
  spaceId: string,
  label: string,
  order: number,
): Promise<string> => {
  const id = newId();
  await db.sections.add({
    id,
    spaceId,
    parentSectionId: null,
    label,
    order,
  });
  return id;
};

export const useAddSection = (
  spaceId: string,
  sections: Section[],
): AddSectionController => {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const commit = async () => {
    const label = value.trim();
    if (!label) {
      setAdding(false);
      setValue('');
      return;
    }
    const topOrders = sections
      .filter((s) => s.parentSectionId === null)
      .map((s) => s.order);
    const nextOrder = topOrders.length === 0 ? 0 : Math.max(...topOrders) + 1;
    await createSection(spaceId, label, nextOrder);
    setAdding(false);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdding(false);
      setValue('');
    }
  };

  return {
    adding,
    value,
    inputRef,
    onStart: () => { setAdding(true); },
    onChange: setValue,
    onKeyDown,
    onBlur: () => { void commit(); },
  };
};
