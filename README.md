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

## Next Steps

-   Replace placeholder boxes with actual `.glb` letter models in `src/renderer/letters.js`.
-   Implement `AudioEngine` to use `PannerNode` for spatial audio.
-   Add logic in `themeMixer.js` to crossfade tracks using Howler or Tone.js.
