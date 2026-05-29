import type { Tenant, DropshippingLink, PendingOrder, AdCampaign } from "./config/database";

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
  adRevenue: 32450,
  adClicks: 0,
  adImpressions: 0,
  rpm: 12.50,
};

export const registrarMockDns: Record<string, { available: boolean; ownerTenantId?: string }> = {
  "meuproprionegocio.com": { available: false },
  "vanguardmoda.com": { available: false, ownerTenantId: "moda" },
  "bluewhitedigital.net": { available: false }
};

export const dropshippingDB: DropshippingLink[] = [];

export const pendingOrders = new Map<string, PendingOrder>();

export const adCampaigns: AdCampaign[] = [];

export const storeVisits: Record<string, { storeName: string; visits: number; lastVisit: string | null }> = {};

// Seed data: campanhas de exemplo para demonstração
adCampaigns.push(
  {
    id: "camp_bluewhite",
    clientName: "Bluewhite Corporation",
    targetUrl: "https://bluewhite.co.mz",
    imageUrl: "https://picsum.photos/seed/bluewhite-ad/728/90",
    placement: "FEED_TOP",
    costPerClick: 0.75,
    budget: 50000,
    spent: 12500,
    clicks: 420,
    impressions: 85000,
    totalImpressions: 85000,
    revenueEarned: 5313,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "camp_vodacom",
    clientName: "Vodacom Moçambique",
    targetUrl: "https://www.vm.co.mz",
    imageUrl: "https://picsum.photos/seed/vodacom-ad/728/90",
    placement: "FEED_GRID",
    costPerClick: 1.20,
    budget: 120000,
    spent: 48000,
    clicks: 920,
    impressions: 210000,
    totalImpressions: 210000,
    revenueEarned: 13125,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "camp_mola",
    clientName: "e-Mola (Movitel)",
    targetUrl: "https://emola.movitel.co.mz",
    imageUrl: "https://picsum.photos/seed/emola-ad/300/250",
    placement: "STORE_SIDEBAR",
    costPerClick: 0.90,
    budget: 75000,
    spent: 22300,
    clicks: 510,
    impressions: 130000,
    totalImpressions: 130000,
    revenueEarned: 8125,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
);

// Recalcular adRevenue a partir das campanhas seed
for (const camp of adCampaigns) {
  financeiroCorporativo.adRevenue += camp.spent;
  financeiroCorporativo.adClicks += camp.clicks;
  financeiroCorporativo.adImpressions += camp.impressions;
}
