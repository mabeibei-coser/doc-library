// 重现脚本：模拟浏览器/admin-hub 真实上传一个 .xlsx 和 .docx，
// 验证 doc-library /api/admin/upload 接到的 multer file.mimetype 是不是原 mime。
// 跑前先 `node server.js`（监听 4003）。
//
// 期望（链路无 bug）：
//   .xlsx → application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
//   .docx → application/vnd.openxmlformats-officedocument.wordprocessingml.document
// 实际看返回 attachment.mime 即可。

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const SECRET = "dev-doc-admin-secret-change-in-prod";
const BASE = "http://localhost:4003";

const CASES = [
  {
    label: ".xlsx",
    filename: "测试-上传链路-mime.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  {
    label: ".docx",
    filename: "测试-上传链路-mime.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

async function upload({ filename, type }) {
  // 用 16 字节的假二进制内容代表文件体。重点不是文件能否被 Office 打开，
  // 而是 multipart Content-Type / multer file.mimetype 是不是按 Blob.type 走的。
  const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer], { type });
  const fd = new FormData();
  fd.append("attachment", blob, filename);
  const res = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: { "x-admin-secret": SECRET },
    body: fd,
  });
  return { status: res.status, body: await res.json() };
}

for (const c of CASES) {
  const r = await upload(c);
  console.log(`\n[${c.label}] POST /api/admin/upload`);
  console.log("  期望 mime:", c.type);
  console.log("  HTTP:", r.status);
  console.log("  返回 attachment:", JSON.stringify(r.body.attachment));
  const ok = r.body.attachment?.mime === c.type;
  console.log("  结果:", ok ? "✓ mime 正确" : "✗ mime 不对");
}

// 走一遍 createDocument 看 DB 写进去的 attachment_json
console.log("\n--- 走 createDocument 把刚才的 .xlsx 入库，看 DB 里的 mime ---");
const xlsx = await upload(CASES[0]);
const createRes = await fetch(`${BASE}/api/admin/documents`, {
  method: "POST",
  headers: { "x-admin-secret": SECRET, "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "[测试-勿留] 上传链路 mime 验证",
    category: "test",
    requiredTier: "free",
    attachment: xlsx.body.attachment,
  }),
});
const createBody = await createRes.json();
console.log("  createDocument 返回:", createBody);

const db = new Database(path.join(PROJECT_ROOT, "data/doc-library.db"));
const row = db.prepare("SELECT id, title, attachment_json FROM documents WHERE id = ?").get(createBody.id);
console.log("  DB 行:", row);
console.log("  attachment_json.mime:", JSON.parse(row.attachment_json).mime);

// 清理：删掉测试文档（保持 DB 干净）
db.prepare("DELETE FROM documents WHERE id = ?").run(createBody.id);
console.log("  已清理测试行 #" + createBody.id);
db.close();
