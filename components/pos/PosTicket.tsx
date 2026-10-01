import React from 'react';
import { Receipt, Trash2, Plus, Minus, CreditCard, AlertTriangle, TrendingUp, Sparkles, Package } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, getProductEffectivePrice } from '../../utils';

interface CartItem {
  product: Product;
  quantity: number;
}

interface PosTicketProps {
  cart: CartItem[];
  cartTotal: number;
  totalDiscount: number;
  totalSurcharge: number;
  finalTotal: number;
  cartCost: number;
  cartProfit: number;
  profitMarginPercent: number;
  isCartInLoss: boolean;
  crossSellSuggestions: Product[];
  totalVolumes: number;
  storeName: string;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onAddToCart: (product: Product) => void;
  onOpenCheckout: () => void;
  onSelectProduct?: (product: Product) => void;
  theme?: 'dark' | 'light';
  terminalNumber?: number;
  terminalName?: string;
}

export const PosTicket: React.FC<PosTicketProps> = ({
  cart,
  cartTotal,
  totalDiscount,
  totalSurcharge,
  finalTotal,
  cartCost,
  cartProfit,
  profitMarginPercent,
  isCartInLoss,
  crossSellSuggestions,
  totalVolumes,
  storeName,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onAddToCart,
  onOpenCheckout,
  onSelectProduct,
  theme = 'dark',
  terminalNumber,
  terminalName
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden h-full">
      {/* Topo do Cupom */}
      <div className={`px-3.5 py-2.5 flex items-center justify-between border-b shrink-0 transition-colors ${
        isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
            isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            <Receipt size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className={`font-black uppercase text-[10px] tracking-wider ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Cupom Fiscal Eletrônico
              </h3>
              {terminalName && (
                <span className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded border uppercase ${
                  isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {terminalName}
                </span>
              )}
            </div>
            <p className={`text-[8.5px] font-mono tabular-nums leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {cart.length} {cart.length === 1 ? 'item' : 'itens'} · {totalVolumes} {totalVolumes === 1 ? 'vol' : 'vols'}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button 
            onClick={onClearCart} 
            className={`p-1.5 rounded-lg transition-colors text-[9px] font-bold uppercase flex items-center gap-1 ${
              isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title="Cancelar Cupom e Limpar Itens (F4)"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline font-mono">F4</span>
          </button>
        )}
      </div>

      {/* Cabeçalho da Tabela de Itens do Cupom */}
      <div className="grid grid-cols-12 px-3 py-1 bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-500 tracking-wider shrink-0">
        <div className="col-span-2 font-mono"># Item</div>
        <div className="col-span-5">Descrição</div>
        <div className="col-span-2 text-right">Qtd x Un</div>
        <div className="col-span-3 text-right">Total (R$)</div>
      </div>

      {/* Linhas Roláveis da Bobina */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-0">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border border-slate-200/60">
              <Receipt size={26} strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-600">Cupom Vazio</p>
              <p className="text-[9px] text-slate-400 font-medium">Bipe um produto ou selecione no catálogo ao lado</p>
            </div>
          </div>
        ) : (
          cart.map((item, index) => {
            const eff = getProductEffectivePrice(item.product);
            const lineTotal = eff * item.quantity;
            const seqNumber = String(index + 1).padStart(3, '0');

            return (
              <div 
                key={item.product.id} 
                onClick={() => onSelectProduct?.(item.product)}
                className="bg-slate-50/70 hover:bg-slate-100/90 p-2 rounded-xl border border-slate-200/70 transition-colors group text-slate-800 cursor-pointer"
                title="Clique para exibir foto grande e detalhes deste produto"
              >
                <div className="grid grid-cols-12 items-center gap-1.5">
                  <div className="col-span-2 font-mono text-[9px] font-bold text-slate-400">
                    {seqNumber}
                  </div>
                  <div className="col-span-5 min-w-0">
                    <p className="text-[10px] font-bold uppercase truncate leading-tight text-slate-900" title={item.product.name}>
                      {item.product.name}
                    </p>
                    {item.product.barcode && (
                      <p className="text-[7.5px] font-mono text-slate-400 truncate">
                        Cód: {item.product.barcode}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 text-right font-mono text-[9px] text-slate-500 tabular-nums">
                    {item.quantity} x {formatCurrency(eff).replace('R$', '').trim()}
                  </div>
                  <div className="col-span-3 text-right font-mono text-[11px] font-black text-slate-900 tabular-nums">
                    {formatCurrency(lineTotal)}
                  </div>
                </div>

                {/* Linha de Ações Rápidas do Item */}
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/60 text-[8px]">
                  <span className="text-slate-400 font-medium">
                    Unit: {formatCurrency(eff)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                      className="w-5 h-5 flex items-center justify-center bg-white hover:bg-slate-200 rounded border border-slate-200 text-slate-600 transition-colors active:scale-90"
                      title="Diminuir quantidade"
                    >
                      <Minus size={9} />
                    </button>
                    <span className="font-mono font-black text-[10px] w-5 text-center text-slate-800">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                      className="w-5 h-5 flex items-center justify-center bg-white hover:bg-slate-200 rounded border border-slate-200 text-slate-600 transition-colors active:scale-90"
                      title="Aumentar quantidade"
                    >
                      <Plus size={9} />
                    </button>
                    <button 
                      onClick={() => onRemoveFromCart(item.product.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded ml-1 transition-colors"
                      title="Remover este item"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé da Bobina: Totais & Grande Display de Supermercado */}
      <div className="shrink-0 p-2.5 sm:p-3 bg-slate-50 border-t border-slate-200 space-y-2">
        {/* Alerta de Margem ou Prejuízo */}
        {cart.length > 0 && (
          isCartInLoss ? (
            <div className="p-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs animate-pulse">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Atenção: Prejuízo Estimado de -{formatCurrency(cartCost - finalTotal)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-[9px] font-bold border border-emerald-200/80">
              <span className="flex items-center gap-1">
                <TrendingUp size={11} className="text-emerald-600" /> Lucro Bruto Estimado:
              </span>
              <span className="font-mono font-black text-emerald-700">
                {formatCurrency(cartProfit)} ({(profitMarginPercent ?? 0).toFixed(0)}%)
              </span>
            </div>
          )
        )}

        {/* Venda Casada / Checkout rápido */}
        {cart.length > 0 && crossSellSuggestions.length > 0 && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2 space-y-1.5">
            <span className="text-[8px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} className="text-blue-600" /> Ofertas de Caixa (+Ticket)
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              {crossSellSuggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => onAddToCart(p)}
                  className="px-2 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg text-[8px] font-bold text-blue-800 shrink-0 transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  <Plus size={8} />
                  <span className="max-w-[70px] truncate">{p.name}</span>
                  <span className="font-mono font-black text-emerald-600 group-hover:text-white">+{formatCurrency(p.salePrice)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subtotal, Descontos e Acréscimos */}
        <div className="space-y-0.5 text-slate-600 text-[11px] px-1">
          <div className="flex justify-between font-medium">
            <span>Subtotal ({totalVolumes} vol):</span>
            <span className="font-mono tabular-nums font-bold text-slate-800">{formatCurrency(cartTotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between font-medium text-red-600">
              <span>Desconto:</span>
              <span className="font-mono tabular-nums font-bold">- {formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalSurcharge > 0 && (
            <div className="flex justify-between font-medium text-blue-600">
              <span>Acréscimo ({totalSurcharge}%):</span>
              <span className="font-mono tabular-nums font-bold">+ {formatCurrency(cartTotal * (totalSurcharge / 100))}</span>
            </div>
          )}
        </div>

        {/* O GRANDE DISPLAY DIGITAL DE SUPERMERCADO */}
        <div className={`rounded-xl py-2 px-3 text-center border-2 relative overflow-hidden transition-colors ${
          isDark 
            ? 'bg-slate-950 border-slate-800 shadow-inner' 
            : 'bg-emerald-50/80 border-emerald-500/50 shadow-xs'
        }`}>
          {isDark && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          )}
          <p className={`text-[8.5px] font-mono uppercase tracking-[0.2em] mb-0.5 ${
            isDark ? 'text-slate-400' : 'text-emerald-800 font-black'
          }`}>
            TOTAL A RECEBER (R$)
          </p>
          <p className={`font-mono text-2xl sm:text-3xl xl:text-4xl font-black tabular-nums tracking-tight ${
            isDark ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'text-emerald-700'
          }`}>
            {formatCurrency(finalTotal)}
          </p>
        </div>

        {/* Botão de Fechamento Principal de Mercado */}
        <button 
          onClick={onOpenCheckout}
          disabled={cart.length === 0}
          className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <CreditCard size={15} />
          <span>[F10] FINALIZAR VENDA (RECEBER)</span>
        </button>
      </div>
    </div>
  );
};
