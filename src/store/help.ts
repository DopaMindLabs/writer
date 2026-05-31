import { create } from 'zustand';

/**
 * Open/close state for the Quick Help overlay (the ⌘K palette). Kept in its own
 * tiny store so any surface — the global shortcut hook, a help button — can
 * summon help without threading props through the tree. Not persisted.
 */
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
