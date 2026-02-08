# content 数据规范

更新时间：2026-02-08（v4）

## 1. 总原则

- 内容源全部来自仓库 Markdown。
- 构建时完成类型校验与映射生成，不在运行时做复杂解析。
- 前端只消费 `generated/` 产物。

## 2. 分层模型（冻结）

- `origin`：原文层（完整正文、来源信息、附件等）。
- `card`：展示层（卡片摘要与列表展示字段 + 详情正文）。
- `post`：废弃（历史遗留，不再作为有效输入层）。

## 3. 目录建议

```text
content/
  origin/
    <id>.md
    attachments/
      ...
  card/
    <id>.md
```

> 注：允许逐步从现有目录迁移，不要求一次性搬完。

## 4. 主键与关联

- 采用 frontmatter 显式 `id` 作为唯一主键。
- `card.id` 必须与 `origin.id` 对应。
- 不依赖“文件同名”作为唯一关联规则（可作为辅助约束）。
- 关联键只使用 `id`，不再使用 `origin_id`。

## 5. 字段规范（建议最小集）

### 5.1 `content/origin/<id>.md`

```yaml
---
id: "20260208-csie-001"
title: "【2月8日 通知一】..."
published: "2026-02-08T09:30:00+08:00"
source:
  channel: "2024级计信通知群"
  sender: "张三"
attachments:
  - name: "报名表.docx"
    url: "./attachments/报名表.docx"   # 相对路径
  - name: "活动细则"
    url: "https://example.com/a.pdf" # 绝对路径
---
```

正文放在 frontmatter 之后。

### 5.2 `content/card/<id>.md`

```yaml
---
id: "20260208-csie-001"
school_slug: "csie"
title: "【2月8日 通知一】..."
description: "列表摘要"
published: "2026-02-08T09:30:00+08:00"
category: "党团通知与组织事务"
tags: ["团学工作", "截止提醒"]
pinned: false
cover: "https://..." # 可选，无封面时留空或省略
---

这里是详情正文（用于卡片点开后的内容）。

支持 Markdown 正文、附件引用、分段小标题。
```

> 冻结规则：详情正文优先使用 `card` 内容，不从 `origin` 回填。

## 6. 附件 URL 规则（冻结）

- 同时支持：
  - 仓库相对路径（`./attachments/...`）
  - 外链绝对 URL（`https://...`）
- 前端渲染时按 `url` 原样使用，不强制代理。
- 详情 UI 规则：附件区独立渲染，位置在正文前。

## 7. 构建映射链路（冻结）

- 脚本目录：`scripts/`
- 输出目录：`generated/`

建议产物：

- `generated/content-data.json`
  - 规范化后的卡片数据 + 详情数据映射
- `generated/search-index.json`
  - 标题+正文全文索引（第一阶段单文件）
- `generated/content-data.ts`
  - 与 JSON 同步的 TypeScript 导出（带类型）
- `generated/search-index.ts`
  - 搜索索引的 TS 导出（便于类型约束与按需加载）

说明：搜索交互采用“全站实时检索 + 当前视图过滤”，不新增 `/search` 页，但索引产物保留用于快速检索。

命名约束：以上文件名固定，不追加版本后缀。

## 8. 校验与失败策略

- 任何 `id` 缺失、重复、关联不到 `origin` 的 `card` 均视为构建失败。
- `published` 非法时间格式视为构建失败。
- 附件对象缺 `name` 或 `url` 视为构建失败。
- `school_slug` 缺失或不在白名单时视为构建失败。

## 9. 后续演进（已约定）

- 搜索索引从“单文件”升级为“按学院拆分”。
- 附件从“仓库为主”逐步迁移为“仓库+外链混合”。
