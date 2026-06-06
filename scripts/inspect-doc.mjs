// 临时探测脚本：列出库里"消防"开头的文档元信息，方便诊断预览空白根因。
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "..", "data", "doc-library.db"), { readonly: true });

const rows = db.prepare("SELECT id, title, status, attachment_json, preview_json FROM documents ORDER BY id").all();
console.log(`total docs: ${rows.length}`);
for (const r of rows) {
  const att = r.attachment_json ? JSON.parse(r.attachment_json) : null;
  const prev = r.preview_json ? JSON.parse(r.preview_json) : [];
  console.log(`#${r.id} [${r.status}] ${r.title}`);
  console.log(`  attachment: ${att ? `${att.originalName} (mime=${att.mime}, size=${att.size})` : "<none>"}`);
  console.log(`  preview: ${prev.length ? prev.map(p => p.url).join(", ") : "<empty>"}`);
}
db.close();
