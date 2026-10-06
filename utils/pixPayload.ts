/**
 * Utilitários para Geração de Chave Pix Cópia e Cola Oficial (BR Code / EMV)
 * e Geração de Cartão de Contato vCard (.vcf) para smartphones.
 */

// Cálculo do CRC16 (Polinômio 0x1021, valor inicial 0xFFFF - Padrão Bacen / EMVCo)
export function crc16(str: string): string {
  let crc = 0xffff;
  const strlen = str.length;

  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }

  let hex = (crc & 0xffff).toString(16).toUpperCase();
  if (hex.length === 3) hex = '0' + hex;
  if (hex.length === 2) hex = '00' + hex;
  if (hex.length === 1) hex = '000' + hex;
  return hex;
}

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface GeneratePixPayloadParams {
  key: string;
  name: string;
  city?: string;
  amount?: number;
  txId?: string;
  description?: string;
}

/**
 * Normaliza e gera o código PIX Oficial (EMV QRCPS / BR Code)
 * Funciona em 100% dos apps bancários brasileiros (Nubank, Inter, Itaú, Bradesco, BB, Caixa, etc.)
 */
export function generatePixBrCode(params: GeneratePixPayloadParams): string {
  if (!params.key) return '';

  const cleanKey = params.key.trim();
  // Limpa caracteres especiais do nome e da cidade (apenas ASCII suportado no EMV standard)
  const cleanName = (params.name || 'Loja')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .substring(0, 25)
    .trim() || 'LOJA';

  const cleanCity = (params.city || 'BRASIL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .substring(0, 15)
    .trim() || 'BRASIL';

  const cleanTxId = (params.txId || '***')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 25) || '***';

  // Merchant Account Information (ID 26)
  const gui = emvField('00', 'br.gov.bcb.pix');
  const keyField = emvField('01', cleanKey);
  const descField = params.description ? emvField('02', params.description.substring(0, 40)) : '';
  const merchantAccountInfo = emvField('26', `${gui}${keyField}${descField}`);

  // Payload Format Indicator
  let payload = emvField('00', '01');

  // Point of Initiation Method: 11 = Static, 12 = Dynamic
  payload += emvField('01', '11');

  // Merchant Account Info
  payload += merchantAccountInfo;

  // Merchant Category Code: 0000 = Not specified
  payload += emvField('52', '0000');

  // Transaction Currency: 986 = BRL
  payload += emvField('53', '986');

  // Transaction Amount (opcional)
  if (params.amount && params.amount > 0) {
    payload += emvField('54', params.amount.toFixed(2));
  }

  // Country Code
  payload += emvField('58', 'BR');

  // Merchant Name & City
  payload += emvField('59', cleanName.toUpperCase());
  payload += emvField('60', cleanCity.toUpperCase());

  // Additional Data Field Template (TxID)
  const txIdField = emvField('05', cleanTxId);
  payload += emvField('62', txIdField);

  // CRC16 Checksum
  const payloadToCrc = `${payload}6304`;
  const checksum = crc16(payloadToCrc);

  return `${payloadToCrc}${checksum}`;
}

/**
 * Gera um arquivo de Contato Digital (.vcf) para o cliente adicionar
 * a loja diretamente aos contatos do telefone (Android / iPhone)
 */
export function generateVCardData(store: {
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  instagram?: string;
  email?: string;
  website?: string;
}): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${store.name}`,
    `ORG:${store.name}`,
  ];

  const primaryPhone = store.whatsapp || store.phone;
  if (primaryPhone) {
    const cleanPhone = primaryPhone.replace(/\D/g, '');
    lines.push(`TEL;TYPE=CELL,VOICE:+55${cleanPhone.replace(/^55/, '')}`);
  }

  if (store.phone && store.phone !== store.whatsapp) {
    lines.push(`TEL;TYPE=WORK,VOICE:${store.phone}`);
  }

  if (store.email) {
    lines.push(`EMAIL;TYPE=WORK:${store.email}`);
  }

  if (store.address) {
    lines.push(`ADR;TYPE=WORK:;;${store.address};;;;`);
  }

  if (store.website) {
    lines.push(`URL:${store.website}`);
  }

  if (store.instagram) {
    const handle = store.instagram.replace(/^@/, '');
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/${handle}`);
  }

  lines.push('NOTE:Cartão de Visita Digital Oficial');
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Faz o download do arquivo .vcf direto no navegador
 */
export function downloadVCard(store: {
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  instagram?: string;
  email?: string;
  website?: string;
}) {
  const vcf = generateVCardData(store);
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${store.name.replace(/[^a-zA-Z0-9]/g, '_')}_contato.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper para copiar texto para a área de transferência com suporte robusto a fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {}

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    return false;
  }
}

/**
 * Escapa caracteres especiais para o protocolo Wi-Fi padrão ZXing / Barcode
 */
export function escapeWifiField(str: string): string {
  if (!str) return '';
  return str.replace(/([\\;,:\"])/g, '\\$1');
}

/**
 * Gera a string do protocolo padrão universal de Wi-Fi (WIFI:S:Rede;T:WPA;P:Senha;;)
 * Reconhecido nativamente por câmeras de iPhone (iOS), Android (Samsung, Xiaomi, Motorola, etc.)
 */
export function generateWifiQrString(
  ssid: string,
  password = '',
  encryption: 'WPA' | 'WEP' | 'nopass' = 'WPA',
  hidden = false
): string {
  if (!ssid) return '';
  const cleanSsid = escapeWifiField(ssid.trim());
  if (!password || encryption === 'nopass') {
    return `WIFI:S:${cleanSsid};T:nopass;${hidden ? 'H:true;' : ''};`;
  }
  const cleanPass = escapeWifiField(password.trim());
  return `WIFI:S:${cleanSsid};T:${encryption};P:${cleanPass};${hidden ? 'H:true;' : ''};`;
}

/**
 * Gera e faz download de perfil de configuração Apple (.mobileconfig)
 * Permite ao iPhone / iPad adicionar a rede e se conectar com 1 toque sem digitar senha
 */
export function downloadAppleWifiProfile(params: {
  ssid: string;
  password?: string;
  storeName?: string;
}) {
  const { ssid, password, storeName } = params;
  if (!ssid || typeof window === 'undefined') return;

  const uuid1 = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  const uuid2 = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadDisplayName</key>
    <string>Wi-Fi ${ssid}</string>
    <key>PayloadDescription</key>
    <string>Configuração de Wi-Fi para conexão automática na rede ${ssid}</string>
    <key>PayloadIdentifier</key>
    <string>com.lojascloud.wifi.${encodeURIComponent(ssid)}</string>
    <key>PayloadOrganization</key>
    <string>${storeName || 'Loja'}</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${uuid1}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.apple.wifi.managed</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PayloadIdentifier</key>
            <string>com.lojascloud.wifi.network.${encodeURIComponent(ssid)}</string>
            <key>PayloadUUID</key>
            <string>${uuid2}</string>
            <key>PayloadDisplayName</key>
            <string>Wi-Fi ${ssid}</string>
            <key>SSID_STR</key>
            <string>${ssid}</string>
            <key>HIDDEN_NETWORK</key>
            <false/>
            <key>AutoJoin</key>
            <true/>
            <key>EncryptionType</key>
            <string>${password ? 'WPA' : 'None'}</string>
            ${password ? `<key>Password</key><string>${password}</string>` : ''}
        </dict>
    </array>
</dict>
</plist>`;

  const blob = new Blob([xml], { type: 'application/x-apple-aspen-config' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wifi_${ssid.replace(/[^a-zA-Z0-9]/g, '_')}.mobileconfig`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
