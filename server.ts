/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";

import { getStripe } from "./src/server/stripe";
import { credentials } from "./src/server/config/credentials";
import { database, financeiroCorporativo, registrarMockDns, dropshippingDB, pendingOrders } from "./src/server/state";
import type { Product, Tenant, DropshippingLink } from "./src/server/config/database";
import webhookRoutes from "./src/server/routes/webhooks";
import checkoutRoutes from "./src/server/routes/checkout";
import subscriptionRoutes from "./src/server/routes/subscriptions";
import authRoutes from "./src/server/routes/auth";
import productRoutes from "./src/server/routes/products";
import payoutRoutes from "./src/server/routes/payouts";
import { tenantResolver } from "./src/server/middleware/tenantResolver";
import { initDatabase, closeDb } from "./src/server/db";

dotenv.config();

interface TenantFull extends Tenant {
  // Bluewhite Corporation Lda. Compliance fields
  licenseStatus?: 'PAID' | 'SUSPENDED';
  ownerId?: string;
  balance?: string;
  monthlyRent?: string;
  nextPaymentDate?: string;
  nuitCorporate?: string;
  customDomain?: string | null;
  plan?: 'Starter' | 'Pro' | 'Enterprise';
  accumulatedSales?: number;
}







const app = express();

// ==========================================
// 🌐 Stripe Webhook (precisa raw body)
// Deve vir antes do express.json() global
// ==========================================
app.post("/api/v1/hws/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: any;

    try {
      const stripe = getStripe();
      const webhookSecret = credentials.internacional.stripe.webhook_secret;

      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // Fallback para simulação/desenvolvimento sem webhook secret
        event = JSON.parse(req.body.toString());
      }

      console.log(`[WEBHOOK STRIPE] Evento recebido: ${event.type}`);

      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        const amount = pi.amount / 100;
        const metadata = pi.metadata || {};

        console.log(`[FINANCEIRO GLOBAL] Pagamento de $${amount} confirmado (${pi.id})`);

        // Split triplo automático
        const commissionRate = 0.03;
        const ivaRate = 0.16;
        const fee = amount * commissionRate;
        const netAmount = amount - fee;
        const ivaAmount = fee * ivaRate;
        const amountMzn = Math.round(amount * 64); // Conversão USD → MZN (câmbio simulado)

        financeiroCorporativo.caixaBancarioPendente += amountMzn;
        financeiroCorporativo.comissoesRetidasTotal += Math.round(fee * 64);
        financeiroCorporativo.ivaLiquidadoTotal += Math.round(ivaAmount * 64);

        // Atualiza a ordem pendente se existir
        const orderId = pi.id;
        if (pendingOrders.has(orderId)) {
          const order = pendingOrders.get(orderId)!;
          order.status = "PAID";

          const tenant = Object.values(database).find(t => t.id === order.tenantId);
          if (tenant) {
            tenant.accumulatedSales = (tenant.accumulatedSales || 0) + amountMzn;
          }
        }

        console.log(`[SPLIT STRIPE] Líquido lojista: $${netAmount.toFixed(2)} | Comissão Bluewhite: $${fee.toFixed(2)} | IVA: $${ivaAmount.toFixed(2)}`);

        return res.status(200).json({ received: true });
      }

      if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object;
        if (pendingOrders.has(pi.id)) {
          pendingOrders.get(pi.id)!.status = "FAILED";
        }
        console.log(`[STRIPE] Pagamento falhou: ${pi.id}`);
        return res.status(200).json({ received: true });
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error(`[WEBHOOK STRIPE ERROR] ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  }
);

app.use(express.json());

const PORT = 3000;
const CADDY_API = process.env.CADDY_ADMIN_URL || "http://caddy:2019";

// Syncs a domain to Caddy's dynamic config (reverse proxy route)
async function syncCaddyDomain(domain: string) {
  try {
    const resp = await fetch(`${CADDY_API}/config/apps/http/servers/srv0/routes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match: [{ host: [domain] }],
        handle: [
          {
            handler: "subroute",
            routes: [
              {
                handle: [
                  {
                    handler: "reverse_proxy",
                    upstreams: [{ dial: `app:${PORT}` }],
                    headers: {
                      request: {
                        set: {
                          "X-Forwarded-Host": ["{http.request.host}"],
                          "X-Real-IP": ["{http.request.remote.host}"],
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        terminal: true,
      }),
    });
    if (resp.ok) {
      console.log(`✅ [CADDY] Rota adicionada para domínio: ${domain}`);
    } else {
      // 409 means route already exists - that's fine
      if (resp.status !== 409) {
        console.warn(`⚠️ [CADDY] Erro ao adicionar rota ${domain}: ${resp.status}`);
      }
    }
  } catch (err) {
    console.warn(`⚠️ [CADDY] Não foi possível sincronizar domínio ${domain} (Caddy indisponível?)`);
  }
}

// Removes a domain from Caddy's dynamic config
async function unsyncCaddyDomain(domain: string) {
  try {
    const routes = await (await fetch(`${CADDY_API}/config/apps/http/servers/srv0/routes/`)).json();
    const idx = (routes as any[]).findIndex((r: any) =>
      r.match?.[0]?.host?.includes(domain)
    );
    if (idx !== -1) {
      await fetch(`${CADDY_API}/config/apps/http/servers/srv0/routes/${idx}`, {
        method: "DELETE",
      });
      console.log(`🗑️ [CADDY] Rota removida para domínio: ${domain}`);
    }
  } catch (err) {
    console.warn(`⚠️ [CADDY] Erro ao remover domínio ${domain} do Caddy`);
  }
}

// Dynamic in-memory database representing stores and main shopping hub under governance of Bluewhite Corporation Lda.
Object.assign(database, {
  "hws.com": {
    id: "hub",
    name: "Hub World Shopping",
    type: "hub",
    description: "Simplificando o comércio global. O maior ponto de encontro de lojas mundiais em corredores virtuais de alta performance e interação imediata sob tutela da Bluewhite Corporation Lda.",
    theme: "light",
    domain: "hws.com",
    tagline: "O ponto de encontro do comércio mundial.",
    accentColor: "#3b82f6", // Blue
    licenseStatus: "PAID",
    ownerId: "corp_bluewhite_001",
    balance: "1.250.400 MT",
    monthlyRent: "0 MT",
    nextPaymentDate: "Perpétuo",
    nuitCorporate: "800812349", // Simulated Mozambique NUIT
    customDomain: null,
    plan: "Enterprise",
    accumulatedSales: 167000,
    products: []
  },
  "moda.hws.com": {
    id: "moda",
    name: "Vanguard Moda Premium",
    type: "store",
    theme: "dark",
    description: "Estilo sofisticado e alta costura desenhados exclusivamente para expressar a sua personalidade contemporânea com conforto e presença.",
    domain: "moda.hws.com",
    tagline: "Estilo sofisticado para quem dita tendências.",
    accentColor: "#f59e0b", // Gold/Amber
    licenseStatus: "PAID",
    ownerId: "usr_9921",
    balance: "45.000 MT",
    monthlyRent: "3.500 MT",
    nextPaymentDate: "2026-06-15",
    nuitCorporate: "522190812",
    customDomain: "vanguardmoda.com",
    plan: "Pro",
    accumulatedSales: 125000,
    products: [
      { id: 1, name: "Casaco Slim Fit Tailored", price: "4.500 MT", description: "Lã fria italiana legítima, forro acetinado, corte milimétrico preciso.", category: "Casacos" },
      { id: 2, name: "Bota Couro Urban Premium", price: "6.200 MT", description: "Feito à mão, couro com curtimento orgânico e solado antiderrapante.", category: "Calçados" },
      { id: 3, name: "Relógio Chrono Slate Carbon", price: "12.800 MT", description: "Movimento automático com reserva de marcha de 48h, pulseira de silicone vulcanizada.", category: "Acessórios" }
    ]
  },
  "tech.hws.com": {
    id: "tech",
    name: "Génio Tech Smart",
    type: "store",
    theme: "cyberpunk",
    description: "Acessórios inteligentes de ponta, dispositivos integrados de alta tecnologia e gadgets futuristas para maximizar sua performance urbana.",
    domain: "tech.hws.com",
    tagline: "Equipando as mentes do amanhã.",
    accentColor: "#06b6d4", // Cyan
    licenseStatus: "SUSPENDED", // Rent in arrears! Allows user to test licensing warning screens and simulated activation
    ownerId: "usr_0812",
    balance: "0 MT",
    monthlyRent: "4.500 MT",
    nextPaymentDate: "2026-05-10",
    nuitCorporate: "491028345",
    customDomain: null,
    plan: "Starter",
    accumulatedSales: 42000,
    products: [
      { id: 1, name: "Auriculares Wireless Pro ANC", price: "2.100 MT", description: "Cancelamento ativo híbrido de 45dB, áudio espacial dinâmico tridimensional.", category: "Áudio" },
      { id: 2, name: "Carregador de Indução Rápido 50W", price: "1.500 MT", description: "Esfriamento termoelétrico integrado que previne aquecimento do smartphone.", category: "Energia" },
      { id: 3, name: "Teclado Mecânico Matrix-X 60%", price: "5.800 MT", description: "Switches óticos ultrarrápidos, chapa de alumínio anodizado e iluminação neon customizada.", category: "Periféricos" }
    ]
  }
});

/**
 * Flexible Tenant Host Resolver.
 * Resolves tenant space by matching custom domains, subdomains,
 * or simulated URL query parameters (which allow direct exploration in sandboxed iframes).
 */
function findTenant(host: string, urlParam?: string): { tenant: Tenant; detectedVia: string; detectedDomain: string } {
  // 1. Resolve via custom routing simulation query parameter (high-priority in the AI Studio playground)
  if (urlParam) {
    const cleanParam = urlParam.toLowerCase().trim();
    
    if (cleanParam === "hub" || cleanParam === "hws.com") {
      return { 
        tenant: database["hws.com"], 
        detectedVia: "Parâmetro URL (Simulação de Hub)", 
        detectedDomain: "hws.com" 
      };
    }
    
    // Exact domain match
    if (database[cleanParam]) {
      return { 
        tenant: database[cleanParam], 
        detectedVia: "Parâmetro URL (Domínio Completo)", 
        detectedDomain: cleanParam 
      };
    }
    
    // Store ID match (e.g. "moda")
    const foundById = Object.values(database).find(t => t.id === cleanParam);
    if (foundById) {
      return { 
        tenant: foundById, 
        detectedVia: "Parâmetro URL (Identificador da Loja)", 
        detectedDomain: foundById.domain 
      };
    }
    
    // Suffix match (prefix of hws.com)
    const foundByPrefix = Object.keys(database).find(d => d.startsWith(cleanParam + "."));
    if (foundByPrefix) {
      return { 
        tenant: database[foundByPrefix], 
        detectedVia: "Parâmetro URL (Estilo Subdomínio)", 
        detectedDomain: foundByPrefix 
      };
    }
  }

  // 2. Resolve via Host Header
  const cleanHost = (host || "").toLowerCase().split(":")[0]; // remove port

  // Is exact domain registered?
  if (database[cleanHost]) {
    return { 
      tenant: database[cleanHost], 
      detectedVia: "Cabecalho Host HTTP (Domínio Direto)", 
      detectedDomain: cleanHost 
    };
  }

  // Checks subdomains (e.g. if host is fashion.hws.com)
  for (const domain of Object.keys(database)) {
    if (cleanHost === domain || cleanHost.endsWith("." + domain)) {
      return { 
        tenant: database[domain], 
        detectedVia: "Resolução DNS de Subdomínio", 
        detectedDomain: domain 
      };
    }
  }

  // Sandbox fallback routing: check if host contains store IDs (e.g. moda-run-app... or tech-xxxxx...)
  for (const tenant of Object.values(database)) {
    if (cleanHost.includes(tenant.id + "-") || cleanHost.startsWith(tenant.id + ".")) {
      return { 
        tenant, 
        detectedVia: "Header Mapeado de Sandbox", 
        detectedDomain: tenant.domain 
      };
    }
  }

  // Fallback to Main Central Hub Shopping
  return { 
    tenant: database["hws.com"], 
    detectedVia: "Padrão de Segurança (Hub Central HWS)", 
    detectedDomain: "hws.com" 
  };
}

// REST GET /api/tenant: Resolves and serves dynamic configuration of active tenant
app.get("/api/tenant", (req, res) => {
  const simTenant = req.query.tenant as string;
  const originalHost = req.headers.host || "hws.com";
  const { tenant, detectedVia, detectedDomain } = findTenant(originalHost, simTenant);
  
  res.json({
    tenant,
    detectedVia,
    detectedDomain,
    originalHost,
    success: true
  });
});

// REST GET /api/tenants: Serves database directory of all registered tenant spaces
app.get("/api/tenants", (req, res) => {
  res.json({
    tenants: Object.values(database),
    success: true
  });
});

// REST POST /api/tenants: Contracts/Rents a new virtual tenant store inside HWS under Bluewhite Corp guidelines
app.post("/api/tenants", (req, res) => {
  const { name, id, theme, description, tagline, accentColor, products } = req.body;
  
  if (!name || !id) {
    return res.status(400).json({ 
      success: false, 
      error: "O nome da loja e o identificador do subdomínio são obrigatórios." 
    });
  }

  const cleanId = id.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const subdomain = `${cleanId}.hws.com`;

  if (database[subdomain]) {
    return res.status(400).json({ 
      success: false, 
      error: `O subdomínio '${subdomain}' já foi contratado e está reservado no HWS.` 
    });
  }

  const generatedNuit = String(Math.floor(Math.random() * 800000000 + 100000000));
  const newTenant: Tenant = {
    id: cleanId,
    name,
    type: "store",
    theme: theme || "light",
    description: description || `Vitrine digital premium para o setor de ${name}, operando em alto desempenho no ecossistema multi-tenant HWS.`,
    domain: subdomain,
    tagline: tagline || "Sinônimo de inovação e exclusividade.",
    accentColor: accentColor || "#10b981", // Emerald
    products: products || [],
    
    // Legal & Licensing Defaults under Bluewhite Lda rules
    licenseStatus: 'PAID',
    ownerId: `usr_${Math.floor(Math.random() * 8000 + 1000)}`,
    balance: "5.000 MT",
    monthlyRent: theme === 'cyberpunk' ? "4.500 MT" : theme === 'dark' ? "3.500 MT" : "2.500 MT",
    nextPaymentDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    nuitCorporate: generatedNuit,
    customDomain: null,
    plan: theme === 'cyberpunk' ? 'Pro' : theme === 'dark' ? 'Pro' : 'Starter',
    accumulatedSales: Math.floor(Math.random() * 15000 + 2000) // Give dynamic initial simulated sales
  };

  database[subdomain] = newTenant;

  // Ao contratar, adiciona taxas administrativas à Bluewhite (margem de implantação/adesão de 1.500 MT)
  const taxaAdesao = 1500;
  financeiroCorporativo.comissoesRetidasTotal += taxaAdesao;
  financeiroCorporativo.ivaLiquidadoTotal += Math.round(taxaAdesao * 0.16); 
  financeiroCorporativo.caixaBancarioPendente += taxaAdesao;

  res.json({
    tenant: newTenant,
    success: true,
    message: `Espaço virtual contratado com sucesso! Loja '${name}' ativa sob o subdomínio '${subdomain}' (NUIT: ${generatedNuit}).`
  });
});

// REST POST /api/tenants/:id/renew: Regularizes/pays rent of a suspended tenant inside HWS
app.post("/api/tenants/:id/renew", (req, res) => {
  const tenantId = req.params.id.toLowerCase().trim();
  const targetKey = Object.keys(database).find(
    k => database[k].id === tenantId || k === tenantId
  );

  if (!targetKey) {
    return res.status(404).json({ success: false, error: "Locatário não encontrado." });
  }

  const tenant = database[targetKey];
  tenant.licenseStatus = 'PAID';
  tenant.nextPaymentDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  
  // Extrai o valor do aluguel para somar ao financeiro corporativo
  const valorAluguer = parseInt((tenant.monthlyRent || "3500").replace(/[^0-9]/g, "")) || 3500;
  financeiroCorporativo.comissoesRetidasTotal += valorAluguer;
  financeiroCorporativo.ivaLiquidadoTotal += Math.round(valorAluguer * 0.16);
  financeiroCorporativo.caixaBancarioPendente += valorAluguer;

  res.json({
    success: true,
    tenant,
    message: `Faturamento quitado com sucesso para ${tenant.name}! Licença regularizada sob as normas da Bluewhite Corporation Lda.`
  });
});

// REST POST /api/tenants/:id/toggle-status: Toggles active/suspended license status for Sandbox testing
app.post("/api/tenants/:id/toggle-status", (req, res) => {
  const tenantId = req.params.id.toLowerCase().trim();
  const targetKey = Object.keys(database).find(
    k => database[k].id === tenantId || k === tenantId
  );

  if (!targetKey) {
    return res.status(404).json({ success: false, error: "Locatário não encontrado." });
  }

  const tenant = database[targetKey];
  tenant.licenseStatus = tenant.licenseStatus === 'SUSPENDED' ? 'PAID' : 'SUSPENDED';
  
  res.json({
    success: true,
    tenant,
    message: `Medida administrativa aplicada. O estado da licença de ${tenant.name} agora é ${tenant.licenseStatus}.`
  });
});

// REST POST /api/tenants/:id/products: Adds a custom product to a tenant's inventory
app.post("/api/tenants/:id/products", (req, res) => {
  const tenantId = req.params.id;
  const { name, price, description, category } = req.body;

  if (!name || !price) {
    return res.status(400).json({ 
      success: false, 
      error: "O nome do produto e o preço são obrigatórios." 
    });
  }

  const normalizedId = tenantId.toLowerCase().trim();
  const targetKey = Object.keys(database).find(
    k => database[k].id === normalizedId || k === normalizedId
  );

  if (!targetKey) {
    return res.status(404).json({ 
      success: false, 
      error: "Espaço ou loja virtual não encontrados no banco de dados." 
    });
  }

  const tenant = database[targetKey];
  const newId = tenant.products.length ? Math.max(...tenant.products.map(p => p.id)) + 1 : 1;
  
  const priceWithCurrency = price.includes("MT") ? price : `${price} MT`;
  const newProduct = {
    id: newId,
    name,
    price: priceWithCurrency,
    description: description || "Garantia de procedência original, suporte pós-venda integrado HWS.",
    category: category || "Destaques"
  };

  tenant.products.unshift(newProduct);

  res.json({
    product: newProduct,
    success: true,
    message: "Produto indexado no catálogo da loja!"
  });
});

// ==========================================
// 🌐 API DE PESQUISA DE DOMÍNIOS PERSONALIZADOS (HWS Registrar Gateway)
// ==========================================
app.get('/api/v1/hws/domains/check', (req, res) => {
  const q = req.query.q as string;

  if (!q) {
    return res.status(400).json({ success: false, error: "Por favor, indique o domínio a pesquisar." });
  }

  const queryDomain = q.toLowerCase().trim();
  const existsState = registrarMockDns[queryDomain];

  if (existsState && existsState.available === false) {
    const rootName = queryDomain.split('.')[0];
    return res.status(200).json({
      dominio: queryDomain,
      disponivel: false,
      status: "TAKEN",
      sugestao: `tente-${rootName}hub.com`
    });
  }

  // Preço de venda comercial oficial fixado em 1.200 Meticais (MT) pela Bluewhite Corp.
  return res.status(200).json({
    dominio: queryDomain,
    disponivel: true,
    status: "AVAILABLE",
    precificacao: {
      moeda: "MT",
      preco_anual: 1200,
      renovacao_garantida: true
    }
  });
});

// ==========================================
// 🛒 REGISTRO E COMPRA DE DOMÍNIO INTERATIVO
// ==========================================
app.post('/api/v1/hws/domains/buy', async (req, res) => {
  const { tenantId, domain, skipStripe } = req.body;

  if (!tenantId || !domain) {
    return res.status(400).json({ success: false, error: "Campos 'tenantId' e 'domain' são obrigatórios." });
  }

  const targetId = tenantId.toLowerCase().trim();
  const targetDomain = domain.toLowerCase().trim();

  const targetKey = Object.keys(database).find(
    k => database[k].id === targetId || k === targetId
  );

  if (!targetKey) {
    return res.status(404).json({ success: false, error: "Lojista/Tenant não encontrado no HWS." });
  }

  const tenant = database[targetKey];

  if (registrarMockDns[targetDomain] && registrarMockDns[targetDomain].available === false) {
    return res.status(400).json({ success: false, error: "O domínio pretendido já se encontra registrado." });
  }

  if (!skipStripe) {
    try {
      const stripe = getStripe();
      const appUrl = req.headers.referer || 'http://localhost:3000';
      const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Registro de Domínio Próprio (${targetDomain})`,
              description: `Provisionamento e mapeamento DNS via Bluewhite Corp p/ loja ${tenant.name}. Equivalente a 1.200 MT.`,
            },
            unit_amount: 1900, // $19.00 USD
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: {
          type: 'domain',
          tenantId: tenant.id,
          domainName: targetDomain
        },
        success_url: `${cleanAppUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}&type=domain&tenantId=${tenant.id}&domainName=${targetDomain}`,
        cancel_url: `${cleanAppUrl}/?payment_cancel=true&type=domain&tenantId=${tenant.id}`
      });

      return res.json({
        success: true,
        url: session.url,
        message: "Redirecionando para portal Stripe Checkout..."
      });
    } catch (err: any) {
      console.error("Erro Stripe Checkout Domínio:", err);
    }
  }

  // Efetua a aquisição
  registrarMockDns[targetDomain] = { available: false, ownerTenantId: tenant.id };
  tenant.customDomain = targetDomain;

  // Sincroniza domínio no Caddy (proxy reverso automático)
  syncCaddyDomain(targetDomain);

  // Lógica de Vendas e Margem Comercial:
  // Preço cobrado do lojista: 1.200 MT
  // Custo de Ativação do Registrar DNS: 600 MT
  // Margem de lucro puro por serviço para Bluewhite Corporation: 600 MT (Split e IVA aplicados sobre a margem)
  const margemServico = 600;
  financeiroCorporativo.comissoesRetidasTotal += margemServico;
  financeiroCorporativo.ivaLiquidadoTotal += Math.round(margemServico * 0.16); // 16% IVA Moçambicano
  financeiroCorporativo.caixaBancarioPendente += 1200;

  res.json({
    success: true,
    tenant,
    message: `Domínio próprio '${targetDomain}' comprado e configurado para a loja '${tenant.name}' com sucesso!`
  });
});

// ==========================================
// 📊 PAINEL GERAL DE CONTROLE DO ADMINISTRADOR (Auditoria Bluewhite Lda.)
// ==========================================
app.get('/api/v1/hws/admin/dashboard', (req, res) => {
  const stores = Object.values(database).filter(t => t.type === 'store');
  const total_lojas = stores.length;
  const lojas_ativas = stores.filter(l => l.licenseStatus === 'PAID').length;
  const lojas_suspensas = total_lojas - lojas_ativas;

  // GMV Total das lojas
  const gmv_total = stores.reduce((acc, s) => acc + (s.accumulatedSales || 0), 0);

  res.status(200).json({
    entidade_gestora: "Bluewhite Corporation Lda.",
    data_relatorio: new Date().toLocaleDateString('pt-MZ'),
    metricas_gerais: {
      total_inquilinos_digitais: total_lojas,
      lojas_operando_online: lojas_ativas,
      lojas_bloqueadas_por_aluguer: lojas_suspensas,
      volume_total_vendas_shopping: `${gmv_total.toLocaleString('pt-PT')} MT`
    },
    saude_financeira_corporacao: {
      saldo_bancario_a_validar: `${financeiroCorporativo.caixaBancarioPendente.toLocaleString('pt-PT')} MT`,
      lucro_puro_por_comissao: `${financeiroCorporativo.comissoesRetidasTotal.toLocaleString('pt-PT')} MT`,
      impostos_iva_acumulados: `${financeiroCorporativo.ivaLiquidadoTotal.toLocaleString('pt-PT')} MT`
    },
    diretorio_de_lojas: stores.map(s => ({
      id: s.id,
      name: s.name,
      host: s.domain,
      dominio_proprio: s.customDomain || null,
      plano: s.plan || 'Starter',
      status: s.licenseStatus === 'PAID' ? 'ACTIVE' : 'SUSPENDED',
      faturamento_acumulado: s.accumulatedSales || 0,
      nuit: s.nuitCorporate || "Pendente",
      proximo_vencimento: s.nextPaymentDate || "A regular"
    }))
  });
});

// ==========================================
// 💳 STRIPE PAYMENTS CONTROLLER (Functional Sandbox Flow)
// ==========================================
app.post('/api/v1/hws/payments/create-session', async (req, res) => {
  const { type, tenantId, domainName, amount, returnUrl } = req.body;

  try {
    const stripe = getStripe();
    const appUrl = returnUrl || process.env.APP_URL || 'http://localhost:3000';

    let lineItems: Array<any> = [];
    let metadata: Record<string, string> = {
      type,
      tenantId
    };

    if (type === 'domain') {
      if (!domainName) {
        return res.status(400).json({ success: false, error: "Nome do domínio é obrigatório." });
      }
      metadata.domainName = domainName;
      // Preço de venda: 1.200 MT (about $19.00 USD)
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Registro de Domínio Próprio (${domainName})`,
            description: `Provisionamento e mapeamento DNS via Bluewhite Corp p/ loja ${tenantId}. Equivalente a 1.200 MT.`,
          },
          unit_amount: 1900, // 19.00 USD
        },
        quantity: 1,
      }];
    } else if (type === 'license') {
      const targetKey = Object.keys(database).find(
        k => database[k].id === tenantId || k === tenantId
      );
      if (!targetKey) {
        return res.status(404).json({ success: false, error: "Loja não encontrada." });
      }
      const tenant = database[targetKey];
      const monthlyRentNum = parseInt((tenant.monthlyRent || "3500").replace(/[^0-9]/g, "")) || 3500;
      // Convert 3500 MT to ~$55 USD, or 4500 MT to ~$70 USD, 2505 MT to ~$40 USD
      const usdAmount = monthlyRentNum === 4500 ? 7000 : monthlyRentNum === 3500 ? 5500 : 4000;

      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Regularização / Renovação de Aluguel (${tenant.name})`,
            description: `Pagamento mensalidade de ${tenant.monthlyRent} do plano ${tenant.plan}. Cobrado via intermediação Bluewhite Corp.`,
          },
          unit_amount: usdAmount,
        },
        quantity: 1,
      }];
    } else if (type === 'cart') {
      const parsedAmount = parseInt(amount) || 0;
      if (parsedAmount <= 0) {
        return res.status(400).json({ success: false, error: "Valor do carrinho inválido." });
      }
      metadata.amount = String(parsedAmount);
      // Convert cart MT to USD (approx. dividing by 64)
      const usdAmount = Math.max(100, Math.round((parsedAmount / 64) * 100)); // Minimum 1.00 USD

      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Compra no ecossistema ${database[tenantId]?.name || tenantId}`,
            description: `Faturamento unificado processado via gateway HWS. Protocolo Bluewhite Corp.`,
          },
          unit_amount: usdAmount,
        },
        quantity: 1,
      }];
    } else {
      return res.status(400).json({ success: false, error: "Tipo de pagamento desconhecido." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      metadata,
      success_url: `${appUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}&type=${type}&tenantId=${tenantId}&domainName=${domainName || ''}&amount=${amount || 0}`,
      cancel_url: `${appUrl}/?payment_cancel=true&type=${type}&tenantId=${tenantId}`
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error("Erro Stripe Session:", error);
    res.status(500).json({ success: false, error: error.message || "Erro ao conectar ao Stripe." });
  }
});

