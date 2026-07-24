import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createSection, isWorkshopLabel } from '@/lib/sections';
import type { Section } from '@/db/schema';
import type { AddSectionController } from './Sidebar.types';

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
    // Treat an empty entry or the reserved Workshop label as no section to add.
    if (!label || isWorkshopLabel(label)) {
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
