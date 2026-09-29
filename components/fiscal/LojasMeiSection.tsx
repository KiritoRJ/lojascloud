import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  ArrowRight, 
  RefreshCw, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Info, 
  Check, 
  BookOpen, 
  Zap,
  Building,
  AlertCircle
} from 'lucide-react';
import { AppSettings, Product, Sale, TaxProfile, ServiceOrder } from '../../types';
import { OfflineSync } from '../../utils/offlineSync';
import { OnlineDB } from '../../utils/api';
import { 
  getStoredTaxProfiles, 
  saveTaxProfiles, 
  applyTaxProfileToAllProducts, 
  setTaxProfileAsDefault,
  getDefaultTaxProfile
} from '../../utils/taxProfiles';

interface LojasMeiSectionProps {
  settings: AppSettings;
  products?: Product[];
  setProducts?: (products: Product[]) => void;
  sales?: Sale[];
  serviceOrders?: ServiceOrder[];
  tenantId?: string;
  showToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToTab?: (tab: string) => void;
}

export const LojasMeiSection: React.FC<LojasMeiSectionProps> = ({
  settings,
  products = [],
  setProducts,
  sales = [],
  serviceOrders = [],
  tenantId,
  showToast = () => {},
  onNavigateToTab
}) => {
  const [profiles, setProfiles] = useState<TaxProfile[]>(() => getStoredTaxProfiles(tenantId));
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Perfil padrão atual em uso
  const currentDefaultProfile = useMemo(() => {
    return profiles.find(p => p.isDefault) || profiles[0];
  }, [profiles]);

  // Perfis recomendados para MEI
  const meiProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.id.startsWith('tp_mei_') || 
      p.crtCode === '4' || 
      p.csosnCst === '0400' || 
      p.name.toUpperCase().includes('MEI')
    );
  }, [profiles]);

  // Auditoria do Estoque em Relação ao Perfil Padrão
  const stockAudit = useMemo(() => {
    if (!products || products.length === 0) {
      return { total: 0, synced: 0, unsynced: 0, missingNcm: 0, syncPercentage: 100 };
    }
    const total = products.length;
    let synced = 0;
    let missingNcm = 0;

    products.forEach(p => {
      if (!p.ncm || p.ncm.trim().length < 4) {
        missingNcm++;
      }
      if (currentDefaultProfile && (p.taxProfileId === currentDefaultProfile.id || p.csosnCst === currentDefaultProfile.csosnCst)) {
        synced++;
      }
    });

    const unsynced = total - synced;
    const syncPercentage = Math.round((synced / total) * 100);

    return { total, synced, unsynced, missingNcm, syncPercentage };
  }, [products, currentDefaultProfile]);

  // Faturamento Acumulado no Ano Corrente para o Teto MEI (R$ 81.000,00)
  // CONTA COM A RECEITA BRUTA DA LOJA TODA: VENDAS + SERVIÇOS (ORDENS DE SERVIÇO)
  const meiRevenueStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const annualLimit = 81000.00;

    // 1. Receita de Vendas de Produtos / Comércio
    const currentYearSales = sales.filter(s => {
      if (s.isDeleted) return false;
      const saleYear = new Date(s.date).getFullYear();
      return saleYear === currentYear;
    });
    const salesRevenue = currentYearSales.reduce((acc, curr) => acc + (curr.finalPrice || 0), 0);

    // 2. Receita de Prestação de Serviços / Ordens de Serviço
    const currentYearOrders = serviceOrders.filter(o => {
      if (o.isDeleted) return false;
      const orderDateStr = o.exitDate || o.date || o.entryDate;
      const orderYear = new Date(orderDateStr).getFullYear();
      return orderYear === currentYear;
    });
    const servicesRevenue = currentYearOrders.reduce((acc, curr) => acc + (Number(curr.total) || Number(curr.serviceCost) || 0), 0);

    // 3. Receita Bruta Total da Loja Toda (Comércio + Serviços)
    const totalRevenue = salesRevenue + servicesRevenue;
    const percentage = Math.min(100, Math.round((totalRevenue / annualLimit) * 100));
    const remaining = Math.max(0, annualLimit - totalRevenue);

    return {
      currentYear,
      annualLimit,
      totalRevenue,
      salesRevenue,
      servicesRevenue,
      salesCount: currentYearSales.length,
      ordersCount: currentYearOrders.length,
      percentage,
      remaining,
      isNearLimit: percentage >= 80,
      isExceeded: totalRevenue > annualLimit
    };
  }, [sales, serviceOrders]);

  // Ativa um perfil como padrão e sincroniza automaticamente todo o estoque
  const handleSelectDefaultProfile = async (profileId: string) => {
    setIsSyncing(true);
    try {
      const { updatedProfiles, updatedProducts, defaultProfile } = setTaxProfileAsDefault(
        tenantId,
        profiles,
        profileId,
        products
      );

      setProfiles(updatedProfiles);

      // Salva imediatamente em cache local do tenant
      if (tenantId && updatedProducts.length > 0) {
        try {
          const fiscalCache: Record<string, any> = {};
          updatedProducts.forEach(p => {
            fiscalCache[p.id] = {
              taxProfileId: p.taxProfileId,
              taxProfileName: p.taxProfileName,
              csosnCst: p.csosnCst,
              origin: p.origin,
              cstPis: p.cstPis,
              cstCofins: p.cstCofins,
              crtCode: p.crtCode,
              cfop: p.cfop,
              ncm: p.ncm,
              cest: p.cest,
              icmsAliquota: p.icmsAliquota,
              pisAliquota: p.pisAliquota,
              cofinsAliquota: p.cofinsAliquota
            };
          });
          localStorage.setItem(`products_fiscal_cache_${tenantId}`, JSON.stringify(fiscalCache));
        } catch {}
      }

      if (setProducts && updatedProducts.length > 0) {
        await setProducts(updatedProducts);
      }
      if (tenantId && updatedProducts.length > 0) {
        await OfflineSync.saveProductsBatch(tenantId, updatedProducts, updatedProducts);
        await OnlineDB.upsertProducts(tenantId, updatedProducts);
      }

      const profName = defaultProfile?.name || 'Perfil MEI';
      const msg = `Perfil "${profName}" ativado como Base Principal! Todos os ${updatedProducts.length} produtos do estoque foram atualizados e salvos com sucesso.`;
      setSyncSuccessMessage(msg);
      showToast(msg, 'success');
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (e) {
      showToast('Erro ao sincronizar produtos com o perfil padrão.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sincronização manual em massa de todos os produtos do estoque com o perfil padrão atual
  const handleSyncAllStockNow = async () => {
    if (!currentDefaultProfile) {
      showToast('Nenhum perfil tributário padrão selecionado.', 'error');
      return;
    }
    if (!products || products.length === 0) {
      showToast('Nenhum produto cadastrado no estoque para sincronizar.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const updated = applyTaxProfileToAllProducts(products, currentDefaultProfile);

      // Salva imediatamente em cache local do tenant
      if (tenantId && updated.length > 0) {
        try {
          const fiscalCache: Record<string, any> = {};
          updated.forEach(p => {
            fiscalCache[p.id] = {
              taxProfileId: p.taxProfileId,
              taxProfileName: p.taxProfileName,
              csosnCst: p.csosnCst,
              origin: p.origin,
              cstPis: p.cstPis,
              cstCofins: p.cstCofins,
              crtCode: p.crtCode,
              cfop: p.cfop,
              ncm: p.ncm,
              cest: p.cest,
              icmsAliquota: p.icmsAliquota,
              pisAliquota: p.pisAliquota,
              cofinsAliquota: p.cofinsAliquota
            };
          });
          localStorage.setItem(`products_fiscal_cache_${tenantId}`, JSON.stringify(fiscalCache));
        } catch {}
      }

      if (setProducts) {
        await setProducts(updated);
      }
      if (tenantId) {
        await OfflineSync.saveProductsBatch(tenantId, updated, updated);
        await OnlineDB.upsertProducts(tenantId, updated);
      }
      const msg = `Sincronização 100% concluída e salva! Todos os ${updated.length} produtos agora utilizam as regras fiscais de "${currentDefaultProfile.name}".`;
      setSyncSuccessMessage(msg);
      showToast(msg, 'success');
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err) {
      showToast('Erro ao executar sincronização em massa.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Principal - Lojas MEI */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <Store size={30} className="animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                  Pasta Lojas MEI & Gestão Fiscal
                </h1>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                  <ShieldCheck size={12} />
                  <span>CRT 4 • SIMEI Oficial</span>
                </span>
                <span className="bg-white/10 text-emerald-200 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-white/10">
                  Desoneração de ICMS / PIS / COFINS
                </span>
              </div>
              <p className="text-xs md:text-sm text-emerald-100 max-w-3xl leading-relaxed font-medium">
                Central contábil criada exclusivamente para o <strong>Microempreendedor Individual (MEI)</strong>. 
                Aqui você define o perfil tributário base da loja toda, que sincroniza <strong>automaticamente todos os produtos existentes e novos cadastros</strong> para garantir emissões corretas de NFC-e e NF-e sem rejeição na SEFAZ.
              </p>
            </div>
          </div>

          {/* Botão de Sincronização em Massa do Estoque */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSyncAllStockNow}
              disabled={isSyncing || products.length === 0}
              className="px-5 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Aplica a regra fiscal padrão da loja a todos os produtos do estoque de uma só vez"
            >
              <RefreshCw size={17} className={isSyncing ? 'animate-spin' : ''} />
              <span>Sincronizar Estoque Todo ({products.length})</span>
            </button>
          </div>
        </div>

        {/* Notificação de Sucesso de Sincronização */}
        {syncSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/50 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-200 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Grid de Métricas do MEI: Limite Anual + Auditoria do Estoque */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Termômetro do Teto Anual do MEI (R$ 81.000,00) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                  Limite Anual MEI ({meiRevenueStats.currentYear})
                </span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                meiRevenueStats.isExceeded
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : meiRevenueStats.isNearLimit
                  ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {meiRevenueStats.percentage}% Utilizado
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  R$ {meiRevenueStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                  Vendas + Serviços
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">
                de R$ 81.000,00 (Teto Oficial da Lei Complementar 123)
              </p>

              {/* Detalhamento: Comércio (Vendas) vs Serviços (O.S.) */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[10px]">
                <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-black uppercase text-[9px] block">Vendas (Comércio):</span>
                  <span className="font-mono font-black text-slate-800 text-[11px] block mt-0.5">
                    R$ {meiRevenueStats.salesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">({meiRevenueStats.salesCount} vendas)</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-black uppercase text-[9px] block">Serviços (O.S.):</span>
                  <span className="font-mono font-black text-slate-800 text-[11px] block mt-0.5">
                    R$ {meiRevenueStats.servicesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">({meiRevenueStats.ordersCount} O.S.)</span>
                </div>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  meiRevenueStats.isExceeded 
                    ? 'bg-red-600' 
                    : meiRevenueStats.isNearLimit 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, meiRevenueStats.percentage)}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold text-[10px] uppercase">Margem Disponível:</span>
            <span className="font-mono font-black text-slate-800">
              R$ {meiRevenueStats.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Status do Perfil Base Atual */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                  Perfil Base da Loja (Padrão)
                </span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Ativo
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-base font-black text-slate-900 leading-snug">
                {currentDefaultProfile?.name || 'Nenhum Perfil Selecionado'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                {currentDefaultProfile?.description || 'Defina um perfil como padrão para aplicar automaticamente ao estoque.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold uppercase block text-[9px]">Regime (CRT):</span>
              <span className="font-mono font-black text-slate-800">
                CRT {currentDefaultProfile?.crtCode || '4'} (MEI)
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold uppercase block text-[9px]">CSOSN / CFOP:</span>
              <span className="font-mono font-black text-slate-800">
                {currentDefaultProfile?.csosnCst || '0400'} • {currentDefaultProfile?.defaultCfopInternal || '5102'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Auditoria do Estoque e Conformidade Fiscal */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package size={16} />
                </div>
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                  Conformidade do Estoque
                </span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                {stockAudit.syncPercentage}% Padronizado
              </span>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Produtos no Perfil Padrão:</span>
                <span className="font-bold text-emerald-600 font-mono">{stockAudit.synced} de {stockAudit.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Pendentes de Padronização:</span>
                <span className={`font-bold font-mono ${stockAudit.unsynced > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {stockAudit.unsynced}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Produtos sem NCM:</span>
                <span className={`font-bold font-mono ${stockAudit.missingNcm > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {stockAudit.missingNcm}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncAllStockNow}
            disabled={isSyncing || stockAudit.total === 0}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className="text-amber-400" />
            <span>Padronizar Todos ({stockAudit.total} Itens)</span>
          </button>
        </div>
      </div>

      {/* ÁREA EXPLICATIVA DIDÁTICA DO CONTADOR: POR QUE SINCRONIZAR AUTOMATICAMENTE */}
      <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-slate-50 rounded-3xl p-6 md:p-8 border border-blue-200/80 shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Guia Fiscal MEI: A Importância da Sincronização Automática
              </h2>
              <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                Exclusivo ERP Contador
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
              Entenda como a legislação brasileira trata o MEI e por que o perfil tributário selecionado deve governar toda a loja automaticamente.
            </p>
          </div>
        </div>

        {/* 3 Blocos de Explicação Contábil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Bloco 1: O Perfil como Base Principal */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <RefreshCw size={16} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-tight">
              1. Sincronização com Novos e Antigos Produtos
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              O <strong>Perfil Tributário Padrão</strong> atua como a espinha dorsal fiscal do seu comércio. 
              Sempre que você escolhe o perfil padrão, <strong>todos os produtos existentes no estoque são atualizados instantaneamente</strong>. 
              Além disso, qualquer novo produto cadastrado (manualmente ou por foto com IA) herda essa base tributária correta de forma automática, garantindo conformidade sem retrabalho.
            </p>
          </div>

          {/* Bloco 2: Regras de Emissão de Notas do MEI */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-tight">
              2. Quando o MEI é Obrigado a Emitir Nota Fiscal?
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              • <strong>Venda para Pessoa Física (Consumidor Final):</strong> Pela Lei Complementar 123/2006, o MEI está <span className="text-emerald-700 font-bold">dispensado</span> de emitir nota, salvo se o cliente exigir. No PDV da loja, você pode emitir cupom NFC-e para controle ágil.<br/>
              • <strong>Venda para Empresas (PJ) ou Governo:</strong> A emissão de <strong>NF-e (Modelo 55)</strong> é <span className="text-red-600 font-bold">obrigatória</span> se o comprador não emitir nota fiscal de entrada.
            </p>
          </div>

          {/* Bloco 3: Alíquotas e Tributos no MEI */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-tight">
              3. Alíquotas Zero e Tributos no DAS-MEI
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              No MEI, os impostos (ICMS para comércio e ISS para serviços) já estão <strong>100% inclusos na guia mensal fixa DAS-MEI</strong> (apenas R$ 1,00 de ICMS e R$ 5,00 de ISS fixos). 
              Por isso, nas notas fiscais do MEI:
              • <strong>Alíquota de ICMS = 0%</strong> (sem permissão de crédito).<br/>
              • <strong>PIS / COFINS = 0%</strong> (CST 07 - Isenta).<br/>
              • <strong>CSOSN Correto = 400 ou 102</strong> (ou 500 para produtos com ST).
            </p>
          </div>
        </div>

        {/* Dica de Prevenção de Erros da SEFAZ */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/90 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 font-medium leading-relaxed">
            <p className="font-black uppercase text-[11px] text-amber-900 tracking-wider">
              Dica Contábil Anti-Bloqueio SEFAZ:
            </p>
            <p className="mt-0.5">
              Empresas MEI que tentam emitir nota usando CST normal (ex: CST 00, CST 20) são rejeitadas de imediato pela SEFAZ com a <em>Rejeição 590: Informado CSOSN para emitente que não é do Simples Nacional</em> ou rejeições de incompatibilidade de CRT. Mantendo seu estoque sincronizado com o <strong>Perfil Oficial MEI (CRT 4)</strong>, suas notas e cupons passam de primeira sem qualquer erro.
            </p>
          </div>
        </div>
      </div>

      {/* SELEÇÃO E ATIVAÇÃO DOS PERFIS TRIBUTÁRIOS MEI */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-emerald-600" />
              <span>Perfis Fiscais Específicos para Lojas MEI</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Clique em <strong>"Ativar como Base da Loja"</strong> para sincronizar instantaneamente todos os {products.length} produtos do estoque.
            </p>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('perfis')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Ver todos os perfis tributários</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {meiProfiles.map(p => {
            const isDefault = currentDefaultProfile?.id === p.id;
            return (
              <div 
                key={p.id}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isDefault 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <ShieldCheck size={11} />
                      <span>CRT 4 (MEI)</span>
                    </span>

                    {isDefault ? (
                      <span className="text-[9px] font-black uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                        <Check size={11} />
                        <span>Base Principal da Loja</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-slate-400">
                        Disponível
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-sm leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Resumo dos Códigos Fiscais */}
                  <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 border border-slate-100 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase">CSOSN (ICMS):</span>
                      <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {p.csosnCst}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase">CFOP Saída Interna:</span>
                      <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {p.defaultCfopInternal}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase">CFOP Interestadual:</span>
                      <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {p.defaultCfopInterstate || '6102'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase">Alíquota ICMS:</span>
                      <span className="font-mono font-black text-emerald-700">0.00% (DAS-MEI)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase">PIS / COFINS:</span>
                      <span className="font-mono font-black text-slate-800">CST {p.cstPis || '07'} (0.00%)</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ativação e Sincronização */}
                <div className="pt-4 border-t border-slate-100 mt-4">
                  {isDefault ? (
                    <div className="w-full py-2.5 px-3 bg-emerald-100 text-emerald-800 rounded-xl font-black text-[10px] uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Perfil Ativo em Todos os Produtos</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectDefaultProfile(p.id)}
                      disabled={isSyncing}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Zap size={14} />
                      <span>Ativar como Base da Loja</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
