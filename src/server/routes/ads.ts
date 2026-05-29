import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { isUsingPrisma, getFinanceiro } from "../db";
import { database, adCampaigns } from "../state";

const router = Router();

const RPM = 12.50;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==========================================
// POST /api/v1/ads/purchase
// Empresas externas compram espaço publicitário
// ==========================================
router.post("/purchase", async (req: Request, res: Response) => {
  const apiKey = req.headers["x-hws-api-key"];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: "Chave de API ausente. Envie x-hws-api-key." });
  }

  const { clientName, targetUrl, imageUrl, placement, budget, cpcLimit } = req.body;
  if (!clientName || !targetUrl || !imageUrl || !placement || !budget) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios: clientName, targetUrl, imageUrl, placement, budget" });
  }

  const validPlacements = ["FEED_TOP", "STORE_SIDEBAR", "FEED_GRID"];
  if (!validPlacements.includes(placement)) {
    return res.status(400).json({ success: false, error: `Placement inválido. Use: ${validPlacements.join(", ")}` });
  }

  const costPerClick = parseFloat(cpcLimit) || 0.5;

  try {
    if (isUsingPrisma()) {
      const campaign = await prisma.adCampaign.create({
        data: { clientName, targetUrl, imageUrl, placement, costPerClick, budget: parseFloat(budget) },
      });
      return res.status(201).json({ success: true, message: "Campanha publicitária ativa no Hub Comercial.", campaignId: campaign.id });
    }

    const id = `camp_${Date.now()}`;
    adCampaigns.push({
      id,
      clientName,
      targetUrl,
      imageUrl,
      placement,
      costPerClick,
      budget: parseFloat(budget),
      spent: 0,
      clicks: 0,
      impressions: 0,
      totalImpressions: 0,
      revenueEarned: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ success: true, message: "Campanha ativa (modo dev).", campaignId: id });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/v1/ads/campaigns
// Lista campanhas activas para o feed
// ==========================================
router.get("/campaigns", (_req: Request, res: Response) => {
  const active = adCampaigns.filter((c) => c.isActive && c.spent < c.budget);
  return res.json({ success: true, campaigns: active });
});

// ==========================================
// POST /api/v1/ads/click
// Regista um clique e debita do orçamento
// ==========================================
router.post("/click", async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  if (!campaignId) return res.status(400).json({ success: false, error: "campaignId obrigatório." });

  if (isUsingPrisma()) {
    try {
      const camp = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
      if (!camp || !camp.isActive) return res.status(404).json({ success: false, error: "Campanha não encontrada ou inactiva." });
      const cost = camp.costPerClick;
      if (camp.spent + cost > camp.budget) return res.status(402).json({ success: false, error: "Orçamento esgotado." });
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { clicks: { increment: 1 }, spent: { increment: cost } },
      });
      return res.json({ success: true, cost, message: "Clique registado." });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  const camp = adCampaigns.find((c) => c.id === campaignId);
  if (!camp || !camp.isActive) return res.status(404).json({ success: false, error: "Campanha não encontrada." });
  const cost = camp.costPerClick;
  if (camp.spent + cost > camp.budget) return res.status(402).json({ success: false, error: "Orçamento esgotado." });
  camp.clicks += 1;
  camp.spent += cost;
  return res.json({ success: true, cost });
});

// ==========================================
// GET /api/v1/feed/discover
// Motor inteligente de ordenação do feed
// ==========================================
router.get("/discover", async (req: Request, res: Response) => {
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;

  const stores = Object.values(database).filter((t: any) => t.type === "store");

  const scored = stores.map((store: any) => {
    let score = 0;

    if (store.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(store.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 7) score += 30;
    }

    const productCount = (store.products || []).length;
    score += productCount * 2;

    if (lat && lon && store.latitude && store.longitude) {
      const dist = haversineDistance(lat, lon, parseFloat(store.latitude), parseFloat(store.longitude));
      if (dist <= 5) score += 50;
      else if (dist <= 15) score += 20;
    }

    return { ...store, feedScore: score };
  });

  scored.sort((a: any, b: any) => b.feedScore - a.feedScore);

  return res.json({ success: true, feed: scored });
});

