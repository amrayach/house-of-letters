import * as THREE from 'three';

const TIMELINE_LOG_PREFIX = '[ground-timeline]';

const TIMELINE_DEFAULTS = Object.freeze({
  GROUND_Y: 0.06,
  LABEL_Y: 0.085,
  SPINE_HEAD_PADDING: 18,
  SPINE_TAIL_PADDING: 18,
  SPINE_RADIAL_SEGMENTS: 10,
  SPINE_SEGMENTS: 720,
  SPINE_CORE_RADIUS: 0.04,
  SPINE_HALO_RADIUS: 0.10,
  SPINE_DISTORTED_RADIUS: 0.14,
  ANCHOR_CORE_RADIUS: 0.22,
  ANCHOR_RING_INNER_RADIUS: 0.34,
  ANCHOR_RING_OUTER_RADIUS: 0.48,
  FOCUS_SPEED_MAX: 4.0,
  AMBIENT_CORE_OPACITY: 0.16,
  AMBIENT_HALO_OPACITY: 0.08,
  AMBIENT_DISTORTED_OPACITY: 0.14,
  FOCUSED_CORE_OPACITY: 0.84,
  FOCUSED_HALO_OPACITY: 0.34,
  AMBIENT_ANCHOR_OPACITY: 0.22,
  AMBIENT_ANCHOR_RING_OPACITY: 0.12,
  FOCUSED_ANCHOR_OPACITY: 0.92,
  FOCUSED_ANCHOR_RING_OPACITY: 0.34,
  LABEL_AMBIENT_OPACITY: 0.18,
  LABEL_FOCUSED_OPACITY: 0.92,
  LABEL_AMBIENT_HEIGHT: 0.64,
  LABEL_FOCUSED_HEIGHT: 0.48,
  LABEL_MAX_WIDTH: 12,
  LABEL_OFFSET_FROM_ANCHOR: 1.4,
  LABEL_LATERAL_OFFSET: 0,
  LABEL_RESOLUTION_SCALE: 256,
  LABEL_TEXTURE_ANISOTROPY: 8,
  LABEL_BACKGROUND: 'rgba(8, 12, 18, 0.78)',
  LABEL_BORDER: 'rgba(214, 188, 127, 0.46)',
  LABEL_TEXT: '#f6eed0',
  LABEL_FONT_FAMILY: 'Georgia, "Times New Roman", serif',
  COLOR_CORE: 0xcbb581,
  COLOR_HALO: 0x6f6a53,
  COLOR_FOCUSED: 0xf2dda0,
  DISTORTION_AMPLITUDE: 0.75,
});

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LABEL_TO_CAMERA = new THREE.Vector3();
const LABEL_RIGHT = new THREE.Vector3();
const LABEL_UP = new THREE.Vector3();
const LABEL_BASIS = new THREE.Matrix4();

function mergeTimelineConstants(constants = {}) {
  return { ...TIMELINE_DEFAULTS, ...constants };
}

function createNoopTimeline() {
  return {
    update() {},
    dispose() {},
    preWarm() {},
  };
}

// ── Zone gradient utilities (computed at build time, zero per-frame cost) ──

function computeGradientStops(anchors, gradientHexArray) {
  const zoneZValues = {};
  for (const a of anchors) {
    if (a.zone > 0) {
      if (!zoneZValues[a.zone]) zoneZValues[a.zone] = [];
      zoneZValues[a.zone].push(a.anchorPosition.z);
    }
  }

  const zoneIds = Object.keys(zoneZValues).map(Number).sort((a, b) => a - b);
  return zoneIds.map((zoneId, i) => {
    const values = zoneZValues[zoneId];
    const mid = (Math.min(...values) + Math.max(...values)) / 2;
    const color = new THREE.Color(gradientHexArray[i] ?? gradientHexArray[gradientHexArray.length - 1]);
    return { z: mid, color };
  });
}

const _gradientScratch = new THREE.Color();

function sampleGradient(z, stops) {
  if (stops.length === 0) return new THREE.Color(0xcbb581);
  if (z <= stops[0].z) return stops[0].color.clone();
  if (z >= stops[stops.length - 1].z) return stops[stops.length - 1].color.clone();

  for (let i = 0; i < stops.length - 1; i++) {
    if (z <= stops[i + 1].z) {
      const t = (z - stops[i].z) / (stops[i + 1].z - stops[i].z);
      return stops[i].color.clone().lerp(stops[i + 1].color, t);
    }
  }
  return stops[stops.length - 1].color.clone();
}

