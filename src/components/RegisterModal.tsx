import React, { useState } from "react";

interface RegisterModalProps {
  onClose: () => void;
}

export default function RegisterModal({ onClose }: RegisterModalProps) {
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "", hostSubdomain: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Erro ao registar.");
      }
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-lg cursor-pointer"
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 text-2xl">
              ✓
            </div>
            <h3 className="text-lg font-semibold mb-2">Conta Criada!</h3>
            <p className="text-sm text-slate-400 mb-4">
              Sua loja <strong className="text-indigo-400">{form.storeName}</strong> foi registada em{" "}
              <strong className="text-indigo-400">{form.hostSubdomain}.hws.com</strong>.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl cursor-pointer"
            >
              Começar a Vender
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-1">Criar Loja</h3>
            <p className="text-xs text-slate-400 mb-5">
              Preencha os dados para registar a sua loja na rede HWS.
            </p>

            {error && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-[#0b0f19] border border-[#1e293b] rounded-lg text-sm text-[#f8fafc] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  placeholder="O seu nome"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-[#0b0f19] border border-[#1e293b] rounded-lg text-sm text-[#f8fafc] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Palavra-passe</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-[#0b0f19] border border-[#1e293b] rounded-lg text-sm text-[#f8fafc] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome da Loja</label>
                <input
                  name="storeName"
                  value={form.storeName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-[#0b0f19] border border-[#1e293b] rounded-lg text-sm text-[#f8fafc] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Moda Angolana"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subdomínio Desejado</label>
                <div className="flex items-center gap-2">
                  <input
                    name="hostSubdomain"
                    value={form.hostSubdomain}
                    onChange={handleChange}
                    required
                    pattern="[a-z0-9-]+"
                    className="flex-1 px-3 py-2 bg-[#0b0f19] border border-[#1e293b] rounded-lg text-sm text-[#f8fafc] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    placeholder="minha-loja"
                  />
                  <span className="text-xs text-slate-500 font-mono shrink-0">.hws.com</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                {loading ? "A registar..." : "Registar Loja"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
