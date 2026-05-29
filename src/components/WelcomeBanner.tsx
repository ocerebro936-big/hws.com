import { useState, useEffect } from "react";

const LS_WELCOME = "hws_welcomed";

export default function WelcomeBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(LS_WELCOME);
    if (!seen) {
      setVisible(true);
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(LS_WELCOME, "1");
  };

  if (!visible || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-[#4f46e5]/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">🌍</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white font-display">
            Bem-vindo ao Hub World Shopping!
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            O maior ecossistema multi-tenant de Moçambique. Aqui pode criar a sua loja virtual, vender produtos com dropshipping, aceitar pagamentos por M-Pesa, e-Mola e Stripe, conectar o seu domínio próprio e escalar o seu negócio digital.
          </p>
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 text-left space-y-2 text-xs font-mono text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">🚀</span>
              <span><strong className="text-white">Explore lojas</strong> nos corredores virtuais abaixo</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">🛒</span>
              <span><strong className="text-white">Contrate o seu espaço</strong> com domínio .hws.com grátis</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">👤</span>
              <span><strong className="text-white">Registe-se com ID único</strong> para aceder ao painel do utilizador</span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-[#4f46e5] hover:bg-[#3730a3] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Começar a Explorar ➜
          </button>
          <p className="text-[10px] text-slate-500 font-mono">
            Propriedade de Bluewhite Corporation Lda. — Moçambique
          </p>
        </div>
      </div>
    </div>
  );
}
