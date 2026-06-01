import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// 安防文档库 = 安全隐患域独立积木。它拥有 documents + document_downloads 两张表。
// 不存任何会员数据——下载权限靠 HTTP 问会员中心(asg100)拿 isVip。
// schema 直接沿用 asg100 Phase 0 现成设计（文档码本来就误塞在那，现归位到这）。

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_PATH = process.env.DOC_DB_PATH || path.join(DATA_DIR, "doc-library.db");

let _db = null;

export function getDb() {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");

  // ── documents（文档库）──
  _db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT    NOT NULL,
      category        TEXT,
      subcategory     TEXT,
      description     TEXT,
      preview_json    TEXT,
      attachment_json TEXT,
      required_tier   TEXT    NOT NULL DEFAULT 'free',
      status          TEXT    NOT NULL DEFAULT 'published',
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_documents_category    ON documents(category, sort_order);
    CREATE INDEX IF NOT EXISTS idx_documents_tier        ON documents(required_tier, status);
  `);
  // additive migration: 老库无 subcategory 列时补上；
  // subcategory 索引放到 ALTER 之后单独 ensure —— 老库在 CREATE TABLE 阶段还没 subcategory 列，
  // 不能把这个 CREATE INDEX 放进上面的 exec 块里（会报 no such column）。
  const docCols = new Set(
    _db.prepare("PRAGMA table_info(documents)").all().map((c) => c.name),
  );
  if (!docCols.has("subcategory")) {
    _db.exec("ALTER TABLE documents ADD COLUMN subcategory TEXT");
  }
  _db.exec("CREATE INDEX IF NOT EXISTS idx_documents_subcategory ON documents(subcategory)");

  // ── document_downloads（查看/下载记录，user_phone 主体，供中心历史聚合）──
  _db.exec(`
    CREATE TABLE IF NOT EXISTS document_downloads (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_phone     TEXT    NOT NULL,
      document_id    INTEGER NOT NULL,
      document_title TEXT,
      action         TEXT    NOT NULL DEFAULT 'download',
      created_at     INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_doc_dl_phone ON document_downloads(user_phone, created_at DESC);
  `);

  return _db;
}
