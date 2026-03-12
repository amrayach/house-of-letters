import * as THREE from 'three';
import { CAMERA, RENDERER_QUALITY } from '@config/constants.js';

function applyRendererViewport(renderer, camera, pixelRatioCap) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

export function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Dark environment
  scene.fog = new THREE.FogExp2(0x000000, 0.01); // Reduced fog density for larger grid

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500 // Increased to ensure proper rendering distance
  );
  // Camera starts at position from constants (near letter 1)
  camera.position.set(CAMERA.INITIAL_POSITION.x, CAMERA.INITIAL_POSITION.y, CAMERA.INITIAL_POSITION.z);
  // Look forward along the Z axis
  camera.lookAt(CAMERA.INITIAL_POSITION.x, CAMERA.INITIAL_POSITION.y, CAMERA.INITIAL_POSITION.z + 10);

  let pixelRatioCap = RENDERER_QUALITY.IMMERSIVE_PIXEL_RATIO_MAX;

  const renderer = new THREE.WebGLRenderer({
    antialias: false, // Disable antialiasing for better performance
    powerPreference: "high-performance" // Use discrete GPU if available
  });
  applyRendererViewport(renderer, camera, pixelRatioCap);
  renderer.outputColorSpace = THREE.SRGBColorSpace; // Ensure proper color rendering for textures
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better color reproduction
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false; // Disable shadows for better performance with many objects
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Ground (large enough to cover play area)
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000); // Increased from 200 to prevent black screen
  const groundMaterial = new THREE.MeshBasicMaterial({
    color: 0x404040
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false; // Disabled for performance
  scene.add(ground);

  // Grid for visual reference
  const gridHelper = new THREE.GridHelper(500, 200, 0x222222, 0x111111); // Increased to cover larger area
  scene.add(gridHelper);

  // Handle resize
  window.addEventListener('resize', () => {
    applyRendererViewport(renderer, camera, pixelRatioCap);
  });

  const setInspectQuality = (enabled) => {
    const nextPixelRatioCap = enabled
      ? RENDERER_QUALITY.INSPECT_PIXEL_RATIO_MAX
      : RENDERER_QUALITY.IMMERSIVE_PIXEL_RATIO_MAX;

    if (pixelRatioCap === nextPixelRatioCap) {
      return;
    }

    pixelRatioCap = nextPixelRatioCap;
    applyRendererViewport(renderer, camera, pixelRatioCap);
  };

  return { scene, camera, renderer, setInspectQuality };
}
