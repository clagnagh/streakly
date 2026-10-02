import { afterEach, describe, expect, it, vi } from 'vitest';
import { haptic, hapticPatterns } from '../src/feedback/haptics.ts';

describe('haptics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('vibrates with the pattern for each moment', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    haptic('complete', true);
    expect(vibrate).toHaveBeenCalledWith([...hapticPatterns.complete]);
  });

  it('stays still when haptics are switched off', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    haptic('tap', false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('does nothing (and never crashes) where vibration is unsupported, like iPhone', () => {
    vi.stubGlobal('navigator', {});
    expect(() => haptic('milestone', true)).not.toThrow();
  });

  it('milestones feel bigger than completing, which is bigger than a tap', () => {
    const total = (p: readonly number[]) => p.reduce((a, b) => a + b, 0);
    expect(total(hapticPatterns.milestone)).toBeGreaterThan(total(hapticPatterns.complete));
    expect(total(hapticPatterns.complete)).toBeGreaterThan(total(hapticPatterns.tap));
  });
});
