import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const sharedStringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

export async function loadLetters(scene, lettersData) {
  const letterObjects = [];
  const loadPromises = [];

  console.log(`Attempting to load ${lettersData.length} GLB files...`);

  lettersData.forEach((data) => {
    const fileNumber = data.id;
    const path = `/assets/textures/${fileNumber}.glb`;
    console.log(`Queueing: ${path}`);

    const loadPromise = new Promise((resolve, reject) => {
      gltfLoader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          
          console.log(`Model ${data.id} loaded successfully!`, model);
          console.log(`Model ${data.id} children count:`, model.children.length);
          
          // Scale - reduced from 10x to 8x for better performance
          model.scale.set(8, 8, 8);
          
          // Position the model
          // Spread the letters more on a bigger grid (2x spacing)
          const gridScale = 2.0;
          model.position.set(data.position.x * gridScale, data.position.y, data.position.z * gridScale);
          
          // Make the model face the camera (origin)
          // Calculate angle to look at the origin (where camera starts)
          const angle = Math.atan2(data.position.x * gridScale, data.position.z * gridScale);
          model.rotation.y = angle;
          
          let hasMesh = false;
          
          // Enable shadows and add materials if missing
          model.traverse((child) => {
            if (child.isMesh) {
              hasMesh = true;
              child.castShadow = false; // Disable for performance with many letters
              child.receiveShadow = false; // Disable for performance with many letters
              
              // Ensure bounding volumes are correct for culling
              if (child.geometry) {
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
              }

              console.log(`Mesh in model ${data.id}:`, {
                hasGeometry: !!child.geometry,
                hasMaterial: !!child.material,
                vertexCount: child.geometry?.attributes?.position?.count || 0
              });
              
              // Make existing material more visible
              if (child.material) {
                child.material.side = THREE.DoubleSide;
                
                // Heuristic to distinguish Glass Container vs Letter
                // If material is transparent and has low opacity, assume it's the Glass Container
                const isGlass = child.material.transparent && child.material.opacity < 0.9;
                
                console.log(`Mesh ${child.name} - Is Glass? ${isGlass} (Opacity: ${child.material.opacity})`);

                if (isGlass) {
                    // GLASS SETTINGS
                    // Keep it transparent
                    // Make it shiny (low roughness)
                    if (child.material.roughness !== undefined) child.material.roughness = 0.1;
                    if (child.material.metalness !== undefined) child.material.metalness = 0.1;
                    // Ensure it doesn't cast shadow to not block light to the letter
                    child.castShadow = false;
                    child.receiveShadow = false;
                } else {
                    // LETTER SETTINGS
                    // Force matte finish (Paper)
                    if (child.material.roughness !== undefined) child.material.roughness = 1.0; // Fully matte
                    if (child.material.metalness !== undefined) child.material.metalness = 0.0; // No metalness
                    if (child.material.envMapIntensity !== undefined) child.material.envMapIntensity = 0.0; // No environment reflection on paper
                    
                    // Force Opaque
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    
                    // Force Emissive to Black (No glow by default)
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                    }

                    // Reset color to pure white to ensure texture colors are accurate and not tinted/darkened
                    if (child.material.color) {
                        child.material.color.setHex(0xffffff);
                    }

                    // FIX: Texture Filtering for "mipmap level changes" and sharpness
                    if (child.material.map) {
                        child.material.map.generateMipmaps = true;
                        child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                        child.material.map.magFilter = THREE.LinearFilter;
                        child.material.map.anisotropy = 16; // Maximize sharpness at angles
                        child.material.map.needsUpdate = true;
                    }
                }
                
                child.material.needsUpdate = true;
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
          resolve(model);
        },
        (progress) => {
          // Optional: handle loading progress
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading model ${data.id}: ${percent.toFixed(0)}%`);
        },
        (error) => {
          console.error(`Error loading model ${data.id}:`, error);
          reject(error);
        }
      );
    });

    loadPromises.push(loadPromise);
  });

  // Wait for all models to load
  await Promise.all(loadPromises);
  console.log(`Loaded ${letterObjects.length} letter models`);

  return letterObjects;
}
