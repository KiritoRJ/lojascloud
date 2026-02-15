
import React, { useState, useRef } from 'react';
import { Plus, Search, Trash2, ChevronRight, Camera, X, Eye, Loader2, DollarSign } from 'lucide-react';
import { ServiceOrder, AppSettings } from '../types';
import { formatCurrency, parseCurrencyString, formatDate } from '../utils';

interface Props {
  orders: ServiceOrder[];
  setOrders: (orders: ServiceOrder[]) => void;
  settings: AppSettings;
}

const ServiceOrderTab: React.FC<Props> = ({ orders, setOrders, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [formData, setFormData] = useState<Partial<ServiceOrder>>({
    customerName: '',
    phoneNumber: '',
    address: '',
    deviceBrand: '',
    deviceModel: '',
    defect: '',
    repairDetails: '',
    partsCost: 0,
    serviceCost: 0,
    status: 'Pendente',
    photos: [],
    finishedPhotos: []
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'partsCost' || name === 'serviceCost') {
      const numericValue = parseCurrencyString(value);
      setFormData(prev => {
        const updated = { ...prev, [name]: numericValue };
        const total = (updated.partsCost || 0) + (updated.serviceCost || 0);
        return { ...updated, total };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 700; 
        const MAX_HEIGHT = 700;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photos' | 'finishedPhotos') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const compressed = await new Promise<string>((resolve) => {
        reader.onloadend = async () => {
          const result = await compressImage(reader.result as string);
          resolve(result);
        };
        reader.readAsDataURL(file);
      });
      newPhotos.push(compressed);
    }

    setFormData(prev => ({ 
      ...prev, 
      [field]: [...(prev[field] || []), ...newPhotos] 
    }));
    setIsCompressing(false);
  };

  const removePhoto = (index: number, field: 'photos' | 'finishedPhotos') => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    if (!formData.customerName || !formData.deviceModel) {
      alert('Dados obrigatórios faltando.');
      return;
    }

    setIsSaving(true);
    setIsModalOpen(false); 

    setTimeout(() => {
      const currentData = { ...formData };
      let newOrdersList: ServiceOrder[];

      if (editingOrder) {
        newOrdersList = orders.map(o => o.id === editingOrder.id ? { ...o, ...currentData } as ServiceOrder : o);
      } else {
        const newOrder: ServiceOrder = {
          ...currentData,
          id: Math.random().toString(36).substr(2, 6).toUpperCase(),
          date: new Date().toISOString(),
          total: (currentData.partsCost || 0) + (currentData.serviceCost || 0),
        } as ServiceOrder;
        newOrdersList = [newOrder, ...orders];
      }

      setOrders(newOrdersList);
      resetForm();
      setIsSaving(false);
      alert('Ordem de Serviço salva!');
    }, 150);
  };

  const resetForm = () => {
    setEditingOrder(null);
    setFormData({ 
      customerName: '', 
      phoneNumber: '', 
      address: '', 
      deviceBrand: '', 
      deviceModel: '', 
      defect: '', 
      repairDetails: '', 
      partsCost: 0, 
      serviceCost: 0, 
      status: 'Pendente', 
      photos: [], 
      finishedPhotos: [] 
    });
  };

  const closeModal = () => {
    if (isSaving || isCompressing) return;
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (order: ServiceOrder) => {
    setEditingOrder(order);
    setFormData(order);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir O.S.?')) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  // FUNÇÃO OTIMIZADA PARA GERAR IMAGEM (JPEG) EM VEZ DE PDF
  const generateReceiptImage = (order: ServiceOrder) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurações do Recibo (Escala 2x para nitidez)
    const scale = 2;
    const width = 400 * scale;
    const height = 750 * scale; 
    canvas.width = width;
    canvas.height = height;

    // Fundo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Texto Centralizado
    const drawText = (text: string, y: number, fontSize: number, bold: boolean = false) => {
      ctx.fillStyle = '#000000';
      ctx.font = `${bold ? '900' : '500'} ${fontSize * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(text, width / 2, y * scale);
    };

    // Texto Alinhado Esquerda/Direita
    const drawRow = (left: string, right: string, y: number, fontSize: number, bold: boolean = false) => {
      ctx.fillStyle = '#000000';
      ctx.font = `${bold ? '800' : '400'} ${fontSize * scale}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText(left, 20 * scale, y * scale);
      ctx.textAlign = 'right';
      ctx.fillText(right, (width - 20 * scale), y * scale);
    };

    // Cabeçalho
    drawText(settings.storeName.toUpperCase(), 40, 18, true);
    drawText(`RECIBO DE SERVIÇO #${order.id}`, 65, 12, true);
    
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(20 * scale, 75 * scale);
    ctx.lineTo((width - 20 * scale), 75 * scale);
    ctx.stroke();

    // Dados do Cliente
    ctx.textAlign = 'left';
    ctx.font = `bold ${10 * scale}px Arial`;
    ctx.fillText('CLIENTE:', 20 * scale, 95 * scale);
    ctx.font = `${10 * scale}px Arial`;
    ctx.fillText(order.customerName.toUpperCase(), 20 * scale, 110 * scale);
    ctx.fillText(`FONE: ${order.phoneNumber || 'N/A'}`, 20 * scale, 125 * scale);
    ctx.fillText(`DATA: ${formatDate(order.date)}`, 20 * scale, 140 * scale);

    // Equipamento
    ctx.font = `bold ${10 * scale}px Arial`;
    ctx.fillText('EQUIPAMENTO:', 20 * scale, 170 * scale);
    ctx.font = `${10 * scale}px Arial`;
    ctx.fillText(`${order.deviceBrand} ${order.deviceModel}`.toUpperCase(), 20 * scale, 185 * scale);

    // Detalhes Financeiros
    let y = 230;
    ctx.beginPath();
    ctx.moveTo(20 * scale, (y - 15) * scale);
    ctx.lineTo((width - 20 * scale), (y - 15) * scale);
    ctx.stroke();

    drawRow('CUSTO DE PEÇAS', formatCurrency(order.partsCost || 0), y, 11);
    y += 15;
    drawRow('MÃO DE OBRA', formatCurrency(order.serviceCost || 0), y, 11);
    
    y += 25;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(15 * scale, (y - 15) * scale, (width - 30 * scale), 30 * scale);
    drawRow('VALOR TOTAL', formatCurrency(order.total), y + 5, 14, true);

    // Garantia
    y += 60;
    drawText('TERMOS DE GARANTIA', y, 9, true);
    y += 15;
    ctx.textAlign = 'left';
    ctx.font = `${8 * scale}px Arial`;
    const lines = settings.pdfWarrantyText.split('\n').slice(0, 10); // Pega as primeiras linhas para não estourar
    lines.forEach(line => {
      ctx.fillText(line, 20 * scale, y * scale);
      y += 10;
    });

    // Converter para Base64 JPEG (Qualidade 0.8 para compressão)
    const jpegData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    const fileName = `Recibo_${order.id}.jpg`;

    if ((window as any).AndroidBridge) {
      (window as any).AndroidBridge.shareFile(jpegData, fileName, 'image/jpeg');
    } else {
      // Fallback para navegador desktop
      const link = document.createElement('a');
      link.download = fileName;
      link.href = `data:image/jpeg;base64,${jpegData}`;
      link.click();
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.deviceModel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">O.S.</h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }} 
          className="bg-blue-600 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md active:scale-95 text-xs"
        >
          <Plus size={16} /> Nova O.S.
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="grid gap-2">
        {filteredOrders.length > 0 ? filteredOrders.map(order => (
          <div key={order.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm space-y-2 animate-in fade-in duration-300">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate uppercase text-xs">{order.customerName}</h3>
                <p className="text-[10px] text-slate-500 font-medium truncate">{order.deviceBrand} {order.deviceModel}</p>
                <div className="flex items-center gap-2 mt-0.5">
                   <span className="text-[9px] text-blue-600 font-bold uppercase">#{order.id}</span>
                   <span className="text-[9px] text-slate-400">• {formatDate(order.date)}</span>
                </div>
              </div>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-widest ${order.status === 'Concluído' ? 'bg-green-100 text-green-700' : order.status === 'Entregue' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {order.status}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => handleEdit(order)} className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-lg text-[9px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 border border-slate-100">
                <ChevronRight size={12} /> Info
              </button>
              <button onClick={() => generateReceiptImage(order)} className="flex-[2] bg-blue-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md active:scale-95">
                <Eye size={12} /> Recibo
              </button>
              <button onClick={() => handleDelete(order.id)} className="p-2 text-red-500 bg-red-50 rounded-lg active:scale-90 border border-red-100">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Vazio</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">{editingOrder ? 'Editar O.S.' : 'Nova O.S.'}</h3>
              <button onClick={closeModal} className="p-1.5 text-slate-400 bg-slate-50 rounded-full"><X size={18} /></button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação</label>
                <input name="customerName" value={formData.customerName} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase text-xs" placeholder="Nome do Cliente" />
                <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs" placeholder="WhatsApp" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <input name="deviceBrand" value={formData.deviceBrand} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold uppercase text-xs" placeholder="Marca" />
                  <input name="deviceModel" value={formData.deviceModel} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold uppercase text-xs" placeholder="Modelo" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Serviço</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs">
                  <option value="Pendente">Aguardando Análise</option>
                  <option value="Concluído">Pronto / Concluído</option>
                  <option value="Entregue">Entregue</option>
                </select>
                <textarea name="defect" value={formData.defect} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold uppercase text-xs" placeholder="Defeito relatado..." rows={2} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Custos e Orçamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Custo da Peça</span>
                    <input 
                      name="partsCost" 
                      value={formatCurrency(formData.partsCost || 0).replace('R$', '').trim()} 
                      onChange={handleInputChange}
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-right text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Mão de Obra</span>
                    <input 
                      name="serviceCost" 
                      value={formatCurrency(formData.serviceCost || 0).replace('R$', '').trim()} 
                      onChange={handleInputChange}
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-right text-blue-600 text-xs" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-900 p-3.5 rounded-xl flex justify-between items-center text-white">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total</span>
                <p className="text-lg font-black text-blue-400">{formatCurrency((formData.partsCost || 0) + (formData.serviceCost || 0))}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidências (Fotos)</label>
                {isCompressing && (
                  <div className="flex items-center gap-1.5 text-blue-600 text-[8px] font-black animate-pulse uppercase">
                    <Loader2 className="animate-spin" size={10} /> Otimizando...
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    type="button"
                    disabled={isCompressing}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*';
                      input.onchange = (e: any) => handlePhotoUpload(e, 'photos');
                      input.click();
                    }} 
                    className={`aspect-square border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 transition-all ${isCompressing ? 'opacity-50' : 'active:scale-95'}`}
                  >
                    <Camera size={20} />
                  </button>
                  {formData.photos?.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                      <img src={p} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, 'photos')} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-md"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex gap-2 sticky bottom-0">
              <button 
                onClick={closeModal} 
                className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl font-black text-slate-400 uppercase text-[9px] tracking-widest active:scale-95"
              >
                Voltar
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || isCompressing}
                className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:bg-blue-400"
              >
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Salvar O.S.'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderTab;
