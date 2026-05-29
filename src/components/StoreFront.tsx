/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  CreditCard, 
  PlusCircle, 
  Layers, 
  DollarSign, 
  BadgeAlert, 
  ShoppingBagIcon, 
  PlusSquare,
  Gift,
  CheckCircle2,
  X,
  Globe,
  Search,
  Award,
  Landmark,
  ShieldCheck,
  Milestone
} from 'lucide-react';
import { Tenant, Product } from '../types';

interface StoreFrontProps {
  tenant: Tenant;
  onBackToHub: () => void;
  onAddLog: (type: 'info' | 'success' | 'warning', message: string) => void;
  onRefreshTenants: () => Promise<void>;
  onAddProduct: (tenantId: string, name: string, price: string, desc: string, category: string) => Promise<boolean>;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StoreFront({
  tenant,
  onBackToHub,
  onAddLog,
  onRefreshTenants,
  onAddProduct
}: StoreFrontProps) {
  // Navigation filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  
  // Custom Domain & Auditing states
  const [domainSearchQuery, setDomainSearchQuery] = useState('');
  const [domainResult, setDomainResult] = useState<any>(null);
  const [isSearchingDomain, setIsSearchingDomain] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [domainSuccess, setDomainSuccess] = useState('');
  
  // Inventory Manager Modal state
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCat, setNewProductCat] = useState('Geral');
  
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Group categories
  const categories = Array.from(new Set(tenant.products.map(p => p.category || 'Geral')));

  // Filter products by category
  const filteredProducts = selectedCategory === 'all' 
    ? tenant.products 
    : tenant.products.filter(p => p.category === selectedCategory);

