import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import YAML from 'yaml';

// Disable indented code blocks — the card markdown files use leading spaces
// for Chinese-style paragraph indentation, not code.  Fenced code blocks
// (``` … ```) are unaffected because they go through the 'fences' tokenizer.
marked.use({
  tokenizer: {
    code() { return undefined; },
  },
});

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const CARD_DIR = path.join(CONTENT_DIR, 'card');
const CARD_COVERS_DIR = path.join(CARD_DIR, 'covers');
const CONCLUSION_DIR = path.join(CONTENT_DIR, 'conclusion');
const CONTENT_IMG_DIR = path.join(CONTENT_DIR, 'img');
const INIT_SEPT_FILE_DIR = path.join(ROOT, 'init-sept', 'file');
const INIT_OCT_FILE_DIR = path.join(ROOT, 'init-oct', 'file');
const INIT_NOV_FILE_DIR = path.join(ROOT, 'init-nov', 'file');
const PUBLIC_GENERATED_DIR = path.join(ROOT, 'public', 'generated');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PUBLIC_IMG_DIR = path.join(PUBLIC_DIR, 'img');
const PUBLIC_COVERS_DIR = path.join(PUBLIC_DIR, 'covers');
const PUBLIC_INIT_SEPT_FILE_DIR = path.join(PUBLIC_DIR, 'init-sept', 'file');
const PUBLIC_INIT_OCT_FILE_DIR = path.join(PUBLIC_DIR, 'init-oct', 'file');
const PUBLIC_INIT_NOV_FILE_DIR = path.join(PUBLIC_DIR, 'init-nov', 'file');
const CONFIG_PATH = path.join(ROOT, 'config', 'subscriptions.yaml');

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
  if (Number.isNaN(date.getTime())) fail(`Invalid date: ${String(value)}`, filePath);
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

const inferAttachmentTypeFromUrl = (url) => {
  const cleanUrl = String(url || '').split('#')[0].split('?')[0];
  const ext = path.extname(cleanUrl).replace('.', '').toLowerCase();
  if (!ext) return 'link';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xlsx';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['ppt', 'pptx'].includes(ext)) return 'pptx';
  return ext;
};

const extractInlineAttachments = (markdown) => {
  const result = [];
  const text = String(markdown || '');

  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRe.exec(text))) {
    const alt = String(match[1] || '').trim();
    const url = String(match[2] || '').trim();
    if (!url) continue;
    result.push({
      name: alt || path.basename(url) || 'image',
      url,
      type: 'image',
    });
  }

  const linkRe = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = linkRe.exec(text))) {
    const name = String(match[1] || '').trim();
    const url = String(match[2] || '').trim();
    if (!url) continue;
    result.push({
      name: name || path.basename(url) || url,
      url,
      type: inferAttachmentTypeFromUrl(url),
    });
  }

  const lineAttachments = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('[分享]') || line.startsWith('[QQ小程序]'))
    .map((line) => ({
      name: line,
      url: '#',
      type: 'link',
    }));

  result.push(...lineAttachments);

  const unique = [];
  const seen = new Set();
  for (const item of result) {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
};

