import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'init-sept', 'word.md');
const FILE_DIR = path.join(ROOT, 'init-sept', 'file');
const CARD_DIR = path.join(ROOT, 'content', 'card');

const SCHOOL_SLUG = 'ai';
const SCHOOL_NAME = '人工智能学院';
const SUBSCRIPTION_ID = 'ai-25-26学年学生干部通知群';
const SOURCE_CHANNEL = '25-26学年学生干部通知群';
const SOURCE_SENDER = '爱喝冰美式';

const pad = (n) => String(n).padStart(2, '0');

const normalizeTitle = (headerText, bodyText) => {
  const normalized = String(headerText || '').replace(/\s+/g, ' ').trim();
  const firstChunk = String(bodyText || '').replace(/\s+/g, ' ').trim().slice(0, 22);
  if (!normalized) return firstChunk || '历史通知';
  return firstChunk ? `${normalized}｜${firstChunk}` : normalized;
};

const makeDescription = (bodyText) => {
  const plain = String(bodyText || '').replace(/\s+/g, ' ').trim();
  if (plain.length <= 150 && plain.length >= 80) return plain;
  if (plain.length < 80) return `${plain}（历史手动搬运，原文请查看正文与附件）`;
  return plain.slice(0, 150);
};

const normalizeFileUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  if (!raw.startsWith('file://')) return raw;
  const body = raw.replace(/^file:\/\//i, '').replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(body)) {
    return `file:///${body}`;
  }
  return `file://${body}`;
};

const parseEvents = (raw) => {
  const events = [];
  const eventRe = /爱喝冰美式\.:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*([\s\S]*?)(?=爱喝冰美式\.:\s*\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s*|$)/g;
  let match;
  while ((match = eventRe.exec(raw))) {
    events.push({ ts: match[1], content: (match[2] || '').trim() });
  }
  return events;
};

const main = async () => {
  const raw = await fs.readFile(SOURCE_PATH, 'utf8');
  const events = parseEvents(raw);

  const fileEntries = await fs.readdir(FILE_DIR);
  const filePool = fileEntries
    .filter((name) => /^\d+_/.test(name))
    .sort((a, b) => {
      const ai = Number((a.match(/^(\d+)_/) || [])[1] || 0);
      const bi = Number((b.match(/^(\d+)_/) || [])[1] || 0);
      return ai - bi;
    });
  let fileCursor = 0;

  const notices = [];
  let current = null;

  for (const event of events) {
    const headerMatch = event.content.match(/^【([^】]+)】\s*([\s\S]*)$/);
    if (headerMatch) {
      current = {
        ts: event.ts,
        header: headerMatch[1].trim(),
        body: (headerMatch[2] || '').trim(),
        attachments: [],
      };
      notices.push(current);
      continue;
    }

    if (!current) continue;

    if (event.content.startsWith('[文件]')) {
      const nextFile = filePool[fileCursor];
      fileCursor += 1;
      if (nextFile) {
        current.attachments.push({
          name: nextFile,
          url: `./init-sept/file/${nextFile}`,
          type: path.extname(nextFile).replace('.', '').toLowerCase() || 'file',
        });
      }
      continue;
    }

    const imgMatch = event.content.match(/^!\[img\]\((file:\/\/[^)]+)\)$/i);
    if (imgMatch) {
      const imagePath = normalizeFileUrl(imgMatch[1]);
      const name = decodeURIComponent(imagePath.split(/[\\/]/).pop() || 'image');
      current.attachments.push({ name, url: imagePath, type: 'image' });
      continue;
    }

    if (event.content) {
      current.body = `${current.body}\n${event.content}`.trim();
    }
  }

  const countersByDate = new Map();

  for (const notice of notices) {
    const dt = new Date(notice.ts.replace(' ', 'T') + '+08:00');
    if (Number.isNaN(dt.getTime())) continue;
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const dateKey = `${yyyy}${mm}${dd}`;
    const seq = (countersByDate.get(dateKey) || 0) + 1;
    countersByDate.set(dateKey, seq);
    const id = `${dateKey}-${SCHOOL_SLUG}-${String(seq).padStart(3, '0')}`;

    const frontmatter = [
      '---',
      `id: "${id}"`,
      `school_slug: "${SCHOOL_SLUG}"`,
      `subscription_id: "${SUBSCRIPTION_ID}"`,
      `school_name: "${SCHOOL_NAME}"`,
      `title: "${normalizeTitle(notice.header, notice.body).replace(/"/g, '\\"')}"`,
      `description: "${makeDescription(notice.body).replace(/"/g, '\\"')}"`,
      `published: ${notice.ts.replace(' ', 'T')}+08:00`,
      'category: "通知公告"',
      'tags: ["历史搬运", "学生通知"]',
      'pinned: false',
      'cover: ""',
      'badge: ""',
      'extra_url: ""',
      'start_at: ""',
      'end_at: ""',
      'source:',
      `  channel: "${SOURCE_CHANNEL}"`,
      `  sender: "${SOURCE_SENDER}"`,
    ];

    if (notice.attachments.length === 0) {
      frontmatter.push('attachments: []');
    } else {
      frontmatter.push('attachments:');
      for (const item of notice.attachments) {
        frontmatter.push(`  - name: "${String(item.name).replace(/"/g, '\\"')}"`);
        frontmatter.push(`    url: "${String(item.url).replace(/"/g, '\\"')}"`);
        frontmatter.push(`    type: "${String(item.type || 'file')}"`);
      }
    }

    frontmatter.push('---', '', notice.body || '（原始内容缺失）', '');
    await fs.writeFile(path.join(CARD_DIR, `${id}.md`), frontmatter.join('\n'), 'utf8');
  }

  console.log(`Imported ${notices.length} notices from init-sept.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
