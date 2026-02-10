import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const monthPattern = /^2025(09|10|11).+\.md$/;

const stripMarkdown = (text) => String(text || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`[^`]*`/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[>*#]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const trimGreeting = (line) => String(line || '')
  .replace(/^各位[^：:]{0,30}[：:]?/, '')
  .replace(/^大家好[！!。]?/, '')
  .replace(/^你们好[！!。]?/, '')
  .replace(/^同学们好[！!。]?/, '')
  .trim();

const formatDeadline = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hasTime = !(hh === '23' && mm === '59');
  return hasTime ? `请于${m}月${day}日${hh}:${mm}前完成。` : `请于${m}月${day}日前完成。`;
};

const concise = (value, max = 70) => {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
};

const buildDescription = (parsed) => {
  const bodyText = stripMarkdown(parsed.content || '');
  const chunks = bodyText
    .split(/[。！？!\n]/)
    .map((x) => trimGreeting(x))
    .map((x) => x.replace(/^\d+[、.．)]\s*/, '').trim())
    .filter(Boolean);

  const deadline = formatDeadline(parsed.data.end_at || parsed.data.endAt || '');

  let summary = '';
  if (chunks.length > 0) {
    summary = chunks[0];
    if (summary.length < 20 && chunks[1]) summary = `${summary}，${chunks[1]}`;
  }

  if (!summary) {
    summary = stripMarkdown(parsed.data.title || '').replace(/通知$/, '').trim();
  }

  summary = summary
    .replace(/请各位同学|请同学们|请各班/g, '请相关同学')
    .replace(/谢谢配合!?/g, '')
    .replace(/具体详见附件/g, '详见附件')
    .trim();

  let output = summary;
  if (deadline) {
    output = `${output}，${deadline}`;
  } else if (!/[。！？!]$/.test(output)) {
    output = `${output}。`;
  }

  output = output
    .replace(/，，+/g, '，')
    .replace(/。{2,}/g, '。')
    .replace(/\s+/g, ' ')
    .trim();

  return concise(output, 70);
};

const run = async () => {
  const files = (await fs.readdir(CARD_DIR)).filter((name) => monthPattern.test(name));
  let updated = 0;

  for (const fileName of files) {
    const filePath = path.join(CARD_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);

    const nextDescription = buildDescription(parsed);
    if (String(parsed.data.description || '').trim() === nextDescription) continue;

    parsed.data.description = nextDescription;
    const next = matter.stringify((parsed.content || '').trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
    updated += 1;
  }

  console.log(`Rewrote concise descriptions for ${updated} cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
