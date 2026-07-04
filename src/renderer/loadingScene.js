import * as THREE from 'three';
import { 
  EffectComposer, 
  EffectPass, 
  RenderPass,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  NoiseEffect,
  BlendFunction,
  ToneMappingEffect,
  ToneMappingMode
} from 'postprocessing';

/**
 * LegacyJSONLoader - Parses old Three.js JSON format (formatVersion 3.x)
 */
class LegacyJSONLoader {
  parse(json) {
    const geometry = new THREE.BufferGeometry();
    
    if (!json.vertices || !json.faces) {
      console.warn('Invalid JSON format - missing vertices or faces');
      return { geometry, materials: [] };
    }

    const vertices = json.vertices;
    const faces = json.faces;
    const normals = json.normals || [];
    const uvs = json.uvs || [];

    const positions = [];
    const normalArray = [];
    const uvArray = [];
    const groups = [];

    let currentMaterialIndex = 0;
    let currentGroupStart = 0;
    let currentGroupCount = 0;

    let i = 0;
    while (i < faces.length) {
      const type = faces[i++];
      
      const isQuad = (type & 1) !== 0;
      const hasMaterial = (type & 2) !== 0;
      const hasFaceVertexUv = (type & 8) !== 0;
      const hasFaceNormal = (type & 16) !== 0;
      const hasFaceVertexNormal = (type & 32) !== 0;
      const hasFaceColor = (type & 64) !== 0;
      const hasFaceVertexColor = (type & 128) !== 0;

      const numVertices = isQuad ? 4 : 3;
      const vertexIndices = [];

      // Read vertex indices
      for (let v = 0; v < numVertices; v++) {
        vertexIndices.push(faces[i++]);
      }

      // Read material index
      let materialIndex = 0;
      if (hasMaterial) {
        materialIndex = faces[i++];
      }

      // Track material groups
      if (materialIndex !== currentMaterialIndex) {
        if (currentGroupCount > 0) {
          groups.push({
            start: currentGroupStart,
            count: currentGroupCount,
            materialIndex: currentMaterialIndex
          });
        }
        currentMaterialIndex = materialIndex;
        currentGroupStart = positions.length / 3;
        currentGroupCount = 0;
      }

      // Read face vertex UVs
      const faceUvs = [];
      if (hasFaceVertexUv) {
        for (let v = 0; v < numVertices; v++) {
          const uvIndex = faces[i++];
          if (uvs.length > uvIndex * 2 + 1) {
            faceUvs.push([uvs[uvIndex * 2], uvs[uvIndex * 2 + 1]]);
          } else {
            faceUvs.push([0, 0]);
          }
        }
      }

      // Read face normal
      if (hasFaceNormal) {
        i++; // Skip face normal index
      }

      // Read face vertex normals
      const faceNormals = [];
      if (hasFaceVertexNormal) {
        for (let v = 0; v < numVertices; v++) {
          const normalIndex = faces[i++];
          if (normals.length > normalIndex * 3 + 2) {
            faceNormals.push([
              normals[normalIndex * 3],
              normals[normalIndex * 3 + 1],
              normals[normalIndex * 3 + 2]
            ]);
          } else {
            faceNormals.push([0, 1, 0]);
          }
        }
      }

      // Read face color
      if (hasFaceColor) {
        i++;
      }

      // Read face vertex colors
      if (hasFaceVertexColor) {
        for (let v = 0; v < numVertices; v++) {
          i++;
        }
      }

      // Get vertex positions
      const getVertex = (index) => {
        return [
          vertices[index * 3],
          vertices[index * 3 + 1],
          vertices[index * 3 + 2]
        ];
      };

      // Add triangles
      const addTriangle = (a, b, c) => {
        const va = getVertex(vertexIndices[a]);
        const vb = getVertex(vertexIndices[b]);
        const vc = getVertex(vertexIndices[c]);

        positions.push(...va, ...vb, ...vc);

        if (faceNormals.length > 0) {
          normalArray.push(...faceNormals[a], ...faceNormals[b], ...faceNormals[c]);
        }

        if (faceUvs.length > 0) {
          uvArray.push(...faceUvs[a], ...faceUvs[b], ...faceUvs[c]);
        }

        currentGroupCount += 3;
      };

      // Triangle
      addTriangle(0, 1, 2);

      // If quad, add second triangle
      if (isQuad) {
        addTriangle(0, 2, 3);
      }
    }

    // Add final group
    if (currentGroupCount > 0) {
      groups.push({
        start: currentGroupStart,
        count: currentGroupCount,
        materialIndex: currentMaterialIndex
      });
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    if (normalArray.length > 0) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
    } else {
      geometry.computeVertexNormals();
    }

    if (uvArray.length > 0) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
    }

