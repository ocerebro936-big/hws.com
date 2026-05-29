import React, { useState } from "react";
import RegisterModal from "./RegisterModal";
import PaymentClient from "./PaymentClient";

const PLANS = [
  {
    id: "HWS_BANCA",
    tipo: "banca",
    nome: "Banca do Mercado",
    preco: "500 MT",
    periodo: "/mês",
    descricao: "Micro-negócio digital no mercado comum do Hub. Subdomínio fixo e trancado.",
    destaque: false,
    cor: "bg-emerald-600/10 border-emerald-500/30",
    badge: "🪙 Micro",
    recursos: [
      "Subdomínio fixo mercado.hws.com/banca-nome",
      "Até 20 produtos",
      "7% comissão por venda",
      "Tema Clean responsivo",
      "Suporte por e-mail",
      "Checkout M-Pesa + Stripe",
    ],
    cta: "Alugar Banca",
  },
  {
    id: "HWS_LOJA_RENTAL",
    tipo: "store_rental",
    nome: "Loja Alugável",
    preco: "3.500 MT",
    periodo: "/mês",
    descricao: "Loja completa e independente com Super Cards imersivos no feed global.",
    destaque: true,
    cor: "bg-indigo-600/10 border-indigo-500/40",
    badge: "🔥 Mais Popular",
    recursos: [
      "Subdomínio + Domínio Próprio (.com, .co.mz)",
      "Produtos ilimitados",
      "3% comissão por venda",
      "Super Cards imersivos no feed",
      "Temas Cyberpunk & Luxury",
      "Suporte prioritário 24/7",
      "Checkout Stripe + M-Pesa + e-Mola",
      "Domínio .com grátis 1º ano",
    ],
    cta: "Alugar Loja",
  },
  {
    id: "HWS_LOJA_SALE",
    tipo: "store_sale",
    nome: "Loja à Venda",
    preco: "150.000 MT",
    periodo: "pagamento único",
    descricao: "Propriedade digital total. Código, design IA e banco de dados transferidos.",
    destaque: false,
    cor: "bg-amber-600/10 border-amber-500/30",
    badge: "🏆 Premium",
    recursos: [
      "Domínio Próprio Obrigatório",
      "Transferência de Propriedade Total",
      "Design Exclusivo Gerado por IA",
      "Código-fonte + Banco de Dados",
      "0% comissão vitalício",
      "Suporte Dedicado VIP 24/7",
      "Todos os gateways disponíveis",
      "Manutenção: 1.200 MT/mês após 1 ano",
    ],
    cta: "Adquirir Loja",
  },
  {
    id: "HWS_CORPORATE",
    tipo: "corporate",
    nome: "Registo Empresarial",
    preco: "12.000 MT",
    periodo: "taxa única",
    descricao: "Página institucional corporativa com recibo oficial com assinatura digital criptográfica.",
    destaque: false,
    cor: "bg-cyan-600/10 border-cyan-500/30",
    badge: "🏛️ Corporativo",
    recursos: [
      "Landing Page Institucional",
      "Subdomínio corporativo hws.com",
      "Recibo PDF com Assinatura Digital",
      "Validação de Pagamento Real",
      "Registo de NUIT opcional",
      "Suporte por e-mail",
      "Sem comissões",
      "Ideal para investidores e parceiros",
    ],
    cta: "Registar Empresa",
  },
];

const DOMINIOS = [
  { tipo: "Internacional (.com, .net, .org)", preco: "1.200 MT/ano" },
  { tipo: "Nacional (.co.mz, .mz)", preco: "2.500 MT/ano" },
];

