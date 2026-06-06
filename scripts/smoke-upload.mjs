// 用 Node 内置 fetch + FormData 走一遍 admin upload 接口，验证 PDF 自动预览生成的端到端。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const PDF = path.join(ROOT, "data/doc-attachments/_smoke_test_5p.pdf");
const API = "http://localhost:4003/api/admin/upload";
const SECRET = "dev-doc-admin-secret-change-in-prod";

const fd = new FormData();
const buf = fs.readFileSync(PDF);
fd.append("attachment", new File([buf], "smoke.pdf", { type: "application/pdf" }));

const t0 = Date.now();
const resp = await fetch(API, { method: "POST", headers: { "x-admin-secret": SECRET }, body: fd });
const text = await resp.text();
console.log(`HTTP ${resp.status} (${Date.now() - t0}ms)`);
console.log(text);

// 解析 preview 验证文件落地
const json = JSON.parse(text);
if (json.preview?.length) {
  console.log("\n落盘检查:");
  for (const p of json.preview) {
    const fp = path.join(ROOT, "data/doc-previews", p.storedName);
    console.log(`  ${p.url} → ${fs.existsSync(fp) ? `${fs.statSync(fp).size} bytes ✓` : "MISSING ✗"}`);
  }
  // 通过 GET /api/preview/:name 试着取一张
  const url = `http://localhost:4003${json.preview[0].url}`;
  const r2 = await fetch(url);
  console.log(`\nGET ${url} → HTTP ${r2.status}, content-type=${r2.headers.get("content-type")}, len=${(await r2.arrayBuffer()).byteLength}`);

  // 把这次上传创建成一条真实文档，供浏览器端可视验证
  const createResp = await fetch("http://localhost:4003/api/admin/documents", {
    method: "POST",
    headers: { "x-admin-secret": SECRET, "content-type": "application/json" },
    body: JSON.stringify({
      title: "Smoke 测试 5 页 PDF（自动预览）",
      category: "测试",
      description: "用 scripts/smoke-upload.mjs 自动跑出来的 doc，验证 admin 上传 PDF 后自动截前 3 页当预览图。",
      preview: json.preview,
      attachment: json.attachment,
      requiredTier: "free",
      status: "published",
    }),
  });
  console.log(`\n创建文档: HTTP ${createResp.status} - ${await createResp.text()}`);
}
