# JXNU PUBLISH

JXNU PUBLISH 是一个面向江西师范大学多学院的静态通知聚合站。

将项目克隆到服务器后，它可以通过 astrbot 桥接 QQ群 消息源，由部署在服务器的 Agent（如OpenClaw） 自动解析、生成结构化 Markdown 卡片，再经静态编译生成前端数据和 RSS。

当然，在熟悉卡片frontmatter的情况，也可完全不依赖任何AI进行人工手动维护（不推荐）

## 项目目标

- 聚合学院通知与活动，减少信息差。
- 保持内容仓库可审计、可追溯、可自动部署。
- 支持网页阅读、筛选、搜索与 RSS 订阅。

## 端到端链路

```mermaid
flowchart LR
  A[QQ 消息源] --> B[astrbot-QQtoTele 桥接]
  B --> C[archive/YYYY-MM-DD/]
  C --> D[Agent 增量处理]
  D --> E[content/card + conclusion + worklog]
  E --> F[GitHub test/main]
  F --> G[GitHub Actions build]
  G --> H[dist + rss]
  H --> I[远端静态目录]
```

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS
- **UI 组件**：Radix UI + shadcn/ui + Framer Motion
- **内容编译**：Node.js 脚本（gray-matter + marked + yaml）
- **图表**：Recharts
- **内容生产**：可以使用Skill的各种Agent
- **消息桥接**：astrbot-QQtoTele
- **部署**：GitHub Actions + rsync

## 分支与发布策略

- `test`: Bot 自动内容写入与测试环境发布。
- `main`: 人工审核后生产发布。

CI/CD 工作流：

- `.github/workflows/deploy.yml` — `test` push 触发，构建并部署到测试站。
- `.github/workflows/deploy-main.yml` — `main` push 触发，部署到生产目录。支持 `PROD_*` secrets，不填时回退 `DEPLOY_*`。



## 项目结构

```
├── archive/              # 消息归档（astrbot 写入，agent 只读）
│   ├── YYYY-MM-DD/
│   │   ├── messages.md   # 当日结构化消息
│   │   ├── photos/       # 图片附件
│   │   └── files/        # 文件附件
│   └── index/            # 去重索引（astrbot 维护）
├── config/
│   └── subscriptions.yaml  # 学院与订阅配置（唯一来源）
├── content/
│   ├── card/**/*.md      # 通知卡片
│   ├── conclusion/*.md   # 学院每日总结
│   ├── img/              # 卡片图片
│   └── attachments/      # 卡片附件
├── worklog/*.md          # Bot 工作日志
├── scripts/              # 构建与工具脚本
├── components/           # React 前端组件
├── services/             # 前端服务层
├── hooks/                # React hooks
├── public/generated/     # 编译产物（content-data.json）
└── BOT_RULES.md          # Bot 行为规则
```

## Bot 工作模式

Bot 采用 archive 增量处理模式，利用 Skills 完成以下工作：

1. **消息采集**：astrbot-QQtoTele 桥接 QQ群消息到服务器项目目录，落盘为 `archive/YYYY-MM-DD/messages.md`，同时也可同步转发到对应的telegram群组
2. **增量解析**：检测到新日期目录或 messages.md 更新后，解析消息段并合并为通知单元。
3. **去重判定**：与 `content/card/` 已有卡片比对，跳过重复。
4. **卡片生成**：两阶段生成——先模板落盘，再由 LLM 补语义字段（title、description、category、tags、时间）。
5. **补充通知**：识别补充/更正/二次通知，并入原卡片而非新建。
6. **Conclusion 更新**：写入 `content/conclusion/<school_slug>.md` 每日总结。
7. **工作日志**：记录到 `worklog/YYYY-MM-DD.md`。
8. **校验推送**：`pnpm run validate:content` 通过后推送 `test` 分支。

详细规则见 `BOT_RULES.md`。

## 本地开发

```bash
pnpm install
pnpm run dev
```

默认地址：`http://localhost:5173`

要求 Node.js >= 22。

## 构建命令

