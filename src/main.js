import * as THREE from 'three';
import { initScene } from '@renderer/sceneSetup.js';
import { initLighting } from '@renderer/lighting.js';
import { initControls } from '@renderer/controls.js';
import { loadLetters } from '@renderer/letters.js';
import { audioEngine } from '@audio/audioEngine.js';
import { themeMixer } from '@audio/themeMixer.js';
import { ProximityManager } from '@interaction/proximityManager.js';
import { AUDIO, ASSETS } from '@config/constants.js';
import lettersData from '@data/letters.json';

// 1. Initialize Scene
const { scene, camera, renderer } = initScene();

// 2. Lighting
const { pointLight, pointLight2 } = initLighting(scene);

// 3. Controls
const { controls, update: updateControls } = initControls(camera, document.body);

// 4. Load Content (async)
let letterObjects = [];
let proximityManager = null;

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');

(async () => {
  try {
    console.log('Loading letter models...');
    
    // Progress callback to update UI
    const updateProgress = (loaded, total) => {
      if (loadingProgress) {
        loadingProgress.textContent = `Loading models: ${loaded}/${total}`;
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

    // UI Transition: Loading -> Start
    loadingScreen.style.opacity = 0;
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      startScreen.style.display = 'flex';
    }, 500);

    // Handle Pause/Resume
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

    resumeBtn.addEventListener('click', () => {
      controls.lock();
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

  // Play background theme music
  audioEngine.playBackgroundTheme(AUDIO.THEME_PATH);

  // Preload all narrations
  lettersData.forEach(letter => {
    if (letter.narration) {
      audioEngine.registerNarration(letter.id, letter.narration);
    }
  });

  // Lock Controls (Enter FPS mode)
  controls.lock();

  // Hide Start Screen
  startScreen.style.opacity = 0;
  setTimeout(() => {
    startScreen.style.display = 'none';
  }, 500);
});

// 7. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update Controls
  updateControls(delta);

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
    const animationRadiusSq = 15.0 * 15.0; // Reduced radius for better performance

    letterObjects.forEach((letter, i) => {
      const distSq = camera.position.distanceToSquared(letter.position);

      // Skip animation for distant letters to save CPU
      if (distSq > animationRadiusSq) return;

      const offset = i * 2; // Phase offset

      // Gentle rotation (torsion) - reduced frequency and amplitude
      letter.rotation.y = Math.sin(time * 0.1 + offset) * 0.15;

      // Swaying (wind) - simplified to only z-axis rotation
      letter.rotation.z = Math.sin(time * 0.2 + offset) * 0.03;

      // Vertical bobbing (air currents) - reduced frequency and amplitude
      letter.position.y = letter.userData.position.y + Math.sin(time * 0.3 + offset) * 0.08;
    });

    // Update Audio Theme
    // themeMixer.update(activeLetterId) is already called above
  }

  // Render
  renderer.render(scene, camera);
}

animate();
