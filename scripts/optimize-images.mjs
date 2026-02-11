import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const GENERATED_CONTENT_PATH = path.join(PUBLIC_DIR, 'generated', 'content-data.json');

const isRasterCoverUrl = (value) => {
  const url = String(value || '').trim();
  if (!url.startsWith('/')) return false;
  if (!(/^\/(img\/init-|covers\/)/).test(url)) return false;
  return /\.(jpg|jpeg|png)$/i.test(url);
};

const runFfmpeg = (args) => {
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'pipe' });
  if (result.status !== 0) {
    const err = result.stderr?.toString()?.trim() || 'unknown ffmpeg error';
    throw new Error(err);
  }
};

const optimizeOne = async (urlPath) => {
  const absInput = path.join(PUBLIC_DIR, urlPath.replace(/^\//, ''));
  try {
    await fs.access(absInput);
  } catch {
    return { skipped: true, reason: 'missing' };
  }

  const ext = path.extname(absInput);
  const base = absInput.slice(0, -ext.length);

  const outputs = [
    { suffix: '.webp', width: null, quality: '72' },
    { suffix: '@sm.webp', width: 480, quality: '68' },
    { suffix: '@md.webp', width: 768, quality: '70' },
    { suffix: '@lg.webp', width: 1200, quality: '72' },
  ];

  for (const output of outputs) {
    const outPath = `${base}${output.suffix}`;
    const vf = output.width
      ? `scale='min(iw,${output.width})':-2:flags=lanczos`
      : 'scale=iw:-2:flags=lanczos';

    runFfmpeg([
      '-i', absInput,
      '-vf', vf,
      '-c:v', 'libwebp',
      '-quality', output.quality,
      '-compression_level', '6',
      outPath,
    ]);
  }

  return { skipped: false };
};

const main = async () => {
  const raw = await fs.readFile(GENERATED_CONTENT_PATH, 'utf8');
  const data = JSON.parse(raw);
  const notices = Array.isArray(data.notices) ? data.notices : [];

  const coverUrls = Array.from(
    new Set(
      notices
        .map((item) => String(item.cover || '').trim())
        .filter(isRasterCoverUrl)
    )
  );

  let optimized = 0;
  let skipped = 0;

  for (const coverUrl of coverUrls) {
    try {
      const result = await optimizeOne(coverUrl);
      if (result.skipped) skipped += 1;
      else optimized += 1;
    } catch (error) {
      console.warn(`[optimize-images] skip ${coverUrl}: ${error instanceof Error ? error.message : String(error)}`);
      skipped += 1;
    }
  }

  console.log(`Optimized cover images: ${optimized}, skipped: ${skipped}.`);
};

main().catch((error) => {
  console.error('[optimize-images] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
