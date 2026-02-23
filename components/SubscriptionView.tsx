
import React, { useState } from 'react';
import { CreditCard, Check, ShieldCheck, Clock, Calendar, Smartphone, LogOut, Loader2 } from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { OnlineDB } from '../utils/api';

initMercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || '', { locale: 'pt-BR' });

interface SubscriptionViewProps {
  tenantId: string;
  storeName: string;
  expiresAt: string;
  customMonthlyPrice?: number;
  customQuarterlyPrice?: number;
  customYearlyPrice?: number;
  onLogout: () => void;
  onSuccess: (newExpiresAt: string) => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ 
  tenantId, storeName, expiresAt, onLogout, onSuccess,
  customMonthlyPrice, customQuarterlyPrice, customYearlyPrice
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [globalPlans, setGlobalPlans] = React.useState({ monthly: 49.90, quarterly: 129.90, yearly: 499.00 });
        const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  React.useEffect(() => {
    OnlineDB.getGlobalSettings().then(setGlobalPlans);
  }, []);

  const getPrice = (id: string) => {
    if (id === 'monthly') return customMonthlyPrice || globalPlans.monthly;
    if (id === 'quarterly') return customQuarterlyPrice || globalPlans.quarterly;
    if (id === 'yearly') return customYearlyPrice || globalPlans.yearly;
    return 0;
  };

  const plans = [
    {
      id: 'monthly',
      name: 'Plano Mensal',
      price: `R$ ${getPrice('monthly').toFixed(2).replace('.', ',')}`,
      period: 'por mês',
      features: ['Acesso total ao sistema', 'Suporte prioritário', 'Sincronização em nuvem', 'Backup diário'],
      months: 1
    },
    {
      id: 'quarterly',
      name: 'Plano Trimestral',
      price: `R$ ${getPrice('quarterly').toFixed(2).replace('.', ',')}`,
      period: 'por 3 meses',
      discount: 'Mais vantajoso',
      features: ['Tudo do plano mensal', 'Economia garantida', 'Ideal para pequenas empresas'],
      months: 3,
      popular: true
    },
    {
      id: 'yearly',
      name: 'Plano Anual',
      price: `R$ ${getPrice('yearly').toFixed(2).replace('.', ',')}`,
      period: 'por ano',
      discount: 'Melhor custo-benefício',
      features: ['Tudo do plano trimestral', 'Desconto exclusivo', 'Garantia de preço por 1 ano', 'Acesso antecipado'],
      months: 12
    }
  ];

  const handlePayment = (plan: any) => {
    setSelectedPlan(plan);
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
    return new Promise<void>((resolve, reject) => {
      fetch('/api/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          tenantId,
          planType: selectedPlan.id
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response Text:', errorText);
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse JSON, raw response:', text);
            throw new Error('Received non-JSON response from server');
          }
        })
        .then((data) => {
          // If it's a PIX payment, store the data to show the QR code
          if (data.payment_method_id === 'pix' && data.status === 'pending') {
            setPixPayment(data);
          } else if (data.status === 'approved') {
            // Handle approved card payments
            setTimeout(() => {
              const newDate = new Date();
              newDate.setMonth(newDate.getMonth() + selectedPlan.months);
              onSuccess(newDate.toISOString());
            }, 3000);
          }
          // For all successful API calls, resolve the promise to let the Brick know.
          resolve();
        })
        .catch((error) => {
          console.error('Payment error:', error);
          reject();
        });
    });
  };

  const onError = async (error: any) => {
    console.error('Payment Brick error:', error);
  };

  const onReady = async () => {
    console.log('Payment Brick ready');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

    if (pixPayment) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/50 border-2 border-slate-800 rounded-[2.5rem] p-8 text-center">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Pague com PIX para Ativar</h2>
          <p className="text-slate-400 mb-6">Escaneie o QR Code abaixo com o app do seu banco para concluir a assinatura.</p>
          
          <div className="bg-white p-4 rounded-xl inline-block mb-6">
            <img 
              src={`data:image/png;base64,${pixPayment.point_of_interaction.transaction_data.qr_code_base64}`}
              alt="PIX QR Code"
              className="w-64 h-64"
            />
          </div>

          <div className="mb-6">
            <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Ou copie o código PIX:</label>
            <input 
              type="text"
              readOnly
              value={pixPayment.point_of_interaction.transaction_data.qr_code}
              className="w-full bg-slate-950 text-white text-sm rounded-lg p-3 mt-2 text-center font-mono break-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>

          <p className="text-xs text-slate-500">Após o pagamento, seu acesso será liberado automaticamente.</p>
          <button 
            onClick={() => { setPixPayment(null); setSelectedPlan(null); }}
            className="mt-6 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider"
          >
            Cancelar e Voltar
          </button>
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-2xl w-full bg-slate-900/50 border-2 border-slate-800 rounded-[2.5rem] p-8">
          <button 
            onClick={() => setSelectedPlan(null)}
            className="mb-6 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2"
          >
            ← Voltar para planos
          </button>
          
          <div className="mb-8">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Finalizar Assinatura</h2>
            <p className="text-slate-400">Você selecionou o <strong className="text-white">{selectedPlan.name}</strong> por {selectedPlan.price}.</p>
          </div>

                    <div className="bg-white rounded-2xl p-4">
                        {paymentMethod === 'card' && (
              <>
                <button 
                  onClick={() => setPaymentMethod(null)}
                  className="mb-4 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  ← Trocar forma de pagamento
                </button>
              <CardPayment
                initialization={{
                  amount: getPrice(selectedPlan.id),
                }}
                customization={{
                  visual: {
                    showCardholderName: true,
                  },
                  paymentMethods: {
                    maxInstallments: 1
                  }
                }}
                onSubmit={onSubmit}
                onReady={onReady}
                onError={onError}
              />
              </>
            )}

            {!paymentMethod && (
              <div className="flex flex-col space-y-4 p-4">
                <h3 className='text-center text-slate-800 font-bold text-lg mb-2'>Escolha como pagar</h3>
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300"
                >
                  Cartão de Crédito
                </button>
                <button 
                  onClick={() => onSubmit({ selectedPaymentMethod: 'pix', formData: { transaction_amount: getPrice(selectedPlan.id), payer: { email: tenantId } } })}
                  className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-all duration-300"
                >
                  PIX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/20">
            <Smartphone size={40} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Assinatura Expirada</h1>
          <p className="text-slate-400 font-medium">Sua loja <span className="text-white font-bold">{storeName}</span> precisa de uma assinatura ativa.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest">
            <Clock size={14} />
            Expirou em: {formatDate(expiresAt)}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative bg-slate-900/50 border-2 rounded-[2.5rem] p-8 transition-all duration-500 ${plan.popular ? 'border-blue-600 shadow-2xl shadow-blue-600/10' : 'border-slate-800'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl">
                  Mais Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                  <span className="text-slate-500 text-sm font-bold">{plan.period}</span>
                </div>
                {plan.discount && (
                  <span className="inline-block mt-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full">
                    {plan.discount}
                  </span>
                )}
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                    <div className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-emerald-400" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePayment(plan)}
                disabled={loading !== null}
                className={`w-full py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-white hover:bg-slate-100 text-slate-900'}`}
              >
                {loading === plan.id ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CreditCard size={18} />
                    Assinar Agora
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 opacity-40 grayscale">
            <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo.png" alt="Mercado Pago" className="h-6 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" className="h-6 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Pix_logo.svg/2560px-Pix_logo.svg.png" alt="Pix" className="h-6 object-contain" />
          </div>

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-white text-xs font-black uppercase tracking-[0.2em] transition-colors"
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionView;
