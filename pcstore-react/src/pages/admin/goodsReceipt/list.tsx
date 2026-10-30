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
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
import { adminPurchaseOrderService } from '../../../services/adminPurchaseOrderService';
import type {
    GoodsReceiptResponse,
    GoodsReceiptStatus,
    ProductSerialStatus,
    ProductSerialResponse,
    PurchaseOrderItemReceiptInfo,
    ReceiptItemRequest,
} from '../../../types/adminGoodsReceipt';
import type { PurchaseOrderResponse } from '../../../types/adminPurchaseOrder';

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
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-300 ring-slate-500/10',
        icon: Clock,
        description: 'Phiếu đang trong quá trình soạn thảo và kiểm đếm nháp, có thể sửa hoặc xóa',
    },
    PENDING: {
        label: 'Chờ xử lý / Đang kiểm hàng',
        color: 'text-amber-800',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/10',
        icon: Clock,
        description: 'Đã tạo phiếu tiếp nhận, đang tiến hành kiểm đếm số lượng và phân loại serial đạt chuẩn/lỗi',
    },
    CONFIRMED: {
        label: 'Đã xác nhận nhập kho',
        color: 'text-emerald-800',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/10',
        icon: CheckCircle2,
        description: 'Kho đã xác nhận hoàn tất. Serial đạt chuẩn chuyển thành Trong kho, tự động cập nhật số lượng nhận vào đơn hàng',
    },
    REJECTED: {
        label: 'Từ chối nhận hàng',
        color: 'text-rose-800',
        bgColor: 'bg-rose-100',
        borderColor: 'border-rose-300',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/10',
        icon: XCircle,
        description: 'Lô hàng bị từ chối tiếp nhận do không đạt yêu cầu giao nhận. Các serial bị hủy hiệu lực',
    },
    CANCELLED: {
        label: 'Đã hủy phiếu',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        badgeClass: 'bg-gray-50 text-gray-700 border-gray-300 ring-gray-500/10',
        icon: Ban,
        description: 'Phiếu nhập kho đã bị hủy bỏ',
    },
};

export const SERIAL_STATUS_CONFIG: Record<
    ProductSerialStatus,
    { label: string; badgeClass: string; icon: React.ElementType }
> = {
    GOOD_CONDITION: {
        label: 'Đạt chuẩn (Tốt)',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        icon: CheckCircle2,
    },
    DEFECTIVE: {
        label: 'Lỗi / Hư hỏng',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
        icon: AlertTriangle,
    },
    IN_STOCK: {
        label: 'Trong kho',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        icon: Warehouse,
    },
    PENDING_RETURN: {
        label: 'Chờ trả NCC',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        icon: RotateCcw,
    },
    RETURNING: {
        label: 'Đang trả NCC',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20',
        icon: RotateCcw,
    },
    RETURNED: {
        label: 'Đã hoàn trả NCC',
        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/20',
        icon: Check,
    },
    PACKING: {
        label: 'Đang đóng gói',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20',
        icon: Package,
    },
    DELIVERING: {
        label: 'Đang giao hàng',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20',
        icon: Send,
    },
    SOLD: {
        label: 'Đã bán',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
        icon: CheckSquare,
    },
    USING_BY_TECHNICAL: {
        label: 'Kỹ thuật mượn',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/20',
        icon: Sparkles,
    },
};

