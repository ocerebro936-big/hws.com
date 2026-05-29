import { Router, Request, Response } from "express";
import { credentials } from "../config/credentials";
import { getStripe } from "../stripe";
import { createPendingOrder, createPayment } from "../db";

const router = Router();

const paymentService = {

  async processMpesa(orderId: string, phone: string, amount: number) {
    const payload = {
      input_ServiceProviderCode: credentials.nacional.mpesa.service_provider_code,
      input_CustomerMSISDN: phone.replace(/[^0-9]/g, ""),
      input_Amount: amount.toFixed(2),
      input_TransactionReference: orderId,
      input_ThirdPartyReference: `HWS-${orderId}`
    };
    console.log(`[MPESA] Push STK p/ ${phone}: ${amount} MZN (ref: ${orderId})`);
    return { success: true, status: "PROCESSING", gateway: "MPESA_C2B", reference: orderId, message: "Introduza o PIN M-Pesa.", payload };
  },

  async processEmola(orderId: string, phone: string, amount: number) {
    const payload = {
      merchant_id: credentials.nacional.emola.merchant_id,
      customer_phone: phone.replace(/[^0-9]/g, ""),
      amount: amount.toFixed(2),
      transaction_id: orderId,
      callback_url: `${process.env.APP_URL || "http://localhost:3000"}/api/v1/hws/payments/emola/callback`
    };
    console.log(`[EMOLA] Push STK p/ ${phone}: ${amount} MZN (ref: ${orderId})`);
    return { success: true, status: "PROCESSING", gateway: "EMOLA_C2B", reference: orderId, message: "Confirme no e-Mola.", payload };
  },

  async processStripe(amount: number, currency: string, metadata: Record<string, string>) {
    const stripe = getStripe();
    const amountCents = Math.round(amount * 100);
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      payment_method_types: ['card'],
      metadata: { hws_tenant: metadata.store_host || "hws", ...metadata }
    });
    console.log(`[STRIPE] PaymentIntent ${pi.id}: ${amount} ${currency.toUpperCase()}`);
    return { success: true, status: "AWAITING_AUTHENTICATION", gateway: "STRIPE", client_secret: pi.client_secret, transaction_id: pi.id };
  },

  async processPaypal(orderId: string, amount: number, currency: string, _description: string) {
    const baseUrl = credentials.internacional.paypal.mode === 'live'
      ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    console.log(`[PAYPAL] Order: ${amount} ${currency.toUpperCase()} (${orderId})`);
    return {
      success: true, status: "AWAITING_PAYER_ACTION", gateway: "PAYPAL",
      order_id: `PAYPAL-${Date.now()}`,
      approval_url: `${baseUrl}/checkoutnow?token=HWS_${orderId}`,
      message: "Redirecionando para PayPal..."
    };
  }
};

router.post("/process", async (req: Request, res: Response) => {
  const { order_id, total_amount, metodo_escolhido, client_phone, scope, store_metadata, currency } = req.body;

  if (!order_id || !total_amount || !metodo_escolhido || !scope) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios: order_id, total_amount, metodo_escolhido, scope" });
  }

  try {
    let result: any;

    if (scope === "NACIONAL") {
      if (metodo_escolhido === "MPESA") {
        if (!client_phone) return res.status(400).json({ success: false, error: "Telefone obrigatório para M-Pesa." });
        result = await paymentService.processMpesa(order_id, client_phone, total_amount);
      } else if (metodo_escolhido === "EMOLA") {
        if (!client_phone) return res.status(400).json({ success: false, error: "Telefone obrigatório para e-Mola." });
        result = await paymentService.processEmola(order_id, client_phone, total_amount);
      } else {
        return res.status(400).json({ success: false, error: "Método nacional inválido." });
      }
    } else if (scope === "INTERNACIONAL") {
      if (metodo_escolhido === "STRIPE") {
        result = await paymentService.processStripe(total_amount, currency || "usd", store_metadata || {});
      } else if (metodo_escolhido === "PAYPAL") {
        result = await paymentService.processPaypal(order_id, total_amount, currency || "usd", store_metadata?.description || "Compra HWS");
      } else {
        return res.status(400).json({ success: false, error: "Método internacional inválido." });
      }
    } else {
      return res.status(400).json({ success: false, error: "Scope inválido." });
    }

    const ref = result.transaction_id || result.reference || order_id;

    await createPendingOrder({
      orderId: order_id,
      tenantHost: store_metadata?.store_host || "hws",
      tenantName: store_metadata?.store_name || "HWS",
      totalAmount: total_amount,
      metodoEscolhido: metodo_escolhido,
      scope,
      clientPhone: client_phone,
      gateway: metodo_escolhido,
      reference: ref,
    });

    await createPayment({
      tenantId: store_metadata?.store_host || "hws",
      orderId: order_id,
      amount: total_amount,
      gateway: metodo_escolhido,
      scope,
      reference: ref,
      mpesaTransactionId: result.transaction_id,
      stripePaymentIntent: metodo_escolhido === "STRIPE" ? result.transaction_id : undefined,
    });

    res.json({ success: true, scope, method: metodo_escolhido, order_id, transaction: result });
  } catch (error: any) {
    console.error(`[CHECKOUT ERROR] ${error.message}`);
    res.status(500).json({ success: false, error: `Falha no processamento: ${error.message}`, gateway: metodo_escolhido });
  }
});

router.get("/methods", (_req: Request, res: Response) => {
  res.json({
    success: true, entidade: "Bluewhite Corporation Lda.",
    nacional: [
      { id: "MPESA", nome: "M-Pesa (Vodacom)", moeda: "MZN", taxa: "2.5%", disponivel: true },
      { id: "EMOLA", nome: "e-Mola (Movitel)", moeda: "MZN", taxa: "2.0%", disponivel: true }
    ],
    internacional: [
      { id: "STRIPE", nome: "Cartões (Visa/Mastercard/Apple Pay/Google Pay)", moeda: "USD, EUR, ZAR", taxa: "2.9% + 0.30 USD", disponivel: true },
      { id: "PAYPAL", nome: "PayPal Commerce", moeda: "USD, EUR", taxa: "2.99% + 0.49 USD", disponivel: true }
    ]
  });
});

export default router;