  // Add to cart state
  const handleAddToCart = (product: Product) => {
    onAddLog('info', `Item adicionado ao carrinho de ${tenant.name}: ${product.name} (${product.price})`);
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: number, dlta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + dlta;
          return newQty <= 0 ? null : { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Convert "4.500 MT" string to parsed number for subtotals
  const parsePrice = (priceStr: string): number => {
    const raw = priceStr.replace(/[^\d]/g, '');
    return parseInt(raw, 10) || 0;
  };

  const cartTotal = cart.reduce((tot, item) => tot + (parsePrice(item.product.price) * item.quantity), 0);

  const formatPrice = (value: number): string => {
    return value.toLocaleString('pt-MZ') + ' MT';
  };

  const [isStripeCheckingOut, setIsStripeCheckingOut] = useState(false);

  // Stripe Online Gate session create
  const handleStripeCheckoutSubmit = async () => {
    if (cart.length === 0) return;
    setIsStripeCheckingOut(true);
    onAddLog('info', `[Stripe Express] Criando sessão de pagamento para o carrinho de compras de ${tenant.name}...`);
    try {
      const response = await fetch('/api/v1/hws/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cart',
          tenantId: tenant.id,
          amount: cartTotal,
          returnUrl: window.location.origin
        })
      });
      const data = await response.json();
      if (data.success && data.url) {
        onAddLog('success', '[Stripe Express] Redirecionando para checkout seguro de cartão de crédito...');
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Falha ao processar checkout Stripe.');
      }
    } catch (err: any) {
      console.error(err);
      onAddLog('warning', `Erro Stripe Checkout: ${err.message || err}`);
    } finally {
      setIsStripeCheckingOut(false);
    }
  };

  // Triggers order summary and dynamic invoice clearance
  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;
    const invId = 'HWS-' + Math.floor(Math.random() * 900000 + 100000);
    setInvoiceId(invId);
    onAddLog('success', `Pedido finalizado com sucesso na loja ${tenant.name}! Fatura gerada: ${invId}`);
    onAddLog('success', `Processamento via Host Intercetado: Reservado com sucesso para domínio ${tenant.domain}.`);
    setShowCheckoutModal(true);
  };

  const handleClearCartAndClose = () => {
    setCart([]);
    setShowCheckoutModal(false);
  };

  // Handles adding new inventory item live in memory
  const handleAddNewProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newProductName || !newProductPrice) {
      setAddError('Nome do Produto e Preço são obrigatórios.');
      return;
    }

    setIsAdding(true);
    onAddLog('info', `Indexando novo produto para ${tenant.name}...`);

    try {
      const success = await onAddProduct(
        tenant.id,
        newProductName,
        newProductPrice,
        newProductDesc,
        newProductCat
      );

      if (success) {
        onAddLog('success', `Catálogo atualizado! Produto '${newProductName}' indexado em '${tenant.domain}'.`);
        setNewProductName('');
        setNewProductPrice('');
        setNewProductDesc('');
        setNewProductCat('Geral');
        setShowInventoryModal(false);
        await onRefreshTenants();
      } else {
        throw new Error('Falha ao gravar produto no servidor multi-tenant.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Erro de comunicação.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!domainSearchQuery.trim()) {
      setDomainError('Por favor, indique o domínio a pesquisar.');
      return;
    }
    
    // Normaliza para verificar formato simples
    let cleanDomain = domainSearchQuery.toLowerCase().trim().replace(/\s+/g, '');
    if (!cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.com`;
    }
    
    setDomainError('');
    setDomainSuccess('');
    setIsSearchingDomain(true);
    setDomainResult(null);
    onAddLog('info', `Consultando disponibilidade de domínio próprio: '${cleanDomain}' com o Registrar DNS HWS...`);

    try {
      const response = await fetch(`/api/v1/hws/domains/check?q=${encodeURIComponent(cleanDomain)}`);
      const data = await response.json();
      if (response.ok) {
        setDomainResult(data);
        if (data.disponivel) {
          onAddLog('info', `Domínio '${data.dominio}' está LIVRE para contratação jurídica por ${data.precificacao.preco_anual} MT.`);
        } else {
          onAddLog('warning', `Domínio '${data.dominio}' encontra-se OCUPADO. Sugestão recomendada: '${data.sugestao}'`);
        }
      } else {
        setDomainError(data.error || 'Erro ao pesquisar domínio.');
      }
    } catch (err) {
      console.error(err);
      setDomainError('Erro ao conectar ao Registrar DNS.');
    } finally {
      setIsSearchingDomain(false);
    }
  };

  const handleBuyDomain = async (domainToBuy: string) => {
    setDomainError('');
    setDomainSuccess('');
    onAddLog('info', `Iniciando checkout de compra de domínio próprio: '${domainToBuy}' por 1.200 MT...`);

    try {
      const response = await fetch('/api/v1/hws/domains/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, domain: domainToBuy })
      });
      const data = await response.json();
      if (data.success) {
        if (data.url) {
          onAddLog('success', `[Stripe Express] Redirecionando para checkout seguro de domínio próprio...`);
          window.location.href = data.url;
          return;
        }
        setDomainSuccess(`Domínio próprio '${domainToBuy}' comprado e mapeado com sucesso!`);
        onAddLog('success', `[Cartório Digital Bluewhite] Domínio '${domainToBuy}' devidamente associado ao NUIT ${tenant.nuitCorporate || 'N/A'}.`);
        onAddLog('success', `[Split Financeiro] 1.200 MT recolhido. Imposto de 16% IVA calculado sobre comissões.`);
        setDomainResult(null);
        setDomainSearchQuery('');
        
        // Refresh local store frontend view state by pulling tenants again
        await onRefreshTenants();
      } else {
        setDomainError(data.error || 'Erro ao registrar domínio próprio.');
      }
    } catch (err) {
      console.error(err);
      setDomainError('Erro ao concluir compra de domínio.');
    }
  };

  // Theme-specific styles definition helper
  const getThemeClasses = () => {
    switch (tenant.theme) {
      case 'dark':
        return {
          bg: 'bg-zinc-950 text-zinc-100',
          card: 'bg-zinc-900 border-zinc-800 text-zinc-100',
          accentBg: 'bg-amber-500 text-black hover:bg-amber-400',
          accentText: 'text-amber-400',
          accentBorder: 'border-amber-600/30 group-hover:border-amber-400',
          contrastBadge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          inputBg: 'bg-zinc-900 text-zinc-100 border-zinc-800 focus:border-amber-500',
          buttonStyles: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800',
          headerBg: 'bg-zinc-900/90 border-b border-zinc-800/80'
        };
      case 'cyberpunk':
        return {
          bg: 'bg-slate-950 text-cyan-50 cyberpunk-grid',
          card: 'bg-slate-900/80 border-cyan-500/20 text-cyan-200 hover:border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.02)]',
          accentBg: 'bg-cyan-500 text-black font-semibold hover:bg-cyan-400 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
          accentText: 'text-cyan-400',
          accentBorder: 'border-cyan-500/20 group-hover:border-cyan-400',
          contrastBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-mono text-[10px]',
          inputBg: 'bg-slate-900 text-cyan-100 border-cyan-500/20 focus:border-cyan-400',
          buttonStyles: 'bg-slate-900 border-cyan-500/20 text-cyan-400 hover:bg-sky-950 hover:text-cyan-300',
          headerBg: 'bg-slate-900/95 border-b border-cyan-500/10'
        };
      case 'light':
      default:
        return {
          bg: 'bg-slate-50 text-slate-800',
          card: 'bg-white border-slate-200 text-slate-800',
          accentBg: 'bg-emerald-600 text-white hover:bg-emerald-500',
          accentText: 'text-emerald-600',
          accentBorder: 'border-emerald-600/20 group-hover:border-emerald-500',
          contrastBadge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          inputBg: 'bg-slate-100 text-slate-800 border-slate-200 focus:border-emerald-500 focus:bg-white',
          buttonStyles: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
          headerBg: 'bg-white/90 border-b border-slate-200/80'
        };
    }
  };

  const currentStyle = getThemeClasses();

  return (
    <div className={`min-h-screen pb-20 transition-all duration-200 ${currentStyle.bg}`}>
      
      {/* Store Header bar */}
      <header className={`sticky top-[45px] z-40 backdrop-blur transition-all ${currentStyle.headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          
          <button
            onClick={onBackToHub}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer outline-none transition-all ${currentStyle.buttonStyles}`}
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Shopping</span>
          </button>

          <div className="text-center flex-1 hidden md:block">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
              Inquilino Ativo HWS: {tenant.domain}
            </span>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Store Config Button (Adds products to inventory live!) */}
            <button
              onClick={() => setShowInventoryModal(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer outline-none transition-all border ${
                tenant.theme === 'cyberpunk' 
                  ? 'border-purple-500 text-purple-400 hover:bg-purple-950 hover:text-purple-300' 
                  : tenant.theme === 'dark'
                  ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PlusSquare size={14} />
              <span>Gerir Catálogo</span>
            </button>
            
          </div>

        </div>
      </header>

      {/* Hero Showcase Display of Store Banner */}
      <div className={`relative py-14 px-4 border-b border-slate-800/10 overflow-hidden text-center`}>
        <div className="max-w-3xl mx-auto space-y-3 relative z-10">
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-full border ${currentStyle.contrastBadge}`}>
            <Layers size={11} /> 
            PRODUTOS DISPONÍVEIS COM ENTREGA EM MOÇAMBIQUE
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight">
            {tenant.name}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-sans max-w-xl mx-auto">
            {tenant.description}
          </p>
          <div className={`text-xs italic ${currentStyle.accentText}`}>
            &ldquo;{tenant.tagline || 'Excelência sem limites'}&rdquo;
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left catalog grids (8 columns on large screens) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Category Filter Pills bar */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? currentStyle.accentBg
                    : currentStyle.buttonStyles + ' border'
                }`}
              >
                Todos ({tenant.products.length})
              </button>
              
              {categories.map(cat => {
                const count = tenant.products.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? currentStyle.accentBg
                        : currentStyle.buttonStyles + ' border'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Catalog grid */}
          {filteredProducts.length === 0 ? (
            <div className={`border p-12 text-center rounded-xl ${currentStyle.card}`}>
              <ShoppingBagIcon className="mx-auto text-slate-400 mb-2" size={28} />
              <h4 className="font-semibold text-lg">Sem produtos disponíveis nesta categoria</h4>
              <p className="text-slate-400 text-xs mt-1">
                Utilize o botão &quot;Gerir Catálogo&quot; para reabastecer a vitrine com novos lotes agora mesmo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredProducts.map(product => {
                const accentStyle = tenant.theme === 'cyberpunk' 
                  ? { borderTop: `4px solid ${tenant.accentColor || '#06b6d4'}` } 
                  : {};

                return (
                  <div 
                    key={product.id} 
                    style={accentStyle}
                    className={`border rounded-xl p-5 flex flex-col justify-between transition-all group ${currentStyle.card}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[9px] uppercase font-mono tracking-widest px-2 py-0.5 rounded border font-bold ${currentStyle.contrastBadge}`}>
                          {product.category || 'Destaque'}
                        </span>
                        <div className="text-slate-500 font-mono text-[10px]">#00{product.id}</div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-base tracking-tight group-hover:text-blue-500 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {product.description || 'Garantia de procedência original fornecida pelo ecossistema HWS.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-mono text-slate-400">Preço Especial</div>
                        <div className={`text-base font-extrabold font-mono ${currentStyle.accentText}`}>
                          {product.price}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`p-2 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all hover:scale-[1.02] cursor-pointer outline-none ${currentStyle.accentBg}`}
                      >
                        <Plus size={14} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right static dashboard sidebars (4 columns - Cart summary & info) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Shopping cart widget */}
          <div className={`border rounded-xl p-5 shadow-sm space-y-4 font-sans ${currentStyle.card}`}>
            <h3 className="font-bold font-display text-base flex items-center gap-1.5">
              <ShoppingBag size={18} className={currentStyle.accentText} />
              <span>Carrinho de Compras</span>
            </h3>

            {cart.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <ShoppingBagIcon className="mx-auto text-slate-400/50" size={36} />
                <p className="text-xs text-slate-400 leading-normal max-w-[200px] mx-auto">
                  Seu carrinho está vazio. Adicione produtos ao lado para simular o faturamento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Cart items list */}
                <div className="divide-y divide-slate-800/10 pr-1 max-h-[180px] overflow-y-auto space-y-2.5">
                  {cart.map(item => (
                    <div key={item.product.id} className="pt-2.5 flex items-start justify-between gap-2.5 text-xs">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="font-semibold text-slate-200 truncate">{item.product.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {item.product.price} un.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-850/50 px-1.5 py-1.5 rounded border border-slate-800/10 scale-90">
                        <button 
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="w-4 h-4 rounded hover:bg-slate-800 flex items-center justify-center font-bold text-slate-300 pointer-cursor"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-slate-200">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="w-4 h-4 rounded hover:bg-slate-800 flex items-center justify-center font-bold text-slate-300 pointer-cursor"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="p-1 px-1.5 text-red-500/80 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors self-center scale-90"
                        title="Remover do carrinho"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Shopping balance grid */}
                <div className="pt-3 border-t border-slate-800/10 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Inquilino DNS:</span>
                    <span className="text-slate-350">{tenant.domain}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxa HWS Hub:</span>
                    <span className="text-emerald-400">Isento (SANDBOX)</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-dashed border-slate-800/10">
                    <span>Total Pedido:</span>
                    <span className={currentStyle.accentText}>{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleStripeCheckoutSubmit}
                  disabled={isStripeCheckingOut}
                  className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-all hover:scale-[1.01] shadow-md ${currentStyle.accentBg}`}
                >
                  <CreditCard size={14} />
                  <span>{isStripeCheckingOut ? 'Conectando...' : 'Pagar via Cartão de Crédito (Stripe)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutSubmit}
                  className="w-full py-2 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900 rounded-lg flex items-center justify-center gap-2 text-[10px] font-semibold cursor-pointer transition-all mt-1.5"
                >
                  <span>Simular Pagamento Manual (Moçambique)</span>
                </button>

              </div>
            )}
          </div>

          {/* CARD DE GESTÃO, FATURAMENTO E LICENCIAMENTO (BLUEWHITE COMPLIANCE) */}
          <div className={`border rounded-xl p-5 shadow-sm space-y-4 ${currentStyle.card}`}>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 border-b border-slate-800/10 pb-2">
              <Landmark size={14} className={currentStyle.accentText} />
              <span>Gestão Comercial & Fiscal</span>
            </h4>
            
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nível do Plano:</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  tenant.plan === 'Enterprise' ? 'bg-indigo-500/10 text-indigo-400' :
                  tenant.plan === 'Pro' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-500/10 text-slate-400'
                }`}>
                  {tenant.plan || 'Starter'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NUIT Contratual:</span>
                <span className="text-slate-300 font-semibold">{tenant.nuitCorporate || "Pendente"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aluguer Mensal:</span>
                <span className="text-slate-300 font-semibold">{tenant.monthlyRent || "3.500 MT"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Próxima Fatura:</span>
                <span className="text-slate-300 font-semibold">{tenant.nextPaymentDate || "A regular"}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/10 pt-2.5 text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1">
                  <Award size={13} className="text-indigo-400" />
                  Vendas Acumuladas:
                </span>
                <span className={`font-extrabold font-mono text-emerald-450`}>
                  {formatPrice(tenant.accumulatedSales || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* CARD DE REGISTRO E MAPEAMENTO DE DOMÍNIO DE MARCA DA LOJA */}
          <div className={`border rounded-xl p-5 shadow-sm space-y-4 ${currentStyle.card}`}>
            <h2 id="dominio-loja" className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 border-b border-slate-800/10 pb-2">
              <Globe size={14} className={currentStyle.accentText} />
              <span>Domínio Próprio de Marca</span>
            </h2>

            {tenant.customDomain ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-start gap-2 text-xs">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Status: Online & Vinculado</span>
                    A marca virtual está operando com sucesso sob o DNS de domínio próprio oficial.
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-center font-mono text-xs">
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Domínio Registrado:</span>
                  <div className="text-indigo-455 font-bold">
                    www.{tenant.customDomain}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <p className="text-[11px] text-slate-400 leading-normal">
                  Conecte o seu negócio sob um domínio exclusivo global (Ex: <code className="text-slate-300">suamarca.com</code>) eliminando o sufixo <code className="text-slate-500">.hws.com</code>.
                </p>

                {domainError && (
                  <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-2.5 rounded text-[11px] font-medium leading-normal">
                    {domainError}
                  </div>
                )}
                {domainSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-2.5 rounded text-[11px] font-medium leading-normal animate-pulse">
                    {domainSuccess}
                  </div>
                )}

                {/* Input de consulta */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={domainSearchQuery}
                      onChange={(e) => setDomainSearchQuery(e.target.value)}
                      placeholder="Ex: vanguardmoda.com"
                      className={`w-full text-xs p-2 pl-2.5 pr-8 bg-slate-950 text-slate-150 border border-slate-800 rounded-lg outline-none font-mono focus:border-indigo-500 placeholder:text-slate-600`}
                    />
                    {domainSearchQuery && (
                      <button onClick={() => setDomainSearchQuery('')} className="absolute right-2 top-2 text-slate-500 hover:text-slate-350">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleCheckDomain}
                    disabled={isSearchingDomain}
                    className="p-2 border border-slate-800 hover:bg-slate-850 rounded-lg text-slate-300 flex items-center justify-center cursor-pointer transition-all shrink-0"
                    title="Pesquisar disponibilidade"
                  >
                    <Search size={14} className={isSearchingDomain ? "animate-spin" : ""} />
                  </button>
                </div>

                {/* Resultado de consulta */}
                {domainResult && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-2.5 animate-in fade-in duration-100">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-mono text-slate-300 font-bold max-w-[150px] truncate">{domainResult.dominio}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        domainResult.disponivel 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/15 text-red-500 border border-red-500/20'
                      }`}>
                        {domainResult.disponivel ? 'Disponível' : 'Ocupado'}
                      </span>
                    </div>

                    {domainResult.disponivel ? (
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-400 leading-normal">
                          Domínio comercializável via Bluewhite Lda por apenas <span className="text-emerald-400 font-bold">1.200 MT/ano</span> (renovável).
                        </div>
                        <button
                          onClick={() => handleBuyDomain(domainResult.dominio)}
                          type="button"
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg text-center transition-transform hover:scale-[1.01] block cursor-pointer"
                        >
                          Registrar & Vincular Já
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 leading-normal font-medium">
                        Este endereço já está em uso por outro lojista. Sugestão recomendada: <span className="text-amber-500 font-mono font-bold block mt-0.5">{domainResult.sugestao}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sandbox Host logic Card */}
          <div className={`border rounded-xl p-5 shadow-sm space-y-3 ${currentStyle.card}`}>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">
              Interrupção de Requisições
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Na arquitetura multi-tenant, o servidor Express Node.js intercepta a URL <code className="text-slate-200">{tenant.domain}</code>, carrega os produtos e aplica o visual <span className="capitalize font-semibold text-emerald-400">{tenant.theme}</span> diretamente. Todo o processamento financeiro é roteado conforme o host solicitante.
            </p>
          </div>

        </div>
      </div>

      {/* Inventory Management Dialog Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Title bar */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="text-cyan-400" size={16} />
                <h4 className="font-bold text-sm tracking-tight font-display">
                  Indexar Produto em Catálogo - Inquilino: {tenant.id}
                </h4>
              </div>
              <button 
                onClick={() => setShowInventoryModal(false)}
                className="text-slate-500 hover:text-slate-350 p-1 rounded-full hover:bg-slate-850"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Input Content */}
            <form onSubmit={handleAddNewProductSubmit} className="p-5 space-y-4">
              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded text-xs">
                  {addError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block font-mono">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ex: Óculos Sol Aviator Steel"
                  className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block font-mono">Preço (Meticais) *</label>
                  <input
                    type="text"
                    required
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    placeholder="Ex: 3.500 MT"
                    className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block font-mono">Categoria</label>
                  <input
                    type="text"
                    value={newProductCat}
                    onChange={(e) => setNewProductCat(e.target.value)}
                    placeholder="Ex: Acessórios"
                    className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block font-mono">Descrição Básica</label>
                <textarea
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  placeholder="Ex: Lentes com proteção UV-400, liga de titânio acetinado e ajuste anatômico..."
                  className="w-full text-xs p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded outline-none focus:border-cyan-500 h-16 resize-none transition-colors"
                />
              </div>

              {/* Action buttons bar */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowInventoryModal(false)}
                  className="px-3.5 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-750 font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Plus size={13} />
                  <span>{isAdding ? 'Indexando...' : 'Adicionar Item'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Checkout clearance notification Overlay Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 max-w-lg w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            <CheckCircle2 className="mx-auto text-emerald-500 h-14 w-14 animate-bounce" />
            
            <div className="space-y-2">
              <h3 className="font-bold text-slate-100 font-display text-lg">
                Faturamento Confirmado pelo Inquilino!
              </h3>
              <p className="text-slate-400 text-xs">
                Seu pagamento foi recebido com sucesso. Os dados da transação foram sincronizados com o banco de dados associado ao subdomínio da loja e consolidados pelo Sandbox HWS.
              </p>
            </div>

            {/* Bill Summary parameters */}
            <div className="bg-slate-950 p-4 rounded-lg text-left border border-slate-800 space-y-3 font-mono text-[11px] leading-relaxed">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Nº FATURA:</span>
                <span className="text-amber-400 font-bold">{invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DOMÍNIO VENDEDOR:</span>
                <span className="text-slate-350">{tenant.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AMBIENTE MULTI-TENANT:</span>
                <span className="text-slate-350">{tenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SISTEMA INTEGRADO:</span>
                <span className="text-sky-400 font-medium">Clearance Portal Express (MZN)</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2 text-xs font-bold">
                <span className="text-slate-300">TOTAL PAGO:</span>
                <span className="text-emerald-400">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleClearCartAndClose}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs tracking-wide rounded-lg transition-transform focus:scale-[1.01] cursor-pointer"
              >
                ENTENDIDO, VOLTAR A COMPRAR
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
