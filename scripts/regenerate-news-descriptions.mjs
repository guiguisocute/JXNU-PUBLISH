import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');
const TARGET_RE = /^2025(09|10|11).+\.md$/;

const categoryTailMap = {
  '竞赛相关': '通知明确了参与对象、流程与材料要求，请按节点推进。',
  '二课活动': '通知明确活动安排与参与方式，请按要求完成报名与到场。',
  '问卷填表': '通知给出填报模板与提交口径，请按时完成并核对信息。',
  '志愿服务': '通知说明了注册或招募流程，请按步骤完成并关注后续安排。',
  '志愿实习': '通知说明了注册或招募流程，请按步骤完成并关注后续安排。',
  '创新创业': '通知强调项目组织与申报节点，请按要求完成报名与提交。',
  '项目管理': '通知涉及项目过程管理节点，请按要求完成材料更新与报送。',
  '科研实践': '通知说明实践参与方式与后续安排，请按要求报名并配合执行。',
  '资助帮扶': '通知涉及资助后续流程事项，请按要求完成签收与材料回执。',
  '校园服务': '通知围绕校园服务优化事项，请根据安排及时反馈与落实。',
  '通知公告': '通知明确了执行要求与时间节点，请相关同学按要求落实。',
};

const pad2 = (n) => String(n).padStart(2, '0');

const formatDeadline = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  if (hh === '23' && mm === '59') return `请于${m}月${day}日前完成。`;
  return `请于${m}月${day}日${hh}:${mm}前完成。`;
};

const cleanTitle = (title) => String(title || '')
  .replace(/[“”"']/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const truncate = (text, max = 100) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
};

const ensureMinLength = (text, category) => {
  const clean = String(text || '').trim();
  if (clean.length >= 50) return clean;
  const extra = categoryTailMap[category] || categoryTailMap['通知公告'];
  const merged = `${clean}${clean.endsWith('。') ? '' : '。'}${extra}`
    .replace(/。{2,}/g, '。')
    .replace(/\s+/g, ' ')
    .trim();
  let result = merged.length > 100 ? truncate(merged, 100) : merged;
  if (result.length < 50) {
    result = `${result}${result.endsWith('。') ? '' : '。'}请按通知要求及时落实。`;
  }
  return result.length > 100 ? truncate(result, 100) : result;
};

const buildDescription = ({ title, category, endAt }) => {
  const t = cleanTitle(title);
  const base = t.endsWith('通知') ? t.slice(0, -2) : t;
  const tail = formatDeadline(endAt) || categoryTailMap[category] || categoryTailMap['通知公告'];

  let summary = `${base}。${tail}`;
  summary = summary
    .replace(/。。+/g, '。')
    .replace(/\s+/g, ' ')
    .trim();

  return ensureMinLength(truncate(summary, 100), category);
};

const run = async () => {
  const files = (await fs.readdir(CARD_DIR)).filter((name) => TARGET_RE.test(name));
  let updated = 0;

  for (const fileName of files) {
    const filePath = path.join(CARD_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);

    const nextDescription = buildDescription({
      title: parsed.data.title,
      category: parsed.data.category,
      endAt: parsed.data.end_at,
    });

    if (String(parsed.data.description || '').trim() === nextDescription) continue;
    parsed.data.description = nextDescription;
    const next = matter.stringify((parsed.content || '').trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
    updated += 1;
  }

  console.log(`Regenerated news-style descriptions for ${updated} cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
