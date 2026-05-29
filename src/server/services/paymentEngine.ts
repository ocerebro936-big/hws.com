import { database, financeiroCorporativo } from "../state";
import { generateReceiptPdf } from "./receipt";
import { getStripe } from "../stripe";

const ADMIN_WALLET = "0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2";

interface ActivatePropertyOpts {
  tenantId: string;
  planId: string;
  paymentMethod: "METAMASK" | "CREDIT_CARD" | "MPESA" | "EMOLA";
  txHash?: string;
  amount: number;
  currency?: string;
  gatewayRef?: string;
  clientEmail?: string;
  clientName?: string;
  clientNuit?: string;
}

interface PaymentResult {
  success: boolean;
  tenant?: any;
  receipt?: Buffer;
  receiptId?: string;
  message: string;
  error?: string;
}

let receiptCounter = 0;

function generateReceiptId(): string {
  receiptCounter++;
  return `HWS-REC-${String(receiptCounter).padStart(6, "0")}-${Date.now().toString(36).toUpperCase()}`;
}

function findTenant(tenantId: string): any | null {
  return Object.values(database).find((t: any) => t.id === tenantId || t.domain === tenantId) || null;
}

function activateStore(tenantId: string, planId: string, paymentMethod: string, amount: number): any {
  const tenant = findTenant(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} não encontrado.`);

  tenant.licenseStatus = "PAID";
  tenant.paymentMethod = paymentMethod;
  tenant.activatedAt = new Date().toISOString();

  const nextDate = new Date();
  if (planId === "HWS_LOJA_SALE" || planId === "HWS_CORPORATE") {
    nextDate.setFullYear(nextDate.getFullYear() + 10);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  tenant.nextPaymentDate = nextDate.toISOString().split("T")[0];

  tenant.subdomainLock = true;

  if (tenant.propertyType === "banca") {
    tenant.monthlyRent = "500 MT";
  } else if (tenant.propertyType === "store_rental") {
    tenant.monthlyRent = "3.500 MT";
  }

  const valorAluguer = parseInt((tenant.monthlyRent || "3500").replace(/[^0-9]/g, "")) || 3500;
  financeiroCorporativo.comissoesRetidasTotal += valorAluguer;
  financeiroCorporativo.ivaLiquidadoTotal += Math.round(valorAluguer * 0.16);
  financeiroCorporativo.caixaBancarioPendente += amount;

  return tenant;
}

function generateReceipt(opts: {
  receiptId: string;
  clientName: string;
  clientEmail: string;
  clientNuit?: string;
  amount: number;
  currency: string;
  gateway: string;
  reference: string;
  description: string;
}): Buffer {
  return generateReceiptPdf({
    receiptId: opts.receiptId,
    clientName: opts.clientName,
    clientEmail: opts.clientEmail,
    clientNuit: opts.clientNuit || "N/A",
    amount: opts.amount,
    currency: opts.currency,
    gateway: opts.gateway,
    reference: opts.reference,
    description: opts.description,
    date: new Date().toISOString(),
  });
}

const PLAN_MAP: Record<string, { name: string; priceMT: number }> = {
  HWS_BANCA: { name: "Banca do Mercado", priceMT: 500 },
  HWS_LOJA_RENTAL: { name: "Loja Alugável", priceMT: 3500 },
  HWS_LOJA_SALE: { name: "Loja à Venda", priceMT: 150000 },
  HWS_CORPORATE: { name: "Registo Empresarial", priceMT: 12000 },
};

function getPlanInfo(planId: string): { name: string; priceMT: number } {
  return PLAN_MAP[planId] || { name: "Plano Personalizado", priceMT: 3500 };
}

/* ─────────────── Web3 Validation ─────────────── */
export async function verifyCryptoPayment(txHash: string, wallet: string): Promise<{ confirmed: boolean; blockNumber?: number }> {
  if (process.env.ALCHEMY_API_KEY) {
    try {
      const providerUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
      const res = await fetch(providerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      });
      const data = await res.json();
      if (data.result && data.result.status === "0x1") {
        return { confirmed: true, blockNumber: parseInt(data.result.blockNumber, 16) };
      }
      if (data.result && data.result.status === "0x0") {
        return { confirmed: false };
      }
      return { confirmed: false };
    } catch {
      return { confirmed: false };
    }
  }
  return { confirmed: true, blockNumber: 99999999 };
}

/* ─────────────── Stripe Checkout ─────────────── */
export async function createCheckoutSession(planId: string, tenantId: string, appUrl: string): Promise<{ url: string } | null> {
  try {
    const stripe = getStripe();
    const plan = getPlanInfo(planId);
    const usdAmount = Math.round((plan.priceMT / 64) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: plan.name,
            description: `Propriedade comercial HWS — ${plan.name}`,
          },
          unit_amount: Math.max(usdAmount, 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: { planId, tenantId, type: "property_activation" },
      success_url: `${appUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}&planId=${planId}&tenantId=${tenantId}`,
      cancel_url: `${appUrl}/?payment_cancel=true&planId=${planId}&tenantId=${tenantId}`,
    });

    return { url: session.url };
  } catch (err: any) {
    console.error("[PaymentEngine] Erro Stripe Checkout:", err.message);
    return null;
  }
}

/* ─────────────── Verify Stripe Session ─────────────── */
export async function verifyStripeSession(sessionId: string): Promise<{ paid: boolean; metadata: any }> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { paid: session.payment_status === "paid", metadata: session.metadata || {} };
  } catch {
    return { paid: false, metadata: {} };
  }
}

/* ─────────────── Stripe Webhook ─────────────── */
export async function handleStripeWebhook(event: any): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { planId, tenantId, type } = session.metadata || {};

    if (type === "property_activation" && planId && tenantId) {
      const plan = getPlanInfo(planId);
      const amountMT = plan.priceMT;

      activateStore(tenantId, planId, "CREDIT_CARD", amountMT);

      const receiptId = generateReceiptId();
      generateReceipt({
        receiptId,
        clientName: session.customer_details?.name || "Cliente HWS",
        clientEmail: session.customer_details?.email || "cliente@hws.com",
        amount: session.amount_total ? session.amount_total / 100 : amountMT,
        currency: (session.currency || "usd").toUpperCase(),
        gateway: "STRIPE",
        reference: session.id,
        description: `Activação de ${plan.name} — Hub World Shopping`,
      });

      console.log(`[PaymentEngine] Loja ${tenantId} activada via Stripe. Recibo: ${receiptId}`);
    }
  }
}

/* ─────────────── Store Activation ─────────────── */
export function activateProperty(opts: ActivatePropertyOpts): PaymentResult {
  try {
    const tenant = findTenant(opts.tenantId);
    if (!tenant) {
      return { success: false, message: "Propriedade não encontrada.", error: "TENANT_NOT_FOUND" };
    }

    activateStore(opts.tenantId, opts.planId, opts.paymentMethod, opts.amount);

    const receiptId = generateReceiptId();
    const plan = getPlanInfo(opts.planId);
    const buffer = generateReceipt({
      receiptId,
      clientName: opts.clientName || tenant.name || "Cliente HWS",
      clientEmail: opts.clientEmail || "cliente@hws.com",
      clientNuit: opts.clientNuit,
      amount: opts.amount,
      currency: opts.currency || "MT",
      gateway: opts.paymentMethod === "METAMASK" ? "METAMASK_USDC" : opts.paymentMethod,
      reference: opts.txHash || opts.gatewayRef || receiptId,
      description: `Activação de ${plan.name} — Hub World Shopping`,
    });

    return {
      success: true,
      tenant,
      receipt: buffer,
      receiptId,
      message: `✅ ${plan.name} activada com sucesso! Recibo: ${receiptId}`,
    };
  } catch (err: any) {
    return { success: false, message: "Erro ao activar propriedade.", error: err.message };
  }
}

/* ─────────────── ads.txt Generator ─────────────── */
export function generateAdsTxt(subdomain: string): string | null {
  const tenant = Object.values(database).find((t: any) => {
    const dom = t.domain || "";
    return dom.includes(subdomain) && t.licenseStatus === "PAID";
  });
  if (!tenant) return null;
  return "google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0";
}
