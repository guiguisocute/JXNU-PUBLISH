# Telegram Content Bot Rules

本规则定义了 bot 每日 21:00 自动整理并写入 `content/` 的执行标准。目标是稳定产出可编译的卡片数据，同时保留完整可追踪日志。

## Scope And Schedule

- 执行时刻：每天 21:00（`Asia/Shanghai`）。
- 统计窗口：`[前一日 21:00:00, 当日 20:59:59]`。
- 数据来源：Telegram 群中的 QQ 转发消息流。
- 写入方式：直接写入仓库，不走 PR。
- Git 分支要求：所有 bot 自动写入与提交仅允许在 `test` 分支进行，并推送到远端 `test` 分支；禁止写入 `main/master`。
- 可修改范围：仅允许修改 `content/**/*.md` 与 `worklog/**/*.md`。
- 禁止修改：`config/subscriptions.yaml`、`generated/**`、`public/generated/**` 与任何脚本/代码文件。

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
- `subscription_id`: 必填，且必须与 `config/subscriptions.yaml` 中配置一一对应（由配置中的 `url` 优先、否则 `title` 自动拼接生成）。
- `school_name`: 与 `school_slug` 对应名称。
- `title`: bot 自主总结（不要求逐字）。
- `description`: bot 自主总结，长度必须在 50~100 字，要求简练干脆。
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

### 标题与描述质量红线（重点）

- 标题与描述必须先“理解原通知意图”再写，禁止模板化拼接、关键词硬凑、机械截断。
- 标题应可直接面向访客阅读，优先表达“事件+动作/要求”（例如：报名、提交、提醒、征集、培训）。
- 描述必须完整覆盖核心对象、事项和时间要求，确保离开正文也能快速理解通知重点。
- 描述采用新闻摘要语体，禁止出现“大家好/你们好/同学们好”等口语开场。
- 若任一卡片标题或描述出现明显口语残片、句子截断、重复拼接，视为构建前必须修复的错误。

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

学院与订阅映射由 `config/subscriptions.yaml` 固定定义，bot 只读不可改。

配置结构约束（供识别与校验使用）：

- `schools` 为数组，每个学院下包含 `subscriptions` 数组。
- 学院层可维护 `icon`；订阅层可维护 `icon`。
- 订阅层仅使用 `title`、`url`、`icon`、`enabled`、`order` 等字段。
- 不使用 `sub-title` 字段。
- `subscription_id` 不手写：由编译器按 `url` 优先、否则 `title` 自动生成。

按以下顺序判断 `school_slug`：

1. `来源群` 精确映射。
2. `发送者` 映射。
3. 正文关键词映射。
4. 未命中 -> `unknown`。

映射表由人工维护在配置文件中，bot 不得改动配置：

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

- 写入完成后必须执行 `pnpm run validate:content`（仅校验，不生成产物）。
- 构建成功后，bot 必须将本次变更提交并推送到仓库 `test` 分支。
- 编译失败时：
  - 保留已写文件，不回滚。
  - 记录失败原因到当日日志。
  - 将失败条目标记为 `needs_manual_review`。

## Non-Negotiable Rules

- 不自动设置 `pinned: true`。
- 不脱敏QQ号信息。
- 不修改正文原文内容（除去转发头和空白）。
- 不改订阅配置与编译产物文件。

## 历史搬运踩坑记录

- `init-sept` 历史手动搬运时，若缺少转发头字段（来源群/发送者等）可忽略，不作为阻断条件。
- 该批测试数据默认订阅源固定写入 `25-26学年学生干部通知群`，对应 `subscription_id` 为 `ai-25-26学年学生干部通知群`。
- 旧消息里的 Windows 本地图片路径（如 `file://D:\...`）必须规范化为 URL 形式（`file:///D:/...`），否则 frontmatter YAML 会因转义字符报错。
- `[文件]` 占位符在历史文本中仅表示有附件，搬运时按顺序关联同目录文件并写入 `attachments`。
- 图片不能只放在 `attachments`：需要同时写入正文 Markdown；若同一通知有多张图，正文按顺序全部展示。
- 封面策略：若通知含图片，默认取第一张图片 URL 写入 `cover`。
- 历史搬运的图片不能保留本机 `file://` 路径，必须复制进仓库（如 `content/img/init-sept/`）并用站内相对路径（如 `/img/init-sept/xxx.jpg`）引用。
- 历史附件链接同样使用站内相对路径（如 `/init-sept/file/xxx.pdf`），避免本地绝对路径失效。
- 历史搬运卡片不要打 `历史搬运` 标签；仅保留实际业务标签。
- 标题与描述必须人工可读化重写：
  - 标题不使用“几月几日通知几”等流水头。
  - 描述面向全校访客，用精炼语言概括核心信息、对象与截止时间。
  - 禁止直接拼接原文前半段或机械截断；标题与描述必须是重新组织后的可读表达。
- 分类与标签不能偷懒：
  - 不允许所有卡片都写成 `通知公告 + 学生通知`。
  - 禁止把 `学生通知` 作为默认兜底标签反复复用；仅在确有必要时作为辅标签出现。
  - 必须基于内容语义做联想归类（如竞赛、志愿、二课、填表等）。
  - 每条至少 2 个有效业务标签（推荐 3~4 个），标签应体现主题、动作和对象。
  - 若确实无法判断，先在工作日志标注 `category/tag_uncertain`，并在下一轮人工确认。
- 只要正文出现明确“xx前/截止时间”，必须提取并填写 `end_at`；限时活动若无开始时间，`start_at` 默认填 `published`。
- 若出现“通知一补充通知”等后续消息，需并入原通知正文与附件，不新建重复卡片。
- 历史批量消息中可能夹杂 `金山文档|WPS云文档` 之类外链提示，应并入上一条通知正文，不单独生成无效通知。
- 历史文本里可能混入其他发送者（如 `Victor`、`21℃`）的新通知；必须按“发送者+时间戳+通知头”重新切分，禁止把后续通知串进上一条正文。
- 附件映射必须逐条核对：若某条通知漏挂 `[文件]`，会导致后续附件整体错位；出现该情况时应优先修正当条附件，再回查后续通知链。
- 对历史原文做 Markdown 可读化时，只允许“插入式排版”（加换行/列表等），不得删除原文字符；同时避免破坏 `![图片]()`、密码串等原始文本结构。
- 正文 Markdown 修饰阶段禁止使用代码块语法（```）；历史通知正文只允许段落、列表、强调、链接、图片等常规文本语法。
- 附件最终口径以 `frontmatter.attachments` 为准；需将正文中可识别的图片/链接/分享项反写回 `attachments`，避免“正文有附件但弹层无附件”。
- 学院院徽统一使用 `content/img/schoolicon/*.png`；若存在同名 `.jpg` 与 `.png`，配置必须绑定 `.png`，并删除旧 `.jpg` 文件。
