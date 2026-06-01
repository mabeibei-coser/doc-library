# 安防文档库（doc-library）

安全隐患域的**独立文档库积木**。提供安全规范 / 应急预案 / 检查表模板的搜索与下载。

谁在用 / 用在哪：安全隐患域的 C 端用户（与隐患识别 A600、会员中心 asg100 同一套登录）。文档分**免费档 / VIP 档**，下载时向会员中心(asg100)"刷卡"问 VIP 状态。

## 架构定位

```
用户 → 文档库前台（搜索/下载） → 后端守门：free=登录可下 / vip=问中心要 isVip
                                      ↑ 共享 cookie 解 phone
        会员中心(asg100) ←─ HTTP /api/membership/me ─┘
        admin-hub 后台 ──HTTP+secret──→ 内部 admin 接口（建/改/删文档，本库自己写）
```

- **不存会员数据**：是不是 VIP 全问中心，零会员逻辑。
- **自己的数据**：documents（文档）+ document_downloads（下载记录）两张表。
- **登录态**：用中心签发的共享 cookie `asg_member_session` 只读解析。

## 怎么跑起来

```bash
npm install
npm run dev   # vite :3002 + api :4003
```

需要会员中心(asg100)在 :4002 跑着（下载 vip 档要问它）。
env 见 `.env.local`：`ASG_MEMBER_SESSION_PASSWORD`（与中心一致）、`ASG_CENTER_BASE_URL`、`DOC_ADMIN_SECRET`。

## 关键接口

| 接口 | 说明 |
|---|---|
| `GET /api/documents?category=&q=` | 列表 + 搜索（公开） |
| `GET /api/documents/:id/download` | 下载，后端守门 free/vip |
| `POST /api/admin/upload` | 传附件/预览图（需 `x-admin-secret`） |
| `POST/PUT/DELETE /api/admin/documents` | 文档 CRUD（需 `x-admin-secret`，供 admin-hub 调用） |

## 部署

已上线：https://h100.jsai100.com/a800/（端口 4003，nginx 子路径 `/a800/`）。生产 env 模板见 `deploy/env.production.example`，更新部署说"部署"走 tencent-deploy 流程。
