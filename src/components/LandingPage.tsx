import React, { useState } from "react";
import RegisterModal from "./RegisterModal";

const PLANS = [
  {
    id: "HWS_STARTER",
    nome: "HWS Starter",
    preco: "1.500 MT",
    periodo: "/mês",
    descricao: "Perfeito para começar a vender online com uma vitrine profissional.",
    destaque: false,
    recursos: [
      "Subdomínio hws.com",
      "Até 50 produtos",
      "5% comissão por venda",
      "Tema Clean responsivo",
      "Suporte por e-mail",
      "Checkout Stripe integrado",
    ],
    cta: "Começar Grátis",
  },
  {
    id: "HWS_PRO",
    nome: "HWS Pro Workspace",
    preco: "3.500 MT",
    periodo: "/mês",
    descricao: "Para lojistas que querem domínio próprio e produtos ilimitados.",
    destaque: true,
    recursos: [
      "Subdomínio + Domínio Próprio (.com, .co.mz)",
      "Produtos ilimitados",
      "3% comissão por venda",
      "Temas Cyberpunk & Luxury",
      "Suporte prioritário 24/7",
      "Checkout Stripe + M-Pesa",
      "Domínio .com grátis 1º ano",
    ],
    cta: "Escolher Pro",
  },
  {
    id: "HWS_ENTERPRISE",
    nome: "HWS Enterprise Core",
    preco: "45.000 MT",
    periodo: "taxa única",
    descricao: "Instância isolada com isenção total de comissões.",
    destaque: false,
    recursos: [
      "Instância Isolada + Domínio Próprio",
      "Produtos ilimitados",
      "0% comissão (isenção total)",
      "Tema Luxury premium",
      "Suporte dedicado 24/7",
      "M-Pesa, e-Mola, Stripe, PayPal",
      "Manutenção: 1.200 MT/mês após 1 ano",
    ],
    cta: "Falar com Vendas",
  },
];

const DOMINIOS = [
  { tipo: "Internacional (.com, .net, .org)", preco: "1.200 MT/ano" },
  { tipo: "Nacional (.co.mz, .mz)", preco: "2.500 MT/ano" },
];

export default function LandingPage() {
  const [showRegister, setShowRegister] = useState(false);

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
                onClick={() => setShowRegister(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                Criar Loja Agora
              </button>
              <a
                href="#planos"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-all border border-slate-700/50 cursor-pointer"
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
            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    plan.destaque
                      ? "bg-indigo-600/5 border-indigo-500/40 shadow-xl shadow-indigo-600/10"
                      : "bg-[#131a26] border-[#1e293b]"
                  }`}
                >
                  {plan.destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-mono uppercase tracking-wider rounded-full">
                      Mais Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-1">{plan.nome}</h3>
                    <p className="text-xs text-slate-400">{plan.descricao}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-bold font-display">{plan.preco}</span>
                    <span className="text-sm text-slate-400 ml-1">{plan.periodo}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.recursos.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm text-slate-300">
                        <svg className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {r}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setShowRegister(true)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
                onClick={() => setShowRegister(true)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                Criar Loja Grátis
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
        <RegisterModal onClose={() => setShowRegister(false)} />
      )}
    </>
  );
}
