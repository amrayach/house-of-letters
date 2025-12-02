import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as THREE from 'three';

// Debug: Walking speed configuration
let walkingSpeed = 100.0;

export function setWalkingSpeed(speed) {
  walkingSpeed = speed;
}

export function getWalkingSpeed() {
  return walkingSpeed;
}

export function initControls(camera, domElement) {
  const controls = new PointerLockControls(camera, domElement);

  const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  const onKeyDown = (event) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveState.forward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveState.left = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveState.backward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveState.right = true;
        break;
    }
  };

  const onKeyUp = (event) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveState.forward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveState.left = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveState.backward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveState.right = false;
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let currentSpeed = 0;

  return {
    controls,
    getVelocity: () => currentSpeed,
    update: (delta) => {
      // Clamp delta to prevent physics explosions during lag spikes
      const timeStep = Math.min(delta, 0.05);

      if (controls.isLocked) {
        velocity.x -= velocity.x * 10.0 * timeStep;
        velocity.z -= velocity.z * 10.0 * timeStep;

        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();

        if (moveState.forward || moveState.backward) velocity.z -= direction.z * walkingSpeed * timeStep;
        if (moveState.left || moveState.right) velocity.x -= direction.x * walkingSpeed * timeStep;

        controls.moveRight(-velocity.x * timeStep);
        controls.moveForward(-velocity.z * timeStep);
        
        // Calculate current speed for debug display
        currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // Debug: Log position occasionally
        if (Math.random() < 0.01) {
          console.log('Camera position:', controls.getObject().position);
        }
      } else {
        currentSpeed = 0;
      }
    }
  };
}
