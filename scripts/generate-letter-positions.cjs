/**
 * Letter Position Generator — Meander Layout v3
 * Generates a smooth meandering river path with zone 3 mirrored for S-flow.
 * Deterministic via seeded PRNG.
 */

const fs = require('fs');
const path = require('path');

// ── Meander configuration ──────────────────────────────────────────
const MEANDER_CONFIG = {
  freq: 0.16,
  freq2: 0.05,
  mix2: 0.5,
  phase: 2.45,
  baseAmp: 1.5,
  maxAmp: 9,
  ampCurve: 0.8,
  jitX: 0.2,
  jitZ: 0,
  zRand: 0.45,
  minSp: 4,
  seed: 42,
  mirrorZ3: true,
};

// ── Zone definitions (expanded ranges) ─────────────────────────────
const ZONES = [
  { id: 1, name: 'Introduction', letterCount: 1, zStart: -42, zEnd: -32 },
  { id: 2, name: 'Building', letterCount: 5, zStart: -27, zEnd: -11 },
  { id: 3, name: 'Intensifying', letterCount: 12, zStart: -4, zEnd: 20 },
  { id: 4, name: 'Climax', letterCount: 28, zStart: 26, zEnd: 65 },
];

const Y_HEIGHT = 1.6;

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 2D distance on XZ plane ────────────────────────────────────────
function distance2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// ── Meandering centerline ──────────────────────────────────────────
function meanderX(z, amp) {
  const { freq, freq2, mix2, phase } = MEANDER_CONFIG;
  return amp * (Math.sin(freq * z + phase) + mix2 * Math.sin(freq2 * z + phase * 1.7 + 0.8));
}

// ── Amplitude at a given z (grows from baseAmp to maxAmp) ──────────
function amplitudeAt(z) {
  const { baseAmp, maxAmp, ampCurve } = MEANDER_CONFIG;
  const totalZRange = ZONES[ZONES.length - 1].zEnd - ZONES[0].zStart;
  const t = Math.max(0, Math.min(1, (z - ZONES[0].zStart) / totalZRange));
  return baseAmp + (maxAmp - baseAmp) * Math.pow(t, ampCurve);
}

// ── Zone 3 mirror blending ─────────────────────────────────────────
function applyZone3Mirror(x, z) {
  if (!MEANDER_CONFIG.mirrorZ3) return x;

  const z3 = ZONES.find((zo) => zo.id === 3);
  if (!z3) return x;

  const blendWidth = 3;
  const enterStart = z3.zStart - blendWidth;
  const enterEnd = z3.zStart + blendWidth;
  const exitStart = z3.zEnd - blendWidth;
  const exitEnd = z3.zEnd + blendWidth;

  if (z >= enterEnd && z <= exitStart) {
    // Fully inside zone 3 — negate x
    return -x;
  } else if (z > enterStart && z < enterEnd) {
    // Blending into zone 3
    const t = (z - enterStart) / (enterEnd - enterStart);
    const blend = t * t * (3 - 2 * t); // smoothstep
    return x * (1 - 2 * blend);
  } else if (z > exitStart && z < exitEnd) {
    // Blending out of zone 3
    const t = (z - exitStart) / (exitEnd - exitStart);
    const blend = t * t * (3 - 2 * t); // smoothstep
    return x * (-1 + 2 * blend);
  }
  return x;
}

