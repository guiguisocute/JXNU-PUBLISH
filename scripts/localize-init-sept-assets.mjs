import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');
const IMAGE_DIR = path.join(ROOT, 'content', 'img', 'init-sept');

const toLocalPathFromFileUrl = (fileUrl) => {
  const raw = String(fileUrl || '').trim();
  if (!raw.startsWith('file:///')) return null;
  const withoutScheme = decodeURI(raw.replace(/^file:\/\//i, ''));
  if (/^\/[A-Za-z]:\//.test(withoutScheme)) return withoutScheme.slice(1);
  return withoutScheme;
};

const run = async () => {
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const files = (await fs.readdir(CARD_DIR)).filter((name) => /^202509.*\.md$/.test(name));
  let copied = 0;

  for (const fileName of files) {
    const filePath = path.join(CARD_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);

    const ensureLocalImage = async (value) => {
      const sourcePath = toLocalPathFromFileUrl(value);
      if (!sourcePath) return value;
      const base = path.basename(sourcePath);
      const targetPath = path.join(IMAGE_DIR, base);
      try {
        await fs.copyFile(sourcePath, targetPath);
        copied += 1;
      } catch {
        return value;
      }
      return `/img/init-sept/${base}`;
    };

    parsed.data.cover = await ensureLocalImage(parsed.data.cover || '');

    if (Array.isArray(parsed.data.attachments)) {
      for (const item of parsed.data.attachments) {
        if (!item || typeof item !== 'object') continue;
        const url = String(item.url || '').trim();
        if (url.startsWith('./init-sept/file/')) {
          item.url = url.replace('./init-sept/file/', '/init-sept/file/');
          continue;
        }
        item.url = await ensureLocalImage(url);
      }
    }

    parsed.content = parsed.content.replace(/!\[([^\]]*)\]\((file:\/\/[^)]+)\)/g, (_all, alt, url) => {
      const sourcePath = toLocalPathFromFileUrl(url);
      if (!sourcePath) return _all;
      const base = path.basename(sourcePath);
      return `![${alt}](/img/init-sept/${base})`;
    });

    await fs.writeFile(filePath, matter.stringify(parsed.content.trim() + '\n', parsed.data, { lineWidth: 10000 }), 'utf8');
  }

  console.log(`Localized ${files.length} cards, copied ${copied} image references.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
