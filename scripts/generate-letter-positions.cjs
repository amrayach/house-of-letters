/**
 * Letter Position Generator — Temporal Layout v5 (Widening Corridor)
 * Z-positions: proportional to temporal gaps between diary papers.
 * X-positions: zone-dependent corridor spread (narrow → wide room).
 * Deterministic via seeded PRNG.
 *
 * Input: src/data/diary_index_001_048.csv (client diary index)
 * Output: src/data/letters.json (regenerated with new positions, existing metadata preserved)
 */

const fs = require('fs');
const path = require('path');

// ── Temporal configuration ───────────────────────────────────────────
const TEMPORAL_CONFIG = {
  csvPath: path.join(__dirname, '../src/data/diary_index_001_048.csv'),
  zStart: -42,          // z-position of paper 1 (preserves current)
  minZGap: 0.5,         // base z-gap between consecutive papers (units)
  scale: 0.7,           // temporal gap scaling multiplier
  power: 0.6,           // gap compression exponent (>0.5 widens dynamic range)
  zPadding: 3.0,        // padding around derived zone boundaries
  maxPaperId: 46,       // skip CSV papers beyond this
  validYearRange: [1988, 1992], // auto-correct year typos outside this range
};

// ── Corridor spread configuration (x-axis only) ─────────────────────
// Widening corridor: narrow passage → open room.
// Spread values are half-widths in JSON units (multiplied by GRID_SCALE at runtime).
const CORRIDOR_CONFIG = {
  zoneSpread: { 1: 0, 2: 3, 3: 6, 4: 10 },  // half-width per zone
  blendPapers: 2,   // number of papers over which to blend between zone spreads
  minSp: 2.5,       // minimum 2D distance between any two papers
  seed: 42,         // deterministic PRNG seed
};

// ── Zone definitions (letterCount only — z-ranges are derived) ───────
const ZONES = [
  { id: 1, name: 'Introduction', letterCount: 1 },
  { id: 2, name: 'Building', letterCount: 5 },
  { id: 3, name: 'Intensifying', letterCount: 12 },
  { id: 4, name: 'Climax', letterCount: 28 },
];

const Y_HEIGHT = 1.6;

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 2D distance on XZ plane ──────────────────────────────────────────
function distance2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// ═══════════════════════════════════════════════════════════════════════
// DATE PARSING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse a single date string into a Date object.
 * Handles DD/MM/YY, DD-MM-YY, DD-MM-YYYY, DD-DD/MM/YY (spanning days),
 * and DD-MM (no year, requires contextYear).
 */
