import * as THREE from 'three';
import { initScene } from '@renderer/sceneSetup.js';
import { initLighting } from '@renderer/lighting.js';
import { initControls, setWalkingSpeed, isBirdEyeView, exitBirdEyeView } from '@renderer/controls.js';
import { loadLetters } from '@renderer/letters.js';
import { LoadingScene } from '@renderer/loadingScene.js';
import { audioEngine } from '@audio/audioEngine.js';
import { themeMixer } from '@audio/themeMixer.js';
import { ProximityManager } from '@interaction/proximityManager.js';
import { AUDIO, ANIMATION, LOADING_TIMEOUT_MS } from '@config/constants.js';
import lettersData from '@data/letters.json';

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

// 1. Initialize Scene (hidden until loading complete)
const { scene, camera, renderer } = initScene();

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
} = initControls(camera, document.body);

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
let displayedActiveLetterId = null;

const UI_STATE = Object.freeze({
  LOADING: 'loading',
  START: 'start',
  ACTIVE: 'active',
  PAUSED: 'paused',
});

const VIEW_MODE = Object.freeze({
  IMMERSIVE: 'immersive',
  BIRD_EYE: 'bird-eye',
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

function syncUiChrome() {
  const isActive = uiState === UI_STATE.ACTIVE;
  const immersiveActive = isActive && viewMode === VIEW_MODE.IMMERSIVE;
  const birdEyeActive = isActive && viewMode === VIEW_MODE.BIRD_EYE;
  const desktopImmersive = immersiveActive && !isTouchDevice;
  const mobileImmersive = immersiveActive && isTouchDevice;
  const shouldShowLetterUi = immersiveActive && Boolean(displayedActiveLetterId);
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

  syncUiChrome();
}

function clearPointerLockFallbackTimer() {
  if (pointerLockFallbackTimer !== null) {
    window.clearTimeout(pointerLockFallbackTimer);
    pointerLockFallbackTimer = null;
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
  const frontPath = letterData.frontImage || `/assets/letters/${letterData.id}.jpg`;
  const backPath = letterData.backImage || `/assets/letters/${letterData.id}-${letterData.id}.jpg`;

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
  setStartPendingState(false);
  setPausePendingState(false);
  setUiState(UI_STATE.ACTIVE);
  audioEngine.resume();
}

function handleDesktopUnlock() {
  clearPointerLockFallbackTimer();
  setStartPendingState(false);
  setPausePendingState(false);

  if (uiState === UI_STATE.LOADING || uiState === UI_STATE.START) {
    return;
  }

  if (isBirdEyeView()) {
    exitBirdEyeView(camera);
    setViewMode(VIEW_MODE.IMMERSIVE);
  }

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

if (pauseBtn) {
  pauseBtn.addEventListener('click', handleMobilePause);
}

setStartPendingState(false);
setPausePendingState(false);
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
      loadLetters(scene, lettersData, updateProgress),
      loadingTimeout
    ]);
    
    const loadingDuration = Math.floor((Date.now() - loadingStartTime) / 1000);
    console.log(`Loaded ${letterObjects.length} letters successfully in ${loadingDuration}s!`);

    // 5. Interaction
    proximityManager = new ProximityManager(camera, letterObjects);

    // Mark assets as loaded
    assetsLoaded = true;
    
    // Try to transition (will wait for loading scene to complete)
    transitionToGame();

  } catch (error) {
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

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const nextViewMode = isBirdEyeView() ? VIEW_MODE.BIRD_EYE : VIEW_MODE.IMMERSIVE;

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
  
  // Update debug position display
  if (debugPositionDisplay) {
    debugPositionDisplay.textContent = `X: ${camera.position.x.toFixed(1)} Y: ${camera.position.y.toFixed(1)} Z: ${camera.position.z.toFixed(1)}`;
  }

  // Check Proximity
  const activeLetterId = uiState === UI_STATE.ACTIVE && proximityManager
    ? proximityManager.update()
    : null;

  if (proximityManager) {
    updateActiveLetterUI(activeLetterId);
  }

  // Animate Letters (Slight airflow)
  const time = clock.getElapsedTime();

  // Animate Lights - DISABLED to ensure consistent lighting on front/back
  // No light animation code here anymore

  if (letterObjects.length > 0) {
    // Optimization: Only animate letters within view distance
    const animationRadiusSq = ANIMATION.LETTER_ANIMATION_RADIUS * ANIMATION.LETTER_ANIMATION_RADIUS;

    letterObjects.forEach((letter, i) => {
      const distSq = camera.position.distanceToSquared(letter.position);

      // Skip animation for distant letters to save CPU
      if (distSq > animationRadiusSq) return;

      const offset = i * 2; // Phase offset

      // Gentle rotation (torsion)
      const baseRotationY = letter.userData.baseRotationY ?? 0;
      letter.rotation.y = baseRotationY + Math.sin(time * ANIMATION.ROTATION_SPEED + offset) * ANIMATION.ROTATION_AMPLITUDE;

      // Swaying (wind)
      letter.rotation.z = Math.sin(time * ANIMATION.SWAY_SPEED + offset) * ANIMATION.SWAY_AMPLITUDE;

      // Vertical bobbing (air currents)
      const basePositionY = letter.userData.basePositionY ?? letter.userData.position.y;
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

  if (skipBtn) {
    skipBtn.removeEventListener('click', handleSkipIntro);
  }

  if (pauseBtn) {
    pauseBtn.removeEventListener('click', handleMobilePause);
  }

  if (!isTouchDevice) {
    controls.removeEventListener('lock', handleDesktopLock);
    controls.removeEventListener('unlock', handleDesktopUnlock);
    document.removeEventListener('pointerlockerror', handlePointerLockError);
  }

  disposeControls();

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
