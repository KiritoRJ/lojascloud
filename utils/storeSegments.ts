import { 
  Smartphone, 
  ShoppingCart, 
  Pill, 
  UtensilsCrossed, 
  Dumbbell, 
  Globe, 
  LucideIcon 
} from 'lucide-react';
import { BusinessSegment, EnabledFeatures, AppSettings } from '../types';

export interface StoreSegmentConfig {
  id: BusinessSegment;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  badgeText: string;
  badgeColor: string;
  themePrimary: string;
  themeSidebar: string;
  themeBg: string;
  themeBottomTab: string;
  accentGradient: string;
  heroImage: string;
  defaultTab: 'os' | 'vendas' | 'clientes' | 'estoque';
  enabledFeatures: EnabledFeatures;
  navLabels: {
    os?: string;
    clientes?: string;
    estoque?: string;
    vendas?: string;
    fiscal?: string;
    financeiro?: string;
    team?: string;
    ferramentas?: string;
    config?: string;
  };
  sampleCategories: string[];
  bannerHighlight: string;
}

export const STORE_SEGMENTS: StoreSegmentConfig[] = [
  {
    id: 'assistencia_tecnica',
    name: 'Assistência Técnica de Celulares',
    shortName: 'Assistência Técnica',
    subtitle: 'Celulares, Tablets & Informática',
    description: 'Gestão de Ordens de Serviço (O.S.), bancada técnica, peças com garantia, clientes e laudos com fotos.',
    icon: Smartphone,
    badgeText: 'Padrão Técnico',
    badgeColor: 'bg-blue-500/15 text-blue-600 border-blue-300',
    themePrimary: '#2563eb',
    themeSidebar: '#0f172a',
    themeBg: '#f8fafc',
    themeBottomTab: '#0f172a',
    accentGradient: 'from-blue-600 to-indigo-600',
    heroImage: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80',
    defaultTab: 'os',
    enabledFeatures: {
      osTab: true,
      customersTab: true,
      stockTab: true,
      salesTab: true,
      fiscalTab: true,
      financeTab: true,
      toolsTab: true,
      profiles: true,
      xmlExportImport: true,
      hideFinancialReports: false,
      businessSegment: 'assistencia_tecnica'
    },
    navLabels: {
      os: 'Ordens',
      clientes: 'Clientes',
      estoque: 'Estoque',
      vendas: 'Vendas',
      fiscal: 'Fiscal',
      financeiro: 'Finanças',
      team: 'Equipe',
      ferramentas: 'Ferramentas',
      config: 'Ajustes'
    },
    sampleCategories: ['Telas & Displays', 'Baterias', 'Conectores de Carga', 'Acessórios & Cabos', 'Capinhas & Películas'],
    bannerHighlight: 'Bancada Técnica & Ordens de Serviço'
  },
  {
    id: 'mercado',
    name: 'Mercado & Supermercado',
    shortName: 'Supermercado',
    subtitle: 'Minimercado, Mercearia & Varejo',
    description: 'Foco total em agilidade de Frente de Caixa (PDV), leitor de código de barras rápido, balança, estoque em gôndola e fechamento diário.',
    icon: ShoppingCart,
    badgeText: 'Frente de Caixa Rápido',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
    themePrimary: '#059669',
    themeSidebar: '#064e3b',
    themeBg: '#f0fdf4',
    themeBottomTab: '#064e3b',
    accentGradient: 'from-emerald-600 to-teal-700',
    heroImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
    defaultTab: 'vendas',
    enabledFeatures: {
      osTab: false,
      customersTab: false,
      stockTab: true,
      salesTab: true,
      fiscalTab: true,
      financeTab: true,
      toolsTab: false,
      profiles: true,
      xmlExportImport: true,
      hideFinancialReports: false,
      businessSegment: 'mercado'
    },
    navLabels: {
      vendas: 'PDV Caixa',
      estoque: 'Produtos & Gôndola',
      fiscal: 'Fiscal (NFC-e)',
      financeiro: 'Finanças',
      team: 'Operadores',
      config: 'Ajustes'
    },
    sampleCategories: ['Bebidas & Sucos', 'Hortifruti & Feira', 'Padaria & Confeitaria', 'Mercearia & Grãos', 'Higiene & Limpeza', 'Açougue & Frios'],
    bannerHighlight: 'Frente de Caixa com Leitor de Código de Barras'
  },
  {
    id: 'farmacia',
    name: 'Farmácia & Drogaria',
    shortName: 'Farmácia',
    subtitle: 'Saúde, Medicamentos & Medicina',
    description: 'Design clean voltado para medicina: dispensação ágil de balcão, medicamentos éticos/genéricos, controle rigoroso de lotes e validade.',
    icon: Pill,
    badgeText: 'Medicina & Farmácia',
    badgeColor: 'bg-teal-500/15 text-teal-800 border-teal-300',
    themePrimary: '#0d9488',
    themeSidebar: '#042f2e',
    themeBg: '#f8fcfa',
    themeBottomTab: '#042f2e',
    accentGradient: 'from-teal-600 via-emerald-600 to-teal-700',
    heroImage: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&q=80',
    defaultTab: 'vendas',
    enabledFeatures: {
      osTab: false,
      customersTab: true,
      stockTab: true,
      salesTab: true,
      fiscalTab: true,
      financeTab: true,
      toolsTab: false,
      profiles: true,
      xmlExportImport: true,
      hideFinancialReports: false,
      businessSegment: 'farmacia'
    },
    navLabels: {
      vendas: 'Balcão Farmacêutico',
      clientes: 'Pacientes / Convênios',
      estoque: 'Medicamentos & Lotes',
      fiscal: 'Fiscal (NFC-e)',
      financeiro: 'Finanças',
      team: 'Farmacêuticos',
      config: 'Ajustes'
    },
    sampleCategories: ['Medicamentos de Referência', 'Genéricos (Lei 9.787)', 'Similares', 'Dermocosméticos', 'Vitaminas & Imunidade', 'Primeiros Socorros & Curativos'],
    bannerHighlight: 'Balcão de Atendimento Farmacêutico & Dispensação'
  },
  {
    id: 'restaurante',
    name: 'Restaurante, Bar & Lanchonete',
    shortName: 'Restaurante',
    subtitle: 'Gastronomia, Mesas & Delivery',
    description: 'Gestão de mesas, comandas rápidas, balcão, pedidos de delivery, cardápio de pratos, porções e bebidas.',
    icon: UtensilsCrossed,
    badgeText: 'Mesas & Pedidos',
    badgeColor: 'bg-amber-500/15 text-amber-700 border-amber-300',
    themePrimary: '#ea580c',
    themeSidebar: '#431407',
    themeBg: '#fff7ed',
    themeBottomTab: '#431407',
    accentGradient: 'from-orange-600 to-amber-700',
    heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    defaultTab: 'vendas',
    enabledFeatures: {
      osTab: false,
      customersTab: true,
      stockTab: true,
      salesTab: true,
      fiscalTab: true,
      financeTab: true,
      toolsTab: false,
      profiles: true,
      xmlExportImport: true,
      hideFinancialReports: false,
      businessSegment: 'restaurante'
    },
    navLabels: {
      vendas: 'Mesas & Pedidos',
      clientes: 'Clientes & Delivery',
      estoque: 'Cardápio & Insumos',
      fiscal: 'Fiscal (NFC-e)',
      financeiro: 'Finanças',
      team: 'Atendimento & Garçons',
      config: 'Ajustes'
    },
    sampleCategories: ['Pratos Principais', 'Lanches & Hambúrgueres', 'Porções & Entradas', 'Bebidas & Sucos', 'Cervejas & Drinks', 'Sobremesas'],
    bannerHighlight: 'Controle de Pedidos, Mesas & Balcão'
  },
  {
    id: 'academia',
    name: 'Academia & Studio Fitness',
    shortName: 'Academia',
    subtitle: 'Musculação, Crossfit & Lutas',
    description: 'Cadastro completo de alunos, controle de mensalidades recorrentes, matrículas, planos e venda de suplementos.',
    icon: Dumbbell,
    badgeText: 'Alunos & Matrículas',
    badgeColor: 'bg-purple-500/15 text-purple-700 border-purple-300',
    themePrimary: '#7c3aed',
    themeSidebar: '#2e1065',
    themeBg: '#faf5ff',
    themeBottomTab: '#2e1065',
    accentGradient: 'from-purple-600 to-indigo-700',
    heroImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    defaultTab: 'clientes',
    enabledFeatures: {
      osTab: false,
      customersTab: true,
      stockTab: true,
      salesTab: true,
      fiscalTab: true,
      financeTab: true,
      toolsTab: false,
      profiles: true,
      xmlExportImport: true,
      hideFinancialReports: false,
      businessSegment: 'academia'
    },
    navLabels: {
      clientes: 'Alunos & Matrículas',
      vendas: 'Planos & Caixa',
      estoque: 'Suplementos & Artigos',
      fiscal: 'Fiscal',
      financeiro: 'Mensalidades',
      team: 'Instrutores & Recepção',
      config: 'Ajustes'
    },
    sampleCategories: ['Planos & Mensalidades', 'Suplementos & Proteínas', 'Acessórios Esportivos', 'Vestuário Fitness', 'Bebidas Energéticas'],
    bannerHighlight: 'Gestão de Alunos, Mensalidades & Matrículas'
  },
  {
    id: 'vendas_online',
    name: 'Vendas Online & E-commerce',
    shortName: 'Vendas Online',
    subtitle: 'Loja Virtual & Redes Sociais',
    description: 'Catálogo online, pedidos pelo WhatsApp, controle de fretes e despachos, fotos em alta qualidade e compradores.',
    icon: Globe,
    badgeText: 'Catálogo & Pedidos',
    badgeColor: 'bg-indigo-500/15 text-indigo-700 border-indigo-300',
    themePrimary: '#4f46e5',
    themeSidebar: '#1e1b4b',
    themeBg: '#eef2ff',
    themeBottomTab: '#1e1b4b',
    accentGradient: 'from-indigo-600 to-blue-700',
    heroImage: 'https://images.unsplash.com/photo-1556742049-0a67e557224e?auto=format&fit=crop&w=1200&q=80',
    defaultTab: 'vendas',
    enabledFeatures: {
      osTab: false,
      customersTab: true,
      stockTab: true,
      salesTab: true,
      fiscalTab: true,
      financeTab: true,
      toolsTab: false,
      profiles: true,
      xmlExportImport: true,
      hideFinancialReports: false,
      businessSegment: 'vendas_online'
    },
    navLabels: {
      vendas: 'Pedidos & Envios',
      clientes: 'Compradores Online',
      estoque: 'Catálogo & Estoque',
      fiscal: 'Notas Fiscais (NF-e)',
      financeiro: 'Faturamento & Fretes',
      team: 'Equipe de Despacho',
      config: 'Ajustes'
    },
    sampleCategories: ['Mais Vendidos', 'Lançamentos', 'Acessórios', 'Moda & Calçados', 'Eletrônicos & Gadgets', 'Promoções da Semana'],
    bannerHighlight: 'Gestão de Pedidos na Internet & Despachos'
  }
];

export function getSegmentConfig(segment?: BusinessSegment): StoreSegmentConfig {
  const found = STORE_SEGMENTS.find(s => s.id === segment);
  return found || STORE_SEGMENTS[0]; // Retorna Assistência Técnica como fallback
}

export function applySegmentDefaultsToSettings(
  currentSettings: AppSettings, 
  segment: BusinessSegment
): AppSettings {
  const config = getSegmentConfig(segment);
  return {
    ...currentSettings,
    businessSegment: segment,
    themePrimary: config.themePrimary,
    themeSidebar: config.themeSidebar,
    themeBg: config.themeBg,
    themeBottomTab: config.themeBottomTab
  };
}
