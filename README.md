# House of Dreams

A dark interactive 3D environment where JPEG-scanned letters converted into 3d objects hang in space.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run development server:
    ```bash
    npm run dev
    ```

3.  Open the local URL provided (usually `http://localhost:5173`).

## Controls

-   **Click** to start and lock mouse pointer.
-   **W / A / S / D** to move.
-   **Mouse** to look around.
-   **ESC** to unlock cursor.

## Project Structure

-   `/src/renderer`: Three.js scene, lighting, and controls.
-   `/src/audio`: Web Audio API logic (placeholder).
-   `/src/interaction`: Proximity detection logic.
-   `/src/data`: JSON metadata for letters.
-   `/assets`: Raw assets (audio, textures, models).

## Deployment

### Cloudflare Pages

This project is configured to deploy on Cloudflare Pages:

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Routing**: SPA behavior is configured via `public/_redirects` — all routes resolve to `index.html`.
4. **Headers**: MIME types and CORS headers for `.glb` and `.mp3` files are configured via `public/_headers`.

These configuration files are automatically copied to the build output and applied by Cloudflare Pages.

## Next Steps

-   Replace placeholder boxes with actual `.glb` letter models in `src/renderer/letters.js`.
-   Implement `AudioEngine` to use `PannerNode` for spatial audio.
-   Add logic in `themeMixer.js` to crossfade tracks using Howler or Tone.js.
