import * as THREE from 'three';
import { initScene } from '@renderer/sceneSetup.js';
import { initLighting } from '@renderer/lighting.js';
import { initControls, setWalkingSpeed, isBirdEyeView, exitBirdEyeView } from '@renderer/controls.js';
import { createGroundTimeline } from '@renderer/groundTimeline.js';
import { loadLetters } from '@renderer/letters.js';
import { LoadingScene } from '@renderer/loadingScene.js';
import { initAtmosphere, updateAtmosphere } from '@renderer/atmosphere.js';
import { createDust, updateDust } from '@renderer/particles.js';
import { audioEngine } from '@audio/audioEngine.js';
import { themeMixer } from '@audio/themeMixer.js';
import { ProximityManager } from '@interaction/proximityManager.js';
import { AUDIO, ANIMATION, INSPECT, LOADING_TIMEOUT_MS, TIMELINE, VELOCITY } from '@config/constants.js';
import { computeWalkingSpeed } from '@config/zoneVelocity.js';
import { START_SHELL_CONTENT } from '@config/startShellContent.js';
import { LANDING_CONTENT } from '@config/landingContent.js';
import lettersData from '@data/letters.json';
import { validatedProvisionalChronology } from '@data/provisionalChronology.js';
import { diag } from '@utils/diagnostics.js';
import * as orbitInspect from './renderer/orbitInspect.js';

const LETTER_LOAD_STAGE = Object.freeze({
  CORE: 'core',
  DEFERRED: 'deferred',
});

const LETTER_LOAD_STAGE_STATUS = Object.freeze({
  IDLE: 'idle',
  PENDING: 'pending',
  READY: 'ready',
  DEGRADED: 'degraded',
  FAILED: 'failed',
});

const CORE_ENTRY_ZONES = new Set([1, 2]);

function resolveLetterLoadStage(letter) {
  return CORE_ENTRY_ZONES.has(letter.zone)
    ? LETTER_LOAD_STAGE.CORE
    : LETTER_LOAD_STAGE.DEFERRED;
}

// Keep staged boot grouping owned by main.js so later slices can change startup
// sequencing without widening loader, controls, or audio ownership.
const letterLoadStageData = (() => {
  const stagedLetters = {
    [LETTER_LOAD_STAGE.CORE]: [],
    [LETTER_LOAD_STAGE.DEFERRED]: [],
  };

  lettersData.forEach((letter) => {
    stagedLetters[resolveLetterLoadStage(letter)].push(letter);
  });

  return Object.freeze({
    [LETTER_LOAD_STAGE.CORE]: Object.freeze([...stagedLetters[LETTER_LOAD_STAGE.CORE]]),
    [LETTER_LOAD_STAGE.DEFERRED]: Object.freeze([...stagedLetters[LETTER_LOAD_STAGE.DEFERRED]]),
  });
})();
const deferredRequestedLetterIds = Object.freeze(
  letterLoadStageData[LETTER_LOAD_STAGE.DEFERRED].map((letter) => letter.id),
);
const timelineRequiredLetterIds = validatedProvisionalChronology
  ? new Set(validatedProvisionalChronology.flatMap((group) => group.letterIds))
  : null;
const chronologyLabelByLetterId = (() => {
  if (!validatedProvisionalChronology) return new Map();
  const map = new Map();
  for (const group of validatedProvisionalChronology) {
    for (const id of group.letterIds) {
      map.set(id, group.focusedLabel);
    }
  }
  return map;
})();

// Loading Scene Elements
const loadingSceneContainer = document.getElementById('loading-scene-container');
const loadingProgress = document.getElementById('loading-progress');
const loadingProgressBar = document.getElementById('loading-progress-bar');
const loadingStatus = document.getElementById('loading-status');
const skipBtn = document.getElementById('skip-intro-btn');

// Loading scene created on demand when landing CTA is clicked
let loadingScene = null;

// Main game state
let assetsLoaded = false;
let loadingSceneComplete = false;
const letterLoadStageState = {
  [LETTER_LOAD_STAGE.CORE]: {
    status: LETTER_LOAD_STAGE_STATUS.IDLE,
    totalLetters: letterLoadStageData[LETTER_LOAD_STAGE.CORE].length,
    loadedCount: 0,
    errorMessage: null,
  },
  [LETTER_LOAD_STAGE.DEFERRED]: {
    status: LETTER_LOAD_STAGE_STATUS.IDLE,
    totalLetters: letterLoadStageData[LETTER_LOAD_STAGE.DEFERRED].length,
    loadedCount: 0,
    requestedLetterIds: [...deferredRequestedLetterIds],
    integratedLetterIds: [],
    missingLetterIds: [...deferredRequestedLetterIds],
    statusMessage: '',
    errorMessage: null,
    settledAt: null,
    hasFullCoverage: false,
  },
};

// 0. WebGL capability check — must precede initScene()
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

if (!checkWebGLSupport()) {
  document.getElementById('landing-screen').hidden = true;
  document.getElementById('webgl-fallback').hidden = false;
  // Intentional: halt module execution — WebGL is required for the entire experience
  throw new Error('WebGL not supported');
}

// 1. Initialize Scene (hidden until loading complete)
let scene, camera, renderer, composer, setInspectQuality;
try {
  ({ scene, camera, renderer, composer, setInspectQuality } = initScene());
} catch (e) {
  document.getElementById('landing-screen').hidden = true;
  document.getElementById('webgl-fallback').hidden = false;
  // Intentional: halt module execution — renderer creation failed
  throw e;
}

// 2. Lighting
const lights = initLighting(scene);

// 2b. Atmosphere (zone-adaptive lighting/fog) & dust particles
const dustParticles = createDust(scene);
initAtmosphere(lights, scene.fog);

// 3. Controls
const {
  controls,
  isTouchDevice,
  update: updateControls,
  getVelocity,
  activate: activateControls,
  deactivate: deactivateControls,
  dispose: disposeControls,
  setInspectSuppressed,
} = initControls(camera, renderer.domElement);

// Debug: Speed slider setup
const speedSlider = document.getElementById('speed-slider');
const speedValueDisplay = document.getElementById('speed-value');
const currentSpeedDisplay = document.getElementById('current-speed');
const debugVelocityBoost = document.getElementById('debug-velocity-boost');
const debugPositionDisplay = document.getElementById('debug-position');

let manualSpeedOverride = false;

function handleSpeedSliderInput(e) {
  const speed = parseInt(e.target.value, 10);
  setWalkingSpeed(speed);
  speedValueDisplay.textContent = speed;
  manualSpeedOverride = true;
}

speedSlider.addEventListener('input', handleSpeedSliderInput);

// 4. Load Content (async)
let letterObjects = [];
let proximityManager = null;
let groundTimeline = null;
let displayedActiveLetterId = null;
let currentTargetState = null;
const letterObjectById = new Map();
let deferredLetterLoadPromise = null;
let hasTriggeredDeferredLetterLoad = false;

const UI_STATE = Object.freeze({
  LANDING: 'landing',
  LOADING: 'loading',
  START: 'start',
  ACTIVE: 'active',
  PAUSED: 'paused',
});

const VIEW_MODE = Object.freeze({
  IMMERSIVE: 'immersive',
  INSPECT: 'inspect',
  BIRD_EYE: 'bird-eye',
});

const INSPECT_PHASE = Object.freeze({
  IDLE: 'idle',
  ENTERING: 'entering',
  ACTIVE: 'active',
  EXITING: 'exiting',
});

const POINTER_LOCK_FALLBACK_MS = 1800;
let perfFirstActiveFrame = false; // DEV: one-shot flag for first-frame-after-ACTIVE profiling

const landingScreen = document.getElementById('landing-screen');
const landingCta = document.getElementById('landing-cta');
const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const startKicker = document.getElementById('start-kicker');
const startTitle = document.getElementById('start-title');
const startLede = document.getElementById('start-lede');
const startProjectBlock = document.getElementById('start-project-block');
const startProjectCopy = document.getElementById('start-project-copy');
const startHowToBlock = document.getElementById('start-how-to-block');
const startHowToCopy = document.getElementById('start-how-to-copy');
const startContextBlock = document.getElementById('start-context-block');
const startContextCopy = document.getElementById('start-context-copy');
const startBtn = document.getElementById('start-btn');
const startStatus = document.getElementById('start-status');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const pauseStatus = document.getElementById('pause-status');
const pauseBtn = document.getElementById('mobile-pause-btn');
const touchDeferredStatus = document.getElementById('touch-deferred-status');
const deferredLoadNotice = document.getElementById('deferred-load-notice');
const deferredLoadNoticeText = document.getElementById('deferred-load-notice-text');
const deferredLoadNoticeClose = document.getElementById('deferred-load-notice-close');
const reticle = document.getElementById('reticle');
const controlsHint = document.getElementById('controls-hint');
const debugPanel = document.getElementById('debug-panel');
const previewContainer = document.getElementById('letter-preview');
const frontImage = document.getElementById('preview-front');
const backImage = document.getElementById('preview-back');
const subtitleContainer = document.getElementById('subtitle-container');
const birdEyeIndicator = document.getElementById('bird-eye-indicator');
const touchJoystickContainer = document.getElementById('touch-joystick-container');
const touchLookArea = document.getElementById('touch-look-area');
const inspectPrompt = document.getElementById('inspect-prompt');
const inspectPromptCopy = document.getElementById('inspect-prompt-copy');
const inspectTouchBtn = document.getElementById('inspect-touch-btn');
const inspectOverlay = document.getElementById('inspect-overlay');
const inspectTitle = document.getElementById('inspect-title');
const inspectStatus = document.getElementById('inspect-status');
const inspectSideBadge = document.getElementById('inspect-side-badge');
const inspectScanViewport = document.getElementById('inspect-scan-viewport');
const inspectScanStage = document.getElementById('inspect-scan-stage');
const inspectScanImage = document.getElementById('inspect-scan-image');
const inspectHeaderExitBtn = document.getElementById('inspect-header-exit-btn');
const inspectFrontBtn = document.getElementById('inspect-front-btn');
const inspectBackBtn = document.getElementById('inspect-back-btn');
const inspectZoomOutBtn = document.getElementById('inspect-zoom-out-btn');
const inspectZoomResetBtn = document.getElementById('inspect-zoom-reset-btn');
const inspectZoomInBtn = document.getElementById('inspect-zoom-in-btn');
const inspectExitBtn = document.getElementById('inspect-exit-btn');
const inspectOrbitViewport = document.getElementById('inspect-orbit-viewport');
const inspectOrbitToggleBtn = document.getElementById('inspect-orbit-toggle-btn');
const letterDataById = new Map(lettersData.map((letter) => [letter.id, letter]));
const subtitleElement = document.createElement('div');
subtitleElement.className = 'subtitle';
subtitleElement.hidden = true;
subtitleContainer.appendChild(subtitleElement);

