import { Howl, Howler } from 'howler';
import { AUDIO } from '@config/constants.js';

export class AudioEngine {
  constructor() {
    this.backgroundTheme = null;
    this.currentNarration = null;
    this.narrations = {};
    this.narrationUrls = {};
    this.isInitialized = false;
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

  registerNarration(letterId, url) {
    this.narrationUrls[letterId] = url;
  }

  loadNarration(letterId, url) {
    if (!this.narrations[letterId]) {
      this.narrations[letterId] = new Howl({
        src: [url],
        loop: false,
        volume: AUDIO.NARRATION_VOLUME,
        onload: () => console.log(`Narration ${letterId} loaded`),
        onloaderror: (id, error) => console.error(`Error loading narration ${letterId}:`, error),
        onend: () => {
          console.log(`Narration ${letterId} ended`);
          // Restore theme volume when narration ends
          if (this.backgroundTheme) {
            this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.THEME_VOLUME, AUDIO.FADE_DURATION);
          }
        }
      });
    }
  }

  playNarration(letterId) {
    // Stop current narration if playing
    if (this.currentNarration) {
      this.currentNarration.stop();
    }

    // Lazy load if not already loaded
    if (!this.narrations[letterId] && this.narrationUrls[letterId]) {
      console.log(`Lazy loading narration for letter ${letterId}...`);
      this.loadNarration(letterId, this.narrationUrls[letterId]);
    }

    const narration = this.narrations[letterId];
    if (!narration) {
      console.warn(`Narration for letter ${letterId} not loaded (and no URL registered)`);
      return;
    }

    // Duck the background theme
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.DUCKING_VOLUME, AUDIO.FADE_DURATION);
    }

    // Play the narration
    narration.play();
    this.currentNarration = narration;
    console.log(`Playing narration for letter ${letterId}`);
  }

  stopNarration() {
    if (this.currentNarration) {
      this.currentNarration.stop();
      this.currentNarration = null;
    }

    // Restore theme volume
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.fade(this.backgroundTheme.volume(), AUDIO.THEME_VOLUME, AUDIO.FADE_DURATION);
    }
  }

  pause() {
    // Pause background theme
    if (this.backgroundTheme && this.backgroundTheme.playing()) {
      this.backgroundTheme.pause();
    }

    // Pause current narration
    if (this.currentNarration && this.currentNarration.playing()) {
      this.currentNarration.pause();
    }

    console.log('Audio paused');
  }

  resume() {
    // Resume background theme
    if (this.backgroundTheme && !this.backgroundTheme.playing()) {
      this.backgroundTheme.play();
    }

    // Resume current narration
    if (this.currentNarration && !this.currentNarration.playing()) {
      this.currentNarration.play();
    }

    console.log('Audio resumed');
  }
}

export const audioEngine = new AudioEngine();
