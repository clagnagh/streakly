import { useEffect } from 'react';
import { breakpoints } from '../theme/index.ts';

/**
 * Sets data-layout="desktop" or "phone" on <html>. CSS can't use variables
 * inside media queries, so this keeps the breakpoint a design token and lets
 * CSS write [data-layout='desktop'] .sidebar { … }.
 */
export function useLayoutAttribute() {
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoints.desktop}px)`);
    const apply = () =>
      (document.documentElement.dataset.layout = mq.matches ? 'desktop' : 'phone');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}