let uiState = UI_STATE.LANDING;
let viewMode = VIEW_MODE.IMMERSIVE;
let hasBootstrappedExperience = false;
let pendingDesktopState = UI_STATE.START;
let pointerLockFallbackTimer = null;
let isTransitioningOutOfLoading = false;
let isTransitioningOutOfStart = false;
const inspectState = {
  phase: INSPECT_PHASE.IDLE,
  letterId: null,
  side: 'front',
  subMode: 'scan',
  zoom: INSPECT.DEFAULT_ZOOM,
  returnPose: null,
  restorePointerLockOnExit: false,
  transitionFrom: null,
  transitionTo: null,
  transitionElapsed: 0,
  transitionDuration: INSPECT.TRANSITION_DURATION,
};
let orbitInitialized = false;
const inspectScratchCamera = new THREE.PerspectiveCamera(INSPECT.FOV, camera.aspect, camera.near, camera.far);
const inspectViewSize = new THREE.Vector2();
const inspectCenterWorld = new THREE.Vector3();
const inspectAnchorWorld = new THREE.Vector3();
const inspectDirectionWorld = new THREE.Vector3();
const inspectTargetPosition = new THREE.Vector3();
const inspectLookObject = new THREE.Object3D();

const debugQuery = new URLSearchParams(window.location.search);
const debugParamValue = debugQuery.get('debug');
const hasDebugParam = debugQuery.has('debug');
const storedDebugPreference = (() => {
  try {
    return window.localStorage.getItem('hod:debug');
  } catch {
    return null;
  }
})();
const debugUiEnabled = !isTouchDevice && (
  import.meta.env.DEV
  || (hasDebugParam && debugParamValue !== '0')
  || (!hasDebugParam && storedDebugPreference === '1')
);
const DEFAULT_START_STATUS = isTouchDevice
  ? 'Tap to enter. Touch controls appear once the archive is active.'
  : 'Click to enter. The archive will take control of your pointer.';
const DEFAULT_PAUSE_STATUS = isTouchDevice
  ? 'Tap Resume to return to the archive.'
  : 'Click Resume to recapture your pointer and return to the archive.';
const DEFAULT_DESKTOP_CONTROLS_HINT = 'WASD to Move • Mouse to Look • B: Bird\'s Eye View';

function createEmptyTargetState() {
  return {
    candidateId: null,
    candidateSide: null,
    candidateScore: null,
    activeId: null,
    activeSide: null,
    activeScore: null,
  };
}

const EMPTY_TARGET_STATE = Object.freeze(createEmptyTargetState());
currentTargetState = EMPTY_TARGET_STATE;

function computeNarrationVolume(letterId) {
  if (!letterId) return 0;
  const letterObj = letterObjectById.get(letterId);
  if (!letterObj) return 0;
  const distance = camera.position.distanceTo(letterObj.position);
  if (distance <= AUDIO.NARRATION_FADE_NEAR) return AUDIO.NARRATION_VOLUME;
  if (distance >= AUDIO.NARRATION_FADE_FAR) return 0;
  const t = (distance - AUDIO.NARRATION_FADE_NEAR) / (AUDIO.NARRATION_FADE_FAR - AUDIO.NARRATION_FADE_NEAR);
  return AUDIO.NARRATION_VOLUME * Math.pow(1 - t, AUDIO.NARRATION_FADE_EXPONENT);
}

function getLetterImagePaths(letterData) {
  return {
    frontPath: letterData.frontImage || `/assets/letters/${letterData.id}.jpg`,
    backPath: letterData.backImage || `/assets/letters/${letterData.id}-${letterData.id}.jpg`,
  };
}

function captureCameraPose() {
  return {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    fov: camera.fov,
  };
}

function setCameraFov(nextFov) {
  if (Math.abs(camera.fov - nextFov) > 0.001) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
}

function applyCameraPose(pose) {
  if (!pose) {
    return;
  }

  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  setCameraFov(pose.fov);
}

function resetInspectState() {
  inspectState.phase = INSPECT_PHASE.IDLE;
  inspectState.letterId = null;
  inspectState.side = 'front';
  inspectState.subMode = 'scan';
  inspectState.zoom = INSPECT.DEFAULT_ZOOM;
  inspectState.returnPose = null;
  inspectState.restorePointerLockOnExit = false;
  inspectState.transitionFrom = null;
  inspectState.transitionTo = null;
  inspectState.transitionElapsed = 0;
  inspectState.transitionDuration = INSPECT.TRANSITION_DURATION;
  if (orbitInspect.isActive()) orbitInspect.hide();
}

function getLetterObjectById(letterId) {
  return letterObjectById.get(letterId) || null;
}

function getGroundTimelineCoverageStatus() {
  if (!validatedProvisionalChronology) {
    return 'disabled';
  }

  return hasRequiredGroundTimelineCoverage() ? 'full' : 'incomplete';
}

function getDeferredStageStatusText() {
  const deferredStage = letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED];

  if (deferredStage.status === LETTER_LOAD_STAGE_STATUS.DEGRADED) {
    return deferredStage.statusMessage || 'Some later letters are unavailable this session.';
  }

  if (deferredStage.status === LETTER_LOAD_STAGE_STATUS.FAILED) {
    return deferredStage.statusMessage || 'Later letters could not be loaded. You can keep exploring the core archive.';
  }

  return '';
}

function syncTouchDeferredStatusUi(deferredStatusText = getDeferredStageStatusText()) {
  if (!touchDeferredStatus) {
    return;
  }

  touchDeferredStatus.dataset.deferredLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED].status;
  touchDeferredStatus.textContent = deferredStatusText;

  const showTouchDeferredStatus = isTouchDevice
    && uiState === UI_STATE.ACTIVE
    && viewMode === VIEW_MODE.IMMERSIVE
    && Boolean(deferredStatusText);

  setElementHidden(touchDeferredStatus, !showTouchDeferredStatus);
}

function syncLetterLoadStageUi() {
  document.body.dataset.coreLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.CORE].status;
  document.body.dataset.deferredLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED].status;
  document.body.dataset.groundTimelineCoverage = getGroundTimelineCoverageStatus();

  const deferredStatusText = getDeferredStageStatusText();

  if (controlsHint) {
    controlsHint.setAttribute('aria-live', 'polite');
    controlsHint.dataset.deferredLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED].status;
    controlsHint.textContent = deferredStatusText
      ? `${DEFAULT_DESKTOP_CONTROLS_HINT} • ${deferredStatusText}`
      : DEFAULT_DESKTOP_CONTROLS_HINT;
  }

  syncTouchDeferredStatusUi(deferredStatusText);
}

let deferredLoadNoticeTimer = null;

function showDeferredLoadNotice(message) {
  if (!deferredLoadNotice || !deferredLoadNoticeText) return;

  if (deferredLoadNoticeTimer) {
    clearTimeout(deferredLoadNoticeTimer);
    deferredLoadNoticeTimer = null;
  }

  deferredLoadNoticeText.textContent = message;
  deferredLoadNotice.hidden = false;

  // Force reflow before adding class for CSS transition
  void deferredLoadNotice.offsetHeight;
  deferredLoadNotice.classList.add('notice-visible');

  function dismissNotice() {
    deferredLoadNotice.classList.remove('notice-visible');
    deferredLoadNoticeTimer = setTimeout(() => {
      deferredLoadNotice.hidden = true;
      deferredLoadNoticeTimer = null;
    }, 400);
  }

  deferredLoadNoticeTimer = setTimeout(dismissNotice, 8000);

  if (deferredLoadNoticeClose) {
    deferredLoadNoticeClose.onclick = () => {
      if (deferredLoadNoticeTimer) {
        clearTimeout(deferredLoadNoticeTimer);
      }
      dismissNotice();
    };
  }
}

function setLetterLoadStageStatus(stage, nextStatus, updates = {}) {
  const stageState = letterLoadStageState[stage];

  if (!stageState) {
    return null;
  }

  stageState.status = nextStatus;
  Object.assign(stageState, updates);
  syncLetterLoadStageUi();
  return stageState;
}

function getIntegratedLetterIds(letters) {
  if (!Array.isArray(letters) || letters.length === 0) {
    return [];
  }

  return [...new Set(
    letters
      .map((letter) => letter?.userData?.id)
      .filter((letterId) => Number.isInteger(letterId)),
  )];
}

function hasRequiredGroundTimelineCoverage() {
  if (!timelineRequiredLetterIds) {
    return false;
  }

  for (const letterId of timelineRequiredLetterIds) {
    if (!letterObjectById.has(letterId)) {
      return false;
    }
  }

  return true;
}

let groundTimelineCoveredGroupCount = 0;

function tryInitializeGroundTimeline() {
  if (!validatedProvisionalChronology) return false;

  // Filter to only chronology groups whose letters are all loaded
  const available = validatedProvisionalChronology.filter((group) =>
    group.letterIds.every((id) => letterObjectById.has(id)),
  );

  if (available.length === 0) return false;

  // Already initialized with the same or more coverage — skip
  if (groundTimeline && available.length <= groundTimelineCoveredGroupCount) return true;

  // Dispose old partial timeline before rebuilding with expanded coverage
  if (groundTimeline) {
    diag.log('state', `groundTimeline rebuild: ${groundTimelineCoveredGroupCount}→${available.length} groups`);
    groundTimeline.dispose();
    groundTimeline = null;
  }

  groundTimeline = createGroundTimeline({
    scene,
    letters: letterObjects,
    chronology: available,
    constants: TIMELINE,
  });

  groundTimelineCoveredGroupCount = available.length;
  diag.log('state', `groundTimeline init ${available.length}/${validatedProvisionalChronology.length} groups`);
  return true;
}

