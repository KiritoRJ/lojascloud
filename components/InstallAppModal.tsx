import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Apple, CheckCircle2, Download, Share, PlusSquare, ArrowRight, X, Sparkles, HelpCircle, ShieldCheck } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}) => {
  const [activePlatform, setActivePlatform] = useState<'auto' | 'android' | 'ios' | 'desktop'>('auto');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Detecta se já está instalado em modo standalone
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Detecta plataforma do usuário
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setActivePlatform('ios');
    } else if (/android/i.test(ua)) {
      setActivePlatform('android');
    } else {
      setActivePlatform('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      alert("Para instalar neste navegador, use o menu de opções (3 pontinhos) e clique em 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
      return;
    }

    try {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onInstallSuccess?.();
        onClose();
      }
    } catch (e) {
      console.error("Erro ao solicitar instalação nativa:", e);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100 relative my-auto">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all active:scale-90 z-10 cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <Smartphone size={32} className="animate-pulse" />
          </div>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full tracking-widest inline-flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-blue-500" />
            Aplicativo Oficial Lojas Cloud
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            Instalar no Aparelho
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Acesse sua loja com 1 toque na tela inicial, mais rápido, tela cheia e sem abrir o navegador.
          </p>
        </div>

        {/* Status se já estiver instalado */}
        {isStandalone ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl text-center mb-6 space-y-2">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-black text-emerald-800 uppercase">Você já está usando o App Instalado!</h3>
            <p className="text-xs text-emerald-700">O Lojas Cloud já está configurado no seu dispositivo.</p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all"
            >
              Continuar Usando
            </button>
          </div>
        ) : (
          <>
            {/* Seletor de Plataforma */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 gap-1">
              <button
                type="button"
                onClick={() => setActivePlatform('android')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePlatform === 'android'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Smartphone size={14} />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('ios')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePlatform === 'ios'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Apple size={14} />
                <span>iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('desktop')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePlatform === 'desktop'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Monitor size={14} />
                <span>Computador</span>
              </button>
            </div>

            {/* Conteúdo por Plataforma */}
            {activePlatform === 'android' && (
              <div className="space-y-4">
                {deferredPrompt ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-blue-900 font-bold">
                      Seu navegador suporta instalação direta com 1 clique!
                    </p>
                    <button
                      type="button"
                      onClick={handleNativeInstall}
                      disabled={isInstalling}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={18} />
                      <span>{isInstalling ? 'Instalando...' : 'Instalar App no Android'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-slate-800">
                      Como instalar no Android via Google Chrome:
                    </p>
                    <ol className="space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Toque no botão de <strong>menu (3 pontinhos verticais ⋮)</strong> no canto superior direito do Chrome.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Confirme tocando em <strong>"Instalar"</strong>. O ícone da sua loja aparecerá na tela do celular.</span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {activePlatform === 'ios' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Apple size={16} className="text-slate-900" />
                  <span>Passo a passo para iPhone / iPad (Safari):</span>
                </div>
                
                <div className="space-y-3 text-xs text-slate-600 pt-1">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <Share size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-[11px] uppercase">1. Toque em Compartilhar</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Na barra inferior do Safari, toque no ícone de quadrado com uma seta para cima (Compartilhar).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <PlusSquare size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-[11px] uppercase">2. Adicionar à Tela de Início</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Role o menu para baixo e selecione a opção <strong>"Adicionar à Tela de Início"</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-[11px] uppercase">3. Confirmar "Adicionar"</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Toque em <strong>"Adicionar"</strong> no canto superior direito para finalizar.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePlatform === 'desktop' && (
              <div className="space-y-4">
                {deferredPrompt ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-blue-900 font-bold">
                      Instale o Lojas Cloud no seu computador como um programa nativo!
                    </p>
                    <button
                      type="button"
                      onClick={handleNativeInstall}
                      disabled={isInstalling}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Monitor size={18} />
                      <span>{isInstalling ? 'Instalando...' : 'Instalar no Computador'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-slate-800">
                      Como instalar no PC (Google Chrome ou Microsoft Edge):
                    </p>
                    <ol className="space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Olhe para a <strong>barra de endereço</strong> do seu navegador (onde fica o link do site).</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Clique no ícone de <strong>computador com uma seta para baixo</strong> ou <strong>"+"</strong> que aparece no lado direito da barra.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Clique em <strong>"Instalar"</strong>. O Lojas Cloud abrirá em janela própria na sua área de trabalho!</span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Vantagens */}
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Abre em tela cheia</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Funciona offline</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Acesso ultra rápido</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Não ocupa memória</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botão Concluir */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 cursor-pointer"
          >
            Entendido / Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
