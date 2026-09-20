import React, { useState } from 'react';
import { Printer, Download, MessageCircle, XCircle, Trash2, ShieldCheck, FileText, CheckCircle2, AlertTriangle, QrCode } from 'lucide-react';
import { NfceNfeItem, NfceNfeConfig, AppSettings } from '../../types';

interface Props {
  item?: NfceNfeItem;
  note?: NfceNfeItem; // alias for item
  config?: NfceNfeConfig;
  settings?: AppSettings;
  onClose: () => void;
  onDelete?: (id: string, number?: string, docType?: string) => void;
  onDownloadXml?: (item: NfceNfeItem) => void;
  onShareWhatsapp?: (item: NfceNfeItem) => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const NfceDanfeModal: React.FC<Props> = ({
  item: propItem,
  note: propNote,
  config: propConfig,
  settings,
  onClose,
  onDelete,
  onDownloadXml,
  onShareWhatsapp,
  onShowToast
}) => {
  const item = propItem || propNote;
  const config = propConfig || settings?.nfceNfeConfig || {
    environment: 'homologacao',
    provider: 'sefaz_direta',
    apiKey: '',
    companyName: settings?.storeName || 'Empresa Teste',
    cnpj: settings?.storeCnpj || '00.000.000/0001-99',
    ie: 'ISENTO',
    cityIbgeCode: '3550308',
    cityName: 'São Paulo',
    uf: 'SP',
    cnae: '4752-1/00',
    taxRegime: 'simples_nacional',
    csosnDefault: '102',
    cfopDefault: '5102',
    ncmDefault: '8517.79.00',
    icmsDefaultRate: 0,
    nfceSeries: '1',
    nfceNextNumber: 101,
    nfeSeries: '1',
    nfeNextNumber: 101,
    cscId: '000001',
    cscCode: '0123456789'
  };

  const [printFormat, setPrintFormat] = useState<'cupom' | 'a4'>('cupom');

  if (!item) return null;

  const totalAmount = Number(item.totals?.totalAmount ?? (item as any).total ?? 0);
  const discountAmount = Number(item.totals?.discountAmount ?? 0);
  const approximateTaxAmount = Number(item.totals?.approximateTaxAmount ?? 0);
  const paymentAmount = Number(item.payment?.amount ?? totalAmount);
  const paymentChange = Number(item.payment?.change ?? 0);
  const paymentMethod = item.payment?.method || 'Dinheiro';
  const itemsList = item.items || [];

  // Formata chave de acesso em grupos de 4 dígitos
  const formattedKey = (item.accessKey || '').replace(/(\d{4})/g, '$1 ').trim();

  // Gera URL do QR Code da SEFAZ para consulta pública
  const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    item.qrCodeUrl ||
      `https://www.sefaz.${config.uf?.toLowerCase() || 'sp'}.gov.br/nfce/qrcode?p=${item.accessKey}|2|${config.environment === 'producao' ? '1' : '2'}|${config.cscId || '1'}|${totalAmount.toFixed(2)}`
  )}`;

  const handleDownloadXml = () => {
    if (onDownloadXml) {
      onDownloadXml(item);
      return;
    }
    const xml = item.xmlContent || `<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><infNFe Id="NFe${item.accessKey}"><ide><nNF>${item.number}</nNF></ide></infNFe></nfeProc>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFCe_${item.number}_${item.accessKey}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsapp = () => {
    if (onShareWhatsapp) {
      onShareWhatsapp(item);
      return;
    }
    const phone = item.customer?.phone || prompt('Digite o WhatsApp do cliente com DDD (ex: 11999998888):');
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const text = `*COMPROVANTE FISCAL NFC-e*\n\n` +
        `✅ *Nota Fiscal Emitida com Sucesso!*\n` +
        `📄 *NFC-e Nº:* ${item.number} (Série ${item.series})\n` +
        `💰 *Valor Total:* R$ ${totalAmount.toFixed(2)}\n` +
        `🔑 *Chave de Acesso:*\n${item.accessKey}\n\n` +
        `Agradecemos pela preferência!`;
      window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[94vh] overflow-y-auto">
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
              item.docType === 'nfce' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {item.docType === 'nfce' ? '65' : '55'}
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">
                {item.docType === 'nfce' ? 'DANFE NFC-e (Cupom de Venda)' : 'DANFE NF-e (Modelo 55)'} • Nº {item.number}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                Série {item.series} • {item.environment === 'producao' ? 'Produção' : 'Homologação'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {item.docType === 'nfce' && (
              <div className="hidden sm:flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-black uppercase">
                <button
                  type="button"
                  onClick={() => setPrintFormat('cupom')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${printFormat === 'cupom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                >
                  Cupom 80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('a4')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${printFormat === 'a4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                >
                  A4
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Imprimir DANFE"
            >
              <Printer size={13} /> Imprimir
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(item.id, item.number, item.docType);
              }}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              title="Apagar este registro"
            >
              <Trash2 size={13} /> Apagar
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* STATUS / MARCA D'ÁGUA SE ESTIVER CANCELADA OU REJEITADA */}
        {item.status === 'canceled' && (
          <div className="p-3.5 bg-rose-600 text-white rounded-2xl flex items-center justify-between text-xs font-black uppercase tracking-wider shadow-md shadow-rose-600/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>NOTA FISCAL CANCELADA NA SEFAZ</span>
            </div>
            <span className="text-[10px] opacity-90">
              Protocolo: {item.cancelProtocol || '135240009988221'}
            </span>
          </div>
        )}

        {item.status === 'rejected' && (
          <div className="p-3.5 bg-amber-600 text-white rounded-2xl flex items-center justify-between text-xs font-black uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>TRANSMISSÃO REJEITADA PELA SEFAZ</span>
            </div>
            <span className="text-[10px]">{item.errorMessage || 'Erro nos dados'}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CORPO DO DANFE IMPRIMÍVEL                                                */}
        {/* ========================================================================= */}
        <div id="danfe-printable-area" className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 text-slate-900 font-mono text-xs space-y-4 shadow-xs relative">
          {/* MARCA D'ÁGUA DIAGONAL SE CANCELADA */}
          {item.status === 'canceled' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
              <span className="text-4xl sm:text-6xl font-black text-rose-500/20 -rotate-24 uppercase border-4 sm:border-8 border-rose-500/20 p-4 rounded-3xl">
                CANCELADA
              </span>
            </div>
          )}

          {/* CABEÇALHO DA EMPRESA */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h4 className="font-black text-sm uppercase text-slate-900 tracking-tight font-sans">
              {config.companyName || 'LOJA DE ELETRÔNICOS E ASSISTÊNCIA TÉCNICA'}
            </h4>
            {config.tradeName && <p className="text-[11px] text-slate-600 font-bold">{config.tradeName}</p>}
            <p className="text-[10px] text-slate-600">
              CNPJ: {config.cnpj} • IE: {config.ie || 'ISENTO'}
            </p>
            <p className="text-[10px] text-slate-500">
              {config.cityName} / {config.uf}
            </p>
          </div>

          {/* TÍTULO DO DOCUMENTO */}
          <div className="text-center py-1 bg-slate-100 rounded-lg">
            <p className="font-black text-[11px] uppercase tracking-wider text-slate-800 font-sans">
              {item.docType === 'nfce'
                ? 'DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica'
                : 'DANFE NF-e - Documento Auxiliar da Nota Fiscal Eletrônica (Mod. 55)'}
            </p>
            <p className="text-[9px] text-slate-500">Não permite aproveitamento de crédito de ICMS</p>
          </div>

          {/* TABELA DE ITENS */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase border-b border-slate-200 pb-1">
              <span className="w-1/2">Item / Descrição / NCM</span>
              <span className="w-16 text-right">Qtd x V.Unit</span>
              <span className="w-20 text-right">Total (R$)</span>
            </div>

            <div className="divide-y divide-slate-100 space-y-1 text-[11px]">
              {itemsList.map((prod, idx) => (
                <div key={idx} className="pt-1 flex justify-between items-start">
                  <div className="w-1/2 pr-2">
                    <p className="font-bold text-slate-800 leading-tight">
                      {idx + 1}. {prod.name}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      NCM: {prod.ncm} • CFOP: {prod.cfop} • UN: {prod.unit}
                    </p>
                  </div>
                  <div className="w-16 text-right text-slate-600">
                    {prod.quantity} x {(prod.unitPrice || 0).toFixed(2)}
                  </div>
                  <div className="w-20 text-right font-black text-slate-900">
                    {(prod.totalPrice ?? ((prod.quantity || 1) * (prod.unitPrice || 0))).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAIS E PAGAMENTO */}
          <div className="pt-2 border-t border-dashed border-slate-300 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Qtd. Total de Itens:</span>
              <span className="font-bold">{itemsList.reduce((acc, i) => acc + (i.quantity || 0), 0)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Desconto Total:</span>
                <span className="font-bold">- R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>VALOR TOTAL A PAGAR:</span>
              <span className="text-blue-700">R$ {totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[11px] pt-1 text-slate-600">
              <span className="uppercase">Forma de Pagamento ({paymentMethod}):</span>
              <span className="font-bold">R$ {paymentAmount.toFixed(2)}</span>
            </div>
            {paymentChange > 0 && (
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Troco:</span>
                <span>R$ {paymentChange.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* TRIBUTOS APROXIMADOS (LEI 12.741/2012) */}
          <div className="p-2.5 bg-slate-50 rounded-xl text-[9px] text-slate-500 space-y-0.5">
            <p>
              Tributos Totais Incidentes (Lei Federal 12.741/2012 - IBPT): R${' '}
              {approximateTaxAmount.toFixed(2)} (
              {(((approximateTaxAmount / (totalAmount || 1))) * 100).toFixed(1)}%)
            </p>
            <p>Regime Tributário: {config.taxRegime === 'simples_nacional' ? 'Simples Nacional' : config.taxRegime}</p>
          </div>

          {/* DADOS DO CONSUMIDOR */}
          <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[10px]">
            <p className="font-bold uppercase text-slate-700">Consumidor:</p>
            {item.customer?.document ? (
              <p>
                CPF/CNPJ: {item.customer.document} {item.customer.name ? `• ${item.customer.name}` : ''}
              </p>
            ) : (
              <p className="text-slate-400">CONSUMIDOR NÃO IDENTIFICADO</p>
            )}
          </div>

          {/* NÚMERO, SÉRIE, PROTOCOLO E CHAVE DE ACESSO */}
          <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1 text-[10px] text-slate-600">
            <p className="font-black text-slate-800">
              Nº: {item.number} • Série: {item.series} • Emissão: {new Date(item.issuedAt).toLocaleString('pt-BR')}
            </p>
            <p>
              Protocolo de Autorização SEFAZ: <strong className="font-mono text-slate-900">{item.protocol || '135240098765432'}</strong>
            </p>

            <div className="pt-2 space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Chave de Acesso:</p>
              <p className="font-mono text-[10px] font-bold text-slate-900 break-all tracking-wider bg-slate-50 p-2 rounded-lg border border-slate-200">
                {formattedKey || '35240900000000000000650010000000011000000010'}
              </p>
            </div>
          </div>

          {/* QR CODE OFICIAL SEFAZ */}
          {item.docType === 'nfce' && (
            <div className="pt-3 border-t border-dashed border-slate-300 flex flex-col items-center justify-center space-y-2 text-center">
              <p className="text-[10px] font-bold text-slate-700 uppercase">
                Consulte pela Chave de Acesso ou QR Code em:
              </p>
              <p className="text-[9px] text-blue-600 font-bold">
                http://www.sefaz.{config.uf.toLowerCase()}.gov.br/nfce/consulta
              </p>
              <div className="w-28 h-28 bg-white p-1 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Consulta NFC-e SEFAZ"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[8px] text-slate-400">QR Code Oficial Conforme Padrão Técnico NFC-e</p>
            </div>
          )}
        </div>

        {/* AÇÕES NO RODAPÉ DO MODAL */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadXml}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Baixar XML Fiscal (.xml)
            </button>
            <button
              type="button"
              onClick={handleShareWhatsapp}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
export default NfceDanfeModal;
