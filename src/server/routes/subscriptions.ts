import { Router, Request, Response } from "express";
import { createPendingOrder } from "../db";
import { database, financeiroCorporativo } from "../state";

const router = Router();

const PLANS = {
  HWS_STARTER:     { price: 1500, commission: 0.05, domain: false, maxProducts: 50,  theme: "light" },
  HWS_PRO:         { price: 3500, commission: 0.03, domain: true,  maxProducts: -1,  theme: "dark" },
  HWS_ENTERPRISE:  { price: 45000, commission: 0.00, domain: true, maxProducts: -1,  theme: "luxury" },
} as const;

router.post("/create", async (req: Request, res: Response) => {
  const { tenant_name, host_desejado, plano_escolhido, comprar_dominio, dominio_customizado, metodo_pagamento } = req.body;

  const plan = PLANS[plano_escolhido as keyof typeof PLANS];
  if (!plan) {
    return res.status(400).json({ success: false, error: "Plano inválido. Escolha: HWS_STARTER, HWS_PRO ou HWS_ENTERPRISE." });
  }

  const subdomain = `${host_desejado.toLowerCase().trim()}.hws.com`;
  if ((database as any)[subdomain]) {
    return res.status(400).json({ success: false, error: `O subdomínio '${subdomain}' já está em uso.` });
  }

  let preco_dominio = 0;
  if (comprar_dominio && dominio_customizado) {
    const d = dominio_customizado.toLowerCase().trim();
    preco_dominio = d.endsWith(".mz") ? 2500 : 1200;
  }

  const valor_total = plan.price + preco_dominio;
  const ref = `SUB-${Date.now()}`;

  const newTenant = {
    id: host_desejado.toLowerCase().trim(),
    name: tenant_name,
    type: "store" as const,
    theme: plan.theme,
    description: `Loja oficial de ${tenant_name} — Plano ${plano_escolhido.replace("HWS_", "")}.`,
    domain: subdomain,
    tagline: "A sua presença digital no Hub World Shopping.",
    accentColor: plan.theme === "luxury" ? "#f59e0b" : plan.theme === "dark" ? "#6366f1" : "#3b82f6",
    products: [],
    licenseStatus: "SUSPENDED" as const,
    ownerId: `usr_${Math.floor(Math.random() * 8000 + 1000)}`,
    balance: "0 MT",
    monthlyRent: `${plan.price} MT`,
    plan: plano_escolhido === "HWS_ENTERPRISE" ? "Enterprise" : plano_escolhido === "HWS_PRO" ? "Pro" : "Starter",
    accumulatedSales: 0,
  };

  (database as any)[subdomain] = newTenant;

  // Financeiro: registar a futura receita
  financeiroCorporativo.caixaBancarioPendente += valor_total;

  return res.status(201).json({
    success: true,
    status: "AWAITING_SETUP_PAYMENT",
    reference: ref,
    tenant: newTenant,
    detalhes_financeiros: {
      plano: `${plan.price}.00 MT`,
      dominio: `${preco_dominio}.00 MT`,
      total: `${valor_total}.00 MT`,
    },
    instrucoes_bancarias: {
      banco: "BIM / Millennium BIM",
      titular: "Bluewhite Corporation Lda.",
      nib: "0003 0000 1234 5678 9012 3",
    },
    message: "Inquilino registado. Efetue o pagamento para ativar o plano.",
  });
});

// Listar planos disponíveis
router.get("/plans", (_req: Request, res: Response) => {
  res.json({
    success: true,
    entidade: "Bluewhite Corporation Lda.",
    planos: [
      {
        id: "HWS_STARTER",
        nome: "HWS Starter",
        mensalidade: "1.500 MT",
        dominio: "Subdomínio hws.com",
        produtos: "Até 50",
        comissao: "5% por venda",
        temas: ["Clean"],
      },
      {
        id: "HWS_PRO",
        nome: "HWS Pro Workspace",
        mensalidade: "3.500 MT",
        dominio: "Subdomínio + Domínio Próprio",
        produtos: "Ilimitados",
        comissao: "3% por venda",
        temas: ["Cyberpunk", "Luxury"],
      },
      {
        id: "HWS_ENTERPRISE",
        nome: "HWS Enterprise Core",
        mensalidade: "45.000 MT (taxa única)",
        dominio: "Instância Isolada + Domínio Próprio",
        produtos: "Ilimitados",
        comissao: "0% (isenção total)",
        temas: ["Luxury"],
        manutencao: "1.200 MT/mês após 1 ano",
      },
    ],
    dominios: [
      { tipo: "Internacional (.com, .net, .org)", preco: "1.200 MT/ano" },
      { tipo: "Nacional (.co.mz, .mz)", preco: "2.500 MT/ano" },
    ],
  });
});

export default router;
