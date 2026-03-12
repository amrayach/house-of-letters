/**
 * Application-wide constants and configuration
 */

// Scene & Rendering
export const SCENE = {
  BACKGROUND_COLOR: 0x000000,
  FOG_NEAR: 1,
  FOG_FAR: 100
};

export const RENDERER_QUALITY = {
  IMMERSIVE_PIXEL_RATIO_MAX: 1.5,
  INSPECT_PIXEL_RATIO_MAX: 2.0,
  LETTER_TEXTURE_ANISOTROPY: 8,
};

// Camera
export const CAMERA = {
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,
  INITIAL_POSITION: { x: 0, y: 1.6, z: -155 } // Start 5 units behind letter 1 (at z: -150)
};

// Models
export const MODEL = {
  SCALE: 8,
  GRID_SCALE: 4.0
};

// Audio
export const AUDIO = {
  THEME_PATH: '/assets/audio/theme_1.mp3',
  THEME_VOLUME: 1.0,
  NARRATION_VOLUME: 1.0,
  FADE_DURATION: 500,
  DUCKING_VOLUME: 0.3,
  MAX_DISTANCE: 10 // Spatial audio falloff distance
};

// Interaction
export const INTERACTION = {
  CHECK_RADIUS: 15.0,
  TRIGGER_PADDING_WORLD: {
    x: 0.6,
    y: 0.25,
    z: 1.1,
  },
  VIEW_ALIGNMENT_WEIGHT: 0.9,
  FACING_ALIGNMENT_WEIGHT: 0.75,
  RAYCAST_BONUS_WEIGHT: 1.25,
  STICKY_BIAS: 0.1,
  SWITCH_MARGIN: 0.15,
};

export const INSPECT = {
  FOV: 30,
  FRAMING_PADDING: 1.18,
  TRANSITION_DURATION: 0.42,
  MIN_DISTANCE: 0.85,
  MAX_DISTANCE: 4.5,
  MIN_ZOOM: 0.5,
  DEFAULT_ZOOM: 1,
  MAX_ZOOM: 3,
  ZOOM_STEP: 0.25,
};

// Animation
export const ANIMATION = {
  LETTER_ANIMATION_RADIUS: 15.0, // Only animate letters within this distance
  ROTATION_SPEED: 0.1,
  ROTATION_AMPLITUDE: 0.15,
  SWAY_SPEED: 0.2,
  SWAY_AMPLITUDE: 0.03,
  BOB_SPEED: 0.3,
  BOB_AMPLITUDE: 0.08
};

// Asset Paths
export const ASSETS = {
  MODELS: '/assets/models',
  TEXTURES: '/assets/textures',
  AUDIO: '/assets/audio',
  LETTERS: '/assets/letters'
};

// Timeout for loading assets (milliseconds). Increase if clients have slow connections.
// 10 minutes for slow connections (e.g., Lebanon)
export const LOADING_TIMEOUT_MS = 600000; // 10 minutes

// Retry configuration for slow connections
export const LOADING_RETRY = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000
};
