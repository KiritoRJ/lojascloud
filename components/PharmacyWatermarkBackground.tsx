import React from 'react';

/**
 * PharmacyWatermarkBackground
 * Marca d'água estética e ultra-clean inspirada em medicina e saúde.
 * Inclui cruzes médicas, linhas de ECG, cápsulas farmacêuticas e símbolos de saúde
 * com opacidade calibrada (3.5% a 5%) para criar uma atmosfera clínica e profissional
 * sem prejudicar a leitura nem o contraste de elementos interativos.
 */
export const PharmacyWatermarkBackground: React.FC = () => {
  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none select-none absolute inset-0 overflow-hidden z-0 bg-gradient-to-b from-[#f8fdfb]/80 via-white to-[#f0fdfa]/40"
    >
      {/* 1. Grade sutil de micropontos / cruzes médicas no fundo */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.025] text-teal-800" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="medical-cross-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* Pequena cruz médica central */}
            <path d="M37 32 h6 v6 h6 v4 h-6 v6 h-4 v-6 h-6 v-4 h6 z" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#medical-cross-pattern)" />
      </svg>

      {/* 2. Grande Cruz Médica Translúcida no Canto Superior Direito */}
      <div className="absolute -top-16 -right-16 w-96 h-96 opacity-[0.035] text-teal-700">
        <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full">
          {/* Cruz Suíça / Médica arredondada */}
          <path d="M75 15 C75 10 80 5 86 5 L114 5 C120 5 125 10 125 15 L125 75 L185 75 C190 75 195 80 195 86 L195 114 C195 120 190 125 185 125 L125 125 L125 185 C125 190 120 195 114 195 L86 195 C80 195 75 190 75 185 L75 125 L15 125 C10 125 5 120 5 114 L5 86 C5 80 10 75 15 75 L75 75 Z" />
        </svg>
      </div>

      {/* 3. Linha de ECG / Pulso Cardíaco fluindo sutilmente na parte superior */}
      <div className="absolute top-28 left-0 right-0 h-16 opacity-[0.03] text-emerald-600 overflow-hidden">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full">
          <path 
            d="M0 30 L220 30 L235 15 L245 48 L260 5 L275 52 L285 24 L295 30 L600 30 L620 30 L635 12 L645 50 L660 4 L675 54 L685 22 L695 30 L1020 30 L1035 15 L1045 48 L1060 5 L1075 52 L1085 24 L1095 30 L1200 30" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>

      {/* 4. Símbolo de Cápsula Farmacêutica no Canto Inferior Esquerdo */}
      <div className="absolute -bottom-10 -left-10 w-80 h-80 opacity-[0.03] text-teal-800 -rotate-45">
        <svg viewBox="0 0 100 200" fill="currentColor" className="w-full h-full">
          {/* Metade superior da cápsula */}
          <path d="M10 90 L90 90 L90 50 C90 22.38 67.62 0 40 0 C12.38 0 0 22.38 0 50 L0 90 Z" />
          {/* Linha divisória */}
          <rect x="0" y="93" width="90" height="4" fill="transparent" />
          {/* Metade inferior da cápsula em traço */}
          <path d="M0 100 L90 100 L90 140 C90 167.62 67.62 190 40 190 C12.38 190 0 167.62 0 140 Z" fill="none" stroke="currentColor" strokeWidth="6" />
        </svg>
      </div>

      {/* 5. Almofariz e Pilão Farmacêutico / Cálice de Hígia no Canto Médio Direito */}
      <div className="absolute top-1/2 -translate-y-1/2 right-12 w-64 h-64 opacity-[0.025] text-emerald-800">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          {/* Almofariz */}
          <path d="M15 45 C15 75 30 85 50 85 C70 85 85 75 85 45 L15 45 Z" fill="currentColor" fillOpacity="0.3" />
          <path d="M10 45 L90 45" />
          {/* Base */}
          <path d="M35 85 L30 92 L70 92 L65 85" />
          {/* Pilão */}
          <path d="M72 15 L40 55" strokeWidth="4" />
          {/* Folha de saúde */}
          <path d="M50 20 C60 12 70 20 65 30 C60 40 50 20 50 20 Z" fill="currentColor" />
        </svg>
      </div>

      {/* 6. Selo Tipográfico d'Água Discreto no Rodapé */}
      <div className="absolute bottom-4 right-6 flex items-center gap-2 opacity-[0.06] text-teal-900 pointer-events-none">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest font-mono">
          Ambiente Farmacêutico & Medicina
        </span>
      </div>
    </div>
  );
};
