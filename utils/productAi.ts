export interface AIProductAnalysis {
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  barcode?: string;
  salePrice?: number;
  costPrice?: number;
  promotionalPrice?: number;
  discount?: number;
  isPromotion?: boolean;
  description?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  quantity?: number;
}

export interface AIAnalysisResult {
  data: AIProductAnalysis;
  creditsRemaining?: number;
}

export async function analyzeProductImage(imageBase64: string, tenantId?: string): Promise<AIProductAnalysis & { creditsRemaining?: number }> {
  const response = await fetch('/api/ai/analyze-product-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageBase64, tenantId }),
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch (_) {
    throw new Error('Não foi possível se comunicar com o servidor de IA. Verifique sua conexão e tente novamente.');
  }

  if (!response.ok || !json?.success) {
    let rawError = json?.error || 'Não foi possível analisar a foto do produto.';

    // Se o erro for uma string contendo objeto JSON da API do Google, extrai a mensagem limpa
    if (typeof rawError === 'string') {
      try {
        const parsed = JSON.parse(rawError);
        if (parsed?.error?.message) {
          rawError = parsed.error.message;
        }
      } catch (_) {}
    }

    if (response.status === 402 || json?.requireCredits) {
      throw new Error(
        json?.error || 'Esta loja requer créditos de IA pagos e o saldo está esgotado. Recarregue seus créditos nas configurações ou contate o administrador.'
      );
    }

    if (response.status === 403) {
      throw new Error(
        json?.error || 'O recurso de Inteligência Artificial está desativado para esta loja pelo administrador.'
      );
    }

    if (
      String(rawError).includes('503') ||
      String(rawError).includes('high demand') ||
      String(rawError).includes('UNAVAILABLE') ||
      String(rawError).includes('temporariamente') ||
      String(rawError).includes('limite temporário')
    ) {
      throw new Error(
        'Os servidores de Inteligência Artificial estão com alta demanda temporária. A foto foi salva e você pode tentar novamente em alguns instantes ou preencher manualmente.'
      );
    }

    throw new Error(typeof rawError === 'string' ? rawError : 'Falha ao analisar a foto do produto com Inteligência Artificial.');
  }

  return {
    ...(json.data as AIProductAnalysis),
    creditsRemaining: json.creditsRemaining
  };
}
