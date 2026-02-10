import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'init-nov', 'Markdown File.md');
const FILE_DIR = path.join(ROOT, 'init-nov', 'file');
const CARD_DIR = path.join(ROOT, 'content', 'card');
const IMAGE_DIR = path.join(ROOT, 'content', 'img', 'init-nov');

const SCHOOL_SLUG = 'ai';
const SCHOOL_NAME = '人工智能学院';
const SUBSCRIPTION_ID = 'ai-25-26学年学生干部通知群';
const SOURCE_CHANNEL = '25-26学年学生干部通知群';
const SOURCE_SENDER = '爱喝冰美式';

const pad = (n) => String(n).padStart(2, '0');

const normalizeFileUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw.startsWith('file://')) return raw;
  const body = decodeURI(raw.replace(/^file:\/\//i, '').replace(/\\/g, '/'));
  if (/^[A-Za-z]:\//.test(body)) return `file:///${body}`;
  if (/^\/[A-Za-z]:\//.test(body)) return `file://${body}`;
  return `file://${body}`;
};

const localPathFromFileUrl = (url) => {
  const normalized = normalizeFileUrl(url);
  if (!normalized.startsWith('file:///')) return null;
  const without = decodeURI(normalized.replace(/^file:\/\//i, ''));
  if (/^\/[A-Za-z]:\//.test(without)) return without.slice(1);
  return without;
};

const parseEvents = (raw) => {
  const events = [];
  const re = /爱喝冰美式\.:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*([\s\S]*?)(?=爱喝冰美式\.:\s*\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s*|$)/g;
  let m;
  while ((m = re.exec(raw))) {
    events.push({ ts: m[1], content: (m[2] || '').trim() });
  }
  return events;
};

const normalizeNoticeKey = (header) => String(header || '')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\s*补充通知\s*$/g, '')
  .replace(/\s+/g, '');

const isNoticeHeader = (header) => /\d+月\d+日.*通知/.test(header);

const cleanForSummary = (body) => String(body || '')
  .replace(/\s+/g, ' ')
  .replace(/^各位[^：:]{0,30}[：:]/, '')
  .replace(/^\s*大家好[！!。]?/, '')
  .replace(/^[❗️⚠️☀️\s]+/, '')
  .trim();

const inferCategory = (text) => {
  const t = text;
  if (/志愿|招募|注册|志愿者/.test(t)) return '志愿实习';
  if (/比赛|大赛|朗诵|职业规划|体质|拔河/.test(t)) return '竞赛相关';
  if (/统计|提交|汇总|报名表|中期检查|名单|测试/.test(t)) return '问卷填表';
  if (/征文|微课|微视频|主题活动|培训营/.test(t)) return '二课活动';
  return '通知公告';
};

const inferTags = (text) => {
  const pairs = [
    ['朗诵', '朗诵比赛'],
    ['茅台', '资助项目'],
    ['志愿者', '志愿服务'],
    ['职业规划', '职业规划'],
    ['微课', '微课作品'],
    ['微视频', '微视频创作'],
    ['体质', '体测通知'],
    ['拔河', '体育活动'],
    ['创新创业', '双创训练营'],
    ['征文', '征文活动'],
    ['账号', '账号处理'],
    ['统计', '数据统计'],
    ['中期检查', '项目中检'],
    ['报名', '报名通知'],
  ];
  const tags = [];
  for (const [kw, tag] of pairs) {
    if (text.includes(kw) && !tags.includes(tag)) tags.push(tag);
  }
  if (tags.length < 2) tags.push('学生通知');
  return tags.slice(0, 5);
};

const inferTitle = (body) => {
  const text = cleanForSummary(body);
  const map = [
    [/图书馆.*回应|图书馆.*建议/, '图书馆意见反馈阶段性回应通知'],
    [/茅台|国之栋梁|助学/, '“中国茅台·国之栋梁”助学后续提醒'],
    [/志愿者.*注册/, '全校青年志愿者注册工作提示'],
    [/职业规划大赛/, '大学生职业规划大赛校赛通知'],
    [/微课/, '主题微课作品征集通知'],
    [/微视频/, '红色主题微视频创作大赛通知'],
    [/体质健康测试|体测/, '大学生体质健康测试安排通知'],
    [/拔河/, '“向往杯”拔河比赛预赛通知'],
    [/创新创业训练营/, '大学生创新创业训练营报名通知'],
    [/账号问题|账号异常/, '学校账号问题处理名单提交通知'],
    [/征文/, '“初识师大”征文活动通知'],
    [/中期检查/, '双创项目中期检查工作通知'],
    [/积极分子|成绩情况统计/, '积极分子成绩统计填报通知'],
  ];
  for (const [re, title] of map) {
    if (re.test(text)) return title;
  }
  const first = text.split(/[。！？!?.]/)[0]?.trim() || '学生事务';
  return `${first.slice(0, 20)}通知`;
};

const inferDescription = (body) => {
  const text = cleanForSummary(body);
  const pieces = text.split(/[。！？!]/).map((x) => x.trim()).filter(Boolean);
  let desc = pieces.slice(0, 2).join('。');
  if (desc && !/[。！？!]$/.test(desc)) desc += '。';
  if (desc.length < 70) desc += '请相关同学按通知要求在规定时间内完成报名或材料提交。';
  return desc.slice(0, 150);
};

const extractDeadline = (body, publishedIso) => {
  const year = Number(String(publishedIso).slice(0, 4)) || 2025;
  const patterns = [
    /(\d{1,2})月(\d{1,2})日\s*([0-2]?\d)[:：](\d{2})\s*前/g,
    /截止(?:时间)?[为：:]?\s*(\d{1,2})月(\d{1,2})日\s*([0-2]?\d)[:：](\d{2})/g,
    /于\s*(\d{1,2})月(\d{1,2})日\s*([0-2]?\d)[:：](\d{2})\s*前/g,
    /(\d{1,2})月(\d{1,2})日\s*前/g,
  ];

  for (const re of patterns) {
    const m = re.exec(body);
    re.lastIndex = 0;
    if (!m) continue;
    const month = pad(Number(m[1]));
    const day = pad(Number(m[2]));
    const hour = m[3] !== undefined ? pad(Number(m[3])) : '23';
    const minute = m[4] !== undefined ? pad(Number(m[4])) : '59';
    const second = m[3] !== undefined ? '00' : '59';
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`;
  }
  return '';
};

const run = async () => {
  await fs.mkdir(CARD_DIR, { recursive: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const raw = await fs.readFile(SOURCE_PATH, 'utf8');
  const events = parseEvents(raw);

  const fileEntries = await fs.readdir(FILE_DIR);
  const filePool = fileEntries
    .filter((name) => /^\d+_/.test(name))
    .sort((a, b) => Number((a.match(/^(\d+)_/) || [])[1] || 0) - Number((b.match(/^(\d+)_/) || [])[1] || 0));
  let fileCursor = 0;

  const notices = [];
  const byKey = new Map();
  let current = null;

  for (const event of events) {
    const headerMatch = event.content.match(/^【([^】]+)】\s*([\s\S]*)$/);
    if (headerMatch) {
      const header = headerMatch[1].trim();
      const body = (headerMatch[2] || '').trim();
      if (!isNoticeHeader(header)) {
        if (current) current.body = `${current.body}\n${header} ${body}`.trim();
        continue;
      }

      const key = normalizeNoticeKey(header);
      const isSupplement = /补充通知/.test(header);
      if (isSupplement && byKey.has(key)) {
        current = byKey.get(key);
        current.body = `${current.body}\n${body}`.trim();
        continue;
      }

      const notice = { ts: event.ts, key, body, attachments: [] };
      notices.push(notice);
      byKey.set(key, notice);
      current = notice;
      continue;
    }

    if (!current) continue;

    if (event.content.startsWith('[文件]')) {
      const nextFile = filePool[fileCursor];
      fileCursor += 1;
      if (nextFile) {
        current.attachments.push({
          name: nextFile,
          url: `/init-nov/file/${nextFile}`,
          type: path.extname(nextFile).replace('.', '').toLowerCase() || 'file',
        });
      }
      continue;
    }

    const imgMatch = event.content.match(/^!\[img\]\((file:\/\/[^)]+)\)$/i);
    if (imgMatch) {
      const fileUrl = normalizeFileUrl(imgMatch[1]);
      const localPath = localPathFromFileUrl(fileUrl);
      const baseName = localPath ? path.basename(localPath) : `img-${Date.now()}.png`;
      if (localPath) {
        try {
          await fs.copyFile(localPath, path.join(IMAGE_DIR, baseName));
        } catch {
          // ignore copy failure
        }
      }

      const localUrl = `/img/init-nov/${baseName}`;
      current.attachments.push({ name: baseName, url: localUrl, type: 'image' });
      current.body = `${current.body}\n\n![通知配图](${localUrl})`.trim();
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
    const dateKey = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
    const seq = (countersByDate.get(dateKey) || 0) + 1;
    countersByDate.set(dateKey, seq);
    const id = `${dateKey}-${SCHOOL_SLUG}-${String(seq).padStart(3, '0')}`;
    const published = `${notice.ts.replace(' ', 'T')}+08:00`;

    const images = notice.attachments.filter((item) => item.type === 'image');
    const cover = images[0]?.url || '';
    const endAt = extractDeadline(notice.body, published);
    const startAt = endAt ? published : '';

    const category = inferCategory(notice.body);
    const tags = inferTags(notice.body);
    const title = inferTitle(notice.body);
    const description = inferDescription(notice.body);

    const frontmatter = [
      '---',
      `id: "${id}"`,
      `school_slug: "${SCHOOL_SLUG}"`,
      `subscription_id: "${SUBSCRIPTION_ID}"`,
      `school_name: "${SCHOOL_NAME}"`,
      `title: "${title.replace(/"/g, '\\"')}"`,
      `description: "${description.replace(/"/g, '\\"')}"`,
      `published: '${published}'`,
      `category: "${category}"`,
      `tags: [${tags.map((tag) => `"${tag.replace(/"/g, '\\"')}"`).join(', ')}]`,
      'pinned: false',
      `cover: "${cover}"`,
      'badge: ""',
      'extra_url: ""',
      `start_at: '${startAt}'`,
      `end_at: '${endAt}'`,
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

  console.log(`Imported ${notices.length} November notices.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
