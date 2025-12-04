import * as THREE from 'three';
import { initScene } from '@renderer/sceneSetup.js';
import { initLighting } from '@renderer/lighting.js';
import { initControls, setWalkingSpeed, getWalkingSpeed } from '@renderer/controls.js';
import { loadLetters } from '@renderer/letters.js';
import { LoadingScene } from '@renderer/loadingScene.js';
import { audioEngine } from '@audio/audioEngine.js';
import { themeMixer } from '@audio/themeMixer.js';
import { ProximityManager } from '@interaction/proximityManager.js';
import { AUDIO, ASSETS, ANIMATION } from '@config/constants.js';
import lettersData from '@data/letters.json';

// Loading Scene Elements
const loadingSceneContainer = document.getElementById('loading-scene-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingProgress = document.getElementById('loading-progress');
const loadingStatus = document.getElementById('loading-status');
const skipBtn = document.getElementById('skip-intro-btn');

// Create the 3D loading scene
const loadingScene = new LoadingScene(loadingSceneContainer);

// Main game state
let gameInitialized = false;
let assetsLoaded = false;
let loadingSceneComplete = false;

// 1. Initialize Scene (hidden until loading complete)
const { scene, camera, renderer } = initScene();

// 2. Lighting
const { pointLight, pointLight2 } = initLighting(scene);

// 3. Controls
const { controls, touchControls, isTouchDevice, update: updateControls, getVelocity, activate: activateControls, deactivate: deactivateControls, isActive: isControlsActive } = initControls(camera, document.body);

// Debug: Speed slider setup
const speedSlider = document.getElementById('speed-slider');
const speedValueDisplay = document.getElementById('speed-value');
const currentSpeedDisplay = document.getElementById('current-speed');

speedSlider.addEventListener('input', (e) => {
  const speed = parseInt(e.target.value, 10);
  setWalkingSpeed(speed);
  speedValueDisplay.textContent = speed;
});

// 4. Load Content (async)
let letterObjects = [];
let proximityManager = null;

const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');

// Function to transition from loading to game
function transitionToGame() {
  if (!assetsLoaded || !loadingSceneComplete) return;
  
  // Fade out loading scene
  loadingScreen.style.opacity = '0';
  
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    
    // Clean up loading scene
    loadingScene.dispose();
    
    // Show start screen
    startScreen.style.display = 'flex';
    gameInitialized = true;
  }, 800);
}