function integrateLateLoadedLetters(loadedLetters) {
  if (!Array.isArray(loadedLetters) || loadedLetters.length === 0) {
    tryInitializeGroundTimeline();
    return [];
  }

  const integratedLetters = [];

  loadedLetters.forEach((letter) => {
    const letterId = letter?.userData?.id;

    if (!letter || !letterId || letterObjectById.has(letterId)) {
      return;
    }

    letterObjectById.set(letterId, letter);
    integratedLetters.push(letter);
  });

  if (integratedLetters.length === 0) {
    tryInitializeGroundTimeline();
    return integratedLetters;
  }

  if (proximityManager) {
    proximityManager.addLetters(integratedLetters);
  } else {
    letterObjects.push(...integratedLetters);
    proximityManager = new ProximityManager(camera, letterObjects);
  }

  tryInitializeGroundTimeline();
  return integratedLetters;
}

function finalizeDeferredLetterLoad({ loadedLetters = [], error = null } = {}) {
  const integratedLetters = error ? [] : integrateLateLoadedLetters(loadedLetters);
  const integratedLetterIds = getIntegratedLetterIds(integratedLetters);
  const integratedLetterIdSet = new Set(integratedLetterIds);
  const missingLetterIds = deferredRequestedLetterIds.filter((letterId) => !integratedLetterIdSet.has(letterId));
  const hasFullCoverage = hasRequiredGroundTimelineCoverage();
  let status = LETTER_LOAD_STAGE_STATUS.READY;
  let statusMessage = '';

  if (error) {
    status = LETTER_LOAD_STAGE_STATUS.FAILED;
    statusMessage = 'Later letters could not be loaded. You can keep exploring the core archive.';
  } else if (missingLetterIds.length > 0) {
    status = integratedLetterIds.length > 0
      ? LETTER_LOAD_STAGE_STATUS.DEGRADED
      : LETTER_LOAD_STAGE_STATUS.FAILED;
    statusMessage = integratedLetterIds.length > 0
      ? 'Some later letters are unavailable this session.'
      : 'Later letters could not be loaded. You can keep exploring the core archive.';
  }

  setLetterLoadStageStatus(LETTER_LOAD_STAGE.DEFERRED, status, {
    loadedCount: integratedLetterIds.length,
    integratedLetterIds,
    missingLetterIds,
    statusMessage,
    errorMessage: error?.message || null,
    settledAt: Date.now(),
    hasFullCoverage,
  });

  if (status !== LETTER_LOAD_STAGE_STATUS.READY) {
    showDeferredLoadNotice(statusMessage);
  }

  if (missingLetterIds.length > 0) {
    console.warn(
      `Deferred background load settled as ${status}. Missing late letters: ${missingLetterIds.join(', ')}`,
    );
  }

  if (!hasFullCoverage && validatedProvisionalChronology) {
    console.log('[ground-timeline] Coverage incomplete after deferred load; timeline remains disabled.');
  }

  return integratedLetters;
}

function startDeferredLetterLoad() {
  if (hasTriggeredDeferredLetterLoad) {
    return deferredLetterLoadPromise;
  }

  hasTriggeredDeferredLetterLoad = true;

  const deferredLetters = letterLoadStageData[LETTER_LOAD_STAGE.DEFERRED];

  if (deferredLetters.length === 0) {
    setLetterLoadStageStatus(LETTER_LOAD_STAGE.DEFERRED, LETTER_LOAD_STAGE_STATUS.READY, {
      loadedCount: 0,
      integratedLetterIds: [],
      missingLetterIds: [],
      statusMessage: '',
      errorMessage: null,
      settledAt: Date.now(),
      hasFullCoverage: hasRequiredGroundTimelineCoverage(),
    });
    tryInitializeGroundTimeline();
    deferredLetterLoadPromise = Promise.resolve([]);
    return deferredLetterLoadPromise;
  }

  setLetterLoadStageStatus(LETTER_LOAD_STAGE.DEFERRED, LETTER_LOAD_STAGE_STATUS.PENDING, {
    statusMessage: '',
    errorMessage: null,
    settledAt: null,
  });
  console.log(`Starting deferred background load for ${deferredLetters.length} late letters.`);

  deferredLetterLoadPromise = loadLetters(scene, deferredLetters, renderer)
    .then((loadedLetters) => {
      const integratedLetters = finalizeDeferredLetterLoad({ loadedLetters });

      console.log(
        `Deferred background load integrated ${integratedLetters.length}/${deferredLetters.length} letters.`,
      );

      return integratedLetters;
    })
    .catch((error) => {
      console.error('Deferred letter load failed:', error);
      return finalizeDeferredLetterLoad({ error });
    });

  return deferredLetterLoadPromise;
}

function resolveInspectSide(letter, requestedSide) {
  const readableSides = letter?.userData?.interaction?.readableSides;

  if (!readableSides) {
    return null;
  }

  if (requestedSide && readableSides[requestedSide]) {
    return requestedSide;
  }

  if (readableSides.front) {
    return 'front';
  }

  if (readableSides.back) {
    return 'back';
  }

  const fallbackSide = Object.keys(readableSides)[0];
  return fallbackSide || null;
}

function buildInspectTarget(letter, requestedSide) {
  const resolvedSide = resolveInspectSide(letter, requestedSide);

  if (!resolvedSide) {
    return null;
  }

  const side = letter.userData.interaction.readableSides[resolvedSide];

  inspectCenterWorld.copy(side.center);
  letter.localToWorld(inspectCenterWorld);

  inspectAnchorWorld.copy(side.inspectAnchorLocal || side.center);
  letter.localToWorld(inspectAnchorWorld);

  inspectDirectionWorld.copy(inspectAnchorWorld).sub(inspectCenterWorld);

  if (inspectDirectionWorld.lengthSq() === 0) {
    inspectDirectionWorld.copy(side.normal).transformDirection(letter.matrixWorld);
  } else {
    inspectDirectionWorld.normalize();
  }

  inspectScratchCamera.aspect = camera.aspect;
  inspectScratchCamera.fov = INSPECT.FOV;
  inspectScratchCamera.updateProjectionMatrix();
  inspectScratchCamera.getViewSize(1, inspectViewSize);

  const widthAtUnit = Math.max(inspectViewSize.x, 0.001);
  const heightAtUnit = Math.max(inspectViewSize.y, 0.001);
  const sideWidth = Math.max((side.size?.x || 0.1) * letter.scale.x, 0.05);
  const sideHeight = Math.max((side.size?.y || 0.1) * letter.scale.y, 0.05);
  const anchorDistance = inspectAnchorWorld.distanceTo(inspectCenterWorld);
  const framedDistance = Math.max(
    (sideWidth * INSPECT.FRAMING_PADDING) / widthAtUnit,
    (sideHeight * INSPECT.FRAMING_PADDING) / heightAtUnit,
    anchorDistance,
  );
  const inspectDistance = THREE.MathUtils.clamp(
    framedDistance,
    INSPECT.MIN_DISTANCE,
    INSPECT.MAX_DISTANCE,
  );

  inspectTargetPosition.copy(inspectCenterWorld).addScaledVector(inspectDirectionWorld, inspectDistance);
  inspectLookObject.position.copy(inspectTargetPosition);
  inspectLookObject.lookAt(inspectCenterWorld);

  return {
    letterId: letter.userData.id,
    side: resolvedSide,
    pose: {
      position: inspectTargetPosition.clone(),
      quaternion: inspectLookObject.quaternion.clone(),
      fov: INSPECT.FOV,
    },
  };
}

function getInspectStatusText() {
  if (inspectState.phase === INSPECT_PHASE.ENTERING) {
    return 'Aligning inspect view...';
  }

  if (inspectState.phase === INSPECT_PHASE.EXITING) {
    return 'Returning to the archive...';
  }

  if (inspectState.subMode === 'orbit') {
    return isTouchDevice
      ? 'Drag to rotate, pinch to zoom. Tap Scan for flat view, Exit to return.'
      : 'Drag to rotate, scroll to zoom. Press T for scan view, E to exit.';
  }

  return isTouchDevice
    ? 'Swipe the scan, use the controls below, and tap Exit to return.'
    : 'Pointer released for inspection. Scroll the scan, press T for 3D, E to exit.';
}

function getInspectViewportContentBox() {
  if (!inspectScanViewport) {
    return null;
  }

  const stageStyle = inspectScanStage
    ? window.getComputedStyle(inspectScanStage)
    : null;
  const horizontalPadding = stageStyle
    ? parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight)
    : 0;
  const verticalPadding = stageStyle
    ? parseFloat(stageStyle.paddingTop) + parseFloat(stageStyle.paddingBottom)
    : 0;

  return {
    width: Math.max(inspectScanViewport.clientWidth - horizontalPadding, 1),
    height: Math.max(inspectScanViewport.clientHeight - verticalPadding, 1),
  };
}

function updateInspectZoomUI() {
  if (!inspectScanImage) {
    return;
  }

  const viewportContentBox = getInspectViewportContentBox();
  const { naturalWidth, naturalHeight } = inspectScanImage;

  if (viewportContentBox && naturalWidth > 0 && naturalHeight > 0) {
    const baseScale = Math.min(
      viewportContentBox.width / naturalWidth,
      viewportContentBox.height / naturalHeight,
    );
    const renderedWidth = Math.max(naturalWidth * baseScale * inspectState.zoom, 1);
    inspectScanImage.style.width = `${renderedWidth}px`;
  } else {
    inspectScanImage.style.width = '';
  }

  const canInteract = inspectState.phase === INSPECT_PHASE.ACTIVE;
  const atMinZoom = inspectState.zoom <= INSPECT.MIN_ZOOM;
  const atDefaultZoom = Math.abs(inspectState.zoom - INSPECT.DEFAULT_ZOOM) <= 0.001;
  const atMaxZoom = inspectState.zoom >= INSPECT.MAX_ZOOM;

  if (inspectZoomOutBtn) {
    inspectZoomOutBtn.disabled = !canInteract || atMinZoom;
  }

  if (inspectZoomResetBtn) {
    inspectZoomResetBtn.disabled = !canInteract || atDefaultZoom;
  }

  if (inspectZoomInBtn) {
    inspectZoomInBtn.disabled = !canInteract || atMaxZoom;
  }
}

