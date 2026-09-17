#!/usr/bin/env node
// build-assets.mjs — slice the scans in resources/ into web-optimized WebP files
// under public/img/ (gitignored) and write public/img/manifest.json.
//
//   node tools/build-assets.mjs            # everything
//   node tools/build-assets.mjs --force    # rebuild even if the output exists
//
// Requires ImageMagick 7 (`magick` on PATH). Sheets are 6x2 (hero / master plan),
// 3x2 (threats, printed rotated) and 4x2 (challenges + missions) grids of 496x693 cards.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'resources');
const OUT = join(ROOT, 'public', 'img');
const FORCE = process.argv.includes('--force');
const Q = '82';

const made = [];
let skipped = 0;

function magick(args) {
  execFileSync('magick', args, { stdio: ['ignore', 'pipe', 'inherit'] });
}
function size(file) {
  const out = execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().trim();
  const [w, h] = out.split(' ').map(Number);
  return { w, h };
}
function out(rel) {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  return p;
}
function want(rel) {
  made.push(rel);
  if (!FORCE && existsSync(join(OUT, rel))) {
    skipped++;
    return null;
  }
  return out(rel);
}
function src(rel) {
  const p = join(SRC, rel);
  if (!existsSync(p)) throw new Error(`missing resource: ${rel}`);
  return p;
}

// Slice a cols x rows sheet; ids is row-major (null = skip a cell).
function sheet(file, cols, rows, ids, { dir, width, rotate = 0, quality = Q }) {
  const f = src(file);
  const { w, h } = size(f);
  ids.forEach((id, i) => {
    if (!id) return;
    const rel = `${dir}/${id}.webp`;
    const dst = want(rel);
    if (!dst) return;
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x0 = Math.round((c * w) / cols);
    const x1 = Math.round(((c + 1) * w) / cols);
    const y0 = Math.round((r * h) / rows);
    const y1 = Math.round(((r + 1) * h) / rows);
    const args = [f, '-crop', `${x1 - x0}x${y1 - y0}+${x0}+${y0}`, '+repage'];
    if (rotate) args.push('-rotate', String(rotate));
    args.push('-resize', `${width}x`, '-strip', '-quality', quality, dst);
    magick(args);
    console.log('  ', rel);
  });
}

function single(file, rel, { width, height, quality = Q, extra = [] }) {
  const dst = want(rel);
  if (!dst) return;
  const geom = height ? `${width || ''}x${height}` : `${width}x`;
  magick([src(file), '-resize', geom, '-strip', '-quality', quality, ...extra, dst]);
  console.log('  ', rel);
}

/* ───────────── mappings (sheet cell → card id, row-major) ───────────── */

const HERO_SHEETS = {
  ironman: ['Iron Man front.jpg', [6, 4, 1, 7, 9, 3, 11, 12, 8, 5, 2, 10]],
  captainamerica: ['Captain America front.jpg', [2, 7, 5, 3, 1, 8, 6, 12, 11, 4, 10, 9]],
  blackwidow: ['Black Widow front.jpg', [10, 2, 3, 5, 9, 1, 12, 11, 4, 6, 7, 8]],
  hulk: ['Hulk front.jpg', [5, 9, 12, 11, 10, 2, 6, 1, 7, 8, 3, 4]],
  captainmarvel: ['Captain Marvel front.jpg', [7, 8, 9, 3, 2, 1, 4, 5, 12, 10, 11, 6]],
  antman: ['Ant-Man front.jpg', [10, 12, 11, 7, 6, 4, 9, 5, 2, 3, 8, 1]],
  wasp: ['Wasp front.png', [1, 8, 7, 6, 2, 3, 10, 11, 4, 5, 9, 12]],
  venom: ['Venom front.jpg', [9, 7, 10, 11, 12, 3, 4, 5, 6, 2, 1, 8]],
};
const HERO_BACKS = {
  ironman: 'Iron Man back.jpg',
  captainamerica: 'Captain America back.jpg',
  blackwidow: 'Black Widow back.jpg',
  hulk: 'Hulk back.jpg',
  captainmarvel: 'Captain Marvel back.jpg',
  antman: 'Ant-Man back.jpg',
  wasp: 'Wasp back.jpg',
  venom: 'Venom back.jpg',
};
const HERO_FIGURES = {
  ironman: 'Iron Man figure.png',
  captainamerica: 'Captain America figure.png',
  blackwidow: 'Black Widow figure.png',
  hulk: 'Hulk figure.png',
  captainmarvel: 'Captain Marvel.png',
  antman: 'Ant-man figure.png',
  wasp: 'Wasp figure.png',
  venom: 'Venom figure.png',
};

