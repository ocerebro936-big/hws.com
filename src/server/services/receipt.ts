import PDFDocument from "pdfkit";

interface ReceiptData {
  receiptId: string;
  clientName: string;
  clientEmail: string;
  clientNuit?: string;
  amount: number;
  currency: string;
  gateway: string;
  reference: string;
  description: string;
  date: string;
}

function generateDigitalSignature(data: string): string {
  const hash = require("crypto").createHash("sha256").update(data).digest("hex");
  return `HWS-DS-${hash.substring(0, 16).toUpperCase()}`;
}

export function generateReceiptPdf(data: ReceiptData): Buffer {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const signatureInput = `${data.receiptId}|${data.clientEmail}|${data.amount}|${data.reference}|${data.date}`;
  const digitalSignature = generateDigitalSignature(signatureInput);

  /* Cabeçalho */
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#1e1b4b").text("HUB WORLD SHOPPING", { align: "center" });
  doc.fontSize(8).font("Helvetica").fillColor("#64748b").text("Operado por Bluewhite Corporation Lda. — Moçambique", { align: "center" });
  doc.moveDown(0.5);

  /* Linha separadora */
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cbd5e1").stroke();
  doc.moveDown(0.5);

  /* Título */
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#0f172a").text("RECIBO OFICIAL DE PAGAMENTO", { align: "center" });
  doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Recibo nº ${data.receiptId}`, { align: "center" });
  doc.moveDown(1);

  /* Corpo */
  const leftX = 50;
  let y = doc.y;

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#334155");
  doc.text("DADOS DO CLIENTE", leftX, y);
  y = doc.y + 4;
  doc.fontSize(9).font("Helvetica").fillColor("#1e293b");
  doc.text(`Nome: ${data.clientName}`, leftX + 10, y);
  doc.text(`Email: ${data.clientEmail}`, leftX + 10);
  if (data.clientNuit) doc.text(`NUIT: ${data.clientNuit}`, leftX + 10);
  doc.moveDown(0.5);

  y = doc.y + 4;
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#334155");
  doc.text("DETALHES DO PAGAMENTO", leftX, y);
  y = doc.y + 4;
  doc.fontSize(9).font("Helvetica").fillColor("#1e293b");
  doc.text(`Descrição: ${data.description}`, leftX + 10, y);
  doc.text(`Valor: ${Number(data.amount).toLocaleString("pt-PT", { minimumFractionDigits: 2 })} ${data.currency}`, leftX + 10);
  doc.text(`Gateway: ${data.gateway.toUpperCase()}`, leftX + 10);
  doc.text(`Referência: ${data.reference}`, leftX + 10);
  doc.text(`Data: ${new Date(data.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, leftX + 10);
  doc.moveDown(0.5);

  /* Assinatura Digital */
  y = doc.y + 8;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#cbd5e1").stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#059669");
  doc.text("ASSINATURA DIGITAL CRIPTOGRÁFICA", leftX, doc.y);
  doc.fontSize(7).font("Courier").fillColor("#475569");
  doc.text(digitalSignature, leftX + 10);
  doc.moveDown(0.5);

  /* Rodapé legal */
  doc.fontSize(7).font("Helvetica").fillColor("#94a3b8");
  doc.text("Este recibo é gerado automaticamente pelo sistema Hub World Shopping (HWS).", leftX, doc.y, { align: "center" });
  doc.text("Bluewhite Corporation Lda. — NUIT: 100234149 — Maputo, Moçambique", { align: "center" });
  doc.text(`Emissão: ${new Date().toISOString()}`, { align: "center" });

  doc.end();

  return Buffer.concat(chunks);
}

export { generateDigitalSignature };
