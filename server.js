import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const { default: express } = await import("express");
const { default: multer } = await import("multer");
const { getSession } = await import("./lib/session.js");
const { getDb } = await import("./lib/db.js");
const docs = await import("./lib/documents.js");
const { generatePreviews } = await import("./lib/previewGenerator.js");
const { signDownloadToken, verifyDownloadToken } = await import("./lib/download-token.js");

const PORT = Number(process.env.DOC_API_PORT || process.env.PORT) || 4003;
const CENTER_BASE_URL = process.env.ASG_CENTER_BASE_URL || "http://localhost:4002";
const ADMIN_SECRET = process.env.DOC_ADMIN_SECRET || "";

const DATA_DIR = path.join(__dirname, "data");
const ATTACH_DIR = path.join(DATA_DIR, "doc-attachments");
const PREVIEW_DIR = path.join(DATA_DIR, "doc-previews");
fs.mkdirSync(ATTACH_DIR, { recursive: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));

// 解共享 cookie 拿 phone（中心是唯一签发者）
function requireSession(handler) {
  return async (req, res) => {
    const session = await getSession(req, res);
    if (!session.phone) {
      return res.status(401).json({ error: "请先登录", needLogin: true });
    }
    req.session = session;
    return handler(req, res);
  };
}

// 问会员中心：这人是不是 VIP（转发 cookie）。失败 fail-closed（非 VIP）。
async function fetchIsVip(req) {
  try {
    const resp = await fetch(`${CENTER_BASE_URL}/api/membership/me`, {
      headers: { cookie: req.headers.cookie || "" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return !!data.isVip;
  } catch (err) {
    console.error("[doc] 查 VIP 失败:", err?.message || err);
    return false;
  }
}

// 校验后台内部接口的共享 secret
function requireAdminSecret(req, res, next) {
  if (!ADMIN_SECRET) return res.status(500).json({ error: "DOC_ADMIN_SECRET 未配置" });
  const got = req.headers["x-admin-secret"];
  if (got !== ADMIN_SECRET) return res.status(403).json({ error: "无权访问" });
  next();
}

// ════════════ HTML 错误页（下载流不该返 JSON，否则浏览器把 JSON 当页面渲染）════════════
// 用户在「在浏览器中打开」后跨进程访问，没 cookie → 返友好 HTML，引导回微信
function htmlPage(title, inner) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;padding:48px 24px;background:#f4f3ee;color:#1a1815;text-align:center;margin:0;min-height:100vh;box-sizing:border-box}.icon{font-size:64px;margin-bottom:16px}h1{font-size:20px;font-weight:700;margin:8px 0 16px}p{font-size:14px;line-height:1.7;color:#6b6962;max-width:320px;margin:0 auto 8px}.hint{background:#fff;border-radius:12px;padding:20px 24px;margin:24px auto;max-width:320px;text-align:left;box-shadow:0 1px 3px rgba(0,0,0,.04)}.hint p{margin:6px 0;max-width:none}.hint b{color:#1f7a4d}</style></head><body>${inner}</body></html>`;
}
const htmlLoginPrompt = () => htmlPage("登录已失效", `<div class="icon">🔒</div><h1>登录已失效</h1><p>下载链接已过期（10 分钟）或您未在微信内登录。</p><div class="hint"><p><b>请回到微信内重新打开：</b></p><p>1. 关闭这个浏览器标签</p><p>2. 回到微信</p><p>3. 重新打开文档并点击「下载文档」</p></div>`);
const htmlVipPrompt = () => htmlPage("VIP 专享", `<div class="icon">👑</div><h1>该文档为 VIP 专享</h1><p>请回到微信内开通 VIP 后下载。</p>`);
const htmlNotFound = (msg) => htmlPage("文件不存在", `<div class="icon">❌</div><h1>${msg}</h1>`);

// ════════════ 前台：列表 / 分类 / 详情 ════════════

app.get("/api/documents", (req, res) => {
  // admin-hub 管理端调用时带 x-admin-secret（看全部分类）；浏览器公开前台没有，按 publicScope 隐藏其它业务域。
  const isAdmin = !!ADMIN_SECRET && req.headers["x-admin-secret"] === ADMIN_SECRET;
  const publicScope = !isAdmin;
  const items = docs.listDocuments({
    category: req.query.category,
    subcategory: req.query.subcategory,
    requiredTier: req.query.requiredTier,
    q: req.query.q,
    publicScope,
  });
  res.json({ items, categories: docs.listCategories({ publicScope }) });
});

app.get("/api/documents/:id", (req, res) => {
  const doc = docs.getDocumentPublic(Number(req.params.id));
  if (!doc) return res.status(404).json({ error: "文档不存在" });
  res.json(doc);
});

// 查看计数：每次点开预览就 +1，不去重（1 个人点 5 次就 +5）。
// 不强制登录——未登录也允许计数，phone 留空串。
app.post("/api/documents/:id/view", async (req, res) => {
  const doc = docs.getDocumentRaw(Number(req.params.id));
  if (!doc || doc.status !== "published") return res.status(404).json({ error: "文档不存在" });
  const session = await getSession(req, res);
  docs.recordView(session?.phone || "", doc);
  res.json({ ok: true });
});

// 文档内嵌预览：与 download 同守门（free=登录；vip=必须 VIP），但 Content-Disposition: inline。
// 用于在弹窗里直接渲染 PDF / 图片 / 视频，未授权直接 403/401，前端按状态降级到占位。
app.get(
  "/api/documents/:id/inline",
  requireSession(async (req, res) => {
    const doc = docs.getDocumentRaw(Number(req.params.id));
    if (!doc || doc.status !== "published") return res.status(404).json({ error: "文档不存在" });
    if (!doc.attachment) return res.status(404).json({ error: "该文档暂无附件" });

    if (doc.required_tier === "vip") {
      const isVip = await fetchIsVip(req);
      if (!isVip) {
        return res.status(403).json({
          error: "该文档为 VIP 会员专享",
          needVip: true,
          billingUrl: `${CENTER_BASE_URL}/`,
        });
      }
    }

    const filePath = path.join(ATTACH_DIR, doc.attachment.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "附件文件丢失" });

    if (doc.attachment.mime) res.setHeader("Content-Type", doc.attachment.mime);
    const encoded = encodeURIComponent(doc.attachment.originalName);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encoded}`);
    res.sendFile(filePath);
  })
);

// ════════════ 前台：下载（核心守门）════════════
// free 档：登录即可；vip 档：必须 VIP（服务端二次校验，不只靠前端）。
//
// 鉴权双轨：
// 1) ?dt=<token>（签名 URL）—— 用户在微信内 POST /sign-download 时签发，10 分钟有效。
//    跨进程友好：用户用「在浏览器中打开」跳过去后，URL 本身就带凭证，不再需要 cookie。
// 2) Cookie session —— 老路径兜底（已登录用户直接访问无 token 的 URL）。

// 在微信里 POST 拿签名 URL：让外部浏览器复制链接也能下载、不必重登
app.post(
  "/api/documents/:id/sign-download",
  requireSession(async (req, res) => {
    const id = Number(req.params.id);
    const doc = docs.getDocumentRaw(id);
    if (!doc || doc.status !== "published") return res.status(404).json({ error: "文档不存在" });
    if (!doc.attachment) return res.status(404).json({ error: "该文档暂无附件" });
    if (doc.required_tier === "vip") {
      const isVip = await fetchIsVip(req);
      if (!isVip) {
        return res.status(403).json({ error: "该文档为 VIP 会员专享", needVip: true });
      }
    }
    const token = signDownloadToken({ phone: req.session.phone, scope: "doc-download", ref: id });
    res.json({ token });
  })
);

app.get("/api/documents/:id/download", async (req, res) => {
  const id = Number(req.params.id);
  const doc = docs.getDocumentRaw(id);
  if (!doc || doc.status !== "published") return res.status(404).send(htmlNotFound("文档不存在"));
  if (!doc.attachment) return res.status(404).send(htmlNotFound("该文档暂无附件"));

  // 鉴权双轨：token 优先 → cookie fallback
  let phone = null;
  const dt = typeof req.query.dt === "string" ? req.query.dt : null;
  if (dt) {
    const ok = verifyDownloadToken(dt, { scope: "doc-download", ref: id });
    if (ok) phone = ok.phone; // 签发时已校过 VIP，这里直接放行
  }
  if (!phone) {
    const session = await getSession(req, res);
    if (!session.phone) return res.status(401).send(htmlLoginPrompt());
    phone = session.phone;
    if (doc.required_tier === "vip") {
      const isVip = await fetchIsVip(req);
      if (!isVip) return res.status(403).send(htmlVipPrompt());
    }
  }

  const filePath = path.join(ATTACH_DIR, doc.attachment.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).send(htmlNotFound("附件文件丢失"));

  docs.recordDownload(phone, doc);
  // 中文文件名用 RFC 5987 编码，避免下载乱码
  const encoded = encodeURIComponent(doc.attachment.originalName);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encoded}`);
  res.sendFile(filePath);
});

