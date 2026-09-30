import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Trash2, 
  ExternalLink, 
  Settings2, 
  RefreshCw, 
  LogOut, 
  Store, 
  CreditCard, 
  Smartphone, 
  KeyRound, 
  FileText, 
  Sparkles, 
  X, 
  Check, 
  User, 
  HelpCircle,
  Copy,
  Sliders,
  Layers,
  ShoppingBag,
  Wrench,
  Users,
  Package,
  Receipt
} from 'lucide-react';
import { Reseller, Tenant } from '../types';
import { ResellerService } from '../utils/resellerService';
import { OnlineDB } from '../utils/api';
import { Tooltip } from './reseller/Tooltip';

interface ResellerDashboardProps {
  reseller: Reseller;
  onLogout: () => void;
  onLoginAs: (tenantId: string) => void;
}

export const ResellerDashboard: React.FC<ResellerDashboardProps> = ({
  reseller,
  onLogout,
  onLoginAs
}) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantMetaMap, setTenantMetaMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'expired' | 'blocked'>('all');

  // Modais
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [isPaymentConfigModalOpen, setIsPaymentConfigModalOpen] = useState(false);
  const [storeToEditModules, setStoreToEditModules] = useState<any | null>(null);
  const [storeToEditPrice, setStoreToEditPrice] = useState<{ 
    id: string; 
    storeName: string; 
    monthlyPrice: number;
    quarterlyPrice: number;
    yearlyPrice: number;
  } | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Formulário de Criação de Loja (Permite personalizar todos os planos; teste é fixo 0,00)
  const [newStoreForm, setNewStoreForm] = useState({
    storeName: '',
    adminUsername: '',
    adminPassword: '',
    phoneNumber: '',
    monthlyPrice: 79.90,
    quarterlyPrice: 215.70,
    yearlyPrice: 767.00,
    trialDays: 7
  });

  // Formulário de Configuração de Recebimento do Revendedor
  const [paymentConfigForm, setPaymentConfigForm] = useState({
    mercadoPagoAccessToken: reseller.mercadoPagoAccessToken || '',
    mercadoPagoPublicKey: reseller.mercadoPagoPublicKey || '',
    pixKey: reseller.pixKey || '',
    pixKeyType: reseller.pixKeyType || ('cnpj' as const)
  });

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setErrorToast(message);
      setTimeout(() => setErrorToast(null), 4000);
    } else {
      setSuccessToast(message);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Carrega lojas e metadados
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allTenants, metaMap] = await Promise.all([
        OnlineDB.getTenants(),
        ResellerService.getTenantMetadataMap()
      ]);

      // Filtra lojas que pertencem a este revendedor
      // (Verifica se metaMap aponta para este revendedor, ou se o tenant tem reseller_id correspondente)
      const myTenants = (allTenants || []).filter((t: any) => {
        if (t.id === 'SYSTEM' || t.id === 'system-settings') return false;
        const meta = metaMap[t.id];
        return (
          meta?.resellerId === reseller.id || 
          t.reseller_id === reseller.id ||
          meta?.resellerUsername === reseller.username ||
          (meta?.resellerName && meta.resellerName.toLowerCase() === reseller.name.toLowerCase())
        );
      });

      setTenants(myTenants);
      setTenantMetaMap(metaMap);
    } catch (err) {
      showToast('Erro ao carregar dados do painel.', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reseller.id]);

  // Estatísticas Financeiras do Revendedor
  const stats = useMemo(() => {
    const totalStores = tenants.length;
    let paidCount = 0;
    let expiredCount = 0;
    let blockedCount = 0;
    let totalRevenue = 0;

    tenants.forEach((t) => {
      const meta = tenantMetaMap[t.id] || {};
      const isBlocked = !!meta.isBlocked;
      const expiresAt = meta.nextExpiresAt || t.subscription_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
      const isPaid = meta.monthlyPaymentStatus === 'paid' && !isExpired;

      const monthlyVal = Number(meta.monthlyPrice || t.custom_monthly_price || 79.90);

      if (isBlocked) blockedCount++;
      if (isPaid) {
        paidCount++;
        totalRevenue += monthlyVal;
      } else {
        expiredCount++;
      }
    });

    const commissionRate = Number(reseller.commissionPercentage) || 30;
    const estimatedProfit = (totalRevenue * commissionRate) / 100;

    return {
      totalStores,
      paidCount,
      expiredCount,
      blockedCount,
      totalRevenue,
      commissionRate,
      estimatedProfit
    };
  }, [tenants, tenantMetaMap, reseller.commissionPercentage]);

  // Filtro de Busca e Status
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const meta = tenantMetaMap[t.id] || {};
      const matchesSearch = 
        t.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'blocked') return !!meta.isBlocked;
      if (statusFilter === 'paid') {
        const expiresAt = meta.nextExpiresAt || t.subscription_expires_at;
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
        return meta.monthlyPaymentStatus === 'paid' && !isExpired && !meta.isBlocked;
      }
      if (statusFilter === 'expired') {
        const expiresAt = meta.nextExpiresAt || t.subscription_expires_at;
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
        return (meta.monthlyPaymentStatus !== 'paid' || isExpired) && !meta.isBlocked;
      }

      return true;
    });
  }, [tenants, tenantMetaMap, searchTerm, statusFilter]);

  // Criação de Nova Loja
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreForm.storeName.trim() || !newStoreForm.adminUsername.trim() || !newStoreForm.adminPassword.trim()) {
      showToast('Preencha os campos obrigatórios.', true);
      return;
    }

    setIsSaving(true);
    try {
      const tenantId = 'store_' + Math.random().toString(36).substr(2, 7);
      const monthlyPrice = Number(newStoreForm.monthlyPrice) || 79.90;
      const quarterlyPrice = Number(newStoreForm.quarterlyPrice) || Number((monthlyPrice * 3 * 0.9).toFixed(2));
      const yearlyPrice = Number(newStoreForm.yearlyPrice) || Number((monthlyPrice * 12 * 0.8).toFixed(2));
      const trialDays = Number(newStoreForm.trialDays) || 7;
      
      const registerRes = await OnlineDB.createTenant({
        id: tenantId,
        storeName: newStoreForm.storeName.trim(),
        adminUsername: newStoreForm.adminUsername.trim().toLowerCase(),
        adminPasswordPlain: newStoreForm.adminPassword.trim(),
        logoUrl: null,
        phoneNumber: newStoreForm.phoneNumber.trim(),
        customMonthlyPrice: monthlyPrice,
        customQuarterlyPrice: quarterlyPrice,
        customYearlyPrice: yearlyPrice,
        trialDays: trialDays
      });

      if (!registerRes.success) {
        showToast(registerRes.message || 'Erro ao registrar loja.', true);
        setIsSaving(false);
        return;
      }

      // Garante a gravação direta dos preços customizados de todos os planos na tabela tenants
      await OnlineDB.updateTenantCustomPrices(tenantId, {
        monthly: monthlyPrice,
        quarterly: quarterlyPrice,
        yearly: yearlyPrice
      });

      // Calcula data de validade inicial (dias de teste)
      const expires = new Date();
      expires.setDate(expires.getDate() + trialDays);
      expires.setHours(23, 59, 59, 999);

      // Vincula metadados de revendedor
      await ResellerService.updateTenantMetadata(tenantId, {
        resellerId: reseller.id,
        resellerName: reseller.name,
        resellerUsername: reseller.username,
        monthlyPaymentStatus: 'pending',
        monthlyPrice: monthlyPrice,
        quarterlyPrice: quarterlyPrice,
        yearlyPrice: yearlyPrice,
        nextExpiresAt: expires.toISOString(),
        isBlocked: false
      });

      showToast(`Loja "${newStoreForm.storeName}" criada e vinculada com sucesso!`);
      setIsCreateStoreModalOpen(false);
      setNewStoreForm({
        storeName: '',
        adminUsername: '',
        adminPassword: '',
        phoneNumber: '',
        monthlyPrice: 79.90,
        quarterlyPrice: 215.70,
        yearlyPrice: 767.00,
        trialDays: 7
      });
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar loja.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Preço dos Planos da Loja (Mensal, Trimestral, Anual - Teste é 100% gratuito)
  const handleSaveStorePrice = async () => {
    if (!storeToEditPrice) return;
    setIsSaving(true);
    try {
      const newMonthly = Number(storeToEditPrice.monthlyPrice) || 79.90;
      const newQuarterly = Number(storeToEditPrice.quarterlyPrice) || Number((newMonthly * 3 * 0.9).toFixed(2));
      const newYearly = Number(storeToEditPrice.yearlyPrice) || Number((newMonthly * 12 * 0.8).toFixed(2));
      
      // 1. Atualiza custom_monthly_price, custom_quarterly_price, custom_yearly_price na tabela tenants
      await OnlineDB.updateTenantCustomPrices(storeToEditPrice.id, {
        monthly: newMonthly,
        quarterly: newQuarterly,
        yearly: newYearly
      });

      // 2. Atualiza metadados do revendedor
      await ResellerService.updateTenantMetadata(storeToEditPrice.id, {
        monthlyPrice: newMonthly,
        quarterlyPrice: newQuarterly,
        yearlyPrice: newYearly
      });

      showToast(`Preços dos planos da loja "${storeToEditPrice.storeName}" atualizados com sucesso!`);
      setStoreToEditPrice(null);
      await loadData();
    } catch (err: any) {
      showToast('Erro ao atualizar preços dos planos da loja.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Bloqueio / Desbloqueio
  const handleToggleBlock = async (tenantId: string, currentBlocked: boolean) => {
    const nextState = !currentBlocked;
    setIsSaving(true);
    try {
      const res = await ResellerService.toggleTenantBlock(tenantId, nextState);
      if (res.success) {
        showToast(nextState ? 'Acesso da loja bloqueado.' : 'Acesso da loja liberado com sucesso.');
        await loadData();
      } else {
        showToast(res.message || 'Erro ao alterar bloqueio.', true);
      }
    } catch (err) {
      showToast('Erro de comunicação.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Registrar Pagamento / Renovar 30 Dias
  const handleRenewPayment = async (t: any) => {
    const meta = tenantMetaMap[t.id] || {};
    const price = Number(meta.monthlyPrice || t.custom_monthly_price || 79.90);
    setIsSaving(true);
    try {
      const res = await ResellerService.registerStorePayment(t.id, meta.nextExpiresAt || t.subscription_expires_at, price);
      if (res.success) {
        showToast(`Mensalidade registrada! Acesso da loja renovado por +30 dias.`);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao renovar mensalidade.', true);
      }
    } catch (err) {
      showToast('Erro de comunicação.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Sincronizar Base NCM da Loja
  const handleSyncNcm = async (tenantId: string, storeName: string) => {
    setIsSaving(true);
    try {
      const res = await ResellerService.syncStoreNcmDatabase(tenantId);
      if (res.success) {
        showToast(`Base de dados NCM sincronizada para a loja "${storeName}"!`);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao sincronizar base NCM.', true);
      }
    } catch (err) {
      showToast('Erro ao sincronizar base NCM.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Módulos / Abas da Loja
  const handleSaveModules = async () => {
    if (!storeToEditModules) return;
    setIsSaving(true);
    try {
      const res = await OnlineDB.updateTenantFeatures(
        storeToEditModules.id,
        storeToEditModules.enabled_features,
        storeToEditModules.max_users || 999,
        storeToEditModules.tenant_limits?.max_os || 999,
        storeToEditModules.tenant_limits?.max_products || 999,
        storeToEditModules.printer_size || 58,
        storeToEditModules.retention_months || 6
      );

      if (res.success) {
        showToast('Módulos e abas da loja atualizados com sucesso!');
        setStoreToEditModules(null);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao atualizar abas da loja.', true);
      }
    } catch (err) {
      showToast('Erro ao atualizar abas.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Loja
  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    setIsSaving(true);
    try {
      const res = await OnlineDB.deleteTenant(storeToDelete.id);
      if (res.success) {
        showToast(`Loja "${storeToDelete.store_name}" excluída com sucesso.`);
        setStoreToDelete(null);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao excluir loja.', true);
      }
    } catch (err) {
      showToast('Erro ao excluir loja.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Configurações de Pagamento Mercado Pago
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await ResellerService.saveResellerPaymentConfig(reseller.id, paymentConfigForm);
      if (res.success) {
        showToast('Credenciais de recebimento salvas com sucesso!');
        setIsPaymentConfigModalOpen(false);
      } else {
        showToast(res.message || 'Erro ao salvar credenciais.', true);
      }
    } catch (err) {
      showToast('Erro de comunicação.', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast de Notificação Flutuante */}
      {successToast && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider animate-in slide-in-from-top-4 border border-emerald-400">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-6 right-6 z-[100] bg-red-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider animate-in slide-in-from-top-4 border border-red-500">
          <AlertCircle size={18} />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header Superior Principal */}
      <header className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                  Painel do Revendedor
                </h1>
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Parceiro Autorizado
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Olá, <strong className="text-slate-200">{reseller.name}</strong> • Usuário: <code className="text-blue-400 font-mono">{reseller.username}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip content="Configure suas chaves da API Mercado Pago e chave PIX para receber os pagamentos das suas lojas criadas.">
              <button
                type="button"
                onClick={() => setIsPaymentConfigModalOpen(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <CreditCard size={15} className="text-blue-400" />
                <span>Recebimento / Mercado Pago</span>
              </button>
            </Tooltip>

            <Tooltip content="Encerra com segurança a sua sessão de revendedor.">
              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-8">
        
        {/* Banner de Boas-Vindas e Resumo Executivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Lucro do Mês */}
          <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                Seu Lucro do Mês
              </span>
              <Tooltip content={`Seu percentual de lucro definido pela administração é de ${stats.commissionRate}% sobre o valor das mensalidades pagas das suas lojas.`}>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center cursor-help">
                  <DollarSign size={16} />
                </div>
              </Tooltip>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                R$ {stats.estimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-300/80 font-bold uppercase mt-1">
                Comissão de {stats.commissionRate}% por Loja
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Faturamento Total Lojas:</span>
              <span className="font-mono font-bold text-slate-200">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 2: Lojas Ativas */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                Lojas Ativas & Em Dia
              </span>
              <Tooltip content="Quantidade de lojas com a mensalidade paga no mês vigente e com acesso ativo.">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center cursor-help">
                  <CheckCircle2 size={16} />
                </div>
              </Tooltip>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats.paidCount} <span className="text-sm font-normal text-slate-400">lojas</span>
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                Acesso liberado
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Total Gerenciado:</span>
              <span className="font-mono font-bold text-slate-200">{stats.totalStores} lojas</span>
            </div>
          </div>

          {/* Card 3: Mensalidades Pendentes */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Mensalidades Pendentes
              </span>
              <Tooltip content="Lojas que ainda não quitaram a mensalidade ou estão em período de teste/vencidas.">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center cursor-help">
                  <Clock size={16} />
                </div>
              </Tooltip>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                {stats.expiredCount} <span className="text-sm font-normal text-slate-400">lojas</span>
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                Aguardando renovação
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Ação:</span>
              <span className="text-amber-300 font-bold text-[10px]">Cobrar / Renovar</span>
            </div>
          </div>

          {/* Card 4: Lojas Bloqueadas */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                Lojas Bloqueadas
              </span>
              <Tooltip content="Lojas cujo acesso foi temporariamente suspenso por inadimplência ou solicitação.">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center cursor-help">
                  <Lock size={16} />
                </div>
              </Tooltip>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-red-400 tracking-tight">
                {stats.blockedCount} <span className="text-sm font-normal text-slate-400">lojas</span>
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                Acesso suspenso
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Status:</span>
              <span className="text-red-400 font-bold text-[10px]">Inadimplentes</span>
            </div>
          </div>

        </div>

        {/* Barra de Ferramentas e Filtros */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar loja por nome ou identificador..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filtros rápidos */}
            <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({tenants.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Em Dia ({stats.paidCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('expired')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  statusFilter === 'expired' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendentes ({stats.expiredCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('blocked')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  statusFilter === 'blocked' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bloqueadas ({stats.blockedCount})
              </button>
            </div>

            {/* Botão Criar Loja */}
            <Tooltip content="Cadastra uma nova loja no ERP já vinculada à sua carteira de revendedor.">
              <button
                type="button"
                onClick={() => setIsCreateStoreModalOpen(true)}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>Nova Loja</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Lista de Lojas do Revendedor */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold uppercase text-xs animate-pulse">
              Carregando suas lojas...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Store size={28} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-white">Nenhuma loja encontrada</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Nenhum resultado corresponde ao termo de busca.' 
                    : 'Você ainda não possui lojas vinculadas. Clique no botão "Nova Loja" acima para criar a sua primeira loja cliente.'}
                </p>
              </div>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => setIsCreateStoreModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Criar Primeira Loja
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTenants.map((t) => {
                const meta = tenantMetaMap[t.id] || {};
                const isBlocked = !!meta.isBlocked;
                const expiresAt = meta.nextExpiresAt || t.subscription_expires_at;
                const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
                const isPaid = meta.monthlyPaymentStatus === 'paid' && !isExpired;
                const monthlyPrice = Number(meta.monthlyPrice || t.custom_monthly_price || 79.90);
                const quarterlyPrice = Number(meta.quarterlyPrice || t.custom_quarterly_price || Number((monthlyPrice * 3 * 0.9).toFixed(2)));
                const yearlyPrice = Number(meta.yearlyPrice || t.custom_yearly_price || Number((monthlyPrice * 12 * 0.8).toFixed(2)));

                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                      isBlocked
                        ? 'border-red-500/40 bg-red-950/10'
                        : isExpired
                        ? 'border-amber-500/30 bg-amber-950/5'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Informações Básicas da Loja */}
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 font-black text-sm uppercase shadow-inner ${
                        isBlocked
                          ? 'bg-red-600'
                          : isExpired
                          ? 'bg-amber-600'
                          : 'bg-blue-600'
                      }`}>
                        {t.store_name?.charAt(0) || 'L'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-black text-white uppercase tracking-tight">
                            {t.store_name}
                          </h3>

                          {/* Badge de Acesso */}
                          {isBlocked ? (
                            <Tooltip content="O acesso desta loja está bloqueado no momento. Os usuários não conseguem fazer login.">
                              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock size={10} />
                                <span>Acesso Bloqueado</span>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip content="A loja está com acesso normal liberado para seus administradores e colaboradores.">
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check size={10} />
                                <span>Acesso Liberado</span>
                              </span>
                            </Tooltip>
                          )}

                          {/* Badge de Mensalidade */}
                          {isPaid ? (
                            <Tooltip content={`Mensalidade paga em dia. Vence em: ${expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'N/A'}`}>
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                <span>Mensalidade Em Dia</span>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip content={`Mensalidade pendente ou atrasada. Vencimento: ${expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'Vencida'}`}>
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock size={10} />
                                <span>Mensalidade Pendente</span>
                              </span>
                            </Tooltip>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
                          <span>ID: <code className="text-slate-300 font-mono">{t.id}</code></span>
                          <span>•</span>
                          <span>Mensal: <strong className="text-emerald-400">R$ {monthlyPrice.toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>Trimestral: <strong className="text-blue-400">R$ {quarterlyPrice.toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>Anual: <strong className="text-purple-400">R$ {yearlyPrice.toFixed(2)}</strong></span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold text-[11px]">Teste: Grátis</span>
                          <span>•</span>
                          <span>
                            Vencimento: <strong className={isExpired ? 'text-red-400' : 'text-slate-200'}>
                              {expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'Sem data'}
                            </strong>
                          </span>
                          {meta.ncmDatabaseVersion && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 text-[10px] font-bold">NCM 2026 Ativo</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação na Loja */}
                    <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                      
                      {/* Renovar Mensalidade */}
                      <Tooltip content="Registra o pagamento da mensalidade e prorroga a validade do plano por mais 30 dias.">
                        <button
                          type="button"
                          onClick={() => handleRenewPayment(t)}
                          disabled={isSaving}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard size={14} />
                          <span>Pagar/Renovar 30D</span>
                        </button>
                      </Tooltip>

                      {/* Bloquear / Desbloquear Loja */}
                      <Tooltip content={isBlocked ? "Libera novamente o acesso da loja ao sistema." : "Bloqueia temporariamente o acesso da loja ao sistema (por exemplo em caso de inadimplência)."}>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(t.id, isBlocked)}
                          disabled={isSaving}
                          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                            isBlocked
                              ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                          <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                        </button>
                      </Tooltip>

                      {/* Configurar Abas / Módulos */}
                      <Tooltip content="Ative ou desative abas específicas para esta loja (Ordens de Serviço, Estoque, Vendas, Fiscal, Financeiro).">
                        <button
                          type="button"
                          onClick={() => setStoreToEditModules(t)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <Sliders size={14} className="text-blue-400" />
                          <span>Abas</span>
                        </button>
                      </Tooltip>

                      {/* Alterar Preço de Todos os Planos */}
                      <Tooltip content="Personalizar os valores de todos os planos (Mensal, Trimestral e Anual) para esta loja. O plano Teste é sempre gratuito.">
                        <button
                          type="button"
                          onClick={() => setStoreToEditPrice({ 
                            id: t.id, 
                            storeName: t.store_name, 
                            monthlyPrice,
                            quarterlyPrice,
                            yearlyPrice
                          })}
                          className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <DollarSign size={14} className="text-emerald-400" />
                          <span>Planos</span>
                        </button>
                      </Tooltip>

                      {/* Atualizar Base NCM */}
                      <Tooltip content="Atualiza a base de dados de códigos fiscais NCM e tributação para os produtos cadastrados nesta loja.">
                        <button
                          type="button"
                          onClick={() => handleSyncNcm(t.id, t.store_name)}
                          disabled={isSaving}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={14} className="text-emerald-400" />
                          <span>NCM</span>
                        </button>
                      </Tooltip>

                      {/* Entrar na Loja (Suporte) */}
                      <Tooltip content="Acessa diretamente o painel desta loja para prestar suporte ao seu cliente.">
                        <button
                          type="button"
                          onClick={() => onLoginAs(t.id)}
                          className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <ExternalLink size={14} />
                          <span>Acessar</span>
                        </button>
                      </Tooltip>

                      {/* Excluir Loja */}
                      <Tooltip content="Remove permanentemente esta loja do sistema. Use com cautela.">
                        <button
                          type="button"
                          onClick={() => setStoreToDelete(t)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Tooltip>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================== */}
      {/* MODAL 1: CRIAR NOVA LOJA (REVENDEDOR)                                    */}
      {/* ====================================================================== */}
      {isCreateStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white">Criar Nova Loja</h3>
                  <p className="text-xs text-slate-400">A loja ficará vinculada automaticamente à sua conta de revendedor.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateStoreModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Nome da Empresa / Loja
                </label>
                <input
                  type="text"
                  required
                  value={newStoreForm.storeName}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, storeName: e.target.value })}
                  placeholder="Ex: Celular & Cia Assistência Técnica"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Usuário Admin da Loja
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreForm.adminUsername}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, adminUsername: e.target.value.toLowerCase().trim() })}
                    placeholder="ex: loja.celular"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Senha Provisória
                  </label>
                  <input
                    type="password"
                    required
                    value={newStoreForm.adminPassword}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, adminPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  value={newStoreForm.phoneNumber}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, phoneNumber: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Seção de Configuração de Valores dos Planos */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-400" />
                    Valores dos Planos para esta Loja
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Personalizável</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                      Plano Mensal (1 Mês)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[11px]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newStoreForm.monthlyPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setNewStoreForm({
                            ...newStoreForm,
                            monthlyPrice: val,
                            quarterlyPrice: Number((val * 3 * 0.9).toFixed(2)),
                            yearlyPrice: Number((val * 12 * 0.8).toFixed(2))
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-8 pr-2 text-xs font-black text-white outline-none focus:border-emerald-500 font-mono"
                        placeholder="79.90"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-blue-400 block">
                      Plano Trimestral (3M)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[11px]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newStoreForm.quarterlyPrice}
                        onChange={(e) => setNewStoreForm({ ...newStoreForm, quarterlyPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-8 pr-2 text-xs font-black text-white outline-none focus:border-blue-500 font-mono"
                        placeholder="215.70"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-purple-400 block">
                      Plano Anual (12M)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[11px]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newStoreForm.yearlyPrice}
                        onChange={(e) => setNewStoreForm({ ...newStoreForm, yearlyPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-8 pr-2 text-xs font-black text-white outline-none focus:border-purple-500 font-mono"
                        placeholder="767.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Plano Teste Fixo Grátis */}
                <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Lock size={12} className="text-amber-400" />
                    <span><strong>Plano Teste (Avaliação):</strong> R$ 0,00 (100% Gratuito)</span>
                  </div>
                  <span className="text-[10px] text-amber-400/90 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Não Cobrado
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center justify-between">
                <span>Período de Teste Grátis Inicial:</span>
                <span className="font-bold font-mono">7 dias</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateStoreModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Criando Loja...' : 'Criar e Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: CONFIGURAÇÃO DE RECEBIMENTO DO REVENDEDOR (MERCADO PAGO / PIX) */}
      {/* ====================================================================== */}
      {isPaymentConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white">Recebimento de Pagamentos</h3>
                  <p className="text-xs text-slate-400">Configure suas credenciais para receber de suas lojas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentConfigModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePaymentConfig} className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                  <Sparkles size={14} />
                  <span>API Mercado Pago (Cobranças Automáticas)</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Access Token de Produção
                  </label>
                  <input
                    type="password"
                    value={paymentConfigForm.mercadoPagoAccessToken}
                    onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, mercadoPagoAccessToken: e.target.value })}
                    placeholder="APP_USR-..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Public Key
                  </label>
                  <input
                    type="text"
                    value={paymentConfigForm.mercadoPagoPublicKey}
                    onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, mercadoPagoPublicKey: e.target.value })}
                    placeholder="APP_USR-..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase">
                  <Smartphone size={14} />
                  <span>Recebimento Manual via PIX</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Tipo de Chave
                    </label>
                    <select
                      value={paymentConfigForm.pixKeyType}
                      onChange={(e: any) => setPaymentConfigForm({ ...paymentConfigForm, pixKeyType: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Aleatória</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Sua Chave PIX
                    </label>
                    <input
                      type="text"
                      value={paymentConfigForm.pixKey}
                      onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, pixKey: e.target.value })}
                      placeholder="Chave para transferências"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentConfigModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 3: GERENCIAR ABAS E MÓDULOS ESPECÍFICOS DA LOJA                  */}
      {/* ====================================================================== */}
      {storeToEditModules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white">
                    Abas da Loja: {storeToEditModules.store_name}
                  </h3>
                  <p className="text-xs text-slate-400">Ative ou desative funcionalidades conforme o plano contratado.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStoreToEditModules(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {[
                { 
                  id: 'osTab', 
                  title: 'Ordens de Serviço (O.S.)', 
                  desc: 'Módulo de assistência técnica com entrada, saída, laudo técnico, testes e impressão de recibo.',
                  icon: Wrench 
                },
                { 
                  id: 'customersTab', 
                  title: 'Clientes & CRM', 
                  desc: 'Cadastro completo de clientes com histórico de compras, ordens de serviço e mensagens WhatsApp.',
                  icon: Users 
                },
                { 
                  id: 'stockTab', 
                  title: 'Estoque de Produtos', 
                  desc: 'Controle de mercadorias, código de barras, fotos, fornecedores e custo.',
                  icon: Package 
                },
                { 
                  id: 'salesTab', 
                  title: 'Vendas & PDV Frente de Caixa', 
                  desc: 'Frente de caixa rápida com leitor de código de barras, descontos e comprovantes.',
                  icon: ShoppingBag 
                },
                { 
                  id: 'fiscalTab', 
                  title: 'Módulo Fiscal (NFC-e / NF-e)', 
                  desc: 'Emissão de documentos fiscais eletrônicos homologados pela SEFAZ com regras automáticas.',
                  icon: Receipt 
                },
                { 
                  id: 'financeTab', 
                  title: 'Financeiro & Caixa Diário', 
                  desc: 'Controle de despesas, receitas, fluxo de caixa e relatórios de lucratividade.',
                  icon: DollarSign 
                },
                { 
                  id: 'aiFeature', 
                  title: 'Inteligência Artificial (IA)', 
                  desc: 'Diagnósticos automatizados e sugestões inteligentes para a assistência.',
                  icon: Sparkles 
                }
              ].map((mod) => {
                const currentFeatures = storeToEditModules.enabled_features || {};
                const isEnabled = currentFeatures[mod.id] !== false;
                const IconComponent = mod.icon;

                return (
                  <div
                    key={mod.id}
                    className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <IconComponent size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black uppercase text-white tracking-wide">
                            {mod.title}
                          </h4>
                          <Tooltip content={mod.desc}>
                            <HelpCircle size={13} className="text-slate-500 cursor-help" />
                          </Tooltip>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {mod.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStoreToEditModules({
                          ...storeToEditModules,
                          enabled_features: {
                            ...currentFeatures,
                            [mod.id]: !isEnabled,
                            // Mantém integridade para modo fiscal
                            ...(mod.id === 'fiscalTab' ? { fiscalMode: !isEnabled } : {})
                          }
                        });
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        isEnabled ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          isEnabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStoreToEditModules(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModules}
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE LOJA                                */}
      {/* ====================================================================== */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black uppercase text-white">Excluir Loja?</h3>
              <p className="text-xs text-slate-400">
                Tem certeza que deseja excluir permanentemente a loja <strong className="text-white font-black">{storeToDelete.store_name}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteStore}
                disabled={isSaving}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 5: EDITAR PREÇO DOS PLANOS DA LOJA (MENSAL, TRIMESTRAL, ANUAL)    */}
      {/* ====================================================================== */}
      {storeToEditPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white">Editar Valores dos Planos</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">{storeToEditPrice.storeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStoreToEditPrice(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Você pode personalizar os valores de todos os planos pagos para esta loja. O plano Teste é gratuito e inalterável.
              </p>

              {/* Grid de Planos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Plano Mensal */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400">Mensal (1M)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={storeToEditPrice.monthlyPrice}
                      onChange={(e) => setStoreToEditPrice({ ...storeToEditPrice, monthlyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-8 pr-2 text-xs font-black text-white outline-none focus:border-emerald-500 font-mono"
                      placeholder="79.90"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block">Cobrança a cada 30 dias</span>
                </div>

                {/* 2. Plano Trimestral */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-400">Trimestral (3M)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={storeToEditPrice.quarterlyPrice}
                      onChange={(e) => setStoreToEditPrice({ ...storeToEditPrice, quarterlyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-8 pr-2 text-xs font-black text-white outline-none focus:border-blue-500 font-mono"
                      placeholder="215.70"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block">Cobrança a cada 90 dias</span>
                </div>

                {/* 3. Plano Anual */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-purple-400">Anual (12M)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={storeToEditPrice.yearlyPrice}
                      onChange={(e) => setStoreToEditPrice({ ...storeToEditPrice, yearlyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-8 pr-2 text-xs font-black text-white outline-none focus:border-purple-500 font-mono"
                      placeholder="767.00"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block">Cobrança a cada 365 dias</span>
                </div>
              </div>

              {/* 4. Plano Teste (Inalterável / Fixo R$ 0,00) */}
              <div className="p-3.5 bg-slate-950 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Lock size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-white block">Plano Teste (Trial)</span>
                    <span className="text-[10px] text-slate-400">Período de testes inicial da loja.</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-400 font-mono block">R$ 0,00</span>
                  <span className="text-[9px] font-black uppercase text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    100% Gratuito (Fixo)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 leading-relaxed">
                ℹ️ <strong>Importante:</strong> Esses valores serão cobrados no banner de renovação da loja e refletirão nos relatórios e repasses do Super Admin ({reseller.commissionPercentage || 30}% de comissão).
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStoreToEditPrice(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStorePrice}
                disabled={isSaving}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Preços dos Planos'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
