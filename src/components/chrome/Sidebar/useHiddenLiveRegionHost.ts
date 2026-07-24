import { useEffect, useState } from 'react';

const createHost = (): HTMLElement => {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  return host;
};

/**
 * A body-level portal target for dnd-kit's built-in status live region, marked
 * `aria-hidden` so it leaves the accessibility tree. Its default announcements
 * read raw item ids, so hiding it loses nothing for users — the sidebar
 * announces drags separately with human-readable labels — while keeping its
 * `role="status"` from colliding with the app's own status announcers.
 */
export const useHiddenLiveRegionHost = (): Element => {
  const [host] = useState(createHost);
  useEffect(() => {
    document.body.appendChild(host);
    return () => { host.remove(); };
  }, [host]);
  return host;
};