// ==========================================
// POST /api/v1/traffic/register-impression
// Gateway de impressões — renda automática por tráfego
// ==========================================
router.post("/register-impression", async (req: Request, res: Response) => {
  const { campaignIds } = req.body;

  try {
    const revenuePerView = RPM / 1000;

    if (campaignIds && Array.isArray(campaignIds) && campaignIds.length > 0) {
      if (isUsingPrisma()) {
        await prisma.adCampaign.updateMany({
          where: { id: { in: campaignIds } },
          data: {
            totalImpressions: { increment: 1 },
            revenueEarned: { increment: revenuePerView },
          },
        });
      } else {
        for (const cid of campaignIds) {
          const camp = adCampaigns.find((c) => c.id === cid);
          if (camp) {
            camp.totalImpressions = (camp.totalImpressions || 0) + 1;
            camp.revenueEarned = (camp.revenueEarned || 0) + revenuePerView;
            camp.impressions = (camp.impressions || 0) + 1;
          }
        }
      }
    }

    return res.status(200).json({ success: true, message: "Impressão de tráfego computada no caixa mestre." });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// POST /api/v1/ads/external-partner-publish
// Anunciantes externos publicam campanhas
// ==========================================
router.post("/external-partner-publish", async (req: Request, res: Response) => {
  const apiSecret = req.headers["x-hws-partner-token"];
  if (!apiSecret || apiSecret !== "Bluewhite_Network_Secret_2026") {
    return res.status(401).json({ success: false, error: "Acesso negado. Token de publicidade inválido." });
  }

  const { clientName, targetUrl, imageUrl, placement, budget, costPerClick } = req.body;
  if (!clientName || !targetUrl || !imageUrl || !placement) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios: clientName, targetUrl, imageUrl, placement" });
  }

  const validPlacements = ["FEED_TOP", "STORE_SIDEBAR", "FEED_GRID"];
  if (!validPlacements.includes(placement)) {
    return res.status(400).json({ success: false, error: `Placement inválido. Use: ${validPlacements.join(", ")}` });
  }

  const cpc = parseFloat(costPerClick) || 0.75;
  const bgt = parseFloat(budget) || 0;

  try {
    if (isUsingPrisma()) {
      const campaign = await prisma.adCampaign.create({
        data: { clientName, targetUrl, imageUrl, placement, costPerClick: cpc, budget: bgt },
      });
      return res.status(201).json({ success: true, message: "Campanha em produção ativa.", campaignId: campaign.id });
    }

    const id = `camp_partner_${Date.now()}`;
    adCampaigns.push({
      id,
      clientName,
      targetUrl,
      imageUrl,
      placement,
      costPerClick: cpc,
      budget: bgt,
      spent: 0,
      clicks: 0,
      impressions: 0,
      totalImpressions: 0,
      revenueEarned: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ success: true, message: "Campanha parceira activa (modo dev).", campaignId: id });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/v1/ads/math
// Fórmula L_admin detalhada
// ==========================================
router.get("/math", (_req: Request, res: Response) => {
  const fin = getFinanceiro();
  const rpmRevenue = (fin.adImpressions / 1000) * RPM;
  const cpcRevenue = fin.adClicks * 0.75;
  const commissionRevenue = fin.comissoesRetidasTotal;

  const Ladmin = rpmRevenue + cpcRevenue + commissionRevenue;

  return res.json({
    success: true,
    formula: "L_admin = Σ(I_i × RPM) + Σ(C_j × CPC) + Σ(V_k × Comissão)",
    variables: {
      impressoes: fin.adImpressions,
      rpm: RPM,
      rpmRevenue: Math.round(rpmRevenue),
      clicks: fin.adClicks,
      cpcMedio: 0.75,
      cpcRevenue: Math.round(cpcRevenue),
      comissões: fin.comissoesRetidasTotal,
    },
    total: Math.round(Ladmin),
    currency: "MT",
  });
});

export default router;
