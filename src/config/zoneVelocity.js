/**
 * Zone-adaptive walking speed.
 *
 * Derives zone boundaries from letters.json positions (× GRID_SCALE)
 * and computes a per-frame walking speed multiplier:
 *   - Inside a zone: base speed
 *   - Between zones: smoothly boosted proportional to gap size
 *   - Before zone 1 / after zone 4: base speed
 *
 * Pure data module — no Three.js imports, no side effects.
 */

import lettersData from '@data/letters.json';
import { MODEL, VELOCITY } from '@config/constants.js';

// ── Derive world-space zone boundaries from letter positions ─────────

const ZONE_IDS = [1, 2, 3, 4];

function deriveZoneBoundaries() {
  const zones = [];

  for (const zoneId of ZONE_IDS) {
    const papers = lettersData.filter((l) => l.zone === zoneId);
    if (papers.length === 0) continue;

    const worldZValues = papers.map((l) => l.position.z * MODEL.GRID_SCALE);
    zones.push({
      id: zoneId,
      zMin: Math.min(...worldZValues),
      zMax: Math.max(...worldZValues),
    });
  }

  return zones;
}

const zoneBounds = deriveZoneBoundaries();

// Pre-compute inter-zone gaps
const interZoneGaps = [];
for (let i = 0; i < zoneBounds.length - 1; i++) {
  const trailing = zoneBounds[i];
  const leading = zoneBounds[i + 1];
  const gapStart = trailing.zMax + VELOCITY.ZONE_MARGIN;
  const gapEnd = leading.zMin - VELOCITY.ZONE_MARGIN;
  const gapSize = gapEnd - gapStart;

  interZoneGaps.push({
    fromZone: trailing.id,
    toZone: leading.id,
    gapStart,
    gapEnd,
    gapSize: Math.max(0, gapSize),
  });
}

// Reference gap = largest gap (for normalizing boost factor)
const referenceGap = Math.max(...interZoneGaps.map((g) => g.gapSize), 1);

// ── Speed computation ────────────────────────────────────────────────

/**
 * Compute the walking speed for a given camera z-position.
 *
 * @param {number} cameraZ - Camera world-space z position
 * @param {number} baseSpeed - Base walking speed (from constants or slider)
 * @returns {number} Adjusted walking speed
 */
export function computeWalkingSpeed(cameraZ, baseSpeed) {
  const margin = VELOCITY.ZONE_MARGIN;

  // Check if inside any zone (with margin buffer)
  for (const zone of zoneBounds) {
    if (cameraZ >= zone.zMin - margin && cameraZ <= zone.zMax + margin) {
      return baseSpeed;
    }
  }

  // Check if in an inter-zone gap
  for (const gap of interZoneGaps) {
    if (gap.gapSize < VELOCITY.MIN_GAP_FOR_BOOST) continue;
    if (cameraZ > gap.gapStart && cameraZ < gap.gapEnd) {
      // Normalized position within gap: 0 = just left zone, 1 = about to enter next
      const t = (cameraZ - gap.gapStart) / gap.gapSize;

      // Bell curve: peaks at center of gap, zero at edges
      const bell = Math.sin(Math.PI * t);

      // Boost proportional to gap size relative to largest gap
      const gapRatio = gap.gapSize / referenceGap;
      const multiplier = 1.0 + gapRatio * VELOCITY.MAX_BOOST_FACTOR;

      return baseSpeed * (1.0 + (multiplier - 1.0) * bell);
    }
  }

  // Before zone 1 or after zone 4
  return baseSpeed;
}

/**
 * Get derived zone boundaries (for debugging / diagnostics).
 */
export function getZoneBoundaries() {
  return { zoneBounds, interZoneGaps, referenceGap };
}
