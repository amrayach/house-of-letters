# Getting Started

Relevant source files

- [README.md](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md)
- [package-lock.json](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package-lock.json)
- [package.json](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json)
- [public/\_headers](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_headers)
- [public/\_redirects](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_redirects)

## Purpose and Scope

This page provides developers with the essential information needed to set up and run the House of Letters project locally. It covers installation, running the development server, and an overview of the build/deployment process. For detailed information about specific workflows, see:

- [Installation & Setup](#amrayach/house-of-letters/2.1-installation-and-setup) - Detailed dependency installation and environment configuration
- [Development Workflow](#amrayach/house-of-letters/2.2-development-workflow) - Hot module replacement, debugging tools, and development practices
- [Building & Deployment](#amrayach/house-of-letters/2.3-building-and-deployment) - Production build process and Cloudflare Pages deployment

For information about the project's architecture and systems, see [Architecture Overview](#amrayach/house-of-letters/3-architecture-overview).

## Prerequisites

The House of Letters project requires the following:

| Requirement    | Version | Notes                                          |
| -------------- | ------- | ---------------------------------------------- |
| Node.js        | >= 18   | Required by Vite and build dependencies        |
| npm            | 7+      | For package management and lockfile v3 support |
| Modern Browser | Latest  | With WebGL 2.0 support for Three.js rendering  |

**Sources:** [package-lock.json1-100](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package-lock.json#L1-L100) [package.json1-32](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L1-L32)

## Quick Start

### Installation

```
```

The development server will start and provide a local URL (typically `http://localhost:5173`). Navigate to this URL in your browser to see the application.

**Sources:** [README.md1-18](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L1-L18) [package.json8-14](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L8-L14)

### Initial Experience

Once the application loads:

1. **Loading Scene** - A cinematic camera flythrough plays while assets load
2. **Start Screen** - Click "Enter Archive" to begin (required for audio initialization)
3. **Main Experience** - Use controls to navigate the 3D space and explore letters

**Controls:**

- **Desktop:** WASD or Arrow keys to move, Mouse to look around, ESC to unlock cursor
- **Mobile:** Virtual joystick for movement, touch right side for camera rotation

**Sources:** [README.md19-24](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L19-L24)

## Available Scripts

The project provides the following npm scripts for development and deployment:

| Command            | Description                              | Usage              |
| ------------------ | ---------------------------------------- | ------------------ |
| `npm run dev`      | Start Vite development server with HMR   | Development        |
| `npm run build`    | Build production bundle to `dist/`       | Deployment         |
| `npm run preview`  | Preview production build locally         | Testing            |
| `npm run compress` | Compress GLB models using gltf-transform | Asset optimization |
| `npm run clean`    | Remove build artifacts and cache         | Maintenance        |

**Sources:** [package.json8-14](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L8-L14)

## Development Environment Architecture

```
```

**Diagram: Development Environment Flow**

This diagram shows how the Vite development server orchestrates the development experience. The `vite` server serves both source code (with on-the-fly transformation) and static assets from `public/`. Hot Module Replacement (HMR) enables live updates without full page reloads.

**Sources:** [package.json9](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L9-L9) [package.json24-25](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L24-L25)

## Project Dependencies

### Runtime Dependencies

The application relies on the following core libraries:

| Library            | Version  | Purpose                                   |
| ------------------ | -------- | ----------------------------------------- |
| `three`            | ^0.181.2 | 3D rendering engine (WebGL wrapper)       |
| `howler`           | ^2.2.4   | Web Audio API wrapper for spatial audio   |
| `postprocessing`   | ^6.38.0  | Post-processing effects (bloom, vignette) |
| `vite-plugin-glsl` | ^1.5.4   | GLSL shader import support for Vite       |

### Development Dependencies

| Library                      | Version | Purpose                   |
| ---------------------------- | ------- | ------------------------- |
| `vite`                       | ^7.2.2  | Build tool and dev server |
| `@gltf-transform/cli`        | ^4.2.1  | GLB model compression CLI |
| `@gltf-transform/extensions` | ^4.2.1  | GLB transform extensions  |

**Sources:** [package.json21-31](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L21-L31)

## Development Server Features

The Vite development server provides several features that enhance the development experience:

### Hot Module Replacement (HMR)

Changes to JavaScript, CSS, and GLSL shader files are automatically applied without full page reload. Three.js scene updates require page refresh.

### Asset Serving

All files in `public/` are served at the root path:

- `public/assets/models/*.glb` → `http://localhost:5173/assets/models/*.glb`
- `public/assets/audio/*.mp3` → `http://localhost:5173/assets/audio/*.mp3`
- `public/assets/data/letters.json` → `http://localhost:5173/assets/data/letters.json`

### Module Resolution

ES modules are resolved using Vite's built-in resolver, which handles:

- Import path aliases (if configured)
- Node module resolution from `node_modules/`
- GLSL file imports via `vite-plugin-glsl`

**Sources:** [package.json4](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L4-L4) [package.json24-25](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L24-L25)

## Build and Deployment Overview

```
```

**Diagram: Build and Deployment Pipeline**

The build process uses Vite to bundle source code and copy static assets to the `dist/` directory. Configuration files (`_redirects` and `_headers`) in `public/` are automatically included in the build output for Cloudflare Pages.

**Sources:** [package.json10](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/package.json#L10-L10) [README.md34-45](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L34-L45)

### Cloudflare Pages Configuration

The project includes two configuration files for Cloudflare Pages deployment:

**`_redirects`**: Implements single-page application (SPA) routing by redirecting all paths to `index.html`:

```
/*  /index.html  200
```

**`_headers`**: Configures MIME types and CORS headers for asset files:

- GLB model files: `Content-Type: model/gltf-binary`
- MP3 audio files: `Content-Type: audio/mpeg`
- CORS enabled: `Access-Control-Allow-Origin: *`

These files are placed in the `public/` directory and are automatically copied to `dist/` during the build process, where Cloudflare Pages applies them.

**Sources:** [public/\_redirects1](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_redirects#L1-L1) [public/\_headers1-16](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/public/_headers#L1-L16) [README.md37-44](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L37-L44)

## Next Steps

After completing the basic setup:

1. **Explore the codebase**: Review the [Project Structure](#amrayach/house-of-letters/10.1-project-structure) to understand file organization
2. **Run the dev server**: Start `npm run dev` and explore the application
3. **Review configuration**: See [Configuration System](#amrayach/house-of-letters/9-configuration-system) for customization options
4. **Understand the architecture**: Read [Architecture Overview](#amrayach/house-of-letters/3-architecture-overview) for system design details

For development workflows including debugging and testing, see [Development Workflow](#amrayach/house-of-letters/2.2-development-workflow).

**Sources:** [README.md47-51](https://github.com/amrayach/house-of-letters/blob/01a8e0f9/README.md#L47-L51)