```bash
pnpm run build:content    # 生成 public/generated/content-data.json
pnpm run build:images     # 生成封面 webp 变体（增量）
pnpm run build:rss        # 生成 public/rss.xml 与 public/rss/*.xml
pnpm run validate:content # 仅校验内容，不写入
pnpm run build            # 完整构建（自动先执行 prebuild）
pnpm run preview          # 预览构建产物
```

## 卡片 frontmatter

每张卡片是一个 Markdown 文件，位于 `content/card/<school_slug>/` 下，文件名格式为 `YYYYMMDD-<school_slug>-<序号>.md`。

`subscription_id` 由编译器根据 `school_slug + source.channel` 自动推导，无需手写。

### 字段说明

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `id` | 是 | string | 卡片唯一标识，格式 `YYYYMMDD-<slug>-<序号>`，如 `20260213-ai-01` |
| `school_slug` | 是 | string | 学院标识，对应 `subscriptions.yaml` 中的 slug，如 `ai`、`chem-eng` |
| `title` | 是 | string | 通知标题，可读、非模板化 |
| `description` | 是 | `>-` 块 | 50~70 字摘要，**必须使用 YAML 折叠块标量 `>-` 语法** |
| `published` | 是 | ISO8601 | 发布时间，显式 `+08:00`，如 `'2026-02-13T12:54:54+08:00'` |
| `source.channel` | 是 | string | 来源群名称，需与 `subscriptions.yaml` 中的订阅 `title` 匹配 |
| `source.sender` | 是 | string | 发送者昵称 |
| `category` | 否 | string | 分类，如 `通知公告`、`问卷填表`、`活动竞赛` 等 |
| `tags` | 否 | string[] | 业务标签，建议 2~4 个，最多 5 个 |
| `pinned` | 否 | boolean | 是否置顶，默认 `false`，Bot 不得自动置顶 |
| `cover` | 否 | string | 封面图路径，如 `/img/init-jan/xxx.jpg`。多图时取第一张 |
| `badge` | 否 | string | 角标文本 |
| `extra_url` | 否 | string | 外部链接 |
| `start_at` | 否 | ISO8601 | 活动/截止开始时间，仅日期时补 `00:00:00+08:00` |
| `end_at` | 否 | ISO8601 | 活动/截止结束时间，仅日期时补 `23:59:59+08:00` |
| `attachments` | 否 | array | 附件列表（文件/图片路径或外链） |

### 完整示例

```yaml
---
id: 20260213-ai-01
school_slug: ai
title: "关于智慧团建系统各专题学习录入的通知"
description: >-
    智慧团建系统上线"贺信精神"等多个专题学习。各团支部需组织团员学习并于本周五19:00前完成录入，
    注意录入时间分布，确保录入工作常态化。
published: '2026-02-13T12:54:54+08:00'
category: "通知公告"
tags: ["智慧团建", "理论学习", "专题录入"]
pinned: false
cover: ""
start_at: '2026-02-13T00:00:00+08:00'
end_at: '2026-02-13T19:00:00+08:00'
source:
  channel: 22-24级团支书
  sender: 可爱归归
attachments: []
---

各位团支书:
    你们好!
    智慧团建系统内相关专题学习已上线，请各团支部积极组织团员开展学习...
```

### 时间字段规则

- 所有时间统一 ISO8601 格式，显式 `+08:00` 时区。
- 仅识别到日期时：`start_at` 补 `00:00:00`，`end_at` 补 `23:59:59`。
- 仅提及开始时间未明确结束时间：`end_at` 默认 `start_at + 2 小时`。
- 无法可靠判断时间：置空，worklog 标注 `time_uncertain`。

### 补充通知处理

`补充通知`、`更正通知`、`二次通知` 等优先并入原卡片，不新建重复卡片。并入后 `published` 更新为通知链最新时间，同步更新附件和时间字段。

## 部署与环境变量

核心 secrets（测试环境）：

- `SITE_URL`
- `DEPLOY_HOST` / `DEPLOY_PORT` / `DEPLOY_USER` / `DEPLOY_PATH` / `DEPLOY_SSH_KEY`

生产环境使用 `PROD_*` 对应变量。

## RSS 地址

- 全站：`/rss.xml`
- 分学院：`/rss/<school_slug>.xml`

## License

[MIT](./LICENSE)
