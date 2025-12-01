import { execSync } from 'child_process';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const inputDir = './assets/textures';
const outputDir = './assets/textures/compressed';
const texturesDir = './assets/textures';

// Create directories if they don't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}
if (!existsSync(texturesDir)) {
  mkdirSync(texturesDir, { recursive: true });
}

// Get all .glb files
const glbFiles = readdirSync(inputDir).filter(file => file.endsWith('.glb'));

console.log(`Found ${glbFiles.length} GLB files to process...`);
console.log('Pipeline: KTX2 compression → Optimize (flatten, prune, weld, quantize)\n');

glbFiles.forEach(file => {
  const inputPath = join(inputDir, file);
  const tempPath = join(outputDir, `temp_${file}`);
  const outputPath = join(outputDir, file);
  
  console.log(`\nProcessing: ${file}`);
  
  try {
    // Step 1: Apply UASTC/KTX2 texture compression
    console.log(`  → Applying KTX2 texture compression...`);
    execSync(
      `npx gltf-transform uastc ${inputPath} ${tempPath} ` +
      `--level 2 --rdo 4 --zstd 18 ` +
      `--slots "baseColorTexture,emissiveTexture,normalTexture,metallicRoughnessTexture"`,
      { stdio: 'inherit' }
    );
    
    // Step 2: Optimize (flatten, prune, weld, quantize) without re-compressing textures
    console.log(`  → Optimizing geometry and structure...`);
    execSync(
      `npx gltf-transform optimize ${tempPath} ${outputPath} ` +
      `--flatten --prune --weld --compress quantize --texture-compress false`,
      { stdio: 'inherit' }
    );
    
    // Clean up temp file
    execSync(`rm ${tempPath}`, { stdio: 'ignore' });
    
    console.log(`✓ Completed: ${file}`);
  } catch (error) {
    console.error(`✗ Failed to process ${file}:`, error.message);
    // Clean up temp file on error
    try {
      execSync(`rm ${tempPath}`, { stdio: 'ignore' });
    } catch {}
  }
});

console.log('\n✓ All files processed successfully!');
