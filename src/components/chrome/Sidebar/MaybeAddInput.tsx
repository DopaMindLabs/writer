import type { AddController } from './Sidebar.types';
import { AddDocInput } from './AddDocInput';

export const MaybeAddInput = ({
  sectionId,
  indented,
  add,
}: {
  sectionId: string;
  indented?: boolean;
  add: AddController;
}) => {
  if (add.adding?.sectionId !== sectionId) return null;
  return (
    <AddDocInput
      ref={add.inputRef}
      sectionId={sectionId}
      value={add.adding.value}
      indented={indented}
      onChange={add.onChange}
      onKeyDown={add.onKeyDown}
      onBlur={add.onBlur}
    />
  );
};
