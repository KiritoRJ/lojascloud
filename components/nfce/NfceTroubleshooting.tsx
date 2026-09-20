import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Search, HelpCircle, ShieldAlert, Cpu, Wrench, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';
import { NfceNfeConfig, Product } from '../../types';

interface Props {
  config: NfceNfeConfig;
  products?: Product[];
}

interface SefazErrorItem {
  code: string;
  title: string;
  category: 'schema' | 'certificate' | 'csc' | 'ncm_cfop' | 'destinatario' | 'tempo' | 'duplicidade';
  causes: string[];
  solution: string[];
  preventiveTip: string;
}

const SEFAZ_KNOWLEDGE_BASE: SefazErrorItem[] = [
  {
    code: 'Rejeição 462 / 463',
    title: 'Código CSC Não Cadastrado / IdToken Incorreto na SEFAZ',
    category: 'csc',
    causes: [
      'O Código de Segurança do Contribuinte (CSC) informado não existe na base da SEFAZ estadual.',
      'O IdToken informado (ex: 000001) não corresponde ao código CSC digitado.',
      'Você está emitindo em ambiente de Produção usando o CSC do ambiente de Homologação (ou vice-versa).'
    ],
    solution: [
      'Acesse o portal da SEFAZ da sua UF no menu "NFC-e > CSC / Token".',
      'Verifique se o IdToken (identificador de 6 dígitos) e o código alfanumérico coincidem exatamente.',
      'Copie e cole os dados na aba "Configurações" deste módulo.'
    ],
    preventiveTip: 'Lembre-se que cada ambiente (Homologação e Produção) possui seus próprios códigos CSC independentes.'
  },
  {
    code: 'Rejeição 778',
    title: 'Informado NCM Inexistente ou Revogado pela Receita',
    category: 'ncm_cfop',
    causes: [
      'O produto na venda possui um código NCM com menos de 8 dígitos ou caracteres inválidos.',
      'O código NCM informado foi revogado ou extinto na última tabela da Receita Federal / Mercosul.'
    ],
    solution: [
      'Verifique o cadastro do produto no menu Estoque e confira se o NCM possui 8 dígitos (ex: 8517.13.00 para celulares, 8517.79.00 para peças).',
      'Consulte a Tabela de NCMs recomendados no Guia Fiscal deste módulo.'
    ],
    preventiveTip: 'Evite usar códigos genéricos como "00000000" ou NCM com 6 dígitos, pois a SEFAZ bloqueia a autorização.'
  },
  {
    code: 'Rejeição 280 / 281',
    title: 'Certificado Digital Transmissor Inválido ou Revogado',
    category: 'certificate',
    causes: [
      'O arquivo do Certificado A1 (.pfx/.p12) expirou.',
      'A senha do certificado digital foi digitada incorretamente.',
      'O CNPJ do certificado digital difere do CNPJ configurado como emitente da nota.'
    ],
    solution: [
      'Verifique a data de validade do seu Certificado A1 na aba de Configurações.',
      'Faça um novo upload do arquivo .pfx com a senha correta fornecida pela sua Autoridade Certificadora (Certisign, Serasa, Soluti, etc.).'
    ],
    preventiveTip: 'Renove seu certificado A1 15 dias antes da data de expiração para não paralisar o caixa.'
  },
  {
    code: 'Rejeição 215',
    title: 'Falha de Schema XML (Estrutura Fora do Padrão Nacional)',
    category: 'schema',
    causes: [
      'Caracteres especiais proibidos no nome do produto ou endereço (ex: <, >, &, aspas não escapadas).',
      'Campos obrigatórios em branco, como Unidade Comercial (UN, PC) ou Quantidade zerada.',
      'Inscrição Estadual com formatação ou tamanho diferente do exigido pela UF.'
    ],
    solution: [
      'Remova caracteres especiais não alfa-numéricos das descrições.',
      'Certifique-se de que a Inscrição Estadual (IE) contém apenas números e pertence ao mesmo estado selecionado.'
    ],
    preventiveTip: 'Utilize os validadores automáticos antes de submeter o lote de notas.'
  },
  {
    code: 'Rejeição 539',
    title: 'Duplicidade de NF-e / NFC-e com Diferença na Chave',
    category: 'duplicidade',
    causes: [
      'Foi transmitida uma nota fiscal com um Número e Série que já foram autorizados anteriormente para outra venda.',
      'Houve oscilação de rede durante a transmissão anterior que registrou o número na SEFAZ sem retorno local.'
    ],
    solution: [
      'Acesse a aba "Configurações" e incremente o campo "Próximo Número de NFC-e" em +1.',
      'Consulte no portal da SEFAZ se a nota anterior foi autorizada ou rejeitada antes de reemitir.'
    ],
    preventiveTip: 'Nunca retroceda a numeração fiscal sequencial da loja.'
  },
  {
    code: 'Rejeição 703',
    title: 'Data-Hora de Emissão Atrasada ou no Futuro',
    category: 'tempo',
    causes: [
      'O relógio do seu computador/celular está dessincronizado com o Horário Oficial de Brasília.',
      'Fuso horário incorreto configurado no aparelho (ex: UTC-02 ou UTC-04).'
    ],
    solution: [
      'Ajuste o relógio do seu sistema operacional para "Definir horário automaticamente" sincronizado com o servidor NTP.br (pool.ntp.br).'
    ],
    preventiveTip: 'Mantenha o horário do dispositivo sincronizado automaticamente pela internet.'
  },
  {
    code: 'Rejeição 805',
    title: 'Venda de Alto Valor Exige Identificação do Consumidor (CPF/CNPJ)',
    category: 'destinatario',
    causes: [
      'A venda total ultrapassou o limite legal do seu estado para emissão sem identificação (geralmente acima de R$ 10.000, ou R$ 2.000 em alguns estados).',
      'A SEFAZ exige obrigatoriamente informar o CPF do cliente em compras de grande valor no balcão.'
    ],
    solution: [
      'Insira o CPF ou CNPJ do cliente no campo Destinatário antes de transmitir a nota.'
    ],
    preventiveTip: 'Para vendas com valores expressivos (ex: iPhones ou MacBooks), sempre solicite o CPF do cliente na hora da venda.'
  }
];

