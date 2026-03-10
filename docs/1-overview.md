# Overview

Relevant source files

- [README.md](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md)
- [index.html](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html)
- [package.json](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json)
- [public/\_headers](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_headers)
- [public/\_redirects](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_redirects)
- [src/main.js](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js)

This document provides a high-level introduction to the House of Dreams (also known as House of Letters) interactive 3D experience. It covers the project's purpose, core technologies, system architecture, and user experience flow. For detailed information about specific subsystems, refer to the Architecture Overview ([#3](#amrayach/house-of-letters/3-architecture-overview)) and component-specific pages.

## Purpose and Scope

House of Dreams is an interactive 3D web application that presents 46 scanned letters as three-dimensional models suspended in a dark spatial environment. Users navigate through this space, triggering proximity-based audio narrations as they approach each letter. The application combines real-time 3D rendering, spatial audio, adaptive input controls, and a cinematic loading experience to create an immersive digital archive.

This overview explains what the system is, how its major components fit together, and the overall user experience. For installation and development workflow, see Getting Started ([#2](#amrayach/house-of-letters/2-getting-started)). For in-depth technical documentation of individual systems, see their respective sections: Rendering System ([#4](#amrayach/house-of-letters/4-rendering-system)), Audio System ([#5](#amrayach/house-of-letters/5-audio-system)), Input Controls ([#6](#amrayach/house-of-letters/6-input-controls)), User Interface ([#7](#amrayach/house-of-letters/7-user-interface)), and Content System ([#8](#amrayach/house-of-letters/8-content-system)).

**Sources:** [README.md1-52](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L1-L52) [index.html9](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html#L9-L9) [package.json5](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L5-L5)

## Project Identity

The application is titled "House of Dreams" in the user interface but is internally referenced as "house-of-letters" in the codebase. The experience presents JPEG-scanned letters that have been converted into 3D GLB models and positioned in a virtual space at eye-level (y=1.6). Users explore this archive by walking through the space, with audio narrations playing automatically when they come within 3 units of a letter model.

**Sources:** [index.html9](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html#L9-L9) [index.html21](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html#L21-L21) [index.html31](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html#L31-L31) [package.json2](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L2-L2)

## Core Technologies

The application is built as a client-side Single Page Application (SPA) using modern web technologies:

| Technology              | Version  | Purpose                                                         |
| ----------------------- | -------- | --------------------------------------------------------------- |
| **Three.js**            | ^0.181.2 | 3D rendering engine, scene management, camera controls          |
| **Howler.js**           | ^2.2.4   | Audio engine for background themes and narrations               |
| **Postprocessing**      | ^6.38.0  | Visual effects pipeline (bloom, vignette, chromatic aberration) |
| **Vite**                | ^7.2.2   | Build tool and development server with HMR                      |
| **@gltf-transform/cli** | ^4.2.1   | GLB model compression and optimization                          |

The project uses ES modules (`"type": "module"`) and is deployed as a static site on Cloudflare Pages with SPA routing configured via `public/_redirects`.

**Sources:** [package.json4](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L4-L4) [package.json21-30](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L21-L30) [public/\_redirects1](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_redirects#L1-L1)

## System Architecture

The following diagram maps the high-level system components to their corresponding code entities:

```
```

The `main.js` orchestrator ([src/main.js1-381](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L1-L381)) serves as the central coordinator, initializing all subsystems in sequence and managing the main animation loop. The application follows a layered architecture:

1. **Entry Layer**: `index.html` defines the UI structure and loads `main.js`
2. **Orchestration Layer**: `main.js` coordinates initialization and runs the animation loop
3. **System Layer**: Specialized modules handle rendering, audio, controls, and interaction
4. **Data Layer**: `letters.json` defines content, `constants.js` provides configuration

**Sources:** [src/main.js1-11](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L1-L11) [src/main.js29-35](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L29-L35) [index.html96](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html#L96-L96)

## User Experience Flow

The following diagram shows the state transitions and associated code entities in the user journey:

```
```

The initialization sequence follows a dual-gate pattern where both asset loading ([src/main.js95-204](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L95-L204)) and the cinematic loading scene ([src/main.js86-93](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L86-L93)) must complete before the start screen appears. The `transitionToGame()` function ([src/main.js59-75](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L59-L75)) checks both `assetsLoaded` and `loadingSceneComplete` flags before proceeding.

Once the user clicks "Enter Archive" ([src/main.js207-232](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L207-L232)), the audio system initializes (required for browser autoplay policies), background theme starts playing, and controls activate. The main animation loop ([src/main.js249-350](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L249-L350)) then runs continuously at 60fps, updating controls, checking proximity to letters, managing audio, animating letter models, and rendering frames.

**Sources:** [src/main.js59-93](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L59-L93) [src/main.js207-232](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L207-L232) [src/main.js249-350](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L249-L350)

## Key Systems Overview

The following table summarizes the major subsystems and their primary code locations:

| System                        | Primary Files                                                   | Key Responsibilities                                                             |
| ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Application Orchestration** | `main.js`                                                       | Initialize subsystems, manage state transitions, run animation loop              |
| **3D Rendering**              | `sceneSetup.js`, `lighting.js`, `letters.js`, `loadingScene.js` | Scene setup, camera management, lighting, model loading, post-processing effects |
| **Audio Management**          | `audioEngine.js`, `themeMixer.js`                               | Background theme playback, narration triggering, volume ducking, lazy loading    |
| **Input Controls**            | `controls.js`                                                   | Desktop pointer lock, mobile touch controls, bird's eye view mode                |
| **Interaction Detection**     | `proximityManager.js`                                           | Distance-based proximity checks, narration triggering, UI updates                |
| **User Interface**            | `index.html`, `main.css`                                        | Loading screen, start screen, pause screen, HUD, letter preview, debug panel     |
| **Content Data**              | `letters.json`                                                  | Letter positions, zone assignments, asset references for 46 letters              |
| **Configuration**             | `constants.js`                                                  | Scene, camera, audio, animation, and interaction parameters                      |
| **Build & Deploy**            | `vite.config.js`, `package.json`, `_redirects`, `_headers`      | Vite build configuration, dependency management, SPA routing, CORS headers       |

Each system is designed to be relatively independent with clear interfaces, allowing the orchestrator in `main.js` to coordinate them without tight coupling.

**Sources:** [src/main.js1-11](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L1-L11) [package.json1-32](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L1-L32) [index.html1-98](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/index.html#L1-L98) [public/\_redirects1](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_redirects#L1-L1) [public/\_headers1-16](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_headers#L1-L16)

## Asset Organization

The application's assets are organized in the `public/assets/` directory structure:

```
```

The `letters.json` data file ([src/data/letters.json](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/data/letters.json)) contains references to these assets, allowing the `loadLetters()` function to dynamically load GLB models and the audio system to register narrations. The GLB files undergo compression via `@gltf-transform/cli` before deployment to optimize load times.

**Sources:** [src/main.js11](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L11-L11) [src/main.js96-136](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L96-L136) [package.json12](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L12-L12) [package.json28](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L28-L28)

## Browser Compatibility & Deployment

The application is deployed as a static site on Cloudflare Pages with the following configuration:

- **Build Command**: `npm run build` (executes Vite build)
- **Output Directory**: `dist/`
- **SPA Routing**: All routes resolve to `index.html` via `_redirects`
- **MIME Types**: GLB and MP3 files have correct Content-Type headers via `_headers`
- **CORS**: Access-Control-Allow-Origin headers enable asset loading

The application targets modern browsers with WebGL support, Web Audio API, and ES6 module support. Mobile devices are detected and automatically switch to touch controls with virtual joystick UI.

**Sources:** [README.md34-45](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L34-L45) [public/\_redirects1](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_redirects#L1-L1) [public/\_headers1-16](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_headers#L1-L16) [src/main.js35](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/src/main.js#L35-L35)



