import { useState, useRef, useEffect } from "react";
import { Tenant } from "../types";
import { getStaticTenants } from "../staticData";

interface ControlSpaceProps {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  onSwitchTenant: (id: string) => void;
  onAddLog: (type: "info" | "success" | "warning", msg: string) => void;
  staticMode: boolean;
  onClose?: () => void;
}

const ADMIN_EMAIL = "ocerebro936@gmail.com";

const AI_RESPONSES: Record<string, string> = {
  dns: "Para configurar o seu DNS, aponte o registo A para o IP do servidor dedicado. O HWS valida o domínio automaticamente via API Caddy. Aguarde 5-10 min para propagação.",
  tema: "Pode personalizar o tema na sua loja: temas disponíveis: Clean (claro), Dark (escuro) e Cyberpunk (neon). Aceda a Configurações > Aparência no seu painel.",
  checkout: "Erros de checkout podem dever-se a: 1) Webhook não configurado no gateway 2) Saldo insuficiente 3) Comissão pendente. Verifique os logs em /api/v1/hws/webhooks.",
  fatura: "O seu saldo disponível é calculado após dedução da comissão HWS (3%) e IVA (16%). O levantamento pode ser solicitado para conta BIM ou e-Mola.",
  dominio: "Domínios .com: 1.200 MT/ano | .co.mz: 2.500 MT/ano. A ativação inclui SSL automático via Caddy e proxy reverso.",
  default: "Olá! Sou o assistente automático da Bluewhite Corporation. Posso ajudar com DNS, temas, checkout, faturamento ou domínios. Digite a sua dúvida.",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("dns")) return AI_RESPONSES.dns;
  if (lower.includes("tema") || lower.includes("tema") || lower.includes("aparência")) return AI_RESPONSES.tema;
  if (lower.includes("checkout") || lower.includes("pagamento") || lower.includes("erro")) return AI_RESPONSES.checkout;
  if (lower.includes("fatura") || lower.includes("saldo") || lower.includes("levantamento")) return AI_RESPONSES.fatura;
  if (lower.includes("domínio") || lower.includes("dominio") || lower.includes(".com") || lower.includes(".mz")) return AI_RESPONSES.dominio;
  return AI_RESPONSES.default;
}

