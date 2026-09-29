import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Phone, 
  Search, 
  TrendingUp, 
  Store, 
  Send, 
  ShieldCheck, 
  CreditCard, 
  RefreshCw, 
  Plus, 
  HelpCircle,
  ArrowUpRight,
  Filter,
  Check,
  Percent
} from 'lucide-react';
import { OnlineDB } from '../utils/api';
import { Tooltip } from './reseller/Tooltip';

interface SuperAdminFinancialDashboardProps {
  tenants: any[];
  onRefresh: () => void;
  onOpenEditPrices: (tenant: { id: string; name: string; monthly?: number; quarterly?: number; yearly?: number }) => void;
  onOpenEditSub: (tenant: { id: string; name: string; expiresAt: string; status: string; planType?: string }) => void;
  formatDateBR: (dateStr: string | null | undefined) => string;
}

export const SuperAdminFinancialDashboard: React.FC<SuperAdminFinancialDashboardProps> = ({
  tenants,
  onRefresh,
  onOpenEditPrices,
  onOpenEditSub,
  formatDateBR
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'warning' | 'expired' | 'trial'>('all');
  const [processingTenantId, setProcessingTenantId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Classifica a situação de pagamento de cada loja
  const enrichedTenants = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return tenants.map(t => {
      const expiresAt = t.subscription_expires_at ? new Date(t.subscription_expires_at) : null;
      const isTrial = t.subscription_status === 'trial';
      const monthlyPrice = Number(t.custom_monthly_price) || 79.90;

      let paymentCategory: 'paid' | 'warning' | 'expired' | 'trial' = 'expired';
      let daysRemaining = 0;

      if (isTrial) {
        paymentCategory = 'trial';
      } else if (expiresAt) {
        const diffTime = expiresAt.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining > 7) {
          paymentCategory = 'paid'; // Em dia com mais de 7 dias
        } else if (daysRemaining >= 0 && daysRemaining <= 7) {
          paymentCategory = 'warning'; // A vencer nos próximos 7 dias
        } else {
          paymentCategory = 'expired'; // Vencida
        }
      }

      return {
        ...t,
        monthlyPrice,
        daysRemaining,
        paymentCategory
      };
    });
  }, [tenants]);

  // Métricas Consolidadas
  const financialMetrics = useMemo(() => {
    let totalMRR = 0;
    let paidCount = 0;
    let paidRevenue = 0;
    let warningCount = 0;
    let warningRevenue = 0;
    let expiredCount = 0;
    let expiredRevenue = 0;
    let trialCount = 0;

    enrichedTenants.forEach(t => {
      totalMRR += t.monthlyPrice;

      if (t.paymentCategory === 'paid') {
        paidCount++;
        paidRevenue += t.monthlyPrice;
      } else if (t.paymentCategory === 'warning') {
        warningCount++;
        warningRevenue += t.monthlyPrice;
      } else if (t.paymentCategory === 'expired') {
        expiredCount++;
        expiredRevenue += t.monthlyPrice;
      } else if (t.paymentCategory === 'trial') {
        trialCount++;
      }
    });

    return {
      totalMRR,
      paidCount,
      paidRevenue,
      warningCount,
      warningRevenue,
      expiredCount,
      expiredRevenue,
      trialCount,
      totalTenants: enrichedTenants.length
    };
  }, [enrichedTenants]);

  // Filtro
  const filteredTenants = useMemo(() => {
    return enrichedTenants.filter(t => {
      const matchesStatus = statusFilter === 'all' || t.paymentCategory === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        t.store_name?.toLowerCase().includes(term) ||
        t.id?.toLowerCase().includes(term) ||
        (t.phone_number && t.phone_number.includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [enrichedTenants, statusFilter, searchTerm]);

  // Ação rápida: Registrar pagamento e adicionar +30 dias
  const handleQuickAdd30Days = async (tenant: any) => {
    setProcessingTenantId(tenant.id);
    try {
      const now = new Date();
      const currentExpiry = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : now;
      const baseDate = currentExpiry > now ? currentExpiry : now;
      
      baseDate.setDate(baseDate.getDate() + 30);
      const newExpiryStr = baseDate.toISOString();

      await OnlineDB.setSubscriptionDate(tenant.id, newExpiryStr, 'active', tenant.last_plan_type || 'monthly');
      showToast(`✅ Pagamento confirmado! Mensalidade de ${tenant.store_name} estendida até ${formatDateBR(newExpiryStr)}`);
      onRefresh();
    } catch (e: any) {
      alert(`Erro ao registrar pagamento: ${e?.message || 'Falha de conexão'}`);
    } finally {
      setProcessingTenantId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-emerald-400 border border-emerald-500/50 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-black uppercase tracking-wider animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header do Dashboard Financeiro */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black shadow-lg shadow-emerald-500/10">
              <DollarSign size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Dashboard Financeiro das Lojas
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gestão de Mensalidades
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhe lojas adimplentes, valores recebidos, mensalidades a vencer e cobranças automáticas.
              </p>
            </div>
          </div>

          <Tooltip content="Atualiza as informações de faturamento e status de pagamento de todas as lojas diretamente do banco.">
            <button
              type="button"
              onClick={onRefresh}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className="text-blue-400" />
              <span>Sincronizar Dados</span>
            </button>
          </Tooltip>
        </div>

        {/* 4 Cards de Métricas Financeiras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
          
          {/* Card 1: MRR Total */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MRR Mensal Potencial</span>
              <Tooltip content="Soma dos valores das mensalidades de todas as lojas cadastradas na sua plataforma.">
                <HelpCircle size={12} className="text-slate-500 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-xl font-black text-white mt-1">R$ {financialMetrics.totalMRR.toFixed(2)}</p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{financialMetrics.totalTenants} lojas no total</span>
          </div>

          {/* Card 2: Mensalidades em Dia (Pagas) */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Mensalidades em Dia</span>
              <Tooltip content="Lojas que pagaram a assinatura e têm mais de 7 dias de validade ativa.">
                <CheckCircle2 size={14} className="text-emerald-400 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-xl font-black text-emerald-400 mt-1">R$ {financialMetrics.paidRevenue.toFixed(2)}</p>
            <span className="text-[10px] text-emerald-500/80 mt-0.5 block">
              <strong>{financialMetrics.paidCount}</strong> lojas adimplentes
            </span>
          </div>

          {/* Card 3: A Vencer em Breve (< 7 dias) */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Vence em Menos de 7 Dias</span>
              <Tooltip content="Lojas com mensalidade preste a vencer nesta semana. Bom momento para enviar lembrete no WhatsApp.">
                <AlertTriangle size={14} className="text-amber-400 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-xl font-black text-amber-400 mt-1">R$ {financialMetrics.warningRevenue.toFixed(2)}</p>
            <span className="text-[10px] text-amber-500/80 mt-0.5 block">
              <strong>{financialMetrics.warningCount}</strong> lojas para cobrar
            </span>
          </div>

          {/* Card 4: Vencidas / Expiradas */}
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Mensalidades Vencidas</span>
              <Tooltip content="Lojas que não renovaram a assinatura e estão com acesso expirado ou pendente de quitação.">
                <Clock size={14} className="text-red-400 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-xl font-black text-red-400 mt-1">R$ {financialMetrics.expiredRevenue.toFixed(2)}</p>
            <span className="text-[10px] text-red-500/80 mt-0.5 block">
              <strong>{financialMetrics.expiredCount}</strong> lojas vencidas
            </span>
          </div>

        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Pílulas de Filtro de Situação */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs font-bold">
          
          <Tooltip content="Exibir todas as lojas sem distinção de status financeiro.">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-white'
              }`}
            >
              Todas ({enrichedTenants.length})
            </button>
          </Tooltip>

          <Tooltip content="Filtrar apenas lojas que pagaram a mensalidade e estão rigorosamente em dia.">
            <button
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Em Dia ({financialMetrics.paidCount})</span>
            </button>
          </Tooltip>

          <Tooltip content="Filtrar lojas que vencem nos próximos 7 dias para envio de lembrete de renovação.">
            <button
              type="button"
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'warning'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-amber-400'
              }`}
            >
              <AlertTriangle size={13} className="text-amber-400" />
              <span>A Vencer ({financialMetrics.warningCount})</span>
            </button>
          </Tooltip>

          <Tooltip content="Filtrar lojas com mensalidade atrasada ou vencida.">
            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'expired'
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-red-400'
              }`}
            >
              <Clock size={13} className="text-red-400" />
              <span>Vencidas ({financialMetrics.expiredCount})</span>
            </button>
          </Tooltip>

          <Tooltip content="Filtrar lojas novas que ainda estão em período de teste gratuito (Trial).">
            <button
              type="button"
              onClick={() => setStatusFilter('trial')}
              className={`px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                statusFilter === 'trial'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-purple-400'
              }`}
            >
              Em Teste ({financialMetrics.trialCount})
            </button>
          </Tooltip>

        </div>

        {/* Input de Busca */}
        <div className="relative w-full lg:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por loja ou ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

      </div>

      {/* Lista de Lojas com Controle Financeiro */}
      <div className="space-y-3">
        {filteredTenants.length === 0 ? (
          <div className="py-16 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl p-6">
            <Store size={40} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Nenhuma loja encontrada nesta categoria</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Altere o filtro de situação ou digite outro termo na pesquisa.</p>
          </div>
        ) : (
          filteredTenants.map(t => {
            const isProcessing = processingTenantId === t.id;

            return (
              <div
                key={t.id}
                className="bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 p-4 sm:p-5 rounded-2xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Lado Esquerdo: Identificação da Loja */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center font-black text-blue-400 shrink-0 overflow-hidden">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.store_name} className="w-full h-full object-cover" />
                    ) : (
                      <Store size={20} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-white uppercase truncate">{t.store_name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {t.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                      <span>Plano: <strong className="text-slate-300">{t.last_plan_type === 'yearly' ? 'Anual' : t.last_plan_type === 'quarterly' ? 'Trimestral' : 'Mensal'}</strong></span>
                      <span>•</span>
                      <span>Valor: <strong className="text-emerald-400">R$ {t.monthlyPrice.toFixed(2)}/mês</strong></span>
                      <span>•</span>
                      <span>Vencimento: <strong className={t.paymentCategory === 'expired' ? 'text-red-400' : 'text-slate-300'}>{formatDateBR(t.subscription_expires_at)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Centro: Badge de Situação de Pagamento */}
                <div className="flex items-center gap-2 self-start md:self-center">
                  {t.paymentCategory === 'paid' && (
                    <Tooltip content={`Esta loja pagou a mensalidade e possui mais ${t.daysRemaining} dias de acesso ativo garantido.`}>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-help">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Em Dia ({t.daysRemaining}d)</span>
                      </span>
                    </Tooltip>
                  )}

                  {t.paymentCategory === 'warning' && (
                    <Tooltip content={`Atenção: A mensalidade desta loja vence em ${t.daysRemaining} dias. Envie um lembrete para renovar antes do bloqueio.`}>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-help">
                        <AlertTriangle size={13} className="text-amber-400" />
                        <span>Vence em {t.daysRemaining}d</span>
                      </span>
                    </Tooltip>
                  )}

                  {t.paymentCategory === 'expired' && (
                    <Tooltip content="A mensalidade desta loja está vencida. O sistema exibe o aviso de bloqueio na entrada.">
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-help">
                        <Clock size={13} className="text-red-400" />
                        <span>Mensalidade Vencida</span>
                      </span>
                    </Tooltip>
                  )}

                  {t.paymentCategory === 'trial' && (
                    <Tooltip content="Loja em fase de testes gratuitos iniciais de 7 dias.">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-help">
                        <span>Período de Teste</span>
                      </span>
                    </Tooltip>
                  )}
                </div>

                {/* Lado Direito: Ações Rápidas de Pagamento e Cobrança */}
                <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-slate-700/60 pt-3 md:pt-0">
                  
                  {/* Botão Registrar Pagamento (+30 dias) */}
                  <Tooltip content="Registra a quitação da mensalidade da loja com 1 clique, estendendo a validade por mais 30 dias automaticamente.">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleQuickAdd30Days(t)}
                      className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                      <span>+30 Dias (Pago)</span>
                    </button>
                  </Tooltip>

                  {/* Botão Enviar Cobrança via WhatsApp */}
                  {t.phone_number && (
                    <Tooltip content="Abrir WhatsApp com mensagem profissional pronta lembrando o lojista do valor e vencimento da mensalidade.">
                      <a
                        href={`https://wa.me/55${t.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá, ${t.store_name}! Tudo bem?\n\nPassando para enviar o lembrete da sua mensalidade do sistema no valor de R$ ${t.monthlyPrice.toFixed(2)} com vencimento em ${formatDateBR(t.subscription_expires_at)}.\n\nQualquer dúvida sobre a renovação, estamos à disposição!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700 transition-all flex items-center justify-center cursor-pointer"
                      >
                        <Phone size={15} />
                      </a>
                    </Tooltip>
                  )}

                  {/* Botão Ajustar Preço */}
                  <Tooltip content="Configurar valor customizado da mensalidade desta loja específica.">
                    <button
                      type="button"
                      onClick={() => onOpenEditPrices({
                        id: t.id,
                        name: t.store_name,
                        monthly: t.custom_monthly_price,
                        quarterly: t.custom_quarterly_price,
                        yearly: t.custom_yearly_price
                      })}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                    >
                      <DollarSign size={15} />
                    </button>
                  </Tooltip>

                  {/* Botão Editar Data / Plano Completo */}
                  <Tooltip content="Abrir calendário para definir uma data de vencimento manual ou trocar o plano.">
                    <button
                      type="button"
                      onClick={() => onOpenEditSub({
                        id: t.id,
                        name: t.store_name,
                        expiresAt: t.subscription_expires_at || new Date().toISOString(),
                        status: t.subscription_status || 'trial',
                        planType: t.last_plan_type
                      })}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                    >
                      <Calendar size={15} />
                    </button>
                  </Tooltip>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
