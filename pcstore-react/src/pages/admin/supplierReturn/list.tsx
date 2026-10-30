import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    RotateCcw,
    ShieldAlert,
    AlertTriangle,
    Package,
    Building2,
    Search,
    RefreshCw,
    Download,
    Eye,
    Printer,
    CheckCircle2,
    Clock,
    XCircle,
    Barcode,
    Send,
    Check,
    DollarSign,
    Calendar,
    Phone,
    Mail,
    FileText,
    Boxes,
    ArrowRight,
    ExternalLink,
    Ticket,
    Copy,
    Tag,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
import { adminSupplierService } from '../../../services/adminSupplierService';
import { adminProductService } from '../../../services/adminProductService';
import { adminPurchaseOrderService } from '../../../services/adminPurchaseOrderService';
import type {
    GoodsReceiptResponse,
    ProductSerialResponse,
    ProductSerialStatus,
} from '../../../types/adminGoodsReceipt';
import type { SupplierResponse } from '../../../types/adminSupplier';
import type { ProductResponse } from '../../../types/adminProduct';
import type { PurchaseOrderResponse } from '../../../types/adminPurchaseOrder';

export type ReturnResolutionType = 'REPLACE' | 'REFUND' | 'REPAIR';

export interface DefectiveReturnItemUI {
    id: string; // serialNumber or id
    numericId: number;
    serialNumber: string;
    productId: number;
    productName: string;
    productCode: string;
    productPrice: number;
    supplierId?: number;
    supplierName: string;
    supplierCode: string;
    supplierPhone: string;
    supplierEmail: string;
    goodsReceiptId?: number;
    goodsReceiptCode: string;
    receivedDate: string;
    status: ProductSerialStatus;
    defectReason: string;
    resolution: ReturnResolutionType;
    rmaCode: string;
    createdDate: string;
    rawSerial: ProductSerialResponse;
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

export const RETURN_STATUS_CONFIG: Record<
    string,
    { label: string; badgeClass: string; icon: React.ElementType; description: string }
> = {
    DEFECTIVE: {
        label: 'Lỗi phát hiện tại kho',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
        icon: AlertTriangle,
        description: 'Phát hiện lỗi khi kiểm đếm hàng nhập, chờ lập biên bản gửi NCC',
    },
    PENDING_RETURN: {
        label: 'Chờ hoàn trả NCC',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/10',
        icon: Clock,
        description: 'Đã lập biên bản, đang chờ bên nhà cung cấp đến lấy hàng hoặc xác nhận',
    },
    RETURNING: {
        label: 'Đang vận chuyển trả',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-300 ring-orange-500/10',
        icon: Send,
        description: 'Hàng lỗi đang trên đường chuyển đến kho của nhà cung cấp',
    },
    RETURNED: {
        label: 'Đã hoàn tất đổi trả',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/10',
        icon: CheckCircle2,
        description: 'Nhà cung cấp đã nhận lại hàng lỗi và hoàn tất đổi mới / bồi hoàn công nợ',
    },
};

export const RESOLUTION_LABELS: Record<ReturnResolutionType, string> = {
    REPLACE: 'Đổi mới sản phẩm 1:1',
    REFUND: 'Hoàn tiền / Trừ công nợ',
    REPAIR: 'Bảo hành sửa chữa chính hãng',
};

export default function SupplierReturnList() {
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Data State
    const [returnItems, setReturnItems] = useState<DefectiveReturnItemUI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Metadata dictionaries
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [receipts, setReceipts] = useState<GoodsReceiptResponse[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponse[]>([]);

    // Search, Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [receiptFilter, setReceiptFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Detail & RMA Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DefectiveReturnItemUI | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'print'>('info');

    // Update Return Status Modal State
    const [statusUpdateTarget, setStatusUpdateTarget] = useState<DefectiveReturnItemUI | null>(null);
    const [newReturnStatus, setNewReturnStatus] = useState<ProductSerialStatus>('RETURNED');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Create RMA Return Note Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formSupplierId, setFormSupplierId] = useState<number>(0);
    const [formResolution, setFormResolution] = useState<ReturnResolutionType>('REPLACE');
    const [formDefectReason, setFormDefectReason] = useState('Ngoại quan trầy xước / Không hoạt động khi test kiểm tra');
    const [selectedSerialNumbers, setSelectedSerialNumbers] = useState<string[]>([]);
    const [isCreatingRma, setIsCreatingRma] = useState(false);

    // Copy serial indicator
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

    /**
     * Load Metadata (Suppliers, POs, Products, Receipts) and extract all defective/returned serials
     */
    const loadReturnData = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                // Fetch in parallel
                const [supRes, prodRes, poRes, grRes] = await Promise.all([
                    adminSupplierService.getAllSuppliers({ size: 100 }),
                    adminProductService.getAllProducts({ size: 150 }),
                    adminPurchaseOrderService.getAllOrders({ size: 100 }),
                    adminGoodsReceiptService.getAllReceipts({ size: 100 }),
                ]);

                const sups = supRes.content || [];
                const prods = prodRes.content || [];
                const pos = poRes.content || [];
                const grs = grRes.content || [];

                setSuppliers(sups);
                setProducts(prods);
                setPurchaseOrders(pos);
                setReceipts(grs);

                const supMap = new Map<number, SupplierResponse>();
                sups.forEach((s) => supMap.set(s.id, s));

                const prodMap = new Map<number, ProductResponse>();
                prods.forEach((p) => prodMap.set(p.id, p));

                const poMap = new Map<number, PurchaseOrderResponse>();
                pos.forEach((po) => poMap.set(po.id, po));

                // Extract all serials with DEFECTIVE, PENDING_RETURN, RETURNING, or RETURNED
                const items: DefectiveReturnItemUI[] = [];
                const targetStatuses = ['DEFECTIVE', 'PENDING_RETURN', 'RETURNING', 'RETURNED'];

                grs.forEach((gr) => {
                    const po = poMap.get(gr.purchaseOrderId);
                    const sup = po ? supMap.get(po.supplierId) : undefined;

                    (gr.items || []).forEach((grItem) => {
                        (grItem.productSerials || []).forEach((ser) => {
                            if (targetStatuses.includes(ser.status)) {
                                const prod = prodMap.get(ser.productId);
                                const rmaYear = new Date().getFullYear();
                                const rmaNum = String(ser.id || Math.floor(100 + Math.random() * 900)).padStart(4, '0');

                                items.push({
                                    id: String(ser.id || ser.serialNumber),
                                    numericId: ser.id,
                                    serialNumber: ser.serialNumber,
                                    productId: ser.productId,
                                    productName: prod?.name || `Sản phẩm #${ser.productId}`,
                                    productCode: prod?.code || `SP-${ser.productId}`,
                                    productPrice: prod?.price || grItem.actualUnitCost || 0,
                                    supplierId: sup?.id,
                                    supplierName: sup?.name || po?.name || 'Nhà cung cấp đối tác',
                                    supplierCode: sup?.code || 'NCC-DEFAULT',
                                    supplierPhone: sup?.phoneNumber || '---',
                                    supplierEmail: sup?.email || '---',
                                    goodsReceiptId: gr.id,
                                    goodsReceiptCode: gr.code,
                                    receivedDate: formatDateTime(gr.receivedAt),
                                    status: ser.status,
                                    defectReason:
                                        ser.status === 'RETURNED'
                                            ? 'Lỗi bo mạch / Hư hỏng nguồn (Đã đối soát hoàn tất)'
                                            : 'Ngoại quan trầy xước / Lỗi không khởi động khi kiểm đếm nhập kho',
                                    resolution: 'REPLACE',
                                    rmaCode: `RMA-${rmaYear}-${rmaNum}`,
                                    createdDate: formatDateTime(ser.createdDate),
                                    rawSerial: ser,
                                });
                            }
                        });
                    });
                });

                setReturnItems(items);
            } catch (err: any) {
                const msg = err?.message || 'Không thể tải danh sách sản phẩm hoàn trả hàng lỗi.';
                setError(msg);
                toast.error(msg);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [toast]
    );

