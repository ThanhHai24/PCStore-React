import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Barcode,
    RefreshCw,
    Package,
    Ticket,
    CheckCircle2,
    AlertTriangle,
    Warehouse,
    RotateCcw,
    Send,
    CheckSquare,
    Sparkles,
    Eye,
    Printer,
    Copy,
    Check,
    Clock,
    ShieldAlert,
    Zap,
    X,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
import { adminProductService } from '../../../services/adminProductService';
import type {
    ProductSerialResponse,
    ProductSerialStatus,
    GoodsReceiptResponse,
} from '../../../types/adminGoodsReceipt';
import type { ProductResponse } from '../../../types/adminProduct';

// Flattened UI Model for Serials Table
export interface ProductSerialUI {
    id: string; // for table rowKey
    numericId: number;
    serialNumber: string;
    productId: number;
    productName: string;
    productCode: string;
    productImage?: string | null;
    goodsReceiptId?: number | null;
    goodsReceiptCode?: string | null;
    receiptDate?: string | null;
    status: ProductSerialStatus;
    isTerminated: boolean;
    createdDate?: string | null;
    createdBy?: number | null;
    lastModifiedDate?: string | null;
    lastModifiedBy?: number | null;
    rawSerial: ProductSerialResponse;
}

// Helpers
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

// Status definitions and styling
export const SERIAL_STATUS_MAP: Record<
    ProductSerialStatus,
    {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        badgeClass: string;
        icon: React.ElementType;
        description: string;
    }
> = {
    GOOD_CONDITION: {
        label: 'Đạt chuẩn (Tốt)',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/10',
        icon: CheckCircle2,
        description: 'Sản phẩm đạt chuẩn kỹ thuật khi nhận hàng, sẵn sàng nhập kho',
    },
    DEFECTIVE: {
        label: 'Lỗi / Hư hỏng',
        color: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/10',
        icon: AlertTriangle,
        description: 'Sản phẩm lỗi ngoại quan hoặc không hoạt động, cần lập biên bản hoàn trả NCC',
    },
    IN_STOCK: {
        label: 'Trong kho',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-500/10',
        icon: Warehouse,
        description: 'Đang lưu trữ trong kho và sẵn sàng xuất bán cho khách hàng',
    },
    PENDING_RETURN: {
        label: 'Chờ hoàn trả NCC',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/10',
        icon: RotateCcw,
        description: 'Hàng lỗi đã được ghi nhận, đang chờ phía nhà cung cấp tiếp nhận đổi trả',
    },
    RETURNING: {
        label: 'Đang gửi trả NCC',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-300 ring-orange-500/10',
        icon: RotateCcw,
        description: 'Hàng hóa đang trên đường vận chuyển hoàn trả cho nhà cung cấp',
    },
    RETURNED: {
        label: 'Đã hoàn trả NCC',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 ring-gray-500/10',
        icon: Check,
        description: 'Đã hoàn tất đổi trả và bồi hoàn với nhà cung cấp',
    },
    PACKING: {
        label: 'Đang đóng gói',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-indigo-500/10',
        icon: Package,
        description: 'Sản phẩm đã được chọn cho đơn hàng và đang đóng gói',
    },
    DELIVERING: {
        label: 'Đang giao hàng',
        color: 'text-sky-700',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-300 ring-sky-500/10',
        icon: Send,
        description: 'Đang trên đường giao đến tay khách hàng',
    },
    SOLD: {
        label: 'Đã xuất bán',
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 ring-purple-500/10',
        icon: CheckSquare,
        description: 'Đã giao dịch thành công cho khách hàng, kích hoạt bảo hành',
    },
    USING_BY_TECHNICAL: {
        label: 'Kỹ thuật đang mượn',
        color: 'text-teal-700',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-300 ring-teal-500/10',
        icon: Sparkles,
        description: 'Đang được bộ phận kỹ thuật mượn để thử nghiệm hoặc bảo hành máy',
    },
};

