import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const run = async () => {
  const files = (await fs.readdir(CARD_DIR)).filter((name) => /^(202509|202510).+\.md$/.test(name));

  for (const fileName of files) {
    const filePath = path.join(CARD_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    let content = String(parsed.content || '');

    // 修复被换行拆断的 Markdown 图片语法
    content = content.replace(/!\s*\n+\s*(\[[^\]]+\]\([^\)]+\))/g, '!$1');

    // 修复被换行拆断的常见密码片段
    content = content.replace(/@!\s*\n+\s*Qqek/g, '@!Qqek');

    // 清理过多空行
    content = content.replace(/\n{3,}/g, '\n\n');

    const next = matter.stringify(content.trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }

  console.log(`Repaired formatting artifacts for ${files.length} Sep/Oct cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