function setInspectZoom(nextZoom) {
  inspectState.zoom = THREE.MathUtils.clamp(nextZoom, INSPECT.MIN_ZOOM, INSPECT.MAX_ZOOM);
  updateInspectZoomUI();
}

function updateInspectContent() {
  if (!inspectState.letterId) {
    return;
  }

  const letterData = letterDataById.get(inspectState.letterId);

  if (!letterData) {
    return;
  }

  const { frontPath, backPath } = getLetterImagePaths(letterData);
  const activePath = inspectState.side === 'back' ? backPath : frontPath;

  if (inspectTitle) {
    inspectTitle.textContent = `Letter ${inspectState.letterId}`;
  }

  if (inspectSideBadge) {
    inspectSideBadge.textContent = inspectState.subMode === 'orbit'
      ? '3D'
      : (inspectState.side === 'back' ? 'Back' : 'Front');
  }

  if (inspectStatus) {
    inspectStatus.textContent = getInspectStatusText();
  }

  if (inspectScanImage) {
    if (inspectScanImage.src !== new URL(activePath, window.location.href).href) {
      inspectScanImage.src = activePath;
    }
    inspectScanImage.alt = `Letter ${inspectState.letterId} ${inspectState.side} scan`;
  }

  const canSwitchSides = inspectState.phase === INSPECT_PHASE.ACTIVE;
  const inOrbit = inspectState.subMode === 'orbit';

  if (inspectFrontBtn) {
    inspectFrontBtn.disabled = !canSwitchSides || inOrbit || inspectState.side === 'front';
  }

  if (inspectBackBtn) {
    inspectBackBtn.disabled = !canSwitchSides || inOrbit || inspectState.side === 'back';
  }

  if (inspectExitBtn) {
    inspectExitBtn.disabled = inspectState.phase !== INSPECT_PHASE.ACTIVE;
  }

  if (inspectHeaderExitBtn) {
    inspectHeaderExitBtn.disabled = inspectState.phase !== INSPECT_PHASE.ACTIVE;
  }

  if (inspectOrbitToggleBtn) {
    inspectOrbitToggleBtn.disabled = inspectState.phase !== INSPECT_PHASE.ACTIVE;
  }

  updateInspectZoomUI();
}

document.body.dataset.inputMode = isTouchDevice ? 'touch' : 'desktop';
document.body.dataset.uiState = uiState;
document.body.dataset.viewMode = viewMode;

if (debugUiEnabled) {
  document.body.classList.add('debug-enabled');
}

function getSubtitleText(letterData) {
  if (letterData.text) return letterData.text;
  const dateRange = chronologyLabelByLetterId.get(letterData.id);
  return dateRange ? `Letter ${letterData.id} · ${dateRange}` : `Letter ${letterData.id}`;
}

function setElementHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
  }
}

function setElementText(element, text = '') {
  if (element) {
    element.textContent = text;
  }
}

function syncStartShellContent() {
  setElementText(startKicker, START_SHELL_CONTENT.kicker);
  setElementText(startTitle, START_SHELL_CONTENT.title);
  setElementText(startLede, START_SHELL_CONTENT.lede);

  setElementText(startProjectCopy, START_SHELL_CONTENT.project);
  setElementHidden(startProjectBlock, !START_SHELL_CONTENT.project);

  setElementText(startHowToCopy, START_SHELL_CONTENT.howToUse);
  setElementHidden(startHowToBlock, !START_SHELL_CONTENT.howToUse);

  setElementText(startContextCopy, START_SHELL_CONTENT.context);
  setElementHidden(startContextBlock, !START_SHELL_CONTENT.context);
}

function syncLandingContent() {
  if (!landingScreen) return;
  const subtitleEl = landingScreen.querySelector('.landing-subtitle');
  if (subtitleEl) subtitleEl.textContent = LANDING_CONTENT.subtitle;

  LANDING_CONTENT.panels.forEach((panel) => {
    const panelEl = landingScreen.querySelector(`[data-panel="${panel.id}"]`);
    if (!panelEl) return;
    const body = panelEl.querySelector('.landing-panel-body');
    const kicker = panelEl.querySelector('.shell-kicker');
    const readMore = panelEl.querySelector('.landing-read-more');
    if (kicker) kicker.textContent = panel.kicker;
    if (body) body.textContent = panel.body;
    // Show "Read more" only if text overflows collapsed height
    if (body && readMore) {
      requestAnimationFrame(() => {
        if (body.scrollHeight > body.clientHeight) {
          readMore.hidden = false;
        }
      });
    }
  });
}

function handleLandingReadMore(e) {
  const panel = e.target.closest('.landing-panel');
  if (!panel) return;
  const expanded = panel.classList.toggle('expanded');
  e.target.textContent = expanded ? 'Read less' : 'Read more';
  e.target.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

let hasLeftLanding = false;

function handleEnterFromLanding() {
  if (hasLeftLanding) return;
  hasLeftLanding = true;

  // Warm up AudioContext on this user gesture (browsers require interaction)
  audioEngine.init();
  audioEngine.setupVisibilityHandler({
    shouldResume: () => uiState === UI_STATE.ACTIVE,
  });

  // Buffer theme MP3 + register narration URLs in parallel with asset loading
  prepareAudio();

  // Reveal loading screen behind landing (needs dimensions for LoadingScene renderer)
  if (loadingScreen) loadingScreen.hidden = false;

  // Fade out landing screen first — let the CSS transition start on the GPU compositor
  // before blocking the main thread with LoadingScene construction
  if (landingScreen) {
    landingScreen.style.opacity = '0';
    // Defer heavy work by 2 frames so the browser paints the fade-out first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        beginLoadingSequence();
      });
    });
    setTimeout(() => {
      landingScreen.hidden = true;
      setUiState(UI_STATE.LOADING);
    }, 600);
  } else {
    beginLoadingSequence();
  }
}

function setStartStatus(message = DEFAULT_START_STATUS) {
  if (startStatus) {
    startStatus.textContent = message;
  }
}

function setPauseStatus(message = DEFAULT_PAUSE_STATUS) {
  if (pauseStatus) {
    pauseStatus.textContent = message;
  }
}

function setStartPendingState(isPending, message = DEFAULT_START_STATUS) {
  startBtn.disabled = isPending;
  startBtn.textContent = isPending ? 'Entering...' : 'Enter Archive';
  startBtn.setAttribute('aria-busy', String(isPending));
  setStartStatus(message);
}

function setPausePendingState(isPending, message = DEFAULT_PAUSE_STATUS) {
  resumeBtn.disabled = isPending;
  resumeBtn.textContent = isPending ? 'Re-entering...' : 'Resume';
  resumeBtn.setAttribute('aria-busy', String(isPending));
  setPauseStatus(message);
}

function setTouchOverlayVisibility(show) {
  if (touchJoystickContainer) {
    touchJoystickContainer.hidden = !show;
    touchJoystickContainer.style.display = show ? 'flex' : 'none';
  }

  if (touchLookArea) {
    touchLookArea.hidden = !show;
    touchLookArea.style.display = show ? 'flex' : 'none';
  }
}

function syncInspectUi() {
  const immersiveActive = uiState === UI_STATE.ACTIVE && viewMode === VIEW_MODE.IMMERSIVE;
  const inspectVisible = uiState === UI_STATE.ACTIVE && inspectState.phase !== INSPECT_PHASE.IDLE;
  const hasCandidate = immersiveActive && Boolean(currentTargetState?.candidateId);
  const promptSide = currentTargetState?.candidateSide === 'back' ? 'Back' : 'Front';

  document.body.dataset.inspectPhase = inspectState.phase;

  if (inspectPromptCopy) {
    inspectPromptCopy.textContent = isTouchDevice
      ? `Inspect ${promptSide.toLowerCase()} side`
      : `Press E to inspect ${promptSide.toLowerCase()} side`;
  }

  setElementHidden(inspectPrompt, !hasCandidate || inspectState.phase !== INSPECT_PHASE.IDLE);
  setElementHidden(inspectTouchBtn, !isTouchDevice || !hasCandidate || inspectState.phase !== INSPECT_PHASE.IDLE);
  setElementHidden(inspectOverlay, !inspectVisible);

  // Toggle scan / orbit viewport visibility
  const showOrbit = inspectVisible && inspectState.phase === INSPECT_PHASE.ACTIVE && inspectState.subMode === 'orbit';
  setElementHidden(inspectScanViewport, showOrbit);
  setElementHidden(inspectOrbitViewport, !showOrbit);

  if (inspectSideBadge) {
    inspectSideBadge.classList.toggle('orbit-active', inspectState.subMode === 'orbit');
  }

  if (inspectOrbitToggleBtn) {
    inspectOrbitToggleBtn.textContent = inspectState.subMode === 'orbit' ? 'Scan' : '3D';
  }

  if (inspectVisible) {
    updateInspectContent();
  }
}

function syncUiChrome() {
  if (import.meta.env.DEV) performance.mark('hol:chrome-begin');
  const isActive = uiState === UI_STATE.ACTIVE;
  const immersiveActive = isActive && viewMode === VIEW_MODE.IMMERSIVE;
  const birdEyeActive = isActive && viewMode === VIEW_MODE.BIRD_EYE;
  const desktopImmersive = immersiveActive && !isTouchDevice;
  const mobileImmersive = immersiveActive && isTouchDevice;
  const shouldShowLetterUi = immersiveActive && inspectState.phase === INSPECT_PHASE.IDLE && Boolean(displayedActiveLetterId);
  const shouldShowDebug = debugUiEnabled && !isTouchDevice && (isActive || uiState === UI_STATE.PAUSED);

  document.body.dataset.uiState = uiState;
  document.body.dataset.viewMode = viewMode;

  // Don't instant-toggle start screen during animated crossfade transitions
  if (!isTransitioningOutOfLoading && !isTransitioningOutOfStart) {
    setElementHidden(startScreen, uiState !== UI_STATE.START);
  }
  setElementHidden(pauseScreen, uiState !== UI_STATE.PAUSED);
  setElementHidden(reticle, !desktopImmersive);
  setElementHidden(controlsHint, !desktopImmersive);
  setElementHidden(birdEyeIndicator, !birdEyeActive);
  setElementHidden(pauseBtn, !mobileImmersive);
  setElementHidden(debugPanel, !shouldShowDebug);

  setTouchOverlayVisibility(mobileImmersive);
  syncTouchDeferredStatusUi();

  previewContainer.hidden = !shouldShowLetterUi;
  previewContainer.classList.toggle('visible', shouldShowLetterUi);
  subtitleElement.hidden = !shouldShowLetterUi || !subtitleElement.textContent;
  syncInspectUi();
  if (import.meta.env.DEV) {
    performance.mark('hol:chrome-done');
    performance.measure('hol:syncUiChrome', 'hol:chrome-begin', 'hol:chrome-done');
  }
}

