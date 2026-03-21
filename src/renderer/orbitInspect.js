import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { INSPECT, RENDERER_QUALITY } from '@config/constants.js';

// ---------------------------------------------------------------------------
// Module state — nothing created until init() is called
// ---------------------------------------------------------------------------

let initialized = false;
let active = false;

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let container = null;
let currentClone = null;
let maxAnisotropy = 0;

// Reusable scratch objects (allocated once on init, not per-frame)
const scratchBox = new THREE.Box3();
const scratchCenter = new THREE.Vector3();
const scratchSize = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

function createStudioLighting(targetScene) {
  // Hemisphere: soft ambient fill — sky-ish top, warm-dark ground
  // Provides base illumination so neither side of the letter is fully dark
  const hemi = new THREE.HemisphereLight(0xd0d0e0, 0x303040, 0.5);
  targetScene.add(hemi);

  // Front light: illuminates the front face of the letter
  const front = new THREE.DirectionalLight(0xfff4e6, 0.5);
  front.position.set(0, 2, 5);
  targetScene.add(front);

  // Back light: illuminates the back face equally so both sides are readable
  const back = new THREE.DirectionalLight(0xfff4e6, 0.5);
  back.position.set(0, 2, -5);
  targetScene.add(back);

  // Top fill: adds subtle volume to the glass enclosure
  const top = new THREE.DirectionalLight(0xc8d0e0, 0.25);
  top.position.set(0, 5, 0);
  targetScene.add(top);
}

// ---------------------------------------------------------------------------
// Model cloning and material enhancement
// ---------------------------------------------------------------------------

/**
 * Determines whether a child should be kept in the orbit clone.
 * Removes: focus-target helper planes, string Line geometry.
 */
function shouldKeepChild(child) {
  if (child.userData?.isFocusHelper) return false;
  if (child.isLine) return false;
  return true;
}

/**
 * Remove unwanted children from the cloned model.
 * Traverses in reverse to safely splice while iterating.
 */
function pruneClone(clone) {
  const toRemove = [];
  clone.traverse((child) => {
    if (child === clone) return;
    if (!shouldKeepChild(child)) {
      toRemove.push(child);
    }
  });

  for (const child of toRemove) {
    if (child.parent) {
      child.parent.remove(child);
    }
    // Do NOT dispose geometry here — clone(true) shares geometry references
    // with the main scene. Disposing would invalidate GPU buffers used by
    // the live letter models. Materials are also shared at this point
    // (before applyEnhancedMaterials), so skip disposal. The pruned objects
    // will be garbage collected once dereferenced.
  }
}

/**
 * Apply orbit-viewer materials to the cloned model's meshes.
 *
 * DESIGN DECISION: MeshBasicMaterial is intentionally used for letter surfaces,
 * not MeshStandardMaterial or MeshPhysicalMaterial. These models are flat
 * scanned documents — the texture IS the visual content. Lighting-responsive
 * materials create directional shading that makes one side of the letter
 * wash out to white and the other go dark, rendering text unreadable.
 * MeshBasicMaterial renders the texture faithfully from any viewing angle,
 * matching the main scene's approach in letters.js.
 *
 * Texture quality is maximized for close-up inspection: anisotropy pushed
 * to GPU maximum, trilinear filtering, full device pixel ratio on the canvas.
 */
