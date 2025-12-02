import * as THREE from 'three';

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
  // Adjusted camera start position for larger grid (2x spread)
  camera.position.set(0, 1.6, 50);

  const renderer = new THREE.WebGLRenderer({
    antialias: false, // Disable antialiasing for better performance
    powerPreference: "high-performance" // Use discrete GPU if available
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Reduce from 2 to 1.5 for better performance
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}
