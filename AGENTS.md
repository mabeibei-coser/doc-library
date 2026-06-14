# doc-library (A800) — Agent 操作说明

> 给任意 AI（Claude / Codex / 其它）接管本项目用的**单一事实源**。`CLAUDE.md` 用 `@AGENTS.md` 引入本文件，所以改这里两个模型同时更新。
> 本文件只放「动手前必须知道的」；完整产品介绍 / API / 架构图 / 接口列表见 `README.md`，不在此重复。

## 一句话

安防文档库：安全规范 / 应急预案 / 检查表模板的搜索与下载（免费档 / VIP 档）；**一库管两域**，按文档 `category` 路由 VIP 校验（`人才ATA` → ATA100，其它 → ASG100）。线上 `https://h100.jsai100.com/a800/`，GitHub `mabeibei-coser/doc-library`。

## 技术栈（一行）

React 18 + Vite 5 + MUI 9（@mui/material + @emotion）前端 ｜ Node + Express + better-sqlite3 + iron-session 后端 ｜ multer 上传 + @napi-rs/canvas 预览图生成 + pdfjs-dist + docx-preview + xlsx。

## 本机怎么跑

```bash
npm install
cp .env.local.example .env.local      # 首次：填下方必填项
npm run dev                            # 并发起 vite(:3002) + node server.js(:4003)
```

> **依赖服务**：下载 VIP 档时后端会向会员中心刷卡，需要 ASG100 在 `:4002`（ASG 类文档）、ATA100 在 `:4004`（`人才ATA` 类文档）跑着。只跑前端 / 免费文档不需要。

## env 必填

| 变量 | 说明 | 缺失影响 |
|---|---|---|
| `ASG_MEMBER_SESSION_PASSWORD` | 共享 cookie 密钥（**必须与 asg100 完全一致**） | ASG 域用户拿不到 phone → 下载报 401 |
| `ATA_MEMBER_SESSION_PASSWORD` | 共享 cookie 密钥（**必须与 ata100 完全一致**） | ATA 域用户拿不到 phone → 下载报 401 |
| `DOC_ADMIN_SECRET` | 内部 admin 接口共享密钥（供 admin-hub 调用） | admin-hub 无法写入/改/删文档 |

其余（`ASG_CENTER_BASE_URL` / `ATA_CENTER_BASE_URL` / `VITE_CENTER_URL` / `VITE_ATA_CENTER_URL` / `DOC_API_PORT` / `VITE_BASE_PATH` / `ASG_COOKIE_SECURE`）有默认值，本地开发不改也能跑，子路径 / 跨机部署才需改，见 `.env.local.example`。

## 动手红线（本项目特定 + 全局红线）

- **一库管两域，session 密钥有两套**：`ASG_MEMBER_SESSION_PASSWORD` 和 `ATA_MEMBER_SESSION_PASSWORD` 必须和各自中心完全一致，填错一个就整域用户登录失效（不会有 JS 报错，只有 401）。
- **VIP 路由按 category 字段分叉**：`人才ATA` → ATA100，其它 → ASG100；改文档分类时留意 VIP 刷卡对象也随之切换。
- **`data/doc-library.db` 不做测试用途**：测试只用临时数据库或 stub，绝不动生产库（全局数据红线）。
- **改 basePath / 子路径 / cookie path 这类全局配置** → 必须联动改 `VITE_BASE_PATH`（前端资源前缀）+ 重新 `npm run build`，光 `pm2 restart` 白屏。
- **客户端 `fetch` 必须 base-aware**：用 `import.meta.env.BASE_URL` 拼 API 路径，否则子路径部署后所有 `/api` 请求 404。
- **`.env.local` 必须 gitignored**，绝不 commit 任何密钥（全局安全红线）。

## 详细信息指针

- 架构 / 接口 / 数据表 / 文档分类 → `README.md`
- 部署（参数 + 发版步骤）→ `DEPLOY.md`
- admin-hub 接入 → 跑 `admin-hub-add-project` skill

## 继承

- 全局用户偏好 + 安全红线：`~/.claude/CLAUDE.md`（Claude）/ `~/.codex/AGENTS.md`（Codex）
- Coding 通用原则（Karpathy 4 条）：`../CLAUDE.md`
