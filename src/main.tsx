import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { IconSheet } from './features/design/IconSheet';
import './app/install';
import { startClock } from './lib/useClock';
import './styles/base.css';

startClock();

// Offline-Start und „Zum Startbildschirm“. Browser erlauben das nur über HTTPS oder auf localhost.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash === '#piktogramme' ? <IconSheet /> : <App />}
  </StrictMode>,
);
