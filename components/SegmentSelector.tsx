import React from 'react';
import { 
  Smartphone, 
  ShoppingCart, 
  Pill, 
  UtensilsCrossed, 
  Dumbbell, 
  Globe, 
  Check, 
  EyeOff, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { BusinessSegment } from '../types';
import { STORE_SEGMENTS, getSegmentConfig } from '../utils/storeSegments';

interface SegmentSelectorProps {
  selectedSegment: BusinessSegment;
  onSelectSegment: (segment: BusinessSegment) => void;
  variant?: 'grid' | 'compact' | 'cards-detailed';
  showDisabledNotice?: boolean;
}

export const SegmentSelector: React.FC<SegmentSelectorProps> = ({
  selectedSegment,
  onSelectSegment,
  variant = 'grid',
  showDisabledNotice = true
}) => {
  const currentConfig = getSegmentConfig(selectedSegment);

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Tipo de Loja / Ramo de Atuação
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STORE_SEGMENTS.map((seg) => {
            const Icon = seg.icon;
            const isSelected = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => onSelectSegment(seg.id)}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs"
                  style={{ backgroundColor: seg.themePrimary }}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-tight truncate leading-tight">
                    {seg.shortName}
                  </p>
                  <p className="text-[8px] text-slate-500 truncate leading-tight mt-0.5">
                    {seg.badgeText}
                  </p>
                </div>
                {isSelected && <Check size={12} className="text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Sparkles size={12} className="text-blue-600 animate-pulse" />
          <span>Selecione o Ramo / Tipo de Loja</span>
        </label>
        <span className="text-[9px] font-bold text-slate-400">
          Personaliza layout, cores e abas
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {STORE_SEGMENTS.map((seg) => {
          const Icon = seg.icon;
          const isSelected = selectedSegment === seg.id;

          return (
            <div
              key={seg.id}
              onClick={() => onSelectSegment(seg.id)}
              className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left select-none flex flex-col justify-between group ${
                isSelected
                  ? 'border-blue-600 bg-white shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                    style={{ backgroundColor: seg.themePrimary }}
                  >
                    <Icon size={18} />
                  </div>

                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${seg.badgeColor}`}
                  >
                    {seg.badgeText}
                  </span>
                </div>

                <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-tight">
                  {seg.name}
                </h4>
                <p className="text-[9px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {seg.description}
                </p>
              </div>

              {/* Destaque das Abas Ocultas / Ativas */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[8px] font-bold">
                  {seg.id === 'mercado' ? (
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <EyeOff size={10} className="text-emerald-600" /> Sem O.S. & sem Clientes (PDV puro)
                    </span>
                  ) : seg.id === 'assistencia_tecnica' ? (
                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-blue-600" /> Completo (O.S. + Bancada Técnica)
                    </span>
                  ) : (
                    <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <EyeOff size={10} className="text-slate-400" /> O.S. oculta por padrão
                    </span>
                  )}
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-transparent'
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showDisabledNotice && currentConfig && (
        <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: currentConfig.themePrimary }}
            />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-blue-950 truncate">
                Tema Aplicado: {currentConfig.name}
              </p>
              <p className="text-[8px] text-blue-700 truncate">
                {currentConfig.bannerHighlight} • Aba padrão: <strong>{currentConfig.defaultTab.toUpperCase()}</strong>
              </p>
            </div>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-white text-blue-600 border border-blue-200 rounded-lg shrink-0">
            100% Configurado
          </span>
        </div>
      )}
    </div>
  );
};
