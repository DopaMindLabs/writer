import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import type { Space } from '@/db/schema';
import { deleteSpaceCascade } from '@/lib/space/deleteSpaceCascade';

export interface DeleteSpaceController {
  typed: string;
  setTyped: (value: string) => void;
  submitting: boolean;
  canDelete: boolean;
  handleOpenChange: (next: boolean) => void;
  handleConfirm: () => Promise<void>;
}

export const useDeleteSpace = (
  space: Space,
  onOpenChange: (next: boolean) => void,
): DeleteSpaceController => {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canDelete = typed.trim() === space.name && !submitting;

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped('');
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!canDelete) return;
    setSubmitting(true);
    try {
      await deleteSpaceCascade(space.id);
      onOpenChange(false);
      setTyped('');
      await navigate(routes.home());
    } finally {
      setSubmitting(false);
    }
  };

  return {
    typed,
    setTyped,
    submitting,
    canDelete,
    handleOpenChange,
    handleConfirm,
  };
};