function applyEnhancedMaterials(clone) {
  clone.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const oldMaterial = child.material;
    const isGlass = child.userData?.isGlass === true;

    if (isGlass) {
      child.material = new THREE.MeshBasicMaterial({
        color: 0xc8d8e8,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      child.renderOrder = 1;
    } else if (oldMaterial.map) {
      // Letter surface: MeshBasicMaterial renders the scanned texture as-is.
      // Maximize texture quality for close-up orbit viewing.
      const tex = oldMaterial.map;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      // Push anisotropy to GPU maximum for sharp text at oblique angles.
      // This is set on the shared texture — it also improves the main scene
      // (was previously capped at 8 by RENDERER_QUALITY.LETTER_TEXTURE_ANISOTROPY).
      if (maxAnisotropy > 0) {
        tex.anisotropy = maxAnisotropy;
      }
      tex.needsUpdate = true;

      child.material = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
      });
      child.renderOrder = 0;
    } else {
      child.material = new THREE.MeshBasicMaterial({
        color: oldMaterial.color ? oldMaterial.color.clone() : new THREE.Color(0x888888),
        side: THREE.DoubleSide,
      });
    }

    // Dispose the cloned material we just replaced (not the shared texture)
    oldMaterial.dispose();
  });
}

/**
 * Clone a letter model, prune helpers/strings, center at origin,
 * apply enhanced materials, and return the ready-to-display clone.
 */
function prepareClone(letterObject) {
  const clone = letterObject.clone(true);

  // Prune non-visual children (focus helpers, strings)
  pruneClone(clone);

  // Keep the original scale (MODEL.SCALE = 8) so the model has meaningful
  // world-space size. Only reset position and rotation — the orbit scene
  // centers the model via the bounding box, not via position reset.
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  // Preserve clone.scale from the source (inherited MODEL.SCALE)
  clone.updateMatrixWorld(true);

  applyEnhancedMaterials(clone);

  return clone;
}

// ---------------------------------------------------------------------------
// Clone disposal
// ---------------------------------------------------------------------------

function disposeClone() {
  if (!currentClone) return;

  currentClone.traverse((child) => {
    // Do NOT dispose geometry — clone(true) shares geometry references
    // with the main scene's letter models. Only dispose materials that
    // were created fresh by applyEnhancedMaterials (MeshBasicMaterial
    // instances). The .map textures inside those materials are shared with
    // the main scene and must NOT be disposed — Three.js material.dispose()
    // only frees the material's shader program/uniforms, not its textures.
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });

  if (scene) scene.remove(currentClone);
  currentClone = null;
}

// ---------------------------------------------------------------------------
// WebGL context loss handlers
// ---------------------------------------------------------------------------

function handleContextLost(event) {
  event.preventDefault();
  active = false;
  console.warn('[orbitInspect] WebGL context lost');
}

function handleContextRestored() {
  // Renderer state is auto-restored by Three.js after context restore.
  // The next render() call will produce output again.
  // The integration layer (main.js) decides whether to re-show or revert to scan.
  console.info('[orbitInspect] WebGL context restored');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the orbit viewer. Creates scene, camera, renderer, controls,
 * and lighting. Appends the renderer canvas to the given container element.
 * Idempotent — safe to call multiple times.
 */
export function init(containerElement) {
  if (initialized) return;

  container = containerElement;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08080f);

  // Camera — far plane must accommodate models at MODEL.SCALE (8x)
  camera = new THREE.PerspectiveCamera(
    INSPECT.ORBIT_FOV,
    1, // aspect updated on first resize()
    0.01,
    200,
  );
  camera.position.set(0, 0, 2);

  // Renderer — small viewport inside the inspect overlay, not fullscreen
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  // Use full device pixel ratio — the orbit canvas is small enough to afford it,
  // and close-up text readability benefits from maximum sharpness.
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  // Capture GPU maximum anisotropy for texture quality boost
  maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  // Context loss handling
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

  // OrbitControls — attached to the orbit canvas, not the main scene canvas
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = INSPECT.ORBIT_DAMPING_FACTOR;
  controls.enablePan = true;
  controls.screenSpacePanning = true; // pan in screen plane — natural for reading flat documents
  controls.minDistance = INSPECT.ORBIT_MIN_DISTANCE;
  controls.maxDistance = INSPECT.ORBIT_MAX_DISTANCE;
  controls.autoRotate = false;
  controls.autoRotateSpeed = INSPECT.ORBIT_AUTO_ROTATE_SPEED;
  // Arrow key panning for reading zoomed-in text. Safe: OrbitControls gates
  // onKeyDown on this.enabled (false when orbit is inactive), and dispose()
  // calls stopListenToKeyEvents() to remove the window listener.
  controls.listenToKeyEvents(window);
  controls.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };
  controls.keyPanSpeed = 15.0; // faster panning for comfortable reading
  controls.enabled = false; // enabled when showLetter() is called

  // Studio lighting
  createStudioLighting(scene);

  // Initial size
  resize();

  initialized = true;
}

