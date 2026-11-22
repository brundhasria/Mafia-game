export type AnimationMode = 'full' | 'reduced' | 'off';

export interface AnimationConfig {
  worldTransitionDuration: number;
  bannerDuration: number;
  cardFlipDuration: number;
  dawnRevealDelay: number;
  voteTokenFlyDuration: number;
  drumrollDuration: number;
  eliminationFadeDuration: number;
  hapticsEnabled: boolean;
}

export const ANIMATION_PRESETS: Record<AnimationMode, AnimationConfig> = {
  full: {
    worldTransitionDuration: 2.0,
    bannerDuration: 3.5,
    cardFlipDuration: 0.8,
    dawnRevealDelay: 1.5,
    voteTokenFlyDuration: 0.6,
    drumrollDuration: 1.2,
    eliminationFadeDuration: 1.5,
    hapticsEnabled: true,
  },
  reduced: {
    worldTransitionDuration: 0.5,
    bannerDuration: 2.0,
    cardFlipDuration: 0.3,
    dawnRevealDelay: 0.5,
    voteTokenFlyDuration: 0.2,
    drumrollDuration: 0.4,
    eliminationFadeDuration: 0.5,
    hapticsEnabled: false,
  },
  off: {
    worldTransitionDuration: 0.01,
    bannerDuration: 1.0,
    cardFlipDuration: 0.01,
    dawnRevealDelay: 0.01,
    voteTokenFlyDuration: 0.01,
    drumrollDuration: 0.01,
    eliminationFadeDuration: 0.01,
    hapticsEnabled: false,
  },
};

/**
 * Mobile haptic vibration helper.
 */
export function triggerHaptic(pattern: number | number[] = 40): void {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}
