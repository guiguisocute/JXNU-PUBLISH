import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const META = {
  '20251104-ai-001': { category: '校园服务', tags: ['图书馆服务', '意见反馈', '学习环境', '后续公告'] },
  '20251105-ai-001': { category: '资助帮扶', tags: ['茅台助学', '资助签收', '感谢信提交', '后续流程'] },
  '20251105-ai-002': { category: '志愿服务', tags: ['志愿者注册', '25级', '班委落实', '系统操作'] },
  '20251109-ai-001': { category: '二课活动', tags: ['职业能力', '微课作品', '作品征集', '就业提升'] },
  '20251110-ai-001': { category: '科研实践', tags: ['脑电实验', '被试招募', '扫码报名', '实验通知'] },
  '20251111-ai-001': { category: '二课活动', tags: ['防艾活动', '知识竞赛', '模拟互动', '健康教育'] },
  '20251111-ai-002': { category: '项目管理', tags: ['双创项目', '中期检查', '材料提交', '创新创业'] },
  '20251111-ai-003': { category: '二课活动', tags: ['征文比赛', '校园文化', '主题创作', '作品提交'] },
  '20251116-ai-001': { category: '通知公告', tags: ['体质测试', '测试安排', '班级组织', '参测提醒'] },
  '20251117-ai-001': { category: '竞赛相关', tags: ['拔河比赛', '班级报名', '团队协作', '预赛安排'] },
  '20251117-ai-002': { category: '二课活动', tags: ['党史教育', '主题活动', '名额收集', '红色文化'] },
  '20251120-ai-001': { category: '创新创业', tags: ['训练营报名', '项目推荐', '双创实践', '班级动员'] },
  '20251124-ai-001': { category: '竞赛相关', tags: ['挑战杯', '动员会', '创业计划', '线上宣讲'] },
  '20251125-ai-001': { category: '竞赛相关', tags: ['微视频大赛', '红色主题', '创作作品', '活动报名'] },
  '20251128-ai-001': { category: '通知公告', tags: ['十佳歌手', '门票分配', '观赛安排', '年级通知'] },
  '20251128-ai-002': { category: '问卷填表', tags: ['问卷填报', '二课数据', '截止提醒', '信息收集'] },
  '20251129-ai-001': { category: '问卷填表', tags: ['志愿者注册', '信息汇总', '班级上报', '25级'] },
  '20251129-ai-002': { category: '问卷填表', tags: ['平台异常', '账号反馈', '问题收集', '25级'] },
};

const run = async () => {
  for (const [id, item] of Object.entries(META)) {
    const filePath = path.join(CARD_DIR, `${id}.md`);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    parsed.data.category = item.category;
    parsed.data.tags = item.tags;
    const next = matter.stringify((parsed.content || '').trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }
  console.log(`Refined taxonomy for ${Object.keys(META).length} November cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
