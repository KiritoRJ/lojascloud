
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Camera, X, PackageOpen, TrendingUp, PiggyBank, Edit3, Loader2, AlertTriangle, ScanBarcode, AlertCircle, LayoutGrid, Grid, List, Maximize2, Rows, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Tag, FileText, Image as ImageIcon } from 'lucide-react';
import { Product, AppSettings } from '../types';
import { formatCurrency, parseCurrencyString, playBeepSound } from '../utils';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { analyzeProductImage } from '../utils/productAi';
import { OnlineDB } from '../utils/api';
import { AICreditsModal } from './AICreditsModal';

interface Props {
  products: Product[];
  setProducts: (products: Product[]) => void;
  onDeleteProduct: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => Promise<void>;
  maxProducts?: number;
  tenantId?: string;
  aiEnabled?: boolean;
}

const StockTab: React.FC<Props> = ({ products, setProducts, onDeleteProduct, settings, onUpdateSettings, maxProducts, tenantId, aiEnabled = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [layoutMode, setLayoutMode] = useState<'small' | 'medium' | 'list'>(settings.stockLayout || 'small');
  
  const productCount = products.length;
  const limitReached = maxProducts !== undefined && productCount >= maxProducts;
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', costPrice: 0, salePrice: 0, quantity: 0, photo: null, barcode: '',
    description: '', category: '', brand: '', model: '', ncm: '', cest: '', cfop: '',
    promotionalPrice: 0, discount: 0, isPromotion: false
  });

  const [isPhotoChoiceOpen, setIsPhotoChoiceOpen] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiProgressMessage, setAiProgressMessage] = useState('');
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);
  const [aiErrorBadge, setAiErrorBadge] = useState<string | null>(null);
  const [showFiscalFields, setShowFiscalFields] = useState(false);
  const [showDiscountFields, setShowDiscountFields] = useState(false);

  // Créditos de IA no Estoque
  const [aiCredits, setAiCredits] = useState<number>(0);
  const [isAICreditsModalOpen, setIsAICreditsModalOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Helper para verificar se há alterações pendentes não salvas
  const hasUnsavedChanges = () => {
    if (editingProduct) {
      return (
        formData.name !== editingProduct.name ||
        formData.salePrice !== editingProduct.salePrice ||
        formData.costPrice !== editingProduct.costPrice ||
        formData.quantity !== editingProduct.quantity ||
        formData.barcode !== (editingProduct.barcode || '') ||
        formData.photo !== editingProduct.photo
      );
    }
    return !!(
      formData.name?.trim() ||
      (formData.salePrice || 0) > 0 ||
      (formData.costPrice || 0) > 0 ||
      (formData.quantity || 0) > 0 ||
      formData.barcode?.trim() ||
      formData.photo
    );
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
    } else {
      forceCloseAndDiscard();
    }
  };

  const forceCloseAndDiscard = () => {
    clearStockDraft();
    resetForm();
    setIsModalOpen(false);
    setShowDiscardConfirm(false);
  };

  // Garante que se o usuário mudar de aba enquanto o modal estiver fechado, o rascunho seja limpo
  useEffect(() => {
    return () => {
      clearStockDraft();
    };
  }, []);

  const fetchAICredits = async () => {
    if (tenantId) {
      const credits = await OnlineDB.getAICredits(tenantId);
      setAiCredits(credits);
    }
  };

  useEffect(() => {
    fetchAICredits();
  }, [tenantId]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Limpa rascunho de produto
  const clearStockDraft = () => {
    try {
      localStorage.removeItem('lojascloud_stock_draft');
    } catch (e) {}
  };

  // Salva temporariamente rascunho enquanto o modal estiver aberto, apenas para evitar perdas acidentais de reload
  useEffect(() => {
    if (isModalOpen && (formData.name || formData.barcode || (formData.salePrice || 0) > 0 || (formData.quantity || 0) > 0)) {
      try {
        localStorage.setItem('lojascloud_stock_draft', JSON.stringify({
          formData: { ...formData, photo: null },
          editingProduct,
          savedAt: Date.now()
        }));
      } catch (e) {}
    } else if (!isModalOpen) {
      clearStockDraft();
    }
  }, [formData, isModalOpen, editingProduct]);

  // Função para comprimir imagem antes de salvar no banco
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validação: Apenas imagens
      if (!file.type.startsWith('image/')) {
        alert(`O arquivo "${file.name}" não é uma imagem e foi ignorado.`);
        e.target.value = '';
        return;
      }

      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, photo: compressed }));
        setIsCompressing(false);
        e.target.value = ''; 
      };
      reader.readAsDataURL(file);
    }
  };

  const runAIAnalysisOnBase64 = async (compressed: string) => {
    setIsAnalyzingAI(true);
    setAiProgressMessage('Identificando produto, embalagem e rótulo com IA...');
    setAiErrorBadge(null);

    const intervalMsg = setTimeout(() => {
      setAiProgressMessage('Lendo códigos de barras, preços e especificações na caixa...');
    }, 2400);

    try {
      const result = await analyzeProductImage(compressed, tenantId);
      clearTimeout(intervalMsg);

      if (typeof result.creditsRemaining === 'number') {
        setAiCredits(result.creditsRemaining);
      } else if (tenantId) {
        fetchAICredits();
      }

      const hasDiscount = (result.discount && result.discount > 0) || (result.promotionalPrice && result.promotionalPrice > 0) || !!result.isPromotion;
      if (hasDiscount) {
        setShowDiscountFields(true);
      }
      if (result.ncm || result.cest || result.cfop) {
        setShowFiscalFields(true);
      }

      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name || '',
        brand: result.brand || prev.brand || '',
        model: result.model || prev.model || '',
        category: result.category || prev.category || '',
        barcode: result.barcode || prev.barcode || '',
        costPrice: (result.costPrice !== undefined && result.costPrice > 0) ? result.costPrice : (prev.costPrice || 0),
        salePrice: (result.salePrice !== undefined && result.salePrice > 0) ? result.salePrice : (prev.salePrice || 0),
        promotionalPrice: result.promotionalPrice || (prev.promotionalPrice || 0),
        discount: result.discount || (prev.discount || 0),
        isPromotion: !!hasDiscount,
        description: result.description || prev.description || '',
        ncm: result.ncm || prev.ncm || '',
        cest: result.cest || prev.cest || '',
        cfop: result.cfop || prev.cfop || '5102',
        quantity: (result.quantity !== undefined && result.quantity > 0) ? result.quantity : (prev.quantity && prev.quantity > 0 ? prev.quantity : 1),
        photo: compressed,
      }));

      setAiErrorBadge(null);
      setAiSuccessBadge('✨ Informações extraídas da foto com sucesso! Você pode revisar ou complementar manualmente antes de salvar.');
    } catch (err: any) {
      clearTimeout(intervalMsg);
      console.warn('Erro na análise da foto por IA:', err);
      const userMessage = err?.message || 'Os servidores de IA estão temporariamente ocupados. A foto do produto foi salva com sucesso no formulário.';
      setAiErrorBadge(userMessage);
    } finally {
      setIsAnalyzingAI(false);
      setAiProgressMessage('');
    }
  };

  const handlePhotoCaptureForAI = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(`O arquivo selecionado não é uma imagem válida.`);
      return;
    }

    setIsPhotoChoiceOpen(false);
    setIsAnalyzingAI(true);
    setAiProgressMessage('Otimizando imagem para leitura...');

    try {
      const reader = new FileReader();
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(rawBase64);
      setFormData(prev => ({ ...prev, photo: compressed }));
      setIsModalOpen(true);

      await runAIAnalysisOnBase64(compressed);
    } catch (err: any) {
      console.error('Erro ao processar imagem:', err);
      setAiErrorBadge('Não foi possível carregar a imagem. Tente novamente.');
      setIsAnalyzingAI(false);
      setAiProgressMessage('');
    }
  };

  const handleRetryAIAnalysis = async () => {
    if (!formData.photo) return;
    await runAIAnalysisOnBase64(formData.photo);
  };

  const startScanner = async (mode: 'form' | 'search' = 'form') => {
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("scanner-region");
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.777778
          },
          (decodedText) => {
            playBeepSound();
            if (mode === 'form') {
              setFormData(prev => ({ ...prev, barcode: decodedText }));
            } else {
              setSearchTerm(decodedText);
            }
            stopScanner();
          },
          () => {}
        );

        // Tentar forçar o foco contínuo se o navegador suportar
        try {
          // Em versões mais antigas do html5-qrcode, getRunningTrack pode não existir
          // Vamos tentar pegar diretamente do elemento de vídeo
          const videoElement = document.querySelector("#scanner-region video") as HTMLVideoElement;
          const stream = videoElement?.srcObject as MediaStream;
          const track = stream?.getVideoTracks()[0];
          
          if (track) {
            const capabilities = track.getCapabilities() as any;
            const constraints: any = {};
            
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              constraints.focusMode = 'continuous';
            }
            
            // Tentar aplicar 2x de zoom se disponível
            if (capabilities.zoom) {
              const maxZoom = capabilities.zoom.max || 1;
              constraints.zoom = Math.min(2, maxZoom);
            }
            
            if (Object.keys(constraints).length > 0) {
              await track.applyConstraints({ advanced: [constraints] } as any);
            }
          }
        } catch (focusErr) {
          console.warn("Não foi possível ajustar o foco automaticamente:", focusErr);
        }
      } catch (err) {
        console.error("Erro ao iniciar scanner:", err);
        alert("Não foi possível acessar a câmera.");
        setIsScannerOpen(false);
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleSave = async () => {
    if (limitReached && !editingProduct) {
      alert(`Limite de ${maxProducts} produtos atingido. Para cadastrar mais, atualize seu plano.`);
      return;
    }

    if (!formData.name) return alert('Nome é obrigatório.');
    setIsSaving(true);
    
    try {
      let newList: Product[];
      if (editingProduct) {
        newList = products.map(p => p.id === editingProduct.id ? { ...p, ...formData } as Product : p);
      } else {
        const newProd = { 
          ...formData, 
          id: 'PROD_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          quantity: formData.quantity || 0,
          costPrice: formData.costPrice || 0,
          salePrice: formData.salePrice || 0,
          barcode: formData.barcode || ''
        } as Product;
        newList = [newProd, ...products];
      }
      
      await setProducts(newList);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert("Erro ao salvar produto.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    clearStockDraft();
    setEditingProduct(null);
    setFormData({
      name: '',
      costPrice: 0,
      salePrice: 0,
      quantity: 0,
      photo: null,
      barcode: '',
      description: '',
      category: '',
      brand: '',
      model: '',
      ncm: '',
      cest: '',
      cfop: '',
      promotionalPrice: 0,
      discount: 0,
      isPromotion: false,
    });
    setAiSuccessBadge(null);
    setAiErrorBadge(null);
    setShowFiscalFields(false);
    setShowDiscountFields(false);
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const paginatedProducts = filtered.slice(0, settings.itemsPerPage * currentPage);

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const toggleLayout = () => {
    const modes: ('small' | 'medium' | 'list')[] = ['small', 'medium', 'list'];
    const nextIndex = (modes.indexOf(layoutMode) + 1) % modes.length;
    const newMode = modes[nextIndex];
    setLayoutMode(newMode);
    onUpdateSettings({ ...settings, stockLayout: newMode });
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete);
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Estoque Pro</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestão e Cadastro Inteligente</p>
        </div>
        <div className="flex items-center gap-2">
          {aiEnabled && tenantId && (
            <button
              type="button"
              onClick={() => setIsAICreditsModalOpen(true)}
              className="px-2.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-center gap-1.5 text-blue-700 hover:bg-blue-100/70 active:scale-95 transition-all"
              title="Seus créditos de IA para reconhecimento prioritário de produtos por foto"
            >
              <Sparkles size={14} className="text-blue-600 animate-pulse" />
              <span className="text-[11px] font-black">{aiCredits}</span>
              <span className="text-[9px] font-bold text-blue-500 uppercase hidden sm:inline">créditos</span>
            </button>
          )}
          {aiEnabled && (
            <button 
              onClick={() => { resetForm(); setIsPhotoChoiceOpen(true); }} 
              disabled={limitReached} 
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-3.5 py-2.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-black text-xs uppercase tracking-wider transition-all"
              title="Cadastrar produto por foto com Inteligência Artificial"
            >
              <Sparkles size={16} className="text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Cadastro por Foto</span>
              <Camera size={16} className="sm:hidden" />
            </button>
          )}
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            disabled={limitReached} 
            className="bg-slate-900 text-white p-2.5 rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            title="Novo Item Manual"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {limitReached && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-700 text-xs font-bold flex items-center gap-3">
          <AlertTriangle size={16} />
          <span>Você atingiu o limite de {maxProducts} produtos. Para cadastrar mais, atualize seu plano.</span>
        </div>
      )}

      {/* CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-3">
           <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0"><PiggyBank size={20}/></div>
           <div className="min-w-0"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">Custo Total</p><p className="font-black text-slate-800 text-xs truncate">{formatCurrency(products.reduce((a,p)=>a+(p.costPrice*p.quantity),0))}</p></div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-3">
           <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={20}/></div>
           <div className="min-w-0"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">Retorno Previsto</p><p className="font-black text-emerald-600 text-xs truncate">{formatCurrency(products.reduce((a,p)=>a+(p.salePrice*p.quantity),0))}</p></div>
        </div>
      </div>

      {/* BARRA DE PESQUISA E LAYOUT */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input type="text" placeholder="Buscar..." className="w-full pl-11 pr-4 py-3.5 bg-white border-none rounded-2xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={() => startScanner('search')} className="p-3.5 bg-white text-slate-600 rounded-2xl shadow-sm active:scale-95 shrink-0">
          <ScanBarcode size={20} />
        </button>
        <button onClick={toggleLayout} className="p-3.5 bg-white text-slate-400 hover:text-slate-600 transition-colors rounded-2xl shadow-sm active:scale-95 shrink-0">
           {layoutMode === 'small' && <Grid size={20} />}
           {layoutMode === 'medium' && <LayoutGrid size={20} />}
           {layoutMode === 'list' && <Rows size={20} />}
        </button>
      </div>

      {/* --- GRID DE PRODUTOS --- */}
      <div className={`grid gap-3 ${
        layoutMode === 'small' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10' :
        layoutMode === 'medium' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' :
        'grid-cols-1'
      }`}>
        {paginatedProducts.length > 0 ? paginatedProducts.map(product => (
          <div key={product.id} className={`bg-white border border-slate-50 rounded-[2rem] overflow-hidden shadow-sm flex group animate-in fade-in duration-300 ${layoutMode === 'list' ? 'flex-row items-center p-2 gap-3' : 'flex-col'}`}>
            {/* Imagem */}
            <div className={`bg-slate-50 relative shrink-0 ${
              layoutMode === 'list' ? 'w-14 h-14 rounded-2xl' : 
              layoutMode === 'small' ? 'h-20' : 
              'h-28 md:h-24'
            }`}>
              {product.photo ? <img src={product.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><PackageOpen size={layoutMode === 'small' || layoutMode === 'list' ? 16 : 24} /></div>}
              
              {layoutMode !== 'list' && (
                <>
                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setFormData(product); setIsModalOpen(true); }} 
                      className="p-1.5 bg-white/90 rounded-lg text-slate-600 shadow-sm active:scale-90 transition-all"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setProductToDelete(product.id); }} 
                      className="p-1.5 bg-white/90 rounded-lg text-red-500 shadow-sm active:scale-90 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${product.quantity <= 2 ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>Qtd: {product.quantity}</div>
                </>
              )}
            </div>

            {/* Conteúdo */}
            <div className={`${layoutMode === 'list' ? 'flex-1 flex items-center justify-between pr-2 min-w-0' : 'p-2'}`}>
              <div className="min-w-0 flex-1 mr-2">
                <h3 className={`font-bold text-slate-800 uppercase truncate mb-0.5 ${layoutMode === 'small' ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}>{product.name}</h3>
                {layoutMode === 'list' && (
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${product.quantity <= 2 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>Estoque: {product.quantity}</span>
                   </div>
                )}
                {layoutMode !== 'list' && (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-blue-600 text-[10px]">{formatCurrency(product.salePrice)}</p>
                    {product.barcode && <ScanBarcode size={10} className="text-slate-300" />}
                  </div>
                )}
              </div>

              {layoutMode === 'list' && (
                <div className="flex items-center gap-3 shrink-0">
                   <p className="font-black text-blue-600 text-xs sm:text-sm">{formatCurrency(product.salePrice)}</p>
                   <div className="flex gap-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setFormData(product); setIsModalOpen(true); }} 
                        className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all hover:bg-slate-200"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setProductToDelete(product.id); }} 
                        className="p-2 bg-red-50 rounded-xl text-red-500 active:scale-90 transition-all hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhum item em estoque</p>
          </div>
        )}
      </div>

      {filtered.length > paginatedProducts.length && (
        <button 
          onClick={loadMore}
          className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest mt-4 active:scale-95 transition-transform">
          Carregar Mais
        </button>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={32} />
              </div>
              <h3 className="font-black text-slate-800 uppercase text-sm">Excluir Produto?</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Este item será removido permanentemente.</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setProductToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest">Sair</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Remover</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex flex-col justify-end p-2 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">{editingProduct ? 'Editar Item' : 'Novo Produto'}</h3>
                {!editingProduct && (
                  <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Inteligente</span>
                )}
              </div>
              <button 
                type="button" 
                onClick={handleRequestClose} 
                className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                title="Fechar cadastro"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Opção Inteligente de Foto com IA */}
              {aiEnabled && (
                <button
                  type="button"
                  onClick={() => setIsPhotoChoiceOpen(true)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/80 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3 text-blue-700 font-black text-xs uppercase tracking-wider shadow-sm active:scale-98 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-600 text-white rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                      <Sparkles size={14} className="animate-pulse" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 text-xs">Preencher por Foto com IA</p>
                      <p className="text-[9px] text-blue-600 font-bold lowercase tracking-normal">extrai foto, nome, código, valores, descontos e fiscais</p>
                    </div>
                  </div>
                  <Camera size={18} className="text-blue-600 shrink-0" />
                </button>
              )}

              {/* Alerta de Sucesso da IA */}
              {aiSuccessBadge && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-xs">{aiSuccessBadge}</p>
                  </div>
                  <button onClick={() => setAiSuccessBadge(null)} className="text-emerald-500 hover:text-emerald-700">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Alerta de Informação / Demanda da IA */}
              {aiErrorBadge && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs flex flex-col gap-2.5 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-xs">{aiErrorBadge}</p>
                    </div>
                    <button onClick={() => setAiErrorBadge(null)} className="text-amber-500 hover:text-amber-700">
                      <X size={14} />
                    </button>
                  </div>
                  {formData.photo && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {tenantId && (
                        <button
                          type="button"
                          onClick={() => setIsAICreditsModalOpen(true)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Sparkles size={12} />
                          <span>Adicionar Créditos Prioritários</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRetryAIAnalysis}
                        disabled={isAnalyzingAI}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Sparkles size={12} />
                        <span>Tentar Reconhecimento Novamente</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Área de Foto do Produto */}
              <div className="flex flex-col items-center gap-2">
                <label className="relative active:scale-95 transition-all cursor-pointer group">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 group-hover:border-blue-400 flex items-center justify-center overflow-hidden transition-colors shadow-inner">
                    {isCompressing ? (
                      <Loader2 className="animate-spin text-blue-500" />
                    ) : formData.photo ? (
                      <img src={formData.photo} className="w-full h-full object-cover" alt="Produto" />
                    ) : (
                      <PackageOpen className="text-slate-200" size={32} />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full border-4 border-white shadow-lg group-hover:bg-blue-700 transition-colors">
                    <Camera size={14} />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Foto do produto</span>
                  {formData.photo && (
                    <>
                      <button
                        type="button"
                        onClick={handleRetryAIAnalysis}
                        disabled={isAnalyzingAI}
                        className="text-[9px] text-blue-600 font-bold uppercase hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={11} />
                        Reanalisar com IA
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, photo: null }))}
                        className="text-[9px] text-red-500 font-bold uppercase hover:underline"
                      >
                        Remover foto
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Campos do Formulário */}
              <div className="space-y-4">
                {/* Nome do Produto */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nome do Produto <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={formData.name || ''} 
                    onChange={(e)=>setFormData(f=>({...f,name:e.target.value}))} 
                    placeholder="Ex: Fone de Ouvido Bluetooth JBL Tune 510BT" 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-600 border border-slate-100" 
                  />
                </div>

                {/* Marca e Modelo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                    <input 
                      value={formData.brand || ''} 
                      onChange={(e)=>setFormData(f=>({...f,brand:e.target.value}))} 
                      placeholder="Ex: JBL, Apple, Samsung" 
                      className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-blue-600 border border-slate-100" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo / Versão</label>
                    <input 
                      value={formData.model || ''} 
                      onChange={(e)=>setFormData(f=>({...f,model:e.target.value}))} 
                      placeholder="Ex: Tune 510BT / 128GB" 
                      className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-blue-600 border border-slate-100" 
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <input 
                    value={formData.category || ''} 
                    onChange={(e)=>setFormData(f=>({...f,category:e.target.value}))} 
                    placeholder="Ex: Áudio, Acessórios, Cabos, Capinhas" 
                    className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-blue-600 border border-slate-100" 
                  />
                </div>

                {/* Código de Barras */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Barras (EAN / UPC)</label>
                  <div className="flex gap-2">
                    <input 
                      value={formData.barcode || ''} 
                      onChange={(e)=>setFormData(f=>({...f,barcode:e.target.value}))} 
                      placeholder="Código de barras da embalagem" 
                      className="flex-1 p-3.5 bg-slate-50 rounded-2xl outline-none font-black text-xs text-blue-600 focus:ring-2 focus:ring-blue-600 border border-slate-100" 
                    />
                    <button 
                      type="button"
                      onClick={() => startScanner('form')} 
                      className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md active:scale-90 transition-all shrink-0"
                      title="Escanear com leitor"
                    >
                      <ScanBarcode size={20} />
                    </button>
                  </div>
                </div>

                {/* Valores: Custo e Venda */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Custo Unitário</p>
                    <input 
                      value={formatCurrency(formData.costPrice||0).replace('R$','').trim()} 
                      onChange={(e)=>setFormData(f=>({...f,costPrice:parseCurrencyString(e.target.value)}))} 
                      className="w-full bg-transparent font-black text-slate-800 outline-none text-xs" 
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Venda Unitária</p>
                    <input 
                      value={formatCurrency(formData.salePrice||0).replace('R$','').trim()} 
                      onChange={(e)=>setFormData(f=>({...f,salePrice:parseCurrencyString(e.target.value)}))} 
                      className="w-full bg-transparent font-black text-blue-600 outline-none text-xs" 
                    />
                  </div>
                </div>

                {/* Seção de Desconto / Promoção */}
                <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowDiscountFields(!showDiscountFields)}
                      className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase tracking-wider"
                    >
                      <Tag size={13} className="text-amber-500" />
                      <span>Desconto e Promoção na Caixa</span>
                      {showDiscountFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {(formData.promotionalPrice || (formData.discount || 0) > 0) && (
                      <span className="text-[8px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">Ativo</span>
                    )}
                  </div>

                  {showDiscountFields && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Preço Promocional (R$)</p>
                        <input 
                          value={formatCurrency(formData.promotionalPrice||0).replace('R$','').trim()} 
                          onChange={(e)=>{
                            const val = parseCurrencyString(e.target.value);
                            setFormData(f=>({ ...f, promotionalPrice: val, isPromotion: val > 0 }));
                          }} 
                          placeholder="0,00"
                          className="w-full p-2.5 bg-white rounded-xl font-black text-amber-600 outline-none text-xs border border-slate-200" 
                        />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Desconto (%)</p>
                        <input 
                          type="number"
                          value={formData.discount || ''} 
                          onChange={(e)=>setFormData(f=>({...f,discount:parseFloat(e.target.value)||0}))} 
                          placeholder="Ex: 15"
                          className="w-full p-2.5 bg-white rounded-xl font-black text-slate-700 outline-none text-xs border border-slate-200" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantidade em Estoque */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade em Estoque</label>
                  <input 
                    type="number" 
                    value={formData.quantity ?? 1} 
                    onChange={(e)=>setFormData(f=>({...f,quantity:parseInt(e.target.value)||0}))} 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl outline-none font-black text-sm border border-slate-100" 
                  />
                </div>

                {/* Descrição do Produto */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição e Especificações</label>
                  <textarea 
                    rows={3}
                    value={formData.description || ''} 
                    onChange={(e)=>setFormData(f=>({...f,description:e.target.value}))} 
                    placeholder="Características contidas na caixa ou especificações manuais..." 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl outline-none font-medium text-xs text-slate-700 focus:ring-2 focus:ring-blue-600 border border-slate-100 resize-none" 
                  />
                </div>

                {/* Acordeão de Informações Fiscais */}
                <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowFiscalFields(!showFiscalFields)}
                    className="w-full flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText size={13} className="text-blue-500" />
                      <span>Informações Fiscais (NCM, CEST, CFOP)</span>
                    </div>
                    {showFiscalFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showFiscalFields && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">NCM (8 dígitos)</p>
                        <input 
                          value={formData.ncm || ''} 
                          onChange={(e)=>setFormData(f=>({...f,ncm:e.target.value}))} 
                          placeholder="Ex: 85183000"
                          className="w-full p-2.5 bg-white rounded-xl font-bold text-slate-700 outline-none text-xs border border-slate-200" 
                        />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">CEST</p>
                        <input 
                          value={formData.cest || ''} 
                          onChange={(e)=>setFormData(f=>({...f,cest:e.target.value}))} 
                          placeholder="Código CEST"
                          className="w-full p-2.5 bg-white rounded-xl font-bold text-slate-700 outline-none text-xs border border-slate-200" 
                        />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">CFOP</p>
                        <input 
                          value={formData.cfop || '5102'} 
                          onChange={(e)=>setFormData(f=>({...f,cfop:e.target.value}))} 
                          placeholder="5102"
                          className="w-full p-2.5 bg-white rounded-xl font-bold text-slate-700 outline-none text-xs border border-slate-200" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleRequestClose} 
                className="flex-1 py-3.5 font-black text-slate-500 hover:text-slate-800 uppercase text-[10px] tracking-widest transition-colors rounded-2xl hover:bg-slate-200/60 active:scale-95"
              >
                Sair
              </button>
              <button onClick={handleSave} disabled={isSaving || isCompressing} className="flex-[2] py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Confirmar no SQL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPACTO E ELEGANTE DE CONFIRMAÇÃO DE DESCARTE */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Descartar Cadastro?</h4>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Aviso de Segurança</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              Ao sair agora, os dados digitados <strong className="text-slate-900 font-bold">não serão salvos no sistema</strong> e o produto será cancelado.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={forceCloseAndDiscard}
                className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/25 transition-all active:scale-95"
              >
                Sim, Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESCOLHA: CÂMERA OU GALERIA PARA CADASTRO POR FOTO */}
      {isPhotoChoiceOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase">Cadastro por Foto</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inteligência Artificial</p>
                </div>
              </div>
              <button onClick={() => setIsPhotoChoiceOpen(false)} className="p-2 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Tire uma foto nítida da embalagem, rótulo ou caixa do produto. A IA preencherá automaticamente foto, nome, código de barras, valores, descontos, descrição e dados fiscais. O que não estiver na caixa pode ser escrito manualmente!
            </p>

            <div className="grid grid-cols-1 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  cameraInputRef.current?.click();
                }}
                className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
              >
                <Camera size={18} />
                <span>Tirar Foto com a Câmera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  galleryInputRef.current?.click();
                }}
                className="w-full py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <ImageIcon size={18} />
                <span>Escolher da Galeria / Arquivos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DE ANÁLISE COM IA */}
      {isAnalyzingAI && (
        <div className="fixed inset-0 bg-slate-950/90 z-[150] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="relative w-24 h-24 mx-auto">
              <div className="w-full h-full bg-blue-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-blue-300 overflow-hidden shadow-inner">
                {formData.photo ? (
                  <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={36} className="text-blue-500 animate-pulse" />
                )}
              </div>
              <div className="absolute -inset-1 rounded-3xl border-2 border-blue-500 animate-ping opacity-25 pointer-events-none" />
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg">
                <Sparkles size={16} className="animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">Analisando Produto</h3>
              <p className="text-xs text-blue-600 font-bold min-h-[2.5rem] flex items-center justify-center">
                {aiProgressMessage || 'Identificando informações da caixa...'}
              </p>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full w-2/3 animate-pulse" />
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Identificando foto, nome, código de barras, valores e dados fiscais
            </p>
          </div>
        </div>
      )}

      {/* INPUTS INVISÍVEIS PARA CÂMERA E GALERIA */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoCaptureForAI(file);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoCaptureForAI(file);
          e.target.value = '';
        }}
      />

      {/* MODAL SCANNER */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col animate-in fade-in">
           <div className="p-6 flex items-center justify-between border-b border-white/10">
              <h3 className="font-black text-white uppercase text-xs tracking-widest">Scanner de Código</h3>
              <button onClick={stopScanner} className="p-2 bg-white/10 text-white rounded-full"><X size={20} /></button>
           </div>
           <div className="flex-1 relative flex items-center justify-center">
              <div id="scanner-region" className="w-full h-full max-h-[60vh]"></div>
              <div className="absolute bottom-10 left-0 right-0 text-center px-6 pointer-events-none">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/40 py-2 px-4 rounded-full inline-block">Aproxime o código lentamente para focar</p>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={32} />
              </div>
              <h3 className="font-black text-slate-800 uppercase text-sm">Excluir Produto?</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Esta ação irá remover o item do estoque permanentemente.
              </p>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setProductToDelete(null)} 
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest"
                >
                  Voltar
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-500/20"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPRA DE CRÉDITOS DE IA */}
      <AICreditsModal
        isOpen={isAICreditsModalOpen}
        onClose={() => setIsAICreditsModalOpen(false)}
        tenantId={tenantId || ''}
        storeName={settings?.storeName || 'Minha Loja'}
        currentCredits={aiCredits}
        onCreditsUpdated={(newCredits) => setAiCredits(newCredits)}
      />
    </div>
  );
};

export default StockTab;
