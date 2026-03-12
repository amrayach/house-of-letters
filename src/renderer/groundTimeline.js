import * as THREE from 'three';

const TIMELINE_LOG_PREFIX = '[ground-timeline]';

const TIMELINE_DEFAULTS = Object.freeze({
  GROUND_Y: 0.06,
  LABEL_Y: 0.085,
  SPINE_HEAD_PADDING: 18,
  SPINE_TAIL_PADDING: 18,
  SPINE_X_ATTRACTION: 0.18,
  SPINE_MAX_X_STEP: 6,
  SPINE_SAMPLES: 360,
  SPINE_RADIAL_SEGMENTS: 10,
  SPINE_SEGMENTS: 720,
  SPINE_CORE_RADIUS: 0.12,
  SPINE_HALO_RADIUS: 0.28,
  SPINE_DISTORTED_RADIUS: 0.36,
  CONNECTOR_CORE_RADIUS: 0.075,
  CONNECTOR_HALO_RADIUS: 0.16,
  CONNECTOR_SEGMENTS: 24,
  CONNECTOR_CURVE_LIFT: 0.22,
  ANCHOR_CORE_RADIUS: 0.36,
  ANCHOR_RING_INNER_RADIUS: 0.54,
  ANCHOR_RING_OUTER_RADIUS: 0.76,
  FOCUS_SPEED_MAX: 4.0,
  AMBIENT_CORE_OPACITY: 0.24,
  AMBIENT_HALO_OPACITY: 0.12,
  AMBIENT_DISTORTED_OPACITY: 0.14,
  FOCUSED_CORE_OPACITY: 0.84,
  FOCUSED_HALO_OPACITY: 0.34,
  FOCUSED_CONNECTOR_OPACITY: 0.88,
  FOCUSED_CONNECTOR_HALO_OPACITY: 0.28,
  AMBIENT_CONNECTOR_OPACITY: 0.18,
  AMBIENT_CONNECTOR_HALO_OPACITY: 0.1,
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
  };
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

function buildOrderedAnchors(lettersById, chronology, groundY) {
  const orderedAnchors = [];

  chronology.forEach((group) => {
    const groupAnchors = group.letterIds
      .map((letterId) => {
        const letter = lettersById.get(letterId);

        if (!letter) {
          return null;
        }

        return {
          id: letterId,
          zone: group.zone,
          ambientLabel: group.ambientLabel,
          focusedLabel: group.focusedLabel,
          letter,
          anchorPosition: new THREE.Vector3(letter.position.x, groundY, letter.position.z),
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.anchorPosition.z - right.anchorPosition.z || left.anchorPosition.x - right.anchorPosition.x);

    orderedAnchors.push(...groupAnchors);
  });

  return orderedAnchors;
}

function buildSpineControlPoints(anchors, cfg) {
  if (anchors.length === 0) {
    return [];
  }

  const controlPoints = [];
  let smoothedX = anchors[0].anchorPosition.x;

  controlPoints.push(new THREE.Vector3(
    smoothedX,
    cfg.GROUND_Y,
    anchors[0].anchorPosition.z - cfg.SPINE_HEAD_PADDING,
  ));

  anchors.forEach((anchor) => {
    const desiredX = anchor.anchorPosition.x;
    const step = THREE.MathUtils.clamp(
      (desiredX - smoothedX) * cfg.SPINE_X_ATTRACTION,
      -cfg.SPINE_MAX_X_STEP,
      cfg.SPINE_MAX_X_STEP,
    );

    smoothedX += step;
    controlPoints.push(new THREE.Vector3(smoothedX, cfg.GROUND_Y, anchor.anchorPosition.z));
  });

  const lastAnchor = anchors[anchors.length - 1];
  controlPoints.push(new THREE.Vector3(
    smoothedX,
    cfg.GROUND_Y,
    lastAnchor.anchorPosition.z + cfg.SPINE_TAIL_PADDING,
  ));

  return controlPoints;
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

function sampleCurve(curve, samples) {
  const points = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    points.push({
      t,
      point: curve.getPointAt(t),
      tangent: curve.getTangentAt(t),
    });
  }

  return points;
}

function findNearestSample(anchorPosition, samples) {
  let nearestSample = samples[0];
  let nearestDistanceSq = anchorPosition.distanceToSquared(nearestSample.point);

  for (let index = 1; index < samples.length; index += 1) {
    const sample = samples[index];
    const distanceSq = anchorPosition.distanceToSquared(sample.point);

    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearestSample = sample;
    }
  }

  return nearestSample;
}

function createTubeMesh(curve, radius, tubularSegments, radialSegments, color, opacity) {
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const material = createMaterial(color, opacity);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

function createAnchorRecord(anchor, curveSamples, textureCache, cfg, sharedGeometry) {
  const nearestSample = findNearestSample(anchor.anchorPosition, curveSamples);
  const connectorDirection = nearestSample.point.clone().sub(anchor.anchorPosition);
  connectorDirection.y = 0;
  const connectorDistance = connectorDirection.length();
  const suppressConnector = connectorDistance <= (cfg.ANCHOR_RING_OUTER_RADIUS + cfg.SPINE_HALO_RADIUS);
  const tangent = nearestSample.tangent.clone();
  tangent.y = 0;

  if (tangent.lengthSq() > 0.0001) {
    tangent.normalize();
  } else {
    tangent.set(0, 0, 1);
  }

  if (connectorDistance > 0.0001) {
    connectorDirection.divideScalar(connectorDistance);
  } else {
    connectorDirection.set(tangent.z, 0, -tangent.x).normalize();
  }

  const connectorStart = anchor.anchorPosition.clone().addScaledVector(
    connectorDirection,
    cfg.ANCHOR_RING_OUTER_RADIUS * 0.92,
  );
  const connectorEnd = nearestSample.point.clone().addScaledVector(
    connectorDirection,
    connectorDistance > cfg.ANCHOR_RING_OUTER_RADIUS
      ? -cfg.SPINE_HALO_RADIUS * 0.72
      : cfg.SPINE_HALO_RADIUS * 0.72,
  );
  const connectorMidpoint = connectorStart.clone().lerp(connectorEnd, 0.55);

  const connectorCurve = new THREE.QuadraticBezierCurve3(
    connectorStart,
    connectorMidpoint,
    connectorEnd,
  );

  const connectorHalo = createTubeMesh(
    connectorCurve,
    cfg.CONNECTOR_HALO_RADIUS,
    cfg.CONNECTOR_SEGMENTS,
    cfg.SPINE_RADIAL_SEGMENTS,
    cfg.COLOR_HALO,
    cfg.AMBIENT_CONNECTOR_HALO_OPACITY,
  );
  const connectorCore = createTubeMesh(
    connectorCurve,
    cfg.CONNECTOR_CORE_RADIUS,
    cfg.CONNECTOR_SEGMENTS,
    cfg.SPINE_RADIAL_SEGMENTS,
    cfg.COLOR_CORE,
    cfg.AMBIENT_CONNECTOR_OPACITY,
  );

  const anchorRing = new THREE.Mesh(
    sharedGeometry.anchorRingGeometry,
    createMaterial(cfg.COLOR_HALO, cfg.AMBIENT_ANCHOR_RING_OPACITY),
  );
  anchorRing.rotation.x = -Math.PI / 2;
  anchorRing.position.copy(anchor.anchorPosition);

  const anchorCore = new THREE.Mesh(
    sharedGeometry.anchorCoreGeometry,
    createMaterial(cfg.COLOR_CORE, cfg.AMBIENT_ANCHOR_OPACITY),
  );
  anchorCore.rotation.x = -Math.PI / 2;
  anchorCore.position.copy(anchor.anchorPosition);

  const ambientTextureKey = `ambient:${anchor.ambientLabel}`;
  const focusedTextureKey = `focused:${anchor.focusedLabel}`;
  const ambientTexture = getTextureEntry(textureCache, ambientTextureKey, () => createLabelTexture(anchor.ambientLabel, cfg));
  const focusedTexture = getTextureEntry(textureCache, focusedTextureKey, () => createLabelTexture(anchor.focusedLabel, cfg));

  const labelPlane = new THREE.Mesh(
    sharedGeometry.labelPlaneGeometry,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      map: ambientTexture.texture,
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
    ...anchor,
    nearestSample,
    suppressConnector,
    connectorHalo,
    connectorCore,
    anchorRing,
    anchorCore,
    labelPlane,
    ambientTexture,
    focusedTexture,
  };
}

function applyLabelState(record, mode, cfg) {
  if (!mode) {
    record.labelPlane.visible = false;
    record.labelPlane.material.opacity = 0;
    return;
  }

  const textureEntry = mode === 'focused' ? record.focusedTexture : record.ambientTexture;
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
  if (record.suppressConnector) {
    setMeshOpacity(record.connectorCore, 0);
    setMeshOpacity(record.connectorHalo, 0);
  }

  if (mode === 'focused') {
    if (!record.suppressConnector) {
      setMeshOpacity(record.connectorCore, cfg.FOCUSED_CONNECTOR_OPACITY);
      setMeshOpacity(record.connectorHalo, cfg.FOCUSED_CONNECTOR_HALO_OPACITY);
    }
    setMeshOpacity(record.anchorCore, cfg.FOCUSED_ANCHOR_OPACITY);
    setMeshOpacity(record.anchorRing, cfg.FOCUSED_ANCHOR_RING_OPACITY);
    record.anchorCore.scale.setScalar(1.12);
    record.anchorRing.scale.setScalar(1.14);
    applyLabelState(record, 'focused', cfg);
    return;
  }

  if (mode === 'ambient-highlight') {
    if (!record.suppressConnector) {
      setMeshOpacity(record.connectorCore, cfg.AMBIENT_CONNECTOR_OPACITY * 1.45);
      setMeshOpacity(record.connectorHalo, cfg.AMBIENT_CONNECTOR_HALO_OPACITY * 1.6);
    }
    setMeshOpacity(record.anchorCore, cfg.AMBIENT_ANCHOR_OPACITY * 1.6);
    setMeshOpacity(record.anchorRing, cfg.AMBIENT_ANCHOR_RING_OPACITY * 1.75);
    record.anchorCore.scale.setScalar(1.04);
    record.anchorRing.scale.setScalar(1.06);
    applyLabelState(record, 'ambient', cfg);
    return;
  }

  if (!record.suppressConnector) {
    setMeshOpacity(record.connectorCore, cfg.AMBIENT_CONNECTOR_OPACITY);
    setMeshOpacity(record.connectorHalo, cfg.AMBIENT_CONNECTOR_HALO_OPACITY);
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

export function createGroundTimeline({ scene, letters, chronology, constants } = {}) {
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
  const orderedAnchors = buildOrderedAnchors(lettersById, chronology, cfg.GROUND_Y);
  const spineControlPoints = buildSpineControlPoints(orderedAnchors, cfg);
  const distortedControlPoints = buildDistortedControlPoints(spineControlPoints, cfg);
  const spineCurve = new THREE.CatmullRomCurve3(spineControlPoints, false, 'centripetal', 0.2);
  const distortedCurve = new THREE.CatmullRomCurve3(distortedControlPoints, false, 'centripetal', 0.2);
  const curveSamples = sampleCurve(spineCurve, cfg.SPINE_SAMPLES);

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

  const sharedGeometry = {
    anchorCoreGeometry: new THREE.CircleGeometry(cfg.ANCHOR_CORE_RADIUS, 32),
    anchorRingGeometry: new THREE.RingGeometry(cfg.ANCHOR_RING_INNER_RADIUS, cfg.ANCHOR_RING_OUTER_RADIUS, 40),
    labelPlaneGeometry: new THREE.PlaneGeometry(1, 1),
  };

  const anchorRecords = orderedAnchors.map((anchor) => createAnchorRecord(anchor, curveSamples, textureCache, cfg, sharedGeometry));
  const anchorRecordById = new Map(anchorRecords.map((record) => [record.id, record]));

  rootGroup.add(spineHalo);
  rootGroup.add(spineDistortedHalo);
  rootGroup.add(spineCore);

  anchorRecords.forEach((record) => {
    rootGroup.add(record.connectorHalo);
    rootGroup.add(record.connectorCore);
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

    if (!hasBeenRevealed && uiState === 'active' && viewMode === 'immersive' && inspectPhase === 'idle' && targetId) {
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
      record.connectorCore.geometry.dispose();
      record.connectorHalo.geometry.dispose();
      disposeMaterial(record.connectorCore.material);
      disposeMaterial(record.connectorHalo.material);
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

  return {
    update,
    dispose,
  };
}
