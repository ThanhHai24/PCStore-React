import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart,
    Plus,
    Trash2,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Calendar,
    DollarSign,
    RefreshCw,
    AlertCircle,
    User,
    Phone,
    MapPin,
    Globe,
    Printer,
    Search,
    ChevronRight,
    Copy,
    Tag,
    Boxes,
    FileText,
    RotateCcw,
    Ban,
    Package,
    Store,
    Check,
    CreditCard,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Truck,
    Box,
    Barcode,
    AlertTriangle,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminSelect,
    AdminButton,
    AdminLabel,
    AdminTextarea,
    AdminModalFooter,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { useAuth } from '../../../context/AuthContext';
import { adminOrderService } from '../../../services/adminOrderService';
import { adminUserService } from '../../../services/adminUserService';
import { adminProductService } from '../../../services/adminProductService';
import { orderFulfillmentService } from '../../../services/orderFulfillmentService';
import type {
    OrderResponse,
    OrderItemResponse,
    OrderStatus,
    OrderType,
    OrderCreateRequest,
} from '../../../types/adminOrder';
import type { BackendUserResponse } from '../../../types/adminUser';
import type { ProductResponse } from '../../../types/adminProduct';

// UI Model for display in Table
export interface OrderUI {
    id: string; // for table rowKey
    numericId: number;
    code: string;
    userId: number;
    customerUsername: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    recipientName: string;
    recipientPhone: string;
    address: string;
    note: string;
    type: OrderType;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    status: OrderStatus;
    items: OrderItemResponse[];
    totalItems: number;
    totalQuantity: number;
    createdDate?: string | null;
    createdBy?: number | null;
    lastModifiedDate?: string | null;
    lastModifiedBy?: number | null;
    rawResponse: OrderResponse;
}

// Item row draft in Add form
export interface FormOrderItemRow {
    productId: number;
    productCode: string;
    productName: string;
    imageUrl?: string | null;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    subtotal: number;
}

// Helpers
function formatVND(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDateTime(isoString?: string | null): string {
    if (!isoString) return 'Chưa cập nhật';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return isoString;
    }
}

// Order Status Visuals
export const ORDER_STATUS_CONFIG: Record<
    OrderStatus,
    {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        icon: React.ElementType;
        description: string;
    }
> = {
    PENDING: {
        label: 'Chờ xác nhận',
        color: 'text-amber-800',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        icon: Clock,
        description: 'Đơn mới đặt, đang chờ nhân viên kiểm tra và xác nhận',
    },
    CONFIRMED: {
        label: 'Đã xác nhận',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: CheckCircle2,
        description: 'Đơn hàng đã được duyệt, chuyển sang bộ phận đóng gói/xuất kho',
    },
    PROCESSING: {
        label: 'Đang xử lý / Đóng gói',
        color: 'text-indigo-800',
        bgColor: 'bg-indigo-100',
        borderColor: 'border-indigo-300',
        icon: Package,
        description: 'Đơn đang được kiểm hàng, đóng gói hoặc giao cho vận chuyển',
    },
    COMPLETED: {
        label: 'Hoàn tất giao dịch',
        color: 'text-emerald-800',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        icon: CheckCircle2,
        description: 'Khách hàng đã nhận hàng và hoàn tất thanh toán thành công',
    },
    CANCELLED: {
        label: 'Đã hủy',
        color: 'text-rose-800',
        bgColor: 'bg-rose-100',
        borderColor: 'border-rose-300',
        icon: XCircle,
        description: 'Đơn hàng đã bị hủy bỏ bởi khách hàng hoặc nhân viên',
    },
    RETURNED: {
        label: 'Trả hàng / Hoàn tiền',
        color: 'text-purple-800',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        icon: RotateCcw,
        description: 'Đơn hàng đã được hoàn trả lại hoặc hoàn tiền cho khách hàng',
    },
    REJECTED: {
        label: 'Đã từ chối',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        icon: Ban,
        description: 'Đơn hàng bị từ chối tiếp nhận (hết hàng hoặc thông tin sai)',
    },
};

// Order Type Visuals
export const ORDER_TYPE_CONFIG: Record<
    OrderType,
    {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        icon: React.ElementType;
    }
> = {
    ONLINE: {
        label: 'Trực tuyến (Web)',
        color: 'text-sky-700',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
        icon: Globe,
    },
    IN_STORE: {
        label: 'Bán tại quầy',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: Store,
    },
};

