import React from 'react';
import { CreditCard, Banknote, QrCode, Minus, Plus, X, User as UserIcon, AlertTriangle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils';

interface PaymentEntry {
  method: 'Dinheiro' | 'Cartão' | 'PIX';
  amount: number;
  installments?: number;
}

interface PosCheckoutModalProps {
  finalTotal: number;
  cartTotal: number;
  cartCost: number;
  cartProfit: number;
  profitMarginPercent: number;
  isCartInLoss: boolean;
  totalDiscount: number;
  setTotalDiscount: (val: number) => void;
  totalSurcharge: number;
  setTotalSurcharge: (val: number) => void;
  paymentEntries: PaymentEntry[];
  setPaymentEntries: React.Dispatch<React.SetStateAction<PaymentEntry[]>>;
  addPaymentEntry: () => void;
  removePaymentEntry: (index: number) => void;
  updatePaymentEntry: (index: number, field: keyof PaymentEntry, value: any) => void;
  calculateFinalTotal: (discount: number, surcharge: number) => number;
  quickCashValues: number[];
  selectedSellerId: string;
  setSelectedSellerId: (id: string) => void;
  teamEmployees: any[];
  currentUser: any;
  isFiscalModeActive: boolean;
  customerFiscalCpf: string;
  setCustomerFiscalCpf: (val: string) => void;
  customerFiscalPhone: string;
  setCustomerFiscalPhone: (val: string) => void;
  isSubmittingSale: boolean;
  onFinalizeSale: () => void;
  onClose: () => void;
}

export const PosCheckoutModal: React.FC<PosCheckoutModalProps> = ({
  finalTotal,
  cartTotal,
  cartCost,
  cartProfit,
  profitMarginPercent,
  isCartInLoss,
  totalDiscount,
  setTotalDiscount,
  totalSurcharge,
  setTotalSurcharge,
  paymentEntries,
  setPaymentEntries,
  addPaymentEntry,
  removePaymentEntry,
  updatePaymentEntry,
  calculateFinalTotal,
  quickCashValues,
  selectedSellerId,
  setSelectedSellerId,
  teamEmployees,
  currentUser,
  isFiscalModeActive,
  customerFiscalCpf,
  setCustomerFiscalCpf,
  customerFiscalPhone,
  setCustomerFiscalPhone,
  isSubmittingSale,
  onFinalizeSale,
  onClose
}) => {
  const totalPaid = paymentEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = Math.max(0, finalTotal - totalPaid);
  const totalCash = paymentEntries.filter(p => p.method === 'Dinheiro').reduce((acc, curr) => acc + curr.amount, 0);
  const change = paymentEntries.length < 2 ? Math.min(Math.max(0, totalPaid - finalTotal), totalCash) : 0;
  const isPaidInFull = totalPaid >= finalTotal - 0.01;

  const selectSingleMethod = (method: 'Dinheiro' | 'Cartão' | 'PIX') => {
    setPaymentEntries([{ method, amount: finalTotal, installments: method === 'Cartão' ? 1 : undefined }]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[10000] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[92vh] shadow-2xl border border-slate-200">
        {/* Cabeçalho do Fechamento */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Frente de Caixa · Fechamento
            </span>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Finalizar Pagamento
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Display do Total a Pagar */}
        <div className="bg-slate-950 text-center p-4 rounded-2xl border border-slate-800 shadow-inner">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-0.5">
            Valor Total do Cupom
          </p>
          <p className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums">
            {formatCurrency(finalTotal)}
          </p>
        </div>

        {/* Botões Rápidos de Método de Pagamento */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => selectSingleMethod('Dinheiro')}
            className={`py-2.5 px-2 rounded-xl border text-xs font-black uppercase flex flex-col items-center gap-1 transition-all active:scale-95 ${
              paymentEntries[0]?.method === 'Dinheiro' && paymentEntries.length === 1
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Banknote size={16} />
            <span>Dinheiro</span>
          </button>
          <button
            type="button"
            onClick={() => selectSingleMethod('Cartão')}
            className={`py-2.5 px-2 rounded-xl border text-xs font-black uppercase flex flex-col items-center gap-1 transition-all active:scale-95 ${
              paymentEntries[0]?.method === 'Cartão' && paymentEntries.length === 1
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <CreditCard size={16} />
            <span>Cartão</span>
          </button>
          <button
            type="button"
            onClick={() => selectSingleMethod('PIX')}
            className={`py-2.5 px-2 rounded-xl border text-xs font-black uppercase flex flex-col items-center gap-1 transition-all active:scale-95 ${
              paymentEntries[0]?.method === 'PIX' && paymentEntries.length === 1
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <QrCode size={16} />
            <span>PIX</span>
          </button>
        </div>

        {/* Sugestões Rápidas de Notas para Dinheiro */}
        {paymentEntries[0]?.method === 'Dinheiro' && quickCashValues.length > 0 && (
          <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
              Atalhos de Valor Recebido (Cálculo Rápido de Troco):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickCashValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updatePaymentEntry(0, 'amount', val)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black transition-all active:scale-95 border ${
                    paymentEntries[0].amount === val
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {formatCurrency(val)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linhas de Pagamento */}
        <div className="space-y-2">
          {paymentEntries.map((entry, index) => (
            <div key={index} className="space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <select
                  value={entry.method}
                  onChange={(e) => updatePaymentEntry(index, 'method', e.target.value as 'Dinheiro' | 'Cartão' | 'PIX')}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-xs uppercase outline-none"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="PIX">PIX</option>
                </select>

                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="any"
                    value={entry.amount || ''}
                    onChange={(e) => updatePaymentEntry(index, 'amount', Number(e.target.value))}
                    className="w-full bg-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 font-mono font-black text-right text-xs outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>

                {paymentEntries.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removePaymentEntry(index)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {entry.method === 'Cartão' && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Parcelas:</span>
                  <select
                    value={entry.installments || 1}
                    onChange={(e) => updatePaymentEntry(index, 'installments', Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-black outline-none"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}x {entry.amount > 0 ? `(${formatCurrency(entry.amount / (i+1))})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}

          {paymentEntries.length < 2 && (
            <button
              type="button"
              onClick={addPaymentEntry}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={11} /> Dividir em 2 Formas de Pagamento
            </button>
          )}
        </div>

        {/* Display Dinâmico de Troco ou Valor Restante */}
        {change > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
            <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase tracking-widest block">
              TROCO A DEVOLVER
            </span>
            <span className="font-mono text-2xl font-black text-emerald-800 tabular-nums">
              {formatCurrency(change)}
            </span>
          </div>
        )}

        {remaining > 0 && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-2xl text-center">
            <span className="text-[9px] font-mono font-bold text-red-700 uppercase tracking-widest block">
              VALOR RESTANTE A PAGAR
            </span>
            <span className="font-mono text-xl font-black text-red-800 tabular-nums">
              {formatCurrency(remaining)}
            </span>
          </div>
        )}

        {/* Desconto e Acréscimo */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Desconto (R$)
            </label>
            <input
              type="number"
              value={totalDiscount || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTotalDiscount(val);
                if (paymentEntries.length === 1) {
                  setPaymentEntries([{ ...paymentEntries[0], amount: calculateFinalTotal(val, totalSurcharge) }]);
                }
              }}
              placeholder="0,00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Acréscimo (%)
            </label>
            <input
              type="number"
              value={totalSurcharge || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTotalSurcharge(val);
                if (paymentEntries.length === 1) {
                  setPaymentEntries([{ ...paymentEntries[0], amount: calculateFinalTotal(totalDiscount, val) }]);
                }
              }}
              placeholder="0%"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Vendedor */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase">
            <span className="flex items-center gap-1">
              <UserIcon size={11} className="text-blue-500" /> Vendedor da Venda
            </span>
            <span>Comissão Registrada</span>
          </div>
          <select
            value={selectedSellerId}
            onChange={(e) => setSelectedSellerId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
          >
            <option value={currentUser?.id || 'admin'}>
              {currentUser?.name || 'Administrador'} (Atual)
            </option>
            {teamEmployees
              .filter((e: any) => e.id !== currentUser?.id && e.userId !== currentUser?.id)
              .map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
          </select>
        </div>

        {/* Identificação Fiscal NFC-e (se ativo) */}
        {isFiscalModeActive && (
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[8px] font-black uppercase text-purple-900">
              <span className="flex items-center gap-1.5">
                <FileText size={12} className="text-purple-600" />
                NFC-e / Cupom Fiscal Eletrônico
              </span>
              <span className="bg-purple-200 px-1.5 py-0.5 rounded text-purple-800">
                Modelo 65
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerFiscalCpf}
                onChange={(e) => setCustomerFiscalCpf(e.target.value)}
                placeholder="CPF na Nota (opcional)"
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={customerFiscalPhone}
                onChange={(e) => setCustomerFiscalPhone(e.target.value)}
                placeholder="WhatsApp (ex: 11999998888)"
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Botão Finalizar Venda */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onFinalizeSale}
            disabled={isSubmittingSale || !isPaidInFull}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmittingSale ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Registrando Venda...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>CONFIRMAR E FINALIZAR VENDA</span>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={isSubmittingSale}
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