// ── Generate all letter positions ──────────────────────────────────
function generateLetterPositions() {
  const rand = mulberry32(MEANDER_CONFIG.seed);
  const allPositions = [];
  let letterId = 1;

  for (const zone of ZONES) {
    const count = zone.letterCount;
    const zSpan = zone.zEnd - zone.zStart;

    for (let i = 0; i < count; i++) {
      // Evenly-spaced Z with randomness
      const baseZ = zone.zStart + ((i + 0.5) / count) * zSpan;
      const zOffset = (rand() - 0.5) * MEANDER_CONFIG.zRand * (zSpan / count);
      const z = baseZ + zOffset;

      // Meandering centerline x
      const amp = amplitudeAt(z);
      let x = meanderX(z, amp);

      // Zone 3 mirror
      x = applyZone3Mirror(x, z);

      // Perpendicular jitter
      x += (rand() - 0.5) * 2 * MEANDER_CONFIG.jitX;

      allPositions.push({
        id: letterId,
        zone: zone.id,
        position: { x, y: Y_HEIGHT, z },
      });

      letterId++;
    }
  }

  // ── Spacing enforcement relaxation ─────────────────────────────
  const minSp = MEANDER_CONFIG.minSp;
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < allPositions.length; i++) {
      for (let j = i + 1; j < allPositions.length; j++) {
        const pi = allPositions[i].position;
        const pj = allPositions[j].position;
        const dist = distance2D(pi, pj);
        if (dist < minSp && dist > 0.001) {
          const overlap = (minSp - dist) / 2;
          const dx = (pj.x - pi.x) / dist;
          const dz = (pj.z - pi.z) / dist;
          pi.x -= dx * overlap;
          pi.z -= dz * overlap;
          pj.x += dx * overlap;
          pj.z += dz * overlap;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return allPositions;
}

// ── Load existing letters.json to preserve metadata ────────────────
function loadExistingLetters() {
  const lettersPath = path.join(__dirname, '../src/data/letters.json');
  const content = fs.readFileSync(lettersPath, 'utf8');
  return JSON.parse(content);
}

// ── Merge new positions with existing letter metadata ──────────────
function mergeLettersWithPositions(existingLetters, newPositions) {
  return newPositions.map((newLetter, index) => {
    const existing = existingLetters[index] || {};

    return {
      id: newLetter.id,
      text: existing.text || '',
      position: {
        x: parseFloat(newLetter.position.x.toFixed(2)),
        y: newLetter.position.y,
        z: parseFloat(newLetter.position.z.toFixed(2)),
      },
      zone: newLetter.zone,
      narration: existing.narration || `/assets/audio/narration_${newLetter.id}.mp3`,
      theme: existing.theme || '/assets/audio/theme_1.mp3',
      frontImage: existing.frontImage || `/assets/letters/${newLetter.id}.jpg`,
      backImage: existing.backImage || `/assets/letters/${newLetter.id}-${newLetter.id}.jpg`,
      model: existing.model || `/assets/models/${newLetter.id}.glb`,
    };
  });
}

// ── Validate spacing ───────────────────────────────────────────────
function validateSpacing(letters) {
  console.log('\nValidating spacing constraints...');
  let valid = true;

  for (let i = 0; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      const dist = distance2D(letters[i].position, letters[j].position);
      if (dist < MEANDER_CONFIG.minSp) {
        console.log(
          `  WARNING: Letters ${letters[i].id} and ${letters[j].id} are only ${dist.toFixed(2)} units apart!`
        );
        valid = false;
      }
    }
  }

  if (valid) {
    console.log(`  All letters meet minimum spacing requirement of ${MEANDER_CONFIG.minSp} units.`);
  }

  return valid;
}

// ── Main ───────────────────────────────────────────────────────────
function main() {
  console.log('Letter Position Generator — Meander Layout v3');
  console.log('==============================================\n');

  const newPositions = generateLetterPositions();
  console.log(`Generated ${newPositions.length} letter positions.`);

  let existingLetters = [];
  try {
    existingLetters = loadExistingLetters();
    console.log(`Loaded ${existingLetters.length} existing letters for metadata.`);
  } catch (err) {
    console.log('No existing letters.json found, creating new file.');
  }

  const finalLetters = mergeLettersWithPositions(existingLetters, newPositions);
  validateSpacing(finalLetters);

  console.log('\nZone Summary:');
  for (const zone of ZONES) {
    const zoneLetters = finalLetters.filter((l) => l.zone === zone.id);
    const zValues = zoneLetters.map((l) => l.position.z);
    console.log(
      `  Zone ${zone.id} (${zone.name}): ${zoneLetters.length} letters, Z: [${Math.min(...zValues).toFixed(1)}, ${Math.max(...zValues).toFixed(1)}]`
    );
  }

  console.log('\nMeander config:', JSON.stringify(MEANDER_CONFIG, null, 2));

  const outputPath = path.join(__dirname, '../src/data/letters.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalLetters, null, 2) + '\n');
  console.log(`\nWrote ${finalLetters.length} letters to ${outputPath}`);
}

main();
