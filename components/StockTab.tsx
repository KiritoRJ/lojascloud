
import React, { useState, useRef } from 'react';
import { Plus, Search, Trash2, Camera, X, PackageOpen, AlertTriangle, TrendingUp, PiggyBank, Edit3, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, parseCurrencyString } from '../utils';

interface Props {
  products: Product[];
  setProducts: (products: Product[]) => void;
}

const StockTab: React.FC<Props> = ({ products, setProducts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    costPrice: 0,
    salePrice: 0,
    quantity: 0,
    photo: null
  });

  const totalStockInvestment = products.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
  const totalPotentialProfit = products.reduce((acc, p) => acc + ((p.salePrice - p.costPrice) * p.quantity), 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'costPrice' || name === 'salePrice') {
      setFormData(prev => ({ ...prev, [name]: parseCurrencyString(value) }));
    } else if (name === 'quantity') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
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
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, photo: compressed }));
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.name) return alert('Nome é obrigatório.');

    setIsSaving(true);
    setIsModalOpen(false);

    setTimeout(() => {
      let newProductsList: Product[];

      if (editingProduct) {
        newProductsList = products.map(p => p.id === editingProduct.id ? { ...p, ...formData } as Product : p);
      } else {
        const newProduct: Product = {
          ...formData,
          id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        } as Product;
        newProductsList = [newProduct, ...products];
      }

      setProducts(newProductsList);
      resetForm();
      setIsSaving(false);
      alert('Produto salvo!');
    }, 150);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', costPrice: 0, salePrice: 0, quantity: 0, photo: null });
  };

  const closeModal = () => {
    if (isSaving || isCompressing) return;
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir este produto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Estoque</h2>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-blue-600 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md active:scale-95 text-xs">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
            <PiggyBank size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest truncate">Custo</p>
            <p className="text-xs font-black text-slate-800 truncate">{formatCurrency(totalStockInvestment)}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest truncate">Lucro</p>
            <p className="text-xs font-black text-emerald-600 truncate">{formatCurrency(totalPotentialProfit)}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input 
          type="text" placeholder="Buscar..." 
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-xs font-medium"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.length > 0 ? (
          filtered.map(product => (
            <div key={product.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col animate-in fade-in duration-300">
              <div className="h-24 bg-slate-50 relative">
                {product.photo ? (
                  <img src={product.photo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <PackageOpen size={24} />
                  </div>
                )}
                
                <div className="absolute top-1 right-1 flex flex-col gap-1">
                  <button onClick={() => handleEdit(product)} className="bg-white/90 p-1 rounded-md text-slate-600 shadow-sm"><Edit3 size={10} /></button>
                  <button onClick={() => handleDelete(product.id)} className="bg-white/90 p-1 rounded-md text-red-400 shadow-sm"><Trash2 size={10} /></button>
                </div>

                <div className="absolute bottom-1 left-1">
                  <span className={`px-1 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest text-white shadow-sm ${product.quantity <= 3 ? 'bg-red-500 animate-pulse' : 'bg-slate-900'}`}>
                    QTD: {product.quantity}
                  </span>
                </div>
              </div>
              
              <div className="p-2 flex flex-col flex-1">
                <h3 className="font-bold text-slate-800 text-[9px] line-clamp-1 mb-0.5 uppercase leading-tight">{product.name}</h3>
                <p className="text-[11px] font-black text-blue-600 mt-auto">{formatCurrency(product.salePrice)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-300 font-black uppercase tracking-widest text-[8px]">Sem produtos</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar' : 'Novo Produto'}</h3>
              <button onClick={closeModal} className="text-slate-400 p-1.5 bg-slate-50 rounded-full"><X size={18} /></button>
            </div>
            
            <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-dashed border-slate-200 relative cursor-pointer" 
                  onClick={() => !isCompressing && fileInputRef.current?.click()}
                >
                  {isCompressing ? (
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                  ) : formData.photo ? (
                    <img src={formData.photo} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={20} className="text-slate-200" />
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold uppercase text-xs" placeholder="Nome do item" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo</label>
                  <input 
                    name="costPrice" 
                    value={formatCurrency(formData.costPrice || 0).replace('R$', '').trim()} 
                    onChange={handleInputChange}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-right font-black outline-none text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Venda</label>
                  <input 
                    name="salePrice" 
                    value={formatCurrency(formData.salePrice || 0).replace('R$', '').trim()} 
                    onChange={handleInputChange}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-right font-black text-blue-600 outline-none text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estoque</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs" />
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 flex gap-2 border-t border-slate-100">
              <button onClick={closeModal} className="flex-1 py-2.5 font-bold text-slate-400 bg-white border border-slate-200 rounded-xl uppercase text-[9px]">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving || isCompressing} className="flex-1 py-2.5 font-black text-white bg-blue-600 rounded-xl shadow-sm flex items-center justify-center gap-1.5 uppercase text-[9px] tracking-widest">
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTab;
