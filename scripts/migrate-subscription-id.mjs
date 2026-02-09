import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const chunks = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && fullPath.endsWith('.md')) return [fullPath];
    return [];
  }));
  return chunks.flat();
};

const slugifyChannel = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .replace(/^-+|-+$/g, '');

const run = async () => {
  const files = await walk(CARD_DIR);
  let updated = 0;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.startsWith('---')) continue;

    const schoolSlugMatch = raw.match(/^school_slug:\s*"([^"]+)"\s*$/m);
    if (!schoolSlugMatch) continue;
    const schoolSlug = schoolSlugMatch[1];
    const channelMatch = raw.match(/^\s{2}channel:\s*"([^"]*)"\s*$/m);
    const channel = channelMatch ? channelMatch[1] : 'default';
    const subscriptionId = `${schoolSlug}-${slugifyChannel(channel || 'default')}`;

    const next = /^subscription_id:\s*"[^"]+"\s*$/m.test(raw)
      ? raw.replace(/^subscription_id:\s*"[^"]+"\s*$/m, `subscription_id: "${subscriptionId}"`)
      : raw.replace(
        /^school_slug:\s*"[^"]+"\s*$/m,
        `school_slug: "${schoolSlug}"\nsubscription_id: "${subscriptionId}"`
      );

    await fs.writeFile(filePath, next, 'utf8');
    updated += 1;
  }

  console.log(`Updated ${updated} card files.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