app.post('/api/v1/hws/payments/verify-session', async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ success: false, error: "ID da sessão é obrigatório." });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const { type, tenantId, domainName, amount } = session.metadata || {};

      const targetKey = Object.keys(database).find(
        k => database[k].id === tenantId || k === tenantId
      );

      if (!targetKey) {
        return res.status(404).json({ success: false, error: "Tenant correspondente não encontrado." });
      }

      const tenant = database[targetKey];

      if (type === 'domain') {
        const targetDomain = (domainName || '').toLowerCase().trim();
        if (targetDomain) {
          registrarMockDns[targetDomain] = { available: false, ownerTenantId: tenant.id };
          tenant.customDomain = targetDomain;

          // Sincroniza domínio no Caddy (proxy reverso automático)
          syncCaddyDomain(targetDomain);

          // Split e impostos calculados
          const margemServico = 600;
          financeiroCorporativo.comissoesRetidasTotal += margemServico;
          financeiroCorporativo.ivaLiquidadoTotal += Math.round(margemServico * 0.16);
          financeiroCorporativo.caixaBancarioPendente += 1200;
        }
      } else if (type === 'license') {
        tenant.licenseStatus = 'PAID';
        tenant.nextPaymentDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

        const valorAluguer = parseInt((tenant.monthlyRent || "3500").replace(/[^0-9]/g, "")) || 3500;
        financeiroCorporativo.comissoesRetidasTotal += valorAluguer;
        financeiroCorporativo.ivaLiquidadoTotal += Math.round(valorAluguer * 0.16);
        financeiroCorporativo.caixaBancarioPendente += valorAluguer;
      } else if (type === 'cart') {
        const valPago = parseInt(amount || '0') || 0;
        tenant.accumulatedSales = (tenant.accumulatedSales || 0) + valPago;

        // Comissões (3%)
        const comissao = Math.round(valPago * 0.03);
        financeiroCorporativo.comissoesRetidasTotal += comissao;
        financeiroCorporativo.ivaLiquidadoTotal += Math.round(comissao * 0.16);
        financeiroCorporativo.caixaBancarioPendente += valPago;
      }

      return res.json({ 
        success: true, 
        message: "Pagamento verificado com sucesso pelo gateway Stripe!", 
        transaction: {
          type,
          tenantId,
          domainName,
          amount,
          stripeSessionId: session.id
        }
      });
    } else {
      return res.status(400).json({ success: false, error: "A sessão de pagamento não consta como paga." });
    }
  } catch (error: any) {
    console.error("Erro Verificação Stripe:", error);
    res.status(500).json({ success: false, error: error.message || "Erro ao validar cobrança." });
  }
});