export default function ProductSerialList() {
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Data states
    const [serials, setSerials] = useState<ProductSerialUI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Metadata dictionaries
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [receipts, setReceipts] = useState<GoodsReceiptResponse[]>([]);

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [productFilter, setProductFilter] = useState<string>('ALL');
    const [receiptFilter, setReceiptFilter] = useState<string>('ALL');
    const [terminatedFilter, setTerminatedFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(15);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedSerial, setSelectedSerial] = useState<ProductSerialUI | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'lifecycle' | 'barcode'>('info');

    // Quick Scanner Modal State
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [quickScanInput, setQuickScanInput] = useState('');
    const [scannedResult, setScannedResult] = useState<ProductSerialUI | null>(null);
    const [isScanningLookup, setIsScanningLookup] = useState(false);
    const scanInputRef = useRef<HTMLInputElement | null>(null);

    // Copy indicator state
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

    // Maps for fast lookups
    const productMap = useMemo(() => {
        const map = new Map<number, ProductResponse>();
        products.forEach((p) => map.set(p.id, p));
        return map;
    }, [products]);

    /**
     * Load Products and Goods Receipts to aggregate Serials
     */
    const loadAllSerials = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                // Fetch products and goods receipts in parallel
                const [prodRes, grRes] = await Promise.all([
                    adminProductService.getAllProducts({ size: 100 }).catch(() => ({ content: [] })),
                    adminGoodsReceiptService.getAllReceipts({ size: 100 }).catch(() => ({ content: [] })),
                ]);

                const prods = prodRes.content || [];
                const grs = grRes.content || [];

                setProducts(prods);
                setReceipts(grs);

                const pMap = new Map<number, ProductResponse>();
                prods.forEach((p) => pMap.set(p.id, p));

                const grMap = new Map<number, GoodsReceiptResponse>();
                grs.forEach((r) => grMap.set(r.id, r));

                // Aggregate all serials from all receipts
                const aggregated: ProductSerialUI[] = [];
                const seenSerials = new Set<string>();

                grs.forEach((gr) => {
                    (gr.items || []).forEach((item) => {
                        (item.productSerials || []).forEach((ser) => {
                            if (!seenSerials.has(ser.serialNumber.toLowerCase())) {
                                seenSerials.add(ser.serialNumber.toLowerCase());

                                const prod = pMap.get(ser.productId);
                                aggregated.push({
                                    id: String(ser.id || ser.serialNumber),
                                    numericId: ser.id,
                                    serialNumber: ser.serialNumber,
                                    productId: ser.productId,
                                    productName: prod?.name || `Sản phẩm #${ser.productId}`,
                                    productCode: prod?.code || `SP-${ser.productId}`,
                                    productImage: prod?.imageUrl,
                                    goodsReceiptId: gr.id,
                                    goodsReceiptCode: gr.code,
                                    receiptDate: formatDateTime(gr.receivedAt),
                                    status: ser.status,
                                    isTerminated: Boolean(ser.isTerminated || ser.terminated),
                                    createdDate: formatDateTime(ser.createdDate),
                                    createdBy: ser.createdBy,
                                    lastModifiedDate: formatDateTime(ser.lastModifiedDate),
                                    lastModifiedBy: ser.lastModifiedBy,
                                    rawSerial: ser,
                                });
                            }
                        });
                    });
                });

                // If user selected a specific product filter and has active serials
                setSerials(aggregated);
            } catch (err: any) {
                const msg = err?.message || 'Không thể tải danh sách Serial từ hệ thống.';
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
        loadAllSerials();
    }, [loadAllSerials]);

    // Handle URL search param (e.g. ?serial=DEMO-SN-00019 or ?productId=10005)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qSerial = params.get('serial') || params.get('serialNumber');
        const qProd = params.get('productId');
        const qReceipt = params.get('receiptId') || params.get('goodsReceiptId');
        const qStatus = params.get('status');
        const qTerminated = params.get('terminated');

        if (qSerial) setSearchQuery(qSerial);
        if (qProd) setProductFilter(qProd);
        if (qReceipt) setReceiptFilter(qReceipt);
        if (qStatus) setStatusFilter(qStatus);
        if (qTerminated) setTerminatedFilter(qTerminated);
    }, [location.search]);

    /**
     * Filtered serials computation
     */
    const filteredSerials = useMemo(() => {
        return serials.filter((s) => {
            // Search query (serial or product name/code)
            const cleanQuery = searchQuery.trim().toLowerCase();
            const matchSearch =
                !cleanQuery ||
                s.serialNumber.toLowerCase().includes(cleanQuery) ||
                s.productName.toLowerCase().includes(cleanQuery) ||
                s.productCode.toLowerCase().includes(cleanQuery) ||
                (s.goodsReceiptCode && s.goodsReceiptCode.toLowerCase().includes(cleanQuery));

            // Status filter
            const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;

            // Product filter
            const matchProduct =
                productFilter === 'ALL' ||
                String(s.productId) === String(productFilter) ||
                s.productCode.toLowerCase() === productFilter.toLowerCase();

            // Receipt filter
            const matchReceipt =
                receiptFilter === 'ALL' ||
                String(s.goodsReceiptId) === String(receiptFilter) ||
                (s.goodsReceiptCode && s.goodsReceiptCode.toLowerCase() === receiptFilter.toLowerCase());

            // Terminated filter
            const matchTerminated =
                terminatedFilter === 'ALL' ||
                (terminatedFilter === 'ACTIVE' && !s.isTerminated) ||
                (terminatedFilter === 'TERMINATED' && s.isTerminated);

            return matchSearch && matchStatus && matchProduct && matchReceipt && matchTerminated;
        });
    }, [serials, searchQuery, statusFilter, productFilter, receiptFilter, terminatedFilter]);

    // Paginated serials
    const paginatedSerials = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredSerials.slice(start, start + pageSize);
    }, [filteredSerials, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredSerials.length / pageSize));

    /**
     * KPI Stats
     */
    const kpiStats = useMemo(() => {
        let total = serials.length;
        let inStock = 0;
        let sold = 0;
        let defective = 0;
        let technical = 0;

        serials.forEach((s) => {
            if (s.status === 'IN_STOCK' || s.status === 'GOOD_CONDITION') inStock++;
            if (s.status === 'SOLD' || s.status === 'DELIVERING' || s.status === 'PACKING') sold++;
            if (
                s.status === 'DEFECTIVE' ||
                s.status === 'PENDING_RETURN' ||
                s.status === 'RETURNING' ||
                s.status === 'RETURNED'
            )
                defective++;
            if (s.status === 'USING_BY_TECHNICAL' || s.isTerminated) technical++;
        });

        return {
            total,
            inStock,
            sold,
            defective,
            technical,
        };
    }, [serials]);

    // Quick counts for Status Tabs
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            ALL: serials.length,
            IN_STOCK: 0,
            GOOD_CONDITION: 0,
            SOLD: 0,
            DEFECTIVE: 0,
            PENDING_RETURN: 0,
            USING_BY_TECHNICAL: 0,
        };
        serials.forEach((s) => {
            if (counts[s.status] !== undefined) {
                counts[s.status]++;
            }
        });
        return counts;
    }, [serials]);

    // Quick status navigation tabs
    const statusTabs = useMemo(
        () => [
            { key: 'ALL', label: 'Tất cả Serial', icon: Barcode, count: statusCounts.ALL },
            { key: 'IN_STOCK', label: 'Trong kho khả dụng', icon: Warehouse, count: statusCounts.IN_STOCK },
            { key: 'GOOD_CONDITION', label: 'Đạt chuẩn (Tốt)', icon: CheckCircle2, count: statusCounts.GOOD_CONDITION },
            { key: 'SOLD', label: 'Đã xuất bán', icon: CheckSquare, count: statusCounts.SOLD },
            { key: 'DEFECTIVE', label: 'Lỗi / Hư hỏng', icon: AlertTriangle, count: statusCounts.DEFECTIVE },
            { key: 'PENDING_RETURN', label: 'Chờ đổi trả NCC', icon: RotateCcw, count: statusCounts.PENDING_RETURN },
            { key: 'USING_BY_TECHNICAL', label: 'Kỹ thuật mượn', icon: Sparkles, count: statusCounts.USING_BY_TECHNICAL },
        ],
        [statusCounts]
    );

    /**
     * Copy Serial to clipboard
     */
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSerial(text);
        toast.success(`Đã sao chép mã Serial: ${text}`);
        setTimeout(() => setCopiedSerial(null), 2000);
    };

    /**
     * Open Quick Scanner Modal
     */
    const handleOpenScanner = () => {
        setQuickScanInput('');
        setScannedResult(null);
        setIsScannerModalOpen(true);
        setTimeout(() => {
            scanInputRef.current?.focus();
        }, 150);
    };

    /**
     * Execute Quick Barcode Lookup
     */
    const handleQuickScanLookup = async (inputVal?: string) => {
        const query = (inputVal !== undefined ? inputVal : quickScanInput).trim();
        if (!query) return;

        setIsScanningLookup(true);
        try {
            // First check locally
            const localFound = serials.find(
                (s) => s.serialNumber.toLowerCase() === query.toLowerCase()
            );
            if (localFound) {
                setScannedResult(localFound);
                toast.success(`Đã tìm thấy Serial: ${localFound.serialNumber}`);
                return;
            }

            // Fallback: Query backend API /api/product-serials/by-serial/{serialNumber}
            const apiFound = await adminGoodsReceiptService.getSerialByNumber(query);
            const prod = productMap.get(apiFound.productId);

            const resultUI: ProductSerialUI = {
                id: String(apiFound.id || apiFound.serialNumber),
                numericId: apiFound.id,
                serialNumber: apiFound.serialNumber,
                productId: apiFound.productId,
                productName: prod?.name || `Sản phẩm #${apiFound.productId}`,
                productCode: prod?.code || `SP-${apiFound.productId}`,
                productImage: prod?.imageUrl,
                status: apiFound.status,
                isTerminated: Boolean(apiFound.isTerminated || apiFound.terminated),
                createdDate: formatDateTime(apiFound.createdDate),
                createdBy: apiFound.createdBy,
                lastModifiedDate: formatDateTime(apiFound.lastModifiedDate),
                lastModifiedBy: apiFound.lastModifiedBy,
                rawSerial: apiFound,
            };

            setScannedResult(resultUI);
            toast.success(`Đã tra cứu thành công từ hệ thống: ${resultUI.serialNumber}`);
        } catch (err: any) {
            toast.error(`Không tìm thấy mã Serial "${query}" trong hệ thống!`);
            setScannedResult(null);
        } finally {
            setIsScanningLookup(false);
        }
    };

    /**
     * View Details Modal
     */
    const handleViewDetail = (item: ProductSerialUI) => {
        setSelectedSerial(item);
        setActiveDetailTab('info');
        setIsDetailModalOpen(true);
    };

    /**
     * Print Barcode Label
     */
    const handlePrintBarcode = (item: ProductSerialUI) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>In tem Serial - ${item.serialNumber}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 16px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .label-box {
                        width: 320px;
                        border: 2px dashed #000;
                        padding: 14px;
                        border-radius: 8px;
                        text-align: center;
                        background: #fff;
                    }
                    .store-name {
                        font-size: 11px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #555;
                        margin-bottom: 4px;
                    }
                    .product-name {
                        font-size: 13px;
                        font-weight: bold;
                        line-height: 1.3;
                        margin-bottom: 4px;
                    }
                    .product-code {
                        font-size: 11px;
                        color: #666;
                        margin-bottom: 10px;
                    }
                    .barcode-lines {
                        font-family: monospace;
                        font-size: 28px;
                        letter-spacing: 4px;
                        font-weight: bold;
                        background: repeating-linear-gradient(
                            to right,
                            #000 0,
                            #000 2px,
                            transparent 2px,
                            transparent 4px,
                            #000 4px,
                            #000 7px,
                            transparent 7px,
                            transparent 10px
                        );
                        height: 50px;
                        margin: 8px 0;
                    }
                    .serial-text {
                        font-family: monospace;
                        font-size: 14px;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }
                    .status-tag {
                        display: inline-block;
                        margin-top: 8px;
                        padding: 2px 8px;
                        font-size: 10px;
                        font-weight: bold;
                        border: 1px solid #333;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="label-box">
                    <div class="store-name">PCStore Vietnam - Warranty Seal</div>
                    <div class="product-name">${item.productName}</div>
                    <div class="product-code">Mã SP: ${item.productCode}</div>
                    <div class="barcode-lines"></div>
                    <div class="serial-text">${item.serialNumber}</div>
                    <div class="status-tag">TÌNH TRẠNG: ${item.status}</div>
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

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = useMemo(
        () => [
            {
                id: 'status',
                name: 'status',
                label: 'Trạng thái vòng đời',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Clock,
                options: [
                    { label: 'Trong kho khả dụng (IN_STOCK)', value: 'IN_STOCK' },
                    { label: 'Đạt chuẩn (GOOD_CONDITION)', value: 'GOOD_CONDITION' },
                    { label: 'Lỗi hỏng (DEFECTIVE)', value: 'DEFECTIVE' },
                    { label: 'Chờ hoàn trả NCC (PENDING_RETURN)', value: 'PENDING_RETURN' },
                    { label: 'Đang gửi trả NCC (RETURNING)', value: 'RETURNING' },
                    { label: 'Đã hoàn trả NCC (RETURNED)', value: 'RETURNED' },
                    { label: 'Đang đóng gói (PACKING)', value: 'PACKING' },
                    { label: 'Đang giao hàng (DELIVERING)', value: 'DELIVERING' },
                    { label: 'Đã xuất bán (SOLD)', value: 'SOLD' },
                    { label: 'Kỹ thuật mượn (USING_BY_TECHNICAL)', value: 'USING_BY_TECHNICAL' },
                ],
            },
            {
                id: 'productId',
                name: 'productId',
                label: 'Sản phẩm',
                type: 'select',
                placeholder: 'Tất cả sản phẩm',
                icon: Package,
                options: products.map((p) => ({
                    label: `${p.code} - ${p.name}`,
                    value: String(p.id),
                })),
            },
            {
                id: 'receiptId',
                name: 'receiptId',
                label: 'Phiếu nhập kho nguồn',
                type: 'select',
                placeholder: 'Tất cả phiếu nhập',
                icon: Ticket,
                options: receipts.map((r) => ({
                    label: `${r.code} (${r.status})`,
                    value: String(r.id),
                })),
            },
            {
                id: 'terminated',
                name: 'terminated',
                label: 'Tình trạng hiệu lực',
                type: 'select',
                placeholder: 'Tất cả hiệu lực',
                icon: ShieldAlert,
                options: [
                    { label: 'Đang hoạt động (Active)', value: 'ACTIVE' },
                    { label: 'Đã hủy / Kết thúc (Terminated)', value: 'TERMINATED' },
                ],
            },
        ],
        [products, receipts]
    );

    // Active filter values passed to AdminFilter (only truly active filters)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (statusFilter && statusFilter !== 'ALL') {
            vals.status = statusFilter;
        }
        if (productFilter && productFilter !== 'ALL') {
            vals.productId = productFilter;
        }
        if (receiptFilter && receiptFilter !== 'ALL') {
            vals.receiptId = receiptFilter;
        }
        if (terminatedFilter && terminatedFilter !== 'ALL') {
            vals.terminated = terminatedFilter;
        }
        return vals;
    }, [statusFilter, productFilter, receiptFilter, terminatedFilter]);

    // Handle filter changes from AdminFilter (dropdowns, chips, clear button)
    const handleFilterChange = (newValues: Record<string, any>) => {
        setStatusFilter(newValues.status || 'ALL');
        setProductFilter(newValues.productId || 'ALL');
        setReceiptFilter(newValues.receiptId || 'ALL');
        setTerminatedFilter(newValues.terminated || 'ALL');
        setCurrentPage(1);
    };

    // Handle complete filter reset
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setProductFilter('ALL');
        setReceiptFilter('ALL');
        setTerminatedFilter('ALL');
        setCurrentPage(1);
    };

    // Columns definition
    const columns: Column<ProductSerialUI>[] = [
        {
            key: 'serialNumber',
            header: 'Số Serial (Mã duy nhất)',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Barcode className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span
                                className="font-mono font-bold text-gray-900 hover:text-blue-600 cursor-pointer"
                                onClick={() => handleViewDetail(item)}
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
                                title="Sao chép số Serial"
                            >
                                {copiedSerial === item.serialNumber ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">ID: #{item.numericId}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'product',
            header: 'Sản phẩm tương ứng',
            render: (item) => (
                <div>
                    <div className="font-semibold text-gray-900 line-clamp-1">{item.productName}</div>
                    <div className="text-xs text-gray-500 font-mono">Mã: {item.productCode}</div>
                </div>
            ),
        },
        {
            key: 'receipt',
            header: 'Phiếu nhập nguồn',
            render: (item) => (
                <div>
                    {item.goodsReceiptCode ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/import-ticket?keyword=${item.goodsReceiptCode}`);
                            }}
                            className="font-medium text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>{item.goodsReceiptCode}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400">---</span>
                    )}
                    <div className="text-[11px] text-gray-400">{item.receiptDate}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái vòng đời',
            align: 'center',
            render: (item) => {
                const conf = SERIAL_STATUS_MAP[item.status] || {
                    label: item.status,
                    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
                    icon: CheckCircle2,
                };
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
            key: 'terminated',
            header: 'Hiệu lực',
            align: 'center',
            render: (item) =>
                item.isTerminated ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        Đã hủy
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Hoạt động
                    </span>
                ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleViewDetail(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết & Vòng đời Serial"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handlePrintBarcode(item)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="In tem mã vạch Barcode"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Detail Modal Tabs
    const detailTabs: ModalTab[] = [
        { id: 'info', label: 'Thông tin chung', icon: Barcode },
        { id: 'lifecycle', label: 'Vòng đời & Tiến trình', icon: Clock },
        { id: 'barcode', label: 'Tem mã vạch', icon: Printer },
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                            <Barcode className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý mã Serial sản phẩm (Product Serials)
                            </h1>
                            <p className="text-sm text-gray-500">
                                Tra cứu, theo dõi vị trí và toàn bộ vòng đời từng sản phẩm từ lúc nhập kho đến xuất bán và bảo hành
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => loadAllSerials(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenScanner}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
                    >
                        <Zap className="w-4 h-4" />
                        <span>Quét nhanh Barcode</span>
                    </button>
                </div>
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
                        onClick={() => loadAllSerials(true)}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div
                    onClick={() => {
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'ALL'
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                    title="Xem tất cả Serial"
                >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <Barcode className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tổng số Serial</div>
                        <div className="text-xl font-bold text-gray-900">{kpiStats.total}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('IN_STOCK');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'IN_STOCK'
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                    title="Lọc Serial trong kho khả dụng"
                >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Trong kho khả dụng</div>
                        <div className="text-xl font-bold text-blue-700">{kpiStats.inStock}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('SOLD');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'SOLD'
                            ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                    title="Lọc Serial đã xuất bán"
                >
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                        <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Đã xuất bán</div>
                        <div className="text-xl font-bold text-purple-700">{kpiStats.sold}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('DEFECTIVE');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-4 rounded-xl border shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'DEFECTIVE'
                            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                    title="Lỗi / Chờ đổi trả NCC"
                >
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Hàng lỗi / Hư hại</div>
                        <div className="text-xl font-bold text-rose-700">{kpiStats.defective}</div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('USING_BY_TECHNICAL');
                        setCurrentPage(1);
                    }}
                    className={`col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'USING_BY_TECHNICAL'
                            ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                    title="Lọc Serial kỹ thuật mượn"
                >
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-lg shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Kỹ thuật mượn</div>
                        <div className="text-xl font-bold text-teal-700">{kpiStats.technical}</div>
                    </div>
                </div>
            </div>

            {/* Quick Status Navigation Pills & Filter Section */}
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
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
                                    }`}
                            >
                                <IconComponent className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
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
                    searchPlaceholder="Tra cứu theo mã Serial (DEMO-SN-...), tên sản phẩm, mã SP, mã phiếu nhập..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                <AdminTable<ProductSerialUI>
                    columns={columns}
                    data={paginatedSerials}
                    rowKey="id"
                    loading={isLoading}
                    emptyText="Không tìm thấy mã Serial nào phù hợp với bộ lọc."
                    emptyIcon={Barcode}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredSerials.length}
                    pageSize={pageSize}
                    pageSizeOptions={[15, 30, 50]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(sz) => {
                        setPageSize(sz);
                        setCurrentPage(1);
                    }}
                    showPageSizeSelector={true}
                    itemUnitName="serial"
                    onRowClick={(item) => handleViewDetail(item)}
                />
            </div>

            {/* ======================================================== */}
            {/* FAST BARCODE SCANNER MODAL                                */}
            {/* ======================================================== */}
            {isScannerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                    Chế độ Quét nhanh Barcode / Serial
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsScannerModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500">
                            Đặt con trỏ vào ô bên dưới rồi dùng súng bắn mã vạch quét mã trên vỏ hộp hoặc nhập số serial rồi nhấn Enter.
                        </p>

                        <div className="relative">
                            <Barcode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={scanInputRef}
                                type="text"
                                value={quickScanInput}
                                onChange={(e) => setQuickScanInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickScanLookup();
                                    }
                                }}
                                placeholder="Quét mã vạch Serial vào đây..."
                                className="w-full pl-10 pr-4 py-3 border-2 border-indigo-400 rounded-xl text-base font-mono focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                                autoFocus
                            />
                        </div>

                        {/* Scanner result card */}
                        {isScanningLookup ? (
                            <div className="p-8 text-center text-gray-500">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                                Đang tra cứu thông tin Serial...
                            </div>
                        ) : scannedResult ? (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs text-gray-500 font-semibold uppercase">Kết quả tra cứu:</div>
                                        <div className="font-mono text-lg font-bold text-gray-900">{scannedResult.serialNumber}</div>
                                        <div className="text-sm font-semibold text-blue-700">{scannedResult.productName}</div>
                                        <div className="text-xs text-gray-500">Mã SP: {scannedResult.productCode}</div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${SERIAL_STATUS_MAP[scannedResult.status]?.badgeClass
                                            }`}
                                    >
                                        {SERIAL_STATUS_MAP[scannedResult.status]?.label}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200">
                                    <div>
                                        <span className="text-gray-500">Phiếu nhập:</span>{' '}
                                        <b>{scannedResult.goodsReceiptCode || '---'}</b>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Ngày nhập:</span>{' '}
                                        <b>{scannedResult.receiptDate || '---'}</b>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsScannerModalOpen(false);
                                            handleViewDetail(scannedResult);
                                        }}
                                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Xem chi tiết vòng đời</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[11px] text-gray-400">
                                Nhấn <b>Esc</b> để đóng chế độ quét.
                            </span>
                            <button
                                type="button"
                                onClick={() => handleQuickScanLookup()}
                                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                            >
                                Tra cứu mã
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* DETAIL & LIFECYCLE MODAL                                 */}
            {/* ======================================================== */}
            {selectedSerial && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Chi tiết mã Serial: ${selectedSerial.serialNumber}`}
                    subtitle={`${selectedSerial.productName} • Mã SP: ${selectedSerial.productCode}`}
                    icon={Barcode}
                    size="xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={false}
                >
                    {/* Tab 1: General Info */}
                    {activeDetailTab === 'info' && (
                        <div className="space-y-6 p-2">
                            {/* Status Banner */}
                            <div
                                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${SERIAL_STATUS_MAP[selectedSerial.status]?.bgColor || 'bg-gray-50'
                                    } ${SERIAL_STATUS_MAP[selectedSerial.status]?.borderColor || 'border-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    {React.createElement(
                                        SERIAL_STATUS_MAP[selectedSerial.status]?.icon || CheckCircle2,
                                        {
                                            className: `w-6 h-6 ${SERIAL_STATUS_MAP[selectedSerial.status]?.color || 'text-gray-700'
                                                }`,
                                        }
                                    )}
                                    <div>
                                        <div
                                            className={`font-bold text-sm ${SERIAL_STATUS_MAP[selectedSerial.status]?.color || 'text-gray-900'
                                                }`}
                                        >
                                            Trạng thái hiện tại: {SERIAL_STATUS_MAP[selectedSerial.status]?.label}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {SERIAL_STATUS_MAP[selectedSerial.status]?.description}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handlePrintBarcode(selectedSerial)}
                                    className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl flex items-center gap-1.5 shadow-xs"
                                >
                                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>In tem</span>
                                </button>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                        <Barcode className="w-4 h-4 text-indigo-600" />
                                        <span>Định danh Serial</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã Serial duy nhất:</span>
                                        <span className="font-mono font-bold text-gray-900">{selectedSerial.serialNumber}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">ID Serial:</span>
                                        <span className="font-mono text-gray-700">#{selectedSerial.numericId}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Hiệu lực hoạt động:</span>
                                        <span
                                            className={`font-semibold ${selectedSerial.isTerminated ? 'text-rose-600' : 'text-emerald-600'
                                                }`}
                                        >
                                            {selectedSerial.isTerminated ? 'Đã hủy (Terminated)' : 'Đang hoạt động (Active)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Thời gian tạo:</span>
                                        <span className="text-gray-700">{selectedSerial.createdDate}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-blue-600" />
                                        <span>Thông tin Sản phẩm & Phiếu nhập</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Tên sản phẩm:</span>
                                        <span className="font-medium text-gray-900 line-clamp-1">{selectedSerial.productName}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã sản phẩm:</span>
                                        <span className="font-mono font-bold text-blue-600">{selectedSerial.productCode}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Phiếu nhập kho:</span>
                                        <span className="font-mono font-semibold text-gray-900">
                                            {selectedSerial.goodsReceiptCode || '---'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Ngày nhập kho:</span>
                                        <span className="text-gray-700">{selectedSerial.receiptDate || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Lifecycle Timeline */}
                    {activeDetailTab === 'lifecycle' && (
                        <div className="space-y-6 p-4">
                            <div className="text-xs text-gray-500">
                                Tiến trình vòng đời của thiết bị được ghi nhận theo từng giai đoạn hoạt động của hệ thống:
                            </div>

                            <div className="relative border-l-2 border-indigo-200 ml-4 space-y-8 pl-6">
                                {/* Step 1: Receiving */}
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                                        1
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">Tiếp nhận & Quét mã tại Phiếu nhập kho</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Ghi nhận mã Serial <b>{selectedSerial.serialNumber}</b> từ lô hàng nhà cung cấp giao
                                        </div>
                                        <div className="mt-1 text-[11px] text-gray-400 font-mono">
                                            Phiếu: {selectedSerial.goodsReceiptCode || 'DEMO-GR'} • Thời gian: {selectedSerial.createdDate}
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Quality Inspection */}
                                <div className="relative">
                                    <div
                                        className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedSerial.status === 'DEFECTIVE' || selectedSerial.status === 'PENDING_RETURN'
                                                ? 'bg-rose-500'
                                                : 'bg-blue-500'
                                            }`}
                                    >
                                        2
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">Kiểm định & Phân loại chất lượng</div>
                                        <div className="text-xs text-gray-600 mt-0.5">
                                            {selectedSerial.status === 'DEFECTIVE' || selectedSerial.status === 'PENDING_RETURN' ? (
                                                <span className="text-rose-700 font-semibold">
                                                    Phát hiện lỗi kỹ thuật / hư hại ngoại quan (DEFECTIVE). Lập biên bản yêu cầu đổi trả.
                                                </span>
                                            ) : (
                                                <span className="text-emerald-700 font-semibold">
                                                    Sản phẩm đạt 100% tiêu chuẩn chất lượng kỹ thuật (GOOD_CONDITION).
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Step 3: Warehouse Inbound */}
                                <div className="relative">
                                    <div
                                        className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedSerial.status === 'IN_STOCK' || selectedSerial.status === 'SOLD'
                                                ? 'bg-emerald-500'
                                                : 'bg-gray-300'
                                            }`}
                                    >
                                        3
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">Nhập kho lưu trữ khả dụng (IN_STOCK)</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Tự động cập nhật tăng tồn kho khả dụng của sản phẩm và gán vị trí lưu kho.
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4: Dispatch or Sold */}
                                <div className="relative">
                                    <div
                                        className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedSerial.status === 'SOLD' ? 'bg-purple-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        4
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">Xuất bán & Kích hoạt bảo hành (SOLD)</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {selectedSerial.status === 'SOLD'
                                                ? 'Thiết bị đã được xuất bán cho khách hàng, liên kết hóa đơn bán lẻ và kích hoạt chính sách bảo hành.'
                                                : 'Thiết bị chưa xuất bán hoặc đang trong kho chờ đơn hàng.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Barcode Label Preview */}
                    {activeDetailTab === 'barcode' && (
                        <div className="space-y-4 p-4 text-center">
                            <div className="text-xs text-gray-500">
                                Mẫu tem mã vạch Barcode dùng để dán lên bao bì sản phẩm hoặc linh kiện:
                            </div>

                            <div className="inline-block p-6 bg-white border-2 border-dashed border-gray-400 rounded-2xl shadow-sm text-center max-w-sm w-full mx-auto space-y-2">
                                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                    PCStore Vietnam - Warranty Seal
                                </div>
                                <div className="font-bold text-sm text-gray-900">{selectedSerial.productName}</div>
                                <div className="text-xs text-gray-500 font-mono">Mã SP: {selectedSerial.productCode}</div>

                                {/* Simulated Barcode Lines */}
                                <div
                                    className="h-12 w-full my-2 bg-repeat-x"
                                    style={{
                                        backgroundImage:
                                            'repeating-linear-gradient(to right, #000 0, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 10px)',
                                    }}
                                />

                                <div className="font-mono text-base font-extrabold text-gray-900 tracking-widest">
                                    {selectedSerial.serialNumber}
                                </div>

                                <div className="pt-2">
                                    <span
                                        className={`inline-block px-3 py-0.5 rounded text-[11px] font-bold border ${SERIAL_STATUS_MAP[selectedSerial.status]?.badgeClass
                                            }`}
                                    >
                                        {SERIAL_STATUS_MAP[selectedSerial.status]?.label}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => handlePrintBarcode(selectedSerial)}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>In tem mã vạch này</span>
                                </button>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}
        </div>
    );
}
