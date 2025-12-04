import * as THREE from 'three';

/**
 * TouchControls - Provides mobile touch-based controls for first-person navigation
 * Features:
 * - Left side: Virtual joystick for movement
 * - Right side: Touch drag for camera look
 * - Pinch to zoom (optional)
 */
export class TouchControls {
  constructor(camera, domElement, onLookUpdate) {
    this.camera = camera;
    this.domElement = domElement;
    this.onLookUpdate = onLookUpdate;
    
    this.enabled = false;
    this.isTouchDevice = this.detectTouchDevice();
    
    // Movement state (from virtual joystick)
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      moveX: 0,
      moveY: 0
    };
    
    // Camera rotation
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.PI_2 = Math.PI / 2;
    this.lookSensitivity = 0.003;
    
    // Touch tracking
    this.joystickTouch = null;
    this.lookTouch = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickRadius = 50;
    
    // UI Elements
    this.joystickContainer = null;
    this.joystickBase = null;
    this.joystickKnob = null;
    this.lookArea = null;
    
    // Bind methods
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    
    if (this.isTouchDevice) {
      this.createUI();
      this.addEventListeners();
    }
  }
  
  detectTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }
  
  createUI() {
    // Create joystick container (left side)
    this.joystickContainer = document.createElement('div');
    this.joystickContainer.id = 'touch-joystick-container';
    this.joystickContainer.innerHTML = `
      <div id="joystick-base">
        <div id="joystick-knob"></div>
      </div>
    `;
    document.body.appendChild(this.joystickContainer);
    
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    
    // Create look area (right side)
    this.lookArea = document.createElement('div');
    this.lookArea.id = 'touch-look-area';
    this.lookArea.innerHTML = '<span class="look-hint">Drag to look</span>';
    document.body.appendChild(this.lookArea);
    
    // Create action button (for interactions)
    this.actionButton = document.createElement('button');
    this.actionButton.id = 'touch-action-btn';
    this.actionButton.textContent = '●';
    this.actionButton.style.display = 'none'; // Show when near interactive objects
    document.body.appendChild(this.actionButton);
  }
  
  addEventListeners() {
    // Joystick events
    this.joystickContainer.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.joystickContainer.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.joystickContainer.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.joystickContainer.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    
    // Look area events
    this.lookArea.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.lookArea.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.lookArea.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.lookArea.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }
  
  onTouchStart(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const target = touch.target.closest('#touch-joystick-container, #touch-look-area');
      
      if (target?.id === 'touch-joystick-container' && !this.joystickTouch) {
        this.joystickTouch = touch.identifier;
        
        // Get joystick base center
        const rect = this.joystickBase.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        
        this.updateJoystick(touch.clientX, touch.clientY);
      } else if (target?.id === 'touch-look-area' && !this.lookTouch) {
        this.lookTouch = {
          id: touch.identifier,
          lastX: touch.clientX,
          lastY: touch.clientY
        };
        
        // Hide hint on first touch
        const hint = this.lookArea.querySelector('.look-hint');
        if (hint) hint.style.opacity = '0';
      }
    }
  }
  
  onTouchMove(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      if (touch.identifier === this.joystickTouch) {
        this.updateJoystick(touch.clientX, touch.clientY);
      } else if (this.lookTouch && touch.identifier === this.lookTouch.id) {
        this.updateLook(touch.clientX, touch.clientY);
      }
    }
  }
  
  onTouchEnd(event) {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      if (touch.identifier === this.joystickTouch) {
        this.joystickTouch = null;
        this.resetJoystick();
      } else if (this.lookTouch && touch.identifier === this.lookTouch.id) {
        this.lookTouch = null;
      }
    }
  }
  
  updateJoystick(touchX, touchY) {
    // Calculate offset from center
    let deltaX = touchX - this.joystickCenter.x;
    let deltaY = touchY - this.joystickCenter.y;
    
    // Clamp to radius
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > this.joystickRadius) {
      deltaX = (deltaX / distance) * this.joystickRadius;
      deltaY = (deltaY / distance) * this.joystickRadius;
    }
    
    // Update knob position
    this.joystickKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // Normalize to -1 to 1
    const normalizedX = deltaX / this.joystickRadius;
    const normalizedY = deltaY / this.joystickRadius;
    
    // Apply dead zone
    const deadZone = 0.15;
    this.moveState.moveX = Math.abs(normalizedX) > deadZone ? normalizedX : 0;
    this.moveState.moveY = Math.abs(normalizedY) > deadZone ? normalizedY : 0;
    
    // Update boolean states for compatibility
    this.moveState.forward = normalizedY < -deadZone;
    this.moveState.backward = normalizedY > deadZone;
    this.moveState.left = normalizedX < -deadZone;
    this.moveState.right = normalizedX > deadZone;
  }
  
  resetJoystick() {
    this.joystickKnob.style.transform = 'translate(0, 0)';
    this.moveState.forward = false;
    this.moveState.backward = false;
    this.moveState.left = false;
    this.moveState.right = false;
    this.moveState.moveX = 0;
    this.moveState.moveY = 0;
  }
  
  updateLook(touchX, touchY) {
    if (!this.lookTouch || !this.enabled) return;
    
    const deltaX = touchX - this.lookTouch.lastX;
    const deltaY = touchY - this.lookTouch.lastY;
    
    this.lookTouch.lastX = touchX;
    this.lookTouch.lastY = touchY;
    
    // Get current euler from camera
    this.euler.setFromQuaternion(this.camera.quaternion);
    
    // Apply rotation
    this.euler.y -= deltaX * this.lookSensitivity;
    this.euler.x -= deltaY * this.lookSensitivity;
    
    // Clamp vertical rotation
    this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
    
    // Apply to camera
    this.camera.quaternion.setFromEuler(this.euler);
    
    // Callback for external updates
    if (this.onLookUpdate) {
      this.onLookUpdate(this.euler);
    }
  }
  
  getMoveState() {
    return this.moveState;
  }
  
  enable() {
    this.enabled = true;
    if (this.joystickContainer) {
      this.joystickContainer.style.display = 'flex';
      this.lookArea.style.display = 'flex';
    }
  }
  
  disable() {
    this.enabled = false;
    this.resetJoystick();
    if (this.joystickContainer) {
      this.joystickContainer.style.display = 'none';
      this.lookArea.style.display = 'none';
    }
  }
  
  showActionButton(show) {
    if (this.actionButton) {
      this.actionButton.style.display = show ? 'flex' : 'none';
    }
  }
  
  onActionButton(callback) {
    if (this.actionButton) {
      this.actionButton.addEventListener('click', callback);
    }
  }
  
  dispose() {
    if (this.joystickContainer) {
      this.joystickContainer.removeEventListener('touchstart', this.onTouchStart);
      this.joystickContainer.removeEventListener('touchmove', this.onTouchMove);
      this.joystickContainer.removeEventListener('touchend', this.onTouchEnd);
      this.joystickContainer.removeEventListener('touchcancel', this.onTouchEnd);
      this.joystickContainer.remove();
    }
    
    if (this.lookArea) {
      this.lookArea.removeEventListener('touchstart', this.onTouchStart);
      this.lookArea.removeEventListener('touchmove', this.onTouchMove);
      this.lookArea.removeEventListener('touchend', this.onTouchEnd);
      this.lookArea.removeEventListener('touchcancel', this.onTouchEnd);
      this.lookArea.remove();
    }
    
    if (this.actionButton) {
      this.actionButton.remove();
    }
  }
}
