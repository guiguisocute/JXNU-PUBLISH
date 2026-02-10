import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const DEADLINE_MAP = {
  '20250925-ai-001': '2025-09-26T14:00:00+08:00',
  '20250925-ai-002': '2025-09-26T16:00:00+08:00',
  '20250927-ai-001': '2025-09-29T17:00:00+08:00',
  '20250928-ai-001': '2025-10-16T23:59:59+08:00',
  '20250928-ai-002': '2025-10-16T23:59:59+08:00',
  '20250928-ai-003': '2025-09-29T17:00:00+08:00',
  '20250929-ai-001': '2025-10-08T18:00:00+08:00',
  '20250930-ai-001': '2025-10-07T23:59:59+08:00',
};

const run = async () => {
  const files = (await fs.readdir(CARD_DIR)).filter((name) => /^202509.*\.md$/.test(name));
  for (const fileName of files) {
    const cardId = fileName.replace(/\.md$/, '');
    const filePath = path.join(CARD_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    delete parsed.data.undefined;

    const endAt = DEADLINE_MAP[cardId] || '';
    const published = String(parsed.data.published || '').trim();
    parsed.data.start_at = endAt ? published : '';
    parsed.data.end_at = endAt;

    const next = matter.stringify(parsed.content.trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }

  console.log(`Applied deadlines for ${files.length} September cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
