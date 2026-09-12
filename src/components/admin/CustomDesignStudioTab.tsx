import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, Product, CustomDesignDetails } from '../../types';
import {
  Sparkles,
  ShoppingBag,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  DollarSign,
  UploadCloud,
  Printer,
  MessageCircle,
  ExternalLink,
  Eye,
  ArrowRight,
  Check,
  X,
  Search,
  Filter,
  RefreshCw,
  ZoomIn,
  Download,
  Palette,
  Tag,
  ShieldCheck,
  Layers,
  Calendar,
  Building2,
  Clock,
  Phone,
  User,
  MapPin,
  Video,
  Play
} from 'lucide-react';

interface CustomDesignStudioTabProps {
  onDeleteOrder: (order: Order) => void;
  onDeleteAllCustomOrders: () => void;
}

export const CustomDesignStudioTab: React.FC<CustomDesignStudioTabProps> = ({
  onDeleteOrder,
  onDeleteAllCustomOrders
}) => {
  const {
    orders,
    products,
    updateProduct,
    updateOrder,
    updateOrderStatus,
    adminSettings,
    showToast,
    setCurrentSection
  } = useStore();

  // Internal Subtabs
  const [subTab, setSubTab] = useState<'queue' | 'pricing-photos'>('queue');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [designFilter, setDesignFilter] = useState<string>('all');

  // Modal States
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [jobSheetOrder, setJobSheetOrder] = useState<Order | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; isVideo?: boolean } | null>(null);

  // Form State for Editing Order
  const [editPricePerBottle, setEditPricePerBottle] = useState<number>(16);
  const [editQuantity, setEditQuantity] = useState<number>(600);
  const [editPlateCharge, setEditPlateCharge] = useState<number>(0);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editBusinessName, setEditBusinessName] = useState<string>('');
  const [editTagline, setEditTagline] = useState<string>('');
  const [editCustomText, setEditCustomText] = useState<string>('');
  const [editEventType, setEditEventType] = useState<CustomDesignDetails['eventType']>('Wedding');
  const [editFinishType, setEditFinishType] = useState<CustomDesignDetails['finishType']>('Matte Luxury');
  const [editCapColor, setEditCapColor] = useState<string>('#0284c7');
  const [editThemeColor, setEditThemeColor] = useState<string>('#0284c7');
  const [editTextColor, setEditTextColor] = useState<string>('#ffffff');
  const [editDateVenue, setEditDateVenue] = useState<string>('');
  const [editInstructions, setEditInstructions] = useState<string>('');
  const [editProofStatus, setEditProofStatus] = useState<string>('Pending Review');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [editUploadedImages, setEditUploadedImages] = useState<CustomDesignDetails['uploadedImages']>([]);
  const [newImageInputUrl, setNewImageInputUrl] = useState<string>('');

  // Catalog Pricing & Photo/Video Management State (one card per product)
  const [editingCatalogPrices, setEditingCatalogPrices] = useState<{
    [productId: string]: {
      customDesignPrice: number;
      price: number;
      mrp: number;
      minOrderQty: number;
      image: string;
      videoUrl?: string;
    };
  }>({});

  const newArtworkFileRef = useRef<HTMLInputElement>(null);
  const newArtworkVideoRef = useRef<HTMLInputElement>(null);

  // Filter custom orders
  const customOrdersOnly = useMemo(() => {
    return orders.filter(o => o.items.some(i => i.isCustomDesign));
  }, [orders]);

  // Filtered orders based on user query
  const filteredOrders = useMemo(() => {
    return customOrdersOnly.filter(ord => {
      const q = searchQuery.toLowerCase().trim();
      const customItem = ord.items.find(i => i.isCustomDesign);
      const c = customItem?.customDesignDetails;

      const matchesQuery =
        !q ||
        ord.id.toLowerCase().includes(q) ||
        ord.customer.name.toLowerCase().includes(q) ||
        ord.customer.phone.includes(q) ||
        (c?.businessName && c.businessName.toLowerCase().includes(q)) ||
        (c?.eventType && c.eventType.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;
      const matchesDesign =
        designFilter === 'all' ||
        (c?.proofStatus || 'Pending Review') === designFilter;

      return matchesQuery && matchesStatus && matchesDesign;
    });
  }, [customOrdersOnly, searchQuery, statusFilter, designFilter]);

  // Pipeline metrics
  const totalPipelineValue = useMemo(() => {
    return customOrdersOnly.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [customOrdersOnly]);

  const pendingReviewCount = useMemo(() => {
    return customOrdersOnly.filter(o => {
      const c = o.items.find(i => i.isCustomDesign)?.customDesignDetails;
      return (c?.proofStatus || 'Pending Review') === 'Pending Review';
    }).length;
  }, [customOrdersOnly]);

  const inProductionCount = useMemo(() => {
    return customOrdersOnly.filter(o => ['Confirmed', 'Processing', 'Ready'].includes(o.status)).length;
  }, [customOrdersOnly]);

  // Open Edit Modal for a Custom Order
  const handleOpenEditModal = (order: Order) => {
    const customItem = order.items.find(i => i.isCustomDesign);
    const c = customItem?.customDesignDetails;
    const defaultUnitPrice = customItem?.unitPrice || (customItem?.product.customDesignPrice || (customItem?.product.price ? customItem.product.price * 2 : 16));

    setEditingOrder(order);
    setEditPricePerBottle(c?.customPricePerBottle ?? defaultUnitPrice);
    setEditQuantity(customItem?.quantity || 600);
    setEditPlateCharge(c?.plateSetupCharge || 0);
    setEditDiscount(c?.discountAmount || 0);
    setEditBusinessName(c?.businessName || '');
    setEditTagline(c?.tagline || '');
    setEditCustomText(c?.customText || '');
    setEditEventType(c?.eventType || 'Wedding');
    setEditFinishType(c?.finishType || 'Matte Luxury');
    setEditCapColor(c?.bottleCapColor || '#0284c7');
    setEditThemeColor(c?.labelThemeColor || '#0284c7');
    setEditTextColor(c?.labelTextColor || '#ffffff');
    setEditDateVenue(c?.dateOrVenue || '');
    setEditInstructions(c?.specialInstructions || '');
    setEditProofStatus(c?.proofStatus || 'Pending Review');
    setEditAdminNotes(c?.adminNotes || '');
    setEditUploadedImages(c?.uploadedImages ? [...c.uploadedImages] : []);
    setNewImageInputUrl('');
  };

  // Save Order Edits (Price, Photos, Details)
  const handleSaveOrderEdits = async () => {
    if (!editingOrder) return;

    const qty = Math.max(1, Math.round(editQuantity));
    const unitPrice = Math.max(1, Number(editPricePerBottle));
    const plateFee = Math.max(0, Number(editPlateCharge));
    const discount = Math.max(0, Number(editDiscount));

    // Calculate new item price and total
    const itemSubtotal = (unitPrice * qty) + plateFee - discount;

    const updatedItems = editingOrder.items.map(item => {
      if (item.isCustomDesign) {
        const updatedDetails: CustomDesignDetails = {
          eventType: editEventType,
          businessName: editBusinessName.trim() || 'Custom Label Brand',
          tagline: editTagline.trim(),
          customText: editCustomText.trim(),
          dateOrVenue: editDateVenue.trim(),
          specialInstructions: editInstructions.trim(),
          labelThemeColor: editThemeColor,
          labelTextColor: editTextColor,
          finishType: editFinishType,
          bottleCapColor: editCapColor,
          uploadedImages: editUploadedImages,
          proofStatus: editProofStatus as any,
          adminNotes: editAdminNotes.trim() || undefined,
          plateSetupCharge: plateFee > 0 ? plateFee : undefined,
          discountAmount: discount > 0 ? discount : undefined,
          customPricePerBottle: unitPrice
        };

        return {
          ...item,
          quantity: qty,
          unitPrice: unitPrice,
          customDesignDetails: updatedDetails
        };
      }
      return item;
    });

    // Recompute total order amount
    const nonCustomSubtotal = editingOrder.items
      .filter(i => !i.isCustomDesign)
      .reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

    const newSubtotal = nonCustomSubtotal + itemSubtotal;
    const deliveryCharge = editingOrder.deliveryCharge || 0;
    const newTotalAmount = Math.max(0, newSubtotal + deliveryCharge);

    const updatedOrder: Order = {
      ...editingOrder,
      items: updatedItems,
      totalAmount: newTotalAmount,
      updatedAt: new Date().toISOString()
    };

    await updateOrder(updatedOrder);
    setEditingOrder(null);
  };

  // Add Additional Artwork Image to Order
  const handleAddArtworkImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      const newImg = {
        id: `img-${Date.now()}`,
        url: base64,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        type: file.type,
        labelPosition: 'front' as const
      };
      setEditUploadedImages(prev => [...prev, newImg]);
      showToast('Artwork Added', `${file.name} added to custom order artwork files.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  // Add Additional Artwork Video to Order
  const handleAddArtworkVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Invalid File', 'Please select an MP4 or WebM video file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      const newVid = {
        id: `vid-${Date.now()}`,
        url: base64,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        type: file.type,
        mediaType: 'video' as const,
        labelPosition: 'wrap' as const
      };
      setEditUploadedImages(prev => [...prev, newVid]);
      showToast('Video Attached', `${file.name} added to custom order media files.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  // Add Media via URL (Image or Video)
  const handleAddArtworkUrl = () => {
    if (!newImageInputUrl.trim()) return;
    const url = newImageInputUrl.trim();
    const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('video');
    const newMedia = {
      id: `media-${Date.now()}`,
      url,
      name: isVideo ? 'External Video Link' : 'External Artwork Photo',
      mediaType: isVideo ? ('video' as const) : ('image' as const),
      labelPosition: isVideo ? ('wrap' as const) : ('front' as const)
    };
    setEditUploadedImages(prev => [...prev, newMedia]);
    setNewImageInputUrl('');
    showToast(isVideo ? 'Video URL Added' : 'Image URL Added', 'Media URL attached to custom order.', 'info');
  };

  // Remove an uploaded image
  const handleRemoveUploadedImage = (id: string) => {
    setEditUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // Toggle label position for an image
  const handleTogglePosition = (id: string) => {
    setEditUploadedImages(prev =>
      prev.map(img => {
        if (img.id === id) {
          const nextPos: 'front' | 'back' | 'wrap' =
            img.labelPosition === 'front' ? 'back' : img.labelPosition === 'back' ? 'wrap' : 'front';
          return { ...img, labelPosition: nextPos };
        }
        return img;
      })
    );
  };

  // Send WhatsApp Design Quote & Order Confirmation to Customer
  const handleSendWhatsAppProof = (order: Order) => {
    const customItem = order.items.find(i => i.isCustomDesign);
    const c = customItem?.customDesignDetails;
    const phone = order.customer.phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone}`;

    const message = `*HH MINERAL WATER - CUSTOM DESIGN ORDER & QUOTE*\n\n` +
      `Hello *${order.customer.name}*,\n` +
      `Your custom branded bottling order *${order.id}* is currently in *${c?.proofStatus || 'Pending Review'}*.\n\n` +
      `*Order Details:*\n` +
      `• Brand: *${c?.businessName || 'Custom'}*\n` +
      `• Bottle Format: ${customItem?.product.size} (${customItem?.quantity.toLocaleString('en-IN')} pieces)\n` +
      `• Finish Type: ${c?.finishType}\n` +
      `• Cap Color: ${c?.bottleCapColor}\n` +
      `• Custom Rate: ₹${customItem?.unitPrice}/bottle\n` +
      `• Total Order Amount: ₹${order.totalAmount.toLocaleString('en-IN')}\n\n` +
      `Please reply with *APPROVED* to confirm production and begin bottling.\n\n` +
      `Helpline: ${adminSettings.ownerWhatsApp} | HH Mineral Water Plant`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Catalog Pricing Edit Form State Initializer
  const getCatalogForm = (prod: Product) => {
    if (editingCatalogPrices[prod.id]) {
      return editingCatalogPrices[prod.id];
    }
    return {
      customDesignPrice: prod.customDesignPrice || (prod.price * 2),
      price: prod.price,
      mrp: prod.mrp,
      minOrderQty: prod.minOrderQty || 600,
      image: prod.image,
      videoUrl: prod.videoUrl || ''
    };
  };

  const handleUpdateCatalogProduct = async (prod: Product) => {
    const state = getCatalogForm(prod);
    const updated: Product = {
      ...prod,
      customDesignPrice: Math.max(1, state.customDesignPrice),
      price: Math.max(1, state.price),
      mrp: Math.max(1, state.mrp),
      minOrderQty: Math.max(1, state.minOrderQty),
      image: state.image.trim() || prod.image,
      videoUrl: state.videoUrl?.trim() || undefined
    };

    await updateProduct(updated);
    showToast('Studio Pricing Updated', `${prod.size} custom design price set to ₹${updated.customDesignPrice}/bottle with updated media.`, 'success');
  };

  const handleCatalogPhotoUpload = (prodId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setEditingCatalogPrices(prev => ({
        ...prev,
        [prodId]: {
          ...(prev[prodId] || getCatalogForm(products.find(p => p.id === prodId)!)),
          image: base64
        }
      }));
      showToast('Photo Loaded', 'Bottle photo loaded into preview. Click "Save Bottle Settings" to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleCatalogVideoUpload = (prodId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Invalid Format', 'Please choose an MP4 or WebM video file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setEditingCatalogPrices(prev => ({
        ...prev,
        [prodId]: {
          ...(prev[prodId] || getCatalogForm(products.find(p => p.id === prodId)!)),
          videoUrl: base64
        }
      }));
      showToast('Video Loaded', 'Showcase video loaded. Click "Save Bottle Settings" to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner with Stats & Navigation */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 text-white p-6 rounded-3xl shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold text-[11px] uppercase tracking-wider border border-cyan-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Admin Design Engine
              </span>
              <span className="text-slate-400 text-xs">• Dedicated Queue & Studio Pricing</span>
            </div>
            <h2 className="font-heading text-2xl font-black mt-2 tracking-tight">
              Custom Design Studio Management
            </h2>
            <p className="text-xs text-cyan-200 mt-1 max-w-2xl leading-relaxed">
              Full administrative control over custom branding orders, client artwork, custom unit pricing, and studio bottle catalog rates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {customOrdersOnly.length > 0 && (
              <button
                type="button"
                onClick={onDeleteAllCustomOrders}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer transition-colors"
                title="Delete all custom design orders"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Queue ({customOrdersOnly.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentSection('custom-studio')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Open Customer Studio</span>
            </button>
          </div>
        </div>

        {/* 4 Pipeline Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-cyan-300 font-semibold block uppercase">Total Custom Orders</span>
            <span className="font-heading text-xl font-black mt-0.5 block">{customOrdersOnly.length}</span>
            <span className="text-[10px] text-slate-400">All registered print jobs</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-emerald-300 font-semibold block uppercase">Custom Pipeline Value</span>
            <span className="font-heading text-xl font-black mt-0.5 block text-emerald-300">
              ₹{totalPipelineValue.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400">Gross custom order revenue</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-amber-300 font-semibold block uppercase">Pending Review</span>
            <span className="font-heading text-xl font-black mt-0.5 block text-amber-300">{pendingReviewCount}</span>
            <span className="text-[10px] text-slate-400">Needs artwork / design review</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-purple-300 font-semibold block uppercase">Bottling & Printing</span>
            <span className="font-heading text-xl font-black mt-0.5 block text-purple-300">{inProductionCount}</span>
            <span className="text-[10px] text-slate-400">Active in production pipeline</span>
          </div>
        </div>
      </div>

      {/* Internal Tab Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSubTab('queue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'queue'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Custom Orders & Bottling Queue ({customOrdersOnly.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('pricing-photos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'pricing-photos'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Bottle Base Pricing & Studio Photos ({products.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: CUSTOM ORDERS QUEUE */}
      {subTab === 'queue' && (
        <div className="space-y-6">
          {/* Search, Filter & Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders, clients, brand names..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 bg-slate-50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="New">New</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Ready">Ready</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
                <span>Design:</span>
              </div>
              <select
                value={designFilter}
                onChange={e => setDesignFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Stages</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Proof Ready">Artwork Approved</option>
                <option value="Customer Approved">Customer Approved</option>
                <option value="In Printing">In Printing</option>
                <option value="Bottled">Bottled</option>
                <option value="Dispatched">Dispatched</option>
              </select>
            </div>
          </div>

          {/* Orders Grid */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">No custom design orders found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting search filters or check back when new orders arrive.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredOrders.map(ord => {
                const customItem = ord.items.find(i => i.isCustomDesign);
                const c = customItem?.customDesignDetails;
                const unitPrice = customItem?.unitPrice || (customItem?.product.customDesignPrice || 16);
                const quantity = customItem?.quantity || 600;

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-cyan-200 p-6 shadow-xs space-y-5 hover:border-cyan-400 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Card Header: Order ID, Status, Customer & Delete */}
                      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-extrabold text-slate-900">{ord.id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-700">{ord.customer.name}</span>
                            <span>•</span>
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{ord.customer.phone}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(ord)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-bold cursor-pointer transition-colors"
                            title="Edit Custom Price, Artwork Photos & Specs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Specs</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteOrder(ord)}
                            className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
                            title="Delete custom order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Brand Title & Price Breakdown Banner */}
                      <div className="bg-gradient-to-r from-slate-900 to-cyan-950 text-white rounded-2xl p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                              {customItem?.product.size} Brand Edition
                            </span>
                            <h4 className="font-heading text-lg font-black text-white mt-0.5">
                              "{c?.businessName || 'Custom Branding'}"
                            </h4>
                            {c?.tagline && <p className="text-xs text-cyan-100/80 italic mt-0.5">"{c.tagline}"</p>}
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-cyan-300 block uppercase font-semibold">Total Order</span>
                            <span className="font-heading text-lg font-black text-emerald-300">
                              ₹{ord.totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Price & Pieces breakdown */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Custom Unit Rate</span>
                            <span className="font-bold text-cyan-200">₹{unitPrice} / bottle</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Bottles Quantity</span>
                            <span className="font-bold text-white">{quantity.toLocaleString('en-IN')} pcs</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Design Stage</span>
                            <span className="font-bold text-amber-300">{c?.proofStatus || 'Pending Review'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Finish & Color Specs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Event Type</span>
                          <span className="font-semibold text-slate-800">{c?.eventType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Finish Style</span>
                          <span className="font-semibold text-slate-800">{c?.finishType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Cap Color</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs inline-block"
                              style={{ backgroundColor: c?.bottleCapColor || '#0284c7' }}
                            />
                            <span className="font-mono text-[10px] text-slate-700">{c?.bottleCapColor}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Theme Color</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs inline-block"
                              style={{ backgroundColor: c?.labelThemeColor || '#0284c7' }}
                            />
                            <span className="font-mono text-[10px] text-slate-700">{c?.labelThemeColor}</span>
                          </div>
                        </div>

                        {c?.dateOrVenue && (
                          <div className="col-span-2 sm:col-span-4 pt-1">
                            <span className="text-slate-400 text-[10px] block">Date & Venue</span>
                            <span className="font-semibold text-slate-800">{c.dateOrVenue}</span>
                          </div>
                        )}

                        {c?.specialInstructions && (
                          <div className="col-span-2 sm:col-span-4 bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                            <span className="font-bold block">Customer Special Instructions:</span>
                            <span>{c.specialInstructions}</span>
                          </div>
                        )}

                        {c?.adminNotes && (
                          <div className="col-span-2 sm:col-span-4 bg-blue-50 p-2 rounded-xl border border-blue-200 text-blue-900 text-[11px]">
                            <span className="font-bold block">Plant Admin Production Note:</span>
                            <span>{c.adminNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Customer Attached Files (Photos & Videos) */}
                      {c?.uploadedImages && c.uploadedImages.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Client Attached Artwork & Media ({c.uploadedImages.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {c.uploadedImages.map((img, i) => {
                              const isVideo = img.mediaType === 'video' || img.type?.startsWith('video/');
                              return (
                                <div
                                  key={i}
                                  className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border text-xs font-semibold transition-colors ${
                                    isVideo
                                      ? 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-cyan-50'
                                  }`}
                                >
                                  {isVideo ? (
                                    img.thumbnailUrl ? (
                                      <img
                                        src={img.thumbnailUrl}
                                        alt={img.name}
                                        className="w-6 h-6 rounded-lg object-cover bg-black border border-purple-300"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                                        <Video className="w-3.5 h-3.5" />
                                      </div>
                                    )
                                  ) : (
                                    <img
                                      src={img.url}
                                      alt={img.name}
                                      className="w-6 h-6 rounded-lg object-contain bg-white border border-slate-200"
                                    />
                                  )}
                                  <span className="truncate max-w-[100px] text-[11px]">{img.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setZoomImage({ url: img.url, title: img.name, isVideo })}
                                    className={`cursor-pointer ${isVideo ? 'text-purple-600 hover:text-purple-800' : 'text-cyan-600 hover:text-cyan-800'}`}
                                    title={isVideo ? 'Play video' : 'View image'}
                                  >
                                    {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <a
                                    href={img.url}
                                    download={img.name || (isVideo ? 'custom-video.mp4' : 'artwork.png')}
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Quick Actions (WhatsApp, Job Sheet, Edit) */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppProof(ord)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                          title="Send Order Quote on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Quote</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setJobSheetOrder(ord)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-colors"
                          title="Print Bottling Job Sheet"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Job Sheet</span>
                        </button>
                      </div>

                      {/* Quick Status Advance */}
                      <select
                        value={ord.status}
                        onChange={e => updateOrderStatus(ord.id, e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-cyan-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="New">New</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Ready">Ready</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: BOTTLE BASE PRICING & STUDIO PHOTOS CONFIG */}
      {subTab === 'pricing-photos' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-2">
            <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-600" />
              Custom Design Studio Catalog Rates & Showcase Photos
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl">
              Configure the base custom design unit price (₹/bottle), minimum order quantity, and studio showcase bottle image for each format.
              Changes update immediately in the customer-facing Custom Design Studio and Cart checkout!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(prod => {
              const currentForm = getCatalogForm(prod);
              const customPrice = currentForm.customDesignPrice;
              const stdPrice = currentForm.price;
              const sampleOrderRevenue = customPrice * currentForm.minOrderQty;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 hover:border-cyan-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Bottle Header & Preview Photo */}
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                      <div className="w-20 h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0 overflow-hidden relative group">
                        <img
                          src={currentForm.image}
                          alt={prod.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 block">
                          Format: {prod.size}
                        </span>
                        <h4 className="font-heading text-base font-bold text-slate-900">{prod.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Standard: ₹{stdPrice} • Custom Base: <strong className="text-cyan-700">₹{customPrice}/bottle</strong>
                        </p>
                        <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          600 pcs batch = ₹{sampleOrderRevenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Pricing Inputs */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Custom Design Price (₹/bottle) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={currentForm.customDesignPrice}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditingCatalogPrices(prev => ({
                                ...prev,
                                [prod.id]: { ...getCatalogForm(prod), customDesignPrice: val }
                              }));
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-bold text-cyan-800"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">Default is 2× normal price</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Standard Bottle Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="1"
                            value={currentForm.price}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditingCatalogPrices(prev => ({
                                ...prev,
                                [prod.id]: { ...getCatalogForm(prod), price: val }
                              }));
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-slate-800"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">Regular catalog price</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          MRP Printed (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="1"
                            value={currentForm.mrp}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditingCatalogPrices(prev => ({
                                ...prev,
                                [prod.id]: { ...getCatalogForm(prod), mrp: val }
                              }));
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-slate-800"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">Maximum retail price</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Min Custom Qty (pcs)
                        </label>
                        <input
                          type="number"
                          min="100"
                          step="100"
                          value={currentForm.minOrderQty}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 600;
                            setEditingCatalogPrices(prev => ({
                              ...prev,
                              [prod.id]: { ...getCatalogForm(prod), minOrderQty: val }
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-slate-800"
                        />
                        <span className="text-[10px] text-slate-400">MOQ for custom bottling</span>
                      </div>
                    </div>

                    {/* Bottle Showcase Photo URL / Upload */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Studio Bottle Showcase Photo:</span>
                        <label className="text-cyan-600 hover:text-cyan-800 cursor-pointer flex items-center gap-1 font-bold">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleCatalogPhotoUpload(prod.id, e)}
                            className="hidden"
                          />
                        </label>
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={currentForm.image}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingCatalogPrices(prev => ({
                            ...prev,
                            [prod.id]: { ...getCatalogForm(prod), image: val }
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    {/* Bottle Showcase 360° Video URL / Upload */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-purple-600" />
                          <span>360° Showcase Video:</span>
                        </span>
                        <label className="text-purple-600 hover:text-purple-800 cursor-pointer flex items-center gap-1 font-bold">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={e => handleCatalogVideoUpload(prod.id, e)}
                            className="hidden"
                          />
                        </label>
                      </label>
                      <input
                        type="url"
                        placeholder="https://... or upload MP4/WebM"
                        value={currentForm.videoUrl || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingCatalogPrices(prev => ({
                            ...prev,
                            [prod.id]: { ...getCatalogForm(prod), videoUrl: val }
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-purple-500 font-mono"
                      />
                      {currentForm.videoUrl && (
                        <div className="flex items-center justify-between bg-purple-50 p-1.5 rounded-lg text-[11px] text-purple-800">
                          <span className="truncate max-w-[200px]">Video Attached</span>
                          <button
                            type="button"
                            onClick={() => setZoomImage({ url: currentForm.videoUrl!, title: `${prod.name} Video`, isVideo: true })}
                            className="font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Preview</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleUpdateCatalogProduct(prod)}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save {prod.size} Price & Media Live</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: EDIT CUSTOM ORDER (PRICE, PHOTOS, DETAILS & SPECS) */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 block">
                  Admin Custom Editor
                </span>
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  Edit Order {editingOrder.id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: {editingOrder.customer.name} ({editingOrder.customer.phone})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: PRICE & QUANTITY EDITING */}
            <div className="bg-cyan-50/60 rounded-2xl p-5 border border-cyan-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-sm font-bold text-cyan-950 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-700" />
                  Price, Surcharge & Quantity Overrides
                </h4>
                <span className="text-[11px] font-bold text-cyan-700">Live Recalculation</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Custom Rate (₹/bottle) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={editPricePerBottle}
                      onChange={e => setEditPricePerBottle(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-cyan-900 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity (pieces) *</label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={editQuantity}
                    onChange={e => setEditQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plate / Cylinder Fee (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={editPlateCharge}
                      onChange={e => setEditPlateCharge(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Admin Discount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={editDiscount}
                      onChange={e => setEditDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-emerald-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Total Box */}
              <div className="bg-white rounded-xl p-3.5 border border-cyan-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Formula Breakdown</span>
                  <span className="font-mono text-slate-700">
                    ({editQuantity} pcs × ₹{editPricePerBottle}) + ₹{editPlateCharge} setup - ₹{editDiscount} disc
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Recalculated Custom Total</span>
                  <span className="font-heading text-lg font-black text-cyan-800">
                    ₹{((editQuantity * editPricePerBottle) + editPlateCharge - editDiscount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: PHOTO & ARTWORK MANAGEMENT */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                Artwork & Media Management
              </h4>

              {/* Client Artwork & Media Files */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <label className="font-bold text-slate-800">Attached Artwork & Video Files ({editUploadedImages.length}):</label>
                  <div className="flex items-center gap-3">
                    <label className="text-cyan-600 hover:text-cyan-800 cursor-pointer font-bold flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>+ Add Image</span>
                      <input
                        ref={newArtworkFileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAddArtworkImage}
                        className="hidden"
                      />
                    </label>
                    <label className="text-purple-600 hover:text-purple-800 cursor-pointer font-bold flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      <span>+ Add Video</span>
                      <input
                        ref={newArtworkVideoRef}
                        type="file"
                        accept="video/*"
                        onChange={handleAddArtworkVideo}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Add via URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Add artwork or video from URL (MP4, WebM, PNG, JPG)..."
                    value={newImageInputUrl}
                    onChange={e => setNewImageInputUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddArtworkUrl}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>

                {/* List of files with position switcher and remove */}
                {editUploadedImages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No artwork or video files attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {editUploadedImages.map(img => {
                      const isVideo = img.mediaType === 'video' || img.type?.startsWith('video/');
                      return (
                        <div
                          key={img.id}
                          className={`rounded-xl p-2 border flex items-center justify-between gap-2 ${
                            isVideo ? 'bg-purple-50/50 border-purple-200' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {isVideo ? (
                              img.thumbnailUrl ? (
                                <img
                                  src={img.thumbnailUrl}
                                  alt={img.name}
                                  className="w-8 h-8 rounded-lg object-cover bg-black border border-purple-300 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                                  <Video className="w-4 h-4" />
                                </div>
                              )
                            ) : (
                              <img
                                src={img.url}
                                alt={img.name}
                                className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                              />
                            )}
                            <div className="truncate text-xs">
                              <span className="font-bold text-slate-800 truncate block">{img.name}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePosition(img.id)}
                                  className="text-[10px] text-cyan-600 font-semibold hover:underline cursor-pointer"
                                >
                                  Position: {img.labelPosition || 'front'}
                                </button>
                                {isVideo && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold uppercase">
                                    Video Clip
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setZoomImage({ url: img.url, title: img.name, isVideo })}
                              className={`p-1 rounded-lg cursor-pointer ${
                                isVideo ? 'text-purple-600 hover:text-purple-800' : 'text-slate-400 hover:text-slate-700'
                              }`}
                              title={isVideo ? 'Play Video' : 'View Image'}
                            >
                              {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUploadedImage(img.id)}
                              className="p-1 rounded-lg text-rose-400 hover:text-rose-600 cursor-pointer"
                              title="Delete media"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: BRANDING & FINISH SPECS */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-600" />
                Branding, Color Palettes & Production Specs
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business / Brand Name *</label>
                  <input
                    type="text"
                    value={editBusinessName}
                    onChange={e => setEditBusinessName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tagline / Subtext</label>
                  <input
                    type="text"
                    value={editTagline}
                    onChange={e => setEditTagline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Event Type</label>
                  <select
                    value={editEventType}
                    onChange={e => setEditEventType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Hotel & Restaurant">Hotel & Restaurant</option>
                    <option value="Birthday & Party">Birthday & Party</option>
                    <option value="Personal Branding">Personal Branding</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Finish Type</label>
                  <select
                    value={editFinishType}
                    onChange={e => setEditFinishType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Matte Luxury">Matte Luxury</option>
                    <option value="Glossy Crystal">Glossy Crystal</option>
                    <option value="Gold Foil Accent">Gold Foil Accent</option>
                    <option value="Silver Metallic">Silver Metallic</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bottle Cap Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editCapColor}
                      onChange={e => setEditCapColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={editCapColor}
                      onChange={e => setEditCapColor(e.target.value)}
                      className="w-28 px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Label Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editThemeColor}
                      onChange={e => setEditThemeColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={editThemeColor}
                      onChange={e => setEditThemeColor(e.target.value)}
                      className="w-28 px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Date & Venue</label>
                  <input
                    type="text"
                    value={editDateVenue}
                    onChange={e => setEditDateVenue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Special Client Instructions</label>
                  <textarea
                    rows={2}
                    value={editInstructions}
                    onChange={e => setEditInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: DESIGN STATUS & INTERNAL NOTES */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Design Approval & Shop Floor Notes
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Design Approval Status</label>
                  <select
                    value={editProofStatus}
                    onChange={e => setEditProofStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Proof Ready">Artwork Approved</option>
                    <option value="Customer Approved">Customer Approved</option>
                    <option value="In Printing">In Printing</option>
                    <option value="Bottled">Bottled</option>
                    <option value="Dispatched">Dispatched</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Order Pipeline Status</label>
                  <select
                    value={editingOrder.status}
                    onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="New">New</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Ready">Ready</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Internal Admin Production Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Notes for print technician, cylinder engraver, or packaging team..."
                    value={editAdminNotes}
                    onChange={e => setEditAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveOrderEdits}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md cursor-pointer transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Custom Order Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE BOTTLING JOB SHEET */}
      {jobSheetOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6 print:m-0 print:p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-cyan-700 uppercase tracking-widest block">
                  Plant Job Sheet
                </span>
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  Custom Bottling Order {jobSheetOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setJobSheetOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content */}
            {(() => {
              const item = jobSheetOrder.items.find(i => i.isCustomDesign);
              const c = item?.customDesignDetails;
              return (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Client / Recipient:</span>
                      <strong className="text-slate-900 text-sm block">{jobSheetOrder.customer.name}</strong>
                      <span className="text-slate-600">{jobSheetOrder.customer.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Delivery Address:</span>
                      <span className="text-slate-800">
                        {jobSheetOrder.customer.address}, {jobSheetOrder.customer.city} - {jobSheetOrder.customer.pincode}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-700">Brand Title</span>
                        <h4 className="font-heading text-lg font-black text-slate-900">
                          "{c?.businessName || 'Custom Brand'}"
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Run Volume</span>
                        <div className="font-heading text-xl font-black text-cyan-700">
                          {item?.quantity.toLocaleString('en-IN')} Pieces
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Bottle Format</span>
                        <span className="font-bold text-slate-800">{item?.product.size}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Finish Type</span>
                        <span className="font-bold text-slate-800">{c?.finishType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Cap Color Code</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: c?.bottleCapColor || '#0284c7' }}
                          />
                          <span className="font-mono text-[10px]">{c?.bottleCapColor}</span>
                        </div>
                      </div>
                    </div>

                    {c?.specialInstructions && (
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                        <span className="font-bold block text-[10px]">Special Instructions:</span>
                        <span>{c.specialInstructions}</span>
                      </div>
                    )}

                    {c?.uploadedImages && c.uploadedImages.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                          Client Attached Artwork & Media ({c.uploadedImages.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {c.uploadedImages.map((img, idx) => (
                            <img
                              key={idx}
                              src={img.thumbnailUrl || img.url}
                              alt={img.name}
                              className="h-16 w-16 object-cover bg-slate-100 rounded-xl p-0.5 border border-slate-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Print Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Job Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE LIGHTBOX ZOOM */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 rounded-3xl max-w-2xl w-full p-4 border border-white/10 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 text-white border-b border-white/10">
              <div className="flex items-center gap-2 truncate">
                {(zoomImage.isVideo || zoomImage.url.startsWith('data:video') || zoomImage.url.endsWith('.mp4') || zoomImage.url.endsWith('.webm')) ? (
                  <Video className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <span className="text-xs font-bold truncate">{zoomImage.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center p-4">
              {(zoomImage.isVideo || zoomImage.url.startsWith('data:video') || zoomImage.url.endsWith('.mp4') || zoomImage.url.endsWith('.webm')) ? (
                <video
                  src={zoomImage.url}
                  controls
                  autoPlay
                  className="max-h-[65vh] max-w-full rounded-xl shadow-lg"
                />
              ) : (
                <img
                  src={zoomImage.url}
                  alt={zoomImage.title}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              )}
            </div>
            <div className="flex items-center justify-center pt-2 border-t border-white/10">
              <a
                href={zoomImage.url}
                download={zoomImage.title || 'media-download'}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Media File</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