// ════════════ 内部 admin 接口（供 admin-hub 经 HTTP 调用，secret 鉴权）════════════
// 文档库自己写自己的库，不让 admin-hub 跨库写（遵守 admin-hub 铁律）。

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, file.fieldname === "preview" ? PREVIEW_DIR : ATTACH_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 上传附件 + 预览图，返回元信息（前端拼进 createDocument 的 attachment/preview）。
// admin 没手动上传 preview 时，对 PDF/Word/PPT 自动截前 3 页当兜底——admin 显式传了就尊重 admin 的。
// 自动生成失败/不支持的类型 → preview 为空，不影响附件上传成功。
app.post(
  "/api/admin/upload",
  requireAdminSecret,
  upload.fields([{ name: "attachment", maxCount: 1 }, { name: "preview", maxCount: 5 }]),
  async (req, res) => {
    const result = {};
    const att = req.files?.attachment?.[0];
    if (att) {
      result.attachment = {
        storedName: att.filename,
        originalName: Buffer.from(att.originalname, "latin1").toString("utf8"),
        size: att.size,
        mime: att.mimetype,
      };
    }
    if (req.files?.preview?.length) {
      result.preview = req.files.preview.map((f) => ({ storedName: f.filename, url: `/api/preview/${f.filename}` }));
    } else if (att) {
      // 自动生成预览：同步等结果（admin 接受 2-5s 延迟换用户端永远秒开）。
      const auto = await generatePreviews(path.join(ATTACH_DIR, att.filename), result.attachment, PREVIEW_DIR);
      if (auto.length) result.preview = auto;
    }
    res.json({ ok: true, ...result });
  }
);

app.post("/api/admin/documents", requireAdminSecret, (req, res) => {
  const id = docs.createDocument(req.body || {});
  res.json({ ok: true, id });
});

app.put("/api/admin/documents/:id", requireAdminSecret, (req, res) => {
  const ok = docs.updateDocument(Number(req.params.id), req.body || {});
  if (!ok) return res.status(404).json({ error: "文档不存在" });
  res.json({ ok: true });
});

app.delete("/api/admin/documents/:id", requireAdminSecret, (req, res) => {
  const ok = docs.deleteDocument(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: "文档不存在" });
  res.json({ ok: true });
});

// 预览图静态访问（公开）
app.get("/api/preview/:name", (req, res) => {
  const safe = path.basename(req.params.name);
  const filePath = path.join(PREVIEW_DIR, safe);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

// ── 生产模式：托管 dist/ ──
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "dist");
  app.use(express.static(distDir));
  app.get("*", (req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => {
  try {
    getDb();
    console.log(`[doc-library] api server on http://localhost:${PORT}`);
  } catch (err) {
    console.error("[doc-library] DB 初始化失败:", err);
  }
});
