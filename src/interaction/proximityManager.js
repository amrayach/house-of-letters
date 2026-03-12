import * as THREE from 'three';
import { audioEngine } from '../audio/audioEngine.js';
import { INTERACTION } from '../config/constants.js';

const ACTIVE_CUE_COLOR = 0xffd86b;
const VIEW_ALIGNMENT_MIN_DOT = 0.35;
const FACING_ALIGNMENT_MIN_DOT = 0.15;
const INSIDE_TRIGGER_BONUS = 0.35;
const CANDIDATE_SCORE_FLOOR = 0.5;
const ACTIVE_SCORE_FLOOR = 1.0;
const MAX_RAYCAST_DISTANCE = 8;
const FOCUSED_PROMPT_DISTANCE_FALLOFF = 2.75;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function ensureActiveCue(mesh) {
  if (mesh.userData.isGlass || mesh.userData.isFocusHelper || mesh.userData.activeCue || !mesh.geometry) {
    return;
  }

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 20),
    new THREE.LineBasicMaterial({
      color: ACTIVE_CUE_COLOR,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );

  outline.name = 'active-letter-cue';
  outline.visible = false;
  outline.renderOrder = 10;
  outline.scale.setScalar(1.015);
  outline.raycast = () => null;

  mesh.add(outline);
  mesh.userData.activeCue = outline;
}

export class ProximityManager {
  constructor(camera, letters) {
    this.camera = camera;
    this.letters = letters;
    this.checkRadius = INTERACTION.CHECK_RADIUS;
    this.triggerDistanceFalloff = Math.max(INTERACTION.TRIGGER_PADDING_WORLD.z * 1.5, 1.5);
    this.focusPromptDistanceFalloff = Math.max(this.triggerDistanceFalloff, FOCUSED_PROMPT_DISTANCE_FALLOFF);
    this.activeLetter = null;
    this.activeSide = null;
    this.activeScore = 0;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = Math.min(this.checkRadius, MAX_RAYCAST_DISTANCE);
    this.focusTargets = this.collectFocusTargets(letters);
    this.targetState = {
      candidateId: null,
      candidateSide: null,
      candidateScore: null,
      activeId: null,
      activeSide: null,
      activeScore: null,
    };

    this.cameraPosition = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3();
    this.localCameraPosition = new THREE.Vector3();
    this.clampedCameraPoint = new THREE.Vector3();
    this.sideCenterWorld = new THREE.Vector3();
    this.toSide = new THREE.Vector3();
    this.toCamera = new THREE.Vector3();
    this.sideNormalWorld = new THREE.Vector3();
  }

  collectFocusTargets(letters) {
    const focusTargets = [];

    letters.forEach((letter) => {
      const readableSides = letter.userData.interaction?.readableSides;

      if (!readableSides) {
        return;
      }

      Object.values(readableSides).forEach((side) => {
        if (side.focusTarget) {
          focusTargets.push(side.focusTarget);
        }
      });
    });

    return focusTargets;
  }

  clearTargeting() {
    if (this.activeLetter) {
      console.log(`Cleared active targeting for Letter ${this.activeLetter.userData.id}`);
      this.deactivateLetter(this.activeLetter);
    }

    this.activeLetter = null;
    this.activeSide = null;
    this.activeScore = 0;
    this.setCandidateState(null);
    this.setActiveState(null);

    return this.targetState;
  }

  update() {
    this.cameraPosition.copy(this.camera.position);
    this.camera.getWorldDirection(this.cameraForward).normalize();

    const focusHit = this.getFocusHit();
    const checkRadiusSq = this.checkRadius * this.checkRadius;
    let bestCandidate = null;
    let activeCandidate = null;

    this.letters.forEach((letter) => {
      if (this.cameraPosition.distanceToSquared(letter.position) > checkRadiusSq) {
        return;
      }

      const scoredLetter = this.scoreLetter(letter, focusHit);

      if (!scoredLetter) {
        return;
      }

      if (letter === this.activeLetter && scoredLetter.side === this.activeSide) {
        activeCandidate = scoredLetter;
      }

      if (!bestCandidate || scoredLetter.score > bestCandidate.score) {
        bestCandidate = scoredLetter;
      }
    });

    if ((!activeCandidate || activeCandidate.score < ACTIVE_SCORE_FLOOR) && this.activeLetter) {
      activeCandidate = this.scoreSpecificSide(this.activeLetter, this.activeSide, focusHit);
    }

    if (bestCandidate && bestCandidate.score < CANDIDATE_SCORE_FLOOR) {
      bestCandidate = null;
    }

    this.syncActiveTarget(bestCandidate, activeCandidate);
    this.setCandidateState(this.resolveInspectCandidate(bestCandidate));

    return this.targetState;
  }

