import { Request, Response } from "express";
import { getStripe } from "../stripe";
import { credentials } from "../config/credentials";
import { financeiroCorporativo, database, pendingOrders } from "../state";
import type { PendingOrder } from "../config/database";

const IVA_RATE = 0.16;

export function handleMpesaCallback(req: Request, res: Response) {
  const {
    output_ResponseCode,
    output_ResponseDesc,
    output_TransactionID,
    input_TransactionReference,
    input_ThirdPartyReference
  } = req.body;

  console.log(`[WEBHOOK M-PESA] Callback recebido. Ref: ${input_TransactionReference || input_ThirdPartyReference}`);

  if (output_ResponseCode === "INS-0" || output_ResponseCode === "0") {
    const ref = input_TransactionReference || input_ThirdPartyReference;

    if (ref && pendingOrders.has(ref)) {
      const order = pendingOrders.get(ref)!;
      order.status = "PAID";

      const val = order.amount;
      const commissionRate = 0.025;
      const fee = Math.round(val * commissionRate);
      const netAmount = val - fee;
      const ivaAmount = Math.round(fee * IVA_RATE);

      financeiroCorporativo.caixaBancarioPendente += netAmount;
      financeiroCorporativo.comissoesRetidasTotal += fee;
      financeiroCorporativo.ivaLiquidadoTotal += ivaAmount;

      const tenant = order.metadata?.store_host
        ? Object.values(database).find(t =>
            t.id === order.metadata.store_host || t.domain === order.metadata.store_host
          )
        : null;
      if (tenant) {
        tenant.accumulatedSales = (tenant.accumulatedSales || 0) + val;
      }

      console.log(`[SPLIT M-PESA] ${ref}: ${val} MZN | Lojista: ${netAmount} | Bluewhite: ${fee} | IVA: ${ivaAmount}`);
    }

    return res.status(200).json({
      status: "SUCCESS",
      message: "Callback M-Pesa processado. Split executado.",
      output_TransactionID
    });
  }

  const failedRef = input_TransactionReference || input_ThirdPartyReference;
  if (failedRef && pendingOrders.has(failedRef)) {
    pendingOrders.get(failedRef)!.status = "FAILED";
  }

  console.log(`[M-PESA] Transação não concluída: ${output_ResponseDesc || output_ResponseCode}`);
  return res.status(200).json({
    status: "FAILED",
    message: output_ResponseDesc || "Transação não concluída pelo cliente."
  });
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  let event: any;

  try {
    const stripe = getStripe();
    const webhookSecret = credentials.internacional.stripe.webhook_secret;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }

    console.log(`[WEBHOOK STRIPE] Evento: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const amount = pi.amount / 100;

      console.log(`[FINANCEIRO GLOBAL] Pagamento de $${amount} confirmado (${pi.id})`);

      const commissionRate = 0.03;
      const fee = amount * commissionRate;
      const netAmount = amount - fee;
      const ivaAmount = fee * IVA_RATE;
      const amountMzn = Math.round(amount * 64);

      financeiroCorporativo.caixaBancarioPendente += amountMzn;
      financeiroCorporativo.comissoesRetidasTotal += Math.round(fee * 64);
      financeiroCorporativo.ivaLiquidadoTotal += Math.round(ivaAmount * 64);

      if (pendingOrders.has(pi.id)) {
        const order = pendingOrders.get(pi.id)!;
        order.status = "PAID";
        const tenant = Object.values(database).find(t => t.id === order.tenantId);
        if (tenant) {
          tenant.accumulatedSales = (tenant.accumulatedSales || 0) + amountMzn;
        }
      }

      console.log(`[SPLIT STRIPE] Líquido: $${netAmount.toFixed(2)} | Bluewhite: $${fee.toFixed(2)}`);
      return res.status(200).json({ received: true });
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      if (pendingOrders.has(pi.id)) pendingOrders.get(pi.id)!.status = "FAILED";
      console.log(`[STRIPE] Falhou: ${pi.id}`);
      return res.status(200).json({ received: true });
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`[WEBHOOK STRIPE ERROR] ${err.message}`);
    res.status(400).json({ error: err.message });
  }
}