export default function GoodsReceiptList() {
    const { toast } = useToast();
    const location = useLocation();

    // Data State
    const [receipts, setReceipts] = useState<GoodsReceiptUI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Purchase Orders lookup
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponse[]>([]);

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

    // Map POs dictionary
    const poMap = useMemo(() => {
        const map = new Map<number, PurchaseOrderResponse>();
        purchaseOrders.forEach((po) => map.set(po.id, po));
        return map;
    }, [purchaseOrders]);

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

    useEffect(() => {
        loadPurchaseOrders();
    }, [loadPurchaseOrders]);

    /**
     * Map backend GoodsReceiptResponse to GoodsReceiptUI
     */
    const mapBackendToUI = useCallback(
        (b: GoodsReceiptResponse): GoodsReceiptUI => {
            const po = poMap.get(b.purchaseOrderId);
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
                supplierName: po?.name || '---',
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
        [poMap]
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

                const mapped = (res.content || []).map(mapBackendToUI);
                setReceipts(mapped);
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
        [currentPage, pageSize, debouncedSearch, statusFilter, poFilter, fromDate, toDate, mapBackendToUI, toast]
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

        // Check for duplicate in current item or across all items in receipt
        const duplicateInItem = currentItem.serials.some((s) => s.serialNumber.toLowerCase() === clean.toLowerCase());
        if (duplicateInItem) {
            toast.error(`Mã Serial "${clean}" đã tồn tại trong dòng sản phẩm này!`);
            return;
        }

        const updated = [...formItems];
        updated[activeItemIndex].serials.push({
            serialNumber: clean,
            status: barcodeStatus,
        });

        setFormItems(updated);
        setBarcodeInput('');
        toast.success(`Đã thêm Serial: ${clean} (${barcodeStatus === 'GOOD_CONDITION' ? 'Đạt chuẩn' : 'Lỗi'})`);
    };

    /**
     * Add bulk serials from text
     */
    const handleAddBulkSerials = () => {
        if (!bulkSerialsInput.trim() || !formItems[activeItemIndex]) {
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

        const currentItem = formItems[activeItemIndex];
        const existingSet = new Set(currentItem.serials.map((s) => s.serialNumber.toLowerCase()));
        const newSerials: FormReceiptSerial[] = [];
        let duplicateCount = 0;

        lines.forEach((num) => {
            if (existingSet.has(num.toLowerCase())) {
                duplicateCount++;
            } else {
                existingSet.add(num.toLowerCase());
                newSerials.push({
                    serialNumber: num,
                    status: barcodeStatus,
                });
            }
        });

        const updated = [...formItems];
        updated[activeItemIndex].serials.push(...newSerials);
        setFormItems(updated);
        setBulkSerialsInput('');
        setIsBulkModalOpen(false);

        toast.success(`Đã nạp thêm ${newSerials.length} serial thành công! ${duplicateCount > 0 ? `(Bỏ qua ${duplicateCount} serial trùng lặp)` : ''}`);
    };

    /**
     * Toggle individual serial status (GOOD_CONDITION <-> DEFECTIVE)
     */
    const handleToggleSerialStatus = (itemIndex: number, serialIndex: number) => {
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
        const updated = [...formItems];
        updated[itemIndex].serials.splice(serialIndex, 1);
        setFormItems(updated);
    };

    /**
     * Clear all serials of an item
     */
    const handleClearAllSerials = (itemIndex: number) => {
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
                receivedAt: formReceivedAt ? `${formReceivedAt}:00Z` : undefined,
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
            await adminGoodsReceiptService.updateReceipt(editingReceiptId, {
                code: formCode.trim(),
                name: formName.trim() || undefined,
                receivedAt: formReceivedAt ? `${formReceivedAt}:00Z` : undefined,
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
     * Save all serials and their status
     */
    const handleSaveAllSerials = async () => {
        if (!scanningReceipt) return;

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
                receivedAt: scanningReceipt.rawReceivedAt ? `${scanningReceipt.rawReceivedAt.slice(0, 19)}Z` : undefined,
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
            // Save all serials and status first
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
                receivedAt: scanningReceipt.rawReceivedAt ? `${scanningReceipt.rawReceivedAt.slice(0, 19)}Z` : undefined,
                items: selectedItems,
            });

            // Transition status
            let currentStatus = scanningReceipt.status;
            if (currentStatus === 'DRAFT') {
                await adminGoodsReceiptService.updateReceiptStatus(scanningReceipt.numericId, 'PENDING');
                currentStatus = 'PENDING';
            }

            if (currentStatus === 'PENDING') {
                await adminGoodsReceiptService.updateReceiptStatus(scanningReceipt.numericId, 'CONFIRMED');
            }

            // Đổi trạng thái của đơn nhập tương ứng sang ĐÃ NHẬN (RECEIVED)
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
            const full = await adminGoodsReceiptService.getReceiptById(receipt.numericId);
            setSelectedReceipt(mapBackendToUI(full));
            setActiveDetailTab('overview');
            setSerialSearchFilter('');
            setSerialStatusFilter('ALL');
            setIsDetailModalOpen(true);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể tải chi tiết phiếu nhập.');
        }
    };

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

    // Quick status navigation tabs
    const statusTabs = useMemo(
        () => [
            { key: 'ALL', label: 'Tất cả phiếu', icon: Ticket },
            { key: 'PENDING', label: 'Chờ xử lý / Đang kiểm', icon: Clock },
            { key: 'CONFIRMED', label: 'Đã nhập kho', icon: CheckCircle2 },
            { key: 'DRAFT', label: 'Lưu nháp', icon: Edit },
            { key: 'REJECTED', label: 'Từ chối nhận', icon: XCircle },
            { key: 'CANCELLED', label: 'Đã hủy', icon: Ban },
        ],
        []
    );

    // Columns configuration for AdminTable
    const columns: Column<GoodsReceiptUI>[] = [
        {
            key: 'code',
            header: 'Mã phiếu',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer" onClick={() => handleViewDetail(item)}>
                            {item.code}
                        </span>
                        <div className="text-xs text-gray-500 line-clamp-1">{item.name}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'poCode',
            header: 'Đơn đặt hàng (PO)',
            render: (item) => (
                <div>
                    <div className="font-medium text-gray-800 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.poCode}</span>
                    </div>
                    <div className="text-xs text-gray-500">{item.supplierName}</div>
                </div>
            ),
        },
        {
            key: 'receivedAt',
            header: 'Thời gian nhận',
            render: (item) => (
                <div className="text-xs text-gray-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{item.receivedAt}</span>
                </div>
            ),
        },
        {
            key: 'quantities',
            header: 'Số lượng thực nhận',
            render: (item) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-900">{item.totalQuantityReceived} sản phẩm</span>
                        <span className="text-gray-400">({item.totalItems} mặt hàng)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ {item.totalQuantityAccepted} tốt
                        </span>
                        {item.totalQuantityDefective > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                ⚠ {item.totalQuantityDefective} lỗi
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'totalAmount',
            header: 'Tổng giá trị',
            align: 'right',
            render: (item) => (
                <div className="font-bold text-gray-900 text-sm">{formatVND(item.totalAmount)}</div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'center',
            render: (item) => {
                const conf = RECEIPT_STATUS_CONFIG[item.status] || RECEIPT_STATUS_CONFIG.PENDING;
                const IconComponent = conf.icon;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${conf.badgeClass}`}
                    >
                        <IconComponent className="w-3.5 h-3.5" />
                        {conf.label}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* View Detail */}
                    <button
                        type="button"
                        onClick={() => handleViewDetail(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết phiếu nhập & Serial"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    {/* Scan & Input Serials (DRAFT or PENDING) */}
                    {(item.status === 'DRAFT' || item.status === 'PENDING') && (
                        <button
                            type="button"
                            onClick={() => handleOpenScanModal(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Quét & Nhập Serial cho phiếu này"
                        >
                            <Barcode className="w-4 h-4" />
                        </button>
                    )}

                    {/* Edit info (DRAFT only) */}
                    {item.status === 'DRAFT' && (
                        <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin phiếu nhập"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                    )}

                    {/* Send / Transition from DRAFT to PENDING */}
                    {item.status === 'DRAFT' && (
                        <button
                            type="button"
                            onClick={() => handleRequestStatusAction(item, 'PENDING')}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Gửi chuyển sang trạng thái Đang kiểm hàng (PENDING)"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    )}

                    {/* Confirm Inbound (PENDING only) - Giai đoạn 4: Hoàn tất quy trình */}
                    {item.status === 'PENDING' && (
                        <button
                            type="button"
                            onClick={() => handleRequestStatusAction(item, 'CONFIRMED')}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Xác nhận hoàn tất nhập kho (CONFIRMED)"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    )}

                    {/* Reject (PENDING only) */}
                    {item.status === 'PENDING' && (
                        <button
                            type="button"
                            onClick={() => handleRequestStatusAction(item, 'REJECTED')}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Từ chối nhận hàng (REJECTED)"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}

                    {/* Delete (DRAFT only) */}
                    {item.status === 'DRAFT' && (
                        <button
                            type="button"
                            onClick={() => setDeleteTargetReceipt(item)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa phiếu nhập nháp"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
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
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                            <Ticket className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý phiếu nhập hàng (Goods Receipt)
                            </h1>
                            <p className="text-sm text-gray-500">
                                Tiếp nhận hàng hóa thực tế từ NCC, quét kiểm đếm phân loại Serial (Đạt chuẩn / Lỗi hỏng) và xác nhận nhập kho
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => loadReceipts(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-sm shadow-blue-600/30"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo phiếu nhập mới</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div
                    onClick={() => {
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex items-center gap-3.5 ${statusFilter === 'ALL'
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                        : 'border-gray-100 shadow-xs'
                        }`}
                    title="Hiển thị tất cả phiếu"
                >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tổng số phiếu</div>
                        <div className="text-xl font-bold text-gray-900">{kpiStats.total}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('PENDING');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex items-center gap-3.5 ${statusFilter === 'PENDING'
                        ? 'border-amber-500 ring-2 ring-amber-100 shadow-xs'
                        : 'border-gray-100 shadow-xs'
                        }`}
                    title="Lọc phiếu chờ kiểm đếm"
                >
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Chờ kiểm đếm</div>
                        <div className="text-xl font-bold text-amber-700">{kpiStats.pending}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('CONFIRMED');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex items-center gap-3.5 ${statusFilter === 'CONFIRMED'
                        ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-xs'
                        : 'border-gray-100 shadow-xs'
                        }`}
                    title="Lọc phiếu đã nhập kho"
                >
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Đã nhập kho</div>
                        <div className="text-xl font-bold text-emerald-700">{kpiStats.confirmed}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('DRAFT');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex items-center gap-3.5 ${statusFilter === 'DRAFT'
                        ? 'border-slate-500 ring-2 ring-slate-100 shadow-xs'
                        : 'border-gray-100 shadow-xs'
                        }`}
                    title="Lọc phiếu lưu nháp"
                >
                    <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
                        <Edit className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Lưu nháp (DRAFT)</div>
                        <div className="text-xl font-bold text-slate-700">{kpiStats.draft}</div>
                    </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">SP tốt / SP lỗi</div>
                        <div className="text-sm font-bold text-gray-900">
                            <span className="text-emerald-600">{kpiStats.totalAcceptedQty} đạt</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-rose-600">{kpiStats.totalDefectiveQty} lỗi</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Status Tabs & Filter Section */}
            <div className="space-y-3">
                {/* Horizontal Quick Status Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {statusTabs.map((tab) => {
                        const isActive = statusFilter === tab.key;
                        const IconComponent = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    setCurrentPage(1);
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${isActive
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
                                    }`}
                            >
                                <IconComponent className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Filter Toolbar */}
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => {
                        setSearchQuery(q);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Tìm kiếm theo mã phiếu nhập (GR-...), tên phiếu..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-sm">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadReceipts(true)}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Main Data Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
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
            </div>

            {/* ======================================================== */}
            {/* 1. TẠO PHIẾU NHẬP MỚI (TÁCH BIỆT - CHỈ TẠO ĐƠN)          */}
            {/* ======================================================== */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Tạo mới phiếu nhập hàng (Goods Receipt)"
                subtitle="Bước 1: Chọn Đơn đặt hàng (PO) cần nhập kho và thiết lập thông tin ban đầu"
                icon={Ticket}
                size="lg"
                onSubmit={handleCreateReceipt}
                isSubmitting={isSubmitting}
                submitText="Tạo phiếu nhập"
            >
                <div className="space-y-5 p-2">
                    {/* Select PO */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800">
                            Đơn đặt hàng liên kết <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={formPoId}
                            onChange={(e) => handleSelectPO(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors bg-white font-medium"
                            required
                        >
                            <option value={0}>-- Vui lòng chọn Đơn đặt hàng (PO) cần nhập kho --</option>
                            {purchaseOrders
                                .filter((po) => po.status === 'APPROVED')
                                .map((po) => (
                                    <option key={po.id} value={po.id}>
                                        {po.code} - {po.name || 'Đơn nhập'} ({po.status})
                                    </option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-500">
                            Hệ thống sẽ lấy danh sách các mặt hàng, số lượng và đơn giá từ đơn PO đã duyệt này.
                        </p>
                    </div>

                    {/* PO Summary Card if selected */}
                    {formPoId > 0 && poMap.get(formPoId) && (
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between gap-4 text-xs">
                            <div>
                                <span className="font-semibold text-blue-900">Chi tiết Đơn PO:</span>{' '}
                                <span className="font-mono font-bold text-blue-900">{poMap.get(formPoId)?.code}</span>
                                <div className="text-gray-600 mt-1">
                                    Tên đơn / Nhà cung cấp:{' '}
                                    <span className="font-semibold text-gray-900">{poMap.get(formPoId)?.name || '---'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold text-blue-900">Tổng giá trị đơn:</span>{' '}
                                <span className="font-bold text-gray-900">{formatVND(poMap.get(formPoId)?.totalAmount)}</span>
                                <div className="text-gray-600 mt-1">
                                    Trạng thái PO:{' '}
                                    <span className="font-semibold text-blue-700">{poMap.get(formPoId)?.status}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview of PO Items */}
                    {formPoId > 0 && (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Danh sách mặt hàng trong PO ({formItems.length})
                            </label>
                            {isLoadingPoItems ? (
                                <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                    <span>Đang nạp thông tin mặt hàng trong đơn PO...</span>
                                </div>
                            ) : formItems.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                                    Đơn PO này không có mặt hàng nào cần nhập.
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Mặt hàng</th>
                                                <th className="px-3 py-2 text-center">Đặt mua</th>
                                                <th className="px-3 py-2 text-center">Đã nhận trước</th>
                                                <th className="px-3 py-2 text-center">Còn lại cần nhận</th>
                                                <th className="px-3 py-2 text-right">Đơn giá</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {formItems.map((item) => (
                                                <tr key={item.purchaseOrderItemId} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2">
                                                        <div className="font-semibold text-gray-900 line-clamp-1">{item.productName}</div>
                                                        <div className="text-[11px] font-mono text-gray-500">{item.productCode}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-center font-medium text-gray-800">{item.quantityOrder}</td>
                                                    <td className="px-3 py-2 text-center text-gray-600">{item.quantityReceivedBefore}</td>
                                                    <td className="px-3 py-2 text-center font-bold text-blue-700">{item.remainingQuantity}</td>
                                                    <td className="px-3 py-2 text-right text-gray-800">{formatVND(item.actualUnitCost)}</td>
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
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-800">
                                Mã phiếu nhập <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formCode}
                                    onChange={(e) => setFormCode(e.target.value)}
                                    placeholder="Ví dụ: GR-20261028-001"
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormCode(generateReceiptCode())}
                                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-colors"
                                    title="Tự sinh mã ngẫu nhiên"
                                >
                                    Sinh mã
                                </button>
                            </div>
                        </div>

                        {/* Receipt Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-800">Tên phiếu nhập</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Ví dụ: Phiếu nhận đợt 1..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* Received At */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800">Thời gian nhận hàng</label>
                            <input
                                type="datetime-local"
                                value={formReceivedAt}
                                onChange={(e) => setFormReceivedAt(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                        <Barcode className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-bold">Quy trình nhập hàng:</span> Tạo đơn xong, bấm vào đơn tồn tại trong danh sách để nhập Serial. Khi hoàn thành phiếu nhập, hệ thống sẽ tự động cập nhật đơn nhập hàng (PO) tương ứng sang trạng thái <b>ĐÃ NHẬN</b>.
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
                <div className="space-y-4 p-2">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-800">
                            Mã phiếu nhập <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-800">Tên phiếu nhập</label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-800">Thời gian nhận hàng</label>
                        <input
                            type="datetime-local"
                            value={formReceivedAt}
                            onChange={(e) => setFormReceivedAt(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                        <div className="flex items-center gap-2">
                            <Barcode className="w-5 h-5 text-blue-600" />
                            <span>Quét & Nhập Serial: {scanningReceipt.code}</span>
                        </div>
                    }
                    subtitle={`${scanningReceipt.name} • Đơn PO: ${scanningReceipt.poCode} • NCC: ${scanningReceipt.supplierName}`}
                    icon={Barcode}
                    size="2xl"
                    showFooter={true}
                    footer={
                        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 pt-1">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-gray-700">Tổng Serial:</span>
                                <span className="px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {totalScannedSerials} sản phẩm
                                </span>
                                <span className="px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ {goodConditionCount} đạt chuẩn
                                </span>
                                {defectiveCount > 0 && (
                                    <span className="px-2.5 py-1 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                        ⚠ {defectiveCount} lỗi hỏng
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsScanModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAllSerials}
                                    disabled={isSavingSerials || isCompletingReceipt}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                    title="Lưu lại toàn bộ Serial đã quét và trạng thái"
                                >
                                    {isSavingSerials ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5" />
                                    )}
                                    <span>Lưu tất cả Serial & Trạng thái</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCompleteReceipt}
                                    disabled={isSavingSerials || isCompletingReceipt || totalScannedSerials === 0}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                                    title="Xác nhận hoàn tất phiếu nhập và chuyển trạng thái đơn PO sang ĐÃ NHẬN"
                                >
                                    {isCompletingReceipt ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Hoàn thành phiếu nhập (Nhập kho)</span>
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4 p-2">
                        {isLoadingPoItems ? (
                            <div className="p-12 text-center text-gray-500">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                                Đang tải danh sách mặt hàng và serial...
                            </div>
                        ) : formItems.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
                                Đơn PO này chưa có mặt hàng nào cần nhập.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left column: List of items in PO */}
                                <div className="lg:col-span-5 space-y-3">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <span>Danh sách mặt hàng ({formItems.length})</span>
                                        <span>Click chọn để quét</span>
                                    </div>
                                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                                        {formItems.map((item, idx) => {
                                            const totalScanned = item.serials.length;
                                            const goodCount = item.serials.filter((s) => s.status === 'GOOD_CONDITION').length;
                                            const defCount = item.serials.filter((s) => s.status === 'DEFECTIVE').length;
                                            const isSelected = activeItemIndex === idx;

                                            return (
                                                <div
                                                    key={item.purchaseOrderItemId}
                                                    onClick={() => setActiveItemIndex(idx)}
                                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${isSelected
                                                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10 shadow-xs'
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="font-semibold text-sm text-gray-900 line-clamp-1">
                                                            {item.productName}
                                                        </div>
                                                        <span className="text-xs font-mono text-gray-500 shrink-0">
                                                            {item.productCode}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 text-xs text-gray-600 flex justify-between">
                                                        <span>
                                                            Đặt: <b>{item.quantityOrder}</b> | Còn lại: <b>{item.remainingQuantity}</b>
                                                        </span>
                                                        <span className="font-medium text-blue-600">
                                                            Đã quét: <b>{totalScanned}</b>
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                                                            {goodCount} chuẩn
                                                        </span>
                                                        {defCount > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
                                                                {defCount} lỗi
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right column: Serial Scanning Workspace for the selected item */}
                                <div className="lg:col-span-7 bg-gray-50/60 p-4 rounded-2xl border border-gray-200 space-y-4">
                                    {formItems[activeItemIndex] && (
                                        <>
                                            <div className="flex justify-between items-start gap-2 border-b border-gray-200 pb-3">
                                                <div>
                                                    <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                                                        Đang quét Serial cho mặt hàng:
                                                    </div>
                                                    <div className="font-bold text-gray-900 text-base">
                                                        {formItems[activeItemIndex].productName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Mã SP: {formItems[activeItemIndex].productCode} | Đơn giá: {formatVND(formItems[activeItemIndex].actualUnitCost)}
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-blue-700">
                                                        {formItems[activeItemIndex].serials.length}
                                                        <span className="text-xs font-normal text-gray-500">
                                                            {' '}/ cần {formItems[activeItemIndex].remainingQuantity}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">Số serial đã nhập</div>
                                                </div>
                                            </div>

                                            {/* Barcode input row */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <Barcode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={barcodeInput}
                                                            onChange={(e) => setBarcodeInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddSerial();
                                                                }
                                                            }}
                                                            placeholder="Quét Barcode hoặc nhập Serial rồi nhấn Enter..."
                                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <select
                                                        value={barcodeStatus}
                                                        onChange={(e) => setBarcodeStatus(e.target.value as any)}
                                                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold bg-white cursor-pointer ${barcodeStatus === 'GOOD_CONDITION'
                                                            ? 'text-emerald-700 border-emerald-300'
                                                            : 'text-rose-700 border-rose-300'
                                                            }`}
                                                    >
                                                        <option value="GOOD_CONDITION">Đạt chuẩn (Tốt)</option>
                                                        <option value="DEFECTIVE">Hàng lỗi / Hư hỏng</option>
                                                    </select>

                                                    <button
                                                        type="button"
                                                        onClick={handleAddSerial}
                                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                                    >
                                                        Thêm
                                                    </button>
                                                </div>

                                                {/* Tool buttons: Bulk paste, Clear */}
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsBulkModalOpen(true)}
                                                            className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                            <span>Dán nhiều serial (Paste)</span>
                                                        </button>
                                                    </div>

                                                    {formItems[activeItemIndex].serials.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleClearAllSerials(activeItemIndex)}
                                                            className="text-xs text-rose-600 hover:underline cursor-pointer"
                                                        >
                                                            Xóa hết serial
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Serials table in form */}
                                            <div className="space-y-1.5">
                                                <div className="text-xs font-semibold text-gray-700 flex justify-between">
                                                    <span>Danh sách Serial đã nhập ({formItems[activeItemIndex].serials.length}):</span>
                                                    <span className="text-gray-500 font-normal">Click vào nhãn để đổi trạng thái Tốt ⮂ Lỗi</span>
                                                </div>

                                                <div className="max-h-[260px] overflow-y-auto border border-gray-200 rounded-xl bg-white divide-y divide-gray-100">
                                                    {formItems[activeItemIndex].serials.length === 0 ? (
                                                        <div className="p-6 text-center text-xs text-gray-400">
                                                            Chưa có serial nào được quét. Sử dụng máy quét hoặc ô nhập phía trên.
                                                        </div>
                                                    ) : (
                                                        formItems[activeItemIndex].serials.map((ser, sIdx) => (
                                                            <div
                                                                key={`${ser.serialNumber}-${sIdx}`}
                                                                className="px-3 py-2 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-400 w-5 font-mono">{sIdx + 1}.</span>
                                                                    <span className="font-mono font-medium text-gray-900">{ser.serialNumber}</span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleSerialStatus(activeItemIndex, sIdx)}
                                                                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${ser.status === 'GOOD_CONDITION'
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                            }`}
                                                                        title="Bấm để đổi trạng thái giữa Đạt chuẩn và Lỗi hỏng"
                                                                    >
                                                                        {ser.status === 'GOOD_CONDITION' ? '✓ Đạt chuẩn' : '⚠ Hàng lỗi'}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveSerial(activeItemIndex, sIdx)}
                                                                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                                        title="Xóa serial"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
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
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-base">Nhập nhiều Serial cùng lúc</h3>
                            <button
                                type="button"
                                onClick={() => setIsBulkModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Dán danh sách các mã serial vào ô bên dưới, mỗi mã trên một dòng hoặc phân tách bởi dấu phẩy.
                        </p>
                        <textarea
                            rows={6}
                            value={bulkSerialsInput}
                            onChange={(e) => setBulkSerialsInput(e.target.value)}
                            placeholder="SN-20261028-0001&#10;SN-20261028-0002&#10;SN-20261028-0003..."
                            className="w-full p-3 border border-gray-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsBulkModalOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleAddBulkSerials}
                                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                            >
                                Nạp vào danh sách
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* DETAIL MODAL                                             */}
            {/* ======================================================== */}
            {selectedReceipt && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Chi tiết phiếu nhập: ${selectedReceipt.code}`}
                    subtitle={`${selectedReceipt.name} • ${selectedReceipt.receivedAt}`}
                    icon={Ticket}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={false}
                >
                    {/* Tab 1: Overview */}
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-6 p-2">
                            {/* Status Banner */}
                            <div
                                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${RECEIPT_STATUS_CONFIG[selectedReceipt.status].bgColor
                                    } ${RECEIPT_STATUS_CONFIG[selectedReceipt.status].borderColor}`}
                            >
                                <div className="flex items-center gap-3">
                                    {React.createElement(RECEIPT_STATUS_CONFIG[selectedReceipt.status].icon, {
                                        className: `w-6 h-6 ${RECEIPT_STATUS_CONFIG[selectedReceipt.status].color}`,
                                    })}
                                    <div>
                                        <div className={`font-bold text-sm ${RECEIPT_STATUS_CONFIG[selectedReceipt.status].color}`}>
                                            Trạng thái hiện tại: {RECEIPT_STATUS_CONFIG[selectedReceipt.status].label}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {RECEIPT_STATUS_CONFIG[selectedReceipt.status].description}
                                        </div>
                                    </div>
                                </div>

                                {/* Status actions right on banner */}
                                <div className="flex items-center gap-2">
                                    {(selectedReceipt.status === 'DRAFT' || selectedReceipt.status === 'PENDING') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenScanModal(selectedReceipt);
                                            }}
                                            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Barcode className="w-4 h-4" />
                                            <span>Quét & Nhập Serial</span>
                                        </button>
                                    )}
                                    {selectedReceipt.status === 'PENDING' && (
                                        <button
                                            type="button"
                                            onClick={() => handleRequestStatusAction(selectedReceipt, 'CONFIRMED')}
                                            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Xác nhận nhập kho</span>
                                        </button>
                                    )}
                                    {selectedReceipt.status === 'PENDING' && (
                                        <button
                                            type="button"
                                            onClick={() => handleRequestStatusAction(selectedReceipt, 'REJECTED')}
                                            className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            <span>Từ chối nhận</span>
                                        </button>
                                    )}
                                    {selectedReceipt.status === 'DRAFT' && (
                                        <button
                                            type="button"
                                            onClick={() => handleRequestStatusAction(selectedReceipt, 'PENDING')}
                                            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>Gửi kiểm đếm</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 font-medium">Tổng số lượng nhận</div>
                                    <div className="text-2xl font-bold text-gray-900 mt-1">
                                        {selectedReceipt.totalQuantityReceived}{' '}
                                        <span className="text-xs font-normal text-gray-500">sản phẩm</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100">
                                    <div className="text-xs text-emerald-700 font-medium">Hàng đạt chuẩn (Tốt)</div>
                                    <div className="text-2xl font-bold text-emerald-800 mt-1">
                                        {selectedReceipt.totalQuantityAccepted}{' '}
                                        <span className="text-xs font-normal text-emerald-600">vào kho</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-100">
                                    <div className="text-xs text-rose-700 font-medium">Hàng lỗi / Hư hỏng</div>
                                    <div className="text-2xl font-bold text-rose-800 mt-1">
                                        {selectedReceipt.totalQuantityDefective}{' '}
                                        <span className="text-xs font-normal text-rose-600">chờ trả NCC</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100">
                                    <div className="text-xs text-blue-700 font-medium">Tổng giá trị phiếu</div>
                                    <div className="text-xl font-bold text-blue-900 mt-1">
                                        {formatVND(selectedReceipt.totalAmount)}
                                    </div>
                                </div>
                            </div>

                            {/* Info Fields Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                        <Ticket className="w-4 h-4 text-blue-600" />
                                        <span>Thông tin phiếu nhập</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã phiếu:</span>
                                        <span className="font-mono font-bold text-gray-900">{selectedReceipt.code}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Tên phiếu:</span>
                                        <span className="font-medium text-gray-900">{selectedReceipt.name}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Thời gian nhận hàng:</span>
                                        <span className="font-medium text-gray-900">{selectedReceipt.receivedAt}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Ngày tạo phiếu:</span>
                                        <span className="text-gray-700">{selectedReceipt.createdDate}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-blue-600" />
                                        <span>Đơn đặt hàng (PO) liên kết</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã Đơn PO:</span>
                                        <span className="font-mono font-bold text-blue-600">{selectedReceipt.poCode}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Tên Đơn / NCC:</span>
                                        <span className="font-medium text-gray-900">{selectedReceipt.supplierName}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Cập nhật lần cuối:</span>
                                        <span className="text-gray-700">{selectedReceipt.lastModifiedDate}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Items list */}
                    {activeDetailTab === 'items' && (
                        <div className="space-y-4 p-2">
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Mặt hàng</th>
                                            <th className="px-4 py-3 text-right">Đơn giá thực nhận</th>
                                            <th className="px-4 py-3 text-center">Tổng nhận</th>
                                            <th className="px-4 py-3 text-center">Đạt chuẩn</th>
                                            <th className="px-4 py-3 text-center">Lỗi hỏng</th>
                                            <th className="px-4 py-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(selectedReceipt.items || []).map((it, idx) => (
                                            <tr key={it.id || idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900">
                                                        Mặt hàng PO #{it.purchaseOrderItemId}
                                                    </div>
                                                    <div className="text-gray-400 text-[11px]">
                                                        {it.productSerials?.length || 0} serial được định danh
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                                    {formatVND(it.actualUnitCost)}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-gray-900">
                                                    {it.quantityReceived}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-emerald-700">
                                                    {it.quantityAccepted}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-rose-700">
                                                    {it.quantityDefective}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                    {formatVND((it.actualUnitCost || 0) * (it.quantityReceived || 0))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider">
                                                Tổng cộng:
                                            </td>
                                            <td className="px-4 py-3 text-center">{selectedReceipt.totalQuantityReceived}</td>
                                            <td className="px-4 py-3 text-center text-emerald-700">{selectedReceipt.totalQuantityAccepted}</td>
                                            <td className="px-4 py-3 text-center text-rose-700">{selectedReceipt.totalQuantityDefective}</td>
                                            <td className="px-4 py-3 text-right text-blue-700">{formatVND(selectedReceipt.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Serials List */}
                    {activeDetailTab === 'serials' && (
                        <div className="space-y-4 p-2">
                            {/* Filter Serials */}
                            <div className="flex flex-col sm:flex-row justify-between gap-3">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={serialSearchFilter}
                                        onChange={(e) => setSerialSearchFilter(e.target.value)}
                                        placeholder="Tra cứu số Serial..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={serialStatusFilter}
                                        onChange={(e) => setSerialStatusFilter(e.target.value)}
                                        className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white"
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
                                            className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                                        >
                                            <Barcode className="w-3.5 h-3.5" />
                                            <span>Quét & Nhập Serial</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Serials Table */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[420px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-2.5">#</th>
                                            <th className="px-4 py-2.5">Số Serial (Mã duy nhất)</th>
                                            <th className="px-4 py-2.5">Trạng thái vòng đời</th>
                                            <th className="px-4 py-2.5">Mặt hàng PO</th>
                                            <th className="px-4 py-2.5 text-right">Hiệu lực</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredDetailSerials.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                    Không tìm thấy Serial nào phù hợp.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDetailSerials.map(({ serial, purchaseOrderItemId }, sIdx) => {
                                                const conf = SERIAL_STATUS_CONFIG[serial.status] || {
                                                    label: serial.status,
                                                    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
                                                    icon: CheckCircle2,
                                                };
                                                const IconComp = conf.icon;

                                                return (
                                                    <tr key={serial.id || sIdx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2.5 text-gray-400 font-mono">{sIdx + 1}</td>
                                                        <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                                                            {serial.serialNumber}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${conf.badgeClass}`}
                                                            >
                                                                <IconComp className="w-3 h-3" />
                                                                {conf.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600">
                                                            PO Item #{purchaseOrderItemId}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            {serial.isTerminated || serial.terminated ? (
                                                                <span className="text-rose-600 text-[11px] font-medium">Đã hủy</span>
                                                            ) : (
                                                                <span className="text-emerald-600 text-[11px] font-medium">Hoạt động</span>
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
                        <div className="space-y-4 p-2">
                            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                                    <span>Biên bản ghi nhận sản phẩm lỗi / không đạt chuẩn kỹ thuật</span>
                                </div>
                                <p className="text-xs text-rose-700">
                                    Theo quy trình nhập hàng, các sản phẩm sau đây không đạt tiêu chuẩn kỹ thuật hoặc bị hư hại trong quá trình vận chuyển. Danh sách này được gán trạng thái <b>Hàng lỗi (DEFECTIVE / PENDING_RETURN)</b> để lập hồ sơ đổi trả hoặc yêu cầu nhà cung cấp bồi hoàn.
                                </p>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Số Serial bị lỗi</th>
                                            <th className="px-4 py-3">Mặt hàng</th>
                                            <th className="px-4 py-3">Tình trạng ghi nhận</th>
                                            <th className="px-4 py-3 text-right">Hướng xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allDetailSerials
                                            .filter(({ serial }) => serial.status === 'DEFECTIVE' || serial.status === 'PENDING_RETURN')
                                            .map(({ serial, purchaseOrderItemId }, dIdx) => (
                                                <tr key={serial.id || dIdx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-gray-400">{dIdx + 1}</td>
                                                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                                                        {serial.serialNumber}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        Mặt hàng PO #{purchaseOrderItemId}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        Ngoại quan lỗi / Không lên nguồn / Sai tem kiểm định
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-amber-700">
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
                        <div className="space-y-4 p-2">
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>In phiếu này (Print)</span>
                                </button>
                            </div>

                            {/* Printable Paper Canvas */}
                            <div className="p-8 bg-white border border-gray-300 rounded-xl shadow-xs text-black font-serif space-y-6">
                                <div className="text-center space-y-1">
                                    <div className="font-bold text-sm uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div className="text-xs italic underline">Độc lập - Tự do - Hạnh phúc</div>
                                </div>

                                <div className="text-center pt-2">
                                    <h2 className="text-xl font-bold uppercase tracking-wider">PHIẾU NHẬP KHO THỰC TẾ</h2>
                                    <div className="text-xs text-gray-600 font-sans mt-0.5">Số: {selectedReceipt.code}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                                    <div>
                                        <div><b>Đơn đặt hàng (PO):</b> {selectedReceipt.poCode}</div>
                                        <div><b>Nhà cung cấp:</b> {selectedReceipt.supplierName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div><b>Thời gian nhận hàng:</b> {selectedReceipt.receivedAt}</div>
                                        <div><b>Trạng thái phiếu:</b> {selectedReceipt.status}</div>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse border border-gray-400 font-sans">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-400 p-2 text-center">STT</th>
                                            <th className="border border-gray-400 p-2 text-left">Tên hàng hóa</th>
                                            <th className="border border-gray-400 p-2 text-center">Tổng nhận</th>
                                            <th className="border border-gray-400 p-2 text-center">Đạt chuẩn</th>
                                            <th className="border border-gray-400 p-2 text-center">Lỗi hỏng</th>
                                            <th className="border border-gray-400 p-2 text-right">Đơn giá (VND)</th>
                                            <th className="border border-gray-400 p-2 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedReceipt.items || []).map((it, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-gray-400 p-2 text-center">{idx + 1}</td>
                                                <td className="border border-gray-400 p-2">Mặt hàng PO #{it.purchaseOrderItemId}</td>
                                                <td className="border border-gray-400 p-2 text-center font-bold">{it.quantityReceived}</td>
                                                <td className="border border-gray-400 p-2 text-center text-emerald-700 font-bold">{it.quantityAccepted}</td>
                                                <td className="border border-gray-400 p-2 text-center text-rose-700 font-bold">{it.quantityDefective}</td>
                                                <td className="border border-gray-400 p-2 text-right">{formatVND(it.actualUnitCost)}</td>
                                                <td className="border border-gray-400 p-2 text-right font-bold">
                                                    {formatVND((it.actualUnitCost || 0) * (it.quantityReceived || 0))}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold bg-gray-50">
                                            <td colSpan={2} className="border border-gray-400 p-2 text-center uppercase">Tổng cộng</td>
                                            <td className="border border-gray-400 p-2 text-center">{selectedReceipt.totalQuantityReceived}</td>
                                            <td className="border border-gray-400 p-2 text-center text-emerald-700">{selectedReceipt.totalQuantityAccepted}</td>
                                            <td className="border border-gray-400 p-2 text-center text-rose-700">{selectedReceipt.totalQuantityDefective}</td>
                                            <td className="border border-gray-400 p-2"></td>
                                            <td className="border border-gray-400 p-2 text-right text-blue-900">{formatVND(selectedReceipt.totalAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs font-sans">
                                    <div className="space-y-16">
                                        <div className="font-bold">Người giao hàng (NCC)</div>
                                        <div className="italic text-gray-500">(Ký và ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">Nhân viên kiểm kho</div>
                                        <div className="italic text-gray-500">(Ký và ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">Quản lý duyệt nhập</div>
                                        <div className="italic text-gray-500">(Ký và ghi rõ họ tên)</div>
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
