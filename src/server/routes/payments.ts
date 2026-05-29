import { Router, Request, Response } from "express";
import { database } from "../state";

const router = Router();

/* POST /api/v1/payments/validate — valida pagamento e ativa loja/domínio */
router.post("/validate", (req: Request, res: Response) => {
  const { gateway, reference, amount, tenantId, type, email } = req.body;

  if (!gateway || !reference || !amount) {
    res.status(400).json({ success: false, error: "gateway, reference e amount são obrigatórios." });
    return;
  }

  /* Simular validação junto ao gateway */
  const validGateways = ["stripe", "mpesa", "emola", "paypal"];
  if (!validGateways.includes(gateway.toLowerCase())) {
    res.status(400).json({ success: false, error: `Gateway não suportado: ${gateway}. Use: stripe, mpesa, emola, paypal.` });
    return;
  }

  const paymentConfirmed = true;

  if (!paymentConfirmed) {
    res.status(402).json({ success: false, error: "Pagamento não confirmado pelo gateway." });
    return;
  }

  const results: any[] = [];

  /* Ativar loja se tenantId fornecido */
  if (tenantId) {
    const tenant = Object.values(database).find((t: any) => t.id === tenantId || t.domain === tenantId);
    if (tenant) {
      const t = tenant as any;
      t.licenseStatus = "PAID";
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      t.nextPaymentDate = nextDate.toISOString().split("T")[0];
      results.push({ type: "store", id: tenantId, status: "activated", nextPayment: t.nextPaymentDate });
    }
  }

  /* Se for pagamento de domínio */
  if (type === "domain" && email) {
    results.push({ type: "domain", email, status: "registered", domain: req.body.domainName || "pendente" });
  }

  res.json({
    success: true,
    message: `Pagamento de ${amount} MT via ${gateway} validado com sucesso. Referência: ${reference}`,
    results,
  });
});

/* GET /api/v1/payments/expired — lista lojas com aluguer expirado */
router.get("/expired", (_req: Request, res: Response) => {
  const now = new Date();
  const expired: any[] = [];

  for (const [host, tenant] of Object.entries(database)) {
    const t = tenant as any;
    if (t.type !== "store") continue;
    if (t.licenseStatus === "SUSPENDED") {
      expired.push({ id: t.id, name: t.name, host, status: "SUSPENDED" });
      continue;
    }
    if (t.nextPaymentDate) {
      const nextPayment = new Date(t.nextPaymentDate);
      if (nextPayment < now) {
        expired.push({ id: t.id, name: t.name, host, status: "EXPIRED", nextPaymentDate: t.nextPaymentDate });
      }
    }
  }

  res.json({ success: true, expired, total: expired.length });
});

/* POST /api/v1/payments/check-expired — verifica e suspende lojas expiradas */
router.post("/check-expired", (_req: Request, res: Response) => {
  const now = new Date();
  let suspended = 0;

  for (const [, tenant] of Object.entries(database)) {
    const t = tenant as any;
    if (t.type !== "store" || t.licenseStatus === "SUSPENDED") continue;
    if (t.nextPaymentDate) {
      const nextPayment = new Date(t.nextPaymentDate);
      if (nextPayment < now) {
        t.licenseStatus = "SUSPENDED";
        suspended++;
      }
    }
  }

  res.json({ success: true, message: `${suspended} loja(s) suspensa(s) por falta de pagamento.`, suspended });
});

export default router;
