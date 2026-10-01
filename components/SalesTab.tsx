
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, Search, X, History, ShoppingCart, Package, ArrowLeft, CheckCircle2, Eye, Loader2, Plus, Minus, Trash2, ChevronUp, ChevronDown, Receipt, Share2, Download, ScanBarcode, Lock, KeyRound, Printer, LayoutGrid, Grid, List, Rows, CreditCard, Camera, Image as ImageIcon, AlertTriangle, Sparkles, TrendingUp, ShieldAlert, MessageCircle, FileText, Send, QrCode, User as UserIcon, Banknote, Zap, RotateCcw, Tag } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { Product, Sale, AppSettings, User, NfceNfeItem, NfceNfeProductItem } from '../types';
import NfceDanfeModal from './nfce/NfceDanfeModal';
import { FiscalEmissionService } from '../utils/fiscalEmissionService';
import { formatCurrency, parseCurrencyString, formatDate, formatDateTime, playBeepSound, generateRandomNumericCode, getProductEffectivePrice } from '../utils';
import { OnlineDB } from '../utils/api';
import { Html5Qrcode } from 'html5-qrcode';
import { PosHeader } from './pos/PosHeader';
import { PosTicket } from './pos/PosTicket';
import { PosScannerCatalog } from './pos/PosScannerCatalog';
import { PosCheckoutModal } from './pos/PosCheckoutModal';
import { PosTerminalsModal } from './pos/PosTerminalsModal';
import { usePosTerminals } from '../utils/usePosTerminals';

