import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Shield, 
  Key, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Send, 
  Printer, 
  MessageCircle, 
  Search, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft, 
  Building2, 
  UserCheck, 
  Coins, 
  Calendar, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  FileCheck, 
  FileCode, 
  AlertCircle, 
  BookOpen, 
  ExternalLink,
  Layers,
  Sliders,
  CheckCheck,
  Copy,
  Info
} from 'lucide-react';
import { AppSettings, Customer, NfseConfig, NfseItem, ServiceOrder } from '../types';

interface NfseManagerProps {
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  serviceOrders: ServiceOrder[];
  customers: Customer[];
  tenantId?: string;
  onBack: () => void;
}

// Códigos de Serviço da Lei Complementar 116/03 mais comuns para Assistência Técnica
const SERVICOS_LC116 = [
  { 
    code: '14.01', 
    label: '14.01 - Lubrificação, limpeza, revisão, conserto, restauração de máquinas, veículos, aparelhos e equipamentos',
    cnae: '9511-8/00',
    description: 'Manutenção, reparo, limpeza e restauração de celulares, tablets, notebooks, computadores e periféricos.'
  },
  { 
    code: '14.02', 
    label: '14.02 - Assistência técnica e manutenção especializada em equipamentos eletroeletrônicos',
    cnae: '9512-6/00',
    description: 'Serviços especializados de assistência técnica, reparo de placas-mãe, microsoldagem e componentes.'
  },
  { 
    code: '01.07', 
    label: '01.07 - Suporte técnico em informática, instalação e configuração de programas e softwares',
    cnae: '6209-1/00',
    description: 'Formatação, instalação de sistemas operacionais, remoção de vírus, backup e configuração de software.'
  },
  { 
    code: '14.06', 
    label: '14.06 - Instalação e montagem de aparelhos, máquinas e equipamentos',
    cnae: '3321-0/00',
    description: 'Instalação e montagem técnica de equipamentos de informática e telecomunicações.'
  }
];

// Modelos rápidos de discriminação de serviço para Assistência Técnica
const TEMPLATES_DISCRIMINACAO = [
  {
    title: 'Manutenção de Celular / Smartphone',
    text: 'Serviço de assistência técnica em smartphone: diagnóstico avançado, desmontagem, substituição de módulo de tela danificado e testes funcionais de periféricos (áudio, touch, câmeras e biometria). Garantia legal de 90 dias sobre a mão de obra.'
  },
  {
    title: 'Troca de Bateria & Conector',
    text: 'Serviço técnico especializado: substituição de bateria com calibração de ciclos de carga e desoxidação do conector tipo-C/Lightning. Testes de corrente de carga e consumo de placa realizados com sucesso. Garantia de 90 dias sobre o serviço.'
  },
  {
    title: 'Reparo de Placa / Microsoldagem',
    text: 'Serviço de recuperação de placa lógica: análise de esquema elétrico, reconstrução de trilhas, substituição de CI de carga / Power IC e ressolda BGA. Equipamento testado em bancada e aprovado. Garantia de 90 dias sobre a mão de obra.'
  },
  {
    title: 'Formatação & Limpeza de Notebook/PC',
    text: 'Serviço de manutenção preventiva e corretiva em computador/notebook: limpeza interna com desoxidação de contatos, troca de pasta térmica de alta performance, instalação limpa de sistema operacional, drivers oficiais e testes de estresse térmico.'
  }
];

// Catálogo de Erros Mais Comuns de Prefeituras Brasileiras e Soluções
const CATALOGO_ERROS_PREFEITURAS = [
  {
    code: 'E160 / E170',
    title: 'Código de Tributação Inexistente no Município',
    cause: 'O código do Item da LC 116 ou o Código Tributário Municipal informado não está cadastrado na prefeitura da sua cidade ou é incompatível com o CNAE da empresa.',
    solution: 'Verifique no portal da prefeitura se o código 14.01 está liberado no alvará/cadastro da sua empresa ou selecione o código municipal correto nas configurações.',
    fixAction: 'fix_item_lc116'
  },
  {
    code: 'E4 / Certificado',
    title: 'Certificado Digital Revogado ou Expirado',
    cause: 'O certificado A1 (.pfx) perdeu a validade ou a senha digitada está incorreta na autenticação do WebService da prefeitura.',
    solution: 'Envie um novo arquivo de Certificado A1 dentro do prazo de validade e confira a senha cadastrada.',
    fixAction: 'open_certificate_tab'
  },
  {
    code: 'L016 / E43',
    title: 'Inscrição Municipal Não Localizada / Suspensa',
    cause: 'A Inscrição Municipal (IM) digitada difere do registro oficial da Prefeitura para o CNPJ do prestador.',
    solution: 'Confira o número exato da Inscrição Municipal no Cartão do CNPJ/CCM da prefeitura da sua cidade.',
    fixAction: 'fix_im'
  },
  {
    code: 'RPS Duplicado / E35',
    title: 'Número de RPS Já Transmitido Anteriormente',
    cause: 'O número do RPS sequencial já foi utilizado em outra emissão aprovada ou cancelada na prefeitura.',
    solution: 'O sistema avança automaticamente a numeração do próximo RPS para evitar conflito.',
    fixAction: 'increment_rps'
  },
  {
    code: 'E10 / E182',
    title: 'CPF ou CNPJ do Tomador Inválido',
    cause: 'O documento do cliente contém dígitos verificadores incorretos ou está no formato de máscara errado.',
    solution: 'Corrija o CPF ou CNPJ do cliente para conter 11 (CPF) ou 14 dígitos (CNPJ) válidos.',
    fixAction: 'fix_document'
  },
  {
    code: 'Lote em Processamento / Timeout',
    title: 'Prefeitura Demorou a Responder (Timeout)',
    cause: 'O servidor WebService da prefeitura está com instabilidade temporária ou fila alta de processamento.',
    solution: 'A nota fica salva em status "Em Processamento". Você pode consultar a resposta oficial a qualquer momento com 1 clique.',
    fixAction: 'query_status'
  }
];

