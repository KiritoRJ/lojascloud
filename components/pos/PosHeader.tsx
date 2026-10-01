import React from 'react';
import { ShoppingCart, History, User as UserIcon, Camera, ImageIcon, Trash2, Loader2, Maximize2, Minimize2, Lightbulb } from 'lucide-react';
import { AppSettings, User } from '../../types';

interface PosHeaderProps {
  cartLength: number;
  totalVolumes: number;
  formattedPosDate: string;
  currentUser: User | null;
  selectedSellerId: string;
  setSelectedSellerId: (id: string) => void;
  teamEmployees: any[];
  settings: AppSettings;
  isFiscalModeActive: boolean;
  onOpenHistory: () => void;
  isCompressingBanner: boolean;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInitiateRemoveBanner: () => void;
  onFocusSearch: () => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  terminalNumber?: number;
  terminalName?: string;
  totalActiveTerminals?: number;
  onOpenTerminalsModal?: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  cartLength,
  totalVolumes,
  formattedPosDate,
  currentUser,
  selectedSellerId,
  setSelectedSellerId,
  teamEmployees,
  settings,
  isFiscalModeActive,
  onOpenHistory,
  isCompressingBanner,
  bannerInputRef,
  onBannerUpload,
  onInitiateRemoveBanner,
  onFocusSearch,
  onClearCart,
  onOpenCheckout,
  isFullscreen,
  onToggleFullscreen,
  theme = 'dark',
  onToggleTheme,
  terminalNumber = 1,
  terminalName = 'PDV 01',
  totalActiveTerminals = 1,
  onOpenTerminalsModal
}) => {
  const isServing = cartLength > 0;
  const isDark = theme === 'dark';

  return (
    <header className={`${
      isDark 
        ? 'bg-slate-900 text-white border-slate-800 shadow-md' 
        : 'bg-white text-slate-800 border-slate-200/90 shadow-xs'
    } rounded-2xl p-2.5 sm:px-4 sm:py-2.5 border flex flex-col md:flex-row items-center justify-between gap-2.5 shrink-0 transition-colors`}>
      {/* Lado Esquerdo: Identificação do Terminal e Status */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={onOpenTerminalsModal}
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black cursor-pointer active:scale-95 transition-all ${
              isDark 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner hover:bg-emerald-500/30' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs hover:bg-emerald-100'
            }`}
            title="Ver e gerenciar computadores/terminais conectados"
          >
            <ShoppingCart size={18} />
          </button>
          <div 
            onClick={onOpenTerminalsModal} 
            className="cursor-pointer group select-none"
            title="Clique para ver os computadores conectados ou trocar o número do caixa"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-black tracking-wider uppercase group-hover:underline flex items-center gap-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {terminalName} · Caixa {String(terminalNumber).padStart(2, '0')}
                <span className="text-[9px] opacity-60">▾</span>
              </span>
              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase border ${
                isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {totalActiveTerminals} {totalActiveTerminals === 1 ? 'Terminal Ativo' : 'Terminais Ativos'}
              </span>
              {isFiscalModeActive && (
                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                  isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  NFC-e Ativa
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isServing ? (isDark ? 'bg-amber-400' : 'bg-amber-500') + ' animate-ping' : (isDark ? 'bg-emerald-400' : 'bg-emerald-500') + ' animate-pulse'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isServing ? (isDark ? 'text-amber-300' : 'text-amber-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700')
              }`}>
                {isServing ? `Em Atendimento · ${totalVolumes} vol` : 'Caixa Livre · Aguardando'}
              </span>
            </div>
          </div>
        </div>

        {/* Relógio Digital no Mobile */}
        <div className={`md:hidden font-mono text-[10px] px-2 py-1 rounded-lg border tabular-nums font-semibold ${
          isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          {formattedPosDate}
        </div>
      </div>

      {/* Centro: Relógio de Caixa & Banner (se houver) */}
      <div className="hidden md:flex items-center gap-4">
        {/* Banner discreto / Logo */}
        <div 
          onClick={() => currentUser?.role === 'admin' && bannerInputRef.current?.click()}
          className={`relative group ${currentUser?.role === 'admin' ? 'cursor-pointer' : ''} max-w-[260px] h-9 rounded-xl border border-dashed flex items-center justify-center overflow-hidden transition-all px-3 ${
            isDark ? 'bg-slate-950/60 border-slate-700/80 hover:border-slate-500' : 'bg-slate-50 border-slate-300 hover:border-slate-400'
          }`}
          title={currentUser?.role === 'admin' ? "Clique para alterar logo/banner do PDV" : undefined}
        >
          {isCompressingBanner ? (
            <Loader2 className={`animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} size={16} />
          ) : settings.salesBannerUrl ? (
            <>
              <img src={settings.salesBannerUrl} className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
              {currentUser?.role === 'admin' && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all">
                  <Camera size={13} className="text-white" />
                  <button 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      onInitiateRemoveBanner(); 
                    }}
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors pointer-events-auto"
                    title="Remover Banner"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <ImageIcon size={13} />
              <span>{settings.storeName || 'Mercado PDV'}</span>
            </div>
          )}
          <input 
            type="file" 
            ref={bannerInputRef} 
            onChange={onBannerUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Relógio Digital Desktop */}
        <div className={`font-mono text-xs px-3 py-1.5 rounded-xl border tabular-nums font-semibold tracking-wide flex items-center gap-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'} animate-pulse`} />
          <span>{formattedPosDate}</span>
        </div>
      </div>

      {/* Lado Direito: Atalhos do Teclado & Vendedor & Histórico & Alternador de Tema */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        {/* Vendedor */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <UserIcon size={13} className={`${isDark ? 'text-blue-400' : 'text-blue-600'} shrink-0`} />
          <select
            value={selectedSellerId}
            onChange={(e) => setSelectedSellerId(e.target.value)}
            className={`bg-transparent text-[10px] font-bold outline-none cursor-pointer max-w-[130px] truncate ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
            title="Operador do Caixa"
          >
            <option value={currentUser?.id || 'admin'} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>
              {currentUser?.name || 'Operador'} (Atual)
            </option>
            {teamEmployees
              .filter((e: any) => e.id !== currentUser?.id && e.userId !== currentUser?.id)
              .map((emp: any) => (
                <option key={emp.id} value={emp.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>
                  {emp.name}
                </option>
              ))}
          </select>
        </div>

        {/* Atalhos Rápidos */}
        <div className={`hidden xl:flex items-center gap-1 text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <button onClick={onFocusSearch} className={`px-1.5 py-1 rounded font-bold transition-colors ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}>
            F2 Buscar
          </button>
          <button onClick={onClearCart} disabled={cartLength === 0} className={`px-1.5 py-1 rounded font-bold transition-colors disabled:opacity-40 ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}>
            F4 Limpar
          </button>
          <button onClick={onOpenCheckout} disabled={cartLength === 0} className={`px-1.5 py-1 rounded font-bold transition-colors border disabled:opacity-40 ${
            isDark ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
          }`}>
            F10 Receber
          </button>
        </div>

        {/* ÍCONE DE LÂMPADA: ALTERNA ENTRE TEMA ESCURO E CLARO */}
        {onToggleTheme && (
          <button 
            onClick={onToggleTheme} 
            className={`p-2 rounded-xl transition-all shadow-xs flex items-center justify-center border cursor-pointer active:scale-90 ${
              isDark 
                ? 'text-amber-400 bg-slate-800 hover:bg-slate-700 border-slate-700/80 hover:text-amber-300' 
                : 'text-amber-600 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:text-amber-700'
            }`}
            title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            <Lightbulb size={15} className={isDark ? 'fill-amber-400/20' : 'fill-amber-500'} />
          </button>
        )}

        {/* Botão de Histórico */}
        <button 
          onClick={onOpenHistory} 
          className={`p-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border ${
            isDark 
              ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700/80' 
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
          }`}
          title="Histórico de Vendas (F7)"
        >
          <History size={15} />
          <span className="hidden sm:inline">Histórico</span>
        </button>

        {/* Botão de Tela Cheia (F11 / Monitor Completo) */}
        {onToggleFullscreen && (
          <button 
            onClick={onToggleFullscreen} 
            className={`p-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border ${
              isFullscreen 
                ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                : isDark 
                ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700/80'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
            title={isFullscreen ? "Sair da Tela Cheia (F11 / Esc)" : "Tela Cheia Total (F11)"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span className="hidden lg:inline">{isFullscreen ? 'Sair Cheia' : 'Tela Cheia'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
