
import React, { useState, useRef } from 'react';
import { Plus, Search, Trash2, ChevronRight, Camera, X, Eye, Loader2 } from 'lucide-react';
import { ServiceOrder, AppSettings } from '../types';
import { formatCurrency, parseCurrencyString, formatDate } from '../utils';
import { jsPDF } from 'jspdf';

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
        return { ...updated, total: (updated.partsCost || 0) + (updated.serviceCost || 0) };
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
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
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
        // Qualidade 0.6 para garantir leveza em WebViews de celulares modestos
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        resolve(compressedBase64);
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
      alert('Preencha os dados obrigatórios.');
      return;
    }

    // 1. INÍCIO DO PROCESSO: UI First
    setIsSaving(true);
    setIsModalOpen(false); // Fecha o modal imediatamente para resposta visual instantânea

    // 2. AGENDAMENTO: Deixamos o processamento pesado para depois que o modal sumiu
    setTimeout(() => {
      const currentData = { ...formData };
      let newOrdersList: ServiceOrder[];

      if (editingOrder) {
        newOrdersList = orders.map(o => o.id === editingOrder.id ? { ...o, ...currentData } as ServiceOrder : o);
      } else {
        const newOrder: ServiceOrder = {
          ...currentData,
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          total: (currentData.partsCost || 0) + (currentData.serviceCost || 0),
        } as ServiceOrder;
        newOrdersList = [newOrder, ...orders];
      }

      setOrders(newOrdersList);
      resetForm();
      setIsSaving(false);
      
      // Feedback de sucesso (alert nativo é mais confiável em WebView para travar a atenção)
      alert('Sucesso: Ordem de Serviço salva!');
    }, 100);
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
    if (confirm('Deseja realmente excluir?')) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const generatePDF = (order: ServiceOrder) => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [80, 150]
    });

    doc.setFontSize(10);
    doc.text(settings.storeName.toUpperCase(), 40, 10, { align: 'center' });
    doc.text(`ORDEM DE SERVIÇO #${order.id}`, 40, 15, { align: 'center' });
    doc.line(5, 18, 75, 18);
    
    doc.setFontSize(8);
    doc.text(`Cliente: ${order.customerName}`, 5, 25);
    doc.text(`Aparelho: ${order.deviceBrand} ${order.deviceModel}`, 5, 30);
    doc.text(`Status: ${order.status}`, 5, 35);
    doc.text(`Defeito: ${order.defect}`, 5, 45);
    doc.text(`Reparo: ${order.repairDetails || 'Em análise'}`, 5, 50);
    
    doc.setFontSize(10);
    doc.text(`TOTAL: ${formatCurrency(order.total)}`, 40, 70, { align: 'center' });
    
    doc.save(`OS_${order.id}.pdf`);
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.deviceModel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Ordens de Serviço</h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }} 
          className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          <Plus size={20} /> Nova O.S.
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar O.S. ou Cliente..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="grid gap-4">
        {filteredOrders.length > 0 ? filteredOrders.map(order => (
          <div key={order.id} className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 truncate uppercase tracking-tight">{order.customerName}</h3>
                <p className="text-xs text-slate-500 font-bold truncate">{order.deviceBrand} {order.deviceModel}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400 font-bold">{formatDate(order.date)}</span>
                  <span className="text-blue-600 font-black text-[10px] uppercase">#{order.id}</span>
                </div>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full shrink-0 uppercase tracking-widest ${order.status === 'Concluído' ? 'bg-green-100 text-green-700' : order.status === 'Entregue' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {order.status}
              </span>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => handleEdit(order)} className="flex-1 bg-slate-50 text-slate-600 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-slate-100">
                <ChevronRight size={16} /> Detalhes
              </button>
              <button onClick={() => generatePDF(order)} className="flex-[2] bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all">
                <Eye size={16} /> Visualizar Saída
              </button>
              <button onClick={() => handleDelete(order.id)} className="p-3.5 text-red-500 bg-red-50 rounded-2xl active:scale-90 transition-all border border-red-100">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Nenhuma O.S. encontrada</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="p-7 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{editingOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h3>
              <button onClick={closeModal} className="p-3 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full active:scale-90"><X size={24} /></button>
            </div>
            <div className="p-7 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Dados de Identificação</label>
                <input name="customerName" value={formData.customerName} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase" placeholder="Nome do Cliente" />
                <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="WhatsApp / Telefone" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Equipamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <input name="deviceBrand" value={formData.deviceBrand} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold uppercase" placeholder="Marca (Ex: Apple)" />
                  <input name="deviceModel" value={formData.deviceModel} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold uppercase" placeholder="Modelo (Ex: iPhone 13)" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Diagnóstico e Reparo</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                  <option value="Pendente">Aguardando Análise</option>
                  <option value="Concluído">Pronto para Retirada</option>
                  <option value="Entregue">Entregue ao Cliente</option>
                </select>
                <textarea name="defect" value={formData.defect} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold uppercase" placeholder="Defeito relatado pelo cliente..." rows={3} />
                <textarea name="repairDetails" value={formData.repairDetails} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold uppercase" placeholder="O que foi feito no aparelho?" rows={3} />
              </div>
              
              <div className="bg-slate-900 p-6 rounded-[2rem] flex justify-between items-center text-white shadow-xl">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Valor Total</span>
                  <p className="text-3xl font-black text-blue-500">{formatCurrency((formData.partsCost || 0) + (formData.serviceCost || 0))}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Anexos Fotográficos (Evidências)</label>
                {isCompressing && (
                  <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black animate-pulse uppercase tracking-widest">
                    <Loader2 className="animate-spin" size={14} /> Processando Imagens...
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3">
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
                    className={`aspect-square border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 transition-all ${isCompressing ? 'opacity-50' : 'hover:border-blue-500 active:scale-95'}`}
                  >
                    <Camera size={32} />
                  </button>
                  {formData.photos?.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-3xl overflow-hidden border border-slate-100 shadow-sm animate-in zoom-in-75">
                      <img src={p} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, 'photos')} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow-md active:scale-90"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-7 border-t border-slate-50 bg-slate-50/50 flex gap-4 sticky bottom-0">
              <button 
                onClick={closeModal} 
                disabled={isSaving || isCompressing}
                className="flex-1 bg-white border border-slate-200 py-5 rounded-[1.5rem] font-black text-slate-400 uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || isCompressing}
                className="flex-[2] bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-blue-400"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Ordem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderTab;
