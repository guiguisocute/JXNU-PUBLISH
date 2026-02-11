# JXNU PUBLISH

JXNU PUBLISH 是一个基于 React + Vite 的静态通知聚合站，面向江西师范大学多学院场景。

项目采用 **Markdown 内容源 + 编译产物** 模式：

- 在 `content/card` 维护通知卡片
- 在 `content/conclusion` 维护学院总结与按日总结
- 通过 `config/subscriptions.yaml` 严格定义订阅结构
- 通过脚本编译为前端可直接加载的 `public/generated/*.json`
- 前端按学院、日期、标签和时效状态进行浏览与筛选

---

## 功能特性

- 学院维度通知聚合（含学院汇总流与频道流）
- 右侧日历筛选、标签统计、时效过滤（仅限时/隐藏过期）
- 通知详情弹层（支持前后切换、分享链接、附件展示）
- 预编译搜索索引（标题 + 描述 + 正文纯文本）
- Markdown 内容编译与严格字段校验（frontmatter）

---

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Radix UI
- Framer Motion
- gray-matter + marked（内容编译）

---

## 本地开发

### 1) 安装依赖

```bash
pnpm install
```

### 2) （可选）生成示例内容

```bash
pnpm run generate:sample
```

### 3) 编译内容

```bash
pnpm run build:content
```

### 3.1) 生成 RSS（全站 + 分学院）

```bash
pnpm run build:rss
```

### 4) 启动开发服务器

```bash
pnpm run dev
```

默认地址：`http://localhost:5173`

---

## 构建与预览

```bash
pnpm run build
pnpm run preview
```

说明：`build` 前会自动执行 `prebuild`（内容编译 + RSS 生成）。

当前 `prebuild` 会自动执行：

- `pnpm run build:content`
- `pnpm run build:rss`

可选环境变量：

- `SITE_URL`（推荐）或 `RSS_SITE_URL`
  - 用于生成 RSS 里的绝对链接。
  - 未设置时默认使用 `https://jxnu-publish.vercel.app`。

---

## 内容目录说明

- `content/card/**/*.md`：通知卡片正文与 frontmatter（建议按学院 slug 分子目录管理）
- `content/conclusion/*.md`：学院总结与 `daily` 按日总结
- `config/subscriptions.yaml`：订阅结构与学院映射（唯一配置源）
- `public/generated/*.json`：前端运行时加载数据
- `public/covers/*`：由 `content/card/covers` 同步的封面资源

---

## 订阅配置结构

`config/subscriptions.yaml` 采用“学院包裹订阅源”的层级结构：

- 学院层字段：`slug`、`name`、`short_name`、`order`、`icon`
- 订阅层字段：`title`、`url`、`icon`、`enabled`、`order`
- `subscription_id` 由编译脚本自动生成，不在 YAML 手写：
  - 优先使用 `url` 参与拼接
  - `url` 为空时使用 `title`
  - 规则：`<school_slug>-<slugify(url 或 title)>`

示例：

```yaml
version: 2
schools:
  - slug: ai
    name: 人工智能学院
    short_name: 计信院
    order: 10
    icon: ""
    subscriptions:
      - title: 25-26学年学生干部通知群
        url: ""
        icon: ""
        enabled: true
        order: 30
```

说明：`order` 为学院内排序；若同一学院下两个订阅生成出相同 id，编译会直接报错。

---

## 卡片 Frontmatter 示例

```md
---
id: "20260201-ai-001"
school_slug: "ai"
subscription_id: "ai-25-26学年学生干部通知群"
school_name: "人工智能学院"
title: "示例通知"
description: "通知摘要"
published: 2026-02-01T09:00:00+08:00
category: "通知公告"
tags: ["报名事项", "截止提醒"]
pinned: false
cover: ""
badge: ""
extra_url: ""
start_at: ""
end_at: ""
source:
  channel: "示例频道"
  sender: "示例发送方"
attachments: []
---

通知正文（Markdown）
```

---

## 部署

项目已包含 `vercel.json`，可直接部署到 Vercel（静态前端 + SPA rewrites）。

最简流程：

1. 推送代码到 GitHub
2. 在 Vercel 导入仓库
3. Build Command 使用默认（`pnpm run build`）
4. Output Directory 为 `dist`

---

## RSS 订阅地址

- 全站：`/rss.xml`
- 分学院：`/rss/<school_slug>.xml`
  - 示例：`/rss/ai.xml`

---

## License

[MIT](./LICENSE)
