import React from 'react';
import { Monitor, X, Check, RefreshCw, Radio, User, ShieldCheck, Laptop } from 'lucide-react';
import { PosTerminalInfo } from '../../types';

interface PosTerminalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalNumber: number;
  terminalName: string;
  totalActiveTerminals: number;
  activeTerminals: PosTerminalInfo[];
  configuredTerminalNumber: number;
  onSelectTerminalNumber: (num: number) => void;
  onRefresh: () => void;
  theme?: 'dark' | 'light';
}

export const PosTerminalsModal: React.FC<PosTerminalsModalProps> = ({
  isOpen,
  onClose,
  terminalNumber,
  terminalName,
  totalActiveTerminals,
  activeTerminals,
  configuredTerminalNumber,
  onSelectTerminalNumber,
  onRefresh,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header do Modal */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Monitor size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Rede de Terminais do Mercado
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {totalActiveTerminals} {totalActiveTerminals === 1 ? 'Caixa Ativo' : 'Caixas Ativos'}
                </span>
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Identificação em tempo real de cada computador em operação
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Card deste Computador */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            isDark ? 'bg-slate-950 border-blue-500/50 shadow-inner' : 'bg-blue-50/60 border-blue-400 shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Laptop size={16} className="text-blue-500" />
                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
                  Este Computador (Terminal Atual)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-600 text-white">
                {terminalName}
              </span>
            </div>

            <p className={`text-xs font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Você pode deixar o sistema detectar o terminal automaticamente ou fixar este PC para um caixa específico:
            </p>

            {/* Opções de Atribuição de Caixa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onSelectTerminalNumber(0)}
                className={`p-2.5 rounded-xl border text-center font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                  configuredTerminalNumber === 0 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30' 
                    : isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Automático</span>
                <span className="text-[8px] opacity-80">(Auto)</span>
              </button>

              {[1, 2, 3, 4, 5].slice(0, Math.max(3, totalActiveTerminals + 1)).map(num => {
                const isSelected = configuredTerminalNumber === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onSelectTerminalNumber(num)}
                    className={`p-2.5 rounded-xl border text-center font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30' 
                        : isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Caixa {String(num).padStart(2, '0')}</span>
                    <span className="text-[8px] opacity-80 font-mono">PDV {String(num).padStart(2, '0')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Todos os Terminais Ativos no Estabelecimento */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Radio size={13} className="text-emerald-500 animate-pulse" />
                Terminais Operando no Momento ({activeTerminals.length})
              </span>
              <button 
                onClick={onRefresh}
                className={`text-[9px] font-bold uppercase flex items-center gap-1 hover:underline ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
                title="Atualizar lista de terminais"
              >
                <RefreshCw size={11} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {activeTerminals.map(term => (
                <div 
                  key={term.terminalNumber}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    term.isCurrent 
                      ? (isDark ? 'bg-blue-950/40 border-blue-500/40 shadow-xs' : 'bg-blue-50 border-blue-300')
                      : (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80')
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                      term.isCurrent 
                        ? 'bg-blue-600 text-white' 
                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {String(term.terminalNumber).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-xs uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {term.terminalName}
                        </span>
                        {term.isCurrent && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                            Este PC
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 text-[9px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <User size={10} className="shrink-0" />
                        <span className="truncate">Operador: <strong>{term.operatorName}</strong> ({term.operatorRole})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className={`p-4 border-t flex justify-end ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Confirmar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
