// Geracao de XLSX e PDF a partir de um Report (headers + rows). Server-side.
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

export function toXlsx(title: string, headers: string[], rows: (string | number)[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31) || "Relatorio");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function toPdf(title: string, headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(`ByteForce — ${title}`, { align: "left" });
    doc.moveDown(0.5).fontSize(9).fillColor("#666").text(new Date().toLocaleString("pt-BR"));
    doc.moveDown(0.5).fillColor("#000");

    const usableWidth = doc.page.width - 72;
    const colWidth = usableWidth / Math.max(1, headers.length);
    const drawRow = (cells: (string | number)[], bold: boolean) => {
      const y = doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      cells.forEach((c, i) => doc.text(String(c ?? ""), 36 + i * colWidth, y, { width: colWidth - 4, ellipsis: true }));
      doc.moveDown(0.2);
    };
    drawRow(headers, true);
    doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.2);
    for (const r of rows.slice(0, 2000)) {
      if (doc.y > doc.page.height - 50) doc.addPage();
      drawRow(r, false);
    }
    doc.end();
  });
}
