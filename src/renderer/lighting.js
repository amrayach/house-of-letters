import * as THREE from 'three';

export function initLighting(scene) {
  // 1. High Ambient Light for Uniformity
  // This ensures the base brightness is identical on all sides, reducing contrast issues.
  const ambientLight = new THREE.AmbientLight(0xffffff, 3.0); 
  scene.add(ambientLight);

  // 2. Symmetrical Directional Lights (Front & Back)
  // Instead of point lights (which fade with distance), use DirectionalLights for even coverage.
  // We place one directly Front and one directly Back with EQUAL intensity.
  
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
  frontLight.position.set(0, 0, 10); // Directly in front
  scene.add(frontLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
  backLight.position.set(0, 0, -10); // Directly behind
  scene.add(backLight);

  // 3. Top Light (Fill)
  // A soft top light to give volume to the glass container, but weak enough not to cause gradients on paper.
  const topLight = new THREE.DirectionalLight(0xffffff, 0.2);
  topLight.position.set(0, 10, 0);
  scene.add(topLight);

  return { ambientLight, frontLight, backLight, topLight };
}
