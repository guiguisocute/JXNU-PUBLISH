import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const CARD_DIR = path.join(CONTENT_DIR, 'card');
const CARD_COVERS_DIR = path.join(CARD_DIR, 'covers');
const CONCLUSION_DIR = path.join(CONTENT_DIR, 'conclusion');
const CONTENT_IMG_DIR = path.join(CONTENT_DIR, 'img');
const GENERATED_DIR = path.join(ROOT, 'generated');
const PUBLIC_GENERATED_DIR = path.join(ROOT, 'public', 'generated');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PUBLIC_COVERS_DIR = path.join(PUBLIC_DIR, 'covers');

const SCHOOL_DEFS = [
  { slug: 'ai', name: '人工智能学院' },
  { slug: 'public-funded-normal', name: '公费师范生学院' },
  { slug: 'pe', name: '体育学院' },
  { slug: 'chem-materials', name: '化学与材料学院' },
  { slug: 'chem-eng', name: '化学工程学院' },
  { slug: 'history-tourism', name: '历史文化与旅游学院' },
  { slug: 'geography-environment', name: '地理与环境学院' },
  { slug: 'urban-construction', name: '城市建设学院' },
  { slug: 'foreign', name: '外国语学院' },
  { slug: 'psychology', name: '心理学院' },
  { slug: 'law', name: '政法学院' },
  { slug: 'education', name: '教育学院' },
  { slug: 'math-stat', name: '数学与统计学院' },
  { slug: 'literature', name: '文学院' },
  { slug: 'journalism', name: '新闻与传播学院' },
  { slug: 'physics-electronics', name: '物理与通信电子学院' },
  { slug: 'life-science', name: '生命科学学院' },
  { slug: 'economics-management', name: '经济与管理学院' },
  { slug: 'fine-arts', name: '美术学院' },
  { slug: 'pharmacy', name: '药学院' },
  { slug: 'marxism', name: '马克思主义学院' },
];

const SCHOOL_MAP = new Map(SCHOOL_DEFS.map((item) => [item.slug, item.name]));

const fail = (message, filePath) => {
  const suffix = filePath ? `\nFile: ${path.relative(ROOT, filePath)}` : '';
  throw new Error(`${message}${suffix}`);
};

const walkMarkdownFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
      if (entry.isFile() && fullPath.endsWith('.md')) return [fullPath];
      return [];
    }));
    return nested.flat();
  } catch {
    return [];
  }
};

const toIso = (value, filePath) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`Invalid published date: ${String(value)}`, filePath);
  return date.toISOString();
};

const normalizeAttachments = (attachments, filePath) => {
  if (!attachments) return [];
  if (!Array.isArray(attachments)) fail('attachments must be an array', filePath);

  return attachments.map((item, index) => {
    if (typeof item === 'string') {
      const clean = item.trim();
      if (!clean) fail(`Attachment at index ${index} is empty`, filePath);
      return {
        name: path.basename(clean),
        url: clean.startsWith('http') ? clean : `./attachments/${clean}`,
        type: path.extname(clean).replace('.', '').toLowerCase() || 'file',
      };
    }

    if (!item || typeof item !== 'object') fail(`Attachment at index ${index} must be string or object`, filePath);
    const name = String(item.name || '').trim();
    const url = String(item.url || '').trim();
    if (!name || !url) fail(`Attachment at index ${index} missing name or url`, filePath);

    return {
      name,
      url,
      type: String(item.type || path.extname(url).replace('.', '').toLowerCase() || 'file'),
    };
  });
};

