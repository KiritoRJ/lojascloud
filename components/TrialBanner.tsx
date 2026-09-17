import React, { useState, useMemo } from 'react';
import { Sparkles, Clock, ArrowRight, ShieldAlert, X } from 'lucide-react';

interface TrialBannerProps {
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  onOpenSubscription: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  subscriptionStatus,
  subscriptionExpiresAt,
  onOpenSubscription
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Calcula se está em período de teste
  const isTrial = subscriptionStatus === 'trial';

  // Calcula os dias restantes
  const daysRemaining = useMemo(() => {
    if (!subscriptionExpiresAt) return null;
    try {
      const expDate = new Date(subscriptionExpiresAt);
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return days;
    } catch {
      return null;
    }
  }, [subscriptionExpiresAt]);

  const formattedDate = useMemo(() => {
    if (!subscriptionExpiresAt) return null;
    try {
      return new Date(subscriptionExpiresAt).toLocaleDateString('pt-BR');
    } catch {
      return null;
    }
  }, [subscriptionExpiresAt]);

  // Se não for teste ou se foi fechado temporariamente, não renderiza
  if (!isTrial || isDismissed) {
    return null;
  }

  const isUrgent = daysRemaining !== null && daysRemaining <= 2;

  return (
    <div
      id="trial-banner"
      className={`w-full border-b px-4 py-2.5 sm:py-2 flex items-center justify-between shadow-xs transition-all z-20 ${
        isUrgent
          ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white border-amber-500'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-indigo-800/40'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 mr-2">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isUrgent ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400 border border-blue-400/20'
          }`}
        >
          {isUrgent ? (
            <ShieldAlert size={16} className="animate-pulse" />
          ) : (
            <Sparkles size={16} className="text-amber-300" />
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase tracking-wider shrink-0">
              <Clock size={10} />
              {daysRemaining !== null
                ? daysRemaining <= 0
                  ? 'Último dia de teste'
                  : `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`
                : 'Plano de Teste'}
            </span>
            <span className="font-bold text-xs text-white truncate">
              Você está utilizando o plano de teste gratuito.
            </span>
          </div>
          {formattedDate && (
            <span className="text-[10px] text-slate-300 font-medium hidden md:inline">
              Vence em <strong className="text-white">{formattedDate}</strong>. Não perca seus cadastros e histórico.
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          id="btn-assinar-plano-banner"
          onClick={onOpenSubscription}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
            isUrgent
              ? 'bg-white text-orange-700 hover:bg-orange-50 ring-2 ring-white/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20'
          }`}
        >
          <span>Assinar Plano</span>
          <ArrowRight size={13} className="shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Fechar aviso temporariamente"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
