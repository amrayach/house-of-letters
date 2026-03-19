import * as THREE from 'three';
import { ATMOSPHERE_ZONES, SCENE } from '@config/constants.js';

// Pre-computed THREE.Color targets for each zone (avoids per-frame allocation)
const zoneColors = ATMOSPHERE_ZONES.map((z) => ({
  ambient: new THREE.Color(z.ambientColor),
  directional: new THREE.Color(z.directionalColor),
  fog: new THREE.Color(z.fogColor),
  zMin: z.zMin,
  zMax: z.zMax,
}));

// Working colors that get lerped toward target each frame
const currentAmbient = new THREE.Color();
const currentDirectional = new THREE.Color();
const currentFog = new THREE.Color();
const targetAmbient = new THREE.Color();
const targetDirectional = new THREE.Color();
const targetFog = new THREE.Color();

let lightsRef = null;
let fogRef = null;

const TRANSITION_BAND = 10; // units of Z for cross-zone blending

function blendZoneColors(cameraZ) {
  // Find the primary zone the camera is in
  let idx = 0;
  for (let i = 0; i < zoneColors.length; i++) {
    if (cameraZ >= zoneColors[i].zMin && cameraZ < zoneColors[i].zMax) {
      idx = i;
      break;
    }
  }

  const zone = zoneColors[idx];
  targetAmbient.copy(zone.ambient);
  targetDirectional.copy(zone.directional);
  targetFog.copy(zone.fog);

  // Blend with neighbouring zone inside the transition band
  if (idx > 0) {
    const boundary = zone.zMin;
    const dist = cameraZ - boundary;
    if (dist < TRANSITION_BAND / 2) {
      const t = 1 - (dist + TRANSITION_BAND / 2) / TRANSITION_BAND;
      if (t > 0) {
        const prev = zoneColors[idx - 1];
        targetAmbient.lerp(prev.ambient, t);
        targetDirectional.lerp(prev.directional, t);
        targetFog.lerp(prev.fog, t);
      }
    }
  }

  if (idx < zoneColors.length - 1) {
    const boundary = zone.zMax;
    const dist = boundary - cameraZ;
    if (dist < TRANSITION_BAND / 2) {
      const t = 1 - (dist + TRANSITION_BAND / 2) / TRANSITION_BAND;
      if (t > 0) {
        const next = zoneColors[idx + 1];
        targetAmbient.lerp(next.ambient, t);
        targetDirectional.lerp(next.directional, t);
        targetFog.lerp(next.fog, t);
      }
    }
  }
}

export function initAtmosphere(lights, fog) {
  lightsRef = lights;
  fogRef = fog;

  // Seed current colors to Zone 1 so there's no flash on first frame
  const z1 = zoneColors[0];
  currentAmbient.copy(z1.ambient);
  currentDirectional.copy(z1.directional);
  currentFog.copy(z1.fog);

  // Apply immediately
  lightsRef.ambientLight.color.copy(currentAmbient);
  lightsRef.frontLight.color.copy(currentDirectional);
  lightsRef.backLight.color.copy(currentDirectional);
  lightsRef.topLight.color.copy(currentDirectional);
  fogRef.color.copy(currentFog);
}

export function updateAtmosphere(cameraZ, deltaTime) {
  if (!lightsRef || !fogRef) return;

  blendZoneColors(cameraZ);

  // Exponential damping toward target (MathUtils.damp style)
  const factor = 1 - Math.exp(-SCENE.ZONE_LERP_SPEED * deltaTime);
  currentAmbient.lerp(targetAmbient, factor);
  currentDirectional.lerp(targetDirectional, factor);
  currentFog.lerp(targetFog, factor);

  lightsRef.ambientLight.color.copy(currentAmbient);
  lightsRef.frontLight.color.copy(currentDirectional);
  lightsRef.backLight.color.copy(currentDirectional);
  lightsRef.topLight.color.copy(currentDirectional);
  fogRef.color.copy(currentFog);
}
