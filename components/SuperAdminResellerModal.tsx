import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
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
  Edit3, 
  RefreshCw, 
  Percent, 
  Store, 
  CreditCard, 
  KeyRound, 
  Sparkles, 
  X, 
  Check, 
  HelpCircle, 
  ArrowRight,
  TrendingUp,
  Receipt,
  Calendar,
  Send
} from 'lucide-react';
import { Reseller, ResellerPayoutRecord } from '../types';
import { ResellerService } from '../utils/resellerService';
import { OnlineDB } from '../utils/api';
import { Tooltip } from './reseller/Tooltip';

interface SuperAdminResellerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminResellerModal: React.FC<SuperAdminResellerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'form' | 'payouts'>('list');
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [payouts, setPayouts] = useState<ResellerPayoutRecord[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantMetaMap, setTenantMetaMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Formulário de Cadastro / Edição de Revendedor
  const [editingResellerId, setEditingResellerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    commissionPercentage: 30, // Padrão 30%
    status: 'active' as 'active' | 'blocked',
    notes: ''
  });

  // Modal de Confirmação de Repasse
  const [payoutModalReseller, setPayoutModalReseller] = useState<{ reseller: Reseller; amount: number; storesRevenue: number } | null>(null);
  const [payoutNotes, setPayoutNotes] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resellersList, payoutsList, allTenants, metaMap] = await Promise.all([
        ResellerService.getResellers(),
        ResellerService.getPayouts(),
        OnlineDB.getTenants(),
        ResellerService.getTenantMetadataMap()
      ]);

      setResellers(resellersList || []);
      setPayouts(payoutsList || []);
      setTenants((allTenants || []).filter((t: any) => t.id !== 'SYSTEM' && t.id !== 'system-settings'));
      setTenantMetaMap(metaMap || {});
    } catch (e) {
      console.error('Erro ao carregar dados dos revendedores:', e);
      showToast('Erro ao carregar revendedores do banco', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Estatísticas calculadas por revendedor
  const resellerStatsMap = useMemo(() => {
    const map: Record<string, { storeCount: number; activeCount: number; totalMonthlyRevenue: number; calculatedPayout: number }> = {};

    resellers.forEach(r => {
      // Encontra lojas associadas a este revendedor
      const linkedTenants = tenants.filter(t => {
        const meta = tenantMetaMap[t.id];
        return (
          meta?.resellerId === r.id ||
          t.reseller_id === r.id ||
          meta?.resellerUsername === r.username ||
          (meta?.resellerName && meta.resellerName.toLowerCase() === r.name.toLowerCase())
        );
      });

      const storeCount = linkedTenants.length;
      const activeCount = linkedTenants.filter(t => {
        const meta = tenantMetaMap[t.id];
        const status = meta?.subscriptionStatus || t.subscription_status || 'active';
        return status === 'active' || status === 'paid';
      }).length;

      // Soma o valor das mensalidades das lojas ativas
      const totalMonthlyRevenue = linkedTenants.reduce((sum, t) => {
        const meta = tenantMetaMap[t.id];
        const price = Number(t.custom_monthly_price) || Number(meta?.monthlyPrice) || Number(t.monthly_price) || 79.90;
        return sum + price;
      }, 0);

      const calculatedPayout = (totalMonthlyRevenue * (r.commissionPercentage || 0)) / 100;

      map[r.id] = {
        storeCount,
        activeCount,
        totalMonthlyRevenue,
        calculatedPayout
      };
    });

    return map;
  }, [resellers, tenants, tenantMetaMap]);

  // Totais Gerais
  const totalStats = useMemo(() => {
    let totalStores = 0;
    let totalRevenue = 0;
    let totalPayoutsToMake = 0;

    Object.values(resellerStatsMap).forEach(st => {
      totalStores += st.storeCount;
      totalRevenue += st.totalMonthlyRevenue;
      totalPayoutsToMake += st.calculatedPayout;
    });

    return {
      totalResellers: resellers.length,
      totalStores,
      totalRevenue,
      totalPayoutsToMake
    };
  }, [resellers, resellerStatsMap]);

  const handleOpenCreateForm = () => {
    setEditingResellerId(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      phone: '',
      email: '',
      commissionPercentage: 30,
      status: 'active',
      notes: ''
    });
    setActiveTab('form');
  };

  const handleOpenEditForm = (r: Reseller) => {
    setEditingResellerId(r.id);
    setFormData({
      name: r.name,
      username: r.username,
      password: '', // Em branco para não alterar se não preenchido
      phone: r.phone || '',
      email: r.email || '',
      commissionPercentage: r.commissionPercentage || 30,
      status: r.status || 'active',
      notes: r.notes || ''
    });
    setActiveTab('form');
  };

  const handleSaveReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      showToast('Nome e Usuário de Login são obrigatórios', 'error');
      return;
    }

    if (!editingResellerId && !formData.password.trim()) {
      showToast('Informe uma senha inicial para o revendedor', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const resellerToSave: Reseller = {
        id: editingResellerId || `reseller_${Date.now()}`,
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        commissionPercentage: Number(formData.commissionPercentage) || 0,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        createdAt: editingResellerId 
          ? (resellers.find(r => r.id === editingResellerId)?.createdAt || new Date().toISOString())
          : new Date().toISOString()
      };

      const result = await ResellerService.saveReseller(resellerToSave);
      if (!result.success) {
        showToast(result.message || 'Erro ao salvar revendedor', 'error');
        return;
      }

      showToast(editingResellerId ? 'Revendedor atualizado com sucesso!' : 'Novo revendedor cadastrado com sucesso!', 'success');
      await loadData();
      setActiveTab('list');
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message || 'Falha de rede'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (r: Reseller) => {
    const nextStatus = r.status === 'active' ? 'blocked' : 'active';
    try {
      const updated: Reseller = { ...r, status: nextStatus };
      const res = await ResellerService.saveReseller(updated);
      if (res.success) {
        setResellers(prev => prev.map(item => item.id === r.id ? updated : item));
        showToast(`Revendedor ${nextStatus === 'blocked' ? 'bloqueado' : 'ativado'} com sucesso!`, 'success');
      }
    } catch (e) {
      showToast('Erro ao alterar status do revendedor', 'error');
    }
  };

  const handleDeleteReseller = async (r: Reseller) => {
    if (!confirm(`Tem certeza que deseja excluir o revendedor "${r.name}" (@${r.username})? As lojas criadas permanecerão no sistema.`)) {
      return;
    }

    try {
      const res = await ResellerService.deleteReseller(r.id);
      if (res.success) {
        setResellers(prev => prev.filter(item => item.id !== r.id));
        showToast(`Revendedor "${r.name}" excluído com sucesso.`, 'success');
      } else {
        showToast(res.message || 'Erro ao excluir revendedor', 'error');
      }
    } catch (e) {
      showToast('Erro ao excluir revendedor', 'error');
    }
  };

  const handleConfirmPayout = async () => {
    if (!payoutModalReseller) return;
    const { reseller, amount, storesRevenue } = payoutModalReseller;

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const newRecord: ResellerPayoutRecord = {
        id: `payout_${Date.now()}`,
        resellerId: reseller.id,
        resellerName: reseller.name,
        month: currentMonth,
        totalStoresRevenue: storesRevenue,
        commissionPercentage: reseller.commissionPercentage,
        payoutAmount: amount,
        status: 'paid',
        paidAt: now.toISOString(),
        notes: payoutNotes.trim() || undefined
      };

      const res = await ResellerService.savePayout(newRecord);
      if (res.success) {
        setPayouts(prev => [newRecord, ...prev]);
        showToast(`Repasse de R$ ${amount.toFixed(2)} registrado com sucesso para ${reseller.name}!`, 'success');
        setPayoutModalReseller(null);
        setPayoutNotes('');
      } else {
        showToast(res.message || 'Erro ao registrar repasse', 'error');
      }
    } catch (e) {
      showToast('Erro ao processar repasse', 'error');
    }
  };

  if (!isOpen) return null;

  const filteredResellers = resellers.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.username.toLowerCase().includes(term) ||
      (r.phone && r.phone.includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Toast Notificação */}
        {toastMessage && (
          <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-black uppercase tracking-wider animate-in slide-in-from-top-2 ${
            toastMessage.type === 'success' 
              ? 'bg-slate-900 text-emerald-400 border-emerald-500/50' 
              : 'bg-red-950 text-red-300 border-red-500/50'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Gestão & Repasse de Revendedores
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre logins de revendedores, programe a porcentagem de repasse e controle seus pagamentos mensais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Novo Revendedor</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="px-6 bg-slate-900 border-b border-slate-800 flex items-center gap-6 overflow-x-auto text-xs font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={15} />
            <span>Revendedores ({resellers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 size={15} />
            <span>{editingResellerId ? 'Editar Revendedor' : 'Cadastrar Revendedor'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'payouts'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt size={15} />
            <span>Histórico de Repasses ({payouts.length})</span>
          </button>
        </div>

        {/* Conteúdo Principal Scrollável */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* ABA 1: LISTAGEM DE REVENDEDORES & REPASSES */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Revendedores</span>
                  <p className="text-xl font-black text-white mt-1">{totalStats.totalResellers}</p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lojas Gerenciadas</span>
                  <p className="text-xl font-black text-blue-400 mt-1">{totalStats.totalStores}</p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Faturamento Mensal Lojas</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">R$ {totalStats.totalRevenue.toFixed(2)}</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-800/80 border border-indigo-500/30 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Repasses Devidos aos Revendedores</span>
                  <p className="text-xl font-black text-indigo-400 mt-1">R$ {totalStats.totalPayoutsToMake.toFixed(2)}</p>
                </div>
              </div>

              {/* Barra de Busca e Filtro */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, usuário ou fone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-2 cursor-pointer self-stretch sm:self-auto justify-center"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-400' : 'text-slate-400'} />
                  <span>Atualizar</span>
                </button>
              </div>

              {/* Lista de Revendedores */}
              {isLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw size={32} className="animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-xs font-bold uppercase tracking-wider">Carregando dados dos revendedores...</p>
                </div>
              ) : filteredResellers.length === 0 ? (
                <div className="py-16 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl p-8">
                  <Users size={48} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Nenhum revendedor encontrado</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Cadastre o primeiro parceiro para começar a delegar a criação de lojas e programar comissões automáticas.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/20"
                  >
                    Cadastrar Revendedor Agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredResellers.map(r => {
                    const st = resellerStatsMap[r.id] || { storeCount: 0, activeCount: 0, totalMonthlyRevenue: 0, calculatedPayout: 0 };
                    const isBlocked = r.status === 'blocked';

                    return (
                      <div 
                        key={r.id} 
                        className={`bg-slate-800/50 border rounded-2xl p-5 transition-all hover:border-slate-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                          isBlocked ? 'border-red-500/30 bg-red-950/10 opacity-75' : 'border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border ${
                            isBlocked 
                              ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {r.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-black text-white">{r.name}</h3>
                              <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                @{r.username}
                              </span>
                              {isBlocked ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                  Bloqueado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Ativo
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              {r.phone && <span>WhatsApp: <strong>{r.phone}</strong></span>}
                              {r.email && <span>E-mail: <strong>{r.email}</strong></span>}
                              <span>Cadastro: <strong>{new Date(r.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                            </div>

                            {r.notes && (
                              <p className="text-[11px] text-slate-400 italic mt-1">"{r.notes}"</p>
                            )}
                          </div>
                        </div>

                        {/* Bloco de Valores & Comissão Programada */}
                        <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60">
                          {/* Percentagem de Comissão */}
                          <div className="text-center px-3 border-r border-slate-800">
                            <Tooltip content="Porcentagem de lucro fixada por você para este revendedor sobre o total das lojas dele.">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1 cursor-help">
                                Repasse <HelpCircle size={10} className="text-slate-500" />
                              </span>
                            </Tooltip>
                            <p className="text-sm font-black text-indigo-400 mt-0.5">{r.commissionPercentage}%</p>
                          </div>

                          {/* Lojas Ativas */}
                          <div className="text-center px-3 border-r border-slate-800">
                            <Tooltip content="Quantidade total de lojas criadas e cadastradas por este revendedor.">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1 cursor-help">
                                Lojas <HelpCircle size={10} className="text-slate-500" />
                              </span>
                            </Tooltip>
                            <p className="text-sm font-black text-white mt-0.5">{st.activeCount} <span className="text-[10px] text-slate-500">/ {st.storeCount}</span></p>
                          </div>

                          {/* Faturamento Lojas */}
                          <div className="text-center px-3 border-r border-slate-800">
                            <Tooltip content="Faturamento mensal total gerado pelas lojas ativas do revendedor.">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1 cursor-help">
                                Faturamento <HelpCircle size={10} className="text-slate-500" />
                              </span>
                            </Tooltip>
                            <p className="text-sm font-black text-emerald-400 mt-0.5">R$ {st.totalMonthlyRevenue.toFixed(2)}</p>
                          </div>

                          {/* Valor a Pagar ao Revendedor */}
                          <div className="text-center px-3">
                            <Tooltip content="Valor exato a ser repassado ao revendedor no fechamento deste mês com base na percentagem programada.">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1 cursor-help">
                                Pagar a Ele <HelpCircle size={10} className="text-amber-400" />
                              </span>
                            </Tooltip>
                            <p className="text-sm font-black text-amber-400 mt-0.5">R$ {st.calculatedPayout.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                          <Tooltip content="Registrar repasse de pagamento efetuado (PIX ou transferência) para arquivar no histórico.">
                            <button
                              type="button"
                              onClick={() => setPayoutModalReseller({ reseller: r, amount: st.calculatedPayout, storesRevenue: st.totalMonthlyRevenue })}
                              className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <DollarSign size={14} />
                              <span>Pagar</span>
                            </button>
                          </Tooltip>

                          <Tooltip content="Editar dados cadastrais, redefinir senha ou alterar a percentagem de comissão deste revendedor.">
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(r)}
                              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                            >
                              <Edit3 size={15} />
                            </button>
                          </Tooltip>

                          <Tooltip content={isBlocked ? "Desbloquear o acesso deste revendedor ao painel." : "Bloquear o acesso deste revendedor imediatamente."}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(r)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isBlocked
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                              }`}
                            >
                              {isBlocked ? <Unlock size={15} /> : <Lock size={15} />}
                            </button>
                          </Tooltip>

                          <Tooltip content="Excluir o revendedor do sistema. As lojas continuarão salvas.">
                            <button
                              type="button"
                              onClick={() => handleDeleteReseller(r)}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          {activeTab === 'form' && (
            <form onSubmit={handleSaveReseller} className="space-y-6 max-w-2xl mx-auto bg-slate-800/40 p-6 sm:p-8 rounded-3xl border border-slate-700/70">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    {editingResellerId ? 'Editar Cadastro do Revendedor' : 'Cadastrar Novo Revendedor no Sistema'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Preencha as credenciais de login e a porcentagem de lucro exclusiva dele.
                  </p>
                </div>
                <span className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">
                  <Percent size={18} />
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome do Revendedor */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Nome Completo / Empresa</span>
                    <Tooltip content="Nome que identificará este revendedor no sistema e nas lojas geradas por ele.">
                      <HelpCircle size={12} className="text-slate-500 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Silva ou TecnoRevenda"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Usuário de Login */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Usuário de Login</span>
                    <Tooltip content="Login único para o revendedor acessar a página dele de dashboard e gerenciar suas lojas.">
                      <HelpCircle size={12} className="text-slate-500 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: joao.revenda"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Senha de Acesso {editingResellerId && '(Deixe em branco para manter)'}</span>
                    <Tooltip content="Senha que o revendedor utilizará para entrar no painel de revenda.">
                      <HelpCircle size={12} className="text-slate-500 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="password"
                    required={!editingResellerId}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Porcentagem de Repasse Programada */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Porcentagem de Repasse (%)</span>
                    <Tooltip content="Porcentagem do valor das mensalidades que será repassada a este revendedor. O restante fica com você. Ex: 30% em R$ 100 = R$ 30 para o revendedor e R$ 70 para você.">
                      <HelpCircle size={12} className="text-amber-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      required
                      value={formData.commissionPercentage}
                      onChange={e => setFormData({ ...formData, commissionPercentage: Number(e.target.value) })}
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-900/90 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-black focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400">%</span>
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>WhatsApp / Contato</span>
                    <Tooltip content="Número de telefone com DDD do revendedor para envio de avisos ou comprovantes de repasse.">
                      <HelpCircle size={12} className="text-slate-500 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Status de Acesso</span>
                    <Tooltip content="Se definido como Bloqueado, o revendedor não conseguirá logar no painel de revenda.">
                      <HelpCircle size={12} className="text-slate-500 cursor-help" />
                    </Tooltip>
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Ativo (Acesso Liberado)</option>
                    <option value="blocked">Bloqueado (Acesso Negado)</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>Observações Internas (Opcional)</span>
                  <Tooltip content="Anotações visíveis apenas para você (Super Admin), como dados bancários ou acordos especiais.">
                    <HelpCircle size={12} className="text-slate-500 cursor-help" />
                  </Tooltip>
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Pagar via Pix chave CPF todo dia 05."
                  className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                  <span>{editingResellerId ? 'Atualizar Revendedor' : 'Cadastrar Revendedor'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ABA 3: HISTÓRICO DE REPASSES PAGOS */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Histórico de Repasses Efetuados</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Comprovantes e registros de comissões pagas aos revendedores.</p>
                </div>
              </div>

              {payouts.length === 0 ? (
                <div className="py-14 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl p-6">
                  <Receipt size={40} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Nenhum repasse registrado ainda</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quando efetuar o pagamento da comissão a um revendedor, clique no botão "Pagar" na listagem para arquivar aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payouts.map(p => (
                    <div 
                      key={p.id}
                      className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{p.resellerName}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Mês {p.month}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Faturamento das Lojas: <strong>R$ {p.totalStoresRevenue.toFixed(2)}</strong> • Comissão: <strong>{p.commissionPercentage}%</strong>
                          </p>
                          {p.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">"{p.notes}"</p>}
                        </div>
                      </div>

                      <div className="text-right self-stretch sm:self-auto flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-xs font-black text-emerald-400">R$ {p.payoutAmount.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          {p.paidAt ? new Date(p.paidAt).toLocaleString('pt-BR') : 'Pago'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal de Confirmação de Repasse */}
        {payoutModalReseller && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-emerald-400" size={20} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Registrar Repasse Pago</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setPayoutModalReseller(null)} 
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Revendedor:</span>
                  <span className="font-black text-white">{payoutModalReseller.reseller.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Faturamento das Lojas:</span>
                  <span className="font-black text-emerald-400">R$ {payoutModalReseller.storesRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Comissão Definida:</span>
                  <span className="font-black text-indigo-400">{payoutModalReseller.reseller.commissionPercentage}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 text-sm">
                  <span className="font-bold text-white">Valor a Repassar:</span>
                  <span className="font-black text-amber-400">R$ {payoutModalReseller.amount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observações do Pagamento (Opcional):
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  placeholder="Ex: Pago via Pix às 14:30 chave CPF..."
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalReseller(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayout}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <Check size={14} />
                  <span>Confirmar Pagamento</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
