
export interface GlobalSystemSettings {
  monthly: { price: number; maxUsers: number; maxOS: number; maxProducts: number };
  quarterly: { price: number; maxUsers: number; maxOS: number; maxProducts: number };
  yearly: { price: number; maxUsers: number; maxOS: number; maxProducts: number };
  trial: { maxUsers: number; maxOS: number; maxProducts: number };
  supportPhone?: string;
  mercadoPagoAccessToken?: string;
  aiPackages?: {
    package50?: { price: number; credits: number };
    package150?: { price: number; credits: number };
    package500?: { price: number; credits: number };
  };
  aiApiKey?: string;
  aiDisabledGlobally?: boolean;
}

export interface Tenant {
  id: string;
  storeName: string;
  adminUsername: string;
  adminPasswordHash: string;
  createdAt: string;
  logoUrl?: string | null;
  subscriptionStatus?: 'trial' | 'active' | 'expired';
  subscriptionExpiresAt?: string;
  customMonthlyPrice?: number;
  customQuarterlyPrice?: number;
  customYearlyPrice?: number;
  lastPlanType?: 'monthly' | 'quarterly' | 'yearly';
  aiCredits?: number;
  fiscalModeEnabled?: boolean;
  enabledFeatures?: {
    osTab: boolean;
    customersTab?: boolean;
    stockTab: boolean;
    salesTab: boolean;
    fiscalTab?: boolean;
    fiscalMode?: boolean;
    financeTab: boolean;
    toolsTab?: boolean;
    aiFeature?: boolean;
    profiles: boolean;
    xmlExportImport: boolean;
    hideFinancialReports?: boolean;
    promoBanner?: boolean;
  };
  maxUsers?: number;
  maxOS?: number;
  maxProducts?: number;
  printerSize?: 58 | 80;
  retentionMonths?: number;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  role: 'admin' | 'colaborador' | 'super';
  password?: string;
  photo: string | null;
  specialty?: 'Vendedor' | 'Técnico' | 'Outros';
  tenantId?: string;
}

export type DeviceHardwareTestType = 
  | 'touch'
  | 'multitouch'
  | 'mic'
  | 'speaker'
  | 'earpiece'
  | 'wifi'
  | 'proximity'
  | 'biometrics';

export type DiagnosticTestStatus = 'passed' | 'failed' | 'untested' | 'skipped';

export interface DeviceHardwareTestItem {
  id: DeviceHardwareTestType;
  name: string;
  status: DiagnosticTestStatus;
  testedAt?: string;
  details?: string;
}

export interface DeviceDiagnosticResults {
  testedAt: string;
  overallStatus: 'passed' | 'partial' | 'failed';
  summary?: string;
  technicianNotes?: string;
  tests: Record<string, DeviceHardwareTestItem>;
}

// Interface que define a estrutura de uma Ordem de Serviço
export interface ServiceOrder {
  id: string;
  date: string; // Data de criação do registro no sistema
  entryDate: string; // DATA DE ENTRADA DO APARELHO (PT-BR)
  exitDate: string; // DATA DE SAÍDA DO APARELHO (PT-BR)
  customerName: string;
  phoneNumber: string;
  address: string;
  deviceBrand: string;
  deviceModel: string;
  defect: string;
  repairDetails: string;
  partsCost: number;
  serviceCost: number;
  total: number;
  status: 'Recebido' | 'Em Análise' | 'Aguardando Peça' | 'Aprovado' | 'Em Manutenção' | 'Concluído' | 'Entregue' | 'Pendente';
  photos: string[];
  finishedPhotos?: string[];
  checklist?: string[];
  signature?: string;
  isDeleted?: boolean;
  technicianId?: string;
  sellerId?: string;
  paymentMethod?: 'Dinheiro' | 'Cartão' | 'PIX';
  paymentInstallments?: number;
  customerId?: string;
  partSupplierId?: string;
  partSupplierWarranty?: string;
  trackingToken?: string;
  publicNotes?: string;
  isTrackingEnabled?: boolean;
  diagnosticTests?: DeviceDiagnosticResults;
  fiscalNoteNumber?: string;
  fiscalNoteEmitted?: boolean;
  fiscalNoteVerificationCode?: string;
  fiscalNoteDate?: string;
}

export interface CustomerNote {
  id: string;
  text: string;
  createdAt: string;
  authorName?: string;
}

