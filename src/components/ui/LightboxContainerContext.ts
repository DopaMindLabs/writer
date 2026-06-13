import { createContext, useContext } from 'react';

export const LightboxContainerContext = createContext<HTMLElement | null>(null);

export const useLightboxContainer = (): HTMLElement | null =>
  useContext(LightboxContainerContext);
