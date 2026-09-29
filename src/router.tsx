import { createHashRouter } from 'react-router';
import { AppLayout } from './components/AppLayout.tsx';
import { NotFound } from './routes/NotFound.tsx';
import { Today } from './routes/Today.tsx';
import { Habits } from './routes/Habits.tsx';
import { Stats } from './routes/Stats.tsx';
import { Settings } from './routes/Settings.tsx';
import { Tokens } from './routes/dev/Tokens.tsx';

// Hash URLs (…/streakly/#/stats) because GitHub Pages can't send every path to
// index.html. We can switch to createBrowserRouter on a host that can (Milestone 9).
export const router = createHashRouter([
  {
    path: '/',
    Component: AppLayout,
    errorElement: <NotFound />,
    children: [
      { index: true, Component: Today },
      { path: 'habits', Component: Habits },
      { path: 'stats', Component: Stats },
      { path: 'settings', Component: Settings },
    ],
  },
  // Hidden design-system page: not linked anywhere. Removed before launch (Milestone 9).
  { path: '/dev/tokens', Component: Tokens },
]);