export interface Customer {
  id: string;
  tenantId?: string;
  name: string;
  phoneNumber: string;
  phone?: string;
  address?: string;
  document?: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  notes?: string;
  notesHistory?: CustomerNote[];
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface TaxProfile {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  crtTaxRegime?: 'simples' | 'normal' | 'mei' | 'excesso_sublimite';
  crtCode?: '1' | '2' | '3' | '4' | string;
  csosnCst: string;
  origin: string;
  cstPis: string;
  cstCofins: string;
  defaultCfopInternal: string;
  defaultCfopInterstate?: string;
  icmsAliquota?: number;
  pisAliquota?: number;
  cofinsAliquota?: number;
  isDefault?: boolean;
  
  // Novos campos estruturados do ERP
  tipoOperacao?: 'saida' | 'entrada';
  destinoOperacao?: 'interna' | 'interestadual' | 'exterior';
  tipoDestinatario?: 'contribuinte' | 'nao_contribuinte' | 'produtor_rural';
  modalidadeBc?: 'op' | 'pauta' | 'tabelado' | 'mva';
  mvaPercentual?: number;
  icmsStAliquotaDestino?: number;
  modalidadeBcSt?: 'op' | 'pauta' | 'tabelado' | 'mva';
  fcpAliquota?: number;
  pisTipoCalculo?: 'percentual' | 'valor';
  cofinsTipoCalculo?: 'percentual' | 'valor';
  cstIpi?: string;
  cEnqIpi?: string;
  issExigibilidade?: 'exigivel' | 'nao_incidencia' | 'isencao' | 'exportacao' | 'suspenso';
  issRegimeEspecial?: 'microempresa_municipal' | 'estimativa' | 'sociedade_profissionais' | 'cooperativa' | 'mei';
  issAliquota?: number;
  issRetencao?: boolean;
  issResponsavelRetencao?: 'prestador' | 'tomador';
  itemLc116?: string;
  codigoTributacaoNacional?: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  barcode?: string;
  photo: string | null;
  costPrice: number;
  salePrice: number;
  quantity: number;
  description?: string;
  additionalPhotos?: string[];
  promotionalPrice?: number;
  isPromotion?: boolean;
  videoUrl?: string;
  brand?: string;
  model?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  csosnCst?: string;
  origin?: string;
  cstPis?: string;
  cstCofins?: string;
  crtCode?: '1' | '2' | '3' | '4' | string;
  taxProfileId?: string;
  taxProfileName?: string;
  icmsAliquota?: number;
  pisAliquota?: number;
  cofinsAliquota?: number;
  discount?: number;

  // Novos campos sincronizados com o Perfil Tributário
  tipoOperacao?: 'saida' | 'entrada';
  destinoOperacao?: 'interna' | 'interestadual' | 'exterior';
  tipoDestinatario?: 'contribuinte' | 'nao_contribuinte' | 'produtor_rural';
  modalidadeBc?: 'op' | 'pauta' | 'tabelado' | 'mva';
  mvaPercentual?: number;
  icmsStAliquotaDestino?: number;
  modalidadeBcSt?: 'op' | 'pauta' | 'tabelado' | 'mva';
  fcpAliquota?: number;
  pisTipoCalculo?: 'percentual' | 'valor';
  cofinsTipoCalculo?: 'percentual' | 'valor';
  cstIpi?: string;
  cEnqIpi?: string;
  issExigibilidade?: 'exigivel' | 'nao_incidencia' | 'isencao' | 'exportacao' | 'suspenso';
  issRegimeEspecial?: 'microempresa_municipal' | 'estimativa' | 'sociedade_profissionais' | 'cooperativa' | 'mei';
  issAliquota?: number;
  issRetencao?: boolean;
  issResponsavelRetencao?: 'prestador' | 'tomador';
  itemLc116?: string;
  codigoTributacaoNacional?: string;
}

export interface FiscalNcmRecord {
  code: string;
  description: string;
  cest?: string;
  cfop?: string;
  aliquotaNac?: number;
  aliquotaImp?: number;
  category?: string;
}

export interface FiscalCestRecord {
  code: string;
  ncm?: string;
  description: string;
  segment?: string;
}

export interface FiscalCfopRecord {
  code: string;
  description: string;
  type: 'entrada' | 'saida';
  application?: string;
}

export interface FiscalMatchResult {
  ncm: string;
  ncmDescription: string;
  cest?: string;
  cfop: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'database' | 'default' | 'ai';
  alternatives?: Array<{ code: string; description: string; score: number }>;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  category?: string;
  date: string;
  quantity: number;
  originalPrice: number; // This is salePricePerUnitAtSale
  discount: number;
  surcharge?: number;
  finalPrice: number;
  costAtSale: number; // This is totalCostAtSale
  costPerUnitAtSale: number;
  salePricePerUnitAtSale: number;
  paymentMethod?: string;
  paymentEntriesJson?: string;
  change?: number;
  sellerName?: string;
  sellerId?: string;
  transactionId?: string;
  isDeleted?: boolean;
  customerName?: string;
  customerPhone?: string;
  total?: number;
  items?: any[];
  fiscalNoteNumber?: string;
  fiscalNoteEmitted?: boolean;
  fiscalNoteAccessKey?: string;
  fiscalAccessKey?: string;
  fiscalStatus?: 'authorized' | 'pending_contingency' | 'rejected' | 'canceled';
  fiscalProtocol?: string;
  fiscalQrCodeUrl?: string;
  fiscalIssuedAt?: string;
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  date: string;
  category?: string;
  paymentMethod?: string;
  isDeleted?: boolean;
  dueDate?: string;
  status?: 'pending' | 'paid' | 'overdue';
  installments?: {
    current: number;
    total: number;
  };
  recurrence?: 'monthly' | 'yearly';
}

export interface AppSettings {
  storeName: string;
  storeCorporateName?: string;
  storeTradeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeCity?: string;
  storeState?: string;
  logoUrl: string | null;
  users: User[];
  isConfigured: boolean;
  themePrimary: string;
  themeSidebar: string;
  themeBg: string;
  themeBottomTab: string;
  pdfWarrantyText: string;
  pdfFontSize: number;
  pdfFontFamily: 'helvetica' | 'courier' | 'times';
  pdfPaperWidth: number;
  printerSize?: 58 | 80;
  retentionMonths?: number;
  pdfTextColor: string;
  pdfBgColor: string;
  receiptHeaderSubtitle?: string;
  receiptLabelProtocol?: string;
  receiptLabelDate?: string;
  receiptLabelClientSection?: string;
  receiptLabelClientName?: string;
  receiptLabelClientPhone?: string;
  receiptLabelClientAddress?: string;
  receiptLabelServiceSection?: string;
  receiptLabelDevice?: string;
  receiptLabelDefect?: string;
  receiptLabelRepair?: string;
  receiptLabelTotal?: string;
  receiptLabelEntryPhotos?: string;
  receiptLabelExitPhotos?: string;
  itemsPerPage: 8 | 16 | 32 | 64;
  stockLayout?: 'small' | 'medium' | 'list';
  salesLayout?: 'small' | 'medium' | 'list';
  osLayout?: 'small' | 'medium' | 'large';
  customersLayout?: 'small' | 'medium' | 'large' | 'list';
  hideCustomerValues?: boolean;
  catalogSlug?: string;
  enableBillNotifications?: boolean;
  enableReceivableNotifications?: boolean;
  enableLowStockNotifications?: boolean;
  enableNewOSNotifications?: boolean;
  enableNewSaleNotifications?: boolean;
  salesBannerUrl?: string | null;
  customDomain?: string;
  storeCnpj?: string;
  storeStateRegistration?: string;
  fiscalModeEnabled?: boolean;
  autoEmitFiscalOnSale?: boolean;
  autoEmitFiscalOnOS?: boolean;
  autoEmitNfceOnSale?: boolean;
  defaultFiscalDocType?: 'nfce' | 'nfe';
  certificateA1?: CertificateA1Data;
  nfceNfeConfig?: NfceNfeConfig;
  nfseConfig?: NfseConfig;
}

export interface Employee {
  id: string;
  tenantId: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  pixKey?: string;
  pixKeyType?: 'cpf' | 'email' | 'phone' | 'random';
  role: 'tecnico' | 'vendedor' | 'atendente' | 'gerente' | 'administrador';
  status: 'active' | 'inactive';
  admissionDate: string;
  photoUrl?: string;
  salaryBase: number;
  // Commission Settings
  commissionType: 'sales_percent' | 'profit_percent' | 'mixed';
  defaultCommissionPercent: number; // Used for sales (or profit if type is profit_percent)
  serviceCommissionPercent: number; // Specific for services
  goalMonthly: number;
  permissions: {
    open_os: boolean;
    sell: boolean;
    view_finance: boolean;
    edit_price: boolean;
    cancel_sale: boolean;
  };
}

export interface CommissionRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  targetType: 'global' | 'category' | 'product' | 'service';
  targetId?: string; // ID of category, product or service
  employeeId?: string; // If null, applies to all
  ruleType: 'percent' | 'fixed';
  calculationBase: 'gross_sale' | 'net_profit';
  value: number; // Percent or fixed value
  minAmount?: number; // Minimum sale amount for rule to apply
  requiresGoalMet?: boolean; // If true, only applies if monthly goal is met
  priority: number;
  isActive: boolean;
}

