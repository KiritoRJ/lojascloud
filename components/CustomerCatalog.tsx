import React, { useState, useEffect } from 'react';
import { Package, Search, ShoppingBag, MessageCircle, ArrowLeft, Loader2, Image as ImageIcon, Tag } from 'lucide-react';
import { Product, AppSettings } from '../types';
import { OnlineDB } from '../utils/api';

interface CustomerCatalogProps {
  tenantId?: string | null;
  catalogSlug?: string | null;
}

const CustomerCatalog: React.FC<CustomerCatalogProps> = ({ tenantId, catalogSlug }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        let activeTenantId = tenantId;
        
        if (catalogSlug) {
          activeTenantId = await OnlineDB.getTenantIdBySlug(catalogSlug);
        }
        
        if (activeTenantId) {
          const data = await OnlineDB.getPublicCatalog(activeTenantId);
          if (data) {
            setSettings(data.settings);
            setProducts(data.products.filter(p => p.quantity > 0)); // Only show in-stock items
          }
        }
      } catch (e) {
        console.error("Erro ao carregar catálogo:", e);
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, [tenantId, catalogSlug]);

  const handleWhatsAppClick = (product: Product) => {
    if (!settings?.storePhone) {
      alert("O lojista não configurou um número de WhatsApp.");
      return;
    }
    const phone = settings.storePhone.replace(/\D/g, '');
    const price = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.salePrice;
    const message = encodeURIComponent(`Olá! Tenho interesse no produto *${product.name}* (R$ ${price.toFixed(2).replace('.', ',')}). Ainda está disponível?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando Catálogo...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Package size={64} className="text-slate-300 mb-6" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Loja não encontrada</h1>
        <p className="text-slate-500 font-medium">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (selectedProduct) {
    const allPhotos = [selectedProduct.photo, ...(selectedProduct.additionalPhotos || [])].filter(Boolean) as string[];
    const currentPrice = selectedProduct.isPromotion && selectedProduct.promotionalPrice ? selectedProduct.promotionalPrice : selectedProduct.salePrice;

    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24">
        <header className="bg-white sticky top-0 z-50 border-b border-slate-100 px-4 py-4 flex items-center gap-4 shadow-sm">
          <button onClick={() => { setSelectedProduct(null); setActivePhotoIndex(0); }} className="p-2 bg-slate-50 rounded-full text-slate-600 active:scale-90 transition-all">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate flex-1">{selectedProduct.name}</h1>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-6">
          <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
            <div className="aspect-square bg-slate-50 relative flex items-center justify-center">
              {allPhotos.length > 0 ? (
                <img src={allPhotos[activePhotoIndex]} className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={64} className="text-slate-200" />
              )}
              {selectedProduct.isPromotion && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                  <Tag size={12} /> Promoção
                </div>
              )}
            </div>
            {allPhotos.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto snap-x">
                {allPhotos.map((photo, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`w-16 h-16 shrink-0 rounded-xl border-2 overflow-hidden snap-center transition-all ${activePhotoIndex === idx ? 'border-blue-600 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={photo} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{selectedProduct.name}</h2>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-blue-600">R$ {currentPrice.toFixed(2).replace('.', ',')}</span>
                {selectedProduct.isPromotion && selectedProduct.promotionalPrice && (
                  <span className="text-sm font-bold text-slate-400 line-through">R$ {selectedProduct.salePrice.toFixed(2).replace('.', ',')}</span>
                )}
              </div>
            </div>

            {selectedProduct.description && (
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
              </div>
            )}
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={() => handleWhatsAppClick(selectedProduct)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <MessageCircle size={20} />
              Comprar pelo WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden">
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" /> : <ShoppingBag size={24} />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">{settings.storeName}</h1>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Catálogo Oficial</p>
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 sm:py-4 bg-slate-100 border-none rounded-2xl outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Nenhum produto encontrado</h2>
            <p className="text-slate-500 text-sm font-medium">Tente buscar por outro termo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map(product => {
              const currentPrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.salePrice;
              return (
                <div 
                  key={product.id} 
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="aspect-square bg-slate-50 relative flex items-center justify-center overflow-hidden">
                    {product.photo ? (
                      <img src={product.photo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageIcon size={32} className="text-slate-200" />
                    )}
                    {product.isPromotion && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                        <Tag size={10} /> Promo
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <h3 className="font-black text-slate-800 text-xs sm:text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                    <div className="mt-auto">
                      {product.isPromotion && product.promotionalPrice && (
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 line-through mb-0.5">R$ {product.salePrice.toFixed(2).replace('.', ',')}</p>
                      )}
                      <p className="font-black text-blue-600 text-sm sm:text-base">R$ {currentPrice.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerCatalog;