// ==========================================
// 🔒 On-Demand TLS Verification for Caddy
// Caddy calls this before issuing SSL certs
// ==========================================
app.get("/api/v1/hws/domains/verify", (req, res) => {
  const domain = (req.query.domain as string || "").toLowerCase().trim();

  if (!domain) {
    return res.status(400).json({ success: false });
  }

  // Check if domain belongs to an active tenant (main domain or custom)
  const tenant = Object.values(database).find(
    t => t.domain === domain || t.customDomain === domain
  );

  if (tenant && tenant.licenseStatus === "PAID") {
    return res.status(200).json({ success: true, tenantId: tenant.id });
  }

  // Also check if it's the main hub
  if (domain === "hws.com" || domain.endsWith(".hws.com")) {
    return res.status(200).json({ success: true, tenantId: "hub" });
  }

  res.status(404).json({ success: false, error: "Domínio não autorizado para SSL." });
});

// ==========================================
// 🔒 Caddy On-Demand TLS Validation
// Caddy chama este endpoint antes de emitir SSL
// Retorna 200 OK para domínios autorizados
// ==========================================
app.get("/api/v1/hws/domains/validate", (req, res) => {
  const domain = (req.query.domain as string || "").toLowerCase().trim();

  if (!domain) {
    return res.status(400).send("Bad Request");
  }

  // Verifica se o domínio pertence a um inquilino ativo
  const tenant = Object.values(database).find(
    t => t.domain === domain || t.customDomain === domain
  );

  if (tenant && tenant.licenseStatus === "PAID") {
    return res.status(200).send("OK");
  }

  // Hub e subdomínios autorizados
  if (domain === "hws.com" || domain.endsWith(".hws.com")) {
    return res.status(200).send("OK");
  }

  res.status(404).send("Unauthorized Domain");
});

