import * as THREE from 'three';
import { initScene } from '@renderer/sceneSetup.js';
import { initLighting } from '@renderer/lighting.js';
import { initControls, setWalkingSpeed, isBirdEyeView, exitBirdEyeView } from '@renderer/controls.js';
import { createGroundTimeline } from '@renderer/groundTimeline.js';
import { loadLetters } from '@renderer/letters.js';
import { LoadingScene } from '@renderer/loadingScene.js';
import { audioEngine } from '@audio/audioEngine.js';
import { themeMixer } from '@audio/themeMixer.js';
import { ProximityManager } from '@interaction/proximityManager.js';
import { AUDIO, ANIMATION, INSPECT, LOADING_TIMEOUT_MS, TIMELINE } from '@config/constants.js';
import lettersData from '@data/letters.json';
import { validatedProvisionalChronology } from '@data/provisionalChronology.js';

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

// Loading Scene Elements
const loadingSceneContainer = document.getElementById('loading-scene-container');
const loadingProgress = document.getElementById('loading-progress');
const loadingStatus = document.getElementById('loading-status');
const skipBtn = document.getElementById('skip-intro-btn');

// Create the 3D loading scene
const loadingScene = new LoadingScene(loadingSceneContainer);

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

// 1. Initialize Scene (hidden until loading complete)
const { scene, camera, renderer, setInspectQuality } = initScene();

// 2. Lighting
initLighting(scene);

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
const debugPositionDisplay = document.getElementById('debug-position');

function handleSpeedSliderInput(e) {
  const speed = parseInt(e.target.value, 10);
  setWalkingSpeed(speed);
  speedValueDisplay.textContent = speed;
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

const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const startStatus = document.getElementById('start-status');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const pauseStatus = document.getElementById('pause-status');
const pauseBtn = document.getElementById('mobile-pause-btn');
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
const letterDataById = new Map(lettersData.map((letter) => [letter.id, letter]));
const subtitleElement = document.createElement('div');
subtitleElement.className = 'subtitle';
subtitleElement.hidden = true;
subtitleContainer.appendChild(subtitleElement);

let uiState = UI_STATE.LOADING;
let viewMode = VIEW_MODE.IMMERSIVE;
let hasBootstrappedExperience = false;
let pendingDesktopState = UI_STATE.START;
let pointerLockFallbackTimer = null;
let isTransitioningOutOfLoading = false;
let suppressPauseOnNextDesktopUnlock = false;
const inspectState = {
  phase: INSPECT_PHASE.IDLE,
  letterId: null,
  side: 'front',
  zoom: INSPECT.DEFAULT_ZOOM,
  returnPose: null,
  restorePointerLockOnExit: false,
  transitionFrom: null,
  transitionTo: null,
  transitionElapsed: 0,
  transitionDuration: INSPECT.TRANSITION_DURATION,
};
const inspectScratchCamera = new THREE.PerspectiveCamera(INSPECT.FOV, camera.aspect, camera.near, camera.far);
const inspectViewSize = new THREE.Vector2();
const inspectCenterWorld = new THREE.Vector3();
const inspectAnchorWorld = new THREE.Vector3();
const inspectDirectionWorld = new THREE.Vector3();
const inspectTargetPosition = new THREE.Vector3();
const inspectLookObject = new THREE.Object3D();

const debugQuery = new URLSearchParams(window.location.search).get('debug');
const storedDebugPreference = (() => {
  try {
    return window.localStorage.getItem('hod:debug');
  } catch {
    return null;
  }
})();
const debugUiEnabled = !isTouchDevice && (debugQuery === '1' || (debugQuery !== '0' && storedDebugPreference === '1'));
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
  inspectState.zoom = INSPECT.DEFAULT_ZOOM;
  inspectState.returnPose = null;
  inspectState.restorePointerLockOnExit = false;
  inspectState.transitionFrom = null;
  inspectState.transitionTo = null;
  inspectState.transitionElapsed = 0;
  inspectState.transitionDuration = INSPECT.TRANSITION_DURATION;
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

function syncLetterLoadStageUi() {
  document.body.dataset.coreLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.CORE].status;
  document.body.dataset.deferredLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED].status;
  document.body.dataset.groundTimelineCoverage = getGroundTimelineCoverageStatus();

  if (!controlsHint) {
    return;
  }

  const deferredStatusText = getDeferredStageStatusText();
  controlsHint.setAttribute('aria-live', 'polite');
  controlsHint.dataset.deferredLetterLoadStatus = letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED].status;
  controlsHint.textContent = deferredStatusText
    ? `${DEFAULT_DESKTOP_CONTROLS_HINT} • ${deferredStatusText}`
    : DEFAULT_DESKTOP_CONTROLS_HINT;
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

