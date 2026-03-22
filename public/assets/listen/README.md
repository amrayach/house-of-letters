# Exhibition Audio Tracks

This directory holds audio tracks for the standalone exhibition listener page at `/listen/?p={id}`.

## Expected naming

- `{id}_ar.mp3` — Arabic narration
- `{id}_en.mp3` — English narration

Where `id` is 1 through 11.

Listener IDs map to archive paper numbers via `scripts/exhibition-papers.js` (e.g., listener ID 3 = archive Paper 16).

## Examples

- `1_ar.mp3`, `1_en.mp3`
- `2_ar.mp3`, `2_en.mp3`
- `11_ar.mp3`, `11_en.mp3`

## Usage

These files are referenced by `public/listen/index.html` and served at `/listen/`.
QR codes at the physical exhibition link to `/listen/?p=1` through `/listen/?p=11`.

## Headers

Cloudflare Pages serves these with `Content-Type: audio/mpeg`, `Access-Control-Allow-Origin: *`,
and `Cache-Control: public, max-age=604800, must-revalidate` (see `public/_headers`).