// ==========================================
// 📦 DROPSHIPPING / CROSS-DOCKING MODULE
// Permite que lojistas listem produtos de
// outros inquilinos com split de pagamento
// ==========================================

// GET /api/v1/hws/dropshipping/links/:storeId
// Lista todos os links de dropshipping de uma loja
app.get("/api/v1/hws/dropshipping/links/:storeId", (req, res) => {
  const storeId = req.params.storeId.toLowerCase().trim();

  const asTarget = dropshippingDB.filter(l => l.targetStoreId === storeId);
  const asSource = dropshippingDB.filter(l => l.sourceStoreId === storeId);

  res.json({
    success: true,
    storeId,
    imported: asTarget,
    supplied: asSource,
    total: asTarget.length + asSource.length
  });
});

// POST /api/v1/hws/dropshipping/import
// Importa um produto de uma loja fornecedora para a vitrine do revendedor
app.post("/api/v1/hws/dropshipping/import", (req, res) => {
  const { targetStoreId, sourceStoreId, productId, markupPercentage } = req.body;

  if (!targetStoreId || !sourceStoreId || !productId) {
    return res.status(400).json({
      success: false,
      error: "targetStoreId, sourceStoreId e productId são obrigatórios."
    });
  }

  // Localiza a loja fornecedora
  const sourceKey = Object.keys(database).find(
    k => database[k].id === sourceStoreId || k === sourceStoreId
  );
  if (!sourceKey) {
    return res.status(404).json({ success: false, error: "Fornecedor não encontrado no HWS." });
  }
  const sourceStore = database[sourceKey];

  // Localiza a loja revendedora
  const targetKey = Object.keys(database).find(
    k => database[k].id === targetStoreId || k === targetStoreId
  );
  if (!targetKey) {
    return res.status(404).json({ success: false, error: "Loja revendedora não encontrada no HWS." });
  }
  const targetStore = database[targetKey];

  // Verifica se o produto existe no fornecedor
  const originalProduct = sourceStore.products.find(p => p.id === Number(productId));
  if (!originalProduct) {
    return res.status(404).json({
      success: false,
      error: `Produto ID ${productId} não encontrado no inventário de ${sourceStore.name}.`
    });
  }

  // Extrai o preço de custo numérico (ex: "4.500 MT" → 4500)
  const costPrice = parseInt(originalProduct.price.replace(/[^0-9]/g, "")) || 0;
  if (costPrice <= 0) {
    return res.status(400).json({ success: false, error: "Preço do produto inválido." });
  }

  // Calcula markup e preço final
  const markup = Math.max(0, Number(markupPercentage) || 30); // default 30%
  const resellerProfit = Math.round(costPrice * (markup / 100));
  const bluewhiteCommission = Math.round(costPrice * 0.03); // 3% taxa de intermediação
  const finalPrice = costPrice + resellerProfit;

  // Cria o link de cross-docking
  const link: DropshippingLink = {
    id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    productId: originalProduct.id,
    productName: originalProduct.name,
    sourceStoreId: sourceStore.id,
    targetStoreId: targetStore.id,
    costPrice,
    finalPrice,
    resellerProfit,
    bluewhiteCommission,
    createdAt: new Date().toISOString(),
    status: "ACTIVE"
  };

  dropshippingDB.push(link);

  res.status(201).json({
    success: true,
    message: `Produto '${originalProduct.name}' vinculado à vitrine de ${targetStore.name} com margem de ${markup}%.`,
    dropshipping: {
      id: link.id,
      product: link.productName,
      source: sourceStore.name,
      reseller: targetStore.name,
      costPrice: `${costPrice.toLocaleString('pt-PT')} MT`,
      finalPrice: `${finalPrice.toLocaleString('pt-PT')} MT`,
      resellerProfit: `${resellerProfit.toLocaleString('pt-PT')} MT`,
      commission: `${bluewhiteCommission.toLocaleString('pt-PT')} MT`,
      markup: `${markup}%`
    }
  });
});

