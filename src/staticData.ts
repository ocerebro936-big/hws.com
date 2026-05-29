const STATIC_TENANTS = [
  {
    id: "hub",
    name: "Hub World Shopping",
    type: "hub",
    description: "Simplificando o comércio global. O maior ponto de encontro de lojas mundiais em corredores virtuais de alta performance.",
    theme: "light",
    domain: "hws.com",
    tagline: "O ponto de encontro do comércio mundial.",
    accentColor: "#3b82f6",
    licenseStatus: "PAID",
    ownerId: "corp_bluewhite_001",
    balance: "1.250.400 MT",
    monthlyRent: "0 MT",
    nextPaymentDate: "Perpétuo",
    nuitCorporate: "800812349",
    customDomain: null,
    plan: "Enterprise",
    accumulatedSales: 167000,
    products: []
  },
  {
    id: "moda",
    name: "Vanguard Moda Premium",
    type: "store",
    theme: "dark",
    description: "Estilo sofisticado e alta costura desenhados exclusivamente para expressar a sua personalidade contemporânea.",
    domain: "moda.hws.com",
    tagline: "Estilo sofisticado para quem dita tendências.",
    accentColor: "#f59e0b",
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
      { id: 1, name: "Casaco Slim Fit Tailored", price: "4.500 MT", category: "Casacos" },
      { id: 2, name: "Bota Couro Urban Premium", price: "6.200 MT", category: "Calçados" },
      { id: 3, name: "Relógio Chrono Slate Carbon", price: "12.800 MT", category: "Acessórios" }
    ]
  },
  {
    id: "tech",
    name: "Génio Tech Smart",
    type: "store",
    theme: "cyberpunk",
    description: "Acessórios inteligentes de ponta e gadgets futuristas para maximizar sua performance urbana.",
    domain: "tech.hws.com",
    tagline: "Equipando as mentes do amanhã.",
    accentColor: "#06b6d4",
    licenseStatus: "SUSPENDED",
    ownerId: "usr_0812",
    balance: "0 MT",
    monthlyRent: "4.500 MT",
    nextPaymentDate: "2026-05-10",
    nuitCorporate: "491028345",
    customDomain: null,
    plan: "Starter",
    accumulatedSales: 42000,
    products: [
      { id: 1, name: "Auriculares Wireless Pro ANC", price: "2.100 MT", category: "Áudio" },
      { id: 2, name: "Carregador de Indução Rápido 50W", price: "1.500 MT", category: "Energia" },
      { id: 3, name: "Teclado Mecânico Matrix-X 60%", price: "5.800 MT", category: "Periféricos" }
    ]
  }
];

export const STATIC_PLANS = [
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
];

export const STATIC_DOMAINS = [
  { tipo: "Internacional (.com, .net, .org)", preco: "1.200 MT/ano" },
  { tipo: "Nacional (.co.mz, .mz)", preco: "2.500 MT/ano" },
];

const isStatic = !window.location.host.includes("localhost") && !window.location.host.includes("127.0.0.1");

export function getStaticTenants() {
  return STATIC_TENANTS;
}

export function getStaticTenant(id: string) {
  if (!id || id === "hub") return STATIC_TENANTS[0];
  return STATIC_TENANTS.find(t => t.id === id || t.domain === id) || STATIC_TENANTS[0];
}

export function isStaticMode() {
  return isStatic;
}
