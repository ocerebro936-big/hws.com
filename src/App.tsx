/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tenant, LogEntry } from './types';
import SimulatorHeader from './components/SimulatorHeader';
import MainHub from './components/MainHub';
import StoreFront from './components/StoreFront';
import ControlSpace from './components/ControlSpace';
import LandingPage from './components/LandingPage';
import { isStaticMode, getStaticTenants, getStaticTenant } from './staticData';

declare const __BUILD_VERSION__: string;

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [detectedVia, setDetectedVia] = useState<string>('');
  const [detectedDomain, setDetectedDomain] = useState<string>('');
  const [originalHost, setOriginalHost] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showControlSpace, setShowControlSpace] = useState(false);

  const staticMode = isStaticMode();

  const addLog = (type: 'info' | 'success' | 'warning', message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { hour12: false });
    const newEntry: LogEntry = { timestamp, type, message };
    setLogs(prev => [newEntry, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Console de monitoramento limpo.');
  };

  const fetchAllTenants = async () => {
    if (staticMode) {
      setTenants(getStaticTenants() as Tenant[]);
      return;
    }
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();
      if (data.success) setTenants(data.tenants);
    } catch (err) {
      console.error('Falha ao obter lista de inquilinos:', err);
      addLog('warning', 'Erro ao obter listagem de inquilinos das lojas.');
    }
  };

  const fetchActiveTenant = async (simTenantId?: string) => {
    if (staticMode) {
      const tenant = getStaticTenant(simTenantId);
      setCurrentTenant(tenant as Tenant);
      setDetectedVia('Simulando Roteamento Dinâmico Multi-Tenant');
      setDetectedDomain(tenant.domain);
      setOriginalHost(window.location.host);
      addLog('info', `Modo estático: Loja '${tenant.name}' carregada.`);
      return;
    }
    try {
      const url = simTenantId ? `/api/tenant?tenant=${simTenantId}` : '/api/tenant';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCurrentTenant(data.tenant);
        setDetectedVia(data.detectedVia);
        setDetectedDomain(data.detectedDomain);
        setOriginalHost(data.originalHost);
        
        addLog('info', `Resolving: Interceptado host de requisição. Domínio '${data.detectedDomain}' correspondente foi associado ao backend via: [${data.detectedVia}].`);
      } else {
        addLog('warning', 'Erro retornado pelo interpretador do servidor Express.');
      }
    } catch (err) {
      console.error('Erro de requisição:', err);
      addLog('warning', 'Falha crítica na troca ou resolução do inquilino.');
    }
  };

  const handleAddProduct = async (
    tenantId: string,
    name: string,
    price: string,
    desc: string,
    category: string,
    image?: File
  ): Promise<boolean> => {
    if (staticMode) {
      addLog('warning', 'Modo estático: a adicionar produto localmente (não persistido).');
      const t = getStaticTenant(tenantId);
      const imageUrl = image ? URL.createObjectURL(image) : undefined;
      (t.products as any[]).unshift({ id: Date.now(), name, price, description: desc, category, imageUrl });
      setCurrentTenant({ ...t } as Tenant);
      return true;
    }
    try {
      const formData = new FormData();
      formData.append("tenantId", tenantId);
      formData.append("name", name);
      formData.append("price", price);
      formData.append("description", desc);
      formData.append("category", category);
      if (image) formData.append("photo", image);

      const response = await fetch(`/api/v1/products/add`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        await fetchAllTenants();
        await fetchActiveTenant(tenantId);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      addLog('warning', 'Problema de conexão gravando novo registro no servidor.');
      return false;
    }
  };

  // Bootstrap fetching
  useEffect(() => {
    const prevVersion = localStorage.getItem("hws_build_version");
    const currVersion = typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";
    if (prevVersion && prevVersion !== currVersion) {
      localStorage.clear();
      window.location.reload();
      return;
    }
    localStorage.setItem("hws_build_version", currVersion);

    addLog('info', 'Inicializando Sandbox de Solução HWS Multi-Tenant...');
    
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get('payment_success');
    const sessionId = params.get('session_id');
    const type = params.get('type');
    const tenantId = params.get('tenantId');
    const domainName = params.get('domainName');
    const amount = params.get('amount');

    const verifyAndLoad = async () => {
      if (paymentSuccess === 'true' && sessionId) {
        addLog('info', `[Stripe Express] Validando sessão de checkout: ${sessionId}...`);
        try {
          const response = await fetch('/api/v1/hws/payments/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await response.json();
          if (data.success) {
            addLog('success', `[Stripe Gateway] COBRANÇA CONFIRMADA! Sessão de checkout liquidada.`);
            if (type === 'domain') {
              addLog('success', `[Sincronização HWS] Registro concluído! Domínio próprio '${domainName}' configurado p/ a loja ID '${tenantId}'.`);
            } else if (type === 'license') {
              addLog('success', `[Sincronização HWS] Licença reativada! Mensalidade de ${tenantId} quitada. Split tributário & comissão retidos.`);
            } else if (type === 'cart') {
              addLog('success', `[Sincronização HWS] Compra bem-sucedida! Volume de ${amount} MT consolidado no GMV da loja ID '${tenantId}'.`);
            }
          } else {
            addLog('warning', `[Stripe Gateway] Falha ao verificar pagamento: ${data.error}`);
          }
        } catch (err) {
          console.error(err);
          addLog('warning', '[Stripe Gateway] Falha de comunicação de gateway.');
        }

        // Clean query strings seamlessly
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('payment_cancel') === 'true') {
        addLog('warning', `[Stripe Gateway] Checkout cancelado pelo usuário.`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      await fetchAllTenants();
      await fetchActiveTenant(tenantId || undefined);
    };

    verifyAndLoad();
  }, []);

  const handleSwitchTenant = (tenantId: string) => {
    addLog('info', `Simulando alteração de requisição DNS direcionada ao inquilino id: '${tenantId}'`);
    fetchActiveTenant(tenantId);
  };

  const handleToggleStatus = async (tenantId: string) => {
    if (staticMode) {
      const t = getStaticTenant(tenantId);
      t.licenseStatus = t.licenseStatus === "SUSPENDED" ? "PAID" : "SUSPENDED";
      setCurrentTenant({ ...t } as Tenant);
      addLog('warning', `[Gestão Bluewhite] Licença de '${tenantId}': ${t.licenseStatus}.`);
      return;
    }
    try {
      const response = await fetch(`/api/tenants/${tenantId}/toggle-status`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        addLog('warning', `[Gestão Bluewhite] Medida administrativa na licença de '${tenantId}': Status alterado para ${data.tenant.licenseStatus}.`);
        await fetchAllTenants();
        await fetchActiveTenant(tenantId);
      }
    } catch (err) {
      console.error(err);
      addLog('warning', 'Falha ao aplicar alteração de licença.');
    }
  };

  const handleRenewLicense = async (tenantId: string) => {
    if (staticMode) {
      addLog('warning', 'Modo estático: simular pagamento não disponível. Use o servidor Express para testar pagamentos reais.');
      return;
    }
    try {
      addLog('info', `[Stripe Express] Criando sessão de pagamento de licença para '${tenantId}'...`);
      const response = await fetch('/api/v1/hws/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'license',
          tenantId,
          returnUrl: window.location.origin
        })
      });
      const data = await response.json();
      if (data.success && data.url) {
        addLog('success', `[Stripe Express] Redirecionando para portal de faturamento Stripe Seguro...`);
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Falha ao gerar sessão de checkout Stripe.');
      }
    } catch (err: any) {
      console.error(err);
      addLog('warning', `Erro ao iniciar checkout: ${err.message || err}`);
    }
  };

  const toggleControlSpace = () => {
    setShowControlSpace((prev) => !prev);
    addLog(showControlSpace ? "info" : "success", showControlSpace ? "Saindo do Control Space..." : "Acessando o Control Space HWS...");
  };

  return (
    <div className="hws-core-space font-inter font-sans antialiased">
      
      {currentTenant && !showControlSpace && (
        <SimulatorHeader
          currentTenant={currentTenant}
          originalHost={originalHost}
          detectedVia={detectedVia}
          detectedDomain={detectedDomain}
          tenants={tenants}
          onSwitchTenant={handleSwitchTenant}
          onToggleStatus={handleToggleStatus}
          onRenewLicense={handleRenewLicense}
          logs={logs}
          onClearLogs={clearLogs}
          onAddLog={addLog}
          onOpenControlSpace={toggleControlSpace}
        />
      )}

      <main className="transition-all duration-300">
        {showControlSpace ? (
          <ControlSpace
            tenants={tenants}
            currentTenant={currentTenant}
            onSwitchTenant={(id) => { setShowControlSpace(false); handleSwitchTenant(id); }}
            onAddLog={addLog}
            staticMode={staticMode}
            onClose={() => setShowControlSpace(false)}
          />
        ) : !currentTenant ? (
          <LandingPage onEnterStore={() => handleSwitchTenant("hub")} />
        ) : currentTenant.type === 'hub' ? (
          <MainHub
            tenants={tenants}
            onSwitchTenant={handleSwitchTenant}
            onToggleStatus={handleToggleStatus}
            onRenewLicense={handleRenewLicense}
            onAddLog={addLog}
            onRefreshTenants={fetchAllTenants}
            onOpenControlSpace={toggleControlSpace}
            staticMode={staticMode}
          />
        ) : currentTenant.licenseStatus === 'SUSPENDED' ? (
          /* SUSPENDED LICENSE WARNING SCREEN (Bluewhite Lda Compliance) */
          <div className="min-h-[90vh] bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 to-red-500"></div>
              
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-500 text-3xl animate-bounce">
                ⚠️
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full font-bold">
                  Espaço Suspenso Temporariamente
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-white">
                  Contrato de Locação Inativo
                </h1>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  A loja <strong className="text-amber-400">{currentTenant.name}</strong> encontra-se inativa por falta de pagamento do aluguer de espaço digital e infraestrutura tecnológica.
                </p>
              </div>

              {/* Legal and compliance specification table */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 text-left font-mono text-[11px] space-y-2.5 text-slate-300">
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-500">Locador / Operador:</span>
                  <span className="text-slate-200">Bluewhite Corporation Lda.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inquilino (DNS):</span>
                  <span className="text-slate-200">{currentTenant.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NUIT Contratual:</span>
                  <span className="text-slate-200">{currentTenant.nuitCorporate || "Pendente"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aluguer Mensal:</span>
                  <span className="text-amber-500 font-bold">{currentTenant.monthlyRent || "3.500 MT"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data de Vencimento:</span>
                  <span className="text-red-400">{currentTenant.nextPaymentDate || "Atrasado"}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-850 text-[10px] text-slate-500 leading-relaxed">
                  <span>Adequado às normas do GDPR e de proteção de dados de Moçambique.</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleRenewLicense(currentTenant.id)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-[1.01] shadow-lg cursor-pointer"
                >
                  Regularizar Plano (Simular Pagamento Aluguer)
                </button>
                
                <button
                  onClick={() => handleSwitchTenant('hub')}
                  className="text-xs text-slate-400 hover:text-white transition-colors block mx-auto underline"
                >
                  Voltar ao Hub World Shopping Principal
                </button>
              </div>

              <div className="text-[10px] text-slate-550 border-t border-slate-800/80 pt-5">
                © {new Date().getFullYear()} Bluewhite Corporation Lda. Todos os direitos reservados.
              </div>
            </div>
          </div>
        ) : (
          <StoreFront
            tenant={currentTenant}
            onBackToHub={() => handleSwitchTenant('hub')}
            onAddLog={addLog}
            onRefreshTenants={fetchAllTenants}
            onAddProduct={handleAddProduct}
          />
        )}
      </main>

    </div>
  );
}