export interface GoalTier {
  id: string;
  tenantId: string;
  employeeId?: string; // If null, it's a global tier
  name: string;
  minAmount: number;
  bonusType: 'percent' | 'fixed';
  bonusValue: number;
  calculationBase: 'gross_sale' | 'net_profit';
}

export interface CommissionLog {
  id: string;
  employeeId: string;
  originType: 'sale' | 'service_order' | 'bonus';
  originId: string;
  description: string;
  saleAmount: number;
  profitAmount: number;
  commissionAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  createdAt: string;
}

export interface NfseConfig {
  environment: 'homologacao' | 'producao';
  provider: 'padrao_nacional' | 'nuvemfiscal' | 'focusnfe' | 'plugnotas' | 'enotas' | 'direct_abrasf';
  apiKey: string;
  apiSecret?: string;
  companyName: string;
  tradeName?: string;
  cnpj: string;
  im: string; // Inscrição Municipal
  cityIbgeCode: string;
  cityName: string;
  uf: string;
  cnae: string;
  taxRegime: 'simples_nacional' | 'mei' | 'lucro_presumido' | 'lucro_real';
  specialTaxRegime?: string;
  defaultItemLc116: string;
  defaultIssRate: number;
  issRetained: boolean;
  rpsSeries: string;
  rpsNextNumber: number;
  prestadorMunicipio?: string;
  prestadorUf?: string;
  aliquotaIss?: number;
  certificateA1?: CertificateA1Data;
}

