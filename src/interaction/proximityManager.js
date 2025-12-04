import * as THREE from 'three';
import { audioEngine } from '../audio/audioEngine.js';
import { INTERACTION } from '../config/constants.js';

export class ProximityManager {
  constructor(camera, letters) {
    this.camera = camera;
    this.letters = letters;
    this.threshold = INTERACTION.PROXIMITY_THRESHOLD;
    this.activeLetter = null;
    this.checkRadius = INTERACTION.CHECK_RADIUS;
  }

  update() {
    let closestDistSq = Infinity;
    let closestLetter = null;
    const checkRadiusSq = this.checkRadius * this.checkRadius;
    const thresholdSq = this.threshold * this.threshold;

    // Optimization: Only check letters within a reasonable radius
    this.letters.forEach(letter => {
      const distSq = this.camera.position.distanceToSquared(letter.position);
      
      // Skip letters too far away to save CPU
      if (distSq > checkRadiusSq) return;
      
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestLetter = letter;
      }
    });

    if (closestDistSq < thresholdSq) {
      if (this.activeLetter !== closestLetter) {
        // If we were already active on another letter, deactivate it first
        if (this.activeLetter) {
           this.deactivateLetter(this.activeLetter);
        }

        this.activeLetter = closestLetter;
        const dist = Math.sqrt(closestDistSq);
        console.log(`Entered proximity of Letter ${this.activeLetter.userData.id} (Distance: ${dist.toFixed(2)})`);
        
        // Activate visual and audio
        this.activateLetter(this.activeLetter);
        
        return this.activeLetter.userData.id;
      }
    } else {
      if (this.activeLetter) {
        console.log(`Left proximity of Letter ${this.activeLetter.userData.id}`);
        
        // Deactivate visual and audio
        this.deactivateLetter(this.activeLetter);
        
        this.activeLetter = null;
        return null;
      }
    }
    
    return this.activeLetter ? this.activeLetter.userData.id : null;
  }

  activateLetter(letter) {
    // 1. Audio
    audioEngine.playNarration(letter.userData.id);

    // 2. Visual Feedback (Highlight)
    letter.traverse((child) => {
      if (child.isMesh && child.material) {
        // Store original emissive if not already stored
        if (!child.userData.originalEmissive) {
          child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
        }
        // Make it glow slightly
        if (child.material.emissive) {
            child.material.emissive.setHex(0x333333);
        }
      }
    });

    // 3. Subtitles - Handled in main.js loop
  }

  deactivateLetter(letter) {
    // 1. Audio
    audioEngine.stopNarration();

    // 2. Visual Feedback (Restore)
    letter.traverse((child) => {
      if (child.isMesh && child.material && child.userData.originalEmissive) {
        // Only try to copy if the material supports emissive
        if (child.material.emissive) {
            child.material.emissive.copy(child.userData.originalEmissive);
        }
      }
    });

    // 3. Subtitles - Handled in main.js loop
  }
}
