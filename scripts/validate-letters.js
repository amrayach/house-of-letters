import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'public');
const lettersPath = path.join(repoRoot, 'src', 'data', 'letters.json');
const strictWarnings = process.argv.includes('--strict');

const REQUIRED_FIELDS = ['id', 'position', 'zone', 'model'];
const OPTIONAL_FIELDS = ['text', 'narration', 'theme', 'frontImage', 'backImage'];
const KNOWN_FIELDS = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);
const VALID_ZONES = new Set([1, 2, 3, 4]);

const issues = {
  error: [],
  warning: [],
};
const conventionalPaths = {
  model: (id) => `/assets/models/${id}.glb`,
  frontImage: (id) => `/assets/letters/${id}.jpg`,
  backImage: (id) => `/assets/letters/${id}-${id}.jpg`,
};

function addIssue(level, message) {
  issues[level].push(message);
}

function formatLetterPrefix(letter) {
  if (!letter || typeof letter.id !== 'number') {
    return '[record ?]';
  }

  return `[letter ${letter.id}]`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizePublicPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/')) {
    return null;
  }

  const normalizedPath = path.posix.normalize(publicPath);
  if (!normalizedPath.startsWith('/')) {
    return null;
  }

  return normalizedPath;
}

function toFsPath(publicPath) {
  const normalizedPath = normalizePublicPath(publicPath);
  if (!normalizedPath) {
    return null;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(publicRoot, relativePath);
  const relativeToPublicRoot = path.relative(publicRoot, resolvedPath);

  if (relativeToPublicRoot.startsWith('..') || path.isAbsolute(relativeToPublicRoot)) {
    return null;
  }

  return resolvedPath;
}

function fileExists(publicPath) {
  const resolvedPath = toFsPath(publicPath);
  return Boolean(resolvedPath) && fs.existsSync(resolvedPath);
}

function validatePublicPath(letter, fieldName, publicPath, options = {}) {
  const { required = true, level = 'error', expectedPrefix } = options;
  const prefix = formatLetterPrefix(letter);

  if (publicPath == null || publicPath === '') {
    if (required) {
      addIssue(level, `${prefix} missing \`${fieldName}\``);
    }
    return { publicPath: null, exists: false, missing: true };
  }

  if (typeof publicPath !== 'string') {
    addIssue('error', `${prefix} \`${fieldName}\` must be a string`);
    return { publicPath: null, exists: false, invalid: true };
  }

  const normalizedPath = normalizePublicPath(publicPath);

  if (!normalizedPath) {
    addIssue('error', `${prefix} \`${fieldName}\` must use a root-absolute public path: ${publicPath}`);
    return { publicPath: null, exists: false, invalid: true };
  }

  if (expectedPrefix && !normalizedPath.startsWith(expectedPrefix)) {
    addIssue(level, `${prefix} \`${fieldName}\` should live under \`${expectedPrefix}\`: ${normalizedPath}`);
  }

  const resolvedPath = toFsPath(normalizedPath);
  if (!resolvedPath) {
    addIssue('error', `${prefix} \`${fieldName}\` escapes the public asset tree: ${normalizedPath}`);
    return { publicPath: normalizedPath, exists: false, invalid: true };
  }

  const exists = fs.existsSync(resolvedPath);
  if (!exists) {
    addIssue(level, `${prefix} \`${fieldName}\` file is missing: ${normalizedPath}`);
  }

  return { publicPath: normalizedPath, exists };
}

function collectFiles(directoryPath, relativePrefix = '') {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    const nextRelative = path.posix.join(relativePrefix, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, nextRelative));
      continue;
    }

    files.push(`/${nextRelative}`);
  }

  return files;
}

function validateImagePath(letter, fieldName, fallbackPath, referencedAssets) {
  const fieldValue = letter[fieldName];

  if (fieldValue == null || fieldValue === '') {
    referencedAssets.images.add(fallbackPath);
    if (!fileExists(fallbackPath)) {
      addIssue('error', `${formatLetterPrefix(letter)} ${fieldName} fallback file is missing: ${fallbackPath}`);
    }
    return;
  }

  const result = validatePublicPath(letter, fieldName, fieldValue, {
    required: false,
    level: 'error',
    expectedPrefix: '/assets/letters/',
  });

  if (result.publicPath) {
    referencedAssets.images.add(result.publicPath);
  }
}