// POST /api/v1/hws/dropshipping/checkout
// Processa uma venda de dropshipping com split triplo de pagamento
app.post("/api/v1/hws/dropshipping/checkout", (req, res) => {
  const { dropshippingId, customerInfo } = req.body;

  if (!dropshippingId) {
    return res.status(400).json({ success: false, error: "ID do link de dropshipping é obrigatório." });
  }

  // Localiza o link de cross-docking
  const linkIndex = dropshippingDB.findIndex(l => l.id === dropshippingId);
  if (linkIndex === -1) {
    return res.status(404).json({ success: false, error: "Link de dropshipping não encontrado." });
  }

  const link = dropshippingDB[linkIndex];
  if (link.status === "SOLD") {
    return res.status(400).json({ success: false, error: "Este produto já foi vendido através deste link." });
  }

  // Localiza as lojas envolvidas
  const sourceStore = Object.values(database).find(t => t.id === link.sourceStoreId);
  const targetStore = Object.values(database).find(t => t.id === link.targetStoreId);

  if (!sourceStore || !targetStore) {
    return res.status(404).json({ success: false, error: "Loja envolvida na transação não encontrada." });
  }

  // ==========================================
  // 💰 SPLIT TRIPLO DE PAGAMENTO
  // ==========================================

  // 1. Fornecedor: recebe o preço de custo
  const supplierAmount = link.costPrice;
  sourceStore.accumulatedSales = (sourceStore.accumulatedSales || 0) + supplierAmount;

  // 2. Revendedor: recebe o lucro markup
  const resellerAmount = link.resellerProfit;
  targetStore.accumulatedSales = (targetStore.accumulatedSales || 0) + resellerAmount;

  // 3. Bluewhite Corporation: taxa de intermediação (3%)
  const commissionAmount = link.bluewhiteCommission;
  financeiroCorporativo.comissoesRetidasTotal += commissionAmount;
  financeiroCorporativo.ivaLiquidadoTotal += Math.round(commissionAmount * 0.16);
  financeiroCorporativo.caixaBancarioPendente += (supplierAmount + resellerAmount);

  // Marca o link como vendido
  dropshippingDB[linkIndex] = { ...link, status: "SOLD" };

  res.json({
    success: true,
    message: `Venda cross-docking processada! Split triplo executado: ${supplierAmount} MT fornecedor, ${resellerAmount} MT revendedor, ${commissionAmount} MT Bluewhite.`,
    transaction: {
      linkId: link.id,
      product: link.productName,
      supplier: {
        store: sourceStore.name,
        amount: `${supplierAmount.toLocaleString('pt-PT')} MT`
      },
      reseller: {
        store: targetStore.name,
        amount: `${resellerAmount.toLocaleString('pt-PT')} MT`
      },
      bluewhite: {
        commission: `${commissionAmount.toLocaleString('pt-PT')} MT`,
        iva: `${Math.round(commissionAmount * 0.16).toLocaleString('pt-PT')} MT`
      },
      total: `${(supplierAmount + resellerAmount + commissionAmount).toLocaleString('pt-PT')} MT`,
      customer: customerInfo || "Cliente anónimo",
      timestamp: new Date().toISOString()
    }
  });
});

