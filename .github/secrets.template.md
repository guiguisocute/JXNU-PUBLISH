# GitHub Actions Secrets Template

在仓库中按以下路径添加：

- `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

## Required

| Name | Value format | Example |
| --- | --- | --- |
| `SITE_URL` | 站点完整 HTTPS 地址，不带末尾 `/` | `https://news.example.com` |
| `DEPLOY_HOST` | 服务器 IP 或域名 | `123.123.123.123` |
| `DEPLOY_PORT` | SSH 端口数字字符串（留空默认 22） | `22` |
| `DEPLOY_USER` | SSH 登录用户 | `deploy` |
| `DEPLOY_PATH` | 服务器静态目录绝对路径（必须是站点根目录本身，不是其父目录） | `/var/www/jxnu-publish/index` |
| `DEPLOY_SSH_KEY` | OpenSSH 私钥全文，多行原样粘贴 | 见下方示例 |

## `DEPLOY_SSH_KEY` format example

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
...
-----END OPENSSH PRIVATE KEY-----
```

## Optional (for later notifications)

| Name | Value format |
| --- | --- |
| `TG_BOT_TOKEN` | Telegram Bot Token |
| `TG_CHAT_ID` | Telegram Chat ID |

## Main branch deploy (required for `.github/workflows/deploy-main.yml`)

| Name | Value format | Example |
| --- | --- | --- |
| `PROD_SITE_URL` | main 环境站点完整 HTTPS 地址，不带末尾 `/` | `https://www.example.com` |
| `PROD_DEPLOY_HOST` | main 环境服务器 IP 或域名 | `123.123.123.123` |
| `PROD_DEPLOY_PORT` | main 环境 SSH 端口数字字符串（留空默认 22） | `22` |
| `PROD_DEPLOY_USER` | main 环境 SSH 登录用户 | `azureuser` |
| `PROD_DEPLOY_PATH` | main 环境静态目录绝对路径 | `/opt/1panel/www/sites/www.example.com/index` |
| `PROD_DEPLOY_SSH_KEY` | main 环境 OpenSSH 私钥全文，多行原样粘贴 | 同上方私钥格式 |

## Notes

- Secret 的值不要额外加引号。
- `DEPLOY_SSH_KEY` 必须是私钥，不是公钥（`.pub`）。
- 请先确保服务器上目标目录已存在，且 `DEPLOY_USER` 对目录有写权限。
- 若目录下有 `ssl/`、`log/` 等非静态文件，说明你可能把 `DEPLOY_PATH` 填成了父目录，请改成真正的网站静态目录。
- `PROD_*` 与 `DEPLOY_*` 建议使用不同目录，避免 test 发布覆盖 main 站点。