const PLAN_SHEETS = {
  redskull: ['Red Skull master plan front.jpg', [6, 8, 9, 10, 12, 11, 7, 3, 4, 5, 1, 2]],
  ultron: ['Ultron master plan front.jpg', [8, 9, 10, 3, 2, 5, 4, 11, 12, 7, 6, 1]],
  taskmaster: ['Taskmaster master plan front.jpg', [2, 7, 6, 9, 8, 10, 5, 1, 12, 3, 4, 11]],
};
const THREAT_SHEETS = {
  redskull: [
    'Red Skull thread front.png',
    ['crossbones-1', 'bob-1', 'madame_hydra-1', 'elite_thugs-1', 'subversion-1', 'brainwashing-1'],
  ],
  ultron: [
    'Ultron thread front.png',
    ['ultron_clone-1', 'ultron_clone-2', 'duplication-1', 'duplication-2', 'ultron_virus-1', 'ultron_virus-2'],
  ],
  taskmaster: [
    'Taskmaster thread front.png',
    ['elite_thugs-1', 'explosive_trap-1', 'elite_thugs-2', 'explosive_trap-2', 'entangling_trap-1', 'entangling_trap-2'],
  ],
};
const VILLAIN_NAMES = { redskull: 'Red Skull', ultron: 'Ultron', taskmaster: 'Taskmaster' };

const LOCATIONS = {
  starklabs: 'Stark Labs.jpg',
  avengersmansion: 'Avengers Mansion.jpg',
  nypd: 'New York Police Headquarters.jpg',
  timessquare: 'Times Square.jpg',
  avengerstower: 'Avengers Tower.jpg',
  helicarrier: 'S.H.I.E.L.D. Helicarrier.jpg',
  centralpark: 'Central Park.jpg',
  shieldhq: 'S.H.I.E.L.D. Headquarters.jpg',
};

const TOKENS = ['attack', 'civilian', 'crisis', 'health', 'heroic', 'invulnerable', 'ko', 'move', 'threat', 'thug', 'wild'];

/* ───────────── build ───────────── */

console.log('Hero cards');
for (const [hero, [file, order]] of Object.entries(HERO_SHEETS)) {
  sheet(`heroes/${file}`, 6, 2, order.map(n => `${hero}-${String(n).padStart(2, '0')}`), { dir: 'cards', width: 360 });
  single(`heroes/${HERO_BACKS[hero]}`, `backs/hero-${hero}.webp`, { width: 240 });
  single(`heroes/${HERO_FIGURES[hero]}`, `figures/${hero}.webp`, { height: 220, quality: '90' });
}

console.log('Villains');
for (const v of Object.keys(VILLAIN_NAMES)) {
  const [pf, porder] = PLAN_SHEETS[v];
  sheet(`villains/${pf}`, 6, 2, porder.map(n => `${v}-mp-${String(n).padStart(2, '0')}`), { dir: 'cards', width: 360 });
  const [tf, torder] = THREAT_SHEETS[v];
  sheet(`villains/${tf}`, 3, 2, torder.map(k => `${v}-${k}`), { dir: 'threats', width: 480, rotate: -90 });
  const n = VILLAIN_NAMES[v];
  single(`villains/${n} master plan back.jpg`, `backs/plan-${v}.webp`, { width: 240 });
  single(`villains/${n} thread back.jpg`, `backs/threat-${v}.webp`, { width: 240, extra: ['-rotate', '90'] });
  single(`villains/${n} dashboard front.jpg`, `dashboards/${v}.webp`, { width: 1200, quality: '80' });
  // some scans have the front saved twice — skip an identical "back" so the UI falls back to the figure
  if (statSync(src(`villains/${n} dashboard back.jpg`)).size !== statSync(src(`villains/${n} dashboard front.jpg`)).size)
    single(`villains/${n} dashboard back.jpg`, `dashboards/${v}-back.webp`, { width: 600 });
  else console.warn(`   ! villains/${n} dashboard back.jpg is identical to the front — skipped`);
  single(`villains/${n} figure.png`, `figures/${v}.webp`, { height: 220, quality: '90' });
}

console.log('Locations');
for (const [id, file] of Object.entries(LOCATIONS)) single(`locations/${file}`, `locations/${id}.webp`, { width: 760, quality: '80' });
single('locations/back.jpg', 'backs/location.webp', { width: 300 });

console.log('Challenges & Missions');
sheet(
  'Challenges and Mission cards.png',
  4,
  2,
  ['hard', 'heroic', 'moderate', 'back', 'civilians', 'thugs', 'threats', null],
  { dir: 'missions', width: 360 }
);

console.log('Tokens');
for (const t of TOKENS) single(`tokens/${t}.png`, `tokens/${t}.webp`, { width: 128, height: 128, quality: '90' });

// manifest — the app checks this to decide scan vs CSS rendering
const manifest = { generated: new Date().toISOString(), files: made.sort() };
writeFileSync(out('manifest.json'), JSON.stringify(manifest, null, 1));
const total = readdirSync(OUT, { recursive: true }).length;
console.log(`\n${made.length} assets (${skipped} already up to date), ${total} entries under public/img`);
