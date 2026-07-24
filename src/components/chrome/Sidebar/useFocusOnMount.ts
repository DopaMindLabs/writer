import { useEffect, type RefObject } from 'react';

export const useFocusOnMount = (
  active: boolean,
  ref: RefObject<HTMLInputElement | null>,
): void => {
  useEffect(() => {
    if (active && ref.current) {
      const input = ref.current;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [active, ref]);
};
