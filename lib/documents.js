// 文档 CRUD + 搜索。文档库的业务逻辑只活在这里。
import { getDb } from "./db.js";

const parseJson = (s, fallback) => {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};

// 行 → 前台用的对象（attachment 只回元信息，不回磁盘路径，下载走专用路由）
function rowToPublic(row) {
  const attachment = parseJson(row.attachment_json, null);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    preview: parseJson(row.preview_json, []),
    requiredTier: row.required_tier,
    hasAttachment: !!attachment,
    attachmentName: attachment?.originalName || null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/** 列表 + 可选分类筛选 + 关键词搜索（LIKE 标题/说明/分类）。只返已发布。 */
export function listDocuments({ category, q } = {}) {
  const db = getDb();
  const where = ["status = 'published'"];
  const params = [];
  if (category) { where.push("category = ?"); params.push(category); }
  if (q) {
    where.push("(title LIKE ? OR description LIKE ? OR category LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  const rows = db
    .prepare(`SELECT * FROM documents WHERE ${where.join(" AND ")} ORDER BY sort_order ASC, created_at DESC`)
    .all(...params);
  return rows.map(rowToPublic);
}

/** 全部分类（去重，给前台筛选 chip 用）。 */
export function listCategories() {
  const db = getDb();
  return db
    .prepare("SELECT DISTINCT category FROM documents WHERE status='published' AND category IS NOT NULL AND category != '' ORDER BY category")
    .all()
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
      `INSERT INTO documents(title, category, description, preview_json, attachment_json, required_tier, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.category || null,
      input.description || null,
      JSON.stringify(input.preview || []),
      input.attachment ? JSON.stringify(input.attachment) : null,
      input.requiredTier === "vip" ? "vip" : "free",
      input.status || "published",
      input.sortOrder || 0,
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
    `UPDATE documents SET title=?, category=?, description=?, preview_json=?, attachment_json=?, required_tier=?, status=?, sort_order=?, updated_at=?
     WHERE id=?`
  ).run(
    input.title ?? existing.title,
    input.category ?? existing.category,
    input.description ?? existing.description,
    JSON.stringify(input.preview ?? existing.preview),
    input.attachment !== undefined ? (input.attachment ? JSON.stringify(input.attachment) : null) : existing.attachment_json,
    (input.requiredTier ?? existing.required_tier) === "vip" ? "vip" : "free",
    input.status ?? existing.status,
    input.sortOrder ?? existing.sort_order,
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