// ==========================================
// 💳 CHECKOUT — gerido pelo módulo modular
// src/server/routes/checkout.ts (mounted at /api/v1/hws/checkout)
// ==========================================

// GET /api/v1/hws/payments/methods
// Lista métodos de pagamento disponíveis por escopo
app.get("/api/v1/hws/payments/methods", (_req, res) => {
  res.json({
    success: true,
    entidade: "Bluewhite Corporation Lda.",
    nacional: [
      {
        id: "MPESA",
        nome: "M-Pesa (Vodacom)",
        moeda: "MZN",
        taxa: "2.5% por transação",
        icon: "https://www.vodacom.co.mz/sites/default/files/mpesa-icon.png",
        disponivel: true
      },
      {
        id: "EMOLA",
        nome: "e-Mola (Movitel)",
        moeda: "MZN",
        taxa: "2.0% por transação",
        disponivel: true
      }
    ],
    internacional: [
      {
        id: "STRIPE",
        nome: "Cartões (Visa/Mastercard/Apple Pay/Google Pay)",
        moeda: "USD, EUR, ZAR",
        taxa: "2.9% + 0.30 USD",
        disponivel: true
      },
      {
        id: "PAYPAL",
        nome: "PayPal Commerce",
        moeda: "USD, EUR",
        taxa: "2.99% + 0.49 USD",
        disponivel: true
      }
    ]
  });
});

