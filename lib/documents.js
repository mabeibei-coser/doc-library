// 文档 CRUD + 搜索。文档库的业务逻辑只活在这里。
import { getDb } from "./db.js";

// 一库管两域（安防ASG / 人才ATA）：前台分域过滤的责任放在路由层（server.js /api/documents）——
// 由它按入参 category（前端传）/ cookie 推断（兜底）决定查哪一域。这里只做纯过滤，不再硬编码域黑名单。
// admin-hub 调用（带 x-admin-secret）不传 category 即可拿全库。

const parseJson = (s, fallback) => {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};

// 行 → 前台用的对象（attachment 只回元信息，不回磁盘路径，下载走专用路由）
// viewCount 由 listDocuments 在 SQL 阶段算出后塞进 row，单条接口不带（保留性能边界）。
function rowToPublic(row) {
  const attachment = parseJson(row.attachment_json, null);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    preview: parseJson(row.preview_json, []),
    requiredTier: row.required_tier,
    hasAttachment: !!attachment,
    attachmentName: attachment?.originalName || null,
    attachmentMime: attachment?.mime || null,
    sortOrder: row.sort_order,
    pinned: !!row.pinned,
    createdAt: row.created_at,
    uploadedByName: row.uploaded_by_name ?? null,
    viewCount: typeof row.view_count === "number" ? row.view_count : 0,
  };
}

/**
 * 列表 + 可选筛选（category / subcategory / requiredTier）+ 关键词搜索。
 * 关键词搜索范围：title / description / category / subcategory。
 * 每行附带 viewCount = COUNT(document_downloads.document_id)（含 action='view' 与 'download'）。
 * 默认只返已发布；传 includeAll=true 可见草稿（admin 列表用）。
 */
export function listDocuments({ category, subcategory, requiredTier, q, includeAll } = {}) {
  const db = getDb();
  const where = [];
  const params = [];
  if (!includeAll) where.push("d.status = 'published'");
  if (category) { where.push("d.category = ?"); params.push(category); }
  if (subcategory) { where.push("d.subcategory = ?"); params.push(subcategory); }
  if (requiredTier === "free" || requiredTier === "vip") {
    where.push("d.required_tier = ?");
    params.push(requiredTier);
  }
  if (q) {
    where.push("(d.title LIKE ? OR d.description LIKE ? OR d.category LIKE ? OR d.subcategory LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT d.*,
              (SELECT COUNT(*) FROM document_downloads dd WHERE dd.document_id = d.id) AS view_count
       FROM documents d
       ${whereSql}
       ORDER BY d.pinned DESC, d.sort_order ASC, d.created_at DESC`
    )
    .all(...params);
  return rows.map(rowToPublic);
}

/** 全部分类（去重，给 admin / 前台筛选 chip 用）。可选 limitToCategory 只返当前域的（前台调用传当前域）。 */
export function listCategories({ limitToCategory } = {}) {
  const db = getDb();
  const where = ["status='published'", "category IS NOT NULL", "category != ''"];
  const params = [];
  if (limitToCategory) {
    where.push("category = ?");
    params.push(limitToCategory);
  }
  return db
    .prepare(`SELECT DISTINCT category FROM documents WHERE ${where.join(" AND ")} ORDER BY category`)
    .all(...params)
    .map((r) => r.category);
}

/** 单条（含磁盘 attachment 信息，下载路由内部用）。 */
export function getDocumentRaw(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!row) return null;
  return { ...row, attachment: parseJson(row.attachment_json, null), preview: parseJson(row.preview_json, []) };
}

export function getDocumentPublic(id) {
  const raw = getDocumentRaw(id);
  return raw ? rowToPublic(raw) : null;
}

// ── admin 写操作（供后台经 HTTP 调用，secret 在路由层校验）──

export function createDocument(input) {
  const db = getDb();
  const now = Date.now();
  const info = db
    .prepare(
      `INSERT INTO documents(title, category, subcategory, description, preview_json, attachment_json, required_tier, status, sort_order, pinned, uploaded_by_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.category || null,
      input.subcategory || null,
      input.description || null,
      JSON.stringify(input.preview || []),
      input.attachment ? JSON.stringify(input.attachment) : null,
      input.requiredTier === "vip" ? "vip" : "free",
      input.status || "published",
      input.sortOrder || 0,
      input.pinned ? 1 : 0,
      input.uploadedByName || null,
      now,
      now
    );
  return Number(info.lastInsertRowid);
}

export function updateDocument(id, input) {
  const db = getDb();
  const existing = getDocumentRaw(id);
  if (!existing) return false;
  const now = Date.now();
  db.prepare(
    `UPDATE documents SET title=?, category=?, subcategory=?, description=?, preview_json=?, attachment_json=?, required_tier=?, status=?, sort_order=?, pinned=?, updated_at=?
     WHERE id=?`
  ).run(
    input.title ?? existing.title,
    input.category ?? existing.category,
    input.subcategory ?? existing.subcategory ?? null,
    input.description ?? existing.description,
    JSON.stringify(input.preview ?? existing.preview),
    input.attachment !== undefined ? (input.attachment ? JSON.stringify(input.attachment) : null) : existing.attachment_json,
    (input.requiredTier ?? existing.required_tier) === "vip" ? "vip" : "free",
    input.status ?? existing.status,
    input.sortOrder ?? existing.sort_order,
    input.pinned !== undefined ? (input.pinned ? 1 : 0) : existing.pinned,
    now,
    id
  );
  return true;
}

export function deleteDocument(id) {
  const db = getDb();
  return db.prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
}

/** 记录一次下载（供中心历史聚合）。 */
export function recordDownload(phone, doc) {
  const db = getDb();
  db.prepare(
    "INSERT INTO document_downloads(user_phone, document_id, document_title, action, created_at) VALUES (?, ?, ?, 'download', ?)"
  ).run(phone, doc.id, doc.title, Date.now());
}

/**
 * 记录一次查看（点开预览即 +1，不去重；一个人点 5 次就 +5）。
 * 未登录用户也允许计数（phone 留空串），目的是真实反映"多少人对它感兴趣"。
 */
export function recordView(phone, doc) {
  const db = getDb();
  db.prepare(
    "INSERT INTO document_downloads(user_phone, document_id, document_title, action, created_at) VALUES (?, ?, ?, 'view', ?)"
  ).run(phone || "", doc.id, doc.title, Date.now());
}