function tryInitializeGroundTimeline() {
  if (groundTimeline || !validatedProvisionalChronology || !hasRequiredGroundTimelineCoverage()) {
    return false;
  }

  groundTimeline = createGroundTimeline({
    scene,
    letters: letterObjects,
    chronology: validatedProvisionalChronology,
    constants: TIMELINE,
  });

  console.log('[ground-timeline] Initialized after full chronology coverage became available.');
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

  return isTouchDevice
    ? 'Swipe the scan, use the controls below, and tap Exit to return.'
    : 'Pointer released for inspection. Scroll the scan, then press E or Back to return.';
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
    inspectSideBadge.textContent = inspectState.side === 'back' ? 'Back' : 'Front';
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

  if (inspectFrontBtn) {
    inspectFrontBtn.disabled = !canSwitchSides || inspectState.side === 'front';
  }

  if (inspectBackBtn) {
    inspectBackBtn.disabled = !canSwitchSides || inspectState.side === 'back';
  }

  if (inspectExitBtn) {
    inspectExitBtn.disabled = inspectState.phase !== INSPECT_PHASE.ACTIVE;
  }

  if (inspectHeaderExitBtn) {
    inspectHeaderExitBtn.disabled = inspectState.phase !== INSPECT_PHASE.ACTIVE;
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
  return letterData.text || `Listening to Letter ${letterData.id}...`;
}

function setElementHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
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

  if (inspectVisible) {
    updateInspectContent();
  }
}

function syncUiChrome() {
  const isActive = uiState === UI_STATE.ACTIVE;
  const immersiveActive = isActive && viewMode === VIEW_MODE.IMMERSIVE;
  const birdEyeActive = isActive && viewMode === VIEW_MODE.BIRD_EYE;
  const desktopImmersive = immersiveActive && !isTouchDevice;
  const mobileImmersive = immersiveActive && isTouchDevice;
  const shouldShowLetterUi = immersiveActive && inspectState.phase === INSPECT_PHASE.IDLE && Boolean(displayedActiveLetterId);
  const shouldShowDebug = debugUiEnabled && desktopImmersive;

  document.body.dataset.uiState = uiState;
  document.body.dataset.viewMode = viewMode;

  setElementHidden(startScreen, uiState !== UI_STATE.START);
  setElementHidden(pauseScreen, uiState !== UI_STATE.PAUSED);
  setElementHidden(reticle, !desktopImmersive);
  setElementHidden(controlsHint, !desktopImmersive);
  setElementHidden(birdEyeIndicator, !birdEyeActive);
  setElementHidden(pauseBtn, !mobileImmersive);
  setElementHidden(debugPanel, !shouldShowDebug);

  setTouchOverlayVisibility(mobileImmersive);

  previewContainer.hidden = !shouldShowLetterUi;
  previewContainer.classList.toggle('visible', shouldShowLetterUi);
  subtitleElement.hidden = !shouldShowLetterUi || !subtitleElement.textContent;
  syncInspectUi();
}

function setUiState(nextState) {
  if (uiState !== nextState) {
    uiState = nextState;
  }

  syncUiChrome();
}

