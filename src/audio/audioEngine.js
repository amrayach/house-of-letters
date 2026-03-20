import { Howl, Howler } from 'howler';
import { AUDIO } from '@config/constants.js';
import { diag } from '@utils/diagnostics.js';

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

  prepareBackgroundTheme(url) {
    if (this.backgroundTheme) return;
    this.backgroundTheme = new Howl({
      src: [url],
      loop: true,
      volume: AUDIO.THEME_VOLUME,
      html5: true,
      onload: () => {
        if (!this.isGloballyPaused && this.backgroundTheme && !this.backgroundTheme.playing()) {
          this.backgroundTheme.play();
          diag.log('audio', 'prepareBackgroundTheme autoplay on buffer ready');
        }
      },
    });
    diag.log('audio', 'prepareBackgroundTheme buffering');
  }

  playBackgroundTheme(url) {
    this.prepareBackgroundTheme(url);
    if (!this.backgroundTheme.playing()) {
      this.backgroundTheme.play();
      diag.log('audio', 'playBackgroundTheme');
    }
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
          const isCurrent = this.currentNarration === howl && this.currentNarrationLetterId === letterId;
          diag.log('audio', `onend id=${letterId} isCurrent=${isCurrent}`);
          if (isCurrent) {
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
      const wasPlaying = this.currentNarration.playing();
      if (!wasPlaying) {
        this.currentNarration.play();
      }
      this.duckBackgroundTheme();
      diag.log('audio', `activateNarration id=${letterId} resume (was ${wasPlaying ? 'playing' : 'paused'})`);
      return;
    }

    // Different letter: pause old, play new from start
    const prevId = this.currentNarrationLetterId;
    this.pauseCurrentNarration();

    // Lazy load if not already loaded
    if (!this.narrations[letterId] && this.narrationUrls[letterId]) {
      diag.log('audio', `activateNarration id=${letterId} lazy-loading (prev=${prevId})`);
      try {
        await this.loadNarration(letterId, this.narrationUrls[letterId]);
      } catch (error) {
        diag.log('audio', `activateNarration id=${letterId} LOAD FAILED`, error?.message);
        return;
      }
    }

    const narration = this.narrations[letterId];
    if (!narration) {
      diag.log('audio', `activateNarration id=${letterId} NO NARRATION (no url registered)`);
      return;
    }

    // Wait for narration to be ready if still loading
    if (narration.state() === 'loading') {
      diag.log('audio', `activateNarration id=${letterId} waiting for load...`);
      try {
        await new Promise((resolve, reject) => {
          narration.once('load', resolve);
          narration.once('loaderror', reject);
        });
      } catch (error) {
        diag.log('audio', `activateNarration id=${letterId} LOAD WAIT FAILED`, error?.message);
        return;
      }
    }

    if (requestToken !== this.activeNarrationRequestToken) {
      diag.log('audio', `activateNarration id=${letterId} STALE (token ${requestToken}→${this.activeNarrationRequestToken})`);
      return;
    }

    this.duckBackgroundTheme();

    narration.stop();
    narration.play();
    this.currentNarration = narration;
    this.currentNarrationLetterId = letterId;
    this.resumeNarrationOnNextResume = false;
    diag.log('audio', `activateNarration id=${letterId} PLAYING (prev=${prevId})`);
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
    diag.log('audio', `restartNarration id=${letterId} PLAYING`);
  }

  deactivateNarration() {
    diag.log('audio', `deactivateNarration currId=${this.currentNarrationLetterId} playing=${this.currentNarration?.playing() ?? 'none'}`);
    this.activeNarrationRequestToken += 1;
    this.pauseCurrentNarration();
    this.restoreBackgroundThemeVolume();
  }

  setNarrationVolume(volume, activeId) {
    if (this.isGloballyPaused || !this.currentNarration) return;

    if (volume <= 0) {
      const wasPlaying = this.currentNarration.playing();
      if (wasPlaying) this.currentNarration.pause();
      this.restoreBackgroundThemeVolume();
      if (wasPlaying && diag.shouldLogVolume(0, activeId)) {
        diag.log('audio', `setNarrationVolume PAUSE activeId=${activeId} currId=${this.currentNarrationLetterId}`);
      }
      return;
    }

    // Only auto-resume/adjust if the current narration matches the active letter.
    // Prevents resuming a stale narration during async loading of a new one.
    if (this.currentNarrationLetterId !== activeId) {
      if (diag.shouldLogVolume(volume, activeId)) {
        diag.log('audio', `setNarrationVolume SKIP mismatch activeId=${activeId} currId=${this.currentNarrationLetterId} vol=${volume.toFixed(2)}`);
      }
      return;
    }

    const wasPlaying = this.currentNarration.playing();
    if (!wasPlaying) this.currentNarration.play();
    this.currentNarration.volume(volume);

    if (diag.shouldLogVolume(volume, activeId)) {
      diag.log('audio', `setNarrationVolume vol=${volume.toFixed(2)} id=${activeId}${wasPlaying ? '' : ' RESUMED'}`);
    }

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

    diag.log('audio', `pause currId=${this.currentNarrationLetterId} willResume=${this.resumeNarrationOnNextResume}`);
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

    const resumedNarration = this.resumeNarrationOnNextResume;
    this.resumeNarrationOnNextResume = false;

    diag.log('audio', `resume currId=${this.currentNarrationLetterId} narrationResumed=${resumedNarration}`);
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
