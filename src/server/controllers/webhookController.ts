import { Request, Response } from "express";
import { getStripe } from "../stripe";
import { credentials } from "../config/credentials";
import { addCommission, addToCaixa, getPendingOrder, updatePendingOrderStatus, updateTenantBalance, updatePaymentStatus, getTenantById } from "../db";

const IVA_RATE = 0.16;

export async function handleMpesaCallback(req: Request, res: Response) {
  const {
    output_ResponseCode,
    output_ResponseDesc,
    output_TransactionID,
    input_TransactionReference,
    input_ThirdPartyReference
  } = req.body;

  const ref = input_TransactionReference || input_ThirdPartyReference;
  console.log(`[WEBHOOK M-PESA] Callback recebido. Ref: ${ref}`);

  if (output_ResponseCode === "INS-0" || output_ResponseCode === "0") {
    if (ref) {
      const order = await getPendingOrder(ref);
      if (order) {
        await updatePendingOrderStatus(ref, "PAID");

        const val = "amount" in order ? (order as any).amount : 0;
        const commissionRate = 0.025;
        const fee = Math.round(val * commissionRate);
        const netAmount = val - fee;
        const ivaAmount = Math.round(fee * IVA_RATE);

        addToCaixa(netAmount);
        addCommission(fee);

        const tenantHost = "tenantHost" in order ? (order as any).tenantHost
          : "metadata" in order && (order as any).metadata?.store_host
          ? (order as any).metadata.store_host : null;
        if (tenantHost) {
          await updateTenantBalance(tenantHost, val);
        }

        await updatePaymentStatus(ref, "PAID", output_TransactionID);

        console.log(`[SPLIT M-PESA] ${ref}: ${val} MZN | Lojista: ${netAmount} | Bluewhite: ${fee} | IVA: ${ivaAmount}`);
      }
    }

    return res.status(200).json({
      status: "SUCCESS",
      message: "Callback M-Pesa processado. Split executado.",
      output_TransactionID
    });
  }

  if (ref) {
    await updatePendingOrderStatus(ref, "FAILED");
    await updatePaymentStatus(ref, "FAILED");
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

      addToCaixa(amountMzn);
      addCommission(Math.round(fee * 64));

      const order = await getPendingOrder(pi.id);
      if (order) {
        const tenantId = "tenantId" in order ? (order as any).tenantId : null;
        if (tenantId) {
          await updateTenantBalance(tenantId, amountMzn);
        }
        await updatePendingOrderStatus(pi.id, "PAID");
      }

      await updatePaymentStatus(pi.id, "PAID");

      console.log(`[SPLIT STRIPE] Líquido: $${netAmount.toFixed(2)} | Bluewhite: $${fee.toFixed(2)}`);
      return res.status(200).json({ received: true });
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      await updatePendingOrderStatus(pi.id, "FAILED");
      await updatePaymentStatus(pi.id, "FAILED");
      console.log(`[STRIPE] Falhou: ${pi.id}`);
      return res.status(200).json({ received: true });
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`[WEBHOOK STRIPE ERROR] ${err.message}`);
    res.status(400).json({ error: err.message });
  }
}
