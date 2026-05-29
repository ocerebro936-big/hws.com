import React, { useState } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const WALLET_DESTINO = "0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2";

const PLANOS: Record<string, { name: string; priceMT: number; tokenAmount: number }> = {
  HWS_BANCA: { name: "Banca do Mercado", priceMT: 500, tokenAmount: 500 },
  HWS_LOJA_RENTAL: { name: "Loja Alugável", priceMT: 3500, tokenAmount: 3500 },
  HWS_LOJA_SALE: { name: "Loja à Venda", priceMT: 150000, tokenAmount: 150000 },
  HWS_CORPORATE: { name: "Registo Empresarial", priceMT: 12000, tokenAmount: 12000 },
};

interface PaymentClientProps {
  planId: string;
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  staticMode?: boolean;
}

export default function PaymentClient({ planId, tenantId, tenantName, onClose, onSuccess, staticMode }: PaymentClientProps) {
  const [method, setMethod] = useState<"card" | "metamask" | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"choose" | "processing" | "success" | "error">("choose");
  const [message, setMessage] = useState("");
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState("");

  const plan = PLANOS[planId] || { name: "Plano", priceMT: 0, tokenAmount: 0 };

  async function pagarComMetaMask() {
    if (typeof window.ethereum === "undefined") {
      setMessage("MetaMask não detectada. Instale a extensão ou use Cartão.");
      setStep("error");
      return;
    }

    setMethod("metamask");
    setStep("processing");
    setLoading(true);

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userWallet = accounts[0];

      const tokenAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
      const rawAmount = BigInt(Math.round(plan.tokenAmount * 1_000_000));
      const recipient = WALLET_DESTINO.replace("0x", "").padStart(64, "0");
      const amountHex = rawAmount.toString(16).padStart(64, "0");

      const txParams = {
        to: tokenAddress,
        from: userWallet,
        data: `0xa9059cbb000000000000000000000000${recipient}${amountHex}`,
      };

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });

      setMessage(`Transação enviada! Hash: ${txHash.slice(0, 16)}... Aguardando confirmação...`);

      const res = await fetch("/api/v1/payments/verify-crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, storeId: tenantId, planId, wallet: userWallet }),
      });

      const data = await res.json();
      if (data.success) {
        setStep("success");
        setMessage(data.message);
        setReceiptId(data.receiptId || "");
        setReceiptBase64(data.receiptBase64 || null);
        onSuccess?.(data);
      } else {
        setStep("error");
        setMessage(data.error || "Falha na validação do pagamento.");
      }
    } catch (err: any) {
      setStep("error");
      setMessage(err.code === 4001 ? "Transação rejeitada na MetaMask." : `Erro: ${err.message || "Desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  async function pagarComCartao() {
    setMethod("card");
    setStep("processing");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, tenantId }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setStep("error");
        setMessage("Falha ao gerar sessão de pagamento.");
      }
    } catch (err: any) {
      setStep("error");
      setMessage(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess() {
    if (staticMode) {
      setStep("success");
      setMessage(`✅ ${plan.name} activada com sucesso! Recibo simulado.`);
      setReceiptId(`HWS-REC-SIM-${Date.now().toString(36).toUpperCase()}`);
      onSuccess?.({ success: true, receiptId: `HWS-REC-SIM-${Date.now().toString(36).toUpperCase()}` });
      return;
    }
    pagarComCartao();
  }

  const isLoading = loading || (step === "processing" && method === "card");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl w-full max-w-lg p-6" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

        {step === "choose" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">💳 Pagar {plan.name}</h2>
              <button onClick={onClose} className="text-slate-500 hover:text-white text-lg cursor-pointer">&times;</button>
            </div>

            <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4 mb-6">
              <div className="text-[11px] text-slate-400 font-mono mb-1">Valor a pagar</div>
              <div className="text-2xl font-bold text-white font-display">
                {plan.priceMT.toLocaleString("pt-PT")},00 MT
              </div>
              <div className="text-xs text-slate-500 mt-1">~${(plan.priceMT / 64).toFixed(2)} USD</div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setLoading(true); handleSuccess(); }}
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? "Processando..." : "💳 Pagar com Cartão (Visa/Mastercard)"}
              </button>

              <button
                onClick={() => { setLoading(true); pagarComMetaMask(); }}
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all bg-[#0b0f19] hover:bg-slate-800 text-white border border-slate-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none"><path d="M32.958 1L19.514 11.115l2.492-5.905L32.958 1z" fill="#E17726"/><path d="M2.042 1l15.286 10.164-2.31-5.953L2.043 1zM28.145 22.598l-4.133 6.347 8.86 2.455 2.547-8.637-7.274-.165zM.582 22.763l2.536 8.637 8.86-2.455-4.132-6.347-7.264.165z" fill="#E27625"/><path d="M10.976 13.75l-2.462 3.724 8.78.39-.312-9.431-6.006 5.317zM24.024 13.75l-6.123-5.37-.256 9.484 8.78-.39-2.4-3.724zM12.044 28.945l5.275-2.564-4.547-3.547-.728 6.111zM18.68 26.381l5.276 2.564-.728-6.111-4.548 3.547z" fill="#E27625"/><path d="M23.956 28.945l-5.276-2.564.42 3.444-.045 1.459 4.901-2.34zM12.044 28.945l4.9 2.34-.04-1.459.415-3.444-5.276 2.564z" fill="#D5BFB2"/><path d="M16.98 22.188l-4.385-1.285 3.092-1.418 1.293 2.703zM19.02 22.188l1.293-2.703 3.098 1.418-4.39 1.285z" fill="#233447"/><path d="M12.043 28.945l.746-6.11-4.878.064 4.132 6.046zM22.212 22.835l.745 6.11 4.132-6.046-4.877-.064zM30.047 17.474l-8.78.39 1.557 1.541 4.39 1.285 2.833-3.216zM10.976 13.75l-5.27 2.724 2.832 3.216 4.391-1.285 1.556-1.541-2.509-3.114zM19.83 17.864l.256-9.484 2.235-5.905H12.68l2.235 5.905.256 9.484 1.284 2.708.007-.006.045.006 1.323-2.702z" fill="#E27625"/><path d="M29.27 17.474l-2.833 3.216 4.39 1.285 2.537-8.637-4.094 4.136zM6.687 13.75l-4.105-4.136 2.537 8.637 4.391-1.285-2.823-3.216zM10.976 17.864l-2.462 3.724 4.877.064-.746-6.11-1.669 2.322zM22.576 17.864l-1.669-2.322-.746 6.11 4.877-.064-2.462-3.724zM15.686 20.588l-4.391-1.285 3.092-1.418 1.299 2.703zM20.314 20.588l1.293-2.703 3.098 1.418-4.391 1.285zM16.98 22.188l-1.284 2.703 1.557 1.196 1.547-1.196-1.82-2.703z" fill="#CC6228"/><path d="M20.314 22.188l-1.82 2.703 1.547 1.196 1.557-1.196-1.284-2.703zM17.253 24.891l-1.557-1.196.42 3.444.045 1.459 1.092-3.707zM18.747 24.891l1.092 3.707.045-1.459.42-3.444-1.557 1.196z" fill="#E27525"/><path d="M18.747 24.891l-1.092 3.707.767.648 1.837-.002-.512-4.353-1 .643zM17.253 24.891l-1-.643-.512 4.353 1.837.002.767-.648-1.092-3.707z" fill="#F5841F"/><path d="M26.208 31.509l-4.901 2.34.39-3.262-.168-.138 4.68-2.871zM10.762 30.448l.39 3.262-4.901-2.34 3.679 1.196.832-2.118z" fill="#C0AC9D"/><path d="M18.68 26.381l.768-.643H16.55l.768.643.418 3.444.04-1.459 1.293-2.564z" fill="#161616"/><path d="M30.64 14.557l1.08-5.257L32.959 1l-4.815 3.541L18.68 10.381l5.344 3.369 2.704 1.993 2.557.645-4.39 1.285 2.833 3.216 4.133-6.347.645-.99-1.422-1.006 2.557-1.285zM2.28 1l1.08 5.257L1 9.514l2.557 1.285-1.422 1.006.645.99 4.132 6.347 2.833-3.216-4.39-1.285 2.557-.645 2.704-1.993L16.32 10.38 7.215 4.541 2.28 1z" fill="#E27625"/><path d="M31.197 15.847l-2.557-.645 4.133 6.347-2.546 8.637 5.542-.02h3.233l-.003-14.32-5.802.001zM4.803 15.202l-2.557.645-5.246.001V30.16h3.232l5.542.02-2.536-8.637 4.132-6.347-2.567.645z" fill="#E27625"/></svg>
                Pagar com MetaMask (USDC/Polygon)
              </button>
            </div>

            <div className="mt-4 text-[10px] text-slate-600 text-center font-mono">
              Gateway seguro · Criptografia SSL · Transacção processada pela Bluewhite Corporation Lda.
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-white font-semibold text-sm mb-2">
              {method === "card" ? "Redirecionando para pagamento seguro..." : "A processar transacção..."}
            </div>
            <div className="text-xs text-slate-400 font-mono">{message || "Aguarde um momento"}</div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-white font-bold text-lg mb-2">Pagamento Confirmado! 🎉</div>
            <div className="text-xs text-slate-400 font-mono mb-4">{message}</div>
            {receiptId && <div className="text-[11px] text-indigo-400 font-mono mb-4">Recibo: {receiptId}</div>}
            <div className="flex gap-3 justify-center">
              {receiptBase64 && (
                <a
                  href={`data:application/pdf;base64,${receiptBase64}`}
                  download={`recibo-${receiptId}.pdf`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  📄 Baixar Recibo PDF
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-white font-bold text-lg mb-2">Pagamento não confirmado</div>
            <div className="text-xs text-slate-400 font-mono mb-6">{message}</div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setStep("choose")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Tentar novamente
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
