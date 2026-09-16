import React, { useState } from 'react';
import { Sparkles, Check, Zap, ShieldCheck, X, Loader2, ArrowRight, Smartphone } from 'lucide-react';
import { OnlineDB } from '../utils/api';

interface AICreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  storeName: string;
  currentCredits: number;
  onCreditsUpdated?: (newCredits: number) => void;
}

interface AICreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  bonus?: string;
  description: string;
}

const AI_PACKAGES: AICreditPackage[] = [
  {
    id: 'ai_credits_50',
    name: 'Pacote Básico',
    credits: 50,
    price: 14.90,
    description: 'Ideal para reposição rápida e cadastros pontuais da semana.',
  },
  {
    id: 'ai_credits_150',
    name: 'Pacote Pro',
    credits: 150,
    price: 29.90,
    popular: true,
    bonus: 'Mais Vendido',
    description: 'Excelente para quem recebe mercadorias semanalmente. Menos de R$ 0,20 por leitura.',
  },
  {
    id: 'ai_credits_500',
    name: 'Pacote Ilimitado',
    credits: 500,
    price: 69.90,
    bonus: 'Super Econômico',
    description: 'Catálogo completo, caixas de atacado e alta demanda diária sem interrupções.',
  },
];

export const AICreditsModal: React.FC<AICreditsModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  storeName,
  currentCredits,
  onCreditsUpdated,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuyPackage = async (pkg: AICreditPackage) => {
    setLoadingId(pkg.id);
    setError(null);
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Créditos de IA Lojas Cloud - ${pkg.credits} Consultas`,
          unit_price: pkg.price,
          quantity: 1,
          tenantId,
          planType: pkg.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar pagamento com Mercado Pago.');
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('Link de pagamento não recebido.');
      }
    } catch (err: any) {
      console.error('Erro ao comprar créditos de IA:', err);
      setError(err?.message || 'Não foi possível iniciar o pagamento.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[250] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 pb-4 relative border-b border-slate-100/80 shrink-0 bg-gradient-to-b from-blue-50/50 to-transparent">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Lojas Cloud AI</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                Créditos de Inteligência Artificial
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <p className="text-xs text-slate-500 font-medium">
              Loja: <strong className="text-slate-800">{storeName}</strong>
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black">
              <Zap size={13} className="text-blue-600" />
              <span>Saldo Atual: {currentCredits} créditos</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-4 overflow-y-auto flex-1">
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500 shrink-0" />
              Como funcionam os créditos de IA na sua loja?
            </p>
            <p className="text-[11px] leading-relaxed">
              O sistema conta com cota gratuita com múltiplos modelos alternativos. Quando a cota do dia atinge o limite ou quando você quer garantia absoluta de resposta sem filas ou esperas, seus <strong>créditos pagos prioritários</strong> são ativados automaticamente.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500"><X size={14} /></button>
            </div>
          )}

          {/* Cards de Pacotes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {AI_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-4 flex flex-col justify-between border-2 transition-all ${
                  pkg.popular
                    ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {pkg.bonus && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm">
                    {pkg.bonus}
                  </div>
                )}

                <div className="pt-1">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">{pkg.name}</h3>
                  <div className="mt-2 mb-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      R$ {pkg.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-xs font-black text-blue-600 mb-2">
                    +{pkg.credits} leituras com IA
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {pkg.description}
                  </p>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    type="button"
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={loadingId !== null}
                    className={`w-full py-2.5 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                      pkg.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {loadingId === pkg.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>Adicionar</span>
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center text-[10px] text-slate-400 font-medium">
            Pagamento instantâneo via Pix ou Cartão processado pelo Mercado Pago. Os créditos nunca expiram e ficam salvos na sua loja.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Pagamento Seguro Mercado Pago</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