function setViewMode(nextMode) {
  if (viewMode !== nextMode) {
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

function bootstrapExperience() {
  if (hasBootstrappedExperience) {
    return;
  }

  audioEngine.init();
  audioEngine.setupVisibilityHandler({
    shouldResume: () => uiState === UI_STATE.ACTIVE,
  });
  audioEngine.playBackgroundTheme(AUDIO.THEME_PATH);

  lettersData.forEach((letter) => {
    if (letter.narration) {
      audioEngine.registerNarration(letter.id, letter.narration);
    }
  });

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
    suppressPauseOnNextDesktopUnlock = true;
    controls.unlock();
  }
  startInspectTransition(target.pose, INSPECT_PHASE.ENTERING);
  setViewMode(VIEW_MODE.INSPECT);
  clearRuntimeTargeting();
  return true;
}

function exitInspectMode() {
  if (inspectState.phase !== INSPECT_PHASE.ACTIVE || !inspectState.returnPose) {
    return false;
  }

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

function handleInspectImageLoad() {
  updateInspectZoomUI();
}

function handleInspectViewportResize() {
  if (inspectState.phase !== INSPECT_PHASE.IDLE) {
    updateInspectZoomUI();
  }
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

// Function to transition from loading to game
function transitionToGame() {
  if (!assetsLoaded || !loadingSceneComplete || isTransitioningOutOfLoading) return;

  isTransitioningOutOfLoading = true;

  // Fade out loading scene
  loadingScreen.style.opacity = '0';

  setTimeout(() => {
    loadingScreen.hidden = true;

    // Clean up loading scene
    loadingScene.dispose();

    setStartPendingState(false);
    setUiState(UI_STATE.START);
  }, 800);
}

function handleSkipIntro() {
  if (loadingScene) {
    loadingScene.skipTransition();
  }
}

function handleDesktopLock() {
  clearPointerLockFallbackTimer();
  blurActiveElement();
  setStartPendingState(false);
  setPausePendingState(false);
  setUiState(UI_STATE.ACTIVE);
  audioEngine.resume();
  void startDeferredLetterLoad();
}

function handleDesktopUnlock() {
  clearPointerLockFallbackTimer();
  setStartPendingState(false);
  setPausePendingState(false);

  if (suppressPauseOnNextDesktopUnlock) {
    suppressPauseOnNextDesktopUnlock = false;
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
  bootstrapExperience();

  if (isTouchDevice) {
    activateControls();
    setStartPendingState(false);
    setUiState(UI_STATE.ACTIVE);
    audioEngine.resume();
    void startDeferredLetterLoad();
    return;
  }

  audioEngine.pause();
  requestDesktopPointerLock(
    UI_STATE.START,
    'Waiting for pointer capture...',
    'Pointer lock was unavailable. Click Enter Archive to try again.',
  );
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

  if (inspectState.phase !== INSPECT_PHASE.ACTIVE) {
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

setStartPendingState(false);
setPausePendingState(false);
syncLetterLoadStageUi();
syncUiChrome();

// Start the loading scene animation
loadingScene.start(() => {
  loadingSceneComplete = true;
  if (loadingStatus) {
    loadingStatus.textContent = 'Ready to enter...';
  }
  transitionToGame();
});

(async () => {
  try {
    const startupLetters = letterLoadStageData[LETTER_LOAD_STAGE.CORE];
    setLetterLoadStageStatus(LETTER_LOAD_STAGE.CORE, LETTER_LOAD_STAGE_STATUS.PENDING, {
      loadedCount: 0,
      errorMessage: null,
    });

    console.log('Loading letter models...');
    
    // Track loading start time for slow connection detection
    const loadingStartTime = Date.now();
    let slowConnectionWarningShown = false;
    
    // Progress callback to update UI
    const updateProgress = (loaded, total) => {
      if (loadingProgress) {
        loadingProgress.textContent = `${loaded}/${total} models`;
      }
      if (loadingStatus) {
        const elapsedSeconds = Math.floor((Date.now() - loadingStartTime) / 1000);
        
        // Show slow connection message after 30 seconds
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
    
    // Add a timeout to prevent infinite loading (configurable - now 10 minutes)
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

    // 5. Interaction
    proximityManager = new ProximityManager(camera, letterObjects);
    tryInitializeGroundTimeline();

    setLetterLoadStageStatus(LETTER_LOAD_STAGE.CORE, LETTER_LOAD_STAGE_STATUS.READY, {
      loadedCount: letterObjects.length,
      errorMessage: null,
    });

    // Mark assets as loaded
    assetsLoaded = true;
    
    // Try to transition (will wait for loading scene to complete)
    transitionToGame();

  } catch (error) {
    setLetterLoadStageStatus(LETTER_LOAD_STAGE.CORE, LETTER_LOAD_STAGE_STATUS.FAILED, {
      errorMessage: error.message || 'Failed to load startup letters.',
    });
    console.error('Error loading letters:', error);
    const isTimeoutError = error.message?.includes('timeout');
    
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
})();

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

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  const nextViewMode = inspectState.phase !== INSPECT_PHASE.IDLE
    ? VIEW_MODE.INSPECT
    : (isBirdEyeView() ? VIEW_MODE.BIRD_EYE : VIEW_MODE.IMMERSIVE);

  if (viewMode !== nextViewMode) {
    setViewMode(nextViewMode);
  }

  // Update Controls
  if (uiState === UI_STATE.ACTIVE) {
    updateControls(delta);
  } else if (currentSpeedDisplay) {
    currentSpeedDisplay.textContent = '0.00';
  }
  
  // Update debug speed display
  if (uiState === UI_STATE.ACTIVE) {
    currentSpeedDisplay.textContent = getVelocity().toFixed(2);
  }

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

  updateActiveLetterUI(currentTargetState?.activeId ?? null);
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

  // Render
  renderer.render(scene, camera);
}

animate();

let hasCleanedUp = false;

function cleanupRuntime() {
  if (hasCleanedUp) {
    return;
  }

  hasCleanedUp = true;
  clearPointerLockFallbackTimer();

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

  if (inspectHeaderExitBtn) {
    inspectHeaderExitBtn.removeEventListener('click', handleInspectHeaderExit);
  }

  if (inspectScanImage) {
    inspectScanImage.removeEventListener('load', handleInspectImageLoad);
  }

  window.removeEventListener('resize', handleInspectViewportResize);

  if (!isTouchDevice) {
    controls.removeEventListener('lock', handleDesktopLock);
    controls.removeEventListener('unlock', handleDesktopUnlock);
    document.removeEventListener('pointerlockerror', handlePointerLockError);
  }

  forceExitInspectMode({ restorePose: false });
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

  if (!loadingScene.isDisposed) {
    loadingScene.dispose();
  }
  
  // Dispose renderer
  renderer.dispose();
  
  console.log('Resources cleaned up on page unload');
}

window.addEventListener('beforeunload', cleanupRuntime);
