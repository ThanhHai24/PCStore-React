import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { escapeHtml } from '../../../utils/sanitize';
import {
    Package,
    Plus,
    Ticket,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Calendar,
    DollarSign,
    Building2,
    RefreshCw,
    AlertCircle,
    User,
    Phone,
    Mail,
    Send,
    Check,
    Ban,
    Printer,
    Search,
    ChevronRight,
    ArrowUpDown,
    Copy,
    Tag,
    Boxes,
    FileSpreadsheet,
    FileText,
    Percent,
    X,
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
import { adminPurchaseOrderService } from '../../../services/adminPurchaseOrderService';
import { adminSupplierService } from '../../../services/adminSupplierService';
import { adminProductService } from '../../../services/adminProductService';
import type {
    PurchaseOrderResponse,
    PurchaseOrderStatus,
    PurchaseOrderCreateRequest,
    PurchaseOrderUpdateRequest,
    PurchaseOrderItemRequest,
} from '../../../types/adminPurchaseOrder';
import type { SupplierResponse } from '../../../types/adminSupplier';
import type { ProductResponse } from '../../../types/adminProduct';

// UI Model for display in Table
export interface PurchaseOrderItemUI {
    id: string; // for table rowKey
    numericId: number;
    code: string;
    name: string;
    supplierId: number;
    supplierName: string;
    supplierCode: string;
    supplierPhone: string;
    supplierEmail: string;
    orderDate: string;
    rawOrderDate?: string | null;
    expectedDate: string;
    rawExpectedDate?: string | null;
    status: PurchaseOrderStatus;
    description: string;
    totalAmount: number;
    totalItems: number;
    totalQuantityOrder: number;
    totalQuantityReceived: number;
    items: PurchaseOrderResponse['items'];
    createdDate?: string | null;
    createdBy?: number | null;
    lastModifiedDate?: string | null;
    lastModifiedBy?: number | null;
    rawResponse: PurchaseOrderResponse;
}

// Item row draft in Add / Edit form
export interface FormOrderItemRow {
    productId: number;
    productCode: string;
    productName: string;
    imageUrl?: string | null;
    quantityOrder: number;
    unitCost: number;
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

function formatDateOnly(isoString?: string | null): string {
    if (!isoString) return '---';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch {
        return isoString;
    }
}

function toInputDate(isoString?: string | null): string {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

// Status styling & config
export const STATUS_CONFIG: Record<
    PurchaseOrderStatus,
    {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        dotColor: string;
        icon: React.ElementType;
        description: string;
    }
> = {
    DRAFT: {
        label: 'Đơn nháp',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        dotColor: 'bg-slate-400',
        icon: Clock,
        description: 'Đơn đang soạn thảo, có thể chỉnh sửa các mặt hàng hoặc xóa bỏ',
    },
    PENDING: {
        label: 'Chờ duyệt',
        color: 'text-amber-800',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        dotColor: 'bg-amber-500',
        icon: Clock,
        description: 'Đã gửi yêu cầu phê duyệt, đang chờ người có thẩm quyền ký duyệt',
    },
    APPROVED: {
        label: 'Đã duyệt',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        dotColor: 'bg-blue-500',
        icon: CheckCircle2,
        description: 'Đơn đã duyệt thành công, sẵn sàng cho việc nhận hàng & lập phiếu nhập kho',
    },
    RECEIVED: {
        label: 'Đã nhận đủ',
        color: 'text-emerald-800',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        dotColor: 'bg-emerald-500',
        icon: CheckCircle2,
        description: 'Kho đã xác nhận nhận đủ 100% số lượng các mặt hàng trong đơn',
    },
    CANCELLED: {
        label: 'Đã hủy',
        color: 'text-rose-800',
        bgColor: 'bg-rose-100',
        borderColor: 'border-rose-300',
        dotColor: 'bg-rose-500',
        icon: XCircle,
        description: 'Đơn đặt hàng đã bị hủy bỏ và không tiếp tục thực hiện',
    },
};

export default function PurchaseOrderList() {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Data State
    const [orders, setOrders] = useState<PurchaseOrderItemUI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Metadata dictionaries for mapping
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState<boolean>(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

    // Search, Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderItemUI | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'items'>('overview');

    // Add / Edit Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeFormTab, setActiveFormTab] = useState<'general' | 'items'>('general');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Product Picker in Add / Edit Modal
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // Add Form State
    const initialAddForm = {
        code: '',
        name: '',
        supplierId: 0,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        description: '',
        items: [] as FormOrderItemRow[],
    };
    const [addForm, setAddForm] = useState(initialAddForm);

    // Edit Form State
    const [editForm, setEditForm] = useState<{
        id: number;
        code: string;
        name: string;
        supplierId: number;
        orderDate: string;
        expectedDate: string;
        description: string;
        items: FormOrderItemRow[];
    } | null>(null);

    // Status Confirmation Modals
    const [statusActionTarget, setStatusActionTarget] = useState<{
        order: PurchaseOrderItemUI;
        targetStatus: PurchaseOrderStatus;
        title: string;
        message: string;
        variant: 'success' | 'warning' | 'danger' | 'info';
    } | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Delete Confirmation Modal
    const [deleteTargetOrder, setDeleteTargetOrder] = useState<PurchaseOrderItemUI | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Map dictionaries
    const supplierMap = useMemo(() => {
        const map = new Map<number, SupplierResponse>();
        suppliers.forEach((s) => map.set(s.id, s));
        return map;
    }, [suppliers]);

    const productMap = useMemo(() => {
        const map = new Map<number, ProductResponse>();
        products.forEach((p) => map.set(p.id, p));
        return map;
    }, [products]);

    // Load Suppliers for dropdown & mapping
    const loadSuppliers = useCallback(async () => {
        setIsLoadingSuppliers(true);
        try {
            const res = await adminSupplierService.getAllSuppliers({
                size: 100,
                status: 'ACTIVE',
            });
            setSuppliers(res.content || []);
        } catch {
            // Non-blocking
        } finally {
            setIsLoadingSuppliers(false);
        }
    }, []);

    // Load Products for product selector
    const loadProducts = useCallback(async () => {
        setIsLoadingProducts(true);
        try {
            const res = await adminProductService.getAllProducts({
                size: 150,
                status: 'ACTIVE',
            });
            setProducts(res.content || []);
        } catch {
            // Non-blocking
        } finally {
            setIsLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        loadSuppliers();
        loadProducts();
    }, [loadSuppliers, loadProducts]);

    /**
     * Map backend PurchaseOrderResponse to PurchaseOrderItemUI
     */
    const mapBackendToUI = useCallback(
        (b: PurchaseOrderResponse): PurchaseOrderItemUI => {
            const sup = supplierMap.get(b.supplierId);
            const totalQty = (b.items || []).reduce((acc, it) => acc + (it.quantityOrder || 0), 0);
            const totalRecv = (b.items || []).reduce((acc, it) => acc + (it.quantityReceived || 0), 0);

            return {
                id: String(b.id),
                numericId: b.id,
                code: b.code,
                name: b.name || `Đơn nhập #${b.code}`,
                supplierId: b.supplierId,
                supplierName: sup?.name || `Nhà cung cấp #${b.supplierId}`,
                supplierCode: sup?.code || '---',
                supplierPhone: sup?.phoneNumber || '---',
                supplierEmail: sup?.email || '---',
                orderDate: formatDateOnly(b.orderDate),
                rawOrderDate: b.orderDate,
                expectedDate: formatDateOnly(b.expectedDate),
                rawExpectedDate: b.expectedDate,
                status: b.status,
                description: b.description || 'Không có ghi chú',
                totalAmount: b.totalAmount || 0,
                totalItems: b.items?.length || 0,
                totalQuantityOrder: totalQty,
                totalQuantityReceived: totalRecv,
                items: b.items || [],
                createdDate: formatDateTime(b.createdDate),
                createdBy: b.createdBy,
                lastModifiedDate: formatDateTime(b.lastModifiedDate),
                lastModifiedBy: b.lastModifiedBy,
                rawResponse: b,
            };
        },
        [supplierMap]
    );

    /**
     * Load Purchase Orders from API
     */
    const loadOrders = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                const params: any = {
                    page: currentPage - 1,
                    size: pageSize,
                    sort: ['createdDate,DESC'],
                };

                if (searchQuery.trim()) {
                    params.keyword = searchQuery.trim();
                }
                if (statusFilter && statusFilter !== 'ALL') {
                    params.status = statusFilter;
                }
                if (supplierFilter && supplierFilter !== 'ALL') {
                    params.supplierId = supplierFilter;
                }
                if (fromDate) {
                    params.fromDate = `${fromDate}T00:00:00Z`;
                }
                if (toDate) {
                    params.toDate = `${toDate}T23:59:59Z`;
                }

                const res = await adminPurchaseOrderService.getAllOrders(params);

                const mapped = (res.content || []).map(mapBackendToUI);
                setOrders(mapped);
                setTotalElements(res.totalElements || 0);
                setTotalPages(res.totalPages || 1);
            } catch (err: any) {
                console.error('Error loading purchase orders:', err);
                const msg = err?.message || 'Không thể tải danh sách đơn nhập hàng từ máy chủ.';
                setError(msg);
                setOrders([]);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [currentPage, pageSize, searchQuery, statusFilter, supplierFilter, fromDate, toDate, mapBackendToUI]
    );

    // Trigger load on state changes
    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Metric Calculations
    const metrics = useMemo(() => {
        let draftCount = 0;
        let pendingCount = 0;
        let approvedCount = 0;
        let receivedCount = 0;
        let cancelledCount = 0;
        let totalVal = 0;

        orders.forEach((o) => {
            if (o.status === 'DRAFT') draftCount++;
            else if (o.status === 'PENDING') pendingCount++;
            else if (o.status === 'APPROVED') approvedCount++;
            else if (o.status === 'RECEIVED') receivedCount++;
            else if (o.status === 'CANCELLED') cancelledCount++;

            if (o.status !== 'CANCELLED') {
                totalVal += o.totalAmount;
            }
        });

        return {
            total: totalElements,
            draft: draftCount,
            pending: pendingCount,
            approved: approvedCount,
            received: receivedCount,
            cancelled: cancelledCount,
            totalVal,
        };
    }, [orders, totalElements]);

    /**
     * Tự động sinh mã đơn nhập chuẩn PO-YYYYMMDD-XXX
     */
    const generateNewOrderCode = (): string => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const rand = Math.floor(100 + Math.random() * 900);
        return `PO-${y}${m}${d}-${rand}`;
    };

    /**
     * Mở modal tạo mới đơn nhập
     */
    const handleOpenAdd = () => {
        setAddForm({
            ...initialAddForm,
            code: generateNewOrderCode(),
            supplierId: suppliers.length > 0 ? suppliers[0].id : 0,
        });
        setActiveFormTab('general');
        setIsAddModalOpen(true);
    };

    /**
     * Mở modal xem chi tiết
     */
    const handleOpenDetail = async (order: PurchaseOrderItemUI) => {
        setSelectedOrder(order);
        setActiveDetailTab('overview');
        setIsDetailModalOpen(true);

        // Fetch fresh detail by ID from server
        try {
            const fresh = await adminPurchaseOrderService.getOrderById(order.numericId);
            setSelectedOrder(mapBackendToUI(fresh));
        } catch {
            // Keep current order if fetch fails
        }
    };

    /**
     * Mở modal chỉnh sửa đơn nháp
     */
    const handleOpenEdit = (order: PurchaseOrderItemUI, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (order.status !== 'DRAFT') {
            toast.warning('Chỉ có thể chỉnh sửa các đơn nhập ở trạng thái Đơn nháp (DRAFT).', 'Không thể sửa');
            return;
        }

        // Convert existing items to FormOrderItemRow
        const rows: FormOrderItemRow[] = order.items.map((it) => {
            const p = productMap.get(it.productId);
            return {
                productId: it.productId,
                productCode: p?.code || `SP-${it.productId}`,
                productName: p?.name || `Sản phẩm #${it.productId}`,
                imageUrl: p?.imageUrl,
                quantityOrder: it.quantityOrder,
                unitCost: it.unitCost,
            };
        });

        setEditForm({
            id: order.numericId,
            code: order.code,
            name: order.name,
            supplierId: order.supplierId,
            orderDate: toInputDate(order.rawOrderDate) || new Date().toISOString().split('T')[0],
            expectedDate: toInputDate(order.rawExpectedDate),
            description: order.description === 'Không có ghi chú' ? '' : order.description,
            items: rows,
        });
        setActiveFormTab('general');
        setIsEditModalOpen(true);
    };

    /**
     * Thêm sản phẩm vào form (Add hoặc Edit)
     */
    const handleAddProductToForm = (prod: ProductResponse) => {
        const isEditing = isEditModalOpen && editForm !== null;
        const currentItems = isEditing ? editForm.items : addForm.items;

        // Check if already in list
        const exists = currentItems.some((it) => it.productId === prod.id);
        if (exists) {
            toast.warning(`Sản phẩm "${prod.name}" đã có trong danh sách đặt hàng.`, 'Đã tồn tại');
            return;
        }

        const newRow: FormOrderItemRow = {
            productId: prod.id,
            productCode: prod.code,
            productName: prod.name,
            imageUrl: prod.imageUrl,
            quantityOrder: 1,
            unitCost: prod.price && prod.price > 0 ? Math.round(prod.price * 0.8) : 1000000, // Suggested default wholesale cost
        };

        if (isEditing) {
            setEditForm((prev) => (prev ? { ...prev, items: [...prev.items, newRow] } : null));
        } else {
            setAddForm((prev) => ({ ...prev, items: [...prev.items, newRow] }));
        }

        toast.success(`Đã thêm "${prod.name}" vào đơn nhập.`, 'Đã thêm');
        setIsProductPickerOpen(false);
    };

    /**
     * Cập nhật số lượng hoặc đơn giá mặt hàng trong form
     */
    const handleUpdateFormItem = (
        productId: number,
        field: 'quantityOrder' | 'unitCost',
        value: number
    ) => {
        const isEditing = isEditModalOpen && editForm !== null;
        const updater = (items: FormOrderItemRow[]) =>
            items.map((it) => {
                if (it.productId === productId) {
                    return {
                        ...it,
                        [field]: Math.max(0, value),
                    };
                }
                return it;
            });

        if (isEditing) {
            setEditForm((prev) => (prev ? { ...prev, items: updater(prev.items) } : null));
        } else {
            setAddForm((prev) => ({ ...prev, items: updater(prev.items) }));
        }
    };

    /**
     * Xóa mặt hàng khỏi danh sách form
     */
    const handleRemoveFormItem = (productId: number) => {
        const isEditing = isEditModalOpen && editForm !== null;
        if (isEditing) {
            setEditForm((prev) =>
                prev ? { ...prev, items: prev.items.filter((it) => it.productId !== productId) } : null
            );
        } else {
            setAddForm((prev) => ({
                ...prev,
                items: prev.items.filter((it) => it.productId !== productId),
            }));
        }
    };

    /**
     * Lưu thêm mới đơn nhập
     */
    const handleSaveAdd = async (sendForApproval = false) => {
        const trimmedCode = addForm.code.trim().toUpperCase();
        if (!trimmedCode) {
            toast.error('Vui lòng nhập mã đơn nhập hàng', 'Thiếu thông tin');
            setActiveFormTab('general');
            return;
        }
        if (!addForm.supplierId) {
            toast.error('Vui lòng chọn nhà cung cấp hợp tác', 'Thiếu thông tin');
            setActiveFormTab('general');
            return;
        }

        if (sendForApproval && addForm.items.length === 0) {
            toast.error('Đơn cần có ít nhất 1 mặt hàng để gửi duyệt.', 'Danh sách trống');
            setActiveFormTab('items');
            return;
        }

        for (const it of addForm.items) {
            if (it.quantityOrder <= 0) {
                toast.error(`Số lượng đặt của "${it.productName}" phải lớn hơn 0.`, 'Số lượng không hợp lệ');
                setActiveFormTab('items');
                return;
            }
            if (it.unitCost < 0) {
                toast.error(`Đơn giá của "${it.productName}" không được âm.`, 'Đơn giá không hợp lệ');
                setActiveFormTab('items');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload: PurchaseOrderCreateRequest = {
                code: trimmedCode,
                name: addForm.name.trim() || undefined,
                supplierId: Number(addForm.supplierId),
                orderDate: addForm.orderDate ? `${addForm.orderDate}T08:00:00Z` : undefined,
                expectedDate: addForm.expectedDate ? `${addForm.expectedDate}T17:00:00Z` : undefined,
                description: addForm.description.trim() || undefined,
                items: addForm.items.map((it) => ({
                    productId: it.productId,
                    quantityOrder: it.quantityOrder,
                    unitCost: it.unitCost,
                })),
            };

            const created = await adminPurchaseOrderService.createOrder(payload);

            // If user opted to send for approval right away
            if (sendForApproval && created?.id) {
                await adminPurchaseOrderService.updateOrderStatus(created.id, 'PENDING');
                toast.success(`Đã tạo và gửi duyệt đơn nhập "${trimmedCode}" thành công!`, 'Thành công');
            } else {
                toast.success(`Đã tạo đơn nhập nháp "${trimmedCode}" thành công!`, 'Thành công');
            }

            setIsAddModalOpen(false);
            setAddForm(initialAddForm);
            loadOrders();
        } catch (err: any) {
            console.error('Save Add PO Error:', err);
            toast.error(err?.message || 'Không thể tạo đơn nhập hàng. Vui lòng kiểm tra lại.', 'Lỗi tạo đơn');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Lưu cập nhật đơn nhập nháp
     */
    const handleSaveEdit = async () => {
        if (!editForm) return;

        const trimmedCode = editForm.code.trim().toUpperCase();
        if (!trimmedCode) {
            toast.error('Vui lòng nhập mã đơn nhập hàng', 'Thiếu thông tin');
            setActiveFormTab('general');
            return;
        }
        if (!editForm.supplierId) {
            toast.error('Vui lòng chọn nhà cung cấp', 'Thiếu thông tin');
            setActiveFormTab('general');
            return;
        }

        for (const it of editForm.items) {
            if (it.quantityOrder <= 0) {
                toast.error(`Số lượng đặt của "${it.productName}" phải lớn hơn 0.`, 'Số lượng không hợp lệ');
                setActiveFormTab('items');
                return;
            }
            if (it.unitCost < 0) {
                toast.error(`Đơn giá của "${it.productName}" không được âm.`, 'Đơn giá không hợp lệ');
                setActiveFormTab('items');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload: PurchaseOrderUpdateRequest = {
                code: trimmedCode,
                name: editForm.name.trim() || undefined,
                supplierId: Number(editForm.supplierId),
                orderDate: editForm.orderDate ? `${editForm.orderDate}T08:00:00Z` : undefined,
                expectedDate: editForm.expectedDate ? `${editForm.expectedDate}T17:00:00Z` : undefined,
                description: editForm.description.trim() || undefined,
                items: editForm.items.map((it) => ({
                    productId: it.productId,
                    quantityOrder: it.quantityOrder,
                    unitCost: it.unitCost,
                })),
            };

            await adminPurchaseOrderService.updateOrder(editForm.id, payload);
            toast.success(`Đã cập nhật đơn nhập "${trimmedCode}" thành công!`, 'Cập nhật thành công');
            setIsEditModalOpen(false);
            setEditForm(null);
            loadOrders();
        } catch (err: any) {
            console.error('Save Edit PO Error:', err);
            toast.error(err?.message || 'Không thể cập nhật đơn nhập. Vui lòng kiểm tra lại.', 'Lỗi cập nhật');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Mở modal xác nhận đổi trạng thái
     */
    const handlePromptStatusChange = (
        order: PurchaseOrderItemUI,
        targetStatus: PurchaseOrderStatus,
        e?: React.MouseEvent
    ) => {
        e?.stopPropagation();

        if (targetStatus === 'PENDING') {
            if (order.items.length === 0) {
                toast.error('Đơn hàng cần có ít nhất 1 mặt hàng để gửi duyệt.', 'Không thể gửi');
                return;
            }
            setStatusActionTarget({
                order,
                targetStatus: 'PENDING',
                title: 'Gửi duyệt đơn nhập hàng',
                message: `Bạn có chắc chắn muốn gửi duyệt đơn "${order.code}"? Sau khi gửi, đơn sẽ chuyển sang trạng thái CHỜ DUYỆT và ban quản trị sẽ xem xét phê duyệt.`,
                variant: 'info',
            });
        } else if (targetStatus === 'APPROVED') {
            setStatusActionTarget({
                order,
                targetStatus: 'APPROVED',
                title: 'Phê duyệt đơn nhập hàng',
                message: `Xác nhận phê duyệt đơn nhập "${order.code}" với tổng giá trị ${formatVND(
                    order.totalAmount
                )}? Sau khi duyệt, bộ phận kho có thể tạo phiếu nhập kho tương ứng.`,
                variant: 'success',
            });
        } else if (targetStatus === 'CANCELLED') {
            setStatusActionTarget({
                order,
                targetStatus: 'CANCELLED',
                title: 'Hủy đơn nhập hàng',
                message: `Bạn có chắc chắn muốn hủy đơn nhập "${order.code}"? Hành động này sẽ đánh dấu đơn bị hủy và không thể khôi phục lại trạng thái cũ.`,
                variant: 'danger',
            });
        }
    };

    /**
     * Xác nhận đổi trạng thái đơn hàng
     */
    const handleConfirmStatusChange = async () => {
        if (!statusActionTarget) return;

        setIsUpdatingStatus(true);
        try {
            await adminPurchaseOrderService.updateOrderStatus(
                statusActionTarget.order.numericId,
                statusActionTarget.targetStatus
            );

            const targetCfg = STATUS_CONFIG[statusActionTarget.targetStatus];
            toast.success(
                `Đã chuyển trạng thái đơn "${statusActionTarget.order.code}" sang: ${targetCfg.label}.`,
                'Thao tác thành công'
            );

            // Update modal selectedOrder if open
            if (selectedOrder && selectedOrder.numericId === statusActionTarget.order.numericId) {
                setSelectedOrder((prev) =>
                    prev ? { ...prev, status: statusActionTarget.targetStatus } : null
                );
            }

            setStatusActionTarget(null);
            loadOrders();
        } catch (err: any) {
            console.error('Update Status Error:', err);
            toast.error(err?.message || 'Không thể chuyển trạng thái đơn hàng.', 'Lỗi chuyển trạng thái');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    /**
     * Xóa đơn nhập DRAFT
     */
    const handleOpenDelete = (order: PurchaseOrderItemUI, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (order.status !== 'DRAFT') {
            toast.warning('Chỉ có thể xóa các đơn nhập ở trạng thái Đơn nháp (DRAFT).', 'Không được phép');
            return;
        }
        setDeleteTargetOrder(order);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetOrder) return;

        setIsDeleting(true);
        try {
            await adminPurchaseOrderService.deleteOrder(deleteTargetOrder.numericId);
            toast.success(`Đã xóa đơn nhập nháp "${deleteTargetOrder.code}" thành công.`, 'Xóa thành công');

            if (selectedOrder && selectedOrder.numericId === deleteTargetOrder.numericId) {
                setIsDetailModalOpen(false);
                setSelectedOrder(null);
            }

            setDeleteTargetOrder(null);
            setSelectedKeys((prev) => prev.filter((k) => k !== deleteTargetOrder.id));
            loadOrders();
        } catch (err: any) {
            console.error('Delete Order Error:', err);
            toast.error(err?.message || 'Không thể xóa đơn nhập hàng.', 'Lỗi xóa đơn');
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * Xuất danh sách Excel / CSV
     */
    const handleExportExcel = () => {
        if (orders.length === 0) {
            toast.warning('Danh sách đơn nhập hiện tại đang trống.', 'Không có dữ liệu');
            return;
        }

        const headers = [
            'ID',
            'Mã đơn',
            'Tên đơn',
            'Nhà cung cấp',
            'SĐT NCC',
            'Ngày đặt',
            'Ngày dự kiến giao',
            'Trạng thái',
            'Số mặt hàng',
            'Số lượng đặt',
            'Số lượng đã nhận',
            'Tổng tiền (VND)',
            'Ghi chú',
        ];

        const rows = orders.map((o) => [
            o.numericId,
            `"${o.code}"`,
            `"${o.name}"`,
            `"${o.supplierName}"`,
            `"${o.supplierPhone}"`,
            `"${o.orderDate}"`,
            `"${o.expectedDate}"`,
            `"${STATUS_CONFIG[o.status]?.label || o.status}"`,
            o.totalItems,
            o.totalQuantityOrder,
            o.totalQuantityReceived,
            o.totalAmount,
            `"${o.description.replace(/"/g, '""')}"`,
        ]);

        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Don_Nhap_Hang_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Đã xuất ${orders.length} đơn nhập ra file CSV thành công.`, 'Xuất file thành công');
    };

    /**
     * In đơn nhập hàng
     */
    const handlePrintOrder = (order: PurchaseOrderItemUI) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.opener = null;

        const itemsHtml = order.items
            .map((it, idx) => {
                const prod = productMap.get(it.productId);
                return `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        <strong>${escapeHtml(prod?.name || 'Sản phẩm #' + it.productId)}</strong><br/>
                        <small style="color: #666;">Mã: ${escapeHtml(prod?.code || '---')}</small>
                    </td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${escapeHtml(formatVND(
                    it.unitCost
                ))}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.quantityOrder
                    }</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${escapeHtml(formatVND(
                        it.subtotal || it.quantityOrder * it.unitCost
                    ))}</td>
                </tr>
            `;
            })
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Đơn đặt hàng nhập - ${escapeHtml(order.code)}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #333; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; color: #0284c7; margin: 0; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                    .card { background: #f8fafc; padding: 12px; border-radius: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #0284c7; color: white; padding: 10px; border: 1px solid #0284c7; text-align: left; }
                    .total { text-align: right; margin-top: 16px; font-size: 18px; font-weight: bold; }
                    .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
                    .sign { margin-top: 60px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">PCSTORE - ĐƠN ĐẶT HÀNG NHẬP (PO)</h1>
                        <p style="margin: 4px 0;">Hệ thống phân phối & bán lẻ linh kiện máy tính PCStore</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; color: #333;">${escapeHtml(order.code)}</h2>
                        <p style="margin: 4px 0; color: #666;">Trạng thái: ${escapeHtml(STATUS_CONFIG[order.status]?.label || order.status)
            }</p>
                    </div>
                </div>

                <div class="grid">
                    <div class="card">
                        <h4 style="margin: 0 0 6px 0; color: #0284c7;">THÔNG TIN NHÀ CUNG CẤP</h4>
                        <div><strong>${escapeHtml(order.supplierName)}</strong></div>
                        <div>Mã NCC: ${escapeHtml(order.supplierCode)}</div>
                        <div>Điện thoại: ${escapeHtml(order.supplierPhone)}</div>
                        <div>Email: ${escapeHtml(order.supplierEmail)}</div>
                    </div>
                    <div class="card">
                        <h4 style="margin: 0 0 6px 0; color: #0284c7;">THÔNG TIN ĐƠN ĐẶT HÀNG</h4>
                        <div>Tên đơn: ${escapeHtml(order.name)}</div>
                        <div>Ngày đặt hàng: ${escapeHtml(order.orderDate)}</div>
                        <div>Dự kiến giao: ${escapeHtml(order.expectedDate)}</div>
                        <div>Ghi chú: ${escapeHtml(order.description)}</div>
                    </div>
                </div>

                <h4 style="margin: 20px 0 6px 0;">DANH SÁCH MẶT HÀNG ĐẶT MUA</h4>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px; text-align: center;">STT</th>
                            <th>Tên mặt hàng / Linh kiện</th>
                            <th style="width: 140px; text-align: right;">Đơn giá dự kiến</th>
                            <th style="width: 110px; text-align: center;">Số lượng đặt</th>
                            <th style="width: 160px; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total">
                    Tổng giá trị đơn đặt: <span style="color: #0284c7;">${formatVND(order.totalAmount)}</span>
                </div>

                <div class="footer">
                    <div>
                        <div><strong>Đại diện Nhà Cung Cấp</strong></div>
                        <div style="font-size: 11px; color: #888;">(Ký và ghi rõ họ tên)</div>
                        <div class="sign">................................</div>
                    </div>
                    <div>
                        <div><strong>Bộ Phận Mua Hàng PCStore</strong></div>
                        <div style="font-size: 11px; color: #888;">(Ký và ghi rõ họ tên)</div>
                        <div class="sign">................................</div>
                    </div>
                    <div>
                        <div><strong>Giám Đốc Duyệt</strong></div>
                        <div style="font-size: 11px; color: #888;">(Ký và đóng dấu)</div>
                        <div class="sign">................................</div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const renderStatusIndicator = (status: PurchaseOrderStatus) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
        return (
            <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap"
                title={cfg.description}
            >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor}`} />
                <span className={status === 'CANCELLED' ? 'text-slate-500' : 'text-slate-700'}>
                    {cfg.label}
                </span>
            </span>
        );
    };

    /**
     * Columns definition for AdminTable
     */
    const columns: Column<PurchaseOrderItemUI>[] = [
        {
            key: 'code',
            header: 'Mã đơn nhập',
            render: (order) => (
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                            {order.code}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.code);
                                toast.success(`Đã sao chép mã ${order.code}`);
                            }}
                            className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            title="Sao chép mã đơn"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                    <div
                        className="text-sm text-slate-700 truncate max-w-[220px]"
                        title={order.name}
                    >
                        {order.name}
                    </div>
                </div>
            ),
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (order) => (
                <div className="space-y-0.5 min-w-0">
                    <div
                        className="text-sm font-medium text-slate-900 truncate max-w-[210px]"
                        title={order.supplierName}
                    >
                        {order.supplierName}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 tabular-nums">
                        <span className="font-mono text-[11px] text-slate-600">
                            {order.supplierCode}
                        </span>
                        {order.supplierPhone !== '---' && (
                            <>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono text-[11px]">{order.supplierPhone}</span>
                            </>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'progress',
            header: 'Số lượng',
            align: 'right',
            render: (order) => {
                const percent =
                    order.totalQuantityOrder > 0
                        ? Math.min(
                            100,
                            Math.round((order.totalQuantityReceived / order.totalQuantityOrder) * 100)
                        )
                        : 0;

                return (
                    <div className="space-y-1 text-right tabular-nums ml-auto w-[132px]">
                        <div className="text-xs font-medium text-slate-800 whitespace-nowrap">
                            {order.totalQuantityReceived}/{order.totalQuantityOrder} SP
                            <span className="text-slate-400 font-normal"> · {order.totalItems} mã</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-md overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${percent === 100
                                    ? 'bg-emerald-500'
                                    : percent > 0
                                        ? 'bg-blue-500'
                                        : 'bg-slate-300'
                                    }`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'amount',
            header: 'Tổng tiền nhập',
            align: 'right',
            render: (order) => (
                <div className="text-right tabular-nums">
                    <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {formatVND(order.totalAmount)}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (order) => renderStatusIndicator(order.status),
        },
        {
            key: 'dates',
            header: 'Ngày đặt / Dự kiến',
            align: 'right',
            render: (order) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div className="text-xs font-medium text-slate-700" title="Ngày đặt hàng">
                        {order.orderDate}
                    </div>
                    <div className="text-[11px] text-slate-500" title="Ngày dự kiến giao">
                        Dự kiến: {order.expectedDate}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (order) => {
                const isDraft = order.status === 'DRAFT';
                const isPending = order.status === 'PENDING';
                const isApproved = order.status === 'APPROVED';

                return (
                    <AdminActionDropdown
                        onView={() => handleOpenDetail(order)}
                        viewLabel="Xem chi tiết đơn"
                        onEdit={isDraft ? (e) => handleOpenEdit(order, e) : undefined}
                        editLabel="Chỉnh sửa đơn nháp"
                        actions={[
                            {
                                key: 'print',
                                label: 'In đơn đặt hàng PO',
                                description: 'Xuất bản in đơn đặt hàng',
                                icon: Printer,
                                variant: 'primary',
                                onClick: () => handlePrintOrder(order),
                            },
                        ]}
                        moreActions={[
                            {
                                key: 'create-gr',
                                label: 'Lập phiếu nhập kho (GR)',
                                description: 'Tạo phiếu nhập kho từ đơn PO này',
                                icon: Ticket,
                                variant: 'success',
                                hidden: !isApproved,
                                onClick: () =>
                                    navigate(
                                        `/admin/import-ticket?purchaseOrderId=${order.numericId}`
                                    ),
                            },
                            {
                                key: 'cancel-po',
                                label: 'Hủy đơn đặt hàng',
                                description: 'Hủy bỏ đơn đặt hàng này',
                                icon: Ban,
                                variant: 'danger',
                                hidden: !(isDraft || isPending || isApproved),
                                dividerBefore: true,
                                onClick: (e) => handlePromptStatusChange(order, 'CANCELLED', e),
                            },
                        ]}
                        onDelete={isDraft ? (e) => handleOpenDelete(order, e) : undefined}
                        deleteLabel="Xóa đơn nháp"
                        deleteDescription="Xóa vĩnh viễn đơn nháp này"
                    />
                );
            },
        },
    ];

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
                    { label: 'Đơn nháp (DRAFT)', value: 'DRAFT' },
                    { label: 'Chờ duyệt (PENDING)', value: 'PENDING' },
                    { label: 'Đã duyệt (APPROVED)', value: 'APPROVED' },
                    { label: 'Đã nhận đủ (RECEIVED)', value: 'RECEIVED' },
                    { label: 'Đã hủy (CANCELLED)', value: 'CANCELLED' },
                ],
            },
            {
                id: 'supplierId',
                label: 'Nhà cung cấp',
                type: 'select',
                placeholder: 'Tất cả nhà cung cấp',
                icon: Building2,
                options: suppliers.map((s) => ({
                    label: `${s.name} (${s.code})`,
                    value: String(s.id),
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
        [suppliers]
    );

    // Active filter values passed to AdminFilter
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (statusFilter && statusFilter !== 'ALL') {
            vals.status = statusFilter;
        }
        if (supplierFilter && supplierFilter !== 'ALL') {
            vals.supplierId = supplierFilter;
        }
        if (fromDate) {
            vals.fromDate = fromDate;
        }
        if (toDate) {
            vals.toDate = toDate;
        }
        return vals;
    }, [statusFilter, supplierFilter, fromDate, toDate]);

    // Handle filter changes from AdminFilter (dropdowns, chips, clear button)
    const handleFilterChange = (newValues: Record<string, any>) => {
        setStatusFilter(newValues.status || 'ALL');
        setSupplierFilter(newValues.supplierId || 'ALL');
        setFromDate(newValues.fromDate || '');
        setToDate(newValues.toDate || '');
        setCurrentPage(1);
    };

    // Handle complete filter reset
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setSupplierFilter('ALL');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    // Form Total calculation for Add / Edit
    const formItemsSummary = useMemo(() => {
        const items = isEditModalOpen && editForm ? editForm.items : addForm.items;
        const totalItemsCount = items.length;
        const totalQty = items.reduce((acc, it) => acc + (it.quantityOrder || 0), 0);
        const totalCost = items.reduce(
            (acc, it) => acc + (it.quantityOrder || 0) * (it.unitCost || 0),
            0
        );
        return { totalItemsCount, totalQty, totalCost };
    }, [isEditModalOpen, editForm, addForm]);

    // Filtered products in product picker
    const filteredPickerProducts = useMemo(() => {
        if (!productSearchTerm.trim()) return products.slice(0, 30);
        const term = productSearchTerm.toLowerCase();
        return products
            .filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    p.code.toLowerCase().includes(term) ||
                    (p.slug && p.slug.toLowerCase().includes(term))
            )
            .slice(0, 30);
    }, [products, productSearchTerm]);

    return (
        <div className="space-y-4">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý đơn nhập hàng
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                        {metrics.total.toLocaleString('vi-VN')} đơn nhập · {metrics.pending} chờ duyệt · {metrics.approved} đã duyệt · {metrics.received} đã nhận đủ
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadOrders(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw
                            className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        <span>Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800 text-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                            <span className="font-semibold">Lỗi tải dữ liệu:</span> {error}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadOrders()}
                        className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Single-row Toolbar: Search + Filters + Primary CTA */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                    setSearchQuery(q);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm theo mã đơn nhập (PO-...), tên nhà cung cấp..."
                fields={filterFields}
                values={filterValues}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo đơn nhập hàng</span>
                    </button>
                }
            />

            {/* Main Table (Border-first, no outer card-in-card) */}
            <AdminTable
                columns={columns}
                data={orders}
                rowKey="id"
                loading={isLoading}
                emptyText="Không tìm thấy đơn nhập hàng nào phù hợp với bộ lọc."
                emptyIcon={Package}
                selectable
                selectedKeys={selectedKeys}
                onSelectionChange={setSelectedKeys}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(s) => {
                    setPageSize(s);
                    setCurrentPage(1);
                }}
                onRowClick={(order) => handleOpenDetail(order)}
                itemUnitName="đơn nhập"
            />

            {/* ========================================================================= */}
            {/* DETAIL MODAL (Xem chi tiết đơn nhập) */}
            {/* ========================================================================= */}
            {selectedOrder && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono tabular-nums text-slate-900">
                                {selectedOrder.code}
                            </span>
                            <span className="text-slate-300">·</span>
                            {renderStatusIndicator(selectedOrder.status)}
                        </div>
                    }
                    subtitle={`Ngày tạo: ${selectedOrder.createdDate}`}
                    icon={Package}
                    size="xl"
                    tabs={[
                        { id: 'overview', label: 'Thông tin chung & Nhà cung cấp', icon: Building2 },
                        {
                            id: 'items',
                            label: `Mặt hàng đặt mua (${selectedOrder.items.length})`,
                            icon: Boxes,
                        },
                    ]}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="text-xs text-slate-500 tabular-nums">
                                Tổng giá trị:{' '}
                                <strong className="text-sm font-semibold text-slate-900">
                                    {formatVND(selectedOrder.totalAmount)}
                                </strong>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => handlePrintOrder(selectedOrder)}
                                    icon={Printer}
                                    size="sm"
                                >
                                    In phiếu PO
                                </AdminButton>
                                {selectedOrder.status === 'DRAFT' && (
                                    <>
                                        <AdminButton
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleOpenDelete(selectedOrder)}
                                        >
                                            Xóa đơn nháp
                                        </AdminButton>
                                        <AdminButton
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenEdit(selectedOrder);
                                            }}
                                            icon={Edit}
                                        >
                                            Chỉnh sửa
                                        </AdminButton>
                                        <AdminButton
                                            type="button"
                                            variant="primary"
                                            size="sm"
                                            onClick={() =>
                                                handlePromptStatusChange(selectedOrder, 'PENDING')
                                            }
                                            icon={Send}
                                        >
                                            Gửi duyệt
                                        </AdminButton>
                                    </>
                                )}

                                {selectedOrder.status === 'PENDING' && (
                                    <>
                                        <AdminButton
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            onClick={() =>
                                                handlePromptStatusChange(selectedOrder, 'CANCELLED')
                                            }
                                        >
                                            Hủy đơn
                                        </AdminButton>
                                        <AdminButton
                                            type="button"
                                            variant="primary"
                                            size="sm"
                                            onClick={() =>
                                                handlePromptStatusChange(selectedOrder, 'APPROVED')
                                            }
                                            icon={Check}
                                            className="!bg-emerald-600 hover:!bg-emerald-700"
                                        >
                                            Phê duyệt
                                        </AdminButton>
                                    </>
                                )}

                                {selectedOrder.status === 'APPROVED' && (
                                    <AdminButton
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() =>
                                            handlePromptStatusChange(selectedOrder, 'CANCELLED')
                                        }
                                    >
                                        Hủy đơn
                                    </AdminButton>
                                )}

                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    {activeDetailTab === 'overview' ? (
                        <div className="space-y-4">
                            {/* Flat Order & Supplier Specification Grid */}
                            <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                    {/* Order Info Column */}
                                    <div className="p-4 space-y-2.5">
                                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Thông tin đơn đặt hàng
                                        </h4>
                                        <dl className="space-y-2">
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Mã đơn (PO)</dt>
                                                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                                                    {selectedOrder.code}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Tên đơn</dt>
                                                <dd className="font-medium text-slate-900 text-right">
                                                    {selectedOrder.name}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Ngày đặt hàng</dt>
                                                <dd className="text-slate-800 tabular-nums">
                                                    {selectedOrder.orderDate}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Dự kiến giao</dt>
                                                <dd className="font-medium text-slate-900 tabular-nums">
                                                    {selectedOrder.expectedDate}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Cập nhật gần nhất</dt>
                                                <dd className="text-slate-600 tabular-nums">
                                                    {selectedOrder.lastModifiedDate || selectedOrder.createdDate}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {/* Supplier Info Column */}
                                    <div className="p-4 space-y-2.5">
                                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Thông tin nhà cung cấp
                                        </h4>
                                        <dl className="space-y-2">
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Nhà cung cấp</dt>
                                                <dd className="font-semibold text-slate-900 text-right">
                                                    {selectedOrder.supplierName}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Mã NCC</dt>
                                                <dd className="font-mono text-slate-800 tabular-nums">
                                                    {selectedOrder.supplierCode}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Số điện thoại</dt>
                                                <dd className="font-mono text-slate-800 tabular-nums">
                                                    {selectedOrder.supplierPhone}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-500">Email</dt>
                                                <dd className="text-slate-700 truncate max-w-[220px]">
                                                    {selectedOrder.supplierEmail}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                {/* Notes Row */}
                                <div className="p-4">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Ghi chú & Thỏa thuận nhập hàng
                                    </div>
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedOrder.description}
                                    </p>
                                </div>
                            </div>

                            {/* Flat Summary Strip */}
                            <div className="border border-slate-200 rounded-md bg-slate-50 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 tabular-nums">
                                <div className="px-4 py-3 flex sm:flex-col justify-between sm:justify-center">
                                    <span className="text-xs text-slate-500">Số mặt hàng</span>
                                    <span className="text-base font-semibold text-slate-900 sm:mt-0.5">
                                        {selectedOrder.totalItems}
                                    </span>
                                </div>
                                <div className="px-4 py-3 flex sm:flex-col justify-between sm:justify-center">
                                    <span className="text-xs text-slate-500">Đã nhận / Tổng đặt</span>
                                    <span className="text-base font-semibold text-slate-900 sm:mt-0.5">
                                        {selectedOrder.totalQuantityReceived} / {selectedOrder.totalQuantityOrder}
                                    </span>
                                </div>
                                <div className="px-4 py-3 flex sm:flex-col justify-between sm:justify-center">
                                    <span className="text-xs text-slate-500">Tổng giá trị đơn</span>
                                    <span className="text-base font-semibold text-slate-900 sm:mt-0.5">
                                        {formatVND(selectedOrder.totalAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Compact Items Table */}
                            <div className="border border-slate-200 rounded-md overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                            <th className="py-2.5 px-3 w-10 text-center">STT</th>
                                            <th className="py-2.5 px-3">Sản phẩm / Linh kiện</th>
                                            <th className="py-2.5 px-3 text-right">Đơn giá nhập</th>
                                            <th className="py-2.5 px-3 text-right">SL Đặt</th>
                                            <th className="py-2.5 px-3 text-right">Thực nhận</th>
                                            <th className="py-2.5 px-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/80 bg-white">
                                        {selectedOrder.items.map((it, idx) => {
                                            const prod = productMap.get(it.productId);
                                            const subtotal = it.subtotal || it.quantityOrder * it.unitCost;

                                            return (
                                                <tr key={it.id || idx} className="hover:bg-slate-50/80">
                                                    <td className="py-2.5 px-3 text-center text-slate-400 tabular-nums">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2.5">
                                                            {prod?.imageUrl ? (
                                                                <img
                                                                    src={prod.imageUrl}
                                                                    alt={prod.name}
                                                                    className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                                    <Package className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-slate-900">
                                                                    {prod?.name || `Sản phẩm #${it.productId}`}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                                                    {prod?.code || '---'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                                                        {formatVND(it.unitCost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 tabular-nums">
                                                        {it.quantityOrder}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                                                        <span
                                                            className={`font-medium ${it.quantityReceived >= it.quantityOrder
                                                                ? 'text-emerald-700'
                                                                : it.quantityReceived > 0
                                                                    ? 'text-amber-700'
                                                                    : 'text-slate-500'
                                                                }`}
                                                        >
                                                            {it.quantityReceived} / {it.quantityOrder}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                                        {formatVND(subtotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900 tabular-nums">
                                            <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600">
                                                Tổng cộng toàn đơn
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                {selectedOrder.totalQuantityOrder}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-emerald-700">
                                                {selectedOrder.totalQuantityReceived}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-sm text-slate-900 whitespace-nowrap">
                                                {formatVND(selectedOrder.totalAmount)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* ADD / EDIT MODAL (Tạo mới hoặc Chỉnh sửa đơn nháp) */}
            {/* ========================================================================= */}
            {(isAddModalOpen || isEditModalOpen) && (
                <AdminModal
                    isOpen={isAddModalOpen || isEditModalOpen}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setIsEditModalOpen(false);
                        setEditForm(null);
                    }}
                    title={
                        isEditModalOpen
                            ? `Chỉnh sửa đơn nháp: ${editForm?.code}`
                            : 'Tạo đơn nhập hàng mới'
                    }
                    subtitle="Thiết lập nhà cung cấp, ngày giao dự kiến và danh sách linh kiện cần nhập"
                    icon={Package}
                    size="xl"
                    tabs={[
                        { id: 'general', label: 'Thông tin chung & Nhà cung cấp', icon: Building2 },
                        {
                            id: 'items',
                            label: `Mặt hàng đặt mua (${formItemsSummary.totalItemsCount})`,
                            icon: Boxes,
                        },
                    ]}
                    activeTab={activeFormTab}
                    onTabChange={(t) => setActiveFormTab(t as any)}
                    isSubmitting={isSubmitting}
                    submitText={isEditModalOpen ? 'Lưu thay đổi' : 'Lưu đơn nháp'}
                    onSubmit={() => (isEditModalOpen ? handleSaveEdit() : handleSaveAdd(false))}
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="text-xs text-slate-600 tabular-nums">
                                Tổng: <strong className="text-slate-900">{formItemsSummary.totalQty} SP</strong>
                                <span className="mx-1.5 text-slate-300">·</span>
                                <strong className="text-sm text-slate-900">
                                    {formatVND(formItemsSummary.totalCost)}
                                </strong>
                            </div>
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setIsEditModalOpen(false);
                                        setEditForm(null);
                                    }}
                                >
                                    Hủy bỏ
                                </AdminButton>
                                {isAddModalOpen && (
                                    <AdminButton
                                        type="button"
                                        variant="primary"
                                        onClick={() => handleSaveAdd(true)}
                                        disabled={isSubmitting}
                                        isLoading={isSubmitting}
                                        icon={Send}
                                        className="!bg-emerald-600 hover:!bg-emerald-700"
                                    >
                                        Tạo & Gửi duyệt
                                    </AdminButton>
                                )}
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={() =>
                                        isEditModalOpen ? handleSaveEdit() : handleSaveAdd(false)
                                    }
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    {isEditModalOpen ? 'Cập nhật đơn' : 'Lưu đơn nháp'}
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    {activeFormTab === 'general' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Order Name */}
                                <div>
                                    <AdminLabel>Tên đơn nhập hàng</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={isEditModalOpen && editForm ? editForm.name : addForm.name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (isEditModalOpen && editForm) {
                                                setEditForm({ ...editForm, name: val });
                                            } else {
                                                setAddForm({ ...addForm, name: val });
                                            }
                                        }}
                                        placeholder="VD: Nhập linh kiện tháng 10 đợt 1"
                                    />
                                </div>

                                {/* Order Code */}
                                <div>
                                    <AdminLabel required>Mã đơn nhập (PO Code)</AdminLabel>
                                    <div className="flex items-center gap-2">
                                        <AdminInput
                                            type="text"
                                            value={isEditModalOpen && editForm ? editForm.code : addForm.code}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase();
                                                if (isEditModalOpen && editForm) {
                                                    setEditForm({ ...editForm, code: val });
                                                } else {
                                                    setAddForm({ ...addForm, code: val });
                                                }
                                            }}
                                            placeholder="PO-YYYYMMDD-XXX"
                                            className="font-mono font-semibold tabular-nums"
                                            required
                                        />
                                        <AdminButton
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                const newCode = generateNewOrderCode();
                                                if (isEditModalOpen && editForm) {
                                                    setEditForm({ ...editForm, code: newCode });
                                                } else {
                                                    setAddForm({ ...addForm, code: newCode });
                                                }
                                            }}
                                            className="shrink-0"
                                            title="Sinh mã tự động"
                                        >
                                            Sinh mã
                                        </AdminButton>
                                    </div>
                                </div>

                                {/* Supplier Select */}
                                <div>
                                    <AdminLabel required>Nhà cung cấp</AdminLabel>
                                    <AdminSelect
                                        value={
                                            isEditModalOpen && editForm
                                                ? editForm.supplierId
                                                : addForm.supplierId
                                        }
                                        onChange={(e) => {
                                            const sid = Number(e.target.value);
                                            if (isEditModalOpen && editForm) {
                                                setEditForm({ ...editForm, supplierId: sid });
                                            } else {
                                                setAddForm({ ...addForm, supplierId: sid });
                                            }
                                        }}
                                        required
                                    >
                                        <option value={0}>-- Chọn nhà cung cấp --</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.code})
                                            </option>
                                        ))}
                                    </AdminSelect>
                                </div>

                                {/* Order Date */}
                                <div>
                                    <AdminLabel>Ngày đặt hàng</AdminLabel>
                                    <AdminInput
                                        type="date"
                                        value={
                                            isEditModalOpen && editForm
                                                ? editForm.orderDate
                                                : addForm.orderDate
                                        }
                                        onChange={(e) => {
                                            const d = e.target.value;
                                            if (isEditModalOpen && editForm) {
                                                setEditForm({ ...editForm, orderDate: d });
                                            } else {
                                                setAddForm({ ...addForm, orderDate: d });
                                            }
                                        }}
                                        className="tabular-nums"
                                    />
                                </div>

                                {/* Expected Delivery Date */}
                                <div>
                                    <AdminLabel>Ngày dự kiến nhận hàng</AdminLabel>
                                    <AdminInput
                                        type="date"
                                        value={
                                            isEditModalOpen && editForm
                                                ? editForm.expectedDate
                                                : addForm.expectedDate
                                        }
                                        onChange={(e) => {
                                            const d = e.target.value;
                                            if (isEditModalOpen && editForm) {
                                                setEditForm({ ...editForm, expectedDate: d });
                                            } else {
                                                setAddForm({ ...addForm, expectedDate: d });
                                            }
                                        }}
                                        className="tabular-nums"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <AdminLabel>Ghi chú hoặc Thỏa thuận với nhà cung cấp</AdminLabel>
                                <AdminTextarea
                                    rows={3}
                                    value={
                                        isEditModalOpen && editForm
                                            ? editForm.description
                                            : addForm.description
                                    }
                                    onChange={(e) => {
                                        const d = e.target.value;
                                        if (isEditModalOpen && editForm) {
                                            setEditForm({ ...editForm, description: d });
                                        } else {
                                            setAddForm({ ...addForm, description: d });
                                        }
                                    }}
                                    placeholder="VD: Giao hàng vào giờ hành chính, kèm CO/CQ và hóa đơn VAT..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Toolbar to add product */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <AdminLabel className="uppercase tracking-wider">
                                        Danh sách sản phẩm đặt mua
                                    </AdminLabel>
                                    <p className="text-xs text-slate-500">
                                        Chọn sản phẩm từ danh mục, điều chỉnh số lượng và đơn giá nhập
                                    </p>
                                </div>
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setProductSearchTerm('');
                                        setIsProductPickerOpen(true);
                                    }}
                                    icon={Plus}
                                >
                                    Thêm sản phẩm
                                </AdminButton>
                            </div>

                            {/* Items Table */}
                            {((isEditModalOpen && editForm ? editForm.items : addForm.items) || [])
                                .length === 0 ? (
                                <div className="p-8 text-center border border-dashed border-slate-300 rounded-md bg-slate-50/70 space-y-2">
                                    <Package className="w-7 h-7 text-slate-400 mx-auto" />
                                    <p className="text-xs text-slate-500">
                                        Chưa có mặt hàng nào trong đơn đặt này.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProductSearchTerm('');
                                            setIsProductPickerOpen(true);
                                        }}
                                        className="text-xs text-blue-600 font-medium hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm"
                                    >
                                        + Chọn sản phẩm từ danh mục
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-md overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                                <th className="py-2.5 px-3">Sản phẩm</th>
                                                <th className="py-2.5 px-3 w-28 text-right">
                                                    SL đặt
                                                </th>
                                                <th className="py-2.5 px-3 w-40 text-right">
                                                    Đơn giá nhập (VND)
                                                </th>
                                                <th className="py-2.5 px-3 w-36 text-right">Thành tiền</th>
                                                <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/80 bg-white">
                                            {(isEditModalOpen && editForm
                                                ? editForm.items
                                                : addForm.items
                                            ).map((item) => (
                                                <tr key={item.productId} className="hover:bg-slate-50/70">
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2.5">
                                                            {item.imageUrl ? (
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={item.productName}
                                                                    className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                                    <Package className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-slate-900">
                                                                    {item.productName}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                                                    {item.productCode}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantityOrder}
                                                            onChange={(e) =>
                                                                handleUpdateFormItem(
                                                                    item.productId,
                                                                    'quantityOrder',
                                                                    parseInt(e.target.value) || 0
                                                                )
                                                            }
                                                            className="w-20 px-2 py-1 text-right font-medium tabular-nums rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={10000}
                                                            value={item.unitCost}
                                                            onChange={(e) =>
                                                                handleUpdateFormItem(
                                                                    item.productId,
                                                                    'unitCost',
                                                                    parseInt(e.target.value) || 0
                                                                )
                                                            }
                                                            className="w-32 px-2 py-1 text-right font-mono tabular-nums font-medium rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                                        {formatVND(item.quantityOrder * item.unitCost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveFormItem(item.productId)
                                                            }
                                                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                                                            title="Xóa mặt hàng này"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* PRODUCT SELECTOR MODAL (Popup chọn sản phẩm) */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isProductPickerOpen}
                onClose={() => setIsProductPickerOpen(false)}
                title="Chọn sản phẩm từ danh mục"
                subtitle="Tìm kiếm sản phẩm theo tên hoặc mã SKU để thêm vào đơn đặt hàng"
                size="xl"
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
                <div className="space-y-3">
                    {/* Search Input */}
                    <AdminInput
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        placeholder="Tìm theo tên sản phẩm hoặc mã linh kiện..."
                        prefixIcon={Search}
                        autoFocus
                    />

                    {/* Flat Product List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-200/80 border border-slate-200 rounded-md bg-white">
                        {filteredPickerProducts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                                Không tìm thấy sản phẩm nào phù hợp.
                            </div>
                        ) : (
                            filteredPickerProducts.map((p) => {
                                const currentItems =
                                    isEditModalOpen && editForm ? editForm.items : addForm.items;
                                const isAdded = currentItems.some((it) => it.productId === p.id);

                                return (
                                    <div
                                        key={p.id}
                                        className="py-2.5 px-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {p.imageUrl ? (
                                                <img
                                                    src={p.imageUrl}
                                                    alt={p.name}
                                                    className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-slate-900 truncate">
                                                    {p.name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-2 mt-0.5">
                                                    <span>{p.code}</span>
                                                    {p.price && (
                                                        <>
                                                            <span className="text-slate-300">·</span>
                                                            <span>Giá bán: {formatVND(p.price)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <AdminButton
                                            type="button"
                                            size="sm"
                                            variant={isAdded ? 'secondary' : 'primary'}
                                            onClick={() => handleAddProductToForm(p)}
                                            disabled={isAdded}
                                            icon={isAdded ? Check : Plus}
                                            className="shrink-0"
                                        >
                                            {isAdded ? 'Đã thêm' : 'Chọn'}
                                        </AdminButton>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </AdminModal>

            {/* ========================================================================= */}
            {/* STATUS ACTION CONFIRMATION MODAL */}
            {/* ========================================================================= */}
            {statusActionTarget && (
                <AdminConfirmModal
                    isOpen={Boolean(statusActionTarget)}
                    onClose={() => setStatusActionTarget(null)}
                    onConfirm={handleConfirmStatusChange}
                    title={statusActionTarget.title}
                    description={statusActionTarget.message}
                    confirmText="Đồng ý xác nhận"
                    cancelText="Đóng lại"
                    variant={statusActionTarget.variant}
                    isLoading={isUpdatingStatus}
                    itemPreview={{
                        title: `Đơn nhập: ${statusActionTarget.order.code}`,
                        subtitle: `${statusActionTarget.order.supplierName} • Tổng: ${formatVND(
                            statusActionTarget.order.totalAmount
                        )}`,
                        badge: STATUS_CONFIG[statusActionTarget.order.status]?.label,
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* DELETE MODAL (Xóa đơn nháp) */}
            {/* ========================================================================= */}
            {deleteTargetOrder && (
                <AdminConfirmModal
                    isOpen={Boolean(deleteTargetOrder)}
                    onClose={() => setDeleteTargetOrder(null)}
                    onConfirm={handleConfirmDelete}
                    title="Xóa đơn nhập hàng nháp"
                    description={`Bạn có chắc chắn muốn xóa đơn nhập nháp "${deleteTargetOrder.code}"? Đơn chưa phát sinh phiếu nhập sẽ được dọn dẹp khỏi danh sách hoạt động.`}
                    confirmText="Xác nhận xóa"
                    cancelText="Hủy bỏ"
                    variant="danger"
                    isLoading={isDeleting}
                    itemPreview={{
                        title: deleteTargetOrder.code,
                        subtitle: `${deleteTargetOrder.name} (${deleteTargetOrder.supplierName})`,
                        badge: 'DRAFT',
                    }}
                />
            )}
        </div>
    );
}
