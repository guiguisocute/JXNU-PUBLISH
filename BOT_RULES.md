# Telegram Content Bot Rules

本规则定义了 bot 每日 21:00 自动整理并写入 `content/` 的执行标准。目标是稳定产出可编译的卡片数据，同时保留完整可追踪日志。

## Scope And Schedule

- 执行时刻：每天 21:00（`Asia/Shanghai`）。
- 统计窗口：`[前一日 21:00:00, 当日 20:59:59]`。
- 数据来源：Telegram 群中的 QQ 转发消息流。
- 写入方式：直接写入仓库，不走 PR。
- Git 分支要求：所有 bot 自动写入与提交仅允许在 `test` 分支进行，并推送到远端 `test` 分支；禁止写入 `main/master`。

## Input Parsing Rules

单条转发通常拆成多段。bot 必须自动合并成一个通知单元。

- **头部识别**：包含 `QQ -> Telegram 转发`、`来源群:`、`发送者:`、`时间:` 的段落视为转发头。
- **正文识别**：头部之后的连续文本段落视为正文候选。
- **附件识别**：正文附近出现的文件名、链接、媒体消息归入同一通知附件集合。
- **空消息过滤**：纯空段落忽略。
- **同通知拼接**：在同一转发会话内的正文和附件必须拼接为一条通知。

## Dedupe Rules

重复通知直接跳过，不新增卡片。

- 去重键建议：`source.channel + source.sender + original_timestamp + body_hash`。
- 若命中重复：跳过写入，并在工作日志记录 `duplicate skipped`。

## Field Generation Rules For Card

目标文件：`content/card/*.md`

Frontmatter 字段必须满足项目编译要求：

- `id`: 按 `YYYYMMDD-school_slug-序号` 生成，确保全局唯一。
- `school_slug`: 按映射表判定；未命中写 `unknown`。
- `school_name`: 与 `school_slug` 对应名称。
- `title`: bot 自主总结（不要求逐字）。
- `description`: bot 自主总结，长度必须在 80~150 字。
- `published`: 使用转发头中的原始时间戳（ISO 可解析格式）。
- `category`: bot 归类。
- `tags`: bot 生成，最多 5 个。
- `pinned`: 固定写 `false`，仅人工后续修改。
- `cover`: 默认空字符串。
- `badge`: 可用项目默认值。
- `extra_url`: 有来源链接时填写，否则空。
- `start_at`: 若识别到限时活动且未识别开始时间，默认填 `published`；否则为空。
- `end_at`: 从正文自动识别截止时间并填入；识别失败可留空。
- `source.channel` / `source.sender`: 从转发头提取。
- `attachments`: 收集到的附件文件名或 URL。

### Card Body Hard Rule

卡片正文（frontmatter 下方正文）必须严格保留转发正文，逐字一致。

- 允许删除：转发头字段（`QQ -> Telegram 转发`、`来源群`、`发送者`、`时间`）和纯空白段。
- 不允许：改写措辞、总结改写、润色、增删正文句子。

## Conclusion Rules

目标文件：`content/conclusion/<school_slug>.md`

- 每天为对应学院 `daily.<YYYY-MM-DD>` 写入总结。
- 每日总结条目数：3~10 条。
- 若当天无有效通知：也必须写入 daily，总结为“今日无有效通知/无新增”。

## School Mapping Rules

按以下顺序判断 `school_slug`：

1. `来源群` 精确映射。
2. `发送者` 映射。
3. 正文关键词映射。
4. 未命中 -> `unknown`。

在规则文件内维护映射表（此处由人工持续更新，若未找到则根据内容灵活联想）：

```md
## School Mapping Table

### By Source Channel
- 转发测试群 -> ai-25-26学年学生干部通知群

### By Sender
- 2024曾梓豪 -> ai

### By Keywords
- 人工智能学院 -> ai
- 公费师范 -> public-funded-normal
```

## Work Log Rules

日志目录：`worklog/`

- 每天一个文件：`worklog/YYYY-MM-DD.md`。
- 至少记录：
  - 当日扫描消息数
  - 合并后的通知数
  - 新增卡片数
  - 跳过重复数
  - 字段联想补全清单
  - 映射未命中清单（含落到 `unknown` 的条目）
  - 截止时间识别失败清单
  - 构建结果（`pnpm run build:content`）
- 日志语言：必须使用中文编写（标题、字段名、说明、结论均为中文）。

## Validation And Output Rules

- 写入完成后必须执行 `pnpm run build:content`。
- 构建成功后，bot 必须将本次变更提交并推送到仓库 `test` 分支。
- 编译失败时：
  - 保留已写文件，不回滚。
  - 记录失败原因到当日日志。
  - 将失败条目标记为 `needs_manual_review`。

## Non-Negotiable Rules

- 不自动设置 `pinned: true`。
- 不脱敏QQ号信息。
- 不修改正文原文内容（除去转发头和空白）。