const markdownToPlainText = (markdown) => markdown
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`[^`]*`/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/^#+\s+/gm, '')
  .replace(/[>*_~\-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const loadCards = async () => {
  const files = await walkMarkdownFiles(CARD_DIR);
  const notices = [];
  const seen = new Set();

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const id = String(parsed.data.id || path.basename(filePath, '.md')).trim();
    if (!id) fail('Missing card id', filePath);
    if (seen.has(id)) fail(`Duplicate card id: ${id}`, filePath);
    seen.add(id);

    const schoolSlug = String(parsed.data.school_slug || '').trim();
    if (!schoolSlug) fail('Missing school_slug', filePath);
    if (!SCHOOL_MAP.has(schoolSlug)) fail(`Invalid school_slug: ${schoolSlug}`, filePath);

    const parsedStart = parsed.data.start_at ? toIso(parsed.data.start_at, filePath) : '';
    const parsedEnd = parsed.data.end_at ? toIso(parsed.data.end_at, filePath) : '';
    const hasBothWindow = Boolean(parsedStart && parsedEnd);

    const markdown = parsed.content?.trim() || '';
    const html = marked.parse(markdown);

    notices.push({
      id,
      schoolSlug,
      schoolName: String(parsed.data.school_name || SCHOOL_MAP.get(schoolSlug) || schoolSlug),
      title: String(parsed.data.title || '').trim(),
      description: String(parsed.data.description || markdownToPlainText(markdown).slice(0, 180) || '').trim(),
      category: String(parsed.data.category || '未分类'),
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
      pinned: Boolean(parsed.data.pinned),
      cover: String(parsed.data.cover || ''),
      badge: String(parsed.data.badge || ''),
      extraUrl: String(parsed.data.extra_url || ''),
      startAt: hasBothWindow ? parsedStart : '',
      endAt: hasBothWindow ? parsedEnd : '',
      source: {
        channel: String(parsed.data.source?.channel || '').trim(),
        sender: String(parsed.data.source?.sender || '').trim(),
      },
      attachments: normalizeAttachments(parsed.data.attachments, filePath),
      published: toIso(parsed.data.published || new Date().toISOString(), filePath),
      contentMarkdown: markdown,
      contentHtml: html,
    });
  }

  return notices;
};

const loadConclusions = async () => {
  const files = await walkMarkdownFiles(CONCLUSION_DIR);
  const bySchool = {};

  for (const school of SCHOOL_DEFS) {
    bySchool[school.slug] = {
      defaultMarkdown: '',
      defaultHtml: '<p>暂无总结。</p>\n',
      byDate: {},
    };
  }

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const schoolSlug = String(parsed.data.school_slug || path.basename(filePath, '.md')).trim();
    if (!SCHOOL_MAP.has(schoolSlug)) fail(`Conclusion has invalid school_slug: ${schoolSlug}`, filePath);

    const markdown = (parsed.content || '').trim();
    const daily = parsed.data.daily;
    const byDate = {};

    if (daily) {
      if (typeof daily !== 'object' || Array.isArray(daily)) fail('conclusion daily must be an object map', filePath);
      for (const [dateKey, dailyMarkdown] of Object.entries(daily)) {
        if (typeof dailyMarkdown !== 'string') fail(`conclusion daily value must be string for ${dateKey}`, filePath);
        byDate[dateKey] = {
          markdown: dailyMarkdown.trim(),
          html: marked.parse(dailyMarkdown.trim()),
        };
      }
    }

    bySchool[schoolSlug] = {
      defaultMarkdown: markdown,
      defaultHtml: marked.parse(markdown || '暂无总结。'),
      byDate,
    };
  }

  return bySchool;
};

const compile = (notices, conclusions) => {
  const searchIndex = notices.map((notice) => ({
    id: notice.id,
    schoolSlug: notice.schoolSlug,
    title: notice.title,
    description: notice.description,
    category: notice.category,
    tags: notice.tags,
    published: notice.published,
    contentPlainText: markdownToPlainText(`${notice.title}\n${notice.contentMarkdown}`),
  }));

  notices.sort((a, b) => {
    if (a.schoolSlug !== b.schoolSlug) {
      return SCHOOL_DEFS.findIndex((item) => item.slug === a.schoolSlug) - SCHOOL_DEFS.findIndex((item) => item.slug === b.schoolSlug);
    }
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  return {
    generatedAt: new Date().toISOString(),
    schools: SCHOOL_DEFS,
    notices,
    conclusionBySchool: conclusions,
    searchIndex,
  };
};

const writeOutputs = async (compiled) => {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_GENERATED_DIR, { recursive: true });

  const contentData = {
    generatedAt: compiled.generatedAt,
    schools: compiled.schools,
    notices: compiled.notices,
    conclusionBySchool: compiled.conclusionBySchool,
  };

  await fs.writeFile(path.join(GENERATED_DIR, 'content-data.json'), `${JSON.stringify(contentData, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(GENERATED_DIR, 'search-index.json'), `${JSON.stringify(compiled.searchIndex, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(GENERATED_DIR, 'content-data.ts'), `export const contentData = ${JSON.stringify(contentData, null, 2)} as const;\n`, 'utf8');
  await fs.writeFile(path.join(GENERATED_DIR, 'search-index.ts'), `export const searchIndex = ${JSON.stringify(compiled.searchIndex, null, 2)} as const;\n`, 'utf8');

  await fs.writeFile(path.join(PUBLIC_GENERATED_DIR, 'content-data.json'), `${JSON.stringify(contentData, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(PUBLIC_GENERATED_DIR, 'search-index.json'), `${JSON.stringify(compiled.searchIndex, null, 2)}\n`, 'utf8');
};

const syncStaticAssets = async () => {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_COVERS_DIR, { recursive: true });

  try {
    await fs.cp(CARD_COVERS_DIR, PUBLIC_COVERS_DIR, { recursive: true, force: true });
  } catch {
    // ignore missing covers directory
  }

  const iconSource = path.join(CONTENT_IMG_DIR, 'icon.ico');
  const iconTarget = path.join(PUBLIC_DIR, 'icon.ico');
  try {
    await fs.copyFile(iconSource, iconTarget);
  } catch {
    // ignore missing icon file
  }
};

const main = async () => {
  const notices = await loadCards();
  const conclusions = await loadConclusions();
  const compiled = compile(notices, conclusions);
  await writeOutputs(compiled);
  await syncStaticAssets();
  console.log(`Compiled ${compiled.notices.length} card notices.`);
};

main().catch((error) => {
  console.error('[build:content] failed');
  console.error(error.message);
  process.exit(1);
});
