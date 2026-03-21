/**
 * Generate exhibition QR codes for /listen/1 through /listen/10.
 *
 * Output:
 *   generated/qr-codes/qr-paper-{1..10}.svg  — individual SVGs with paper number label
 *   generated/qr-codes/exhibition-qr-codes.svg — single print sheet, 2×5 grid
 *
 * Usage:
 *   npm run generate:qr
 *   node scripts/generate-qr-codes.js
 */

import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'generated', 'qr-codes');
const BASE_URL = 'https://www.houseofdreams.space/listen';
const PAPER_COUNT = 10;

// QR generation options — high error correction for print reliability
const QR_OPTS = {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 400,
  color: { dark: '#000000', light: '#ffffff' },
};

mkdirSync(OUT_DIR, { recursive: true });

async function generateIndividualSvg(id) {
  const url = `${BASE_URL}/${id}`;
  const qrSvg = await QRCode.toString(url, QR_OPTS);

  // Extract the viewBox dimensions from the generated SVG
  const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const qrSize = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 400;

  // Build a wrapper SVG with the paper number label below
  // Use print-friendly dimensions: scale up to 400px wide for clean rendering
  const scale = 400 / qrSize;
  const printW = 400;
  const printQrH = Math.round(qrSize * scale);
  const labelHeight = 40;
  const printH = printQrH + labelHeight;
  const innerSvg = qrSvg
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${printW} ${printH}" width="${printW}" height="${printH}">
  <rect width="${printW}" height="${printH}" fill="#ffffff"/>
  <g transform="scale(${scale.toFixed(4)})">${innerSvg}</g>
  <text x="${printW / 2}" y="${printQrH + 30}" text-anchor="middle"
        font-family="'Courier New', Courier, monospace" font-size="22" font-weight="bold"
        fill="#000000">Paper ${id}</text>
</svg>`;

  const filename = `qr-paper-${id}.svg`;
  writeFileSync(join(OUT_DIR, filename), svg);
  console.log(`  ${filename}  →  ${url}`);
  return { id, svg, printW, printH };
}

async function generatePrintSheet(items) {
  const cols = 2;
  const rows = 5;
  const cellW = items[0].printW;
  const cellH = items[0].printH;
  const gap = 40;
  const padX = 80;
  const padY = 80;
  const sheetW = padX * 2 + cols * cellW + (cols - 1) * gap;
  const sheetH = padY + rows * cellH + (rows - 1) * gap + 40;

  let cells = '';
  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padX + col * (cellW + gap);
    const y = padY + row * (cellH + gap);

    // Extract inner content from the individual SVG (skip the wrapper)
    const inner = items[i].svg
      .replace(/^<\?xml[^?]*\?>\s*/, '')
      .replace(/<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${cellW}" height="${cellH}" viewBox="0 0 ${cellW} ${cellH}">`);

    cells += `  ${inner}\n`;
  }

  const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetW} ${sheetH}" width="${sheetW}" height="${sheetH}">
  <rect width="${sheetW}" height="${sheetH}" fill="#ffffff"/>
  <text x="${sheetW / 2}" y="50" text-anchor="middle"
        font-family="'Courier New', Courier, monospace" font-size="24" fill="#333333">
    House of Dreams — Exhibition QR Codes
  </text>
${cells}
</svg>`;

  const filename = 'exhibition-qr-codes.svg';
  writeFileSync(join(OUT_DIR, filename), sheet);
  console.log(`  ${filename}  →  print sheet (${cols}×${rows})`);
}

async function main() {
  console.log('Generating exhibition QR codes...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output:   ${OUT_DIR}\n`);

  const items = [];
  for (let id = 1; id <= PAPER_COUNT; id++) {
    items.push(await generateIndividualSvg(id));
  }

  console.log('');
  await generatePrintSheet(items);
  console.log(`\nDone. ${items.length} individual SVGs + 1 print sheet generated.`);
}

main().catch((err) => {
  console.error('QR generation failed:', err);
  process.exit(1);
});
