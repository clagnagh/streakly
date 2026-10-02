import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { buildThemeCss } from './theme/index.ts';
import { router } from './router.tsx';
import { applySavedThemeEarly } from './feedback/theme.ts';
import './global.css';

// Put the design-token variables on the page before anything renders.
const tokens = document.createElement('style');
tokens.id = 'theme-tokens';
tokens.textContent = buildThemeCss();
document.head.prepend(tokens);
applySavedThemeEarly();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