export default function OrderList() {
    const { toast } = useToast();
    const { user } = useAuth();

    // Data State
    const [orders, setOrders] = useState<OrderUI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [userFilter, setUserFilter] = useState<string>('ALL');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    // Debounce search query by 350ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrderUI | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'items' | 'payment'>('overview');

    // Create Order Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeCreateTab, setActiveCreateTab] = useState<'customer' | 'items' | 'summary'>('customer');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Product Picker in Create Modal
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<ProductResponse[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    // User Picker in Create Modal
    const [availableUsers, setAvailableUsers] = useState<BackendUserResponse[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // Create Form State
    const initialCreateForm = {
        code: '',
        type: 'IN_STORE' as OrderType,
        recipientName: '',
        recipientPhone: '',
        address: '',
        note: '',
        discountAmount: 0,
        items: [] as FormOrderItemRow[],
    };
    const [createForm, setCreateForm] = useState(initialCreateForm);

    // Quick Status Update Dialog State
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [orderToUpdateStatus, setOrderToUpdateStatus] = useState<OrderUI | null>(null);
    const [targetStatus, setTargetStatus] = useState<OrderStatus>('CONFIRMED');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<OrderUI | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const navigate = useNavigate();

    // Sơ đồ luồng nghiệp vụ 4 giai đoạn bán hàng
    const [showSalesWorkflowGuide, setShowSalesWorkflowGuide] = useState(true);

    // Modal Thẩm định tồn kho khả dụng (Giai đoạn 2 - Nhân viên bán hàng)
    const [isAppraisalModalOpen, setIsAppraisalModalOpen] = useState(false);
    const [appraisalOrder, setAppraisalOrder] = useState<OrderUI | null>(null);
    const [appraisalResult, setAppraisalResult] = useState<{
        isAvailable: boolean;
        itemsCheck: {
            productId: number;
            productName: string;
            productCode: string;
            requestedQty: number;
            inStockQty: number;
            isSufficient: boolean;
        }[];
    } | null>(null);
    const [isCheckingStock, setIsCheckingStock] = useState(false);
    const [appraisalStaff, setAppraisalStaff] = useState<string>(
        user?.fullName || user?.username || 'Nhân viên bán hàng'
    );

    useEffect(() => {
        if (user?.fullName || user?.username) {
            setAppraisalStaff(user.fullName || user.username);
        }
    }, [user]);

    const [appraisalNotes, setAppraisalNotes] = useState('Đã kiểm tra tồn kho khả dụng, đáp ứng đủ số lượng đơn hàng.');
    const [cancellationReason, setCancellationReason] = useState('Kho không đủ số lượng tồn kho khả dụng. Khách hàng đã được thông báo và đồng ý hủy đơn.');
    const [isSubmittingAppraisal, setIsSubmittingAppraisal] = useState(false);

    // Mở modal thẩm định tồn kho khả dụng (GĐ 2)
    const handleOpenAppraisalModal = async (order: OrderUI) => {
        setAppraisalOrder(order);
        if (user?.fullName || user?.username) {
            setAppraisalStaff(user.fullName || user.username);
        }
        setIsCheckingStock(true);
        setIsAppraisalModalOpen(true);
        try {
            const rawOrder = order.rawResponse;
            const res = await orderFulfillmentService.checkStockAvailability(rawOrder);
            setAppraisalResult(res);
            if (res.isAvailable) {
                setAppraisalNotes('Tồn kho sẵn sàng, chuyển yêu cầu đóng gói linh kiện cho bộ phận kho.');
            } else {
                setCancellationReason('Tồn kho thực tế không đủ đáp ứng số lượng đặt mua. Đã liên hệ khách hàng thông báo và thỏa thuận hủy đơn.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCheckingStock(false);
        }
    };

    // Xác nhận còn hàng & chuyển sang kho đóng gói
    const handleConfirmAndSendToWarehouse = async () => {
        if (!appraisalOrder) return;
        setIsSubmittingAppraisal(true);
        try {
            await orderFulfillmentService.approveOrderToPackaging(appraisalOrder.numericId, {
                staffName: appraisalStaff,
                notes: appraisalNotes,
                stockCheckResult: appraisalResult,
            });
            toast.success(`Đã xác nhận đơn ${appraisalOrder.code} và gửi yêu cầu đóng gói xuống bộ phận kho!`);
            setIsAppraisalModalOpen(false);
            fetchOrders();
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi xác nhận đơn');
        } finally {
            setIsSubmittingAppraisal(false);
        }
    };

    // Hủy đơn do hết hàng (Khách hàng đồng ý)
    const handleCancelOrderOutOfStock = async () => {
        if (!appraisalOrder) return;
        setIsSubmittingAppraisal(true);
        try {
            await orderFulfillmentService.cancelOrderOutOfStock(appraisalOrder.numericId, {
                staffName: appraisalStaff,
                cancellationReason,
                customerAgreed: true,
            });
            toast.warning(`Đã hủy đơn ${appraisalOrder.code} do hết hàng tồn kho khả dụng (Khách hàng đã đồng ý).`);
            setIsAppraisalModalOpen(false);
            fetchOrders();
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi hủy đơn');
        } finally {
            setIsSubmittingAppraisal(false);
        }
    };

    // Load available products for picker
    const fetchProductsForPicker = useCallback(async () => {
        try {
            setIsLoadingProducts(true);
            const res = await adminProductService.getAllProducts({
                status: 'ACTIVE',
                size: 100,
            });
            setAvailableProducts(res.content || []);
        } catch {
            // Silently fallback
        } finally {
            setIsLoadingProducts(false);
        }
    }, []);

    // Load registered users for customer selection
    const fetchUsersForPicker = useCallback(async () => {
        try {
            setIsLoadingUsers(true);
            const res = await adminUserService.getAllUsers({
                size: 100,
            });
            setAvailableUsers(res.content || []);
        } catch {
            // Silently fallback
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    // Transform backend response to UI model
    const mapToUI = useCallback((raw: OrderResponse): OrderUI => {
        const items = raw.items || [];
        const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
            id: String(raw.id),
            numericId: raw.id,
            code: raw.code || `ORD-${raw.id}`,
            userId: raw.userId,
            customerUsername: raw.customerUsername || `User #${raw.userId}`,
            customerName: raw.customerName || raw.recipientName || 'Khách hàng',
            customerEmail: raw.customerEmail || '',
            customerPhone: raw.customerPhone || raw.recipientPhone || '',
            recipientName: raw.recipientName || raw.customerName || 'Chưa cung cấp',
            recipientPhone: raw.recipientPhone || raw.customerPhone || 'Chưa cung cấp',
            address: raw.address || (raw.type === 'IN_STORE' ? 'Bán tại cửa hàng PCStore' : 'Chưa cung cấp'),
            note: raw.note || '',
            type: raw.type || 'ONLINE',
            totalAmount: raw.totalAmount || 0,
            discountAmount: raw.discountAmount || 0,
            finalAmount: raw.finalAmount || (raw.totalAmount - (raw.discountAmount || 0)),
            status: raw.status || 'PENDING',
            items: items,
            totalItems: items.length,
            totalQuantity: totalQty,
            createdDate: raw.createdDate,
            createdBy: raw.createdBy,
            lastModifiedDate: raw.lastModifiedDate,
            lastModifiedBy: raw.lastModifiedBy,
            rawResponse: raw,
        };
    }, []);

    // Fetch Orders List
    const fetchOrders = useCallback(
        async (isBackgroundRefresh = false) => {
            if (isBackgroundRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                // Validate date range if both provided
                if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
                    toast.warning('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
                    setIsLoading(false);
                    setIsRefreshing(false);
                    return;
                }

                const res = await adminOrderService.getAllOrders({
                    keyword: debouncedSearch.trim() || undefined,
                    status: statusFilter !== 'ALL' ? (statusFilter as OrderStatus) : undefined,
                    type: typeFilter !== 'ALL' ? (typeFilter as OrderType) : undefined,
                    userId: userFilter !== 'ALL' && userFilter ? userFilter : undefined,
                    fromDate: fromDate ? `${fromDate}T00:00:00Z` : undefined,
                    toDate: toDate ? `${toDate}T23:59:59Z` : undefined,
                    page: currentPage - 1, // backend is 0-indexed
                    size: pageSize,
                    sort: ['createdDate,desc'],
                });

                const mapped = (res.content || []).map(mapToUI);
                (res.content || []).forEach((ord) => {
                    orderFulfillmentService.ensureFulfillmentRecord(ord);
                });
                setOrders(mapped);
                setTotalElements(res.totalElements || 0);
                setTotalPages(res.totalPages || 1);
            } catch (err: any) {
                const message = err?.message || 'Không thể tải danh sách đơn hàng từ máy chủ.';
                setError(message);
                toast.error(message, 'Lỗi tải dữ liệu');
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [currentPage, debouncedSearch, fromDate, mapToUI, pageSize, statusFilter, toDate, toast, typeFilter, userFilter]
    );

    // Initial load and filter change
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Initial fetch of users for filter and picker
    useEffect(() => {
        fetchUsersForPicker();
    }, [fetchUsersForPicker]);

    // Statistics metrics
    const stats = useMemo(() => {
        const total = totalElements;
        let pendingCount = 0;
        let processingCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;
        let completedRevenue = 0;

        orders.forEach((o) => {
            if (o.status === 'PENDING') pendingCount += 1;
            if (o.status === 'CONFIRMED' || o.status === 'PROCESSING') processingCount += 1;
            if (o.status === 'COMPLETED') {
                completedCount += 1;
                completedRevenue += o.finalAmount;
            }
            if (o.status === 'CANCELLED' || o.status === 'RETURNED' || o.status === 'REJECTED') {
                cancelledCount += 1;
            }
        });

        return {
            total,
            pendingCount,
            processingCount,
            completedCount,
            cancelledCount,
            completedRevenue,
        };
    }, [orders, totalElements]);

    // Copy Order Code
    const handleCopyCode = (code: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigator.clipboard.writeText(code);
        toast.success(`Đã sao chép mã đơn hàng "${code}" vào bộ nhớ tạm!`);
    };

    // Open Detail Modal
    const handleOpenDetail = (order: OrderUI) => {
        setSelectedOrder(order);
        setActiveDetailTab('overview');
        setIsDetailModalOpen(true);
    };

    // Open Create Order Modal
    const handleOpenCreateModal = () => {
        setCreateForm(initialCreateForm);
        setSelectedUserId(null);
        setActiveCreateTab('customer');
        setIsCreateModalOpen(true);
        fetchProductsForPicker();
        fetchUsersForPicker();
    };

    // Handle select user in Create Modal
    const handleSelectCustomer = (user: BackendUserResponse | null) => {
        if (!user) {
            setSelectedUserId(null);
            return;
        }
        setSelectedUserId(user.id);
        setCreateForm((prev) => ({
            ...prev,
            recipientName: prev.recipientName || user.fullName || user.username || '',
            recipientPhone: prev.recipientPhone || user.phoneNumber || '',
            address: prev.address || user.address || '',
        }));
    };

    // Handle Add Product Item to Form
    const handleAddProductToForm = (prod: ProductResponse) => {
        const existingIndex = createForm.items.findIndex((item) => item.productId === prod.id);
        const unitPrice = prod.price || 0;

        if (existingIndex >= 0) {
            // Increase qty
            setCreateForm((prev) => {
                const nextItems = [...prev.items];
                const cur = nextItems[existingIndex];
                const newQty = cur.quantity + 1;
                const newSubtotal = newQty * cur.unitPrice - cur.discountAmount;
                nextItems[existingIndex] = {
                    ...cur,
                    quantity: newQty,
                    subtotal: Math.max(0, newSubtotal),
                };
                return { ...prev, items: nextItems };
            });
            toast.success(`Đã tăng số lượng ${prod.name}`);
        } else {
            // Add new line
            const newItem: FormOrderItemRow = {
                productId: prod.id,
                productCode: prod.code,
                productName: prod.name,
                imageUrl: prod.imageUrl,
                quantity: 1,
                unitPrice: unitPrice,
                discountAmount: 0,
                subtotal: unitPrice,
            };
            setCreateForm((prev) => ({
                ...prev,
                items: [...prev.items, newItem],
            }));
            toast.success(`Đã thêm "${prod.name}" vào đơn hàng`);
        }
    };

    // Handle Remove Item from Form
    const handleRemoveProductFromForm = (index: number) => {
        setCreateForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index),
        }));
    };

    // Handle change line item values
    const handleChangeFormItem = (
        index: number,
        field: 'quantity' | 'unitPrice' | 'discountAmount',
        val: number
    ) => {
        setCreateForm((prev) => {
            const nextItems = [...prev.items];
            const item = { ...nextItems[index] };

            if (field === 'quantity') {
                item.quantity = Math.max(1, Math.floor(val) || 1);
            } else if (field === 'unitPrice') {
                item.unitPrice = Math.max(0, val || 0);
            } else if (field === 'discountAmount') {
                item.discountAmount = Math.max(0, val || 0);
            }

            const rawSubtotal = item.quantity * item.unitPrice - item.discountAmount;
            item.subtotal = Math.max(0, rawSubtotal);
            nextItems[index] = item;

            return { ...prev, items: nextItems };
        });
    };

    // Calculate totals for create form
    const createFormTotals = useMemo(() => {
        const totalItemsCost = createForm.items.reduce((sum, it) => sum + it.subtotal, 0);
        const orderDiscount = Math.max(0, createForm.discountAmount || 0);
        const finalCost = Math.max(0, totalItemsCost - orderDiscount);
        return {
            totalItemsCost,
            orderDiscount,
            finalCost,
            itemCount: createForm.items.length,
            totalQuantity: createForm.items.reduce((sum, it) => sum + it.quantity, 0),
        };
    }, [createForm.discountAmount, createForm.items]);

    // Submit Create Order
    const handleCreateOrderSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (createForm.items.length === 0) {
            toast.error('Đơn hàng cần có ít nhất một sản phẩm!');
            setActiveCreateTab('items');
            return;
        }

        if (createForm.type === 'ONLINE' && !createForm.address.trim()) {
            toast.error('Vui lòng nhập địa chỉ nhận hàng cho đơn trực tuyến!');
            setActiveCreateTab('customer');
            return;
        }

        try {
            setIsSubmitting(true);

            const payload: OrderCreateRequest = {
                code: createForm.code.trim() ? createForm.code.trim() : undefined,
                userId: selectedUserId || undefined,
                type: createForm.type,
                recipientName: createForm.recipientName.trim() || undefined,
                recipientPhone: createForm.recipientPhone.trim() || undefined,
                address: createForm.address.trim() || undefined,
                note: createForm.note.trim() || undefined,
                discountAmount: createForm.discountAmount > 0 ? createForm.discountAmount : undefined,
                items: createForm.items.map((it) => ({
                    productId: it.productId,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    discountAmount: it.discountAmount > 0 ? it.discountAmount : undefined,
                })),
            };

            const created = await adminOrderService.createOrder(payload);
            orderFulfillmentService.ensureFulfillmentRecord(created);
            toast.success(`Tạo đơn hàng ${created.code} thành công!`, 'Thành công');
            setIsCreateModalOpen(false);
            fetchOrders();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi tạo đơn hàng mới', 'Thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Quick Status Update Dialog
    const handlePromptStatusChange = (order: OrderUI, defaultTarget?: OrderStatus, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setOrderToUpdateStatus(order);
        setTargetStatus(defaultTarget || 'CONFIRMED');
        setIsStatusModalOpen(true);
    };

    // Submit Status Update
    const handleConfirmStatusUpdate = async () => {
        if (!orderToUpdateStatus) return;

        try {
            setIsUpdatingStatus(true);
            const updated = await adminOrderService.updateOrderStatus(orderToUpdateStatus.numericId, targetStatus);
            orderFulfillmentService.ensureFulfillmentRecord(updated);
            toast.success(`Đã cập nhật trạng thái đơn ${updated.code} sang "${ORDER_STATUS_CONFIG[targetStatus]?.label}"`);
            setIsStatusModalOpen(false);

            // If detail modal is open with this order, update it as well
            if (selectedOrder && selectedOrder.numericId === orderToUpdateStatus.numericId) {
                setSelectedOrder(mapToUI(updated));
            }

            fetchOrders(true);
        } catch (err: any) {
            toast.error(err.message || 'Không thể cập nhật trạng thái đơn hàng', 'Lỗi');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Open Delete Confirm
    const handlePromptDelete = (order: OrderUI, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (order.status === 'COMPLETED') {
            toast.error('Không thể xóa đơn hàng đã hoàn tất giao dịch!');
            return;
        }
        setOrderToDelete(order);
        setIsDeleteModalOpen(true);
    };

    // Execute Delete Order
    const handleConfirmDelete = async () => {
        if (!orderToDelete) return;

        try {
            setIsDeleting(true);
            await adminOrderService.deleteOrder(orderToDelete.numericId);
            orderFulfillmentService.removeFulfillmentRecord(orderToDelete.numericId);
            toast.success(`Đã xóa đơn hàng "${orderToDelete.code}" thành công`);
            setIsDeleteModalOpen(false);
            if (selectedOrder?.numericId === orderToDelete.numericId) {
                setIsDetailModalOpen(false);
            }
            fetchOrders(true);
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa đơn hàng này', 'Lỗi');
        } finally {
            setIsDeleting(false);
        }
    };

    // Print Order Invoice
    const handlePrintOrder = (order: OrderUI, e?: React.MouseEvent) => {
        e?.stopPropagation();

        // Open dedicated clean print window
        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (!printWindow) {
            toast.error('Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để in hóa đơn.');
            return;
        }

        const itemsHtml = (order.items || [])
            .map((item, index) => `
                <tr>
                    <td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-weight: 600; color: #1e293b;">${item.productName || item.productCode}</div>
                        <div style="font-size: 11px; color: #64748b;">Mã SP: ${item.productCode}</div>
                    </td>
                    <td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatVND(item.unitPrice)}</td>
                    <td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">${item.quantity}</td>
                    <td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0; color: #dc2626;">${item.discountAmount > 0 ? '-' + formatVND(item.discountAmount) : '0 ₫'}</td>
                    <td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0; font-weight: 700; color: #0284c7;">${formatVND(item.subtotal)}</td>
                </tr>
            `)
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Hóa đơn bán hàng - ${order.code}</title>
                <style>
                    body {
                        font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: #1e293b;
                        margin: 24px;
                        font-size: 13px;
                        line-height: 1.5;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #0284c7;
                        padding-bottom: 16px;
                        margin-bottom: 20px;
                    }
                    .company-name {
                        font-size: 20px;
                        font-weight: 800;
                        color: #0284c7;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .title {
                        text-align: center;
                        font-size: 20px;
                        font-weight: 800;
                        text-transform: uppercase;
                        margin: 16px 0 8px;
                        color: #0f172a;
                    }
                    .order-code {
                        text-align: center;
                        font-size: 13px;
                        color: #64748b;
                        margin-bottom: 20px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                        border: 1px solid #e2e8f0;
                    }
                    .info-line {
                        margin-bottom: 6px;
                    }
                    .info-label {
                        font-weight: 600;
                        color: #475569;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th {
                        background-color: #f1f5f9;
                        padding: 10px 8px;
                        font-weight: 700;
                        color: #334155;
                        border: 1px solid #cbd5e1;
                        font-size: 12px;
                    }
                    .total-box {
                        margin-left: auto;
                        width: 340px;
                        background: #f8fafc;
                        padding: 12px 16px;
                        border-radius: 6px;
                        border: 1px solid #e2e8f0;
                        margin-bottom: 30px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                    }
                    .total-row.final {
                        border-top: 2px solid #0284c7;
                        margin-top: 8px;
                        padding-top: 8px;
                        font-size: 15px;
                        font-weight: 800;
                        color: #0284c7;
                    }
                    .signatures {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        text-align: center;
                        margin-top: 40px;
                        page-break-inside: avoid;
                    }
                    .sign-title {
                        font-weight: 700;
                        margin-bottom: 4px;
                    }
                    .sign-sub {
                        font-size: 11px;
                        color: #64748b;
                        margin-bottom: 70px;
                    }
                    @media print {
                        body { margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="company-name">PC STORE VIỆT NAM</div>
                        <div style="font-size: 12px; color: #475569; margin-top: 4px;">Hệ thống linh kiện máy tính, Gaming Gear & PC cao cấp</div>
                        <div style="font-size: 12px; color: #64748b;">Địa chỉ: Tầng 2, Tòa nhà Công nghệ cao, Hà Nội</div>
                        <div style="font-size: 12px; color: #64748b;">Hotline: 1900 6868 | Email: contact@pcstore.vn</div>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: #64748b;">
                        <div>Loại đơn: <strong>${ORDER_TYPE_CONFIG[order.type]?.label || order.type}</strong></div>
                        <div>Trạng thái: <strong>${ORDER_STATUS_CONFIG[order.status]?.label || order.status}</strong></div>
                        <div>Ngày in: <strong>${new Date().toLocaleDateString('vi-VN')}</strong></div>
                    </div>
                </div>

                <div class="title">HÓA ĐƠN BÁN HÀNG & PHIẾU XUẤT KHO</div>
                <div class="order-code">Số đơn hàng: <strong>${order.code}</strong> (Ngày tạo: ${formatDateTime(order.createdDate)})</div>

                <div class="info-grid">
                    <div>
                        <div class="info-line"><span class="info-label">Khách hàng:</span> ${order.recipientName}</div>
                        <div class="info-line"><span class="info-label">Số điện thoại:</span> ${order.recipientPhone}</div>
                        <div class="info-line"><span class="info-label">Địa chỉ nhận hàng:</span> ${order.address}</div>
                    </div>
                    <div>
                        <div class="info-line"><span class="info-label">Tài khoản đặt:</span> ${order.customerUsername}</div>
                        <div class="info-line"><span class="info-label">Ghi chú giao hàng:</span> ${order.note || 'Không có ghi chú'}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">STT</th>
                            <th>Tên sản phẩm / Linh kiện</th>
                            <th style="width: 120px; text-align: right;">Đơn giá</th>
                            <th style="width: 80px; text-align: center;">SL</th>
                            <th style="width: 110px; text-align: right;">Giảm giá</th>
                            <th style="width: 130px; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total-box">
                    <div class="total-row">
                        <span style="color: #475569;">Tổng tiền hàng:</span>
                        <span style="font-weight: 600;">${formatVND(order.totalAmount)}</span>
                    </div>
                    <div class="total-row">
                        <span style="color: #475569;">Chiết khấu đơn hàng:</span>
                        <span style="color: #dc2626; font-weight: 600;">${order.discountAmount > 0 ? '-' + formatVND(order.discountAmount) : '0 ₫'}</span>
                    </div>
                    <div class="total-row final">
                        <span>TỔNG THANH TOÁN:</span>
                        <span>${formatVND(order.finalAmount)}</span>
                    </div>
                </div>

                <div class="signatures">
                    <div>
                        <div class="sign-title">Khách hàng nhận hàng</div>
                        <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
                    </div>
                    <div>
                        <div class="sign-title">Nhân viên bán hàng</div>
                        <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
                    </div>
                    <div>
                        <div class="sign-title">Thủ kho xuất hàng</div>
                        <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
                    Cảm ơn Quý khách đã mua sắm tại PC Store! Quý khách vui lòng kiểm tra hàng kỹ trước khi nhận. Đổi mới trong vòng 7 ngày nếu lỗi phần cứng từ nhà sản xuất.
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 350);
    };

    // Quick status navigation tabs
    const statusTabs = useMemo(
        () => [
            { key: 'ALL', label: 'Tất cả đơn', icon: ShoppingCart },
            { key: 'PENDING', label: 'Chờ xác nhận', icon: Clock },
            { key: 'CONFIRMED', label: 'Đã xác nhận', icon: CheckCircle2 },
            { key: 'PROCESSING', label: 'Đang đóng gói', icon: Package },
            { key: 'COMPLETED', label: 'Hoàn tất giao dịch', icon: CheckCircle2 },
            { key: 'CANCELLED', label: 'Đã hủy', icon: XCircle },
            { key: 'RETURNED', label: 'Trả hàng / Hoàn tiền', icon: RotateCcw },
            { key: 'REJECTED', label: 'Đã từ chối', icon: Ban },
        ],
        []
    );

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = useMemo(
        () => [
            {
                id: 'status',
                label: 'Trạng thái đơn',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Clock,
                options: [
                    { label: 'Chờ xác nhận (PENDING)', value: 'PENDING' },
                    { label: 'Đã xác nhận (CONFIRMED)', value: 'CONFIRMED' },
                    { label: 'Đang xử lý / Đóng gói (PROCESSING)', value: 'PROCESSING' },
                    { label: 'Hoàn tất giao dịch (COMPLETED)', value: 'COMPLETED' },
                    { label: 'Đã hủy (CANCELLED)', value: 'CANCELLED' },
                    { label: 'Trả hàng / Hoàn tiền (RETURNED)', value: 'RETURNED' },
                    { label: 'Đã từ chối (REJECTED)', value: 'REJECTED' },
                ],
            },
            {
                id: 'type',
                label: 'Loại đơn hàng',
                type: 'select',
                placeholder: 'Tất cả loại đơn',
                icon: Store,
                options: [
                    { label: 'Trực tuyến (ONLINE)', value: 'ONLINE' },
                    { label: 'Bán tại quầy (IN_STORE)', value: 'IN_STORE' },
                ],
            },
            {
                id: 'userId',
                label: 'Khách hàng',
                type: 'select',
                placeholder: 'Tất cả khách hàng',
                icon: User,
                options: availableUsers.map((u) => ({
                    label: `${u.fullName || u.username} (${u.phoneNumber || u.email || `@${u.username}`})`,
                    value: String(u.id),
                })),
            },
            {
                id: 'fromDate',
                label: 'Từ ngày đặt',
                type: 'date',
                icon: Calendar,
            },
            {
                id: 'toDate',
                label: 'Đến ngày đặt',
                type: 'date',
                icon: Calendar,
            },
        ],
        [availableUsers]
    );

    // Active filter values passed to AdminFilter (only truly active filters)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (statusFilter && statusFilter !== 'ALL') {
            vals.status = statusFilter;
        }
        if (typeFilter && typeFilter !== 'ALL') {
            vals.type = typeFilter;
        }
        if (userFilter && userFilter !== 'ALL') {
            vals.userId = userFilter;
        }
        if (fromDate) {
            vals.fromDate = fromDate;
        }
        if (toDate) {
            vals.toDate = toDate;
        }
        return vals;
    }, [statusFilter, typeFilter, userFilter, fromDate, toDate]);

    // Handle filter changes from AdminFilter (dropdowns, chips, clear button)
    const handleFilterChange = (newValues: Record<string, any>) => {
        setStatusFilter(newValues.status || 'ALL');
        setTypeFilter(newValues.type || 'ALL');
        setUserFilter(newValues.userId || 'ALL');
        setFromDate(newValues.fromDate || '');
        setToDate(newValues.toDate || '');
        setCurrentPage(1);
    };

    // Reset filters
    const handleResetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setStatusFilter('ALL');
        setTypeFilter('ALL');
        setUserFilter('ALL');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    // Export CSV
    const handleExportCSV = () => {
        if (orders.length === 0) {
            toast.warning('Không có dữ liệu đơn hàng để xuất!');
            return;
        }

        const headers = ['Mã đơn', 'Ngày tạo', 'Loại đơn', 'Khách hàng', 'SĐT', 'Địa chỉ', 'Tổng tiền hàng', 'Giảm giá', 'Thực thu', 'Trạng thái', 'Ghi chú'];
        const rows = orders.map((o) => [
            o.code,
            formatDateTime(o.createdDate),
            ORDER_TYPE_CONFIG[o.type]?.label || o.type,
            `"${o.recipientName.replace(/"/g, '""')}"`,
            `"${o.recipientPhone}"`,
            `"${o.address.replace(/"/g, '""')}"`,
            o.totalAmount,
            o.discountAmount,
            o.finalAmount,
            ORDER_STATUS_CONFIG[o.status]?.label || o.status,
            `"${(o.note || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `danh_sach_don_hang_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Đã xuất file báo cáo đơn hàng CSV!');
    };

    // Columns Definition for AdminTable
    const columns: Column<OrderUI>[] = useMemo(
        () => [
            {
                key: 'code',
                header: 'Mã đơn & Thời gian',
                render: (order) => {
                    const typeCfg = ORDER_TYPE_CONFIG[order.type] || ORDER_TYPE_CONFIG.ONLINE;
                    const TypeIcon = typeCfg.icon;

                    return (
                        <div className="space-y-1.5 py-1 min-w-[150px]">
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors">
                                    {order.code}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => handleCopyCode(order.code, e)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                    title="Sao chép mã đơn"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeCfg.bgColor} ${typeCfg.color} ${typeCfg.borderColor}`}
                                >
                                    <TypeIcon className="w-3 h-3" />
                                    {typeCfg.label}
                                </span>
                            </div>

                            <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>{formatDateTime(order.createdDate)}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'customer',
                header: 'Khách hàng / Người nhận',
                render: (order) => (
                    <div className="space-y-1 py-1 max-w-[210px]">
                        <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{order.recipientName}</span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{order.recipientPhone}</span>
                        </div>
                        {order.customerUsername && order.customerUsername !== order.recipientName && (
                            <div className="text-[11px] text-gray-400 truncate">
                                @<span className="font-medium text-gray-600">{order.customerUsername}</span>
                            </div>
                        )}
                    </div>
                ),
            },
            {
                key: 'address',
                header: 'Địa chỉ nhận hàng',
                render: (order) => {
                    if (order.type === 'IN_STORE') {
                        return (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 inline-flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5" />
                                <span>Nhận trực tiếp tại quầy</span>
                            </div>
                        );
                    }
                    return (
                        <div className="text-xs text-gray-600 max-w-[220px] flex items-start gap-1.5 py-1">
                            <span className="line-clamp-2" title={order.address}>
                                {order.address || 'Chưa cung cấp địa chỉ'}
                            </span>
                        </div>
                    );
                },
            },
            {
                key: 'itemsSummary',
                header: 'Mặt hàng đặt mua',
                render: (order) => {
                    const firstItem = order.items?.[0];
                    const moreCount = order.items?.length - 1;

                    return (
                        <div className="space-y-1.5 text-xs py-1 max-w-[200px]">
                            <div className="font-semibold text-gray-700 flex flex-col items-center gap-1">
                                <span>Tổng mặt hàng: {order.totalItems}</span>
                                <span>Tổng số lượng: {order.totalQuantity}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'amount',
                header: 'Thanh toán (VND)',
                align: 'right',
                render: (order) => (
                    <div className="space-y-0.5 text-right py-1 min-w-[130px]">
                        <div className="font-mono text-sm font-extrabold text-blue-700">
                            {formatVND(order.finalAmount)}
                        </div>
                        {order.discountAmount > 0 && (
                            <div className="text-[11px] text-rose-600 flex items-center justify-end gap-1">
                                <Tag className="w-3 h-3" />
                                <span>Giảm: -{formatVND(order.discountAmount)}</span>
                            </div>
                        )}
                        <div className="text-[10px] text-gray-400">
                            Gốc: {formatVND(order.totalAmount)}
                        </div>
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Trạng thái',
                align: 'center',
                render: (order) => {
                    const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
                    const StatusIcon = cfg.icon;

                    return (
                        <div className="flex flex-col items-center gap-1 py-1">
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}
                                title={cfg.description}
                            >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {cfg.label}
                            </span>
                        </div>
                    );
                },
            },
            {
                key: 'actions',
                header: 'Thao tác',
                align: 'right',
                render: (order) => {
                    const canDelete = order.status !== 'COMPLETED';
                    const canCancel =
                        order.status === 'PENDING' ||
                        order.status === 'CONFIRMED' ||
                        order.status === 'PROCESSING';

                    return (
                        <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {order.status === 'PENDING' && (
                                <button
                                    type="button"
                                    onClick={() => handleOpenAppraisalModal(order)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all cursor-pointer mr-1"
                                    title="Thẩm định tồn kho khả dụng & Phân nhánh đơn"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Xác nhận đơn</span>
                                </button>
                            )}

                            {order.status === 'CONFIRMED' && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/warehouse/packaging')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer mr-1"
                                    title="Quản lý đóng gói kho"
                                >
                                    <Box className="w-3.5 h-3.5" />
                                    <span>Đóng gói</span>
                                </button>
                            )}

                            {order.status === 'PROCESSING' && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/warehouse/handover')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all cursor-pointer mr-1"
                                    title="Bàn giao ĐVVC"
                                >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Bàn giao ĐVVC</span>
                                </button>
                            )}

                            <AdminActionDropdown
                                onView={() => handleOpenDetail(order)}
                                viewLabel="Xem chi tiết đơn hàng"
                                actions={[
                                    {
                                        key: 'status-update',
                                        label: 'Cập nhật trạng thái đơn',
                                        description: 'Thay đổi tiến độ xử lý đơn hàng',
                                        icon: RefreshCw,
                                        variant: 'warning',
                                        onClick: (e) =>
                                            handlePromptStatusChange(order, order.status, e),
                                    },
                                ]}
                                moreActions={[
                                    {
                                        key: 'print-order',
                                        label: 'In hóa đơn / phiếu giao hàng',
                                        description: 'Xuất bản in hóa đơn cho khách',
                                        icon: Printer,
                                        variant: 'primary',
                                        onClick: (e) => handlePrintOrder(order, e),
                                    },
                                    {
                                        key: 'cancel-order',
                                        label: 'Hủy đơn hàng này',
                                        description: 'Hủy đơn và hoàn trả tồn kho',
                                        icon: Ban,
                                        variant: 'danger',
                                        hidden: !canCancel,
                                        dividerBefore: true,
                                        onClick: (e) =>
                                            handlePromptStatusChange(order, 'CANCELLED', e),
                                    },
                                ]}
                                onDelete={canDelete ? (e) => handlePromptDelete(order, e) : undefined}
                                deleteLabel="Xóa đơn hàng"
                                deleteDescription="Xóa đơn hàng khỏi hệ thống"
                            />
                        </div>
                    );
                },
            },
        ],
        []
    );

    // Detail Modal Tabs Configuration
    const detailTabs: ModalTab[] = useMemo(
        () => [
            {
                id: 'overview',
                label: 'Tổng quan đơn',
                icon: FileText,
            },
            {
                id: 'items',
                label: 'Sản phẩm đặt mua',
                icon: Boxes,
                badge: selectedOrder?.items?.length || 0,
            },
            {
                id: 'payment',
                label: 'Thanh toán & Hạch toán',
                icon: DollarSign,
            },
        ],
        [selectedOrder]
    );

    // Create Modal Tabs Configuration
    const createTabs: ModalTab[] = useMemo(
        () => [
            {
                id: 'customer',
                label: '1. Khách hàng & Giao nhận',
                icon: User,
            },
            {
                id: 'items',
                label: '2. Mặt hàng đặt mua',
                icon: Boxes,
                badge: createForm.items.length || 0,
            },
            {
                id: 'summary',
                label: '3. Xác nhận & Tổng kết',
                icon: CheckCircle2,
            },
        ],
        [createForm.items.length]
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>Trang chủ</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>Quản lý bán hàng</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="font-semibold text-blue-600">Quản lý đơn hàng</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => fetchOrders(true)}
                        disabled={isLoading || isRefreshing}
                        className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Tải lại danh sách đơn hàng"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Xuất dữ liệu đơn hàng ra file CSV"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>Xuất CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo đơn hàng mới</span>
                    </button>
                </div>
            </div>

            {/* Quick Status Tabs & Filter Section */}
            <div className="space-y-3">

                {/* Filter Toolbar */}
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => {
                        setSearchQuery(q);
                        setCurrentPage(1);
                    }}
                    onSearch={(q) => {
                        setSearchQuery(q);
                        setDebouncedSearch(q);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Tìm kiếm theo mã đơn, họ tên người nhận, SĐT, địa chỉ..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />
            </div>

            {/* Error banner if any */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchOrders()}
                        className="font-semibold underline hover:text-red-900 cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Main Orders Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={orders}
                    rowKey="id"
                    loading={isLoading}
                    emptyText="Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại."
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 20, 50]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    onRowClick={(item) => handleOpenDetail(item)}
                    itemUnitName="đơn hàng"
                />
            </div>

            {/* 1. ORDER DETAIL MODAL */}
            {selectedOrder && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2">
                            <span>Chi tiết đơn hàng: </span>
                            <span className="font-mono text-blue-600 font-bold">{selectedOrder.code}</span>
                        </div>
                    }
                    subtitle={`Tạo lúc: ${formatDateTime(selectedOrder.createdDate)}`}
                    size="xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(id) => setActiveDetailTab(id as any)}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => handlePrintOrder(selectedOrder)}
                                    icon={<Printer className="w-4 h-4 text-indigo-600" />}
                                >
                                    In hóa đơn
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={() => handlePromptStatusChange(selectedOrder)}
                                    icon={<RefreshCw className="w-4 h-4" />}
                                >
                                    Đổi trạng thái
                                </AdminButton>
                            </div>

                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsDetailModalOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                        </div>
                    }
                >
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Status banner */}
                            {(() => {
                                const cfg = ORDER_STATUS_CONFIG[selectedOrder.status] || ORDER_STATUS_CONFIG.PENDING;
                                const StatusIcon = cfg.icon;
                                const typeCfg = ORDER_TYPE_CONFIG[selectedOrder.type] || ORDER_TYPE_CONFIG.ONLINE;
                                const TypeIcon = typeCfg.icon;

                                return (
                                    <div className={`p-4 rounded-xl border flex items-center justify-between ${cfg.bgColor} ${cfg.borderColor}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-white/80 shadow-sm ${cfg.color}`}>
                                                <StatusIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-base font-bold ${cfg.color}`}>{cfg.label}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border bg-white ${typeCfg.color} ${typeCfg.borderColor} flex items-center gap-1`}>
                                                        <TypeIcon className="w-3 h-3" />
                                                        {typeCfg.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-0.5">{cfg.description}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Tổng tiền thực thanh toán</div>
                                            <div className="text-xl font-mono font-extrabold text-blue-700">
                                                {formatVND(selectedOrder.finalAmount)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Customer & Recipient Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span>Thông tin người nhận</span>
                                    </h3>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Họ và tên:</span>
                                            <span className="font-semibold text-gray-900">{selectedOrder.recipientName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Số điện thoại:</span>
                                            <span className="font-mono font-semibold text-gray-900">{selectedOrder.recipientPhone}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-gray-500 shrink-0">Địa chỉ giao:</span>
                                            <span className="font-medium text-gray-900 text-right ml-4">{selectedOrder.address}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-gray-500 shrink-0">Ghi chú:</span>
                                            <span className="text-gray-700 italic text-right ml-4">{selectedOrder.note || 'Không có ghi chú'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                                        <CreditCard className="w-4 h-4 text-emerald-600" />
                                        <span>Tài khoản đặt & Nhật ký</span>
                                    </h3>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Mã khách hàng:</span>
                                            <span className="font-mono text-gray-700">#{selectedOrder.userId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tên đăng nhập:</span>
                                            <span className="font-semibold text-gray-900">{selectedOrder.customerUsername}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Email:</span>
                                            <span className="text-gray-900">{selectedOrder.customerEmail || '---'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Thời gian tạo:</span>
                                            <span className="text-gray-900">{formatDateTime(selectedOrder.createdDate)}</span>
                                        </div>
                                        {selectedOrder.lastModifiedDate && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Cập nhật gần nhất:</span>
                                                <span className="text-gray-900">{formatDateTime(selectedOrder.lastModifiedDate)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'items' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Danh sách gồm <strong>{selectedOrder.items?.length || 0}</strong> mặt hàng:</span>
                                <span>Tổng số lượng: <strong>{selectedOrder.totalQuantity}</strong> sản phẩm</span>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                                            <th className="py-2.5 px-3">Sản phẩm</th>
                                            <th className="py-2.5 px-3 text-right">Đơn giá</th>
                                            <th className="py-2.5 px-3 text-center">Số lượng</th>
                                            <th className="py-2.5 px-3 text-right">Giảm giá</th>
                                            <th className="py-2.5 px-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(selectedOrder.items || []).map((item, index) => (
                                            <tr key={item.id || index} className="hover:bg-gray-50/50">
                                                <td className="py-3 px-3 text-center font-mono text-gray-500">{index + 1}</td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-3">
                                                        {item.productImageUrl ? (
                                                            <img
                                                                src={item.productImageUrl}
                                                                alt={item.productName}
                                                                className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center shrink-0">
                                                                <Boxes className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-xs">{item.productName}</p>
                                                            <p className="font-mono text-[11px] text-gray-400">Mã: {item.productCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-gray-700">
                                                    {formatVND(item.unitPrice)}
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold text-gray-900 font-mono">
                                                    {item.quantity}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-rose-600">
                                                    {item.discountAmount > 0 ? `-${formatVND(item.discountAmount)}` : '0 ₫'}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                                                    {formatVND(item.subtotal)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'payment' && (
                        <div className="space-y-4 max-w-lg mx-auto p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">
                                Chi tiết thanh toán & Quyết toán đơn
                            </h3>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center text-gray-600">
                                    <span>Tổng giá trị tiền hàng:</span>
                                    <span className="font-mono font-semibold text-gray-900">{formatVND(selectedOrder.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600">
                                    <span>Giảm giá khuyến mãi / Voucher:</span>
                                    <span className="font-mono font-semibold text-rose-600">
                                        {selectedOrder.discountAmount > 0 ? `-${formatVND(selectedOrder.discountAmount)}` : '0 ₫'}
                                    </span>
                                </div>
                                <div className="border-t border-gray-300 pt-2.5 flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-900">Tổng thanh toán thực tế:</span>
                                    <span className="font-mono text-base text-blue-700">{formatVND(selectedOrder.finalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* 2. CREATE ORDER MODAL */}
            <AdminModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Tạo đơn hàng mới"
                subtitle="Dành cho nhân viên bán hàng tại quầy (POS) hoặc đặt hàng trực tuyến cho khách"
                size="2xl"
                tabs={createTabs}
                activeTab={activeCreateTab}
                onTabChange={(id) => setActiveCreateTab(id as any)}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="text-xs text-gray-600">
                            {createForm.items.length > 0 ? (
                                <span>
                                    {createFormTotals.itemCount} sản phẩm • Tổng tiền:{' '}
                                    <strong className="text-blue-700 font-mono text-sm">
                                        {formatVND(createFormTotals.finalCost)}
                                    </strong>
                                </span>
                            ) : (
                                <span>Chưa chọn sản phẩm</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Hủy bỏ
                            </AdminButton>

                            {activeCreateTab !== 'summary' ? (
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={() => {
                                        if (activeCreateTab === 'customer') setActiveCreateTab('items');
                                        else if (activeCreateTab === 'items') setActiveCreateTab('summary');
                                    }}
                                    icon={<ArrowRight className="w-4 h-4" />}
                                >
                                    Tiếp theo
                                </AdminButton>
                            ) : (
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={handleCreateOrderSubmit}
                                    disabled={isSubmitting || createForm.items.length === 0}
                                    loading={isSubmitting}
                                    icon={!isSubmitting ? <Check className="w-4 h-4" /> : undefined}
                                >
                                    Xác nhận tạo đơn
                                </AdminButton>
                            )}
                        </div>
                    </div>
                }
            >
                {/* TAB 1: CUSTOMER & DELIVERY */}
                {activeCreateTab === 'customer' && (
                    <div className="space-y-6">
                        {/* Order Type Selection */}
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                            <AdminLabel className="uppercase tracking-wider">
                                Loại hình đơn hàng
                            </AdminLabel>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCreateForm((prev) => ({ ...prev, type: 'IN_STORE' }))}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${createForm.type === 'IN_STORE'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <Store className="w-5 h-5 shrink-0" />
                                    <div>
                                        <div className="font-bold text-xs">Bán lẻ tại quầy (IN_STORE)</div>
                                        <div className={`text-[10px] ${createForm.type === 'IN_STORE' ? 'text-blue-100' : 'text-gray-400'}`}>
                                            Khách nhận máy ngay tại cửa hàng
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCreateForm((prev) => ({ ...prev, type: 'ONLINE' }))}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${createForm.type === 'ONLINE'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <Globe className="w-5 h-5 shrink-0" />
                                    <div>
                                        <div className="font-bold text-xs">Đặt trực tuyến & Giao tận nơi (ONLINE)</div>
                                        <div className={`text-[10px] ${createForm.type === 'ONLINE' ? 'text-blue-100' : 'text-gray-400'}`}>
                                            Đóng gói gửi chuyển phát nhanh
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Customer Search & Select */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <AdminLabel>Tài khoản khách hàng (Tùy chọn)</AdminLabel>
                                {selectedUserId && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelectCustomer(null)}
                                        className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Bỏ chọn tài khoản
                                    </button>
                                )}
                            </div>

                            <AdminInput
                                type="text"
                                placeholder="Tìm tài khoản theo tên, email, sđt..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                icon={<Search className="w-4 h-4" />}
                            />

                            {isLoadingUsers && (
                                <div className="p-2 text-xs text-gray-500 flex items-center gap-2">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                    <span>Đang tải danh sách tài khoản...</span>
                                </div>
                            )}

                            {userSearchTerm.trim() && (
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white shadow-lg">
                                    {availableUsers
                                        .filter(
                                            (u) =>
                                                u.fullName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                u.phoneNumber?.includes(userSearchTerm)
                                        )
                                        .slice(0, 10)
                                        .map((u) => (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    handleSelectCustomer(u);
                                                    setUserSearchTerm('');
                                                }}
                                                className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <span className="font-semibold text-gray-900">{u.fullName || u.username}</span>
                                                    <span className="text-gray-400 text-[11px] ml-2">({u.email})</span>
                                                </div>
                                                <span className="text-blue-600 font-mono text-[11px]">{u.phoneNumber || 'Không SĐT'}</span>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {selectedUserId && (
                                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                        Đã liên kết với tài khoản User ID: <strong>#{selectedUserId}</strong>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Recipient Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <AdminLabel required>Họ tên người nhận</AdminLabel>
                                <AdminInput
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    value={createForm.recipientName}
                                    onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })}
                                />
                            </div>

                            <div>
                                <AdminLabel required>Số điện thoại người nhận</AdminLabel>
                                <AdminInput
                                    type="text"
                                    placeholder="0987654321"
                                    value={createForm.recipientPhone}
                                    onChange={(e) => setCreateForm({ ...createForm, recipientPhone: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <AdminLabel required={createForm.type === 'ONLINE'}>Địa chỉ nhận hàng</AdminLabel>
                                <AdminInput
                                    type="text"
                                    placeholder={createForm.type === 'IN_STORE' ? 'Nhận tại quầy PC Store' : 'Số 123 Đường Cầu Giấy, Hà Nội'}
                                    value={createForm.address}
                                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <AdminLabel>Ghi chú đơn hàng</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    placeholder="Giao hàng buổi sáng, kiểm hàng trước khi thanh toán..."
                                    value={createForm.note}
                                    onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: ORDER ITEMS */}
                {activeCreateTab === 'items' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Danh sách mặt hàng ({createForm.items.length})
                            </span>
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsProductPickerOpen(true)}
                                icon={<Plus className="w-3.5 h-3.5" />}
                            >
                                Thêm linh kiện / sản phẩm
                            </AdminButton>
                        </div>

                        {createForm.items.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl space-y-3">
                                <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto text-gray-400">
                                    <Boxes className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">Chưa có sản phẩm nào trong đơn</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Vui lòng nhấn nút "Thêm linh kiện / sản phẩm" để chọn mặt hàng cho đơn này
                                    </p>
                                </div>
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={() => setIsProductPickerOpen(true)}
                                >
                                    Chọn sản phẩm ngay
                                </AdminButton>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Sản phẩm</th>
                                            <th className="py-2.5 px-3 w-32">Đơn giá (₫)</th>
                                            <th className="py-2.5 px-3 w-24 text-center">Số lượng</th>
                                            <th className="py-2.5 px-3 w-28">Giảm giá (₫)</th>
                                            <th className="py-2.5 px-3 text-right">Thành tiền</th>
                                            <th className="py-2.5 px-2 text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {createForm.items.map((row, index) => (
                                            <tr key={row.productId} className="hover:bg-gray-50/50">
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        {row.imageUrl ? (
                                                            <img
                                                                src={row.imageUrl}
                                                                alt={row.productName}
                                                                className="w-9 h-9 object-cover rounded border border-gray-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 bg-gray-100 text-gray-400 rounded flex items-center justify-center shrink-0">
                                                                <Boxes className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900 line-clamp-1">{row.productName}</p>
                                                            <p className="font-mono text-[10px] text-gray-400">Mã: {row.productCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <input
                                                        type="number"
                                                        value={row.unitPrice}
                                                        onChange={(e) =>
                                                            handleChangeFormItem(index, 'unitPrice', Number(e.target.value))
                                                        }
                                                        className="w-full px-2 py-1 text-xs font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={row.quantity}
                                                        onChange={(e) =>
                                                            handleChangeFormItem(index, 'quantity', Number(e.target.value))
                                                        }
                                                        className="w-16 px-2 py-1 text-xs font-mono text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <input
                                                        type="number"
                                                        value={row.discountAmount}
                                                        onChange={(e) =>
                                                            handleChangeFormItem(index, 'discountAmount', Number(e.target.value))
                                                        }
                                                        placeholder="0"
                                                        className="w-full px-2 py-1 text-xs font-mono text-rose-600 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                                                    {formatVND(row.subtotal)}
                                                </td>
                                                <td className="py-2.5 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProductFromForm(index)}
                                                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                                        title="Xóa dòng này"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Overall Discount on Order */}
                        {createForm.items.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-end justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 gap-4">
                                <div className="space-y-1 w-full sm:w-64">
                                    <AdminLabel>
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Giảm giá chung trên đơn (VND):</span>
                                        </span>
                                    </AdminLabel>
                                    <AdminInput
                                        type="number"
                                        min={0}
                                        value={createForm.discountAmount}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                discountAmount: Math.max(0, Number(e.target.value) || 0),
                                            })
                                        }
                                        placeholder="0"
                                    />
                                </div>

                                <div className="text-right space-y-1">
                                    <div className="text-xs text-gray-500">
                                        Tổng tiền hàng:{' '}
                                        <span className="font-mono font-semibold text-gray-800">
                                            {formatVND(createFormTotals.totalItemsCost)}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">
                                        Thực thanh toán:{' '}
                                        <span className="font-mono text-base text-blue-700">
                                            {formatVND(createFormTotals.finalCost)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: SUMMARY & CONFIRM */}
                {activeCreateTab === 'summary' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-emerald-900">Sẵn sàng khởi tạo đơn hàng</h4>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                    Vui lòng kiểm tra lại thông tin khách hàng và danh sách sản phẩm trước khi xác nhận.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                                <h5 className="font-bold text-gray-800 border-b border-gray-200 pb-1.5">
                                    Thông tin giao nhận
                                </h5>
                                <div>
                                    <span className="text-gray-500">Hình thức:</span>{' '}
                                    <strong className="text-blue-700">
                                        {ORDER_TYPE_CONFIG[createForm.type]?.label}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Người nhận:</span>{' '}
                                    <span className="font-semibold text-gray-900">{createForm.recipientName || 'Chưa điền'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Số điện thoại:</span>{' '}
                                    <span className="font-mono font-semibold text-gray-900">{createForm.recipientPhone || 'Chưa điền'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Địa chỉ:</span>{' '}
                                    <span className="text-gray-900">{createForm.address || 'Nhận tại quầy'}</span>
                                </div>
                                {createForm.note && (
                                    <div>
                                        <span className="text-gray-500">Ghi chú:</span>{' '}
                                        <span className="text-gray-700 italic">{createForm.note}</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                                <h5 className="font-bold text-gray-800 border-b border-gray-200 pb-1.5">
                                    Tổng kết thanh toán
                                </h5>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Số lượng mặt hàng:</span>
                                    <span className="font-semibold">{createFormTotals.itemCount} loại ({createFormTotals.totalQuantity} chiếc)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tổng tiền hàng:</span>
                                    <span className="font-mono font-semibold">{formatVND(createFormTotals.totalItemsCost)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>Giảm giá khuyến mãi:</span>
                                    <span className="font-mono font-semibold">
                                        {createFormTotals.orderDiscount > 0 ? `-${formatVND(createFormTotals.orderDiscount)}` : '0 ₫'}
                                    </span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-blue-700">
                                    <span>Tổng cần thanh toán:</span>
                                    <span className="font-mono text-base">{formatVND(createFormTotals.finalCost)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* PRODUCT PICKER MODAL (Inside Create Order) */}
            <AdminModal
                isOpen={isProductPickerOpen}
                onClose={() => setIsProductPickerOpen(false)}
                title="Chọn linh kiện & sản phẩm"
                subtitle="Tìm kiếm theo mã linh kiện, tên sản phẩm để thêm vào đơn"
                size="lg"
                footer={
                    <AdminButton
                        type="button"
                        variant="primary"
                        onClick={() => setIsProductPickerOpen(false)}
                    >
                        Xong
                    </AdminButton>
                }
            >
                <div className="space-y-4">
                    <AdminInput
                        type="text"
                        placeholder="Nhập tên sản phẩm hoặc mã linh kiện (CPU, RAM, VGA...)"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />

                    <div className="max-h-[360px] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                        {isLoadingProducts ? (
                            <div className="p-8 text-center text-xs text-gray-500">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                                <span>Đang tải danh mục linh kiện...</span>
                            </div>
                        ) : availableProducts
                            .filter(
                                (p) =>
                                    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                    p.code.toLowerCase().includes(productSearchTerm.toLowerCase())
                            )
                            .length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400">
                                Không tìm thấy sản phẩm nào phù hợp
                            </div>
                        ) : (
                            availableProducts
                                .filter(
                                    (p) =>
                                        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                        p.code.toLowerCase().includes(productSearchTerm.toLowerCase())
                                )
                                .map((prod) => (
                                    <div
                                        key={prod.id}
                                        className="p-3 hover:bg-blue-50/60 flex items-center justify-between gap-3 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {prod.imageUrl ? (
                                                <img
                                                    src={prod.imageUrl}
                                                    alt={prod.name}
                                                    className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded flex items-center justify-center shrink-0">
                                                    <Boxes className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-900 text-xs">{prod.name}</p>
                                                <p className="font-mono text-[10px] text-gray-400">
                                                    Mã: {prod.code} • Giá niêm yết:{' '}
                                                    <span className="font-semibold text-blue-600">
                                                        {formatVND(prod.price)}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <AdminButton
                                            type="button"
                                            variant="secondary"
                                            onClick={() => handleAddProductToForm(prod)}
                                            icon={<Plus className="w-3.5 h-3.5" />}
                                            className="!py-1.5 !px-2.5 !text-xs shrink-0"
                                        >
                                            Thêm vào đơn
                                        </AdminButton>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </AdminModal>

            {/* 3. QUICK STATUS UPDATE MODAL */}
            {orderToUpdateStatus && (
                <AdminModal
                    isOpen={isStatusModalOpen}
                    onClose={() => setIsStatusModalOpen(false)}
                    title="Cập nhật trạng thái đơn hàng"
                    subtitle={`Mã đơn: ${orderToUpdateStatus.code} • Khách hàng: ${orderToUpdateStatus.recipientName}`}
                    size="md"
                    footer={
                        <AdminModalFooter
                            onCancel={() => setIsStatusModalOpen(false)}
                            onSubmit={handleConfirmStatusUpdate}
                            isSubmitting={isUpdatingStatus}
                            cancelText="Hủy"
                            submitText="Lưu thay đổi"
                        />
                    }
                >
                    <div className="space-y-4">
                        <div className="text-xs text-gray-600">
                            Trạng thái hiện tại:{' '}
                            <strong className="font-semibold text-gray-900">
                                {ORDER_STATUS_CONFIG[orderToUpdateStatus.status]?.label}
                            </strong>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 block">
                                Chọn trạng thái mới:
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {(
                                    [
                                        'PENDING',
                                        'CONFIRMED',
                                        'PROCESSING',
                                        'COMPLETED',
                                        'CANCELLED',
                                        'RETURNED',
                                        'REJECTED',
                                    ] as OrderStatus[]
                                ).map((st) => {
                                    const cfg = ORDER_STATUS_CONFIG[st];
                                    const Icon = cfg.icon;
                                    const isSelected = targetStatus === st;

                                    return (
                                        <label
                                            key={st}
                                            onClick={() => setTargetStatus(st)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                                                ? 'bg-blue-50 border-blue-500 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-gray-900">{cfg.label}</div>
                                                    <div className="text-[11px] text-gray-500">{cfg.description}</div>
                                                </div>
                                            </div>

                                            <input
                                                type="radio"
                                                name="targetStatus"
                                                checked={isSelected}
                                                onChange={() => setTargetStatus(st)}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </AdminModal>
            )}

            {/* 4. DELETE ORDER MODAL */}
            {orderToDelete && (
                <AdminConfirmModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    isLoading={isDeleting}
                    variant="danger"
                    title="Xác nhận xóa đơn hàng"
                    message={`Bạn có chắc chắn muốn xóa đơn hàng "${orderToDelete.code}" không?`}
                    description="Hành động này sẽ thực hiện xóa mềm đơn hàng khỏi hệ thống và không thể hoàn tác."
                    confirmText="Xác nhận xóa"
                    cancelText="Hủy bỏ"
                    itemPreview={{
                        title: orderToDelete.code,
                        subtitle: `${orderToDelete.recipientName} • ${formatVND(orderToDelete.finalAmount)}`,
                        badge: ORDER_STATUS_CONFIG[orderToDelete.status]?.label,
                    }}
                />
            )}

            {/* 5. GIAI ĐOẠN 2: MODAL THẨM ĐỊNH TỒN KHO KHẢ DỤNG & TIẾP NHẬN ĐƠN */}
            {appraisalOrder && (
                <AdminModal
                    isOpen={isAppraisalModalOpen}
                    onClose={() => setIsAppraisalModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2">
                            <span>Tiếp nhận đơn hàng: </span>
                            <span className="font-mono text-blue-600 font-bold">{appraisalOrder.code}</span>
                        </div>
                    }
                    subtitle={``}
                    icon={ShoppingCart}
                    size="xl"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsAppraisalModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>

                                {appraisalResult?.isAvailable ? (
                                    <AdminButton
                                        type="button"
                                        variant="primary"
                                        onClick={handleConfirmAndSendToWarehouse}
                                        isLoading={isSubmittingAppraisal}
                                        disabled={isSubmittingAppraisal}
                                        icon={<CheckCircle2 className="w-4 h-4" />}
                                        className="!bg-blue-600 hover:!bg-blue-700"
                                    >
                                        Xác nhận đơn & Chuyển kho đóng gói
                                    </AdminButton>
                                ) : (
                                    <AdminButton
                                        type="button"
                                        variant="danger"
                                        onClick={handleCancelOrderOutOfStock}
                                        isLoading={isSubmittingAppraisal}
                                        disabled={isSubmittingAppraisal}
                                        icon={<Ban className="w-4 h-4" />}
                                    >
                                        Khách đồng ý hủy đơn & Hoàn tất
                                    </AdminButton>
                                )}
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-5 text-xs">
                        {/* 1. THÔNG TIN GIAO NHẬN ĐƠN HÀNG */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5 mb-2.5">
                                <span>Thông tin giao nhận đơn hàng</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700">
                                <div>Khách hàng: <strong>{appraisalOrder.recipientName}</strong> ({appraisalOrder.recipientPhone})</div>
                                <div>Hình thức mua: <strong className="text-blue-700">{ORDER_TYPE_CONFIG[appraisalOrder.type]?.label || appraisalOrder.type}</strong></div>
                                <div className="sm:col-span-2">Địa chỉ giao: <strong>{appraisalOrder.address}</strong></div>
                                {appraisalOrder.note && <div className="sm:col-span-2 italic text-gray-500">Ghi chú từ khách: "{appraisalOrder.note}"</div>}
                            </div>
                        </div>

                        {/* 2. KIỂM TRA SỐ LƯỢNG TỒN KHO KHẢ DỤNG */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <span>Tồn kho khả dụng</span>
                                </h3>
                                {isCheckingStock ? (
                                    <span className="text-blue-600 flex items-center gap-1">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang kiểm tra tồn kho...
                                    </span>
                                ) : (
                                    <span className={`font-bold px-2.5 py-0.5 rounded-full border text-xs ${appraisalResult?.isAvailable
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : 'bg-rose-50 text-rose-700 border-rose-300'
                                        }`}>
                                        {appraisalResult?.isAvailable ? '✓ Đủ hàng trong kho' : '⚠ Không đủ hàng tồn kho'}
                                    </span>
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 text-gray-700 font-semibold">
                                        <tr>
                                            <th className="p-2.5 text-left border-b">Tên sản phẩm</th>
                                            <th className="p-2.5 text-left border-b">Mã SKU</th>
                                            <th className="p-2.5 text-center border-b">Số lượng mua</th>
                                            <th className="p-2.5 text-center border-b">Tồn kho khả dụng</th>
                                            <th className="p-2.5 text-center border-b">Tình trạng</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {appraisalResult?.itemsCheck ? (
                                            appraisalResult.itemsCheck.map((it) => (
                                                <tr key={it.productId} className="hover:bg-gray-50">
                                                    <td className="p-2.5 font-medium text-gray-900">{it.productName}</td>
                                                    <td className="p-2.5 font-mono text-gray-600">{it.productCode}</td>
                                                    <td className="p-2.5 text-center font-bold text-gray-900">{it.requestedQty}</td>
                                                    <td className="p-2.5 text-center font-bold text-indigo-700">{it.inStockQty}</td>
                                                    <td className="p-2.5 text-center">
                                                        {it.isSufficient ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                <Check className="w-3 h-3" /> Đủ hàng
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                                <AlertTriangle className="w-3 h-3" /> Thiếu {it.requestedQty - it.inStockQty}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            (appraisalOrder.items || []).map((it) => (
                                                <tr key={it.id}>
                                                    <td className="p-2.5 font-medium">{it.productName}</td>
                                                    <td className="p-2.5 font-mono">{it.productCode}</td>
                                                    <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                                                    <td className="p-2.5 text-center text-gray-400">Đang kiểm tra...</td>
                                                    <td className="p-2.5 text-center text-gray-400">---</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Banner thông báo tồn kho thực tế */}
                            {!isCheckingStock && (
                                appraisalResult?.isAvailable ? (
                                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-2 text-emerald-800">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Tất cả sản phẩm đều đủ số lượng tồn kho khả dụng để thực hiện đơn hàng.</span>
                                    </div>
                                ) : (
                                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg space-y-1 text-rose-800">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                            <span>Một hoặc nhiều sản phẩm không đủ tồn kho khả dụng.</span>
                                        </div>
                                        <p className="text-[11px] text-rose-700">
                                            Vui lòng liên hệ với khách hàng để thông báo hết hàng và thỏa thuận hủy đơn đặt hàng.
                                        </p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* 3. TÁCH RIÊNG PHẦN GHI CHÚ */}
                        <div className="pt-3 border-t border-gray-200 space-y-3">
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                                <FileText className="w-4 h-4 text-gray-600" />
                                <span>Ghi chú xử lý</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <AdminLabel>Nhân viên xử lý:</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={appraisalStaff}
                                        disabled
                                        readOnly
                                        className="bg-gray-100 text-gray-800 cursor-not-allowed font-medium"
                                    />
                                </div>

                                {appraisalResult?.isAvailable ? (
                                    <div className="sm:col-span-2">
                                        <AdminLabel>Ghi chú chuyển tiếp xuống kho đóng gói:</AdminLabel>
                                        <AdminTextarea
                                            rows={2}
                                            value={appraisalNotes}
                                            onChange={(e) => setAppraisalNotes(e.target.value)}
                                            placeholder="Ghi chú về đóng gói, lưu ý giao hàng hoặc thứ tự chuẩn bị..."
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="sm:col-span-2">
                                            <AdminLabel required>Lý do hủy đơn & Nội dung thỏa thuận với khách hàng:</AdminLabel>
                                            <AdminTextarea
                                                rows={2}
                                                value={cancellationReason}
                                                onChange={(e) => setCancellationReason(e.target.value)}
                                                placeholder="Ghi rõ lý do không thể đáp ứng đơn hàng và kết quả trao đổi với khách hàng..."
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="flex items-center gap-2 text-rose-950 font-semibold cursor-pointer select-none">
                                                <input type="checkbox" checked={true} readOnly className="rounded text-rose-600" />
                                                <span>Đã liên hệ và nhận được xác nhận đồng ý hủy đơn từ khách hàng</span>
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
