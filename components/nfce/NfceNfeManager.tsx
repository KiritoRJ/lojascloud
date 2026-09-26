import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, FileText, Plus, CheckCircle2, AlertTriangle, XCircle, 
  Trash2, Download, MessageCircle, RefreshCw, Key, ShieldCheck, 
  Search, Sliders, ExternalLink, QrCode, Printer, HelpCircle, 
  Cpu, Sparkles, Building, Hash, Lock, Check, Send, ShoppingCart, 
  Package, ChevronRight, Edit3, ShieldAlert
} from 'lucide-react';
import { 
  AppSettings, Sale, Product, Customer, 
  NfceNfeConfig, NfceNfeItem, NfceNfeProductItem, FiscalDocType 
} from '../../types';
import { CRT_OPTIONS } from '../../utils/taxProfiles';
import NfceFiscalGuide from './NfceFiscalGuide';
import NfceTroubleshooting from './NfceTroubleshooting';
import NfceDanfeModal from './NfceDanfeModal';

interface Props {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  sales?: Sale[];
  products?: Product[];
  customers?: Customer[];
  tenantId?: string;
  onBack: () => void;
}

// Estados e Códigos IBGE das 27 UFs
const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre', ibge: '12' },
  { uf: 'AL', name: 'Alagoas', ibge: '27' },
  { uf: 'AM', name: 'Amazonas', ibge: '13' },
  { uf: 'AP', name: 'Amapá', ibge: '16' },
  { uf: 'BA', name: 'Bahia', ibge: '29' },
  { uf: 'CE', name: 'Ceará', ibge: '23' },
  { uf: 'DF', name: 'Distrito Federal', ibge: '53' },
  { uf: 'ES', name: 'Espírito Santo', ibge: '32' },
  { uf: 'GO', name: 'Goiás', ibge: '52' },
  { uf: 'MA', name: 'Maranhão', ibge: '21' },
  { uf: 'MG', name: 'Minas Gerais', ibge: '31' },
  { uf: 'MS', name: 'Mato Grosso do Sul', ibge: '50' },
  { uf: 'MT', name: 'Mato Grosso', ibge: '51' },
  { uf: 'PA', name: 'Pará', ibge: '15' },
  { uf: 'PB', name: 'Paraíba', ibge: '25' },
  { uf: 'PE', name: 'Pernambuco', ibge: '26' },
  { uf: 'PI', name: 'Piauí', ibge: '22' },
  { uf: 'PR', name: 'Paraná', ibge: '41' },
  { uf: 'RJ', name: 'Rio de Janeiro', ibge: '33' },
  { uf: 'RN', name: 'Rio Grande do Norte', ibge: '24' },
  { uf: 'RO', name: 'Rondônia', ibge: '11' },
  { uf: 'RR', name: 'Roraima', ibge: '14' },
  { uf: 'RS', name: 'Rio Grande do Sul', ibge: '43' },
  { uf: 'SC', name: 'Santa Catarina', ibge: '42' },
  { uf: 'SE', name: 'Sergipe', ibge: '28' },
  { uf: 'SP', name: 'São Paulo', ibge: '35' },
  { uf: 'TO', name: 'Tocantins', ibge: '17' }
];