  getFocusHit() {
    if (this.focusTargets.length === 0) {
      return null;
    }

    this.raycaster.set(this.cameraPosition, this.cameraForward);
    const hits = this.raycaster.intersectObjects(this.focusTargets, false);

    return hits.length > 0 ? hits[0] : null;
  }

  scoreLetter(letter, focusHit) {
    const interaction = letter.userData.interaction;

    if (!interaction?.triggerBoxLocal || !interaction.readableSides) {
      return null;
    }

    this.localCameraPosition.copy(this.cameraPosition);
    letter.worldToLocal(this.localCameraPosition);
    this.clampedCameraPoint.copy(this.localCameraPosition).clamp(
      interaction.triggerBoxLocal.min,
      interaction.triggerBoxLocal.max,
    );

    const distanceToTrigger = this.clampedCameraPoint.distanceTo(this.localCameraPosition);
    const insideTrigger = interaction.triggerBoxLocal.containsPoint(this.localCameraPosition);
    const focusMatchesLetter = focusHit?.object?.userData?.letterId === letter.userData.id;
    const distanceFalloff = focusMatchesLetter ? this.focusPromptDistanceFalloff : this.triggerDistanceFalloff;
    const distanceScore = clamp01(1 - (distanceToTrigger / distanceFalloff));

    if (distanceScore <= 0) {
      return null;
    }

    let bestSide = null;

    Object.entries(interaction.readableSides).forEach(([sideName, side]) => {
      const scoredSide = this.scoreSide(letter, sideName, side, {
        distanceScore,
        insideTrigger,
        focusHit,
      });

      if (scoredSide && (!bestSide || scoredSide.score > bestSide.score)) {
        bestSide = scoredSide;
      }
    });

    return bestSide;
  }

  scoreSpecificSide(letter, sideName, focusHit) {
    const interaction = letter.userData.interaction;
    const side = interaction?.readableSides?.[sideName];

    if (!interaction?.triggerBoxLocal || !side) {
      return null;
    }

    this.localCameraPosition.copy(this.cameraPosition);
    letter.worldToLocal(this.localCameraPosition);
    this.clampedCameraPoint.copy(this.localCameraPosition).clamp(
      interaction.triggerBoxLocal.min,
      interaction.triggerBoxLocal.max,
    );

    const distanceToTrigger = this.clampedCameraPoint.distanceTo(this.localCameraPosition);
    const insideTrigger = interaction.triggerBoxLocal.containsPoint(this.localCameraPosition);
    const focusMatchesLetter = focusHit?.object?.userData?.letterId === letter.userData.id;
    const distanceFalloff = focusMatchesLetter ? this.focusPromptDistanceFalloff : this.triggerDistanceFalloff;
    const distanceScore = clamp01(1 - (distanceToTrigger / distanceFalloff));

    if (distanceScore <= 0) {
      return null;
    }

    return this.scoreSide(letter, sideName, side, {
      distanceScore,
      insideTrigger,
      focusHit,
    });
  }

  scoreSide(letter, sideName, side, context) {
    letter.localToWorld(this.sideCenterWorld.copy(side.center));

    this.toSide.copy(this.sideCenterWorld).sub(this.cameraPosition);
    const distanceToSide = this.toSide.length();

    if (distanceToSide === 0) {
      return null;
    }

    this.toSide.divideScalar(distanceToSide);
    const viewDot = this.cameraForward.dot(this.toSide);
    const focusMatches = context.focusHit?.object === side.focusTarget;

    if (viewDot <= VIEW_ALIGNMENT_MIN_DOT && !focusMatches) {
      return null;
    }

    this.sideNormalWorld.copy(side.normal).transformDirection(letter.matrixWorld);
    this.toCamera.copy(this.cameraPosition).sub(this.sideCenterWorld).normalize();

    const facingDot = this.sideNormalWorld.dot(this.toCamera);

    if (facingDot <= FACING_ALIGNMENT_MIN_DOT && !focusMatches) {
      return null;
    }

    const viewScore = clamp01((viewDot - VIEW_ALIGNMENT_MIN_DOT) / (1 - VIEW_ALIGNMENT_MIN_DOT));
    const facingScore = clamp01((facingDot - FACING_ALIGNMENT_MIN_DOT) / (1 - FACING_ALIGNMENT_MIN_DOT));
    const raycastBonus = focusMatches ? INTERACTION.RAYCAST_BONUS_WEIGHT : 0;
    const stickyBias = this.activeLetter === letter && this.activeSide === sideName
      ? INTERACTION.STICKY_BIAS
      : 0;
    const score = context.distanceScore
      + (context.insideTrigger ? INSIDE_TRIGGER_BONUS : 0)
      + (viewScore * INTERACTION.VIEW_ALIGNMENT_WEIGHT)
      + (facingScore * INTERACTION.FACING_ALIGNMENT_WEIGHT)
      + raycastBonus
      + stickyBias;

    return {
      letter,
      side: sideName,
      score,
    };
  }

