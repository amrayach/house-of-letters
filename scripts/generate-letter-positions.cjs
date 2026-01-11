/**
 * Letter Position Generator
 * Generates organic spiral layout with 4 chronological zones and 5-unit minimum spacing
 */

const fs = require('fs');
const path = require('path');

// Zone definitions
const ZONES = [
  {
    id: 1,
    name: 'Introduction',
    letterCount: 1,
    zStart: -40,
    zEnd: -35,
    radiusStart: 0,
    radiusEnd: 3
  },
  {
    id: 2,
    name: 'Building',
    letterCount: 5,
    zStart: -25,
    zEnd: -15,
    radiusStart: 4,
    radiusEnd: 6
  },
  {
    id: 3,
    name: 'Intensifying',
    letterCount: 12,
    zStart: -5,
    zEnd: 10,
    radiusStart: 6,
    radiusEnd: 10
  },
  {
    id: 4,
    name: 'Climax',
    letterCount: 28,
    zStart: 15,
    zEnd: 40,
    radiusStart: 10,
    radiusEnd: 16
  }
];

const MIN_SPACING = 5;
const MAX_RETRIES = 100;
const Y_HEIGHT = 1.6;

// Calculate distance between two positions (2D on XZ plane)
function distance2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Check if a position is valid (>= MIN_SPACING from all existing positions)
function isValidPosition(newPos, existingPositions) {
  for (const pos of existingPositions) {
    if (distance2D(newPos, pos) < MIN_SPACING) {
      return false;
    }
  }
  return true;
}

// Generate a random position within a zone
function generatePositionInZone(zone, radiusMultiplier = 1.0) {
  // Random z within zone
  const z = zone.zStart + Math.random() * (zone.zEnd - zone.zStart);
  
  // Calculate radius at this z position (linear interpolation)
  const zProgress = (z - zone.zStart) / (zone.zEnd - zone.zStart);
  let radius = zone.radiusStart + (zone.radiusEnd - zone.radiusStart) * zProgress;
  
  // Apply radius multiplier for retry expansion
  radius *= radiusMultiplier;
  
  // Random position within circular area
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()) * radius; // sqrt for uniform distribution
  
  const x = r * Math.cos(angle);
  
  return { x, y: Y_HEIGHT, z };
}

// Generate all letter positions
function generateLetterPositions() {
  const allPositions = [];
  let letterId = 1;
  
  for (const zone of ZONES) {
    console.log(`Generating ${zone.letterCount} letters for Zone ${zone.id}: ${zone.name}`);
    
    for (let i = 0; i < zone.letterCount; i++) {
      let position = null;
      let attempts = 0;
      let radiusMultiplier = 1.0;
      
      while (!position) {
        const candidate = generatePositionInZone(zone, radiusMultiplier);
        
        if (isValidPosition(candidate, allPositions)) {
          position = candidate;
        } else {
          attempts++;
          
          if (attempts >= MAX_RETRIES) {
            // Expand search radius by 10%
            radiusMultiplier *= 1.1;
            attempts = 0;
            console.log(`  Letter ${letterId}: Expanding radius (multiplier: ${radiusMultiplier.toFixed(2)})`);
          }
        }
      }
      
      allPositions.push({
        id: letterId,
        zone: zone.id,
        position
      });
      
      letterId++;
    }
  }
  
  return allPositions;
}

// Load existing letters.json to preserve metadata
function loadExistingLetters() {
  const lettersPath = path.join(__dirname, '../src/data/letters.json');
  const content = fs.readFileSync(lettersPath, 'utf8');
  return JSON.parse(content);
}

// Merge new positions with existing letter metadata
function mergeLettersWithPositions(existingLetters, newPositions) {
  return newPositions.map((newLetter, index) => {
    const existing = existingLetters[index] || {};
    
    return {
      id: newLetter.id,
      text: existing.text || '',
      position: {
        x: parseFloat(newLetter.position.x.toFixed(2)),
        y: newLetter.position.y,
        z: parseFloat(newLetter.position.z.toFixed(2))
      },
      zone: newLetter.zone,
      narration: existing.narration || `/assets/audio/narration_${newLetter.id}.wav`,
      theme: existing.theme || '/assets/audio/theme_1.wav',
      frontImage: existing.frontImage || `/assets/letters/${newLetter.id}.jpg`,
      backImage: existing.backImage || `/assets/letters/${newLetter.id}-${newLetter.id}.jpg`,
      model: existing.model || `/assets/models/${newLetter.id}.glb`
    };
  });
}

// Validate all letters meet spacing requirements
function validateSpacing(letters) {
  console.log('\nValidating spacing constraints...');
  let valid = true;
  
  for (let i = 0; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      const dist = distance2D(letters[i].position, letters[j].position);
      if (dist < MIN_SPACING) {
        console.log(`  WARNING: Letters ${letters[i].id} and ${letters[j].id} are only ${dist.toFixed(2)} units apart!`);
        valid = false;
      }
    }
  }
  
  if (valid) {
    console.log('  All letters meet minimum spacing requirement of 5 units.');
  }
  
  return valid;
}

// Main execution
function main() {
  console.log('Letter Position Generator');
  console.log('========================\n');
  
  // Generate new positions
  const newPositions = generateLetterPositions();
  
  console.log(`\nGenerated ${newPositions.length} letter positions.`);
  
  // Load existing letters
  let existingLetters = [];
  try {
    existingLetters = loadExistingLetters();
    console.log(`Loaded ${existingLetters.length} existing letters for metadata.`);
  } catch (err) {
    console.log('No existing letters.json found, creating new file.');
  }
  
  // Merge with existing metadata
  const finalLetters = mergeLettersWithPositions(existingLetters, newPositions);
  
  // Validate spacing
  validateSpacing(finalLetters);
  
  // Print zone summary
  console.log('\nZone Summary:');
  for (const zone of ZONES) {
    const zoneLetters = finalLetters.filter(l => l.zone === zone.id);
    console.log(`  Zone ${zone.id} (${zone.name}): ${zoneLetters.length} letters, Z: [${zone.zStart}, ${zone.zEnd}]`);
  }
  
  // Write output
  const outputPath = path.join(__dirname, '../src/data/letters.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalLetters, null, 2) + '\n');
  console.log(`\nWrote ${finalLetters.length} letters to ${outputPath}`);
}

main();
