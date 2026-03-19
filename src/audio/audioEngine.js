import { Howl, Howler } from 'howler';
import { AUDIO } from '@config/constants.js';

export class AudioEngine {
  constructor() {
    this.backgroundTheme = null;
    this.currentNarration = null;
    this.currentNarrationLetterId = null;
    this.narrations = {};
    this.narrationUrls = {};
    this.isInitialized = false;
    this.visibilityHandler = null;
    this.shouldResumeOnVisibility = null;
    this.activeNarrationRequestToken = 0;
    this.resumeNarrationOnNextResume = false;
    this.isGloballyPaused = false;
  }

  init() {
    if (this.isInitialized) return;

    // Resume AudioContext on user interaction to ensure playback
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }

    console.log('Audio Engine Initialized');
    this.isInitialized = true;
  }

  playBackgroundTheme(url) {
    if (this.backgroundTheme) {
      this.backgroundTheme.stop();
      this.backgroundTheme.unload();
    }

    this.backgroundTheme = new Howl({
      src: [url],
      loop: true,
      volume: AUDIO.THEME_VOLUME,
      html5: true,
      onload: () => console.log('Background theme loaded'),
      onloaderror: (id, error) => console.error('Error loading background theme:', error)
    });

    this.backgroundTheme.play();
    console.log('Playing background theme:', url);
  }

  restoreBackgroundThemeVolume() {
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.THEME_VOLUME, AUDIO.FADE_DURATION);
    }
  }

  duckBackgroundTheme() {
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.DUCKING_VOLUME, AUDIO.FADE_DURATION);
    }
  }

  pauseCurrentNarration() {
    if (this.currentNarration && this.currentNarration.playing()) {
      this.currentNarration.pause();
    }
  }

  registerNarration(letterId, url) {
    this.narrationUrls[letterId] = url;
  }

  loadNarration(letterId, url) {
    return new Promise((resolve, reject) => {
      if (this.narrations[letterId]) {
        resolve(this.narrations[letterId]);
        return;
      }

      const howl = new Howl({
        src: [url],
        loop: false,
        volume: AUDIO.NARRATION_VOLUME,
        onload: () => {
          console.log(`Narration ${letterId} loaded`);
          resolve(howl);
        },
        onloaderror: (id, error) => {
          console.error(`Error loading narration ${letterId}:`, error);
          reject(error);
        },
        onend: () => {
          console.log(`Narration ${letterId} ended`);
          if (this.currentNarration === howl && this.currentNarrationLetterId === letterId) {
            this.currentNarration = null;
            this.currentNarrationLetterId = null;
            this.resumeNarrationOnNextResume = false;
            this.restoreBackgroundThemeVolume();
          }
        }
      });

      this.narrations[letterId] = howl;
    });
  }

  async activateNarration(letterId) {
    const requestToken = ++this.activeNarrationRequestToken;

    // Same letter: resume from paused position
    if (this.currentNarrationLetterId === letterId && this.currentNarration) {
      if (!this.currentNarration.playing()) {
        this.currentNarration.play();
      }
      this.duckBackgroundTheme();
      console.log(`Resumed narration for letter ${letterId}`);
      return;
    }

    // Different letter: pause old, play new from start
    this.pauseCurrentNarration();

    // Lazy load if not already loaded
    if (!this.narrations[letterId] && this.narrationUrls[letterId]) {
      console.log(`Lazy loading narration for letter ${letterId}...`);
      try {
        await this.loadNarration(letterId, this.narrationUrls[letterId]);
      } catch (error) {
        console.error(`Failed to load narration for letter ${letterId}:`, error);
        return;
      }
    }

    const narration = this.narrations[letterId];
    if (!narration) {
      console.warn(`Narration for letter ${letterId} not loaded (and no URL registered)`);
      return;
    }

    // Wait for narration to be ready if still loading
    if (narration.state() === 'loading') {
      console.log(`Waiting for narration ${letterId} to finish loading...`);
      try {
        await new Promise((resolve, reject) => {
          narration.once('load', resolve);
          narration.once('loaderror', reject);
        });
      } catch (error) {
        console.error(`Failed while waiting for narration ${letterId}:`, error);
        return;
      }
    }

    if (requestToken !== this.activeNarrationRequestToken) {
      console.log(`Ignoring stale narration request for letter ${letterId}`);
      return;
    }

    this.duckBackgroundTheme();

    narration.stop();
    narration.play();
    this.currentNarration = narration;
    this.currentNarrationLetterId = letterId;
    this.resumeNarrationOnNextResume = false;
    console.log(`Playing narration for letter ${letterId}`);
  }

  async restartNarration(letterId) {
    const requestToken = ++this.activeNarrationRequestToken;

    // Pause any different narration
    if (this.currentNarrationLetterId !== letterId) {
      this.pauseCurrentNarration();
    }

    // Lazy load if not already loaded
    if (!this.narrations[letterId] && this.narrationUrls[letterId]) {
      console.log(`Lazy loading narration for letter ${letterId}...`);
      try {
        await this.loadNarration(letterId, this.narrationUrls[letterId]);
      } catch (error) {
        console.error(`Failed to load narration for letter ${letterId}:`, error);
        return;
      }
    }

    const narration = this.narrations[letterId];
    if (!narration) {
      console.warn(`Narration for letter ${letterId} not loaded (and no URL registered)`);
      return;
    }

    if (narration.state() === 'loading') {
      console.log(`Waiting for narration ${letterId} to finish loading...`);
      try {
        await new Promise((resolve, reject) => {
          narration.once('load', resolve);
          narration.once('loaderror', reject);
        });
      } catch (error) {
        console.error(`Failed while waiting for narration ${letterId}:`, error);
        return;
      }
    }

    if (requestToken !== this.activeNarrationRequestToken) {
      console.log(`Ignoring stale narration restart for letter ${letterId}`);
      return;
    }

    this.duckBackgroundTheme();

    narration.stop();
    narration.play();
    narration.volume(AUDIO.NARRATION_VOLUME);
    this.currentNarration = narration;
    this.currentNarrationLetterId = letterId;
    this.resumeNarrationOnNextResume = false;
    console.log(`Restarted narration for letter ${letterId}`);
  }

  deactivateNarration() {
    this.activeNarrationRequestToken += 1;
    this.pauseCurrentNarration();
    this.restoreBackgroundThemeVolume();
  }

  setNarrationVolume(volume) {
    if (this.isGloballyPaused || !this.currentNarration) return;

    if (volume <= 0) {
      if (this.currentNarration.playing()) this.currentNarration.pause();
      this.restoreBackgroundThemeVolume();
      return;
    }

    if (!this.currentNarration.playing()) this.currentNarration.play();
    this.currentNarration.volume(volume);

    // Proportional theme ducking: theme swells back as narration fades with distance
    if (this.backgroundTheme) {
      const ratio = volume / AUDIO.NARRATION_VOLUME;
      const themeVol = AUDIO.THEME_VOLUME + (AUDIO.DUCKING_VOLUME - AUDIO.THEME_VOLUME) * ratio;
      this.backgroundTheme.volume(themeVol);
    }
  }

  pause() {
    this.isGloballyPaused = true;

    // Pause background theme
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.pause();
    }

    // Pause current narration
    this.resumeNarrationOnNextResume = Boolean(this.currentNarration && this.currentNarration.playing());

    if (this.resumeNarrationOnNextResume) {
      this.currentNarration.pause();
    }

    console.log('Audio paused');
  }

  resume() {
    this.isGloballyPaused = false;

    // Resume background theme
    if (this.backgroundTheme && !this.backgroundTheme.playing()) {
      this.backgroundTheme.play();
    }

    // Resume current narration
    if (this.currentNarration && this.resumeNarrationOnNextResume && !this.currentNarration.playing()) {
      this.currentNarration.play();
    }

    this.resumeNarrationOnNextResume = false;

    console.log('Audio resumed');
  }

  /**
   * Setup visibility change listener to pause/resume audio when tab is hidden/visible
   */
  setupVisibilityHandler(options = {}) {
    if (this.visibilityHandler) {
      return;
    }

    this.shouldResumeOnVisibility = options.shouldResume ?? null;

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pause();
      } else if (!this.shouldResumeOnVisibility || this.shouldResumeOnVisibility()) {
        this.resume();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Dispose all audio resources
   */
  dispose() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.shouldResumeOnVisibility = null;

    if (this.backgroundTheme) {
      this.backgroundTheme.unload();
      this.backgroundTheme = null;
    }

    this.activeNarrationRequestToken += 1;
    this.resumeNarrationOnNextResume = false;
    this.isGloballyPaused = false;

    // Unload all cached narrations
    Object.values(this.narrations).forEach((narration) => {
      narration.unload();
    });
    this.currentNarration = null;
    this.currentNarrationLetterId = null;
    this.narrations = {};
    this.narrationUrls = {};
    this.isInitialized = false;

    console.log('Audio engine disposed');
  }
}

export const audioEngine = new AudioEngine();