// ==========================================
// 🇲🇿 WEBHOOK M-PESA — gerido pelo módulo modular
// src/server/controllers/webhookController.ts
// src/server/routes/webhooks.ts (mounted at /api/v1/hws/webhooks)
// ==========================================

// GET /api/v1/hws/payments/orders/:id
// Consulta o estado de uma ordem de pagamento
app.get("/api/v1/hws/payments/orders/:id", (req, res) => {
  const id = req.params.id;
  const order = pendingOrders.get(id) || Array.from(pendingOrders.values()).find(o => o.orderId === id);

  if (!order) {
    return res.status(404).json({ success: false, error: "Ordem não encontrada." });
  }

  res.json({ success: true, order });
});

// ==========================================
// 🔐 Caddy On-Demand TLS — Domain Validation
// ==========================================
// Endpoint consultado pelo Caddy antes de emitir certificado SSL
// Retorna 200 se o domínio for permitido, 403 se não
app.get("/api/v1/hws/domains/validate", (req, res) => {
  const domain = (req.query.domain as string || "").toLowerCase();

  // Permitir subdomínios *.hws.com
  if (domain.endsWith(".hws.com") || domain === "hws.com") {
    return res.status(200).json({ status: "ok" });
  }

  // Permitir domínios personalizados registados nos tenants
  for (const tenant of Object.values(database)) {
    const t = tenant as any;
    if (t.customDomain && t.customDomain.toLowerCase() === domain) {
      return res.status(200).json({ status: "ok", tenant: t.name });
    }
  }

  // Bloquear domínios não registados
  return res.status(403).json({ status: "denied", reason: "Domínio não registado na Bluewhite Corporation." });
});

