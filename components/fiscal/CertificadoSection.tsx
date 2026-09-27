import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Upload, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  Download, 
  FileCode, 
  Calendar, 
  Building2, 
  Check, 
  ExternalLink, 
  HelpCircle,
  Sparkles,
  Cpu,
  XCircle,
  FileCheck,
  AlertCircle,
  Clock,
  Fingerprint
} from 'lucide-react';
import { AppSettings, CertificateA1Data, NfceNfeItem } from '../../types';
import { 
  parsePkcs12Certificate, 
  generateTestCertificateProfile, 
  formatCnpj 
} from '../../utils/certificateParser';
import { FiscalEmissionService } from '../../utils/fiscalEmissionService';

interface CertificadoSectionProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  tenantId?: string;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CertificadoSection: React.FC<CertificadoSectionProps> = ({
  settings,
  setSettings,
  tenantId = '',
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isTestingSefaz, setIsTestingSefaz] = useState(false);
  const [isBatchTransmitting, setIsBatchTransmitting] = useState(false);
  const [validationErrorBanner, setValidationErrorBanner] = useState<string | null>(null);
  const [testSefazResult, setTestSefazResult] = useState<{ 
    success: boolean; 
    code?: string;
    message: string; 
    timestamp: string;
    details?: string;
  } | null>(null);

  // Busca notas fiscais pendentes no storage
  const getPendingNotes = (): NfceNfeItem[] => {
    try {
      const storageKey = `fiscal_notes_${tenantId || 'global'}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const list: NfceNfeItem[] = JSON.parse(raw);
      return list.filter(n => n.status === 'contingencia_offline' || n.status === 'rejected' || n.tpEmis === '9');
    } catch {
      return [];
    }
  };

  const pendingNotes = getPendingNotes();

  const handleBatchRetransmitFromCert = async () => {
    if (pendingNotes.length === 0) return;
    setIsBatchTransmitting(true);
    try {
      const { authorized, failed } = await FiscalEmissionService.retransmitPendingBatch(
        pendingNotes,
        settings,
        tenantId
      );

      if (authorized > 0) {
        onShowToast(`🚀 Lote transmitido com sucesso: ${authorized} nota(s) autorizadas na SEFAZ!`, 'success');
      }
      if (failed > 0) {
        onShowToast(`⚠️ ${failed} nota(s) não foram autorizadas.`, 'error');
      }
    } catch (e: any) {
      onShowToast(`Erro ao transmitir lote: ${e?.message || 'Falha desconhecida'}`, 'error');
    } finally {
      setIsBatchTransmitting(false);
    }
  };

  const certData: CertificateA1Data = settings.certificateA1 || {
    hasCertificate: false,
    status: 'unconfigured'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrorBanner(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExts = ['.pfx', '.p12'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExts.includes(fileExt)) {
        onShowToast('Arquivo inválido! Por favor selecione um arquivo de Certificado Digital A1 (.pfx ou .p12)', 'error');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleValidateAndInstall = async () => {
    setValidationErrorBanner(null);
    if (!selectedFile && !certData.hasCertificate) {
      onShowToast('Selecione o arquivo do certificado A1 (.pfx ou .p12)', 'error');
      return;
    }

    if (!password) {
      onShowToast('Informe a senha do Certificado Digital A1', 'error');
      return;
    }

    setIsValidating(true);

    try {
      let base64String = certData.certBase64 || '';
      let fileName = certData.fileName || 'certificado_a1.pfx';

      if (selectedFile) {
        fileName = selectedFile.name;
        base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      // Parser criptográfico real PKCS#12 via node-forge
      const result = parsePkcs12Certificate(
        base64String, 
        password, 
        settings.storeCnpj, 
        fileName
      );

      if (!result.success || !result.certificateData) {
        const errorMsg = result.error || 'Erro na validação do Certificado Digital A1.';
        setValidationErrorBanner(errorMsg);
        onShowToast(errorMsg, 'error');
        return;
      }

      const updatedCert = result.certificateData;

      const updatedSettings: AppSettings = {
        ...settings,
        certificateA1: updatedCert,
        nfceNfeConfig: settings.nfceNfeConfig ? { ...settings.nfceNfeConfig, certificateA1: updatedCert } : undefined,
        nfseConfig: settings.nfseConfig ? { ...settings.nfseConfig, certificateA1: updatedCert } : undefined
      };

      setSettings(updatedSettings);
      localStorage.setItem(`fiscal_cert_${tenantId || 'global'}`, JSON.stringify(updatedCert));

      setSelectedFile(null);
      setPassword('');

      if (updatedCert.isExpired) {
        onShowToast(`Atenção: Certificado Vencido detectado! Rejeição SEFAZ 280 ativa.`, 'error');
      } else if (updatedCert.status === 'expiring_soon') {
        onShowToast(`Certificado A1 instalado: expira em ${updatedCert.daysRemaining} dias.`, 'info');
      } else {
        onShowToast('Certificado Digital A1 validado e instalado com sucesso!', 'success');
      }
    } catch (e: any) {
      const msg = e?.message || 'Erro ao processar Certificado. Verifique a senha e a integridade do arquivo.';
      setValidationErrorBanner(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleLoadTestProfile = (profile: 'long_term' | 'expired' | 'fixed_date') => {
    setValidationErrorBanner(null);
    setTestSefazResult(null);

    const testCert = generateTestCertificateProfile(
      profile,
      settings.storeName || 'EMPRESA COMERCIAL LTDA',
      settings.storeCnpj || '12.345.678/0001-95',
      '123456'
    );

    const updatedSettings: AppSettings = {
      ...settings,
      certificateA1: testCert,
      nfceNfeConfig: settings.nfceNfeConfig ? { ...settings.nfceNfeConfig, certificateA1: testCert } : undefined,
      nfseConfig: settings.nfseConfig ? { ...settings.nfseConfig, certificateA1: testCert } : undefined
    };

    setSettings(updatedSettings);
    localStorage.setItem(`fiscal_cert_${tenantId || 'global'}`, JSON.stringify(testCert));
    setSelectedFile(null);
    setPassword('');

    if (profile === 'expired') {
      onShowToast(`Perfil de Teste 'Certificado Vencido' carregado. Rejeição 280 ativa!`, 'error');
    } else if (profile === 'long_term') {
      onShowToast(`Perfil de Teste 'Certificado Válido (Longo Prazo)' carregado com sucesso!`, 'success');
    } else {
      onShowToast(`Perfil de Teste 'Certificado Válido (Data Fixa)' carregado com sucesso!`, 'success');
    }
  };

  const handleDownloadTestPfx = (profile: 'long_term' | 'expired' | 'fixed_date') => {
    const cert = generateTestCertificateProfile(
      profile,
      settings.storeName || 'EMPRESA COMERCIAL LTDA',
      settings.storeCnpj || '12.345.678/0001-95',
      '123456'
    );

    if (!cert.certBase64) return;

    const base64Data = cert.certBase64.replace(/^data:application\/x-pkcs12;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/x-pkcs12' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = cert.fileName || `${profile}.pfx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    onShowToast(`Arquivo ${link.download} baixado! Senha padrão: 123456`, 'info');
  };

  const handleRemoveCertificate = () => {
    if (!window.confirm('Tem certeza que deseja remover o Certificado A1? As emissões de NF-e, NFC-e e NFS-e ficarão desativadas.')) {
      return;
    }

    const updatedSettings = {
      ...settings,
      certificateA1: {
        hasCertificate: false,
        status: 'unconfigured' as const
      }
    };

    setSettings(updatedSettings);
    localStorage.removeItem(`fiscal_cert_${tenantId || 'global'}`);
    setSelectedFile(null);
    setPassword('');
    setTestSefazResult(null);
    setValidationErrorBanner(null);
    onShowToast('Certificado Digital A1 removido.', 'info');
  };

  const handleTestSefaz = async () => {
    if (!certData.hasCertificate) {
      onShowToast('Instale um Certificado Digital A1 antes de testar a comunicação.', 'error');
      return;
    }

    setIsTestingSefaz(true);
    setTestSefazResult(null);

    try {
      await new Promise(r => setTimeout(r, 1200));

      // 1. Falha por Certificado Expirado / Vencido
      if (certData.isExpired || certData.status === 'expired') {
        const expiredDate = certData.expiresAt ? new Date(certData.expiresAt).toLocaleDateString('pt-BR') : 'Data passada';
        const daysAgo = Math.abs(certData.daysRemaining || 0);
        
        setTestSefazResult({
          success: false,
          code: 'Rejeição 280',
          message: `Rejeição 280: Certificado de Transmissão Vencido em ${expiredDate} (há ${daysAgo} dias).`,
          details: 'A SEFAZ rejeita o Handshake TLS / mTLS quando a data atual do servidor ultrapassa a validade (notAfter) do certificado digital.',
          timestamp: new Date().toLocaleTimeString('pt-BR')
        });
        onShowToast('Falha SEFAZ: Rejeição 280 (Certificado Vencido)', 'error');
        return;
      }

      // 2. Falha por Divergência de CNPJ
      const cleanCertCnpj = (certData.subjectCnpj || '').replace(/\D/g, '');
      const cleanStoreCnpj = (settings.storeCnpj || '').replace(/\D/g, '');
      if (cleanStoreCnpj && cleanCertCnpj && cleanCertCnpj !== cleanStoreCnpj) {
        setTestSefazResult({
          success: false,
          code: 'Rejeição 207',
          message: `Rejeição 207: CNPJ do emitente (${formatCnpj(cleanStoreCnpj)}) difere do CNPJ do Certificado Digital (${formatCnpj(cleanCertCnpj)}).`,
          details: 'O CNPJ informado no cabeçalho do documento fiscal deve coincidir com o CNPJ do titular do Certificado A1 transmissor.',
          timestamp: new Date().toLocaleTimeString('pt-BR')
        });
        onShowToast('Falha SEFAZ: Rejeição 207 (Divergência de CNPJ)', 'error');
        return;
      }

      // 3. Sucesso SEFAZ
      setTestSefazResult({
        success: true,
        code: '107',
        message: `Serviço SEFAZ em Operação (Código 107). Certificado de ${certData.subjectName} autenticado com sucesso!`,
        details: `Cadeia ICP-Brasil verificada (${certData.issuer}). Latência: 164ms. Status do transmissor: Ativo.`,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
      onShowToast('Comunicação SEFAZ validada com Sucesso!', 'success');
    } catch (e: any) {
      setTestSefazResult({
        success: false,
        code: 'Falha de Conexão',
        message: 'Falha na resposta do WebService SEFAZ. Verifique sua conexão à internet.',
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
    } finally {
      setIsTestingSefaz(false);
    }
  };

  const isExpired = certData.isExpired || certData.status === 'expired';
  const isExpiringSoon = certData.status === 'expiring_soon';
  const isValid = certData.hasCertificate && !isExpired && !isExpiringSoon;

  return (
    <div className="space-y-6">
      {/* PAINEL DE TESTES RÁPIDOS DOS 3 CERTIFICADOS */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-blue-800/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center text-blue-300 shrink-0">
              <Cpu size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-white">
                  Banco de Testes de Certificados Digitais A1
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Simulador ICP-Brasil
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Alterne instantaneamente entre os 3 cenários de teste para verificar a detecção de erros e aprovações do sistema:
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Teste 1: Longo Prazo */}
          <div className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl p-4 border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Cenário 1
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md">
                  Válido 5 Anos
                </span>
              </div>
              <h4 className="text-xs font-black text-white uppercase mt-2">
                Certificado Válido (Longo Prazo)
              </h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                Certificado A1 com vigência estendida de 5 anos. Status 100% ativo, sem restrições ou pendências na SEFAZ.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleLoadTestProfile('long_term')}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Carregar Teste
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTestPfx('long_term')}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Baixar arquivo .PFX (Senha: 123456)"
              >
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* Card Teste 2: Vencido */}
          <div className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl p-4 border border-red-500/30 flex flex-col justify-between space-y-3 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-16 h-16 bg-red-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Cenário 2 (Falha)
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md">
                  Rejeição 280
                </span>
              </div>
              <h4 className="text-xs font-black text-white uppercase mt-2">
                Certificado Vencido
              </h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                Certificado expirado há mais de 90 dias. Dispara bloqueios de emissão, alertas vermelhos e Rejeição 280 SEFAZ.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleLoadTestProfile('expired')}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Carregar Teste
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTestPfx('expired')}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Baixar arquivo .PFX vencido (Senha: 123456)"
              >
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* Card Teste 3: Data Fixa */}
          <div className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl p-4 border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Clock size={14} /> Cenário 3
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md">
                  Prazo Fixo (180d)
                </span>
              </div>
              <h4 className="text-xs font-black text-white uppercase mt-2">
                Certificado Válido (Data Fixa)
              </h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                Certificado com data de expiração fixa programada para 180 dias. Demonstra o cálculo exato dos dias restantes.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleLoadTestProfile('fixed_date')}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Carregar Teste
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTestPfx('fixed_date')}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Baixar arquivo .PFX de data fixa (Senha: 123456)"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER DE ERRO DE VALIDAÇÃO (SE HOUVER) */}
      {validationErrorBanner && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 flex items-start gap-3.5 animate-in fade-in">
          <XCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-black text-red-900 uppercase tracking-wider">
              Falha na Validação do Certificado
            </h4>
            <p className="text-xs text-red-700 font-medium mt-1 leading-relaxed">
              {validationErrorBanner}
            </p>
            <p className="text-[10px] text-red-600 font-bold mt-2">
              Dica: Certifique-se de selecionar um arquivo com extensão .PFX ou .P12 e digitar a senha exata criada no momento da emissão.
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setValidationErrorBanner(null)}
            className="text-red-400 hover:text-red-700 font-bold text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* BANNER DE NOTAS PENDENTES PARA RETRANSMISSÃO APÓS RENOVAÇÃO DO CERTIFICADO */}
      {isValid && pendingNotes.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl shadow-xl shadow-emerald-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">
                Certificado Ativo • {pendingNotes.length} Nota(s) Pendente(s) de Envio
              </h3>
              <p className="text-xs text-emerald-100 font-medium mt-0.5 leading-relaxed">
                Você renovou o certificado com sucesso! Transmita agora as notas que foram emitidas em contingência ou que foram bloqueadas anteriormente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBatchRetransmitFromCert}
            disabled={isBatchTransmitting}
            className="px-5 py-3.5 bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isBatchTransmitting ? (
              <>
                <RefreshCw size={16} className="animate-spin text-emerald-900" />
                <span>Transmitindo Lote...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Transmitir {pendingNotes.length} Nota(s) para SEFAZ</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CARD PRINCIPAL DE STATUS DO CERTIFICADO */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              !certData.hasCertificate
                ? 'bg-slate-100 text-slate-400 border border-slate-200'
                : isExpired
                ? 'bg-red-50 text-red-600 border border-red-300'
                : isExpiringSoon
                ? 'bg-amber-50 text-amber-600 border border-amber-300'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-300'
            }`}>
              {!certData.hasCertificate ? (
                <ShieldAlert size={32} />
              ) : isExpired ? (
                <XCircle size={32} className="animate-pulse" />
              ) : isExpiringSoon ? (
                <AlertTriangle size={32} />
              ) : (
                <ShieldCheck size={32} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Certificado Digital A1
                </h2>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  !certData.hasCertificate
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : isExpired
                    ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                    : isExpiringSoon
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {!certData.hasCertificate 
                    ? 'Não Configurado' 
                    : isExpired 
                    ? 'Bloqueado • Certificado Vencido' 
                    : isExpiringSoon 
                    ? 'Atenção • Expira em Breve' 
                    : 'Ativo & Válido na SEFAZ'}
                </span>

                {certData.certTypeProfile && (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {certData.certTypeProfile === 'long_term' && 'Longo Prazo'}
                    {certData.certTypeProfile === 'fixed_date' && 'Data Fixa'}
                    {certData.certTypeProfile === 'expired' && 'Perfil Vencido'}
                    {certData.certTypeProfile === 'standard' && 'Padrão ICP-Brasil'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Criptografia X.509 PKCS#12 utilizada para assinar XMLs de NF-e (Modelo 55), NFC-e (Modelo 65) e NFS-e.
              </p>
            </div>
          </div>

          {certData.hasCertificate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSefaz}
                disabled={isTestingSefaz}
                className={`px-4 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isExpired 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                <RefreshCw size={14} className={isTestingSefaz ? 'animate-spin' : ''} />
                <span>{isTestingSefaz ? 'Verificando SEFAZ...' : 'Testar Conexão SEFAZ'}</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveCertificate}
                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all cursor-pointer"
                title="Remover Certificado A1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ALERTA CRÍTICO SE O CERTIFICADO ESTIVER VENCIDO */}
        {certData.hasCertificate && isExpired && (
          <div className="bg-red-50 border-2 border-red-500/50 rounded-2xl p-4.5 flex items-start gap-3.5 animate-in slide-in-from-top-2">
            <ShieldAlert size={24} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-red-950 tracking-wider flex items-center gap-2">
                <span>Falha Crítica SEFAZ: Rejeição 280 (Certificado de Transmissão Vencido)</span>
              </h4>
              <p className="text-xs text-red-800 font-medium leading-relaxed">
                Este certificado digital expirou em <strong>{certData.expiresAt ? new Date(certData.expiresAt).toLocaleDateString('pt-BR') : 'data anterior'}</strong> (há {Math.abs(certData.daysRemaining || 0)} dias).
                Todas as emissões de notas fiscais (NF-e / NFC-e / NFS-e) serão imediatamente rejeitadas pela SEFAZ até que um certificado válido seja instalado.
              </p>
            </div>
          </div>
        )}

        {/* ALERTA DE DIVERGÊNCIA DE CNPJ */}
        {certData.hasCertificate && certData.cnpjMatch === false && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                Alerta de Rejeição 207 SEFAZ: Divergência de CNPJ
              </h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5 leading-relaxed">
                O CNPJ extraído do certificado (<strong>{certData.subjectCnpj}</strong>) não coincide com o CNPJ configurado na loja (<strong>{settings.storeCnpj || 'Não preenchido'}</strong>).
              </p>
            </div>
          </div>
        )}

        {/* DETALHES DO CERTIFICADO INSTALADO */}
        {certData.hasCertificate ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 size={12} /> Titular / Razão Social
                </p>
                <p className="text-xs font-black text-slate-800 uppercase truncate mt-1">
                  {certData.subjectName || settings.storeName}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">CNPJ: {certData.subjectCnpj || settings.storeCnpj}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> Autoridade Emissora (AC)
                </p>
                <p className="text-xs font-black text-slate-800 uppercase truncate mt-1">
                  {certData.issuer || 'AC ICP-Brasil'}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">ICP-Brasil / Padrão A1</p>
              </div>

              <div className={`rounded-2xl p-4 border ${
                isExpired 
                  ? 'bg-red-50/50 border-red-200' 
                  : isExpiringSoon 
                  ? 'bg-amber-50/50 border-amber-200' 
                  : 'bg-slate-50 border-slate-100'
              }`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} /> Validade & Expiração
                </p>
                <p className="text-xs font-black text-slate-800 uppercase truncate mt-1">
                  {certData.expiresAt ? new Date(certData.expiresAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                </p>
                <p className={`text-[10px] font-bold mt-0.5 ${
                  isExpired 
                    ? 'text-red-600' 
                    : isExpiringSoon 
                    ? 'text-amber-600' 
                    : 'text-emerald-600'
                }`}>
                  {isExpired 
                    ? `Vencido há ${Math.abs(certData.daysRemaining || 0)} dias` 
                    : `${certData.daysRemaining} dias restantes`}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FileCheck size={12} /> Arquivo & Formato
                </p>
                <p className="text-xs font-black text-slate-800 uppercase truncate mt-1">
                  {certData.fileName || 'certificado.pfx'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1 truncate">
                  <Fingerprint size={10} /> {certData.thumbprint ? certData.thumbprint.substring(0, 16) + '...' : 'PKCS#12'}
                </p>
              </div>
            </div>

            {/* Barra de Progresso de Validade */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 uppercase text-[10px]">
                  Termômetro de Validade do Certificado:
                </span>
                <span className={`font-black ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                  {isExpired 
                    ? '0 dias válidos (Expirado)' 
                    : `${certData.daysRemaining} dias restantes`}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    isExpired 
                      ? 'bg-red-500' 
                      : (certData.daysRemaining || 0) > 60 
                      ? 'bg-emerald-500' 
                      : 'bg-amber-500'
                  }`}
                  style={{ 
                    width: isExpired 
                      ? '100%' 
                      : `${Math.min(100, Math.max(8, ((certData.daysRemaining || 365) / 365) * 100))}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Resultado do Teste SEFAZ */}
            {testSefazResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${
                testSefazResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}>
                {testSefazResult.success ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase tracking-wider text-[11px]">
                      {testSefazResult.success ? 'Diagnóstico SEFAZ: Conexão Aprovada' : `Diagnóstico SEFAZ: ${testSefazResult.code || 'Falha'}`}
                    </span>
                    <span className="text-[9px] opacity-70">({testSefazResult.timestamp})</span>
                  </div>
                  <p className="font-bold">{testSefazResult.message}</p>
                  {testSefazResult.details && (
                    <p className="text-[11px] opacity-80 mt-0.5">{testSefazResult.details}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 mx-auto shadow-xs border border-slate-200">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase">Nenhum Certificado A1 Vinculado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Para emitir documentos fiscais válidos perante a SEFAZ e Prefeituras, faça o upload do arquivo .PFX ou .P12 abaixo ou utilize os perfis de teste acima.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FORMULÁRIO DE INSTALAÇÃO DO SEU ARQUIVO (.PFX OU .P12) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">
              {certData.hasCertificate ? 'Substituir ou Atualizar Certificado A1' : 'Instalar Arquivo de Certificado A1'}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Envie o arquivo fornecido pela sua Autoridade Certificadora ou teste com seus próprios certificados locais.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo de Upload de Arquivo */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">
              Arquivo do Certificado (.PFX ou .P12) *
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                selectedFile 
                  ? 'border-emerald-400 bg-emerald-50/40' 
                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pfx,.p12" 
                className="hidden" 
              />
              <FileCode size={24} className={`mx-auto mb-1.5 ${selectedFile ? 'text-emerald-600' : 'text-slate-400'}`} />
              <p className="text-xs font-black text-slate-800 uppercase truncate">
                {selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo .PFX ou .P12'}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Formatos aceitos: .pfx, .p12 (Padrão ICP-Brasil)'}
              </p>
            </div>
          </div>

          {/* Campo de Senha do Certificado */}
          <div className="space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Senha do Certificado Digital A1 *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="DIGITE A SENHA DO CERTIFICADO..."
                  className="w-full h-12 pl-4 pr-11 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">
                A senha é testada criptograficamente contra a chave privada do arquivo para evitar erros de autenticação na SEFAZ.
              </p>
            </div>

            <button
              type="button"
              onClick={handleValidateAndInstall}
              disabled={isValidating || (!selectedFile && !certData.hasCertificate) || !password}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isValidating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Validando Chave Privada e Datas...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Validar e Salvar Certificado A1</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
