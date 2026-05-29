/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  ShoppingBag, 
  Cpu, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  Sparkles, 
  Compass, 
  Server,
  Zap,
  ArrowRight,
  Database,
  Eye,
  X,
  PlusCircle,
  AlertCircle,
  Globe,
  ShieldCheck,
  Landmark,
  Receipt,
  FileSpreadsheet,
  RefreshCw,
  BarChart3,
  AlertOctagon,
  Search,
  User2
} from 'lucide-react';
import { Tenant, Product } from '../types';
import WelcomeBanner from './WelcomeBanner';
import UserPanel from './UserPanel';
import { TermosDeUso, PoliticaPrivacidade, Disclaimer } from './LegalDocs';

interface MainHubProps {
  tenants: Tenant[];
  onSwitchTenant: (tenantId: string) => void;
  onToggleStatus: (tenantId: string) => void;
  onRenewLicense: (tenantId: string) => void;
  onAddLog: (type: 'info' | 'success' | 'warning', message: string) => void;
  onRefreshTenants: () => Promise<void>;
  onOpenControlSpace: () => void;
}

export default function MainHub({
  tenants,
  onSwitchTenant,
  onToggleStatus,
  onRenewLicense,
  onAddLog,
  onRefreshTenants,
  onOpenControlSpace,
  staticMode
}: MainHubProps & { staticMode?: boolean }) {
  // Navigation tabs or filters
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [showRentingModal, setShowRentingModal] = useState(false);

  // Estados para Auditoria & Domínios Corporativos (HWS Admin)
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  
  // Estados de Busca de Domínio no Shopping Hub
  const [hubDomainSearch, setHubDomainSearch] = useState('');
  const [hubDomainResult, setHubDomainResult] = useState<any>(null);
  const [isSearchingHubDomain, setIsSearchingHubDomain] = useState(false);
  const [hubDomainErr, setHubDomainErr] = useState('');
  const [hubDomainSuccess, setHubDomainSuccess] = useState('');
  const [selectedTenantForDomain, setSelectedTenantForDomain] = useState('');

  const fetchAdminStats = async () => {
    setIsLoadingAdmin(true);
    try {
      const response = await fetch('/api/v1/hws/admin/dashboard');
      const data = await response.json();
      if (response.ok) {
        setAdminStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  React.useEffect(() => {
    fetchAdminStats();
  }, [tenants]);

  const handleHubCheckDomain = async () => {
    if (!hubDomainSearch.trim()) {
      setHubDomainErr('Insira um nome de domínio próprio para pesquisar.');
      return;
    }
    
    let cleanDomain = hubDomainSearch.toLowerCase().trim().replace(/\s+/g, '');
    if (!cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.com`;
    }
    
    setHubDomainErr('');
    setHubDomainSuccess('');
    setIsSearchingHubDomain(true);
    setHubDomainResult(null);
    onAddLog('info', `[HWS Registrar] Consultando integridade DNS para domínio: '${cleanDomain}'...`);

    try {
      const response = await fetch(`/api/v1/hws/domains/check?q=${encodeURIComponent(cleanDomain)}`);
      const data = await response.json();
      if (response.ok) {
        setHubDomainResult(data);
        if (data.disponivel) {
          onAddLog('info', `Domínio próprio '${data.dominio}' está inteiramente livre para aquisição.`);
        } else {
          onAddLog('warning', `Domínio '${data.dominio}' indisponível no Registrar.`);
        }
      } else {
        setHubDomainErr(data.error);
      }
    } catch (err) {
      console.error(err);
      setHubDomainErr('Falha ao aceder ao Registrar DNS do HWS.');
    } finally {
      setIsSearchingHubDomain(false);
    }
  };

  const handleHubBuyDomain = async (domainToBuy: string) => {
    if (!selectedTenantForDomain) {
      setHubDomainErr('Selecione qual das suas lojas virtuais receberá este domínio!');
      return;
    }
    setHubDomainErr('');
    setHubDomainSuccess('');
    onAddLog('info', `Iniciando checkout do domínio próprio '${domainToBuy}' para a loja ID '${selectedTenantForDomain}'...`);

    try {
      const response = await fetch('/api/v1/hws/domains/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantForDomain, domain: domainToBuy })
      });
      const data = await response.json();
      if (data.success) {
        if (data.url) {
          onAddLog('success', `[Stripe Express] Redirecionando para checkout seguro de domínio próprio...`);
          window.location.href = data.url;
          return;
        }
        setHubDomainSuccess(`Excelente! Domínio próprio '${domainToBuy}' vinculado com sucesso à loja.`);
        onAddLog('success', `[Cartório Digital Bluewhite] Registrado o domínio próprio '${domainToBuy}' sobre a jurisdição do HWS.`);
        setHubDomainResult(null);
        setHubDomainSearch('');
        setSelectedTenantForDomain('');
        await onRefreshTenants();
      } else {
        setHubDomainErr(data.error || 'Falha ao processar aquisição.');
      }
    } catch (err) {
      console.error(err);
      setHubDomainErr('Erro nas comunicações do gateway.');
    }
  };

  // User Panel
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showTermos, setShowTermos] = useState(false);
  const [showPrivacidade, setShowPrivacidade] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Form states for Renting Space
  const [storeName, setStoreName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [storeTheme, setStoreTheme] = useState<'light' | 'dark' | 'cyberpunk'>('light');
  const [storeTagline, setStoreTagline] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [accentColor, setAccentColor] = useState('#10b981'); // Emerald standard
  
  // Custom products inside renting form
  const [prod1Name, setProd1Name] = useState('');
  const [prod1Price, setProd1Price] = useState('');
  const [prod1Desc, setProd1Desc] = useState('');

  const [prod2Name, setProd2Name] = useState('');
  const [prod2Price, setProd2Price] = useState('');
  const [prod2Desc, setProd2Desc] = useState('');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered store listing
  const stores = tenants.filter(t => t.type === 'store').filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          store.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          store.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = themeFilter === 'all' || store.theme === themeFilter;
    return matchesSearch && matchesTheme;
  });

  // Calculate stats
  const totalStoresCount = tenants.filter(t => t.type === 'store').length;
  const cyberpunkCount = tenants.filter(t => t.theme === 'cyberpunk').length;
  const darkCount = tenants.filter(t => t.theme === 'dark').length;
  const lightCount = tenants.filter(t => t.theme === 'light').length;

  // Handle subdomain auto-generation from store name
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    // Slugify to help matching the subdomain recommendation
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    setStoreId(slug);
  };

  // Submits renting agreement creation inside database
  const handleRentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!storeName || !storeId) {
      setFormError('Nome da Loja e o Identificador de Subdomínio são campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    onAddLog('info', `Iniciando contrato de aluguel: Verificando disponibilidade de '${storeId}.hws.com'...`);

    // Compile dynamic initial products
    const initialProducts: any[] = [];
    if (prod1Name && prod1Price) {
      initialProducts.push({
        id: 1,
        name: prod1Name,
        price: prod1Price.includes('MT') ? prod1Price : `${prod1Price} MT`,
        description: prod1Desc || 'Alta qualidade garantida no selo HWS.',
        category: 'Destaques'
      });
    }
    if (prod2Name && prod2Price) {
      initialProducts.push({
        id: 2,
        name: prod2Name,
        price: prod2Price.includes('MT') ? prod2Price : `${prod2Price} MT`,
        description: prod2Desc || 'Praticidade e elegância selecionadas.',
        category: 'Exclusivos'
      });
    }

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          id: storeId,
          theme: storeTheme,
          description: storeDesc,
          tagline: storeTagline,
          accentColor,
          products: initialProducts
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro desconhecido ao registrar inquilino.');
      }

      onAddLog('success', `Contrato assinado! Subdomínio registrado: ${data.tenant.domain}.`);
      onAddLog('success', `Estacionamento virtual indexado com ${initialProducts.length} produtos.`);
      
      // Reset form options
      setStoreName('');
      setStoreId('');
      setStoreTheme('light');
      setStoreTagline('');
      setStoreDesc('');
      setProd1Name('');
      setProd1Price('');
      setProd1Desc('');
      setProd2Name('');
      setProd2Price('');
      setProd2Desc('');
      setAccentColor('#10b981');
      
      setShowRentingModal(false);
      await onRefreshTenants();
      
      // Auto take to the newly rented shop for complete wow factor!
      onAddLog('info', `Redirecionando automaticamente para a recém-criada ${data.tenant.name}...`);
      onSwitchTenant(data.tenant.id);

    } catch (err: any) {
      setFormError(err.message || 'Falha de comunicação com o servidor.');
      onAddLog('warning', `Transação recusada: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">

      {/* Welcome Banner for first-time visitors */}
      <WelcomeBanner />

      {/* Immersive Landing Hero with animated background */}
      <div className="relative overflow-hidden py-24 px-4 border-b border-slate-900"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #0f172a 60%, #020617 100%)"
        }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: "6s" }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: "8s", animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -top-10 -right-10 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234f46e5' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px"
          }}
        ></div>

        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs px-3.5 py-1.5 rounded-full font-semibold tracking-wide">
            <Sparkles size={12} className="text-indigo-400 animate-pulse" />
            VANGUARD MULTI-TENANT ARCHITECTURE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold font-display tracking-tight text-white max-w-4xl mx-auto leading-tight md:leading-tight">
            Hub World Shopping
          </h1>
          
          <p className="text-slate-350 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-sans">
            O ponto de encontro do comércio mundial. Gerencie, alugue, explore e integre múltiplas lojas virtuais independentes sob um mesmo ecossistema inteligente de subdomínios.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setShowRentingModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle size={18} />
              <span>Contratar Loja (Alugar Espaço)</span>
            </button>
            <button
              onClick={() => setShowUserPanel(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <User2 size={18} />
              <span>Painel do Utilizador</span>
            </button>
            <a 
              href="#corredores"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-100 font-semibold rounded-xl border border-slate-800 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Compass size={17} />
              <span>Explorar Corredores</span>
            </a>
          </div>
        </div>
      </div>

      {/* Stats Quick View Bar */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 grid grid-cols-2 md:grid-cols-4 gap-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-950/60 text-indigo-450 border border-indigo-500/20 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Teses de Lojas</div>
              <div className="text-lg font-extrabold text-white">{totalStoresCount} Ativas</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-950/60 text-amber-450 border border-amber-500/20 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Moeda do Portal</div>
              <div className="text-lg font-extrabold text-white">Metical (MT)</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-950/60 text-cyan-455 border border-cyan-500/20 rounded-xl">
              <Compass size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Subdomínios HWS</div>
              <div className="text-lg font-extrabold text-white">Automáticos</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/60 text-emerald-450 border border-emerald-500/20 rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">In-Memory Database</div>
              <div className="text-lg font-extrabold text-emerald-400">Conectado (Live)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 🛠️ CENTRAL DE OPERAÇÕES BRANCO-AZUL (Bluewhite Corporation Lda. ERP) */}
      <div className="max-w-7xl mx-auto px-4 mt-12 animate-in fade-in slide-in-from-bottom-5 duration-350">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900/40 border border-slate-900 p-6 md:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-400 pointer-events-none">
            <Landmark size={240} strokeWidth={0.5} />
          </div>

          <div className="lg:col-span-12 border-b border-indigo-950/40 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded inline-flex items-center gap-1.5 font-bold">
                  🛡️ CENTRAL INTEGRADA DE CONTROLE E AUDITORIA FISCAL
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight font-display text-white">
                  Bluewhite Corporation ERP & Registrar Gateway
                </h2>
                <p className="text-xs text-slate-450 leading-normal max-w-2xl">
                  Módulo de faturamento corporativo consolidado, provisões fiscais de IVA (16%), saldo em tesouraria sob proteção EULA e roteador de DNS para as lojas do ecossistema HWS.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenControlSpace}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl text-xs flex items-center gap-1.5 font-bold border border-indigo-500/30 cursor-pointer transition-all"
                >
                  🚀 Control Space
                </button>
                <button
                  onClick={fetchAdminStats}
                  disabled={isLoadingAdmin}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 font-mono border border-slate-850 cursor-pointer transition-colors"
                >
                  <RefreshCw size={13} className={isLoadingAdmin ? "animate-spin" : ""} />
                  <span>Atualizar Livro Fiscal</span>
                </button>
              </div>
            </div>
          </div>

          {/* 📊 PAINEL DE CONTROLE DO ADMINISTRADOR (Auditoria Master) */}
          <div className="lg:col-span-6 space-y-6">
            <h3 className="text-sm font-bold tracking-wider font-mono uppercase text-slate-400 flex items-center gap-2">
              <BarChart3 size={15} className="text-indigo-400 animate-pulse" />
              Livro Contábil & Split de Pagamento (MZN)
            </h3>

            {adminStats ? (
              <div className="space-y-5">
                {/* Métricas Master em Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-855 space-y-1 shadow-sm">
                    <span className="text-[9px] font-mono uppercase text-slate-500 font-bold block">Contas Bancárias (A Validar):</span>
                    <div className="text-base font-extrabold text-indigo-450 font-mono">
                      {adminStats.saude_financeira_corporacao.saldo_bancario_a_validar}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-855 space-y-1 shadow-sm">
                    <span className="text-[9px] font-mono uppercase text-slate-500 font-bold block">Faturamento (Comissões):</span>
                    <div className="text-base font-extrabold text-emerald-400 font-mono">
                      {adminStats.saude_financeira_corporacao.lucro_puro_por_comissao}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-855 space-y-1 shadow-sm">
                    <span className="text-[9px] font-mono uppercase text-slate-500 font-bold block">Reserva IVA (16%):</span>
                    <div className="text-base font-extrabold text-amber-500 font-mono">
                      {adminStats.saude_financeira_corporacao.impostos_iva_acumulados}
                    </div>
                  </div>
                </div>

                {/* Tabela de Lojistas com Controle Administrativo Direto */}
                <div className="bg-slate-950 rounded-2xl border border-slate-855 overflow-hidden text-xs shadow-inner">
                  <div className="bg-slate-900/70 px-4 py-3 border-b border-slate-855 flex items-center justify-between font-mono text-[10px] text-slate-500 font-bold">
                    <span>LISTA DE LOJAS EM CONFORMIDADE</span>
                    <span>MEDIDAS LEGAIS</span>
                  </div>
                  
                  <div className="divide-y divide-slate-855/80 max-h-[180px] overflow-y-auto">
                    {adminStats.diretorio_de_lojas.map((loja: any) => {
                      const isBloqueada = loja.status === 'SUSPENDED';
                      return (
                        <div key={loja.id} className="px-4 py-3.5 flex items-center justify-between gap-4">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-200 truncate max-w-[150px] font-sans text-xs">{loja.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                isBloqueada ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/15'
                              }`}>
                                {isBloqueada ? 'BLOQUEADA' : 'OPERANDO'}
                              </span>
                            </div>
                            <div className="font-mono text-[9px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>Plano: <strong className="text-slate-400">{loja.plano}</strong></span>
                              <span>•</span>
                              <span>Vendas: <strong className="text-emerald-450 font-bold">{loja.faturamento_acumulado.toLocaleString('pt-PT')} MT</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isBloqueada ? (
                              <button
                                onClick={async () => {
                                  onAddLog('info', `[Auditoria Bluewhite] Registrando comprovativo e liberando licença de '${loja.id}'...`);
                                  onRenewLicense(loja.id);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] uppercase tracking-wider font-extrabold duration-150 transition-colors rounded cursor-pointer"
                              >
                                Ativar
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  onAddLog('warning', `[Medida Administrativa] Caducidade de contrato aplicada na loja de '${loja.id}'...`);
                                  onToggleStatus(loja.id);
                                }}
                                className="px-2.5 py-1 bg-red-700/60 hover:bg-red-600 text-white border border-red-550/25 text-[9px] uppercase tracking-wider font-extrabold duration-150 transition-colors rounded cursor-pointer"
                              >
                                Suspender
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-855/65 leading-relaxed font-semibold">
                  <Receipt size={14} className="text-slate-400 shrink-0" />
                  <span>
                    As auditorias com split automático calculam e liquidam o IVA governamental moçambicano à taxa regulamentar de 16% sobre a prestação de serviços de infraestrutura comercial.
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 bg-slate-950 rounded-2xl border border-slate-855 text-center font-mono text-xs text-slate-500 animate-pulse">
                Sincronizando livro de registros corporativos...
              </div>
            )}
          </div>

          {/* 🌐 REGISTRAR & PESQUISA DE DOMÍNIOS GLOBAIS */}
          <div className="lg:col-span-6 space-y-6 lg:border-l lg:border-indigo-950/15 lg:pl-8">
            <h3 className="text-sm font-bold tracking-wider font-mono uppercase text-slate-400 flex items-center gap-2">
              <Globe size={15} className="text-indigo-400 animate-pulse" />
              Verificação DNS & Registrar de Marcas
            </h3>

            <div className="space-y-4 text-xs">
              <p className="text-slate-450 text-xs leading-normal">
                Efetue buscas do nome de marca da sua empresa, consulte instantaneamente em servidores DNS globais e conecte um domínio exclusivo próprio, desvinculando sua vitrine de <code className="text-indigo-400 font-bold">.hws.com</code>.
              </p>

              {hubDomainErr && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl leading-normal text-xs font-semibold">
                  {hubDomainErr}
                </div>
              )}
              {hubDomainSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-3 rounded-xl leading-normal text-xs font-semibold animate-pulse">
                  {hubDomainSuccess}
                </div>
              )}

              {/* Form de Busca de Domínio no Hub */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hubDomainSearch}
                  onChange={(e) => setHubDomainSearch(e.target.value)}
                  placeholder="Ex: vanguardmoda.com, padariadom.com"
                  className="flex-1 text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl outline-none font-mono focus:border-indigo-500 placeholder:text-slate-600 focus:bg-slate-950"
                />
                <button
                  onClick={handleHubCheckDomain}
                  disabled={isSearchingHubDomain}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Search size={14} className={isSearchingHubDomain ? "animate-spin" : ""} />
                  <span>Pesquisar</span>
                </button>
              </div>

              {/* Resultado de Busca de Domínio no Hub */}
              {hubDomainResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-4 animate-in fade-in duration-100">
                  <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-855">
                    <span className="font-mono text-white font-bold text-xs">{hubDomainResult.dominio}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      hubDomainResult.disponivel 
                        ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-450 border-red-500/20'
                    }`}>
                      {hubDomainResult.disponivel ? 'Disponível' : 'Ocupado'}
                    </span>
                  </div>

                  {hubDomainResult.disponivel ? (
                     <div className="space-y-4 pt-1">
                       <p className="text-[11px] text-slate-400 leading-normal">
                         Este endereço encontra-se livre para alocação. Valor de aquisição fixado pela Bluewhite Corp: <span className="text-emerald-400 font-bold font-mono">1.200 MT/ano</span> (recolhido por split).
                       </p>
                       
                       <div className="space-y-2">
                         <label className="text-[10px] font-semibold text-slate-500 block font-mono uppercase tracking-wider">Vincular este endereço a qual loja cadastrada?</label>
                         <select
                           value={selectedTenantForDomain}
                           onChange={(e) => setSelectedTenantForDomain(e.target.value)}
                           className="w-full bg-slate-900 text-slate-300 text-xs border border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 cursor-pointer"
                         >
                           <option value="">-- Selecione uma loja do shopping --</option>
                           {tenants.filter(t => t.type === 'store' && !t.customDomain).map(t => (
                             <option key={t.id} value={t.id}>{t.name} ({t.domain})</option>
                           ))}
                           {tenants.filter(t => t.type === 'store' && t.customDomain).map(t => (
                             <option key={t.id} value={t.id} disabled>{t.name} (Vinculada em: {t.customDomain})</option>
                           ))}
                         </select>
                       </div>

                       <button
                         onClick={() => handleHubBuyDomain(hubDomainResult.dominio)}
                         type="button"
                         className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center cursor-pointer transition-transform hover:scale-[1.01]"
                       >
                         Assinar Registro & Vincular DNS
                       </button>
                     </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
                        <AlertOctagon size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>Este domínio já é propriedade ativa de outro inquilino no ecossistema do Hub World Shopping.</span>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-850/60 font-mono text-[11px] text-slate-400 leading-normal">
                        Recomendação de Marca do Portal: <span className="text-amber-500 font-mono font-bold block mt-0.5">{hubDomainResult.sugestao}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left column: Corredores, Directory and Filters */}
        <div className="lg:col-span-12 space-y-12">
          
          {/* Corredores Section */}
          <section id="corredores" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">
                  Corredores Virtuais em Destaque
                </h2>
                <p className="text-slate-400 text-sm">
                  Espaços comerciais modelo integrados que demonstram o roteamento dinâmico de temas do HWS.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Corridor A: Vanguard Premium (Moda) */}
              <div className="group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow hover:shadow-xl transition-all flex flex-col justify-between text-slate-100 min-h-[220px]">
                <div className="p-6 space-y-3 relative">
                  <div className="absolute top-5 right-5 text-amber-500/20 group-hover:text-amber-500/30 transition-colors">
                    <ShoppingBag size={80} strokeWidth={1} />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded">
                    ESTILO PREMIUM & LUXO
                  </span>
                  <h3 className="text-xl font-bold font-display group-hover:text-amber-400 transition-colors">
                    Vanguard Moda Premium
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Estilo sofisticado e alta costura expressados em uma interface com o elegante **Dark Royal-Gold Theme** dinâmico do HWS.
                  </p>
                  <div className="text-xs text-slate-400 pt-2 font-mono flex items-center gap-1.5">
                    <Server size={12} className="text-slate-500" />
                    Subdomínio: <span className="text-amber-400">moda.hws.com</span>
                  </div>
                </div>
                <div className="bg-slate-900 border-t border-slate-800/80 px-6 py-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Moeda: Metical Moçambicano</span>
                  <button 
                    onClick={() => onSwitchTenant('moda')}
                    className="text-xs font-semibold text-amber-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Visitar Vitrine</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Corridor B: Gênio Tech Smart (Tecnologia) */}
              <div className="group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow hover:shadow-xl transition-all flex flex-col justify-between text-slate-100 min-h-[220px] cyberpunk-grid">
                <div className="p-6 space-y-3 relative">
                  <div className="absolute top-5 right-5 text-cyan-500/20 group-hover:text-cyan-500/30 transition-colors">
                    <Cpu size={80} strokeWidth={1} />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase bg-cyan-400/10 px-2 py-0.5 rounded">
                    TECNOLOGIA DO AMANHÃ
                  </span>
                  <h3 className="text-xl font-bold font-display group-hover:text-cyan-400 transition-colors">
                    Génio Tech Smart
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Gadgets inteligentes e automação futurista representados no impactante e interativo **Cyberpunk Theme** com neon reativo.
                  </p>
                  <div className="text-xs text-slate-400 pt-2 font-mono flex items-center gap-1.5">
                    <Server size={12} className="text-slate-500" />
                    Subdomínio: <span className="text-cyan-400">tech.hws.com</span>
                  </div>
                </div>
                <div className="bg-slate-900 border-t border-slate-800/80 px-6 py-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Estilo: Neon Cyber</span>
                  <button 
                    onClick={() => onSwitchTenant('tech')}
                    className="text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Fazer Login / Visitar</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Directory Showcase list */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-slate-800/80 pb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">
                  Diretório Geral de Inquilinos HWS
                </h2>
                <p className="text-slate-450 text-sm">
                  Lista completa de espaços contratados no shopping central ou criados sob demanda na memória do servidor.
                </p>
              </div>

              {/* Dynamic Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar lojas..."
                    className="w-48 sm:w-64 pl-3 pr-8 py-2 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-350"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                  className="bg-slate-900 text-slate-300 text-xs rounded-xl border border-slate-800 px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Temas: Todos</option>
                  <option value="light">Estilo Light</option>
                  <option value="dark">Estilo Dark</option>
                  <option value="cyberpunk">Estilo Cyberpunk</option>
                </select>

                <button
                  onClick={() => setShowRentingModal(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center text-xs gap-1.5 font-semibold hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Novo Espaço</span>
                </button>
              </div>
            </div>

            {/* Stores grid cards */}
            {stores.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl py-12 px-4 text-center">
                <AlertCircle className="mx-auto text-slate-500 mb-2" size={28} />
                <h4 className="font-semibold text-slate-400">Nenhuma loja ativa para o filtro selecionado</h4>
                <p className="text-slate-550 text-xs mt-1 max-w-sm mx-auto">
                  Tente alterar seus termos ou clique no botão acima para adicionar um novo inquilino e inaugurar uma nova vitrine!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map(store => {
                  const isSuspended = store.licenseStatus === 'SUSPENDED';
                  return (
                    <div 
                      key={store.id} 
                      className={`bg-slate-900 rounded-3xl border shadow-2xl transition-all flex flex-col justify-between overflow-hidden group/card ${
                        isSuspended 
                          ? 'border-red-950 hover:border-red-500/35 hover:shadow-[0_0_25px_rgba(239,68,68,0.03)]' 
                          : 'border-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.06)]'
                      }`}
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: store.accentColor || '#3b82f6' }}
                          >
                            <ShoppingBag size={18} />
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider shrink-0 ${
                              isSuspended
                                ? 'bg-red-500/15 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {isSuspended ? 'Aluguer Atrasado (Suspenso)' : 'Aluguer Pago'}
                            </span>
                            
                            <span className={`text-[8px] font-mono tracking-widest text-slate-500 uppercase ${
                              store.theme === 'cyberpunk' ? 'text-cyan-400/80' :
                              store.theme === 'dark' ? 'text-amber-500/80' :
                              'text-emerald-400/80'
                            }`}>
                              {store.theme} theme
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold text-white text-base flex items-center gap-1 group-hover/card:text-indigo-400 transition-colors font-display">
                            {store.name}
                          </h4>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <span className="text-slate-500">Host:</span>
                            <span className="text-slate-300 font-semibold">{store.domain}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {store.description}
                        </p>

                        {/* Legal and Lease specification breakdown */}
                        <div className="text-[10px] font-mono bg-slate-950/70 p-3 rounded-2xl border border-slate-850/80 space-y-1.5 text-slate-400">
                          <div className="flex justify-between">
                            <span>ID Proprietário:</span>
                            <span className="text-slate-300">{store.ownerId || "usr_unk"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Nº NUIT Lojista:</span>
                            <span className="text-slate-300">{store.nuitCorporate || "Pendente"}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-850/40 pt-1.5">
                            <span>Aluguer Digital:</span>
                            <span className="text-indigo-400 font-semibold">{store.monthlyRent || "3.500 MT"}/mes</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Próximo Vencimento:</span>
                            <span className={isSuspended ? "text-red-400 font-bold" : "text-emerald-400"}>
                              {isSuspended ? "VENCIDO" : (store.nextPaymentDate || "A regular")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Actions Grid */}
                      <div className="border-t border-slate-850/85 bg-slate-950/45 px-5 py-3.5 flex items-center justify-between gap-3 text-xs">
                        {isSuspended ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <button
                              onClick={() => onRenewLicense(store.id)}
                              type="button"
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold rounded-lg font-mono text-[10px] uppercase tracking-wider text-center cursor-pointer transition-colors"
                            >
                              Pagar Aluguer
                            </button>
                            <button
                              onClick={() => {
                                onAddLog('info', `Simulando resolução local para host: '${store.domain}'...`);
                                onSwitchTenant(store.id);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 cursor-pointer"
                              title="Tentar aceder mesmo assim para verificar bloqueio"
                            >
                              Visitar
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
                              <span>{store.products.length} {store.products.length === 1 ? 'item' : 'items'}</span>
                              <span>•</span>
                              <button
                                onClick={() => onToggleStatus(store.id)}
                                className="text-red-400/70 hover:text-red-400"
                                title="Suspender temporariamente para teste legal"
                              >
                                Suspender
                              </button>
                            </div>
                            
                            <button 
                              onClick={() => onSwitchTenant(store.id)}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors group-hover/card:translate-x-0.5 cursor-pointer text-xs"
                            >
                              <span>Visitar Loja</span>
                              <ChevronRight size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Educational Multi-tenancy explanation block */}
          <section className="bg-slate-900 text-slate-100 rounded-xl p-6 md:p-8 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-100 pointer-events-none">
              <Server size={180} strokeWidth={1} />
            </div>
            
            <div className="max-w-3xl space-y-4">
              <span className="text-xs font-mono font-semibold tracking-widest text-sky-400 uppercase bg-sky-950 px-2.5 py-1 rounded inline-flex items-center gap-1">
                <Zap size={12} className="text-sky-400" /> RESUMO TÉCNICO
              </span>
              <h3 className="text-xl md:text-2xl font-bold font-display text-white">
                Como essa arquitetura garante o pilar técnico multi-tenant?
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Cada vez que uma requisição chega ao nosso servidor Node.js Express, ela passa por um middleware dinâmico. 
                Ao invés de criarmos instâncias de servidores separadas para cada lojista (o que seria caro e ineficiente), respondemos dinamicamente de acordo com o subdomínio correspondente à requisição:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-semibold">1. Captura de Entrada (DNS / Host)</span>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    A requisição envia <code className="text-white">req.headers.host</code>. O app verifica se o host corresponde a um subdomínio em nosso arquivo hosts simulado.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-semibold">2. Resolução Dinâmica de Dados</span>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    A loja correspondente é extraída do banco e injetada na renderização. Temas, produtos e moedas mudam instantaneamente sem o lojista manter infraestrutura própria.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* BLUEWHITE CORPORATION LDA. LEGAL & COMPLIANCE BLOCK */}
          <section className="bg-slate-950 border border-slate-850 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-850/80 pb-5">
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded inline-flex items-center gap-1">
                ⚖️ ENQUADRAMENTO JURÍDICO & COMPLIANCE COMERCIAL
              </span>
              <h3 className="text-xl md:text-2xl font-extrabold tracking-tight font-display text-white mt-3">
                Operação Comercial Legítima — Bluewhite Corporation Lda.
              </h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1.5">
                O Hub World Shopping (HWS) opera sob licença comercial da **Bluewhite Corporation Lda.**, assegurando total sustentabilidade contratual, fiscal e intelectual.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Compliance card 1 */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850/80 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                  Contrato de Locação Digital (Aluguer)
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Os lojistas não adquirem e nem possuem o código-fonte principal da plataforma. Eles celebram um **Contrato de Locação Virtual de Infraestrutura Tecnológica**. O não pagamento do aluguer mensal na data estipulada acarreta na alteração automática de estado para <code className="text-red-400">licenseStatus: "SUSPENDED"</code>, retirando os produtos do ar e suspendendo o roteamento DNS em ambiente operacional.
                </p>
              </div>

              {/* Compliance card 2 */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850/80 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                  Mitigação de Responsabilidades Legais
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  A **Bluewhite Corporation Lda.** assegura e garante pura e exclusivamente a disponibilidade da infraestrutura do shopping digital. A responsabilidade legal exclusiva por produtos comercializados, emissão de faturas directas aos clientes finais, garantias das mercadorias, expedições, despachos e conformidade fiscal cabe a 100% ao lojista inquilino.
                </p>
              </div>

              {/* Compliance card 3 */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850/80 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                  EULA & Proteção de Dados (GDPR / Moçambique)
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Conforme preceituado na **Lei de Proteção de Dados de Moçambique** e directivas do GDPR, toda a infraestrutura HWS é blindada. Ao aderir à modalidade do EULA ("Acordo de Licenciamento de Usuário Final"), o lojista recebe uma chave de acesso às instâncias isoladas, enquanto o core dos algoritmos do Hub e de domínio permanecem propriedade intelectual protegida e registrada junto ao **IPI (Instituto da Propriedade Industrial)**.
                </p>
              </div>

              {/* Compliance card 4 */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850/80 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                  Split de Pagamento & IVA Moçambicano
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O faturamento mensal do aluguer e as taxas de transações passam por split automatizado. O sistema retém em tempo real a comissão acordada para a Bluewhite Corporation Lda., calcula os **16% de IVA** sobre a taxa de prestação de serviços e instrui a API a emitir a fatura eletrónica correspondente com chancela fiscal regulamentada.
                </p>
              </div>

            </div>

            {/* Entity Footer Details */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 max-w-none text-center font-mono text-[10px] text-slate-500 space-y-1">
              <div>Plataforma Multi-Tenant Desenvolvida e Operada por: <strong>Bluewhite Corporation Lda.</strong></div>
              <div>Entidade Legal de Direito Privado Moçambicano | Registo IPI: HWS-HWS / NUIT Gestora: 100234149</div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px]">
                <button onClick={() => setShowTermos(true)} className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer">Termos de Uso</button>
                <span className="text-slate-600">·</span>
                <button onClick={() => setShowPrivacidade(true)} className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer">Política de Privacidade</button>
                <span className="text-slate-600">·</span>
                <button onClick={() => setShowDisclaimer(true)} className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer">Isenção de Responsabilidade</button>
              </div>
              <div className="pt-1 text-indigo-400">Licenciamento de Software: Proprietary Commercial EULA (Subdomínios Dinâmicos)</div>
              <div className="pt-1 text-[9px] text-slate-600">© {new Date().getFullYear()} Bluewhite Corporation Lda. — Moçambique. Todos os direitos reservados.</div>
            </div>
          </section>

        </div>
      </div>

      {/* User Panel Modal */}
      {showUserPanel && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="w-full max-w-lg relative">
            <button
              onClick={() => setShowUserPanel(false)}
              className="absolute -top-2 -right-2 text-slate-400 hover:text-white bg-[#131a26] border border-[#1e293b] rounded-full p-1.5 z-10 cursor-pointer"
            >
              <X size={14} />
            </button>
            <UserPanel staticMode={staticMode ?? false} />
          </div>
        </div>
      )}

      {/* Contract/Renting Virtual Space Dialog Modal */}
      {showRentingModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 text-slate-100 w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Building2 className="text-indigo-400" size={18} />
                <h3 className="font-bold font-display text-base">Alugar Espaço Virtual / Registrar Loja HWS</h3>
              </div>
              <button 
                onClick={() => setShowRentingModal(false)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-full hover:bg-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRentSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {formError && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs p-3 rounded-xl flex items-start gap-2 animate-pulse">
                  <X size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Erro na aprovação:</span> {formError}
                  </div>
                </div>
              )}

              {/* Subdomain configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-slate-455 block font-mono">Nome da Loja Virtual *</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={handleStoreNameChange}
                    placeholder="Ex: Gourmet Pizza Shop"
                    className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all font-sans placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-slate-455 block font-mono">Endereço de Subdomínio HWS *</label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl focus-within:border-indigo-500 overflow-hidden transition-all">
                    <input
                      type="text"
                      required
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      placeholder="gourmet"
                      className="flex-1 text-xs p-2.5 bg-transparent text-slate-100 outline-none font-mono placeholder:text-slate-600"
                    />
                    <span className="text-xs text-slate-500 font-mono bg-slate-900 border-l border-slate-800 px-3 py-2.5">
                      .hws.com
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Somente letras minúsculas e números sem espaços.</p>
                </div>
              </div>

              {/* Visual custom theme selection and Tagline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-455 block font-mono">Escolher Tema Visual da Loja</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'light', label: 'Light Clean' },
                      { value: 'dark', label: 'Dark Royal' },
                      { value: 'cyberpunk', label: 'Cyber Neon' }
                    ].map(themeOpt => (
                      <button
                        key={themeOpt.value}
                        type="button"
                        onClick={() => setStoreTheme(themeOpt.value as any)}
                        className={`text-[11px] p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                          storeTheme === themeOpt.value
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        {themeOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-445 block font-mono">Cor de Destaque Visual (Accent)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-9 rounded-xl border border-slate-800 cursor-pointer p-0.5 bg-slate-950"
                    />
                    <input 
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#10b981"
                      className="flex-1 text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl outline-none font-mono text-center placeholder:text-slate-600 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-455 block font-mono">Lema ou Slogan da Loja</label>
                <input
                  type="text"
                  value={storeTagline}
                  onChange={(e) => setStoreTagline(e.target.value)}
                  placeholder="Ex: O autêntico sabor das massas napolitanas"
                  className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all font-sans placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-455 block font-mono">Descrição do Espaço Comercial</label>
                <textarea
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  placeholder="Descreva o que sua loja oferece, quais são os diferenciais e a linha de negócios da sua marca virtual selecionada..."
                  className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 h-20 resize-none transition-all font-sans placeholder:text-slate-600"
                />
              </div>

              {/* Products Setup */}
              <div className="space-y-3 pt-4 border-t border-slate-850">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <PlusCircle size={14} className="text-indigo-400" /> Cadastrar Produtos Iniciais (Opcional)
                </h4>
                <p className="text-[10px] text-slate-500">Introduza os detalhes de até dois produtos para inaugurar a vitrine com mercadorias reais do seu estoque.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product 1 */}
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                    <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">PRODUTO MODELO #01</span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={prod1Name}
                        onChange={(e) => setProd1Name(e.target.value)}
                        placeholder="Nome do produto"
                        className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        value={prod1Price}
                        onChange={(e) => setProd1Price(e.target.value)}
                        placeholder="Preço (Ex: 850 MT)"
                        className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg outline-none font-mono focus:border-indigo-500 placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        value={prod1Desc}
                        onChange={(e) => setProd1Desc(e.target.value)}
                        placeholder="Breve descrição do item"
                        className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Product 2 */}
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                    <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">PRODUTO MODELO #02</span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={prod2Name}
                        onChange={(e) => setProd2Name(e.target.value)}
                        placeholder="Nome do produto"
                        className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        value={prod2Price}
                        onChange={(e) => setProd2Price(e.target.value)}
                        placeholder="Preço (Ex: 1.200 MT)"
                        className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg outline-none font-mono focus:border-indigo-500 placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        value={prod2Desc}
                        onChange={(e) => setProd2Desc(e.target.value)}
                        placeholder="Breve descrição do item"
                        className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-855">
                <button
                  type="button"
                  onClick={() => setShowRentingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar contrato
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.25)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Building2 size={14} />
                  <span>{isSubmitting ? 'Verificando DNS...' : 'Assinar Contrato & Ativar'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Legal Modals */}
      {showTermos && <TermosDeUso onClose={() => setShowTermos(false)} />}
      {showPrivacidade && <PoliticaPrivacidade onClose={() => setShowPrivacidade(false)} />}
      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}

    </div>
  );
}
