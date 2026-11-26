import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Ticket,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    Send,
    Check,
    Ban,
    Printer,
    Search,
    Package,
    Boxes,
    Barcode,
    Sparkles,
    ShieldAlert,
    RotateCcw,
    Calendar,
    CheckSquare,
    AlertTriangle,
    Warehouse,
    ArrowRight,
    FileText,
    Save,
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
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
import { adminPurchaseOrderService } from '../../../services/adminPurchaseOrderService';
import { adminSupplierService } from '../../../services/adminSupplierService';
import type {
    GoodsReceiptResponse,
    GoodsReceiptStatus,
    ProductSerialStatus,
    ProductSerialResponse,
    PurchaseOrderItemReceiptInfo,
    ReceiptItemRequest,
} from '../../../types/adminGoodsReceipt';
import type { PurchaseOrderResponse } from '../../../types/adminPurchaseOrder';
import type { SupplierResponse } from '../../../types/adminSupplier';

// Flattened UI Model for Table & Details
export interface GoodsReceiptUI {
    id: string; // for table rowKey
    numericId: number;
    code: string;
    name: string;
    purchaseOrderId: number;
    poCode?: string;
    supplierName?: string;
    supplierPhone?: string;
    receivedAt: string;
    rawReceivedAt?: string | null;
    status: GoodsReceiptStatus;
    totalQuantityReceived: number;
    totalQuantityAccepted: number;
    totalQuantityDefective: number;
    totalAmount: number;
    totalItems: number;
    items: GoodsReceiptResponse['items'];
    createdDate?: string | null;
    createdBy?: number | null;
    lastModifiedDate?: string | null;
    lastModifiedBy?: number | null;
    rawResponse: GoodsReceiptResponse;
}

// Form state models for creating / editing receipt
export interface FormReceiptSerial {
    serialNumber: string;
    status: 'GOOD_CONDITION' | 'DEFECTIVE';
}

export interface FormReceiptItem {
    purchaseOrderItemId: number;
    productId: number;
    productCode: string;
    productName: string;
    quantityOrder: number;
    quantityReceivedBefore: number;
    remainingQuantity: number;
    actualUnitCost: number;
    serials: FormReceiptSerial[];
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

function toInputDateTime(isoString?: string | null): string {
    if (!isoString) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    }
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    } catch {
        return '';
    }
}

function toIsoDateTime(value?: string | null): string | undefined {
    if (!value) return undefined;
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return undefined;
        return d.toISOString();
    } catch {
        return undefined;
    }
}

function generateReceiptCode(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `GR-${yyyy}${mm}${dd}-${rnd}`;
}

// Status styling & descriptions
export const RECEIPT_STATUS_CONFIG: Record<
    GoodsReceiptStatus,
    {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        dotColor: string;
        icon: React.ElementType;
        badgeClass: string;
        description: string;
    }
> = {
    DRAFT: {
        label: 'Lưu nháp',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        dotColor: 'bg-slate-400',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-300 ring-slate-500/10',
        icon: Clock,
        description: 'Phiếu đang trong quá trình soạn thảo và kiểm đếm nháp, có thể sửa hoặc xóa',
    },
    PENDING: {
        label: 'Đang kiểm hàng',
        color: 'text-amber-800',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        dotColor: 'bg-amber-500',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/10',
        icon: Clock,
        description: 'Đã tạo phiếu tiếp nhận, đang tiến hành kiểm đếm số lượng và phân loại serial đạt chuẩn/lỗi',
    },
    CONFIRMED: {
        label: 'Đã nhập kho',
        color: 'text-emerald-800',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        dotColor: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/10',
        icon: CheckCircle2,
        description: 'Kho đã xác nhận hoàn tất. Serial đạt chuẩn chuyển thành Trong kho, tự động cập nhật số lượng nhận vào đơn hàng',
    },
    REJECTED: {
        label: 'Từ chối nhận',
        color: 'text-rose-800',
        bgColor: 'bg-rose-100',
        borderColor: 'border-rose-300',
        dotColor: 'bg-rose-500',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/10',
        icon: XCircle,
        description: 'Lô hàng bị từ chối tiếp nhận do không đạt yêu cầu giao nhận. Các serial bị hủy hiệu lực',
    },
    CANCELLED: {
        label: 'Đã hủy',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        dotColor: 'bg-slate-400',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-300 ring-slate-500/10',
        icon: Ban,
        description: 'Phiếu nhập kho đã bị hủy bỏ',
    },
};

export const SERIAL_STATUS_CONFIG: Record<
    ProductSerialStatus,
    { label: string; badgeClass: string; icon: React.ElementType }
> = {
    GOOD_CONDITION: {
        label: 'Đạt chuẩn',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
    },
    DEFECTIVE: {
        label: 'Lỗi / Hư hỏng',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertTriangle,
    },
    IN_STOCK: {
        label: 'Trong kho',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Warehouse,
    },
    PENDING_RETURN: {
        label: 'Chờ trả NCC',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: RotateCcw,
    },
    RETURNING: {
        label: 'Đang trả NCC',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: RotateCcw,
    },
    RETURNED: {
        label: 'Đã hoàn trả NCC',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: Check,
    },
    PACKING: {
        label: 'Đang đóng gói',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: Package,
    },
    DELIVERING: {
        label: 'Đang giao hàng',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: Send,
    },
    SOLD: {
        label: 'Đã bán',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: CheckSquare,
    },
    USING_BY_TECHNICAL: {
        label: 'Kỹ thuật mượn',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
        icon: Sparkles,
    },
};

