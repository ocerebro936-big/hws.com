import express, { Router, Request, Response } from "express";
import {
  verifyCryptoPayment,
  createCheckoutSession,
  verifyStripeSession,
  handleStripeWebhook,
  activateProperty,
  generateAdsTxt,
} from "../services/paymentEngine";
import { database } from "../state";

const router = Router();

/* ───────── ROTA 1: Verificar Pagamento Web3 (MetaMask/Polygon) ───────── */
router.post("/verify-crypto", async (req: Request, res: Response) => {
  const { txHash, storeId, planId, wallet, clientName, clientEmail, clientNuit } = req.body;

  if (!txHash || !storeId || !planId) {
    res.status(400).json({ success: false, error: "txHash, storeId e planId são obrigatórios." });
    return;
  }

  try {
    const onChain = await verifyCryptoPayment(txHash, wallet || "");

    if (!onChain.confirmed) {
      res.status(402).json({ success: false, error: "Transação não confirmada na blockchain Polygon. Aguarde alguns segundos e tente novamente." });
      return;
    }

    const planPrices: Record<string, number> = {
      HWS_BANCA: 500,
      HWS_LOJA_RENTAL: 3500,
      HWS_LOJA_SALE: 150000,
      HWS_CORPORATE: 12000,
    };

    const result = activateProperty({
      tenantId: storeId,
      planId,
      paymentMethod: "METAMASK",
      txHash,
      amount: planPrices[planId] || 3500,
      clientName,
      clientEmail,
      clientNuit,
    });

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error || "Falha na ativação." });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Pagamento Cripto validado! Bloco #${onChain.blockNumber}. ${result.message}`,
      tenant: result.tenant,
      receiptId: result.receiptId,
      receiptBase64: result.receipt ? result.receipt.toString("base64") : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Erro interno no validador cripto.", details: err.message });
  }
});

/* ───────── ROTA 2: Criar Sessão Checkout Stripe (Cartão) ───────── */
router.post("/create-checkout-session", async (req: Request, res: Response) => {
  const { planId, tenantId } = req.body;

  if (!planId || !tenantId) {
    res.status(400).json({ success: false, error: "planId e tenantId são obrigatórios." });
    return;
  }

  const appUrl = req.headers.origin || req.headers.referer || "http://localhost:3000";

  const session = await createCheckoutSession(planId, tenantId, appUrl);
  if (!session) {
    res.status(500).json({ success: false, error: "Falha ao gerar sessão de checkout Stripe." });
    return;
  }

  res.json({ success: true, url: session.url });
});

/* ───────── ROTA 3: Verificar Sessão Stripe (callback pós-pagamento) ───────── */
router.post("/verify-card", async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ success: false, error: "sessionId é obrigatório." });
    return;
  }

  try {
    const { paid, metadata } = await verifyStripeSession(sessionId);

    if (!paid) {
      res.status(402).json({ success: false, error: "Pagamento ainda não confirmado pelo Stripe." });
      return;
    }

    const { planId, tenantId } = metadata;
    if (planId && tenantId) {
      const planPrices: Record<string, number> = {
        HWS_BANCA: 500,
        HWS_LOJA_RENTAL: 3500,
        HWS_LOJA_SALE: 150000,
        HWS_CORPORATE: 12000,
      };

      const result = activateProperty({
        tenantId,
        planId,
        paymentMethod: "CREDIT_CARD",
        gatewayRef: sessionId,
        amount: planPrices[planId] || 3500,
      });

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error || "Falha na ativação." });
        return;
      }

      res.json({
        success: true,
        message: `✅ Pagamento por Cartão validado! ${result.message}`,
        tenant: result.tenant,
        receiptId: result.receiptId,
      });
      return;
    }

    res.json({ success: true, message: "Pagamento verificado com sucesso." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Erro ao verificar sessão Stripe.", details: err.message });
  }
});

/* ───────── ROTA 4: Webhook Bancário (Stripe) ───────── */
router.post("/webhook-bancario", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  let event: any;
  try {
    event = JSON.parse(req.body.toString());
  } catch {
    res.status(400).json({ received: false, error: "Payload inválido." });
    return;
  }

  try {
    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ received: false, error: err.message });
  }
});

/* ───────── ROTA 5: ads.txt para Google AdSense ───────── */
router.get("/ads/:subdomain/ads.txt", (req: Request, res: Response) => {
  const { subdomain } = req.params;
  const adsTxt = generateAdsTxt(subdomain);

  if (!adsTxt) {
    res.status(404).type("text/plain").send("Espaço comercial inativo ou inexistente.");
    return;
  }

  res.type("text/plain").send(adsTxt);
});

/* ───────── ROTA 6: Listar planos e preços ───────── */
router.get("/plans", (_req: Request, res: Response) => {
  res.json({
    success: true,
    plans: [
      { id: "HWS_BANCA", name: "Banca do Mercado", priceMT: 500, type: "banca", recurring: "monthly" },
      { id: "HWS_LOJA_RENTAL", name: "Loja Alugável", priceMT: 3500, type: "store_rental", recurring: "monthly" },
      { id: "HWS_LOJA_SALE", name: "Loja à Venda", priceMT: 150000, type: "store_sale", recurring: "once" },
      { id: "HWS_CORPORATE", name: "Registo Empresarial", priceMT: 12000, type: "corporate", recurring: "once" },
    ],
    paymentMethods: [
      { id: "METAMASK", name: "MetaMask (USDC/Polygon)", fee: "~0.01 USD" },
      { id: "STRIPE", name: "Cartão Visa/Mastercard", fee: "2.9% + 0.30 USD" },
    ],
  });
});

export default router;
