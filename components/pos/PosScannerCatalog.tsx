import React from 'react';
import { ScanBarcode, Search, Package, Plus, Grid, LayoutGrid, Rows, Camera, Tag } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, getProductEffectivePrice } from '../../utils';

interface PosScannerCatalogProps {
  products: Product[];
  sortedProducts: Product[];
  topSellers: string[];
  lastAddedProduct: Product | null;
  productSearch: string;
  setProductSearch: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: string[];
  layoutMode: 'small' | 'medium' | 'list';
  onToggleLayout: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartScanner: (mode: 'search') => void;
  onAddToCart: (product: Product) => void;
  cartLength?: number;
  theme?: 'dark' | 'light';
  terminalNumber?: number;
  terminalName?: string;
}

export const PosScannerCatalog: React.FC<PosScannerCatalogProps> = ({
  products,
  sortedProducts,
  topSellers,
  lastAddedProduct,
  productSearch,
  setProductSearch,
  selectedCategory,
  setSelectedCategory,
  categories,
  layoutMode,
  onToggleLayout,
  searchInputRef,
  onSearchKeyDown,
  onStartScanner,
  onAddToCart,
  cartLength,
  theme = 'dark',
  terminalNumber = 1,
  terminalName = 'PDV 01'
}) => {
  const isServing = (cartLength !== undefined ? cartLength > 0 : true) && !!lastAddedProduct;
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      {/* 1. VISOR DO SCANNER / DISPLAY DO ITEM BIPADO (TELA DO CLIENTE E OPERADOR) */}
      <div className={`${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-white shadow-lg' 
          : 'bg-white border-emerald-500/40 text-slate-900 shadow-xs'
      } border-2 rounded-2xl p-3 sm:p-4 relative overflow-hidden shrink-0 transition-colors`}>
        <div className={`absolute -right-8 -bottom-8 w-44 h-44 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/5'} rounded-full blur-3xl pointer-events-none`} />

        {isServing && lastAddedProduct ? (
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4.5 p-1 relative z-10 animate-in fade-in duration-300">
            {/* Foto Muito Maior do Produto Selecionado */}
            <div className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-52 lg:h-52 rounded-2xl border-2 flex items-center justify-center overflow-hidden shrink-0 p-2.5 relative group ${
              isDark 
                ? 'bg-slate-950 border-emerald-500/50 shadow-2xl bg-gradient-to-b from-slate-900 to-slate-950' 
                : 'bg-slate-50 border-emerald-500/40 shadow-sm'
            }`}>
              {lastAddedProduct.photo ? (
                <img 
                  src={lastAddedProduct.photo} 
                  alt={lastAddedProduct.name}
                  className={`w-full h-full object-contain ${isDark ? 'drop-shadow-lg' : 'drop-shadow-xs'} transition-transform duration-300 group-hover:scale-110`} 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <Package size={56} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
              )}
              {lastAddedProduct.category && (
                <span className={`absolute bottom-2 left-2 right-2 text-center text-[8.5px] font-bold uppercase px-2 py-0.5 rounded truncate border ${
                  isDark 
                    ? 'bg-slate-900/90 text-slate-300 border-slate-800' 
                    : 'bg-white/95 text-slate-700 border-slate-200 shadow-2xs'
                }`}>
                  {lastAddedProduct.category}
                </span>
              )}
            </div>

            {/* Informações em Destaque do Produto */}
            <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'} animate-ping`} />
                  <span className={`text-[10px] font-mono uppercase tracking-[0.2em] font-black ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    PRODUTO SELECIONADO · REGISTRADO NO CUPOM
                  </span>
                </div>

                <h2 className={`text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-tight leading-tight line-clamp-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`} title={lastAddedProduct.name}>
                  {lastAddedProduct.name}
                </h2>

                {lastAddedProduct.barcode && (
                  <div className={`inline-flex items-center gap-1.5 font-mono text-[10px] border px-2.5 py-1 rounded-lg ${
                    isDark ? 'bg-slate-800/90 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <ScanBarcode size={13} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                    <span>EAN: {lastAddedProduct.barcode}</span>
                  </div>
                )}
              </div>

              {/* Bloco de Preço Grande e Estoque */}
              <div className={`pt-2 sm:pt-3 border-t flex flex-wrap items-baseline justify-between gap-2 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div>
                  <span className={`text-[10px] uppercase font-mono font-bold block ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    VALOR UNITÁRIO
                  </span>
                  <span className={`font-mono text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums ${
                    isDark ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.35)]' : 'text-emerald-600'
                  }`}>
                    {formatCurrency(getProductEffectivePrice(lastAddedProduct))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-bold border ${
                    lastAddedProduct.quantity <= 0 
                      ? (isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200') 
                      : lastAddedProduct.quantity <= 2 
                      ? (isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200') 
                      : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200')
                  }`}>
                    Estoque Atual: <strong>{lastAddedProduct.quantity} un</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CAIXA LIVRE BEM GRANDE NA TELA (TEMA ESCURO PADRÃO OU CLARO) */
          <div className="py-6 sm:py-8 md:py-10 px-4 flex flex-col items-center justify-center text-center relative z-10 select-none animate-in fade-in duration-300">
            {/* Tag Superior de Status */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'} animate-ping`} />
              <span className={`text-[10.5px] sm:text-xs font-mono font-black uppercase tracking-[0.25em] px-3.5 py-0.5 rounded-full ${
                isDark 
                  ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 shadow-inner' 
                  : 'text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-2xs'
              }`}>
                {terminalName} · CAIXA {String(terminalNumber).padStart(2, '0')}
              </span>
            </div>

            {/* O TEXTO BEM GRANDE NA TELA: CAIXA LIVRE */}
            <h1 className={`text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black font-mono tracking-tight uppercase leading-tight my-2 sm:my-3 ${
              isDark 
                ? 'text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.55)]' 
                : 'text-emerald-600'
            }`}>
              CAIXA LIVRE
            </h1>

            <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider max-w-lg mx-auto ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Aguardando Próximo Cliente · Bipe o Código de Barras ou Selecione o Produto
            </p>

            <div className={`mt-3 flex items-center gap-2 text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className={`px-2 py-0.5 rounded font-bold border ${
                isDark ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-700'
              }`}>F2</span>
              <span>para focar no leitor de código de barras</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. BARRA DE ENTRADA DO SCANNER E CONTROLES */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="BIPAR CÓDIGO DE BARRAS OU BUSCAR PRODUTO (F2)..." 
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="w-full pl-9 pr-20 py-2.5 bg-white border-2 border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-black text-slate-800 shadow-xs outline-none transition-all uppercase placeholder:text-slate-400 placeholder:font-bold"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="hidden sm:inline font-mono text-[8.5px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200">
              Enter ↵
            </span>
            <button 
              onClick={() => onStartScanner('search')}
              className={`p-1 rounded-lg active:scale-90 transition-all shadow-xs border ${
                isDark 
                  ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Abrir Scanner por Câmera"
            >
              <Camera size={13} />
            </button>
          </div>
        </div>

        {/* Botão de Alternância de Visualização */}
        <button 
          onClick={onToggleLayout}
          className="p-2.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0"
          title="Alternar Modo de Exibição"
        >
          {layoutMode === 'small' ? <Grid size={15} /> : layoutMode === 'medium' ? <LayoutGrid size={15} /> : <Rows size={15} />}
          <span className="hidden md:inline">Layout</span>
        </button>
      </div>

      {/* 3. TECLADO RÁPIDO DE CATEGORIAS (PLU / DEPARTAMENTOS DE SUPERMERCADO) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar shrink-0">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                isActive 
                  ? (isDark ? 'bg-slate-900 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs') 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. GRADE DE PRODUTOS MENORES NO MODO PC */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
        {sortedProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
            <Package size={32} className="text-slate-300" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nenhum produto encontrado</p>
            <p className="text-[10px] text-slate-400">Tente buscar por outro nome ou código de barras</p>
          </div>
        ) : (
          <div className={`grid ${
            layoutMode === 'small' 
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5' 
              : layoutMode === 'medium' 
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2' 
              : 'grid-cols-1 gap-1'
          }`}>
            {sortedProducts.map((product) => {
              const effPrice = getProductEffectivePrice(product);
              const isTopSeller = topSellers.includes(product.id);
              const isLowStock = product.quantity <= 2;

              if (layoutMode === 'list') {
                return (
                  <button
                    key={product.id}
                    onClick={() => onAddToCart(product)}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500/50 p-1.5 rounded-lg flex items-center justify-between gap-2 text-left transition-all active:scale-98 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/60">
                        {product.photo ? (
                          <img src={product.photo} alt={product.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={14} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-900 uppercase truncate group-hover:text-emerald-700 transition-colors">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                          {product.barcode && <span className="font-mono">Cód: {product.barcode}</span>}
                          {product.category && <span>· {product.category}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Est: {product.quantity}
                      </span>
                      <span className="font-mono font-black text-xs text-emerald-600 tabular-nums">
                        {formatCurrency(effPrice)}
                      </span>
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <Plus size={12} />
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500/60 rounded-xl p-1.5 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between group relative overflow-hidden"
                >
                  {isTopSeller && (
                    <div className="absolute top-1 left-1 z-10 bg-amber-500 text-slate-950 font-black text-[6.5px] uppercase tracking-wider px-1 py-0.2 rounded shadow-2xs">
                      Top
                    </div>
                  )}

                  {/* Foto compacta do produto */}
                  <div className="w-full h-14 sm:h-16 bg-slate-50 rounded-lg mb-1 flex items-center justify-center overflow-hidden border border-slate-100 relative group-hover:border-slate-200 transition-colors">
                    {product.photo ? (
                      <img 
                        src={product.photo} 
                        alt={product.name}
                        className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-200" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <Package size={20} className="text-slate-300" />
                    )}
                  </div>

                  {/* Conteúdo textual compacto */}
                  <div className="w-full min-w-0 space-y-0.5">
                    <p className="text-[9px] sm:text-[9.5px] font-black text-slate-800 uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors" title={product.name}>
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <p className="font-mono font-black text-[10px] sm:text-[11px] text-emerald-600 tabular-nums">
                        {formatCurrency(effPrice)}
                      </p>
                      <span className={`text-[6.5px] sm:text-[7px] font-mono px-1 py-0.2 rounded font-bold ${
                        isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Est: {product.quantity}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
