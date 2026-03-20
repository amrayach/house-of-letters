/**
 * Lightweight diagnostic logger for House of Letters.
 *
 * Ring buffer of structured events. Works in production (doesn't use console).
 *
 * Usage from browser console or devtools:
 *   __hol.copy()   – copy all entries to clipboard
 *   __hol.dump()   – return entries as formatted string
 *   __hol.clear()  – clear the buffer
 *   __hol.last(20) – show last 20 entries
 *
 * From inside the app (keyboard):
 *   Ctrl+Shift+L   – copy logs to clipboard (shows brief toast)
 */

const MAX_ENTRIES = 600;
const startTime = performance.now();

const entries = [];

function ts() {
  return (performance.now() - startTime) / 1000;
}

function log(category, message, data) {
  const entry = { t: ts(), cat: category, msg: message };
  if (data !== undefined && data !== null) entry.d = data;
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
}

function formatEntry(e) {
  const time = e.t.toFixed(3).padStart(9);
  const cat = e.cat.padEnd(10);
  const data = e.d != null ? `  ${JSON.stringify(e.d)}` : '';
  return `[${time}s] ${cat} | ${e.msg}${data}`;
}

function dump() {
  return entries.map(formatEntry).join('\n');
}

function last(n = 30) {
  return entries.slice(-n).map(formatEntry).join('\n');
}

async function copy() {
  const text = `--- HouseOfLetters diagnostic log (${entries.length} entries) ---\n${dump()}\n--- end ---`;
  try {
    await navigator.clipboard.writeText(text);
    return `Copied ${entries.length} entries`;
  } catch {
    return text;
  }
}

function clear() {
  entries.length = 0;
}

// --- Volume sampling (avoid logging every frame) ---

let _lastVolume = null;
let _lastActiveId = undefined;
const VOL_THRESHOLD = 0.15;

function shouldLogVolume(volume, activeId) {
  const changed =
    _lastActiveId !== activeId ||
    _lastVolume === null ||
    (volume === 0 && _lastVolume !== 0) ||
    (volume > 0 && _lastVolume === 0) ||
    Math.abs(volume - _lastVolume) >= VOL_THRESHOLD;

  if (changed) {
    _lastVolume = volume;
    _lastActiveId = activeId;
  }
  return changed;
}

// --- Proximity score sampling ---

let _lastProxActive = null;
let _lastProxScore = null;

function shouldLogProximity(activeId, score) {
  if (activeId !== _lastProxActive) {
    _lastProxActive = activeId;
    _lastProxScore = score;
    return true;
  }
  if (score != null && _lastProxScore != null && Math.abs(score - _lastProxScore) >= 0.3) {
    _lastProxScore = score;
    return true;
  }
  return false;
}

export const diag = { log, dump, last, copy, clear, shouldLogVolume, shouldLogProximity };

// Expose globally
if (typeof window !== 'undefined') {
  window.__hol = { dump, last, copy, clear, get length() { return entries.length; } };
}
