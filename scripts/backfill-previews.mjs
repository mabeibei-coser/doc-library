// 回填脚本：扫库里所有「有附件 + preview_json 为空 + 类型可截图」的文档，自动生成前 3 页 PNG。
// 默认 dry-run（只打印计划，不写库）。加 --apply 才真跑。
// 用法：
//   node scripts/backfill-previews.mjs           # 看看会处理哪些
//   node scripts/backfill-previews.mjs --apply   # 真跑
//   node scripts/backfill-previews.mjs --apply --id 14   # 只处理某条
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { generatePreviews } from "../lib/previewGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "doc-library.db");
const ATTACH_DIR = path.join(ROOT, "data", "doc-attachments");
const PREVIEW_DIR = path.join(ROOT, "data", "doc-previews");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const idIdx = args.indexOf("--id");
const onlyId = idIdx >= 0 ? Number(args[idIdx + 1]) : null;

const db = new Database(DB_PATH);

const PREVIEWABLE_EXT = new Set(["pdf", "doc", "docx", "rtf", "ppt", "pptx"]);

function isPreviewable(attJson) {
  if (!attJson) return false;
  try {
    const att = JSON.parse(attJson);
    const ext = (att?.originalName || "").split(".").pop()?.toLowerCase() || "";
    if (PREVIEWABLE_EXT.has(ext)) return true;
    const m = (att?.mime || "").toLowerCase();
    return m === "application/pdf" || m.includes("word") || m.includes("wordprocessing") || m.includes("presentation") || m.includes("powerpoint");
  } catch { return false; }
}

let rows = db
  .prepare("SELECT id, title, attachment_json, preview_json FROM documents WHERE attachment_json IS NOT NULL AND (preview_json IS NULL OR preview_json = '[]') ORDER BY id")
  .all();
if (onlyId) rows = rows.filter((r) => r.id === onlyId);

const targets = rows.filter((r) => isPreviewable(r.attachment_json));
console.log(`扫到 ${rows.length} 条候选，其中 ${targets.length} 条可截图（PDF/Word/PPT）`);
for (const r of targets) {
  const att = JSON.parse(r.attachment_json);
  console.log(`  #${r.id} ${r.title} → ${att.originalName}`);
}

if (!apply) {
  console.log("\ndry-run 结束。加 --apply 真跑。");
  db.close();
  process.exit(0);
}

console.log("\n开始回填 …");
const upd = db.prepare("UPDATE documents SET preview_json = ?, updated_at = ? WHERE id = ?");
let ok = 0, fail = 0;
for (const r of targets) {
  const att = JSON.parse(r.attachment_json);
  const filePath = path.join(ATTACH_DIR, att.storedName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  #${r.id} 跳过：附件文件不存在 ${att.storedName}`);
    fail++;
    continue;
  }
  process.stdout.write(`  #${r.id} ${att.originalName} … `);
  const t0 = Date.now();
  const previews = await generatePreviews(filePath, att, PREVIEW_DIR);
  if (previews.length) {
    upd.run(JSON.stringify(previews), Date.now(), r.id);
    console.log(`✓ ${previews.length} 张 (${Date.now() - t0}ms)`);
    ok++;
  } else {
    console.log(`✗ 没生成（可能 LibreOffice 没装或文件损坏）`);
    fail++;
  }
}
console.log(`\n完成：成功 ${ok} / 失败 ${fail}`);
db.close();
