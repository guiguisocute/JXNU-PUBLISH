import fs from 'node:fs/promises';
import path from 'node:path';

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
    const id = fileName.replace(/\.md$/, '');
    const filePath = path.join(CARD_DIR, fileName);
    let text = await fs.readFile(filePath, 'utf8');

    const publishedMatch = text.match(/^published:\s*'([^'\n]+)'/m) || text.match(/^published:\s*([^\n]+)/m);
    const published = publishedMatch ? publishedMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
    const endAt = DEADLINE_MAP[id] || '';
    const startAt = endAt ? published : '';

    if (/^start_at:\s*/m.test(text)) {
      text = text.replace(/^start_at:\s*.*$/m, `start_at: '${startAt}'`);
    }
    if (/^end_at:\s*/m.test(text)) {
      text = text.replace(/^end_at:\s*.*$/m, `end_at: '${endAt}'`);
    }

    text = text.replace(/^undefined\s*\nundefined\s*\n/m, `start_at: '${startAt}'\nend_at: '${endAt}'\n`);

    await fs.writeFile(filePath, text, 'utf8');
  }

  console.log(`Fixed deadlines/frontmatter for ${files.length} cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
