
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
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        resolve(canvas.toDataURL('image/jpeg', 0.6));
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
    if (!formData.name) return alert('O nome do produto é obrigatório.');

    // 1. UI FIRST: Fechamento imediato
    setIsSaving(true);
    setIsModalOpen(false);

    // 2. BACKGROUND PROCESSING: Processamento de dados pesados após o fechamento visual
    setTimeout(() => {
      let newProductsList: Product[];

      if (editingProduct) {
        newProductsList = products.map(p => p.id === editingProduct.id ? { ...p, ...formData } as Product : p);
      } else {
        const newProduct: Product = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
        } as Product;
        newProductsList = [newProduct, ...products];
      }

      setProducts(newProductsList);
      resetForm();
      setIsSaving(false);
      alert('Produto salvo com sucesso!');
    }, 100);
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
    if (confirm('Excluir este produto do estoque?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Estoque</h2>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black shadow-lg shadow-blue-100 active:scale-95 transition-all text-xs uppercase tracking-widest">
          <Plus size={20} /> Adicionar Produto
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-[1.25rem] flex items-center justify-center shrink-0">
            <PiggyBank size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate mb-0.5">Investimento</p>
            <p className="text-lg font-black text-slate-800 truncate leading-none">{formatCurrency(totalStockInvestment)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate mb-0.5">Lucro Bruto</p>
            <p className="text-lg font-black text-emerald-600 truncate leading-none">{formatCurrency(totalPotentialProfit)}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" placeholder="Buscar no catálogo..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm font-bold"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.length > 0 ? (
          filtered.map(product => (
            <div key={product.id} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col animate-in fade-in duration-300">
              <div className="h-40 bg-slate-50 relative group">
                {product.photo ? (
                  <img src={product.photo} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <PackageOpen size={48} />
                  </div>
                )}
                
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(product)} className="bg-white/90 p-2 rounded-xl text-slate-600 hover:text-blue-600 shadow-xl backdrop-blur-sm">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="bg-white/90 p-2 rounded-xl text-slate-400 hover:text-red-600 shadow-xl backdrop-blur-sm">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 flex gap-1">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-md ${product.quantity <= 3 ? 'bg-red-500 animate-pulse' : 'bg-slate-900'}`}>
                    QTD: {product.quantity}
                  </span>
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-black text-slate-800 text-xs line-clamp-2 mb-2 uppercase tracking-tight leading-tight h-8">{product.name}</h3>
                <div className="mt-auto pt-2 border-t border-slate-50">
                  <p className="text-lg font-black text-blue-600 truncate">{formatCurrency(product.salePrice)}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-32 bg-white rounded-[4rem] border border-dashed border-slate-200">
            <PackageOpen className="mx-auto text-slate-100 mb-4" size={80} />
            <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">Catálogo Vazio</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar Item' : 'Novo Produto'}</h3>
              <button onClick={closeModal} className="text-slate-400 p-3 bg-slate-50 rounded-full active:scale-90"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="w-32 h-32 bg-slate-50 rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-dashed border-slate-100 relative group cursor-pointer active:scale-95 transition-transform" 
                  onClick={() => !isCompressing && fileInputRef.current?.click()}
                >
                  {isCompressing ? (
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                  ) : formData.photo ? (
                    <img src={formData.photo} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={40} className="text-slate-200" />
                  )}
                </div>
                <button 
                  type="button" 
                  disabled={isCompressing}
                  onClick={() => fileInputRef.current?.click()} 
                  className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]"
                >
                  {isCompressing ? 'Otimizando...' : 'Selecionar Foto'}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descrição Comercial</label>
                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase" placeholder="Ex: Frontal iPhone 11 Original" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Preço Custo</label>
                  <input name="costPrice" value={formatCurrency(formData.costPrice || 0).replace('R$', '').trim()} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-right font-black outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Preço Venda</label>
                  <input name="salePrice" value={formatCurrency(formData.salePrice || 0).replace('R$', '').trim()} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-right font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Estoque Atual</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 flex gap-4 border-t border-slate-100">
              <button onClick={closeModal} disabled={isSaving || isCompressing} className="flex-1 py-5 font-black text-slate-400 bg-white border border-slate-200 rounded-[1.5rem] uppercase text-xs active:scale-95 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving || isCompressing} className="flex-1 py-5 font-black text-white bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 transition-all uppercase text-xs tracking-widest">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTab;
