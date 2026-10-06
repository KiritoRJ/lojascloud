import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Printer, 
  Star, 
  QrCode, 
  Instagram, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Wifi, 
  Clock, 
  Sparkles, 
  Eye, 
  Palette, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Store,
  Layers,
  Smartphone,
  Zap
} from 'lucide-react';
import QRCode from 'qrcode';
import { AppSettings, BusinessCardSettings } from '../../types';
import { copyToClipboard, generateWifiQrString } from '../../utils/pixPayload';

interface BusinessCardSettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void> | void;
  onBack: () => void;
  tenantId: string;
}

export const BusinessCardSettingsView: React.FC<BusinessCardSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onBack,
  tenantId
}) => {
  const [formData, setFormData] = useState<BusinessCardSettings>(() => {
    const existing = settings.businessCard || {};
    return {
      enabled: existing.enabled !== false,
      customTitle: existing.customTitle || settings.storeName || '',
      subtitle: existing.subtitle || 'Assistência Técnica Especializada & Produtos',
      bio: existing.bio || 'Conecte-se conosco através dos nossos canais oficiais, avalie nosso atendimento no Google ou realize pagamentos via Pix com rapidez.',
      googleMapsReviewUrl: existing.googleMapsReviewUrl || '',
      googleMapsPlaceName: existing.googleMapsPlaceName || settings.storeName || '',
      googleMapsLocationUrl: existing.googleMapsLocationUrl || '',
      instagram: existing.instagram || '',
      pixKey: existing.pixKey || '',
      pixKeyType: existing.pixKeyType || 'cnpj',
      pixReceiverName: existing.pixReceiverName || settings.storeCorporateName || settings.storeName || '',
      pixCity: existing.pixCity || settings.storeCity || 'BRASIL',
      whatsapp: existing.whatsapp || settings.storePhone || '',
      whatsappMessage: existing.whatsappMessage || `Olá! Vi o cartão de visita digital da ${settings.storeName} e gostaria de informações.`,
      phone: existing.phone || settings.storePhone || '',
      address: existing.address || settings.storeAddress || '',
      openingHours: existing.openingHours || 'Seg a Sex: 08:30 - 18:00 · Sáb: 08:30 - 12:30',
      themeStyle: existing.themeStyle || 'cyber_dark',
      wifiSsid: existing.wifiSsid || '',
      wifiPassword: existing.wifiPassword || '',
      showReviewsButton: existing.showReviewsButton !== false,
      showPixButton: existing.showPixButton !== false,
      showWhatsAppButton: existing.showWhatsAppButton !== false,
      showInstagramButton: existing.showInstagramButton !== false,
      showLocationButton: existing.showLocationButton !== false,
      showWifiButton: existing.showWifiButton !== false
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [wifiQrPreviewUrl, setWifiQrPreviewUrl] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

  const cardUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/cartao/${settings.catalogSlug || tenantId}`
    : `/cartao/${tenantId}`;

  useEffect(() => {
    if (typeof window !== 'undefined' && cardUrl) {
      QRCode.toDataURL(cardUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#090d16', light: '#ffffff' }
      }).then(url => setQrCodeDataUrl(url)).catch(() => {});
    }
  }, [cardUrl]);

  useEffect(() => {
    if (formData.wifiSsid) {
      const wifiPayload = generateWifiQrString(formData.wifiSsid, formData.wifiPassword || '');
      QRCode.toDataURL(wifiPayload, {
        width: 240,
        margin: 2,
        color: { dark: '#090d16', light: '#ffffff' }
      }).then(url => setWifiQrPreviewUrl(url)).catch(() => {});
    } else {
      setWifiQrPreviewUrl(null);
    }
  }, [formData.wifiSsid, formData.wifiPassword]);

  const handleChange = (field: keyof BusinessCardSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated: AppSettings = {
        ...settings,
        businessCard: formData
      };
      await onUpdateSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar configurações do cartão.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(cardUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const handleGenerateGoogleSearchLink = () => {
    const query = [formData.customTitle || settings.storeName, formData.address || settings.storeAddress]
      .filter(Boolean)
      .join(' ');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    handleChange('googleMapsReviewUrl', url);
  };

  const handlePrintCounterCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Placa de Balcão · ${formData.customTitle || settings.storeName}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #0f172a; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; }
          .card { border: 3px solid #0f172a; border-radius: 28px; padding: 40px; text-align: center; max-width: 440px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
          .logo { max-height: 80px; max-width: 180px; object-fit: contain; margin-bottom: 15px; }
          h1 { font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: -0.5px; }
          .subtitle { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 1px; }
          .qr-box { background: #fff; padding: 15px; border-radius: 20px; display: inline-block; border: 2px dashed #94a3b8; margin: 15px 0; }
          .qr-box img { width: 220px; height: 220px; display: block; }
          .cta { font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 15px 0 5px 0; color: #0f172a; }
          .subcta { font-size: 12px; color: #64748b; margin-bottom: 25px; line-height: 1.4; }
          .badges { display: flex; justify-content: center; gap: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #334155; }
          .badges span { background: #f1f5f9; padding: 6px 12px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .url { font-family: monospace; font-size: 10px; color: #94a3b8; margin-top: 25px; }
        </style>
      </head>
      <body>
        <div class="card">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
          <h1>${formData.customTitle || settings.storeName}</h1>
          <div class="subtitle">${formData.subtitle || 'Canais Oficiais'}</div>
          
          <div class="qr-box">
            <img src="${qrCodeDataUrl}" />
          </div>

          <div class="cta">Aproxime a Câmera do Celular</div>
          <div class="subcta">
            Avalie nosso atendimento no <strong>Google</strong> com 5 estrelas,<br/>
            conheça nosso <strong>Instagram</strong> e faça pagamentos via <strong>Pix</strong>.
          </div>

          <div class="badges">
            <span>⭐ Google 5★</span>
            <span>⚡ Pix</span>
            <span>📸 Instagram</span>
          </div>

          <div class="url">${cardUrl}</div>
        </div>
        <script>
          window.onload = () => { setTimeout(() => { window.print(); }, 400); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* TOPO COM AÇÃO DE VOLTAR E SALVAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all active:scale-95 cursor-pointer"
            title="Voltar aos Ajustes"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Cartão de Visita Digital da Loja
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Página Externa Ativa
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Página chamativa para clientes avaliarem no Google, acessarem o Instagram e copiarem a chave Pix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor Mobile de Abas (Editor vs Preview) */}
          <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setPreviewTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                previewTab === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Configurar
            </button>
            <button
              onClick={() => setPreviewTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                previewTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Visualizar
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check size={16} className="text-emerald-300" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isSaving ? 'Salvando...' : 'Salvar Cartão'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BANNER DE LINK PÚBLICO E AÇÕES RÁPIDAS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            Link Público do Seu Cartão Oficial
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-blue-200 select-all">
              {cardUrl}
            </code>
          </div>
          <p className="text-[11px] text-slate-300 opacity-90">
            Divulgue este link no WhatsApp, redes sociais, balcão ou nas notas e comprovantes térmicos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider border border-white/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {linkCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{linkCopied ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          <a
            href={cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/30"
          >
            <ExternalLink size={14} />
            <span>Abrir Página</span>
          </a>

          <button
            onClick={handlePrintCounterCard}
            className="px-3.5 py-2 rounded-xl bg-white text-slate-950 text-xs font-black uppercase tracking-wider hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Imprimir placa de balcão com QR Code"
          >
            <Printer size={14} />
            <span>Placa de Balcão</span>
          </button>
        </div>
      </div>

      {/* GRID DUAS COLUNAS: FORMULÁRIO COMPLETO + SIMULADOR SMARTPHONE AO VIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA DA ESQUERDA: CONFIGURAÇÕES DETALHADAS (7 Colunas) */}
        <div className={`space-y-5 lg:col-span-7 ${previewTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          
          {/* SEÇÃO 1: APARÊNCIA & TEMA VISUAL */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Palette size={18} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                1. Tema Visual do Cartão
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'cyber_dark', label: 'Dark Cyber', desc: 'Preto / Vidro Neon', bg: 'bg-slate-950 text-white' },
                { id: 'emerald_luxury', label: 'Emerald Lux', desc: 'Esmeralda & Ouro', bg: 'bg-[#04150f] text-emerald-300' },
                { id: 'gold_vip', label: 'Gold VIP', desc: 'Preto & Champagne', bg: 'bg-black text-amber-300' },
                { id: 'ocean_tech', label: 'Ocean Blue', desc: 'Azul Elétrico & Ciano', bg: 'bg-[#060c18] text-cyan-300' },
                { id: 'clean_minimal', label: 'Clean White', desc: 'Branco Minimalista', bg: 'bg-slate-100 text-slate-900' }
              ].map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleChange('themeStyle', theme.id)}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                    formData.themeStyle === theme.id
                      ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-full h-7 rounded-lg mb-2 flex items-center justify-center text-[10px] font-bold ${theme.bg}`}>
                    Aa
                  </div>
                  <p className="text-xs font-black text-slate-800 truncate">{theme.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{theme.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Título Principal da Loja
                </label>
                <input
                  type="text"
                  value={formData.customTitle || ''}
                  onChange={e => handleChange('customTitle', e.target.value)}
                  placeholder="Nome Fantasia da Loja"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Subtítulo / Slogan
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={e => handleChange('subtitle', e.target.value)}
                  placeholder="Ex: Assistência Técnica & Acessórios"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                Apresentação / Mensagem de Boas-Vindas
              </label>
              <textarea
                rows={2}
                value={formData.bio || ''}
                onChange={e => handleChange('bio', e.target.value)}
                placeholder="Uma mensagem breve e acolhedora para seus clientes..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* SEÇÃO 2: AVALIAÇÃO NO GOOGLE MAPS (5 ESTRELAS) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  2. Avaliação no Google Maps (5 Estrelas)
                </h3>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showReviewsButton !== false}
                  onChange={e => handleChange('showReviewsButton', e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Exibir</span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Link Direto de Avaliação (Google Meu Negócio)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateGoogleSearchLink}
                    className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                  >
                    Gerar link automático pelo endereço
                  </button>
                </div>
                <input
                  type="url"
                  value={formData.googleMapsReviewUrl || ''}
                  onChange={e => handleChange('googleMapsReviewUrl', e.target.value)}
                  placeholder="https://g.page/r/.../review ou link de pesquisa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px] leading-relaxed flex items-start gap-2">
                <HelpCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Como conseguir o link de 5 estrelas:</strong> Acesse seu <em>Google Perfil da Empresa (Google Maps)</em> &gt; clique em <strong>"Solicitar avaliações"</strong> &gt; copie o link curto gerado e cole acima.
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CHAVE PIX CÓPIA E COLA OFICIAL */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-emerald-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  3. Chave Pix Cópia e Cola Oficial
                </h3>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showPixButton !== false}
                  onChange={e => handleChange('showPixButton', e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Exibir</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Tipo de Chave
                </label>
                <select
                  value={formData.pixKeyType || 'cnpj'}
                  onChange={e => handleChange('pixKeyType', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500 bg-slate-50/50 uppercase"
                >
                  <option value="cnpj">CNPJ</option>
                  <option value="phone">Celular / Telefone</option>
                  <option value="email">E-mail</option>
                  <option value="cpf">CPF</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={formData.pixKey || ''}
                  onChange={e => handleChange('pixKey', e.target.value)}
                  placeholder="Informe a chave Pix para pagamentos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Nome do Titular / Favorecido
                </label>
                <input
                  type="text"
                  value={formData.pixReceiverName || ''}
                  onChange={e => handleChange('pixReceiverName', e.target.value)}
                  placeholder="Nome ou Razão Social"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500 bg-slate-50/50 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Cidade do Titular
                </label>
                <input
                  type="text"
                  value={formData.pixCity || ''}
                  onChange={e => handleChange('pixCity', e.target.value)}
                  placeholder="Cidade (ex: SAO PAULO)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500 bg-slate-50/50 uppercase"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: INSTAGRAM & REDES SOCIAIS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Instagram size={18} className="text-pink-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  4. Instagram Oficial da Loja
                </h3>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showInstagramButton !== false}
                  onChange={e => handleChange('showInstagramButton', e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Exibir</span>
              </label>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                Nome de Usuário (@) ou Link do Perfil
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">@</span>
                <input
                  type="text"
                  value={formData.instagram ? formData.instagram.replace(/^@/, '') : ''}
                  onChange={e => handleChange('instagram', e.target.value.replace(/^@/, ''))}
                  placeholder="sualoja"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-pink-500 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: WHATSAPP, TELEFONE & LOCALIZAÇÃO */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Phone size={18} className="text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                5. Contatos, Endereço & Horários
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  WhatsApp com DDD
                </label>
                <input
                  type="text"
                  value={formData.whatsapp || ''}
                  onChange={e => handleChange('whatsapp', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Telefone Convencional
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="(00) 0000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                Endereço Físico Completo
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                Horário de Atendimento
              </label>
              <input
                type="text"
                value={formData.openingHours || ''}
                onChange={e => handleChange('openingHours', e.target.value)}
                placeholder="Ex: Seg a Sex: 08:30 às 18:00 · Sáb: 08:30 às 12:30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* SEÇÃO 6: RECURSO DIFERENCIAL WI-FI DE CLIENTES */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wifi size={18} className="text-amber-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  6. Wi-Fi da Loja para Clientes (Opcional)
                </h3>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showWifiButton !== false}
                  onChange={e => handleChange('showWifiButton', e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Exibir</span>
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Permite que os clientes no balcão copiem a senha do Wi-Fi com 1 toque no celular sem precisar perguntar.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Nome da Rede Wi-Fi (SSID)
                </label>
                <input
                  type="text"
                  value={formData.wifiSsid || ''}
                  onChange={e => handleChange('wifiSsid', e.target.value)}
                  placeholder="Nome da Rede Wi-Fi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Senha do Wi-Fi
                </label>
                <input
                  type="text"
                  value={formData.wifiPassword || ''}
                  onChange={e => handleChange('wifiPassword', e.target.value)}
                  placeholder="Senha do Wi-Fi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* PREVIEW AO VIVO DO QR CODE DO WI-FI */}
            {formData.wifiSsid && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in">
                <div className="bg-white p-2 rounded-xl shadow-xs border border-amber-200/60 shrink-0">
                  {wifiQrPreviewUrl ? (
                    <img src={wifiQrPreviewUrl} alt="QR Code Wi-Fi" className="w-24 h-24 object-contain" />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center text-slate-400">
                      <Wifi size={24} />
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                      Conexão Automática Ativa
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-800">
                    QR Code gerado para a rede "{formData.wifiSsid}"
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Compatível nativamente com <strong>Android</strong> e <strong>iPhone</strong>. No cartão digital do cliente, ao clicar em "Conectar ao Wi-Fi" ou apontar a câmera para o QR Code, o smartphone se conecta automaticamente sem digitar a senha!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DA DIREITA: PREVIEW AO VIVO EM FRAME DE SMARTPHONE (5 Colunas) */}
        <div className={`lg:col-span-5 ${previewTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Smartphone size={14} className="text-blue-500" />
                Pré-visualização em Tempo Real
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Como seu cliente enxerga
              </span>
            </div>

            {/* MOCKUP DO SMARTPHONE COM BORDAS E TELA */}
            <div className="relative mx-auto max-w-[340px] rounded-[40px] border-[10px] border-slate-900 bg-slate-950 p-2 shadow-2xl overflow-hidden ring-1 ring-slate-800">
              {/* Câmera Notch do Smartphone */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30" />

              {/* TELA INTERNA DO SMARTPHONE (Iframe ou Miniatura) */}
              <div className="w-full h-[620px] rounded-[30px] overflow-y-auto custom-scrollbar bg-slate-950 text-white p-3 text-center space-y-2.5 pt-7 select-none">
                
                {/* Logo & Título */}
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-white/20 overflow-hidden flex items-center justify-center shadow-lg">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store size={26} className="text-blue-400" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-sm font-black uppercase tracking-tight text-white truncate px-2">
                    {formData.customTitle || settings.storeName || 'Sua Loja'}
                  </h4>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate px-2">
                    {formData.subtitle || 'Assistência & Produtos'}
                  </p>
                </div>

                {/* Card Google Maps 5★ */}
                {formData.showReviewsButton !== false && (
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                        Google Maps · 5★
                      </span>
                      <ExternalLink size={11} className="text-amber-400" />
                    </div>
                    <p className="text-xs font-black text-white">Avalie nosso atendimento</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={11} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Pix */}
                {formData.showPixButton !== false && formData.pixKey && (
                  <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-left space-y-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">
                      Chave Pix Cópia e Cola
                    </span>
                    <p className="text-[10px] font-mono text-emerald-300 truncate font-bold">
                      {formData.pixKey}
                    </p>
                    <div className="w-full py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider text-center">
                      Copiar Chave Pix
                    </div>
                  </div>
                )}

                {/* Card Instagram */}
                {formData.showInstagramButton !== false && formData.instagram && (
                  <div className="p-2.5 rounded-2xl bg-pink-500/15 border border-pink-500/40 text-left flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Instagram size={14} className="text-pink-400" />
                      <span className="text-xs font-black text-white truncate">
                        @{formData.instagram.replace(/^@/, '')}
                      </span>
                    </div>
                    <span className="text-[8px] font-black uppercase text-pink-300">Seguir</span>
                  </div>
                )}

                {/* Card WhatsApp */}
                {formData.showWhatsAppButton !== false && formData.whatsapp && (
                  <div className="p-2.5 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-left flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={14} className="text-emerald-400" />
                      <span className="text-xs font-black text-white">WhatsApp Oficial</span>
                    </div>
                    <span className="text-[8px] font-black uppercase text-emerald-300">Conversar</span>
                  </div>
                )}

                {/* Wi-Fi com Conexão em 1 Toque */}
                {formData.showWifiButton !== false && formData.wifiSsid && (
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-left flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Wifi size={12} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-white block truncate">Wi-Fi Clientes</span>
                        <span className="text-[8px] font-mono font-bold text-amber-300 block truncate">
                          {formData.wifiSsid}
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-black uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                      Conectar
                    </span>
                  </div>
                )}

                <div className="pt-2 text-[8px] opacity-40 uppercase tracking-widest">
                  Cartão Digital Oficial
                </div>
              </div>
            </div>

            <div className="text-center pt-1">
              <a
                href={cardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
              >
                <span>Visualizar página inteira em nova aba</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
