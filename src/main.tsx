import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n';
import { App } from '@/App';
import { installPeerLinkSeam } from '@/lib/writerSyncIntegration/peerLinkSeam';
import '@/fonts';
import '@/index.css';
import 'driver.js/dist/driver.css';

// Self-gating to dev and E2E builds; a production bundle installs nothing.
installPeerLinkSeam();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