export default function GoodsReceiptList() {
    const { toast } = useToast();
    const location = useLocation();

    // Data State
    const [rawReceipts, setRawReceipts] = useState<GoodsReceiptResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Purchase Orders & Suppliers lookup
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponse[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);

    // Search, Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [poFilter, setPoFilter] = useState<string>('ALL');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptUI | null>(null);
    const [detailPoItemsMap, setDetailPoItemsMap] = useState<Map<number, PurchaseOrderItemReceiptInfo>>(new Map());
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'items' | 'serials' | 'defective' | 'print'>('overview');
    const [serialSearchFilter, setSerialSearchFilter] = useState('');
    const [serialStatusFilter, setSerialStatusFilter] = useState<string>('ALL');

    // Add / Edit Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State for creating / editing receipt info
    const [formPoId, setFormPoId] = useState<number>(0);
    const [formCode, setFormCode] = useState<string>('');
    const [formName, setFormName] = useState<string>('');
    const [formReceivedAt, setFormReceivedAt] = useState<string>('');
    const [formStatus, setFormStatus] = useState<GoodsReceiptStatus>('DRAFT');
    const [formItems, setFormItems] = useState<FormReceiptItem[]>([]);
    const [isLoadingPoItems, setIsLoadingPoItems] = useState<boolean>(false);
    const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);

    // Dedicated Scan & Serial Input Modal State (nhập serial cho đơn tồn tại)
    const [scanningReceipt, setScanningReceipt] = useState<GoodsReceiptUI | null>(null);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [isSavingSerials, setIsSavingSerials] = useState(false);
    const [isCompletingReceipt, setIsCompletingReceipt] = useState(false);

    // Active item being scanned in modal
    const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
    const [barcodeInput, setBarcodeInput] = useState<string>('');
    const [barcodeStatus, setBarcodeStatus] = useState<'GOOD_CONDITION' | 'DEFECTIVE'>('GOOD_CONDITION');
    const [bulkSerialsInput, setBulkSerialsInput] = useState<string>('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    // Total serial count computed for scanning modal
    const totalScannedSerials = useMemo(() => {
        return formItems.reduce((acc, it) => acc + it.serials.length, 0);
    }, [formItems]);

    const goodConditionCount = useMemo(() => {
        return formItems.reduce(
            (acc, it) => acc + it.serials.filter((s) => s.status === 'GOOD_CONDITION').length,
            0
        );
    }, [formItems]);

    const defectiveCount = useMemo(() => {
        return formItems.reduce(
            (acc, it) => acc + it.serials.filter((s) => s.status === 'DEFECTIVE').length,
            0
        );
    }, [formItems]);

    // Status Confirmation Modals
    const [statusActionTarget, setStatusActionTarget] = useState<{
        receipt: GoodsReceiptUI;
        targetStatus: GoodsReceiptStatus;
        title: string;
        message: string;
        variant: 'success' | 'warning' | 'danger' | 'info';
    } | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Delete Confirmation Modal
    const [deleteTargetReceipt, setDeleteTargetReceipt] = useState<GoodsReceiptUI | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Map POs & Suppliers dictionaries
    const poMap = useMemo(() => {
        const map = new Map<number, PurchaseOrderResponse>();
        purchaseOrders.forEach((po) => map.set(po.id, po));
        return map;
    }, [purchaseOrders]);

    const supplierMap = useMemo(() => {
        const map = new Map<number, SupplierResponse>();
        suppliers.forEach((s) => map.set(s.id, s));
        return map;
    }, [suppliers]);

    // Load POs for filtering and creating receipt
    const loadPurchaseOrders = useCallback(async () => {
        try {
            const res = await adminPurchaseOrderService.getAllOrders({
                size: 200,
            });
            setPurchaseOrders(res.content || []);
        } catch {
            // Non-blocking
        }
    }, []);

    // Load Suppliers for displaying supplier name/phone
    const loadSuppliers = useCallback(async () => {
        try {
            const res = await adminSupplierService.getAllSuppliers({
                size: 200,
            });
            setSuppliers(res.content || []);
        } catch {
            // Non-blocking
        }
    }, []);

    useEffect(() => {
        loadPurchaseOrders();
        loadSuppliers();
    }, [loadPurchaseOrders, loadSuppliers]);

    /**
     * Map backend GoodsReceiptResponse to GoodsReceiptUI
     */
    const mapBackendToUI = useCallback(
        (b: GoodsReceiptResponse): GoodsReceiptUI => {
            const po = poMap.get(b.purchaseOrderId);
            const sup = po ? supplierMap.get(po.supplierId) : undefined;
            let totalRecv = 0;
            let totalAcc = 0;
            let totalDef = 0;
            let totalAmt = 0;

            (b.items || []).forEach((item) => {
                totalRecv += item.quantityReceived || 0;
                totalAcc += item.quantityAccepted || 0;
                totalDef += item.quantityDefective || 0;
                totalAmt += (item.actualUnitCost || 0) * (item.quantityReceived || 0);
            });

            return {
                id: String(b.id),
                numericId: b.id,
                code: b.code,
                name: b.name || `Phiếu nhập #${b.code}`,
                purchaseOrderId: b.purchaseOrderId,
                poCode: po?.code || `PO #${b.purchaseOrderId}`,
                supplierName: sup?.name || (po ? `Nhà cung cấp #${po.supplierId}` : '---'),
                supplierPhone: sup?.phoneNumber || undefined,
                receivedAt: formatDateTime(b.receivedAt),
                rawReceivedAt: b.receivedAt,
                status: b.status,
                totalQuantityReceived: totalRecv,
                totalQuantityAccepted: totalAcc,
                totalQuantityDefective: totalDef,
                totalAmount: totalAmt,
                totalItems: b.items?.length || 0,
                items: b.items || [],
                createdDate: formatDateTime(b.createdDate),
                createdBy: b.createdBy,
                lastModifiedDate: formatDateTime(b.lastModifiedDate),
                lastModifiedBy: b.lastModifiedBy,
                rawResponse: b,
            };
        },
        [poMap, supplierMap]
    );

    const receipts = useMemo(
        () => rawReceipts.map(mapBackendToUI),
        [rawReceipts, mapBackendToUI]
    );

    /**
     * Load Goods Receipts from API
     */
    const loadReceipts = useCallback(
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

                if (debouncedSearch.trim()) {
                    params.keyword = debouncedSearch.trim();
                }
                if (statusFilter && statusFilter !== 'ALL') {
                    params.status = statusFilter;
                }
                if (poFilter && poFilter !== 'ALL') {
                    params.purchaseOrderId = poFilter;
                }
                if (fromDate) {
                    params.fromDate = `${fromDate}T00:00:00Z`;
                }
                if (toDate) {
                    params.toDate = `${toDate}T23:59:59Z`;
                }

                const res = await adminGoodsReceiptService.getAllReceipts(params);

                setRawReceipts(res.content || []);
                setTotalElements(res.totalElements || 0);
                setTotalPages(res.totalPages || 1);
            } catch (err: any) {
                const msg = err?.message || 'Không thể tải danh sách phiếu nhập hàng từ hệ thống.';
                setError(msg);
                toast.error(msg);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [currentPage, pageSize, debouncedSearch, statusFilter, poFilter, fromDate, toDate, toast]
    );

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    // Check URL query parameters (e.g. ?purchaseOrderId=123) to auto open create modal
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const poIdParam = params.get('purchaseOrderId') || params.get('poId');
        if (poIdParam) {
            const numId = Number(poIdParam);
            if (!isNaN(numId) && numId > 0) {
                handleOpenAddModalWithPo(numId);
            }
        }
    }, [location.search]);

    /**
     * Quick KPI counts
     */
    const kpiStats = useMemo(() => {
        let total = totalElements;
        let confirmed = 0;
        let pending = 0;
        let draft = 0;
        let totalAcceptedQty = 0;
        let totalDefectiveQty = 0;

        receipts.forEach((r) => {
            if (r.status === 'CONFIRMED') confirmed++;
            if (r.status === 'PENDING') pending++;
            if (r.status === 'DRAFT') draft++;
            totalAcceptedQty += r.totalQuantityAccepted;
            totalDefectiveQty += r.totalQuantityDefective;
        });

        return {
            total,
            confirmed,
            pending,
            draft,
            totalAcceptedQty,
            totalDefectiveQty,
        };
    }, [receipts, totalElements]);

    /**
     * Load PO Items when a PO is selected in form
     */
    const handleSelectPO = async (poId: number) => {
        setFormPoId(poId);
        if (!poId) {
            setFormItems([]);
            return;
        }

        setIsLoadingPoItems(true);
        try {
            const itemsInfo: PurchaseOrderItemReceiptInfo[] =
                await adminGoodsReceiptService.getOrderItemsForReceipt(poId);

            const initialItems: FormReceiptItem[] = itemsInfo.map((it) => ({
                purchaseOrderItemId: it.id,
                productId: it.productId,
                productCode: it.productCode || `SP-${it.productId}`,
                productName: it.productName || `Sản phẩm #${it.productId}`,
                quantityOrder: it.quantityOrder || 0,
                quantityReceivedBefore: it.quantityReceived || 0,
                remainingQuantity: it.remainingQuantity ?? Math.max(0, it.quantityOrder - it.quantityReceived),
                actualUnitCost: it.unitCost || 0,
                serials: [],
            }));

            setFormItems(initialItems);
            setActiveItemIndex(0);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể lấy thông tin mặt hàng trong đơn đặt hàng này.');
            setFormItems([]);
        } finally {
            setIsLoadingPoItems(false);
        }
    };

    /**
     * Open Add Modal (Order creation only - no serial scanning)
     */
    const handleOpenAddModal = () => {
        setEditingReceiptId(null);
        setFormPoId(0);
        setFormCode(generateReceiptCode());
        setFormName(`Phiếu nhập kho - ${new Date().toLocaleDateString('vi-VN')}`);
        setFormReceivedAt(toInputDateTime(null));
        setFormStatus('DRAFT');
        setFormItems([]);
        setIsAddModalOpen(true);
    };

    const handleOpenAddModalWithPo = async (poId: number) => {
        handleOpenAddModal();
        await handleSelectPO(poId);
    };

    /**
     * Open Edit Modal (DRAFT basic info only)
     */
    const handleOpenEditModal = (receipt: GoodsReceiptUI) => {
        if (receipt.status !== 'DRAFT') {
            toast.warning('Chỉ có thể chỉnh sửa thông tin khi phiếu ở trạng thái Lưu nháp (DRAFT).');
            return;
        }

        setEditingReceiptId(receipt.numericId);
        setFormPoId(receipt.purchaseOrderId);
        setFormCode(receipt.code);
        setFormName(receipt.name);
        setFormReceivedAt(toInputDateTime(receipt.rawReceivedAt));
        setIsEditModalOpen(true);
    };

    /**
     * Open Dedicated Serial Scanning Modal for an existing receipt
     */
    const handleOpenScanModal = async (receipt: GoodsReceiptUI) => {
        setScanningReceipt(receipt);
        setIsScanModalOpen(true);
        setIsLoadingPoItems(true);
        setActiveItemIndex(0);
        setBarcodeInput('');
        setBarcodeStatus('GOOD_CONDITION');

        try {
            // Load PO items template for comparison
            const itemsInfo: PurchaseOrderItemReceiptInfo[] =
                await adminGoodsReceiptService.getOrderItemsForReceipt(receipt.purchaseOrderId);
            const infoMap = new Map<number, PurchaseOrderItemReceiptInfo>();
            itemsInfo.forEach((it) => infoMap.set(it.id, it));

            // Fetch full receipt in case serials were updated
            const fullReceipt = await adminGoodsReceiptService.getReceiptById(receipt.numericId);
            const receiptItemMap = new Map<number, (typeof fullReceipt.items)[0]>();
            (fullReceipt.items || []).forEach((it) => receiptItemMap.set(it.purchaseOrderItemId, it));

            // Map each item in the PO
            const mappedItems: FormReceiptItem[] = itemsInfo.map((it) => {
                const existing = receiptItemMap.get(it.id);
                const serials: FormReceiptSerial[] = (existing?.productSerials || []).map((s) => ({
                    serialNumber: s.serialNumber,
                    status: s.status === 'DEFECTIVE' ? 'DEFECTIVE' : 'GOOD_CONDITION',
                }));

                return {
                    purchaseOrderItemId: it.id,
                    productId: it.productId,
                    productCode: it.productCode || `SP-${it.productId}`,
                    productName: it.productName || `Mặt hàng #${it.productId}`,
                    quantityOrder: it.quantityOrder || 0,
                    quantityReceivedBefore: it.quantityReceived || 0,
                    remainingQuantity: it.remainingQuantity ?? Math.max(0, it.quantityOrder - it.quantityReceived),
                    actualUnitCost: existing?.actualUnitCost ?? it.unitCost ?? 0,
                    serials,
                };
            });

            setFormItems(mappedItems);
            setScanningReceipt(mapBackendToUI(fullReceipt));
        } catch (err: any) {
            toast.error(err?.message || 'Không thể tải chi tiết mặt hàng để quét Serial.');
        } finally {
            setIsLoadingPoItems(false);
        }
    };

    /**
     * Add single scanned serial
     */
    const handleAddSerial = () => {
        if (scanningReceipt?.status !== 'DRAFT') {
            toast.warning('Phiếu không ở trạng thái Lưu nháp (DRAFT), không thể thêm Serial.');
            return;
        }

        const clean = barcodeInput.trim();
        if (!clean) {
            toast.warning('Vui lòng nhập hoặc quét mã Serial.');
            return;
        }

        if (!formItems[activeItemIndex]) {
            toast.error('Vui lòng chọn dòng mặt hàng trước khi quét serial.');
            return;
        }

        const currentItem = formItems[activeItemIndex];
        const maxAllowed = Math.max(0, currentItem.remainingQuantity);

        if (currentItem.serials.length >= maxAllowed) {
            toast.error(
                `Đã đủ số lượng tối đa (${maxAllowed}) cho "${currentItem.productName}". Không thể nhập vượt quá số lượng sản phẩm đặt!`
            );
            return;
        }

        // Check for duplicate across all items in receipt
        const duplicateInReceipt = formItems.some((it) =>
            it.serials.some((s) => s.serialNumber.toLowerCase() === clean.toLowerCase())
        );
        if (duplicateInReceipt) {
            toast.error(`Mã Serial "${clean}" đã tồn tại trong phiếu nhập này!`);
            return;
        }

        const updated = formItems.map((it, idx) =>
            idx === activeItemIndex
                ? {
                      ...it,
                      serials: [...it.serials, { serialNumber: clean, status: barcodeStatus }],
                  }
                : it
        );

        setFormItems(updated);
        setBarcodeInput('');
        toast.success(`Đã thêm Serial: ${clean} (${barcodeStatus === 'GOOD_CONDITION' ? 'Đạt chuẩn' : 'Lỗi'})`);
    };

    /**
     * Add bulk serials from text
     */
    const handleAddBulkSerials = () => {
        if (scanningReceipt?.status !== 'DRAFT') {
            toast.warning('Phiếu không ở trạng thái Lưu nháp (DRAFT), không thể dán thêm Serial.');
            return;
        }

        if (!bulkSerialsInput.trim() || !formItems[activeItemIndex]) {
            setIsBulkModalOpen(false);
            return;
        }

        const currentItem = formItems[activeItemIndex];
        const maxAllowed = Math.max(0, currentItem.remainingQuantity);
        const slotsLeft = Math.max(0, maxAllowed - currentItem.serials.length);

        if (slotsLeft <= 0) {
            toast.error(
                `Đã đủ số lượng tối đa (${maxAllowed}) cho "${currentItem.productName}". Không thể nạp thêm Serial!`
            );
            setIsBulkModalOpen(false);
            return;
        }

        const lines = bulkSerialsInput
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        if (lines.length === 0) {
            setIsBulkModalOpen(false);
            return;
        }

        const existingSet = new Set(
            formItems.flatMap((it) => it.serials.map((s) => s.serialNumber.toLowerCase()))
        );
        const uniqueNewSerials: FormReceiptSerial[] = [];
        let duplicateCount = 0;

        lines.forEach((num) => {
            if (existingSet.has(num.toLowerCase())) {
                duplicateCount++;
            } else {
                existingSet.add(num.toLowerCase());
                uniqueNewSerials.push({
                    serialNumber: num,
                    status: barcodeStatus,
                });
            }
        });

        const acceptedSerials = uniqueNewSerials.slice(0, slotsLeft);
        const overflowCount = Math.max(0, uniqueNewSerials.length - slotsLeft);

        if (acceptedSerials.length > 0) {
            const updated = formItems.map((it, idx) =>
                idx === activeItemIndex
                    ? { ...it, serials: [...it.serials, ...acceptedSerials] }
                    : it
            );
            setFormItems(updated);
        }

        setBulkSerialsInput('');
        setIsBulkModalOpen(false);

        if (overflowCount > 0) {
            toast.warning(
                `Chỉ nạp ${acceptedSerials.length} serial (đạt giới hạn tối đa ${maxAllowed}). Đã bỏ qua ${overflowCount} serial vượt số lượng đặt${duplicateCount > 0 ? ` và ${duplicateCount} serial trùng` : ''}!`
            );
        } else if (acceptedSerials.length > 0) {
            toast.success(
                `Đã nạp thêm ${acceptedSerials.length} serial thành công!${duplicateCount > 0 ? ` (Bỏ qua ${duplicateCount} serial trùng lặp)` : ''}`
            );
        } else {
            toast.warning('Tất cả serial vừa dán đều đã trùng lặp.');
        }
    };

    /**
     * Toggle individual serial status (GOOD_CONDITION <-> DEFECTIVE)
     */
    const handleToggleSerialStatus = (itemIndex: number, serialIndex: number) => {
        if (scanningReceipt?.status !== 'DRAFT') {
            toast.warning('Phiếu không ở trạng thái Lưu nháp (DRAFT), không thể thay đổi trạng thái Serial.');
            return;
        }

        const updated = [...formItems];
        const cur = updated[itemIndex].serials[serialIndex].status;
        updated[itemIndex].serials[serialIndex].status =
            cur === 'GOOD_CONDITION' ? 'DEFECTIVE' : 'GOOD_CONDITION';
        setFormItems(updated);
    };

    /**
     * Remove individual serial
     */
    const handleRemoveSerial = (itemIndex: number, serialIndex: number) => {
        if (scanningReceipt?.status !== 'DRAFT') {
            toast.warning('Phiếu không ở trạng thái Lưu nháp (DRAFT), không thể xóa Serial.');
            return;
        }

        const updated = [...formItems];
        updated[itemIndex].serials.splice(serialIndex, 1);
        setFormItems(updated);
    };

    /**
     * Clear all serials of an item
     */
    const handleClearAllSerials = (itemIndex: number) => {
        if (scanningReceipt?.status !== 'DRAFT') {
            toast.warning('Phiếu không ở trạng thái Lưu nháp (DRAFT), không thể xóa Serial.');
            return;
        }

        const updated = [...formItems];
        updated[itemIndex].serials = [];
        setFormItems(updated);
    };

    /**
     * Submit Create Receipt (Order creation only - no serial scanning)
     */
    const handleCreateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formPoId) {
            toast.warning('Vui lòng chọn Đơn đặt hàng (Purchase Order) cần nhập kho.');
            return;
        }
        if (!formCode.trim()) {
            toast.warning('Vui lòng nhập mã phiếu nhập hàng.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await adminGoodsReceiptService.createReceipt({
                code: formCode.trim(),
                name: formName.trim() || undefined,
                purchaseOrderId: formPoId,
                receivedAt: toIsoDateTime(formReceivedAt),
                status: 'DRAFT',
                items: [],
            });

            toast.success(`Khởi tạo phiếu nhập "${res.code}" thành công! Bấm vào phiếu để tiến hành nhập Serial.`);
            setIsAddModalOpen(false);
            await loadReceipts(true);
            await loadPurchaseOrders();

            // Automatically open scanning modal for the newly created receipt
            const newReceiptUI = mapBackendToUI(res);
            await handleOpenScanModal(newReceiptUI);
        } catch (err: any) {
            toast.error(err?.message || 'Có lỗi xảy ra khi khởi tạo phiếu nhập hàng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Submit Edit Receipt basic info
     */
    const handleEditReceiptInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReceiptId) return;

        if (!formCode.trim()) {
            toast.warning('Vui lòng nhập mã phiếu nhập hàng.');
            return;
        }

        setIsSubmitting(true);
        try {
            const existingReceipt = rawReceipts.find((r) => r.id === editingReceiptId);
            const preservedItems: ReceiptItemRequest[] | undefined = existingReceipt
                ? (existingReceipt.items || []).map((it) => ({
                      purchaseOrderItemId: it.purchaseOrderItemId,
                      actualUnitCost: Number(it.actualUnitCost) || 0,
                      productSerials: (it.productSerials || []).map((s) => ({
                          serialNumber: s.serialNumber,
                          status: s.status,
                      })),
                  }))
                : undefined;

            await adminGoodsReceiptService.updateReceipt(editingReceiptId, {
                code: formCode.trim(),
                name: formName.trim() || undefined,
                receivedAt: toIsoDateTime(formReceivedAt),
                items: preservedItems,
            });
            toast.success('Cập nhật thông tin phiếu nhập hàng thành công!');
            setIsEditModalOpen(false);
            await loadReceipts(true);
        } catch (err: any) {
            toast.error(err?.message || 'Có lỗi xảy ra khi cập nhật phiếu nhập.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Save all serials and their status (Only for DRAFT)
     */
    const handleSaveAllSerials = async () => {
        if (!scanningReceipt) return;

        if (scanningReceipt.status !== 'DRAFT') {
            toast.warning('Chỉ có thể chỉnh sửa và lưu danh sách Serial khi phiếu ở trạng thái Lưu nháp (DRAFT).');
            return;
        }

        setIsSavingSerials(true);
        try {
            const selectedItems: ReceiptItemRequest[] = formItems
                .filter((it) => it.serials.length > 0)
                .map((it) => ({
                    purchaseOrderItemId: it.purchaseOrderItemId,
                    actualUnitCost: Number(it.actualUnitCost) || 0,
                    productSerials: it.serials.map((s) => ({
                        serialNumber: s.serialNumber.trim(),
                        status: s.status,
                    })),
                }));

            await adminGoodsReceiptService.updateReceipt(scanningReceipt.numericId, {
                code: scanningReceipt.code,
                name: scanningReceipt.name,
                receivedAt: toIsoDateTime(scanningReceipt.rawReceivedAt),
                items: selectedItems,
            });

            const totalScanned = formItems.reduce((acc, it) => acc + it.serials.length, 0);
            toast.success(`Đã lưu thành công tất cả Serial (${totalScanned}) và trạng thái cho phiếu "${scanningReceipt.code}"!`);

            await loadReceipts(true);
            const updated = await adminGoodsReceiptService.getReceiptById(scanningReceipt.numericId);
            setScanningReceipt(mapBackendToUI(updated));
        } catch (err: any) {
            toast.error(err?.message || 'Có lỗi xảy ra khi lưu danh sách Serial.');
        } finally {
            setIsSavingSerials(false);
        }
    };

    /**
     * Complete Goods Receipt and update corresponding PO status to RECEIVED (ĐÃ NHẬN)
     */
    const handleCompleteReceipt = async () => {
        if (!scanningReceipt) return;

        const totalScanned = formItems.reduce((acc, it) => acc + it.serials.length, 0);
        if (totalScanned === 0) {
            toast.warning('Vui lòng quét hoặc nhập ít nhất một Serial trước khi hoàn thành phiếu nhập!');
            return;
        }

        setIsCompletingReceipt(true);
        try {
            let currentStatus = scanningReceipt.status;

            // 1. Chỉ gọi updateReceipt lưu serials nếu phiếu đang ở trạng thái DRAFT
            if (currentStatus === 'DRAFT') {
                const selectedItems: ReceiptItemRequest[] = formItems
                    .filter((it) => it.serials.length > 0)
                    .map((it) => ({
                        purchaseOrderItemId: it.purchaseOrderItemId,
                        actualUnitCost: Number(it.actualUnitCost) || 0,
                        productSerials: it.serials.map((s) => ({
                            serialNumber: s.serialNumber.trim(),
                            status: s.status,
                        })),
                    }));

                await adminGoodsReceiptService.updateReceipt(scanningReceipt.numericId, {
                    code: scanningReceipt.code,
                    name: scanningReceipt.name,
                    receivedAt: toIsoDateTime(scanningReceipt.rawReceivedAt),
                    items: selectedItems,
                });

                // Chuyển DRAFT -> PENDING
                await adminGoodsReceiptService.updateReceiptStatus(scanningReceipt.numericId, 'PENDING');
                currentStatus = 'PENDING';
            }

            // 2. Chuyển PENDING -> CONFIRMED (Hoàn tất nhập kho)
            if (currentStatus === 'PENDING') {
                await adminGoodsReceiptService.updateReceiptStatus(scanningReceipt.numericId, 'CONFIRMED');
            }

            // 3. Đổi trạng thái của đơn nhập tương ứng sang ĐÃ NHẬN (RECEIVED)
            try {
                await adminPurchaseOrderService.updateOrderStatus(scanningReceipt.purchaseOrderId, 'RECEIVED');
            } catch (poErr: any) {
                console.log('PO status transition info:', poErr?.message);
            }

            toast.success(`Phiếu nhập "${scanningReceipt.code}" đã hoàn thành! Đơn nhập hàng đã chuyển sang trạng thái ĐÃ NHẬN.`);
            setIsScanModalOpen(false);
            setScanningReceipt(null);
            await loadReceipts(true);
            await loadPurchaseOrders();
        } catch (err: any) {
            toast.error(err?.message || 'Có lỗi xảy ra khi hoàn thành phiếu nhập.');
        } finally {
            setIsCompletingReceipt(false);
        }
    };

    /**
     * Request Status Change Confirmation (PENDING -> CONFIRMED / REJECTED / CANCELLED)
     */
    const handleRequestStatusAction = (receipt: GoodsReceiptUI, targetStatus: GoodsReceiptStatus) => {
        if (targetStatus === 'CONFIRMED') {
            setStatusActionTarget({
                receipt,
                targetStatus,
                title: 'Xác nhận hoàn tất nhập kho & Đồng bộ dữ liệu',
                message: `Bạn có chắc chắn muốn xác nhận hoàn tất phiếu nhập "${receipt.code}"?`,
                variant: 'success',
            });
        } else if (targetStatus === 'REJECTED') {
            setStatusActionTarget({
                receipt,
                targetStatus,
                title: 'Từ chối tiếp nhận lô hàng',
                message: `Bạn có chắc chắn muốn từ chối lô hàng theo phiếu "${receipt.code}"? Toàn bộ serial trong phiếu này sẽ bị hủy hiệu lực (terminated).`,
                variant: 'danger',
            });
        } else if (targetStatus === 'CANCELLED') {
            setStatusActionTarget({
                receipt,
                targetStatus,
                title: 'Hủy phiếu nhập hàng',
                message: `Bạn có chắc chắn muốn hủy phiếu nhập "${receipt.code}"?`,
                variant: 'danger',
            });
        } else if (targetStatus === 'PENDING') {
            setStatusActionTarget({
                receipt,
                targetStatus,
                title: 'Gửi kiểm đếm & Phê duyệt',
                message: `Chuyển phiếu nháp "${receipt.code}" sang trạng thái Chờ xử lý để tiếp nhận vào kho?`,
                variant: 'info',
            });
        }
    };

    /**
     * Execute Status Update API
     */
    const handleConfirmStatusUpdate = async () => {
        if (!statusActionTarget) return;

        setIsUpdatingStatus(true);
        try {
            await adminGoodsReceiptService.updateReceiptStatus(
                statusActionTarget.receipt.numericId,
                statusActionTarget.targetStatus
            );

            // Khi phiếu hoàn thành (CONFIRMED), đổi trạng thái của đơn nhập tương ứng sang ĐÃ NHẬN
            if (statusActionTarget.targetStatus === 'CONFIRMED') {
                try {
                    await adminPurchaseOrderService.updateOrderStatus(
                        statusActionTarget.receipt.purchaseOrderId,
                        'RECEIVED'
                    );
                } catch (poErr: any) {
                    console.log('PO status transition info:', poErr?.message);
                }
            }

            toast.success(
                `Phiếu nhập "${statusActionTarget.receipt.code}" đã chuyển sang trạng thái: ${RECEIPT_STATUS_CONFIG[statusActionTarget.targetStatus].label}` +
                (statusActionTarget.targetStatus === 'CONFIRMED' ? ' • Đơn nhập hàng đã chuyển sang trạng thái ĐÃ NHẬN.' : '')
            );
            setStatusActionTarget(null);
            await loadReceipts(true);
            await loadPurchaseOrders();
            if (selectedReceipt && selectedReceipt.numericId === statusActionTarget.receipt.numericId) {
                // Update active modal if open
                const updated = await adminGoodsReceiptService.getReceiptById(selectedReceipt.numericId);
                setSelectedReceipt(mapBackendToUI(updated));
            }
        } catch (err: any) {
            toast.error(err?.message || 'Không thể cập nhật trạng thái phiếu nhập.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    /**
     * Execute Delete DRAFT
     */
    const handleConfirmDelete = async () => {
        if (!deleteTargetReceipt) return;

        setIsDeleting(true);
        try {
            await adminGoodsReceiptService.deleteReceipt(deleteTargetReceipt.numericId);
            toast.success(`Đã xóa thành công phiếu nhập nháp "${deleteTargetReceipt.code}".`);
            setDeleteTargetReceipt(null);
            await loadReceipts(true);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể xóa phiếu nhập này.');
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * View Details
     */
    const handleViewDetail = async (receipt: GoodsReceiptUI) => {
        try {
            const [full, poItems] = await Promise.all([
                adminGoodsReceiptService.getReceiptById(receipt.numericId),
                adminGoodsReceiptService.getOrderItemsForReceipt(receipt.purchaseOrderId).catch(() => [] as PurchaseOrderItemReceiptInfo[]),
            ]);
            const poItemsMap = new Map<number, PurchaseOrderItemReceiptInfo>();
            poItems.forEach((it) => poItemsMap.set(it.id, it));
            setDetailPoItemsMap(poItemsMap);
            setSelectedReceipt(mapBackendToUI(full));
            setActiveDetailTab('overview');
            setSerialSearchFilter('');
            setSerialStatusFilter('ALL');
            setIsDetailModalOpen(true);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể tải chi tiết phiếu nhập.');
        }
    };

    const getDetailItemInfo = useCallback(
        (purchaseOrderItemId: number) => {
            const info = detailPoItemsMap.get(purchaseOrderItemId);
            return {
                name: info?.productName || `Mặt hàng PO #${purchaseOrderItemId}`,
                code: info?.productCode || null,
            };
        },
        [detailPoItemsMap]
    );

    // Filter fields configuration for AdminFilter component
    const filterFields: FilterField[] = useMemo(
        () => [
            {
                id: 'status',
                label: 'Trạng thái phiếu',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Clock,
                options: [
                    { label: 'Lưu nháp (DRAFT)', value: 'DRAFT' },
                    { label: 'Chờ xử lý / Đang kiểm hàng (PENDING)', value: 'PENDING' },
                    { label: 'Đã xác nhận nhập kho (CONFIRMED)', value: 'CONFIRMED' },
                    { label: 'Từ chối nhận hàng (REJECTED)', value: 'REJECTED' },
                    { label: 'Đã hủy phiếu (CANCELLED)', value: 'CANCELLED' },
                ],
            },
            {
                id: 'poId',
                label: 'Đơn đặt hàng (PO)',
                type: 'select',
                placeholder: 'Tất cả đơn đặt hàng',
                icon: Package,
                options: purchaseOrders.map((po) => ({
                    label: `${po.code} - ${po.name || 'Đơn nhập'}`,
                    value: String(po.id),
                })),
            },
            {
                id: 'fromDate',
                label: 'Từ ngày nhận',
                type: 'date',
                icon: Calendar,
            },
            {
                id: 'toDate',
                label: 'Đến ngày nhận',
                type: 'date',
                icon: Calendar,
            },
        ],
        [purchaseOrders]
    );

    // Active filter values passed to AdminFilter (only truly active filters)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (statusFilter && statusFilter !== 'ALL') {
            vals.status = statusFilter;
        }
        if (poFilter && poFilter !== 'ALL') {
            vals.poId = poFilter;
        }
        if (fromDate) {
            vals.fromDate = fromDate;
        }
        if (toDate) {
            vals.toDate = toDate;
        }
        return vals;
    }, [statusFilter, poFilter, fromDate, toDate]);

    // Handle filter changes from AdminFilter (dropdowns, chips, clear button)
    const handleFilterChange = (newValues: Record<string, any>) => {
        setStatusFilter(newValues.status || 'ALL');
        setPoFilter(newValues.poId || 'ALL');
        setFromDate(newValues.fromDate || '');
        setToDate(newValues.toDate || '');
        setCurrentPage(1);
    };

    // Handle complete filter reset
    const handleResetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setStatusFilter('ALL');
        setPoFilter('ALL');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    const renderReceiptStatusIndicator = (status: GoodsReceiptStatus) => {
        const conf = RECEIPT_STATUS_CONFIG[status] || RECEIPT_STATUS_CONFIG.PENDING;
        return (
            <span
                className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                title={conf.description}
            >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dotColor}`} />
                <span className={status === 'CANCELLED' ? 'text-slate-500' : 'text-slate-700'}>
                    {conf.label}
                </span>
            </span>
        );
    };

    // Columns configuration for AdminTable
    const columns: Column<GoodsReceiptUI>[] = [
        {
            key: 'code',
            header: 'Mã phiếu nhập',
            render: (item) => (
                <div className="space-y-0.5 min-w-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(item);
                        }}
                        className="font-mono text-xs font-semibold tabular-nums text-slate-900 hover:text-blue-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm text-left"
                    >
                        {item.code}
                    </button>
                    <div className="text-xs text-slate-500 truncate max-w-[230px]" title={item.name}>
                        <span className="font-mono tabular-nums text-slate-600">{item.poCode}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{item.name}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'poCode',
            header: 'Đơn nhập / NCC',
            render: (item) => (
                <div className="space-y-0.5 min-w-0">
                    <div
                        className="text-sm font-medium text-slate-900 truncate max-w-[210px]"
                        title={item.supplierName}
                    >
                        {item.supplierName}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-500">
                        {item.poCode}
                    </div>
                </div>
            ),
        },
        {
            key: 'quantities',
            header: 'SL thực nhập',
            align: 'right',
            render: (item) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div className="text-xs font-medium text-slate-900">
                        {item.totalQuantityReceived} SP
                        <span className="text-slate-400 font-normal"> · {item.totalItems} mã</span>
                    </div>
                    <div className="text-[11px] flex items-center justify-end gap-2">
                        <span className="text-emerald-700 font-medium">
                            {item.totalQuantityAccepted} đạt
                        </span>
                        {item.totalQuantityDefective > 0 && (
                            <span className="text-rose-600 font-medium">
                                {item.totalQuantityDefective} lỗi
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'totalAmount',
            header: 'Tổng tiền nhập',
            align: 'right',
            render: (item) => (
                <div className="text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                    {formatVND(item.totalAmount)}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => renderReceiptStatusIndicator(item.status),
        },
        {
            key: 'receivedAt',
            header: 'Thời gian nhập kho',
            align: 'right',
            render: (item) => (
                <div className="text-xs text-slate-600 text-right tabular-nums whitespace-nowrap">
                    {item.receivedAt}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={() => handleViewDetail(item)}
                    viewLabel="Xem chi tiết phiếu nhập & Serial"
                    onEdit={item.status === 'DRAFT' ? () => handleOpenEditModal(item) : undefined}
                    editLabel="Chỉnh sửa thông tin phiếu nhập"
                    actions={[
                        ...(item.status === 'DRAFT' || item.status === 'PENDING'
                            ? [
                                  {
                                      key: 'scan-serial',
                                      label: 'Quét & Nhập Serial',
                                      description: 'Kiểm đếm và gán mã Serial sản phẩm',
                                      icon: Barcode,
                                      variant: 'primary' as const,
                                      onClick: () => handleOpenScanModal(item),
                                  },
                              ]
                            : []),
                    ]}
                    moreActions={[
                        {
                            key: 'send-pending',
                            label: 'Chuyển sang Đang kiểm hàng',
                            description: 'Gửi sang trạng thái PENDING',
                            icon: Send,
                            variant: 'primary',
                            hidden: item.status !== 'DRAFT',
                            onClick: () => handleRequestStatusAction(item, 'PENDING'),
                        },
                        {
                            key: 'confirm-inbound',
                            label: 'Xác nhận hoàn tất nhập kho',
                            description: 'Cập nhật tồn kho & Serial (CONFIRMED)',
                            icon: CheckCircle2,
                            variant: 'success',
                            hidden: item.status !== 'PENDING',
                            onClick: () => handleRequestStatusAction(item, 'CONFIRMED'),
                        },
                        {
                            key: 'reject-inbound',
                            label: 'Từ chối nhận hàng',
                            description: 'Từ chối lô hàng này (REJECTED)',
                            icon: XCircle,
                            variant: 'danger',
                            hidden: item.status !== 'PENDING',
                            dividerBefore: true,
                            onClick: () => handleRequestStatusAction(item, 'REJECTED'),
                        },
                    ]}
                    onDelete={
                        item.status === 'DRAFT' ? () => setDeleteTargetReceipt(item) : undefined
                    }
                    deleteLabel="Xóa phiếu nhập nháp"
                    deleteDescription="Xóa phiếu nhập đang ở trạng thái nháp"
                />
            ),
        },
    ];

    // Detail Modal Tabs Configuration
    const detailTabs: ModalTab[] = [
        { id: 'overview', label: 'Tổng quan', icon: Ticket },
        { id: 'items', label: `Mặt hàng (${selectedReceipt?.totalItems || 0})`, icon: Package },
        { id: 'serials', label: `Quản lý Serial (${selectedReceipt?.totalQuantityReceived || 0})`, icon: Barcode },
        ...(selectedReceipt?.totalQuantityDefective && selectedReceipt.totalQuantityDefective > 0
            ? [{ id: 'defective', label: `Biên bản hàng lỗi (${selectedReceipt.totalQuantityDefective})`, icon: ShieldAlert }]
            : []),
        { id: 'print', label: 'In phiếu nhập kho', icon: Printer },
    ];



    // Flatten all serials in selectedReceipt for the Serials Tab
    const allDetailSerials = useMemo(() => {
        if (!selectedReceipt || !selectedReceipt.items) return [];
        const result: {
            serial: ProductSerialResponse;
            purchaseOrderItemId: number;
            actualUnitCost: number;
        }[] = [];

        selectedReceipt.items.forEach((item) => {
            (item.productSerials || []).forEach((ser) => {
                result.push({
                    serial: ser,
                    purchaseOrderItemId: item.purchaseOrderItemId,
                    actualUnitCost: item.actualUnitCost,
                });
            });
        });

        return result;
    }, [selectedReceipt]);

    // Filtered serials in Detail Modal
    const filteredDetailSerials = useMemo(() => {
        return allDetailSerials.filter(({ serial }) => {
            const matchSearch =
                !serialSearchFilter.trim() ||
                serial.serialNumber.toLowerCase().includes(serialSearchFilter.trim().toLowerCase());
            const matchStatus =
                serialStatusFilter === 'ALL' || serial.status === serialStatusFilter;
            return matchSearch && matchStatus;
        });
    }, [allDetailSerials, serialSearchFilter, serialStatusFilter]);

    return (
        <div className="space-y-4">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý phiếu nhập hàng
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                        {kpiStats.total.toLocaleString('vi-VN')} phiếu nhập · {kpiStats.pending} đang kiểm · {kpiStats.confirmed} đã nhập kho · {kpiStats.draft} lưu nháp
                    </p>
                </div>

                {/* Header Utility Action */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadReceipts(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between gap-3 text-rose-800 text-sm">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadReceipts(true)}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-md text-xs font-medium hover:bg-rose-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
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
                searchPlaceholder="Tìm theo mã phiếu nhập (GR-...), mã đơn nhập, nhà cung cấp..."
                fields={filterFields}
                values={filterValues}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo phiếu nhập hàng</span>
                    </button>
                }
            />

            {/* Main Data Table (Border-first, no outer card-in-card) */}
            <AdminTable<GoodsReceiptUI>
                columns={columns}
                data={receipts}
                rowKey="id"
                loading={isLoading}
                emptyText="Chưa có phiếu nhập hàng nào phù hợp với bộ lọc."
                emptyIcon={Ticket}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20]}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setCurrentPage(1);
                }}
                showPageSizeSelector={true}
                itemUnitName="phiếu nhập"
                onRowClick={(item) => {
                    if (item.status === 'DRAFT' || item.status === 'PENDING') {
                        handleOpenScanModal(item);
                    } else {
                        handleViewDetail(item);
                    }
                }}
            />

            {/* ======================================================== */}
            {/* 1. TẠO PHIẾU NHẬP MỚI (TÁCH BIỆT - CHỈ TẠO ĐƠN)          */}
            {/* ======================================================== */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Tạo phiếu nhập hàng mới"
                subtitle="Chọn đơn đặt hàng (PO) đã duyệt và thiết lập thông tin tiếp nhận ban đầu"
                icon={Ticket}
                size="lg"
                onSubmit={handleCreateReceipt}
                isSubmitting={isSubmitting}
                submitText="Tạo phiếu nhập"
            >
                <div className="space-y-4">
                    {/* Select PO */}
                    <div>
                        <AdminLabel required>Đơn đặt hàng liên kết (PO)</AdminLabel>
                        <AdminSelect
                            value={formPoId}
                            onChange={(e) => handleSelectPO(Number(e.target.value))}
                            required
                        >
                            <option value={0}>-- Chọn Đơn đặt hàng (PO) đã duyệt cần nhập kho --</option>
                            {purchaseOrders
                                .filter((po) => po.status === 'APPROVED')
                                .map((po) => (
                                    <option key={po.id} value={po.id}>
                                        {po.code} - {po.name || 'Đơn nhập'} ({po.status})
                                    </option>
                                ))}
                        </AdminSelect>
                        <p className="text-xs text-slate-500 mt-1">
                            Hệ thống tự động đối chiếu danh sách mặt hàng, số lượng còn lại và đơn giá từ đơn PO đã duyệt.
                        </p>
                    </div>

                    {/* Flat PO Summary Strip if selected */}
                    {formPoId > 0 && poMap.get(formPoId) && (
                        <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <div className="text-slate-500">
                                    Mã đơn PO:{' '}
                                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                        {poMap.get(formPoId)?.code}
                                    </span>
                                </div>
                                <div className="text-slate-500">
                                    Tên đơn / NCC:{' '}
                                    <span className="font-medium text-slate-900">{poMap.get(formPoId)?.name || '---'}</span>
                                </div>
                            </div>
                            <div className="space-y-1 sm:text-right tabular-nums">
                                <div className="text-slate-500">
                                    Tổng giá trị PO:{' '}
                                    <span className="font-semibold text-slate-900">{formatVND(poMap.get(formPoId)?.totalAmount)}</span>
                                </div>
                                <div className="text-slate-500">
                                    Trạng thái PO:{' '}
                                    <span className="font-medium text-slate-800">{poMap.get(formPoId)?.status}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview of PO Items */}
                    {formPoId > 0 && (
                        <div className="space-y-2">
                            <AdminLabel className="uppercase tracking-wider tabular-nums">
                                Danh sách mặt hàng trong PO ({formItems.length})
                            </AdminLabel>
                            {isLoadingPoItems ? (
                                <div className="p-5 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                    <span>Đang nạp thông tin mặt hàng trong đơn PO...</span>
                                </div>
                            ) : formItems.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
                                    Đơn PO này không có mặt hàng nào cần nhập.
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-md overflow-x-auto max-h-48 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2">Mặt hàng</th>
                                                <th className="px-3 py-2 text-right">Đặt mua</th>
                                                <th className="px-3 py-2 text-right">Đã nhận</th>
                                                <th className="px-3 py-2 text-right">Còn lại</th>
                                                <th className="px-3 py-2 text-right">Đơn giá</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/80 bg-white">
                                            {formItems.map((item) => (
                                                <tr key={item.purchaseOrderItemId} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-slate-900 line-clamp-1">{item.productName}</div>
                                                        <div className="text-[11px] font-mono tabular-nums text-slate-500">{item.productCode}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-800 tabular-nums">{item.quantityOrder}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{item.quantityReceivedBefore}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{item.remainingQuantity}</td>
                                                    <td className="px-3 py-2 text-right text-slate-800 tabular-nums whitespace-nowrap">{formatVND(item.actualUnitCost)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Receipt Code */}
                        <div>
                            <AdminLabel required>Mã phiếu nhập</AdminLabel>
                            <div className="flex gap-2">
                                <AdminInput
                                    type="text"
                                    value={formCode}
                                    onChange={(e) => setFormCode(e.target.value)}
                                    placeholder="Ví dụ: GR-20261028-001"
                                    className="font-mono tabular-nums"
                                    required
                                />
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setFormCode(generateReceiptCode())}
                                    size="sm"
                                    className="shrink-0"
                                    title="Tự sinh mã ngẫu nhiên"
                                >
                                    Sinh mã
                                </AdminButton>
                            </div>
                        </div>

                        {/* Receipt Name */}
                        <div>
                            <AdminLabel>Tên phiếu nhập</AdminLabel>
                            <AdminInput
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Ví dụ: Phiếu nhận đợt 1..."
                            />
                        </div>

                        {/* Received At */}
                        <div className="md:col-span-2">
                            <AdminLabel>Thời gian nhận hàng</AdminLabel>
                            <AdminInput
                                type="datetime-local"
                                value={formReceivedAt}
                                onChange={(e) => setFormReceivedAt(e.target.value)}
                                className="tabular-nums"
                            />
                        </div>
                    </div>

                    {/* Subtle Workflow Note */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-start gap-2">
                        <Barcode className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            Sau khi tạo phiếu, cửa sổ quét Serial sẽ tự động mở để kiểm đếm linh kiện. Khi hoàn thành nhập kho, đơn PO liên kết sẽ chuyển sang trạng thái <strong className="text-slate-800">Đã nhận đủ</strong>.
                        </div>
                    </div>
                </div>
            </AdminModal>

            {/* ======================================================== */}
            {/* 2. CHỈNH SỬA THÔNG TIN PHIẾU NHẬP (DRAFT BASIC INFO)     */}
            {/* ======================================================== */}
            <AdminModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Chỉnh sửa phiếu nhập: ${formCode}`}
                subtitle="Cập nhật thông tin cơ bản của phiếu nhập hàng nháp"
                icon={Edit}
                size="md"
                onSubmit={handleEditReceiptInfo}
                isSubmitting={isSubmitting}
                submitText="Lưu thay đổi"
            >
                <div className="space-y-4">
                    <div>
                        <AdminLabel required>Mã phiếu nhập</AdminLabel>
                        <AdminInput
                            type="text"
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            className="font-mono tabular-nums"
                            required
                        />
                    </div>
                    <div>
                        <AdminLabel>Tên phiếu nhập</AdminLabel>
                        <AdminInput
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                        />
                    </div>
                    <div>
                        <AdminLabel>Thời gian nhận hàng</AdminLabel>
                        <AdminInput
                            type="datetime-local"
                            value={formReceivedAt}
                            onChange={(e) => setFormReceivedAt(e.target.value)}
                            className="tabular-nums"
                        />
                    </div>
                </div>
            </AdminModal>

            {/* ======================================================== */}
            {/* 3. MÀN HÌNH QUÉT & NHẬP SERIAL CHO ĐƠN TỒN TẠI           */}
            {/* ======================================================== */}
            {scanningReceipt && (
                <AdminModal
                    isOpen={isScanModalOpen}
                    onClose={() => setIsScanModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono tabular-nums">{scanningReceipt.code}</span>
                            <span className="text-slate-300">·</span>
                            {renderReceiptStatusIndicator(scanningReceipt.status)}
                        </div>
                    }
                    subtitle={`${scanningReceipt.name} • PO: ${scanningReceipt.poCode} • ${scanningReceipt.supplierName}`}
                    icon={Barcode}
                    size="2xl"
                    showFooter={true}
                    footer={
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums flex-wrap">
                                <span>
                                    Tổng Serial: <strong className="text-slate-900">{totalScannedSerials}</strong>
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {goodConditionCount} đạt chuẩn
                                </span>
                                {defectiveCount > 0 && (
                                    <>
                                        <span className="text-slate-300">·</span>
                                        <span className="inline-flex items-center gap-1.5 text-rose-700 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            {defectiveCount} lỗi hỏng
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsScanModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                                {scanningReceipt.status === 'DRAFT' && (
                                    <AdminButton
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleSaveAllSerials}
                                        disabled={isSavingSerials || isCompletingReceipt}
                                        isLoading={isSavingSerials}
                                        icon={Save}
                                        title="Lưu lại toàn bộ Serial đã quét và trạng thái"
                                    >
                                        Lưu danh sách Serial
                                    </AdminButton>
                                )}
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={handleCompleteReceipt}
                                    disabled={isSavingSerials || isCompletingReceipt || totalScannedSerials === 0}
                                    isLoading={isCompletingReceipt}
                                    icon={CheckCircle2}
                                    className="!bg-emerald-600 hover:!bg-emerald-700"
                                    title="Xác nhận hoàn tất phiếu nhập và chuyển trạng thái đơn PO sang ĐÃ NHẬN"
                                >
                                    Hoàn thành nhập kho
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {scanningReceipt.status !== 'DRAFT' && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                <span>
                                    Phiếu đang ở trạng thái <strong>{RECEIPT_STATUS_CONFIG[scanningReceipt.status]?.label || scanningReceipt.status}</strong>.
                                    Danh sách Serial đã khóa. Bấm <strong>Hoàn thành nhập kho</strong> để duyệt xác nhận hoàn tất.
                                </span>
                            </div>
                        )}
                        {isLoadingPoItems ? (
                            <div className="p-10 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                                Đang tải danh sách mặt hàng và serial...
                            </div>
                        ) : formItems.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
                                Đơn PO này chưa có mặt hàng nào cần nhập.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Left column: Flat divide-y list of PO items */}
                                <div className="lg:col-span-5 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 tabular-nums">
                                        <span>Mặt hàng trong PO ({formItems.length})</span>
                                        <span>Chọn dòng để quét</span>
                                    </div>
                                    <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200/80 max-h-[460px] overflow-y-auto">
                                        {formItems.map((item, idx) => {
                                            const totalScanned = item.serials.length;
                                            const goodCount = item.serials.filter((s) => s.status === 'GOOD_CONDITION').length;
                                            const defCount = item.serials.filter((s) => s.status === 'DEFECTIVE').length;
                                            const isSelected = activeItemIndex === idx;

                                            return (
                                                <button
                                                    key={item.purchaseOrderItemId}
                                                    type="button"
                                                    onClick={() => setActiveItemIndex(idx)}
                                                    className={`w-full text-left p-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40 ${isSelected
                                                        ? 'bg-blue-50/70'
                                                        : 'bg-white hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className={`font-medium text-xs line-clamp-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                                            {item.productName}
                                                        </div>
                                                        <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                                                            {item.productCode}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1.5 text-[11px] text-slate-600 flex items-center justify-between tabular-nums">
                                                        <span>
                                                            Đặt: <strong className="text-slate-800">{item.quantityOrder}</strong> · Còn: <strong className="text-slate-800">{item.remainingQuantity}</strong>
                                                        </span>
                                                        <span className="font-semibold text-blue-700">
                                                            Đã quét: {totalScanned}
                                                        </span>
                                                    </div>

                                                    {(goodCount > 0 || defCount > 0) && (
                                                        <div className="mt-1 flex items-center gap-2 text-[11px] tabular-nums">
                                                            <span className="text-emerald-700 font-medium">
                                                                {goodCount} đạt
                                                            </span>
                                                            {defCount > 0 && (
                                                                <span className="text-rose-600 font-medium">
                                                                    {defCount} lỗi
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right column: Flat Serial Scanning Workspace */}
                                <div className="lg:col-span-7 border border-slate-200 rounded-md bg-white p-4 space-y-3.5">
                                    {formItems[activeItemIndex] && (
                                        <>
                                            <div className="flex justify-between items-start gap-3 border-b border-slate-200 pb-3">
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 text-sm truncate">
                                                        {formItems[activeItemIndex].productName}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                                        <span className="font-mono">{formItems[activeItemIndex].productCode}</span>
                                                        <span className="mx-1.5 text-slate-300">·</span>
                                                        <span>Đơn giá: {formatVND(formItems[activeItemIndex].actualUnitCost)}</span>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0 tabular-nums">
                                                    <div className="text-base font-semibold text-slate-900">
                                                        {formItems[activeItemIndex].serials.length}
                                                        <span className="text-xs font-normal text-slate-500">
                                                            {' '}/ {formItems[activeItemIndex].remainingQuantity}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">Serial đã nhập</div>
                                                </div>
                                            </div>

                                            {/* Barcode input row (Only in DRAFT) */}
                                            {scanningReceipt.status === 'DRAFT' && (() => {
                                                const activeItem = formItems[activeItemIndex];
                                                const isQuotaFull = activeItem.serials.length >= Math.max(0, activeItem.remainingQuantity);
                                                return (
                                                <div className="space-y-2">
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <AdminInput
                                                                type="text"
                                                                value={barcodeInput}
                                                                onChange={(e) => setBarcodeInput(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddSerial();
                                                                    }
                                                                }}
                                                                placeholder={
                                                                    isQuotaFull
                                                                        ? 'Đã quét đủ số lượng đặt cho mặt hàng này'
                                                                        : 'Quét Barcode hoặc nhập Serial rồi nhấn Enter...'
                                                                }
                                                                prefixIcon={Barcode}
                                                                className="font-mono tabular-nums w-full"
                                                                disabled={isQuotaFull}
                                                                autoFocus
                                                            />
                                                        </div>

                                                        <div className="w-full sm:w-[140px] shrink-0">
                                                            <AdminSelect
                                                                value={barcodeStatus}
                                                                onChange={(e) => setBarcodeStatus(e.target.value as any)}
                                                                className="font-medium w-full"
                                                                disabled={isQuotaFull}
                                                            >
                                                                <option value="GOOD_CONDITION">Đạt chuẩn</option>
                                                                <option value="DEFECTIVE">Hàng lỗi</option>
                                                            </AdminSelect>
                                                        </div>

                                                        <AdminButton
                                                            type="button"
                                                            onClick={handleAddSerial}
                                                            variant="primary"
                                                            disabled={isQuotaFull}
                                                            className="shrink-0 whitespace-nowrap"
                                                        >
                                                            Thêm
                                                        </AdminButton>
                                                    </div>

                                                    {/* Tool buttons: Bulk paste, Clear */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <AdminButton
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => setIsBulkModalOpen(true)}
                                                                disabled={isQuotaFull}
                                                                icon={FileText}
                                                            >
                                                                Dán nhiều serial
                                                            </AdminButton>
                                                            {isQuotaFull && (
                                                                <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Đã đủ số lượng ({activeItem.remainingQuantity})
                                                                </span>
                                                            )}
                                                        </div>

                                                        {activeItem.serials.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleClearAllSerials(activeItemIndex)}
                                                                className="text-xs text-rose-600 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 rounded-sm"
                                                            >
                                                                Xóa hết serial
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })()}

                                            {/* Serials list */}
                                            <div className="space-y-1.5">
                                                <div className="text-xs text-slate-600 flex justify-between tabular-nums">
                                                    <span className="font-medium text-slate-800">
                                                        Danh sách Serial ({formItems[activeItemIndex].serials.length})
                                                    </span>
                                                    <span className="text-slate-500">
                                                        {scanningReceipt.status === 'DRAFT'
                                                            ? 'Bấm trạng thái để chuyển Đạt / Lỗi'
                                                            : 'Danh sách serial đã cố định'}
                                                    </span>
                                                </div>

                                                <div className="max-h-[260px] overflow-y-auto border border-slate-200 rounded-md bg-white divide-y divide-slate-200/80">
                                                    {formItems[activeItemIndex].serials.length === 0 ? (
                                                        <div className="p-6 text-center text-xs text-slate-400">
                                                            Chưa có serial nào được quét.
                                                        </div>
                                                    ) : (
                                                        formItems[activeItemIndex].serials.map((ser, sIdx) => (
                                                            <div
                                                                key={`${ser.serialNumber}-${sIdx}`}
                                                                className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <span className="text-slate-400 w-5 font-mono tabular-nums shrink-0">{sIdx + 1}.</span>
                                                                    <span className="font-mono font-medium tabular-nums text-slate-900 truncate">{ser.serialNumber}</span>
                                                                </div>

                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {scanningReceipt.status === 'DRAFT' ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleSerialStatus(activeItemIndex, sIdx)}
                                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                                                                title="Bấm để đổi trạng thái giữa Đạt chuẩn và Lỗi hỏng"
                                                                            >
                                                                                <span
                                                                                    className={`w-1.5 h-1.5 rounded-full ${ser.status === 'GOOD_CONDITION'
                                                                                        ? 'bg-emerald-500'
                                                                                        : 'bg-rose-500'
                                                                                        }`}
                                                                                />
                                                                                {ser.status === 'GOOD_CONDITION' ? 'Đạt chuẩn' : 'Hàng lỗi'}
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveSerial(activeItemIndex, sIdx)}
                                                                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                                                                                title="Xóa serial"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                                                                            <span
                                                                                className={`w-1.5 h-1.5 rounded-full ${ser.status === 'GOOD_CONDITION'
                                                                                    ? 'bg-emerald-500'
                                                                                    : 'bg-rose-500'
                                                                                    }`}
                                                                            />
                                                                            {ser.status === 'GOOD_CONDITION' ? 'Đạt chuẩn' : 'Hàng lỗi'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}

            {/* Bulk Serials Modal */}
            <AdminModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                title="Nhập nhiều Serial cùng lúc"
                subtitle="Dán danh sách các mã serial vào ô bên dưới, mỗi mã trên một dòng hoặc phân tách bởi dấu phẩy"
                size="md"
                footer={
                    <AdminModalFooter
                        onCancel={() => setIsBulkModalOpen(false)}
                        onSubmit={handleAddBulkSerials}
                        cancelText="Hủy bỏ"
                        submitText="Nạp vào danh sách"
                    />
                }
            >
                <div className="space-y-3">
                    <AdminTextarea
                        rows={6}
                        value={bulkSerialsInput}
                        onChange={(e) => setBulkSerialsInput(e.target.value)}
                        placeholder="SN-20261028-0001&#10;SN-20261028-0002&#10;SN-20261028-0003..."
                        className="font-mono tabular-nums text-xs"
                    />
                </div>
            </AdminModal>

            {/* ======================================================== */}
            {/* DETAIL MODAL                                             */}
            {/* ======================================================== */}
            {selectedReceipt && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono tabular-nums text-slate-900">{selectedReceipt.code}</span>
                            <span className="text-slate-300">·</span>
                            {renderReceiptStatusIndicator(selectedReceipt.status)}
                        </div>
                    }
                    subtitle={`${selectedReceipt.name} • ${selectedReceipt.receivedAt}`}
                    icon={Ticket}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={true}
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="text-xs text-slate-500 tabular-nums">
                                Tổng giá trị phiếu:{' '}
                                <strong className="text-sm font-semibold text-slate-900">
                                    {formatVND(selectedReceipt.totalAmount)}
                                </strong>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {(selectedReceipt.status === 'DRAFT' || selectedReceipt.status === 'PENDING') && (
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            handleOpenScanModal(selectedReceipt);
                                        }}
                                        icon={Barcode}
                                    >
                                        Quét & Nhập Serial
                                    </AdminButton>
                                )}
                                {selectedReceipt.status === 'PENDING' && (
                                    <>
                                        <AdminButton
                                            type="button"
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleRequestStatusAction(selectedReceipt, 'REJECTED')}
                                            icon={XCircle}
                                        >
                                            Từ chối nhận
                                        </AdminButton>
                                        <AdminButton
                                            type="button"
                                            size="sm"
                                            variant="primary"
                                            onClick={() => handleRequestStatusAction(selectedReceipt, 'CONFIRMED')}
                                            icon={CheckCircle2}
                                            className="!bg-emerald-600 hover:!bg-emerald-700"
                                        >
                                            Xác nhận nhập kho
                                        </AdminButton>
                                    </>
                                )}
                                {selectedReceipt.status === 'DRAFT' && (
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleRequestStatusAction(selectedReceipt, 'PENDING')}
                                        icon={Send}
                                    >
                                        Gửi kiểm đếm
                                    </AdminButton>
                                )}
                                <AdminButton
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    {/* Tab 1: Overview */}
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-4">
                            {/* Flat Status Description Bar */}
                            <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    {renderReceiptStatusIndicator(selectedReceipt.status)}
                                    <span className="text-slate-300">|</span>
                                    <span>{RECEIPT_STATUS_CONFIG[selectedReceipt.status].description}</span>
                                </div>
                            </div>

                            {/* Flat 4-column Summary Strip */}
                            <div className="border border-slate-200 rounded-md bg-white grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-x divide-slate-200 tabular-nums">
                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Tổng SL thực nhận</div>
                                    <div className="text-lg font-semibold text-slate-900 mt-0.5">
                                        {selectedReceipt.totalQuantityReceived}{' '}
                                        <span className="text-xs font-normal text-slate-500">SP</span>
                                    </div>
                                </div>
                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Đạt chuẩn vào kho</div>
                                    <div className="text-lg font-semibold text-emerald-700 mt-0.5">
                                        {selectedReceipt.totalQuantityAccepted}{' '}
                                        <span className="text-xs font-normal text-slate-500">SP</span>
                                    </div>
                                </div>
                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Lỗi / Chờ trả NCC</div>
                                    <div className="text-lg font-semibold text-rose-700 mt-0.5">
                                        {selectedReceipt.totalQuantityDefective}{' '}
                                        <span className="text-xs font-normal text-slate-500">SP</span>
                                    </div>
                                </div>
                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Tổng giá trị phiếu</div>
                                    <div className="text-lg font-semibold text-slate-900 mt-0.5">
                                        {formatVND(selectedReceipt.totalAmount)}
                                    </div>
                                </div>
                            </div>

                            {/* Flat 2-column Specification Grid */}
                            <div className="border border-slate-200 rounded-md bg-white grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
                                <div className="p-4 space-y-2.5">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        Thông tin phiếu nhập
                                    </div>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Mã phiếu</dt>
                                            <dd className="font-mono font-semibold text-slate-900 tabular-nums">{selectedReceipt.code}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Tên phiếu</dt>
                                            <dd className="font-medium text-slate-900 text-right">{selectedReceipt.name}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Thời gian nhận hàng</dt>
                                            <dd className="text-slate-800 tabular-nums">{selectedReceipt.receivedAt}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Ngày tạo phiếu</dt>
                                            <dd className="text-slate-600 tabular-nums">{selectedReceipt.createdDate}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="p-4 space-y-2.5">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        Đơn đặt hàng (PO) liên kết
                                    </div>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Mã Đơn PO</dt>
                                            <dd className="font-mono font-semibold text-slate-900 tabular-nums">{selectedReceipt.poCode}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Tên Đơn / NCC</dt>
                                            <dd className="font-medium text-slate-900 text-right">{selectedReceipt.supplierName}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Cập nhật lần cuối</dt>
                                            <dd className="text-slate-600 tabular-nums">{selectedReceipt.lastModifiedDate}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Items list */}
                    {activeDetailTab === 'items' && (
                        <div className="space-y-3">
                            <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                                            <th className="px-3.5 py-2.5">Mặt hàng</th>
                                            <th className="px-3.5 py-2.5 text-right">Đơn giá nhập</th>
                                            <th className="px-3.5 py-2.5 text-right">Tổng nhận</th>
                                            <th className="px-3.5 py-2.5 text-right">Đạt chuẩn</th>
                                            <th className="px-3.5 py-2.5 text-right">Lỗi hỏng</th>
                                            <th className="px-3.5 py-2.5 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/80">
                                        {(selectedReceipt.items || []).map((it, idx) => {
                                            const itemInfo = getDetailItemInfo(it.purchaseOrderItemId);
                                            return (
                                            <tr key={it.id || idx} className="hover:bg-slate-50/80">
                                                <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono tabular-nums">{idx + 1}</td>
                                                <td className="px-3.5 py-2.5">
                                                    <div className="font-medium text-slate-900">
                                                        {itemInfo.name}
                                                    </div>
                                                    <div className="text-slate-500 text-[11px] tabular-nums flex items-center gap-1.5 flex-wrap">
                                                        {itemInfo.code && (
                                                            <>
                                                                <span className="font-mono text-slate-600">{itemInfo.code}</span>
                                                                <span className="text-slate-300">·</span>
                                                            </>
                                                        )}
                                                        <span>{it.productSerials?.length || 0} serial được định danh</span>
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right text-slate-700 tabular-nums whitespace-nowrap">
                                                    {formatVND(it.actualUnitCost)}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-medium text-slate-900 tabular-nums">
                                                    {it.quantityReceived}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-medium text-emerald-700 tabular-nums">
                                                    {it.quantityAccepted}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-medium text-rose-700 tabular-nums">
                                                    {it.quantityDefective}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                                    {formatVND((it.actualUnitCost || 0) * (it.quantityReceived || 0))}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-900 tabular-nums">
                                        <tr>
                                            <td colSpan={3} className="px-3.5 py-2.5 text-right text-slate-600">
                                                Tổng cộng
                                            </td>
                                            <td className="px-3.5 py-2.5 text-right">{selectedReceipt.totalQuantityReceived}</td>
                                            <td className="px-3.5 py-2.5 text-right text-emerald-700">{selectedReceipt.totalQuantityAccepted}</td>
                                            <td className="px-3.5 py-2.5 text-right text-rose-700">{selectedReceipt.totalQuantityDefective}</td>
                                            <td className="px-3.5 py-2.5 text-right text-sm whitespace-nowrap">{formatVND(selectedReceipt.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Serials List */}
                    {activeDetailTab === 'serials' && (
                        <div className="space-y-3">
                            {/* Filter Serials */}
                            <div className="flex flex-col sm:flex-row justify-between gap-2.5">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={serialSearchFilter}
                                        onChange={(e) => setSerialSearchFilter(e.target.value)}
                                        placeholder="Tra cứu số Serial..."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={serialStatusFilter}
                                        onChange={(e) => setSerialStatusFilter(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                    >
                                        <option value="ALL">Tất cả tình trạng serial</option>
                                        <option value="GOOD_CONDITION">Đạt chuẩn (GOOD_CONDITION)</option>
                                        <option value="DEFECTIVE">Lỗi hỏng (DEFECTIVE)</option>
                                        <option value="IN_STOCK">Trong kho (IN_STOCK)</option>
                                        <option value="PENDING_RETURN">Chờ hoàn trả (PENDING_RETURN)</option>
                                    </select>

                                    {(selectedReceipt.status === 'DRAFT' || selectedReceipt.status === 'PENDING') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenScanModal(selectedReceipt);
                                            }}
                                            className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        >
                                            <Barcode className="w-3.5 h-3.5" />
                                            <span>Quét Serial</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Serials Table */}
                            <div className="border border-slate-200 rounded-md overflow-x-auto bg-white max-h-[420px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                                            <th className="px-3.5 py-2.5">Số Serial</th>
                                            <th className="px-3.5 py-2.5">Trạng thái vòng đời</th>
                                            <th className="px-3.5 py-2.5">Mặt hàng PO</th>
                                            <th className="px-3.5 py-2.5 text-right">Hiệu lực</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/80">
                                        {filteredDetailSerials.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                    Không tìm thấy Serial nào phù hợp.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDetailSerials.map(({ serial, purchaseOrderItemId }, sIdx) => {
                                                const conf = SERIAL_STATUS_CONFIG[serial.status] || {
                                                    label: serial.status,
                                                    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
                                                    icon: CheckCircle2,
                                                };

                                                return (
                                                    <tr key={serial.id || sIdx} className="hover:bg-slate-50">
                                                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono tabular-nums">{sIdx + 1}</td>
                                                        <td className="px-3.5 py-2.5 font-mono font-medium tabular-nums text-slate-900">
                                                            {serial.serialNumber}
                                                        </td>
                                                        <td className="px-3.5 py-2.5">
                                                            <span
                                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${conf.badgeClass}`}
                                                            >
                                                                {conf.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-slate-700">
                                                            <div className="font-medium text-slate-900">{getDetailItemInfo(purchaseOrderItemId).name}</div>
                                                            {getDetailItemInfo(purchaseOrderItemId).code && (
                                                                <div className="text-[11px] font-mono text-slate-500">
                                                                    {getDetailItemInfo(purchaseOrderItemId).code}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-right">
                                                            {serial.isTerminated || serial.terminated ? (
                                                                <span className="text-rose-600 text-[11px] font-medium">Đã hủy</span>
                                                            ) : (
                                                                <span className="text-emerald-700 text-[11px] font-medium">Hoạt động</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Defective goods return memo */}
                    {activeDetailTab === 'defective' && (
                        <div className="space-y-3">
                            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-md space-y-1">
                                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>Biên bản ghi nhận sản phẩm lỗi / không đạt chuẩn kỹ thuật</span>
                                </div>
                                <p className="text-xs text-rose-700">
                                    Các sản phẩm sau được gán trạng thái <strong>DEFECTIVE / PENDING_RETURN</strong> để lập hồ sơ đổi trả hoặc yêu cầu nhà cung cấp bồi hoàn.
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                                            <th className="px-3.5 py-2.5">Số Serial bị lỗi</th>
                                            <th className="px-3.5 py-2.5">Mặt hàng</th>
                                            <th className="px-3.5 py-2.5">Tình trạng ghi nhận</th>
                                            <th className="px-3.5 py-2.5 text-right">Hướng xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/80">
                                        {allDetailSerials
                                            .filter(({ serial }) => serial.status === 'DEFECTIVE' || serial.status === 'PENDING_RETURN')
                                            .map(({ serial, purchaseOrderItemId }, dIdx) => (
                                                <tr key={serial.id || dIdx} className="hover:bg-slate-50">
                                                    <td className="px-3.5 py-2.5 text-center font-mono tabular-nums text-slate-400">{dIdx + 1}</td>
                                                    <td className="px-3.5 py-2.5 font-mono font-semibold tabular-nums text-rose-700">
                                                        {serial.serialNumber}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-700">
                                                        <div className="font-medium text-slate-900">{getDetailItemInfo(purchaseOrderItemId).name}</div>
                                                        {getDetailItemInfo(purchaseOrderItemId).code && (
                                                            <div className="text-[11px] font-mono text-slate-500">
                                                                {getDetailItemInfo(purchaseOrderItemId).code}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-600">
                                                        Ngoại quan lỗi / Không lên nguồn / Sai tem kiểm định
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-right font-medium text-amber-700">
                                                        Hoàn trả Nhà cung cấp
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Print View */}
                    {activeDetailTab === 'print' && (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => window.print()}
                                    icon={Printer}
                                >
                                    In phiếu nhập kho
                                </AdminButton>
                            </div>

                            {/* Printable Paper Canvas */}
                            <div className="p-6 sm:p-8 bg-white border border-slate-300 rounded-md text-black font-serif space-y-6">
                                <div className="text-center space-y-1">
                                    <div className="font-bold text-sm uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div className="text-xs italic underline">Độc lập - Tự do - Hạnh phúc</div>
                                </div>

                                <div className="text-center pt-2">
                                    <h2 className="text-xl font-bold uppercase tracking-wider">PHIẾU NHẬP KHO THỰC TẾ</h2>
                                    <div className="text-xs text-slate-600 font-sans tabular-nums mt-0.5">Số: {selectedReceipt.code}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                                    <div>
                                        <div><b>Đơn đặt hàng (PO):</b> <span className="tabular-nums">{selectedReceipt.poCode}</span></div>
                                        <div><b>Nhà cung cấp:</b> {selectedReceipt.supplierName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div><b>Thời gian nhận hàng:</b> <span className="tabular-nums">{selectedReceipt.receivedAt}</span></div>
                                        <div><b>Trạng thái phiếu:</b> {selectedReceipt.status}</div>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse border border-slate-400 font-sans tabular-nums">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-400 p-2 text-center">STT</th>
                                            <th className="border border-slate-400 p-2 text-left">Tên hàng hóa</th>
                                            <th className="border border-slate-400 p-2 text-right">Tổng nhận</th>
                                            <th className="border border-slate-400 p-2 text-right">Đạt chuẩn</th>
                                            <th className="border border-slate-400 p-2 text-right">Lỗi hỏng</th>
                                            <th className="border border-slate-400 p-2 text-right">Đơn giá (VND)</th>
                                            <th className="border border-slate-400 p-2 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedReceipt.items || []).map((it, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
                                                <td className="border border-slate-400 p-2">
                                                    <div className="font-medium">{getDetailItemInfo(it.purchaseOrderItemId).name}</div>
                                                    {getDetailItemInfo(it.purchaseOrderItemId).code && (
                                                        <div className="text-[11px] font-mono text-slate-600">
                                                            {getDetailItemInfo(it.purchaseOrderItemId).code}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="border border-slate-400 p-2 text-right font-semibold">{it.quantityReceived}</td>
                                                <td className="border border-slate-400 p-2 text-right text-emerald-700 font-semibold">{it.quantityAccepted}</td>
                                                <td className="border border-slate-400 p-2 text-right text-rose-700 font-semibold">{it.quantityDefective}</td>
                                                <td className="border border-slate-400 p-2 text-right">{formatVND(it.actualUnitCost)}</td>
                                                <td className="border border-slate-400 p-2 text-right font-semibold">
                                                    {formatVND((it.actualUnitCost || 0) * (it.quantityReceived || 0))}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold bg-slate-50">
                                            <td colSpan={2} className="border border-slate-400 p-2 text-center uppercase">Tổng cộng</td>
                                            <td className="border border-slate-400 p-2 text-right">{selectedReceipt.totalQuantityReceived}</td>
                                            <td className="border border-slate-400 p-2 text-right text-emerald-700">{selectedReceipt.totalQuantityAccepted}</td>
                                            <td className="border border-slate-400 p-2 text-right text-rose-700">{selectedReceipt.totalQuantityDefective}</td>
                                            <td className="border border-slate-400 p-2"></td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-900">{formatVND(selectedReceipt.totalAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs font-sans">
                                    <div className="space-y-16">
                                        <div className="font-bold">Người giao hàng (NCC)</div>
                                        <div className="italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">Nhân viên kiểm kho</div>
                                        <div className="italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">Quản lý duyệt nhập</div>
                                        <div className="italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ======================================================== */}
            {/* STATUS TRANSITION CONFIRM MODAL                          */}
            {/* ======================================================== */}
            {statusActionTarget && (
                <AdminConfirmModal
                    isOpen={Boolean(statusActionTarget)}
                    onClose={() => setStatusActionTarget(null)}
                    onConfirm={handleConfirmStatusUpdate}
                    title={statusActionTarget.title}
                    message={statusActionTarget.message}
                    variant={statusActionTarget.variant}
                    isLoading={isUpdatingStatus}
                    confirmText="Xác nhận thực hiện"
                    cancelText="Đóng"
                />
            )}

            {/* ======================================================== */}
            {/* DELETE CONFIRM MODAL                                     */}
            {/* ======================================================== */}
            {deleteTargetReceipt && (
                <AdminConfirmModal
                    isOpen={Boolean(deleteTargetReceipt)}
                    onClose={() => setDeleteTargetReceipt(null)}
                    onConfirm={handleConfirmDelete}
                    title="Xóa phiếu nhập hàng nháp"
                    message={`Bạn có chắc chắn muốn xóa vĩnh viễn phiếu nhập "${deleteTargetReceipt.code}"? Thao tác này không thể hoàn tác.`}
                    variant="danger"
                    isLoading={isDeleting}
                    confirmText="Xóa bỏ"
                    cancelText="Hủy"
                />
            )}
        </div>
    );
}
