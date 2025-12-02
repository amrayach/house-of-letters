import * as THREE from 'three';
import { getGLTFLoader } from '@utils/loaders.js';
import { MODEL, ASSETS } from '@config/constants.js';

const gltfLoader = getGLTFLoader();
const sharedStringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

export async function loadLetters(scene, lettersData, onProgress = null) {
  const letterObjects = [];
  const loadPromises = [];
  let loadedCount = 0;
  const totalCount = lettersData.length;

  console.log(`Attempting to load ${lettersData.length} GLB files...`);

  lettersData.forEach((data) => {
    const path = data.model;
    console.log(`Queueing: ${path}`);

    const loadPromise = new Promise((resolve, reject) => {
      gltfLoader.load(
        path,
        (gltf) => {
          const model = gltf.scene;

          console.log(`Model ${data.id} loaded successfully!`, model);
          console.log(`Model ${data.id} children count:`, model.children.length);

          // Apply model scale from constants
          model.scale.set(MODEL.SCALE, MODEL.SCALE, MODEL.SCALE);

          // Position the model using grid scale from constants
          model.position.set(
            data.position.x * MODEL.GRID_SCALE,
            data.position.y,
            data.position.z * MODEL.GRID_SCALE
          );

          // Make the model face the camera (origin)
          const angle = Math.atan2(
            data.position.x * MODEL.GRID_SCALE,
            data.position.z * MODEL.GRID_SCALE
          );
          model.rotation.y = angle;

          let hasMesh = false;

          // DEBUG: Log all materials and textures before any modifications
          model.traverse((child) => {
            if (child.isMesh) {
              hasMesh = true;
              const mat = child.material;
              console.log(`[BEFORE] Mesh ${child.name} in model ${data.id}:`, {
                materialName: mat?.name,
                materialType: mat?.type,
                hasMap: !!mat?.map,
                mapImageLoaded: mat?.map?.image ? `${mat.map.image.width}x${mat.map.image.height}` : 'none',
                mapColorSpace: mat?.map?.colorSpace,
                baseColor: mat?.color?.getHexString(),
                transparent: mat?.transparent,
                opacity: mat?.opacity,
                hasNormalMap: !!mat?.normalMap,
                transmission: mat?.transmission,
                roughness: mat?.roughness,
                metalness: mat?.metalness
              });
            }
          });

          // Process meshes
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;

              // Ensure bounding volumes are correct for culling
              if (child.geometry) {
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
              }

              if (child.material) {
                // Identify glass by material name
                const materialName = child.material.name?.toLowerCase() || '';
                const isGlass = materialName.includes('glass') || materialName.includes('plexi');

                console.log(`Processing ${child.name} (${child.material.name}) - Is Glass? ${isGlass}, Material Type: ${child.material.type}`);

                if (isGlass) {
                  // GLASS SETTINGS - Create a simple transparent material
                  child.material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.15,
                    side: THREE.DoubleSide,
                    depthWrite: false
                  });
                  child.renderOrder = 1; // Render glass after opaque objects
                } else {
                  // LETTER SETTINGS - Material_Front and Material_Back
                  // Get the existing texture map
                  const existingMap = child.material.map;
                  
                  if (existingMap) {
                    // Set correct color space for the texture
                    existingMap.colorSpace = THREE.SRGBColorSpace;
                    existingMap.needsUpdate = true;
                    
                    console.log(`[TEXTURE] ${child.name} has texture: ${existingMap.image?.width}x${existingMap.image?.height}`);
                    
                    // Replace with a simple MeshBasicMaterial to eliminate lighting issues
                    child.material = new THREE.MeshBasicMaterial({
                      map: existingMap,
                      side: THREE.DoubleSide,
                      transparent: false
                    });
                  } else {
                    console.warn(`[NO TEXTURE] ${child.name} has no texture map`);
                    // Keep original material for non-textured parts
                    child.material.side = THREE.DoubleSide;
                  }
                  
                  child.renderOrder = 0; // Render letters before glass
                }
              }
            }
          });

          if (!hasMesh) {
            console.warn(`Model ${data.id} has no meshes!`);
          }

          // Calculate bounding box in LOCAL space to find attachment point
          // We need to temporarily reset transforms to get the local axis-aligned bounds
          const originalPosition = model.position.clone();
          const originalRotation = model.rotation.clone();
          const originalScale = model.scale.clone();

          model.position.set(0, 0, 0);
          model.rotation.set(0, 0, 0);
          model.scale.set(1, 1, 1);
          model.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(model);
          const attachY = box.max.y;

          // Restore transforms
          model.position.copy(originalPosition);
          model.rotation.copy(originalRotation);
          model.scale.copy(originalScale);
          model.updateMatrixWorld(true);

          console.log(`Model ${data.id} local bounds - max Y:`, attachY.toFixed(2));
          console.log(`Attaching string at local Y: ${attachY.toFixed(2)}`);

          const stringGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, attachY, 0), // Top of plexiglass in local space
            new THREE.Vector3(0, 50, 0) // Reduced from 1000 to fit within camera view
          ]);
          const stringLine = new THREE.Line(stringGeo, sharedStringMaterial);
          stringLine.frustumCulled = false; // Prevent string from being culled
          model.add(stringLine);

          // Optimization: Removed per-letter point lights to drastically improve performance.
          // Rely on global scene lighting instead.

          // Store metadata
          model.userData = {
            id: data.id,
            ...data
          };

          scene.add(model);
          letterObjects.push(model);
          loadedCount++;
          if (onProgress) onProgress(loadedCount, totalCount);
          resolve(model);
        },
        (progress) => {
          // Optional: handle loading progress
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Loading model ${data.id}: ${percent.toFixed(0)}%`);
          }
        },
        (error) => {
          console.error(`Error loading model ${data.id} from ${path}:`, error);
          loadedCount++;
          if (onProgress) onProgress(loadedCount, totalCount);
          reject(error);
        }
      );
    });

    loadPromises.push(loadPromise);
  });

  // Wait for all models to load, but don't fail if some models are missing
  const results = await Promise.allSettled(loadPromises);
  
  // Log results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected');
  
  console.log(`Loaded ${successful}/${lettersData.length} letter models`);
  
  if (failed.length > 0) {
    console.warn(`Failed to load ${failed.length} models:`, failed.map(r => r.reason));
  }
  
  // Return whatever models were successfully loaded
  return letterObjects;
}
