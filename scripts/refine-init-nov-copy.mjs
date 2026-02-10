import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const REWRITE = {
  '20251104-ai-001': {
    title: '图书馆集中意见反馈阶段性回应通知',
    description: '图书馆就插排增设、空调维修开放、闭馆时间延长及一楼噪音等高频意见进行了阶段性回应说明，请同学关注后续官方开放时间通知。',
  },
  '20251105-ai-001': {
    title: '“中国茅台·国之栋梁”助学后续事项提醒',
    description: '面向受助同学发布助学项目后续工作提示，重点涉及资助签收、感谢信提交、志愿者注册与交流群加入，请按文件要求逐项落实。',
  },
  '20251105-ai-002': {
    title: '全校青年志愿者注册工作通知（25级）',
    description: '面向25级班长和团支书发布志愿者注册推进通知，请各班按系统要求组织同学完成注册并及时处理注册异常问题，确保信息准确。',
  },
  '20251109-ai-001': {
    title: '职业能力提升微课作品征集通知',
    description: '围绕毕业生就业能力提升方向开展微课作品征集，鼓励同学结合专业优势提交高质量作品，请按格式要求和截止时间完成报送。',
  },
  '20251110-ai-001': {
    title: '脑电实验被试招募通知',
    description: '现面向学院同学招募脑电实验被试人员，有参与意愿者请扫码填写报名信息并保持联系方式可用，后续实验安排将按报名顺序通知。',
  },
  '20251111-ai-001': {
    title: '预防艾滋病知识竞赛与模拟活动通知',
    description: '转发校医院相关通知，包含预防艾滋病知识竞赛与模拟活动参与安排，请各班及时动员同学自愿参加并按后续组织要求执行。',
  },
  '20251111-ai-002': {
    title: '2025双创项目中期检查材料提交通知',
    description: '发布大学生创新创业训练计划项目中期检查通知，请相关项目团队按要求准备检查材料并在规定节点前提交，避免影响后续项目管理。',
  },
  '20251111-ai-003': {
    title: '“初识师大”主题征文比赛通知',
    description: '围绕“初识师大”与“师大赠予我的”主题征集原创征文作品，鼓励同学以个人成长视角表达校园体验，并按策划书要求提交。',
  },
  '20251116-ai-001': {
    title: '2025年国家学生体质健康测试通知',
    description: '根据学校统一安排启动2025年度国家学生体质健康测试，请各班按分组和时段组织参测同学到场，确保测试信息完整与秩序规范。',
  },
  '20251117-ai-001': {
    title: '“向往杯”拔河比赛预赛报名通知',
    description: '学院团委将举办“向往杯”拔河比赛预赛，请各班按人数与赛程要求完成队伍组织和名单报送，逾期将影响参赛安排。',
  },
  '20251117-ai-002': {
    title: '“emoji解码红色记忆”主题活动通知',
    description: '学院发布红色主题互动活动报名通知，活动以emoji猜谜和党史故事分享形式开展，请各班按名额要求在截止前提交参与名单。',
  },
  '20251120-ai-001': {
    title: '2025大学生创新创业训练营报名通知',
    description: '现转发大学生创新创业训练营通知，请各班高度重视并做好项目动员，推荐有基础和潜力的团队按报名要求在规定时间内报送。',
  },
  '20251124-ai-001': {
    title: '第19届挑战杯校赛线上动员会通知',
    description: '校团委将召开第19届挑战杯创业计划竞赛线上动员会，请有参赛意向团队和班委按时参加，及时掌握赛程安排与申报要求。',
  },
  '20251125-ai-001': {
    title: '红色主题互动微视频创作大赛通知',
    description: '为传承红色精神、提升青年表达力，学院发布互动式红色主题微创作大赛通知，请有意参赛同学按作品格式与报送要求提交。',
  },
  '20251128-ai-001': {
    title: '校园十佳歌手决赛门票分配通知',
    description: '第三十六届校园十佳歌手决赛门票已下发，请23至25级按分配规则领取并组织观赛，确保名额使用与现场秩序安排。',
  },
  '20251128-ai-002': {
    title: '二课调查问卷填报提醒通知',
    description: '请同学按通知要求完成二课相关调查问卷填报，截止时间为12月1日晚，逾期将影响本轮数据汇总与后续工作安排。',
  },
  '20251129-ai-001': {
    title: '25级志愿者注册信息汇总提交通知',
    description: '面向25级班委收集班级志愿者注册信息，请按模板完整填写并在截止前提交，确保学院志愿服务数据统计准确无遗漏。',
  },
  '20251129-ai-002': {
    title: '25级志愿者平台登录异常反馈通知',
    description: '若班内同学存在志愿者平台注册登录异常，请班委汇总手机号与问题情况后按表格统一上报，学院将集中对接处理。',
  },
};

const run = async () => {
  for (const [id, meta] of Object.entries(REWRITE)) {
    const filePath = path.join(CARD_DIR, `${id}.md`);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    parsed.data.title = meta.title;
    parsed.data.description = meta.description;
    const next = matter.stringify((parsed.content || '').trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }
  console.log(`Refined title/description for ${Object.keys(REWRITE).length} November cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