/**
 * Show a letter model in the orbit viewer.
 * Clones the model, prunes helpers/strings, applies enhanced materials,
 * centers at origin, and enables orbit controls.
 *
 * @param {THREE.Object3D} letterObject — the live letter model from the main scene
 */
export function showLetter(letterObject) {
  if (!initialized) return;

  // Clean up any previous clone
  disposeClone();

  // Prepare the new clone
  currentClone = prepareClone(letterObject);
  scene.add(currentClone);

  // Compute bounding sphere for orbit framing — more reliable than box
  // for flat objects where the thin axis would mislead box-based framing.
  scratchBox.setFromObject(currentClone);
  scratchBox.getCenter(scratchCenter);
  scratchBox.getSize(scratchSize);

  const boundingSphere = scratchBox.getBoundingSphere(new THREE.Sphere());

  // Set orbit target to the model's center
  controls.target.copy(scratchCenter);

  // Position camera to frame the full model using the bounding sphere
  // radius and the camera's vertical FOV. This works regardless of
  // which axis is thin vs wide (letters are flat — Z is very thin).
  const fovRad = THREE.MathUtils.degToRad(INSPECT.ORBIT_FOV);
  const radius = Math.max(boundingSphere.radius, 0.01);
  // Distance so the sphere fits in the viewport with ~30% padding
  const fitDistance = radius / Math.sin(fovRad / 2) * 0.85;

  // Camera looks at the front face (positive Z in local space,
  // which is the readable side). Position camera in front.
  camera.position.set(
    scratchCenter.x + fitDistance * 0.15,   // slight right offset for depth
    scratchCenter.y + fitDistance * 0.05,   // slight upward offset
    scratchCenter.z + fitDistance,
  );

  // Orbit distance limits — allow very close zoom for text inspection
  controls.minDistance = radius * 0.08;
  controls.maxDistance = fitDistance * 3.0;

  camera.lookAt(scratchCenter);
  controls.update();

  controls.enabled = true;
  active = true;
}

/**
 * Hide the orbit viewer. Disables controls, removes and disposes the clone.
 */
export function hide() {
  active = false;

  if (controls) {
    controls.enabled = false;
  }

  disposeClone();
}

/**
 * Render one frame. Call this from the main animate loop.
 * No-op if inactive or not initialized.
 */
export function render() {
  if (!active || !initialized) return;

  controls.update(); // required for damping
  renderer.render(scene, camera);
}

/**
 * Update renderer size to match container dimensions.
 * No-op if not initialized.
 */
export function resize() {
  if (!initialized || !container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  if (width === 0 || height === 0) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/**
 * Full cleanup. Disposes renderer, controls, scene contents, removes canvas.
 * Safe to call even if init() was never called.
 */
export function dispose() {
  if (!initialized) return;

  active = false;

  // Dispose clone
  disposeClone();

  // Dispose controls
  if (controls) {
    controls.dispose();
    controls = null;
  }

  // Remove context loss listeners and dispose renderer
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    renderer.dispose();
    renderer = null;
  }

  // Dispose scene contents — only materials (lights have no geometry/materials
  // to dispose, but traverse handles any future additions safely)
  if (scene) {
    scene.traverse((child) => {
      // Skip geometry disposal — shared with main scene (see disposeClone comment)
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    scene = null;
  }

  camera = null;
  container = null;
  initialized = false;
}

/**
 * Whether the orbit viewer is currently displaying a letter.
 */
export function isActive() {
  return active;
}