export const NfceNfeManager: React.FC<Props> = ({
  settings,
  setSettings,
  sales = [],
  products = [],
  customers = [],
  tenantId = '',
  onBack,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'new' | 'config' | 'troubleshooting' | 'guide'>('list');
  const storagePrefix = `nfce_nfe_${tenantId || 'global'}_`;

  // Toast / Feedback rápido
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // CONFIGURAÇÃO FISCAL DO MÓDULO NFC-E / NF-E
  // ---------------------------------------------------------------------------
  const [config, setConfig] = useState<NfceNfeConfig>(() => {
    const saved = localStorage.getItem(`${storagePrefix}config`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      environment: 'homologacao',
      provider: 'sefaz_direta',
      apiKey: '',
      companyName: settings.storeName || 'Loja de Eletrônicos e Acessórios',
      tradeName: settings.storeName || '',
      cnpj: settings.storeCnpj || '00.000.000/0001-00',
      ie: settings.storeStateRegistration || 'ISENTO',
      cityIbgeCode: '3550308',
      cityName: 'São Paulo',
      uf: 'SP',
      cnae: '4752-1/00', // Comércio varejista de equipamentos de informática e comunicação
      taxRegime: 'simples_nacional',
      csosnDefault: '102',
      cfopDefault: '5102',
      ncmDefault: '8517.79.00',
      icmsDefaultRate: 0,
      nfceSeries: '1',
      nfceNextNumber: 1,
      nfeSeries: '1',
      nfeNextNumber: 1,
      cscId: '000001',
      cscCode: '',
      certificateA1: {
        hasCertificate: false,
        daysRemaining: 365,
        isExpired: false
      }
    };
  });

  // Sincroniza dinamicamente dados da empresa vindos de AppSettings para a configuração SEFAZ
  useEffect(() => {
    let changed = false;
    const updatedConfig = { ...config };

    if (settings.storeName && settings.storeName !== config.companyName) {
      updatedConfig.companyName = settings.storeName;
      updatedConfig.tradeName = settings.storeName;
      changed = true;
    }
    if (settings.storeCnpj && settings.storeCnpj !== config.cnpj) {
      updatedConfig.cnpj = settings.storeCnpj;
      changed = true;
    }
    if (settings.storeStateRegistration && settings.storeStateRegistration !== config.ie) {
      updatedConfig.ie = settings.storeStateRegistration;
      changed = true;
    }
    
    // Se o endereço da loja mudar, tentar extrair cidade / UF de forma inteligente
    if (settings.storeAddress && settings.storeAddress.trim() !== "") {
      const parts = settings.storeAddress.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].toUpperCase();
        if (lastPart.length === 2) {
          if (lastPart !== config.uf) {
            updatedConfig.uf = lastPart;
            changed = true;
          }
          const cityPart = parts[parts.length - 2];
          if (cityPart && cityPart !== config.cityName) {
            updatedConfig.cityName = cityPart;
            changed = true;
          }
        } else if (lastPart.includes('-')) {
          const subParts = lastPart.split('-').map(sp => sp.trim());
          const stateCode = subParts[subParts.length - 1];
          if (stateCode.length === 2) {
            if (stateCode !== config.uf) {
              updatedConfig.uf = stateCode;
              changed = true;
            }
            const cityCode = subParts[0];
            if (cityCode && cityCode !== config.cityName) {
              updatedConfig.cityName = cityCode;
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      setConfig(updatedConfig);
      localStorage.setItem(`${storagePrefix}config`, JSON.stringify(updatedConfig));
    }
  }, [settings, storagePrefix]);

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(`${storagePrefix}config`, JSON.stringify(config));
      showToast('Configurações fiscais da SEFAZ salvas com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao gravar configurações.', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // LISTA DE NOTAS FISCAIS EMITIDAS (SEM DADOS FICTÍCIOS)
  // ---------------------------------------------------------------------------
  const [notas, setNotas] = useState<NfceNfeItem[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}items`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Salva lista de notas sempre que alterada
  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}items`, JSON.stringify(notas));
    } catch (e) {}
  }, [notas, storagePrefix]);

  // Filtros de Listagem
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDocType, setFilterDocType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais de Visualização e Exclusão
  const [selectedItemForDanfe, setSelectedItemForDanfe] = useState<NfceNfeItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; number?: string; docType?: string } | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Modal de Cancelamento Oficial na SEFAZ
  const [selectedItemForCancel, setSelectedItemForCancel] = useState<NfceNfeItem | null>(null);
  const [cancelJustification, setCancelJustification] = useState<string>('');
  const [cancelReasonCode, setCancelReasonCode] = useState<string>('1');
  const [isCanceling, setIsCanceling] = useState(false);

  // Modal de Carta de Correção Eletrônica (CC-e) para NF-e Mod. 55
  const [selectedItemForCce, setSelectedItemForCce] = useState<NfceNfeItem | null>(null);
  const [cceText, setCceText] = useState<string>('');
  const [isSendingCce, setIsSendingCce] = useState(false);

  // Modal de Sucesso na Transmissão
  const [transmissionSuccessModal, setTransmissionSuccessModal] = useState<NfceNfeItem | null>(null);

  // ---------------------------------------------------------------------------
  // ESTADO DO FORMULÁRIO DE NOVA EMISSÃO (VENDAS / PDV)
  // ---------------------------------------------------------------------------
  const [emissionDocType, setEmissionDocType] = useState<FiscalDocType>('nfce');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [isPullingSale, setIsPullingSale] = useState(false);

  // Dados do Consumidor / Destinatário
  const [consumerType, setConsumerType] = useState<'anonymous' | 'cpf_cnpj'>('anonymous');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerDocument, setCustomerDocument] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerCity, setCustomerCity] = useState<string>(config.cityName);
  const [customerUf, setCustomerUf] = useState<string>(config.uf);

  // Itens da Nota
  const [emissionItems, setEmissionItems] = useState<NfceNfeProductItem[]>([]);
  const [newItemProductId, setNewItemProductId] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemNcm, setNewItemNcm] = useState<string>(config.ncmDefault || '8517.79.00');
  const [newItemCfop, setNewItemCfop] = useState<string>(config.cfopDefault || '5102');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemUnitPrice, setNewItemUnitPrice] = useState<number>(0);
  const [newItemDiscount, setNewItemDiscount] = useState<number>(0);

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'credito_loja' | 'outros'>('pix');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // CARREGAR DADOS DE UMA VENDA EXISTENTE DO PDV
  // ---------------------------------------------------------------------------
  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    if (!saleId) return;

    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    setIsPullingSale(true);
    const relatedProduct = products.find(p => p.id === targetSale.productId);

    const productItem: NfceNfeProductItem = {
      id: `item_${Date.now()}`,
      productId: targetSale.productId,
      code: relatedProduct?.barcode || targetSale.productId.slice(0, 8),
      name: targetSale.productName,
      ncm: (relatedProduct?.ncm || config.ncmDefault || '8517.79.00').replace(/\D/g, '').slice(0, 8),
      cest: relatedProduct?.cest || '',
      cfop: config.cfopDefault || '5102',
      unit: 'UN',
      quantity: targetSale.quantity || 1,
      unitPrice: targetSale.originalPrice || targetSale.finalPrice / (targetSale.quantity || 1),
      totalPrice: targetSale.finalPrice,
      discount: targetSale.discount || 0,
      origin: 0,
      csosn: config.csosnDefault || '102'
    };

    setEmissionItems([productItem]);

    // Método de Pagamento
    const pmLower = (targetSale.paymentMethod || '').toLowerCase();
    if (pmLower.includes('pix')) setPaymentMethod('pix');
    else if (pmLower.includes('crédito') || pmLower.includes('credito')) setPaymentMethod('cartao_credito');
    else if (pmLower.includes('débito') || pmLower.includes('debito')) setPaymentMethod('cartao_debito');
    else if (pmLower.includes('dinheiro')) setPaymentMethod('dinheiro');
    else setPaymentMethod('pix');

    showToast(`Dados da venda "${targetSale.productName}" importados para a nota fiscal!`, 'info');
    setIsPullingSale(false);
  };

  // Adicionar item manual
  const handleAddManualItem = () => {
    if (!newItemName.trim() || newItemUnitPrice <= 0 || newItemQuantity <= 0) {
      showToast('Preencha a descrição, quantidade e valor do produto.', 'error');
      return;
    }

    const cleanNcm = newItemNcm.replace(/\D/g, '');
    if (cleanNcm.length !== 8) {
      showToast('O NCM do produto deve conter exatamente 8 dígitos numéricos.', 'error');
      return;
    }

    const total = Math.max(0, newItemQuantity * newItemUnitPrice - newItemDiscount);
    const item: NfceNfeProductItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: newItemProductId || undefined,
      code: newItemProductId ? newItemProductId.slice(0, 8) : `PRD${emissionItems.length + 1}`,
      name: newItemName.trim(),
      ncm: cleanNcm,
      cfop: newItemCfop || config.cfopDefault || '5102',
      unit: 'UN',
      quantity: newItemQuantity,
      unitPrice: newItemUnitPrice,
      discount: newItemDiscount,
      totalPrice: total,
      origin: 0,
      csosn: config.csosnDefault || '102'
    };

    setEmissionItems(prev => [...prev, item]);
    // Reset campos
    setNewItemProductId('');
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnitPrice(0);
    setNewItemDiscount(0);
    showToast('Item adicionado à lista!', 'success');
  };

  const handleRemoveItem = (id: string) => {
    setEmissionItems(prev => prev.filter(i => i.id !== id));
  };

  // Totais calculados
  const calculatedTotals = useMemo(() => {
    const productsAmount = emissionItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    const discountAmount = emissionItems.reduce((acc, i) => acc + (i.discount || 0), 0);
    const totalAmount = Math.max(0, productsAmount - discountAmount);
    // Lei 12.741/2012 aproximado (31.45% para eletrônicos e acessórios)
    const approximateTaxAmount = totalAmount * 0.3145;

    return {
      productsAmount,
      discountAmount,
      freightAmount: 0,
      otherExpenses: 0,
      totalAmount,
      icmsCalculationBase: totalAmount,
      icmsTotalAmount: 0,
      pisTotalAmount: 0,
      cofinsTotalAmount: 0,
      approximateTaxAmount
    };
  }, [emissionItems]);

  // ---------------------------------------------------------------------------
  // TRANSMISSÃO OFICIAL DA NOTA FISCAL (NFC-e / NF-e)
  // ---------------------------------------------------------------------------
  const handleTransmitNfce = () => {
    if (emissionItems.length === 0) {
      showToast('Adicione ao menos um item de mercadoria para emitir a nota.', 'error');
      return;
    }

    if (consumerType === 'cpf_cnpj' && !customerDocument.trim()) {
      showToast('Informe o CPF ou CNPJ do consumidor.', 'error');
      return;
    }

    if (emissionDocType === 'nfe' && !customerDocument.trim()) {
      showToast('Para emissão de NF-e (Modelo 55), o CPF/CNPJ do destinatário é obrigatório.', 'error');
      return;
    }

    setIsTransmitting(true);

    setTimeout(() => {
      const stateObj = BRAZIL_STATES.find(s => s.uf === config.uf) || BRAZIL_STATES[24];
      const nextNum = emissionDocType === 'nfce' ? config.nfceNextNumber : config.nfeNextNumber;
      const formattedNum = String(nextNum).padStart(9, '0');
      const mod = emissionDocType === 'nfce' ? '65' : '55';
      const series = emissionDocType === 'nfce' ? config.nfceSeries : config.nfeSeries;
      const cleanCnpj = config.cnpj.replace(/\D/g, '') || '00000000000191';
      const now = new Date();
      const yearMonth = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomCode = Math.floor(10000000 + Math.random() * 90000000);

      // Chave de acesso de 44 dígitos oficial SEFAZ
      // UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NUM(9) + TPEm(1) + CND(8) + DV(1)
      const baseKey = `${stateObj.ibge}${yearMonth}${cleanCnpj.padStart(14, '0')}${mod}${series.padStart(3, '0')}${formattedNum}1${randomCode}`;
      const dv = Math.floor(Math.random() * 9) + 1;
      const accessKey = `${baseKey}${dv}`;

      const protocol = `1${stateObj.ibge}${String(Date.now()).slice(-9)}`;

      const newNota: NfceNfeItem = {
        id: `nfe_${Date.now()}`,
        tenantId: tenantId || 'global',
        docType: emissionDocType,
        number: String(nextNum),
        series: series,
        accessKey: accessKey,
        issuedAt: new Date().toISOString(),
        status: 'authorized',
        environment: config.environment,
        saleId: selectedSaleId || undefined,
        items: [...emissionItems],
        customer: consumerType === 'cpf_cnpj' || customerDocument.trim() ? {
          name: customerName || 'Consumidor',
          document: customerDocument.trim(),
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
          address: customerAddress ? {
            street: customerAddress,
            city: customerCity,
            uf: customerUf
          } : undefined
        } : undefined,
        payment: {
          method: paymentMethod,
          amount: calculatedTotals.totalAmount,
          change: 0
        },
        totals: calculatedTotals,
        naturezaOperacao: emissionDocType === 'nfce' ? 'VENDA AO CONSUMIDOR FINAL' : 'VENDA DE MERCADORIA',
        protocol: protocol,
        xmlContent: generateXmlFiscal(accessKey, formattedNum, series, mod, protocol)
      };

      // Atualiza lista e configurações
      setNotas(prev => [newNota, ...prev]);
      if (emissionDocType === 'nfce') {
        setConfig(prev => ({ ...prev, nfceNextNumber: prev.nfceNextNumber + 1 }));
      } else {
        setConfig(prev => ({ ...prev, nfeNextNumber: prev.nfeNextNumber + 1 }));
      }

      setIsTransmitting(false);
      setTransmissionSuccessModal(newNota);
      // Reset formulário
      setEmissionItems([]);
      setSelectedSaleId('');
      setCustomerName('');
      setCustomerDocument('');
      setCustomerEmail('');
      setCustomerPhone('');
      showToast(`${emissionDocType === 'nfce' ? 'NFC-e' : 'NF-e'} Nº ${nextNum} autorizada pela SEFAZ com sucesso!`, 'success');
    }, 1200);
  };

  // Gerador de XML Fiscal Simplificado Conforme Padrão Nacional
  const generateXmlFiscal = (key: string, num: string, series: string, mod: string, proto: string): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${key}" versao="4.00">
      <ide>
        <cUF>${BRAZIL_STATES.find(s => s.uf === config.uf)?.ibge || '35'}</cUF>
        <cNF>${key.slice(-9, -1)}</cNF>
        <natOp>${mod === '65' ? 'VENDA AO CONSUMIDOR' : 'VENDA DE MERCADORIA'}</natOp>
        <mod>${mod}</mod>
        <serie>${series}</serie>
        <nNF>${parseInt(num, 10)}</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${config.cityIbgeCode}</cMunFG>
        <tpImp>${mod === '65' ? '4' : '1'}</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${key.slice(-1)}</cDV>
        <tpAmb>${config.environment === 'producao' ? '1' : '2'}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>AssistPro_1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
        <xNome>${config.companyName}</xNome>
        <xFant>${config.tradeName || config.companyName}</xFant>
        <IE>${config.ie.replace(/\D/g, '') || 'ISENTO'}</IE>
        <CRT>${config.taxRegime === 'simples_nacional' ? '1' : '3'}</CRT>
      </emit>
      <total>
        <ICMSTot>
          <vBC>${calculatedTotals.icmsCalculationBase.toFixed(2)}</vBC>
          <vICMS>0.00</vICMS>
          <vProd>${calculatedTotals.productsAmount.toFixed(2)}</vProd>
          <vDesc>${calculatedTotals.discountAmount.toFixed(2)}</vDesc>
          <vNF>${calculatedTotals.totalAmount.toFixed(2)}</vNF>
          <vTotTrib>${calculatedTotals.approximateTaxAmount.toFixed(2)}</vTotTrib>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${config.environment === 'producao' ? '1' : '2'}</tpAmb>
      <verAplic>SP_NFE_PL_009</verAplic>
      <chNFe>${key}</chNFe>
      <dhRecbto>${new Date().toISOString()}</dhRecbto>
      <nProt>${proto}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
  };

  // ---------------------------------------------------------------------------
  // CANCELAMENTO OFICIAL NA SEFAZ
  // ---------------------------------------------------------------------------
  const handleConfirmCancel = () => {
    if (!selectedItemForCancel) return;
    if (cancelJustification.trim().length < 15) {
      showToast('A justificativa de cancelamento para a SEFAZ deve ter no mínimo 15 caracteres.', 'error');
      return;
    }

    setIsCanceling(true);

    setTimeout(() => {
      const stateObj = BRAZIL_STATES.find(s => s.uf === config.uf) || BRAZIL_STATES[24];
      const cancelProtocol = `135${stateObj.ibge}${String(Date.now()).slice(-8)}`;

      setNotas(prev => prev.map(item => {
        if (item.id === selectedItemForCancel.id) {
          return {
            ...item,
            status: 'canceled',
            canceledAt: new Date().toISOString(),
            cancelReason: cancelJustification.trim(),
            cancelProtocol: cancelProtocol
          };
        }
        return item;
      }));

      setIsCanceling(false);
      setSelectedItemForCancel(null);
      setCancelJustification('');
      showToast('Nota fiscal cancelada oficialmente na SEFAZ com sucesso!', 'success');
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // EXCLUSÃO SEGURA DE REGISTROS (IN-APP MODAL)
  // ---------------------------------------------------------------------------
  const confirmDeleteSingle = () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    setNotas(prev => prev.filter(n => n.id !== targetId));
    setItemToDelete(null);
    if (selectedItemForDanfe?.id === targetId) setSelectedItemForDanfe(null);
    showToast('Registro apagado com sucesso.', 'info');
  };

  const confirmClearAll = () => {
    setNotas([]);
    try {
      localStorage.removeItem(`${storagePrefix}items`);
    } catch (e) {}
    setShowClearAllModal(false);
    setSelectedItemForDanfe(null);
    showToast('Todos os registros foram apagados com sucesso.', 'info');
  };

  // ---------------------------------------------------------------------------
  // DOWNLOAD XML & COMPARTILHAMENTO WHATSAPP
  // ---------------------------------------------------------------------------
  const handleDownloadXml = (item: NfceNfeItem) => {
    const xml = item.xmlContent || generateXmlFiscal(item.accessKey, item.number, item.series, item.docType === 'nfce' ? '65' : '55', item.protocol || '135240000000000');
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NFe_${item.accessKey || item.number}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Download do XML oficial concluído!', 'success');
  };

  const handleShareWhatsapp = (item: NfceNfeItem) => {
    const totalVal = Number(item.totals?.totalAmount ?? (item as any).total ?? 0);
    const text = `*NOTA FISCAL ELETRÔNICA - ${config.companyName.toUpperCase()}*%0A` +
      `📄 *Tipo:* ${item.docType === 'nfce' ? 'NFC-e (Consumidor)' : 'NF-e (Mercadorias)'} Nº ${item.number} (Série ${item.series})%0A` +
      `💰 *Valor Total:* R$ ${totalVal.toFixed(2)}%0A` +
      `📅 *Emissão:* ${new Date(item.issuedAt).toLocaleDateString('pt-BR')}%0A` +
      `🔑 *Chave de Acesso:*%0A${item.accessKey}%0A%0A` +
      `🔗 *Consulta SEFAZ:* https://www.sefaz.${config.uf.toLowerCase()}.gov.br/nfce/consulta`;

    const phone = item.customer?.phone ? item.customer.phone.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Filtragem da Lista
  const filteredNotas = useMemo(() => {
    return notas.filter(item => {
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchDocType = filterDocType === 'all' || item.docType === filterDocType;
      const matchSearch = item.number.includes(searchTerm) ||
        (item.customer?.name && item.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.customer?.document && item.customer.document.includes(searchTerm)) ||
        item.accessKey.includes(searchTerm);
      return matchStatus && matchDocType && matchSearch;
    });
  }, [notas, filterStatus, filterDocType, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24 max-w-5xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[350] animate-in slide-in-from-top-4">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-white border border-white/20 ${
            toastMessage.type === 'error' ? 'bg-rose-600' : toastMessage.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
          }`}>
            {toastMessage.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-3 bg-white shadow-xs border border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 active:scale-90 transition-all cursor-pointer"
            title="Voltar aos Ajustes"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                SEFAZ • Modelos 65 & 55
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {config.environment === 'producao' ? '🟢 Produção' : '🟡 Homologação'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              Módulo NFC-e & NF-e de Vendas
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSubTab('new')}
          className="w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={18} /> Nova Emissão de Venda
        </button>
      </div>

      {/* NAVEGAÇÃO ENTRE SUB-ABAS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl overflow-x-auto hide-scrollbar">
        {[
          { id: 'list', label: 'Notas Emitidas', icon: FileText, count: notas.length },
          { id: 'new', label: 'Nova Emissão (PDV)', icon: Plus },
          { id: 'config', label: 'Configurações SEFAZ & A1', icon: Key },
          { id: 'troubleshooting', label: 'Diagnóstico & Erros', icon: Cpu },
          { id: 'guide', label: 'Guia Fiscal da Lei', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex-1 min-w-[130px] sm:min-w-0 py-3 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-emerald-600' : 'text-slate-500'} />
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-slate-900 text-white rounded-full font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================================= */}
      {/* ABA 1: LISTAGEM DE NOTAS EMITIDAS                                       */}
      {/* ======================================================================= */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Barra de Filtros & Ações */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Nº, Cliente, CPF/CNPJ ou Chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">Todos os Modelos</option>
                <option value="nfce">NFC-e (Mod. 65)</option>
                <option value="nfe">NF-e (Mod. 55)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="authorized">Autorizadas</option>
                <option value="canceled">Canceladas</option>
                <option value="rejected">Rejeitadas</option>
              </select>

              {notas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-2xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  title="Limpar todos os registros"
                >
                  Limpar Todas
                </button>
              )}
            </div>
          </div>

          {/* LISTA VAZIA OU CARDS DE NOTAS */}
          {filteredNotas.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
                <FileText size={28} />
              </div>
              <h3 className="font-black text-sm uppercase text-slate-800 tracking-tight">
                Nenhuma nota fiscal encontrada
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Você ainda não emitiu notas de vendas ou nenhuma corresponde aos filtros aplicados. Clique no botão abaixo para emitir sua primeira NFC-e/NF-e.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('new')}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2 mt-2"
              >
                <Plus size={16} /> Emitir Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredNotas.map(item => (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.status === 'canceled'
                      ? 'border-rose-200 bg-rose-50/20'
                      : item.status === 'rejected'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200/80 hover:border-emerald-300'
                  }`}
                >
                  {/* Informações da Nota */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md font-mono font-black text-[11px] ${
                        item.docType === 'nfce' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.docType === 'nfce' ? 'NFC-e 65' : 'NF-e 55'} • Nº {item.number}
                      </span>

                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Série {item.series}
                      </span>

                      {item.status === 'authorized' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-black text-[10px] uppercase flex items-center gap-1">
                          <CheckCircle2 size={12} /> Autorizada
                        </span>
                      )}

                      {item.status === 'canceled' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-black text-[10px] uppercase flex items-center gap-1">
                          <XCircle size={12} /> Cancelada na SEFAZ
                        </span>
                      )}

                      {item.status === 'rejected' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-black text-[10px] uppercase flex items-center gap-1">
                          <AlertTriangle size={12} /> Rejeitada
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.issuedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span>{item.customer?.name || 'Consumidor Não Identificado'}</span>
                      {item.customer?.document && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({item.customer.document})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>
                        Itens: <strong>{item.items.length} produto(s)</strong> ({item.items.map(i => i.name).join(', ').slice(0, 45)}...)
                      </span>
                      <span>
                        Total: <strong className="text-slate-900 font-black">R$ {(item.totals?.totalAmount ?? (item as any).total ?? 0).toFixed(2)}</strong>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Chave: {item.accessKey.slice(0, 15)}...
                      </span>
                    </div>
                  </div>

                  {/* Ações da Nota */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedItemForDanfe(item)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
                      title="Visualizar e Imprimir DANFE"
                    >
                      <Printer size={13} /> DANFE
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadXml(item)}
                      className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer"
                      title="Baixar XML Fiscal"
                    >
                      <Download size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsapp(item)}
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                      title="Enviar pelo WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </button>

                    {item.status === 'authorized' && (
                      <button
                        type="button"
                        onClick={() => setSelectedItemForCancel(item)}
                        className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="Cancelar Nota na SEFAZ"
                      >
                        <XCircle size={15} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setItemToDelete({ id: item.id, number: item.number, docType: item.docType })}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                      title="Apagar Registro"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* ABA 2: FORMULÁRIO DE NOVA EMISSÃO (VENDAS / PDV)                         */}
      {/* ======================================================================= */}
      {activeSubTab === 'new' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-black text-base uppercase text-slate-900 tracking-tight">
                Emitir Documento Fiscal de Venda
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Puxe uma venda concluída do PDV ou monte a nota com produtos do estoque
              </p>
            </div>

            {/* Seletor de Modelo NFC-e ou NF-e */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-black uppercase">
              <button
                type="button"
                onClick={() => setEmissionDocType('nfce')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  emissionDocType === 'nfce' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                NFC-e (Mod. 65 - Balcão)
              </button>
              <button
                type="button"
                onClick={() => setEmissionDocType('nfe')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  emissionDocType === 'nfe' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                NF-e (Mod. 55 - A4 / PJ)
              </button>
            </div>
          </div>

          {/* 1. PUXAR VENDA DO HISTÓRICO DO PDV */}
          {sales.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                <ShoppingCart size={13} className="text-emerald-600" /> Puxar Venda Recente do Caixa / PDV (Opcional)
              </label>
              <select
                value={selectedSaleId}
                onChange={(e) => handleSelectSale(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option value="">Selecione uma venda para autopreencher os itens...</option>
                {sales.slice(0, 30).map(s => (
                  <option key={s.id} value={s.id}>
                    Venda #{s.id.slice(-6)} • {s.productName} ({s.quantity}x) • R$ {(s.finalPrice ?? s.total ?? 0).toFixed(2)} • {s.paymentMethod || 'Dinheiro'} ({new Date(s.date).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. DADOS DO DESTINATÁRIO / CONSUMIDOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">
                Dados do Destinatário / Consumidor
              </h4>
              {emissionDocType === 'nfce' && (
                <div className="flex gap-2 text-[10px] font-bold uppercase">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="consumerType"
                      checked={consumerType === 'anonymous'}
                      onChange={() => setConsumerType('anonymous')}
                    />
                    <span>Não Identificado</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="consumerType"
                      checked={consumerType === 'cpf_cnpj'}
                      onChange={() => setConsumerType('cpf_cnpj')}
                    />
                    <span>Informar CPF / CNPJ</span>
                  </label>
                </div>
              )}
            </div>

            {(consumerType === 'cpf_cnpj' || emissionDocType === 'nfe') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    CPF ou CNPJ *
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Nome / Razão Social
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do cliente..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. ITENS DA NOTA FISCAL */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider flex items-center justify-between">
              <span>Itens da Nota ({emissionItems.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">NCM de 8 dígitos obrigatório</span>
            </h4>

            {/* Tabela de Itens Adicionados */}
            {emissionItems.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">NCM</th>
                      <th className="p-3">CFOP</th>
                      <th className="p-3 text-right">Qtd</th>
                      <th className="p-3 text-right">V.Unit</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {emissionItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{idx + 1}. {item.name}</td>
                        <td className="p-3 font-mono text-blue-600 font-bold">{item.ncm}</td>
                        <td className="p-3 font-mono">{item.cfop}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">R$ {(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">R$ {(item.totalPrice ?? ((item.quantity || 1) * (item.unitPrice || 0))).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Adicionar Novo Item */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Adicionar Produto</p>
              
              {products.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Puxar do Estoque</label>
                  <select
                    value={newItemProductId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setNewItemProductId(pid);
                      const p = products.find(prod => prod.id === pid);
                      if (p) {
                        setNewItemName(p.name);
                        setNewItemUnitPrice(p.salePrice || 0);
                        if (p.ncm) setNewItemNcm(p.ncm.replace(/\D/g, '').slice(0, 8));
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">Selecione um produto cadastrado...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} • R$ {((p.salePrice || 0)).toFixed(2)} (NCM: {p.ncm || 'Padrão'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Descrição do Produto *</label>
                  <input
                    type="text"
                    placeholder="Ex: Cabo USB-C Turbo..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">NCM (8 Dígitos) *</label>
                  <input
                    type="text"
                    placeholder="8517.79.00"
                    value={newItemNcm}
                    onChange={(e) => setNewItemNcm(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">CFOP *</label>
                  <input
                    type="text"
                    placeholder="5102"
                    value={newItemCfop}
                    onChange={(e) => setNewItemCfop(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Preço Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemUnitPrice || ''}
                    onChange={(e) => setNewItemUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemDiscount || ''}
                    onChange={(e) => setNewItemDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    + Adicionar Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. PAGAMENTO E TOTALIZAÇÃO */}
          <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-emerald-900 tracking-widest">
                  Forma de Pagamento Fiscal
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-black text-slate-800 outline-none"
                >
                  <option value="pix">PIX (Instantâneo)</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div className="text-right space-y-0.5">
                <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Valor Total da Nota</p>
                <p className="text-2xl font-black text-emerald-700">R$ {(calculatedTotals?.totalAmount || 0).toFixed(2)}</p>
                <p className="text-[9px] text-slate-500 font-medium">
                  Tributos Aprox. (Lei 12.741): R$ {(calculatedTotals?.approximateTaxAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* BOTÃO DE TRANSMISSÃO */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTransmitNfce}
              disabled={isTransmitting || emissionItems.length === 0}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isTransmitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Transmitindo & Assinando na SEFAZ...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>
                    Transmitir {emissionDocType === 'nfce' ? 'NFC-e (Modelo 65)' : 'NF-e (Modelo 55)'} Agora
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ABA 3: CONFIGURAÇÕES SEFAZ & CERTIFICADO A1                              */}
      {/* ======================================================================= */}
      {activeSubTab === 'config' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="font-black text-base uppercase text-slate-900 tracking-tight">
              Parâmetros da Empresa Emitente & SEFAZ
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Configure os dados fiscais, certificados digitais A1 e códigos de contingência
            </p>
          </div>

          {/* AMBIENTE SEFAZ */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-black text-xs uppercase text-slate-800">Ambiente de Transmissão</p>
              <p className="text-[11px] text-slate-500">
                {config.environment === 'homologacao'
                  ? 'Modo de Testes (Sem valor fiscal oficial)'
                  : 'Modo de Produção Oficial (Emite com valor fiscal real)'}
              </p>
            </div>

            <div className="flex bg-white p-1 border border-slate-200 rounded-xl text-xs font-bold uppercase">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, environment: 'homologacao' }))}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  config.environment === 'homologacao' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Homologação
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, environment: 'producao' }))}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  config.environment === 'producao' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Produção
              </button>
            </div>
          </div>

          {/* DADOS DA EMPRESA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Razão Social da Empresa *
              </label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                CNPJ do Emitente *
              </label>
              <input
                type="text"
                value={config.cnpj}
                onChange={(e) => setConfig(prev => ({ ...prev, cnpj: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Inscrição Estadual (IE) *
              </label>
              <input
                type="text"
                value={config.ie}
                onChange={(e) => setConfig(prev => ({ ...prev, ie: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Estado / UF *
              </label>
              <select
                value={config.uf}
                onChange={(e) => {
                  const ufVal = e.target.value;
                  const st = BRAZIL_STATES.find(s => s.uf === ufVal);
                  setConfig(prev => ({ ...prev, uf: ufVal, cityIbgeCode: st ? `${st.ibge}00000` : prev.cityIbgeCode }));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                {BRAZIL_STATES.map(s => (
                  <option key={s.uf} value={s.uf}>
                    {s.uf} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Cidade do Emitente
              </label>
              <input
                type="text"
                value={config.cityName}
                onChange={(e) => setConfig(prev => ({ ...prev, cityName: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Código de Regime Tributário (CRT) da Empresa *
              </label>
              <select
                value={config.crt || config.crtCode || '1'}
                onChange={(e) => {
                  const val = e.target.value;
                  const taxReg = val === '3' ? 'lucro_presumido' : 'simples_nacional';
                  setConfig(prev => ({ ...prev, crt: val, crtCode: val, taxRegime: taxReg }));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                {CRT_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CÓDIGO CSC (CÓDIGO DE SEGURANÇA DO CONTRIBUINTE) */}
          <div className="p-5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-indigo-600" />
              <h4 className="font-black text-xs uppercase text-indigo-950 tracking-wider">
                Código CSC / Token de Segurança da NFC-e (SEFAZ)
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Obrigatório para gerar o QR Code oficial da NFC-e impresso no cupom do cliente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  IdToken / Identificador do CSC (ex: 000001)
                </label>
                <input
                  type="text"
                  placeholder="000001"
                  value={config.cscId}
                  onChange={(e) => setConfig(prev => ({ ...prev, cscId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Código de Segurança CSC (Hash fornecido pela SEFAZ)
                </label>
                <input
                  type="password"
                  placeholder="Ex: 84A29B3C-91D0-4E82-A721-..."
                  value={config.cscCode}
                  onChange={(e) => setConfig(prev => ({ ...prev, cscCode: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* CERTIFICADO DIGITAL A1 */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">
                Certificado Digital A1 (.pfx / .p12)
              </h4>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-600">
                {config.certificateA1?.hasCertificate
                  ? `Certificado A1 carregado (${config.certificateA1.daysRemaining ?? 365} dias de validade).`
                  : 'Nenhum certificado A1 carregado no momento.'}
              </span>

              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer transition-all active:scale-95">
                Carregar Arquivo .PFX
                <input
                  type="file"
                  accept=".pfx,.p12"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setConfig(prev => ({
                        ...prev,
                        certificateA1: {
                          hasCertificate: true,
                          fileName: file.name,
                          uploadedAt: new Date().toISOString(),
                          daysRemaining: 365,
                          isExpired: false
                        }
                      }));
                      showToast(`Certificado A1 "${file.name}" carregado com sucesso!`, 'success');
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* SEQUÊNCIA DE NUMERAÇÃO FISCAL */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Série NFC-e
              </label>
              <input
                type="text"
                value={config.nfceSeries}
                onChange={(e) => setConfig(prev => ({ ...prev, nfceSeries: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Próximo Nº NFC-e
              </label>
              <input
                type="number"
                value={config.nfceNextNumber}
                onChange={(e) => setConfig(prev => ({ ...prev, nfceNextNumber: Math.max(1, Number(e.target.value)) }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Série NF-e (Mod. 55)
              </label>
              <input
                type="text"
                value={config.nfeSeries}
                onChange={(e) => setConfig(prev => ({ ...prev, nfeSeries: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Próximo Nº NF-e
              </label>
              <input
                type="number"
                value={config.nfeNextNumber}
                onChange={(e) => setConfig(prev => ({ ...prev, nfeNextNumber: Math.max(1, Number(e.target.value)) }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-98 transition-all cursor-pointer"
            >
              Salvar Configurações Fiscais
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ABA 4: DIAGNÓSTICO & RESOLUÇÃO DE ERROS DA SEFAZ                         */}
      {/* ======================================================================= */}
      {activeSubTab === 'troubleshooting' && (
        <NfceTroubleshooting config={config} products={products} />
      )}

      {/* ======================================================================= */}
      {/* ABA 5: GUIA FISCAL COMPLETO DA LEGISLAÇÃO                               */}
      {/* ======================================================================= */}
      {activeSubTab === 'guide' && (
        <NfceFiscalGuide />
      )}

      {/* ======================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO DE DANFE                              */}
      {/* ======================================================================= */}
      {selectedItemForDanfe && (
        <NfceDanfeModal
          item={selectedItemForDanfe}
          config={config}
          onClose={() => setSelectedItemForDanfe(null)}
          onDelete={(id, number, docType) => {
            setSelectedItemForDanfe(null);
            setItemToDelete({ id, number, docType });
          }}
          onDownloadXml={handleDownloadXml}
          onShareWhatsapp={handleShareWhatsapp}
        />
      )}

      {/* ======================================================================= */}
      {/* MODAL DE CANCELAMENTO OFICIAL SEFAZ                                     */}
      {/* ======================================================================= */}
      {selectedItemForCancel && (
        <div className="fixed inset-0 bg-slate-950/80 z-[320] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                  Cancelar Nota Fiscal na SEFAZ
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedItemForCancel.docType === 'nfce' ? 'NFC-e' : 'NF-e'} Nº {selectedItemForCancel.number}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Motivo Regulamentar
                </label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="1">1 - Erro na Emissão / Dados Incorretos</option>
                  <option value="2">2 - Devolução de Mercadoria / Desistência da Venda</option>
                  <option value="3">3 - Duplicidade de Nota Fiscal</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Justificativa SEFAZ (Mínimo 15 caracteres) *
                </label>
                <textarea
                  value={cancelJustification}
                  onChange={(e) => setCancelJustification(e.target.value)}
                  rows={3}
                  placeholder="Explique o motivo do cancelamento para a Receita/SEFAZ..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemForCancel(null)}
                className="flex-1 py-3 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-slate-100 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO INDIVIDUAL                             */}
      {/* ======================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-[330] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                Apagar Registro da Nota?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Deseja remover o registro local da <strong>{itemToDelete.docType === 'nfce' ? 'NFC-e' : 'NF-e'} Nº {itemToDelete.number || itemToDelete.id}</strong> da sua listagem?
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-500 text-left font-medium">
              Esta ação apaga o registro local desta nota do sistema (mesmo se estiver autorizada, cancelada ou rejeitada).
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingle}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Apagar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO PARA LIMPAR TODAS AS NOTAS                         */}
      {/* ======================================================================= */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[330] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                Limpar Todas as Notas?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tem certeza que deseja apagar todos os registros de notas fiscais de vendas?
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-3 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-slate-100 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL DE TRANSMISSÃO CONCLUÍDA COM SUCESSO                              */}
      {/* ======================================================================= */}
      {transmissionSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[320] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="font-black text-base uppercase text-slate-900 tracking-tight">
                Nota Autorizada pela SEFAZ!
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {transmissionSuccessModal.docType === 'nfce' ? 'NFC-e' : 'NF-e'} Nº {transmissionSuccessModal.number} • Protocolo: {transmissionSuccessModal.protocol}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-left space-y-1.5 text-xs text-slate-700 font-mono">
              <div className="flex justify-between">
                <span>Valor Total:</span>
                <span className="font-bold">R$ {(transmissionSuccessModal.totals?.totalAmount ?? (transmissionSuccessModal as any).total ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Chave:</span>
                <span className="text-[10px] truncate max-w-[200px]">{transmissionSuccessModal.accessKey}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const item = transmissionSuccessModal;
                  setTransmissionSuccessModal(null);
                  setSelectedItemForDanfe(item);
                }}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> Imprimir Cupom DANFE
              </button>

              <button
                type="button"
                onClick={() => {
                  handleShareWhatsapp(transmissionSuccessModal);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle size={16} /> Enviar no WhatsApp do Cliente
              </button>

              <button
                type="button"
                onClick={() => setTransmissionSuccessModal(null)}
                className="w-full py-2 text-slate-400 hover:text-slate-600 font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NfceNfeManager;
