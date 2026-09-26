import { TaxProfile } from '../types';

export const CRT_OPTIONS = [
  { code: '1', label: '1 - Simples Nacional' },
  { code: '2', label: '2 - Simples Nacional - excesso de sublimite de receita bruta' },
  { code: '3', label: '3 - Regime Normal (Lucro Presumido ou Lucro Real)' },
  { code: '4', label: '4 - Simples Nacional - Microempreendedor Individual (MEI)' },
];

export const ORIGIN_OPTIONS = [
  { code: '0', label: '0 - Nacional (exceto as indicadas nos códigos 3, 4, 5 e 8)' },
  { code: '1', label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
  { code: '2', label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
  { code: '3', label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40%' },
  { code: '4', label: '4 - Nacional, cuja produção tenha sido feita em conformidade com PPB' },
  { code: '5', label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação <= 40%' },
  { code: '6', label: '6 - Estrangeira - Importação direta, sem similar nacional (CAMEX)' },
  { code: '7', label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional (CAMEX)' },
  { code: '8', label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' },
];

export const CSOSN_SIMPLES_OPTIONS = [
  { code: '0101', label: '101 - Tributada pelo Simples Nacional com permissão de crédito' },
  { code: '0102', label: '102 - Tributada pelo Simples Nacional sem permissão de crédito (Venda Normal)' },
  { code: '0103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta' },
  { code: '0201', label: '201 - Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por ST' },
  { code: '0202', label: '202 - Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por ST' },
  { code: '0203', label: '203 - Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por ST' },
  { code: '0300', label: '300 - Imune' },
  { code: '0400', label: '400 - Não tributada pelo Simples Nacional' },
  { code: '0500', label: '500 - ICMS cobrado anteriormente por substituição tributária (ST) ou por antecipação' },
  { code: '0900', label: '900 - Outros (Regime de apuração especial)' },
];

export const CST_ICMS_NORMAL_OPTIONS = [
  { code: '00', label: '00 - Tributada integralmente' },
  { code: '10', label: '10 - Tributada e com cobrança do ICMS por substituição tributária' },
  { code: '20', label: '20 - Com redução de base de cálculo' },
  { code: '30', label: '30 - Isenta ou não tributada e com cobrança do ICMS por substituição tributária' },
  { code: '40', label: '40 - Isenta' },
  { code: '41', label: '41 - Não tributada' },
  { code: '45', label: '45 - Alheia à exportação / Isenta com controle de ICMS' },
  { code: '50', label: '50 - Suspensão' },
  { code: '51', label: '51 - Diferimento' },
  { code: '60', label: '60 - ICMS cobrado anteriormente por substituição tributária (ST)' },
  { code: '70', label: '70 - Com redução de B.C. e cobrança do ICMS por ST' },
  { code: '90', label: '90 - Outras' },
];

export const CST_PIS_COFINS_OPTIONS = [
  { code: '01', label: '01 - Operação Tributável com Alíquota Básica' },
  { code: '02', label: '02 - Operação Tributável com Alíquota Diferenciada' },
  { code: '03', label: '03 - Operação Tributável por Unidade de Medida' },
  { code: '04', label: '04 - Operação Tributável Monofásica - Revenda a Alíquota Zero' },
  { code: '05', label: '05 - Operação Tributável por Substituição Tributária' },
  { code: '06', label: '06 - Operação Tributável a Alíquota Zero' },
  { code: '07', label: '07 - Operação Isenta da Contribuição' },
  { code: '08', label: '08 - Operação Sem Incidência da Contribuição' },
  { code: '09', label: '09 - Operação com Suspensão da Contribuição' },
  { code: '49', label: '49 - Outras Operações de Saída (Padrão Simples Nacional)' },
  { code: '50', label: '50 - Direito a Crédito - Operação no Mercado Interno' },
  { code: '99', label: '99 - Outras Operações' },
];

export const TIPO_OPERACAO_OPTIONS = [
  { code: 'saida', label: 'Saída (Venda / Prestação)' },
  { code: 'entrada', label: 'Entrada (Compra / Devolução)' }
];

export const DESTINO_OPERACAO_OPTIONS = [
  { code: 'interna', label: 'Interna (Dentro do Estado)' },
  { code: 'interestadual', label: 'Interestadual (Fora do Estado)' },
  { code: 'exterior', label: 'Exterior (Exportação)' }
];

export const TIPO_DESTINATARIO_OPTIONS = [
  { code: 'contribuinte', label: 'Contribuinte de ICMS' },
  { code: 'nao_contribuinte', label: 'Não Contribuinte' },
  { code: 'produtor_rural', label: 'Produtor Rural' }
];

export const MODALIDADE_BC_OPTIONS = [
  { code: 'op', label: 'Valor da operação (Padrão)' },
  { code: 'pauta', label: 'Pauta (Valor de Referência)' },
  { code: 'tabelado', label: 'Preço Tabelado Máximo' },
  { code: 'mva', label: 'Margem Valor Agregado (MVA %)' }
];

export const CST_IPI_OPTIONS = [
  { code: '50', label: '50 - Saída Tributada' },
  { code: '51', label: '51 - Saída Tributável com Alíquota Zero' },
  { code: '52', label: '52 - Saída Isenta' },
  { code: '53', label: '53 - Saída Não-Tributada' },
  { code: '00', label: '00 - Entrada Recuperável' },
  { code: '49', label: '49 - Outras Entradas' },
  { code: '99', label: '99 - Outras Saídas' }
];

export const ISS_EXIGIBILIDADE_OPTIONS = [
  { code: 'exigivel', label: 'Exigível' },
  { code: 'nao_incidencia', label: 'Não Incidência' },
  { code: 'isencao', label: 'Isenção' },
  { code: 'exportacao', label: 'Exportação' },
  { code: 'suspenso', label: 'Suspenso (Decisão Judicial)' }
];

export const ISS_REGIME_ESPECIAL_OPTIONS = [
  { code: 'microempresa_municipal', label: 'Microempresa Municipal' },
  { code: 'estimativa', label: 'Estimativa' },
  { code: 'sociedade_profissionais', label: 'Sociedade de Profissionais' },
  { code: 'cooperativa', label: 'Cooperativa' },
  { code: 'mei', label: 'Microempreendedor Individual (MEI)' }
];

export const DEFAULT_TAX_PROFILES: TaxProfile[] = [
  {
    id: 'tp_simples_normal',
    name: 'Revenda Mercadoria Normal (Simples CSOSN 0102)',
    description: 'Para produtos nacionais tributados pelo Simples Nacional sem permissão de crédito (Venda de balcão/loja normal).',
    crtTaxRegime: 'simples',
    crtCode: '1',
    csosnCst: '0102',
    origin: '0',
    cstPis: '49',
    cstCofins: '49',
    defaultCfopInternal: '5102',
    defaultCfopInterstate: '6102',
    icmsAliquota: 0,
    pisAliquota: 0,
    cofinsAliquota: 0,
    isDefault: true,
  },
  {
    id: 'tp_simples_st',
    name: 'Revenda c/ Substituição Tributária (Simples CSOSN 0500)',
    description: 'Para produtos com ICMS retido por ST anteriormente (Autopeças, Bebidas, Cigarros, Eletrônicos ST).',
    crtTaxRegime: 'simples',
    crtCode: '1',
    csosnCst: '0500',
    origin: '0',
    cstPis: '49',
    cstCofins: '49',
    defaultCfopInternal: '5405',
    defaultCfopInterstate: '6405',
    icmsAliquota: 0,
    pisAliquota: 0,
    cofinsAliquota: 0,
    isDefault: false,
  },
  {
    id: 'tp_simples_credito',
    name: 'Revenda c/ Permissão de Crédito (Simples CSOSN 0101)',
    description: 'Para vendas onde o comprador PJ pode aproveitar o crédito de ICMS do Simples.',
    crtTaxRegime: 'simples',
    crtCode: '1',
    csosnCst: '0101',
    origin: '0',
    cstPis: '49',
    cstCofins: '49',
    defaultCfopInternal: '5102',
    defaultCfopInterstate: '6102',
    icmsAliquota: 3.5,
    pisAliquota: 0,
    cofinsAliquota: 0,
    isDefault: false,
  },
  {
    id: 'tp_normal_00',
    name: 'Tributada Integralmente (Regime Normal CST 00)',
    description: 'Lucro Presumido / Real com tributação integral de ICMS (CST 00 + PIS/COFINS 01).',
    crtTaxRegime: 'normal',
    crtCode: '3',
    csosnCst: '00',
    origin: '0',
    cstPis: '01',
    cstCofins: '01',
    defaultCfopInternal: '5102',
    defaultCfopInterstate: '6102',
    icmsAliquota: 18.0,
    pisAliquota: 1.65,
    cofinsAliquota: 7.6,
    isDefault: false,
  },
  {
    id: 'tp_normal_60',
    name: 'ICMS Cobrado por ST (Regime Normal CST 60)',
    description: 'Lucro Presumido / Real revenda de mercadorias com ST cobrado anteriormente.',
    crtTaxRegime: 'normal',
    crtCode: '3',
    csosnCst: '60',
    origin: '0',
    cstPis: '04',
    cstCofins: '04',
    defaultCfopInternal: '5405',
    defaultCfopInterstate: '6405',
    icmsAliquota: 0,
    pisAliquota: 0,
    cofinsAliquota: 0,
    isDefault: false,
  },
  {
    id: 'tp_importado_mercado_interno',
    name: 'Mercadoria Importada Adquirida no Mercado Interno (Origem 2 - CSOSN 0102)',
    description: 'Produtos de origem estrangeira adquiridos de distribuidores ou importadores no Brasil.',
    crtTaxRegime: 'simples',
    crtCode: '1',
    csosnCst: '0102',
    origin: '2',
    cstPis: '49',
    cstCofins: '49',
    defaultCfopInternal: '5102',
    defaultCfopInterstate: '6102',
    icmsAliquota: 0,
    pisAliquota: 0,
    cofinsAliquota: 0,
    isDefault: false,
  },
];

/**
 * Converte um CFOP interno (iniciado em 5 ou 1) para o equivalente interestadual (iniciado em 6 ou 2)
 * se a UF do destinatário/cliente for diferente da UF do emitente/loja.
 */
export const getEffectiveCfop = (
  baseCfop: string | undefined | null,
  storeState: string | undefined | null,
  customerState: string | undefined | null
): { cfop: string; isInterstate: boolean; adjusted: boolean; original: string } => {
  const original = (baseCfop || '5102').trim();
  const digitsOnly = original.replace(/\D/g, '');
  if (!digitsOnly || digitsOnly.length < 4) {
    return { cfop: original || '5102', isInterstate: false, adjusted: false, original };
  }

  const storeUf = (storeState || '').trim().toUpperCase();
  const customerUf = (customerState || '').trim().toUpperCase();

  const isInterstate = !!(storeUf && customerUf && storeUf !== customerUf);

  if (!isInterstate) {
    return { cfop: digitsOnly, isInterstate: false, adjusted: false, original };
  }

  let adjustedCfop = digitsOnly;
  if (digitsOnly.startsWith('5')) {
    adjustedCfop = '6' + digitsOnly.slice(1);
  } else if (digitsOnly.startsWith('1')) {
    adjustedCfop = '2' + digitsOnly.slice(1);
  }

  return {
    cfop: adjustedCfop,
    isInterstate: true,
    adjusted: adjustedCfop !== digitsOnly,
    original
  };
};

export const getStoredTaxProfiles = (tenantId?: string): TaxProfile[] => {
  const key = `tax_profiles_${tenantId || 'global'}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_TAX_PROFILES;
};

export const saveTaxProfiles = (tenantId: string | undefined, profiles: TaxProfile[]) => {
  const key = `tax_profiles_${tenantId || 'global'}`;
  try {
    localStorage.setItem(key, JSON.stringify(profiles));
  } catch (e) {}
};