const mergeAttachments = (base, extra) => {
  const merged = [];
  const seen = new Set();
  [...base, ...extra].forEach((item) => {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
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

const ensureString = (value, fieldName, filePath) => {
  const text = String(value || '').trim();
  if (!text) fail(`Missing ${fieldName}`, filePath);
  return text;
};

const slugifyChannel = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .replace(/^-+|-+$/g, '');

const parseConfig = async () => {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const data = YAML.parse(raw);
  if (!data || typeof data !== 'object') fail('config/subscriptions.yaml is invalid');
  if (!Array.isArray(data.schools) || data.schools.length === 0) fail('config/schools must be a non-empty array', CONFIG_PATH);

  const schools = data.schools.map((item, index) => {
    if (!item || typeof item !== 'object') fail(`school at index ${index} is invalid`, CONFIG_PATH);
    const subscriptions = Array.isArray(item.subscriptions) ? item.subscriptions : null;
    if (!subscriptions || subscriptions.length === 0) {
      fail(`schools[${index}].subscriptions must be a non-empty array`, CONFIG_PATH);
    }

    return {
      slug: ensureString(item.slug, `schools[${index}].slug`, CONFIG_PATH),
      name: ensureString(item.name, `schools[${index}].name`, CONFIG_PATH),
      shortName: String(item.short_name || '').trim(),
      icon: String(item.icon || '').trim() || '/img/JXNUlogo.png',
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      subscriptions,
    };
  });

  const schoolSlugSet = new Set();
  for (const school of schools) {
    if (schoolSlugSet.has(school.slug)) fail(`Duplicate school slug in config: ${school.slug}`, CONFIG_PATH);
    schoolSlugSet.add(school.slug);
  }

  const subscriptions = [];
  for (const school of schools) {
    for (let index = 0; index < school.subscriptions.length; index += 1) {
      const item = school.subscriptions[index];
      if (!item || typeof item !== 'object') {
        fail(`schools[${school.slug}].subscriptions[${index}] is invalid`, CONFIG_PATH);
      }

      const title = ensureString(item.title, `schools[${school.slug}].subscriptions[${index}].title`, CONFIG_PATH);
      const url = String(item.url || '').trim();
      const key = url || title;
      const suffix = slugifyChannel(key);
      const rawIcon = String(item.icon || '').trim();
      const isWaitingSource = title.includes('待接入');
      if (!suffix) {
        fail(`schools[${school.slug}].subscriptions[${index}] has empty slug key`, CONFIG_PATH);
      }

      subscriptions.push({
        id: `${school.slug}-${suffix}`,
        schoolSlug: school.slug,
        schoolName: school.name,
        schoolIcon: school.icon,
        title,
        url,
        icon: rawIcon || (isWaitingSource ? '/img/subicon/waiting-dots.svg' : '/img/subicon/group-default.svg'),
        enabled: item.enabled !== false,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      });
    }
  }

  const subscriptionIdSet = new Set();
  for (const sub of subscriptions) {
    if (subscriptionIdSet.has(sub.id)) fail(`Duplicate subscription id in config: ${sub.id}`, CONFIG_PATH);
    subscriptionIdSet.add(sub.id);
  }

  schools.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  const schoolOrderMap = new Map(schools.map((item, idx) => [item.slug, idx]));
  subscriptions.sort((a, b) => {
    const schoolDiff = (schoolOrderMap.get(a.schoolSlug) ?? 9999) - (schoolOrderMap.get(b.schoolSlug) ?? 9999);
    if (schoolDiff !== 0) return schoolDiff;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id, 'zh-CN');
  });

  return {
    schools: schools.map(({ subscriptions: _subs, ...rest }) => rest),
    subscriptions,
    schoolMap: new Map(schools.map(({ subscriptions: _subs, ...rest }) => [rest.slug, rest])),
    subscriptionMap: new Map(subscriptions.map((item) => [item.id, item])),
  };
};

const loadCards = async ({ schoolMap, subscriptionMap }) => {
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

    const schoolSlug = ensureString(parsed.data.school_slug, 'school_slug', filePath);
    if (!schoolMap.has(schoolSlug)) fail(`Invalid school_slug: ${schoolSlug}`, filePath);
    const school = schoolMap.get(schoolSlug);

    const subscriptionId = ensureString(parsed.data.subscription_id, 'subscription_id', filePath);
    const subscription = subscriptionMap.get(subscriptionId);
    if (!subscription) fail(`Invalid subscription_id: ${subscriptionId}`, filePath);
    if (!subscription.enabled) fail(`subscription_id is disabled: ${subscriptionId}`, filePath);
    if (subscription.schoolSlug !== schoolSlug) {
      fail(`subscription_id(${subscriptionId}) does not belong to school_slug(${schoolSlug})`, filePath);
    }

    const parsedStart = parsed.data.start_at ? toIso(parsed.data.start_at, filePath) : '';
    const parsedEnd = parsed.data.end_at ? toIso(parsed.data.end_at, filePath) : '';
    const hasBothWindow = Boolean(parsedStart && parsedEnd);

    const markdown = parsed.content?.trim() || '';
    const html = marked.parse(markdown);

    const frontmatterAttachments = normalizeAttachments(parsed.data.attachments, filePath);
    const inlineAttachments = extractInlineAttachments(markdown);

    notices.push({
      id,
      schoolSlug,
      schoolName: String(parsed.data.school_name || school?.name || schoolSlug),
      subscriptionId,
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
        channel: String(parsed.data.source?.channel || subscription.title || '').trim(),
        sender: String(parsed.data.source?.sender || '').trim(),
      },
      attachments: mergeAttachments(frontmatterAttachments, inlineAttachments),
      published: toIso(parsed.data.published || new Date().toISOString(), filePath),
      contentMarkdown: markdown,
      contentHtml: html,
    });
  }

  return notices;
};

