
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrencyString = (str: string): number => {
  const cleanStr = str.replace(/[^\d]/g, '');
  return parseInt(cleanStr || '0', 10) / 100;
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('pt-BR');
};

export const playBeepSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export const generateRandomNumericCode = (length: number = 5): string => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
};

/**
 * Calcula o preço unitário efetivo do produto considerando Promoção ou Desconto configurados no cadastro.
 * 1. Se isPromotion for true e promotionalPrice > 0, utiliza o promotionalPrice.
 * 2. Caso contrário, se houver desconto percentual (discount > 0), aplica o abatimento sobre o salePrice.
 * 3. Caso contrário, utiliza o salePrice padrão.
 */
export const getProductEffectivePrice = (product: { salePrice: number; promotionalPrice?: number; isPromotion?: boolean; discount?: number }): number => {
  if (!product) return 0;
  if (product.isPromotion && product.promotionalPrice && product.promotionalPrice > 0) {
    return product.promotionalPrice;
  }
  if (product.discount && product.discount > 0) {
    const discounted = product.salePrice * (1 - product.discount / 100);
    return Math.max(0, discounted);
  }
  return product.salePrice || 0;
};

/**
 * Retorna a URL base do sistema para links externos (como Teste de Hardware e Acompanhamento de O.S.).
 * Se a loja configurou um domínio customizado em Configurações, prioriza essa URL.
 * Caso contrário, utiliza dinamicamente o window.location.origin atual do navegador,
 * garantindo que funcione perfeitamente mesmo que o domínio seja trocado ou migrado.
 */
export const getAppBaseUrl = (settings?: { customDomain?: string } | null): string => {
  const custom = settings?.customDomain?.trim();
  if (custom) {
    let clean = custom.replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
};

/**
 * Gera o link completo para o teste de hardware de celular
 */
export const getHardwareTestUrl = (tokenOrId: string, settings?: { customDomain?: string } | null): string => {
  const base = getAppBaseUrl(settings);
  const clean = encodeURIComponent(String(tokenOrId || '').trim().replace(/^#/, ''));
  return `${base}/teste-hardware/${clean}`;
};

/**
 * Gera o link completo para o acompanhamento público de O.S.
 */
export const getTrackingUrl = (tokenOrId: string, settings?: { customDomain?: string } | null): string => {
  const base = getAppBaseUrl(settings);
  const clean = encodeURIComponent(String(tokenOrId || '').trim().replace(/^#/, ''));
  return `${base}/acompanhamento/${clean}`;
};

/**
 * Normaliza o número de telefone para abertura direta no WhatsApp.
 * Remove caracteres não numéricos, ajusta zeros iniciais e garante
 * o DDI 55 (Brasil) para números com DDD (10 ou 11 dígitos) ou preserva
 * DDI existente sem gerar números inválidos como '55'.
 */
export const normalizeWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Remove zero à esquerda (ex: 083988887777 -> 83988887777)
  if (digits.startsWith('0') && digits.length > 2) {
    digits = digits.substring(1);
  }

  // Se tem apenas '55' sem o resto do número, é inválido
  if (digits === '55' || digits.length < 8) {
    return '';
  }

  // Número brasileiro padrão: DDD (2) + Número (8 ou 9) = 10 ou 11 dígitos
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Número com DDI 55 já incluído (12 ou 13 dígitos)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  // Caso tenha digitado sem 55 inicial
  if (!digits.startsWith('55') && digits.length >= 8) {
    return `55${digits}`;
  }

  return digits;
};

/**
 * Gera a URL universal do WhatsApp para abrir diretamente na conversa do cliente.
 */
export const getWhatsAppDirectUrl = (phone?: string, text?: string): string => {
  const normalized = normalizeWhatsAppNumber(phone);
  const encodedText = text ? encodeURIComponent(text) : '';
  if (normalized) {
    return encodedText 
      ? `https://api.whatsapp.com/send?phone=${normalized}&text=${encodedText}`
      : `https://api.whatsapp.com/send?phone=${normalized}`;
  }
  return encodedText 
    ? `https://api.whatsapp.com/send?text=${encodedText}`
    : `https://api.whatsapp.com/send`;
};

