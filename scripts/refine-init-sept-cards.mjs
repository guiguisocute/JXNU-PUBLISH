import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const META = {
  '20250925-ai-001': {
    published: '2025-09-25T11:02:44+08:00',
    title: '秋季运动会运动员选拔报名通知',
    description: '学院启动校运会运动员训练选拔，参与训练与比赛可叠加综测加分。请班委尽快汇总报名表，并在9月26日14:00前发送至指定邮箱。',
  },
  '20250925-ai-002': {
    published: '2025-09-25T19:07:08+08:00',
    title: '红色家书主题剧本杀活动报名通知',
    description: '学院组织“红色家书里的家国情怀”主题活动，面向同学开放报名。25级各班至少推荐2人，请班委在9月26日16:00前提交名单并通知入群。',
  },
  '20250925-ai-003': {
    published: '2025-09-25T19:33:50+08:00',
    title: '腾讯数字支教志愿者招募转发通知',
    description: '现转发省青基会腾讯数字支教志愿者招募说明，请各班委面向班级积极转发和动员，鼓励有意向同学报名参与公益志愿服务。',
  },
  '20250925-ai-004': {
    published: '2025-09-25T22:13:42+08:00',
    title: '团委三项名单文件发布通知',
    description: '团委发布入团发展对象名单、青蓝之星骨干培训结业名单及优秀学员表彰决定，请相关班级与同学及时查收附件并按要求后续跟进。',
  },
  '20250927-ai-001': {
    published: '2025-09-27T12:55:10+08:00',
    title: '赣青二课账号与班级信息采集通知',
    description: '为完成赣青二课账号创建与信息修订，请25级、24级及22-23级按要求分类提交模板。所有材料需在9月29日17:00前发送至对应邮箱。',
  },
  '20250928-ai-001': {
    published: '2025-09-28T11:45:53+08:00',
    title: '第九届武术套路锦标赛报名通知',
    description: '学校启动武术套路锦标赛报名，各班请按规程完成资格审核与报名汇总。报名截止10月16日，赛事计划于10月23日至25日在瑶湖校区举行。',
  },
  '20250928-ai-002': {
    published: '2025-09-28T11:47:45+08:00',
    title: '第九届武术散打锦标赛报名与称重通知',
    description: '武术散打锦标赛开放报名，需按要求提交报名材料并完成保险准备。报名截止10月16日，10月21日统一称重检录，10月23日正式开赛。',
  },
  '20250928-ai-003': {
    published: '2025-09-28T12:53:05+08:00',
    title: '赣青二课信息二次提交通知',
    description: '因系统导入要求调整，前序提交数据需按新口径重新整理并提交。请各年级班委在9月29日17:00前按新版模板发送材料至最新指定邮箱。',
  },
  '20250929-ai-001': {
    published: '2025-09-29T19:16:59+08:00',
    title: '挑战杯立项申报材料补交通知',
    description: '第十五届挑战杯校内选拔赛立项申报进入补充提交阶段，请各项目团队完善材料后统一发送至指定邮箱，截止时间为10月8日18:00。',
  },
  '20250930-ai-001': {
    published: '2025-09-30T22:23:02+08:00',
    title: '校内自习室管理志愿者招募通知',
    description: '学校面向瑶湖校区在校学生招募“许梦亭”“鹏霄轩”自习室管理志愿者，报名时间为10月2日至10月7日，具体要求详见附件。',
  },
};

const run = async () => {
  for (const [id, meta] of Object.entries(META)) {
    const filePath = path.join(CARD_DIR, `${id}.md`);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);

    const attachments = Array.isArray(parsed.data.attachments) ? parsed.data.attachments : [];
    const images = attachments
      .filter((item) => item && typeof item === 'object' && String(item.type || '').toLowerCase() === 'image' && String(item.url || '').trim())
      .map((item) => String(item.url).trim());

    parsed.data.title = meta.title;
    parsed.data.description = meta.description;
    parsed.data.published = meta.published;
    parsed.data.tags = ['学生通知'];
    parsed.data.cover = images[0] || '';

    let content = String(parsed.content || '').trim();
    content = content.replace(/\n\n!\[[^\]]*\]\((file:\/\/[^)]+)\)\s*$/g, '').trim();
    if (images.length > 0) {
      const imageLines = images.map((url, index) => `![通知配图${index + 1}](${url})`).join('\n');
      content = `${content}\n\n${imageLines}`.trim();
    }

    const next = matter.stringify(`${content}\n`, parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
  }

  console.log(`Refined ${Object.keys(META).length} imported September cards.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