function setUiState(nextState) {
  if (uiState !== nextState) {
    diag.log('state', `uiState ${uiState}→${nextState}`);
    uiState = nextState;
  }

  syncUiChrome();
}

function setViewMode(nextMode) {
  if (viewMode !== nextMode) {
    diag.log('state', `viewMode ${viewMode}→${nextMode}`);
    viewMode = nextMode;
  }

  setInspectQuality(viewMode === VIEW_MODE.INSPECT);
  syncUiChrome();
}

function clearPointerLockFallbackTimer() {
  if (pointerLockFallbackTimer !== null) {
    window.clearTimeout(pointerLockFallbackTimer);
    pointerLockFallbackTimer = null;
  }
}

function blurActiveElement() {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

function prepareAudio() {
  audioEngine.prepareBackgroundTheme(AUDIO.THEME_PATH);
  lettersData.forEach((letter) => {
    if (letter.narration) {
      audioEngine.registerNarration(letter.id, letter.narration);
    }
  });
}

function bootstrapExperience() {
  if (hasBootstrappedExperience) {
    return;
  }

  // Fallback: init audio if landing CTA didn't run (edge case)
  audioEngine.init();
  audioEngine.setupVisibilityHandler({
    shouldResume: () => uiState === UI_STATE.ACTIVE,
  });
  prepareAudio();

  hasBootstrappedExperience = true;
}

function handlePointerLockFailure(message) {
  clearPointerLockFallbackTimer();
  setStartPendingState(false);
  setPausePendingState(false);

  if (pendingDesktopState === UI_STATE.PAUSED) {
    setPauseStatus(message || 'Pointer lock was unavailable. Click Resume to try again.');
    setUiState(UI_STATE.PAUSED);
  } else {
    setStartStatus(message || 'Pointer lock was unavailable. Click Enter Archive to try again.');
    setUiState(UI_STATE.START);
  }

  audioEngine.pause();
}

function requestDesktopPointerLock(sourceState, waitingMessage, failureMessage) {
  pendingDesktopState = sourceState;
  clearPointerLockFallbackTimer();
  blurActiveElement();

  if (sourceState === UI_STATE.PAUSED) {
    setPausePendingState(true, waitingMessage);
  } else {
    setStartPendingState(true, waitingMessage);
  }

  controls.lock();

  pointerLockFallbackTimer = window.setTimeout(() => {
    if (!controls.isLocked) {
      handlePointerLockFailure(failureMessage);
    }
  }, POINTER_LOCK_FALLBACK_MS);
}

function clearActiveLetterUI() {
  subtitleElement.textContent = '';
  syncUiChrome();
}

function showActiveLetterUI(letterData) {
  const { frontPath, backPath } = getLetterImagePaths(letterData);

  if (frontImage.src !== new URL(frontPath, window.location.href).href) {
    frontImage.src = frontPath;
  }

  if (backImage.src !== new URL(backPath, window.location.href).href) {
    backImage.src = backPath;
  }

  subtitleElement.textContent = getSubtitleText(letterData);
  syncUiChrome();
}

function updateActiveLetterUI(activeLetterId) {
  if (displayedActiveLetterId === activeLetterId) {
    return;
  }

  displayedActiveLetterId = activeLetterId;
  themeMixer.update(activeLetterId);

  if (!activeLetterId) {
    clearActiveLetterUI();
    return;
  }

  const letterData = letterDataById.get(activeLetterId);

  if (!letterData) {
    clearActiveLetterUI();
    return;
  }

  showActiveLetterUI(letterData);
}

function clearRuntimeTargeting() {
  currentTargetState = proximityManager ? proximityManager.clearTargeting() : EMPTY_TARGET_STATE;
  updateActiveLetterUI(currentTargetState?.activeId ?? null);
  syncInspectUi();
  return currentTargetState;
}

function startInspectTransition(targetPose, phase) {
  inspectState.phase = phase;
  inspectState.transitionFrom = captureCameraPose();
  inspectState.transitionTo = targetPose;
  inspectState.transitionElapsed = 0;
  inspectState.transitionDuration = INSPECT.TRANSITION_DURATION;
  updateInspectContent();
}

function enterInspectMode() {
  if (uiState !== UI_STATE.ACTIVE || viewMode !== VIEW_MODE.IMMERSIVE || inspectState.phase !== INSPECT_PHASE.IDLE) {
    return false;
  }

  const candidateId = currentTargetState?.candidateId;

  if (!candidateId) {
    return false;
  }

  const letter = getLetterObjectById(candidateId);

  if (!letter) {
    return false;
  }

  const target = buildInspectTarget(letter, currentTargetState?.candidateSide);

  if (!target) {
    return false;
  }

  inspectState.letterId = target.letterId;
  inspectState.side = target.side;
  inspectState.returnPose = captureCameraPose();
  inspectState.restorePointerLockOnExit = !isTouchDevice && controls.isLocked;
  setInspectZoom(INSPECT.DEFAULT_ZOOM);
  if (inspectScanViewport) {
    inspectScanViewport.scrollTop = 0;
    inspectScanViewport.scrollLeft = 0;
  }
  setInspectSuppressed(true);
  if (inspectState.restorePointerLockOnExit) {
    controls.unlock();
  }
  startInspectTransition(target.pose, INSPECT_PHASE.ENTERING);
  setViewMode(VIEW_MODE.INSPECT);
  clearRuntimeTargeting();
  // Resume narration at current playhead (clearRuntimeTargeting paused it via deactivateNarration)
  audioEngine.activateNarration(inspectState.letterId);
  // Set full volume — per-frame distance-based updates are skipped during inspect
  if (audioEngine.currentNarration) {
    audioEngine.currentNarration.volume(AUDIO.NARRATION_VOLUME);
  }
  diag.log('inspect', `enter id=${inspectState.letterId} side=${inspectState.side}`);
  return true;
}

function exitInspectMode() {
  if (inspectState.phase !== INSPECT_PHASE.ACTIVE || !inspectState.returnPose) {
    return false;
  }

  diag.log('inspect', `exit id=${inspectState.letterId}`);
  startInspectTransition(inspectState.returnPose, INSPECT_PHASE.EXITING);
  syncInspectUi();
  return true;
}

function forceExitInspectMode({ restorePose = true } = {}) {
  if (inspectState.phase === INSPECT_PHASE.IDLE) {
    return false;
  }

  if (restorePose && inspectState.returnPose) {
    applyCameraPose(inspectState.returnPose);
  }

  if (orbitInspect.isActive()) orbitInspect.hide();
  setInspectSuppressed(false);
  resetInspectState();
  setViewMode(VIEW_MODE.IMMERSIVE);
  syncInspectUi();
  return true;
}

function switchInspectSide(nextSide) {
  if (inspectState.phase !== INSPECT_PHASE.ACTIVE || !inspectState.letterId) {
    return false;
  }

  if (inspectState.subMode === 'orbit') {
    return false;
  }

  const letter = getLetterObjectById(inspectState.letterId);

  if (!letter) {
    return false;
  }

  const target = buildInspectTarget(letter, nextSide);

  if (!target || target.side === inspectState.side) {
    return false;
  }

  inspectState.side = target.side;
  if (inspectScanViewport) {
    inspectScanViewport.scrollTop = 0;
    inspectScanViewport.scrollLeft = 0;
  }
  startInspectTransition(target.pose, INSPECT_PHASE.ENTERING);
  syncInspectUi();
  return true;
}

function adjustInspectZoom(direction) {
  if (inspectState.phase !== INSPECT_PHASE.ACTIVE) {
    return false;
  }

  setInspectZoom(inspectState.zoom + (direction * INSPECT.ZOOM_STEP));
  return true;
}

function resetInspectZoom() {
  if (inspectState.phase !== INSPECT_PHASE.ACTIVE) {
    return false;
  }

  setInspectZoom(INSPECT.DEFAULT_ZOOM);
  if (inspectScanViewport) {
    inspectScanViewport.scrollTop = 0;
    inspectScanViewport.scrollLeft = 0;
  }
  return true;
}

function toggleInspectSubMode() {
  if (inspectState.phase !== INSPECT_PHASE.ACTIVE) {
    return false;
  }

  if (inspectState.subMode === 'scan') {
    const letterObject = getLetterObjectById(inspectState.letterId);

    if (!letterObject) {
      return false;
    }

    // Set subMode and sync UI FIRST so the orbit viewport is unhidden
    // before init() — the container needs non-zero dimensions for the
    // renderer canvas to size correctly.
    inspectState.subMode = 'orbit';
    syncInspectUi();

    if (!orbitInitialized) {
      orbitInspect.init(inspectOrbitViewport);
      orbitInitialized = true;
    }

    // Resize to match the now-visible container dimensions
    orbitInspect.resize();
    orbitInspect.showLetter(letterObject);
  } else {
    orbitInspect.hide();
    inspectState.subMode = 'scan';
    syncInspectUi();
  }

  updateInspectContent();
  diag.log('inspect', `subMode → ${inspectState.subMode}`);
  return true;
}

function handleTouchOrbitToggle() {
  toggleInspectSubMode();
}

function handleInspectImageLoad() {
  updateInspectZoomUI();
}

function handleInspectViewportResize() {
  if (inspectState.phase !== INSPECT_PHASE.IDLE) {
    updateInspectZoomUI();
  }
  orbitInspect.resize();
}

function restoreDesktopPointerLockAfterInspect(shouldRestorePointerLock = inspectState.restorePointerLockOnExit) {
  if (isTouchDevice || !shouldRestorePointerLock) {
    return;
  }

  pendingDesktopState = UI_STATE.PAUSED;
  clearPointerLockFallbackTimer();
  controls.lock();

  pointerLockFallbackTimer = window.setTimeout(() => {
    if (!controls.isLocked && uiState === UI_STATE.ACTIVE && inspectState.phase === INSPECT_PHASE.IDLE) {
      handlePointerLockFailure('Pointer lock was unavailable. Click Resume to return to the archive.');
    }
  }, POINTER_LOCK_FALLBACK_MS);
}

// Smooth fade-out for start screen during Start → Active transition.
// Uses transitionend so the cleanup adapts to any CSS duration, including the
// near-zero 0.01s from prefers-reduced-motion. Safety fallback prevents a
// stale guard flag if transitionend never fires.
function fadeOutStartScreen() {
  if (startScreen.hidden) return; // already hidden, nothing to fade
  isTransitioningOutOfStart = true;
  startScreen.style.opacity = '0';

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    startScreen.removeEventListener('transitionend', onEnd);
    startScreen.hidden = true;
    startScreen.style.opacity = '';
    startScreen.classList.remove('shell-revealed');
    isTransitioningOutOfStart = false;
  };
  const onEnd = (e) => { if (e.propertyName === 'opacity') settle(); };
  startScreen.addEventListener('transitionend', onEnd);
  setTimeout(settle, 600); // safety fallback
}