function applySpineVertexColors(geometry, stops, darken) {
  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const z = posAttr.getZ(i);
    _gradientScratch.copy(sampleGradient(z, stops));
    if (darken < 1.0) _gradientScratch.multiplyScalar(darken);
    colors[i * 3] = _gradientScratch.r;
    colors[i * 3 + 1] = _gradientScratch.g;
    colors[i * 3 + 2] = _gradientScratch.b;
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function createMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function setMeshOpacity(mesh, opacity) {
  if (!mesh?.material) {
    return;
  }

  mesh.material.opacity = clamp01(opacity);
  mesh.visible = mesh.material.opacity > 0.001;
}

function createRoundedRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function measureTrackedTextWidth(context, text, tracking) {
  let width = 0;

  for (let index = 0; index < text.length; index += 1) {
    width += context.measureText(text[index]).width;
    if (index < text.length - 1) {
      width += tracking;
    }
  }

  return width;
}

function drawTrackedText(context, text, centerX, centerY, tracking) {
  let cursorX = centerX - (measureTrackedTextWidth(context, text, tracking) / 2);

  for (let index = 0; index < text.length; index += 1) {
    const glyph = text[index];
    context.fillText(glyph, cursorX, centerY);
    cursorX += context.measureText(glyph).width + tracking;
  }
}

function createLabelTexture(text, cfg) {
  const fontSize = cfg.LABEL_RESOLUTION_SCALE;
  const tracking = Math.round(fontSize * 0.035);
  const paddingX = Math.round(fontSize * 0.7);
  const paddingY = Math.round(fontSize * 0.42);
  const inset = Math.max(8, Math.round(fontSize * 0.09));
  const innerInset = inset + Math.round(fontSize * 0.08);
  const cornerRadius = Math.max(18, Math.round(fontSize * 0.42));
  const innerRadius = Math.max(14, Math.round(fontSize * 0.28));
  const strokeWidth = Math.max(2, Math.round(fontSize * 0.028));
  const ruleInsetX = innerInset + Math.round(fontSize * 0.08);
  const ruleInsetY = innerInset + Math.round(fontSize * 0.1);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  context.font = `600 ${fontSize}px ${cfg.LABEL_FONT_FAMILY}`;
  const textWidth = measureTrackedTextWidth(context, text, tracking);
  const width = Math.ceil(textWidth + (paddingX * 2));
  const height = Math.ceil(fontSize + (paddingY * 2));

  canvas.width = Math.max(width, 1);
  canvas.height = Math.max(height, 1);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = `600 ${fontSize}px ${cfg.LABEL_FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.imageSmoothingEnabled = true;

  const outerPathArgs = [inset, inset, canvas.width - (inset * 2), canvas.height - (inset * 2), cornerRadius];
  const innerPathArgs = [innerInset, innerInset, canvas.width - (innerInset * 2), canvas.height - (innerInset * 2), innerRadius];

  context.save();
  context.filter = `blur(${Math.round(fontSize * 0.08)}px)`;
  createRoundedRectPath(context, inset + Math.round(fontSize * 0.04), inset + Math.round(fontSize * 0.06), canvas.width - (inset * 2), canvas.height - (inset * 2), cornerRadius);
  context.fillStyle = 'rgba(0, 0, 0, 0.34)';
  context.fill();
  context.restore();

  createRoundedRectPath(context, ...outerPathArgs);
  const outerGradient = context.createLinearGradient(0, inset, 0, canvas.height - inset);
  outerGradient.addColorStop(0, 'rgba(26, 30, 38, 0.96)');
  outerGradient.addColorStop(0.42, cfg.LABEL_BACKGROUND);
  outerGradient.addColorStop(1, 'rgba(5, 8, 14, 0.94)');
  context.fillStyle = outerGradient;
  context.fill();

  const glowGradient = context.createRadialGradient(
    canvas.width * 0.52,
    canvas.height * 0.54,
    fontSize * 0.18,
    canvas.width * 0.52,
    canvas.height * 0.54,
    canvas.width * 0.48,
  );
  glowGradient.addColorStop(0, 'rgba(211, 186, 120, 0.14)');
  glowGradient.addColorStop(0.55, 'rgba(74, 64, 42, 0.08)');
  glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = glowGradient;
  context.fill();

  context.lineWidth = strokeWidth;
  context.strokeStyle = cfg.LABEL_BORDER;
  context.stroke();

  createRoundedRectPath(context, ...innerPathArgs);
  const innerGradient = context.createLinearGradient(0, innerInset, 0, canvas.height - innerInset);
  innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  innerGradient.addColorStop(0.18, 'rgba(43, 47, 55, 0.26)');
  innerGradient.addColorStop(1, 'rgba(7, 10, 16, 0.16)');
  context.fillStyle = innerGradient;
  context.fill();

  context.strokeStyle = 'rgba(241, 225, 181, 0.18)';
  context.lineWidth = Math.max(1, strokeWidth * 0.55);
  context.stroke();

  context.strokeStyle = 'rgba(214, 188, 127, 0.24)';
  context.lineWidth = Math.max(1, strokeWidth * 0.7);
  context.beginPath();
  context.moveTo(ruleInsetX, ruleInsetY);
  context.lineTo(canvas.width - ruleInsetX, ruleInsetY);
  context.moveTo(ruleInsetX, canvas.height - ruleInsetY);
  context.lineTo(canvas.width - ruleInsetX, canvas.height - ruleInsetY);
  context.stroke();

  context.fillStyle = 'rgba(0, 0, 0, 0.72)';
  drawTrackedText(
    context,
    text,
    canvas.width / 2,
    canvas.height / 2 + Math.round(fontSize * 0.042),
    tracking,
  );

  context.fillStyle = cfg.LABEL_TEXT;
  drawTrackedText(
    context,
    text,
    canvas.width / 2,
    canvas.height / 2,
    tracking,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = cfg.LABEL_TEXTURE_ANISOTROPY;
  texture.needsUpdate = true;

  return {
    texture,
    aspect: canvas.width / canvas.height,
  };
}

function getTextureEntry(cache, key, factory) {
  if (!cache.has(key)) {
    cache.set(key, factory());
  }

  return cache.get(key);
}

function buildSequentialAnchors(lettersById, chronology, groundY, paperLabels) {
  const labelByLetterId = new Map();
  chronology.forEach((group) => {
    group.letterIds.forEach((id) => {
      labelByLetterId.set(id, { zone: group.zone, ambientLabel: group.ambientLabel, focusedLabel: group.focusedLabel });
    });
  });
  return [...lettersById.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, letter]) => {
      const labels = labelByLetterId.get(id) || { zone: 0, ambientLabel: '', focusedLabel: '' };
      const paperLabel = paperLabels && paperLabels.get(id);         // I5: per-paper date for BOTH labels
      return {
        id,
        zone: labels.zone,
        ambientLabel: paperLabel || labels.ambientLabel,
        focusedLabel: paperLabel || labels.focusedLabel,
        letter,
        anchorPosition: new THREE.Vector3(letter.position.x, groundY, letter.position.z),
      };
    });
}

function buildSequentialSpinePoints(anchors, cfg) {
  if (anchors.length === 0) return [];

  const points = [];

  // Head padding — extend along the direction of the first segment
  const first = anchors[0].anchorPosition;
  const second = anchors.length > 1 ? anchors[1].anchorPosition : first;
  const headDir = new THREE.Vector3().subVectors(first, second).normalize();
  if (headDir.lengthSq() < 0.0001) headDir.set(0, 0, -1);
  points.push(new THREE.Vector3(
    first.x + headDir.x * cfg.SPINE_HEAD_PADDING,
    cfg.GROUND_Y,
    first.z + headDir.z * cfg.SPINE_HEAD_PADDING,
  ));

  // Letter positions in ID order
  anchors.forEach((anchor) => {
    points.push(new THREE.Vector3(
      anchor.anchorPosition.x, cfg.GROUND_Y, anchor.anchorPosition.z,
    ));
  });

  // Tail padding — extend along the direction of the last segment
  const last = anchors[anchors.length - 1].anchorPosition;
  const secondLast = anchors.length > 1 ? anchors[anchors.length - 2].anchorPosition : last;
  const tailDir = new THREE.Vector3().subVectors(last, secondLast).normalize();
  if (tailDir.lengthSq() < 0.0001) tailDir.set(0, 0, 1);
  points.push(new THREE.Vector3(
    last.x + tailDir.x * cfg.SPINE_TAIL_PADDING,
    cfg.GROUND_Y,
    last.z + tailDir.z * cfg.SPINE_TAIL_PADDING,
  ));

  return points;
}

function buildDistortedControlPoints(controlPoints, cfg) {
  const lastIndex = Math.max(controlPoints.length - 1, 1);

  return controlPoints.map((point, index) => {
    const edgeFactor = 1 - Math.abs(((index / lastIndex) * 2) - 1);
    const offsetX = Math.sin(index * 0.72) * cfg.DISTORTION_AMPLITUDE * edgeFactor;
    const offsetZ = Math.cos(index * 0.41) * cfg.DISTORTION_AMPLITUDE * 0.16 * edgeFactor;

    return new THREE.Vector3(point.x + offsetX, point.y, point.z + offsetZ);
  });
}

function createTubeMesh(curve, radius, tubularSegments, radialSegments, color, opacity) {
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const material = createMaterial(color, opacity);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

function createAnchorRecord(anchor, textureCache, cfg, sharedGeometry, gradientStops) {
  // Zone-tinted anchor colors: blend between fixed gold and local zone color
  let coreColor = cfg.COLOR_CORE;
  let ringColor = cfg.COLOR_HALO;
  if (gradientStops) {
    const blend = cfg.ZONE_GRADIENT_ANCHOR_BLEND ?? 0.6;
    const haloDarken = cfg.ZONE_GRADIENT_HALO_DARKEN ?? 0.55;
    const zoneColor = sampleGradient(anchor.anchorPosition.z, gradientStops);
    coreColor = new THREE.Color(cfg.COLOR_CORE).lerp(zoneColor, blend);
    ringColor = new THREE.Color(cfg.COLOR_HALO).lerp(
      zoneColor.clone().multiplyScalar(haloDarken), blend,
    );
  }

  const anchorRing = new THREE.Mesh(
    sharedGeometry.anchorRingGeometry,
    createMaterial(ringColor, cfg.AMBIENT_ANCHOR_RING_OPACITY),
  );
  anchorRing.rotation.x = -Math.PI / 2;
  anchorRing.position.copy(anchor.anchorPosition);

  const anchorCore = new THREE.Mesh(
    sharedGeometry.anchorCoreGeometry,
    createMaterial(coreColor, cfg.AMBIENT_ANCHOR_OPACITY),
  );
  anchorCore.rotation.x = -Math.PI / 2;
  anchorCore.position.copy(anchor.anchorPosition);

  const labelPlane = new THREE.Mesh(
    sharedGeometry.labelPlaneGeometry,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      map: null,                    // lazily assigned by applyLabelState on first promotion
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  labelPlane.position.set(anchor.anchorPosition.x, cfg.LABEL_Y, anchor.anchorPosition.z);
  labelPlane.renderOrder = 30;
  labelPlane.visible = false;

  return {
    ...anchor,          // includes ambientLabel + focusedLabel
    anchorRing,
    anchorCore,
    labelPlane,
    textureCache,       // shared Map; textures rasterized on demand, disposed via the cache (:751)
  };
}

function applyLabelState(record, mode, cfg) {
  if (!mode) {
    record.labelPlane.visible = false;
    record.labelPlane.material.opacity = 0;
    return;
  }

  const label = mode === 'focused' ? record.focusedLabel : record.ambientLabel;
  if (!label) { record.labelPlane.visible = false; record.labelPlane.material.opacity = 0; return; }
  const textureEntry = getTextureEntry(record.textureCache, label, () => createLabelTexture(label, cfg));
  const nextOpacity = mode === 'focused' ? cfg.LABEL_FOCUSED_OPACITY : cfg.LABEL_AMBIENT_OPACITY;
  const nextHeight = mode === 'focused' ? cfg.LABEL_FOCUSED_HEIGHT : cfg.LABEL_AMBIENT_HEIGHT;
  const nextWidth = Math.min(textureEntry.aspect * nextHeight, cfg.LABEL_MAX_WIDTH);

  if (record.labelPlane.material.map !== textureEntry.texture) {
    record.labelPlane.material.map = textureEntry.texture;
    record.labelPlane.material.needsUpdate = true;
  }

  record.labelPlane.visible = nextOpacity > 0.001;
  record.labelPlane.material.opacity = nextOpacity;
  record.labelPlane.scale.set(nextWidth, nextHeight, 1);
}

function updateLabelPlacement(record, cameraPosition, cfg) {
  if (!cameraPosition) {
    record.labelPlane.position.set(record.anchorPosition.x, cfg.LABEL_Y, record.anchorPosition.z);
    record.labelPlane.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI));
    return;
  }

  LABEL_TO_CAMERA.set(
    cameraPosition.x - record.anchorPosition.x,
    0,
    cameraPosition.z - record.anchorPosition.z,
  );

  if (LABEL_TO_CAMERA.lengthSq() <= 0.0001) {
    record.labelPlane.position.set(record.anchorPosition.x, cfg.LABEL_Y, record.anchorPosition.z);
    record.labelPlane.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI));
    return;
  }

  LABEL_TO_CAMERA.normalize();
  LABEL_UP.copy(LABEL_TO_CAMERA).negate();
  LABEL_RIGHT.copy(LABEL_UP).cross(WORLD_UP).normalize();

  const labelHalfDepth = Math.max(record.labelPlane.scale.y * 0.5, cfg.LABEL_AMBIENT_HEIGHT * 0.5);
  const anchorClearance = cfg.ANCHOR_RING_OUTER_RADIUS + labelHalfDepth + cfg.LABEL_OFFSET_FROM_ANCHOR;

  record.labelPlane.position.set(
    record.anchorPosition.x + (LABEL_TO_CAMERA.x * anchorClearance) + (LABEL_RIGHT.x * cfg.LABEL_LATERAL_OFFSET),
    cfg.LABEL_Y,
    record.anchorPosition.z + (LABEL_TO_CAMERA.z * anchorClearance) + (LABEL_RIGHT.z * cfg.LABEL_LATERAL_OFFSET),
  );

  LABEL_BASIS.makeBasis(LABEL_RIGHT, LABEL_UP, WORLD_UP);
  record.labelPlane.quaternion.setFromRotationMatrix(LABEL_BASIS);
}

function applyAnchorState(record, mode, cfg) {
  if (mode === 'focused') {
    setMeshOpacity(record.anchorCore, cfg.FOCUSED_ANCHOR_OPACITY);
    setMeshOpacity(record.anchorRing, cfg.FOCUSED_ANCHOR_RING_OPACITY);
    record.anchorCore.scale.setScalar(1.12);
    record.anchorRing.scale.setScalar(1.14);
    applyLabelState(record, 'focused', cfg);
    return;
  }

  if (mode === 'ambient-highlight') {
    setMeshOpacity(record.anchorCore, cfg.AMBIENT_ANCHOR_OPACITY * 1.6);
    setMeshOpacity(record.anchorRing, cfg.AMBIENT_ANCHOR_RING_OPACITY * 1.75);
    record.anchorCore.scale.setScalar(1.04);
    record.anchorRing.scale.setScalar(1.06);
    applyLabelState(record, 'ambient', cfg);
    return;
  }

  setMeshOpacity(record.anchorCore, cfg.AMBIENT_ANCHOR_OPACITY);
  setMeshOpacity(record.anchorRing, cfg.AMBIENT_ANCHOR_RING_OPACITY);
  record.anchorCore.scale.setScalar(1);
  record.anchorRing.scale.setScalar(1);
  applyLabelState(record, null, cfg);
}

function disposeMaterial(material, { disposeMap = true } = {}) {
  if (!material) {
    return;
  }

  if (disposeMap && material.map) {
    material.map.dispose();
  }

  material.dispose();
}

export function createGroundTimeline({ scene, letters, chronology, constants, paperLabels } = {}) {
  if (!scene || !Array.isArray(letters) || !Array.isArray(chronology)) {
    console.warn(`${TIMELINE_LOG_PREFIX} Missing scene, letters, or chronology. Timeline disabled.`);
    return createNoopTimeline();
  }

  const cfg = mergeTimelineConstants(constants);
  const lettersById = new Map(letters.map((letter) => [letter.userData?.id, letter]));
  const requiredIds = chronology.flatMap((group) => group.letterIds);
  const hasMissingLetters = requiredIds.some((letterId) => !lettersById.has(letterId));

  if (hasMissingLetters) {
    console.warn(`${TIMELINE_LOG_PREFIX} Some letters failed to load, timeline disabled for this session.`);
    return createNoopTimeline();
  }

  const rootGroup = new THREE.Group();
  rootGroup.name = 'ground-chronology-thread';
  rootGroup.visible = false;

  const textureCache = new Map();
  const orderedAnchors = buildSequentialAnchors(lettersById, chronology, cfg.GROUND_Y, paperLabels);
  const spineControlPoints = buildSequentialSpinePoints(orderedAnchors, cfg);
  const distortedControlPoints = buildDistortedControlPoints(spineControlPoints, cfg);
  const spineCurve = new THREE.CatmullRomCurve3(spineControlPoints, false, 'centripetal', 0.2);
  const distortedCurve = new THREE.CatmullRomCurve3(distortedControlPoints, false, 'centripetal', 0.2);

  // Compute zone gradient stops from anchor positions (build-time only)
  const gradientStops = cfg.ZONE_GRADIENT?.length > 0
    ? computeGradientStops(orderedAnchors, cfg.ZONE_GRADIENT)
    : [];
  const hasGradient = gradientStops.length >= 2;
  const haloDarken = cfg.ZONE_GRADIENT_HALO_DARKEN ?? 0.55;

  const spineHalo = createTubeMesh(
    spineCurve,
    cfg.SPINE_HALO_RADIUS,
    cfg.SPINE_SEGMENTS,
    cfg.SPINE_RADIAL_SEGMENTS,
    cfg.COLOR_HALO,
    cfg.AMBIENT_HALO_OPACITY,
  );
  const spineDistortedHalo = createTubeMesh(
    distortedCurve,
    cfg.SPINE_DISTORTED_RADIUS,
    cfg.SPINE_SEGMENTS,
    cfg.SPINE_RADIAL_SEGMENTS,
    cfg.COLOR_HALO,
    cfg.AMBIENT_DISTORTED_OPACITY,
  );
  const spineCore = createTubeMesh(
    spineCurve,
    cfg.SPINE_CORE_RADIUS,
    cfg.SPINE_SEGMENTS,
    cfg.SPINE_RADIAL_SEGMENTS,
    cfg.COLOR_CORE,
    cfg.AMBIENT_CORE_OPACITY,
  );

  // Apply zone gradient vertex colors to spine meshes (build-time, zero per-frame cost)
  if (hasGradient) {
    applySpineVertexColors(spineCore.geometry, gradientStops, 1.0);
    spineCore.material.vertexColors = true;
    spineCore.material.color.set(0xffffff);
    spineCore.material.needsUpdate = true;

    applySpineVertexColors(spineHalo.geometry, gradientStops, haloDarken);
    spineHalo.material.vertexColors = true;
    spineHalo.material.color.set(0xffffff);
    spineHalo.material.needsUpdate = true;

    applySpineVertexColors(spineDistortedHalo.geometry, gradientStops, haloDarken);
    spineDistortedHalo.material.vertexColors = true;
    spineDistortedHalo.material.color.set(0xffffff);
    spineDistortedHalo.material.needsUpdate = true;
  }

  const sharedGeometry = {
    anchorCoreGeometry: new THREE.CircleGeometry(cfg.ANCHOR_CORE_RADIUS, 32),
    anchorRingGeometry: new THREE.RingGeometry(cfg.ANCHOR_RING_INNER_RADIUS, cfg.ANCHOR_RING_OUTER_RADIUS, 40),
    labelPlaneGeometry: new THREE.PlaneGeometry(1, 1),
  };

  const anchorRecords = orderedAnchors.map((anchor) =>
    createAnchorRecord(anchor, textureCache, cfg, sharedGeometry, hasGradient ? gradientStops : null),
  );
  const anchorRecordById = new Map(anchorRecords.map((record) => [record.id, record]));

  rootGroup.add(spineHalo);
  rootGroup.add(spineDistortedHalo);
  rootGroup.add(spineCore);

  anchorRecords.forEach((record) => {
    rootGroup.add(record.anchorRing);
    rootGroup.add(record.anchorCore);
    rootGroup.add(record.labelPlane);
  });

  scene.add(rootGroup);

  let hasBeenRevealed = false;
  let lastFocusedId = null;

  function update(frameState = {}) {
    const {
      uiState,
      viewMode,
      inspectPhase = 'idle',
      activeId = null,
      candidateId = null,
      movementSpeed = 0,
      elapsedTime = 0,
      cameraPosition = null,
    } = frameState;

    const targetId = activeId ?? candidateId ?? null;
    const isHidden = uiState !== 'active' || viewMode === 'bird-eye';

    if (!hasBeenRevealed && uiState === 'active' && viewMode === 'immersive' && inspectPhase === 'idle') {
      hasBeenRevealed = true;
    }

    if (!hasBeenRevealed || isHidden) {
      rootGroup.visible = false;
      return;
    }

    rootGroup.visible = true;

    const isInspectAdjacent = inspectPhase !== 'idle' && lastFocusedId !== null;
    const isFocusedProximity = (
      viewMode === 'immersive'
      && inspectPhase === 'idle'
      && targetId !== null
      && movementSpeed <= cfg.FOCUS_SPEED_MAX
    );

    if (isFocusedProximity) {
      lastFocusedId = targetId;
    }

    const promotedId = isFocusedProximity
      ? targetId
      : (isInspectAdjacent ? lastFocusedId : targetId);
    const hasPromotedRecord = promotedId !== null && anchorRecordById.has(promotedId);
    const shouldShowAmbientLabel = !isFocusedProximity && !isInspectAdjacent && promotedId !== null;

    if (isFocusedProximity) {
      setMeshOpacity(spineCore, cfg.FOCUSED_CORE_OPACITY);
      setMeshOpacity(spineHalo, cfg.FOCUSED_HALO_OPACITY);
      setMeshOpacity(spineDistortedHalo, cfg.AMBIENT_DISTORTED_OPACITY * 0.35);
      spineDistortedHalo.position.x = 0;
      spineDistortedHalo.position.z = 0;
    } else if (isInspectAdjacent) {
      setMeshOpacity(spineCore, cfg.FOCUSED_CORE_OPACITY * 0.7);
      setMeshOpacity(spineHalo, cfg.FOCUSED_HALO_OPACITY * 0.8);
      setMeshOpacity(spineDistortedHalo, 0);
      spineDistortedHalo.position.x = 0;
      spineDistortedHalo.position.z = 0;
    } else {
      setMeshOpacity(spineCore, cfg.AMBIENT_CORE_OPACITY);
      setMeshOpacity(spineHalo, cfg.AMBIENT_HALO_OPACITY);
      setMeshOpacity(spineDistortedHalo, cfg.AMBIENT_DISTORTED_OPACITY);
      spineDistortedHalo.position.x = Math.sin(elapsedTime * 0.32) * 0.18;
      spineDistortedHalo.position.z = Math.cos(elapsedTime * 0.25) * 0.12;
    }

    anchorRecords.forEach((record) => {
      if (hasPromotedRecord && record.id === promotedId) {
        if (isFocusedProximity || isInspectAdjacent) {
          applyAnchorState(record, 'focused', cfg);
          updateLabelPlacement(record, cameraPosition, cfg);
          return;
        }

        if (shouldShowAmbientLabel) {
          applyAnchorState(record, 'ambient-highlight', cfg);
          updateLabelPlacement(record, cameraPosition, cfg);
          return;
        }
      }

      applyAnchorState(record, 'ambient', cfg);
      updateLabelPlacement(record, cameraPosition, cfg);
    });
  }

  function dispose() {
    scene.remove(rootGroup);

    anchorRecords.forEach((record) => {
      disposeMaterial(record.anchorCore.material);
      disposeMaterial(record.anchorRing.material);
      disposeMaterial(record.labelPlane.material, { disposeMap: false });
    });

    spineCore.geometry.dispose();
    spineHalo.geometry.dispose();
    spineDistortedHalo.geometry.dispose();
    disposeMaterial(spineCore.material);
    disposeMaterial(spineHalo.material);
    disposeMaterial(spineDistortedHalo.material);

    sharedGeometry.anchorCoreGeometry.dispose();
    sharedGeometry.anchorRingGeometry.dispose();
    sharedGeometry.labelPlaneGeometry.dispose();

    textureCache.forEach((entry) => {
      entry.texture.dispose();
    });

    anchorRecordById.clear();
    textureCache.clear();
  }

  // Pre-warm GPU vertex buffers by making the root group visible for one render
  // frame while an overlay (e.g. start screen) covers the view. The next
  // animate() render uploads all timeline geometry to GPU memory. On the
  // following frame, update() hides the group again (uiState is still 'start'),
  // but the GPU buffers persist. When ACTIVE state begins, the first visible
  // frame draws from warm buffers — no upload stall.
  function preWarm() {
    if (hasBeenRevealed) return; // already warm or revealed
    hasBeenRevealed = true;
    rootGroup.visible = true;
  }

  return {
    update,
    dispose,
    preWarm,
  };
}
