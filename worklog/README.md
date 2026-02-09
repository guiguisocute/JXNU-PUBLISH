# Worklog Directory

这个目录用于 bot 的每日运行日志。

- 文件命名：`YYYY-MM-DD.md`
- 每日一个文件，不覆盖历史
- 建议在 21:00 任务执行后立即写入

## Minimal Template

```md
# Bot 工作日志 YYYY-MM-DD

## 运行信息
- 时间窗口: [YYYY-MM-DD 21:00:00, YYYY-MM-DD 20:59:59]
- 执行时间: YYYY-MM-DD HH:mm:ss +08:00

## 统计
- 扫描消息数: 0
- 合并后通知数: 0
- 新增卡片数: 0
- 重复跳过数: 0

## 自动补全字段（需复核）
- card_id: 字段 -> 原因

## 映射兜底
- card_id: unknown（原因）

## 截止时间识别失败
- card_id: 原文片段

## 构建结果
- 命令: pnpm run build:content
- 状态: 成功 | 失败
- 详情: ...

## Git 推送
- 目标分支: test
- 提交哈希: <commit>
- 推送状态: 成功 | 失败
```
