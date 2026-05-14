import type { TourId } from './tours';

const STORAGE_KEY = 'lipsum-tours';
const STORAGE_VERSION = 1;

interface PersistedShape {
  version: number;
  completed: string[];
}

function read(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: STORAGE_VERSION, completed: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter((id): id is string => typeof id === 'string')
      : [];
    return { version: STORAGE_VERSION, completed };
  } catch {
    return { version: STORAGE_VERSION, completed: [] };
  }
}

function write(state: PersistedShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function getCompleted(): string[] {
  return read().completed;
}

export function isCompleted(id: TourId): boolean {
  return read().completed.includes(id);
}

export function markCompleted(id: TourId): void {
  const state = read();
  if (state.completed.includes(id)) return;
  write({ ...state, completed: [...state.completed, id] });
}

export function resetTour(id: TourId): void {
  const state = read();
  if (!state.completed.includes(id)) return;
  write({ ...state, completed: state.completed.filter((x) => x !== id) });
}

export function resetAll(): void {
  write({ version: STORAGE_VERSION, completed: [] });
}

export const TOURS_STORAGE_KEY = STORAGE_KEY;
