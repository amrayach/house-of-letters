import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as THREE from 'three';
import { TouchControls } from '../interaction/touchControls.js';

// Debug: Walking speed configuration
let walkingSpeed = 100.0;

// Detect if device is touch-capable
const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

export function setWalkingSpeed(speed) {
  walkingSpeed = speed;
}

export function getWalkingSpeed() {
  return walkingSpeed;
}

export function initControls(camera, domElement) {
  const controls = new PointerLockControls(camera, domElement);
  const useTouchControls = isTouchDevice();
  
  // Create touch controls for mobile
  let touchControls = null;
  if (useTouchControls) {
    touchControls = new TouchControls(camera, domElement);
  }

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
  
  // Track if controls are active (for both desktop and mobile)
  let isActive = false;

  return {
    controls,
    touchControls,
    isTouchDevice: useTouchControls,
    getVelocity: () => currentSpeed,
    
    // Activate controls (lock for desktop, enable touch for mobile)
    activate: () => {
      if (useTouchControls) {
        isActive = true;
        touchControls.enable();
      } else {
        controls.lock();
      }
    },
    
    // Deactivate controls
    deactivate: () => {
      if (useTouchControls) {
        isActive = false;
        touchControls.disable();
      } else {
        controls.unlock();
      }
    },
    
    // Check if controls are active
    isActive: () => {
      return useTouchControls ? isActive : controls.isLocked;
    },
    
    update: (delta) => {
      // Clamp delta to prevent physics explosions during lag spikes
      const timeStep = Math.min(delta, 0.05);

      // Determine active move state (keyboard or touch)
      let activeMoveState = moveState;
      if (useTouchControls && isActive) {
        activeMoveState = touchControls.getMoveState();
      }
      
      const controlsActive = useTouchControls ? isActive : controls.isLocked;

      if (controlsActive) {
        velocity.x -= velocity.x * 10.0 * timeStep;
        velocity.z -= velocity.z * 10.0 * timeStep;

        // For touch, use analog values; for keyboard, use boolean
        if (useTouchControls && isActive) {
          // Analog movement from joystick
          direction.z = -activeMoveState.moveY;
          direction.x = activeMoveState.moveX;
        } else {
          direction.z = Number(activeMoveState.forward) - Number(activeMoveState.backward);
          direction.x = Number(activeMoveState.right) - Number(activeMoveState.left);
        }
        
        direction.normalize();

        if (direction.z !== 0) velocity.z -= direction.z * walkingSpeed * timeStep;
        if (direction.x !== 0) velocity.x -= direction.x * walkingSpeed * timeStep;

        // Move camera
        if (useTouchControls) {
          // For touch controls, move camera directly
          const cameraDirection = new THREE.Vector3();
          camera.getWorldDirection(cameraDirection);
          cameraDirection.y = 0;
          cameraDirection.normalize();
          
          const right = new THREE.Vector3();
          right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
          
          camera.position.addScaledVector(cameraDirection, -velocity.z * timeStep);
          camera.position.addScaledVector(right, -velocity.x * timeStep);
        } else {
          controls.moveRight(-velocity.x * timeStep);
          controls.moveForward(-velocity.z * timeStep);
        }
        
        // Calculate current speed for debug display
        currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // Debug: Log position occasionally
        if (Math.random() < 0.01) {
          console.log('Camera position:', useTouchControls ? camera.position : controls.getObject().position);
        }
      } else {
        currentSpeed = 0;
      }
    },
    
    dispose: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      if (touchControls) {
        touchControls.dispose();
      }
    }
  };
}
