# Exhibition Audio Tracks

This directory holds audio tracks for the standalone exhibition listener page at `/listen/?p={id}`.

## Expected naming

- `{id}_ar.mp3` — Arabic narration
- `{id}_en.mp3` — English narration

Where `id` is 1 through 10.

## Examples

- `1_ar.mp3`, `1_en.mp3`
- `2_ar.mp3`, `2_en.mp3`
- `10_ar.mp3`, `10_en.mp3`

## Usage

These files are referenced by `public/listen/index.html` and served at `/listen/`.
QR codes at the physical exhibition link to `/listen/?p=1` through `/listen/?p=10`.

## Headers

Cloudflare Pages serves these with `Content-Type: audio/mpeg`, `Access-Control-Allow-Origin: *`,
and `Cache-Control: public, max-age=604800, must-revalidate` (see `public/_headers`).