    // Set up groups for multi-material
    groups.forEach(group => {
      geometry.addGroup(group.start, group.count, group.materialIndex);
    });

    // Parse materials
    const materials = [];
    if (json.materials) {
      json.materials.forEach((mat) => {
        const material = new THREE.MeshLambertMaterial({
          side: THREE.DoubleSide
        });

        if (mat.colorDiffuse) {
          material.color.setRGB(mat.colorDiffuse[0], mat.colorDiffuse[1], mat.colorDiffuse[2]);
        }

        if (mat.opacity !== undefined && mat.opacity < 1) {
          material.transparent = true;
          material.opacity = mat.opacity;
        }

        materials.push(material);
      });
    }

    if (materials.length === 0) {
      materials.push(new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide }));
    }

    return { geometry, materials };
  }
}

/**
 * LoadingScene - Creates an immersive 3D loading experience with the Sednaya building
 */
export class LoadingScene {
  // Speed-profile knots (time -> distance along spline) with Fritsch–Carlson
  // tangents for a monotone, C1-continuous flight. Segment slopes are
  // 0.667 / 1.091 / 1.0; interior tangents are their harmonic means,
  // endpoint tangents 0 (ease in from rest, ease out into the fade).
  static SPEED_KNOTS_T = [0, 0.15, 0.7, 1];
  static SPEED_KNOTS_P = [0, 0.1, 0.7, 1];
  static SPEED_TANGENTS = [0, 0.827586, 1.043478, 0];

  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.isActive = false;
    this.isDisposed = false;
    this.animationId = null;
    this.buildingCenter = new THREE.Vector3();
    this.onComplete = null;
    this.loadedAssets = 0;
    this.totalAssets = 6;
    this.jsonLoader = new LegacyJSONLoader();
    
    // Visual effects references
    this.bloomEffect = null;
    this.vignetteEffect = null;
    this.chromaticAberrationEffect = null;
    this.noiseEffect = null;
    this.particles = null;
    this.dustParticles = null;
    this.dynamicLights = [];
    
    // Camera transition state
    this.cameraTransition = {
      active: false,
      progress: 0,
      duration: 12000, // Cinematic descent
      startTime: 0,
      lookAtTarget: new THREE.Vector3(0, 0, 0),
      currentLookAt: new THREE.Vector3(0, 0, 0),
      currentPosition: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      // Drone-style camera effects
      currentFOV: 75,
      targetFOV: 75,
      currentRoll: 0,
      targetRoll: 0
    };
    
    this.cameraSpline = null;
    this.lookAtSpline = null; // Separate spline for look-at targets
    this.lastTime = performance.now();
    
    // Fade overlay element
    this.fadeOverlay = null;
    
