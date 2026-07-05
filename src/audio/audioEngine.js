import { Howl, Howler } from 'howler';
import { AUDIO } from '@config/constants.js';
import { diag } from '@utils/diagnostics.js';

export class AudioEngine {
  constructor() {
    this.backgroundTheme = null;
    this.themeA = null;
    this.themeB = null;
    this.themeABaseVolume = AUDIO.THEME_VOLUME;
    this.themeBBaseVolume = 0;
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
    this._themeRestored = false;
    this.activeNarrations = new Set();
    this.pausedActiveNarrations = new Set();
    this._fadingOut = new Map();     // howl -> fade-out promise (idempotency + serialization)
    this._fadeOutPromise = Promise.resolve();  // resolves when the current outgoing fade+pause finishes
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
    this._themeRestored = true;
    if (this.themeA) {
      // Dual-theme mode: restore each theme to its crossfade-aware base volume
      if (this.themeA.playing()) {
        this.themeA.fade(this.themeA.volume(), this.themeABaseVolume, AUDIO.FADE_DURATION);
      }
      if (this.themeB && this.themeB.playing()) {
        this.themeB.fade(this.themeB.volume(), this.themeBBaseVolume, AUDIO.FADE_DURATION);
      }
      diag.log('audio', `theme-restore baseA=${this.themeABaseVolume.toFixed(2)} baseB=${this.themeBBaseVolume.toFixed(2)}`);
    } else if (this.backgroundTheme && this.backgroundTheme.playing()) {
      // Legacy single-theme fallback
      this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.THEME_VOLUME, AUDIO.FADE_DURATION);
      diag.log('audio', 'theme-restore single');
    }
  }

  duckBackgroundTheme() {
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.DUCKING_VOLUME, AUDIO.FADE_DURATION);
    }
  }

  prepareBothThemes(urlA, urlB) {
    if (this.themeA && this.themeB) return;

    const createTheme = (url, volume, label) => {
      const howl = new Howl({
        src: [url],
        loop: true,
        volume,
        html5: true,
        onload: () => {
          if (!this.isGloballyPaused && howl && !howl.playing()) {
            howl.play();
            diag.log('audio', `${label} autoplay on buffer ready`);
          }
        },
      });
      return howl;
    };

    this.themeA = createTheme(urlA, this.themeABaseVolume, 'themeA');
    this.themeB = createTheme(urlB, this.themeBBaseVolume, 'themeB');
    this.backgroundTheme = this.themeA;
    diag.log('audio', 'prepareBothThemes buffering');
  }

  playBothThemes(urlA, urlB) {
    this.prepareBothThemes(urlA, urlB);
    if (this.themeA && !this.themeA.playing()) this.themeA.play();
    if (this.themeB && !this.themeB.playing()) this.themeB.play();
    diag.log('audio', 'playBothThemes');
  }

  setThemeVolumes(volumeA, volumeB) {
    this.themeABaseVolume = volumeA;
    this.themeBBaseVolume = volumeB;
    if (this.themeA) this.themeA.volume(volumeA);
    if (this.themeB) this.themeB.volume(volumeB);
  }

  applyThemeDucking(duckRatio) {
    if (duckRatio <= 0) return;
    const duckScale = 1 - duckRatio * (1 - AUDIO.DUCKING_VOLUME / AUDIO.THEME_VOLUME);
    if (this.themeA) this.themeA.volume(this.themeABaseVolume * duckScale);
    if (this.themeB) this.themeB.volume(this.themeBBaseVolume * duckScale);
  }

  _fadeOutAndPause(howl) {
    if (!howl || !howl.playing()) return Promise.resolve();
    if (this._fadingOut.has(howl)) return this._fadingOut.get(howl);   // already fading → same promise
    const from = howl.volume();
    if (from <= 0.001) { howl.pause(); return Promise.resolve(); }
    const p = new Promise((resolve) => {
      let settled = false;
      let timer = null;
      const finish = () => {
        if (settled) return;                 // one-shot: both 'fade' and the safety timeout call this (N5)
        settled = true;
        clearTimeout(timer);
        howl.off('fade', finish);            // don't leak onto this howl's NEXT fade cycle (N5)
        this._fadingOut.delete(howl);
        if (howl.playing() && howl.volume() <= 0.001) howl.pause();
        resolve();
      };
      howl.once('fade', finish);
      timer = setTimeout(finish, AUDIO.NARRATION_FADE_OUT_MS + 40);   // safety net if 'fade' is dropped
    });
    this._fadingOut.set(howl, p);
    howl.fade(from, 0, AUDIO.NARRATION_FADE_OUT_MS);
    return p;
  }

  pauseCurrentNarration() {
    this._fadeOutPromise = this._fadeOutAndPause(this.currentNarration);
    return this._fadeOutPromise;
  }

  countPlayingNarrations() {
    return Object.values(this.narrations).filter((h) => h && h.playing()).length;
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
          this.activeNarrations.delete(letterId);
          if (!isCurrent && this.activeNarrations.size === 0) {
            this.restoreBackgroundThemeVolume();
          }
        }
      });

      this.narrations[letterId] = howl;
    });
  }

  async activateNarration(letterId, { fullVolume = false } = {}) {
    this._themeRestored = false;
    const requestToken = ++this.activeNarrationRequestToken;

    // Same letter: resume from paused position
    if (this.currentNarrationLetterId === letterId && this.currentNarration) {
      const howl = this.currentNarration;
      // Genuinely cancel an in-flight fade-out (N5): _fadingOut.delete() only clears bookkeeping — the
      // Howler ramp keeps running and finish() would pause the just-re-approached narration. Touching
      // volume() triggers Howler _stopFade (jumps to target + emits 'fade'); with volume > 0.001 the
      // hardened finish() then declines to pause.
      if (this._fadingOut.has(howl)) howl.volume(Math.max(howl.volume(), 0.01));
      this._fadingOut.delete(howl);
      if (!howl.playing()) howl.play();
      if (fullVolume) howl.volume(AUDIO.NARRATION_VOLUME);
      this.duckBackgroundTheme();
      diag.log('audio', `activateNarration id=${letterId} resume fullVolume=${fullVolume}`);
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

    // SERIALIZE: do not start the incoming until the outgoing fade-out has fully paused.
    await this._fadeOutPromise;
    if (requestToken !== this.activeNarrationRequestToken) {
      diag.log('audio', `activateNarration id=${letterId} STALE after fade-wait`);
      return;
    }

    this._fadingOut.delete(narration);
    this.duckBackgroundTheme();
    narration.stop();
    narration.volume(fullVolume ? AUDIO.NARRATION_VOLUME : 0);   // full for inspect, else attack-ramp
    narration.play();
    this.currentNarration = narration;
    this.currentNarrationLetterId = letterId;
    this.resumeNarrationOnNextResume = false;
    diag.log('audio', `activateNarration id=${letterId} PLAYING playing#=${this.countPlayingNarrations()}`);
  }

  deactivateNarration() {
    diag.log('audio', `deactivateNarration currId=${this.currentNarrationLetterId} playing=${this.currentNarration?.playing() ?? 'none'}`);
    this.activeNarrationRequestToken += 1;
    this.pauseCurrentNarration();
    this.restoreBackgroundThemeVolume();
  }

  async activatePolyphonicNarration(letterId) {
    if (this.activeNarrations.has(letterId)) return;
    this._themeRestored = false;
    this.activeNarrations.add(letterId);

    if (!this.narrations[letterId] && this.narrationUrls[letterId]) {
      diag.log('audio', `poly activate id=${letterId} lazy-loading`);
      try {
        await this.loadNarration(letterId, this.narrationUrls[letterId]);
      } catch (error) {
        diag.log('audio', `poly activate id=${letterId} LOAD FAILED`, error?.message);
        this.activeNarrations.delete(letterId);
        return;
      }
    }

    const narration = this.narrations[letterId];
    if (!narration) {
      this.activeNarrations.delete(letterId);
      return;
    }

    if (narration.state() === 'loading') {
      try {
        await new Promise((resolve, reject) => {
          narration.once('load', resolve);
          narration.once('loaderror', reject);
        });
      } catch (error) {
        diag.log('audio', `poly activate id=${letterId} LOAD WAIT FAILED`, error?.message);
        this.activeNarrations.delete(letterId);
        return;
      }
    }

    if (!this.activeNarrations.has(letterId)) {
      diag.log('audio', `poly activate id=${letterId} STALE (left range during load)`);
      return;
    }

    narration.play();
    diag.log('audio', `poly activate id=${letterId} PLAYING`);
  }

  deactivatePolyphonicNarration(letterId) {
    if (!this.activeNarrations.has(letterId)) return;
    this.activeNarrations.delete(letterId);
    const howl = this.narrations[letterId];
    if (howl && howl.playing()) {
      howl.pause();
    }
    if (this.activeNarrations.size === 0) {
      this.restoreBackgroundThemeVolume();
    }
    diag.log('audio', `poly deactivate id=${letterId}`);
  }

  setPolyphonicVolumes(volumeMap) {
    if (this.isGloballyPaused) return;

    let maxVol = 0;

    for (const [letterId, volume] of volumeMap) {
      const howl = this.narrations[letterId];
      if (!howl || howl.state() !== 'loaded') continue;

      if (volume <= 0) {
        if (howl.playing()) howl.pause();
      } else {
        if (!howl.playing() && this.activeNarrations.has(letterId)) {
          howl.play();
        }
        howl.volume(volume);
        if (volume > maxVol) maxVol = volume;
      }
    }

    if (maxVol > 0) {
      this.applyThemeDucking(maxVol / AUDIO.NARRATION_VOLUME);
    } else {
      this.setThemeVolumes(this.themeABaseVolume, this.themeBBaseVolume);
    }
  }

  setNarrationVolume(volume, activeId) {
    if (this.isGloballyPaused || !this.currentNarration) return;

    if (volume <= 0) {
      const wasPlaying = this.currentNarration.playing();
      if (wasPlaying) this._fadeOutAndPause(this.currentNarration);
      if (!this._themeRestored) {
        this.restoreBackgroundThemeVolume();
      }
      if (wasPlaying && diag.shouldLogVolume(0, activeId)) {
        diag.log('audio', `setNarrationVolume PAUSE activeId=${activeId} currId=${this.currentNarrationLetterId}`);
      }
      return;
    }

    this._themeRestored = false;

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
    this._fadingOut.delete(this.currentNarration);
    const cur = this.currentNarration.volume();
    const next = volume > cur ? Math.min(volume, cur + AUDIO.NARRATION_ATTACK_STEP) : volume;
    this.currentNarration.volume(next);
    if (diag.shouldLogVolume(volume, activeId)) {
      diag.log('audio', `setNarrationVolume ${cur.toFixed(2)}->${next.toFixed(2)} id=${activeId}`);
    }
    const duckRatio = next / AUDIO.NARRATION_VOLUME;
    this.applyThemeDucking(duckRatio);
  }

  pause() {
    this.isGloballyPaused = true;

    // Pause background themes
    if (this.themeA && this.themeA.playing()) this.themeA.pause();
    if (this.themeB && this.themeB.playing()) this.themeB.pause();
    if (!this.themeA && this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.pause();
    }

    // Pause current narration
    this.resumeNarrationOnNextResume = Boolean(this.currentNarration && this.currentNarration.playing());

    if (this.resumeNarrationOnNextResume) {
      this.currentNarration.pause();
    }

    // Pause polyphonic narrations
    this.pausedActiveNarrations = new Set();
    for (const id of this.activeNarrations) {
      const howl = this.narrations[id];
      if (howl && howl.playing()) {
        howl.pause();
        this.pausedActiveNarrations.add(id);
      }
    }

    diag.log('audio', `pause currId=${this.currentNarrationLetterId} willResume=${this.resumeNarrationOnNextResume} polyPaused=${this.pausedActiveNarrations.size}`);
  }

  resume() {
    this.isGloballyPaused = false;

    // Resume background themes
    if (this.themeA && !this.themeA.playing()) this.themeA.play();
    if (this.themeB && !this.themeB.playing()) this.themeB.play();
    if (!this.themeA && this.backgroundTheme && !this.backgroundTheme.playing()) {
      this.backgroundTheme.play();
    }

    // Resume current narration
    if (this.currentNarration && this.resumeNarrationOnNextResume && !this.currentNarration.playing()) {
      this.currentNarration.play();
    }

    const resumedNarration = this.resumeNarrationOnNextResume;
    this.resumeNarrationOnNextResume = false;

    // Resume polyphonic narrations
    for (const id of this.pausedActiveNarrations) {
      const howl = this.narrations[id];
      if (howl && !howl.playing() && this.activeNarrations.has(id)) {
        howl.play();
      }
    }
    const polyResumed = this.pausedActiveNarrations.size;
    this.pausedActiveNarrations.clear();

    diag.log('audio', `resume currId=${this.currentNarrationLetterId} narrationResumed=${resumedNarration} polyResumed=${polyResumed}`);
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

  getDebugState() {
    return {
      themeABase: this.themeABaseVolume,
      themeBBase: this.themeBBaseVolume,
      themeAActual: this.themeA ? this.themeA.volume() : null,
      themeBActual: this.themeB ? this.themeB.volume() : null,
      narrationId: this.currentNarrationLetterId,
      narrationVol: this.currentNarration ? this.currentNarration.volume() : null,
      narrationPlaying: this.currentNarration ? this.currentNarration.playing() : false,
      isDucking: this.currentNarration ? this.currentNarration.playing() : this.activeNarrations.size > 0,
    };
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

    if (this.themeA) { this.themeA.unload(); this.themeA = null; }
    if (this.themeB) { this.themeB.unload(); this.themeB = null; }
    if (this.backgroundTheme) {
      if (this.backgroundTheme !== this.themeA) this.backgroundTheme.unload();
      this.backgroundTheme = null;
    }

    this.activeNarrationRequestToken += 1;
    this.resumeNarrationOnNextResume = false;
    this.isGloballyPaused = false;
    this._themeRestored = false;
    this.activeNarrations.clear();
    this.pausedActiveNarrations.clear();

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