// ==========================================
// 🩺 Health Check / Readiness Probe
// ==========================================
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    tenants: Object.keys(database).length,
    database: process.env.DATABASE_URL ? "postgresql" : "in-memory",
    version: "2.0.0"
  });
});

// Setup Vite & static assets rendering
async function startServer() {
  // Initialize database (Prisma PostgreSQL in production, in-memory fallback)
  await initDatabase();

  // Mount modular routes (ANTES do Vite middleware)
  app.use("/api/v1/hws/checkout", checkoutRoutes);
  app.use("/api/v1/hws/webhooks", webhookRoutes);
  app.use("/api/v1/hws/subscriptions", subscriptionRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/products", productRoutes);
  app.use("/api/v1/hws", payoutRoutes);
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Tenant resolver (renderiza loja SSR para subdomínios/domínios externos)
  app.use(tenantResolver);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [HWS] Plataforma rodando com sucesso na porta ${PORT}`);
    console.log(`🌐 Mapeamentos locais: hws.com, moda.hws.com, tech.hws.com`);
    console.log(`🔒 On-Demand TLS: /api/v1/hws/domains/verify | /api/v1/hws/domains/validate`);
    console.log(`📦 Dropshipping: /api/v1/hws/dropshipping/import | /checkout | /links/:storeId`);
    console.log(`💳 Checkout: /api/v1/hws/checkout/process (MPESA | EMOLA | STRIPE | PAYPAL)`);
    console.log(`📋 Subscrições: /api/v1/hws/subscriptions/create | /plans`);
    console.log(`💳 Métodos: /api/v1/hws/payments/methods`);
    console.log(`🔔 Webhook M-Pesa: POST /api/v1/hws/payments/mpesa/callback`);
    console.log(`🔔 Webhook Stripe: POST /api/v1/hws/payments/stripe/webhook`);
    console.log(`📋 Estado Ordens: GET /api/v1/hws/payments/orders/:id`);
    console.log(`🩺 Health: /health`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n⚠️  [HWS] Sinal ${signal} recebido. Encerrando conexões...`);
    await closeDb();
    server.close(() => {
      console.log(`✅ [HWS] Servidor encerrado com segurança.`);
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      console.error(`❌ [HWS] Forçando encerramento após timeout.`);
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer();
