import * as THREE from 'three';
import { getGLTFLoader } from '@utils/loaders.js';
import { INTERACTION, MODEL, LOADING_RETRY, RENDERER_QUALITY } from '@config/constants.js';

const gltfLoader = getGLTFLoader();
const sharedStringMaterial = new THREE.LineBasicMaterial({ 
  color: 0xffffff, 
  linewidth: 1,
  transparent: true,
  opacity: 0.15
});
const DEFAULT_FRONT_NORMAL_LOCAL = new THREE.Vector3(0, 0, 1);
const DEFAULT_BACK_NORMAL_LOCAL = new THREE.Vector3(0, 0, -1);
const PLANE_NORMAL_LOCAL = new THREE.Vector3(0, 0, 1);
const SIDE_READABLE_AXIS_LOCAL = new THREE.Vector3(0, 1, 0);
const MIN_FOCUS_SIZE = 0.01;
const MIN_NORMAL_OFFSET = 0.001;
const averageNormalLocal = new THREE.Vector3();
const readableAxisLocal = new THREE.Vector3();
const sideNormalLocal = new THREE.Vector3();
const sideWorldQuaternion = new THREE.Quaternion();

function cloneBox3(box) {
  return new THREE.Box3(box.min.clone(), box.max.clone());
}

function synthesizeSideNormalLocal(sideNode, fallbackNormalLocal) {
  averageNormalLocal.set(0, 0, 0);
  let foundNormal = false;

  sideNode.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const normalAttribute = child.geometry?.attributes?.normal;

    if (!normalAttribute || normalAttribute.count === 0) {
      return;
    }

    sideNormalLocal.set(0, 0, 0);

    for (let index = 0; index < normalAttribute.count; index += 1) {
      sideNormalLocal.x += normalAttribute.getX(index);
      sideNormalLocal.y += normalAttribute.getY(index);
      sideNormalLocal.z += normalAttribute.getZ(index);
    }

    if (sideNormalLocal.lengthSq() === 0) {
      return;
    }

    sideNormalLocal
      .normalize()
      .applyQuaternion(child.getWorldQuaternion(sideWorldQuaternion))
      .normalize();

    averageNormalLocal.add(sideNormalLocal);
    foundNormal = true;
  });

  if (!foundNormal || averageNormalLocal.lengthSq() === 0) {
    return fallbackNormalLocal.clone();
  }

  averageNormalLocal.normalize();

  if (averageNormalLocal.dot(fallbackNormalLocal) < 0) {
    averageNormalLocal.negate();
  }

  return averageNormalLocal.clone();
}

function extractSideNormalLocal(sideNode, fallbackNormalLocal) {
  if (!sideNode) {
    return fallbackNormalLocal.clone();
  }

  sideNode.getWorldQuaternion(sideWorldQuaternion);
  readableAxisLocal
    .copy(SIDE_READABLE_AXIS_LOCAL)
    .applyQuaternion(sideWorldQuaternion)
    .normalize();

  if (readableAxisLocal.lengthSq() > 0) {
    if (readableAxisLocal.dot(fallbackNormalLocal) < 0) {
      readableAxisLocal.negate();
    }

    return readableAxisLocal.clone();
  }

  return synthesizeSideNormalLocal(sideNode, fallbackNormalLocal);
}

function createFocusTarget(sideName, sideBoxLocal, sideNormalLocal) {
  const sideCenter = sideBoxLocal.getCenter(new THREE.Vector3());
  const sideSize = sideBoxLocal.getSize(new THREE.Vector3());
  const focusWidth = Math.max(sideSize.x, MIN_FOCUS_SIZE);
  const focusHeight = Math.max(sideSize.y, MIN_FOCUS_SIZE);
  const normalOffset = Math.max(sideSize.z * 0.5, MIN_NORMAL_OFFSET);
  const inspectAnchorLocal = sideCenter.clone().addScaledVector(sideNormalLocal, normalOffset * 2);

  const focusTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(focusWidth, focusHeight),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );

  focusTarget.name = `focus-target-${sideName}`;
  focusTarget.userData.isFocusHelper = true;
  focusTarget.position.copy(sideCenter).addScaledVector(sideNormalLocal, normalOffset);
  focusTarget.quaternion.setFromUnitVectors(PLANE_NORMAL_LOCAL, sideNormalLocal);

  return {
    nodeName: sideName,
    center: sideCenter,
    size: sideSize,
    normal: sideNormalLocal.clone(),
    bounds: cloneBox3(sideBoxLocal),
    inspectAnchorLocal,
    inspectAnchorProvisional: true,
    focusTarget,
  };
}

