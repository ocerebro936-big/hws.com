import { useState, useEffect } from "react";

interface PanelUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  storeIds: string[];
}

const LS_KEY = "hws_user_id";
const LS_USERS = "hws_users_local";

function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "HWS-";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function getLocalUsers(): Record<string, PanelUser> {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) || "{}");
  } catch { return {}; }
}

function saveLocalUser(user: PanelUser) {
  const all = getLocalUsers();
  all[user.id] = user;
  localStorage.setItem(LS_USERS, JSON.stringify(all));
}

export default function UserPanel({ staticMode }: { staticMode: boolean }) {
  const [registeredUser, setRegisteredUser] = useState<PanelUser | null>(null);
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "" });
  const [loginId, setLoginId] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;
    if (staticMode) {
      const all = getLocalUsers();
      const u = all[saved];
      if (u) {
        setRegisteredUser(u);
        setLat(String(u.latitude ?? ""));
        setLon(String(u.longitude ?? ""));
        setPhone(u.phone ?? "");
      } else {
        localStorage.removeItem(LS_KEY);
      }
      return;
    }
    fetch(`/api/v1/users/profile/${saved}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRegisteredUser(d.user);
          setLat(String(d.user.latitude ?? ""));
          setLon(String(d.user.longitude ?? ""));
          setPhone(d.user.phone ?? "");
        } else {
          localStorage.removeItem(LS_KEY);
        }
      })
      .catch(() => {});
  }, [staticMode]);

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => { setMsg(""); setMsgType(""); }, 4000);
  };

  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.email) return;
    if (!acceptedTerms) { showMsg("Deve aceitar os Termos de Uso e a Política de Privacidade para criar conta.", "error"); return; }
    setLoading(true);
    if (staticMode) {
      const all = getLocalUsers();
      const exists = Object.values(all).find((u) => u.email === registerForm.email.toLowerCase().trim());
      if (exists) {
        localStorage.setItem(LS_KEY, exists.id);
        setRegisteredUser(exists);
        setShowRegister(false);
        showMsg(`Bem-vindo de volta, ${exists.name}!`, "success");
        setLoading(false);
        return;
      }
      const id = generateId();
      const user: PanelUser = {
        id,
        name: registerForm.name,
        email: registerForm.email.toLowerCase().trim(),
        phone: registerForm.phone || undefined,
        createdAt: new Date().toISOString(),
        storeIds: [],
      };
      saveLocalUser(user);
      localStorage.setItem(LS_KEY, id);
      setRegisteredUser(user);
      setShowRegister(false);
      showMsg(`Conta criada! Seu ID: ${id}`, "success");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(LS_KEY, data.user.id);
        setRegisteredUser(data.user);
        setShowRegister(false);
        showMsg(`Conta criada! Seu ID: ${data.user.id}`, "success");
      } else {
        showMsg(data.error || "Erro ao registar.", "error");
        if (data.user?.id) {
          localStorage.setItem(LS_KEY, data.user.id);
          setRegisteredUser(data.user);
          setShowRegister(false);
        }
      }
    } catch {
      showMsg("Falha de comunicação.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginId.trim()) return;
    setLoading(true);
    if (staticMode) {
      const all = getLocalUsers();
      const u = all[loginId.trim().toUpperCase()];
      if (!u) {
        showMsg("ID não encontrado. Verifique o código ou registe-se primeiro.", "error");
        setLoading(false);
        return;
      }
      localStorage.setItem(LS_KEY, u.id);
      setRegisteredUser(u);
      setLat(String(u.latitude ?? ""));
      setLon(String(u.longitude ?? ""));
      setPhone(u.phone ?? "");
      showMsg(`Bem-vindo(a), ${u.name}!`, "success");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loginId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(LS_KEY, data.user.id);
        setRegisteredUser(data.user);
        setLat(String(data.user.latitude ?? ""));
        setLon(String(data.user.longitude ?? ""));
        setPhone(data.user.phone ?? "");
        showMsg(`Bem-vindo(a), ${data.user.name}!`, "success");
      } else {
        showMsg(data.error || "ID inválido.", "error");
      }
    } catch {
      showMsg("Falha de comunicação.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!registeredUser) return;
    setLoading(true);
    const updated = { ...registeredUser };
    if (lat) updated.latitude = parseFloat(lat);
    if (lon) updated.longitude = parseFloat(lon);
    if (phone) updated.phone = phone;
    if (staticMode) {
      saveLocalUser(updated);
      setRegisteredUser(updated);
      showMsg("Localização e dados sincronizados!", "success");
      setLoading(false);
      return;
    }
    try {
      const body: any = { id: registeredUser.id };
      if (lat) body.latitude = parseFloat(lat);
      if (lon) body.longitude = parseFloat(lon);
      if (phone) body.phone = phone;
      const res = await fetch("/api/v1/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setRegisteredUser(data.user);
        showMsg("Localização e dados sincronizados!", "success");
      } else {
        showMsg(data.error || "Erro.", "error");
      }
    } catch {
      showMsg("Falha de comunicação.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(LS_KEY);
    setRegisteredUser(null);
    setRegisterForm({ name: "", email: "", phone: "" });
    setLoginId("");
    setLat("");
    setLon("");
    setPhone("");
    showMsg("Sessão terminada.", "success");
  };

  if (!registeredUser) {
    return (
      <div className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6 max-w-md mx-auto">
        <h2 className="text-sm md:text-base font-bold text-white mb-4 flex items-center gap-2">
          👤 Painel do Utilizador
        </h2>

        {msg && msgType && (
          <div className={`mb-3 p-2 rounded-lg text-xs font-mono ${
            msgType === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}>{msg}</div>
        )}

        {showRegister ? (
          <div className="space-y-3">
            <input
              type="text" value={registerForm.name}
              onChange={(e) => setRegisterForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Nome completo"
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
            />
            <input
              type="email" value={registerForm.email}
              onChange={(e) => setRegisterForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
            />
            <input
              type="tel" value={registerForm.phone}
              onChange={(e) => setRegisterForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="Telemóvel (opcional)"
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
            />
            <label className="flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-[#4f46e5] cursor-pointer"
              />
              <span>Ao conectar o seu ID Único, autoriza a plataforma a processar dados de tráfego, interações e visitas para métricas comerciais, em conformidade com a <strong className="text-[#38bdf8]">Política de Privacidade</strong> e os <strong className="text-[#38bdf8]">Termos de Uso</strong> do HWS.</span>
            </label>
            <button
              onClick={handleRegister} disabled={loading}
              className="w-full bg-[#4f46e5] hover:bg-[#3730a3] text-xs font-bold py-2.5 rounded-lg text-white transition-colors disabled:opacity-30"
            >{loading ? "A registar..." : "Criar Conta"}</button>
            <button
              onClick={() => { setShowRegister(false); setAcceptedTerms(false); }}
              className="text-[11px] text-slate-400 hover:text-white block mx-auto"
            >Já tem conta? Faça login</button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text" value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Insira o seu ID único (ex: HWS-A3B7X9K2)"
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
            />
            <button
              onClick={handleLogin} disabled={loading}
              className="w-full bg-[#4f46e5] hover:bg-[#3730a3] text-xs font-bold py-2.5 rounded-lg text-white transition-colors disabled:opacity-30"
            >{loading ? "A entrar..." : "Entrar com ID"}</button>
            <button
              onClick={() => setShowRegister(true)}
              className="text-[11px] text-[#38bdf8] hover:underline block mx-auto"
            >Criar nova conta</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 md:p-6 max-w-md mx-auto">
      <h2 className="text-sm md:text-base font-bold text-white mb-4 flex items-center gap-2">
        👤 Painel do Utilizador
      </h2>

      {msg && msgType && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-mono ${
          msgType === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>{msg}</div>
      )}

      <div className="space-y-4">
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-3 space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">ID Único:</span>
            <span className="text-[#38bdf8] font-bold">{registeredUser.id}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Nome:</span>
            <span className="text-white">{registeredUser.name}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Email:</span>
            <span className="text-slate-300">{registeredUser.email}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Criada em:</span>
            <span className="text-slate-300">{new Date(registeredUser.createdAt).toLocaleDateString("pt-PT")}</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-3 space-y-2.5">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            📍 Localização Física
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">Latitude</label>
              <input
                type="number" step="any" value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-25.9685"
                className="w-full bg-[#131a26] border border-[#1e293b] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">Longitude</label>
              <input
                type="number" step="any" value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="32.5750"
                className="w-full bg-[#131a26] border border-[#1e293b] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1">Telemóvel</label>
            <input
              type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+258 84 000 0000"
              className="w-full bg-[#131a26] border border-[#1e293b] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={handleSync} disabled={loading}
            className="w-full bg-[#4f46e5] hover:bg-[#3730a3] text-xs font-bold py-2 rounded-lg text-white transition-colors disabled:opacity-30"
          >{loading ? "A sincronizar..." : "Guardar Localização"}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-[#1e293b] hover:bg-[#2a3a4f] text-xs font-bold py-2 rounded-lg text-slate-300 transition-colors"
        >Terminar Sessão</button>
      </div>
    </div>
  );
}
