// 临时：手写最小 5 页 PDF，给 previewGenerator 做单测。
// PDF 必须 ASCII + byte-accurate xref；用 Buffer 累积保证字节精确。
import fs from "node:fs";
import path from "node:path";

function buildMinimalPdf(pages = 5) {
  const buffers = [];
  let pos = 0;
  const objOffsets = [];   // index 0 留给 "free"

  function write(s) {
    const b = Buffer.from(s, "binary");
    buffers.push(b);
    pos += b.length;
  }
  function addObj(idx, body) {
    objOffsets[idx] = pos;
    write(`${idx} 0 obj\n${body}\nendobj\n`);
  }

  write("%PDF-1.4\n%\xff\xff\xff\xff\n");   // header + binary marker (pdfjs picky)

  // Object IDs:
  //  1 = Catalog, 2 = Pages, 3..3+pages-1 = Page, then pages content streams, then font
  const CATALOG = 1;
  const PAGES = 2;
  const FIRST_PAGE = 3;
  const FIRST_CONTENT = FIRST_PAGE + pages;
  const FONT = FIRST_CONTENT + pages;
  const TOTAL = FONT;

  addObj(CATALOG, `<< /Type /Catalog /Pages ${PAGES} 0 R >>`);

  const kids = [];
  for (let i = 0; i < pages; i++) kids.push(`${FIRST_PAGE + i} 0 R`);
  addObj(PAGES, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages} >>`);

  for (let i = 0; i < pages; i++) {
    const contentId = FIRST_CONTENT + i;
    addObj(FIRST_PAGE + i,
      `<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${FONT} 0 R >> >> >>`);
  }
  for (let i = 0; i < pages; i++) {
    const stream = `BT /F1 36 Tf 220 400 Td (Page ${i + 1}) Tj ET`;
    addObj(FIRST_CONTENT + i, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  addObj(FONT, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  // xref
  const xrefOffset = pos;
  write(`xref\n0 ${TOTAL + 1}\n`);
  write("0000000000 65535 f \n");
  for (let i = 1; i <= TOTAL; i++) {
    write(`${String(objOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${TOTAL + 1} /Root ${CATALOG} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.concat(buffers);
}

const out = path.resolve("data/doc-attachments/_smoke_test_5p.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buildMinimalPdf(5));
console.log("wrote", out, fs.statSync(out).size, "bytes");
