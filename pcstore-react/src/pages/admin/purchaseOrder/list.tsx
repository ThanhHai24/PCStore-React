import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
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
        icon: React.ElementType;
        description: string;
    }
> = {
    DRAFT: {
        label: 'Đơn nháp',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        icon: Clock,
        description: 'Đơn đang soạn thảo, có thể chỉnh sửa các mặt hàng hoặc xóa bỏ',
    },
    PENDING: {
        label: 'Chờ duyệt',
        color: 'text-amber-800',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        icon: Clock,
        description: 'Đã gửi yêu cầu phê duyệt, đang chờ người có thẩm quyền ký duyệt',
    },
    APPROVED: {
        label: 'Đã duyệt',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: CheckCircle2,
        description: 'Đơn đã duyệt thành công, sẵn sàng cho việc nhận hàng & lập phiếu nhập kho',
    },
    RECEIVED: {
        label: 'Đã nhận đủ',
        color: 'text-emerald-800',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        icon: CheckCircle2,
        description: 'Kho đã xác nhận nhận đủ 100% số lượng các mặt hàng trong đơn',
    },
    CANCELLED: {
        label: 'Đã hủy',
        color: 'text-rose-800',
        bgColor: 'bg-rose-100',
        borderColor: 'border-rose-300',
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

        const itemsHtml = order.items
            .map((it, idx) => {
                const prod = productMap.get(it.productId);
                return `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        <strong>${prod?.name || 'Sản phẩm #' + it.productId}</strong><br/>
                        <small style="color: #666;">Mã: ${prod?.code || '---'}</small>
                    </td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatVND(
                    it.unitCost
                )}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.quantityOrder
                    }</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatVND(
                        it.subtotal || it.quantityOrder * it.unitCost
                    )}</td>
                </tr>
            `;
            })
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Đơn đặt hàng nhập - ${order.code}</title>
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
                        <h2 style="margin: 0; color: #333;">${order.code}</h2>
                        <p style="margin: 4px 0; color: #666;">Trạng thái: ${STATUS_CONFIG[order.status]?.label || order.status
            }</p>
                    </div>
                </div>

                <div class="grid">
                    <div class="card">
                        <h4 style="margin: 0 0 6px 0; color: #0284c7;">THÔNG TIN NHÀ CUNG CẤP</h4>
                        <div><strong>${order.supplierName}</strong></div>
                        <div>Mã NCC: ${order.supplierCode}</div>
                        <div>Điện thoại: ${order.supplierPhone}</div>
                        <div>Email: ${order.supplierEmail}</div>
                    </div>
                    <div class="card">
                        <h4 style="margin: 0 0 6px 0; color: #0284c7;">THÔNG TIN ĐƠN ĐẶT HÀNG</h4>
                        <div>Tên đơn: ${order.name}</div>
                        <div>Ngày đặt hàng: ${order.orderDate}</div>
                        <div>Dự kiến giao: ${order.expectedDate}</div>
                        <div>Ghi chú: ${order.description}</div>
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

    /**
     * Columns definition for AdminTable
     */
    const columns: Column<PurchaseOrderItemUI>[] = [
        {
            key: 'code',
            header: 'Mã & Tên đơn nhập',
            render: (order) => {
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                                {order.code}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(order.code);
                                        toast.success(`Đã sao chép mã ${order.code}`);
                                    }}
                                    className="text-blue-400 hover:text-blue-700 p-0.5"
                                    title="Sao chép mã"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            </span>
                        </div>
                        <div
                            className="font-semibold text-gray-900 text-sm truncate max-w-[220px]"
                            title={order.name}
                        >
                            {order.name}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span>Tạo lúc: {order.createdDate}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (order) => (
                <div className="space-y-1 text-xs">
                    <div
                        className="font-bold text-gray-900 flex items-center gap-1.5 truncate max-w-[200px]"
                        title={order.supplierName}
                    >
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{order.supplierName}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        {order.supplierPhone !== '---' && (
                            <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {order.supplierPhone}
                            </span>
                        )}
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono">
                            {order.supplierCode}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'dates',
            header: 'Thời gian đặt & Giao',
            render: (order) => (
                <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                            Đặt: <strong className="text-gray-800">{order.orderDate}</strong>
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                            Dự kiến:{' '}
                            <span className="font-semibold text-blue-700">{order.expectedDate}</span>
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'progress',
            header: 'Mặt hàng & Tiến độ nhận',
            render: (order) => {
                const percent =
                    order.totalQuantityOrder > 0
                        ? Math.min(
                            100,
                            Math.round((order.totalQuantityReceived / order.totalQuantityOrder) * 100)
                        )
                        : 0;

                return (
                    <div className="space-y-1.5 text-xs w-[170px]">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-gray-700">
                                {order.totalItems} mặt hàng
                            </span>
                            <span className="font-mono text-gray-500">
                                {order.totalQuantityReceived}/{order.totalQuantityOrder} cái
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
                            <div
                                className={`h-full transition-all duration-300 ${percent === 100
                                    ? 'bg-emerald-500'
                                    : percent > 0
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300'
                                    }`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center justify-between">
                            <span>Tiến độ</span>
                            <span className="font-bold text-gray-700">{percent}%</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'amount',
            header: 'Tổng tiền đơn (VND)',
            align: 'right',
            render: (order) => (
                <div className="space-y-0.5 text-right">
                    <div className="font-mono text-sm font-extrabold text-blue-700">
                        {formatVND(order.totalAmount)}
                    </div>
                    <div className="text-[10px] text-gray-400">Đã gồm thỏa thuận</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'center',
            render: (order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = cfg.icon;

                return (
                    <div className="flex flex-col items-center gap-1">
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}
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
                const isDraft = order.status === 'DRAFT';
                const isPending = order.status === 'PENDING';
                const isApproved = order.status === 'APPROVED';

                return (
                    <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => handleOpenDetail(order)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Xem chi tiết đơn"
                        >
                            <Eye className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => handlePrintOrder(order)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="In đơn đặt hàng PO"
                        >
                            <Printer className="w-4 h-4" />
                        </button>

                        {isApproved && (
                            <button
                                type="button"
                                onClick={() => navigate(`/admin/import-ticket?purchaseOrderId=${order.numericId}`)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Lập phiếu nhập kho cho đơn này (Goods Receipt)"
                            >
                                <Ticket className="w-4 h-4" />
                            </button>
                        )}

                        {isDraft ? (
                            <button
                                type="button"
                                onClick={(e) => handleOpenEdit(order, e)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Chỉnh sửa đơn nháp"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        ) : null}

                        {isDraft ? (
                            <button
                                type="button"
                                onClick={(e) => handleOpenDelete(order, e)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa đơn nháp"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : null}

                        {(isDraft || isPending || isApproved) && (
                            <button
                                type="button"
                                onClick={(e) => handlePromptStatusChange(order, 'CANCELLED', e)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hủy đơn này"
                            >
                                <Ban className="w-4 h-4" />
                            </button>
                        )}
                    </div>
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
        <div className="space-y-6">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        <span>Quản lý nhập hàng</span>
                        <span>/</span>
                        <span>Đơn đặt hàng nhà cung cấp</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Package className="w-7 h-7 text-blue-600" />
                        Quản lý đơn nhập hàng (Purchase Orders)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Lập đơn đặt mua hàng từ nhà cung cấp, theo dõi phê duyệt, kiểm soát tiến độ giao nhận và số lượng thực nhập
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadOrders(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw
                            className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        <span>Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs cursor-pointer"
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        Xuất Excel/CSV
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo đơn nhập mới
                    </button>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-sm">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                            <span className="font-bold">Lỗi tải dữ liệu:</span> {error}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadOrders()}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Metrics KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* Total */}
                <div
                    onClick={() => {
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'ALL'
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-gray-100 shadow-xs'
                        }`}
                >
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Tất cả đơn
                    </p>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</h3>
                    <p className="text-[11px] text-blue-600 font-medium mt-1">Đơn nhập hàng</p>
                </div>

                {/* Draft */}
                <div
                    onClick={() => {
                        setStatusFilter('DRAFT');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'DRAFT'
                        ? 'border-slate-500 ring-2 ring-slate-100 shadow-sm'
                        : 'border-gray-100 shadow-xs'
                        }`}
                >
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Đơn nháp</span>
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                    </p>
                    <h3 className="text-2xl font-black text-slate-700 mt-1">{metrics.draft}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Chưa gửi duyệt</p>
                </div>

                {/* Pending */}
                <div
                    onClick={() => {
                        setStatusFilter('PENDING');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'PENDING'
                        ? 'border-amber-500 ring-2 ring-amber-100 shadow-sm'
                        : 'border-gray-100 shadow-xs'
                        }`}
                >
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Chờ duyệt</span>
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                    </p>
                    <h3 className="text-2xl font-black text-amber-600 mt-1">{metrics.pending}</h3>
                    <p className="text-[11px] text-amber-600 font-medium mt-1">Cần phê duyệt</p>
                </div>

                {/* Approved */}
                <div
                    onClick={() => {
                        setStatusFilter('APPROVED');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'APPROVED'
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-gray-100 shadow-xs'
                        }`}
                >
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Đã duyệt</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    </p>
                    <h3 className="text-2xl font-black text-blue-600 mt-1">{metrics.approved}</h3>
                    <p className="text-[11px] text-blue-600 font-medium mt-1">Chờ nhận hàng</p>
                </div>

                {/* Received */}
                <div
                    onClick={() => {
                        setStatusFilter('RECEIVED');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'RECEIVED'
                        ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-sm'
                        : 'border-gray-100 shadow-xs'
                        }`}
                >
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Đã nhận đủ</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{metrics.received}</h3>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">Hoàn tất 100%</p>
                </div>

                {/* Total Value */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                            Tổng giá trị trang
                        </p>
                        <h3 className="text-lg sm:text-xl font-black text-white mt-1 truncate">
                            {formatVND(metrics.totalVal)}
                        </h3>
                    </div>
                    <p className="text-[10px] text-blue-200 mt-1">Giá trị đặt mua</p>
                </div>
            </div>

            {/* Filter Toolbar & Quick Status Selector */}
            <div className="space-y-3">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => {
                        setSearchQuery(q);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Tìm kiếm theo mã PO (PO-...), tên đơn hàng..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}

                />
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
            </div>

            {/* ========================================================================= */}
            {/* DETAIL MODAL (Xem chi tiết đơn nhập) */}
            {/* ========================================================================= */}
            {selectedOrder && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-gray-900">
                                Chi tiết đơn nhập: {selectedOrder.code}
                            </span>
                            <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_CONFIG[selectedOrder.status]?.bgColor
                                    } ${STATUS_CONFIG[selectedOrder.status]?.color} ${STATUS_CONFIG[selectedOrder.status]?.borderColor
                                    }`}
                            >
                                {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                            </span>
                        </div>
                    }
                    subtitle={`Tạo bởi Quản trị viên lúc ${selectedOrder.createdDate}`}
                    icon={Package}
                    size="xl"
                    tabs={[
                        { id: 'overview', label: '1. Thông tin đơn & Nhà cung cấp', icon: Building2 },
                        {
                            id: 'items',
                            label: `2. Mặt hàng đặt mua (${selectedOrder.items.length})`,
                            icon: Boxes,
                        },
                    ]}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handlePrintOrder(selectedOrder)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    In đơn đặt hàng
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedOrder.status === 'DRAFT' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDelete(selectedOrder)}
                                            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                                        >
                                            Xóa đơn nháp
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenEdit(selectedOrder);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Chỉnh sửa đơn
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePromptStatusChange(selectedOrder, 'PENDING')
                                            }
                                            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            Gửi duyệt ngay
                                        </button>
                                    </>
                                )}

                                {selectedOrder.status === 'PENDING' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePromptStatusChange(selectedOrder, 'CANCELLED')
                                            }
                                            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                                        >
                                            Hủy đơn
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePromptStatusChange(selectedOrder, 'APPROVED')
                                            }
                                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            Phê duyệt đơn nhập
                                        </button>
                                    </>
                                )}

                                {selectedOrder.status === 'APPROVED' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handlePromptStatusChange(selectedOrder, 'CANCELLED')
                                        }
                                        className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                                    >
                                        Hủy đơn
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    }
                >
                    {activeDetailTab === 'overview' ? (
                        <div className="space-y-6">
                            {/* Order & Supplier Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Order Card */}
                                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-blue-600" />
                                        Thông tin đơn đặt hàng
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Mã đơn đặt (PO):</span>
                                            <span className="font-mono font-bold text-gray-900">
                                                {selectedOrder.code}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Tên đơn:</span>
                                            <span className="font-semibold text-gray-900">
                                                {selectedOrder.name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Ngày đặt hàng:</span>
                                            <span className="font-medium text-gray-800">
                                                {selectedOrder.orderDate}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Dự kiến giao hàng:</span>
                                            <span className="font-semibold text-blue-700">
                                                {selectedOrder.expectedDate}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Cập nhật gần nhất:</span>
                                            <span className="text-gray-600">
                                                {selectedOrder.lastModifiedDate || selectedOrder.createdDate}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Supplier Card */}
                                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                        Thông tin nhà cung cấp
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Tên nhà cung cấp:</span>
                                            <span className="font-bold text-gray-900">
                                                {selectedOrder.supplierName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Mã nhà cung cấp:</span>
                                            <span className="font-mono text-gray-800">
                                                {selectedOrder.supplierCode}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-200/60">
                                            <span className="text-gray-500">Điện thoại liên hệ:</span>
                                            <span className="text-blue-600 font-mono">
                                                {selectedOrder.supplierPhone}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Email:</span>
                                            <span className="text-gray-700">
                                                {selectedOrder.supplierEmail}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description / Notes */}
                            <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Ghi chú & Thỏa thuận nhập hàng
                                </h4>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {selectedOrder.description}
                                </p>
                            </div>

                            {/* Summary KPI in Detail Modal */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                                    <p className="text-[11px] text-blue-600 font-semibold uppercase">
                                        Số mặt hàng
                                    </p>
                                    <p className="text-2xl font-black text-blue-900 mt-1">
                                        {selectedOrder.totalItems}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                                    <p className="text-[11px] text-emerald-600 font-semibold uppercase">
                                        Số lượng đã nhận / Tổng đặt
                                    </p>
                                    <p className="text-2xl font-black text-emerald-900 mt-1">
                                        {selectedOrder.totalQuantityReceived} /{' '}
                                        {selectedOrder.totalQuantityOrder}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center">
                                    <p className="text-[11px] text-indigo-600 font-semibold uppercase">
                                        Tổng giá trị đơn đặt
                                    </p>
                                    <p className="text-xl font-black text-indigo-900 mt-1">
                                        {formatVND(selectedOrder.totalAmount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Items List Table */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                                            <th className="py-2.5 px-3 w-12 text-center">STT</th>
                                            <th className="py-2.5 px-3">Sản phẩm / Linh kiện</th>
                                            <th className="py-2.5 px-3 text-right">Đơn giá nhập</th>
                                            <th className="py-2.5 px-3 text-center">SL Đặt</th>
                                            <th className="py-2.5 px-3 text-center">SL Thực nhận</th>
                                            <th className="py-2.5 px-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedOrder.items.map((it, idx) => {
                                            const prod = productMap.get(it.productId);
                                            const subtotal = it.subtotal || it.quantityOrder * it.unitCost;

                                            return (
                                                <tr key={it.id || idx} className="hover:bg-gray-50/80">
                                                    <td className="py-2.5 px-3 text-center text-gray-400">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2.5">
                                                            {prod?.imageUrl ? (
                                                                <img
                                                                    src={prod.imageUrl}
                                                                    alt={prod.name}
                                                                    className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                                                    <Package className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-semibold text-gray-900">
                                                                    {prod?.name ||
                                                                        `Sản phẩm #${it.productId}`}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 font-mono">
                                                                    Mã: {prod?.code || '---'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                                                        {formatVND(it.unitCost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-bold text-gray-900">
                                                        {it.quantityOrder}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${it.quantityReceived >= it.quantityOrder
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : it.quantityReceived > 0
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-gray-100 text-gray-500'
                                                                }`}
                                                        >
                                                            {it.quantityReceived} / {it.quantityOrder}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700">
                                                        {formatVND(subtotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                                            <td colSpan={3} className="py-3 px-3 text-right">
                                                Tổng cộng toàn đơn:
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {selectedOrder.totalQuantityOrder}
                                            </td>
                                            <td className="py-3 px-3 text-center text-emerald-700">
                                                {selectedOrder.totalQuantityReceived}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-base text-blue-700">
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
                            ? `Chỉnh sửa đơn nhập nháp: ${editForm?.code}`
                            : 'Tạo đơn đặt hàng nhập mới (Purchase Order)'
                    }
                    subtitle="Thiết lập nhà cung cấp, thỏa thuận ngày giao và danh sách linh kiện cần nhập"
                    icon={Package}
                    size="xl"
                    tabs={[
                        { id: 'general', label: '1. Thông tin chung & Nhà cung cấp', icon: Building2 },
                        {
                            id: 'items',
                            label: `2. Mặt hàng đặt mua (${formItemsSummary.totalItemsCount})`,
                            icon: Boxes,
                        },
                    ]}
                    activeTab={activeFormTab}
                    onTabChange={(t) => setActiveFormTab(t as any)}
                    isSubmitting={isSubmitting}
                    submitText={isEditModalOpen ? 'Lưu thay đổi' : 'Lưu đơn nháp'}
                    onSubmit={() => (isEditModalOpen ? handleSaveEdit() : handleSaveAdd(false))}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-gray-500">
                                Tổng cộng: <strong>{formItemsSummary.totalQty} cái</strong> |{' '}
                                <span className="font-mono font-bold text-blue-600 mr-3">
                                    {formatVND(formItemsSummary.totalCost)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setIsEditModalOpen(false);
                                        setEditForm(null);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                {isAddModalOpen && (
                                    <button
                                        type="button"
                                        onClick={() => handleSaveAdd(true)}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Tạo đơn nhập hàng
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        isEditModalOpen ? handleSaveEdit() : handleSaveAdd(false)
                                    }
                                    disabled={isSubmitting}
                                    className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {isEditModalOpen ? 'Cập nhật đơn' : 'Lưu đơn nháp (DRAFT)'}
                                </button>
                            </div>
                        </div>
                    }
                >
                    {activeFormTab === 'general' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                                {/* Order Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Tên đơn nhập hàng
                                    </label>
                                    <input
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
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Order Code */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Mã đơn nhập (PO Code) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
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
                                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newCode = generateNewOrderCode();
                                                if (isEditModalOpen && editForm) {
                                                    setEditForm({ ...editForm, code: newCode });
                                                } else {
                                                    setAddForm({ ...addForm, code: newCode });
                                                }
                                            }}
                                            className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 shrink-0 font-medium cursor-pointer"
                                            title="Sinh mã tự động"
                                        >
                                            Sinh mã
                                        </button>
                                    </div>
                                </div>

                                {/* Supplier Select */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Nhà cung cấp <span className="text-rose-500">*</span>
                                    </label>
                                    <select
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
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value={0}>-- Chọn nhà cung cấp --</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Order Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Ngày đặt hàng
                                    </label>
                                    <input
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
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Expected Delivery Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Ngày dự kiến nhận hàng
                                    </label>
                                    <input
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
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Ghi chú hoặc Thỏa thuận với nhà cung cấp
                                </label>
                                <textarea
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
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Toolbar to add product */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Mặt hàng linh kiện đặt mua
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Chọn sản phẩm từ danh mục, điều chỉnh số lượng đặt và đơn giá nhập thỏa thuận
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProductSearchTerm('');
                                        setIsProductPickerOpen(true);
                                    }}
                                    className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Thêm sản phẩm vào đơn
                                </button>
                            </div>

                            {/* Items Table */}
                            {((isEditModalOpen && editForm ? editForm.items : addForm.items) || [])
                                .length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl space-y-2">
                                    <Package className="w-8 h-8 text-gray-300 mx-auto" />
                                    <p className="text-xs text-gray-500 font-medium">
                                        Chưa có mặt hàng nào trong đơn đặt này.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProductSearchTerm('');
                                            setIsProductPickerOpen(true);
                                        }}
                                        className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                                    >
                                        + Nhấn để chọn sản phẩm từ kho hàng
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                                                <th className="py-2.5 px-3">Sản phẩm</th>
                                                <th className="py-2.5 px-3 w-28 text-center">
                                                    Số lượng đặt
                                                </th>
                                                <th className="py-2.5 px-3 w-40 text-right">
                                                    Đơn giá nhập (VND)
                                                </th>
                                                <th className="py-2.5 px-3 w-36 text-right">Thành tiền</th>
                                                <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(isEditModalOpen && editForm
                                                ? editForm.items
                                                : addForm.items
                                            ).map((item) => (
                                                <tr key={item.productId} className="hover:bg-gray-50/70">
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2">
                                                            {item.imageUrl ? (
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={item.productName}
                                                                    className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                                                    <Package className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-semibold text-gray-900">
                                                                    {item.productName}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-mono">
                                                                    Mã: {item.productCode}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
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
                                                            className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500"
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
                                                            className="w-32 px-2 py-1 text-right font-mono font-medium rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                                                        {formatVND(item.quantityOrder * item.unitCost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveFormItem(item.productId)
                                                            }
                                                            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
            {isProductPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    Chọn sản phẩm từ danh mục
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Tìm kiếm sản phẩm theo tên, mã SKU để thêm vào đơn đặt hàng
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsProductPickerOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    placeholder="Tìm theo tên sản phẩm hoặc mã linh kiện..."
                                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
                            {filteredPickerProducts.length === 0 ? (
                                <div className="p-8 text-center text-xs text-gray-400">
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
                                            className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {p.imageUrl ? (
                                                    <img
                                                        src={p.imageUrl}
                                                        alt={p.name}
                                                        className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-xs font-semibold text-gray-900">
                                                        {p.name}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                                                        <span>Mã: {p.code}</span>
                                                        {p.price && (
                                                            <span>Giá bán: {formatVND(p.price)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleAddProductToForm(p)}
                                                disabled={isAdded}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${isAdded
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                                                    }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        Đã thêm
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Chọn
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsProductPickerOpen(false)}
                                className="px-4 py-1.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