function buildInteractionMetadata(model, localBounds) {
  const localCenter = localBounds.getCenter(new THREE.Vector3());
  const localSize = localBounds.getSize(new THREE.Vector3());
  const triggerPaddingLocal = new THREE.Vector3(
    INTERACTION.TRIGGER_PADDING_WORLD.x / MODEL.SCALE,
    INTERACTION.TRIGGER_PADDING_WORLD.y / MODEL.SCALE,
    INTERACTION.TRIGGER_PADDING_WORLD.z / MODEL.SCALE,
  );
  const triggerBoxLocal = cloneBox3(localBounds).expandByVector(triggerPaddingLocal);
  const frontNode = model.getObjectByName('Front');
  const backNode = model.getObjectByName('Back');
  const frontBounds = frontNode ? new THREE.Box3().setFromObject(frontNode) : cloneBox3(localBounds);
  const backBounds = backNode ? new THREE.Box3().setFromObject(backNode) : cloneBox3(localBounds);
  const frontNormalLocal = extractSideNormalLocal(frontNode, DEFAULT_FRONT_NORMAL_LOCAL);
  const backNormalLocal = extractSideNormalLocal(backNode, DEFAULT_BACK_NORMAL_LOCAL);
  const front = createFocusTarget('front', frontBounds, frontNormalLocal);
  const back = createFocusTarget('back', backBounds, backNormalLocal);

  front.focusTarget.userData.interactionSide = 'front';
  back.focusTarget.userData.interactionSide = 'back';

  return {
    center: localCenter,
    size: localSize,
    bounds: cloneBox3(localBounds),
    triggerBoxLocal,
    worldSize: localSize.clone().multiplyScalar(MODEL.SCALE),
    readableSides: {
      front,
      back,
    },
  };
}

/**
 * Load a single model with retry logic for slow connections
 */
function loadModelWithRetry(path, retryCount = 0, onDownloadProgress = null) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => resolve(gltf),
      (progress) => {
        if (onDownloadProgress && progress.total > 0) {
          onDownloadProgress(progress.loaded, progress.total);
        }
      },
      (error) => {
        if (retryCount < LOADING_RETRY.MAX_RETRIES) {
          console.warn(`Retrying ${path} (attempt ${retryCount + 2}/${LOADING_RETRY.MAX_RETRIES + 1})...`);
          setTimeout(() => {
            loadModelWithRetry(path, retryCount + 1, onDownloadProgress)
              .then(resolve)
              .catch(reject);
          }, LOADING_RETRY.RETRY_DELAY_MS);
        } else {
          reject(error);
        }
      }
    );
  });
}

/**
 * Yield until the browser has painted a frame (with a timeout fallback for
 * hidden tabs, where requestAnimationFrame is throttled indefinitely).
 * Used between staggered model integrations so each GLTF parse gets its own
 * frame instead of stacking into one long main-thread stall.
 */
function yieldToFrame() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(finish, 0));
    }
    setTimeout(finish, 100);
  });
}

