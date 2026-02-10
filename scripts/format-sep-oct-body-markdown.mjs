import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const formatBody = (input) => {
  let text = String(input || '');

  // 仅做“插入式”排版：不删除原文字符。
  text = text.replace(/([。！？!])(?=[^\n])/g, '$1\n\n');
  text = text.replace(/([一二三四五六七八九十]+、)/g, '\n\n$1');
  text = text.replace(/(\s)(\d+[\.、])/g, '$1\n$2');
  text = text.replace(/(报名方式[:：])/g, '\n\n$1');
  text = text.replace(/(报名时间[:：])/g, '\n\n$1');
  text = text.replace(/(截止时间[:：]?)/g, '\n\n$1');
  text = text.replace(/(注意[:：]?)/g, '\n\n$1');
  text = text.replace(/(如有疑问)/g, '\n\n$1');
  text = text.replace(/(补充通知[:：]?)/g, '\n\n$1');

  // 规范多余空行（最多保留两个）
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
};

const run = async () => {
  const files = (await fs.readdir(CARD_DIR)).filter((name) => /^(202509|202510).+\.md$/.test(name));

  for (const fileName of files) {
    const filePath = path.join(CARD_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    parsed.content = formatBody(parsed.content);
    const next = matter.stringify(`${parsed.content}\n`, parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }

  console.log(`Formatted markdown body for ${files.length} Sep/Oct cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
