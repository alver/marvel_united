import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { loadManifest } from './ui/assets';
import './styles/base.css';
import './styles/board.css';
import './styles/cards.css';
import './styles/panels.css';
import './styles/art.css';

// Find out which scans exist before the first render (CSS fallbacks otherwise).
void loadManifest().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
