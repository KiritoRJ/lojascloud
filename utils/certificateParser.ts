import forge from 'node-forge';
import { CertificateA1Data } from '../types';

export interface CertificateParseResult {
  success: boolean;
  error?: string;
  errorCode?: 'INVALID_PASSWORD' | 'CORRUPTED_FILE' | 'EMPTY_FILE' | 'UNKNOWN';
  certificateData?: CertificateA1Data;
}

export function formatCnpj(cnpj: string): string {
  const clean = (cnpj || '').replace(/\D/g, '');
  if (clean.length === 14) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (clean.length === 11) {
    return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpj || '';
}

/**
 * Tenta extrair o CNPJ ou CPF do Subject ou extensões ICP-Brasil de um certificado X.509
 */
function extractCnpjFromSubject(cert: forge.pki.Certificate): string | undefined {
  try {
    // 1. Procura no Common Name (CN): "RAZAO SOCIAL LTDA:12345678000195" ou ":12345678000"
    for (const attr of cert.subject.attributes) {
      if (attr.name === 'commonName' || attr.shortName === 'CN') {
        const val = String(attr.value || '');
        const match = val.match(/:(\d{11,14})$/);
        if (match && match[1]) {
          return formatCnpj(match[1]);
        }
        const cnpjRegex = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})|(\d{14})/;
        const match2 = val.match(cnpjRegex);
        if (match2 && match2[0]) {
          return formatCnpj(match2[0]);
        }
      }
    }

    // 2. Procura nas extensões X.509 (OIDs da ICP-Brasil)
    // OID 2.16.76.1.3.3 = CNPJ do titular
    // OID 2.16.76.1.3.1 = CPF do titular
    if (cert.extensions && Array.isArray(cert.extensions)) {
      for (const ext of cert.extensions) {
        if (ext.id === '2.16.76.1.3.3' && ext.value) {
          const val = String(ext.value);
          const clean = val.replace(/\D/g, '');
          if (clean.length >= 14) {
            return formatCnpj(clean.substring(clean.length - 14));
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return undefined;
}

/**
 * Extrai Razão Social limpa do Subject
 */
function extractSubjectName(cert: forge.pki.Certificate): string {
  try {
    for (const attr of cert.subject.attributes) {
      if (attr.name === 'commonName' || attr.shortName === 'CN') {
        const val = String(attr.value || '');
        // Remove :CNPJ se presente no final
        return val.replace(/:\d{11,14}$/, '').trim();
      }
    }
    for (const attr of cert.subject.attributes) {
      if (attr.name === 'organizationName' || attr.shortName === 'O') {
        return String(attr.value || '').trim();
      }
    }
  } catch {
    // fallback
  }
  return 'EMPRESA TITULAR DO CERTIFICADO';
}

/**
 * Extrai Autoridade Certificadora Emissora (Issuer)
 */
function extractIssuerName(cert: forge.pki.Certificate): string {
  try {
    for (const attr of cert.issuer.attributes) {
      if (attr.name === 'commonName' || attr.shortName === 'CN') {
        return String(attr.value || '').trim();
      }
    }
    for (const attr of cert.issuer.attributes) {
      if (attr.name === 'organizationName' || attr.shortName === 'O') {
        return String(attr.value || '').trim();
      }
    }
  } catch {
    // fallback
  }
  return 'AC ICP-Brasil';
}

/**
 * Decodifica e valida criptograficamente um arquivo PKCS#12 (.pfx / .p12)
 */
export function parsePkcs12Certificate(
  base64OrBinary: string,
  password: string,
  companyCnpj?: string,
  fileName?: string
): CertificateParseResult {
  if (!base64OrBinary) {
    return {
      success: false,
      error: 'Arquivo vazio ou formato não reconhecido.',
      errorCode: 'EMPTY_FILE'
    };
  }

  // Limpa prefixo de data-uri se existir (ex: data:application/x-pkcs12;base64,...)
  let base64 = base64OrBinary;
  if (base64.includes('base64,')) {
    base64 = base64.split('base64,')[1];
  }
  base64 = base64.trim();

  let derBytes: string;
  try {
    derBytes = forge.util.decode64(base64);
  } catch {
    return {
      success: false,
      error: 'Falha na leitura do arquivo. O conteúdo não está em formato base64/binário legível.',
      errorCode: 'CORRUPTED_FILE'
    };
  }

  let asn1Obj: forge.asn1.Asn1;
  try {
    asn1Obj = forge.asn1.fromDer(derBytes);
  } catch {
    return {
      success: false,
      error: 'Estrutura ASN.1 inválida. O arquivo enviado não é um Certificado PKCS#12 (.pfx / .p12) reconhecido.',
      errorCode: 'CORRUPTED_FILE'
    };
  }

  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1Obj, password);
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('mac could not be verified') || msg.includes('invalid password') || msg.includes('password')) {
      return {
        success: false,
        error: 'Senha incorreta para o Certificado Digital A1. Verifique se o Caps Lock está ativo e confirme a senha.',
        errorCode: 'INVALID_PASSWORD'
      };
    }
    return {
      success: false,
      error: `Erro ao descriptografar o certificado: ${err?.message || 'Arquivo corrompido ou senha inválida'}.`,
      errorCode: 'CORRUPTED_FILE'
    };
  }

  // Extrai bolsas de certificado
  let cert: forge.pki.Certificate | null = null;

  try {
    // 1. Tenta certBag
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const bagsArray = certBags[forge.pki.oids.certBag];
    if (bagsArray && bagsArray.length > 0 && bagsArray[0].cert) {
      cert = bagsArray[0].cert;
    }

    // 2. Se não encontrou, itera sobre todas as bolsas disponíveis
    const anyP12 = p12 as any;
    if (!cert && anyP12?.bags) {
      for (const bagOid in anyP12.bags) {
        const currentBags = anyP12.bags[bagOid];
        if (Array.isArray(currentBags)) {
          for (const b of currentBags) {
            if (b.cert) {
              cert = b.cert;
              break;
            }
          }
        }
        if (cert) break;
      }
    }
  } catch {
    // fallback
  }

  if (!cert) {
    return {
      success: false,
      error: 'Nenhum certificado X.509 encontrado dentro do contêiner PKCS#12 informado.',
      errorCode: 'CORRUPTED_FILE'
    };
  }

  // Extrai datas reais de validade
  const notBefore = cert.validity.notBefore;
  const notAfter = cert.validity.notAfter;
  const now = new Date();

  const daysRemaining = Math.floor((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = now.getTime() > notAfter.getTime();
  const isExpiringSoon = !isExpired && daysRemaining <= 30;
  const isNotYetValid = now.getTime() < notBefore.getTime();

  // Status unificado
  let status: 'valid' | 'expiring_soon' | 'expired' = 'valid';
  if (isExpired || isNotYetValid) {
    status = 'expired';
  } else if (isExpiringSoon) {
    status = 'expiring_soon';
  }

  // Diferencia perfil de validade (Longo Prazo x Data Fixa)
  const totalDaysSpan = Math.round((notAfter.getTime() - notBefore.getTime()) / (1000 * 60 * 60 * 24));
  let certTypeProfile: 'long_term' | 'expired' | 'fixed_date' | 'standard' = 'standard';
  if (isExpired) {
    certTypeProfile = 'expired';
  } else if (totalDaysSpan > 400) {
    certTypeProfile = 'long_term';
  } else {
    certTypeProfile = 'fixed_date';
  }

  // Thumbprint (SHA-1 fingerprint do certificado)
  let thumbprint = '';
  try {
    const certAsn1 = forge.pki.certificateToAsn1(cert);
    const certDer = forge.asn1.toDer(certAsn1).getBytes();
    const md = forge.md.sha1.create();
    md.update(certDer);
    thumbprint = md.digest().toHex().toUpperCase();
  } catch {
    thumbprint = Math.random().toString(16).substring(2, 18).toUpperCase();
  }

  const subjectName = extractSubjectName(cert);
  const subjectCnpj = extractCnpjFromSubject(cert) || (companyCnpj ? formatCnpj(companyCnpj) : '00.000.000/0001-00');
  const issuer = extractIssuerName(cert);
  const serialNumber = cert.serialNumber || Math.random().toString(16).substring(2, 18).toUpperCase();

  // Validação de CNPJ com a loja
  const cleanCertCnpj = subjectCnpj.replace(/\D/g, '');
  const cleanCompanyCnpj = (companyCnpj || '').replace(/\D/g, '');
  const cnpjMatch = !cleanCompanyCnpj || cleanCertCnpj === cleanCompanyCnpj;

  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];
  const diagnosticNotes: string[] = [];

  if (isExpired) {
    const expiredDays = Math.abs(daysRemaining);
    validationErrors.push(`Rejeição SEFAZ 280: Certificado de Transmissão Vencido em ${notAfter.toLocaleDateString('pt-BR')} (há ${expiredDays} dias).`);
  }

  if (isNotYetValid) {
    validationErrors.push(`Certificado ainda não iniciado. Vigência inicia em ${notBefore.toLocaleDateString('pt-BR')}.`);
  }

  if (isExpiringSoon) {
    validationWarnings.push(`Certificado expira em breve: restam apenas ${daysRemaining} dias (vence em ${notAfter.toLocaleDateString('pt-BR')}). Providencie renovação.`);
  }

  if (!cnpjMatch) {
    validationWarnings.push(`Rejeição SEFAZ 207 em potencial: CNPJ do certificado (${formatCnpj(cleanCertCnpj)}) diverge do CNPJ da empresa (${formatCnpj(cleanCompanyCnpj)}).`);
  }

  if (certTypeProfile === 'long_term') {
    diagnosticNotes.push(`Certificado de Longo Prazo identificado (Vigência de ${(totalDaysSpan / 365).toFixed(1)} anos).`);
  } else if (certTypeProfile === 'fixed_date') {
    diagnosticNotes.push(`Certificado com Data Fixa (Vencimento programado para ${notAfter.toLocaleDateString('pt-BR')}).`);
  }

  diagnosticNotes.push(`Emissor ICP-Brasil: ${issuer}`);
  diagnosticNotes.push(`Serial: ${serialNumber}`);

  const certData: CertificateA1Data = {
    hasCertificate: true,
    fileName: fileName || 'certificado_a1.pfx',
    certBase64: `data:application/x-pkcs12;base64,${base64}`,
    certPassword: password,
    uploadedAt: new Date().toISOString(),
    validFrom: notBefore.toISOString(),
    expiresAt: notAfter.toISOString(),
    issuer,
    subjectCnpj,
    subjectName,
    serialNumber,
    status,
    isExpired,
    daysRemaining,
    certTypeProfile,
    thumbprint,
    validationErrors,
    validationWarnings,
    cnpjMatch,
    diagnosticNotes
  };

  return {
    success: true,
    certificateData: certData
  };
}

/**
 * Cria em memória um certificado PKCS#12 (.pfx) criptograficamente válido
 * para fins de simulação e teste exato dos 3 cenários solicitados:
 * 1) Certificado Válido (Longo Prazo)
 * 2) Certificado Vencido
 * 3) Certificado Válido (Data Fixa)
 */
export function generateTestCertificateProfile(
  profile: 'long_term' | 'expired' | 'fixed_date',
  companyName: string = 'EMPRESA COMERCIAL LTDA',
  cnpj: string = '12.345.678/0001-95',
  password: string = '123456'
): CertificateA1Data {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Math.floor(10000000 + Math.random() * 90000000).toString();

  const now = new Date();
  let notBefore = new Date(now);
  let notAfter = new Date(now);
  let issuerName = 'AC SERASA RFB v5';
  let certTypeProfile: 'long_term' | 'expired' | 'fixed_date' = profile;

  if (profile === 'long_term') {
    // Certificado Válido (Longo Prazo) - ex: 5 anos de validade
    notBefore = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    notAfter = new Date(now.getFullYear() + 4, now.getMonth(), now.getDate());
    issuerName = 'AC CERTISIGN RFB G5';
  } else if (profile === 'expired') {
    // Certificado Vencido - venceu há 3 meses
    notBefore = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    notAfter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    issuerName = 'AC SOLUTI Multipla v5';
  } else {
    // Certificado Válido (Data Fixa) - vence em 180 dias fixos
    notBefore = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    notAfter = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    issuerName = 'AC VALID RFB v5';
  }

  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  const cleanCnpj = cnpj.replace(/\D/g, '') || '12345678000195';
  const fullSubjectCn = `${companyName.toUpperCase()}:${cleanCnpj}`;

  const subjectAttrs = [
    { name: 'commonName', value: fullSubjectCn },
    { name: 'organizationName', value: companyName.toUpperCase() },
    { name: 'countryName', value: 'BR' }
  ];

  const issuerAttrs = [
    { name: 'commonName', value: issuerName },
    { name: 'organizationName', value: 'ICP-Brasil' },
    { name: 'countryName', value: 'BR' }
  ];

  cert.setSubject(subjectAttrs);
  cert.setIssuer(issuerAttrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Converte para contêiner PKCS#12 (.pfx) criptografado com a senha informada
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const b64 = forge.util.encode64(p12Der);

  const daysRemaining = Math.floor((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  let fileName = 'certificado_valido_longo_prazo.pfx';
  if (profile === 'expired') fileName = 'certificado_vencido.pfx';
  if (profile === 'fixed_date') fileName = 'certificado_valido_data_fixa.pfx';

  const md = forge.md.sha1.create();
  md.update(p12Der);
  const thumbprint = md.digest().toHex().toUpperCase();

  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];
  const diagnosticNotes: string[] = [];

  if (isExpired) {
    validationErrors.push(`Rejeição SEFAZ 280: Certificado de Transmissão Vencido em ${notAfter.toLocaleDateString('pt-BR')} (há ${Math.abs(daysRemaining)} dias).`);
  } else if (daysRemaining <= 30) {
    validationWarnings.push(`Certificado A1 vence em breve: restam ${daysRemaining} dias.`);
  }

  if (profile === 'long_term') {
    diagnosticNotes.push('Perfil: Certificado Válido de Longo Prazo (Vigência de 5 anos).');
  } else if (profile === 'expired') {
    diagnosticNotes.push('Perfil: Certificado Vencido para Testes de Rejeição SEFAZ.');
  } else {
    diagnosticNotes.push(`Perfil: Certificado Válido com Data Fixa programada para ${notAfter.toLocaleDateString('pt-BR')}.`);
  }

  return {
    hasCertificate: true,
    fileName,
    certBase64: `data:application/x-pkcs12;base64,${b64}`,
    certPassword: password,
    uploadedAt: new Date().toISOString(),
    validFrom: notBefore.toISOString(),
    expiresAt: notAfter.toISOString(),
    issuer: issuerName,
    subjectCnpj: formatCnpj(cleanCnpj),
    subjectName: companyName.toUpperCase(),
    serialNumber: cert.serialNumber,
    status: isExpired ? 'expired' : daysRemaining <= 30 ? 'expiring_soon' : 'valid',
    isExpired,
    daysRemaining,
    certTypeProfile,
    thumbprint,
    validationErrors,
    validationWarnings,
    cnpjMatch: true,
    diagnosticNotes
  };
}
