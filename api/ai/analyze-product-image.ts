import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let genAIClient: GoogleGenAI | null = null;
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API Gemini (GEMINI_API_KEY) não configurada.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, tenantId } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada para análise.' });
    }

    let creditsRemaining: number | null = null;
    if (tenantId) {
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('enabled_features')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantData?.enabled_features && tenantData.enabled_features.aiFeature === false) {
          return res.status(403).json({
            success: false,
            error: 'O recurso de Inteligência Artificial está desativado para esta loja pelo administrador.',
          });
        }

        const requirePaidCredits = !!tenantData?.enabled_features?.aiRequirePaidCredits;

        if (requirePaidCredits) {
          const { data: creditRow } = await supabase
            .from('cloud_data')
            .select('data_json')
            .eq('tenant_id', tenantId)
            .eq('store_key', 'ai_credits')
            .maybeSingle();

          const currentCredits = Number(creditRow?.data_json?.credits || 0);
          if (currentCredits <= 0) {
            return res.status(402).json({
              success: false,
              error: 'Esta loja atingiu o limite ou requer créditos de IA pagos. Recarregue seus créditos de IA nas configurações para continuar.',
              requireCredits: true,
            });
          }

          const newCredits = Math.max(0, currentCredits - 1);
          await supabase.from('cloud_data').upsert(
            {
              tenant_id: tenantId,
              store_key: 'ai_credits',
              data_json: { credits: newCredits, updatedAt: new Date().toISOString() },
            },
            { onConflict: 'tenant_id,store_key' }
          );
          creditsRemaining = newCredits;
        } else {
          // Modo gratuito ativo para a loja
          const { data: creditRow } = await supabase
            .from('cloud_data')
            .select('data_json')
            .eq('tenant_id', tenantId)
            .eq('store_key', 'ai_credits')
            .maybeSingle();
          creditsRemaining = Number(creditRow?.data_json?.credits || 0);
        }
      } catch (e) {
        console.warn('Aviso ao verificar configurações de IA da loja:', e);
      }
    }

    let cleanBase64 = imageBase64;
    let detectedMime = mimeType || 'image/jpeg';
    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      cleanBase64 = parts[1];
      const match = parts[0].match(/data:(.*?)$/);
      if (match) detectedMime = match[1];
    }

    const ai = getGenAI();

    const prompt = `Você é um assistente de inteligência artificial de elite especializado em catalogação e automação de cadastro de produtos para varejo, comércio e assistência técnica.
Analise detalhadamente a foto do produto/embalagem/caixa/rótulo fornecida e identifique o máximo de informações disponíveis:

1. Nome comercial do produto (name): Nome claro, objetivo e completo (ex: "Fone de Ouvido Bluetooth JBL Tune 510BT Preto" ou "Película de Vidro 3D iPhone 14 Pro").
2. Marca (brand): Marca do produto se legível ou identificável na caixa (ex: Apple, JBL, Samsung, Xiaomi, Baseus, etc.).
3. Modelo (model): Código ou nome do modelo especificado.
4. Categoria (category): Categoria apropriada (ex: "Acessórios", "Áudio", "Cabos e Carregadores", "Capas e Películas", "Periféricos", "Peças e Componentes", "Eletrônicos", "Baterias", etc.).
5. Código de barras (barcode): Extraia com precisão os números do código de barras EAN-13, GTIN ou UPC impresso na caixa ou etiqueta. Retorne SOMENTE dígitos numéricos. Se não houver código de barras visível, retorne string vazia.
6. Preço de venda (salePrice): Se houver etiqueta de preço colada ou impressa na caixa (ex: "R$ 39,90" ou etiqueta de loja), extraia o valor numérico em reais (ex: 39.9). Se não houver, retorne 0.
7. Preço de custo (costPrice): Se houver menção de preço de custo ou atacado, extraia o valor numérico. Caso contrário, retorne 0.
8. Descontos e Promoções: Se houver indicação de desconto (ex: "De R$ 100 por R$ 79", "30% OFF", "Leve mais por menos"), extraia ou calcule o valor/percentual do desconto (discount), o preço promocional (promotionalPrice) e defina isPromotion como true.
9. Informações Fiscais no Brasil:
   - NCM (Nomenclatura Comum do Mercosul): Se constar na etiqueta fiscal ou caixa, ou sugira o NCM padrão de 8 dígitos para esse tipo de item (ex: 85183000 para fones, 85444200 para cabos, 85044010 para carregadores/fontes, 39269090 para capas plásticas).
   - CEST: Código CEST se aplicável ou se constar na caixa.
   - CFOP: CFOP padrão sugerido (ex: "5102").
10. Descrição completa (description): Elabore uma descrição profissional e detalhada com as principais características e especificações técnicas impressas na embalagem (dimensões, conectividade, voltagem, compatibilidade, cor, material, conteúdo da embalagem).
11. Quantidade (quantity): Se a embalagem for um kit ou pacote com múltiplas unidades (ex: "Kit com 5 peças"), retorne esse número. Caso seja item individual, retorne 1.

Retorne estritamente um objeto JSON com as chaves:
{
  "name": string,
  "brand": string,
  "model": string,
  "category": string,
  "barcode": string,
  "salePrice": number,
  "costPrice": number,
  "promotionalPrice": number,
  "discount": number,
  "isPromotion": boolean,
  "description": string,
  "ncm": string,
  "cest": string,
  "cfop": string,
  "quantity": number
}`;

    // Cascata sequencial de modelos conforme solicitado:
    // Começa no Gemini 3.8 Flash, ao limitar ou falhar passa para a versão anterior 3.1 Flash Lite,
    // depois Gemini Flash Latest, e assim por diante até Gemini 2.5 Flash.
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-2.5-flash',
    ];

    let lastError: any = null;
    let responseText: string | null = null;
    let usedModel: string | null = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response?.text) {
          responseText = response.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        console.warn(`[Gemini Cascade] Limite/Erro com modelo ${model}: ${errMsg.slice(0, 150)}. Cascata para o próximo modelo...`);
      }
    }

    if (!responseText) {
      return res.status(503).json({
        success: false,
        error: 'Todos os modelos de IA atingiram o limite temporário de consultas nos servidores. A foto do produto foi salva e você pode tentar novamente em instantes ou preencher manualmente.',
        code: 503,
        canRetry: true,
      });
    }

    let cleanedJsonText = responseText.trim();
    if (cleanedJsonText.startsWith('```json')) {
      cleanedJsonText = cleanedJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedJsonText.startsWith('```')) {
      cleanedJsonText = cleanedJsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(cleanedJsonText);
    return res.status(200).json({
      success: true,
      data,
      usedModel,
      creditsRemaining: creditsRemaining !== null ? creditsRemaining : undefined,
    });
  } catch (error: any) {
    console.error('Erro na análise de produto por IA:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao analisar a foto do produto com Inteligência Artificial.',
    });
  }
}
