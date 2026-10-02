import { describe, expect, it } from 'vitest';
import { installOffer, looksLikeIos, type InstallSituation } from '../src/pwa/installRules.ts';

const base: InstallSituation = {
  installed: false,
  hasCompleted: true,
  canPrompt: true,
  isIos: false,
  dismissedDay: null,
  today: '2026-10-02',
};

describe('install offer', () => {
  it('waits until a habit has been completed', () => {
    expect(installOffer({ ...base, hasCompleted: false })).toBeNull();
    expect(installOffer(base)).toBe('prompt');
  });

  it('never shows once installed', () => {
    expect(installOffer({ ...base, installed: true })).toBeNull();
  });

  it('shows iPhone instructions where there is no install button', () => {
    expect(installOffer({ ...base, canPrompt: false, isIos: true })).toBe('ios');
    expect(installOffer({ ...base, canPrompt: false, isIos: false })).toBeNull();
  });

  it('"Not now" hides it for 14 days', () => {
    expect(installOffer({ ...base, dismissedDay: '2026-09-25' })).toBeNull();
    expect(installOffer({ ...base, dismissedDay: '2026-09-18' })).toBe('prompt');
  });

  it('recognises iPhones and iPads', () => {
    expect(looksLikeIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    expect(looksLikeIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true); // iPad
    expect(looksLikeIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false); // Mac
    expect(looksLikeIos('Mozilla/5.0 (Linux; Android 15)', 5)).toBe(false);
  });
});
