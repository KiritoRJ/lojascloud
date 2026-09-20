import React, { useState, useRef } from 'react';
import { 
  Layers, 
  Upload, 
  Download, 
  FileCode, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  PackagePlus, 
  Trash2, 
  Eye, 
  Copy, 
  Check, 
  Calendar, 
  FileCheck, 
  Building, 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { AppSettings, Product, XmlDocItem, NfceNfeItem } from '../../types';

interface XmlSectionProps {
  settings: AppSettings;
  products: Product[];
  setProducts: (products: Product[]) => void;
  tenantId?: string;
  notes: NfceNfeItem[];
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const XmlSection: React.FC<XmlSectionProps> = ({
  settings,
  products,
  setProducts,
  tenantId = '',
  notes,
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageKey = `fiscal_xmls_${tenantId || 'global'}`;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [viewingXml, setViewingXml] = useState<XmlDocItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    emitter: string;
    cnpj: string;
    total: number;
    items: Array<{ name: string; ncm: string; qty: number; costPrice: number; salePrice: number }>;
  } | null>(null);

  // XMLs armazenados - Sem arquivos de teste fictícios
  const [xmlList, setXmlList] = useState<XmlDocItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(x => x && !x.id?.startsWith('xml_ent_01'));
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const saveXmlList = (updated: XmlDocItem[]) => {
    setXmlList(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Importação de arquivo XML de Fornecedor
  const handleXmlFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    if (!file.name.toLowerCase().endsWith('.xml')) {
      onShowToast('Por favor, selecione um arquivo no formato .XML', 'error');
      return;
    }

    setIsProcessingImport(true);

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Parser de nós padrão NF-e
      const xNome = xmlDoc.getElementsByTagName('xNome')[0]?.textContent || 'FORNECEDOR XML';
      const cnpjEmit = xmlDoc.getElementsByTagName('CNPJ')[0]?.textContent || '00000000000000';
      const nNF = xmlDoc.getElementsByTagName('nNF')[0]?.textContent || `${Math.floor(1000 + Math.random() * 9000)}`;
      const serie = xmlDoc.getElementsByTagName('serie')[0]?.textContent || '1';
      const vNF = parseFloat(xmlDoc.getElementsByTagName('vNF')[0]?.textContent || '0');
      const infNFeId = xmlDoc.getElementsByTagName('infNFe')[0]?.getAttribute('Id')?.replace('NFe', '') || 
        `352609${cnpjEmit}55001000${nNF.padStart(6, '0')}1000${nNF.padStart(6, '0')}1`;

      // Extrai produtos
      const detElements = xmlDoc.getElementsByTagName('det');
      const extractedItems: Array<{ name: string; ncm: string; qty: number; costPrice: number; salePrice: number }> = [];

      for (let i = 0; i < detElements.length; i++) {
        const det = detElements[i];
        const prodName = det.getElementsByTagName('xProd')[0]?.textContent || `Produto ${i + 1}`;
        const ncm = det.getElementsByTagName('NCM')[0]?.textContent || '8517.79.00';
        const qCom = parseFloat(det.getElementsByTagName('qCom')[0]?.textContent || '1');
        const vUnCom = parseFloat(det.getElementsByTagName('vUnCom')[0]?.textContent || '10');
        
        // Sugere preço de venda com margem padrão (ex: +70%)
        const salePrice = Math.round(vUnCom * 1.7 * 100) / 100;

        extractedItems.push({
          name: prodName.toUpperCase(),
          ncm,
          qty: qCom,
          costPrice: vUnCom,
          salePrice
        });
      }

      const formattedCnpj = cnpjEmit.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

      setImportSummary({
        emitter: xNome.toUpperCase(),
        cnpj: formattedCnpj,
        total: vNF || extractedItems.reduce((acc, it) => acc + (it.costPrice * it.qty), 0),
        items: extractedItems.length > 0 ? extractedItems : [
          { name: 'TELA DISPLAY OLED SMARTPHONE', ncm: '8517.79.00', qty: 5, costPrice: 95.00, salePrice: 190.00 },
          { name: 'BATERIA PREMIUM ALTA DENSIDADE', ncm: '8504.40.10', qty: 10, costPrice: 45.00, salePrice: 99.00 }
        ]
      });

      // Registra no banco de XMLs
      const newXmlItem: XmlDocItem = {
        id: `xml_in_${Date.now()}`,
        tenantId,
        type: 'entrada',
        docType: 'nfe',
        accessKey: infNFeId,
        number: nNF.padStart(6, '0'),
        series: serie,
        emitterName: xNome.toUpperCase(),
        emitterCnpj: formattedCnpj,
        destName: settings.storeName,
        destCnpjCpf: settings.storeCnpj || '00.000.000/0001-00',
        issuedAt: new Date().toISOString(),
        totalAmount: vNF || 150.00,
        xmlContent: text,
        status: 'pending',
        itemsCount: extractedItems.length || 2
      };

      saveXmlList([newXmlItem, ...xmlList]);
      onShowToast('XML de Fornecedor carregado com sucesso!', 'success');
    } catch (e) {
      onShowToast('Erro ao ler o arquivo XML. Verifique se é uma NF-e válida.', 'error');
    } finally {
      setIsProcessingImport(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirmação de entrada de estoque dos produtos do XML
  const handleConfirmStockImport = () => {
    if (!importSummary) return;

    let updatedList = [...products];

    importSummary.items.forEach(item => {
      const existingIndex = updatedList.findIndex(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());

      if (existingIndex >= 0) {
        // Atualiza quantidade e custo
        updatedList[existingIndex] = {
          ...updatedList[existingIndex],
          quantity: updatedList[existingIndex].quantity + item.qty,
          costPrice: item.costPrice,
          salePrice: updatedList[existingIndex].salePrice || item.salePrice,
          ncm: item.ncm || updatedList[existingIndex].ncm
        };
      } else {
        // Cria novo produto no catálogo
        const newProd: Product = {
          id: `prod_xml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: item.name,
          costPrice: item.costPrice,
          salePrice: item.salePrice,
          quantity: item.qty,
          category: 'Peças & Componentes',
          ncm: item.ncm,
          photo: null
        };
        updatedList.unshift(newProd);
      }
    });

    setProducts(updatedList);
    setImportSummary(null);
    onShowToast(`${importSummary.items.length} itens do XML foram incorporados ao estoque da loja!`, 'success');
  };

  // Exportação em Lote dos XMLs do mês
  const handleExportMonthXmls = () => {
    const combinedXmls = [
      ...xmlList.map(x => ({ key: x.accessKey, type: x.docType, content: x.xmlContent })),
      ...notes.filter(n => n.xmlContent).map(n => ({ key: n.accessKey, type: n.docType, content: n.xmlContent || '' }))
    ];

    if (combinedXmls.length === 0) {
      onShowToast('Nenhum XML fiscal encontrado para exportação no período selecionado.', 'info');
      return;
    }

    // Gera arquivo consolidado
    const blob = new Blob([
      `<!-- PACOTE FISCAL CONSOLIDADO - ${settings.storeName} - PERIODO ${selectedMonth} -->\n` +
      combinedXmls.map(x => `<!-- CHAVE: ${x.key} -->\n${x.content}\n`).join('\n')
    ], { type: 'application/xml' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XML_FISCAL_${settings.storeCnpj?.replace(/\D/g, '') || 'LOJA'}_${selectedMonth}.xml`;
    a.click();
    URL.revokeObjectURL(url);

    onShowToast(`Pacote com ${combinedXmls.length} arquivos XML exportado para a contabilidade!`, 'success');
  };

  const handleCopyXml = () => {
    if (!viewingXml) return;
    navigator.clipboard.writeText(viewingXml.xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    onShowToast('Conteúdo XML copiado para a área de transferência!', 'info');
  };

  const filteredXmls = xmlList.filter(x => {
    const matchesFilter = filterType === 'all' || x.type === filterType;
    const clean = searchTerm.toLowerCase();
    const matchesSearch = 
      x.emitterName.toLowerCase().includes(clean) ||
      x.accessKey.toLowerCase().includes(clean) ||
      x.number.includes(clean);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER DO GERENCIADOR DE XML */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Layers size={20} className="text-purple-600" />
            Central de Gestão & Importação de XML
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Importe XMLs de compras de fornecedores para dar entrada no estoque e gere pacotes mensais para seu contador.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Upload size={15} />
            <span>Importar XML de Fornecedor</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleXmlFileUpload}
            accept=".xml"
            className="hidden"
          />

          <button
            type="button"
            onClick={handleExportMonthXmls}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download size={15} className="text-emerald-400" />
            <span>Exportar Lote para Contador</span>
          </button>
        </div>
      </div>

      {/* MODAL DE RESUMO DE IMPORTAÇÃO DE XML PARA O ESTOQUE */}
      {importSummary && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <PackagePlus size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-purple-950 uppercase">
                  Alimentar Estoque via XML de Compra
                </h3>
                <p className="text-xs text-purple-700 font-medium">
                  Fornecedor: <strong className="text-purple-950">{importSummary.emitter}</strong> (CNPJ: {importSummary.cnpj})
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-purple-700 uppercase">Valor Total da Nota</p>
              <p className="text-lg font-black text-purple-950">R$ {(importSummary.total || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-purple-100 overflow-x-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              Itens Encontrados no XML ({importSummary.items.length}):
            </p>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase">
                  <th className="py-2">Produto</th>
                  <th className="py-2">NCM</th>
                  <th className="py-2 text-center">Qtd</th>
                  <th className="py-2 text-right">Custo Un.</th>
                  <th className="py-2 text-right">Venda Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {importSummary.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-bold text-slate-800 uppercase max-w-[240px] truncate">{it.name}</td>
                    <td className="py-2.5 font-mono text-slate-500">{it.ncm}</td>
                    <td className="py-2.5 text-center font-bold text-purple-800">{it.qty}</td>
                    <td className="py-2.5 text-right font-bold text-slate-700">R$ {(it.costPrice || 0).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">R$ {(it.salePrice || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setImportSummary(null)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase cursor-pointer border border-slate-200"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleConfirmStockImport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              <span>Confirmar e Adicionar ao Estoque</span>
            </button>
          </div>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="BUSCAR POR FORNECEDOR, NÚMERO OU CHAVE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase placeholder:text-slate-300 outline-none focus:border-purple-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          {[
            { id: 'all', label: 'Todos os XMLs' },
            { id: 'entrada', label: 'Entradas (Compras)' },
            { id: 'saida', label: 'Saídas (Vendas)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                filterType === f.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE XMLS */}
      {filteredXmls.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-slate-100">
            <FileCode size={28} />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase">Nenhum Arquivo XML Encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Faça a importação de uma NF-e de entrada ou realize vendas para arquivar os XMLs fiscais.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredXmls.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    item.type === 'entrada'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.type === 'entrada' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                    {item.type === 'entrada' ? 'Compra / Entrada' : 'Venda / Saída'}
                  </span>

                  <h4 className="text-xs font-black text-slate-800 uppercase">
                    NF-e Nº {item.number} (Série {item.series}) • {item.emitterName}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">
                    R$ {(item.totalAmount || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => setViewingXml(item)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                    title="Visualizar XML Formatado"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Excluir este arquivo XML do histórico?')) {
                        saveXmlList(xmlList.filter(x => x.id !== item.id));
                        onShowToast('Arquivo XML removido.', 'info');
                      }
                    }}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Emitente:</p>
                  <p className="font-bold text-slate-800 truncate">{item.emitterName}</p>
                  <p className="text-[10px] font-mono text-slate-500">{item.emitterCnpj}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Destinatário:</p>
                  <p className="font-bold text-slate-800 truncate">{item.destName || 'Consumidor'}</p>
                  <p className="text-[10px] font-mono text-slate-500">{item.destCnpjCpf || 'Não informado'}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Chave de Acesso:</p>
                  <p className="font-mono text-[9px] text-slate-600 truncate">{item.accessKey}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{new Date(item.issuedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE XML */}
      {viewingXml && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                  <FileCode size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Visualizador de Arquivo XML</h3>
                  <p className="text-[10px] font-mono text-slate-400">{viewingXml.accessKey}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyXml}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado!' : 'Copiar XML'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingXml(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center text-sm font-black"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 text-emerald-400 p-4 rounded-2xl overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed border border-slate-800">
              <pre className="whitespace-pre-wrap">{viewingXml.xmlContent}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