function validateLetterRecord(letter, index, seenIds, referencedAssets, stats) {
  const recordLabel = `[record ${index + 1}]`;

  if (!isPlainObject(letter)) {
    addIssue('error', `${recordLabel} must be an object`);
    return;
  }

  const unknownKeys = Object.keys(letter).filter((key) => !KNOWN_FIELDS.has(key));
  if (unknownKeys.length > 0) {
    addIssue('warning', `${formatLetterPrefix(letter)} unknown field(s): ${unknownKeys.join(', ')}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in letter)) {
      addIssue('error', `${recordLabel} missing required field \`${field}\``);
    }
  }

  if (!Number.isInteger(letter.id) || letter.id <= 0) {
    addIssue('error', `${recordLabel} \`id\` must be a positive integer`);
  } else if (seenIds.has(letter.id)) {
    addIssue('error', `${formatLetterPrefix(letter)} duplicate \`id\``);
  } else {
    seenIds.add(letter.id);
  }

  if ('text' in letter) {
    if (typeof letter.text !== 'string') {
      addIssue('error', `${formatLetterPrefix(letter)} \`text\` must be a string when present`);
    } else if (letter.text.trim().length === 0) {
      stats.emptyTextCount += 1;
    }
  } else {
    addIssue('warning', `${formatLetterPrefix(letter)} missing optional \`text\`; runtime will use subtitle fallback copy`);
  }

  if (!isPlainObject(letter.position)) {
    addIssue('error', `${formatLetterPrefix(letter)} \`position\` must be an object with numeric x/y/z`);
  } else {
    for (const axis of ['x', 'y', 'z']) {
      if (!isFiniteNumber(letter.position[axis])) {
        addIssue('error', `${formatLetterPrefix(letter)} \`position.${axis}\` must be a finite number`);
      }
    }
  }

  if (!Number.isInteger(letter.zone)) {
    addIssue('error', `${formatLetterPrefix(letter)} \`zone\` must be an integer`);
  } else if (!VALID_ZONES.has(letter.zone)) {
    addIssue('error', `${formatLetterPrefix(letter)} \`zone\` must be one of ${[...VALID_ZONES].join(', ')}`);
  }

  const modelResult = validatePublicPath(letter, 'model', letter.model, {
    required: true,
    level: 'error',
    expectedPrefix: '/assets/models/',
  });
  if (modelResult.publicPath) {
    referencedAssets.models.add(modelResult.publicPath);
    const expectedModelPath = conventionalPaths.model(letter.id);
    if (modelResult.publicPath !== expectedModelPath) {
      addIssue(
        'warning',
        `${formatLetterPrefix(letter)} \`model\` differs from the repo convention ${expectedModelPath}: ${modelResult.publicPath}`,
      );
    }
  }

  validateImagePath(letter, 'frontImage', conventionalPaths.frontImage(letter.id), referencedAssets);
  validateImagePath(letter, 'backImage', conventionalPaths.backImage(letter.id), referencedAssets);

  if (letter.narration == null || letter.narration === '') {
    addIssue('warning', `${formatLetterPrefix(letter)} missing optional \`narration\`; the active letter will play no narration`);
  } else {
    const narrationResult = validatePublicPath(letter, 'narration', letter.narration, {
      required: false,
      level: 'error',
      expectedPrefix: '/assets/audio/',
    });
    if (narrationResult.publicPath) {
      referencedAssets.narrations.add(narrationResult.publicPath);
      referencedAssets.audio.add(narrationResult.publicPath);
    }
  }

  if (letter.theme == null || letter.theme === '') {
    addIssue('warning', `${formatLetterPrefix(letter)} missing optional \`theme\`; current runtime ignores per-letter themes, but the content contract is incomplete`);
  } else {
    const themeResult = validatePublicPath(letter, 'theme', letter.theme, {
      required: false,
      level: 'warning',
      expectedPrefix: '/assets/audio/',
    });
    if (themeResult.publicPath) {
      referencedAssets.themes.add(themeResult.publicPath);
      referencedAssets.audio.add(themeResult.publicPath);
    }
  }
}

