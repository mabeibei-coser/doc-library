// 文档自动预览图：PDF/Word/PPT → 前 3 页 PNG。
// PDF 走 pdfjs-dist + @napi-rs/canvas（纯 JS，跨平台）；Word/PPT 先 LibreOffice soffice 转 PDF 再走同一链路。
// 入口 generatePreviews 看附件类型分发；本机没装 LibreOffice 时 Word/PPT 静默降级到 []，不阻塞上传。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import url from "node:url";
import { spawn } from "node:child_process";
import { Canvas } from "@napi-rs/canvas";

// pdfjs 需要 standardFontDataUrl 指向 Type1/cmap 字体目录，否则 PDF 用标准字体（Helvetica 等）时会回退渲染并打 warning。
// 用 node_modules 里 pdfjs-dist 自带的 standard_fonts/。url.pathToFileURL 在 Win 上转 file:///D:/... 格式。
const STANDARD_FONT_DATA_URL = url.pathToFileURL(
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "node_modules", "pdfjs-dist", "standard_fonts") + path.sep
).href;

const MAX_PAGES = 3;
const TARGET_WIDTH = 1200;   // 渲染宽度，太大慢、太小糊

// LibreOffice 可执行路径自动 detect：环境变量 > 常见 Windows 安装位置 > PATH 里的 soffice。
// 没找到就返回 null，上层据此跳过 Word/PPT 自动截图。
let _sofficeCache = undefined;
export function findSoffice() {
  if (_sofficeCache !== undefined) return _sofficeCache;
  const env = process.env.SOFFICE_PATH;
  if (env && fs.existsSync(env)) return (_sofficeCache = env);
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ];
    for (const c of candidates) if (fs.existsSync(c)) return (_sofficeCache = c);
  } else {
    for (const c of ["/usr/bin/soffice", "/usr/local/bin/soffice", "/opt/libreoffice/program/soffice"]) {
      if (fs.existsSync(c)) return (_sofficeCache = c);
    }
  }
  return (_sofficeCache = null);   // 由 PATH 兜底由 spawn 自己 ENOENT
}

// 文件 → kind（与 src/utils/fileType.js 同口径，但只关心要不要截图）。
function detectKind(name, mime) {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "rtf"].includes(ext)) return "word";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  const m = (mime || "").toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m.includes("word") || m.includes("wordprocessing")) return "word";
  if (m.includes("presentation") || m.includes("powerpoint")) return "ppt";
  return null;
}

// 调 LibreOffice 把 office 文件转成 PDF，返回转好的 PDF 绝对路径。失败抛错。
// LibreOffice 同一时间只允许一个实例，并发上传时用唯一 user profile（-env:UserInstallation）避免冲突。
async function officeToPdf(officePath, soffice) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-prev-"));
  const userProfile = `-env:UserInstallation=file:///${tmpDir.replace(/\\/g, "/")}/profile`;
  return await new Promise((resolve, reject) => {
    const child = spawn(
      soffice,
      [userProfile, "--headless", "--convert-to", "pdf", "--outdir", tmpDir, officePath],
      { windowsHide: true }
    );
    let stderr = "";
    child.stderr.on("data", (b) => { stderr += b.toString(); });
    child.on("error", (err) => reject(new Error(`soffice spawn 失败: ${err.message}`)));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`soffice 退出码 ${code}: ${stderr.slice(0, 500)}`));
      // 输出文件名 = 原文件名去扩展 + .pdf
      const base = path.basename(officePath, path.extname(officePath));
      const pdf = path.join(tmpDir, `${base}.pdf`);
      if (!fs.existsSync(pdf)) return reject(new Error(`soffice 未产出 PDF：${pdf}`));
      resolve({ pdf, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) });
    });
    // 60s 兜底超时，避免 LibreOffice 卡死拖垮上传
    setTimeout(() => { try { child.kill(); } catch {} }, 60_000);
  });
}

// PDF → 前 N 页 PNG。返回 [{storedName, url}]，写到 outDir，URL 跟 admin 上传预览图同口径。
async function pdfToPngs(pdfPath, outDir, maxPages = MAX_PAGES) {
  // pdfjs-dist v6 legacy 入口，纯 Node 环境（不依赖 worker）。
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  // v6：destroy() 在 loadingTask 上而不是 doc 上，需要保留引用做清理。
  const loadingTask = pdfjs.getDocument({
    data, disableWorker: true, isEvalSupported: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const doc = await loadingTask.promise;
  try {
    const pageCount = Math.min(doc.numPages, maxPages);
    const results = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = TARGET_WIDTH / viewport.width;
      const scaled = page.getViewport({ scale });
      const canvas = new Canvas(Math.ceil(scaled.width), Math.ceil(scaled.height));
      const ctx = canvas.getContext("2d");
      // 白底，避免透明 PDF 渲出来黑色
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, scaled.width, scaled.height);
      await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
      const buf = canvas.toBuffer("image/png");
      const storedName = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}_p${i}.png`;
      fs.writeFileSync(path.join(outDir, storedName), buf);
      results.push({ storedName, url: `/api/preview/${storedName}` });
      page.cleanup();
    }
    return results;
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * 主入口：给一份附件，自动生成最多 3 张前几页 PNG 预览，写入 outDir。
 *
 * @param {string} filePath  附件磁盘路径
 * @param {object} meta      { originalName, mime }
 * @param {string} outDir    预览图输出目录（同 admin 上传的 PREVIEW_DIR）
 * @returns {Promise<Array<{storedName, url}>>}  生成的预览图列表（可空）
 *
 * 失败策略：所有异常都吞掉返回 []，让上传链路不被预览生成阻塞——附件本身是核心，预览图是锦上添花。
 */
export async function generatePreviews(filePath, meta, outDir) {
  const kind = detectKind(meta?.originalName, meta?.mime);
  if (!kind) return [];
  try {
    if (kind === "pdf") {
      return await pdfToPngs(filePath, outDir);
    }
    // word / ppt：要 LibreOffice
    const soffice = findSoffice();
    if (!soffice) {
      console.warn(`[preview] 跳过 ${kind} 自动截图：本机未装 LibreOffice（设 SOFFICE_PATH 或装到默认路径）`);
      return [];
    }
    const { pdf, cleanup } = await officeToPdf(filePath, soffice);
    try {
      return await pdfToPngs(pdf, outDir);
    } finally {
      cleanup();
    }
  } catch (err) {
    console.error(`[preview] 生成失败 (${kind})：`, err?.message || err);
    return [];
  }
}