export default function LandingPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentTenant, setPaymentTenant] = useState<{ id: string; name: string } | null>(null);

  function handlePlanClick(planId: string) {
    setSelectedPlan(planId);
    setShowRegister(true);
  }

  function handleRegisterSuccess(storeId: string) {
    setShowRegister(false);
    const planName = PLANS.find((p) => p.id === selectedPlan)?.nome || "Loja";
    setPaymentTenant({ id: storeId, name: planName });
  }

  function handlePaymentClose() {
    setPaymentTenant(null);
    setSelectedPlan(null);
  }

  return (
    <>
      <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc]">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          </div>
          <div className="relative max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-mono uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              Multi-Tenant Commerce Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-display mb-4">
              Hub World Shopping
            </h1>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              A plataforma de e-commerce multi-inquilino que transforma o seu negócio.
              Crie a sua loja online com subdomínio próprio, domínio personalizado e
              pagamentos integrados — sem complicação técnica.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => handlePlanClick("HWS_LOJA_RENTAL")}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
              >
                🏪 Alugar Loja
              </button>
              <a
                href="#planos"
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-all border border-slate-700/50 cursor-pointer"
              >
                Ver Planos
              </a>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center font-display mb-12">
              Como Funciona
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  passo: "01",
                  titulo: "Escolha o Plano",
                  desc: "Selecione o plano ideal para o seu negócio — Starter, Pro ou Enterprise.",
                },
                {
                  passo: "02",
                  titulo: "Registe a Sua Loja",
                  desc: "Crie sua conta em segundos. Escolha subdomínio ou domínio próprio.",
                },
                {
                  passo: "03",
                  titulo: "Comece a Vender",
                  desc: "Adicione produtos, active o checkout e receba pagamentos online.",
                },
              ].map((item) => (
                <div
                  key={item.passo}
                  className="bg-[#131a26] border border-[#1e293b] rounded-2xl p-6 text-center hover:border-indigo-500/30 transition-all"
                >
                  <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-400 font-mono text-sm font-bold">
                    {item.passo}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.titulo}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="px-4 py-16 md:py-20 bg-[#0d111f]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center font-display mb-2">
              Planos de Assinatura
            </h2>
            <p className="text-sm text-slate-400 text-center mb-10">
              Escolha o plano ideal e comece a vender em minutos.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-5 flex flex-col ${
                    plan.destaque
                      ? "bg-indigo-600/5 border-indigo-500/40 shadow-xl shadow-indigo-600/10 scale-[1.02]"
                      : plan.cor
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-white text-[10px] font-mono uppercase tracking-wider rounded-full whitespace-nowrap"
                    style={{
                      background: plan.destaque ? "#4f46e5" : plan.tipo === "banca" ? "#059669" : plan.tipo === "store_sale" ? "#d97706" : "#06b6d4"
                    }}
                  >
                    {plan.badge}
                  </div>
                  <div className="mb-4 mt-2">
                    <h3 className="text-base font-semibold mb-1">{plan.nome}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{plan.descricao}</p>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold font-display">{plan.preco}</span>
                    <span className="text-[11px] text-slate-400 ml-1">{plan.periodo}</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.recursos.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-[11px] text-slate-300">
                        <svg className="w-3.5 h-3.5 mt-0.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {r}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanClick(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      plan.destaque
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Domínios */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center font-display mb-2">
              Preços de Domínios
            </h2>
            <p className="text-sm text-slate-400 text-center mb-8">
              Registre o seu domínio próprio com a Bluewhite Corporation.
            </p>
            <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl overflow-hidden">
              {DOMINIOS.map((d, i) => (
                <div
                  key={d.tipo}
                  className={`flex justify-between items-center px-6 py-4 ${
                    i < DOMINIOS.length - 1 ? "border-b border-[#1e293b]" : ""
                  }`}
                >
                  <span className="text-sm text-slate-300">{d.tipo}</span>
                  <span className="text-sm font-mono text-indigo-400 font-semibold">{d.preco}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-gradient-to-b from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl font-bold font-display mb-3">
                Pronto para Começar?
              </h2>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                Crie a sua loja em menos de 2 minutos. Sem conhecimento técnico necessário.
              </p>
              <button
                onClick={() => handlePlanClick("HWS_LOJA_RENTAL")}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-600/25 flex items-center gap-2 mx-auto cursor-pointer"
              >
                🏪 Alugar Loja Agora
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-8 border-t border-[#1e293b]">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} Bluewhite Corporation Lda. Todos os direitos reservados.</span>
            <div className="flex items-center gap-4">
              <span className="font-mono">NUIT: Pendente</span>
              <span className="text-slate-700">|</span>
              <span>Moçambique</span>
            </div>
          </div>
        </footer>
      </div>

      {showRegister && (
        <RegisterModal
          onClose={() => { setShowRegister(false); setSelectedPlan(null); }}
          onSuccess={handleRegisterSuccess}
          planId={selectedPlan || undefined}
        />
      )}
      {paymentTenant && selectedPlan && (
        <PaymentClient
          planId={selectedPlan}
          tenantId={paymentTenant.id}
          tenantName={paymentTenant.name}
          onClose={handlePaymentClose}
        />
      )}
    </>
  );
}
