import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'init-oct', 'Markdown File.md');
const FILE_DIR = path.join(ROOT, 'init-oct', 'file');
const CARD_DIR = path.join(ROOT, 'content', 'card');
const IMAGE_DIR = path.join(ROOT, 'content', 'img', 'init-oct');

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
  const senderPattern = '(?:爱喝冰美式\\.|Victor|言雨闲日|21℃)';
  const eventRe = new RegExp(
    `(${senderPattern}):\\s*(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\s*([\\s\\S]*?)(?=(${senderPattern}):\\s*\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\s*|$)`,
    'g'
  );
  let match;
  while ((match = eventRe.exec(raw))) {
    events.push({ sender: match[1].trim().replace(/\.$/, ''), ts: match[2], content: (match[3] || '').trim() });
  }
  return events;
};

const normalizeNoticeKey = (header) => {
  const h = String(header || '').replace(/\s+/g, ' ').trim();
  return h.replace(/\s*补充通知\s*$/g, '').replace(/\s+/g, '');
};

const isNoticeHeader = (header) => /\d+月\d+日.*通知/.test(header);

const extractDeadline = (body, publishedIso) => {
  const year = Number(String(publishedIso).slice(0, 4)) || 2025;
  const patterns = [
    /(\d{1,2})月(\d{1,2})日\s*([0-2]?\d)[:：](\d{2})\s*前/g,
    /截止(?:时间)?[为：:]?\s*(\d{1,2})月(\d{1,2})日\s*([0-2]?\d)[:：](\d{2})/g,
    /于\s*(\d{1,2})月(\d{1,2})日\s*([0-2]?\d)[:：](\d{2})\s*前/g,
    /(\d{1,2})月(\d{1,2})日\s*前/g,
    /截止(?:时间)?[为：:]?\s*(\d{1,2})月(\d{1,2})日/g,
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

const inferCategory = (text) => {
  const t = text;
  if (/志愿|招募|储备项目|公益/.test(t)) return '志愿实习';
  if (/辩论|挑战杯|歌手|运动会|锦标赛|大赛/.test(t)) return '竞赛相关';
  if (/活动|鼓圈|心理|宣教|栏目征音|国风|艺术团/.test(t)) return '二课活动';
  if (/赣青二课|模板|统计|提交|填报|名单/.test(t)) return '问卷填表';
  return '通知公告';
};

const inferTags = (text) => {
  const pairs = [
    ['辩论', '辩论赛'],
    ['挑战杯', '挑战杯'],
    ['歌手', '十佳歌手'],
    ['运动会', '校运会'],
    ['锦标赛', '体育竞赛'],
    ['赣青二课', '赣青二课'],
    ['转专业', '转专业办理'],
    ['志愿', '志愿服务'],
    ['心理', '心理健康'],
    ['宣教', '主题宣教'],
    ['模板', '材料模板'],
    ['报名', '报名通知'],
    ['名单', '名单公示'],
    ['培训', '培训通知'],
    ['投稿', '征稿征音'],
    ['国风', '国风活动'],
    ['艺术团', '校园文化'],
  ];
  const out = [];
  for (const [kw, tag] of pairs) {
    if (text.includes(kw) && !out.includes(tag)) out.push(tag);
  }
  if (out.length < 2) out.push('学生通知');
  return out.slice(0, 5);
};

const cleanForSummary = (body) => body
  .replace(/\s+/g, ' ')
  .replace(/^各位[^：:]{0,30}[：:]/, '')
  .replace(/^\s*大家好[！!。]?/, '')
  .replace(/^[❗️⚠️☀️\s]+/, '')
  .trim();

const inferTitle = (body) => {
  const text = cleanForSummary(body);
  const keywordTitleMap = [
    [/新生杯.*辩论/, '新生杯辩论赛报名通知'],
    [/赣青二课.*转专业/, '赣青二课转专业操作通知'],
    [/鼓圈|精神卫生日/, '精神卫生日鼓圈体验活动通知'],
    [/挑战杯/, '挑战杯立项申报通知'],
    [/十佳歌手/, '校园十佳歌手大赛通知'],
    [/运动会.*看台/, '校运会看台安排通知'],
    [/志愿服务项目|储备项目/, '校级优秀志愿服务项目遴选通知'],
    [/数字化转型培训/, '数字化转型培训通知'],
    [/征音|征稿|侧耳倾听/, '《侧耳倾听》栏目征音征稿通知'],
    [/重young国风|国风.*活动|艺术团/, '“重young国风”主题活动征集通知'],
  ];
  for (const [re, title] of keywordTitleMap) {
    if (re.test(text)) return title;
  }

  const firstSentence = text.split(/[。！？!?.]/)[0]?.trim() || '学生事务通知';
  const compact = firstSentence.replace(/[“”"'【】]/g, '').slice(0, 20);
  return `${compact || '学生事务'}通知`;
};

const inferDescription = (body) => {
  const text = cleanForSummary(body);
  const parts = text
    .split(/[。！？!]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const selected = [];
  for (const sentence of parts) {
    if (selected.length >= 2) break;
    selected.push(sentence);
  }
  let desc = selected.join('。');
  if (desc && !/[。！？!]$/.test(desc)) desc += '。';
  if (desc.length < 70) desc = `${desc}请按通知要求在截止前完成报名或材料提交。`;
  return desc.slice(0, 150);
};

const run = async () => {
  await fs.mkdir(CARD_DIR, { recursive: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const sourceRaw = await fs.readFile(SOURCE_PATH, 'utf8');
  const events = parseEvents(sourceRaw);

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

      const notice = {
        ts: event.ts,
        sender: event.sender,
        key,
        body,
        attachments: [],
      };
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
          url: `/init-oct/file/${nextFile}`,
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

      const localUrl = `/img/init-oct/${baseName}`;
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

    const imageAttachments = notice.attachments.filter((item) => item.type === 'image' && item.url);
    const cover = imageAttachments[0]?.url || '';
    const endAt = extractDeadline(notice.body, published);
    const startAt = endAt ? published : '';
    const category = inferCategory(notice.body);
    const tags = inferTags(notice.body);

    const frontmatter = [
      '---',
      `id: "${id}"`,
      `school_slug: "${SCHOOL_SLUG}"`,
      `subscription_id: "${SUBSCRIPTION_ID}"`,
      `school_name: "${SCHOOL_NAME}"`,
      `title: "${inferTitle(notice.body).replace(/"/g, '\\"')}"`,
      `description: "${inferDescription(notice.body).replace(/"/g, '\\"')}"`,
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
      `  sender: "${(notice.sender || SOURCE_SENDER).replace(/"/g, '\\"')}"`,
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

  console.log(`Imported ${notices.length} October notices.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
