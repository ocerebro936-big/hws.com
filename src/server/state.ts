import type { Tenant, DropshippingLink, PendingOrder } from "./config/database";

// ==========================================
// Shared mutable state for the HWS ecosystem
// All modules import from here to ensure
// they reference the SAME objects
// ==========================================

export const database: Record<string, Tenant> = {};

export const financeiroCorporativo = {
  caixaBancarioPendente: 15000,
  comissoesRetidasTotal: 84300,
  ivaLiquidadoTotal: 13488,
  adRevenue: 32450
};

export const registrarMockDns: Record<string, { available: boolean; ownerTenantId?: string }> = {
  "meuproprionegocio.com": { available: false },
  "vanguardmoda.com": { available: false, ownerTenantId: "moda" },
  "bluewhitedigital.net": { available: false }
};

export const dropshippingDB: DropshippingLink[] = [];

export const pendingOrders = new Map<string, PendingOrder>();
