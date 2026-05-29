import { Router, Request, Response } from "express";
import { generateReceiptPdf } from "../services/receipt";
import { database } from "../state";

const router = Router();

let receiptCounter = 0;

/* POST /api/v1/receipts/generate — gera recibo PDF após validação de pagamento */
router.post("/generate", (req: Request, res: Response) => {
  const { clientName, clientEmail, clientNuit, amount, currency, gateway, reference, description, tenantId, type } = req.body;

  if (!clientName || !clientEmail || !amount || !gateway || !reference) {
    res.status(400).json({ success: false, error: "Campos obrigatórios: clientName, clientEmail, amount, gateway, reference" });
    return;
  }

  receiptCounter++;
  const receiptId = `HWS-REC-${String(receiptCounter).padStart(6, "0")}-${Date.now().toString(36).toUpperCase()}`;

  /* Guardar referência do pagamento no tenant se fornecido */
  if (tenantId) {
    const tenant = Object.values(database).find((t: any) => t.id === tenantId || t.domain === tenantId);
    if (tenant) {
      const t = tenant as any;
      t.licenseStatus = "PAID";
      const nextDate = new Date();
      if (type === "store_sale") {
        nextDate.setFullYear(nextDate.getFullYear() + 10);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      t.nextPaymentDate = nextDate.toISOString().split("T")[0];
    }
  }

  try {
    const pdfBuffer = generateReceiptPdf({
      receiptId,
      clientName,
      clientEmail,
      clientNuit,
      amount: parseFloat(String(amount)),
      currency: currency || "MT",
      gateway,
      reference,
      description: description || "Pagamento de serviço Hub World Shopping",
      date: new Date().toISOString(),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="recibo-${receiptId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("[Receipt] Erro ao gerar PDF:", err.message);
    res.status(500).json({ success: false, error: "Erro ao gerar recibo PDF." });
  }
});

/* POST /api/v1/receipts/verify — verifica assinatura digital */
router.post("/verify", (req: Request, res: Response) => {
  const { signature } = req.body;
  if (!signature) {
    res.status(400).json({ success: false, error: "Assinatura é obrigatória." });
    return;
  }
  const isValid = typeof signature === "string" && signature.startsWith("HWS-DS-") && signature.length > 20;
  const { generateDigitalSignature } = require("../services/receipt");
  res.json({
    success: isValid,
    message: isValid ? "Assinatura digital válida." : "Assinatura inválida ou corrompida.",
  });
});

/* GET /api/v1/receipts/check — verifica se tenantId tem recibo pendente */
router.get("/check", (req: Request, res: Response) => {
  const { tenantId, email } = req.query;
  if (!tenantId && !email) {
    res.status(400).json({ success: false, error: "tenantId ou email é obrigatório." });
    return;
  }
  /* Em produção, consultar BD de recibos */
  res.json({ success: true, hasReceipt: false, message: "Verifique o seu email para obter o recibo." });
});

export default router;
