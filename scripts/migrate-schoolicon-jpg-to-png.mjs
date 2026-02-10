import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'subscriptions.yaml');
const SCHOOL_ICON_DIR = path.join(ROOT, 'content', 'img', 'schoolicon');
const PUBLIC_SCHOOL_ICON_DIR = path.join(ROOT, 'public', 'img', 'schoolicon');

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const run = async () => {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = YAML.parse(raw);
  const schools = Array.isArray(config?.schools) ? config.schools : [];

  for (const school of schools) {
    const slug = String(school?.slug || '').trim();
    if (!slug) continue;

    const pngPath = path.join(SCHOOL_ICON_DIR, `${slug}.png`);
    const hasPng = await exists(pngPath);
    if (hasPng) {
      school.icon = `/img/schoolicon/${slug}.png`;
    }
  }

  await fs.writeFile(CONFIG_PATH, YAML.stringify(config), 'utf8');

  const removeJpgIn = async (dir) => {
    try {
      const files = await fs.readdir(dir);
      await Promise.all(files
        .filter((name) => /\.jpe?g$/i.test(name))
        .map((name) => fs.rm(path.join(dir, name), { force: true })));
    } catch {
      // ignore missing dir
    }
  };

  await removeJpgIn(SCHOOL_ICON_DIR);
  await removeJpgIn(PUBLIC_SCHOOL_ICON_DIR);

  console.log('Migrated school icon bindings to PNG and removed JPG files.');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