function main() {
  console.log('House of Letters content validator');
  console.log(`Data file: ${path.relative(repoRoot, lettersPath)}`);
  console.log(`Mode: ${strictWarnings ? 'strict (warnings fail)' : 'default (warnings do not fail)'}`);

  let letters;
  try {
    const raw = fs.readFileSync(lettersPath, 'utf8');
    letters = JSON.parse(raw);
  } catch (error) {
    console.error(`\nERROR: Failed to read or parse ${lettersPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (!Array.isArray(letters)) {
    console.error('\nERROR: letters.json must contain a top-level array.');
    process.exit(1);
  }

  const seenIds = new Set();
  const referencedAssets = {
    narrations: new Set(),
    themes: new Set(),
    images: new Set(),
    models: new Set(),
    audio: new Set(),
  };
  const stats = {
    emptyTextCount: 0,
  };

  letters.forEach((letter, index) => {
    validateLetterRecord(letter, index, seenIds, referencedAssets, stats);
  });

  const assetInventory = {
    models: new Set(collectFiles(path.join(publicRoot, 'assets', 'models'), 'assets/models')),
    images: new Set(collectFiles(path.join(publicRoot, 'assets', 'letters'), 'assets/letters')),
    audio: new Set(collectFiles(path.join(publicRoot, 'assets', 'audio'), 'assets/audio')),
  };

  for (const modelPath of assetInventory.models) {
    if (!referencedAssets.models.has(modelPath)) {
      addIssue('warning', `Unreferenced model asset: ${modelPath}`);
    }
  }

  for (const imagePath of assetInventory.images) {
    if (!referencedAssets.images.has(imagePath)) {
      addIssue('warning', `Unreferenced letter image asset: ${imagePath}`);
    }
  }

  for (const audioPath of assetInventory.audio) {
    if (!referencedAssets.audio.has(audioPath)) {
      addIssue('warning', `Unreferenced audio asset: ${audioPath}`);
    }
  }

  const zoneSummary = [...letters.reduce((acc, letter) => {
    if (Number.isInteger(letter?.zone)) {
      acc.set(letter.zone, (acc.get(letter.zone) ?? 0) + 1);
    }
    return acc;
  }, new Map()).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([zone, count]) => `zone ${zone}: ${count}`)
    .join(', ');

  if (stats.emptyTextCount > 0) {
    addIssue('warning', `${stats.emptyTextCount}/${letters.length} letters have empty \`text\`; subtitle UI will use fallback copy`);
  }

  console.log('\nSummary');
  console.log(`- letters: ${letters.length}`);
  console.log(`- unique ids: ${seenIds.size}`);
  console.log(`- zones: ${zoneSummary || 'none'}`);
  console.log(`- referenced models: ${referencedAssets.models.size}`);
  console.log(`- referenced images: ${referencedAssets.images.size}`);
  console.log(`- unique narration files: ${referencedAssets.narrations.size}`);
  console.log(`- unique theme files: ${referencedAssets.themes.size}`);
  console.log(`- unreferenced model assets: ${[...assetInventory.models].filter((modelPath) => !referencedAssets.models.has(modelPath)).length}`);
  console.log(`- unreferenced image assets: ${[...assetInventory.images].filter((imagePath) => !referencedAssets.images.has(imagePath)).length}`);
  console.log(`- unreferenced audio assets: ${[...assetInventory.audio].filter((audioPath) => !referencedAssets.audio.has(audioPath)).length}`);

  if (issues.error.length > 0) {
    console.log(`\nErrors (${issues.error.length})`);
    for (const message of issues.error) {
      console.log(`- ${message}`);
    }
  }

  if (issues.warning.length > 0) {
    console.log(`\nWarnings (${issues.warning.length})`);
    for (const message of issues.warning) {
      console.log(`- ${message}`);
    }
  }

  const failed = issues.error.length > 0 || (strictWarnings && issues.warning.length > 0);
  const statusLabel = failed
    ? strictWarnings && issues.error.length === 0 && issues.warning.length > 0
      ? 'FAIL (STRICT WARNINGS)'
      : 'FAIL'
    : issues.warning.length > 0
      ? 'PASS WITH WARNINGS'
      : 'PASS';
  console.log(`\nResult: ${statusLabel}`);

  process.exit(failed ? 1 : 0);
}

main();
