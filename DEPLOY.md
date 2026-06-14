# doc-library (A800) 部署

> 通用腾讯云部署流程（init / update / migrate 全步骤 + 红灯清单 + 踩坑速查 + 服务器直连参数）的**完整权威版在本机 `tencent-deploy` skill**。
> 本文件只记**本项目的部署参数 + 发版概要**，让任意 AI 照着发版；服务器 IP / SSH / nginx 等敏感操作指向 skill，不在此重复（也不进 git）。

## 项目部署参数

| 项 | 值 |
|---|---|
| 线上 | `https://h100.jsai100.com/a800/` |
| 子路径 / basePath | `/a800/`（Vite：`VITE_BASE_PATH=/a800/`） |
| GitHub | `mabeibei-coser/doc-library` |
| PM2 进程名 | `doc-library` |
| 构建 | `npm run build`（= `vite build`） |
| 启动 | `npm start`（= `NODE_ENV=production node server.js`） |
| 端口 | `4003`（`DOC_API_PORT` env，服务器实测 `pm2 describe doc-library` 确认） |

## 发版（update 流程，最常见）

1. 合 main + 用 `Edit` 改 `package.json` version + 打 semver tag + push（`git push origin main && git push origin v<new>`）
2. 服务器：`git pull && npm ci && npm run build && pm2 restart doc-library --update-env`
3. 验证：`curl -sIL --noproxy '*' https://h100.jsai100.com/a800/` 最后一跳必须 `200`；本次改过的 `/api/*` 逐个 curl，非 `404` 即通。

> 服务器直连命令（SSH key 路径 / IP / nginx 成对改 location / 三源 basePath 探测 / 端口分配）全在 `tencent-deploy` skill。本机 Claude 说「部署 A800」即自动走它。

## 本项目部署红线

- **Vite 子路径换值必须重新 build**：改 `VITE_BASE_PATH` 后光 `pm2 restart` 没用，子路径编进 `dist/index.html` 的资源前缀，不 rebuild 会白屏 / 资源 404。
- **客户端 fetch 必须 base-aware**：`import.meta.env.BASE_URL` 拼 API 路径，否则子路径部署后所有 `/api` 请求 404。
- **两套 session 密钥必须与各自中心一致**：生产 `.env.local` 里 `ASG_MEMBER_SESSION_PASSWORD` 和 `ATA_MEMBER_SESSION_PASSWORD` 填错 → 整域用户 401，不会有明显 JS 报错。
- **生产 `.env.local` 在服务器手写**，不进 git（`ASG_MEMBER_SESSION_PASSWORD` / `ATA_MEMBER_SESSION_PASSWORD` / `DOC_ADMIN_SECRET` 等真实值）。
- **部署是红灯操作**：先出 pre-flight 报告（待发布 commit / 版本号 / 服务器实测 basePath+端口），等用户确认 `y` 再动远程。

## 完整流程

本机 Claude：直接触发 `tencent-deploy` skill（自动判定 init / update / migrate，含全部红灯与踩坑防御）。
其它模型：照上方「发版」三步执行，服务器直连参数找用户要或读 `tencent-deploy` skill 文件。
