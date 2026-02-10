import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const TAXONOMY = {
  '20250925-ai-001': {
    category: '竞赛相关',
    tags: ['校运会', '运动员选拔', '综测加分', '报名通知'],
  },
  '20250925-ai-002': {
    category: '二课活动',
    tags: ['红色家书', '剧本杀活动', '思政教育', '班级报名'],
  },
  '20250925-ai-003': {
    category: '志愿实习',
    tags: ['志愿服务', '数字支教', '省青基会', '招募转发'],
  },
  '20250925-ai-004': {
    category: '通知公告',
    tags: ['团委通知', '入团发展对象', '青马工程', '名单公示'],
  },
  '20250927-ai-001': {
    category: '问卷填表',
    tags: ['赣青二课', '账号创建', '信息采集', '班级模板'],
  },
  '20250928-ai-001': {
    category: '竞赛相关',
    tags: ['武术套路', '校级赛事', '体育竞赛', '报名通知'],
  },
  '20250928-ai-002': {
    category: '竞赛相关',
    tags: ['武术散打', '称重检录', '体育竞赛', '报名通知'],
  },
  '20250928-ai-003': {
    category: '问卷填表',
    tags: ['赣青二课', '信息重报', '模板提交', '班委通知'],
  },
  '20250929-ai-001': {
    category: '竞赛相关',
    tags: ['挑战杯', '创业计划', '立项申报', '材料补交'],
  },
  '20250930-ai-001': {
    category: '志愿实习',
    tags: ['志愿服务', '自习室管理', '校学生会', '招募通知'],
  },
};

const run = async () => {
  for (const [id, meta] of Object.entries(TAXONOMY)) {
    const filePath = path.join(CARD_DIR, `${id}.md`);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    parsed.data.category = meta.category;
    parsed.data.tags = meta.tags;
    const next = matter.stringify(parsed.content.trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }
  console.log(`Refined taxonomy for ${Object.keys(TAXONOMY).length} cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
