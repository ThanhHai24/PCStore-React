import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Trash2,
    Plus,
    Minus,
    CheckCircle,
    FileText,
    Image as ImageIcon,
    Printer,
    ShoppingBag,
    ShieldCheck,
    Tag,
    X,
    AlertTriangle,
    Truck,
    Lock,
    UserCheck,
    Package,
} from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import type { CustomerInfo, CartItem } from '../../../types/cart';
import type { OrderCreateRequest, OrderItemRequest, OrderResponse } from '../../../types/order';
import defaultPcImg from '../../../assets/images/products/pc.jpg';
import { provinceService } from '../../../services/provinceService';
import { orderService } from '../../../services/orderService';
import type { ProvinceResponse, WardResponse } from '../../../types/province';

export const Cart: React.FC = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, removeFromCart, clearCart, totalPrice, totalItems } = useCart();
    const { user } = useAuth();

    const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        city: 'Thành phố Hà Nội',
        ward: '',
        district: '',
        note: '',
        invoiceRequired: false,
    });

    // Auto-prefill if user is authenticated
    useEffect(() => {
        if (user) {
            setCustomerInfo((prev) => ({
                ...prev,
                fullName: prev.fullName || user.fullName || user.username || '',
                phone: prev.phone || (user as any).phone || (user as any).phoneNumber || '',
                email: prev.email || user.email || '',
                address: prev.address || (user as any).address || '',
            }));
        }
    }, [user]);

    const [provinces, setProvinces] = useState<ProvinceResponse[]>([]);
    const [wards, setWards] = useState<WardResponse[]>([]);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>(1);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState<boolean>(true);
    const [isLoadingWards, setIsLoadingWards] = useState<boolean>(false);

    // Mặc định chọn hình thức COD
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay'>('cod');
    const [orderSuccessModal, setOrderSuccessModal] = useState<boolean>(false);
    const [createdOrderData, setCreatedOrderData] = useState<OrderResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAuthRequiredModal, setShowAuthRequiredModal] = useState<boolean>(false);

    // Delete confirmation modal state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        type: 'item' | 'all';
        item?: CartItem;
    } | null>(null);

    // General notification modal state
    const [notificationMessage, setNotificationMessage] = useState<{
        title: string;
        message: string;
        type?: 'info' | 'success' | 'error';
    } | null>(null);

    const [formError, setFormError] = useState<string | null>(null);

    // Close modals on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (deleteConfirm) setDeleteConfirm(null);
                if (notificationMessage) setNotificationMessage(null);
                if (showAuthRequiredModal) setShowAuthRequiredModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteConfirm, notificationMessage, showAuthRequiredModal]);

    // Voucher code state
    const [voucherInput, setVoucherInput] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<{
        code: string;
        discountAmount: number;
        description: string;
    } | null>(null);
    const [voucherMessage, setVoucherMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Tải danh sách tỉnh/thành phố và phường/xã khởi tạo từ Province API
    useEffect(() => {
        let isMounted = true;
        const fetchInitialDivisions = async () => {
            try {
                setIsLoadingProvinces(true);
                const data = await provinceService.getProvinces();
                if (!isMounted) return;
                setProvinces(data);

                if (data.length > 0) {
                    const matched = data.find(
                        (p) =>
                            p.name.toLowerCase() === customerInfo.city?.toLowerCase() ||
                            p.codename === customerInfo.city?.toLowerCase()
                    );
                    const defaultProvince = matched || data.find((p) => p.code === 1) || data[0];
                    setSelectedProvinceCode(defaultProvince.code);
                    setCustomerInfo((prev) => ({
                        ...prev,
                        city: defaultProvince.name,
                    }));

                    // Tải phường/xã của tỉnh mặc định
                    setIsLoadingWards(true);
                    const wardList = await provinceService.getWardsByProvince(defaultProvince.code);
                    if (isMounted) {
                        setWards(wardList);
                    }
                }
            } catch (err) {
                console.error('Lỗi khi tải danh sách Tỉnh/Thành phố:', err);
            } finally {
                if (isMounted) {
                    setIsLoadingProvinces(false);
                    setIsLoadingWards(false);
                }
            }
        };

        fetchInitialDivisions();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = Number(e.target.value);
        if (!code) {
            setSelectedProvinceCode('');
            setWards([]);
            setCustomerInfo((prev) => ({
                ...prev,
                city: '',
                ward: '',
            }));
            return;
        }

        const prov = provinces.find((p) => p.code === code);
        setSelectedProvinceCode(code);
        setCustomerInfo((prev) => ({
            ...prev,
            city: prov ? prov.name : '',
            ward: '',
        }));

        try {
            setIsLoadingWards(true);
            const wardList = await provinceService.getWardsByProvince(code);
            setWards(wardList);
        } catch (error) {
            console.error(`Lỗi tải danh sách phường/xã cho tỉnh code=${code}:`, error);
            setWards([]);
        } finally {
            setIsLoadingWards(false);
        }
    };

    const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const wardName = e.target.value;
        setCustomerInfo((prev) => ({
            ...prev,
            ward: wardName,
        }));
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        if (formError) setFormError(null);
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setCustomerInfo((prev) => ({ ...prev, [name]: checked }));
        } else {
            setCustomerInfo((prev) => ({ ...prev, [name]: value }));
        }
    };

    const getItemPrice = (item: CartItem): number => {
        if (item.product.numericPrice && item.product.numericPrice > 0) {
            return item.product.numericPrice;
        }
        if (item.product.price) {
            const parsed = Number(String(item.product.price).replace(/[^\d]/g, ''));
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 0;
    };

    const formatVND = (price: number) => {
        return price.toLocaleString('vi-VN') + ' đ';
    };

    // Voucher calculation
    const handleApplyVoucher = (e: React.FormEvent) => {
        e.preventDefault();
        const code = voucherInput.trim().toUpperCase();
        if (!code) return;

        if (code === 'PCSTORE10') {
            const discount = Math.round(Math.min(totalPrice * 0.1, 1000000));
            setAppliedVoucher({
                code: 'PCSTORE10',
                discountAmount: discount,
                description: 'Giảm 10% (Tối đa 1.000.000đ)',
            });
            setVoucherMessage({ text: 'Áp dụng mã giảm giá 10% thành công!', type: 'success' });
            setVoucherInput('');
        } else if (code === 'GIAM100K') {
            const discount = Math.min(100000, totalPrice);
            setAppliedVoucher({
                code: 'GIAM100K',
                discountAmount: discount,
                description: 'Giảm trực tiếp 100.000đ',
            });
            setVoucherMessage({ text: 'Áp dụng voucher giảm 100.000đ thành công!', type: 'success' });
            setVoucherInput('');
        } else if (code === 'FREESHIP') {
            setAppliedVoucher({
                code: 'FREESHIP',
                discountAmount: 0,
                description: 'Miễn phí vận chuyển toàn quốc',
            });
            setVoucherMessage({ text: 'Đơn hàng đã được miễn phí vận chuyển!', type: 'success' });
            setVoucherInput('');
        } else {
            setVoucherMessage({ text: 'Mã giảm giá không hợp lệ hoặc đã hết hạn!', type: 'error' });
        }
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherMessage(null);
    };

    const discountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
    const finalPrice = Math.max(0, totalPrice - discountAmount);

    const handleOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

        setFormError(null);

        // 1. Kiểm tra trạng thái đăng nhập
        if (!user) {
            setShowAuthRequiredModal(true);
            return;
        }

        // 2. Validate họ tên, số điện thoại, địa chỉ
        const trimmedName = customerInfo.fullName.trim();
        const trimmedPhone = customerInfo.phone.trim();
        const trimmedAddress = customerInfo.address.trim();

        if (!trimmedName || !trimmedPhone || !trimmedAddress) {
            const msg = 'Vui lòng điền đầy đủ thông tin: Họ tên, Số điện thoại và Địa chỉ nhận hàng!';
            setFormError(msg);
            setNotificationMessage({
                title: 'Thiếu thông tin nhận hàng',
                message: msg,
                type: 'error',
            });
            return;
        }

        const cleanPhone = trimmedPhone.replace(/[\s.-]/g, '');
        if (!/^[0-9]{9,11}$/.test(cleanPhone)) {
            const msg = 'Số điện thoại nhận hàng không hợp lệ (cần từ 9 đến 11 chữ số)!';
            setFormError(msg);
            setNotificationMessage({
                title: 'Số điện thoại không hợp lệ',
                message: msg,
                type: 'error',
            });
            return;
        }

        // Ghép địa chỉ đầy đủ
        const fullShippingAddress = [
            trimmedAddress,
            customerInfo.ward ? `Phường/Xã ${customerInfo.ward}` : '',
            customerInfo.city,
        ]
            .filter(Boolean)
            .join(', ');

        // Ghi chú đơn hàng (nối thêm thông tin xuất VAT hoặc phân loại nếu có)
        const variantNotes = items
            .filter((it) => it.selectedVariant)
            .map((it) => `${it.product.title}: ${it.selectedVariant}`)
            .join('; ');

        const noteParts = [
            customerInfo.note?.trim(),
            customerInfo.invoiceRequired ? '[Yêu cầu xuất hóa đơn VAT công ty]' : '',
            variantNotes ? `[Phân loại: ${variantNotes}]` : '',
        ].filter(Boolean);

        const finalNote = noteParts.length > 0 ? noteParts.join(' | ') : undefined;

        // Chuẩn bị danh sách sản phẩm
        const orderItemsPayload: OrderItemRequest[] = items.map((item) => {
            const parsedId = Number(item.product.id);
            const productId = isNaN(parsedId) || parsedId <= 0 ? 1 : parsedId;
            const unitPrice = getItemPrice(item);

            return {
                productId,
                quantity: Math.max(1, item.quantity),
                unitPrice: unitPrice > 0 ? unitPrice : undefined,
                discountAmount: 0,
            };
        });

        const orderPayload: OrderCreateRequest = {
            type: 'ONLINE',
            recipientName: trimmedName,
            recipientPhone: cleanPhone,
            address: fullShippingAddress,
            note: finalNote,
            discountAmount: appliedVoucher ? appliedVoucher.discountAmount : 0,
            items: orderItemsPayload,
        };

        setIsSubmitting(true);

        try {
            // Gọi API Backend thật lưu đơn hàng COD
            const createdOrder = await orderService.createOrder(orderPayload);
            setCreatedOrderData(createdOrder);

            // Xóa sạch giỏ hàng sau khi đặt thành công
            clearCart();

            // Hiển thị modal đặt hàng COD thành công
            setOrderSuccessModal(true);
        } catch (err: any) {
            console.error('Lỗi khi đặt hàng:', err);
            const errMsg =
                err.message ||
                'Không thể hoàn tất đặt hàng. Vui lòng kiểm tra lại thông tin và kết nối máy chủ!';
            setFormError(errMsg);
            setNotificationMessage({
                title: 'Đặt hàng không thành công',
                message: errMsg,
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearCartConfirm = () => {
        setDeleteConfirm({
            isOpen: true,
            type: 'all',
        });
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'item' && deleteConfirm.item) {
            removeFromCart(deleteConfirm.item.product.id, deleteConfirm.item.selectedVariant);
        } else if (deleteConfirm.type === 'all') {
            clearCart();
        }
        setDeleteConfirm(null);
    };

    return (
        <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
            {/* Top Header Row */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                    <h1 className="text-lg font-extrabold text-gray-900">
                        Giỏ hàng của bạn
                    </h1>
                    {totalItems > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                            {totalItems} sản phẩm
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    <Link
                        to="/"
                        className="text-xs text-blue-600 hover:underline flex items-center space-x-1 font-semibold"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Mua thêm sản phẩm khác</span>
                    </Link>

                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearCartConfirm}
                            className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            Xóa giỏ hàng
                        </button>
                    )}
                </div>
            </div>

            {/* Banner nhắc nhở đăng nhập nếu khách hàng chưa đăng nhập */}
            {!user && items.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-extrabold text-blue-950 text-sm">Bạn chưa đăng nhập tài khoản</p>
                            <p className="text-gray-600 text-[11px] mt-0.5">
                                Đăng nhập giúp tự động điền thông tin, tích điểm và theo dõi trạng thái giao hàng thuận tiện.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate('/login', { state: { from: '/cart' } })}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Đăng nhập</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/register', { state: { from: '/cart' } })}
                            className="bg-white hover:bg-gray-50 text-blue-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                        >
                            Đăng ký
                        </button>
                    </div>
                </div>
            )}

            {items.length === 0 ? (
                /* Empty Cart State */
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-4 shadow-sm">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-3xl text-blue-500">
                        🛒
                    </div>
                    <h2 className="text-lg font-black text-gray-900">Giỏ hàng của bạn đang trống</h2>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                        Hãy chọn các sản phẩm PC Gaming, Linh kiện hoặc Màn hình ưng ý để thêm vào giỏ hàng nhé!
                    </p>
                    <Link
                        to="/"
                        className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase py-3 px-6 rounded-xl shadow-md transition-colors"
                    >
                        Khám phá sản phẩm ngay
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleOrderSubmit} className="space-y-6">
                    {/* Cart Items List */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 space-y-3 shadow-sm">
                        <div className="text-xs font-extrabold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center justify-between">
                            <span>Danh sách sản phẩm ({items.length})</span>
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Miễn phí vận chuyển toàn quốc
                            </span>
                        </div>

                        {items.map((item) => {
                            const unitPrice = getItemPrice(item);
                            const itemKey = `${item.product.id}_${item.selectedVariant || 'default'}`;
                            const maxStock = item.product.stockQuantity ?? 15;

                            return (
                                <div
                                    key={itemKey}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-all gap-4 bg-gray-50/30"
                                >
                                    {/* Product Info & Thumbnail */}
                                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                                        <div className="w-16 h-16 bg-white rounded-xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 shadow-inner">
                                            <img
                                                src={item.product.images?.[0] || defaultPcImg}
                                                alt={item.product.title}
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = defaultPcImg;
                                                }}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                to={`/product/${item.product.id}`}
                                                className="text-xs font-bold text-gray-800 line-clamp-2 hover:text-red-600 transition-colors"
                                            >
                                                {item.product.title}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {item.selectedVariant && (
                                                    <span className="inline-block text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        {item.selectedVariant}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-gray-400">
                                                    Đơn giá: {formatVND(unitPrice)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity & Pricing Controls */}
                                    <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0">
                                        {/* Quantity [- 1 +] */}
                                        <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-xs">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (item.quantity <= 1) {
                                                        setDeleteConfirm({
                                                            isOpen: true,
                                                            type: 'item',
                                                            item,
                                                        });
                                                    } else {
                                                        updateQuantity(item.product.id, item.quantity - 1, item.selectedVariant);
                                                    }
                                                }}
                                                className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 cursor-pointer"
                                                aria-label="Giảm số lượng"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="px-3 text-xs font-bold text-gray-900 border-x border-gray-200">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (item.quantity < maxStock) {
                                                        updateQuantity(item.product.id, item.quantity + 1, item.selectedVariant);
                                                    }
                                                }}
                                                disabled={item.quantity >= maxStock}
                                                className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                                aria-label="Tăng số lượng"
                                                title={item.quantity >= maxStock ? `Đã đạt giới hạn kho: ${maxStock}` : ''}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right min-w-[110px]">
                                            <div className="text-xs font-black text-red-600">
                                                {formatVND(unitPrice * item.quantity)}
                                            </div>
                                            {item.product.marketPrice && (
                                                <div className="text-[10px] text-gray-400 line-through">
                                                    {item.product.marketPrice}
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove Trash Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDeleteConfirm({
                                                    isOpen: true,
                                                    type: 'item',
                                                    item,
                                                });
                                            }}
                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Xóa sản phẩm này"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* VOUCHER / MÃ GIẢM GIÁ Box */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-gray-800">
                            <Tag className="w-4 h-4 text-amber-500" />
                            <span>MÃ GIẢM GIÁ / KHUYẾN MÃI</span>
                        </div>

                        {appliedVoucher ? (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                                <div className="flex items-center space-x-2">
                                    <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                        {appliedVoucher.code}
                                    </span>
                                    <span className="text-emerald-700 font-medium">
                                        {appliedVoucher.description} (-{formatVND(appliedVoucher.discountAmount)})
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveVoucher}
                                    className="text-emerald-700 hover:text-red-600 font-bold p-1 cursor-pointer"
                                    title="Gỡ mã giảm giá"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    placeholder="Nhập mã voucher (vd: PCSTORE10, GIAM100K, FREESHIP)..."
                                    value={voucherInput}
                                    onChange={(e) => setVoucherInput(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyVoucher}
                                    className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        )}

                        {voucherMessage && (
                            <p
                                className={`text-[11px] font-medium ${voucherMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                    }`}
                            >
                                {voucherMessage.text}
                            </p>
                        )}
                    </div>

                    {/* THÔNG TIN GIAO HÀNG Form Box */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h2 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck className="w-4 h-4" />
                                <span>THÔNG TIN GIAO HÀNG (COD)</span>
                            </h2>
                            {user && (
                                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> Đã đăng nhập: {user.fullName || user.username}
                                </span>
                            )}
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    Họ tên người nhận hàng <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                    required
                                    value={customerInfo.fullName}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Số điện thoại người nhận <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Ví dụ: 0912345678"
                                        required
                                        value={customerInfo.phone}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Email xác nhận (không bắt buộc)
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Ví dụ: email@gmail.com"
                                        value={customerInfo.email}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    Địa chỉ nhận hàng (Số nhà, ngõ, tên đường) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Ví dụ: Số 123 Đường Cầu Giấy"
                                    required
                                    value={customerInfo.address}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Tỉnh / Thành phố */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Tỉnh / Thành phố
                                    </label>
                                    <select
                                        name="city"
                                        value={selectedProvinceCode || ''}
                                        onChange={handleProvinceChange}
                                        disabled={isLoadingProvinces}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 bg-white text-xs cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        {isLoadingProvinces ? (
                                            <option value="">Đang tải danh sách tỉnh/thành...</option>
                                        ) : (
                                            <>
                                                <option value="">-- Chọn Tỉnh / Thành phố --</option>
                                                {provinces.map((p) => (
                                                    <option key={p.code} value={p.code}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Phường / Xã */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Phường / Xã
                                    </label>
                                    <select
                                        name="ward"
                                        value={customerInfo.ward || ''}
                                        onChange={handleWardChange}
                                        disabled={isLoadingWards || !selectedProvinceCode || wards.length === 0}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 bg-white text-xs cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {isLoadingWards
                                                ? 'Đang tải danh sách xã/phường...'
                                                : !selectedProvinceCode
                                                    ? '-- Vui lòng chọn Tỉnh/Thành trước --'
                                                    : wards.length === 0
                                                        ? '-- Không có dữ liệu xã/phường --'
                                                        : '-- Chọn Phường / Xã --'}
                                        </option>
                                        {wards.map((w) => (
                                            <option key={w.code} value={w.name}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    Ghi chú giao hàng
                                </label>
                                <textarea
                                    name="note"
                                    rows={2}
                                    placeholder="Ví dụ: Giao vào giờ hành chính, gọi trước khi giao 15 phút..."
                                    value={customerInfo.note}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                                />
                            </div>

                            <div className="flex items-center space-x-2 text-gray-700 pt-1">
                                <input
                                    type="checkbox"
                                    id="invoiceRequired"
                                    name="invoiceRequired"
                                    checked={customerInfo.invoiceRequired}
                                    onChange={handleInputChange}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="invoiceRequired" className="text-[11px] font-medium cursor-pointer">
                                    Yêu cầu xuất hóa đơn điện tử VAT cho đơn hàng này
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* PHƯƠNG THỨC THANH TOÁN Box */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 transition-all space-y-3 shadow-sm text-xs">
                        <div className="flex items-center justify-between">
                            <h2 className="font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck className="w-4 h-4" />
                                <span>PHƯƠNG THỨC THANH TOÁN</span>
                            </h2>
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100">
                                Thanh toán khi nhận hàng (COD)
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {/* Option 1: COD (Active & Recommended) */}
                            <label
                                className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'cod'
                                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 font-bold ring-1 ring-blue-500'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={() => setPaymentMethod('cod')}
                                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-extrabold text-xs text-gray-900">
                                                Thanh toán khi nhận hàng (COD)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-normal mt-0.5 leading-relaxed">
                                            Thanh toán trực tiếp cho nhân viên giao hàng sau khi nhận và kiểm tra sản phẩm
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* Option 2: VNPAY (Tạm thời thông báo chưa mở) */}
                            <div className="p-3.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/70">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="vnpay"
                                            disabled
                                            className="mt-0.5 text-gray-300 cursor-not-allowed"
                                        />
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold text-xs text-gray-600">
                                                    Cổng thanh toán điện tử VNPAY (QR / Thẻ ATM / Thẻ quốc tế)
                                                </span>
                                                <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded border border-amber-200">
                                                    Tạm ẩn / Sắp ra mắt
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-normal mt-0.5 leading-relaxed">
                                                Thanh toán trực tuyến qua cổng VNPAY đang được tích hợp thêm.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="bg-gray-200 text-gray-500 font-black text-[9px] px-1.5 py-0.5 rounded tracking-wider shrink-0">
                                        VNPAY
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TỔNG TIỀN Box */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-3 shadow-sm text-xs">
                        <h2 className="font-extrabold text-gray-900 uppercase">TỔNG KẾT ĐƠN HÀNG</h2>
                        <div className="space-y-2 border-t border-gray-100 pt-3">
                            <div className="flex justify-between text-gray-600">
                                <span>Tạm tính ({totalItems} sản phẩm):</span>
                                <span className="font-bold text-gray-900">{formatVND(totalPrice)}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-semibold">
                                    <span>Giảm giá khuyến mãi:</span>
                                    <span>-{formatVND(discountAmount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-gray-600">
                                <span>Phí vận chuyển:</span>
                                <span className="font-bold text-emerald-600">Miễn phí toàn quốc</span>
                            </div>

                            <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-2 border-t border-gray-100">
                                <span>Tổng thanh toán: </span>
                                <span className="text-red-600 text-lg font-black">{formatVND(finalPrice)}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 text-right italic">(Giá đã bao gồm VAT và vận chuyển)</div>
                        </div>
                    </div>

                    {/* Form Error Banner */}
                    {formError && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2.5 animate-in fade-in">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                            <span className="font-semibold">{formError}</span>
                        </div>
                    )}

                    {/* Action Buttons Row */}
                    <div className="space-y-2.5">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-4 rounded-xl text-center text-sm uppercase tracking-wider shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>ĐANG TẠO ĐƠN HÀNG ...</span>
                                </>
                            ) : (
                                <span>XÁC NHẬN ĐẶT HÀNG ({formatVND(finalPrice)})</span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setNotificationMessage({
                                    title: 'Mua trả góp 0%',
                                    message: 'Tính năng mua trả góp 0% qua thẻ tín dụng đang được chuẩn bị và sẽ sớm ra mắt.',
                                    type: 'info',
                                })
                            }
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 px-4 rounded-xl text-center text-xs uppercase tracking-wider shadow transition-colors cursor-pointer"
                        >
                            MUA TRẢ GÓP 0%
                        </button>

                        {/* Utility Buttons Row: EXCEL, BÁO GIÁ, IN BÁO GIÁ */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() =>
                                    setNotificationMessage({
                                        title: 'Báo giá Excel',
                                        message: 'Đã chuẩn bị và tải xuống bảng báo giá chi tiết sản phẩm Excel (mô phỏng).',
                                        type: 'success',
                                    })
                                }
                                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>TẢI FILE EXCEL</span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setNotificationMessage({
                                        title: 'Hình ảnh báo giá',
                                        message: 'Đã xuất file hình ảnh phiếu báo giá đơn hàng của bạn thành công!',
                                        type: 'success',
                                    })
                                }
                                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>TẢI ẢNH BÁO GIÁ</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>IN BÁO GIÁ</span>
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Modal Yêu Cầu Đăng Nhập Để Đặt Hàng */}
            {showAuthRequiredModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAuthRequiredModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full text-center space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95">
                        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Lock className="w-7 h-7" />
                        </div>

                        <div>
                            <h3 className="text-lg font-black text-gray-900">
                                Vui lòng đăng nhập để đặt hàng
                            </h3>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                Để lưu trữ đơn hàng, bảo hành sản phẩm và theo dõi tiến độ giao nhận, bạn cần đăng nhập tài khoản trước khi hoàn tất đặt hàng.
                            </p>
                            <p className="text-[11px] text-blue-700 mt-2 font-medium bg-blue-50 py-1.5 px-3 rounded-xl inline-block border border-blue-100">
                                🛒 Toàn bộ {totalItems} sản phẩm trong giỏ hàng sẽ được giữ nguyên!
                            </p>
                        </div>

                        <div className="space-y-2 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/login', { state: { from: '/cart' } })}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition-colors shadow flex items-center justify-center space-x-2 cursor-pointer"
                            >
                                <UserCheck className="w-4 h-4" />
                                <span>Đăng nhập ngay</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/register', { state: { from: '/cart' } })}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Chưa có tài khoản? Đăng ký ngay
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAuthRequiredModal(false)}
                                className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium py-1 transition-colors cursor-pointer"
                            >
                                Quay lại giỏ hàng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && deleteConfirm.isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteConfirm(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full text-center space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Trash2 className="w-7 h-7" />
                        </div>

                        <div>
                            <h3 className="text-lg font-black text-gray-900">
                                {deleteConfirm.type === 'all'
                                    ? 'Xóa toàn bộ giỏ hàng?'
                                    : 'Xóa sản phẩm khỏi giỏ hàng?'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                {deleteConfirm.type === 'all'
                                    ? `Bạn có chắc chắn muốn xóa toàn bộ ${totalItems} sản phẩm khỏi giỏ hàng không? Thao tác này không thể hoàn tác.`
                                    : 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?'}
                            </p>
                        </div>

                        {deleteConfirm.type === 'item' && deleteConfirm.item && (
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                <div className="w-14 h-14 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center border border-gray-200 overflow-hidden shadow-xs">
                                    <img
                                        src={deleteConfirm.item.product.images?.[0] || defaultPcImg}
                                        alt={deleteConfirm.item.product.title}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-gray-800 line-clamp-2">
                                        {deleteConfirm.item.product.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {deleteConfirm.item.selectedVariant && (
                                            <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                {deleteConfirm.item.selectedVariant}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-gray-500">
                                            SL: {deleteConfirm.item.quantity}
                                        </span>
                                        <span className="text-xs font-black text-red-600">
                                            {formatVND(getItemPrice(deleteConfirm.item) * deleteConfirm.item.quantity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-red-200 active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{deleteConfirm.type === 'all' ? 'Xóa tất cả' : 'Xác nhận xóa'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* General Notification / Alert Modal */}
            {notificationMessage && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setNotificationMessage(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95">
                        <div
                            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-inner ${notificationMessage.type === 'error'
                                ? 'bg-red-100 text-red-600'
                                : notificationMessage.type === 'success'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-blue-100 text-blue-600'
                                }`}
                        >
                            {notificationMessage.type === 'error' ? (
                                <AlertTriangle className="w-7 h-7" />
                            ) : notificationMessage.type === 'success' ? (
                                <CheckCircle className="w-7 h-7" />
                            ) : (
                                <ShoppingBag className="w-7 h-7" />
                            )}
                        </div>

                        <div>
                            <h3 className="text-base font-black text-gray-900">
                                {notificationMessage.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                {notificationMessage.message}
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setNotificationMessage(null)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition-colors cursor-pointer"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Success Modal */}
            {orderSuccessModal && createdOrderData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Đặt hàng COD thành công!</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Đơn hàng của bạn đã được ghi nhận trên hệ thống và đang chờ xác nhận
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 font-medium space-y-2 text-left">
                            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                                <span className="text-gray-600">Mã đơn hàng:</span>
                                <span className="font-black text-sm text-blue-950 font-mono select-all">
                                    {createdOrderData.code}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Trạng thái:</span>
                                <span className="bg-amber-100 text-amber-800 font-extrabold text-[11px] px-2 py-0.5 rounded-full border border-amber-200">
                                    Chờ xác nhận (PENDING)
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Hình thức thanh toán:</span>
                                <span className="font-bold text-gray-900">Thanh toán khi nhận hàng (COD)</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-blue-100">
                                <span className="font-bold text-gray-700">Tổng tiền thu hộ (COD):</span>
                                <span className="font-black text-base text-red-600">
                                    {formatVND(createdOrderData.finalAmount ?? createdOrderData.totalAmount ?? 0)}
                                </span>
                            </div>
                        </div>

                        {/* Thông tin người nhận */}
                        <div className="text-left text-xs text-gray-700 space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="font-bold text-gray-900 text-[11px] uppercase tracking-wide border-b border-gray-200 pb-1 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Thông tin giao hàng</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div>
                                    <span className="text-gray-400 text-[10px] block">Người nhận:</span>
                                    <span className="font-bold text-gray-900">
                                        {createdOrderData.recipientName || customerInfo.fullName}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[10px] block">Số điện thoại:</span>
                                    <span className="font-bold text-blue-700">
                                        {createdOrderData.recipientPhone || customerInfo.phone}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-400 text-[10px] block">Địa chỉ giao:</span>
                                <span className="font-medium text-gray-800">
                                    {createdOrderData.address || customerInfo.address}
                                </span>
                            </div>
                            {createdOrderData.note && (
                                <div>
                                    <span className="text-gray-400 text-[10px] block">Ghi chú:</span>
                                    <span className="italic text-gray-600">{createdOrderData.note}</span>
                                </div>
                            )}
                        </div>

                        {/* Danh sách mặt hàng trong đơn */}
                        {createdOrderData.items && createdOrderData.items.length > 0 && (
                            <div className="text-left text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                                <div className="font-bold text-gray-900 text-[11px] uppercase tracking-wide border-b border-gray-200 pb-1">
                                    Sản phẩm trong đơn ({createdOrderData.items.length})
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {createdOrderData.items.map((it: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className="font-semibold text-gray-800 truncate">
                                                    {it.productName || `Sản phẩm #${it.productId}`}
                                                </p>
                                                <span className="text-[10px] text-gray-400">SL: x{it.quantity}</span>
                                            </div>
                                            <span className="font-bold text-gray-900 shrink-0">
                                                {formatVND((it.unitPrice || 0) * (it.quantity || 1))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-gray-500 leading-relaxed italic">
                            Nhân viên CSKH của PC Store sẽ liên hệ qua số điện thoại{' '}
                            <strong className="text-blue-600 font-bold">
                                {createdOrderData.recipientPhone || customerInfo.phone}
                            </strong>{' '}
                            để xác nhận đơn trước khi đóng gói và gửi cho đơn vị vận chuyển.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderSuccessModal(false);
                                    navigate('/account?tab=orders');
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase shadow transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                            >
                                <Package className="w-4 h-4" />
                                <span>Xem đơn hàng của tôi</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderSuccessModal(false);
                                    navigate('/');
                                }}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase transition-colors cursor-pointer"
                            >
                                Tiếp tục mua sắm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