function parseDate(raw, contextYear) {
  let s = raw.trim();
  if (!s) return null;

  // Strip en-dash spanning (e.g. "31/12/91–1/1/92") — take first date
  if (s.includes('\u2013')) {
    s = s.split('\u2013')[0].trim();
  }

  // Normalize separators: replace '/' with '-'
  s = s.replace(/\//g, '-');

  // Remove trailing or leading stray separators (e.g. "16-17-/12/91" → "16-17--12-91")
  // After normalization: "16-17--12-91". Clean doubled separators.
  s = s.replace(/-{2,}/g, '-').replace(/^-/, '').replace(/-$/, '');

  const parts = s.split('-');

  if (parts.length < 2) return null;

  // Extract day — handle spanning day range (e.g. "14-15" becomes parts[0]="14", parts[1]="15")
  let day, month, year;

  if (parts.length === 2) {
    // DD-MM (no year)
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = contextYear;
    if (!year) return null;
  } else if (parts.length === 3) {
    // DD-MM-YY or DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (parts.length === 4) {
    // DD-DD-MM-YY (spanning day range like "14-15-4-91" after normalization)
    day = parseInt(parts[0], 10); // take first day
    month = parseInt(parts[2], 10);
    year = parseInt(parts[3], 10);
  } else {
    return null;
  }

  if (isNaN(day) || isNaN(month)) return null;

  // Year handling
  if (year !== undefined && year !== null && !isNaN(year)) {
    if (year < 100) {
      // 2-digit year: 88-99 → 1988-1999
      year = year + 1900;
    }

    // Auto-correct year typos outside valid range
    const [minYear, maxYear] = TEMPORAL_CONFIG.validYearRange;
    if (year < minYear || year > maxYear) {
      const corrected = Math.max(minYear, Math.min(maxYear, year));
      console.log(`  [date-correction] Year ${year} out of range [${minYear}-${maxYear}], corrected to ${corrected} (from "${raw}")`);
      year = corrected;
    }
  } else if (!year) {
    return null;
  }

  // Basic validation
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  // Construct date (months are 0-indexed in JS Date)
  return new Date(year, month - 1, day);
}

/**
 * Extract the anchor (earliest) date from a semicolon-separated date string.
 * Uses same-paper dates for year inference when a date has no year.
 */
function extractAnchorDate(datesStr, paperNumber) {
  const rawDates = datesStr.split(';').map((s) => s.trim()).filter(Boolean);

  // First pass: collect all years from complete dates for context
  const yearsFound = [];
  for (const raw of rawDates) {
    const normalized = raw.replace(/\u2013.*/, '').replace(/\//g, '-').replace(/-{2,}/g, '-');
    const parts = normalized.split('-').filter(Boolean);
    if (parts.length >= 3) {
      let y = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(y)) {
        if (y < 100) y += 1900;
        yearsFound.push(y);
      }
    }
  }

  // Context year: most common year on this paper
  const contextYear = yearsFound.length > 0
    ? yearsFound.sort((a, b) =>
        yearsFound.filter((v) => v === b).length - yearsFound.filter((v) => v === a).length
      )[0]
    : null;

  // Second pass: parse all dates and find earliest
  let earliest = null;
  for (const raw of rawDates) {
    const date = parseDate(raw, contextYear);
    if (date && (!earliest || date < earliest)) {
      earliest = date;
    }
  }

  if (!earliest) {
    console.error(`  ERROR: Could not parse any date for paper ${paperNumber}: "${datesStr}"`);
  }

  return earliest;
}

/**
 * Load and parse the diary index CSV.
 * Returns an array of { paperId, anchorDate, daysSinceFirst } for papers 1..maxPaperId.
 */
function loadAnchorDates() {
  const csvContent = fs.readFileSync(TEMPORAL_CONFIG.csvPath, 'utf8');
  const lines = csvContent.trim().split('\n');

  // Skip header
  const dataLines = lines.slice(1);

  const allAnchors = [];
  const skippedPapers = [];

  for (const line of dataLines) {
    // Split on first comma only (dates may not contain commas, but be safe)
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;

    const paperIdStr = line.substring(0, commaIdx).trim();
    const datesStr = line.substring(commaIdx + 1).trim();

    const paperId = parseInt(paperIdStr, 10);
    if (isNaN(paperId)) continue;

    if (paperId > TEMPORAL_CONFIG.maxPaperId) {
      skippedPapers.push(paperId);
      continue;
    }

    const anchor = extractAnchorDate(datesStr, paperId);
    if (anchor) {
      allAnchors.push({ paperId, anchorDate: anchor });
    }
  }

  if (skippedPapers.length > 0) {
    console.log(`  Skipped papers beyond maxPaperId (${TEMPORAL_CONFIG.maxPaperId}): ${skippedPapers.join(', ')}`);
  }

  // Sort by paper ID
  allAnchors.sort((a, b) => a.paperId - b.paperId);

  // Compute days since first paper
  if (allAnchors.length === 0) {
    throw new Error('No anchor dates parsed from CSV');
  }

  const firstDate = allAnchors[0].anchorDate;
  const MS_PER_DAY = 86400000;

  return allAnchors.map((entry) => ({
    paperId: entry.paperId,
    anchorDate: entry.anchorDate,
    daysSinceFirst: Math.round((entry.anchorDate - firstDate) / MS_PER_DAY),
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPORAL Z-DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute z-positions from temporal anchor dates.
 * zGap(i) = MIN_Z_GAP + SCALE × dayGap(i)^POWER
 */
function computeTemporalZPositions(anchors) {
  const { zStart, minZGap, scale, power } = TEMPORAL_CONFIG;
  const positions = [];

  for (let i = 0; i < anchors.length; i++) {
    if (i === 0) {
      positions.push({ paperId: anchors[i].paperId, z: zStart, dayGap: 0, zGap: 0 });
    } else {
      const dayGap = anchors[i].daysSinceFirst - anchors[i - 1].daysSinceFirst;
      const zGap = minZGap + scale * Math.pow(Math.max(0, dayGap), power);
      const z = positions[i - 1].z + zGap;
      positions.push({ paperId: anchors[i].paperId, z, dayGap, zGap });
    }
  }

  return positions;
}

/**
 * Assign zone IDs from ZONES[].letterCount accumulation.
 * Zone comes from paper ID order, not from z-position ranges.
 */
function assignZones(positions) {
  let zoneIdx = 0;
  let countInZone = 0;

  for (const pos of positions) {
    if (zoneIdx < ZONES.length && countInZone >= ZONES[zoneIdx].letterCount) {
      zoneIdx++;
      countInZone = 0;
    }
    pos.zone = ZONES[zoneIdx].id;
    countInZone++;
  }
}

/**
 * Derive zone z-boundaries from paper positions with padding.
 * Sets zStart and zEnd on each ZONE entry.
 */
function deriveZoneBoundaries(positions) {
  const { zPadding } = TEMPORAL_CONFIG;

  for (const zone of ZONES) {
    const zonePositions = positions.filter((p) => p.zone === zone.id);
    if (zonePositions.length === 0) continue;

    const zValues = zonePositions.map((p) => p.z);
    zone.zStart = Math.min(...zValues) - zPadding;
    zone.zEnd = Math.max(...zValues) + zPadding;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CORRIDOR X-SPREAD (zone-dependent widening)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the effective half-width for a paper based on its zone and position
 * within that zone. Papers near zone boundaries blend between adjacent zone
 * spreads for a smooth corridor widening effect.
 */
function computeCorridorSpread(paperIndex, zone, indexInZone, zoneLetterCount) {
  const { zoneSpread, blendPapers } = CORRIDOR_CONFIG;
  const currentSpread = zoneSpread[zone] ?? 0;

  // Skip blending for zones with too few papers to have distinct entry/exit regions
  if (zoneLetterCount <= blendPapers * 2) {
    return currentSpread;
  }

  // Find adjacent zone spreads for blending
  const prevZone = ZONES.find((z) => z.id === zone - 1);
  const nextZone = ZONES.find((z) => z.id === zone + 1);
  const prevSpread = prevZone ? (zoneSpread[prevZone.id] ?? 0) : currentSpread;
  const nextSpread = nextZone ? (zoneSpread[nextZone.id] ?? 0) : currentSpread;

  // Blend at zone entry (first blendPapers papers)
  if (indexInZone < blendPapers && prevZone) {
    const t = indexInZone / blendPapers;
    const smooth = t * t * (3 - 2 * t); // smoothstep
    return prevSpread + (currentSpread - prevSpread) * smooth;
  }

  // Blend at zone exit (last blendPapers papers)
  const distFromEnd = zoneLetterCount - 1 - indexInZone;
  if (distFromEnd < blendPapers && nextZone) {
    const t = distFromEnd / blendPapers;
    const smooth = t * t * (3 - 2 * t); // smoothstep
    return nextSpread + (currentSpread - nextSpread) * smooth;
  }

  return currentSpread;
}

// ═══════════════════════════════════════════════════════════════════════
// POSITION GENERATION
// ═══════════════════════════════════════════════════════════════════════

function generateLetterPositions(temporalPositions) {
  const rand = mulberry32(CORRIDOR_CONFIG.seed);
  const allPositions = [];

  // Track index within each zone for blending
  const zoneCounters = {};

  for (const tp of temporalPositions) {
    const z = tp.z;
    const zone = tp.zone;

    if (!zoneCounters[zone]) zoneCounters[zone] = 0;
    const indexInZone = zoneCounters[zone]++;
    const zoneLetterCount = ZONES.find((zn) => zn.id === zone)?.letterCount ?? 1;

    // Corridor spread: zone-dependent half-width with boundary blending
    const spread = computeCorridorSpread(
      allPositions.length, zone, indexInZone, zoneLetterCount,
    );

    // Random x within ±spread (uniform distribution via seeded PRNG)
    const x = spread > 0 ? (rand() - 0.5) * 2 * spread : 0;

    allPositions.push({
      id: tp.paperId,
      zone: tp.zone,
      position: { x, y: Y_HEIGHT, z },
      temporalZ: z, // store original temporal z for drift detection
    });
  }

  // ── Spacing enforcement relaxation ─────────────────────────────────
  const minSp = CORRIDOR_CONFIG.minSp;
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

  // ── Temporal z-drift detection ─────────────────────────────────────
  console.log('\nTemporal z-drift check (spacing enforcement):');
  let maxDrift = 0;
  let driftCount = 0;
  for (const p of allPositions) {
    const drift = Math.abs(p.position.z - p.temporalZ);
    if (drift > maxDrift) maxDrift = drift;
    if (drift > 0.5) {
      console.log(`  WARNING: Paper ${p.id} z-drift ${drift.toFixed(2)} units (temporal: ${p.temporalZ.toFixed(2)}, final: ${p.position.z.toFixed(2)})`);
      driftCount++;
    }
  }
  if (driftCount === 0) {
    console.log(`  No significant z-drift (max ${maxDrift.toFixed(3)} units). Temporal accuracy preserved.`);
  } else {
    console.log(`  ${driftCount} paper(s) drifted >0.5 units. Max drift: ${maxDrift.toFixed(2)} units.`);
  }

  return allPositions;
}

// ── Load existing letters.json to preserve metadata ──────────────────
function loadExistingLetters() {
  const lettersPath = path.join(__dirname, '../src/data/letters.json');
  const content = fs.readFileSync(lettersPath, 'utf8');
  return JSON.parse(content);
}

// ── Merge new positions with existing letter metadata ────────────────
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

// ── Validate spacing ─────────────────────────────────────────────────
function validateSpacing(letters) {
  console.log('\nValidating spacing constraints...');
  let valid = true;

  for (let i = 0; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      const dist = distance2D(letters[i].position, letters[j].position);
      if (dist < CORRIDOR_CONFIG.minSp) {
        console.log(
          `  WARNING: Letters ${letters[i].id} and ${letters[j].id} are only ${dist.toFixed(2)} units apart!`
        );
        valid = false;
      }
    }
  }

  if (valid) {
    console.log(`  All letters meet minimum spacing requirement of ${CORRIDOR_CONFIG.minSp} units.`);
  }

  return valid;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function main() {
  console.log('Letter Position Generator — Temporal Layout v5 (Widening Corridor)');
  console.log('================================================================\n');

  // 1. Parse CSV and extract anchor dates
  console.log('Parsing diary index CSV...');
  const anchors = loadAnchorDates();
  console.log(`  Parsed ${anchors.length} anchor dates (papers 1-${anchors[anchors.length - 1].paperId}).`);
  console.log(`  Date range: ${anchors[0].anchorDate.toISOString().slice(0, 10)} to ${anchors[anchors.length - 1].anchorDate.toISOString().slice(0, 10)}`);
  console.log(`  Total span: ${anchors[anchors.length - 1].daysSinceFirst} days`);

  // 2. Compute temporal z-positions
  console.log('\nComputing temporal z-positions...');
  console.log(`  Config: zStart=${TEMPORAL_CONFIG.zStart}, minZGap=${TEMPORAL_CONFIG.minZGap}, scale=${TEMPORAL_CONFIG.scale}, power=${TEMPORAL_CONFIG.power}`);
  const temporalPositions = computeTemporalZPositions(anchors);

  // 3. Assign zones from letterCount accumulation
  assignZones(temporalPositions);

  // 4. Derive zone boundaries from positions
  deriveZoneBoundaries(temporalPositions);

  // Log temporal gap statistics
  console.log('\nTemporal gap statistics:');
  const gaps = temporalPositions.slice(1).map((p, i) => ({
    from: temporalPositions[i].paperId,
    to: p.paperId,
    days: p.dayGap,
    zGap: p.zGap,
  }));
  const maxGap = gaps.reduce((max, g) => (g.days > max.days ? g : max), gaps[0]);
  const minGap = gaps.reduce((min, g) => (g.days < min.days ? g : min), gaps[0]);
  console.log(`  Largest gap: ${maxGap.days} days (P${maxGap.from}→P${maxGap.to}, z-gap ${maxGap.zGap.toFixed(2)})`);
  console.log(`  Smallest gap: ${minGap.days} days (P${minGap.from}→P${minGap.to}, z-gap ${minGap.zGap.toFixed(2)})`);
  console.log(`  Total z-range: ${temporalPositions[0].z.toFixed(1)} to ${temporalPositions[temporalPositions.length - 1].z.toFixed(1)} (${(temporalPositions[temporalPositions.length - 1].z - temporalPositions[0].z).toFixed(1)} units)`);

  // 5. Generate full positions (x from meander, spacing enforcement)
  console.log('\nGenerating corridor x-positions and enforcing spacing...');
  const newPositions = generateLetterPositions(temporalPositions);
  console.log(`  Generated ${newPositions.length} letter positions.`);

  // 6. Load existing metadata and merge
  let existingLetters = [];
  try {
    existingLetters = loadExistingLetters();
    console.log(`  Loaded ${existingLetters.length} existing letters for metadata.`);
  } catch (err) {
    console.log('  No existing letters.json found, creating new file.');
  }

  const finalLetters = mergeLettersWithPositions(existingLetters, newPositions);
  validateSpacing(finalLetters);

  // 7. Zone summary
  console.log('\nZone Summary:');
  for (const zone of ZONES) {
    const zoneLetters = finalLetters.filter((l) => l.zone === zone.id);
    const zValues = zoneLetters.map((l) => l.position.z);
    console.log(
      `  Zone ${zone.id} (${zone.name}): ${zoneLetters.length} letters, Z: [${Math.min(...zValues).toFixed(2)}, ${Math.max(...zValues).toFixed(2)}], derived bounds: [${zone.zStart.toFixed(2)}, ${zone.zEnd.toFixed(2)}]`
    );
  }

  // 8. Configuration summary + x-range per zone
  console.log('\nX-range per zone:');
  for (const zone of ZONES) {
    const zoneLetters = finalLetters.filter((l) => l.zone === zone.id);
    const xValues = zoneLetters.map((l) => l.position.x);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const xAvg = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    console.log(
      `  Zone ${zone.id}: x ∈ [${xMin.toFixed(2)}, ${xMax.toFixed(2)}], avg=${xAvg.toFixed(2)}, spread=${CORRIDOR_CONFIG.zoneSpread[zone.id]}`
    );
  }
  console.log('\nTemporal config:', JSON.stringify(TEMPORAL_CONFIG, null, 2));
  console.log('Corridor config:', JSON.stringify(CORRIDOR_CONFIG, null, 2));

  // 9. Write output
  const outputPath = path.join(__dirname, '../src/data/letters.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalLetters, null, 2) + '\n');
  console.log(`\nWrote ${finalLetters.length} letters to ${outputPath}`);
}

main();
