// 直接调 generatePreviews 试一遍：对 _smoke_test_5p.pdf 应该出 3 张 PNG；对 docx 应该返回 [] + 警告。
import path from "node:path";
import fs from "node:fs";
import { generatePreviews, findSoffice } from "../lib/previewGenerator.js";

const ROOT = path.resolve(".");
const ATTACH = path.join(ROOT, "data/doc-attachments");
const PREVIEW = path.join(ROOT, "data/doc-previews");
fs.mkdirSync(PREVIEW, { recursive: true });

console.log("LibreOffice:", findSoffice() || "<not found>");
console.log("");

async function tryOne(name, mime) {
  const file = path.join(ATTACH, name);
  if (!fs.existsSync(file)) { console.log(`SKIP ${name} (not found)`); return; }
  console.log(`→ ${name} (${mime})`);
  const t0 = Date.now();
  const out = await generatePreviews(file, { originalName: name, mime }, PREVIEW);
  console.log(`  result: ${out.length} previews in ${Date.now() - t0}ms`);
  out.forEach((p) => console.log(`    ${p.url}  →  ${path.join(PREVIEW, p.storedName)}  (${fs.statSync(path.join(PREVIEW, p.storedName)).size} bytes)`));
  console.log("");
}

await tryOne("_smoke_test_5p.pdf", "application/pdf");
await tryOne("sample_check_table.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
await tryOne("sample_hazard_ledger.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