// Function to transition from loading to game.
// Uses transitionend so cleanup adapts to any CSS duration (including reduced-motion).
function transitionToGame() {
  if (!assetsLoaded || !loadingSceneComplete || isTransitioningOutOfLoading) return;

  isTransitioningOutOfLoading = true;

  // Position start screen behind loading screen for crossfade.
  // Loading screen (z-index 2000) is on top; start screen (z-index 1000) is beneath.
  // The cinematic is already at full black — fading loading-screen opacity reveals
  // the start screen's dark gradient background underneath: black → dark glass.
  startScreen.hidden = false;
  startScreen.style.opacity = '1';

  // Fade out loading screen — CSS transition 0.8s ease reveals start screen beneath
  loadingScreen.style.opacity = '0';

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    loadingScreen.removeEventListener('transitionend', onEnd);

    loadingScreen.hidden = true;
    loadingScreen.style.opacity = '';
    isTransitioningOutOfLoading = false;

    setStartPendingState(false);
    setUiState(UI_STATE.START);

    // Pre-warm ground timeline GPU buffers while the start screen covers the view.
    // The next animate() render uploads ~48K triangles of timeline geometry to the
    // GPU. On the following frame, update() hides the group (uiState is 'start'),
    // but GPU buffers persist. The first ACTIVE frame draws from warm buffers.
    if (groundTimeline) {
      groundTimeline.preWarm();
    }

    // Trigger staggered reveal on next frame (after browser processes hidden removal)
    requestAnimationFrame(() => {
      startScreen.classList.add('shell-revealed');
    });

    // Defer expensive GPU cleanup off the visual-critical path.
    // loadingScene.dispose() traverses the entire intro scene graph and synchronously
    // deletes ~50 GPU resources — textures, geometries, materials, the renderer, and
    // the postprocessing composer. requestIdleCallback schedules this during idle time
    // so the user never sees the cost.
    const disposeLoading = () => {
      if (loadingScene && !loadingScene.isDisposed) {
        loadingScene.dispose();
        loadingScene = null;
      }
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(disposeLoading, { timeout: 2000 });
    } else {
      setTimeout(disposeLoading, 200);
    }
  };
  const onEnd = (e) => { if (e.propertyName === 'opacity') settle(); };
  loadingScreen.addEventListener('transitionend', onEnd);
  setTimeout(settle, 900); // safety fallback (slightly longer than 0.8s CSS transition)
}

function handleSkipIntro() {
  if (loadingScene) {
    loadingScene.skipTransition();
  }
}

function handleDesktopLock() {
  if (import.meta.env.DEV) performance.mark('hol:lock-begin');
  clearPointerLockFallbackTimer();
  blurActiveElement();
  setStartPendingState(false);
  setPausePendingState(false);
  if (import.meta.env.DEV) performance.mark('hol:lock-before-ui');
  perfFirstActiveFrame = true;
  fadeOutStartScreen();
  setUiState(UI_STATE.ACTIVE);
  if (import.meta.env.DEV) performance.mark('hol:lock-after-ui');
  audioEngine.resume();
  if (import.meta.env.DEV) performance.mark('hol:lock-before-deferred');
  // Defer deferred load to next macrotask so the first active frame paints without
  // the synchronous cost of queuing 40 GLB fetch requests (~30ms measured).
  setTimeout(() => void startDeferredLetterLoad(), 0);
  if (import.meta.env.DEV) {
    performance.mark('hol:lock-done');
    performance.measure('hol:lock-pre-ui', 'hol:lock-begin', 'hol:lock-before-ui');
    performance.measure('hol:lock-setUiState', 'hol:lock-before-ui', 'hol:lock-after-ui');
    performance.measure('hol:lock-deferred-kickoff', 'hol:lock-before-deferred', 'hol:lock-done');
    performance.measure('hol:lock-total', 'hol:lock-begin', 'hol:lock-done');
  }
}

function handleDesktopUnlock() {
  clearPointerLockFallbackTimer();
  setStartPendingState(false);
  setPausePendingState(false);

  if (inspectState.phase !== INSPECT_PHASE.IDLE) {
    return;
  }

  if (uiState === UI_STATE.LOADING || uiState === UI_STATE.START) {
    return;
  }

  if (isBirdEyeView()) {
    exitBirdEyeView(camera);
    setViewMode(VIEW_MODE.IMMERSIVE);
  }

  forceExitInspectMode({ restorePose: true });
  clearRuntimeTargeting();
  setPauseStatus('Pointer released. Click Resume to return to the archive.');
  setUiState(UI_STATE.PAUSED);
  audioEngine.pause();
}

function handleResume() {
  if (isTouchDevice) {
    activateControls();
    setPausePendingState(false);
    setUiState(UI_STATE.ACTIVE);
    audioEngine.resume();
    return;
  }

  requestDesktopPointerLock(
    UI_STATE.PAUSED,
    'Waiting for pointer capture...',
    'Pointer lock was unavailable. Click Resume to try again.',
  );
}

function handleMobilePause() {
  deactivateControls();
  forceExitInspectMode({ restorePose: true });
  clearRuntimeTargeting();
  setPausePendingState(false, 'Paused. Tap Resume to continue exploring.');
  setUiState(UI_STATE.PAUSED);
  audioEngine.pause();
}

function handleStartExperience() {
  if (import.meta.env.DEV) performance.mark('hol:start-begin');
  bootstrapExperience();
  if (import.meta.env.DEV) performance.mark('hol:start-after-bootstrap');
  audioEngine.playBackgroundTheme(AUDIO.THEME_PATH);
  if (import.meta.env.DEV) performance.mark('hol:start-after-audio');

  if (isTouchDevice) {
    activateControls();
    setStartPendingState(false);
    perfFirstActiveFrame = true;
    fadeOutStartScreen();
    setUiState(UI_STATE.ACTIVE);
    audioEngine.resume();
    // Defer deferred load to next macrotask so the first active frame paints without
    // the synchronous cost of queuing 40 GLB fetch requests (~30ms measured).
    setTimeout(() => void startDeferredLetterLoad(), 0);
    if (import.meta.env.DEV) {
      performance.mark('hol:start-touch-done');
      performance.measure('hol:start-bootstrap', 'hol:start-begin', 'hol:start-after-bootstrap');
      performance.measure('hol:start-audio', 'hol:start-after-bootstrap', 'hol:start-after-audio');
      performance.measure('hol:start-touch-total', 'hol:start-begin', 'hol:start-touch-done');
    }
    return;
  }

  // Desktop: theme plays through the pointer lock transition (no pause)
  requestDesktopPointerLock(
    UI_STATE.START,
    'Waiting for pointer capture...',
    'Pointer lock was unavailable. Click Enter Archive to try again.',
  );
  if (import.meta.env.DEV) {
    performance.mark('hol:start-desktop-requested');
    performance.measure('hol:start-bootstrap', 'hol:start-begin', 'hol:start-after-bootstrap');
    performance.measure('hol:start-audio', 'hol:start-after-bootstrap', 'hol:start-after-audio');
    performance.measure('hol:start-desktop-to-lock-request', 'hol:start-begin', 'hol:start-desktop-requested');
  }
}

function handlePointerLockError() {
  if (pointerLockFallbackTimer === null && !startBtn.disabled && !resumeBtn.disabled) {
    return;
  }

  const failureMessage = pendingDesktopState === UI_STATE.PAUSED
    ? 'Pointer lock was blocked by the browser. Click Resume to try again.'
    : 'Pointer lock was blocked by the browser. Click Enter Archive to try again.';

  handlePointerLockFailure(failureMessage);
}