interface Props {
  products: Product[];
  setProducts: (products: Product[]) => void;
  sales: Sale[];
  setSales: (sales: Sale[]) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => Promise<void>;
  currentUser: User | null;
  onDeleteSale: (sale: Sale) => Promise<void>;
  tenantId: string;
  enabledFeatures?: any;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PaymentEntry {
  method: 'Dinheiro' | 'Cartão' | 'PIX';
  amount: number;
  installments?: number;
}

const SalesTab: React.FC<Props> = ({ products, setProducts, sales, setSales, settings, onUpdateSettings, currentUser, onDeleteSale, tenantId, enabledFeatures }) => {
  const isFiscalModeActive = !!(
    enabledFeatures?.fiscalMode || 
    (settings as any)?.fiscalModeEnabled
  );
  const [showHistory, setShowHistory] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [lastSaleAmount, setLastSaleAmount] = useState(0);
  const [lastTransactionItems, setLastTransactionItems] = useState<CartItem[]>([]);
  const [lastPaymentMethod, setLastPaymentMethod] = useState('');
  const [lastTransactionId, setLastTransactionId] = useState('');
  const [lastSaleDate, setLastSaleDate] = useState('');
  const [lastSurcharge, setLastSurcharge] = useState(0);
  const [lastDiscount, setLastDiscount] = useState(0);
  const [lastChange, setLastChange] = useState(0);
  const [lastPaymentEntries, setLastPaymentEntries] = useState<PaymentEntry[]>([]);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [layoutMode, setLayoutMode] = useState<'small' | 'medium' | 'list'>(settings.salesLayout || 'small');

  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<'cancel_sale' | 'remove_banner' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [selectedSaleToCancel, setSelectedSaleToCancel] = useState<Sale | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [posTheme, setPosTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('pos_theme') as 'dark' | 'light') || 'dark';
  });

  const togglePosTheme = () => {
    setPosTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pos_theme', next);
      return next;
    });
  };

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [emittedFiscalNote, setEmittedFiscalNote] = useState<NfceNfeItem | null>(null);
  const [showFiscalDanfeModal, setShowFiscalDanfeModal] = useState(false);
  const [customerFiscalCpf, setCustomerFiscalCpf] = useState('');
  const [customerFiscalName, setCustomerFiscalName] = useState('');
  const [customerFiscalPhone, setCustomerFiscalPhone] = useState('');
  const [isAutoEmitFiscalEnabled, setIsAutoEmitFiscalEnabled] = useState(true);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalSurcharge, setTotalSurcharge] = useState(0); // Acréscimo em %
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([{ method: 'Dinheiro', amount: 0 }]);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const isSubmittingSaleRef = useRef(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sincroniza estado com a API de Tela Cheia do Navegador
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      window.dispatchEvent(new CustomEvent('pos-fullscreen-change', { detail: isFs }));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Trava scroll da página ao entrar em tela cheia para nunca haver rolagem externa
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    window.dispatchEvent(new CustomEvent('pos-fullscreen-change', { detail: isFullscreen }));
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !isFullscreen) {
      if (document.documentElement?.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Relógio digital em tempo real estilo Frente de Caixa
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Vendedores e Colaboradores da Equipe
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>(currentUser?.id || '');

  useEffect(() => {
    if (currentUser?.id) {
      setSelectedSellerId(currentUser.id);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (tenantId) {
      OnlineDB.fetchEmployees(tenantId).then((emps) => {
        if (Array.isArray(emps)) {
          setTeamEmployees(emps.filter((e: any) => e.status !== 'inactive'));
        }
      }).catch(() => {});
    }
  }, [tenantId]);

  // Identificação e Gerenciamento Inteligente de Terminais (PDVs em Rede do Mercado)
  const resolvedOperator = useMemo(() => {
    return teamEmployees.find((e: any) => e.id === selectedSellerId || e.userId === selectedSellerId) ||
      (selectedSellerId === currentUser?.id ? currentUser : null) || currentUser;
  }, [teamEmployees, selectedSellerId, currentUser]);

  const {
    terminalNumber,
    terminalName,
    totalActiveTerminals,
    activeTerminals,
    configuredTerminalNumber,
    setConfiguredTerminalNumber,
    isTerminalsModalOpen,
    setIsTerminalsModalOpen,
    refreshTerminals
  } = usePosTerminals(tenantId, resolvedOperator);

  // Recupera carrinho do PDV caso o app seja minimizado ou recarregado no celular
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('lojascloud_pdv_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && Array.isArray(parsed.cart) && parsed.cart.length > 0) {
          setCart(parsed.cart);
          if (typeof parsed.totalDiscount === 'number') setTotalDiscount(parsed.totalDiscount);
          if (typeof parsed.totalSurcharge === 'number') setTotalSurcharge(parsed.totalSurcharge);
          if (Array.isArray(parsed.paymentEntries) && parsed.paymentEntries.length > 0) {
            setPaymentEntries(parsed.paymentEntries);
          }
          if (parsed.showCheckoutModal) {
            setShowCheckoutModal(true);
          }
          if (parsed.showCartDrawer) {
            setShowCartDrawer(true);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar carrinho PDV:', e);
    }
  }, []);

  // Salva automaticamente o carrinho e estado de finalização no storage
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('lojascloud_pdv_draft', JSON.stringify({
          cart,
          totalDiscount,
          totalSurcharge,
          paymentEntries,
          showCheckoutModal,
          showCartDrawer,
          savedAt: Date.now()
        }));
      } else {
        localStorage.removeItem('lojascloud_pdv_draft');
      }
    } catch (e) {}
  }, [cart, totalDiscount, totalSurcharge, paymentEntries, showCheckoutModal, showCartDrawer]);

  const compressImage = (base64Str: string, size: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > size) { height *= size / width; width = size; }
        } else {
          if (height > size) { width *= size / height; height = size; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingBanner(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64, 1200);
        await onUpdateSettings({ ...settings, salesBannerUrl: compressed });
        setIsCompressingBanner(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao processar banner:', error);
      setIsCompressingBanner(false);
    }
  };

  const handleDownloadReceipt = () => {
    const element = document.getElementById('receipt-pdf-container');
    if (element) {
      const opt = {
        margin: 0,
        filename: `cupom_${lastTransactionId}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save();
    }
  };

  const handleShareWhatsApp = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      setIsGeneratingReceipt(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
      
      if (blob) {
        const file = new File([blob], `cupom_${lastTransactionId}.webp`, { type: 'image/webp' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Cupom de Venda',
            text: `Cupom da venda #${lastTransactionId}`
          });
        } else {
          // Fallback: download and instructions
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cupom_${lastTransactionId}.webp`;
          a.click();
          URL.revokeObjectURL(url);
          alert('O cupom foi baixado em formato WebP. Agora você pode compartilhá-lo manualmente no WhatsApp.');
        }
      }
    } catch (error) {
      console.error('Erro ao gerar imagem para WhatsApp:', error);
      alert('Erro ao gerar o cupom para compartilhamento.');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async (mode: 'search' = 'search') => {
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("scanner-region-sales");
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
            const product = products.find(p => p.barcode === decodedText);
            if (product) {
              addToCart(product);
            } else {
              setProductSearch(decodedText);
            }
            stopScanner();
          },
          () => {}
        );

        // Tentar forçar o foco contínuo se o navegador suportar
        try {
          // Em versões mais antigas do html5-qrcode, getRunningTrack pode não existir
          // Vamos tentar pegar diretamente do elemento de vídeo
          const videoElement = document.querySelector("#scanner-region-sales video") as HTMLVideoElement;
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

  const initiateCancelSale = (sale: Sale) => {
    setSelectedSaleToCancel(sale);
    setAuthAction('cancel_sale');
    setIsAuthModalOpen(true);
    setPasswordInput('');
    setAuthError(false);
  };

  const initiateRemoveBanner = () => {
    setAuthAction('remove_banner');
    setIsAuthModalOpen(true);
    setPasswordInput('');
    setAuthError(false);
  };

  const confirmAuth = async () => {
    if (!passwordInput || !tenantId) return;
    
    // Se for cancelamento de venda, precisa ter a venda selecionada
    if (authAction === 'cancel_sale' && !selectedSaleToCancel) return;

    setVerifyingPassword(true);
    setAuthError(false);

    try {
      const authResult = await OnlineDB.verifyAdminPassword(tenantId, passwordInput);
      if (authResult.success) {
        if (authAction === 'cancel_sale' && selectedSaleToCancel) {
          setIsCancelling(selectedSaleToCancel.id);
          setIsAuthModalOpen(false);
          try {
            await onDeleteSale(selectedSaleToCancel);
          } catch (e: any) {
            alert(`ERRO AO CANCELAR: ${e.message}`);
          } finally {
            setIsCancelling(null);
            setSelectedSaleToCancel(null);
            setAuthAction(null);
            setPasswordInput('');
          }
        } else if (authAction === 'remove_banner') {
          await onUpdateSettings({ ...settings, salesBannerUrl: null });
          setIsAuthModalOpen(false);
          setAuthAction(null);
          setPasswordInput('');
        }
      } else {
        setAuthError(true);
        setTimeout(() => setAuthError(false), 2000);
      }
    } catch (err) {
      alert("Falha de rede ao verificar autorização.");
    } finally {
      setVerifyingPassword(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const effectivePrice = getProductEffectivePrice(item.product);
      return acc + (effectivePrice * item.quantity);
    }, 0);
  }, [cart]);

  const cartCost = useMemo(() => {
    return cart.reduce((acc, item) => acc + ((item.product.costPrice || 0) * item.quantity), 0);
  }, [cart]);

  const finalTotal = useMemo(() => {
    const discounted = Math.max(0, cartTotal - totalDiscount);
    const surchargeAmount = discounted * (totalSurcharge / 100);
    return discounted + surchargeAmount;
  }, [cartTotal, totalDiscount, totalSurcharge]);

  const cartProfit = useMemo(() => {
    return finalTotal - cartCost;
  }, [finalTotal, cartCost]);

  const profitMarginPercent = useMemo(() => {
    if (finalTotal <= 0) return 0;
    return (cartProfit / finalTotal) * 100;
  }, [cartProfit, finalTotal]);

  const isCartInLoss = useMemo(() => {
    return cart.length > 0 && cartCost > 0 && finalTotal < cartCost;
  }, [cart.length, cartCost, finalTotal]);

  // Sugestões inteligentes de Venda Casada (Cross-Selling)
  const crossSellSuggestions = useMemo(() => {
    if (!products || products.length === 0) return [];
    const cartProductIds = new Set(cart.map(item => item.product.id));
    const available = products.filter(p => p.quantity > 0 && !cartProductIds.has(p.id));
    
    // Palavras-chave de acessórios e itens complementares de alta conversão
    const highMarginKeywords = ['pelicula', 'película', 'capa', 'capinha', 'carregador', 'cabo', 'fone', 'suporte', 'adaptador', 'bateria'];
    
    const matched = available.filter(p => {
      const text = `${p.name} ${p.category || ''} ${p.description || ''}`.toLowerCase();
      return highMarginKeywords.some(k => text.includes(k));
    });

    return (matched.length > 0 ? matched : available).slice(0, 6);
  }, [products, cart]);

  const calculateFinalTotal = (discount: number, surcharge: number) => {
    const discounted = Math.max(0, cartTotal - discount);
    const surchargeAmount = discounted * (surcharge / 100);
    return discounted + surchargeAmount;
  };

  const addToCart = (product: Product) => {
    setLastAddedProduct(product);
    const existingItem = cart.find(item => item.product.id === product.id);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    if (currentQtyInCart + 1 > product.quantity) {
      alert(`Estoque insuficiente.`);
      return;
    }
    if (existingItem) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item; 
        if (newQty > item.product.quantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const addPaymentEntry = () => {
    if (paymentEntries.length < 2) {
      setPaymentEntries(prev => [...prev, { method: 'Dinheiro', amount: 0 }]);
    }
  };

  const removePaymentEntry = (index: number) => {
    setPaymentEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updatePaymentEntry = (index: number, field: keyof PaymentEntry, value: any) => {
    setPaymentEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        const updated = { ...entry, [field]: value };
        if (field === 'method' && value === 'Cartão' && !updated.installments) {
          updated.installments = 1;
        }
        return updated;
      }
      return entry;
    }));
  };

  const handleFinalizeSale = async () => {
    // Prevenção imediata de cliques rápidos duplicados (Debounce / Concurrency Lock)
    if (isSubmittingSaleRef.current || isSubmittingSale) return;
    if (cart.length === 0) return;

    // Trava de Margem de Lucro / Alerta de Prejuízo no PDV
    if (cartCost > 0 && finalTotal < cartCost) {
      const lossAmount = cartCost - finalTotal;
      const confirmed = window.confirm(
        `⚠️ ALERTA DE PREJUÍZO NO PDV!\n\nO valor final da venda (${formatCurrency(finalTotal)}) é MENOR que o custo dos produtos em estoque (${formatCurrency(cartCost)}).\n\n📉 Prejuízo estimado: -${formatCurrency(lossAmount)}\n\nDeseja realmente autorizar e finalizar esta venda com prejuízo?`
      );
      if (!confirmed) return;
    }

    // Ativa trava atômica e estado de carregamento
    isSubmittingSaleRef.current = true;
    setIsSubmittingSale(true);

    try {
      const uniqueTransactions = new Set(sales.map(s => s.transactionId).filter(Boolean));
      const nextTransactionNumber = uniqueTransactions.size + 1;
      const transactionId = generateRandomNumericCode();
      const date = new Date().toISOString();
      
      const totalPaid = paymentEntries.reduce((acc, curr) => acc + curr.amount, 0);
      const totalCash = paymentEntries.filter(p => p.method === 'Dinheiro').reduce((acc, curr) => acc + curr.amount, 0);
      const change = paymentEntries.length < 2 ? Math.min(Math.max(0, totalPaid - finalTotal), totalCash) : 0;

      const discountedTotal = Math.max(0, cartTotal - totalDiscount);
      const surchargeAmount = discountedTotal * (totalSurcharge / 100);

      const chosenEmp = teamEmployees.find((e: any) => e.id === selectedSellerId || e.userId === selectedSellerId) ||
        (selectedSellerId === currentUser?.id ? currentUser : null);

      const resolvedSellerName = chosenEmp?.name || currentUser?.name || 'Sistema';
      const resolvedSellerId = chosenEmp?.id || (chosenEmp as any)?.userId || currentUser?.id || 'admin';

      const newSales: Sale[] = cart.map((item, index) => {
        const effectiveUnit = getProductEffectivePrice(item.product);
        const itemTotal = effectiveUnit * item.quantity;
        // Distribui o desconto proporcionalmente se houver mais de um item
        const itemDiscount = cartTotal > 0 ? (itemTotal / cartTotal) * totalDiscount : 0;
        const itemSurcharge = cartTotal > 0 ? (itemTotal / cartTotal) * surchargeAmount : 0;
        
        const formattedId = generateRandomNumericCode();

        const newSale: Sale = {
          id: formattedId,
          productId: item.product.id,
          productName: item.product.name,
          category: item.product.category,
          date,
          quantity: item.quantity,
          originalPrice: effectiveUnit,
          discount: itemDiscount,
          surcharge: itemSurcharge,
          finalPrice: itemTotal - itemDiscount + itemSurcharge,
          costAtSale: item.product.costPrice * item.quantity,
          costPerUnitAtSale: item.product.costPrice,
          salePricePerUnitAtSale: effectiveUnit,
          paymentMethod: paymentEntries.map(p => p.method === 'Cartão' && p.installments && p.installments > 1 ? `${p.method} (${p.installments}x)` : p.method).join(', '),
          paymentEntriesJson: JSON.stringify(paymentEntries),
          change: change,
          sellerName: resolvedSellerName,
          sellerId: resolvedSellerId,
          transactionId,
          terminalNumber,
          terminalName
        };

        // Calcula comissão em background
        if (tenantId && resolvedSellerId) {
          OnlineDB.calculateAndLogCommission(tenantId, newSale, 'sale', resolvedSellerId);
        }

        return newSale;
      });

      const updatedProducts = products.map(p => {
        const cartItem = cart.find(item => item.product.id === p.id);
        if (cartItem) return { ...p, quantity: p.quantity - cartItem.quantity };
        return p;
      });
      setProducts(updatedProducts);
      setSales([...newSales, ...sales]);
      setLastSaleAmount(finalTotal); // Record the actual sale amount, not the received amount
      setLastSurcharge(surchargeAmount);
      setLastDiscount(totalDiscount);
      setLastChange(change);
      setLastPaymentEntries([...paymentEntries]);
      setLastTransactionItems([...cart]);
      setLastPaymentMethod(paymentEntries.map(p => p.method === 'Cartão' && p.installments && p.installments > 1 ? `${p.method} (${p.installments}x)` : p.method).join(', '));
      setLastTransactionId(transactionId);
      setLastSaleDate(date);

      // EMISSÃO AUTOMÁTICA DE NOTA FISCAL (NFC-e / SEFAZ)
      let autoNote: NfceNfeItem | null = null;
      if (isFiscalModeActive) {
        try {
          const items: NfceNfeProductItem[] = cart.map((it, idx) => ({
            itemNumber: idx + 1,
            productId: it.product.id,
            description: it.product.name,
            ncm: it.product.ncm || settings.nfceNfeConfig?.ncmDefault || '8517.79.00',
            cfop: it.product.cfop || settings.nfceNfeConfig?.cfopDefault || '5102',
            csosn: it.product.csosnCst || settings.nfceNfeConfig?.csosnDefault || '102',
            origin: it.product.origin || '0',
            cstPis: it.product.cstPis || '49',
            cstCofins: it.product.cstCofins || '49',
            unitOfMeasure: 'UN',
            quantity: it.quantity,
            unitPrice: it.product.salePrice,
            totalPrice: it.quantity * it.product.salePrice,
            icmsRate: it.product.icmsAliquota ?? settings.nfceNfeConfig?.icmsDefaultRate ?? 0,
            icmsAmount: 0
          }));

          const primaryPayment = paymentEntries[0]?.method || 'Dinheiro';
          const methodMap: Record<string, string> = {
            'Dinheiro': 'dinheiro',
            'Cartão': 'cartao_credito',
            'PIX': 'pix'
          };

          const result = await FiscalEmissionService.emit({
            docType: 'nfce',
            settings,
            items,
            customer: {
              name: customerFiscalName.trim() || 'CONSUMIDOR FINAL',
              cpfCnpj: customerFiscalCpf.trim() || undefined,
              phone: customerFiscalPhone.trim() || undefined
            },
            payment: {
              method: methodMap[primaryPayment] || 'dinheiro',
              amountPaid: finalTotal,
              change: change || 0
            },
            totals: {
              productsAmount: finalTotal + totalDiscount - surchargeAmount,
              discountAmount: totalDiscount,
              totalAmount: finalTotal
            },
            tenantId
          }, { timeoutMs: 15000 });

          if (result.noteItem) {
            autoNote = {
              ...result.noteItem,
              terminalNumber,
              terminalName
            };
            if (settings.nfceNfeConfig) {
              onUpdateSettings({
                ...settings,
                nfceNfeConfig: {
                  ...settings.nfceNfeConfig,
                  nfceNextNumber: (settings.nfceNfeConfig.nfceNextNumber || 100) + 1
                }
              });
            }
          }
        } catch (e) {
          console.error('Erro na emissão automática da NFC-e:', e);
        }
      }
      setEmittedFiscalNote(autoNote);

      setCart([]);
      setLastAddedProduct(null);
      setTotalDiscount(0);
      setTotalSurcharge(0);
      setPaymentEntries([{ method: 'Dinheiro', amount: 0 }]);
      setCustomerFiscalCpf('');
      setCustomerFiscalName('');
      setCustomerFiscalPhone('');
      setShowCheckoutModal(false);
      setShowCartDrawer(false);
      
      // Abre popup de confirmação para impressão na impressora e envio da nota
      setShowPrintConfirmModal(true);
    } finally {
      isSubmittingSaleRef.current = false;
      setIsSubmittingSale(false);
    }
  };

  const handleConfirmPrint = () => {
    setShowPrintConfirmModal(false);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        alert("Aviso: Impressora não reconhecida ou erro na comunicação.");
      }
    }, 300);
  };

  const reprintReceipt = (sale: Sale) => {
    const relatedSales = sales.filter(s => s.transactionId === sale.transactionId);
    
    // Reconstruct cart items from sales
    const items: CartItem[] = relatedSales.map(s => ({
      product: {
        id: s.productId,
        name: s.productName,
        salePrice: s.originalPrice,
        costPrice: s.costAtSale,
        quantity: 0, // Not needed for receipt
        photo: null
      },
      quantity: s.quantity
    }));

    const total = relatedSales.reduce((acc, s) => acc + s.finalPrice, 0);
    const discount = relatedSales.reduce((acc, s) => acc + s.discount, 0);
    const surcharge = relatedSales.reduce((acc, s) => acc + (s.surcharge || 0), 0);
    
    setLastTransactionItems(items);
    setLastSaleAmount(total);
    setLastDiscount(discount);
    setLastSurcharge(surcharge);
    setLastTransactionId(sale.transactionId || '');
    setLastSaleDate(sale.date);
    setLastPaymentMethod(sale.paymentMethod || '');
    
    if (sale.paymentEntriesJson) {
      try {
        setLastPaymentEntries(JSON.parse(sale.paymentEntriesJson));
      } catch (e) {
        setLastPaymentEntries([{ method: 'Dinheiro', amount: total }]);
      }
    } else if (sale.paymentMethod) {
      const methods = sale.paymentMethod.split(',').map(m => m.trim());
      if (methods.length === 1) {
        const m = methods[0];
        if (m.startsWith('Cartão')) {
          const match = m.match(/Cartão \((\d+)x\)/);
          const installments = match ? parseInt(match[1], 10) : 1;
          setLastPaymentEntries([{ method: 'Cartão', amount: total, installments }]);
        } else {
          setLastPaymentEntries([{ method: m as any, amount: total }]);
        }
      } else {
        const splitAmount = total / methods.length;
        const entries = methods.map(m => {
          if (m.startsWith('Cartão')) {
            const match = m.match(/Cartão \((\d+)x\)/);
            const installments = match ? parseInt(match[1], 10) : 1;
            return { method: 'Cartão' as const, amount: splitAmount, installments };
          }
          return { method: m as any, amount: splitAmount };
        });
        setLastPaymentEntries(entries);
      }
    } else {
      setLastPaymentEntries([{ method: 'Dinheiro', amount: total }]);
    }
    
    setLastChange(sale.change || 0);
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return ['Todos', 'Mais Vendidos', ...Array.from(cats)];
  }, [products]);

  const { sortedProducts, topSellers } = useMemo(() => {
    const salesCount: Record<string, number> = {};
    sales.forEach(sale => {
      salesCount[sale.productId] = (salesCount[sale.productId] || 0) + sale.quantity;
    });

    let filtered = products.filter(p => p.quantity > 0);

    if (selectedCategory === 'Mais Vendidos') {
      filtered = filtered.filter(p => (salesCount[p.id] || 0) > 0);
    } else if (selectedCategory !== 'Todos') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered].sort((a, b) => (salesCount[b.id] || 0) - (salesCount[a.id] || 0));
    
    // Identifica os IDs dos top 3 mais vendidos
    const topIds = sorted
      .filter(p => (salesCount[p.id] || 0) > 0)
      .slice(0, 3)
      .map(p => p.id);

    return { sortedProducts: sorted, topSellers: topIds };
  }, [products, sales, productSearch, selectedCategory]);

  const totalVolumes = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const formattedPosDate = useMemo(() => {
    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const dayName = days[currentTime.getDay()];
    const dateStr = currentTime.toLocaleDateString('pt-BR');
    const timeStr = currentTime.toLocaleTimeString('pt-BR');
    return `${dayName} · ${dateStr} · ${timeStr}`;
  }, [currentTime]);

  const quickCashValues = useMemo(() => {
    if (finalTotal <= 0) return [];
    const vals = [Math.ceil(finalTotal)];
    [10, 20, 50, 100, 200].forEach(note => {
      if (note >= finalTotal && !vals.includes(note)) vals.push(note);
    });
    const round10 = Math.ceil(finalTotal / 10) * 10;
    if (round10 > finalTotal && !vals.includes(round10)) vals.push(round10);
    const round50 = Math.ceil(finalTotal / 50) * 50;
    if (round50 > finalTotal && !vals.includes(round50)) vals.push(round50);
    return vals.sort((a, b) => a - b).slice(0, 5);
  }, [finalTotal]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = productSearch.trim();
      if (!query) {
        if (cart.length > 0 && !showCheckoutModal) {
          setPaymentEntries([{ method: 'Dinheiro', amount: finalTotal }]);
          setShowCheckoutModal(true);
        }
        return;
      }
      
      // 1. Tenta match exato por código de barras
      const matchBarcode = products.find(p => p.barcode && p.barcode.trim() === query);
      if (matchBarcode) {
        if (matchBarcode.quantity > 0) {
          playBeepSound();
          addToCart(matchBarcode);
          setProductSearch('');
        } else {
          alert(`Produto "${matchBarcode.name}" está sem estoque.`);
        }
        return;
      }

      // 2. Tenta match exato por nome
      const matchName = products.find(p => p.name.toLowerCase() === query.toLowerCase());
      if (matchName) {
        if (matchName.quantity > 0) {
          playBeepSound();
          addToCart(matchName);
          setProductSearch('');
        } else {
          alert(`Produto "${matchName.name}" está sem estoque.`);
        }
        return;
      }

      // 3. Se a busca filtrou exatamente 1 produto
      if (sortedProducts.length === 1) {
        const single = sortedProducts[0];
        if (single.quantity > 0) {
          playBeepSound();
          addToCart(single);
          setProductSearch('');
        }
      }
    }
  };

  // Atalhos de Teclado Globais de Frente de Caixa (F2, F4, F7, F10, Esc)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (isAuthModalOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          if (window.confirm('Deseja realmente cancelar este cupom e limpar todos os itens?')) {
            setCart([]);
            setLastAddedProduct(null);
          }
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowHistory(prev => !prev);
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0 && !showCheckoutModal) {
          setPaymentEntries([{ method: 'Dinheiro', amount: finalTotal }]);
          setShowCheckoutModal(true);
        }
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (showCheckoutModal) setShowCheckoutModal(false);
        if (showHistory) setShowHistory(false);
        if (isScannerOpen) stopScanner();
        if (isFullscreen) toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [cart, finalTotal, showCheckoutModal, showHistory, isScannerOpen, isAuthModalOpen]);

  const sortedSales = useMemo(() => {
    let filtered = [...sales];
    if (historySearch) {
      const lowerSearch = historySearch.toLowerCase();
      filtered = filtered.filter(s => 
        (s.transactionId && s.transactionId.toLowerCase().includes(lowerSearch)) ||
        (s.productName && s.productName.toLowerCase().includes(lowerSearch))
      );
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, historySearch]);

  const toggleLayout = () => {
    const modes: ('small' | 'medium' | 'list')[] = ['small', 'medium', 'list'];
    const nextIndex = (modes.indexOf(layoutMode) + 1) % modes.length;
    const newMode = modes[nextIndex];
    setLayoutMode(newMode);
    onUpdateSettings({ ...settings, salesLayout: newMode });
  };

  return (
    <div className={`w-full min-h-0 ${
      isFullscreen 
        ? `${posTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'} fixed inset-0 z-[9990] p-2 sm:p-3 w-screen h-[100dvh] flex flex-col overflow-hidden select-none` 
        : 'flex-1 min-h-0 h-full flex flex-col overflow-hidden pb-28 lg:pb-0'
    }`}>
      {showHistory ? (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-2 custom-scrollbar animate-in fade-in slide-in-from-right duration-300">
           <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(false)} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Histórico de Vendas</h2>
          </div>
          
          <div className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-2 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <Search className="text-slate-400 ml-2" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por número do pedido ou produto..." 
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none p-2 text-sm font-medium text-slate-700 placeholder:text-slate-400"
            />
            {historySearch && (
              <button onClick={() => setHistorySearch('')} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="grid gap-2">
            {sortedSales.map(sale => (
              <div 
                key={sale.id} 
                onClick={() => reprintReceipt(sale)}
                className="bg-white p-4 border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm cursor-pointer active:scale-[0.98] transition-all hover:bg-slate-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-800">{sale.productName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Pedido {sale.transactionId} • {formatDate(sale.date)} • {sale.paymentMethod}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <p className="font-black text-emerald-600 text-sm">{formatCurrency(sale.finalPrice)}</p>
                  <button 
                    onClick={() => initiateCancelSale(sale)}
                    disabled={isCancelling === sale.id}
                    className="p-2 text-slate-300 hover:text-red-500 bg-slate-50 rounded-xl active:scale-90 disabled:opacity-50"
                  >
                    {isCancelling === sale.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
          {/* --- LAYOUT DESKTOP (AJUSTADO À TELA VISÍVEL SEM SCROLL / TELA CHEIA) --- */}
          <div className="hidden lg:flex flex-col gap-2.5 h-full min-h-0 overflow-hidden w-full">
            <PosHeader
              cartLength={cart.length}
              totalVolumes={totalVolumes}
              formattedPosDate={formattedPosDate}
              currentUser={currentUser}
              selectedSellerId={selectedSellerId}
              setSelectedSellerId={setSelectedSellerId}
              teamEmployees={teamEmployees}
              settings={settings}
              isFiscalModeActive={isFiscalModeActive}
              onOpenHistory={() => setShowHistory(true)}
              isCompressingBanner={isCompressingBanner}
              bannerInputRef={bannerInputRef}
              onBannerUpload={handleBannerUpload}
              onInitiateRemoveBanner={initiateRemoveBanner}
              onFocusSearch={() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
              }}
              onClearCart={() => {
                if (cart.length > 0 && window.confirm('Deseja realmente cancelar este cupom e limpar todos os itens?')) {
                  setCart([]);
                  setLastAddedProduct(null);
                }
              }}
              onOpenCheckout={() => {
                if (cart.length > 0) {
                  setPaymentEntries([{ method: 'Dinheiro', amount: finalTotal }]);
                  setShowCheckoutModal(true);
                }
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              theme={posTheme}
              onToggleTheme={togglePosTheme}
              terminalNumber={terminalNumber}
              terminalName={terminalName}
              totalActiveTerminals={totalActiveTerminals}
              onOpenTerminalsModal={() => setIsTerminalsModalOpen(true)}
            />

            {/* GRID PRINCIPAL DO PDV DE MERCADO (DESKTOP) */}
            <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-hidden">
              {/* Coluna Esquerda: A Bobina / Cupom Fiscal Eletrônico (5 Colunas) */}
              <div className="col-span-5 h-full min-h-0 overflow-hidden">
                <PosTicket
                  cart={cart}
                  cartTotal={cartTotal}
                  totalDiscount={totalDiscount}
                  totalSurcharge={totalSurcharge}
                  finalTotal={finalTotal}
                  cartCost={cartCost}
                  cartProfit={cartProfit}
                  profitMarginPercent={profitMarginPercent}
                  isCartInLoss={isCartInLoss}
                  crossSellSuggestions={crossSellSuggestions}
                  totalVolumes={totalVolumes}
                  storeName={settings.storeName}
                  onUpdateQuantity={updateCartQuantity}
                  onRemoveFromCart={removeFromCart}
                  onClearCart={() => {
                    if (cart.length > 0 && window.confirm('Deseja realmente cancelar este cupom e limpar todos os itens?')) {
                      setCart([]);
                      setLastAddedProduct(null);
                    }
                  }}
                  onAddToCart={addToCart}
                  onSelectProduct={(p) => setLastAddedProduct(p)}
                  onOpenCheckout={() => {
                    if (cart.length > 0) {
                      setPaymentEntries([{ method: 'Dinheiro', amount: finalTotal }]);
                      setShowCheckoutModal(true);
                    }
                  }}
                  theme={posTheme}
                  terminalNumber={terminalNumber}
                  terminalName={terminalName}
                />
              </div>

              {/* Coluna Direita: Display do Scanner + Bipagem + Catálogo Rápido PLU (7 Colunas) */}
              <div className="col-span-7 h-full min-h-0 overflow-hidden">
                <PosScannerCatalog
                  products={products}
                  sortedProducts={sortedProducts}
                  topSellers={topSellers}
                  lastAddedProduct={lastAddedProduct}
                  productSearch={productSearch}
                  setProductSearch={setProductSearch}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categories={categories}
                  layoutMode={layoutMode}
                  onToggleLayout={toggleLayout}
                  searchInputRef={searchInputRef}
                  onSearchKeyDown={handleSearchKeyDown}
                  onStartScanner={startScanner}
                  onAddToCart={(p) => {
                    playBeepSound();
                    addToCart(p);
                  }}
                  cartLength={cart.length}
                  theme={posTheme}
                  terminalNumber={terminalNumber}
                  terminalName={terminalName}
                />
              </div>
            </div>
          </div>

          {/* --- LAYOUT MOBILE (RESTAURADO EXATAMENTE COMO ESTAVA ANTES) --- */}
          <div className="lg:hidden flex flex-col gap-1.5 flex-1 min-h-0 relative">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-1.5">
                  <ShoppingCart size={16} className="text-emerald-600" /> VENDAS
                </h2>
                <button
                  type="button"
                  onClick={() => setIsTerminalsModalOpen(true)}
                  className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="Identificação do Terminal no Mercado"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {terminalName}
                </button>
              </div>
              <button onClick={() => setShowHistory(true)} className="p-1.5 text-slate-400 bg-white border border-slate-100 rounded-lg active:scale-90 transition-all shadow-sm">
                <History size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                <input 
                  type="text" 
                  placeholder="BIPAR CÓDIGO OU NOME..." 
                  className="w-full h-7 pl-7 pr-2 bg-white border border-slate-200 rounded-lg text-[8px] font-black shadow-sm outline-none focus:border-slate-900 transition-all uppercase placeholder:text-slate-300" 
                  value={productSearch} 
                  onChange={(e) => setProductSearch(e.target.value)} 
                />
              </div>
              <button onClick={() => startScanner('search')} className="w-7 h-7 bg-slate-900 text-white rounded-lg shadow-lg active:scale-95 shrink-0 flex items-center justify-center">
                <Search size={12} />
              </button>
              <button onClick={toggleLayout} className="w-7 h-7 bg-white text-slate-400 hover:text-slate-600 transition-colors rounded-lg shadow-sm active:scale-95 shrink-0 border border-slate-100 flex items-center justify-center">
                 {layoutMode === 'small' && <Grid size={12} />}
                 {layoutMode === 'medium' && <LayoutGrid size={12} />}
                 {layoutMode === 'list' && <Rows size={12} />}
              </button>
            </div>

            {/* --- GRID DE VENDAS MOBILE --- */}
            <div className={`grid gap-1 overflow-y-auto custom-scrollbar pr-1 flex-1 ${
              layoutMode === 'small' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' :
              layoutMode === 'medium' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
              'grid-cols-1'
            }`}>
              {sortedProducts.map(product => {
                const isTopSeller = topSellers.includes(product.id);
                return (
                  <button 
                    key={product.id} 
                    onClick={() => addToCart(product)} 
                    className={`bg-white border overflow-hidden shadow-sm text-left active:scale-95 transition-all flex group ${
                      layoutMode === 'list' ? 'rounded-lg p-0.5 pr-1 border' : 'rounded-lg border'
                    } ${
                      isTopSeller ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-100'
                    } ${layoutMode === 'list' ? 'flex-row items-center gap-1.5' : 'flex-col'}`}
                  >
                    {/* Imagem */}
                    <div className={`bg-slate-50 relative overflow-hidden shrink-0 ${
                      layoutMode === 'list' ? 'w-8 h-8 rounded ml-0.5' : 
                      layoutMode === 'small' ? 'h-12' : 
                      'h-18'
                    }`}>
                      {product.photo ? (
                        <img src={product.photo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={layoutMode === 'small' || layoutMode === 'list' ? 10 : 14} /></div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className={`${layoutMode === 'list' ? 'flex-1 flex items-center justify-between pr-0.5 min-w-0' : 'p-1'}`}>
                      <div className="min-w-0 flex-1 mr-1">
                        <h3 className={`font-black text-slate-800 uppercase truncate mb-0.5 ${layoutMode === 'small' ? 'text-[5.5px]' : 'text-[7.5px]'}`}>{product.name}</h3>
                        <div className="flex items-center justify-between gap-1">
                          {(() => {
                            const eff = getProductEffectivePrice(product);
                            return (
                              <div className="flex items-center gap-1">
                                <p className={`text-emerald-600 font-black whitespace-nowrap ${layoutMode === 'small' ? 'text-[7px]' : 'text-[8px]'}`}>{formatCurrency(eff)}</p>
                                {eff < product.salePrice && (
                                  <span className="text-[6px] text-slate-400 line-through">
                                    {formatCurrency(product.salePrice)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <span className={`text-[4.5px] font-black uppercase px-0.5 py-0.5 rounded shrink-0 ${
                            product.quantity <= 0 ? 'bg-red-500 text-white' : 
                            product.quantity <= 2 ? 'bg-amber-500 text-white' : 
                            'bg-slate-900 text-white'
                          }`}>
                            Estoque: {product.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PERSISTENT BOTTOM CART BAR (Mobile) */}
            <div className="fixed bottom-[72px] left-0 right-0 px-4 py-1.5 z-40 lg:hidden pointer-events-none">
              <button 
                onClick={() => setShowCartDrawer(true)}
                className={`w-full h-9 rounded-lg shadow-lg flex items-center justify-between px-3.5 transition-all active:scale-[0.98] pointer-events-auto ${
                  cart.length > 0 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white text-slate-400 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <ShoppingCart size={14} />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[6px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-white">
                        {cart.length}
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[6px] font-black uppercase tracking-widest opacity-80 leading-none mb-0.5">Carrinho</p>
                    <p className="text-[9px] font-black leading-none">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[6px] font-black uppercase tracking-widest opacity-80 leading-none mb-0.5">Total</p>
                  <p className="text-xs font-black leading-none">{formatCurrency(finalTotal)}</p>
                </div>
              </button>
            </div>

            {/* MOBILE CART DRAWER */}
            {showCartDrawer && (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 animate-in fade-in duration-300">
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                        <ShoppingCart size={16} />
                      </div>
                      <div>
                        <h3 className="font-black uppercase text-[10px] tracking-tighter">Carrinho</h3>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">{cart.length} Itens Selecionados</p>
                      </div>
                    </div>
                    <button onClick={() => setShowCartDrawer(false)} className="p-2 bg-slate-100 text-slate-400 rounded-lg active:scale-90 transition-transform">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
                    {cart.map(item => {
                      const eff = getProductEffectivePrice(item.product);
                      return (
                        <div key={item.product.id} className="flex items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-slate-300 shrink-0 overflow-hidden border border-slate-100 shadow-sm">
                              {item.product.photo ? <img src={item.product.photo} className="w-full h-full object-cover" /> : <Package size={14} />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[9px] font-black text-slate-800 uppercase truncate leading-tight">{item.product.name}</h4>
                              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                                {formatCurrency(eff)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white p-0.5 rounded border border-slate-200 shadow-sm">
                              <button onClick={() => updateCartQuantity(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-75 transition-transform"><Minus size={10} /></button>
                              <span className="text-[9px] font-black text-slate-900 w-2.5 text-center">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-75 transition-transform"><Plus size={10} /></button>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-red-500 bg-red-50 rounded-lg active:scale-90 transition-transform">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-2.5">
                    {/* ALERTA DE PREJUÍZO / MARGEM MOBILE */}
                    {cart.length > 0 && (
                      isCartInLoss ? (
                        <div className="p-2 bg-red-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm animate-pulse">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>Prejuízo Detectado: -{formatCurrency(cartCost - finalTotal)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 text-emerald-800 rounded-md text-[8px] font-bold border border-emerald-100">
                          <span className="flex items-center gap-1">
                            <TrendingUp size={10} className="text-emerald-600" /> Lucro Est.:
                          </span>
                          <span className="font-black text-emerald-700">
                            {formatCurrency(cartProfit)} ({(profitMarginPercent ?? 0).toFixed(0)}%)
                          </span>
                        </div>
                      )
                    )}

                    {/* VENDA CASADA MOBILE */}
                    {cart.length > 0 && crossSellSuggestions.length > 0 && (
                      <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2 space-y-1">
                        <span className="text-[7px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={9} className="text-blue-600" /> Sugestão de Venda Casada
                        </span>
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                          {crossSellSuggestions.map(p => (
                            <button
                              key={p.id}
                              onClick={() => addToCart(p)}
                              className="px-2 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 rounded-md text-[7px] font-black uppercase text-blue-800 shrink-0 transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                            >
                              <Plus size={8} />
                              <span className="max-w-[65px] truncate">{p.name}</span>
                              <span className="text-emerald-600 font-bold">+{formatCurrency(p.salePrice)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span>{formatCurrency(cartTotal)}</span>
                      </div>
                      <div className="flex justify-between items-end pt-1 border-t border-slate-200">
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Total</span>
                        <span className="text-3xl font-black text-emerald-600 leading-none">{formatCurrency(finalTotal)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          setCart([]);
                          setLastAddedProduct(null);
                        }}
                        className="py-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg font-black uppercase text-[8px] tracking-widest active:scale-95 transition-all"
                      >
                        Limpar
                      </button>
                      <button 
                        onClick={() => {
                          setShowCartDrawer(false);
                          setPaymentEntries([{ method: 'Dinheiro', amount: finalTotal }]);
                          setShowCheckoutModal(true);
                        }}
                        className="py-2.5 bg-emerald-500 text-white rounded-lg font-black uppercase text-[8px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        Pagar Agora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT / FECHAMENTO DE CAIXA */}
      {showCheckoutModal && (
        <PosCheckoutModal
          finalTotal={finalTotal}
          cartTotal={cartTotal}
          cartCost={cartCost}
          cartProfit={cartProfit}
          profitMarginPercent={profitMarginPercent}
          isCartInLoss={isCartInLoss}
          totalDiscount={totalDiscount}
          setTotalDiscount={setTotalDiscount}
          totalSurcharge={totalSurcharge}
          setTotalSurcharge={setTotalSurcharge}
          paymentEntries={paymentEntries}
          setPaymentEntries={setPaymentEntries}
          addPaymentEntry={addPaymentEntry}
          removePaymentEntry={removePaymentEntry}
          updatePaymentEntry={updatePaymentEntry}
          calculateFinalTotal={calculateFinalTotal}
          quickCashValues={quickCashValues}
          selectedSellerId={selectedSellerId}
          setSelectedSellerId={setSelectedSellerId}
          teamEmployees={teamEmployees}
          currentUser={currentUser}
          isFiscalModeActive={isFiscalModeActive}
          customerFiscalCpf={customerFiscalCpf}
          setCustomerFiscalCpf={setCustomerFiscalCpf}
          customerFiscalPhone={customerFiscalPhone}
          setCustomerFiscalPhone={setCustomerFiscalPhone}
          isSubmittingSale={isSubmittingSale}
          onFinalizeSale={handleFinalizeSale}
          onClose={() => setShowCheckoutModal(false)}
        />
      )}


      {/* CONTEÚDO DO RECIBO (OCULTO NA TELA, MAS USADO PARA IMPRESSÃO/PDF) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div id="receipt-pdf-container" style={{ width: '210mm', minHeight: '297mm', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', padding: '20mm 0' }}>
          <div 
            id="receipt-content" 
            style={{ 
              width: settings.printerSize === 80 ? '80mm' : '58mm', 
              padding: settings.printerSize === 80 ? '8mm' : '4mm', 
              backgroundColor: 'white', 
              color: 'black', 
              fontFamily: 'monospace',
              fontSize: settings.printerSize === 80 ? '11px' : '10px',
              lineHeight: '1.4',
              border: '1px solid #eee'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
              <p style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', margin: '0 0 2mm 0' }}>{settings.storeName}</p>
              {settings.storeCnpj && (
                <p style={{ margin: '2px 0', fontSize: '10px' }}>CNPJ: {settings.storeCnpj}</p>
              )}
              {settings.storeStateRegistration && (
                <p style={{ margin: '2px 0', fontSize: '10px' }}>IE: {settings.storeStateRegistration}</p>
              )}
              <p style={{ margin: '2px 0', fontSize: '10px' }}>{settings.storeAddress}</p>
              <p style={{ margin: '2px 0', fontSize: '10px' }}>{settings.storePhone}</p>
              <div style={{ margin: '4mm 0', borderTop: '1px solid black', borderBottom: '1px solid black', padding: '1mm 0' }}>
                <p style={{ fontWeight: 'bold', margin: '0', fontSize: '12px' }}>CUPOM DE VENDA</p>
                <p style={{ margin: '0', fontSize: '9px' }}>NÃO É DOCUMENTO FISCAL</p>
              </div>
            </div>
            
            <div style={{ marginBottom: '4mm', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PEDIDO:</span>
                <span style={{ fontWeight: 'bold' }}>{lastTransactionId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>DATA:</span>
                <span>{formatDateTime(lastSaleDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VENDEDOR:</span>
                <span>{currentUser?.name?.toUpperCase() || 'SISTEMA'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '3mm 0', marginBottom: '4mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2mm', fontSize: '10px' }}>
                <span>DESCRIÇÃO</span>
                <span>TOTAL</span>
              </div>
              {lastTransactionItems.map((item, index) => {
                const effPrice = getProductEffectivePrice(item.product);
                return (
                  <div key={index} style={{ marginBottom: '2mm' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'uppercase' }}>{String(index + 1).padStart(3, '0')} - {item.product.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                      <span>{item.quantity} UN x {formatCurrency(effPrice)}</span>
                      <span style={{ color: '#000' }}>{formatCurrency(effPrice * item.quantity)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: '4mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(lastTransactionItems.reduce((acc, item) => acc + (getProductEffectivePrice(item.product) * item.quantity), 0))}</span>
              </div>
              {lastDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', color: '#d32f2f' }}>
                  <span>DESCONTO:</span>
                  <span>-{formatCurrency(lastDiscount)}</span>
                </div>
              )}
              {lastSurcharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', color: '#388e3c' }}>
                  <span>ACRÉSCIMO:</span>
                  <span>+{formatCurrency(lastSurcharge)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '2mm', borderTop: '1px solid black', paddingTop: '2mm' }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(lastSaleAmount)}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed black', paddingTop: '3mm', marginBottom: '6mm' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '2mm', fontSize: '10px' }}>FORMA DE PAGAMENTO:</p>
              {lastPaymentEntries.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
                  <span>
                    {entry.method === 'Cartão' && entry.installments && entry.installments > 1 
                      ? `CARTÃO DE CRÉDITO (${entry.installments}x de ${formatCurrency(entry.amount / entry.installments)})` 
                      : entry.method.toUpperCase()}
                  </span>
                  <span>{formatCurrency(entry.amount)}</span>
                </div>
              ))}
              {lastChange > 0 && (
                <div style={{ marginTop: '2mm', borderTop: '1px dotted #ccc', paddingTop: '2mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span>VALOR RECEBIDO:</span>
                    <span>{formatCurrency(lastPaymentEntries.reduce((acc, curr) => acc + curr.amount, 0))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                    <span>TROCO:</span>
                    <span>{formatCurrency(lastChange)}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4mm' }}>
              <p style={{ margin: '0', fontWeight: 'bold' }}>OBRIGADO PELA PREFERÊNCIA!</p>
              <p style={{ margin: '2px 0' }}>VOLTE SEMPRE!</p>
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL PARA IMPRESSÃO DIRETA */}
      {document.getElementById('print-section') && createPortal(
        <div 
          style={{ 
            width: Number(settings.printerSize) === 80 ? '80mm' : '58mm', 
            padding: Number(settings.printerSize) === 80 ? '4mm' : '2mm', 
            backgroundColor: 'white', 
            color: 'black', 
            fontFamily: 'monospace',
            fontSize: Number(settings.printerSize) === 80 ? '11px' : '10px',
            lineHeight: '1.2'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            <p style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', margin: '0' }}>{settings.storeName}</p>
            {settings.storeCnpj && (
              <p style={{ margin: '1px 0' }}>CNPJ: {settings.storeCnpj}</p>
            )}
            {settings.storeStateRegistration && (
              <p style={{ margin: '1px 0' }}>IE: {settings.storeStateRegistration}</p>
            )}
            <p style={{ margin: '1px 0' }}>{settings.storeAddress}</p>
            <p style={{ margin: '1px 0' }}>{settings.storePhone}</p>
            <p style={{ fontWeight: 'bold', margin: '2mm 0 0 0', borderTop: '1px solid black', borderBottom: '1px solid black' }}>CUPOM DE VENDA</p>
            <p style={{ margin: '0', fontSize: '8px' }}>NÃO É DOCUMENTO FISCAL</p>
          </div>
          
          <div style={{ marginBottom: '3mm' }}>
            <p style={{ margin: '1px 0' }}>ID: {lastTransactionId}</p>
            <p style={{ margin: '1px 0' }}>DATA: {formatDateTime(lastSaleDate)}</p>
            <p style={{ margin: '1px 0' }}>VEND: {currentUser?.name?.toUpperCase() || 'SISTEMA'}</p>
          </div>

          <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '2mm 0', marginBottom: '3mm' }}>
            {lastTransactionItems.map((item, index) => {
              const effPrice = getProductEffectivePrice(item.product);
              return (
                <div key={index} style={{ marginBottom: '1mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{String(index + 1).padStart(3, '0')} - {item.product.name.substring(0, 20)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span>{item.quantity}x {formatCurrency(effPrice)}</span>
                    <span>{formatCurrency(effPrice * item.quantity)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom: '3mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(lastTransactionItems.reduce((acc, item) => acc + (getProductEffectivePrice(item.product) * item.quantity), 0))}</span>
            </div>
            {lastDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>DESCONTO:</span>
                <span>-{formatCurrency(lastDiscount)}</span>
              </div>
            )}
            {lastSurcharge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ACRÉSCIMO:</span>
                <span>+{formatCurrency(lastSurcharge)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '1mm' }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(lastSaleAmount)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed black', paddingTop: '2mm', marginBottom: '4mm' }}>
            {lastPaymentEntries.map((entry, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {entry.method === 'Cartão' && entry.installments && entry.installments > 1 
                    ? `CARTÃO DE CRÉDITO (${entry.installments}X)` 
                    : entry.method.toUpperCase()}
                </span>
                <span>{formatCurrency(entry.amount)}</span>
              </div>
            ))}
            {lastChange > 0 && (
              <div style={{ marginTop: '1mm', borderTop: '1px dotted #ccc', paddingTop: '1mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>RECEBIDO:</span>
                  <span>{formatCurrency(lastPaymentEntries.reduce((acc, curr) => acc + curr.amount, 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>TROCO:</span>
                  <span>{formatCurrency(lastChange)}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px' }}>
            <p>OBRIGADO PELA PREFERÊNCIA!</p>
          </div>
        </div>,
        document.getElementById('print-section')!
      )}

      {/* MODAL SCANNER */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950 z-[10001] flex flex-col animate-in fade-in">
           <div className="p-6 flex items-center justify-between border-b border-white/10">
              <h3 className="font-black text-white uppercase text-xs tracking-widest">Scanner de Código</h3>
              <button onClick={stopScanner} className="p-2 bg-white/10 text-white rounded-full"><X size={20} /></button>
           </div>
           <div className="flex-1 relative flex items-center justify-center">
              <div id="scanner-region-sales" className="w-full h-full max-h-[60vh]"></div>
              <div className="absolute bottom-10 left-0 right-0 text-center px-6 pointer-events-none">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/40 py-2 px-4 rounded-full inline-block">Aproxime o código lentamente para focar</p>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE AUTENTICAÇÃO PARA CANCELAMENTO */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-100">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                 <Lock size={24} />
              </div>
              <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-1">Autorização Requerida</h3>
              <p className="text-center text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-6 leading-tight">
                {authAction === 'cancel_sale' ? 'Insira a senha do administrador para cancelar esta venda' : 'Insira a senha do administrador para remover o banner'}
              </p>
              
              <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-4 py-3 mb-3 transition-all ${authError ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'border-slate-100 focus-within:border-blue-500'}`}>
                 <KeyRound size={16} className={authError ? 'text-red-500' : 'text-slate-300'} />
                 <input 
                   type="password" 
                   autoFocus
                   value={passwordInput}
                   onChange={(e) => setPasswordInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && confirmAuth()}
                   placeholder="SENHA DO ADM"
                   className="bg-transparent w-full outline-none font-black text-[10px] uppercase placeholder:text-slate-200"
                 />
              </div>
              
              {authError && <p className="text-center text-[8px] font-black text-red-500 uppercase mb-3 animate-bounce">Senha Incorreta!</p>}

              <div className="flex flex-col gap-1.5">
                 <button onClick={confirmAuth} disabled={verifyingPassword} className="w-full py-3 bg-red-600 text-white rounded-lg font-black uppercase text-[9px] tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50">
                   {verifyingPassword ? <Loader2 size={16} className="animate-spin" /> : authAction === 'cancel_sale' ? 'AUTORIZAR CANCELAMENTO' : 'AUTORIZAR REMOÇÃO'}
                 </button>
                 <button onClick={() => { setIsAuthModalOpen(false); setPasswordInput(''); setSelectedSaleToCancel(null); setAuthAction(null); }} className="w-full py-2 text-slate-400 font-black uppercase text-[8px] tracking-widest">VOLTAR</button>
              </div>
           </div>
        </div>
      )}

      {/* POPUP DE CONFIRMAÇÃO DE IMPRESSÃO DO COMPROVANTE & ENVIO DA NOTA FISCAL */}
      {showPrintConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col items-center text-center max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner ring-8 ring-emerald-50/50">
              <CheckCircle2 size={32} />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-2">
              <CheckCircle2 size={12} />
              Venda Finalizada com Sucesso!
            </div>

            <h3 className="font-black text-slate-800 uppercase text-sm mb-1 tracking-tight">
              {emittedFiscalNote ? 'Nota Fiscal NFC-e Emitida!' : 'Imprimir Comprovante?'}
            </h3>
            
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-4 max-w-[320px]">
              {emittedFiscalNote 
                ? `Nota fiscal NFC-e Nº ${emittedFiscalNote.number} autorizada pela SEFAZ. Você pode imprimir o DANFE ou enviar direto ao cliente.`
                : `Deseja imprimir o cupom de venda agora na impressora térmica (${settings.printerSize || 58}mm)?`}
            </p>

            {lastSaleAmount > 0 && (
              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 space-y-2 text-left">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Cupom Nº:</span>
                  <span className="font-black text-slate-700">#{lastTransactionId}</span>
                </div>
                {emittedFiscalNote && (
                  <div className="flex justify-between items-center text-[10px] bg-emerald-50/80 text-emerald-800 p-2 rounded-lg">
                    <span className="font-bold uppercase flex items-center gap-1">
                      <FileText size={12} /> NFC-e Autorizada:
                    </span>
                    <span className="font-mono font-black">Nº {emittedFiscalNote.number} (Série {emittedFiscalNote.series})</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-400 uppercase">Total da Venda:</span>
                  <span className="font-black text-emerald-600">{formatCurrency(lastSaleAmount)}</span>
                </div>
                {lastPaymentMethod && (
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="font-bold text-slate-400 uppercase">Pagamento:</span>
                    <span className="font-bold text-slate-600">{lastPaymentMethod}</span>
                  </div>
                )}
                {emittedFiscalNote?.accessKey && (
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Chave de Acesso SEFAZ:</span>
                    <span className="font-mono text-[8px] text-slate-600 break-all select-all font-semibold">{emittedFiscalNote.accessKey}</span>
                  </div>
                )}
              </div>
            )}

            <div className="w-full space-y-2">
              <button
                onClick={handleConfirmPrint}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                IMPRIMIR COMPROVANTE / DANFE
              </button>

              {emittedFiscalNote && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const phone = emittedFiscalNote.customer?.phone || prompt("Digite o WhatsApp do cliente com DDD (ex: 11999998888):");
                      if (phone) {
                        const cleanPhone = phone.replace(/\D/g, '');
                        const text = `*COMPROVANTE FISCAL - ${settings.storeName}*\n\n` +
                          `✅ *Venda finalizada com sucesso!*\n` +
                          `📄 *NFC-e Nº:* ${emittedFiscalNote.number} (Série ${emittedFiscalNote.series})\n` +
                          `💰 *Valor Total:* ${formatCurrency(emittedFiscalNote.totals?.totalAmount ?? (emittedFiscalNote as any).total ?? 0)}\n` +
                          `🔑 *Chave de Acesso:*\n${emittedFiscalNote.accessKey}\n\n` +
                          `🌐 *Consulta SEFAZ:* https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=${emittedFiscalNote.accessKey}\n\n` +
                          `Agradecemos pela preferência!`;
                        window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
                      }
                    }}
                    className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle size={14} />
                    Enviar WhatsApp
                  </button>

                  <button
                    onClick={() => setShowFiscalDanfeModal(true)}
                    className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileText size={14} />
                    Ver DANFE NFC-e
                  </button>
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowPrintConfirmModal(false);
                  setEmittedFiscalNote(null);
                }}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-black uppercase text-[9px] tracking-widest transition-colors"
              >
                CONCLUIR E FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DO DANFE NFC-E */}
      {showFiscalDanfeModal && emittedFiscalNote && (
        <NfceDanfeModal
          note={emittedFiscalNote}
          settings={settings}
          onClose={() => setShowFiscalDanfeModal(false)}
        />
      )}

      {/* MODAL DE GERENCIAMENTO DE TERMINAIS (PC / PDV DO MERCADO) */}
      <PosTerminalsModal
        isOpen={isTerminalsModalOpen}
        onClose={() => setIsTerminalsModalOpen(false)}
        terminalNumber={terminalNumber}
        terminalName={terminalName}
        totalActiveTerminals={totalActiveTerminals}
        activeTerminals={activeTerminals}
        configuredTerminalNumber={configuredTerminalNumber}
        onSelectTerminalNumber={setConfiguredTerminalNumber}
        onRefresh={refreshTerminals}
        theme={posTheme}
      />
    </div>
  );
};

export default SalesTab;
