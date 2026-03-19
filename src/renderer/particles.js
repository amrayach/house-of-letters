import * as THREE from 'three';
import { DUST } from '@config/constants.js';

export function createDust(scene) {
  const particlesGeometry = new THREE.BufferGeometry();
  const count = DUST.COUNT;

  const positions = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Spread across the full archive corridor
    positions[i3]     = (Math.random() - 0.5) * DUST.SPREAD_X;
    positions[i3 + 1] = Math.random() * DUST.SPREAD_Y;
    positions[i3 + 2] = (Math.random() - 0.5) * DUST.SPREAD_Z + DUST.CENTER_Z;

    basePositions[i3]     = positions[i3];
    basePositions[i3 + 1] = positions[i3 + 1];
    basePositions[i3 + 2] = positions[i3 + 2];
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: DUST.SIZE,
    color: 0xffffff,
    transparent: true,
    opacity: DUST.OPACITY,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  particles.userData.basePositions = basePositions;
  scene.add(particles);

  return particles;
}

export function updateDust(particles, elapsedTime) {
  if (!particles) return;

  const posAttr = particles.geometry.attributes.position;
  const pos = posAttr.array;
  const base = particles.userData.basePositions;
  const count = pos.length / 3;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const phase = i * 0.37;
    const t = elapsedTime * DUST.DRIFT_SPEED + phase;

    pos[i3]     = base[i3]     + Math.sin(t)       * DUST.DRIFT_AMPLITUDE_X;
    pos[i3 + 1] = base[i3 + 1] + Math.sin(t * 0.7) * DUST.DRIFT_AMPLITUDE_Y;
    pos[i3 + 2] = base[i3 + 2] + Math.sin(t * 0.5) * DUST.DRIFT_AMPLITUDE_Z;
  }

  posAttr.needsUpdate = true;
}
