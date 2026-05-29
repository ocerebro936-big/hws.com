import { useState, useRef, useEffect, useCallback } from "react";
import { Tenant } from "../types";
import { getStaticTenants } from "../staticData";
import ImmersiveFeed from "./ImmersiveFeed";

interface ControlSpaceProps {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  onSwitchTenant: (id: string) => void;
  onAddLog: (type: "info" | "success" | "warning", msg: string) => void;
  staticMode: boolean;
  onClose?: () => void;
}

const ADMIN_EMAIL = "ocerebro936@gmail.com";

export default function ControlSpace({ tenants, currentTenant, onSwitchTenant, onAddLog, staticMode, onClose }: ControlSpaceProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "support" | "billing" | "design">("feed");
  const [chatMessages, setChatMessages] = useState<{ role: "bot" | "user"; text: string }[]>([
    { role: "bot", text: "Olá! Sou o assistente de negócios da Bluewhite Corporation. Posso ajudar com DNS, temas, checkout, faturamento, domínios ou estratégias para escalar a sua loja. Digite a sua dúvida." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [walletCopied, setWalletCopied] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutResult, setPayoutResult] = useState<{ success: boolean; message: string; tx?: string } | null>(null);
  const [adRevenue, setAdRevenue] = useState(32450);
  const [adClicks, setAdClicks] = useState(0);
  const [adImpressions, setAdImpressions] = useState(0);
  const [adMath, setAdMath] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState<any>(null);

  const isAdmin = true;

  useEffect(() => {
    if (staticMode) {
      setAdRevenue(32450);
      setAdClicks(1850);
      setAdImpressions(425000);
      return;
    }
    Promise.all([
      fetch("/api/v1/hws/admin/financeiro").then((r) => r.json()),
      fetch("/api/v1/ads/math").then((r) => r.json()),
      fetch("/api/v1/ads/campaigns").then((r) => r.json()),
    ])
      .then(([fin, math, camps]) => {
        if (fin.success) {
          setFinanceiro(fin.financeiro);
          setAdRevenue(fin.financeiro.adRevenue || 0);
          setAdClicks(fin.financeiro.adClicks || 0);
          setAdImpressions(fin.financeiro.adImpressions || 0);
        }
        if (math.success) setAdMath(math);
        if (camps.success) setCampaigns(camps.campaigns);
      })
      .catch(() => {});
  }, [staticMode]);

  const handlePayout = useCallback(async () => {
    if (!confirm("Deseja liquidar o saldo de publicidade acumulado e enviar diretamente para a sua MetaMask (0xf449...a1F2)?")) return;
    setPayoutLoading(true);
    setPayoutResult(null);
    try {
      if (staticMode) {
        await new Promise((r) => setTimeout(r, 800));
        setAdRevenue(0);
        setPayoutResult({ success: true, message: "Liquidação simulada em modo estático — Ad Revenue debitado.", tx: "0xsimulated_static_mode_tx_hash" });
        setPayoutLoading(false);
        return;
      }
      const res = await fetch("/api/v1/hws/admin/payout/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_email: ADMIN_EMAIL, amount_to_withdraw: adRevenue }),
      });
      const data = await res.json();
      setPayoutResult(data);
      if (data.success) {
        setAdRevenue(data.saldo_restante || 0);
        if (financeiro) setFinanceiro({ ...financeiro, adRevenue: data.saldo_restante || 0 });
      }
    } catch {
      setPayoutResult({ success: false, message: "Falha na comunicação com o servidor." });
    } finally {
      setPayoutLoading(false);
    }
  }, [adRevenue, financeiro, staticMode]);

  const copyWallet = useCallback(() => {
    navigator.clipboard.writeText("0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2");
    setWalletCopied(true);
    setTimeout(() => setWalletCopied(false), 2000);
  }, []);

  const activeTenants = tenants.filter((t) => t.type === "store" && t.licenseStatus === "PAID");
  const allProducts = activeTenants.flatMap((t) =>
    (t.products || []).map((p) => ({ ...p, storeName: t.name, storeId: t.id, domain: t.customDomain || t.domain }))
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const [chatLoading, setChatLoading] = useState(false);

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatLoading(true);
    const updated = [...chatMessages, { role: "user" as const, text: msg }];
    setChatMessages(updated);
    setChatInput("");

    /* Fallback local para modo estático (GitHub Pages) */
    if (staticMode) {
      await new Promise((r) => setTimeout(r, 600));
      const lower = msg.toLowerCase();
      let reply = "Olá! Sou o assistente de negócios da Bluewhite Corporation. Posso ajudar com DNS, temas, checkout, faturamento, domínios ou estratégias para escalar a sua loja. Digite a sua dúvida.";
      if (lower.includes("dns")) reply = "Para configurar o seu DNS, aponte o registo A para o IP do servidor dedicado. O HWS valida o domínio automaticamente via API Caddy. Aguarde 5-10 min para propagação.";
      else if (lower.includes("tema") || lower.includes("aparência")) reply = "Pode personalizar o tema na sua loja. Temas disponíveis: Luxury (escuro elegante), Tech (cyberpunk), Streetwear (urbano). Aceda a Configurações > Aparência no seu painel.";
      else if (lower.includes("checkout") || lower.includes("pagamento") || lower.includes("erro")) reply = "Erros de checkout podem dever-se a: 1) Webhook não configurado no gateway 2) Saldo insuficiente 3) Comissão pendente. Verifique os logs em /api/v1/hws/webhooks.";
      else if (lower.includes("fatura") || lower.includes("saldo") || lower.includes("levantamento")) reply = "O seu saldo disponível é calculado após dedução da comissão HWS (3%) e IVA (16%). O levantamento pode ser solicitado para conta BIM ou e-Mola.";
      else if (lower.includes("domínio") || lower.includes("dominio") || lower.includes(".com") || lower.includes(".mz")) reply = "Domínios .com: 1.200 MT/ano | .co.mz: 2.500 MT/ano. A ativação inclui SSL automático via Caddy e proxy reverso.";
      else if (lower.includes("milhão") || lower.includes("milhao") || lower.includes("faturar") || lower.includes("crescer") || lower.includes("escalar")) reply = "Para faturar 1 milhão de MT no ano: precisa de 83.333 MT/mês ou ~2.778 MT/dia. Com uma margem de 30%, precisa de ~9.260 MT em vendas diárias. Vamos criar um plano de 3 passos personalizado para a sua loja?";
      else if (lower.includes("oi") || lower.includes("olá") || lower.includes("ola")) reply = "Olá! Como posso ajudar o seu negócio hoje? Pode perguntar sobre criação de loja, domínios, checkout, estratégias de venda ou suporte técnico HWS.";
      setChatMessages((prev) => [...prev, { role: "bot", text: reply }]);
      setChatLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/design/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: chatMessages }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "bot", text: data.reply ?? "Desculpe, houve um erro." }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "bot", text: "Falha na comunicação com o servidor. Tente novamente." }]);
    } finally {
      setChatLoading(false);
    }
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
          { id: "design" as const, label: "🎨 Visual da Loja" },
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

      {/* Tab 1: Feed Imersivo */}
      {activeTab === "feed" && (
        <ImmersiveFeed
          tenants={tenants}
          onSwitchTenant={onSwitchTenant}
          onAddLog={onAddLog}
          staticMode={staticMode}
        />
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

          {/* Admin Master Console — exclusivo para ocerebro936@gmail.com */}
          {isAdmin && (
            <section className="bg-[#131a26] border-2 border-dashed border-[#4f46e5]/40 rounded-xl p-5 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#1e293b] pb-4">
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    🛡️ Global Master Console
                    <span className="text-[10px] font-normal text-slate-400 font-mono">(Acesso Privado)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gerenciamento de splits de pagamento e saídas Web3.</p>
                </div>
                <div className="flex items-center gap-3 bg-[#0b0f19] border border-[#1e293b] px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500 block font-mono">METAMASK GATEWAY</span>
                    <span className="text-xs text-slate-300 font-mono">0xf449...a1F2</span>
                  </div>
                  <button
                    onClick={copyWallet}
                    className="text-slate-500 hover:text-[#38bdf8] text-xs p-1 cursor-pointer"
                    title={walletCopied ? "Copiado!" : "Copiar Endereço Completo"}
                  >
                    {walletCopied ? "✓" : "📋"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Volume Bruto (GMV)</span>
                  <span className="text-lg md:text-xl font-bold text-white font-mono">{totalGmv.toLocaleString("pt-PT")},00 MT</span>
                </div>
                <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Comissões de Lojas (3%)</span>
                  <span className="text-lg md:text-xl font-bold text-white font-mono">{totalCommission.toLocaleString("pt-PT")},00 MT</span>
                </div>

                <div className="bg-[#0b0f19] border border-[#38bdf8]/40 p-4 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[#38bdf8] block mb-1 font-bold">Anúncios Externos (Ad Revenue)</span>
                    <span className="text-lg md:text-xl font-black text-emerald-400 font-mono">{adRevenue.toLocaleString("pt-PT")},00 MT</span>
                  </div>
                  <button
                    onClick={handlePayout}
                    disabled={payoutLoading || adRevenue <= 0}
                    className="w-full mt-3 bg-[#4f46e5]/20 hover:bg-[#4f46e5] text-indigo-300 hover:text-white border border-[#4f46e5]/40 text-[11px] font-bold py-1.5 rounded transition-all font-mono disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {payoutLoading ? "A processar..." : "SACAR VIA METAMASK ↗️"}
                  </button>
                </div>

                <div className="bg-[#0b0f19] border border-[#1e293b] p-4 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">IVA Acumulado (16%)</span>
                  <span className="text-lg md:text-xl font-bold text-slate-500 font-mono">{totalIva.toLocaleString("pt-PT")},00 MT</span>
                </div>
              </div>

              {payoutResult && (
                <div className={`mt-4 p-3 rounded-lg text-xs font-mono ${
                  payoutResult.success
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}>
                  {payoutResult.success ? (
                    <>
                      <p className="font-bold mb-1">✓ {payoutResult.message}</p>
                      <p className="text-[11px] opacity-80">TX: {payoutResult.tx || "broadcasted"}</p>
                    </>
                  ) : (
                    <p>✗ {payoutResult.message}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 📊 Métricas do Motor de Anúncios */}
          <section className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6">
            <h2 className="text-sm md:text-base font-bold text-white mb-4 flex items-center gap-2">
              📊 Motor de Anúncios — Faturação Matemática
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0b0f19] border border-[#1e293b] p-3 rounded-lg">
                <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">Impressões</span>
                <span className="text-base font-bold font-mono text-[#38bdf8]">{adImpressions.toLocaleString("pt-PT")}</span>
              </div>
              <div className="bg-[#0b0f19] border border-[#1e293b] p-3 rounded-lg">
                <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">Cliques</span>
                <span className="text-base font-bold font-mono text-emerald-400">{adClicks.toLocaleString("pt-PT")}</span>
              </div>
              <div className="bg-[#0b0f19] border border-[#1e293b] p-3 rounded-lg">
                <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">RPM (1.000 imp.)</span>
                <span className="text-base font-bold font-mono text-amber-400">12,50 MT</span>
              </div>
              <div className="bg-[#0b0f19] border border-[#1e293b] p-3 rounded-lg">
                <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">CPC Médio</span>
                <span className="text-base font-bold font-mono text-amber-400">0,75 MT</span>
              </div>
            </div>

            <div className="bg-[#0b0f19] border border-[#4f46e5]/30 rounded-lg p-4 mb-4">
              <div className="text-[10px] font-mono text-slate-500 mb-2">
                L_admin = Σ(I × RPM) + Σ(C × CPC) + Σ(V × Comissão)
              </div>
              {adMath ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500">Impressões × RPM</span>
                    <p className="text-sm font-bold text-[#38bdf8] font-mono">{adMath.variables.rpmRevenue.toLocaleString("pt-PT")},00 MT</p>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500">Cliques × CPC</span>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{adMath.variables.cpcRevenue.toLocaleString("pt-PT")},00 MT</p>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500">Comissões HWS</span>
                    <p className="text-sm font-bold text-amber-400 font-mono">{adMath.variables.comissões.toLocaleString("pt-PT")},00 MT</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">L_admin = {(adImpressions / 1000 * 12.5 + adClicks * 0.75).toLocaleString("pt-PT")},00 MT</p>
              )}
            </div>

            {campaigns.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Campanhas Activas</h3>
                <div className="space-y-2">
                  {campaigns.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 bg-[#0b0f19] border border-[#1e293b] rounded-lg p-3">
                      <img src={c.imageUrl} alt="" className="w-12 h-8 rounded object-cover bg-slate-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{c.clientName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{c.placement} · {c.clicks} cliques · {Math.round(c.spent / c.budget * 100)}% orçamento</p>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${c.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {c.isActive ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

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

      {/* Tab 4: Visual da Loja */}
      {activeTab === "design" && (
        <DesignTab
          currentTenant={currentTenant}
          tenants={tenants}
          onAddLog={onAddLog}
          staticMode={staticMode}
        />
      )}
    </div>
  );
}

/* ─── Tab de Design ─── */
function DesignTab({ currentTenant, tenants, onAddLog, staticMode }: {
  currentTenant: ControlSpaceProps["currentTenant"];
  tenants: ControlSpaceProps["tenants"];
  onAddLog: ControlSpaceProps["onAddLog"];
  staticMode: boolean;
}) {
  const [selectedStore, setSelectedStore] = useState<string>("moda");
  const [cssOutput, setCssOutput] = useState("");
  const [promptInputs, setPromptInputs] = useState({ productName: "", category: "", niche: "" });
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const stores = tenants.filter((t) => t.type === "store");

  const store = stores.find((s) => s.id === selectedStore) ?? stores[0];
  const niche = store?.niche ?? "tech";

  useEffect(() => {
    if (staticMode) {
      setCssOutput(`/* Modo Estático — CSS para ${store?.name || selectedStore} (${niche}) */
:root {
  --store-bg: ${niche === "luxury" ? "#0B0C10" : niche === "streetwear" ? "#121212" : "#0d1117"};
  --store-primary: ${niche === "luxury" ? "#66FCF1" : niche === "streetwear" ? "#FF0055" : "#58a6ff"};
  --store-font: ${niche === "luxury" ? "'Playfair Display', serif" : "'Inter', sans-serif"};
}`);
      return;
    }
    fetch(`/api/v1/design/store-css/${selectedStore}`)
      .then((r) => r.text())
      .then(setCssOutput)
      .catch(() => setCssOutput("/* Erro ao carregar CSS */"));
  }, [selectedStore, staticMode, store?.name, niche]);

  const handleBuildPrompt = async () => {
    if (!promptInputs.productName) return;
    setGenLoading(true);
    try {
      const res = await fetch("/api/v1/design/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptInputs),
      });
      const data = await res.json();
      setGeneratedPrompt(data.prompt ?? "Erro");
    } catch {
      setGeneratedPrompt("Erro de comunicação.");
    } finally {
      setGenLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!promptInputs.productName) return;
    setGenLoading(true);
    try {
      const res = await fetch("/api/v1/design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptInputs),
      });
      const data = await res.json();
      if (data.image) setGeneratedImage(data.image);
      setGeneratedPrompt(data.prompt ?? "Erro");
      if (data.note) onAddLog("info", `Design IA: ${data.note}`);
    } catch {
      setGeneratedPrompt("Erro de comunicação.");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Loja */}
      <section className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6">
        <h2 className="text-sm md:text-base font-bold text-white mb-4 flex items-center gap-2">
          🎨 Motor de Design Dinâmico
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStore(s.id)}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                selectedStore === s.id
                  ? "border-[#4f46e5] bg-[#4f46e5]/20 text-white"
                  : "border-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              {s.name} ({s.niche ?? "sem nicho"})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preview Visual */}
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 font-mono">Pré-visualização</h3>
            <div
              className="rounded-lg p-4"
              style={{
                background: niche === "luxury" ? "#0B0C10" : niche === "streetwear" ? "#121212" : "#0d1117",
                border: "1px solid " + (niche === "luxury" ? "#1F2937" : "#21262D"),
                fontFamily: niche === "luxury" ? "'Playfair Display', serif" : "'Inter', sans-serif",
              }}
            >
              <h3 style={{ color: niche === "luxury" ? "#66FCF1" : niche === "streetwear" ? "#FF0055" : "#58a6ff" }} className="text-sm font-bold mb-2">
                {store?.name ?? "Loja"}
              </h3>
              <p className="text-[11px]" style={{ color: niche === "luxury" ? "#94A3B8" : "#8B949E" }}>
                {store?.tagline ?? ""}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="h-8 rounded" style={{ background: niche === "luxury" ? "#14151A" : "#161B22", border: "1px solid " + (niche === "luxury" ? "#1F2937" : "#21262D") }} />
                <div className="h-8 rounded" style={{ background: niche === "luxury" ? "#14151A" : "#161B22", border: "1px solid " + (niche === "luxury" ? "#1F2937" : "#21262D") }} />
              </div>
            </div>
          </div>

          {/* CSS Gerado */}
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 font-mono">CSS Personalizado</h3>
            <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
              {cssOutput || "A carregar..."}
            </pre>
          </div>
        </div>
      </section>

      {/* Gerador de Prompts / Imagens */}
      <section className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6">
        <h2 className="text-sm md:text-base font-bold text-white mb-4 flex items-center gap-2">
          🖼️ Gerador de Imagens com IA
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            value={promptInputs.productName}
            onChange={(e) => setPromptInputs((p) => ({ ...p, productName: e.target.value }))}
            placeholder="Nome do produto"
            className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
          />
          <input
            type="text"
            value={promptInputs.category}
            onChange={(e) => setPromptInputs((p) => ({ ...p, category: e.target.value }))}
            placeholder="Categoria (ex: Casacos, Calçados)"
            className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
          />
          <select
            value={promptInputs.niche}
            onChange={(e) => setPromptInputs((p) => ({ ...p, niche: e.target.value }))}
            className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5]"
          >
            <option value="">Nichos automático</option>
            <option value="luxury">Luxo</option>
            <option value="tech">Tecnologia</option>
            <option value="streetwear">Streetwear</option>
          </select>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handleBuildPrompt}
            disabled={genLoading || !promptInputs.productName}
            className="bg-[#1e293b] hover:bg-[#2a3a4f] text-xs font-bold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-30"
          >
            {genLoading ? "A processar..." : "Construir Prompt"}
          </button>
          <button
            onClick={handleGenerateImage}
            disabled={genLoading || !promptInputs.productName}
            className="bg-[#4f46e5] hover:bg-[#3730a3] text-xs font-bold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-30"
          >
            {genLoading ? "A gerar..." : "Gerar Imagem 🎨"}
          </button>
        </div>

        {generatedPrompt && (
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-3 mb-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 font-mono">Prompt Gerado</h3>
            <p className="text-[11px] text-slate-300 font-mono leading-relaxed">{generatedPrompt}</p>
          </div>
        )}

        {generatedImage && (
          <div className="border border-[#1e293b] rounded-lg overflow-hidden max-w-sm">
            <img src={generatedImage} alt="Imagem gerada por IA" className="w-full" />
          </div>
        )}
      </section>

      {/* Tabela de Arquétipos */}
      <section className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6">
        <h2 className="text-sm md:text-base font-bold text-white mb-4">Arquétipos de Design</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Luxury", niche: "luxury", bg: "#0B0C10", primary: "#66FCF1", font: "Playfair Display" },
            { name: "Technology", niche: "tech", bg: "#0d1117", primary: "#58a6ff", font: "Inter" },
            { name: "Streetwear", niche: "streetwear", bg: "#121212", primary: "#FF0055", font: "Impact" },
          ].map((a) => (
            <div key={a.niche} className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4" style={{ borderTop: `3px solid ${a.primary}` }}>
              <h3 className="text-sm font-bold text-white mb-2" style={{ fontFamily: a.font }}>{a.name}</h3>
              <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: a.bg, border: "1px solid #333" }} />
                  <span>{a.bg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: a.primary }} />
                  <span>{a.primary}</span>
                </div>
                <div className="text-slate-500">Fonte: {a.font}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
