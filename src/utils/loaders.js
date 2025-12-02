/**
 * Shared asset loaders
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Singleton GLTF Loader with optional Draco support
let gltfLoader = null;
let dracoLoader = null;

export function getGLTFLoader(useDraco = false) {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    
    if (useDraco) {
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      gltfLoader.setDRACOLoader(dracoLoader);
    }
  }
  return gltfLoader;
}

// Texture loader singleton
let textureLoader = null;

export function getTextureLoader() {
  if (!textureLoader) {
    textureLoader = new THREE.TextureLoader();
  }
  return textureLoader;
}

// Audio loader singleton
let audioLoader = null;

export function getAudioLoader() {
  if (!audioLoader) {
    audioLoader = new THREE.AudioLoader();
  }
  return audioLoader;
}

/**
 * Preload a list of assets
 * @param {string[]} urls - Array of URLs to preload
 * @param {function} onProgress - Progress callback (loaded, total)
 */
export async function preloadAssets(urls, onProgress) {
  let loaded = 0;
  const total = urls.length;

  const promises = urls.map(async (url) => {
    try {
      await fetch(url);
      loaded++;
      if (onProgress) onProgress(loaded, total);
    } catch (error) {
      console.warn(`Failed to preload: ${url}`, error);
      loaded++;
      if (onProgress) onProgress(loaded, total);
    }
  });

  await Promise.all(promises);
}
