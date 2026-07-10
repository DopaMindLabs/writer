import { create } from 'zustand';

interface HelpState {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly toggle: () => void;
}

export const useHelp = create<HelpState>((set) => ({
  open: false,
  setOpen: (open) => {
    set({ open });
  },
  toggle: () => {
    set((s) => ({ open: !s.open }));
  },
}));