// Skip button handler
if (skipBtn) {
  skipBtn.addEventListener('click', () => {
    if (loadingScene) {
      loadingScene.skipTransition();
    }
  });
}

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
    
    // Progress callback to update UI
    const updateProgress = (loaded, total) => {
      if (loadingProgress) {
        loadingProgress.textContent = `${loaded}/${total} models`;
      }
      if (loadingStatus) {
        loadingStatus.textContent = `Loading experience... ${Math.round((loaded/total) * 100)}%`;
      }
    };
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Loading timeout - assets took too long to load')), 60000);
    });
    
    letterObjects = await Promise.race([
      loadLetters(scene, lettersData, updateProgress),
      loadingTimeout
    ]);
    
    console.log(`Loaded ${letterObjects.length} letters successfully!`);

    // 5. Interaction
    proximityManager = new ProximityManager(camera, letterObjects);

    // Mark assets as loaded
    assetsLoaded = true;
    
    // Try to transition (will wait for loading scene to complete)
    transitionToGame();

    // Handle Pause/Resume - Different handling for touch vs desktop
    if (isTouchDevice) {
      // For touch devices, we don't use pointer lock events
      // Instead, we'll handle this through UI buttons
    } else {
      controls.addEventListener('lock', () => {
        startScreen.style.display = 'none';
        pauseScreen.style.display = 'none';
        // Resume audio when controls are locked (game resumed)
        audioEngine.resume();
      });

      controls.addEventListener('unlock', () => {
        // Only show pause screen if we are not in the start screen
        if (startScreen.style.display === 'none') {
          pauseScreen.style.display = 'flex';
          // Pause audio when controls are unlocked (game paused)
          audioEngine.pause();
        }
      });
    }

    resumeBtn.addEventListener('click', () => {
      if (isTouchDevice) {
        activateControls();
        pauseScreen.style.display = 'none';
        audioEngine.resume();
      } else {
        controls.lock();
      }
    });

  } catch (error) {
    console.error('Error loading letters:', error);
    loadingScreen.innerHTML = `
      <div style="color: #ff6b6b; text-align: center; padding: 20px;">
        <h2>Error Loading Experience</h2>
        <p style="margin: 10px 0;">${error.message || 'Failed to load assets'}</p>
        <p style="font-size: 12px; opacity: 0.7;">Check the browser console for details (F12)</p>
        <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
})();

// 6. Start Experience
startBtn.addEventListener('click', () => {
  // Initialize Audio Context
  audioEngine.init();

  // Setup visibility handler for tab switching
  audioEngine.setupVisibilityHandler();

  // Play background theme music
  audioEngine.playBackgroundTheme(AUDIO.THEME_PATH);

  // Preload all narrations
  lettersData.forEach(letter => {
    if (letter.narration) {
      audioEngine.registerNarration(letter.id, letter.narration);
    }
  });

  // Activate Controls (Enter FPS mode)
  activateControls();

  // Hide Start Screen
  startScreen.style.opacity = 0;
  setTimeout(() => {
    startScreen.style.display = 'none';
  }, 500);
});

// Mobile pause button handler
const pauseBtn = document.getElementById('mobile-pause-btn');
if (pauseBtn) {
  pauseBtn.addEventListener('click', () => {
    deactivateControls();
    pauseScreen.style.display = 'flex';
    audioEngine.pause();
  });
}

// 7. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update Controls
  updateControls(delta);
  
  // Update debug speed display
  currentSpeedDisplay.textContent = getVelocity().toFixed(2);

  // Check Proximity
  let activeLetterId = null;
  if (proximityManager) {
    activeLetterId = proximityManager.update();

    // Update Audio Theme
    themeMixer.update(activeLetterId);

    // Update UI
    const previewContainer = document.getElementById('letter-preview');
    const frontImage = document.getElementById('preview-front');
    const backImage = document.getElementById('preview-back');
    const subtitleContainer = document.getElementById('subtitle-container');

    if (activeLetterId) {
      const letterData = lettersData.find(l => l.id === activeLetterId);
      if (letterData) {
        // Update Images
        const frontPath = letterData.frontImage || `/assets/letters/${activeLetterId}.jpg`;
        const backPath = letterData.backImage || `/assets/letters/${activeLetterId}-${activeLetterId}.jpg`;

        if (frontImage.src !== new URL(frontPath, window.location.href).href) {
          frontImage.src = frontPath;
        }
        if (backImage.src !== new URL(backPath, window.location.href).href) {
          backImage.src = backPath;
        }

        // Show Preview
        previewContainer.classList.add('visible');

        // Update Subtitle (Mocking text for now as it's not in JSON)
        // In a real scenario, we would read letterData.text or letterData.subtitle
        const subtitleText = letterData.text || `Listening to Letter ${activeLetterId}...`;
        subtitleContainer.innerHTML = `<div class="subtitle">${subtitleText}</div>`;
      }
    } else {
      // Hide Preview
      previewContainer.classList.remove('visible');
      // Clear Subtitle
      subtitleContainer.innerHTML = '';
    }
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
      letter.rotation.y = Math.sin(time * ANIMATION.ROTATION_SPEED + offset) * ANIMATION.ROTATION_AMPLITUDE;

      // Swaying (wind)
      letter.rotation.z = Math.sin(time * ANIMATION.SWAY_SPEED + offset) * ANIMATION.SWAY_AMPLITUDE;

      // Vertical bobbing (air currents)
      letter.position.y = letter.userData.position.y + Math.sin(time * ANIMATION.BOB_SPEED + offset) * ANIMATION.BOB_AMPLITUDE;
    });

    // Update Audio Theme
    // themeMixer.update(activeLetterId) is already called above
  }

  // Render
  renderer.render(scene, camera);
}

animate();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Dispose audio resources
  audioEngine.dispose();
  
  // Dispose Three.js resources
  letterObjects.forEach(letter => {
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
  
  // Dispose renderer
  renderer.dispose();
  
  console.log('Resources cleaned up on page unload');
});