export const NfceTroubleshooting: React.FC<Props> = ({ config, products = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Scanner Pré-Voo Automático
  const preFlightResults = useMemo(() => {
    const issues: { type: 'error' | 'warning' | 'success'; message: string; action?: string }[] = [];

    // Checagem de CNPJ
    const cleanCnpj = config.cnpj.replace(/\D/g, '');
    if (!cleanCnpj || cleanCnpj.length !== 14) {
      issues.push({
        type: 'error',
        message: 'CNPJ do emitente não preenchido ou com tamanho diferente de 14 dígitos.',
        action: 'Preencha o CNPJ na aba Configurações'
      });
    } else {
      issues.push({ type: 'success', message: `CNPJ Emitente configurado (${config.cnpj}).` });
    }

    // Checagem de IE
    if (!config.ie || config.ie.trim() === '') {
      issues.push({
        type: 'error',
        message: 'Inscrição Estadual (IE) não informada. Obrigatória para NFC-e e NF-e de mercadorias.',
        action: 'Adicione a Inscrição Estadual fornecida pela SEFAZ'
      });
    }

    // Checagem de CSC / Token
    if (!config.cscCode || !config.cscId) {
      issues.push({
        type: 'warning',
        message: 'Código CSC e IdToken não preenchidos. Sem eles, o QR Code da NFC-e será rejeitado pela SEFAZ.',
        action: 'Gere o CSC no portal da SEFAZ e insira na aba Configurações'
      });
    } else {
      issues.push({ type: 'success', message: `Código CSC e IdToken (${config.cscId}) configurados.` });
    }

    // Checagem do Certificado A1
    if (!config.certificateA1?.hasCertificate) {
      issues.push({
        type: 'warning',
        message: 'Certificado Digital A1 não carregado. Necessário para assinar digitalmente as notas.',
        action: 'Faça upload do seu arquivo .pfx / .p12'
      });
    } else if (config.certificateA1.isExpired) {
      issues.push({
        type: 'error',
        message: 'Seu Certificado Digital A1 está expirado. A SEFAZ rejeitará todas as transmissões.',
        action: 'Carregue um novo Certificado A1 válido'
      });
    } else {
      issues.push({
        type: 'success',
        message: `Certificado A1 válido (${config.certificateA1.daysRemaining ?? 365} dias restantes).`
      });
    }

    // Checagem de produtos sem NCM
    const productsWithoutNcm = products.filter(p => !p.ncm || p.ncm.replace(/\D/g, '').length !== 8);
    if (productsWithoutNcm.length > 0) {
      issues.push({
        type: 'warning',
        message: `Existem ${productsWithoutNcm.length} produto(s) no estoque com NCM ausente ou diferente de 8 dígitos.`,
        action: 'Corrija os NCMs no Estoque para evitar Rejeição 778'
      });
    } else if (products.length > 0) {
      issues.push({
        type: 'success',
        message: 'Todos os produtos do estoque possuem NCM no padrão oficial.'
      });
    }

    return issues;
  }, [config, products]);

  const filteredErrors = useMemo(() => {
    return SEFAZ_KNOWLEDGE_BASE.filter(item => {
      const matchSearch = item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.causes.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.solution.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* SCANNER PRÉ-VOO AUTOMÁTICO */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Cpu size={22} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                Diagnóstico Pré-Voo SEFAZ (Validador Automático)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Verificação em tempo real de conformidade dos parâmetros da sua loja
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            {config.environment === 'producao' ? '🟢 Ambiente Produção' : '🟡 Ambiente Homologação (Testes)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {preFlightResults.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                item.type === 'error'
                  ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                  : item.type === 'warning'
                  ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                  : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
              }`}
            >
              {item.type === 'error' && <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />}
              {item.type === 'warning' && <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />}
              {item.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />}

              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight">{item.message}</p>
                {item.action && (
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ArrowRight size={12} /> {item.action}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BASE DE CONHECIMENTO DE REJEIÇÕES SEFAZ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench size={18} className="text-blue-600" />
            Central de Resolução de Rejeições SEFAZ
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Pesquise o código de erro retornado pela SEFAZ estadual para ver a solução passo a passo
          </p>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Digite o código da rejeição (ex: 462, 778, 280, Schema, CSC)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="all">Todas as Categorias</option>
            <option value="csc">CSC / Token</option>
            <option value="ncm_cfop">NCM / CFOP</option>
            <option value="certificate">Certificado Digital</option>
            <option value="schema">Schema XML</option>
            <option value="destinatario">Destinatário / CPF</option>
            <option value="duplicidade">Duplicidade</option>
            <option value="tempo">Data e Fuso Horário</option>
          </select>
        </div>

        {/* Lista de Erros e Soluções */}
        <div className="space-y-4 pt-2">
          {filteredErrors.map((error, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-mono font-black text-xs rounded-lg">
                  {error.code}
                </span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Categoria: {error.category}
                </span>
              </div>

              <h4 className="font-black text-xs uppercase text-slate-900 tracking-tight">
                {error.title}
              </h4>

              <div className="space-y-1.5 text-xs text-slate-600">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Motivos Prováveis:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
                  {error.causes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200/60 text-xs space-y-1">
                <p className="font-black text-emerald-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Solução Recomendada:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium text-[11px]">
                  {error.solution.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>

              <p className="text-[10px] text-slate-400 font-medium italic">
                💡 Dica Preventiva: {error.preventiveTip}
              </p>
            </div>
          ))}

          {filteredErrors.length === 0 && (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <HelpCircle size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold">Nenhum erro encontrado com este termo.</p>
              <p className="text-[11px]">Tente buscar por termos como "CSC", "NCM", "Certificado" ou "Schema".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NfceTroubleshooting;
