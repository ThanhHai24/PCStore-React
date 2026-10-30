import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Package,
    Warehouse,
    AlertTriangle,
    Boxes,
    Search,
    RefreshCw,
    Download,
    Eye,
    Barcode,
    Layers,
    Award,
    DollarSign,
    CheckCircle2,
    XCircle,
    TrendingUp,
    TrendingDown,
    Plus,
    Printer,
    FileSpreadsheet,
    ShieldAlert,
    Clock,
    Tag,
    Copy,
    Check,
    ArrowUpRight,
    SlidersHorizontal,
    ShoppingBag,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminProductService } from '../../../services/adminProductService';
import { adminCategoryService } from '../../../services/adminCategoryService';
import { adminBrandService } from '../../../services/adminBrandService';
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
import type {
    ProductResponse,
    BackendProductStatus,
} from '../../../types/adminProduct';
import type { CategoryResponse } from '../../../types/adminCategory';
import type { BrandResponse } from '../../../types/adminBrand';
import type {
    GoodsReceiptResponse,
    ProductSerialResponse,
    ProductSerialStatus,
} from '../../../types/adminGoodsReceipt';

export type StockLevelStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface WarehouseInventoryItemUI {
    id: string; // for table rowKey
    productId: number;
    productName: string;
    productCode: string;
    slug: string;
    imageUrl?: string | null;
    productType: string;
    status: BackendProductStatus;
    price: number;
    brandId?: number | null;
    brandName: string;
    primaryCategoryId?: number | null;
    categoryName: string;
    // Quantities
    totalSerialsReceived: number;
    availableStock: number;
    defectiveStock: number;
    soldStock: number;
    technicalStock: number;
    inventoryValue: number;
    stockStatus: StockLevelStatus;
    serials: ProductSerialResponse[];
    rawProduct: ProductResponse;
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

export const STOCK_LEVEL_CONFIG: Record<
    StockLevelStatus,
    { label: string; badgeClass: string; icon: React.ElementType; color: string }
> = {
    IN_STOCK: {
        label: 'Còn hàng dồi dào',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/10',
        icon: CheckCircle2,
        color: 'text-emerald-700',
    },
    LOW_STOCK: {
        label: 'Sắp hết hàng',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/10',
        icon: AlertTriangle,
        color: 'text-amber-700',
    },
    OUT_OF_STOCK: {
        label: 'Hết hàng trong kho',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/10',
        icon: XCircle,
        color: 'text-rose-700',
    },
};

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';

export default function WarehouseInventoryList() {
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Data States
    const [inventoryItems, setInventoryItems] = useState<WarehouseInventoryItemUI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Metadata
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [brands, setBrands] = useState<BrandResponse[]>([]);

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [brandFilter, setBrandFilter] = useState<string>('ALL');
    const [businessStatusFilter, setBusinessStatusFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WarehouseInventoryItemUI | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'card' | 'serials'>('card');
    const [productSerialsLoading, setProductSerialsLoading] = useState(false);
    const [activeProductSerials, setActiveProductSerials] = useState<ProductSerialResponse[]>([]);
    const [serialSearchFilter, setSerialSearchFilter] = useState('');

    // Status Change State
    const [statusChangeTarget, setStatusChangeTarget] = useState<WarehouseInventoryItemUI | null>(null);
    const [newStatus, setNewStatus] = useState<BackendProductStatus>('ACTIVE');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    /**
     * Load Categories and Brands for mapping
     */
    const loadMetadata = useCallback(async () => {
        try {
            const [catsRes, brsRes] = await Promise.all([
                adminCategoryService.getAllCategories({ size: 100 }),
                adminBrandService.getAllBrands({ size: 100 }),
            ]);
            setCategories(catsRes.content || []);
            setBrands(brsRes.content || []);
        } catch {
            // Non-blocking
        }
    }, []);

    useEffect(() => {
        loadMetadata();
    }, [loadMetadata]);

    /**
     * Load Products & Calculate Stock from Serials & Receipts
     */
    const loadInventory = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                // Parallel fetch products and receipts to get accurate stock levels
                const [prodRes, grRes] = await Promise.all([
                    adminProductService.getAllProducts({ size: 150 }),
                    adminGoodsReceiptService.getAllReceipts({ size: 100 }),
                ]);

                const prods = prodRes.content || [];
                const grs = grRes.content || [];

                // Aggregate serials per productId
                const serialMap = new Map<number, ProductSerialResponse[]>();
                grs.forEach((gr) => {
                    (gr.items || []).forEach((item) => {
                        (item.productSerials || []).forEach((ser) => {
                            const list = serialMap.get(ser.productId) || [];
                            list.push(ser);
                            serialMap.set(ser.productId, list);
                        });
                    });
                });

                // Map category and brand names
                const catMap = new Map<number, string>();
                categories.forEach((c) => catMap.set(c.id, c.name));

                const brandMap = new Map<number, string>();
                brands.forEach((b) => brandMap.set(b.id, b.name));

                // Transform to WarehouseInventoryItemUI
                const items: WarehouseInventoryItemUI[] = prods.map((p) => {
                    const prodSerials = serialMap.get(p.id) || [];
                    let available = 0;
                    let defective = 0;
                    let sold = 0;
                    let technical = 0;

                    prodSerials.forEach((s) => {
                        if (s.isTerminated || s.terminated) {
                            technical++;
                            return;
                        }
                        if (s.status === 'IN_STOCK' || s.status === 'GOOD_CONDITION') {
                            available++;
                        } else if (
                            s.status === 'DEFECTIVE' ||
                            s.status === 'PENDING_RETURN' ||
                            s.status === 'RETURNING' ||
                            s.status === 'RETURNED'
                        ) {
                            defective++;
                        } else if (
                            s.status === 'SOLD' ||
                            s.status === 'DELIVERING' ||
                            s.status === 'PACKING'
                        ) {
                            sold++;
                        } else if (s.status === 'USING_BY_TECHNICAL') {
                            technical++;
                        }
                    });

                    // Determine stock status level
                    let stockLevel: StockLevelStatus = 'IN_STOCK';
                    if (available === 0) {
                        stockLevel = 'OUT_OF_STOCK';
                    } else if (available <= 5) {
                        stockLevel = 'LOW_STOCK';
                    }

                    const price = p.price || 0;
                    const invValue = available * price;

                    return {
                        id: String(p.id),
                        productId: p.id,
                        productName: p.name,
                        productCode: p.code,
                        slug: p.slug,
                        imageUrl: p.imageUrl || DEFAULT_IMG,
                        productType: String(p.productType || 'COMPONENT'),
                        status: p.status as BackendProductStatus,
                        price,
                        brandId: p.brandId,
                        brandName: (p.brandId && brandMap.get(p.brandId)) || '---',
                        primaryCategoryId: p.primaryCategoryId,
                        categoryName: (p.primaryCategoryId && catMap.get(p.primaryCategoryId)) || 'Linh kiện',
                        totalSerialsReceived: prodSerials.length,
                        availableStock: available,
                        defectiveStock: defective,
                        soldStock: sold,
                        technicalStock: technical,
                        inventoryValue: invValue,
                        stockStatus: stockLevel,
                        serials: prodSerials,
                        rawProduct: p,
                    };
                });

                setInventoryItems(items);
            } catch (err: any) {
                const msg = err?.message || 'Không thể tải dữ liệu tồn kho sản phẩm.';
                setError(msg);
                toast.error(msg);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [categories, brands, toast]
    );

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    /**
     * Filtered items
     */
    const filteredItems = useMemo(() => {
        return inventoryItems.filter((item) => {
            // Search query
            const q = searchQuery.trim().toLowerCase();
            const matchSearch =
                !q ||
                item.productName.toLowerCase().includes(q) ||
                item.productCode.toLowerCase().includes(q) ||
                item.brandName.toLowerCase().includes(q) ||
                item.categoryName.toLowerCase().includes(q);

            // Stock status filter
            const matchStock =
                stockFilter === 'ALL' ||
                (stockFilter === 'DEFECTIVE' ? item.defectiveStock > 0 : item.stockStatus === stockFilter);

            // Category filter
            const matchCat =
                categoryFilter === 'ALL' || String(item.primaryCategoryId) === String(categoryFilter);

            // Brand filter
            const matchBrand =
                brandFilter === 'ALL' || String(item.brandId) === String(brandFilter);

            // Business status filter
            const matchBiz =
                businessStatusFilter === 'ALL' || item.status === businessStatusFilter;

            return matchSearch && matchStock && matchCat && matchBrand && matchBiz;
        });
    }, [inventoryItems, searchQuery, stockFilter, categoryFilter, brandFilter, businessStatusFilter]);

    // Paginated items
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    /**
     * KPI Stats
     */
    const kpiStats = useMemo(() => {
        let totalProducts = inventoryItems.length;
        let totalAvailableStock = 0;
        let lowOrOutCount = 0;
        let totalDefective = 0;
        let totalValue = 0;

        inventoryItems.forEach((it) => {
            totalAvailableStock += it.availableStock;
            totalDefective += it.defectiveStock;
            totalValue += it.inventoryValue;
            if (it.stockStatus === 'LOW_STOCK' || it.stockStatus === 'OUT_OF_STOCK') {
                lowOrOutCount++;
            }
        });

        return {
            totalProducts,
            totalAvailableStock,
            lowOrOutCount,
            totalDefective,
            totalValue,
        };
    }, [inventoryItems]);

    /**
     * Open Stock Card Details Modal
     */
    const handleOpenDetail = async (item: WarehouseInventoryItemUI) => {
        setSelectedItem(item);
        setActiveDetailTab('card');
        setSerialSearchFilter('');
        setIsDetailModalOpen(true);

        // Fetch fresh active serials for this product
        setProductSerialsLoading(true);
        try {
            const activeSers = await adminGoodsReceiptService.getActiveSerialsByProduct(item.productId);
            setActiveProductSerials(activeSers || []);
        } catch {
            setActiveProductSerials(item.serials || []);
        } finally {
            setProductSerialsLoading(false);
        }
    };

    /**
     * Open Change Business Status Modal
     */
    const handleOpenStatusChange = (item: WarehouseInventoryItemUI) => {
        setStatusChangeTarget(item);
        setNewStatus(item.status);
    };

    const handleConfirmStatusChange = async () => {
        if (!statusChangeTarget) return;

        setIsUpdatingStatus(true);
        try {
            await adminProductService.updateProductStatus(statusChangeTarget.productId, newStatus);
            toast.success(`Đã cập nhật trạng thái kho của "${statusChangeTarget.productName}" thành: ${newStatus}`);
            setStatusChangeTarget(null);
            await loadInventory(true);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể cập nhật trạng thái kinh doanh.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    /**
     * Export Inventory CSV Report
     */
    const handleExportInventoryCSV = () => {
        if (inventoryItems.length === 0) {
            toast.warning('Không có dữ liệu để xuất báo cáo.');
            return;
        }

        const headers = [
            'ID Sản phẩm',
            'Mã SKU',
            'Tên sản phẩm',
            'Danh mục',
            'Thương hiệu',
            'Đơn giá (VND)',
            'Tồn khả dụng (cái)',
            'Hàng lỗi (cái)',
            'Đã bán (cái)',
            'Tổng giá trị tồn (VND)',
            'Tình trạng kho',
            'Trạng thái kinh doanh',
        ];

        const rows = inventoryItems.map((it) => [
            it.productId,
            `"${it.productCode}"`,
            `"${it.productName}"`,
            `"${it.categoryName}"`,
            `"${it.brandName}"`,
            it.price,
            it.availableStock,
            it.defectiveStock,
            it.soldStock,
            it.inventoryValue,
            `"${STOCK_LEVEL_CONFIG[it.stockStatus]?.label || it.stockStatus}"`,
            `"${it.status}"`,
        ]);

        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Bao_Cao_Ton_Kho_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Đã xuất báo cáo ${inventoryItems.length} sản phẩm kho ra file CSV.`);
    };

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'stockStatus',
            label: 'Tình trạng tồn kho',
            type: 'select',
            options: [
                { label: 'Tất cả tình trạng kho', value: 'ALL' },
                { label: 'Còn hàng dồi dào (> 5)', value: 'IN_STOCK' },
                { label: 'Sắp hết hàng (1 - 5)', value: 'LOW_STOCK' },
                { label: 'Hết hàng trong kho (0)', value: 'OUT_OF_STOCK' },
                { label: 'Có hàng lỗi chờ trả NCC', value: 'DEFECTIVE' },
            ],
        },
        {
            name: 'category',
            label: 'Danh mục sản phẩm',
            type: 'select',
            options: [
                { label: 'Tất cả danh mục', value: 'ALL' },
                ...categories.map((c) => ({
                    label: c.name,
                    value: String(c.id),
                })),
            ],
        },
        {
            name: 'brand',
            label: 'Thương hiệu',
            type: 'select',
            options: [
                { label: 'Tất cả thương hiệu', value: 'ALL' },
                ...brands.map((b) => ({
                    label: b.name,
                    value: String(b.id),
                })),
            ],
        },
        {
            name: 'businessStatus',
            label: 'Trạng thái kinh doanh',
            type: 'select',
            options: [
                { label: 'Tất cả trạng thái', value: 'ALL' },
                { label: 'Đang bán (ACTIVE)', value: 'ACTIVE' },
                { label: 'Hết hàng (OUT_OF_STOCK)', value: 'OUT_OF_STOCK' },
                { label: 'Ngừng kinh doanh (INACTIVE)', value: 'INACTIVE' },
            ],
        },
    ];

    const filterValues = {
        stockStatus: stockFilter,
        category: categoryFilter,
        brand: brandFilter,
        businessStatus: businessStatusFilter,
    };

    const handleFilterChange = (newValues: Record<string, any>) => {
        if (newValues.stockStatus !== undefined) setStockFilter(newValues.stockStatus);
        if (newValues.category !== undefined) setCategoryFilter(newValues.category);
        if (newValues.brand !== undefined) setBrandFilter(newValues.brand);
        if (newValues.businessStatus !== undefined) setBusinessStatusFilter(newValues.businessStatus);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStockFilter('ALL');
        setCategoryFilter('ALL');
        setBrandFilter('ALL');
        setBusinessStatusFilter('ALL');
        setCurrentPage(1);
    };

    // Columns definition
    const columns: Column<WarehouseInventoryItemUI>[] = [
        {
            key: 'product',
            header: 'Sản phẩm kho',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <img
                        src={item.imageUrl || DEFAULT_IMG}
                        alt={item.productName}
                        className="w-11 h-11 rounded-xl object-cover border border-gray-200 shrink-0 bg-gray-50"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_IMG;
                        }}
                    />
                    <div>
                        <div
                            onClick={() => handleOpenDetail(item)}
                            className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer line-clamp-1"
                        >
                            {item.productName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                            <span>{item.productCode}</span>
                            <span>•</span>
                            <span className="text-gray-600 font-sans">{item.categoryName}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'brand',
            header: 'Thương hiệu',
            render: (item) => (
                <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-gray-400" />
                    <span>{item.brandName}</span>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Đơn giá niêm yết',
            align: 'right',
            render: (item) => (
                <div className="font-semibold text-gray-900 text-xs font-mono">{formatVND(item.price)}</div>
            ),
        },
        {
            key: 'stock',
            header: 'Tồn kho khả dụng',
            render: (item) => {
                const conf = STOCK_LEVEL_CONFIG[item.stockStatus];
                return (
                    <div className="space-y-1 w-[150px]">
                        <div className="flex items-center justify-between text-xs">
                            <span className={`font-extrabold ${conf.color}`}>
                                {item.availableStock} <span className="text-[11px] font-normal text-gray-500">cái</span>
                            </span>
                            {item.defectiveStock > 0 && (
                                <span className="text-[11px] font-medium text-rose-600">
                                    ({item.defectiveStock} lỗi)
                                </span>
                            )}
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    item.availableStock > 5
                                        ? 'bg-emerald-500'
                                        : item.availableStock > 0
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, item.availableStock * 10)}%` }}
                            />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'inventoryValue',
            header: 'Tổng giá trị lưu kho',
            align: 'right',
            render: (item) => (
                <div className="font-bold text-gray-900 text-xs font-mono">{formatVND(item.inventoryValue)}</div>
            ),
        },
        {
            key: 'stockStatus',
            header: 'Tình trạng',
            align: 'center',
            render: (item) => {
                const conf = STOCK_LEVEL_CONFIG[item.stockStatus];
                const IconComp = conf.icon;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${conf.badgeClass}`}
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
                        title="Xem Thẻ kho & Danh sách Serial"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate(`/admin/warehouse/serials?productId=${item.productId}`)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Tra cứu Serial của sản phẩm này"
                    >
                        <Barcode className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenStatusChange(item)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Đổi trạng thái kinh doanh kho"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Detail Modal Tabs
    const detailTabs: ModalTab[] = [
        { id: 'card', label: 'Thẻ kho & Tổng quan', icon: Warehouse },
        { id: 'serials', label: `Danh sách Serial (${selectedItem?.availableStock || 0} khả dụng)`, icon: Barcode },
    ];

    // Filtered serials in modal
    const filteredModalSerials = useMemo(() => {
        if (!selectedItem) return [];
        const query = serialSearchFilter.trim().toLowerCase();
        const list = activeProductSerials.length > 0 ? activeProductSerials : selectedItem.serials;
        return list.filter((s) => !query || s.serialNumber.toLowerCase().includes(query));
    }, [selectedItem, activeProductSerials, serialSearchFilter]);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                            <Warehouse className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý sản phẩm kho (Warehouse Inventory)
                            </h1>
                            <p className="text-sm text-gray-500">
                                Giám sát số lượng tồn kho khả dụng, định mức an toàn, giá trị lưu kho và truy xuất mã Serial từng mặt hàng
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => loadInventory(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportInventoryCSV}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>Xuất báo cáo tồn kho</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/import')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-sm shadow-blue-600/30"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Lập đơn nhập hàng</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Mặt hàng lưu kho</div>
                        <div className="text-xl font-bold text-gray-900">{kpiStats.totalProducts}</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tồn kho khả dụng</div>
                        <div className="text-xl font-bold text-emerald-700">{kpiStats.totalAvailableStock} cái</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Cần bổ sung hàng</div>
                        <div className="text-xl font-bold text-amber-700">{kpiStats.lowOrOutCount} mã</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Hàng lỗi kho</div>
                        <div className="text-xl font-bold text-rose-700">{kpiStats.totalDefective} cái</div>
                    </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tổng giá trị lưu kho</div>
                        <div className="text-sm font-bold text-gray-900">{formatVND(kpiStats.totalValue)}</div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Tìm kiếm theo tên sản phẩm, mã SKU, thương hiệu, danh mục..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                <AdminTable<WarehouseInventoryItemUI>
                    columns={columns}
                    data={paginatedItems}
                    rowKey="id"
                    loading={isLoading}
                    emptyText="Không tìm thấy sản phẩm kho nào phù hợp với bộ lọc."
                    emptyIcon={Package}
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
                    itemUnitName="mặt hàng"
                    onRowClick={(item) => handleOpenDetail(item)}
                />
            </div>

            {/* ======================================================== */}
            {/* STOCK CARD & SERIALS DETAIL MODAL                        */}
            {/* ======================================================== */}
            {selectedItem && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Thẻ kho sản phẩm: ${selectedItem.productName}`}
                    subtitle={`Mã SKU: ${selectedItem.productCode} • ${selectedItem.categoryName} • ${selectedItem.brandName}`}
                    icon={Warehouse}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={false}
                >
                    {/* Tab 1: Stock Card Overview */}
                    {activeDetailTab === 'card' && (
                        <div className="space-y-6 p-2">
                            {/* Product Header Card */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center gap-4">
                                <img
                                    src={selectedItem.imageUrl || DEFAULT_IMG}
                                    alt={selectedItem.productName}
                                    className="w-20 h-20 rounded-xl object-cover border border-gray-300 bg-white shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_IMG;
                                    }}
                                />
                                <div className="flex-1 space-y-1 text-center sm:text-left">
                                    <h3 className="font-bold text-gray-900 text-base">{selectedItem.productName}</h3>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-gray-500 font-mono">
                                        <span>SKU: {selectedItem.productCode}</span>
                                        <span>•</span>
                                        <span>Đơn giá: {formatVND(selectedItem.price)}</span>
                                        <span>•</span>
                                        <span className="font-sans font-medium text-blue-600">{selectedItem.brandName}</span>
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-center sm:items-end gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                            STOCK_LEVEL_CONFIG[selectedItem.stockStatus].badgeClass
                                        }`}
                                    >
                                        {STOCK_LEVEL_CONFIG[selectedItem.stockStatus].label}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            navigate('/admin/import');
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Lập đơn nhập bổ sung</span>
                                    </button>
                                </div>
                            </div>

                            {/* Stock Metrics 4-Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                                    <div className="text-xs text-emerald-800 font-medium">Tồn kho khả dụng</div>
                                    <div className="text-2xl font-bold text-emerald-900 mt-1">
                                        {selectedItem.availableStock}{' '}
                                        <span className="text-xs font-normal text-emerald-700">cái</span>
                                    </div>
                                    <div className="text-[11px] text-emerald-600 mt-1">Sẵn sàng xuất bán</div>
                                </div>

                                <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
                                    <div className="text-xs text-purple-800 font-medium">Đã xuất bán</div>
                                    <div className="text-2xl font-bold text-purple-900 mt-1">
                                        {selectedItem.soldStock}{' '}
                                        <span className="text-xs font-normal text-purple-700">cái</span>
                                    </div>
                                    <div className="text-[11px] text-purple-600 mt-1">Đã giao khách hàng</div>
                                </div>

                                <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-xl">
                                    <div className="text-xs text-rose-800 font-medium">Hàng lỗi kho</div>
                                    <div className="text-2xl font-bold text-rose-900 mt-1">
                                        {selectedItem.defectiveStock}{' '}
                                        <span className="text-xs font-normal text-rose-700">cái</span>
                                    </div>
                                    <div className="text-[11px] text-rose-600 mt-1">Chờ đổi trả NCC</div>
                                </div>

                                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                                    <div className="text-xs text-indigo-800 font-medium">Tổng giá trị lưu kho</div>
                                    <div className="text-lg font-bold text-indigo-900 mt-1">
                                        {formatVND(selectedItem.inventoryValue)}
                                    </div>
                                    <div className="text-[11px] text-indigo-600 mt-1">Tồn * Đơn giá</div>
                                </div>
                            </div>

                            {/* Details Table */}
                            <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs space-y-2.5">
                                <div className="font-semibold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                                    <Tag className="w-4 h-4 text-blue-600" />
                                    <span>Thông số tồn kho an toàn & Cảnh báo</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                    <span className="text-gray-500">Định mức an toàn tối thiểu (Min safety stock):</span>
                                    <span className="font-bold text-gray-900">5 sản phẩm</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                    <span className="text-gray-500">Đánh giá tồn kho:</span>
                                    <span className="font-semibold text-gray-800">
                                        {selectedItem.availableStock > 5
                                            ? 'Mức tồn kho ổn định, đáp ứng tốt nhu cầu bán lẻ.'
                                            : selectedItem.availableStock > 0
                                            ? 'Tồn kho dưới ngưỡng an toàn, nên lập kế hoạch nhập bổ sung từ NCC.'
                                            : 'Sản phẩm đã hết hàng trong kho. Cần lập đơn đặt hàng gấp!'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Tổng số Serial đã ghi nhận qua các đợt nhập:</span>
                                    <span className="font-bold text-gray-900">{selectedItem.totalSerialsReceived} serials</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Serials list for this product */}
                    {activeDetailTab === 'serials' && (
                        <div className="space-y-4 p-2">
                            <div className="flex flex-col sm:flex-row justify-between gap-3">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={serialSearchFilter}
                                        onChange={(e) => setSerialSearchFilter(e.target.value)}
                                        placeholder="Tra cứu số Serial của sản phẩm này..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        navigate(`/admin/warehouse/serials?productId=${selectedItem.productId}`);
                                    }}
                                    className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                                >
                                    <Barcode className="w-4 h-4" />
                                    <span>Mở trang Quản lý Serial đầy đủ</span>
                                </button>
                            </div>

                            {/* Table of Serials */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[380px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-2.5">#</th>
                                            <th className="px-4 py-2.5">Mã Serial</th>
                                            <th className="px-4 py-2.5">Trạng thái vòng đời</th>
                                            <th className="px-4 py-2.5">Ngày tiếp nhận</th>
                                            <th className="px-4 py-2.5 text-right">Hiệu lực</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {productSerialsLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                                                    Đang tải danh sách serial...
                                                </td>
                                            </tr>
                                        ) : filteredModalSerials.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                    Sản phẩm này chưa phát sinh Serial hoặc không khớp bộ lọc.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredModalSerials.map((ser, sIdx) => (
                                                <tr key={ser.id || sIdx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 text-gray-400 font-mono">{sIdx + 1}</td>
                                                    <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                                                        {ser.serialNumber}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                                                ser.status === 'IN_STOCK' || ser.status === 'GOOD_CONDITION'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : ser.status === 'SOLD'
                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    : ser.status === 'DEFECTIVE' || ser.status === 'PENDING_RETURN'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                                            }`}
                                                        >
                                                            {ser.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-500">
                                                        {formatDateTime(ser.createdDate)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        {ser.isTerminated || ser.terminated ? (
                                                            <span className="text-rose-600 font-medium">Đã hủy</span>
                                                        ) : (
                                                            <span className="text-emerald-600 font-medium">Hoạt động</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ======================================================== */}
            {/* CHANGE BUSINESS STATUS MODAL                             */}
            {/* ======================================================== */}
            {statusChangeTarget && (
                <AdminConfirmModal
                    isOpen={Boolean(statusChangeTarget)}
                    onClose={() => setStatusChangeTarget(null)}
                    onConfirm={handleConfirmStatusChange}
                    title="Đổi trạng thái kinh doanh của sản phẩm kho"
                    message={
                        <div className="space-y-3 pt-2">
                            <p className="text-xs text-gray-600">
                                Chọn trạng thái kinh doanh mới cho sản phẩm: <b>{statusChangeTarget.productName}</b>
                            </p>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as BackendProductStatus)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white font-medium"
                            >
                                <option value="ACTIVE">Đang kinh doanh & Sẵn sàng bán (ACTIVE)</option>
                                <option value="OUT_OF_STOCK">Tạm hết hàng (OUT_OF_STOCK)</option>
                                <option value="INACTIVE">Ngừng kinh doanh (INACTIVE)</option>
                            </select>
                        </div>
                    }
                    variant="info"
                    isLoading={isUpdatingStatus}
                    confirmText="Cập nhật trạng thái"
                    cancelText="Đóng"
                />
            )}
        </div>
    );
}
