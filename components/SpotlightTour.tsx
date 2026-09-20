import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Store, 
  Menu, 
  Wrench, 
  Download, 
  ArrowRight,
  X
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string;
  tab?: string;
  title: string;
  badge: string;
  icon: any;
  description: string;
}

interface SpotlightTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenInstallModal?: () => void;
  onOpenSidebar?: () => void;
  onCloseSidebar?: () => void;
  tenantId?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'store_profile',
    targetId: 'tour-store-profile',
    tab: 'config',
    title: 'Dados e WhatsApp da Loja',
    badge: '1/4',
    icon: Store,
    description: 'Preencha o WhatsApp e Nome da sua loja para comprovantes automáticos.'
  },
  {
    id: 'navigation',
    targetId: 'tour-sidebar-nav',
    title: 'Menu de Navegação',
    badge: '2/4',
    icon: Menu,
    description: 'Acesse Ordens de Serviço, Clientes, Vendas, Estoque e Finanças a qualquer momento.'
  },
  {
    id: 'service_orders',
    targetId: 'tour-new-os-btn',
    tab: 'os',
    title: 'Criar Ordem de Serviço',
    badge: '3/4',
    icon: Wrench,
    description: 'Cadastre O.S. com fotos antes/depois, checklist, peças e link de rastreio.'
  },
  {
    id: 'install_app',
    targetId: 'tour-header-install',
    title: 'Instalar Aplicativo',
    badge: '4/4',
    icon: Download,
    description: 'Instale o app no celular ou PC para abrir rapidamente com 1 toque.'
  }
];

export const SpotlightTour: React.FC<SpotlightTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  activeTab,
  setActiveTab,
  onOpenInstallModal,
  onOpenSidebar,
  onCloseSidebar,
  tenantId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompletedState, setIsCompletedState] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  // Alterna a aba se a etapa exigir e abre/fecha o menu na etapa 2
  useEffect(() => {
    if (!isActive || isCompletedState || !step) return;

    if (step.id === 'navigation') {
      onOpenSidebar?.();
    } else {
      if (step.tab && activeTab !== step.tab) {
        setActiveTab(step.tab);
      }
      onCloseSidebar?.();
    }
  }, [isActive, isCompletedState, step, activeTab, setActiveTab, onOpenSidebar, onCloseSidebar]);

  // Encontra o elemento DOM alvo da etapa atual
  const getTargetElement = useCallback((): HTMLElement | null => {
    if (!step) return null;
    const isMobile = window.innerWidth < 768;

    if (step.id === 'navigation') {
      if (isMobile) {
        return document.getElementById('tour-mobile-header-menu') || document.getElementById('tour-mobile-nav');
      }
      return document.getElementById('tour-sidebar-nav');
    }

    if (step.id === 'install_app') {
      if (isMobile) {
        return document.getElementById('tour-mobile-install-btn') || document.getElementById('tour-header-install');
      }
      return document.getElementById('tour-header-install') || document.getElementById('tour-mobile-install-btn');
    }

    return document.getElementById(step.targetId);
  }, [step]);

  // Rola a tela suavemente para levar o usuário diretamente ao local exato de edição
  const scrollToTarget = useCallback((el: HTMLElement) => {
    const isMobile = window.innerWidth < 768;
    const container = document.getElementById('app-main-scroll-container') || el.closest('.overflow-y-auto');

    if (container && container instanceof HTMLElement) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = isMobile ? 12 : 24;
      const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - offset;
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    } else {
      el.scrollIntoView({
        behavior: 'smooth',
        block: isMobile ? 'start' : 'center',
        inline: 'nearest'
      });
    }
  }, []);

  // Executa rolagem imediata ao trocar de etapa para levar ao local exato
  useEffect(() => {
    if (isActive && step && !isCompletedState && step.id !== 'navigation') {
      const timer = setTimeout(() => {
        const el = getTargetElement();
        if (el) {
          scrollToTarget(el);
        }
      }, 80);

      const secondaryTimer = setTimeout(() => {
        const el = getTargetElement();
        if (el) {
          scrollToTarget(el);
        }
      }, 280);

      return () => {
        clearTimeout(timer);
        clearTimeout(secondaryTimer);
      };
    }
  }, [currentStepIndex, isActive, step, isCompletedState, getTargetElement, scrollToTarget]);

  if (!isActive) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsCompletedState(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      if (tenantId) {
        localStorage.setItem(`tour_completed_${tenantId}`, 'true');
      }
      localStorage.setItem('tour_completed_global', 'true');
    } catch (e) {}
    onCloseSidebar?.();
    onComplete();
  };

  return (
    <>
      {/* 
        BARRA DE GUIA MODERNA E ULTRA-COMPACTA NA BASE DA TELA
      */}
      {!isCompletedState ? (
        <div 
          className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-[10000] bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-3 shadow-2xl border border-slate-700/60 animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {/* Ícone e Título */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <step.icon size={13} />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-400/20 shrink-0">
                  {step.badge}
                </span>
                <h3 className="text-xs font-bold text-white tracking-tight truncate">
                  {step.title}
                </h3>
              </div>
            </div>

            {/* Marcadores de Progresso + Botão Fechar */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentStepIndex 
                        ? 'w-4 bg-blue-500' 
                        : idx < currentStepIndex 
                          ? 'w-1.5 bg-emerald-500' 
                          : 'w-1.5 bg-slate-700'
                    }`} 
                    title={`Ir para passo ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                title="Fechar Guia"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Descrição Compacta */}
          <p className="text-[11px] text-slate-300 leading-snug font-medium line-clamp-1 mb-2">
            {step.description}
          </p>

          {/* Ações */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <ChevronLeft size={13} />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-1.5">
              {step.id === 'install_app' && onOpenInstallModal && (
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download size={11} />
                  <span>Instalar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Concluir' : 'Próximo'}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CARD DE FINALIZAÇÃO COMPACTO */
        <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>

            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 inline-block mb-1.5">
              🎉 Guia Concluído!
            </span>

            <h2 className="text-base font-bold text-white uppercase tracking-tight mb-1.5">
              Tudo Pronto Para Usar!
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 font-medium">
              Você conheceu as principais funções do Lojas Cloud. Aproveite para cadastrar seus clientes e ordens de serviço!
            </p>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Começar a Usar</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
