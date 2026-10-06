import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Copy, 
  Check, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Instagram, 
  QrCode, 
  Share2, 
  ExternalLink, 
  Wifi, 
  Clock, 
  UserCheck, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Store,
  Compass,
  Zap
} from 'lucide-react';
import QRCode from 'qrcode';
import { AppSettings, BusinessCardSettings } from '../../types';
import { OnlineDB } from '../../utils/api';
import { 
  generatePixBrCode, 
  copyToClipboard, 
  downloadVCard, 
  generateWifiQrString, 
  downloadAppleWifiProfile 
} from '../../utils/pixPayload';

interface StoreBusinessCardPageProps {
  tenantIdOrSlug: string;
}

export const StoreBusinessCardPage: React.FC<StoreBusinessCardPageProps> = ({ tenantIdOrSlug }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tenantId, setTenantId] = useState<string>(tenantIdOrSlug);
  
  // Estados interativos
  const [pixCopied, setPixCopied] = useState(false);
  const [wifiCopied, setWifiCopied] = useState(false);
  const [wifiAutoConnectTriggered, setWifiAutoConnectTriggered] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showPixQrModal, setShowPixQrModal] = useState(false);
  const [showWifiQrModal, setShowWifiQrModal] = useState(false);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [wifiQrDataUrl, setWifiQrDataUrl] = useState<string | null>(null);
  const [pixCodePayload, setPixCodePayload] = useState<string>('');
  const [storeQrDataUrl, setStoreQrDataUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await OnlineDB.getPublicBusinessCard(tenantIdOrSlug);
        
        if (!isMounted) return;

        if (data && data.settings) {
          setSettings(data.settings);
          setTenantId(data.tenantId);
        } else if (data && data.tenantId) {
          setTenantId(data.tenantId);
          // Fallback settings mínimos
          setSettings({
            storeName: data.tenantInfo?.store_name || data.tenantInfo?.username || 'Nossa Loja',
            storePhone: data.tenantInfo?.phone || '',
            storeAddress: data.tenantInfo?.address || '',
            logoUrl: null,
            users: [],
            isConfigured: true,
            themePrimary: '#3b82f6',
            themeSidebar: '#1e293b',
            themeBg: '#ffffff',
            themeBottomTab: '#ffffff',
            pdfWarrantyText: '',
            pdfFontSize: 10,
            pdfFontFamily: 'helvetica',
            pdfPaperWidth: 80,
            pdfTextColor: '#000000',
            pdfBgColor: '#ffffff',
            itemsPerPage: 16
          });
        } else {
          setError('Não foi possível localizar as informações deste estabelecimento.');
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Falha ao carregar cartão de visita.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [tenantIdOrSlug]);

  // Extrai configurações do cartão ou padrões inteligentes da loja
  const card: BusinessCardSettings = settings?.businessCard || {};
  const storeName = card.customTitle || settings?.storeName || 'Nossa Loja';
  const subtitle = card.subtitle || 'Assistência Técnica Especializada & Produtos';
  const bio = card.bio || 'Conecte-se conosco através dos nossos canais oficiais, avalie nosso atendimento ou faça um Pix com segurança.';
  const logoUrl = settings?.logoUrl;
  const address = card.address || settings?.storeAddress || '';
  const phone = card.phone || settings?.storePhone || '';
  const whatsapp = card.whatsapp || settings?.storePhone || '';
  const instagram = card.instagram ? card.instagram.replace(/^@/, '') : '';
  const openingHours = card.openingHours || 'Seg a Sex: 08:30 - 18:00 · Sáb: 08:30 - 12:30';
  const themeStyle = card.themeStyle || 'cyber_dark';

  // Pix
  const pixKey = card.pixKey || '';
  const pixKeyType = card.pixKeyType || 'cnpj';
  const pixReceiverName = card.pixReceiverName || storeName;
  const pixCity = card.pixCity || settings?.storeCity || 'BRASIL';

  // Links do Google Maps
  const googleMapsReviewUrl = card.googleMapsReviewUrl || 
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName + ' ' + address)}` : 
     `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName)}`);
  
  const googleMapsLocationUrl = card.googleMapsLocationUrl || 
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : googleMapsReviewUrl);

  // Gera payload Pix e QR Code quando a chave existir
  useEffect(() => {
    if (pixKey) {
      try {
        const payload = generatePixBrCode({
          key: pixKey,
          name: pixReceiverName,
          city: pixCity,
          description: `Pagamento ${storeName.substring(0, 20)}`
        });
        setPixCodePayload(payload || pixKey);

        QRCode.toDataURL(payload || pixKey, {
          width: 320,
          margin: 2,
          color: { dark: '#020617', light: '#ffffff' }
        }).then(url => setPixQrDataUrl(url)).catch(() => {});
      } catch (e) {
        setPixCodePayload(pixKey);
      }
    }

    // QR Code da URL do próprio Cartão
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(window.location.href, {
        width: 280,
        margin: 2,
        color: { dark: '#090d16', light: '#ffffff' }
      }).then(url => setStoreQrDataUrl(url)).catch(() => {});
    }
  }, [pixKey, pixReceiverName, pixCity, storeName]);

  // Gera QR Code Universal de Wi-Fi (compatível com Android e iPhone nativos)
  useEffect(() => {
    if (card.wifiSsid) {
      const wifiPayload = generateWifiQrString(card.wifiSsid, card.wifiPassword || '');
      QRCode.toDataURL(wifiPayload, {
        width: 320,
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      }).then(url => setWifiQrDataUrl(url)).catch(() => {});
    } else {
      setWifiQrDataUrl(null);
    }
  }, [card.wifiSsid, card.wifiPassword]);

  // Ações interativas
  const handleCopyPix = async () => {
    const toCopy = pixCodePayload || pixKey;
    const ok = await copyToClipboard(toCopy);
    if (ok) {
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const handleCopyWifi = async () => {
    if (!card.wifiPassword) return;
    const ok = await copyToClipboard(card.wifiPassword);
    if (ok) {
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 3000);
    }
  };

  const handleConnectWifi = async () => {
    const ssid = card.wifiSsid || '';
    const password = card.wifiPassword || '';
    const wifiUri = generateWifiQrString(ssid, password);

    // 1. Copia a senha imediatamente para a área de transferência do celular
    if (password) {
      await copyToClipboard(password);
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 3500);
    }

    setWifiAutoConnectTriggered(true);
    setTimeout(() => setWifiAutoConnectTriggered(false), 3500);

    // 2. Dispara tentativa do protocolo universal WIFI:
    // Em navegadores móveis e sistemas com leitor integrado, invoca o diálogo de conexão nativo
    try {
      const a = document.createElement('a');
      a.href = wifiUri;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}

    // 3. Em iOS (iPhone / iPad), gera e faz download do perfil de rede automática
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS && ssid) {
      try {
        downloadAppleWifiProfile({ ssid, password, storeName });
      } catch (e) {}
    }

    // 4. Exibe o modal com o QR Code de alta resolução para escanear ou ler com a câmera
    setShowWifiQrModal(true);
  };

  const handleShare = async () => {
    const shareData = {
      title: storeName,
      text: `${storeName} · Conheça nossos canais oficiais, avalie no Google e confira novidades!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {}
    }

    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  const handleSaveContact = () => {
    downloadVCard({
      name: storeName,
      phone: phone,
      whatsapp: whatsapp,
      address: address,
      instagram: instagram,
      website: window.location.href
    });
  };

  // Esquemas de Cores dos Temas Visuais
  const themeClasses = {
    cyber_dark: {
      wrapper: 'bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white',
      accentGlow: 'from-blue-600/20 via-indigo-600/10 to-transparent',
      cardBg: 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700/80 shadow-xl backdrop-blur-md',
      specialGoogleCard: 'bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-amber-950/20 border-amber-500/30 hover:border-amber-400/60 shadow-amber-500/5',
      specialPixCard: 'bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-emerald-950/20 border-emerald-500/40 hover:border-emerald-400/70 shadow-emerald-500/5',
      specialInstaCard: 'bg-gradient-to-br from-pink-500/15 via-slate-900/90 to-purple-950/20 border-pink-500/30 hover:border-pink-400/60',
      primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25',
      pixBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30',
      googleBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25',
      instaBtn: 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white shadow-lg shadow-pink-500/20',
      whatsappBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25',
      tagText: 'text-slate-400',
      borderSubtle: 'border-slate-800/80'
    },
    emerald_luxury: {
      wrapper: 'bg-[#04150f] text-emerald-50 selection:bg-emerald-500 selection:text-slate-950',
      accentGlow: 'from-emerald-600/25 via-teal-600/10 to-transparent',
      cardBg: 'bg-[#082218]/85 border-emerald-900/60 hover:border-emerald-700/60 shadow-xl backdrop-blur-md',
      specialGoogleCard: 'bg-gradient-to-br from-amber-500/15 via-[#082218]/90 to-amber-900/20 border-amber-500/40 hover:border-amber-400/70',
      specialPixCard: 'bg-gradient-to-br from-emerald-500/25 via-[#082218]/90 to-teal-900/30 border-emerald-400/50 hover:border-emerald-300',
      specialInstaCard: 'bg-gradient-to-br from-rose-500/15 via-[#082218]/90 to-amber-900/15 border-rose-500/35 hover:border-rose-400/60',
      primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30',
      pixBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30',
      googleBtn: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-400/30',
      instaBtn: 'bg-gradient-to-r from-pink-500 to-amber-500 text-white font-black',
      whatsappBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30',
      tagText: 'text-emerald-300/70',
      borderSubtle: 'border-emerald-900/50'
    },
    gold_vip: {
      wrapper: 'bg-[#09090b] text-amber-50 selection:bg-amber-500 selection:text-black',
      accentGlow: 'from-amber-500/20 via-orange-600/10 to-transparent',
      cardBg: 'bg-[#121217]/90 border-amber-900/40 hover:border-amber-600/50 shadow-xl backdrop-blur-md',
      specialGoogleCard: 'bg-gradient-to-br from-amber-500/20 via-[#141419]/90 to-amber-950/30 border-amber-500/50 hover:border-amber-400',
      specialPixCard: 'bg-gradient-to-br from-emerald-500/15 via-[#121217]/90 to-emerald-950/20 border-emerald-500/40 hover:border-emerald-400/70',
      specialInstaCard: 'bg-gradient-to-br from-pink-500/15 via-[#121217]/90 to-purple-950/20 border-pink-500/35 hover:border-pink-400/60',
      primaryBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25',
      pixBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30',
      googleBtn: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black shadow-lg shadow-amber-400/30',
      instaBtn: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
      whatsappBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      tagText: 'text-amber-200/60',
      borderSubtle: 'border-amber-900/30'
    },
    ocean_tech: {
      wrapper: 'bg-[#060c18] text-cyan-50 selection:bg-cyan-500 selection:text-slate-950',
      accentGlow: 'from-cyan-500/20 via-blue-600/15 to-transparent',
      cardBg: 'bg-[#0c162c]/85 border-cyan-900/40 hover:border-cyan-600/50 shadow-xl backdrop-blur-md',
      specialGoogleCard: 'bg-gradient-to-br from-amber-500/15 via-[#0c162c]/90 to-amber-950/20 border-amber-500/40 hover:border-amber-400',
      specialPixCard: 'bg-gradient-to-br from-emerald-500/20 via-[#0c162c]/90 to-teal-950/20 border-emerald-500/50 hover:border-emerald-400',
      specialInstaCard: 'bg-gradient-to-br from-pink-500/15 via-[#0c162c]/90 to-purple-950/20 border-pink-500/30 hover:border-pink-400',
      primaryBtn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/30',
      pixBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30',
      googleBtn: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black',
      instaBtn: 'bg-gradient-to-r from-pink-500 to-violet-600 text-white',
      whatsappBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      tagText: 'text-cyan-300/70',
      borderSubtle: 'border-cyan-900/40'
    },
    clean_minimal: {
      wrapper: 'bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white',
      accentGlow: 'from-slate-200/60 via-slate-100/30 to-transparent',
      cardBg: 'bg-white border-slate-200 hover:border-slate-300 shadow-md',
      specialGoogleCard: 'bg-amber-50/70 border-amber-200 hover:border-amber-300',
      specialPixCard: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300',
      specialInstaCard: 'bg-pink-50/60 border-pink-200 hover:border-pink-300',
      primaryBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md',
      pixBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20',
      googleBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md',
      instaBtn: 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-md',
      whatsappBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md',
      tagText: 'text-slate-500',
      borderSubtle: 'border-slate-200'
    }
  };

  const currentTheme = themeClasses[themeStyle] || themeClasses.cyber_dark;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <Loader2 className="animate-spin text-blue-500" size={44} />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Carregando Cartão Oficial...</p>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-lg font-black uppercase tracking-tight mb-2">Cartão Não Localizado</h1>
        <p className="text-xs text-slate-400 max-w-sm mb-6">{error || 'Verifique o link informado e tente novamente.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col items-center justify-start p-4 sm:p-6 transition-colors duration-500 overflow-x-hidden ${currentTheme.wrapper}`}>
      {/* Luz ambiente de fundo */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-gradient-to-b ${currentTheme.accentGlow} blur-3xl pointer-events-none -z-10`} />

      {/* Barra Superior Discreta de Ações Rápidas */}
      <header className="w-full max-w-md flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Canal Verificado</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl border border-current/15 hover:bg-white/10 active:scale-90 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            title="Compartilhar Cartão"
          >
            {shareSuccess ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Share2 size={13} />
                <span>Compartilhar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* CONTAINER PRINCIPAL DO CARTÃO (Largura perfeita mobile-first) */}
      <main className="w-full max-w-md space-y-3.5 pb-16">
        
        {/* 1. CABEÇALHO HERO COM IDENTIDADE DA LOJA */}
        <div className={`p-6 rounded-3xl border text-center relative overflow-hidden transition-all ${currentTheme.cardBg}`}>
          {/* Status Ao Vivo: Aberto / Horário */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-4 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Atendimento Aberto</span>
          </div>

          {/* Logo da Loja */}
          <div className="relative mx-auto w-24 h-24 mb-3.5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-md" />
            <div className="relative w-24 h-24 rounded-2xl bg-slate-900 border-2 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
              ) : (
                <Store size={38} className="text-blue-400" />
              )}
            </div>
          </div>

          {/* Nome e Título */}
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-1 text-balance">
            {storeName}
          </h1>

          <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
            {subtitle}
          </p>

          <p className="text-xs font-normal opacity-85 leading-relaxed text-pretty max-w-xs mx-auto mb-4">
            {bio}
          </p>

          {/* Botão de Salvar Contato no Celular (vCard) */}
          <button
            onClick={handleSaveContact}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-current/20 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <UserCheck size={14} className="text-emerald-400" />
            <span>Salvar Contato na Agenda</span>
          </button>
        </div>

        {/* 2. CARD ESTRELA: AVALIAÇÃO NO GOOGLE MAPS (5 ESTRELAS) */}
        {card.showReviewsButton !== false && (
          <a
            href={googleMapsReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-5 rounded-3xl border transition-all duration-300 group active:scale-[0.98] ${currentTheme.specialGoogleCard}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/30 shrink-0">
                  <Star size={22} className="fill-slate-950" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                    Google Maps · 5 Estrelas
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-tight">
                    Avalie Nosso Atendimento
                  </h2>
                </div>
              </div>
              <ExternalLink size={16} className="text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>

            <p className="text-xs opacity-90 leading-relaxed mb-3.5">
              Sua avaliação faz toda a diferença! Conte como foi sua experiência conosco e ajude novos clientes.
            </p>

            {/* Estrelas ilustrativas interativas */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/25 border border-amber-500/20">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={18} className="text-amber-400 fill-amber-400 animate-pulse" />
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                Deixar 5★ no Google
              </span>
            </div>
          </a>
        )}

        {/* 3. CARD CHAVE PIX CÓPIA E COLA & QR CODE */}
        {card.showPixButton !== false && pixKey && (
          <div className={`p-5 rounded-3xl border transition-all duration-300 ${currentTheme.specialPixCard}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/30 shrink-0">
                  <QrCode size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    Pagamento Instantâneo · Pix Oficial
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-tight">
                    Chave Pix da Loja
                  </h2>
                </div>
              </div>

              {pixQrDataUrl && (
                <button
                  type="button"
                  onClick={() => setShowPixQrModal(true)}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 active:scale-95 transition-all"
                  title="Ver QR Code para escanear"
                >
                  Ver QR Code
                </button>
              )}
            </div>

            {/* Caixa da chave */}
            <div className="p-3 rounded-2xl bg-black/30 border border-emerald-500/30 mb-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
                <span className="uppercase">{pixKeyType}:</span>
                <span className="font-bold truncate max-w-[200px]">{pixReceiverName}</span>
              </div>
              <div className="font-mono text-xs sm:text-sm font-black tracking-wider break-all text-emerald-300">
                {pixKey}
              </div>
            </div>

            {/* Botão Gigante de Cópia com 1 toque */}
            <button
              type="button"
              onClick={handleCopyPix}
              className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer ${
                pixCopied ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/50' : currentTheme.pixBtn
              }`}
            >
              {pixCopied ? (
                <>
                  <CheckCircle2 size={18} className="animate-bounce" />
                  <span>Chave Pix Copiada com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Copiar Chave Pix Cópia e Cola</span>
                </>
              )}
            </button>
            <p className="text-[9px] text-center opacity-70 mt-2">
              Clique acima para copiar e cole diretamente no aplicativo do seu banco.
            </p>
          </div>
        )}

        {/* 4. CARD INSTAGRAM OFICIAL */}
        {card.showInstagramButton !== false && instagram && (
          <a
            href={`https://instagram.com/${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-5 rounded-3xl border transition-all duration-300 group active:scale-[0.98] ${currentTheme.specialInstaCard}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-pink-500/30 shrink-0">
                  <Instagram size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-400">
                    Rede Social Oficial
                  </span>
                  <h2 className="text-sm font-black tracking-tight flex items-center gap-1">
                    <span>@{instagram}</span>
                  </h2>
                  <p className="text-[10px] opacity-75">
                    Fotos de serviços, produtos e bastidores da loja
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-pink-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        )}

        {/* 5. CARD WHATSAPP OFICIAL DE ATENDIMENTO */}
        {card.showWhatsAppButton !== false && whatsapp && (
          <a
            href={`https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
              card.whatsappMessage || `Olá! Vi o cartão de visita digital da ${storeName} e gostaria de atendimento.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-5 rounded-3xl border transition-all duration-300 group active:scale-[0.98] ${currentTheme.cardBg}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30 shrink-0">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    Conversa Direta no WhatsApp
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-tight">
                    Falar com Atendente
                  </h2>
                  <p className="text-[10px] opacity-75">
                    {phone || whatsapp} · Resposta ágil
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        )}

        {/* 6. CARD LOCALIZAÇÃO / ENDEREÇO FÍSICO */}
        {card.showLocationButton !== false && address && (
          <a
            href={googleMapsLocationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-5 rounded-3xl border transition-all duration-300 group active:scale-[0.98] ${currentTheme.cardBg}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-600/30 shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                    Como Chegar · Rota no Mapa
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-tight">
                    Nossa Localização
                  </h2>
                  <p className="text-xs opacity-90 leading-relaxed mt-1">
                    {address}
                  </p>
                </div>
              </div>
              <Compass size={18} className="text-purple-400 group-hover:rotate-45 transition-transform shrink-0" />
            </div>
          </a>
        )}

        {/* 7. CARD WI-FI INTELIGENTE: QR CODE & CONEXÃO AUTOMÁTICA EM 1 TOQUE */}
        {card.showWifiButton !== false && (card.wifiSsid || card.wifiPassword) && (
          <div className={`p-5 rounded-3xl border transition-all duration-300 ${currentTheme.cardBg}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/30 shrink-0">
                  <Wifi size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                    Wi-Fi Gratuito · Balcão
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-tight">
                    Wi-Fi da Loja
                  </h2>
                </div>
              </div>

              {wifiQrDataUrl && (
                <button
                  type="button"
                  onClick={() => setShowWifiQrModal(true)}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  title="Ver QR Code do Wi-Fi"
                >
                  <QrCode size={12} />
                  <span>QR Code</span>
                </button>
              )}
            </div>

            {/* Dados da Rede e Senha */}
            <div className="p-3 rounded-2xl bg-black/25 border border-current/10 mb-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] opacity-70">
                <span className="uppercase font-bold tracking-wider">Rede:</span>
                <span className="font-bold text-amber-300">{card.wifiSsid || 'Wi-Fi Clientes'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[9px] uppercase tracking-wider opacity-60 block">Senha:</span>
                  <span className="text-xs sm:text-sm font-mono font-black tracking-wider break-all text-white">
                    {card.wifiPassword || 'Disponível no balcão'}
                  </span>
                </div>
                {card.wifiPassword && (
                  <button
                    type="button"
                    onClick={handleCopyWifi}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer ${
                      wifiCopied ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    }`}
                  >
                    {wifiCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{wifiCopied ? 'Copiada' : 'Copiar'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Botão de Conexão Automática com 1 Toque */}
            <button
              type="button"
              onClick={handleConnectWifi}
              className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer ${
                wifiAutoConnectTriggered ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/40' : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25'
              }`}
            >
              <Zap size={16} className={wifiAutoConnectTriggered ? 'animate-bounce' : ''} />
              <span>{wifiAutoConnectTriggered ? 'Senha Copiada! Conectando...' : 'Conectar ao Wi-Fi Automaticamente'}</span>
            </button>
            <p className="text-[9px] text-center opacity-65 mt-2">
              Clique para conectar no celular ou toque em <strong>QR Code</strong> para escanear com a câmera.
            </p>
          </div>
        )}

        {/* 9. HORÁRIO DE FUNCIONAMENTO */}
        <div className={`p-4 rounded-2xl border text-center text-xs opacity-80 ${currentTheme.cardBg}`}>
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            <Clock size={12} />
            <span>Horário de Funcionamento</span>
          </div>
          <p className="font-semibold text-[11px]">{openingHours}</p>
        </div>

        {/* 10. QR CODE DE BALCÃO PARA COMPARTILHAR */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
          >
            <QrCode size={14} />
            <span>Exibir QR Code deste Cartão</span>
          </button>
        </div>
      </main>

      {/* RODAPÉ ELEGANTE */}
      <footer className="mt-auto py-4 text-center text-[9px] font-bold uppercase tracking-widest opacity-40">
        <span>{storeName} · Cartão Digital Inteligente</span>
      </footer>

      {/* MODAL 1: QR CODE PIX EM ALTA RESOLUÇÃO */}
      {showPixQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-950 border border-emerald-500/40 p-6 text-center text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Escanear Chave Pix
              </span>
              <button onClick={() => setShowPixQrModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
              {pixQrDataUrl && (
                <img src={pixQrDataUrl} alt="QR Code Pix" className="w-60 h-60 object-contain mx-auto" />
              )}
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-black uppercase text-emerald-400">{pixReceiverName}</p>
              <p className="text-[10px] opacity-70 font-mono break-all">{pixKey}</p>
            </div>

            <button
              onClick={handleCopyPix}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              {pixCopied ? 'Chave Copiada!' : 'Copiar Chave Pix'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: QR CODE WI-FI PARA CONEXÃO AUTOMÁTICA */}
      {showWifiQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-950 border border-amber-500/40 p-6 text-center text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Wifi size={14} />
                Conectar ao Wi-Fi da Loja
              </span>
              <button onClick={() => setShowWifiQrModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
              {wifiQrDataUrl ? (
                <img src={wifiQrDataUrl} alt="QR Code Wi-Fi" className="w-56 h-56 object-contain mx-auto" />
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-800 text-xs">
                  <Wifi size={32} className="text-amber-500 mb-2" />
                  <span>Configure a rede e senha nos ajustes</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-black uppercase text-amber-400">{card.wifiSsid || 'Wi-Fi da Loja'}</p>
              <p className="text-[11px] opacity-80 font-mono">Senha: <strong>{card.wifiPassword || 'Livre'}</strong></p>
              <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                Aponte a câmera do celular para este QR Code para adicionar a rede e se conectar automaticamente sem digitar a senha!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyWifi}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
              >
                {wifiCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{wifiCopied ? 'Senha Copiada' : 'Copiar Senha'}</span>
              </button>

              <button
                type="button"
                onClick={handleConnectWifi}
                className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
              >
                <Zap size={12} />
                <span>Conectar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QR CODE DO CARTÃO PARA IMPRESSÃO OU BALCÃO */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-950 border border-slate-800 p-6 text-center text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                QR Code de Acesso Rápido
              </span>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
              {storeQrDataUrl && (
                <img src={storeQrDataUrl} alt="QR Code da Loja" className="w-56 h-56 object-contain mx-auto" />
              )}
            </div>

            <p className="text-xs text-slate-300">
              Aponte a câmera do celular para abrir o cartão digital oficial da <strong>{storeName}</strong>.
            </p>

            <button
              onClick={handleShare}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              Compartilhar Link do Cartão
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
