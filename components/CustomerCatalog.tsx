import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, MessageCircle, ArrowLeft, Loader2, Image as ImageIcon, Tag, Share2, Star, ChevronDown, Home, FileText, User, PlayCircle, Heart, MoreVertical, Volume2, VolumeX, Plus } from 'lucide-react';
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
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
            setProducts(data.products.filter(p => p.quantity > 0));
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

  const handleScroll = () => {
    if (containerRef.current) {
      const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
      if (index !== activeProductIndex) {
        setActiveProductIndex(index);
      }
    }
  };

  const handleWhatsAppClick = (product: Product) => {
    if (!settings?.storePhone) {
      alert("O lojista não configurou um número de WhatsApp.");
      return;
    }
    const phone = settings.storePhone.replace(/\D/g, '');
    const price = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.salePrice;
    const message = encodeURIComponent(`Olá! Vi o produto *${product.name}* no seu catálogo e tenho interesse.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: settings?.storeName || 'Catálogo Online',
        text: 'Confira este produto incrível!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${videoId}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 size={48} className="animate-spin text-white mb-4" />
      </div>
    );
  }

  if (!settings || products.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <ShoppingBag size={64} className="text-zinc-700 mb-6" />
        <h1 className="text-xl font-bold mb-2">Nenhum produto encontrado</h1>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden relative font-sans">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
             {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800" />}
           </div>
           <span className="font-bold text-sm shadow-black drop-shadow-md">{settings.storeName}</span>
        </div>
        <button onClick={handleShare} className="p-2 bg-black/20 backdrop-blur-md rounded-full">
          <Share2 size={20} />
        </button>
      </div>

      {/* Feed Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar"
      >
        {products.map((product, index) => {
          const currentPrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.salePrice;
          const isActive = index === activeProductIndex;
          const hasVideo = !!product.videoUrl;

          return (
            <div key={product.id} className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-900">
              {/* Media Layer */}
              <div className="absolute inset-0 z-0">
                {hasVideo && isActive ? (
                  <iframe 
                    src={getEmbedUrl(product.videoUrl!)} 
                    className="w-full h-full object-cover pointer-events-none scale-[1.35]" // Scale to fill better
                    allow="autoplay; encrypted-media"
                  />
                ) : product.photo ? (
                  <img src={product.photo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <ImageIcon size={64} className="text-zinc-600" />
                  </div>
                )}
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90" />
              </div>

              {/* Right Sidebar Actions */}
              <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-6 items-center">
                <div className="flex flex-col items-center gap-1">
                  <button className="w-12 h-12 bg-zinc-800/50 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-all">
                    <Heart size={24} className="text-white" />
                  </button>
                  <span className="text-xs font-medium">Curtir</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <button className="w-12 h-12 bg-zinc-800/50 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-all">
                    <MessageCircle size={24} className="text-white" />
                  </button>
                  <span className="text-xs font-medium">Dúvidas</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => setIsMuted(!isMuted)} className="w-12 h-12 bg-zinc-800/50 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-all">
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                  <span className="text-xs font-medium">{isMuted ? 'Som' : 'Mudo'}</span>
                </div>
              </div>

              {/* Bottom Info Layer */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pb-24 z-20 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                   <div className="flex-1">
                      <h2 className="text-2xl font-bold leading-tight shadow-black drop-shadow-md mb-1">{product.name}</h2>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-emerald-400 drop-shadow-md">R$ {currentPrice.toFixed(2).replace('.', ',')}</span>
                        {product.isPromotion && product.promotionalPrice && (
                          <span className="text-sm text-white/60 line-through decoration-white/60">R$ {product.salePrice.toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>
                   </div>
                </div>

                <p className="text-sm text-white/80 line-clamp-2 leading-relaxed max-w-[80%]">
                  {product.description || 'Toque para ver mais detalhes...'}
                </p>

                <button 
                  onClick={() => handleWhatsAppClick(product)}
                  className="mt-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} />
                  Comprar Agora
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-black border-t border-zinc-800 py-3 px-6 flex justify-between items-center z-30">
        <button className="flex flex-col items-center gap-1 text-white">
          <Home size={24} />
          <span className="text-[10px] font-medium">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <Search size={24} />
          <span className="text-[10px] font-medium">Busca</span>
        </button>
        <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-red-500 rounded-lg flex items-center justify-center">
           <Plus size={20} className="text-white" />
        </div>
        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <MessageCircle size={24} />
          <span className="text-[10px] font-medium">Chat</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <User size={24} />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </div>
    </div>
  );
};

export default CustomerCatalog;