const loadConclusions = async ({ schools, schoolMap }) => {
  const files = await walkMarkdownFiles(CONCLUSION_DIR);
  const bySchool = {};

  for (const school of schools) {
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
    if (!schoolMap.has(schoolSlug)) fail(`Conclusion has invalid school_slug: ${schoolSlug}`, filePath);

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

const compile = ({ notices, conclusions, schools, subscriptions, schoolMap }) => {
  const schoolOrderMap = new Map(schools.map((item, index) => [item.slug, index]));
  const subscriptionOrderMap = new Map(subscriptions.map((item, index) => [item.id, index]));

  const searchIndex = notices.map((notice) => ({
    id: notice.id,
    schoolSlug: notice.schoolSlug,
    subscriptionId: notice.subscriptionId,
    title: notice.title,
    description: notice.description,
    category: notice.category,
    tags: notice.tags,
    published: notice.published,
    contentPlainText: markdownToPlainText(`${notice.title}\n${notice.contentMarkdown}`),
  }));

  notices.sort((a, b) => {
    const schoolDiff = (schoolOrderMap.get(a.schoolSlug) ?? 9999) - (schoolOrderMap.get(b.schoolSlug) ?? 9999);
    if (schoolDiff !== 0) return schoolDiff;
    const subscriptionDiff = (subscriptionOrderMap.get(a.subscriptionId) ?? 9999) - (subscriptionOrderMap.get(b.subscriptionId) ?? 9999);
    if (subscriptionDiff !== 0) return subscriptionDiff;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  return {
    generatedAt: new Date().toISOString(),
    schools: schools.map((item) => ({ slug: item.slug, name: item.name, shortName: item.shortName, icon: item.icon || '' })),
    subscriptions: subscriptions.map((item) => ({
      id: item.id,
      schoolSlug: item.schoolSlug,
      schoolName: schoolMap.get(item.schoolSlug)?.name || item.schoolName || item.schoolSlug,
      title: item.title,
      url: item.url,
      icon: item.icon,
      enabled: item.enabled,
      order: item.order,
    })),
    notices,
    conclusionBySchool: conclusions,
    searchIndex,
  };
};

const writeOutputs = async (compiled) => {
  await fs.mkdir(PUBLIC_GENERATED_DIR, { recursive: true });

  const contentData = {
    generatedAt: compiled.generatedAt,
    schools: compiled.schools,
    subscriptions: compiled.subscriptions,
    notices: compiled.notices,
    conclusionBySchool: compiled.conclusionBySchool,
  };

  await fs.writeFile(path.join(PUBLIC_GENERATED_DIR, 'content-data.json'), `${JSON.stringify(contentData, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(PUBLIC_GENERATED_DIR, 'search-index.json'), `${JSON.stringify(compiled.searchIndex, null, 2)}\n`, 'utf8');
};

const syncStaticAssets = async () => {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_COVERS_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_IMG_DIR, { recursive: true });

  try {
    await fs.cp(CARD_COVERS_DIR, PUBLIC_COVERS_DIR, { recursive: true, force: true });
  } catch {
    // ignore missing covers directory
  }

  try {
    await fs.cp(CONTENT_IMG_DIR, PUBLIC_IMG_DIR, { recursive: true, force: true });
  } catch {
    // ignore missing image directory
  }

  try {
    await fs.cp(INIT_SEPT_FILE_DIR, PUBLIC_INIT_SEPT_FILE_DIR, { recursive: true, force: true });
  } catch {
    // ignore missing init-sept file directory
  }

  try {
    await fs.cp(INIT_OCT_FILE_DIR, PUBLIC_INIT_OCT_FILE_DIR, { recursive: true, force: true });
  } catch {
    // ignore missing init-oct file directory
  }

  try {
    await fs.cp(INIT_NOV_FILE_DIR, PUBLIC_INIT_NOV_FILE_DIR, { recursive: true, force: true });
  } catch {
    // ignore missing init-nov file directory
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
  const validateOnly = process.argv.includes('--validate-only');
  const config = await parseConfig();
  const notices = await loadCards(config);
  const conclusions = await loadConclusions(config);
  const compiled = compile({
    notices,
    conclusions,
    schools: config.schools,
    subscriptions: config.subscriptions,
    schoolMap: config.schoolMap,
  });

  if (validateOnly) {
    console.log(`Validated ${compiled.notices.length} card notices.`);
    return;
  }

  await writeOutputs(compiled);
  await syncStaticAssets();
  console.log(`Compiled ${compiled.notices.length} card notices.`);
};

main().catch((error) => {
  console.error('[build:content] failed');
  console.error(error.message);
  process.exit(1);
});