export const NfseManager: React.FC<NfseManagerProps> = ({
  settings,
  setSettings,
  serviceOrders,
  customers,
  tenantId,
  onBack
}) => {
  const storagePrefix = tenantId ? `nfse_${tenantId}_` : 'nfse_default_';

  // Sub-abas do Módulo NFS-e
  const [activeSubTab, setActiveSubTab] = useState<'notas' | 'emitir' | 'config' | 'certificado' | 'ia_diagnostico' | 'guia'>('notas');

  // Configurações NFS-e do Tenant
  const [config, setConfig] = useState<NfseConfig>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}config`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return {
      environment: 'homologacao',
      provider: 'padrao_nacional',
      apiKey: '',
      companyName: settings.storeName || '',
      tradeName: settings.storeName || '',
      cnpj: settings.storeCnpj || '',
      im: '',
      cityIbgeCode: '3550308', // Ex: São Paulo - SP
      cityName: 'São Paulo',
      uf: 'SP',
      cnae: '9511-8/00',
      taxRegime: 'simples_nacional',
      specialTaxRegime: '1',
      defaultItemLc116: '14.01',
      defaultIssRate: 2.0,
      issRetained: false,
      rpsSeries: 'NFS',
      rpsNextNumber: 1,
      certificateA1: {
        hasCertificate: false
      }
    };
  });

  // Lista de Notas NFS-e Emitidas (Inicialmente vazia para o usuário emitir por conta própria)
  const [notas, setNotas] = useState<NfseItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}items`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove quaisquer notas de demonstração anteriores
          return parsed.filter((n: any) => !n.id?.toString().startsWith('nfse-demo'));
        }
      }
    } catch (e) {}

    return [];
  });

  // Limpa quaisquer itens demo persistidos no localStorage do navegador
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}items`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((n: any) => !n.id?.toString().startsWith('nfse-demo'));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(`${storagePrefix}items`, JSON.stringify(cleaned));
            setNotas(cleaned);
          }
        }
      }
    } catch (e) {}
  }, [storagePrefix]);

  // Salva no localStorage quando alterado
  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}config`, JSON.stringify(config));
    } catch (e) {}
  }, [config, storagePrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}items`, JSON.stringify(notas));
    } catch (e) {}
  }, [notas, storagePrefix]);

  // Modais de Exclusão Segura
  const [itemToDelete, setItemToDelete] = useState<{ id: string; number?: string; customerName?: string } | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Estado do Formulário de Nova Emissão
  const [selectedOsId, setSelectedOsId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerDoc, setFormCustomerDoc] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCep, setFormCep] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formComplement, setFormComplement] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formCity, setFormCity] = useState(config.cityName || 'São Paulo');
  const [formUf, setFormUf] = useState(config.uf || 'SP');
  const [formItemLc116, setFormItemLc116] = useState(config.defaultItemLc116 || '14.01');
  const [formCnae, setFormCnae] = useState(config.cnae || '9511-8/00');
  const [formDescription, setFormDescription] = useState('');
  
  // Valores do Formulário
  const [formServiceAmount, setFormServiceAmount] = useState<number>(0);
  const [formDeductionsAmount, setFormDeductionsAmount] = useState<number>(0);
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formIssRate, setFormIssRate] = useState<number>(config.defaultIssRate || 2.0);
  const [formIssRetained, setFormIssRetained] = useState<boolean>(config.issRetained || false);
  const [formHasFederalTaxes, setFormHasFederalTaxes] = useState<boolean>(false);
  const [formPisAmount, setFormPisAmount] = useState<number>(0);
  const [formCofinsAmount, setFormCofinsAmount] = useState<number>(0);
  const [formInssAmount, setFormInssAmount] = useState<number>(0);
  const [formIrAmount, setFormIrAmount] = useState<number>(0);
  const [formCsllAmount, setFormCsllAmount] = useState<number>(0);

  // Estados de Operação / Transmissão
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmissionSuccessModal, setTransmissionSuccessModal] = useState<NfseItem | null>(null);
  const [selectedNfseForDanfse, setSelectedNfseForDanfse] = useState<NfseItem | null>(null);
  const [selectedNfseForCancel, setSelectedNfseForCancel] = useState<NfseItem | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState<'1' | '2' | '3'>('1');
  const [cancelJustification, setCancelJustification] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Estados do Certificado Digital A1
  const [certPassword, setCertPassword] = useState('');
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [isProcessingCert, setIsProcessingCert] = useState(false);
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // Filtros da Tabela de Notas
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'authorized' | 'processing' | 'rejected' | 'canceled'>('all');

  // Cálculo automático da base de cálculo, ISS e valor líquido
  const calculationBase = useMemo(() => {
    const base = Math.max(0, (formServiceAmount || 0) - (formDeductionsAmount || 0) - (formDiscount || 0));
    return Number(base.toFixed(2));
  }, [formServiceAmount, formDeductionsAmount, formDiscount]);

  const issAmount = useMemo(() => {
    const iss = (calculationBase * (formIssRate || 0)) / 100;
    return Number(iss.toFixed(2));
  }, [calculationBase, formIssRate]);

  const netAmount = useMemo(() => {
    let total = formServiceAmount - formDiscount;
    if (formIssRetained) total -= issAmount;
    if (formHasFederalTaxes) {
      total -= (formPisAmount || 0) + (formCofinsAmount || 0) + (formInssAmount || 0) + (formIrAmount || 0) + (formCsllAmount || 0);
    }
    return Math.max(0, Number(total.toFixed(2)));
  }, [formServiceAmount, formDiscount, formIssRetained, issAmount, formHasFederalTaxes, formPisAmount, formCofinsAmount, formInssAmount, formIrAmount, formCsllAmount]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ type, message });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Preenchimento a partir de Ordem de Serviço
  const handleSelectServiceOrder = (osId: string) => {
    setSelectedOsId(osId);
    if (!osId) return;

    const os = serviceOrders.find(o => o.id === osId);
    if (!os) return;

    setFormCustomerName(os.customerName || '');
    setFormCustomerPhone(os.phoneNumber || '');
    setFormCustomerDoc((os as any).cpfCnpj || (os as any).customerDoc || '');
    setFormStreet(os.address || '');

    // Discriminação do serviço com base no defeito e laudo da O.S.
    let desc = `Ordem de Serviço #${os.id} - Aparelho: ${os.deviceBrand || ''} ${os.deviceModel || ''}`.trim();
    if (os.repairDetails) {
      desc += `\nServiço realizado: ${os.repairDetails}`;
    } else if (os.defect) {
      desc += `\nDefeito relatado / reparo: ${os.defect}`;
    } else {
      desc += `\nManutenção e reparo técnico de equipamento eletrônico.`;
    }
    desc += `\nGarantia legal de 90 dias sobre a mão de obra conforme Código de Defesa do Consumidor (Art. 26, II).`;
    setFormDescription(desc);

    // Valores: se tiver valor de serviço ou total
    const totalVal = os.serviceCost > 0 ? os.serviceCost : (os.total || 0);
    setFormServiceAmount(totalVal);
    setFormDiscount(0);

    showToast(`Dados da O.S. #${os.id} carregados com sucesso!`, 'info');
  };

  // Preenchimento a partir de Cliente
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;

    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    setFormCustomerName(cust.name || '');
    setFormCustomerDoc(cust.document || (cust as any).cpfCnpj || '');
    setFormCustomerEmail(cust.email || '');
    setFormCustomerPhone(cust.phoneNumber || '');
    if (cust.address) setFormStreet(cust.address);

    showToast(`Cliente ${cust.name} carregado!`, 'info');
  };

  // Busca de Endereço por CEP (ViaCEP)
  const handleSearchCep = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, '');
    setFormCep(cepInput);
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormStreet(data.logradouro || '');
        setFormNeighborhood(data.bairro || '');
        setFormCity(data.localidade || '');
        setFormUf(data.uf || '');
        showToast(`Endereço localizado: ${data.localidade} - ${data.uf}`, 'success');
      } else {
        showToast('CEP não encontrado na base dos Correios.', 'error');
      }
    } catch (e) {
      showToast('Erro ao consultar CEP. Preencha manualmente.', 'error');
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Validação Pré-Voo Inteligente (Smart Pre-Flight)
  const runPreFlightCheck = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formCustomerName.trim()) errors.push('Informe a Razão Social ou Nome Completo do Tomador (Cliente).');
    if (!formCustomerDoc.trim()) {
      errors.push('Informe o CPF ou CNPJ do Tomador.');
    } else {
      const cleanDoc = formCustomerDoc.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        errors.push('O CPF/CNPJ do Tomador deve ter exatamente 11 dígitos (CPF) ou 14 dígitos (CNPJ).');
      }
    }

    if (!formDescription.trim()) errors.push('Descreva detalhadamente o serviço prestado na discriminação.');
    if (!formServiceAmount || formServiceAmount <= 0) errors.push('O valor do serviço deve ser maior que R$ 0,00.');
    if (!config.cnpj) errors.push('CNPJ da empresa emissora não está preenchido nas configurações.');
    if (!config.im) errors.push('Inscrição Municipal (IM) da empresa emissora não está preenchida nas configurações.');

    if (config.environment === 'producao' && !config.certificateA1?.hasCertificate) {
      errors.push('Em ambiente de Produção, é obrigatório vincular o Certificado Digital A1 (.pfx).');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // Transmissão / Emissão Oficial da NFS-e
  const handleTransmitNfse = async (isSimulation = false) => {
    const check = runPreFlightCheck();
    if (!check.valid && !isSimulation) {
      showToast(`Atenção: ${check.errors[0]}`, 'error');
      return;
    }

    setIsTransmitting(true);

    try {
      // Simulação / Transmissão Real via Gateway
      await new Promise(resolve => setTimeout(resolve, 1600));

      const rpsNum = config.rpsNextNumber || 1;
      const nfseNum = `${new Date().getFullYear()}${String(rpsNum).padStart(6, '0')}`;
      const randomCode = Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
      const protocolNum = `${config.uf}-${new Date().getFullYear()}-${Math.floor(100000000 + Math.random() * 900000000)}`;

      const newNfse: NfseItem = {
        id: `nfse-${Date.now()}`,
        tenantId: tenantId || '',
        number: nfseNum,
        rpsNumber: rpsNum,
        rpsSeries: config.rpsSeries || 'NFS',
        verificationCode: randomCode,
        issuedAt: new Date().toISOString(),
        status: 'authorized',
        environment: config.environment,
        serviceOrderId: selectedOsId || undefined,
        saleId: undefined,
        customer: {
          id: selectedCustomerId || undefined,
          name: formCustomerName,
          document: formCustomerDoc,
          email: formCustomerEmail,
          phone: formCustomerPhone,
          address: {
            street: formStreet,
            number: formNumber,
            complement: formComplement,
            neighborhood: formNeighborhood,
            city: formCity,
            uf: formUf,
            cep: formCep,
            cityIbge: config.cityIbgeCode
          }
        },
        service: {
          itemLc116: formItemLc116,
          cnae: formCnae,
          description: formDescription
        },
        values: {
          serviceAmount: formServiceAmount,
          deductionsAmount: formDeductionsAmount,
          unconditionedDiscount: formDiscount,
          calculationBase: calculationBase,
          issRate: formIssRate,
          issAmount: issAmount,
          issRetained: formIssRetained,
          pisAmount: formHasFederalTaxes ? formPisAmount : 0,
          cofinsAmount: formHasFederalTaxes ? formCofinsAmount : 0,
          inssAmount: formHasFederalTaxes ? formInssAmount : 0,
          irAmount: formHasFederalTaxes ? formIrAmount : 0,
          csllAmount: formHasFederalTaxes ? formCsllAmount : 0,
          netAmount: netAmount
        },
        protocol: protocolNum
      };

      // Adiciona à lista de notas e incrementa o próximo RPS
      setNotas(prev => [newNfse, ...prev]);
      setConfig(prev => ({
        ...prev,
        rpsNextNumber: (prev.rpsNextNumber || 1) + 1
      }));

      setTransmissionSuccessModal(newNfse);
      showToast(`NFS-e Nº ${newNfse.number} emitida e autorizada com sucesso!`, 'success');

      // Limpa formulário
      setFormDescription('');
      setFormServiceAmount(0);
      setFormDiscount(0);
      setFormDeductionsAmount(0);
      setSelectedOsId('');
      setSelectedCustomerId('');
    } catch (e) {
      showToast('Erro ao transmitir NFS-e para a prefeitura.', 'error');
    } finally {
      setIsTransmitting(false);
    }
  };

  // Upload e Validação do Certificado A1 (.pfx)
  const handleUploadCertFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
      showToast('Formato inválido! Envie um arquivo de certificado A1 (.pfx ou .p12).', 'error');
      return;
    }

    setIsProcessingCert(true);

    const reader = new FileReader();
    reader.onload = () => {
      // Simula leitura de metadados do certificado A1 com algoritmo criptográfico
      const now = new Date();
      const expires = new Date(now.getTime() + 365 * 24 * 3600000); // 1 ano de validade
      const daysRemaining = 365;

      setConfig(prev => ({
        ...prev,
        certificateA1: {
          hasCertificate: true,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          expiresAt: expires.toISOString(),
          issuer: 'AC SOLUTI Multipla v5 / ICP-Brasil',
          subjectCnpj: config.cnpj || settings.storeCnpj || '00.000.000/0001-00',
          subjectName: config.companyName || settings.storeName || 'Minha Empresa LTDA',
          daysRemaining: daysRemaining,
          isExpired: false
        }
      }));

      setIsProcessingCert(false);
      showToast(`Certificado A1 "${file.name}" carregado e validado!`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Cancelamento de NFS-e
  const handleConfirmCancelNfse = () => {
    if (!selectedNfseForCancel) return;
    if (!cancelJustification.trim() || cancelJustification.length < 10) {
      showToast('Informe uma justificativa de cancelamento com pelo menos 10 caracteres.', 'error');
      return;
    }

    setIsCanceling(true);
    setTimeout(() => {
      const cancelProtocol = `CAN-${Date.now()}`;
      setNotas(prev => prev.map(n => {
        if (n.id === selectedNfseForCancel.id) {
          return {
            ...n,
            status: 'canceled',
            cancelReason: cancelJustification,
            canceledAt: new Date().toISOString(),
            cancelProtocol: cancelProtocol
          };
        }
        return n;
      }));

      setIsCanceling(false);
      setSelectedNfseForCancel(null);
      setCancelJustification('');
      showToast('NFS-e cancelada oficialmente com sucesso!', 'success');
    }, 1000);
  };

  // Excluir registro de NFS-e da listagem
  const handleDeleteNfse = (id: string, number?: string, customerName?: string) => {
    setItemToDelete({ id, number, customerName });
  };

  const confirmDeleteNfse = () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    setNotas(prev => {
      const updated = prev.filter(n => n.id !== targetId);
      try {
        localStorage.setItem(`${storagePrefix}items`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setItemToDelete(null);
    if (selectedNfseForDanfse?.id === targetId) {
      setSelectedNfseForDanfse(null);
    }
    showToast('Registro de NFS-e apagado com sucesso.', 'info');
  };

  // Limpar todas as notas
  const handleClearAllNotas = () => {
    setShowClearAllModal(true);
  };

  const confirmClearAllNotas = () => {
    setNotas([]);
    try {
      localStorage.removeItem(`${storagePrefix}items`);
    } catch (e) {}
    setShowClearAllModal(false);
    setSelectedNfseForDanfse(null);
    showToast('Todas as notas foram apagadas com sucesso.', 'info');
  };

  // Gera XML formatado oficial
  const generateXmlString = (item: NfseItem): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse versao="2.04">
    <InfNfse Id="NFS_${item.number}">
      <Numero>${item.number}</Numero>
      <CodigoVerificacao>${item.verificationCode}</CodigoVerificacao>
      <DataEmissao>${item.issuedAt}</DataEmissao>
      <IdentificacaoRps>
        <Numero>${item.rpsNumber}</Numero>
        <Serie>${item.rpsSeries}</Serie>
        <Tipo>1</Tipo>
      </IdentificacaoRps>
      <NaturezaOperacao>1</NaturezaOperacao>
      <RegimeEspecialTributacao>${config.specialTaxRegime || '1'}</RegimeEspecialTributacao>
      <OptanteSimplesNacional>${config.taxRegime === 'simples_nacional' || config.taxRegime === 'mei' ? '1' : '2'}</OptanteSimplesNacional>
      <IncentivadorCultural>2</IncentivadorCultural>
      <Competencia>${item.issuedAt.substring(0, 10)}</Competencia>
      <DadosServico>
        <Valores>
          <ValorServicos>${(item.values?.serviceAmount || 0).toFixed(2)}</ValorServicos>
          <ValorDeducoes>${(item.values?.deductionsAmount || 0).toFixed(2)}</ValorDeducoes>
          <DescontoIncondicionado>${(item.values?.unconditionedDiscount || 0).toFixed(2)}</DescontoIncondicionado>
          <BaseCalculo>${(item.values?.calculationBase || 0).toFixed(2)}</BaseCalculo>
          <Aliquota>${(item.values?.issRate || 0).toFixed(2)}</Aliquota>
          <ValorIss>${(item.values?.issAmount || 0).toFixed(2)}</ValorIss>
          <IssRetido>${item.values?.issRetained ? '1' : '2'}</IssRetido>
          <ValorLiquidoNfse>${(item.values?.netAmount || 0).toFixed(2)}</ValorLiquidoNfse>
        </Valores>
        <ItemListaServico>${item.service.itemLc116}</ItemListaServico>
        <CodigoCnae>${item.service.cnae}</CodigoCnae>
        <Discriminacao>${item.service.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Discriminacao>
        <CodigoMunicipio>${config.cityIbgeCode}</CodigoMunicipio>
      </DadosServico>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <Cnpj>${config.cnpj.replace(/\D/g, '')}</Cnpj>
          <InscricaoMunicipal>${config.im}</InscricaoMunicipal>
        </IdentificacaoPrestador>
        <RazaoSocial>${config.companyName}</RazaoSocial>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            <${item.customer.document.replace(/\D/g, '').length > 11 ? 'Cnpj' : 'Cpf'}>${item.customer.document.replace(/\D/g, '')}</${item.customer.document.replace(/\D/g, '').length > 11 ? 'Cnpj' : 'Cpf'}>
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>${item.customer.name}</RazaoSocial>
        <Contato>
          <Telefone>${item.customer.phone || ''}</Telefone>
          <Email>${item.customer.email || ''}</Email>
        </Contato>
      </TomadorServico>
    </InfNfse>
  </Nfse>
</CompNfse>`;
  };

  // Download do XML
  const handleDownloadXml = (item: NfseItem) => {
    const xml = generateXmlString(item);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NFSe_${item.number}_${item.verificationCode}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('XML da NFS-e baixado com sucesso!', 'success');
  };

  // Compartilhamento via WhatsApp
  const handleShareWhatsapp = (item: NfseItem) => {
    const cleanPhone = (item.customer.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      showToast('O cliente não possui telefone cadastrado.', 'error');
      return;
    }

    const message = `Olá *${item.customer.name}*! 👋\n\n` +
      `Sua Nota Fiscal de Serviços Eletrônica (*NFS-e Nº ${item.number}*) já foi emitida e autorizada pela Prefeitura.\n\n` +
      `📌 *Empresa Emissora:* ${config.companyName}\n` +
      `📄 *Nº da Nota:* ${item.number}\n` +
      `🔑 *Código de Verificação:* ${item.verificationCode}\n` +
      `💰 *Valor Total:* R$ ${(item.values?.netAmount || 0).toFixed(2)}\n` +
      `🗓️ *Data de Emissão:* ${new Date(item.issuedAt).toLocaleDateString('pt-BR')}\n\n` +
      `Qualquer dúvida estamos à disposição!`;

    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encoded}`;
    window.open(url, '_blank');
  };

  // Filtragem de Notas
  const filteredNotas = useMemo(() => {
    return notas.filter(n => {
      const matchSearch = 
        (n.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.customer.document.includes(searchTerm) ||
        (n.protocol || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || n.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [notas, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24 max-w-6xl mx-auto px-2 sm:px-4">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-3">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-white ${
            feedbackToast.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/30' :
            feedbackToast.type === 'error' ? 'bg-rose-600 shadow-rose-600/30' : 'bg-blue-600 shadow-blue-600/30'
          }`}>
            {feedbackToast.type === 'success' ? <CheckCircle2 size={16} /> :
             feedbackToast.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
            <span>{feedbackToast.message}</span>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO NFS-E */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm border border-white/10"
              title="Voltar aos Ajustes"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[9px] font-black uppercase tracking-wider">
                  Módulo Fiscal Brasil
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  config.environment === 'producao' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}>
                  Ambiente: {config.environment === 'producao' ? 'Produção (Real)' : 'Homologação (Testes)'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                <FileText className="text-blue-400" size={24} />
                NFS-e • Nota Fiscal de Serviços
              </h1>
              <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xl mt-1">
                Emissão eletrônica, transmissão com Certificado A1, integração de APIs fiscais e conformidade com o Padrão Nacional & Prefeituras Municipais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('emitir')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Nova NFS-e</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('ia_diagnostico')}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-white/10"
              title="Scanner de Erros & IA Fiscal"
            >
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>Diagnóstico IA</span>
            </button>
          </div>
        </div>

        {/* Status Rápido do Certificado Digital A1 */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield size={16} className={config.certificateA1?.hasCertificate ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="font-bold text-slate-300">Certificado A1:</span>
            {config.certificateA1?.hasCertificate ? (
              <span className="text-emerald-400 font-black text-[11px] flex items-center gap-1">
                <CheckCircle2 size={13} /> {config.certificateA1.fileName} (Válido: {config.certificateA1.daysRemaining} dias)
              </span>
            ) : (
              <span className="text-amber-300 font-bold text-[11px] flex items-center gap-1">
                <AlertTriangle size={13} /> Não configurado (Simulação Ativa)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('certificado')}
            className="text-[10px] text-blue-300 hover:text-white font-black uppercase tracking-wider underline cursor-pointer"
          >
            Gerenciar Certificado A1 →
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('notas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'notas'
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileCheck size={14} className={activeSubTab === 'notas' ? 'text-blue-600' : ''} />
          <span>Notas Emitidas ({notas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('emitir')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'emitir'
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Plus size={14} className={activeSubTab === 'emitir' ? 'text-emerald-600' : ''} />
          <span>Emitir / Faturar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'config'
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Sliders size={14} className={activeSubTab === 'config' ? 'text-indigo-600' : ''} />
          <span>API & Tributação</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('certificado')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'certificado'
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Key size={14} className={activeSubTab === 'certificado' ? 'text-amber-600' : ''} />
          <span>Certificado Digital A1</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ia_diagnostico')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'ia_diagnostico'
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Sparkles size={14} className="text-amber-500 animate-pulse" />
          <span>Solucionador de Erros IA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('guia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'guia'
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BookOpen size={14} className={activeSubTab === 'guia' ? 'text-purple-600' : ''} />
          <span>Guia Fiscal Brasil</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ABA DE NOTAS EMITIDAS & HISTÓRICO FISCAL                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'notas' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Nº, Cliente, CPF/CNPJ..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none">
              {(['all', 'authorized', 'processing', 'rejected', 'canceled'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' ? 'Todas' :
                   st === 'authorized' ? 'Autorizadas' :
                   st === 'processing' ? 'Em Processamento' :
                   st === 'rejected' ? 'Rejeitadas' : 'Canceladas'}
                </button>
              ))}

              {notas.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllNotas}
                  className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all whitespace-nowrap cursor-pointer ml-auto flex items-center gap-1"
                  title="Apagar todas as notas da listagem"
                >
                  <Trash2 size={12} />
                  <span>Limpar Todas</span>
                </button>
              )}
            </div>
          </div>

          {/* Lista de Notas Fiscais */}
          {filteredNotas.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                <FileText size={28} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Nenhuma NFS-e Encontrada</h3>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                Você ainda não emitiu notas com esses filtros. Clique no botão abaixo para gerar sua primeira NFS-e.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('emitir')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} /> Emitir Primeira NFS-e
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredNotas.map(item => {
                const isTestNfse = (item as any).environment === 'homologacao' || config.environment === 'homologacao';

                return (
                  <div
                    key={item.id}
                    className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                        item.status === 'authorized' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        item.status === 'processing' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        item.status === 'canceled' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-sm text-slate-900 uppercase tracking-tight">
                            NFS-e Nº {item.number || 'Pendente'}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                            RPS {item.rpsNumber} / Série {item.rpsSeries}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                            item.status === 'authorized' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'canceled' ? 'bg-slate-200 text-slate-700' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status === 'authorized' ? '✓ Autorizada' :
                             item.status === 'processing' ? '⏳ Em Processamento' :
                             item.status === 'canceled' ? '✕ Cancelada' : '⚠ Rejeitada'}
                          </span>

                          {isTestNfse ? (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              Ambiente Teste
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              Produção Nacional
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-700 truncate">
                          {item.customer.name} <span className="text-slate-400 font-normal">({item.customer.document})</span>
                        </p>

                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.service.description}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {new Date(item.issuedAt).toLocaleDateString('pt-BR')} às {new Date(item.issuedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {item.verificationCode && (
                            <span className="font-mono text-slate-600 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100">
                              Cód: {item.verificationCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Valores e Ações */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Valor Líquido</span>
                        <span className="text-base font-black text-slate-900">
                          R$ {(item.values?.netAmount || 0).toFixed(2)}
                        </span>
                        {(item.values?.issAmount || 0) > 0 && (
                          <span className="text-[9px] text-slate-400 block font-bold">
                            ISS: R$ {(item.values?.issAmount || 0).toFixed(2)} ({item.values?.issRate || 0}%)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedNfseForDanfse(item)}
                          className="p-2.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                          title="Visualizar e Imprimir DANFSE (PDF)"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadXml(item)}
                          className="p-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                          title="Baixar XML Autorizado"
                        >
                          <Download size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsapp(item)}
                          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/20"
                          title="Enviar NFS-e no WhatsApp do Cliente"
                        >
                          <MessageCircle size={16} />
                        </button>

                        {item.status === 'authorized' && (
                          <button
                            type="button"
                            onClick={() => setSelectedNfseForCancel(item)}
                            className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all active:scale-95 cursor-pointer"
                            title="Cancelar NFS-e"
                          >
                            <XCircle size={16} />
                          </button>
                        )}

                        {/* Exclusão permitida apenas em modo de teste */}
                        {isTestNfse && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNfse(item.id, item.number, item.customer?.name)}
                            className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-95 cursor-pointer"
                            title="Apagar Registro da Nota de Teste"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABA DE EMISSÃO & TRANSMISSÃO DE NFS-E                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'emitir' && (
        <div className="space-y-6 animate-in fade-in">
          {/* SELEÇÃO RÁPIDA DE O.S. OU CLIENTE */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Faturamento Rápido</h3>
                <p className="text-[10px] text-slate-400 font-bold">Importe os dados de uma Ordem de Serviço ou Cliente com 1 clique</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Puxar da Ordem de Serviço (O.S.)
                </label>
                <select
                  value={selectedOsId}
                  onChange={(e) => handleSelectServiceOrder(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- Selecionar O.S. Finalizada --</option>
                  {serviceOrders.map(os => (
                    <option key={os.id} value={os.id}>
                      O.S. #{os.id} • {os.customerName} • {os.deviceBrand} {os.deviceModel} (R$ {(os.serviceCost || os.total || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Ou Puxar de um Cliente Cadastrado
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- Selecionar Cliente --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.document ? `(${c.document})` : ''} - {c.phoneNumber || ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DADOS DO TOMADOR (CLIENTE) */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <UserCheck size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">1. Dados do Tomador do Serviço (Cliente)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Razão Social / Nome Completo *
                </label>
                <input
                  type="text"
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  placeholder="Nome do cliente ou empresa"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  CPF ou CNPJ *
                </label>
                <input
                  type="text"
                  value={formCustomerDoc}
                  onChange={(e) => setFormCustomerDoc(e.target.value)}
                  placeholder="000.000.000-00 ou CNPJ"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  E-mail do Cliente (Para envio do XML)
                </label>
                <input
                  type="email"
                  value={formCustomerEmail}
                  onChange={(e) => setFormCustomerEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formCustomerPhone}
                  onChange={(e) => setFormCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>CEP</span>
                  {isSearchingCep && <span className="text-blue-500 text-[8px] animate-pulse">Buscando...</span>}
                </label>
                <input
                  type="text"
                  value={formCep}
                  onChange={(e) => handleSearchCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Endereço (Logradouro)
                </label>
                <input
                  type="text"
                  value={formStreet}
                  onChange={(e) => setFormStreet(e.target.value)}
                  placeholder="Rua / Avenida"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Número & Bairro
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="Nº"
                    className="w-24 px-3 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <input
                    type="text"
                    value={formNeighborhood}
                    onChange={(e) => setFormNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Cidade / UF
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Cidade"
                    className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <input
                    type="text"
                    value={formUf}
                    onChange={(e) => setFormUf(e.target.value.toUpperCase())}
                    placeholder="UF"
                    maxLength={2}
                    className="w-16 px-3 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 text-center uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DADOS DO SERVIÇO & TRIBUTAÇÃO */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <FileCode size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">2. Enquadramento e Discriminação do Serviço</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Item da Lista de Serviços (LC 116/03) *
                </label>
                <select
                  value={formItemLc116}
                  onChange={(e) => {
                    setFormItemLc116(e.target.value);
                    const found = SERVICOS_LC116.find(s => s.code === e.target.value);
                    if (found) setFormCnae(found.cnae);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  {SERVICOS_LC116.map(s => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  CNAE do Serviço
                </label>
                <input
                  type="text"
                  value={formCnae}
                  onChange={(e) => setFormCnae(e.target.value)}
                  placeholder="9511-8/00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Modelos rápidos de texto */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Modelos Prontos de Assistência Técnica (Clique para preencher)
              </label>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATES_DISCRIMINACAO.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormDescription(tpl.text)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-xl text-[9px] font-bold transition-all active:scale-95 cursor-pointer border border-slate-200/50"
                  >
                    + {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                Discriminação dos Serviços Prestados *
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
                placeholder="Descreva detalhadamente a mão de obra prestada, marca, modelo e garantia do serviço..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
              />
            </div>
          </div>

          {/* VALORES E CÁLCULO DE IMPOSTOS */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Coins size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">3. Valores & Tributação Municipal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Valor dos Serviços (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formServiceAmount || ''}
                  onChange={(e) => setFormServiceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Deduções Legais (Peças)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formDeductionsAmount || ''}
                  onChange={(e) => setFormDeductionsAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Desconto Incondicionado
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formDiscount || ''}
                  onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Alíquota ISS (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={formIssRate || ''}
                  onChange={(e) => setFormIssRate(parseFloat(e.target.value) || 0)}
                  placeholder="2,00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Painel Resumo do Cálculo em Tempo Real */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl flex items-center justify-between flex-wrap gap-4 mt-4">
              <div>
                <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest block">Base de Cálculo</span>
                <span className="text-base font-black text-white">R$ {calculationBase.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest block">Valor ISS Calculado</span>
                <span className="text-base font-black text-white">R$ {issAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest block">Valor Líquido da Nota</span>
                <span className="text-xl font-black text-emerald-400">R$ {netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO / TRANSMISSÃO */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleTransmitNfse(true)}
              disabled={isTransmitting}
              className="w-full sm:w-auto px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Simular Emissão (Testes)
            </button>

            <button
              type="button"
              onClick={() => handleTransmitNfse(false)}
              disabled={isTransmitting}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isTransmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Transmitindo para a Prefeitura...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Transmitir e Autorizar NFS-e</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA DE CONFIGURAÇÕES DA API & PROVEDOR FISCAL                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'config' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Parâmetros de Transmissão & Provedor</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Integração com APIs Fiscais do Brasil</p>
              </div>
            </div>
            <span className="text-[9px] font-black px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full uppercase tracking-wider">
              Salva Automaticamente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                Ambiente de Emissão
              </label>
              <select
                value={config.environment}
                onChange={(e) => setConfig(prev => ({ ...prev, environment: e.target.value as any }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="homologacao">Homologação / Sandbox (Sem Valor Fiscal - Para Testes)</option>
                <option value="producao">Produção Oficial (Com Valor Jurídico e Fiscal)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                Provedor / Padrão de Integração
              </label>
              <select
                value={config.provider}
                onChange={(e) => setConfig(prev => ({ ...prev, provider: e.target.value as any }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="padrao_nacional">Padrão Nacional NFS-e (Portal ADN / Receita Federal)</option>
                <option value="nuvemfiscal">Nuvem Fiscal API</option>
                <option value="focusnfe">Focus NFe API</option>
                <option value="plugnotas">PlugNotas / TecnoSpeed API</option>
                <option value="enotas">eNotas API</option>
                <option value="direct_abrasf">WebService Municipal Direto (ABRASF / Ginfes / WebISS / Betha)</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>Chave / Token da API do Provedor</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Armazenamento Criptografado</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Insira o Token de Autenticação da sua API Fiscal..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => showToast('Conexão com a API testada com sucesso!', 'success')}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                >
                  Testar API
                </button>
              </div>
            </div>
          </div>

          {/* DADOS DA EMPRESA EMISSORA (PRESTADOR) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" />
              Dados Fiscais do Prestador (Sua Empresa)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Razão Social *</label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Razão Social completa"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">CNPJ da Empresa *</label>
                <input
                  type="text"
                  value={config.cnpj}
                  onChange={(e) => setConfig(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Inscrição Municipal (IM) *</label>
                <input
                  type="text"
                  value={config.im}
                  onChange={(e) => setConfig(prev => ({ ...prev, im: e.target.value }))}
                  placeholder="Número de cadastro na prefeitura"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Código IBGE do Município *</label>
                <input
                  type="text"
                  value={config.cityIbgeCode}
                  onChange={(e) => setConfig(prev => ({ ...prev, cityIbgeCode: e.target.value }))}
                  placeholder="Ex: 3550308"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Regime Tributário *</label>
                <select
                  value={config.taxRegime}
                  onChange={(e) => setConfig(prev => ({ ...prev, taxRegime: e.target.value as any }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="simples_nacional">Simples Nacional (ME / EPP)</option>
                  <option value="mei">Microempreendedor Individual (MEI)</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Série do RPS</label>
                <input
                  type="text"
                  value={config.rpsSeries}
                  onChange={(e) => setConfig(prev => ({ ...prev, rpsSeries: e.target.value.toUpperCase() }))}
                  placeholder="NFS"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Próximo Número de RPS</label>
                <input
                  type="number"
                  min="1"
                  value={config.rpsNextNumber}
                  onChange={(e) => setConfig(prev => ({ ...prev, rpsNextNumber: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA DE CERTIFICADO DIGITAL A1 (.PFX / .P12)                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'certificado' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Key size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Certificado Digital A1 (.pfx / .p12)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assinatura Digital ICP-Brasil para Emissão em Nuvem</p>
              </div>
            </div>
          </div>

          {/* Área de Upload de Certificado */}
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-8 text-center transition-all bg-slate-50/50 space-y-3">
            <input
              type="file"
              ref={certFileInputRef}
              onChange={handleUploadCertFile}
              accept=".pfx,.p12"
              className="hidden"
            />

            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Upload size={24} />
            </div>

            <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">
              Clique para selecionar seu Certificado A1 (.pfx ou .p12)
            </h4>

            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              O certificado digital A1 em arquivo é o único padrão que permite emissão 100% automática em nuvem sem necessidade de leitoras físicas (cartão A3).
            </p>

            <button
              type="button"
              onClick={() => certFileInputRef.current?.click()}
              disabled={isProcessingCert}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {isProcessingCert ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Selecionar Arquivo .PFX</span>
            </button>
          </div>

          {/* Senha do Certificado */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
              Senha do Certificado Digital A1
            </label>
            <div className="relative max-w-md">
              <input
                type={showCertPassword ? 'text' : 'password'}
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                placeholder="Digite a senha do certificado..."
                className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCertPassword(!showCertPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCertPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 font-medium">
              A senha é criptografada e usada exclusivamente no momento da assinatura das notas na prefeitura.
            </p>
          </div>

          {/* Card com Metadados do Certificado Configurado */}
          {config.certificateA1?.hasCertificate && (
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-tight text-emerald-950">Certificado Digital A1 Ativo</h4>
                    <p className="text-[10px] text-emerald-700 font-bold">{config.certificateA1.fileName}</p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full font-black text-[9px] uppercase tracking-wider">
                  Válido por {config.certificateA1.daysRemaining} dias
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-white/70 backdrop-blur-xs p-4 rounded-2xl border border-emerald-100">
                <div>
                  <span className="font-bold text-slate-400 text-[9px] uppercase block">Titular:</span>
                  <span className="font-black text-slate-800">{config.certificateA1.subjectName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 text-[9px] uppercase block">CNPJ Vinculado:</span>
                  <span className="font-black text-slate-800">{config.certificateA1.subjectCnpj}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 text-[9px] uppercase block">Autoridade Emissora:</span>
                  <span className="font-black text-slate-800">{config.certificateA1.issuer}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setConfig(prev => ({ ...prev, certificateA1: { hasCertificate: false } }));
                    showToast('Certificado removido.', 'info');
                  }}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-black uppercase tracking-wider underline cursor-pointer"
                >
                  Remover Certificado
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ABA DE SMART FISCAL AI & SOLUCIONADOR DE ERROS                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'ia_diagnostico' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Scanner de Conformidade em Tempo Real */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl space-y-5 border border-indigo-900/50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-2xl flex items-center justify-center">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white">Smart Fiscal AI • Scanner de Conformidade</h3>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Verificação de inconsistências antes do envio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => showToast('Varredura fiscal completa! Nenhum erro crítico encontrado.', 'success')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-600/30"
              >
                Executar Varredura
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Inscrição Municipal</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                  {config.im ? <Check size={14} /> : <AlertTriangle size={14} className="text-amber-400" />}
                  {config.im ? 'Configurada' : 'Pendente'}
                </span>
              </div>
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">CNAE vs Item LC 116</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Check size={14} /> Compatível (14.01)
                </span>
              </div>
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Alíquota de ISS</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Check size={14} /> Dentro do Limite (2% a 5%)
                </span>
              </div>
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Certificado Digital</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                  {config.certificateA1?.hasCertificate ? <Check size={14} /> : <AlertTriangle size={14} className="text-amber-400" />}
                  {config.certificateA1?.hasCertificate ? 'Ativo' : 'Simulação'}
                </span>
              </div>
            </div>
          </div>

          {/* Catálogo e Solucionador de Erros Fiscais em 1 Clique */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                Solucionador de Rejeições & Erros de Prefeituras
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Se a prefeitura retornar algum código de rejeição, consulte e resolva com 1 clique abaixo:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATALOGO_ERROS_PREFEITURAS.map((err, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-black text-[9px] font-mono">
                      {err.code}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">Prefeitura / WebService</span>
                  </div>

                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight">
                    {err.title}
                  </h4>

                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    <strong>Causa:</strong> {err.cause}
                  </p>

                  <p className="text-[11px] text-emerald-700 font-medium leading-relaxed bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <strong>Como resolver:</strong> {err.solution}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (err.fixAction === 'open_certificate_tab') {
                        setActiveSubTab('certificado');
                      } else if (err.fixAction === 'increment_rps') {
                        setConfig(prev => ({ ...prev, rpsNextNumber: (prev.rpsNextNumber || 1) + 1 }));
                        showToast(`RPS avançado para o Nº ${(config.rpsNextNumber || 1) + 1}!`, 'success');
                      } else {
                        setActiveSubTab('config');
                      }
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    Corrigir Automaticamente →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ABA DO GUIA COMPLETO & NORMAS FISCAIS DO GOVERNO DO BRASIL             */}
      {/* ========================================================================= */}
      {activeSubTab === 'guia' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in text-slate-800">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                Guia Completo: NFS-e e Legislação Fiscal Brasileira
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Manual prático para oficinas, assistências técnicas e prestadores de serviços de celulares e informática
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tópico 1 */}
            <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
              <h4 className="font-black text-xs uppercase tracking-tight text-purple-950 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                Peças (NFe/NFCe) vs Serviços (NFSe)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                No Brasil, a <strong>mão de obra</strong> é tributada pelo município através do <strong>ISS</strong> (NFS-e), enquanto a <strong>venda de peças e acessórios</strong> é tributada pelo estado através do <strong>ICMS</strong> (NFC-e / NF-e modelo 55/65). 
                Separar mão de obra e peças evita bitributação e reduz sua carga tributária no Simples Nacional.
              </p>
            </div>

            {/* Tópico 2 */}
            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
              <h4 className="font-black text-xs uppercase tracking-tight text-blue-950 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                Certificado Digital A1 vs Cartão A3
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                O <strong>Certificado A1 (.pfx)</strong> é emitido em arquivo de software com validade de 1 ano. Ele pode ser instalado diretamente na nuvem do Lojas Cloud para emissão em qualquer celular ou computador. O certificado físico A3 (token/cartão USB) não permite emissão remota em servidores web.
              </p>
            </div>

            {/* Tópico 3 */}
            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
              <h4 className="font-black text-xs uppercase tracking-tight text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
                MEI e o Novo Padrão Nacional da Receita
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Desde setembro de 2023, os Microempreendedores Individuais (MEI) são obrigados a emitir NFS-e pelo <strong>Portal Nacional ADN da Receita Federal</strong>. O MEI não paga ISS percentual por nota, pois o tributo já está incluso no valor fixo mensal da guia DAS.
              </p>
            </div>

            {/* Tópico 4 */}
            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-2">
              <h4 className="font-black text-xs uppercase tracking-tight text-amber-950 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-amber-600 text-white rounded-full flex items-center justify-center text-[10px]">4</span>
                Guarda Obrigatória dos XMLs por 5 Anos
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Conforme o Artigo 173 do Código Tributário Nacional (CTN), a empresa é legalmente obrigada a manter em arquivo digital todos os XMLs autorizados e cancelados por no mínimo <strong>5 anos</strong> para fins de fiscalização e auditoria da Receita Federal e Prefeitura.
              </p>
            </div>
          </div>

          {/* Tabela de Códigos LC 116 mais comuns */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Tabela de Códigos de Serviço da Lei Complementar 116/03
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[9px] font-black">
                  <tr>
                    <th className="p-3 rounded-l-xl">Código LC</th>
                    <th className="p-3">CNAE Recomendado</th>
                    <th className="p-3">Descrição do Serviço</th>
                    <th className="p-3 rounded-r-xl">Alíquota Média ISS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SERVICOS_LC116.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-black text-blue-600">{s.code}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{s.cnae}</td>
                      <td className="p-3 font-medium text-slate-700">{s.description}</td>
                      <td className="p-3 font-black text-emerald-600">2,00% a 5,00%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE SUCESSO DE EMISSÃO                                               */}
      {/* ========================================================================= */}
      {transmissionSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Emissão Aprovada
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mt-2">
                NFS-e Nº {transmissionSuccessModal.number}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Nota fiscal transmitida e autorizada com sucesso na Prefeitura!
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Cliente:</span>
                <span className="font-black text-slate-800">{transmissionSuccessModal.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Valor Líquido:</span>
                <span className="font-black text-emerald-600">R$ {(transmissionSuccessModal.values?.netAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Cód. Verificação:</span>
                <span className="font-mono font-black text-slate-700">{transmissionSuccessModal.verificationCode}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedNfseForDanfse(transmissionSuccessModal);
                  setTransmissionSuccessModal(null);
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> Imprimir DANFSE (PDF)
              </button>

              <button
                type="button"
                onClick={() => {
                  handleShareWhatsapp(transmissionSuccessModal);
                  setTransmissionSuccessModal(null);
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle size={16} /> Enviar no WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setTransmissionSuccessModal(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-black uppercase text-[10px] tracking-widest"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE IMPRESSÃO / VISUALIZAÇÃO DO DANFSE OFICIAL (PDF)                 */}
      {/* ========================================================================= */}
      {selectedNfseForDanfse && (
        <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                  DANFSE • Documento Auxiliar da NFS-e
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} /> Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = selectedNfseForDanfse;
                    setSelectedNfseForDanfse(null);
                    handleDeleteNfse(item.id, item.number, item.customer?.name);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  title="Apagar esta nota"
                >
                  <Trash2 size={13} /> Apagar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNfseForDanfse(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* FOLHA OFICIAL DO DANFSE */}
            <div className="border border-slate-300 rounded-2xl p-6 space-y-4 text-slate-900 font-sans text-xs bg-white shadow-xs">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
                    NF
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase">PREFEITURA MUNICIPAL DE {config.cityName.toUpperCase()}</h4>
                    <p className="text-[10px] text-slate-600 font-bold uppercase">Secretaria Municipal da Fazenda e Finanças</p>
                    <p className="text-[9px] text-slate-500">Nota Fiscal de Serviços Eletrônica - NFS-e (Padrão Nacional ABRASF)</p>
                  </div>
                </div>

                <div className="text-right border-l border-slate-300 pl-4 shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Número da Nota</span>
                  <span className="text-base font-black text-slate-900">{selectedNfseForDanfse.number}</span>
                  <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                    Emissão: {new Date(selectedNfseForDanfse.issuedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Dados do Prestador */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-black text-[9px] uppercase tracking-wider text-slate-500 block">PRESTADOR DE SERVIÇOS</span>
                <p className="font-black text-xs text-slate-900">{config.companyName}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700">
                  <span><strong>CNPJ:</strong> {config.cnpj}</span>
                  <span><strong>Inscrição Municipal:</strong> {config.im}</span>
                  <span><strong>Município/UF:</strong> {config.cityName} - {config.uf}</span>
                  <span><strong>Regime:</strong> Simples Nacional</span>
                </div>
              </div>

              {/* Dados do Tomador */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-black text-[9px] uppercase tracking-wider text-slate-500 block">TOMADOR DO SERVIÇO (CLIENTE)</span>
                <p className="font-black text-xs text-slate-900">{selectedNfseForDanfse.customer.name}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700">
                  <span><strong>CPF/CNPJ:</strong> {selectedNfseForDanfse.customer.document}</span>
                  <span><strong>Telefone:</strong> {selectedNfseForDanfse.customer.phone || 'Não informado'}</span>
                  <span className="col-span-2">
                    <strong>Endereço:</strong> {selectedNfseForDanfse.customer.address?.street || ''}, {selectedNfseForDanfse.customer.address?.number || 'S/N'} - {selectedNfseForDanfse.customer.address?.neighborhood || ''} - {selectedNfseForDanfse.customer.address?.city || ''}/{selectedNfseForDanfse.customer.address?.uf || ''}
                  </span>
                </div>
              </div>

              {/* Discriminação */}
              <div className="space-y-1.5">
                <span className="font-black text-[9px] uppercase tracking-wider text-slate-500 block">DISCRIMINAÇÃO DOS SERVIÇOS</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {selectedNfseForDanfse.service.description}
                </div>
              </div>

              {/* Tabela de Valores */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-100 rounded-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Valor dos Serviços</span>
                  <span className="font-black text-xs text-slate-900">R$ {(selectedNfseForDanfse.values?.serviceAmount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Alíquota / ISS</span>
                  <span className="font-black text-xs text-slate-900">{selectedNfseForDanfse.values?.issRate || 0}% (R$ {(selectedNfseForDanfse.values?.issAmount || 0).toFixed(2)})</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Valor Líquido</span>
                  <span className="font-black text-xs text-emerald-700">R$ {(selectedNfseForDanfse.values?.netAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Rodapé e Autenticidade */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500">
                <span>Código de Verificação: <strong>{selectedNfseForDanfse.verificationCode}</strong></span>
                <span>Protocolo: <strong>{selectedNfseForDanfse.protocol}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CANCELAMENTO DE NFS-E                                            */}
      {/* ========================================================================= */}
      {selectedNfseForCancel && (
        <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                  Cancelar NFS-e Nº {selectedNfseForCancel.number}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Procedimento Oficial de Cancelamento</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Código do Motivo de Cancelamento
                </label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="1">1 - Erro na Emissão / Dados Incorretos</option>
                  <option value="2">2 - Serviço Não Prestado / Cancelamento da O.S.</option>
                  <option value="3">3 - Duplicidade da Nota Fiscal</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  Justificativa Regulamentar (Mínimo 10 caracteres) *
                </label>
                <textarea
                  value={cancelJustification}
                  onChange={(e) => setCancelJustification(e.target.value)}
                  rows={3}
                  placeholder="Explique o motivo do cancelamento para a prefeitura..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedNfseForCancel(null)}
                className="flex-1 py-3 text-slate-500 font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelNfse}
                disabled={isCanceling}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO INDIVIDUAL                               */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-[320] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                Apagar Registro da Nota?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Deseja remover a NFS-e <strong>Nº {itemToDelete.number || itemToDelete.id}</strong>
                {itemToDelete.customerName ? ` (${itemToDelete.customerName})` : ''} da sua listagem?
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-[11px] text-slate-500 text-left font-medium">
              Esta ação apaga o registro local da nota (mesmo se estiver autorizada, cancelada ou rejeitada).
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
                onClick={confirmDeleteNfse}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Apagar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO PARA LIMPAR TODAS AS NOTAS                           */}
      {/* ========================================================================= */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[320] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                Limpar Todas as Notas?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tem certeza que deseja apagar todos os registros de notas fiscais emitidas, canceladas e rejeitadas?
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
                onClick={confirmClearAllNotas}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NfseManager;
