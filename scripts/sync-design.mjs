#!/usr/bin/env node
/**
 * Re-syncs the static design handover in `html/` into the Next.js app.
 *
 *   html/css/*.css   -> src/styles/*.css   (asset URLs rewritten to /images/…)
 *   html/images/**   -> public/images/**   (archives skipped)
 *
 * App-specific CSS lives in `src/styles/app.css`, which this script never touches.
 * Run it whenever the design team ships updated markup/CSS: `npm run sync:design`.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML_DIR = join(ROOT, 'html');
const STYLES_OUT = join(ROOT, 'src', 'styles');
const IMAGES_OUT = join(ROOT, 'public', 'images');

const SKIPPED_ASSET_EXTENSIONS = new Set(['.zip', '.rar', '.7z', '.psd', '.ai']);

/** Rewrites relative asset URLs and strips render-blocking font imports. */
function transformCss(source) {
  return source
    .replace(/url\((['"]?)\.\.\/(?:images|img)\//g, 'url($1/images/')
    .replace(/^@import\s+url\(["']https:\/\/fonts\.googleapis\.com[^)]*\);?\s*/m, '');
}

async function syncStyles() {
  await mkdir(STYLES_OUT, { recursive: true });
  const entries = await readdir(join(HTML_DIR, 'css'), { withFileTypes: true });
  const cssFiles = entries.filter((entry) => entry.isFile() && extname(entry.name) === '.css');

  for (const file of cssFiles) {
    const source = await readFile(join(HTML_DIR, 'css', file.name), 'utf8');
    await writeFile(join(STYLES_OUT, file.name), transformCss(source), 'utf8');
    console.warn(`css   ✔ src/styles/${file.name}`);
  }

  return cssFiles.length;
}

async function syncImages() {
  await mkdir(IMAGES_OUT, { recursive: true });
  await cp(join(HTML_DIR, 'images'), IMAGES_OUT, { recursive: true });

  const removed = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (SKIPPED_ASSET_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        await rm(path);
        removed.push(entry.name);
      }
    }
  };
  await walk(IMAGES_OUT);

  console.warn(`images ✔ public/images${removed.length ? ` (skipped: ${removed.join(', ')})` : ''}`);
}

try {
  const cssCount = await syncStyles();
  await syncImages();
  console.warn(`\nDesign sync complete — ${cssCount} stylesheet(s). app.css was left untouched.`);
} catch (error) {
  console.error('Design sync failed:', error.message);
  process.exitCode = 1;
}