export interface NfseItem {
  id: string;
  tenantId: string;
  number?: string;
  rpsNumber: number;
  rpsSeries: string;
  verificationCode?: string;
  issuedAt: string;
  status: 'authorized' | 'processing' | 'rejected' | 'canceled' | 'draft';
  environment: 'homologacao' | 'producao';
  serviceOrderId?: string;
  saleId?: string;
  customer: {
    id?: string;
    name: string;
    document: string; // CPF or CNPJ
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      uf?: string;
      cep?: string;
      cityIbge?: string;
    };
  };
  service: {
    itemLc116: string;
    cnae: string;
    description: string;
    municipalTaxCode?: string;
  };
  values: {
    serviceAmount: number;
    deductionsAmount: number;
    unconditionedDiscount: number;
    calculationBase: number;
    issRate: number;
    issAmount: number;
    issRetained: boolean;
    pisAmount?: number;
    cofinsAmount?: number;
    inssAmount?: number;
    irAmount?: number;
    csllAmount?: number;
    netAmount: number;
  };
  xmlContent?: string;
  pdfUrl?: string;
  protocol?: string;
  errorMessage?: string;
  cancelReason?: string;
  canceledAt?: string;
  cancelProtocol?: string;
}

export type FiscalDocType = 'nfce' | 'nfe';

export interface NfceNfeProductItem {
  id?: string;
  productId?: string;
  code?: string;
  name?: string;
  itemNumber?: number;
  description?: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unit?: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  origin?: number | string; // 0 - Nacional, 1 - Importação Direta, 2 - Mercado Interno
  csosn?: string; // 102, 500, 101, 400
  cst?: string;
  icmsRate?: number;
  icmsAmount?: number;
  pisRate?: number;
  pisAmount?: number;
  cofinsRate?: number;
  cofinsAmount?: number;
}

