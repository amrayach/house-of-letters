/**
 * Application-wide constants and configuration
 */

// Scene & Rendering
export const SCENE = {
  BACKGROUND_COLOR: 0x000000,
  FOG_NEAR: 1,
  FOG_FAR: 100
};

// Camera
export const CAMERA = {
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,
  INITIAL_POSITION: { x: 0, y: 1.6, z: 0 }
};

// Models
export const MODEL = {
  SCALE: 8,
  GRID_SCALE: 4.0
};

// Audio
export const AUDIO = {
  THEME_PATH: '/assets/audio/theme_1.wav',
  THEME_VOLUME: 1.0,
  NARRATION_VOLUME: 1.0,
  FADE_DURATION: 500,
  DUCKING_VOLUME: 0.3
};

// Interaction
export const INTERACTION = {
  PROXIMITY_THRESHOLD: 5,
  ACTIVATION_DISTANCE: 3
};

// Asset Paths
export const ASSETS = {
  MODELS: '/assets/models',
  TEXTURES: '/assets/textures',
  AUDIO: '/assets/audio',
  LETTERS: '/assets/letters'
};
