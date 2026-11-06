import { ServiceOrder, AppSettings, DeviceDiagnosticResults } from '../types';
import { formatCurrency, formatDate, normalizeWhatsAppNumber, getWhatsAppDirectUrl, getTrackingUrl } from '../utils';
import { COMMON_DEFECTS } from '../components/ServiceOrderTab';

function getOrderDiagnostics(os?: ServiceOrder | null): DeviceDiagnosticResults | null {
  if (!os) return null;
  if (os.diagnosticTests) return os.diagnosticTests;
  if (Array.isArray(os.checklist)) {
    for (const item of os.checklist) {
      if (typeof item === 'string' && item.startsWith('__DIAG_JSON__:')) {
        try {
          return JSON.parse(item.substring(14));
        } catch (e) {}
      }
    }
  }
  try {
    const targetToken = os.trackingToken || os.id;
    const cached = localStorage.getItem(`os_diag_${targetToken}`) || localStorage.getItem(`os_diag_${os.id}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return null;
}

export interface GeneratedReceipt {
  dataUrl: string;
  blob: Blob;
  file: File;
}

export async function generateReceiptCanvasImage(
  order: ServiceOrder,
  settings: AppSettings
): Promise<GeneratedReceipt> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do canvas.');
  }

  const scale = 2;
  const width = 380 * scale;
  const dynamicHeight = 8500 * scale;
  canvas.width = width;
  canvas.height = dynamicHeight;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, dynamicHeight);

  // Função para quebra de texto por largura (maxWidth)
  const wrapText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    bold: boolean = false,
    color: string = '#000',
    align: 'left' | 'center' = 'left'
  ) => {
    ctx.font = `${bold ? '900' : '500'} ${9 * scale}px "Inter", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;

    const words = (text || '').split(' ');
    let line = '';
    let currentY = y;
    const posX = align === 'center' ? width / 2 : x;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, posX, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, posX, currentY);
    return currentY + lineHeight;
  };

  // Função para quebra de texto inteligente
  const wrapTextByChars = (
    text: string,
    x: number,
    y: number,
    charLimit: number,
    lineHeight: number,
    color: string = '#444'
  ) => {
    ctx.font = `500 ${9 * scale}px "Inter", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';

    const words = (text || '').split(' ');
    let currentLine = '';
    let currentY = y;

    words.forEach((word, index) => {
      const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
      if (testLine.length > charLimit && index > 0) {
        ctx.fillText(currentLine, x, currentY);
        currentLine = word;
        currentY += lineHeight;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      ctx.fillText(currentLine, x, currentY);
      currentY += lineHeight;
    }
    return currentY;
  };

  // Desenha linhas tracejadas separadoras
  const drawSeparator = (y: number) => {
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([4 * scale, 2 * scale]);
    ctx.beginPath();
    ctx.moveTo(20 * scale, y);
    ctx.lineTo(width - 20 * scale, y);
    ctx.stroke();
    ctx.setLineDash([]);
    return y + 15 * scale;
  };

  let currentY = 50 * scale;

  // 1. Cabeçalho
  ctx.font = `900 ${16 * scale}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000';
  ctx.fillText((settings?.storeName || 'ASSISTÊNCIA TÉCNICA').toUpperCase(), width / 2, currentY);
  currentY += 25 * scale;

  ctx.font = `700 ${10 * scale}px "Inter", sans-serif`;
  ctx.fillText(`ORDEM DE SERVIÇO: #${order.id}`, width / 2, currentY);
  currentY += 16 * scale;
  ctx.font = `500 ${9 * scale}px "Inter", sans-serif`;
  ctx.fillText(`REGISTRO: ${formatDate(order.date || new Date().toISOString())}`, width / 2, currentY);
  currentY += 25 * scale;

  currentY = drawSeparator(currentY);

  // 2. Dados do Cliente
  ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText("DADOS DO CLIENTE", 25 * scale, currentY);
  currentY += 18 * scale;
  currentY = wrapText(`Nome: ${order.customerName || 'Não informado'}`, 25 * scale, currentY, width - 50 * scale, 14 * scale);
  currentY = wrapText(`Telefone: ${order.phoneNumber || 'Não informado'}`, 25 * scale, currentY, width - 50 * scale, 14 * scale);
  currentY = wrapText(`Endereço: ${order.address || 'Não informado'}`, 25 * scale, currentY, width - 50 * scale, 14 * scale);
  currentY += 10 * scale;
  currentY = drawSeparator(currentY);

  // 3. Dados do Aparelho
  ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
  ctx.fillText("DADOS DO APARELHO", 25 * scale, currentY);
  currentY += 18 * scale;
  currentY = wrapText(`Marca: ${order.deviceBrand || '-'}`, 25 * scale, currentY, width - 50 * scale, 14 * scale);
  currentY = wrapText(`Modelo: ${order.deviceModel || '-'}`, 25 * scale, currentY, width - 50 * scale, 14 * scale);
  currentY += 14 * scale;

  ctx.font = `700 ${9 * scale}px "Inter", sans-serif`;
  ctx.fillText(`DATA DE ENTRADA: ${order.entryDate || '-'}`, 25 * scale, currentY);
  currentY += 14 * scale;
  if (order.status === 'Concluído' || order.status === 'Entregue') {
    ctx.fillText(`DATA DE SAÍDA: ${order.exitDate || '-'}`, 25 * scale, currentY);
    currentY += 14 * scale;
  }
  currentY += 6 * scale;
  currentY = drawSeparator(currentY);

  // 3.4 Checklist de Defeitos na Entrada (apenas se selecionado manualmente na criação/edição da O.S.)
  const cleanChecklist = (order.checklist || []).filter(c => {
    if (typeof c !== 'string') return false;
    const trimmed = c.trim();
    if (!trimmed || trimmed.startsWith('__DIAG_JSON__:') || trimmed.startsWith('🔍 [TESTE]')) return false;
    if (trimmed.startsWith('📱') || trimmed.startsWith('✌️') || trimmed.startsWith('🎤') || trimmed.startsWith('🔊') || trimmed.startsWith('📞') || trimmed.startsWith('📶') || trimmed.startsWith('👁️') || trimmed.startsWith('🔐')) return false;
    return COMMON_DEFECTS.some(cd => cd.toLowerCase() === trimmed.toLowerCase());
  });
  if (cleanChecklist.length > 0) {
    ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.fillText("CHECKLIST DE DEFEITOS NA ENTRADA", 25 * scale, currentY);
    currentY += 16 * scale;

    const colWidth = (width - 60 * scale) / 2;
    const startY = currentY;
    let maxHeight = 0;

    cleanChecklist.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const itemX = 25 * scale + col * (colWidth + 10 * scale);
      const itemY = startY + row * 16 * scale;

      ctx.font = `900 ${8 * scale}px "Inter", sans-serif`;
      ctx.fillStyle = '#DC2626';
      ctx.fillText("[!]", itemX, itemY);

      ctx.font = `600 ${8.5 * scale}px "Inter", sans-serif`;
      ctx.fillStyle = '#111827';
      const itemTrimmed = item.length > 18 ? item.substring(0, 17) + '…' : item;
      ctx.fillText(itemTrimmed, itemX + 18 * scale, itemY);

      if ((row + 1) * 16 * scale > maxHeight) {
        maxHeight = (row + 1) * 16 * scale;
      }
    });

    currentY = startY + maxHeight + 10 * scale;
    currentY = drawSeparator(currentY);
  }

  // 3.5 Testes Realizados na Entrega/Saída (testes de hardware de fato)
  const diagResults = getOrderDiagnostics(order);
  const diagTests = diagResults?.tests ? Object.values(diagResults.tests) : [];
  const executedHardwareTests = diagTests.filter(t => t.status === 'passed' || t.status === 'failed');

  if (executedHardwareTests.length > 0) {
    ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.fillText("TESTES REALIZADOS NA ENTREGA/SAÍDA", 25 * scale, currentY);
    currentY += 16 * scale;

    const colWidth = (width - 60 * scale) / 2;
    const startY = currentY;
    let maxHeight = 0;

    executedHardwareTests.forEach((t, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const itemX = 25 * scale + col * (colWidth + 10 * scale);
      const itemY = startY + row * 16 * scale;

      ctx.font = `900 ${8 * scale}px "Inter", sans-serif`;
      ctx.fillStyle = t.status === 'failed' ? '#DC2626' : '#16A34A';
      const badgeText = t.status === 'failed' ? 'OFF' : 'ON';
      ctx.fillText(badgeText, itemX, itemY);

      ctx.font = `500 ${8.5 * scale}px "Inter", sans-serif`;
      ctx.fillStyle = '#111827';
      const nameTrimmed = t.name.length > 17 ? t.name.substring(0, 16) + '…' : t.name;
      ctx.fillText(nameTrimmed, itemX + 26 * scale, itemY);

      if ((row + 1) * 16 * scale > maxHeight) {
        maxHeight = (row + 1) * 16 * scale;
      }
    });

    currentY = startY + maxHeight + 10 * scale;
    currentY = drawSeparator(currentY);
  }

  // 3.6 Defeito Informado (em baixo do bloco de testes realizados)
  ctx.font = `900 ${9 * scale}px "Inter", sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.fillText("DEFEITO INFORMADO:", 25 * scale, currentY);
  currentY += 14 * scale;
  currentY = wrapTextByChars(order.defect || 'Nenhum defeito detalhado', 25 * scale, currentY, 60, 12 * scale);
  currentY += 10 * scale;
  currentY = drawSeparator(currentY);

  // 4. Reparo Efetuado
  ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
  ctx.fillText("REPARO EFETUADO", 25 * scale, currentY);
  currentY += 18 * scale;
  currentY = wrapTextByChars(order.repairDetails || 'Serviço em andamento.', 25 * scale, currentY, 60, 12 * scale);
  currentY += 10 * scale;
  currentY = drawSeparator(currentY);

  // Fotos de Entrada
  ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
  ctx.fillText("FOTOS DE ENTRADA", 25 * scale, currentY);
  currentY += 20 * scale;
  if (order.photos && order.photos.length > 0) {
    const thumbSize = 100 * scale;
    const gap = 10 * scale;
    for (let i = 0; i < order.photos.length; i++) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = order.photos[i];
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        ctx.drawImage(img, 25 * scale + (i % 3 * (thumbSize + gap)), currentY + (Math.floor(i / 3) * (thumbSize + gap)), thumbSize, thumbSize);
      } catch (e) {
        console.warn('Erro ao desenhar foto de entrada:', e);
      }
    }
    currentY += (Math.ceil(order.photos.length / 3) * (thumbSize + gap)) + 15 * scale;
  } else {
    ctx.font = `500 ${8 * scale}px "Inter", sans-serif`;
    ctx.fillText("Nenhuma foto anexada.", 25 * scale, currentY);
    currentY += 15 * scale;
  }

  // Fotos de Saída
  if (order.status === 'Concluído' || order.status === 'Entregue') {
    currentY = drawSeparator(currentY);
    ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
    ctx.fillText("FOTOS DO SERVIÇO PRONTO", 25 * scale, currentY);
    currentY += 20 * scale;
    if (order.finishedPhotos && order.finishedPhotos.length > 0) {
      const thumbSize = 100 * scale;
      const gap = 10 * scale;
      for (let i = 0; i < order.finishedPhotos.length; i++) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = order.finishedPhotos[i];
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          ctx.drawImage(img, 25 * scale + (i % 3 * (thumbSize + gap)), currentY + (Math.floor(i / 3) * (thumbSize + gap)), thumbSize, thumbSize);
        } catch (e) {
          console.warn('Erro ao desenhar foto de saída:', e);
        }
      }
      currentY += (Math.ceil(order.finishedPhotos.length / 3) * (thumbSize + gap)) + 15 * scale;
    } else {
      ctx.font = `500 ${8 * scale}px "Inter", sans-serif`;
      ctx.fillText("Nenhuma foto de saída.", 25 * scale, currentY);
      currentY += 15 * scale;
    }
  }

  // 5. Totalizador
  currentY = drawSeparator(currentY);
  currentY += 10 * scale;
  ctx.font = `900 ${12 * scale}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText("TOTAL DO SERVIÇO", width / 2, currentY);
  currentY += 22 * scale;
  ctx.font = `900 ${22 * scale}px "Inter", sans-serif`;
  ctx.fillText(formatCurrency(order.total || 0), width / 2, currentY);
  currentY += 40 * scale;

  if (order.paymentMethod) {
    ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    const methodText = order.paymentMethod === 'Cartão' && order.paymentInstallments && order.paymentInstallments > 1
      ? `PAGAMENTO: CARTÃO DE CRÉDITO (${order.paymentInstallments}X)`
      : `PAGAMENTO: ${order.paymentMethod.toUpperCase()}`;
    ctx.fillText(methodText, width / 2, currentY);
    currentY += 20 * scale;
  }

  currentY = drawSeparator(currentY);

  // 6. Garantia e Rodapé
  ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText("TERMO DE GARANTIA", 25 * scale, currentY);
  currentY += 18 * scale;
  const rawWarranty = settings?.pdfWarrantyText || 'Garantia legal conforme CDC para serviços realizados.';
  const cleanWarranty = rawWarranty.replace(/\[\/?(B|C|J|COLOR.*?|U)\]/g, '');
  currentY = wrapText(cleanWarranty, 25 * scale, currentY, width - 50 * scale, 12 * scale, false, '#666');

  currentY += 30 * scale;

  // 6.3 CARIMBO / SELO DE APROVAÇÃO DIGITAL DO CLIENTE
  if (order.digitalApproval?.approved) {
    const approval = order.digitalApproval;
    const stampWidth = 330 * scale;
    const stampHeight = 125 * scale;
    const centerX = width / 2;
    const stampX = centerX - stampWidth / 2;
    const stampY = currentY;

    ctx.save();
    // Leve rotação de -1.5 graus para efeito realista de carimbo autêntico
    ctx.translate(centerX, stampY + stampHeight / 2);
    ctx.rotate(-0.025);
    ctx.translate(-centerX, -(stampY + stampHeight / 2));

    // Fundo do carimbo
    ctx.fillStyle = '#F0FDF4';
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(stampX, stampY, stampWidth, stampHeight, 10 * scale);
    } else {
      ctx.rect(stampX, stampY, stampWidth, stampHeight);
    }
    ctx.fill();

    // Borda externa sólida verde
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = '#059669';
    ctx.stroke();

    // Borda interna pontilhada
    ctx.lineWidth = 1 * scale;
    ctx.strokeStyle = '#10B981';
    ctx.setLineDash([4 * scale, 2 * scale]);
    ctx.strokeRect(stampX + 4 * scale, stampY + 4 * scale, stampWidth - 8 * scale, stampHeight - 8 * scale);
    ctx.setLineDash([]);

    // Título do carimbo
    ctx.fillStyle = '#047857';
    ctx.textAlign = 'center';
    ctx.font = `900 ${8.5 * scale}px "Inter", sans-serif`;
    ctx.fillText('★ APROVAÇÃO DIGITAL DO CLIENTE ★', centerX, stampY + 18 * scale);

    ctx.font = `900 ${11 * scale}px "Inter", sans-serif`;
    ctx.fillText('SERVIÇO CONFIRMADO ONLINE', centerX, stampY + 34 * scale);

    // Linha divisória
    ctx.strokeStyle = '#A7F3D0';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(stampX + 16 * scale, stampY + 41 * scale);
    ctx.lineTo(stampX + stampWidth - 16 * scale, stampY + 41 * scale);
    ctx.stroke();

    // Dados auditados da aprovação
    ctx.font = `700 ${7.5 * scale}px "Inter", sans-serif`;
    ctx.fillStyle = '#065F46';
    ctx.textAlign = 'left';

    const leftX = stampX + 16 * scale;
    let lineY = stampY + 54 * scale;
    const gap = 13 * scale;

    ctx.fillText(`• DATA/HORA: ${approval.formattedDate || new Date().toLocaleString('pt-BR')}`, leftX, lineY);
    lineY += gap;

    const deviceText = (approval.deviceModel || approval.deviceInfo || 'Celular do Cliente').substring(0, 48);
    ctx.fillText(`• DISPOSITIVO: ${deviceText}`, leftX, lineY);
    lineY += gap;

    const ipText = approval.ip ? `IP: ${approval.ip}` : 'IP REGISTRADO';
    const imeiText = approval.imei ? ` | IMEI: ${approval.imei}` : '';
    ctx.fillText(`• CONEXÃO: ${ipText}${imeiText}`, leftX, lineY);
    lineY += gap;

    ctx.font = `900 ${7.5 * scale}px "Inter", sans-serif`;
    ctx.fillStyle = '#047857';
    const hashText = approval.signatureHash || 'VALIDADO';
    ctx.fillText(`• AUTENTICIDADE: ${hashText} (ASSINATURA ELETRÔNICA VÁLIDA)`, leftX, lineY);

    ctx.restore();

    currentY = stampY + stampHeight + 25 * scale;
  }

  // 6.5 Assinatura
  if (order.signature) {
    try {
      ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText("ASSINATURA DO CLIENTE", width / 2, currentY);
      currentY += 10 * scale;
      const sigImg = new Image();
      sigImg.crossOrigin = 'anonymous';
      sigImg.src = order.signature;
      await new Promise((resolve) => {
        sigImg.onload = resolve;
        sigImg.onerror = resolve;
      });
      const sigWidth = 200 * scale;
      const sigHeight = 64 * scale;
      ctx.drawImage(sigImg, (width - sigWidth) / 2, currentY, sigWidth, sigHeight);
      currentY += sigHeight + 20 * scale;
    } catch (e) {
      console.warn('Erro ao desenhar assinatura:', e);
    }
  }

  ctx.font = `900 ${10 * scale}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText("OBRIGADO PELA PREFERÊNCIA!", width / 2, currentY);

  // Processamento final do canvas recortado
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = currentY + 80 * scale;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) {
    throw new Error('Não foi possível criar o canvas final recortado.');
  }

  finalCtx.drawImage(canvas, 0, 0);

  const fileName = `OS_${order.id || 'comprovante'}.jpg`;
  const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);

  const blob: Blob = await new Promise((resolve, reject) => {
    finalCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Erro ao converter canvas em Blob'));
    }, 'image/jpeg', 0.92);
  });

  const file = new File([blob], fileName, { type: 'image/jpeg' });

  return {
    dataUrl,
    blob,
    file
  };
}

/**
 * Compartilha ou envia a imagem do comprovante direto para o WhatsApp ou Share sheet
 */
export async function shareReceiptDirectly(
  order: ServiceOrder,
  settings: AppSettings
): Promise<{ method: 'copied-whatsapp' | 'download-whatsapp' | 'android-bridge' }> {
  const { dataUrl } = await generateReceiptCanvasImage(order, settings);
  const normalizedPhone = normalizeWhatsAppNumber(order.phoneNumber);
  const fileName = `OS_${order.id || 'comprovante'}.jpg`;
  const trackingToken = order.trackingToken || order.id;
  const trackingUrl = getTrackingUrl(trackingToken, settings);
  const storeName = settings?.storeName || 'Assistência Técnica';
  const osCode = order.id ? `#${order.id.split('-')[0]}` : '';

  // 1. AndroidBridge (se for aplicativo nativo instalado)
  if ((window as any).AndroidBridge?.shareFile) {
    (window as any).AndroidBridge.shareFile(dataUrl.split(',')[1], fileName, 'image/jpeg');
    return { method: 'android-bridge' };
  }

  // 2. Tenta copiar imagem para a Área de Transferência (para colar com Ctrl+V diretamente no chat do WhatsApp)
  let copiedToClipboard = false;
  try {
    if (navigator.clipboard && (window as any).ClipboardItem) {
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          c.toBlob(resolve, 'image/png');
        };
        img.src = dataUrl;
      });

      if (pngBlob) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': pngBlob })
        ]);
        copiedToClipboard = true;
      }
    }
  } catch (clipErr) {
    console.warn('Clipboard write image failed:', clipErr);
  }

  // 3. Baixa o arquivo para o dispositivo automaticamente
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (dlErr) {
    console.warn('Download receipt failed:', dlErr);
  }

  // 4. Mensagem do WhatsApp organizada, bonita e com formatação profissional
  const customerName = (order.customerName || 'Cliente').trim();
  const device = [order.deviceBrand, order.deviceModel].filter(Boolean).join(' ').trim() || 'Aparelho';
  const defect = (order.defect || '').trim();
  const totalStr = order.total && order.total > 0 ? formatCurrency(order.total) : '';

  const detailsList: string[] = [
    `🔹 *O.S.:* ${osCode}`,
    `🔹 *Aparelho:* ${device}`,
  ];
  if (defect) {
    detailsList.push(`🔹 *Defeito Relatado:* ${defect}`);
  }
  if (totalStr) {
    detailsList.push(`🔹 *Valor Total:* ${totalStr}`);
  }
  detailsList.push(`🔹 *Status Atual:* ${order.status || 'Recebido'}`);

  const messageText = 
    `*${storeName.toUpperCase()}* 🛠️\n` +
    `🧾 *COMPROVANTE DE ORDEM DE SERVIÇO ${osCode}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Olá, *${customerName}*! Tudo bem? 👋\n\n` +
    `Confirmamos o recebimento do seu equipamento em nossa assistência. Seguem os dados principais do atendimento:\n\n` +
    `📋 *RESUMO DO SERVIÇO:*\n` +
    detailsList.join('\n') + `\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📸 *FOTO DO COMPROVANTE:*\n` +
    `O comprovante oficial com dados da ordem e termos foi gerado e baixado no aparelho. Ele também foi copiado para a Área de Transferência (você pode colar com *Ctrl + V* ou anexar a imagem salva nesta conversa).\n\n` +
    `🌐 *ACOMPANHAMENTO EM TEMPO REAL:*\n` +
    `Você pode acompanhar fotos, laudos técnicos e o andamento do reparo a qualquer momento pelo link exclusivo:\n` +
    `👉 ${trackingUrl}\n\n` +
    `Agradecemos a confiança! Qualquer dúvida, estamos à disposição por aqui. 🤝`;

  // 5. Abre a conversa DIRETAMENTE no WhatsApp do cliente
  const directUrl = getWhatsAppDirectUrl(normalizedPhone, messageText);
  window.open(directUrl, '_blank');

  return { method: copiedToClipboard ? 'copied-whatsapp' : 'download-whatsapp' };
}