export interface NfceNfeItem {
  id: string;
  tenantId: string;
  docType: FiscalDocType; // 'nfce' (Modelo 65) ou 'nfe' (Modelo 55)
  number: string;
  series: string;
  accessKey: string;
  qrCodeUrl?: string;
  issuedAt: string;
  status: 'authorized' | 'processing' | 'rejected' | 'canceled' | 'inutilized' | 'draft' | 'contingencia_offline' | 'pending_contingency';
  environment: 'homologacao' | 'producao';
  saleId?: string;
  items: NfceNfeProductItem[];
  customer?: {
    id?: string;
    name?: string;
    document?: string; // CPF or CNPJ
    cpfCnpj?: string;
    cpf?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    stateRegistration?: string;
    isFinalConsumer?: boolean;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      uf?: string;
      cep?: string;
      zipCode?: string;
      cityIbge?: string;
    };
  };
  payment: {
    method?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'credito_loja' | 'outros' | string;
    paymentType?: string;
    paymentMethodName?: string;
    amount?: number;
    amountPaid?: number;
    change?: number;
    cardBrand?: string;
  };
  totals: {
    productsAmount: number;
    discountAmount: number;
    freightAmount?: number;
    otherExpenses?: number;
    totalAmount: number;
    icmsCalculationBase?: number;
    icmsTotalAmount?: number;
    icmsAmount?: number;
    pisTotalAmount?: number;
    pisAmount?: number;
    cofinsTotalAmount?: number;
    cofinsAmount?: number;
    approximateTaxAmount?: number;
  };
  naturezaOperacao?: string; // Ex: "VENDA AO CONSUMIDOR FINAL" ou "VENDA DE MERCADORIA"
  protocol?: string;
  xmlContent?: string;
  pdfUrl?: string;
  errorMessage?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  rejectionSuggestion?: string;
  tpEmis?: '1' | '9';
  contingencyReason?: string;
  contingencyRegisteredAt?: string;
  digestValue?: string;
  cancelReason?: string;
  canceledAt?: string;
  cancelProtocol?: string;
  cce?: Array<{
    sequence: number;
    correctionText: string;
    registeredAt: string;
    protocol: string;
  }>;
}

export interface NfceNfeConfig {
  environment: 'homologacao' | 'producao';
  provider: 'sefaz_direta' | 'nuvemfiscal' | 'focusnfe' | 'plugnotas' | 'webmania' | 'enotas';
  apiKey: string;
  apiSecret?: string;
  companyName: string;
  tradeName?: string;
  cnpj: string;
  ie: string; // Inscrição Estadual
  im?: string; // Inscrição Municipal
  cityIbgeCode: string;
  cityName: string;
  uf: string;
  cnae: string;
  taxRegime: 'simples_nacional' | 'mei' | 'lucro_presumido' | 'lucro_real';
  crt?: '1' | '2' | '3' | '4' | string;
  crtCode?: '1' | '2' | '3' | '4' | string;
  csosnDefault: string; // 102, 500, etc.
  cfopDefault: string; // 5102, 5405
  ncmDefault: string; // 8517.79.00
  icmsDefaultRate: number;
  nfceSeries: string;
  nfceNextNumber: number;
  nfeSeries: string;
  nfeNextNumber: number;
  cscId: string; // IdToken CSC (ex: 000001)
  cscCode: string; // Código de Segurança do Contribuinte
  certificateA1?: CertificateA1Data;
}

export interface CertificateA1Data {
  hasCertificate: boolean;
  fileName?: string;
  uploadedAt?: string;
  expiresAt?: string;
  validFrom?: string;
  issuer?: string;
  subjectCnpj?: string;
  subjectName?: string;
  serialNumber?: string;
  status?: 'valid' | 'expiring_soon' | 'expired' | 'unconfigured';
  isExpired?: boolean;
  daysRemaining?: number;
  certBase64?: string;
  certPassword?: string;
  certTypeProfile?: 'long_term' | 'expired' | 'fixed_date' | 'standard';
  thumbprint?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
  cnpjMatch?: boolean;
  diagnosticNotes?: string[];
}

export interface FiscalEventItem {
  id: string;
  tenantId: string;
  docType: 'nfe' | 'nfce' | 'nfse';
  eventType: 'cce' | 'cancelamento' | 'inutilizacao' | 'manifestacao';
  accessKey: string;
  docNumber?: string;
  sequence?: number;
  description: string;
  correctionText?: string;
  justification?: string;
  startNumber?: number;
  endNumber?: number;
  series?: string;
  year?: number;
  manifestType?: 'ciencia' | 'confirmacao' | 'desconhecimento' | 'nao_realizada';
  protocol: string;
  status: 'authorized' | 'rejected' | 'processing';
  registeredAt: string;
  xmlEventContent?: string;
}

export interface XmlDocItem {
  id: string;
  tenantId: string;
  type: 'entrada' | 'saida';
  docType: 'nfe' | 'nfce' | 'nfse';
  accessKey: string;
  number: string;
  series: string;
  emitterName: string;
  emitterCnpj: string;
  destName?: string;
  destCnpjCpf?: string;
  issuedAt: string;
  totalAmount: number;
  xmlContent: string;
  importedAt?: string;
  status: 'imported_stock' | 'archived' | 'pending';
  itemsCount?: number;
}

export interface FiscalAuditRule {
  id: string;
  category: 'ncm' | 'cfop' | 'icms' | 'pis_cofins' | 'certificado' | 'sefaz_status';
  title: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  message: string;
  suggestion: string;
  affectedCount?: number;
  targetDoc?: string;
}
