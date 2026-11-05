import React, { useState, useEffect } from 'react';
import { 
  X, Check, Copy, ExternalLink, Printer, 
  Smartphone, User, Eye, Send, Image as ImageIcon, Loader2, Download,
  CheckCircle2, QrCode, ShieldCheck, ChevronDown, ChevronUp, MessageCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { ServiceOrder, AppSettings, DeviceDiagnosticResults } from '../types';
import { formatCurrency, getHardwareTestUrl, getTrackingUrl, normalizeWhatsAppNumber, getWhatsAppDirectUrl } from '../utils';
import { generateReceiptCanvasImage, shareReceiptDirectly } from '../utils/receiptGenerator';
import { DiagnosticReportModal } from './DiagnosticReportModal';

interface SavedOrderShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder | null;
  isNew?: boolean;
  settings: AppSettings;
  onPrint?: (order: ServiceOrder) => void;
}

export const SavedOrderShareModal: React.FC<SavedOrderShareModalProps> = ({
  isOpen,
  onClose,
  order,
  isNew = false,
  settings,
  onPrint
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTestLink, setCopiedTestLink] = useState(false);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [, setPreviewImageUrl] = useState<string | null>(null);
  const [photoSentFeedback, setPhotoSentFeedback] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showDiagnosticReport, setShowDiagnosticReport] = useState(false);
  const [showHardwareSection, setShowHardwareSection] = useState(false);

  const getOrderDiagnostics = (): DeviceDiagnosticResults | null => {
    if (!order) return null;
    if (order.diagnosticTests) return order.diagnosticTests;
    if (Array.isArray(order.checklist)) {
      for (const item of order.checklist) {
        if (typeof item === 'string' && item.startsWith('__DIAG_JSON__:')) {
          try {
            return JSON.parse(item.substring(14));
          } catch (e) {}
        }
      }
    }
    try {
      const targetToken = order.trackingToken || order.id;
      const cached = localStorage.getItem(`os_diag_${targetToken}`) || localStorage.getItem(`os_diag_${order.id}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  };

  useEffect(() => {
    if (isOpen && order) {
      // Pré-carrega o comprovante em background
      generateReceiptCanvasImage(order, settings)
        .then(res => setPreviewImageUrl(res.dataUrl))
        .catch(err => console.warn('Erro ao pré-carregar imagem:', err));

      // QR Code de testes
      const targetToken = order.trackingToken || order.id;
      const hardwareTestUrl = getHardwareTestUrl(targetToken, settings);
      QRCode.toDataURL(hardwareTestUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Erro ao gerar QR Code:', err));
    } else {
      setPreviewImageUrl(null);
      setPhotoSentFeedback(null);
      setCopiedLink(false);
      setCopiedTestLink(false);
      setQrCodeDataUrl(null);
      setShowHardwareSection(false);
    }
  }, [isOpen, order, settings]);

  if (!isOpen || !order) return null;

  const storeName = settings?.storeName || 'Assistência Técnica';
  const osCode = order.id ? `#${order.id.split('-')[0]}` : '';
  const normalizedPhone = normalizeWhatsAppNumber(order.phoneNumber);
  const trackingToken = order.trackingToken || order.id;
  const trackingUrl = getTrackingUrl(trackingToken, settings);
  const hardwareTestUrl = getHardwareTestUrl(trackingToken, settings);
  const diagResults = getOrderDiagnostics();

  const handleCopyTestLink = () => {
    navigator.clipboard.writeText(hardwareTestUrl);
    setCopiedTestLink(true);
    setTimeout(() => setCopiedTestLink(false), 2500);
  };

  const handleShareTestWhatsApp = () => {
    const customerName = (order.customerName || 'Cliente').trim();
    const device = [order.deviceBrand, order.deviceModel].filter(Boolean).join(' ').trim() || 'Aparelho';

    const text = 
      `*${storeName}* 🛠️\n` +
      `*Teste de Funções do Aparelho - O.S. ${osCode}*\n\n` +
      `Olá, *${customerName}*! 👋\n\n` +
      `Para testar as funções do equipamento (*${device}*), acesse o link de diagnóstico no aparelho:\n` +
      `👉 ${hardwareTestUrl}\n\n` +
      `_Os resultados dos testes serão salvos automaticamente na sua O.S._ 📋`;
    const targetUrl = getWhatsAppDirectUrl(normalizedPhone, text);
    window.open(targetUrl, '_blank');
  };

  // Enviar Foto do Comprovante direto para o WhatsApp do cliente
  const handleShareReceiptPhoto = async () => {
    setIsGeneratingPhoto(true);
    setPhotoSentFeedback(null);
    try {
      const res = await shareReceiptDirectly(order, settings);
      if (res.method === 'copied-whatsapp') {
        setPhotoSentFeedback('Foto copiada e baixada! Cole (Ctrl+V) no WhatsApp.');
      } else {
        setPhotoSentFeedback('Foto baixada e conversa do WhatsApp aberta!');
      }
      setTimeout(() => setPhotoSentFeedback(null), 4000);
    } catch (err) {
      console.error('Erro ao compartilhar foto do comprovante:', err);
      alert('Não foi possível gerar a foto do comprovante.');
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  // Baixar imagem do comprovante
  const handleDownloadPhoto = async () => {
    setIsGeneratingPhoto(true);
    try {
      const res = await generateReceiptCanvasImage(order, settings);
      const a = document.createElement('a');
      a.href = res.dataUrl;
      a.download = `OS_${order.id || 'comprovante'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setPhotoSentFeedback('Comprovante baixado!');
      setTimeout(() => setPhotoSentFeedback(null), 3000);
    } catch (e) {
      console.error('Erro ao baixar:', e);
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  // Enviar link de acompanhamento no WhatsApp do cliente
  const handleShareTrackingWhatsApp = () => {
    const customerName = (order.customerName || 'Cliente').trim();
    const device = [order.deviceBrand, order.deviceModel].filter(Boolean).join(' ').trim() || 'Aparelho';

    const text = 
      `*${storeName}* 🛠️\n` +
      `*Acompanhamento de O.S. ${osCode}*\n\n` +
      `Olá, *${customerName}*! 👋\n\n` +
      `📱 *Aparelho:* ${device}\n` +
      `🔗 *Acompanhe em tempo real:* ${trackingUrl}\n\n` +
      `Qualquer dúvida, estamos à disposição! 🤝`;
    const targetUrl = getWhatsAppDirectUrl(normalizedPhone, text);
    window.open(targetUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      prompt('Copie o link de acompanhamento:', trackingUrl);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto relative animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO COMPACTO */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 border border-white/20">
              <Check size={18} className="stroke-[3]" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none text-white">
                {isNew ? 'Ordem de Serviço Criada!' : 'Ordem de Serviço Salva!'}
              </h3>
              <p className="text-emerald-100 text-[11px] mt-0.5 font-mono">
                O.S. <strong className="text-white font-bold">{osCode}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[82vh] overflow-y-auto">
          {/* RESUMO COMPACTO DO CLIENTE E APARELHO */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <User size={13} className="text-slate-500 shrink-0" />
                <span className="font-bold text-slate-800 truncate uppercase">
                  {order.customerName || 'Cliente sem nome'}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                {order.status || 'Recebido'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Aparelho</span>
                <span className="font-semibold text-slate-700 truncate block">
                  {order.deviceBrand || ''} {order.deviceModel || 'Aparelho'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Total</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(order.total || 0)}
                </span>
              </div>
            </div>

            {/* Número de Telefone / Status WhatsApp Direto */}
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Smartphone size={12} className="text-slate-400" />
                {order.phoneNumber ? order.phoneNumber : 'Telefone não informado'}
              </span>
              {normalizedPhone ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  WhatsApp Pronto
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
                  Sem número cadastrado
                </span>
              )}
            </div>
          </div>

          {/* FEEDBACK DE SUCESSO */}
          {photoSentFeedback && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
              <span>{photoSentFeedback}</span>
            </div>
          )}

          {/* BOTÕES PRINCIPAIS DE WHATSAPP (COMPACTOS E DIRETOS) */}
          <div className="space-y-2">
            {/* 1. ENVIAR FOTO NO WHATSAPP */}
            <button
              type="button"
              onClick={handleShareReceiptPhoto}
              disabled={isGeneratingPhoto}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white p-3 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm shadow-emerald-700/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                  {isGeneratingPhoto ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <ImageIcon size={16} className="text-white" />
                  )}
                </div>
                <div className="text-left">
                  <div className="leading-tight flex items-center gap-1.5">
                    <span>Enviar Foto no WhatsApp</span>
                    <span className="text-[9px] bg-emerald-500/60 uppercase font-black px-1.5 py-0.2 rounded text-emerald-100">
                      Direto
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-100 font-normal">
                    {normalizedPhone ? `Abre direto a conversa de ${order.customerName || 'Cliente'}` : 'Baixa a imagem e abre o WhatsApp'}
                  </p>
                </div>
              </div>
              <Send size={15} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* 2. ENVIAR LINK NO WHATSAPP */}
            <button
              type="button"
              onClick={handleShareTrackingWhatsApp}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white p-3 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm shadow-blue-700/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                  <MessageCircle size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="leading-tight">
                    <span>Enviar Link no WhatsApp</span>
                  </div>
                  <p className="text-[10px] text-blue-100 font-normal">
                    Link de acompanhamento online ao vivo
                  </p>
                </div>
              </div>
              <Send size={15} className="text-blue-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* BARRA DE AÇÕES SECUNDÁRIAS COMPACTAS (IMPRIMIR / BAIXAR / COPIAR LINK) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {onPrint ? (
              <button
                type="button"
                onClick={() => onPrint(order)}
                className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimir via do comprovante"
              >
                <Printer size={13} className="text-slate-500 shrink-0" />
                <span>Imprimir</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleDownloadPhoto}
              disabled={isGeneratingPhoto}
              className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar imagem no aparelho"
            >
              <Download size={13} className="text-slate-500 shrink-0" />
              <span>Baixar Foto</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar link de rastreio"
            >
              {copiedLink ? <Check size={13} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="text-slate-500 shrink-0" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          {/* SEÇÃO EXPANSÍVEL: TESTES DE HARDWARE & QR CODE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowHardwareSection(!showHardwareSection)}
              className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <QrCode size={14} className="text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-700">
                  Testes de Hardware & QR Code
                </span>
                {diagResults && (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    Laudo Gravado
                  </span>
                )}
              </div>
              {showHardwareSection ? (
                <ChevronUp size={14} className="text-slate-400" />
              ) : (
                <ChevronDown size={14} className="text-slate-400" />
              )}
            </button>

            {showHardwareSection && (
              <div className="p-3 border-t border-slate-200 bg-white space-y-2.5 animate-in fade-in">
                {diagResults && (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <span className="text-emerald-900 font-semibold text-[11px]">
                      Status: {diagResults.summary || 'Aprovado'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDiagnosticReport(true)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center gap-1"
                    >
                      <ShieldCheck size={11} />
                      <span>Ver Laudo</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code"
                      className="w-20 h-20 border border-slate-200 rounded-lg p-1 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Aponte a câmera do aparelho do cliente para testar touch, áudio, câmeras e biometria.
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <a
                        href={hardwareTestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <ExternalLink size={10} />
                        <span>Abrir Testes</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleShareTestWhatsApp}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={10} />
                        <span>No WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyTestLink}
                        className="p-1 hover:bg-slate-100 text-slate-500 rounded cursor-pointer"
                        title="Copiar link de teste"
                      >
                        {copiedTestLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ COMPACTO */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* MODAL DE LAUDO TÉCNICO DE HARDWARE */}
      <DiagnosticReportModal
        isOpen={showDiagnosticReport}
        onClose={() => setShowDiagnosticReport(false)}
        order={order}
        settings={settings}
      />
    </div>
  );
};

