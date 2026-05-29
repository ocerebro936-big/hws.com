import { prisma } from "./prisma";
import { database, financeiroCorporativo, registrarMockDns, dropshippingDB, pendingOrders } from "./state";

let usePrismaFlag = false;

export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log("[DB] DATABASE_URL not set — using in-memory store (dev mode)");
    return false;
  }

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    usePrismaFlag = true;
    console.log("[DB] PostgreSQL connected via Prisma");

    const count = await prisma.tenant.count();
    if (count === 0) {
      console.log("[DB] Seeding initial tenants from in-memory data...");
      for (const [host, tenant] of Object.entries(database)) {
        const t = tenant as any;
        await prisma.tenant.create({
          data: {
            host,
            name: t.name,
            plan: t.plan || "starter",
            status: (t.licenseStatus === "SUSPENDED" ? "SUSPENDED" : "PAID") as any,
            theme: t.theme || "luxury",
            accumulatedBalance: t.accumulatedSales || 0,
            customDomain: t.customDomain || null,
          },
        });
      }
      console.log(`[DB] Seeded ${Object.keys(database).length} tenants`);
    }

    return true;
  } catch (err: any) {
    console.warn(`[DB] PostgreSQL unavailable (${err.message}) — using in-memory store`);
    return false;
  }
}

export function isUsingPrisma() {
  return usePrismaFlag;
}

// Tenant helpers
export async function getTenantByHost(host: string) {
  if (usePrismaFlag) {
    return prisma.tenant.findUnique({ where: { host } });
  }
  return (database as any)[host] || null;
}

export async function getTenantById(id: string) {
  if (usePrismaFlag) {
    return prisma.tenant.findUnique({ where: { id } });
  }
  return Object.values(database).find((t: any) => t.id === id) || null;
}

export async function getAllTenants() {
  if (usePrismaFlag) {
    return prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  }
  return Object.values(database);
}

export async function updateTenantBalance(host: string, amount: number) {
  if (usePrismaFlag) {
    return prisma.tenant.update({
      where: { host },
      data: { accumulatedBalance: { increment: amount } },
    });
  }
  const t = (database as any)[host];
  if (t) t.accumulatedBalance = (t.accumulatedBalance || 0) + amount;
  return t;
}

// PendingOrder helpers
export async function createPendingOrder(data: {
  orderId: string;
  tenantHost: string;
  tenantName: string;
  totalAmount: number;
  metodoEscolhido: string;
  scope: string;
  clientPhone?: string;
  gateway?: string;
  reference?: string;
}) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30min
  if (usePrismaFlag) {
    return prisma.pendingOrder.create({
      data: { ...data, scope: data.scope as any, expiresAt },
    });
  }
    const order = {
      orderId: data.orderId,
      tenantId: data.tenantHost,
      amount: data.totalAmount,
      currency: "MZN",
      gateway: data.gateway || data.metodoEscolhido,
      scope: data.scope,
      status: "PENDING" as const,
      metadata: { clientPhone: data.clientPhone || "", reference: data.reference || "" },
      createdAt: new Date().toISOString(),
    };
    pendingOrders.set(data.orderId, order as any);
  return order;
}

export async function getPendingOrder(orderId: string) {
  if (usePrismaFlag) {
    return prisma.pendingOrder.findUnique({ where: { orderId } });
  }
  return pendingOrders.get(orderId) || null;
}

export async function updatePendingOrderStatus(orderId: string, status: string) {
  if (usePrismaFlag) {
    return prisma.pendingOrder.update({ where: { orderId }, data: { status } });
  }
  const order = pendingOrders.get(orderId);
  if (order) (order as any).status = status;
  return order;
}

// Payment helpers
export async function createPayment(data: {
  tenantId: string;
  orderId: string;
  amount: number;
  gateway: string;
  scope: string;
  reference: string;
  mpesaTransactionId?: string;
  stripePaymentIntent?: string;
}) {
  if (usePrismaFlag) {
    return prisma.payment.create({ data: { ...data, scope: data.scope as any } });
  }
  return { id: `pay_${Date.now()}`, ...data, status: "PENDING", createdAt: new Date(), updatedAt: new Date() };
}

export async function updatePaymentStatus(reference: string, status: string, mpesaTransactionId?: string) {
  if (usePrismaFlag) {
    return prisma.payment.update({
      where: { reference },
      data: { status, mpesaTransactionId },
    });
  }
  return null;
}

export async function getPaymentByReference(reference: string) {
  if (usePrismaFlag) {
    return prisma.payment.findUnique({ where: { reference } });
  }
  return null;
}

export async function markPaymentFailed(reference: string) {
  if (usePrismaFlag) {
    return prisma.payment.update({ where: { reference }, data: { status: "FAILED" } });
  }
  return null;
}

// Financeiro helpers
export function getFinanceiro() {
  return financeiroCorporativo;
}

export function addCommission(fee: number) {
  financeiroCorporativo.comissoesRetidasTotal += fee;
  financeiroCorporativo.ivaLiquidadoTotal += Math.round(fee * 0.16);
}

export function addToCaixa(amount: number) {
  financeiroCorporativo.caixaBancarioPendente += amount;
}

export async function closeDb() {
  if (usePrismaFlag) {
    await prisma.$disconnect();
  }
}