  syncActiveTarget(bestCandidate, activeCandidate) {
    const currentMeetsFloor = activeCandidate && activeCandidate.score >= ACTIVE_SCORE_FLOOR;

    if (!bestCandidate) {
      if (currentMeetsFloor) {
        this.activeScore = activeCandidate.score;
        this.setActiveState(activeCandidate);
      } else {
        this.clearActiveLetter();
      }

      return;
    }

    if (!this.activeLetter) {
      if (bestCandidate.score >= ACTIVE_SCORE_FLOOR) {
        this.activateNewLetter(bestCandidate);
      } else {
        this.setActiveState(null);
      }

      return;
    }

    if (bestCandidate.letter === this.activeLetter) {
      this.activeSide = bestCandidate.side;
      this.activeScore = bestCandidate.score;
      this.setActiveState(bestCandidate);
      return;
    }

    if (!currentMeetsFloor) {
      if (bestCandidate.score >= ACTIVE_SCORE_FLOOR) {
        this.activateNewLetter(bestCandidate);
      } else {
        this.clearActiveLetter();
      }

      return;
    }

    if (bestCandidate.score > activeCandidate.score + INTERACTION.SWITCH_MARGIN) {
      this.activateNewLetter(bestCandidate);
      return;
    }

    this.activeSide = activeCandidate.side;
    this.activeScore = activeCandidate.score;
    this.setActiveState(activeCandidate);
  }

  activateNewLetter(candidate) {
    if (this.activeLetter && this.activeLetter !== candidate.letter) {
      console.log(`Left proximity of Letter ${this.activeLetter.userData.id}`);
      this.deactivateLetter(this.activeLetter);
    }

    if (this.activeLetter !== candidate.letter) {
      const pos = candidate.letter.position;
      console.log(
        `Entered focus of Letter ${candidate.letter.userData.id} (${candidate.side}) at X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)} (Score: ${candidate.score.toFixed(2)})`,
      );
      this.activateLetter(candidate.letter);
    }

    this.activeLetter = candidate.letter;
    this.activeSide = candidate.side;
    this.activeScore = candidate.score;
    this.setActiveState(candidate);
  }

  clearActiveLetter() {
    if (this.activeLetter) {
      console.log(`Left proximity of Letter ${this.activeLetter.userData.id}`);
      this.deactivateLetter(this.activeLetter);
    }

    this.activeLetter = null;
    this.activeSide = null;
    this.activeScore = 0;
    this.setActiveState(null);
  }

  resolveInspectCandidate(bestCandidate) {
    if (this.activeLetter && this.activeSide && this.activeScore >= ACTIVE_SCORE_FLOOR) {
      return {
        letter: this.activeLetter,
        side: this.activeSide,
        score: this.activeScore,
      };
    }

    return bestCandidate;
  }

  setCandidateState(candidate) {
    this.targetState.candidateId = candidate ? candidate.letter.userData.id : null;
    this.targetState.candidateSide = candidate ? candidate.side : null;
    this.targetState.candidateScore = candidate ? candidate.score : null;
  }

  setActiveState(candidate) {
    this.targetState.activeId = candidate ? candidate.letter.userData.id : null;
    this.targetState.activeSide = candidate ? candidate.side : null;
    this.targetState.activeScore = candidate ? candidate.score : null;
  }

  activateLetter(letter) {
    audioEngine.playNarration(letter.userData.id);

    letter.traverse((child) => {
      if (!child.isMesh || child.userData.isFocusHelper || !child.material) {
        return;
      }

      ensureActiveCue(child);

      if (child.userData.activeCue) {
        child.userData.activeCue.visible = true;
      }

      if (!child.userData.originalEmissive) {
        child.userData.originalEmissive = child.material.emissive
          ? child.material.emissive.clone()
          : new THREE.Color(0x000000);
      }

      if (child.material.emissive) {
        child.material.emissive.setHex(0x333333);
      }
    });
  }

  deactivateLetter(letter) {
    audioEngine.stopNarration();

    letter.traverse((child) => {
      if (!child.isMesh || child.userData.isFocusHelper) {
        return;
      }

      if (child.userData.activeCue) {
        child.userData.activeCue.visible = false;
      }

      if (child.material && child.userData.originalEmissive && child.material.emissive) {
        child.material.emissive.copy(child.userData.originalEmissive);
      }
    });
  }
}
