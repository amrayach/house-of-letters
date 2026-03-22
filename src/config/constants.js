/**
 * Application-wide constants and configuration
 */

// Scene & Rendering
export const SCENE = {
  BACKGROUND_COLOR: 0x000000,
  FOG_NEAR: 1,
  FOG_FAR: 100,
  ZONE_LERP_SPEED: 2.0,
};

// Zone-adaptive atmosphere colors (blue → green → amber → red across the archive Z axis)
export const ATMOSPHERE_ZONES = [
  { id: 1, zMin: -Infinity, zMax: -15, ambientColor: 0x1a1a2e, directionalColor: 0x6688cc, fogColor: 0x0a0a18 },
  { id: 2, zMin: -15,       zMax: 38,  ambientColor: 0x1a2218, directionalColor: 0x7ba67a, fogColor: 0x0a100a },
  { id: 3, zMin: 38,        zMax: 90,  ambientColor: 0x221a10, directionalColor: 0xcc9944, fogColor: 0x18100a },
  { id: 4, zMin: 90,        zMax: Infinity, ambientColor: 0x221414, directionalColor: 0xcc6644, fogColor: 0x180a0a },
];

// Post-processing tuning (bloom + vignette only — stays within 60fps budget)
export const POST_PROCESSING = {
  BLOOM_INTENSITY: 0.3,
  BLOOM_LUMINANCE_THRESHOLD: 0.6,
  BLOOM_LUMINANCE_SMOOTHING: 0.7,
  VIGNETTE_DARKNESS: 0.4,
  VIGNETTE_OFFSET: 0.3,
};

// Animated dust particles
export const DUST = {
  COUNT: 500,
  SPREAD_X: 40,
  SPREAD_Y: 10,
  SPREAD_Z: 200,
  CENTER_Z: 10,
  SIZE: 0.05,
  OPACITY: 0.4,
  DRIFT_SPEED: 0.15,
  DRIFT_AMPLITUDE_X: 0.03,
  DRIFT_AMPLITUDE_Y: 0.02,
  DRIFT_AMPLITUDE_Z: 0.01,
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
  INITIAL_POSITION: { x: 0, y: 1.6, z: -50 } // Near paper 1 (z=-42), facing into the archive
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
  NARRATION_FADE_NEAR: 2,      // full volume at this distance
  NARRATION_FADE_FAR: 10,      // volume reaches 0 at this distance
  NARRATION_FADE_EXPONENT: 1.5  // falloff curve (1=linear, >1=faster initial drop)
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
  ORBIT_FOV: 45,
  ORBIT_MIN_DISTANCE: 2,
  ORBIT_MAX_DISTANCE: 40,
  ORBIT_DAMPING_FACTOR: 0.08,
  ORBIT_AUTO_ROTATE_SPEED: 0.5,
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

export const TIMELINE = {
  GROUND_Y: 0.06,
  LABEL_Y: 0.085,
  SPINE_HEAD_PADDING: 18,
  SPINE_TAIL_PADDING: 18,
  SPINE_RADIAL_SEGMENTS: 10,
  SPINE_SEGMENTS: 720,
  SPINE_CORE_RADIUS: 0.04,
  SPINE_HALO_RADIUS: 0.10,
  SPINE_DISTORTED_RADIUS: 0.14,
  ANCHOR_CORE_RADIUS: 0.22,
  ANCHOR_RING_INNER_RADIUS: 0.34,
  ANCHOR_RING_OUTER_RADIUS: 0.48,
  FOCUS_SPEED_MAX: 4.0,
  AMBIENT_CORE_OPACITY: 0.16,
  AMBIENT_HALO_OPACITY: 0.08,
  AMBIENT_DISTORTED_OPACITY: 0.14,
  FOCUSED_CORE_OPACITY: 0.84,
  FOCUSED_HALO_OPACITY: 0.34,
  AMBIENT_ANCHOR_OPACITY: 0.22,
  AMBIENT_ANCHOR_RING_OPACITY: 0.12,
  FOCUSED_ANCHOR_OPACITY: 0.92,
  FOCUSED_ANCHOR_RING_OPACITY: 0.34,
  LABEL_AMBIENT_OPACITY: 0.18,
  LABEL_FOCUSED_OPACITY: 0.92,
  LABEL_AMBIENT_HEIGHT: 0.64,
  LABEL_FOCUSED_HEIGHT: 0.48,
  LABEL_MAX_WIDTH: 12,
  LABEL_OFFSET_FROM_ANCHOR: 1.4,
  LABEL_LATERAL_OFFSET: 0,
  LABEL_RESOLUTION_SCALE: 256,
  LABEL_TEXTURE_ANISOTROPY: 8,
  LABEL_BACKGROUND: 'rgba(8, 12, 18, 0.78)',
  LABEL_BORDER: 'rgba(214, 188, 127, 0.46)',
  LABEL_TEXT: '#f6eed0',
  LABEL_FONT_FAMILY: 'Georgia, "Times New Roman", serif',
  COLOR_CORE: 0xcbb581,
  COLOR_HALO: 0x6f6a53,
  COLOR_FOCUSED: 0xf2dda0,
  DISTORTION_AMPLITUDE: 0.75,
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