function handleInspectKeyDown(event) {
  // Ctrl+Shift+L → copy diagnostic logs to clipboard
  if (event.ctrlKey && event.shiftKey && event.code === 'KeyL') {
    event.preventDefault();
    window.__hol.copy().then((result) => {
      const toast = document.createElement('div');
      toast.textContent = typeof result === 'string' && result.startsWith('Copied') ? result : 'Logs ready (check console)';
      toast.style.cssText = 'position:fixed;top:16px;right:16px;background:#222;color:#0f0;padding:8px 16px;border-radius:6px;font:13px/1.4 monospace;z-index:99999;opacity:0.92;pointer-events:none';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    });
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.code === 'KeyE') {
    if (inspectState.phase === INSPECT_PHASE.ACTIVE) {
      event.preventDefault();
      exitInspectMode();
      return;
    }

    if (inspectState.phase === INSPECT_PHASE.IDLE && uiState === UI_STATE.ACTIVE && viewMode === VIEW_MODE.IMMERSIVE) {
      if (enterInspectMode()) {
        event.preventDefault();
      }
    }

    return;
  }

  if (event.code === 'KeyT' && inspectState.phase === INSPECT_PHASE.ACTIVE) {
    event.preventDefault();
    toggleInspectSubMode();
    return;
  }

  if (inspectState.phase !== INSPECT_PHASE.ACTIVE) {
    return;
  }

  // F/B/zoom are scan-only — no-op in orbit mode
  if (inspectState.subMode === 'orbit') {
    return;
  }

  const { code, key } = event;
  const normalizedKey = typeof key === 'string' ? key.normalize('NFKC') : '';
  const legacyKeyCode = event.keyCode || event.which || 0;
  const isZoomInKey = code === 'Equal'
    || code === 'NumpadAdd'
    || normalizedKey === '+'
    || normalizedKey === '='
    || normalizedKey === 'Add'
    || legacyKeyCode === 187
    || legacyKeyCode === 107
    || legacyKeyCode === 61;
  const isZoomOutKey = code === 'Minus'
    || code === 'NumpadSubtract'
    || normalizedKey === '-'
    || normalizedKey === '_'
    || normalizedKey === '−'
    || normalizedKey === 'Subtract'
    || legacyKeyCode === 189
    || legacyKeyCode === 109
    || legacyKeyCode === 173;
  const isResetZoomKey = code === 'Digit0'
    || code === 'Numpad0'
    || normalizedKey === '0'
    || legacyKeyCode === 48
    || legacyKeyCode === 96;

  switch (code) {
    case 'KeyF':
      event.preventDefault();
      switchInspectSide('front');
      break;
    case 'KeyB':
      event.preventDefault();
      switchInspectSide('back');
      break;
    default:
      if (isZoomInKey) {
        event.preventDefault();
        adjustInspectZoom(1);
        break;
      }

      if (isZoomOutKey) {
        event.preventDefault();
        adjustInspectZoom(-1);
        break;
      }

      if (isResetZoomKey) {
        event.preventDefault();
        resetInspectZoom();
      }
      break;
  }
}

function handleTouchInspectEnter() {
  enterInspectMode();
}

function handleTouchInspectFront() {
  switchInspectSide('front');
}

function handleTouchInspectBack() {
  switchInspectSide('back');
}

function handleTouchInspectZoomOut() {
  adjustInspectZoom(-1);
}

function handleTouchInspectZoomReset() {
  resetInspectZoom();
}

function handleTouchInspectZoomIn() {
  adjustInspectZoom(1);
}

function handleTouchInspectExit() {
  exitInspectMode();
}

function handleInspectHeaderExit() {
  exitInspectMode();
}

if (skipBtn) {
  skipBtn.addEventListener('click', handleSkipIntro);
}

if (!isTouchDevice) {
  controls.addEventListener('lock', handleDesktopLock);
  controls.addEventListener('unlock', handleDesktopUnlock);
  document.addEventListener('pointerlockerror', handlePointerLockError);
}

resumeBtn.addEventListener('click', handleResume);
startBtn.addEventListener('click', handleStartExperience);
document.addEventListener('keydown', handleInspectKeyDown);

if (pauseBtn) {
  pauseBtn.addEventListener('click', handleMobilePause);
}

if (inspectTouchBtn) {
  inspectTouchBtn.addEventListener('click', handleTouchInspectEnter);
}

if (inspectScanImage) {
  inspectScanImage.addEventListener('load', handleInspectImageLoad);
}

window.addEventListener('resize', handleInspectViewportResize);

if (inspectHeaderExitBtn) {
  inspectHeaderExitBtn.addEventListener('click', handleInspectHeaderExit);
}

if (inspectFrontBtn) {
  inspectFrontBtn.addEventListener('click', handleTouchInspectFront);
}

if (inspectBackBtn) {
  inspectBackBtn.addEventListener('click', handleTouchInspectBack);
}

if (inspectZoomOutBtn) {
  inspectZoomOutBtn.addEventListener('click', handleTouchInspectZoomOut);
}

if (inspectZoomResetBtn) {
  inspectZoomResetBtn.addEventListener('click', handleTouchInspectZoomReset);
}

if (inspectZoomInBtn) {
  inspectZoomInBtn.addEventListener('click', handleTouchInspectZoomIn);
}

if (inspectExitBtn) {
  inspectExitBtn.addEventListener('click', handleTouchInspectExit);
}

if (inspectOrbitToggleBtn) {
  inspectOrbitToggleBtn.addEventListener('click', handleTouchOrbitToggle);
}

// Landing screen event delegation
if (landingScreen) {
  landingScreen.addEventListener('click', (e) => {
    if (e.target.classList.contains('landing-read-more')) {
      handleLandingReadMore(e);
    }
  });
}

if (landingCta) {
  landingCta.addEventListener('click', handleEnterFromLanding);
}

setStartPendingState(false);
setPausePendingState(false);
syncStartShellContent();
syncLandingContent();
syncLetterLoadStageUi();
syncUiChrome();

// Deferred boot: loading starts only when landing CTA is clicked
if (uiState === UI_STATE.LANDING) {
  requestAnimationFrame(() => {
    if (landingScreen) landingScreen.classList.add('landing-revealed');
  });
} else {
  beginLoadingSequence();
}

function beginLoadingSequence() {
  // Create and start the 3D loading scene
  loadingScene = new LoadingScene(loadingSceneContainer);
  loadingScene.start(() => {
    loadingSceneComplete = true;
    if (loadingStatus) {
      loadingStatus.textContent = 'Ready to enter...';
    }
    transitionToGame();
  });

  // Start asset loading
  (async () => {
    try {
      const startupLetters = letterLoadStageData[LETTER_LOAD_STAGE.CORE];
      setLetterLoadStageStatus(LETTER_LOAD_STAGE.CORE, LETTER_LOAD_STAGE_STATUS.PENDING, {
        loadedCount: 0,
        errorMessage: null,
      });

      console.log('Loading letter models...');

      const loadingStartTime = Date.now();
      let slowConnectionWarningShown = false;

      const updateProgress = (loaded, total) => {
        if (loadingProgress) {
          // Progress text hidden — bar-only feedback during loading
        }
        if (loadingProgressBar) {
          loadingProgressBar.style.transform = 'scaleX(' + (loaded / total) + ')';
        }
        if (loadingStatus) {
          const elapsedSeconds = Math.floor((Date.now() - loadingStartTime) / 1000);

          if (elapsedSeconds > 30 && !slowConnectionWarningShown) {
            slowConnectionWarningShown = true;
            console.log('Slow connection detected, showing patience message');
          }

          if (slowConnectionWarningShown) {
            loadingStatus.textContent = `Loading... ${Math.round((loaded/total) * 100)}% (slow connection detected - please be patient)`;
          } else {
            loadingStatus.textContent = `Loading experience... ${Math.round((loaded/total) * 100)}%`;
          }
        }
      };

      const loadingTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout - assets took too long to load')), LOADING_TIMEOUT_MS);
      });

      letterObjects = await Promise.race([
        loadLetters(scene, startupLetters, renderer, updateProgress),
        loadingTimeout
      ]);

      const loadingDuration = Math.floor((Date.now() - loadingStartTime) / 1000);
      console.log(`Loaded ${letterObjects.length} letters successfully in ${loadingDuration}s!`);
      letterObjectById.clear();
      letterObjects.forEach((letter) => {
        letterObjectById.set(letter.userData.id, letter);
      });

      proximityManager = new ProximityManager(camera, letterObjects);
      tryInitializeGroundTimeline();

      setLetterLoadStageStatus(LETTER_LOAD_STAGE.CORE, LETTER_LOAD_STAGE_STATUS.READY, {
        loadedCount: letterObjects.length,
        errorMessage: null,
      });

      assetsLoaded = true;
      transitionToGame();

    } catch (error) {
      setLetterLoadStageStatus(LETTER_LOAD_STAGE.CORE, LETTER_LOAD_STAGE_STATUS.FAILED, {
        errorMessage: error.message || 'Failed to load startup letters.',
      });
      console.error('Error loading letters:', error);
      const isTimeoutError = error.message?.includes('timeout');

      if (loadingScreen) {
        loadingScreen.innerHTML = `
          <div style="color: #ff6b6b; text-align: center; padding: 20px; max-width: 400px; margin: 0 auto;">
            <h2 style="margin-bottom: 15px;">Error Loading Experience</h2>
            <p style="margin: 10px 0; font-size: 16px;">${error.message || 'Failed to load assets'}</p>
            ${isTimeoutError ? `
              <p style="font-size: 14px; opacity: 0.9; margin: 15px 0; color: #ffd93d;">
                Your internet connection appears to be slow. Please try:
              </p>
              <ul style="text-align: left; font-size: 13px; opacity: 0.8; padding-left: 20px;">
                <li>Refreshing the page and waiting longer</li>
                <li>Connecting to a faster network if available</li>
                <li>Trying again at a different time</li>
              </ul>
            ` : ''}
            <p style="font-size: 12px; opacity: 0.7; margin-top: 15px;">Check the browser console for details (F12)</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 30px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px;">
              Try Again
            </button>
          </div>
        `;
      }
    }
  })();
}

// 7. Animation Loop
const clock = new THREE.Clock();

function updateInspectTransition(delta) {
  if (
    inspectState.phase !== INSPECT_PHASE.ENTERING &&
    inspectState.phase !== INSPECT_PHASE.EXITING
  ) {
    return;
  }

  inspectState.transitionElapsed += delta;
  const progress = THREE.MathUtils.clamp(
    inspectState.transitionElapsed / inspectState.transitionDuration,
    0,
    1,
  );

  camera.position.lerpVectors(
    inspectState.transitionFrom.position,
    inspectState.transitionTo.position,
    progress,
  );
  camera.quaternion.copy(inspectState.transitionFrom.quaternion).slerp(
    inspectState.transitionTo.quaternion,
    progress,
  );
  setCameraFov(THREE.MathUtils.lerp(
    inspectState.transitionFrom.fov,
    inspectState.transitionTo.fov,
    progress,
  ));

  if (progress < 1) {
    return;
  }

  applyCameraPose(inspectState.transitionTo);

  if (inspectState.phase === INSPECT_PHASE.EXITING) {
    const shouldRestorePointerLock = inspectState.restorePointerLockOnExit;
    setInspectSuppressed(false);
    resetInspectState();
    setViewMode(VIEW_MODE.IMMERSIVE);
    syncInspectUi();
    if (shouldRestorePointerLock) {
      restoreDesktopPointerLockAfterInspect(shouldRestorePointerLock);
    }
    return;
  }

  inspectState.phase = INSPECT_PHASE.ACTIVE;
  inspectState.transitionFrom = null;
  inspectState.transitionTo = null;
  inspectState.transitionElapsed = 0;
  updateInspectContent();
  syncInspectUi();
}

