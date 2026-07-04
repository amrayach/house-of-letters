import { audioEngine } from './audioEngine.js';
import { AUDIO } from '@config/constants.js';
import { diag } from '@utils/diagnostics.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const CROSSFADE_LOG_THRESHOLD = 0.05;

export class ThemeMixer {
  constructor() {
    this.lastT = -1;
    this.lastLoggedT = -1;
  }

  get crossfadeT() {
    return this.lastT;
  }

  update(cameraZ) {
    const start = AUDIO.THEME_CROSSFADE_START;
    const end = AUDIO.THEME_CROSSFADE_END;

    const t = clamp01((cameraZ - start) / (end - start));

    // Skip if crossfade position hasn't meaningfully changed
    if (Math.abs(t - this.lastT) < 0.001) return;
    this.lastT = t;

    // Equal-power crossfade. A linear fade (1-t / t) dips combined acoustic
    // power to half (-3 dB) at the midpoint of the walk between zones;
    // cos/sin gains keep A² + B² constant so the bed stays level.
    const volumeA = AUDIO.THEME_VOLUME * Math.cos(t * Math.PI / 2);
    const volumeB = AUDIO.THEME_VOLUME * Math.sin(t * Math.PI / 2);

    audioEngine.setThemeVolumes(volumeA, volumeB);

    // Throttled diagnostic log for crossfade changes
    if (Math.abs(t - this.lastLoggedT) >= CROSSFADE_LOG_THRESHOLD) {
      this.lastLoggedT = t;
      diag.log('audio', `crossfade t=${t.toFixed(2)} volA=${volumeA.toFixed(2)} volB=${volumeB.toFixed(2)}`);
    }
  }
}

export const themeMixer = new ThemeMixer();
