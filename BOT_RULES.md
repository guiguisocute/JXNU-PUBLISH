# Telegram Content Bot Rules

本规则用于约束 OpenClaw/Agent 对 `JXNU-PUBLISH` 的自动内容生产行为，目标是：稳定、可追踪、可编译、低人工负担。

## 1. 工作模式

采用双模式并行：

- 持续监控模式（推荐默认）
  - Bot 持续监听 Telegram 汇聚群。
  - 检测到新通知后立即增量处理，不堆积到单一时间点。
  - 每次增量处理控制批大小，避免上下文爆炸。
- 每日对账模式（21:00）
  - 每天 `Asia/Shanghai 21:00` 对当日窗口做一次补漏与一致性检查。
  - 窗口建议：`[前一日 21:00:00, 当日 20:59:59]`。

两种模式都要写工作日志，且都要通过内容校验后再推送。

## 2. 分支与写入边界

- 自动写入只允许推送到 `test` 分支。
- `main` 仅用于人工审核后发布。
- 允许修改：`content/**/*.md`、`worklog/**/*.md`。
- 禁止修改：`config/subscriptions.yaml`、`public/generated/**`、脚本/前端代码。

## 3. 输入解析规则

单条转发可能拆多段，必须合并为一个通知单元：

- 头部：`来源群`、`发送者`、`时间` 等标记段。
- 正文：头部之后的连续文本。
- 附件：正文附近文件/链接/媒体消息。
- 空段落过滤。
- 同会话多段正文与附件必须归并到同一条卡片。

## 4. 去重规则

- 推荐键：`source.channel + source.sender + original_timestamp + body_hash`。
- 命中重复：跳过写入并在 `worklog` 标注 `duplicate skipped`。

## 5. Card 生成规则

目标目录：`content/card/**/*.md`。

### 5.1 两阶段要求（强制）

- 阶段一（脚本）：只做模板落盘与原文拼接。
- 阶段二（LLM）：逐条补语义字段。
- 严禁脚本批量生成：`title`、`description`、`category`、`tags`、`start_at`、`end_at`。

### 5.2 字段规则（当前项目口径）

- 必填：`id`、`school_slug`、`title`、`description`、`published`、`source`。
- `subscription_id` 由编译器自动推导：`school_slug + source.channel`。
- `school_slug` 缺失或非法：自动回退 `unknown`。
- `source.channel` 缺失：回退到 `未知来源`。
- `source.channel` 存在但匹配不到订阅：回退到 `{school_slug}-未知来源`。
- `pinned` 默认 `false`，bot 不得自动置顶。

### 5.3 时间字段

- `published`、`start_at`、`end_at` 统一 ISO8601 且显式 `+08:00`。
- 示例：`'2026-02-01T09:00:00+08:00'`。
- 仅识别到日期时：
  - `start_at` 补 `00:00:00+08:00`
  - `end_at` 补 `23:59:59+08:00`
- 无法可靠判断：`start_at/end_at` 置空，并在 `worklog` 标注 `time_uncertain`。

### 5.4 正文与附件

- 正文必须保留原通知语义，禁止改写事实。
- 可删除转发头与纯空白段。
- 附件优先写入 `frontmatter.attachments`。
- 本地附件必须落盘到 `content/attachments/...`，引用用 `/attachments/...`。
- 允许外链附件（http/https）。

## 6. Conclusion 规则

目标目录：`content/conclusion/<school_slug>.md`。

- 每日写入 `daily.<YYYY-MM-DD>`。
- 每日建议 3~10 条要点。
- 当日无有效通知也必须写：`今日无有效通知/无新增`。

## 7. 学院映射规则

配置只读：`config/subscriptions.yaml`。

订阅字段口径（bot 只读，不改配置）：

- `title`: 用于人类可读订阅名与 `source.channel` 匹配。
- `number`（可选）: 用于同名群人工排查与日志定位，不参与前端展示，不参与 `subscription_id` 推导。
- `url` / `icon` / `enabled` / `order`: 按配置生效。

判定顺序：

1. `来源群` 精确映射
2. `发送者` 映射
3. 正文关键词映射
4. 未命中 -> `unknown`

补充：每个学院都存在 `未知来源` 订阅兜底（由编译器保证）。

当遇到同名群歧义时，bot 处理要求：

- 优先记录并输出 `school_slug + title + number` 三元组到 `worklog`。
- 若上下文仍无法判定，先落入该学院 `未知来源`，并在日志标注 `ambiguous_channel_number`。

## 8. 质量红线

- 标题/描述必须可读、非模板化、非机械截断。
- `description` 建议 50~100 字，覆盖对象、动作、时间约束。
- 标签最多 5 个，建议 2~4 个有效业务标签。
- 禁止正文代码块化污染（`````）。
- 禁止生成与正文矛盾的时间或附件信息。

## 8.1 “补充通知 / 更正通知 / 二次通知”处理规则（强制）

识别关键词（标题或正文命中任一）：`补充通知`、`补充说明`、`更正`、`修正`、`二次通知`、`后续通知`、`附件补发`。

处理原则：

- 若能定位到原通知（同学院 + 同主题 + 时间窗口相近），必须并入原卡片，禁止新建重复卡片。
- 并入时保留原始时间线：在正文末尾新增“补充说明”段，注明补充时间与发送者。
- 新增附件必须并入同一卡片 `attachments`，并做去重（同 URL/同文件名只保留一份）。
- 若补充内容明确改变截止时间、地点、对象或提交方式，必须同步修订 `description`、`tags`、`start_at/end_at`。
- 并入后 `published` 更新为“该通知链最新一条消息时间”，保证列表排序与最新状态一致。

无法确定归属时：

- 不强行并入；先新建临时卡片并在 `worklog` 标注 `needs_merge_review`。
- 在日志中记录候选原卡片 id，等待人工复核后再合并。

## 9. 工作日志规则

目录：`worklog/YYYY-MM-DD.md`（中文）。

至少包含：

- 扫描消息数
- 合并通知数
- 新增/更新卡片数
- 重复跳过数
- unknown 映射清单
- 时间识别失败清单
- 校验与构建结果

## 10. 校验、提交与故障策略

- 写入后必须执行：`pnpm run validate:content`。
- 校验通过再提交并推送 `test`。
- 校验失败：
  - 不回滚文件。
  - 记录失败原因到 `worklog`。
  - 标注 `needs_manual_review`。

## 11. 与 GitHub Actions 联动

当前仓库已由 Actions 负责构建部署：

- `test` push -> `deploy.yml`
- `main` push -> `deploy-main.yml`

Bot 侧建议：

- 增量提交频率可采用“事件触发 + 最短间隔”（例如 3~10 分钟节流）。
- 每次 push 后轮询 workflow 状态。
- 若失败，拉取日志摘要并回传到通知渠道（Telegram/控制台）。
- 每日 21:00 额外做一次全量对账，保证漏消息可补齐。

## 12. 不可协商规则

- 不自动改 `config/subscriptions.yaml`。
- 不自动改代码文件。
- 不自动把 `pinned` 设为 `true`。
- 不覆盖人工编辑的高质量语义字段（除非明确修错）。
