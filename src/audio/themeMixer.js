import { audioEngine } from './audioEngine.js';
import { AUDIO } from '@config/constants.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export class ThemeMixer {
  constructor() {
    this.lastT = -1;
  }

  update(cameraZ) {
    const start = AUDIO.THEME_CROSSFADE_START;
    const end = AUDIO.THEME_CROSSFADE_END;

    const t = clamp01((cameraZ - start) / (end - start));

    // Skip if crossfade position hasn't meaningfully changed
    if (Math.abs(t - this.lastT) < 0.001) return;
    this.lastT = t;

    const volumeA = AUDIO.THEME_VOLUME * (1 - t);
    const volumeB = AUDIO.THEME_VOLUME * t;

    audioEngine.setThemeVolumes(volumeA, volumeB);
  }
}

export const themeMixer = new ThemeMixer();