export async function loadLetters(scene, lettersData, renderer, onProgress = null, options = {}) {
  const { staggered = false } = options;
  const letterObjects = [];
  let loadedCount = 0;
  const totalCount = lettersData.length;
  const textureAnisotropy = renderer?.capabilities
    ? Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      RENDERER_QUALITY.LETTER_TEXTURE_ANISOTROPY,
    )
    : 1;
  
  // Track download progress for better UX on slow connections
  const downloadProgress = new Map(); // modelId -> { loaded, total }

  console.log(`Attempting to load ${lettersData.length} GLB files...`);

  const startLoad = (data) => {
    const path = data.model;
    console.log(`Queueing: ${path}`);

    return new Promise((resolve, reject) => {
      // Track per-model download progress
      const onDownloadProgress = (loaded, total) => {
        downloadProgress.set(data.id, { loaded, total });
        const percent = (loaded / total) * 100;
        console.log(`Downloading model ${data.id}: ${percent.toFixed(0)}%`);
      };

      loadModelWithRetry(path, 0, onDownloadProgress)
        .then((gltf) => {
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

          // Face the corridor centerline (x=0) with a forward bias.
          // Papers near center face forward; papers further out angle inward.
          const angle = Math.atan2(
            data.position.x * MODEL.GRID_SCALE,
            8
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
                child.userData.isGlass = isGlass;

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
                    // All 47 source GLBs share the same export defects (see
                    // dev/inspect-glb.mjs + dev/paper-orientation-check.html):
                    // each paper sheet is a closed thin slab whose readable
                    // skin (wound toward local +Y) carries horizontally
                    // mirrored UVs, plus a duplicate skin wound the other way
                    // and near-degenerate rim walls. The sheets also cross at
                    // mid-height, so the duplicate skins won the depth test on
                    // the upper half and showed the scan mirrored. Fix at
                    // load: keep only the readable skin, flip the texture's U
                    // axis, and render FrontSide so each side of the paper
                    // shows exactly its own unmirrored scan. orbitInspect.js
                    // shares these geometry/texture instances and must keep
                    // the same FrontSide convention.
                    const sheetGeometry = child.geometry;
                    if (sheetGeometry?.index) {
                      const posAttr = sheetGeometry.attributes.position;
                      const index = sheetGeometry.index;
                      const kept = [];
                      for (let i = 0; i < index.count; i += 3) {
                        const a = index.getX(i);
                        const b = index.getX(i + 1);
                        const c = index.getX(i + 2);
                        // cross(B-A, C-A).y > 0 => triangle wound toward
                        // local +Y (the readable skin on both sheet nodes)
                        const e1x = posAttr.getX(b) - posAttr.getX(a);
                        const e1z = posAttr.getZ(b) - posAttr.getZ(a);
                        const e2x = posAttr.getX(c) - posAttr.getX(a);
                        const e2z = posAttr.getZ(c) - posAttr.getZ(a);
                        if (e1z * e2x - e1x * e2z > 0) {
                          kept.push(a, b, c);
                        }
                      }
                      if (kept.length > 0 && kept.length < index.count) {
                        sheetGeometry.setIndex(kept);
                      }
                    }

                    // Set correct color space for the texture
                    existingMap.colorSpace = THREE.SRGBColorSpace;
                    existingMap.anisotropy = textureAnisotropy;
                    existingMap.repeat.x = -1;
                    existingMap.offset.x = 1;
                    existingMap.needsUpdate = true;

                    console.log(`[TEXTURE] ${child.name} has texture: ${existingMap.image?.width}x${existingMap.image?.height}`);

                    // Replace with a simple MeshBasicMaterial to eliminate lighting issues
                    child.material = new THREE.MeshBasicMaterial({
                      map: existingMap,
                      side: THREE.FrontSide,
                      transparent: false
                    });

                    // Upload to the GPU now (while a loading/start screen or the
                    // staggered background queue absorbs the cost) instead of on
                    // the first frame the mesh enters the camera frustum, which
                    // showed up as walking-path hitches.
                    if (renderer && typeof renderer.initTexture === 'function') {
                      renderer.initTexture(existingMap);
                    }
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

          const localBounds = new THREE.Box3().setFromObject(model);
          const attachY = localBounds.max.y;
          const interaction = buildInteractionMetadata(model, localBounds);

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

          interaction.readableSides.front.focusTarget.userData.letterId = data.id;
          interaction.readableSides.back.focusTarget.userData.letterId = data.id;
          model.add(interaction.readableSides.front.focusTarget);
          model.add(interaction.readableSides.back.focusTarget);

          // Optimization: Removed per-letter point lights to drastically improve performance.
          // Rely on global scene lighting instead.

          // Store metadata
          model.userData = {
            id: data.id,
            basePositionY: data.position.y,
            baseRotationY: angle,
            interaction,
            ...data
          };

          const finalX = data.position.x * MODEL.GRID_SCALE;
          const finalZ = data.position.z * MODEL.GRID_SCALE;
          console.log(`✓ Model ${data.id} added to scene at position: X=${finalX.toFixed(2)}, Z=${finalZ.toFixed(2)}, userData.id=${model.userData.id}`);

          scene.add(model);
          letterObjects.push(model);
          loadedCount++;
          if (onProgress) onProgress(loadedCount, totalCount);
          resolve(model);
        })
        .catch((error) => {
          console.error(`Error loading model ${data.id} from ${path} (after ${LOADING_RETRY.MAX_RETRIES + 1} attempts):`, error);
          loadedCount++;
          if (onProgress) onProgress(loadedCount, totalCount);
          reject(error);
        });
    });
  };

  let results;

  if (staggered) {
    // Background/deferred path: one model at a time, yielding a frame between
    // integrations. Loading all models concurrently fired dozens of synchronous
    // GLTF parses back-to-back on the main thread (300-500ms long tasks right
    // after entering the archive — the reported 1-3s hang).
    results = [];
    for (const data of lettersData) {
      try {
        results.push({ status: 'fulfilled', value: await startLoad(data) });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
      await yieldToFrame();
    }
  } else {
    // Startup path: parallel — the loading screen absorbs the cost and total
    // wall time matters more than per-frame smoothness.
    results = await Promise.allSettled(lettersData.map(startLoad));
  }

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