function animate() {
  requestAnimationFrame(animate);

  try {
    const isFirstActiveFrame = perfFirstActiveFrame && uiState === UI_STATE.ACTIVE;
    if (import.meta.env.DEV && isFirstActiveFrame) performance.mark('hol:first-active-frame-begin');

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    const nextViewMode = inspectState.phase !== INSPECT_PHASE.IDLE
      ? VIEW_MODE.INSPECT
      : (isBirdEyeView() ? VIEW_MODE.BIRD_EYE : VIEW_MODE.IMMERSIVE);

    if (viewMode !== nextViewMode) {
      setViewMode(nextViewMode);
    }

    // Dynamic velocity: adjust walking speed based on camera z-position
    if (uiState === UI_STATE.ACTIVE && !manualSpeedOverride && viewMode === VIEW_MODE.IMMERSIVE) {
      const dynamicSpeed = computeWalkingSpeed(camera.position.z, VELOCITY.BASE_SPEED);
      setWalkingSpeed(dynamicSpeed);
      if (speedSlider) {
        speedSlider.value = Math.round(dynamicSpeed);
        if (speedValueDisplay) speedValueDisplay.textContent = Math.round(dynamicSpeed);
      }
      if (debugVelocityBoost) {
        const multiplier = dynamicSpeed / VELOCITY.BASE_SPEED;
        debugVelocityBoost.textContent = multiplier.toFixed(1) + '×';
      }
    }

    // Update Controls
    if (uiState === UI_STATE.ACTIVE) {
      updateControls(delta);
    } else if (currentSpeedDisplay) {
      currentSpeedDisplay.textContent = '0.00';
    }

    // Update debug speed display
    if (uiState === UI_STATE.ACTIVE && currentSpeedDisplay) {
      currentSpeedDisplay.textContent = getVelocity().toFixed(2);
    }

    if (import.meta.env.DEV && isFirstActiveFrame) performance.mark('hol:faf-after-controls');

    updateInspectTransition(delta);

    // Update debug position display
    if (debugPositionDisplay) {
      debugPositionDisplay.textContent = `X: ${camera.position.x.toFixed(1)} Y: ${camera.position.y.toFixed(1)} Z: ${camera.position.z.toFixed(1)}`;
    }

    // Check Proximity
    if (proximityManager) {
      if (uiState === UI_STATE.ACTIVE && inspectState.phase === INSPECT_PHASE.IDLE) {
        currentTargetState = proximityManager.update();
      } else if (currentTargetState.activeId || currentTargetState.candidateId) {
        currentTargetState = proximityManager.clearTargeting();
      } else {
        currentTargetState = EMPTY_TARGET_STATE;
      }
    } else {
      currentTargetState = EMPTY_TARGET_STATE;
    }

    if (import.meta.env.DEV && isFirstActiveFrame) performance.mark('hol:faf-after-proximity');

    updateActiveLetterUI(currentTargetState?.activeId ?? null);

    // Spatial narration volume — only during immersive play, not during inspect
    if (inspectState.phase === INSPECT_PHASE.IDLE) {
      const activeId = currentTargetState?.activeId ?? null;
      audioEngine.setNarrationVolume(
        computeNarrationVolume(activeId),
        activeId
      );
    }

    syncInspectUi();
    if (groundTimeline) {
      groundTimeline.update({
        uiState,
        viewMode,
        inspectPhase: inspectState.phase,
        activeId: currentTargetState?.activeId ?? null,
        candidateId: currentTargetState?.candidateId ?? null,
        movementSpeed: getVelocity(),
        elapsedTime,
        cameraPosition: camera.position,
      });
    }

    if (import.meta.env.DEV && isFirstActiveFrame) performance.mark('hol:faf-after-timeline');

    // Animate Letters (Slight airflow)
    const time = elapsedTime;

    // Animate Lights - DISABLED to ensure consistent lighting on front/back
    // No light animation code here anymore

    if (letterObjects.length > 0) {
      // Optimization: Only animate letters within view distance
      const animationRadiusSq = ANIMATION.LETTER_ANIMATION_RADIUS * ANIMATION.LETTER_ANIMATION_RADIUS;

      letterObjects.forEach((letter, i) => {
        const distSq = camera.position.distanceToSquared(letter.position);

        // Skip animation for distant letters to save CPU
        if (distSq > animationRadiusSq) return;

        const baseRotationY = letter.userData.baseRotationY ?? 0;
        const basePositionY = letter.userData.basePositionY ?? letter.userData.position.y;

        if (inspectState.phase !== INSPECT_PHASE.IDLE && letter.userData.id === inspectState.letterId) {
          letter.rotation.y = baseRotationY;
          letter.rotation.z = 0;
          letter.position.y = basePositionY;
          return;
        }

        const offset = i * 2; // Phase offset

        // Gentle rotation (torsion)
        letter.rotation.y = baseRotationY + Math.sin(time * ANIMATION.ROTATION_SPEED + offset) * ANIMATION.ROTATION_AMPLITUDE;

        // Swaying (wind)
        letter.rotation.z = Math.sin(time * ANIMATION.SWAY_SPEED + offset) * ANIMATION.SWAY_AMPLITUDE;

        // Vertical bobbing (air currents)
        letter.position.y = basePositionY + Math.sin(time * ANIMATION.BOB_SPEED + offset) * ANIMATION.BOB_AMPLITUDE;
      });
    }

    // Update atmosphere zone colors and dust animation
    updateAtmosphere(camera.position.z, delta);
    updateDust(dustParticles, elapsedTime);

    // Render via post-processing composer
    composer.render(delta);

    // Render orbit viewer if active (isolated canvas, no post-processing)
    if (orbitInspect.isActive()) {
      orbitInspect.render();
    }

    if (import.meta.env.DEV && isFirstActiveFrame) {
      perfFirstActiveFrame = false;
      performance.mark('hol:first-active-frame-end');
      performance.measure('hol:first-active-frame', 'hol:first-active-frame-begin', 'hol:first-active-frame-end');
      performance.measure('hol:faf-controls', 'hol:first-active-frame-begin', 'hol:faf-after-controls');
      performance.measure('hol:faf-proximity', 'hol:faf-after-controls', 'hol:faf-after-proximity');
      performance.measure('hol:faf-timeline', 'hol:faf-after-proximity', 'hol:faf-after-timeline');
      performance.measure('hol:faf-render', 'hol:faf-after-timeline', 'hol:first-active-frame-end');
    }
  } catch (error) {
    console.error('[animate] Frame error:', error);
  }
}

animate();

let hasCleanedUp = false;

function cleanupRuntime() {
  if (hasCleanedUp) {
    return;
  }

  hasCleanedUp = true;
  clearPointerLockFallbackTimer();

  if (deferredLoadNoticeTimer) {
    clearTimeout(deferredLoadNoticeTimer);
    deferredLoadNoticeTimer = null;
  }

  speedSlider.removeEventListener('input', handleSpeedSliderInput);
  startBtn.removeEventListener('click', handleStartExperience);
  resumeBtn.removeEventListener('click', handleResume);
  document.removeEventListener('keydown', handleInspectKeyDown);

  if (skipBtn) {
    skipBtn.removeEventListener('click', handleSkipIntro);
  }

  if (pauseBtn) {
    pauseBtn.removeEventListener('click', handleMobilePause);
  }

  if (inspectTouchBtn) {
    inspectTouchBtn.removeEventListener('click', handleTouchInspectEnter);
  }

  if (inspectFrontBtn) {
    inspectFrontBtn.removeEventListener('click', handleTouchInspectFront);
  }

  if (inspectBackBtn) {
    inspectBackBtn.removeEventListener('click', handleTouchInspectBack);
  }

  if (inspectZoomOutBtn) {
    inspectZoomOutBtn.removeEventListener('click', handleTouchInspectZoomOut);
  }

  if (inspectZoomResetBtn) {
    inspectZoomResetBtn.removeEventListener('click', handleTouchInspectZoomReset);
  }

  if (inspectZoomInBtn) {
    inspectZoomInBtn.removeEventListener('click', handleTouchInspectZoomIn);
  }

  if (inspectExitBtn) {
    inspectExitBtn.removeEventListener('click', handleTouchInspectExit);
  }

  if (inspectOrbitToggleBtn) {
    inspectOrbitToggleBtn.removeEventListener('click', handleTouchOrbitToggle);
  }

  if (inspectHeaderExitBtn) {
    inspectHeaderExitBtn.removeEventListener('click', handleInspectHeaderExit);
  }

  if (inspectScanImage) {
    inspectScanImage.removeEventListener('load', handleInspectImageLoad);
  }

  window.removeEventListener('resize', handleInspectViewportResize);

  if (landingCta) {
    landingCta.removeEventListener('click', handleEnterFromLanding);
  }

  if (!isTouchDevice) {
    controls.removeEventListener('lock', handleDesktopLock);
    controls.removeEventListener('unlock', handleDesktopUnlock);
    document.removeEventListener('pointerlockerror', handlePointerLockError);
  }

  forceExitInspectMode({ restorePose: false });
  orbitInspect.dispose();
  disposeControls();

  clearRuntimeTargeting();
  if (groundTimeline) {
    groundTimeline.dispose();
    groundTimeline = null;
  }

  // Dispose audio resources
  audioEngine.dispose();
  updateActiveLetterUI(null);

  // Dispose Three.js resources
  letterObjects.forEach((letter) => {
    letter.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
  });

  if (loadingScene && !loadingScene.isDisposed) {
    loadingScene.dispose();
  }

  // Dispose post-processing and dust
  composer.dispose();
  dustParticles.geometry.dispose();
  dustParticles.material.dispose();

  // Dispose renderer
  renderer.dispose();
  
  console.log('Resources cleaned up on page unload');
}

window.addEventListener('beforeunload', cleanupRuntime);