    // Initial camera settings
    this.initialFOV = 65;
    this.finalFOV = 85;
    this.initialFogDensity = 0.003;
    this.finalFogDensity = 0.025;
    
    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a15);
    
    // Add fog for atmosphere - denser, more mysterious
    this.scene.fog = new THREE.FogExp2(0x0a0a15, this.initialFogDensity);

    this.camera = new THREE.PerspectiveCamera(
      this.initialFOV, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(-95.00, 240.00, 40.00);
    
    // Create fade overlay for transition to archive scene
    this.createFadeOverlay();

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.container.appendChild(this.renderer.domElement);

    // Setup post-processing
    this.setupPostProcessing();

    // Setup lighting with dynamic lights
    this.setupLighting();
    
    // Create particle systems
    this.createParticles();

    // Handle window resize
    this.boundResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.boundResize);

    // Load assets
    this.loadAssets();
  }

  createFadeOverlay() {
    // Create a full-screen fade overlay for the final transition
    this.fadeOverlay = document.createElement('div');
    this.fadeOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, #000000, #0a0a15);
      opacity: 0;
      pointer-events: none;
      z-index: 999;
      transition: none;
    `;
    this.container.appendChild(this.fadeOverlay);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom effect - ethereal glow
    this.bloomEffect = new BloomEffect({
      intensity: 0.5,
      luminanceThreshold: 0.4,
      luminanceSmoothing: 0.7,
      mipmapBlur: true
    });
    
    // Vignette effect - darker edges for focus
    this.vignetteEffect = new VignetteEffect({
      darkness: 0.6,
      offset: 0.3
    });
    
    // Chromatic aberration - subtle color fringing
    this.chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.001, 0.001),
      radialModulation: true,
      modulationOffset: 0.5
    });
    
    // Film grain noise
    this.noiseEffect = new NoiseEffect({
      blendFunction: BlendFunction.OVERLAY,
      premultiply: true
    });
    this.noiseEffect.blendMode.opacity.value = 0.15;
    
    // Tone mapping
    const toneMappingEffect = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
      resolution: 256,
      whitePoint: 4.0,
      middleGrey: 0.6,
      minLuminance: 0.01,
      averageLuminance: 0.01,
      adaptationRate: 1.0
    });
    
    // Add effects pass
    const effectPass = new EffectPass(
      this.camera,
      this.bloomEffect,
      this.vignetteEffect,
      this.chromaticAberrationEffect,
      this.noiseEffect,
      toneMappingEffect
    );
    
    this.composer.addPass(effectPass);
  }

  setupLighting() {
    // Dim ambient for mood
    const ambientLight = new THREE.AmbientLight(0x202030, 0.3);
    this.scene.add(ambientLight);

    // Main directional light - moonlight feel
    const moonLight = new THREE.DirectionalLight(0x6688cc, 0.6);
    moonLight.position.set(50, 100, 50);
    this.scene.add(moonLight);
    
    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0x443355, 0.3);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
    
    // Dynamic point lights that pulse and move
    const lightColors = [0xff6644, 0x4488ff, 0xffaa22, 0x44ffaa];
    for (let i = 0; i < 4; i++) {
      const pointLight = new THREE.PointLight(lightColors[i], 0, 50);
      pointLight.position.set(
        Math.sin(i * Math.PI / 2) * 30,
        10 + i * 5,
        Math.cos(i * Math.PI / 2) * 30
      );
      this.scene.add(pointLight);
      this.dynamicLights.push({
        light: pointLight,
        baseIntensity: 0.5 + Math.random() * 0.5,
        phase: i * Math.PI / 2,
        speed: 0.5 + Math.random() * 0.5
      });
    }
    
    // Spotlight for dramatic entrance effect
    const spotLight = new THREE.SpotLight(0xffeedd, 0, 200, Math.PI / 6, 0.5, 2);
    spotLight.position.set(-40, 50, 20);
    spotLight.target.position.set(-42, 0, 19);
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);
    this.dynamicLights.push({
      light: spotLight,
      baseIntensity: 2,
      phase: 0,
      speed: 0.3,
      isSpotlight: true
    });
  }

  createParticles() {
    // Floating dust particles
    const dustCount = 2000;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    const dustOpacities = new Float32Array(dustCount);
    
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 200;
      dustPositions[i * 3 + 1] = Math.random() * 150;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      dustSizes[i] = Math.random() * 2 + 0.5;
      dustOpacities[i] = Math.random();
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));
    dustGeometry.setAttribute('opacity', new THREE.BufferAttribute(dustOpacities, 1));
    
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xccccaa,
      size: 0.5,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.dustParticles = new THREE.Points(dustGeometry, dustMaterial);
    this.scene.add(this.dustParticles);
    
    // Ethereal mist/fog particles near ground
    const mistCount = 500;
    const mistGeometry = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(mistCount * 3);
    
    for (let i = 0; i < mistCount; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 150;
      mistPositions[i * 3 + 1] = Math.random() * 20 - 5;
      mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    
    const mistMaterial = new THREE.PointsMaterial({
      color: 0x8888aa,
      size: 3,
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(mistGeometry, mistMaterial);
    this.scene.add(this.particles);
  }

  updateVisualEffects(progress, deltaTime) {
    const time = performance.now() * 0.001;
    
    // Update bloom intensity - increases as we get closer
    if (this.bloomEffect) {
      this.bloomEffect.intensity = 0.3 + progress * 0.8;
    }
    
    // Update vignette - gets tighter as we approach
    if (this.vignetteEffect) {
      this.vignetteEffect.darkness = 0.5 + progress * 0.3;
    }
    
    // Chromatic aberration pulses
    if (this.chromaticAberrationEffect) {
      const aberrationIntensity = 0.0005 + Math.sin(time * 2) * 0.0003;
      this.chromaticAberrationEffect.offset.set(aberrationIntensity, aberrationIntensity);
    }
    
    // Update dynamic lights
    this.dynamicLights.forEach((lightData, index) => {
      const { light, baseIntensity, phase, speed, isSpotlight } = lightData;
      
      // Pulsing intensity
      const pulse = Math.sin(time * speed + phase) * 0.5 + 0.5;
      
      if (isSpotlight) {
        // Spotlight intensifies as we approach entrance
        light.intensity = baseIntensity * progress * pulse;
      } else {
        // Point lights have gentle pulse
        light.intensity = baseIntensity * pulse * (0.3 + progress * 0.7);

        // Slight movement
        light.position.y += Math.sin(time * speed * 2 + phase) * 0.1;
      }
    });
    
    // Animate dust particles
    if (this.dustParticles) {
      const positions = this.dustParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        // Gentle floating motion
        positions[i] += Math.sin(time + i) * 0.02;
        positions[i + 1] += Math.cos(time * 0.5 + i) * 0.01 + 0.005;
        positions[i + 2] += Math.cos(time + i) * 0.02;
        
        // Reset if too high
        if (positions[i + 1] > 150) {
          positions[i + 1] = 0;
        }
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
      
      // Rotate slowly
      this.dustParticles.rotation.y += deltaTime * 0.01;
    }
    
    // Animate mist particles
    if (this.particles) {
      this.particles.rotation.y -= deltaTime * 0.02;
      
      // Mist opacity increases near the end
      this.particles.material.opacity = 0.15 + progress * 0.15;
    }
    
    // Color grading - shift from cool to warm as we enter
    const warmth = progress;
    const bgColor = new THREE.Color();
    bgColor.setRGB(
      0.04 + warmth * 0.02,
      0.04 + warmth * 0.01,
      0.08 - warmth * 0.02
    );
    this.scene.background = bgColor;
    
    // Fog density increases slightly
    if (this.scene.fog) {
      this.scene.fog.density = 0.006 + progress * 0.004;
    }
    
    // Exposure adjustment
    this.renderer.toneMappingExposure = 0.6 + progress * 0.6;
  }

  loadAssets() {
    const loader = new THREE.FileLoader();
    const textureLoader = new THREE.TextureLoader();

    // Load building first to get center
    loader.load('/3d_sednaya/building.js', (text) => {
      try {
        const json = JSON.parse(text);
        const { geometry, materials } = this.jsonLoader.parse(json);
        
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(this.buildingCenter);
        
        const mesh = new THREE.Mesh(geometry, materials.length > 1 ? materials : materials[0]);
        mesh.position.sub(this.buildingCenter);
        this.scene.add(mesh);
        
        console.log('Building loaded successfully');
        this.assetLoaded();
        
        // Load other assets after building
        this.loadDependentAssets(loader, textureLoader);
      } catch (e) {
        console.error('Error parsing building:', e);
        this.assetLoaded();
        this.loadDependentAssets(loader, textureLoader);
      }
    }, undefined, (error) => {
      console.error('Error loading building:', error);
      this.assetLoaded();
      this.loadDependentAssets(loader, textureLoader);
    });
  }

  loadDependentAssets(loader, textureLoader) {
    // Load roof
    loader.load('/3d_sednaya/building-roof.js', (text) => {
      try {
        const json = JSON.parse(text);
        const { geometry, materials } = this.jsonLoader.parse(json);
        const mesh = new THREE.Mesh(geometry, materials.length > 1 ? materials : materials[0]);
        mesh.position.sub(this.buildingCenter);
        this.scene.add(mesh);
        console.log('Roof loaded');
      } catch (e) {
        console.error('Error parsing roof:', e);
      }
      this.assetLoaded();
    }, undefined, () => this.assetLoaded());

    // Load terrain with texture
    loader.load('/3d_sednaya/terrain.js', (text) => {
      try {
        const json = JSON.parse(text);
        const { geometry } = this.jsonLoader.parse(json);
        
        textureLoader.load('/3d_sednaya/panchromatic.jpg', (texture) => {
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.sub(this.buildingCenter);
          this.scene.add(mesh);
          console.log('Terrain loaded with texture');
        }, undefined, () => {
          const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ 
            color: 0x3d3d3d, 
            side: THREE.DoubleSide 
          }));
          mesh.position.sub(this.buildingCenter);
          this.scene.add(mesh);
        });
      } catch (e) {
        console.error('Error parsing terrain:', e);
      }
      this.assetLoaded();
    }, undefined, () => this.assetLoaded());

    // Load white building
    loader.load('/3d_sednaya/whiteBuilding.js', (text) => {
      try {
        const json = JSON.parse(text);
        const { geometry, materials } = this.jsonLoader.parse(json);
        const mesh = new THREE.Mesh(geometry, materials.length > 1 ? materials : materials[0]);
        mesh.position.sub(this.buildingCenter);
        this.scene.add(mesh);
        console.log('White building loaded');
      } catch (e) {
        console.error('Error parsing white building:', e);
      }
      this.assetLoaded();
    }, undefined, () => this.assetLoaded());

    // Load corridor
    loader.load('/3d_sednaya/corridor.js', (text) => {
      try {
        const json = JSON.parse(text);
        const { geometry } = this.jsonLoader.parse(json);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ 
          color: 0x555555, 
          side: THREE.DoubleSide 
        }));
        mesh.position.sub(this.buildingCenter);
        this.scene.add(mesh);
        console.log('Corridor loaded');
      } catch (e) {
        console.error('Error parsing corridor:', e);
      }
      this.assetLoaded();
    }, undefined, () => this.assetLoaded());

    // Load group cell
    loader.load('/3d_sednaya/groupcell-d.js', (text) => {
      try {
        const json = JSON.parse(text);
        const { geometry } = this.jsonLoader.parse(json);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ 
          color: 0x444444, 
          side: THREE.DoubleSide 
        }));
        mesh.position.sub(this.buildingCenter);
        this.scene.add(mesh);
        console.log('Group cell loaded');
      } catch (e) {
        console.error('Error parsing group cell:', e);
      }
      this.assetLoaded();
    }, undefined, () => this.assetLoaded());
  }

  assetLoaded() {
    this.loadedAssets++;
    console.log(`Loading scene: ${this.loadedAssets}/${this.totalAssets} assets`);
    
    if (this.loadedAssets >= this.totalAssets && !this.cameraTransition.active) {
      console.log('All assets loaded, starting camera transition');
      this.startCameraTransition();
    }
  }

  startCameraTransition() {
    // Smooth descending arc — no direction reversals, no dense clusters
    // 14 waypoints, min spacing 4.1 units, max XZ direction change ~10°
    const cameraWaypoints = [
      // Phase 1: High altitude establishing
      new THREE.Vector3(-95.00, 240.00, 40.00),
      new THREE.Vector3(-91.46, 237.78, 41.11),
      new THREE.Vector3(-87.18, 228.75, 42.26),
      new THREE.Vector3(-81.48, 215.13, 43.40),

      // Phase 2: Main descent — building resolves from fog
      new THREE.Vector3(-75.39, 181.97, 44.06),
      new THREE.Vector3(-68.39, 116.51, 43.90),
      new THREE.Vector3(-61.49, 47.42, 42.46),
      new THREE.Vector3(-55.42, 19.93, 39.71),

      // Phase 3: Transition to low approach
      new THREE.Vector3(-50.63, 13.84, 36.06),
      new THREE.Vector3(-46.91, 6.56, 31.84),
      new THREE.Vector3(-44.07, 4.70, 27.35),

      // Phase 4: Low approach and entrance
      new THREE.Vector3(-41.94, 2.55, 22.86),
      new THREE.Vector3(-40.64, 0.87, 19.31),
      new THREE.Vector3(-39.50, 0.10, 15.50)
    ];

    // Look-at targets: gaze leads travel, shifted right toward entrance
    // x converges monotonically from -80.75 → -42.00
    const lookAtWaypoints = [
      // Phases 1–2: Look ahead and down
      new THREE.Vector3(-80.75, 60.00, 28.00),
      new THREE.Vector3(-76.97, 58.11, 28.47),
      new THREE.Vector3(-71.35, 52.06, 28.30),
      new THREE.Vector3(-64.09, 42.96, 27.32),
      new THREE.Vector3(-56.86, 29.40, 25.22),
      new THREE.Vector3(-50.36, 13.67, 22.01),
      new THREE.Vector3(-46.07, 4.31, 18.03),
      new THREE.Vector3(-44.95, 2.95, 15.90),

      // Phase 3: Locking on entrance — yawed right (+x direction)
      new THREE.Vector3(-36.00, 2.59, 15.19),
      new THREE.Vector3(-35.00, 2.01, 14.02),
      new THREE.Vector3(-34.00, 1.33, 12.65),

      // Phase 4: Into the darkness
      new THREE.Vector3(-33.00, 0.68, 11.35),
      new THREE.Vector3(-32.50, 0.19, 10.38),
      new THREE.Vector3(-32.00, 0.00, 10.00)
    ];

    // Create smooth splines with centripetal parameterization for even speed
    this.cameraSpline = new THREE.CatmullRomCurve3(cameraWaypoints);
    this.cameraSpline.curveType = 'centripetal';
    this.cameraSpline.tension = 0.35;

    this.lookAtSpline = new THREE.CatmullRomCurve3(lookAtWaypoints);
    this.lookAtSpline.curveType = 'centripetal';
    this.lookAtSpline.tension = 0.25;
    
    // Initialize transition state
    this.cameraTransition.active = true;
    this.cameraTransition.progress = 0;
    this.cameraTransition.startTime = performance.now();
    this.cameraTransition.currentPosition.copy(cameraWaypoints[0]);
    this.cameraTransition.currentLookAt.copy(lookAtWaypoints[0]);
    this.cameraTransition.currentFOV = this.initialFOV;
    this.cameraTransition.currentRoll = 0;
    
    // Set initial camera state
    this.camera.fov = this.initialFOV;
    this.camera.updateProjectionMatrix();
    
    console.log('Camera transition started - Google Earth style drone flight');
  }

  // Ultra smooth easing
  ultraSmoothEase(t) {
    const sine = Math.sin(t * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    const poly = t * t * t * (t * (t * 6 - 15) + 10);
    return sine * 0.3 + poly * 0.7;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  damp(current, target, smoothing, dt) {
    return this.lerp(current, target, 1 - Math.exp(-smoothing * dt));
  }

  dampVector3(current, target, smoothing, dt) {
    current.x = this.damp(current.x, target.x, smoothing, dt);
    current.y = this.damp(current.y, target.y, smoothing, dt);
    current.z = this.damp(current.z, target.z, smoothing, dt);
  }

  updateCameraTransition() {
    if (!this.cameraTransition.active || !this.cameraSpline) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    const elapsed = currentTime - this.cameraTransition.startTime;
    let rawProgress = elapsed / this.cameraTransition.duration;

    if (rawProgress >= 1) {
      rawProgress = 1;
      this.cameraTransition.active = false;
      
      console.log('Camera transition completed');
      
      // Ensure full fade to black
      if (this.fadeOverlay) {
        this.fadeOverlay.style.opacity = '1';
      }
      
      // Notify completion
      if (this.onComplete) {
        this.onComplete();
      }
    }

    // Variable speed curve - Google Earth style (slow start, smooth middle, slow dramatic end)
    const speedCurve = this.droneSpeedEase(rawProgress);
    const targetPosition = this.cameraSpline.getPointAt(Math.min(speedCurve, 1));

    // Smooth camera position interpolation
    const positionSmoothing = this.getAdaptiveSmoothing(rawProgress);
    this.dampVector3(this.cameraTransition.currentPosition, targetPosition, positionSmoothing, deltaTime);
    this.camera.position.copy(this.cameraTransition.currentPosition);
    
    // Get look-at target from spline
    if (this.lookAtSpline) {
      const targetLookAt = this.lookAtSpline.getPointAt(Math.min(speedCurve, 1));
      const lookAtSmoothing = positionSmoothing * 0.8; // Slightly faster look-at response
      this.dampVector3(this.cameraTransition.currentLookAt, targetLookAt, lookAtSmoothing, deltaTime);
    }
    
    this.camera.lookAt(this.cameraTransition.currentLookAt);
    
    // Apply drone-style camera banking/roll based on turn rate
    this.updateCameraRoll(speedCurve, deltaTime);
    
    // Dynamic FOV - starts wide (establishing shot), narrows during descent, widens at entrance
    this.updateDynamicFOV(rawProgress, deltaTime);
    
    // Dynamic fog density - increases as we descend into the building
    this.updateDynamicFog(rawProgress);
    
    // Update fade overlay for final transition
    this.updateFadeTransition(rawProgress);

    this.cameraTransition.progress = rawProgress;
    
    // Update visual effects based on progress
    this.updateVisualEffects(rawProgress, deltaTime);
    
    // Subtle atmospheric camera movement (wind effect)
    if (rawProgress < 0.85) {
      const windIntensity = 0.3 * (1 - rawProgress);
      const windFreq = currentTime * 0.001;
      this.camera.position.x += Math.sin(windFreq * 1.3) * windIntensity * deltaTime;
      this.camera.position.y += Math.sin(windFreq * 0.8) * windIntensity * 0.5 * deltaTime;
    }
  }
  
  updateCameraRoll(progress, deltaTime) {
    // Calculate turn rate to determine banking angle
    const epsilon = 0.001;
    const currentPos = this.cameraSpline.getPointAt(Math.min(progress, 1));
    const nextPos = this.cameraSpline.getPointAt(Math.min(progress + epsilon, 1));
    
    const direction = nextPos.clone().sub(currentPos).normalize();
    
    // Calculate lateral acceleration (turning)
    const prevProgress = Math.max(progress - epsilon, 0);
    const prevPos = this.cameraSpline.getPointAt(prevProgress);
    const prevDirection = currentPos.clone().sub(prevPos).normalize();
    
    // Cross product gives us the turn direction
    const turnAxis = new THREE.Vector3().crossVectors(prevDirection, direction);
    const turnRate = turnAxis.y; // Positive = turning right, negative = turning left
    
    // Bank angle based on turn rate (max 15 degrees)
    const maxBankAngle = Math.PI / 12;
    this.cameraTransition.targetRoll = -turnRate * maxBankAngle * 50;
    
    // Clamp and smooth the roll
    this.cameraTransition.targetRoll = Math.max(-maxBankAngle, Math.min(maxBankAngle, this.cameraTransition.targetRoll));
    this.cameraTransition.currentRoll = this.damp(
      this.cameraTransition.currentRoll,
      this.cameraTransition.targetRoll,
      3,
      deltaTime
    );
    
    // Apply roll to camera
    this.camera.rotation.z = this.cameraTransition.currentRoll;
  }
  
  updateDynamicFOV(progress, deltaTime) {
    // FOV progression:
    // 0-20%: Wide establishing (65°)
    // 20-60%: Narrow during descent (55°)
    // 60-85%: Gradually widen approaching entrance (70°)
    // 85-100%: Dramatic wide for entrance (85°)
    
    let targetFOV;
    if (progress < 0.2) {
      targetFOV = this.initialFOV;
    } else if (progress < 0.6) {
      const t = (progress - 0.2) / 0.4;
      targetFOV = this.lerp(this.initialFOV, 55, this.easeInOutCubic(t));
    } else if (progress < 0.85) {
      const t = (progress - 0.6) / 0.25;
      targetFOV = this.lerp(55, 70, this.easeInOutCubic(t));
    } else {
      const t = (progress - 0.85) / 0.15;
      targetFOV = this.lerp(70, this.finalFOV, this.easeInCubic(t));
    }
    
    this.cameraTransition.targetFOV = targetFOV;
    this.cameraTransition.currentFOV = this.damp(
      this.cameraTransition.currentFOV,
      this.cameraTransition.targetFOV,
      4,
      deltaTime
    );
    
    this.camera.fov = this.cameraTransition.currentFOV;
    this.camera.updateProjectionMatrix();
  }
  
  updateDynamicFog(progress) {
    // Fog density increases as we enter the building
    // Creates the feeling of descending into darkness
    let fogDensity;
    
    if (progress < 0.7) {
      // Light fog during aerial portion
      fogDensity = this.lerp(this.initialFogDensity, 0.008, progress / 0.7);
    } else {
      // Dramatically increase fog as we enter
      const t = (progress - 0.7) / 0.3;
      fogDensity = this.lerp(0.008, this.finalFogDensity, this.easeInCubic(t));
    }
    
    if (this.scene.fog) {
      this.scene.fog.density = fogDensity;
    }
  }
  
  updateFadeTransition(progress) {
    // Start fade to black at 85% progress
    if (progress > 0.85 && this.fadeOverlay) {
      const fadeProgress = (progress - 0.85) / 0.15;
      const fadeOpacity = this.easeInCubic(fadeProgress);
      this.fadeOverlay.style.opacity = fadeOpacity.toString();
    }
  }
  
  getAdaptiveSmoothing() {
    // Constant smoothing. The previous phase-stepped values (2.0 / 3.0 / 2.5)
    // introduced acceleration discontinuities at 20% and 60% progress —
    // the damp chase visibly changed character mid-flight.
    return 2.5;
  }
  
  droneSpeedEase(t) {
    // Google Earth style pacing: slow majestic start, faster middle,
    // deliberate final approach. Same knots as the original piecewise
    // curve — (0.15 time -> 0.10 distance), (0.70 -> 0.70) — but evaluated
    // as a monotone cubic Hermite (Fritsch–Carlson tangents) so velocity
    // is C1-continuous. The old piecewise easing decelerated to a dead
    // stop at t=0.15 and stepped from 0 to 4x speed at t=0.7, which read
    // as a visible stall-then-lurch mid-flight.
    const knotsT = LoadingScene.SPEED_KNOTS_T;
    const knotsP = LoadingScene.SPEED_KNOTS_P;
    const tangents = LoadingScene.SPEED_TANGENTS;

    const clamped = Math.min(Math.max(t, 0), 1);
    let seg = knotsT.length - 2;
    for (let i = 0; i < knotsT.length - 1; i++) {
      if (clamped <= knotsT[i + 1]) { seg = i; break; }
    }

    const h = knotsT[seg + 1] - knotsT[seg];
    const s = (clamped - knotsT[seg]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;

    return h00 * knotsP[seg]
      + h10 * h * tangents[seg]
      + h01 * knotsP[seg + 1]
      + h11 * h * tangents[seg + 1];
  }
  
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  easeInCubic(t) {
    return t * t * t;
  }
  
  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  
  // Legacy variable speed easing - kept for compatibility
  variableSpeedEase(t) {
    return this.droneSpeedEase(t);
  }
  
  easeInQuad(t) {
    return t * t;
  }
  
  easeOutQuad(t) {
    return t * (2 - t);
  }

  start(onComplete) {
    this.onComplete = onComplete;
    this.isActive = true;
    this.animate();
    console.log('Loading scene started');
  }

  animate() {
    if (!this.isActive || this.isDisposed) return;

    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    this.updateCameraTransition();
    
    // Use composer for post-processed rendering
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer size
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  getProgress() {
    return this.cameraTransition.progress;
  }

  isComplete() {
    return this.cameraTransition.progress >= 1;
  }

  skipTransition() {
    if (this.cameraTransition.active) {
      this.cameraTransition.active = false;
      this.cameraTransition.progress = 1;
      console.log('Camera transition skipped');
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  dispose() {
    this.isActive = false;
    this.isDisposed = true;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Remove fade overlay
    if (this.fadeOverlay && this.fadeOverlay.parentNode) {
      this.fadeOverlay.parentNode.removeChild(this.fadeOverlay);
    }

    window.removeEventListener('resize', this.boundResize);

    // Dispose post-processing
    if (this.composer) {
      this.composer.dispose();
    }

    // Dispose Three.js resources
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    
    console.log('Loading scene disposed');
  }
}