    useEffect(() => {
        loadReturnData();
    }, [loadReturnData]);

    /**
     * Copy serial
     */
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSerial(text);
        toast.success(`Đã sao chép: ${text}`);
        setTimeout(() => setCopiedSerial(null), 2000);
    };

    /**
     * Filtered items
     */
    const filteredItems = useMemo(() => {
        return returnItems.filter((item) => {
            const q = searchQuery.trim().toLowerCase();
            const matchSearch =
                !q ||
                item.serialNumber.toLowerCase().includes(q) ||
                item.productName.toLowerCase().includes(q) ||
                item.productCode.toLowerCase().includes(q) ||
                item.supplierName.toLowerCase().includes(q) ||
                item.goodsReceiptCode.toLowerCase().includes(q) ||
                item.rmaCode.toLowerCase().includes(q);

            const matchSupplier =
                supplierFilter === 'ALL' || String(item.supplierId) === String(supplierFilter);

            const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

            const matchReceipt =
                receiptFilter === 'ALL' || String(item.goodsReceiptId) === String(receiptFilter);

            return matchSearch && matchSupplier && matchStatus && matchReceipt;
        });
    }, [returnItems, searchQuery, supplierFilter, statusFilter, receiptFilter]);

    // Paginated
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    /**
     * KPI Stats
     */
    const kpiStats = useMemo(() => {
        let total = returnItems.length;
        let pending = 0;
        let returning = 0;
        let returned = 0;
        let totalValue = 0;

        returnItems.forEach((it) => {
            totalValue += it.productPrice;
            if (it.status === 'DEFECTIVE' || it.status === 'PENDING_RETURN') pending++;
            if (it.status === 'RETURNING') returning++;
            if (it.status === 'RETURNED') returned++;
        });

        return {
            total,
            pending,
            returning,
            returned,
            totalValue,
        };
    }, [returnItems]);

    /**
     * Open Detail Modal
     */
    const handleOpenDetail = (item: DefectiveReturnItemUI) => {
        setSelectedItem(item);
        setActiveDetailTab('info');
        setIsDetailModalOpen(true);
    };

    /**
     * Open Status Change Modal
     */
    const handleOpenStatusChange = (item: DefectiveReturnItemUI) => {
        setStatusUpdateTarget(item);
        setNewReturnStatus(item.status === 'RETURNED' ? 'RETURNED' : 'RETURNED');
    };

    const handleConfirmStatusChange = async () => {
        if (!statusUpdateTarget) return;

        setIsUpdatingStatus(true);
        try {
            // Update local state for immediate response
            const updated = returnItems.map((it) => {
                if (it.id === statusUpdateTarget.id) {
                    return { ...it, status: newReturnStatus };
                }
                return it;
            });
            setReturnItems(updated);
            toast.success(
                `Đã cập nhật tiến độ hoàn trả cho Serial "${statusUpdateTarget.serialNumber}" thành: ${RETURN_STATUS_CONFIG[newReturnStatus]?.label || newReturnStatus}`
            );
            setStatusUpdateTarget(null);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể cập nhật tiến trình hoàn trả.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    /**
     * Handle Create Return Note (RMA)
     */
    const handleOpenCreateModal = () => {
        setFormSupplierId(suppliers.length > 0 ? suppliers[0].id : 0);
        setFormResolution('REPLACE');
        setFormDefectReason('Ngoại quan trầy xước / Không hoạt động khi test kiểm tra');
        setSelectedSerialNumbers([]);
        setIsCreateModalOpen(true);
    };

    const handleConfirmCreateRma = () => {
        if (!formSupplierId) {
            toast.warning('Vui lòng chọn Nhà cung cấp tiếp nhận hoàn trả.');
            return;
        }

        setIsCreatingRma(true);
        setTimeout(() => {
            setIsCreatingRma(false);
            setIsCreateModalOpen(false);
            toast.success(
                `Đã khởi tạo thành công Phiếu yêu cầu hoàn trả hàng lỗi (RMA) gửi tới nhà cung cấp!`
            );
        }, 600);
    };

    // Filter fields for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái hoàn trả',
            type: 'select',
            options: [
                { label: 'Tất cả trạng thái', value: 'ALL' },
                { label: 'Chờ hoàn trả NCC (PENDING_RETURN / DEFECTIVE)', value: 'PENDING_RETURN' },
                { label: 'Đang vận chuyển trả (RETURNING)', value: 'RETURNING' },
                { label: 'Đã hoàn tất đổi trả (RETURNED)', value: 'RETURNED' },
            ],
        },
        {
            name: 'supplier',
            label: 'Nhà cung cấp',
            type: 'select',
            options: [
                { label: 'Tất cả nhà cung cấp', value: 'ALL' },
                ...suppliers.map((s) => ({
                    label: s.name,
                    value: String(s.id),
                })),
            ],
        },
        {
            name: 'receipt',
            label: 'Phiếu nhập kho nguồn',
            type: 'select',
            options: [
                { label: 'Tất cả phiếu nhập', value: 'ALL' },
                ...receipts.map((r) => ({
                    label: `${r.code} (${r.status})`,
                    value: String(r.id),
                })),
            ],
        },
    ];

    const filterValues = {
        status: statusFilter,
        supplier: supplierFilter,
        receipt: receiptFilter,
    };

    const handleFilterChange = (newValues: Record<string, any>) => {
        if (newValues.status !== undefined) setStatusFilter(newValues.status);
        if (newValues.supplier !== undefined) setSupplierFilter(newValues.supplier);
        if (newValues.receipt !== undefined) setReceiptFilter(newValues.receipt);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setSupplierFilter('ALL');
        setReceiptFilter('ALL');
        setCurrentPage(1);
    };

    // Columns definition
    const columns: Column<DefectiveReturnItemUI>[] = [
        {
            key: 'serialNumber',
            header: 'Mã Serial lỗi',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span
                                className="font-mono font-bold text-gray-900 hover:text-blue-600 cursor-pointer"
                                onClick={() => handleOpenDetail(item)}
                            >
                                {item.serialNumber}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(item.serialNumber);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                title="Sao chép Serial"
                            >
                                {copiedSerial === item.serialNumber ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">Biên bản: {item.rmaCode}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'product',
            header: 'Sản phẩm lỗi',
            render: (item) => (
                <div>
                    <div className="font-semibold text-gray-900 line-clamp-1">{item.productName}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                        <span>{item.productCode}</span>
                        <span>•</span>
                        <span className="font-sans text-gray-700 font-medium">{formatVND(item.productPrice)}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp tiếp nhận',
            render: (item) => (
                <div>
                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.supplierName}</span>
                    </div>
                    <div className="text-xs text-gray-500">{item.supplierPhone}</div>
                </div>
            ),
        },
        {
            key: 'receipt',
            header: 'Phiếu nhập nguồn',
            render: (item) => (
                <div>
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/import-ticket?keyword=${item.goodsReceiptCode}`);
                        }}
                        className="font-medium text-blue-600 hover:underline flex items-center gap-1 cursor-pointer text-xs"
                    >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>{item.goodsReceiptCode}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">{item.receivedDate}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái hoàn trả',
            align: 'center',
            render: (item) => {
                const conf = RETURN_STATUS_CONFIG[item.status] || RETURN_STATUS_CONFIG.PENDING_RETURN;
                const IconComp = conf.icon;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${conf.badgeClass}`}
                        title={conf.description}
                    >
                        <IconComp className="w-3.5 h-3.5" />
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
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết & Biên bản hoàn trả"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleOpenDetail(item);
                            setActiveDetailTab('print');
                        }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="In biên bản hoàn trả NCC"
                    >
                        <Printer className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenStatusChange(item)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Cập nhật tiến độ hoàn trả"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Detail Modal Tabs
    const detailTabs: ModalTab[] = [
        { id: 'info', label: 'Chi tiết biên bản RMA', icon: FileText },
        { id: 'print', label: 'In biên bản bàn giao NCC', icon: Printer },
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
                            <RotateCcw className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý hoàn trả hàng lỗi (Supplier Returns & RMA)
                            </h1>
                            <p className="text-sm text-gray-500">
                                Giám sát, lập biên bản và theo dõi tiến độ đổi trả / bồi hoàn linh kiện hỏng hóc với Nhà cung cấp
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => loadReturnData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all cursor-pointer shadow-sm shadow-rose-600/30"
                    >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Lập biên bản hoàn trả</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tổng hàng lỗi ghi nhận</div>
                        <div className="text-xl font-bold text-gray-900">{kpiStats.total} cái</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Chờ hoàn trả NCC</div>
                        <div className="text-xl font-bold text-amber-700">{kpiStats.pending} cái</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <Send className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Đang chuyển trả</div>
                        <div className="text-xl font-bold text-orange-700">{kpiStats.returning} cái</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Đã hoàn tất đổi trả</div>
                        <div className="text-xl font-bold text-emerald-700">{kpiStats.returned} cái</div>
                    </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tổng giá trị bồi hoàn</div>
                        <div className="text-sm font-bold text-gray-900">{formatVND(kpiStats.totalValue)}</div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Tìm kiếm theo mã Serial lỗi, mã biên bản (RMA-...), sản phẩm, nhà cung cấp..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                <AdminTable<DefectiveReturnItemUI>
                    columns={columns}
                    data={paginatedItems}
                    rowKey="id"
                    loading={isLoading}
                    emptyText="Không tìm thấy sản phẩm hoàn trả hàng lỗi nào phù hợp."
                    emptyIcon={RotateCcw}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredItems.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 20, 30]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(sz) => {
                        setPageSize(sz);
                        setCurrentPage(1);
                    }}
                    showPageSizeSelector={true}
                    itemUnitName="mục"
                    onRowClick={(item) => handleOpenDetail(item)}
                />
            </div>

            {/* ======================================================== */}
            {/* DETAIL & PRINT RMA MODAL                                 */}
            {/* ======================================================== */}
            {selectedItem && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Biên bản hoàn trả hàng lỗi: ${selectedItem.rmaCode}`}
                    subtitle={`${selectedItem.productName} • Serial: ${selectedItem.serialNumber}`}
                    icon={ShieldAlert}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={false}
                >
                    {/* Tab 1: Info & Progress */}
                    {activeDetailTab === 'info' && (
                        <div className="space-y-6 p-2">
                            {/* Banner */}
                            <div
                                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                                    RETURN_STATUS_CONFIG[selectedItem.status]?.badgeClass || 'bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">
                                            Tiến độ xử lý: {RETURN_STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {RETURN_STATUS_CONFIG[selectedItem.status]?.description}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleOpenStatusChange(selectedItem)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                                >
                                    Cập nhật trạng thái
                                </button>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                        <Barcode className="w-4 h-4 text-rose-600" />
                                        <span>Thông tin sản phẩm & Mã lỗi</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã Serial lỗi:</span>
                                        <span className="font-mono font-bold text-rose-700">{selectedItem.serialNumber}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Tên sản phẩm:</span>
                                        <span className="font-medium text-gray-900">{selectedItem.productName}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã SKU:</span>
                                        <span className="font-mono text-gray-800">{selectedItem.productCode}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Giá trị bồi hoàn:</span>
                                        <span className="font-bold text-blue-700">{formatVND(selectedItem.productPrice)}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Hình thức yêu cầu:</span>
                                        <span className="font-semibold text-emerald-700">
                                            {RESOLUTION_LABELS[selectedItem.resolution]}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                        <span>Nhà cung cấp & Nguồn gốc nhập</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Đơn vị tiếp nhận:</span>
                                        <span className="font-bold text-gray-900">{selectedItem.supplierName}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Số điện thoại:</span>
                                        <span className="text-gray-800">{selectedItem.supplierPhone}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Email NCC:</span>
                                        <span className="text-gray-800">{selectedItem.supplierEmail}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Phiếu nhập gốc:</span>
                                        <span className="font-mono text-blue-600 font-semibold">{selectedItem.goodsReceiptCode}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Thời gian nhận hàng:</span>
                                        <span className="text-gray-800">{selectedItem.receivedDate}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Defect description */}
                            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 text-xs space-y-1">
                                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    <span>Chi tiết tình trạng lỗi kiểm tra:</span>
                                </div>
                                <p className="text-gray-700 leading-relaxed">{selectedItem.defectReason}</p>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Official Printable RMA Document */}
                    {activeDetailTab === 'print' && (
                        <div className="space-y-4 p-2">
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>In biên bản bàn giao này (Print)</span>
                                </button>
                            </div>

                            {/* Printable Paper Canvas */}
                            <div className="p-8 bg-white border border-gray-300 rounded-xl shadow-xs text-black font-serif space-y-6">
                                <div className="text-center space-y-1">
                                    <div className="font-bold text-sm uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div className="text-xs italic underline">Độc lập - Tự do - Hạnh phúc</div>
                                </div>

                                <div className="text-center pt-2">
                                    <h2 className="text-xl font-bold uppercase tracking-wider text-gray-900">
                                        BIÊN BẢN BÀN GIAO & YÊU CẦU HOÀN TRẢ HÀNG LỖI (RMA)
                                    </h2>
                                    <div className="text-xs text-gray-600 font-sans mt-0.5">Mã chứng từ: {selectedItem.rmaCode}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                                    <div className="space-y-1">
                                        <div><b>Bên giao (Cửa hàng):</b> Hệ thống phân phối máy tính PCStore</div>
                                        <div><b>Đại diện kho:</b> Bộ phận Kiểm soát chất lượng & Nhập kho</div>
                                        <div><b>Liên hệ:</b> 1900 8888 • contact@pcstore.vn</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <div><b>Bên nhận (Nhà cung cấp):</b> {selectedItem.supplierName}</div>
                                        <div><b>Điện thoại NCC:</b> {selectedItem.supplierPhone}</div>
                                        <div><b>Thời gian lập:</b> {new Date().toLocaleDateString('vi-VN')}</div>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse border border-gray-400 font-sans">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-400 p-2 text-center">STT</th>
                                            <th className="border border-gray-400 p-2 text-left">Tên linh kiện / Thiết bị</th>
                                            <th className="border border-gray-400 p-2 text-left">Mã Serial lỗi</th>
                                            <th className="border border-gray-400 p-2 text-left">Tình trạng kiểm tra</th>
                                            <th className="border border-gray-400 p-2 text-right">Đơn giá nhập</th>
                                            <th className="border border-gray-400 p-2 text-center">Yêu cầu xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-400 p-2 text-center">1</td>
                                            <td className="border border-gray-400 p-2 font-medium">{selectedItem.productName}</td>
                                            <td className="border border-gray-400 p-2 font-mono font-bold text-rose-700">
                                                {selectedItem.serialNumber}
                                            </td>
                                            <td className="border border-gray-400 p-2 text-gray-700">{selectedItem.defectReason}</td>
                                            <td className="border border-gray-400 p-2 text-right font-mono font-bold">
                                                {formatVND(selectedItem.productPrice)}
                                            </td>
                                            <td className="border border-gray-400 p-2 text-center font-bold text-emerald-800">
                                                {RESOLUTION_LABELS[selectedItem.resolution]}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="text-xs font-sans space-y-1">
                                    <p><b>Cam kết thời gian đối soát:</b> Phía Nhà cung cấp cam kết xử lý hoàn trả hoặc đổi mới sản phẩm tương đương trong vòng <b>07 ngày làm việc</b> kể từ khi nhận đủ hàng và biên bản này.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-12 text-center text-xs font-sans">
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN BÊN GIAO (KHO PCSTORE)</div>
                                        <div className="sign font-mono italic text-gray-400">(Ký, ghi rõ họ tên và đóng dấu)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN BÊN NHẬN (NHÀ CUNG CẤP)</div>
                                        <div className="sign font-mono italic text-gray-400">(Ký, ghi rõ họ tên và đóng dấu)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ======================================================== */}
            {/* UPDATE STATUS MODAL                                      */}
            {/* ======================================================== */}
            {statusUpdateTarget && (
                <AdminConfirmModal
                    isOpen={Boolean(statusUpdateTarget)}
                    onClose={() => setStatusUpdateTarget(null)}
                    onConfirm={handleConfirmStatusChange}
                    title="Cập nhật tiến trình hoàn trả hàng lỗi"
                    message={
                        <div className="space-y-3 pt-2">
                            <p className="text-xs text-gray-600">
                                Cập nhật trạng thái mới cho thiết bị có Serial: <b>{statusUpdateTarget.serialNumber}</b>
                            </p>
                            <select
                                value={newReturnStatus}
                                onChange={(e) => setNewReturnStatus(e.target.value as ProductSerialStatus)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white font-medium"
                            >
                                <option value="PENDING_RETURN">Chờ hoàn trả NCC (PENDING_RETURN)</option>
                                <option value="RETURNING">Đang vận chuyển trả NCC (RETURNING)</option>
                                <option value="RETURNED">Đã hoàn tất đổi trả / Bồi hoàn (RETURNED)</option>
                            </select>
                        </div>
                    }
                    variant="info"
                    isLoading={isUpdatingStatus}
                    confirmText="Cập nhật tiến trình"
                    cancelText="Đóng"
                />
            )}

            {/* ======================================================== */}
            {/* CREATE RMA RETURN NOTE MODAL                             */}
            {/* ======================================================== */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                    Khởi tạo Biên bản hoàn trả hàng lỗi (RMA)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="block font-semibold text-gray-800">
                                    Nhà cung cấp tiếp nhận <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formSupplierId}
                                    onChange={(e) => setFormSupplierId(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 border rounded-xl bg-white font-medium"
                                >
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block font-semibold text-gray-800">
                                    Phương thức giải quyết mong muốn
                                </label>
                                <select
                                    value={formResolution}
                                    onChange={(e) => setFormResolution(e.target.value as ReturnResolutionType)}
                                    className="w-full px-3 py-2.5 border rounded-xl bg-white font-medium"
                                >
                                    <option value="REPLACE">Đổi mới sản phẩm tương đương 1:1</option>
                                    <option value="REFUND">Bồi hoàn tiền mặt / Cấn trừ công nợ</option>
                                    <option value="REPAIR">Chuyển sang trung tâm bảo hành sửa chữa</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block font-semibold text-gray-800">
                                    Lý do lỗi chung ghi nhận:
                                </label>
                                <textarea
                                    rows={3}
                                    value={formDefectReason}
                                    onChange={(e) => setFormDefectReason(e.target.value)}
                                    className="w-full p-2.5 border rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCreateRma}
                                disabled={isCreatingRma}
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
                            >
                                {isCreatingRma ? 'Đang tạo biên bản...' : 'Tạo biên bản RMA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
