import { useState } from "react";
import { Tenant } from "../types";

interface ImmersiveFeedProps {
  tenants: Tenant[];
  onSwitchTenant: (id: string) => void;
  onAddLog: (type: "info" | "success" | "warning", msg: string) => void;
  staticMode: boolean;
}

function getStoreImage(store: Tenant): string {
  const seed = store.id + "-bg";
  if (store.niche === "luxury") return `https://picsum.photos/seed/${seed}/800/600`;
  if (store.niche === "tech") return `https://picsum.photos/seed/${seed}/800/600`;
  return `https://picsum.photos/seed/${seed}/800/600`;
}

function getNicheAccent(niche?: string): string {
  if (niche === "luxury") return "from-amber-600 to-amber-800";
  if (niche === "tech") return "from-cyan-500 to-indigo-600";
  if (niche === "streetwear") return "from-pink-600 to-red-600";
  return "from-cyan-500 to-indigo-600";
}

function getBadgeColor(niche?: string): string {
  if (niche === "luxury") return "bg-amber-500/20 text-amber-400";
  if (niche === "tech") return "bg-cyan-500/20 text-cyan-400";
  if (niche === "streetwear") return "bg-pink-500/20 text-pink-400";
  return "bg-emerald-500/20 text-emerald-400";
}

export default function ImmersiveFeed({ tenants, onSwitchTenant, onAddLog, staticMode }: ImmersiveFeedProps) {
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const stores = tenants.filter((t) => t.type === "store");

  const handleEnter = async (store: Tenant) => {
    setEnteringId(store.id);
    onAddLog("info", `🚀 Transportando utilizador para o terreno: ${store.name}...`);
    if (!staticMode) {
      try {
        await fetch(`/api/v1/stores/${store.id}/visit`, { method: "POST" });
        onAddLog("success", `Visita registada em ${store.name}.`);
      } catch {
        /* silent */
      }
    }
    setTimeout(() => {
      onSwitchTenant(store.id);
    }, 400);
  };

  if (stores.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm font-mono">
        Nenhuma loja disponível neste momento.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header do Feed Imersivo */}
      <div className="text-center space-y-2 pb-2">
        <h2 className="text-xl md:text-2xl font-black text-white font-display tracking-tight">
          🌌 Descubra Terrenos Comerciais
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Cada loja é um microverso independente. Entre, explore e descubra o ecossistema único de cada marca.
        </p>
      </div>

      {/* Grid de Cards Imersivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {stores.map((store) => {
          const isEntering = enteringId === store.id;
          const isHovered = hoveredId === store.id;
          const accent = getNicheAccent(store.niche);
          const badgeColor = getBadgeColor(store.niche);
          const productCount = store.products?.length ?? 0;

          return (
            <div
              key={store.id}
              onMouseEnter={() => setHoveredId(store.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative w-full h-[420px] md:h-[480px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 cursor-pointer group"
              style={{
                transform: isHovered ? "scale(1.02)" : "scale(1)",
                boxShadow: isHovered
                  ? "0 25px 60px rgba(6, 182, 212, 0.15)"
                  : "0 8px 32px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Imagem de Fundo */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700"
                style={{
                  backgroundImage: `url(${getStoreImage(store)})`,
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                }}
              />

              {/* Overlay Gradiente Escuro na Base */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

              {/* Brilho no hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 70%)",
                }}
              />

              {/* Conteúdo do Card */}
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex flex-col justify-end z-10">
                {/* Badge de Nicho */}
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-max mb-3 ${badgeColor}`}
                >
                  {store.niche ?? "general"} · {productCount} {productCount === 1 ? "produto" : "produtos"}
                </span>

                {/* Nome da Loja */}
                <h3 className="text-2xl md:text-3xl font-black text-white mb-1.5 tracking-tight font-display">
                  {store.name}
                </h3>

                {/* Tagline */}
                <p className="text-slate-300 text-sm mb-1 line-clamp-2 leading-relaxed">
                  {store.tagline || store.description}
                </p>

                {/* Detalhes */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mb-4">
                  <span>{store.domain}</span>
                  {store.monthlyRent && (
                    <>
                      <span>•</span>
                      <span>{store.monthlyRent}/mês</span>
                    </>
                  )}
                </div>

                {/* Botão Entrar no Terreno */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnter(store);
                  }}
                  disabled={isEntering}
                  className={`w-full py-3.5 md:py-4 bg-gradient-to-r ${accent} text-white font-bold rounded-xl transition-all tracking-wider uppercase text-sm cursor-pointer disabled:opacity-60`}
                  style={{
                    boxShadow: isHovered
                      ? `0 0 25px rgba(6,182,212,0.4)`
                      : "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  {isEntering ? "A entrar..." : "Entrar no Terreno 🚀"}
                </button>
              </div>

              {/* Efeito de borda gradiente no hover */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  border: "1px solid transparent",
                  backgroundClip: "padding-box",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Métricas ao vivo */}
      <div className="text-center text-[10px] text-slate-500 font-mono pt-4 border-t border-[#1e293b] max-w-4xl mx-auto">
        {stores.length} {stores.length === 1 ? "terreno disponível" : "terrenos disponíveis"} · Clique em "Entrar no Terreno" para explorar o microverso de cada loja
      </div>
    </div>
  );
}