export default function ControlSpace({ tenants, currentTenant, onSwitchTenant, onAddLog, staticMode, onClose }: ControlSpaceProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "support" | "billing">("feed");
  const [chatMessages, setChatMessages] = useState<{ role: "bot" | "user"; text: string }[]>([
    { role: "bot", text: AI_RESPONSES.default },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = false; // será verificado por backend em produção

  const activeTenants = tenants.filter((t) => t.type === "store" && t.licenseStatus === "PAID");
  const allProducts = activeTenants.flatMap((t) =>
    (t.products || []).map((p) => ({ ...p, storeName: t.name, storeId: t.id, domain: t.customDomain || t.domain }))
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChatSend = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: "bot", text: getAIResponse(msg) }]);
    }, 600);
  };

  const feedProducts = allProducts.length > 0 ? allProducts : [
    { id: 1, name: "Casaco Slim Fit Tailored", price: "4.500 MT", storeName: "Vanguard Moda Premium", storeId: "moda", domain: "moda.hws.com", category: "Casacos" },
    { id: 2, name: "Bota Couro Urban Premium", price: "6.200 MT", storeName: "Vanguard Moda Premium", storeId: "moda", domain: "moda.hws.com", category: "Calçados" },
    { id: 3, name: "Auriculares Wireless Pro ANC", price: "2.100 MT", storeName: "Génio Tech Smart", storeId: "tech", domain: "tech.hws.com", category: "Áudio" },
  ];

  const totalGmv = tenants.reduce((acc, t) => acc + (t.accumulatedSales || 0), 0);
  const totalCommission = Math.round(totalGmv * 0.03);
  const totalIva = Math.round(totalCommission * 0.16);
  const tenantBalance = currentTenant ? Math.round((currentTenant.accumulatedSales || 0) * 0.81) : 0;

  return (
    <div className="font-inter min-h-screen bg-[#0b0f19] text-[#f8fafc] p-4 md:p-6">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1e293b] pb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">HWS — Control Space</h1>
          <p className="text-[11px] text-slate-400 font-mono">Propriedade de Bluewhite Corporation Lda.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#38bdf8] font-mono bg-[#131a26] border border-[#1e293b] px-3 py-1.5 rounded-md">
            Admin: {ADMIN_EMAIL}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[11px] text-slate-400 hover:text-white bg-[#131a26] border border-[#1e293b] px-3 py-1.5 rounded-md transition-colors font-mono"
            >
              ✕ Sair
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1e293b] pb-px overflow-x-auto">
        {[
          { id: "feed" as const, label: "🛍️ Feed do Shopping" },
          { id: "support" as const, label: "🤖 Assistente Técnico 24/7" },
          { id: "billing" as const, label: "📊 Faturamento & Splits" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[#4f46e5] text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Feed */}
      {activeTab === "feed" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {feedProducts.map((p, i) => (
            <div
              key={i}
              className="bg-[#131a26] border border-[#1e293b] rounded-xl p-4 md:p-5 flex flex-col justify-between hover:border-[#4f46e5] transition-all"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] bg-[#4f46e5]/10 text-[#6366f1] border border-[#4f46e5]/20 px-2 py-0.5 rounded font-mono">
                    {(p as any).storeName || "Loja"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{(p as any).category || "Geral"}</span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-white mb-1">{p.name}</h3>
                <p className="text-[11px] text-slate-400 mb-3">{p.description || "Produto em destaque no ecossistema HWS."}</p>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#1e293b]">
                <span className="font-mono text-base md:text-lg font-bold text-[#38bdf8]">{p.price}</span>
                <button
                  onClick={() => onSwitchTenant((p as any).storeId)}
                  className="bg-[#4f46e5] hover:bg-[#3730a3] text-white text-[11px] font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                >
                  Entrar na Loja ➡️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Chat */}
      {activeTab === "support" && (
        <div className="max-w-3xl mx-auto bg-[#131a26] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="p-4 bg-[#0b0f19] border-b border-[#1e293b] flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white">Suporte Técnico Automatizado</h3>
              <p className="text-[11px] text-slate-400 font-mono">Core Engine AI Ativo para Resoluções Globais</p>
            </div>
          </div>
          <div className="p-4 md:p-6 h-72 md:h-80 overflow-y-auto space-y-4 text-sm">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-xl ${
                    m.role === "bot"
                      ? "bg-[#1e293b] rounded-tl-none"
                      : "bg-[#4f46e5] rounded-tr-none"
                  }`}
                >
                  {m.role === "bot" && (
                    <p className="text-[11px] text-[#38bdf8] font-bold font-mono mb-1">HWS CORE AI</p>
                  )}
                  <p className="text-xs md:text-sm text-slate-200">{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t border-[#1e293b] bg-[#0b0f19] flex gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Pergunte sobre DNS, Erros de Checkout, Liberação de Saldo..."
              className="w-full bg-[#131a26] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
            />
            <button
              onClick={handleChatSend}
              className="bg-[#4f46e5] hover:bg-[#3730a3] text-xs font-medium px-5 py-2.5 rounded-lg text-white font-bold transition-colors"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Faturamento */}
      {activeTab === "billing" && (
        <div className="space-y-6">

          {/* Admin Master Console - visível apenas para admin */}
          {isAdmin && (
            <section className="bg-[#131a26] border-2 border-dashed border-[#4f46e5]/40 rounded-xl p-5 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                  🛡️ Global Master Console
                  <span className="text-[10px] font-normal text-slate-400 font-mono">(Acesso Exclusivo)</span>
                </h2>
                <span className="text-[10px] bg-[#4f46e5]/20 text-indigo-300 px-2.5 py-1 rounded font-mono">{ADMIN_EMAIL}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Volume Bruto do Shopping (GMV)</span>
                  <span className="text-lg md:text-xl font-bold text-white font-mono">{totalGmv.toLocaleString("pt-PT")},00 MT</span>
                </div>
                <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Lucro de Comissões Retidas (3%)</span>
                  <span className="text-lg md:text-xl font-bold text-emerald-400 font-mono">{totalCommission.toLocaleString("pt-PT")},00 MT</span>
                </div>
                <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">IVA Total Acumulado Mz (16%)</span>
                  <span className="text-lg md:text-xl font-bold text-[#38bdf8] font-mono">{totalIva.toLocaleString("pt-PT")},00 MT</span>
                </div>
              </div>
            </section>
          )}

          {/* Tenant Billing View */}
          <section className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6">
            <h2 className="text-sm md:text-base font-bold text-white mb-4">O Seu Extrato Financeiro de Inquilino</h2>

            {currentTenant ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                    <span className="text-[11px] text-slate-400 block mb-1 font-mono">Volume Bruto de Vendas</span>
                    <span className="text-lg font-bold text-white font-mono">{(currentTenant.accumulatedSales || 0).toLocaleString("pt-PT")},00 MT</span>
                  </div>
                  <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                    <span className="text-[11px] text-slate-400 block mb-1 font-mono">Comissão HWS (3%)</span>
                    <span className="text-lg font-bold text-amber-400 font-mono">{Math.round((currentTenant.accumulatedSales || 0) * 0.03).toLocaleString("pt-PT")},00 MT</span>
                  </div>
                </div>

                <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-white">Saldo Disponível para Levantamento Bancário</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Após splits e taxas regulatórias</p>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <span className="text-xl md:text-2xl font-black text-emerald-400 font-mono block">{tenantBalance.toLocaleString("pt-PT")},00 MT</span>
                    <button className="text-[11px] text-[#38bdf8] font-medium hover:underline mt-1 font-mono">
                      Solicitar Transferência para Conta Digital ↗️
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-mono">Selecione uma loja para ver o extrato financeiro.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
