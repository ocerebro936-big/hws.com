/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Network, 
  Database,
  Layers,
  HelpCircle,
  X,
  Code2,
  ArrowRight
} from 'lucide-react';
import { Tenant, LogEntry } from '../types';

interface SimulatorHeaderProps {
  currentTenant: Tenant;
  originalHost: string;
  detectedVia: string;
  detectedDomain: string;
  tenants: Tenant[];
  onSwitchTenant: (tenantId: string) => void;
  onToggleStatus: (tenantId: string) => void;
  onRenewLicense: (tenantId: string) => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  onAddLog: (type: 'info' | 'success' | 'warning', message: string) => void;
}

export default function SimulatorHeader({
  currentTenant,
  originalHost,
  detectedVia,
  detectedDomain,
  tenants,
  onSwitchTenant,
  onToggleStatus,
  onRenewLicense,
  logs,
  onClearLogs,
  onAddLog
}: SimulatorHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // OCI API Gateway tab states
  const [activeConsoleTab, setActiveConsoleTab] = useState<'overview' | 'gateway'>('overview');
  const [rateLimitRps, setRateLimitRps] = useState<number>(30);
  const [corsEnabled, setCorsEnabled] = useState<boolean>(true);
  const [authType, setAuthType] = useState<'NONE' | 'STRIPE_API_KEY' | 'JWT_CUSTOM'>('STRIPE_API_KEY');
  const [selectedGatewayRoute, setSelectedGatewayRoute] = useState<string>('/api/v1/hws/payments/*');
  const [testOutput, setTestOutput] = useState<{ status: string; body: string; latency: number; headers: Record<string, string> } | null>(null);
  const [isTestingRequest, setIsTestingRequest] = useState(false);

  // Address Bar State
  const activeUrl = currentTenant.customDomain 
    ? `http://${currentTenant.customDomain}` 
    : `http://${currentTenant.domain}`;

  const [urlInput, setUrlInput] = useState(activeUrl);
  const [inputError, setInputError] = useState(false);

  useEffect(() => {
    setUrlInput(activeUrl);
    setInputError(false);
  }, [currentTenant]);

  const triggerMockRequestTest = () => {
    setIsTestingRequest(true);
    setTimeout(() => {
      let status = "200 OK";
      let latency = Math.floor(Math.random() * 45) + 12;
      let headers: Record<string, string> = {
        "content-type": "application/json",
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
        "x-hws-gateway-origin": "Oracle-OCI-APIGW/20190501"
      };
      let body = "";

      if (rateLimitRps < 5) {
        status = "429 Too Many Requests";
        body = JSON.stringify({
          code: "TooManyRequests",
          message: "A taxa de requisição limite configurada na OCI Service Gateway policy foi ultrapassada.",
          limitPerSecond: rateLimitRps
        }, null, 2);
        onAddLog('warning', `[Oracle API Gateway] Roteamento bloqueado: Código HTTP 429 - Limite de requisições excedido (${rateLimitRps} rps)`);
      } else {
        if (selectedGatewayRoute === '/api/v1/hws/payments/*') {
          if (authType === 'STRIPE_API_KEY') {
            status = "201 Created";
            headers["x-stripe-active-sandbox"] = "true";
            body = JSON.stringify({
              object: "checkout.session",
              id: "cs_test_" + Math.random().toString(36).substring(2, 10),
              success_url: "https://hws.com/?payment_success=true",
              amount_total: 1900,
              currency: "usd",
              gateway_provider: "Stripe Connect"
            }, null, 2);
            onAddLog('success', `[Oracle API Gateway] Rota /api/v1/hws/payments/* despachada com sucesso ao Stripe Checkout Session.`);
          } else if (authType === 'JWT_CUSTOM') {
            status = "401 Unauthorized";
            body = JSON.stringify({
              code: "Unauthorized",
              message: "Chave JWT Token de autenticação customizada não enviada ou expirada."
            }, null, 2);
            onAddLog('warning', `[Oracle API Gateway] Rota /api/v1/hws/payments/* rejeitada: Falha na validação do Authorizer Token.`);
          } else {
            status = "200 OK";
            body = JSON.stringify({
              message: "Conexão estabelecida sem credenciais de segurança. Ambiente exposto!"
            }, null, 2);
            onAddLog('info', `[Oracle API Gateway] Rota de pagamentos acessada sem credenciais.`);
          }
        } else if (selectedGatewayRoute === '/api/tenants/*') {
          status = "200 OK";
          headers["x-hws-resolved-tenant-host"] = currentTenant.domain;
          body = JSON.stringify({
            tenantId: currentTenant.id,
            name: currentTenant.name,
            domain: currentTenant.domain,
            customDomain: currentTenant.customDomain || null,
            licenseStatus: currentTenant.licenseStatus,
            plan: currentTenant.plan
          }, null, 2);
          onAddLog('success', `[Oracle API Gateway] Rota /api/tenants/* resolvida p/ hospedar o Host '${currentTenant.domain}'`);
        } else {
          status = "200 OK";
          headers["content-type"] = "text/html";
          body = `<!DOCTYPE html>\n<html>\n<head><title>${currentTenant.name}</title></head>\n<body><h1>Vitrine Online de ${currentTenant.name}</h1></body>\n</html>`;
          onAddLog('info', `[Oracle API Gateway] Rota estática /* renderizando HTML p/ o domínio do inquilino.`);
        }
      }

      setTestOutput({ status, body, latency, headers });
      setIsTestingRequest(false);
    }, 600);
  };

  const getOciGatewayJsonSpec = () => {
    return JSON.stringify({
      compartmentId: "ocid1.compartment.oc1..aaaaaaaay3skvdwj6g6fexample",
      displayName: "hws-shopping-gateway",
      endpointType: "PUBLIC",
      hostname: "amaaaaaax7u3axya.apigateway.eu-london-1.oci.customer-oci.com",
      lifecycleState: "ACTIVE",
      specification: {
        requestPolicies: {
          cors: {
            allowedHeaders: ["*"],
            allowedMethods: ["GET", "POST", "OPTIONS"],
            allowedOrigins: corsEnabled ? ["*"] : [],
            isAllowCredentialsEnabled: true
          },
          rateLimiting: {
            rateKey: "CLIENT_IP",
            rateLimit: rateLimitRps
          }
        },
        routes: [
          {
            path: "/api/v1/hws/payments/*",
            methods: ["POST", "OPTIONS"],
            backend: {
              type: "HTTP_BACKEND",
              url: "https://api.stripe.com/v1"
            },
            requestPolicies: {
              authorization: authType !== 'NONE' ? {
                type: "AUTHENTICATION_ONLY",
                authType: authType
              } : undefined
            }
          },
          {
            path: "/api/tenants/*",
            methods: ["GET"],
            backend: {
              type: "HTTP_BACKEND",
              url: "http://localhost:3000/api"
            }
          },
          {
            path: "/*",
            methods: ["GET"],
            backend: {
              type: "HTTP_BACKEND",
              url: "http://localhost:3000"
            }
          }
        ]
      }
    }, null, 2);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanVal = urlInput.trim().toLowerCase();
    
    // Remove protocols and www prefixes and trailing slashes
    cleanVal = cleanVal.replace(/^(https?:\/\/)?(www\.)?/, '');
    cleanVal = cleanVal.split('/')[0];

    if (!cleanVal) return;

    // Search for match in tenants list
    const found = tenants.find(t => {
      const matchDomain = t.domain.toLowerCase() === cleanVal;
      const matchCustom = t.customDomain && t.customDomain.toLowerCase() === cleanVal;
      const matchId = t.id.toLowerCase() === cleanVal;
      const matchPrefix = t.domain.toLowerCase().startsWith(cleanVal + '.');
      return matchDomain || matchCustom || matchId || matchPrefix;
    });

    if (found) {
      onAddLog('success', `[Roteamento DNS de Entrada] Navegando via endereço de rede: http://${cleanVal}`);
      onSwitchTenant(found.id);
      setInputError(false);
    } else {
      setInputError(true);
      onAddLog('warning', `[Erro de DNS] Domínio não resolvido: http://${cleanVal}. Tente 'hws.com', 'moda.hws.com', 'tech.hws.com' ou um domínio próprio registrado.`);
      setTimeout(() => setInputError(false), 2500);
    }
  };

  // Filter tenants into hub vs stores
  const hub = tenants.find(t => t.type === 'hub');
  const stores = tenants.filter(t => t.type === 'store');

  return (
    <div className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      {/* Mini top bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <Server size={14} className="text-emerald-400" />
            <span className="font-semibold text-slate-100">HWS Sandbox:</span>
            <span className="text-slate-400 max-w-[150px] md:max-w-none truncate sm:inline hidden">
              Simulando Roteamento Dinâmico Multi-Tenant
            </span>
          </div>
        </div>

        {/* Functional Browser Address Bar */}
        <form 
          onSubmit={handleUrlSubmit} 
          className={`flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border font-mono transition-all w-full max-w-xs sm:max-w-md ${
            inputError 
              ? 'border-red-500 ring-1 ring-red-500/35 bg-red-950/10' 
              : 'border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20'
          }`}
        >
          <Globe size={13} className={inputError ? 'text-red-400 animate-pulse' : 'text-sky-400 shrink-0'} />
          <span className="text-slate-500 text-xs hidden md:inline select-none shrink-0">http://</span>
          <input 
            type="text"
            value={urlInput.replace(/^https?:\/\//, '')}
            onChange={(e) => {
              // Re-add http:// temporarily to full input values but display clean
              setUrlInput(`http://${e.target.value.replace(/^https?:\/\//, '')}`);
              setInputError(false);
            }}
            className={`bg-transparent text-emerald-450 font-medium tracking-tight text-xs outline-none w-full placeholder:text-slate-800 select-all py-0.5 ${
              inputError ? 'text-red-400 font-bold' : ''
            }`}
            placeholder="hws.com"
          />
          <button
            type="submit"
            className="p-1 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors shrink-0"
            title="Navegar DNS"
          >
            <ArrowRight size={13} />
          </button>
        </form>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="p-1 px-2.5 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-700 flex items-center gap-1 transition-colors pointer-cursor text-xs"
            title="Como isto funciona por trás das câmeras"
          >
            <HelpCircle size={13} />
            <span className="hidden md:inline">Como Funciona?</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 px-2.5 bg-sky-950 text-sky-300 hover:text-sky-100 rounded border border-sky-900 hover:bg-sky-900 flex items-center gap-1 transition-colors pointer-cursor font-medium text-xs"
          >
            <Terminal size={13} />
            <span>Console</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded simulator console and diagnostic logs with OCI API Gateway Tab support */}
      {isExpanded && (
        <div className="bg-slate-950 border-t border-slate-900 overflow-hidden font-mono text-xs">
          {/* Tab Selector Bar */}
          <div className="border-b border-slate-900 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 flex gap-1 pt-2 select-none">
              <button
                type="button"
                onClick={() => setActiveConsoleTab('overview')}
                className={`py-2 px-4 rounded-t-lg font-mono font-bold flex items-center gap-1.5 transition-all text-[11px] uppercase tracking-wider border cursor-pointer border-b-transparent ${
                  activeConsoleTab === 'overview'
                    ? 'bg-slate-900 border-slate-800 text-amber-400'
                    : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Terminal size={12} />
                <span>Console Multi-Tenant & Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('gateway')}
                className={`py-2 px-4 rounded-t-lg font-mono font-bold flex items-center gap-1.5 transition-all text-[11px] uppercase tracking-wider border cursor-pointer border-b-transparent ${
                  activeConsoleTab === 'gateway'
                    ? 'bg-slate-900 border-slate-800 text-sky-400'
                    : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Network size={12} className="text-sky-450" />
                <span>Oracle OCI API Gateway Manager</span>
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-4">
            {activeConsoleTab === 'overview' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Router Controller */}
                <div className="lg:col-span-5 flex flex-col gap-3 bg-slate-900 p-3.5 rounded-lg border border-slate-800 shadow-inner">
                  <h3 className="text-sky-400 font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Layers size={14} /> Selecionar Tenant (Subdomínio)
                  </h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Clique em qualquer ambiente abaixo para alterar a requisição simulada enviada ao servidor Express Node.js.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                    {hub && (
                      <button
                        onClick={() => onSwitchTenant(hub.id)}
                        className={`flex items-center justify-between p-2 rounded transition-all text-left ${
                          currentTenant.id === hub.id
                            ? 'bg-blue-900/40 border border-blue-600 text-blue-100'
                            : 'bg-slate-950 hover:bg-slate-800 border border-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-semibold text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {hub.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">Host: hws.com</div>
                        </div>
                        <span className="text-[10px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900 shrink-0 font-medium">
                          Hub Central
                        </span>
                      </button>
                    )}

                    {stores.map(store => {
                      const isSuspended = store.licenseStatus === 'SUSPENDED';
                      return (
                        <div
                          key={store.id}
                          className={`flex items-center justify-between p-2 rounded border gap-3 transition-all text-left ${
                            currentTenant.id === store.id
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                              : 'bg-slate-950 border-slate-900 text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <button
                            onClick={() => onSwitchTenant(store.id)}
                            className="flex-1 text-left truncate cursor-pointer outline-none"
                          >
                            <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                              <span 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: store.accentColor || '#10b981' }}
                              ></span>
                              <span className="truncate">{store.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">Host: {store.domain}</div>
                          </button>
                          
                          {/* Active State & Interactive Toggle Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-tight shrink-0 ${
                              isSuspended 
                                ? 'bg-red-500/10 text-red-400 border border-red-500/25' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            }`}>
                              {isSuspended ? 'Suspenso' : 'Ativo'}
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStatus(store.id);
                              }}
                              className={`text-[9px] font-medium font-mono px-2 py-1 rounded border transition-colors cursor-pointer outline-none shrink-0 ${
                                isSuspended
                                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/25'
                                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/25'
                              }`}
                              title={isSuspended ? "Reativar aluguer" : "Suspender aluguer"}
                            >
                              {isSuspended ? 'Reativar' : 'Suspender'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Real-time resolution logs */}
                <div className="lg:col-span-7 flex flex-col gap-2.5 bg-slate-900 p-3.5 rounded-lg border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h3 className="text-amber-400 font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <Terminal size={14} /> Diagnostic Logs do Servidor Express
                    </h3>
                    <button 
                      onClick={onClearLogs}
                      className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                    >
                      Limpar Logs
                    </button>
                  </div>

                  {/* Resolution Metrics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-950 p-2 rounded border border-slate-900 font-mono text-[10px]">
                    <div>
                      <span className="text-slate-500">Host Resolvido:</span>
                      <div className="text-slate-200 mt-0.5 truncate">{detectedDomain}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Origem da Resolução:</span>
                      <div className="text-amber-400 mt-0.5 font-semibold truncate">{detectedVia}</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
                      <span className="text-slate-500">In-Memory Store Count:</span>
                      <div className="text-emerald-400 mt-0.5 flex items-center gap-1">
                        <Database size={11} /> {stores.length} lojas
                      </div>
                    </div>
                  </div>

                  {/* Logs Content scrolling area */}
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-900 h-[125px] overflow-y-auto flex flex-col gap-1.5 text-[10px] leading-relaxed">
                    {logs.length === 0 ? (
                      <div className="text-slate-500 italic h-full flex items-center justify-center">
                        Pronto para receber requisições... Clique nos links ou troque de inquilino para disparar eventos de escuta.
                      </div>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-slate-600 select-none shrink-0">{log.timestamp}</span>
                          <span className={`font-semibold shrink-0 ${
                            log.type === 'success' ? 'text-emerald-400' :
                            log.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
                          }`}>
                            [{log.type.toUpperCase()}]
                          </span>
                          <span className="text-slate-300">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Oracle OCI API Gateway Simulator Pane matching OCI Spec API */
              <div className="space-y-4">
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                        Oracle Cloud Infrastructure (OCI) Deployment Specification
                      </span>
                      <h2 className="text-sm font-bold text-white mt-1">hws-shopping-gateway Simulator</h2>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Gateway OCID:</span>
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-slate-300 text-[9px] select-all">
                        ocid1.apigateway.oc1.eu-london-1.amaaaaaax7u3axyaexample
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3.5">
                    {/* Routing Policies Controls */}
                    <div className="lg:col-span-4 space-y-4">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1">
                          🛠️ Ingress Request Policies
                        </h4>
                        <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-900">
                          {/* Rate Limiting Slider */}
                          <div>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-slate-400">Limitação de Tráfego (Policy: rateLimiting)</span>
                              <span className="text-sky-400 font-bold">{rateLimitRps} RPS</span>
                            </div>
                            <input
                              type="range"
                              min="2"
                              max="100"
                              value={rateLimitRps}
                              onChange={(e) => setRateLimitRps(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            {rateLimitRps < 5 && (
                              <div className="text-[9px] text-amber-500 mt-1 font-sans leading-tight">
                                ⚠️ RPS &lt; 5 simula o erro HTTP 429 (Too Many Requests) para testar tratamento de sobrecarga.
                              </div>
                            )}
                          </div>

                          {/* CORS Toggle */}
                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Configurar CORS</span>
                              <span className="text-[9px] text-slate-500 block">Permitir AllowedOrigins [*]</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCorsEnabled(!corsEnabled)}
                              className={`p-1 px-2.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                corsEnabled 
                                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {corsEnabled ? 'Habilitado' : 'Desabilitado'}
                            </button>
                          </div>

                          {/* Gateway Security Auth Type */}
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold mb-1.5">Authorization Rule (API Filter)</span>
                            <div className="grid grid-cols-1 gap-1">
                              <button
                                type="button"
                                onClick={() => setAuthType('NONE')}
                                className={`text-left p-1.5 px-2 rounded text-[9px] transition-all cursor-pointer border ${
                                  authType === 'NONE'
                                    ? 'bg-sky-950/40 border-sky-600 text-sky-200'
                                    : 'bg-slate-900 border-transparent text-slate-400 hover:bg-slate-850'
                                }`}
                              >
                                ● NENHUMA (Acesso Exposto / Padrão)
                              </button>
                              <button
                                type="button"
                                onClick={() => setAuthType('STRIPE_API_KEY')}
                                className={`text-left p-1.5 px-2 rounded text-[9px] transition-all cursor-pointer border ${
                                  authType === 'STRIPE_API_KEY'
                                    ? 'bg-sky-950/40 border-sky-600 text-sky-200'
                                    : 'bg-slate-900 border-transparent text-slate-400 hover:bg-slate-850'
                                }`}
                              >
                                ● Stripe Sandbox Key Auth Client (Ativo)
                              </button>
                              <button
                                type="button"
                                onClick={() => setAuthType('JWT_CUSTOM')}
                                className={`text-left p-1.5 px-2 rounded text-[9px] transition-all cursor-pointer border ${
                                  authType === 'JWT_CUSTOM'
                                    ? 'bg-sky-950/40 border-sky-600 text-sky-200'
                                    : 'bg-slate-900 border-transparent text-slate-400 hover:bg-slate-850'
                                }`}
                              >
                                ● JWT Custom OAuth/ID Autenticador (Bloquear)
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* API Spec JSON matching Oracle Gateway */}
                    <div className="lg:col-span-5 flex flex-col space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                          📄 OCI Deployment JSON Spec
                        </span>
                        <span className="text-[9px] bg-slate-950 border border-slate-900 px-2 py-0.5 rounded text-amber-500">
                          Format: API-Gateway/20190501
                        </span>
                      </div>
                      <pre className="p-3 bg-slate-950 text-slate-300 rounded-lg border border-slate-900 text-[9px] overflow-auto h-[210px] font-mono leading-tight shadow-inner select-all">
                        {getOciGatewayJsonSpec()}
                      </pre>
                    </div>

                    {/* Integrated Tester Console */}
                    <div className="lg:col-span-3 flex flex-col space-y-2.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                        ⚡ Gateway Endpoint Client Tester
                      </span>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] text-slate-500 block mb-1">Rota p/ Testar Chamada:</label>
                            <select
                              value={selectedGatewayRoute}
                              onChange={(e) => setSelectedGatewayRoute(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded p-1 text-[10px] outline-none"
                            >
                              <option value="/api/v1/hws/payments/*">POST /api/v1/hws/payments/* (Stripe Express)</option>
                              <option value="/api/tenants/*">GET /api/tenants/* (Dados do Inquilino)</option>
                              <option value="/*">GET /* (Vitrine Estática HTML)</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            disabled={isTestingRequest}
                            onClick={triggerMockRequestTest}
                            className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded border cursor-pointer border-sky-800/10 shadow-lg active:scale-[0.98] transition-all"
                          >
                            {isTestingRequest ? 'PROCESSANDO INGRESS...' : 'Simular Chamada HTTP'}
                          </button>
                        </div>

                        {/* Test Response output block */}
                        {testOutput ? (
                          <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-900 text-[10px]">
                            <div className="flex justify-between font-bold">
                              <span>Status Code:</span>
                              <span className={
                                testOutput.status.startsWith('2') ? 'text-emerald-400' :
                                testOutput.status.startsWith('4') ? 'text-red-400' : 'text-amber-400'
                              }>
                                {testOutput.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500">
                              <span>Latência Gateway:</span>
                              <span>{testOutput.latency} ms</span>
                            </div>
                            <div className="bg-slate-900 p-1.5 border border-slate-850 text-[9.5px] rounded text-emerald-450 h-[80px] overflow-auto select-all max-w-full">
                              {testOutput.body}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-600 italic text-center mt-6">
                            Clique em "Simular Chamada HTTP" para direcionar tráfego de entrada ao API Gateway.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explanatory Overlay Banner */}
      {showExplanation && (
        <div className="bg-sky-950/95 border-b border-sky-900 py-3.5 px-4 font-sans relative">
          <div className="max-w-4xl mx-auto flex gap-3 text-slate-100 text-xs md:text-sm">
            <div className="bg-sky-900 p-2 rounded-lg self-start h-8 w-8 flex items-center justify-center text-sky-200 shadow shrink-0">
              <Code2 size={18} />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-sky-200 flex items-center gap-1.5">
                Como funciona a Arquitetura Multi-Tenant Dinâmica da Plataforma?
              </h4>
              <p className="leading-relaxed text-slate-300">
                1. No modelo <strong>HWS Multi-Tenant</strong>, existe uma única aplicação Express + React e um único banco de dados. 
                As lojas virtuais operam isoladas apenas sob diferentes subdomínios (<em>moda.hws.com</em> e <em>tech.hws.com</em>).
              </p>
              <p className="leading-relaxed text-slate-300">
                2. No servidor Node (arquivo <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">server.ts</code>), criamos um **Middleware** dinâmico que intercepta as requisições, extrai o cabeçalho <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-400">host = req.headers.host</code>, busca as informações da loja correspondente e as injeta no ciclo da aplicação.
              </p>
              <p className="leading-relaxed text-slate-300">
                3. Para este ambiente Sandbox (Playground), o console injeta o cabeçalho simulado correspondente ao seu clique. O servidor Express responde retornando as configurações dinâmicas de cores, produtos e design customizados de modo a manter a fidelidade perfeita do ecossistema.
              </p>
            </div>
            <button 
              onClick={() => setShowExplanation(false)}
              className="text-slate-400 hover:text-white p-1 self-start"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
