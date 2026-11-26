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
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminButton,
    AdminLabel,
    type ModalTab,
} from '../../../components/admin/common/modal';
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
    { label: string; badgeClass: string; dotColor: string; icon: React.ElementType; color: string }
> = {
    IN_STOCK: {
        label: 'Còn hàng',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        icon: CheckCircle2,
        color: 'text-emerald-700',
    },
    LOW_STOCK: {
        label: 'Sắp hết hàng',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        icon: AlertTriangle,
        color: 'text-amber-700',
    },
    OUT_OF_STOCK: {
        label: 'Hết hàng',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        icon: XCircle,
        color: 'text-rose-700',
    },
};

const SERIAL_LIFECYCLE_LABELS: Record<string, { label: string; cls: string }> = {
    IN_STOCK: { label: 'Sẵn sàng bán', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    GOOD_CONDITION: { label: 'Sẵn sàng bán', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PACKING: { label: 'Đang giữ đơn', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    DELIVERING: { label: 'Đang giao hàng', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    SOLD: { label: 'Đã bán', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    DEFECTIVE: { label: 'Hàng lỗi', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    PENDING_RETURN: { label: 'Chờ hoàn trả NCC', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    RETURNING: { label: 'Đang trả NCC', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    RETURNED: { label: 'Đã hoàn trả NCC', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    USING_BY_TECHNICAL: { label: 'Bảo hành / Kỹ thuật', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
};

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
    const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL');
    const [businessStatusFilter, setBusinessStatusFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Synchronize filters with URL search params (if navigated from dashboard or external links)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qSearch = params.get('q') || params.get('search');
        const qStock = params.get('stock') || params.get('stockStatus');
        const qCat = params.get('category') || params.get('categoryId');
        const qBrand = params.get('brand') || params.get('brandId');
        const qType = params.get('type') || params.get('productType');
        const qStatus = params.get('status') || params.get('businessStatus');

        if (qSearch) setSearchQuery(qSearch);
        if (qStock) setStockFilter(qStock);
        if (qCat) setCategoryFilter(qCat);
        if (qBrand) setBrandFilter(qBrand);
        if (qType) setProductTypeFilter(qType);
        if (qStatus) setBusinessStatusFilter(qStatus);
    }, [location.search]);

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
                        productName: p.name || '',
                        productCode: p.code || '',
                        slug: p.slug || '',
                        imageUrl: p.imageUrl || null,
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
            const q = (searchQuery || '').trim().toLowerCase();
            const matchSearch =
                !q ||
                (item.productName || '').toLowerCase().includes(q) ||
                (item.productCode || '').toLowerCase().includes(q) ||
                String(item.productId ?? '').includes(q) ||
                (item.slug || '').toLowerCase().includes(q) ||
                (item.brandName || '').toLowerCase().includes(q) ||
                (item.categoryName || '').toLowerCase().includes(q) ||
                (item.serials || []).some((s) => (s?.serialNumber || '').toLowerCase().includes(q));

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

            // Product type filter
            const matchType =
                productTypeFilter === 'ALL' || item.productType === productTypeFilter;

            // Business status filter
            const matchBiz =
                businessStatusFilter === 'ALL' || item.status === businessStatusFilter;

            return matchSearch && matchStock && matchCat && matchBrand && matchType && matchBiz;
        });
    }, [
        inventoryItems,
        searchQuery,
        stockFilter,
        categoryFilter,
        brandFilter,
        productTypeFilter,
        businessStatusFilter,
    ]);

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
            const activeSersPage = await adminGoodsReceiptService.getActiveSerialsByProduct(item.productId, {
                size: 500,
            });
            setActiveProductSerials(activeSersPage.content || []);
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
    const filterFields: FilterField[] = useMemo(
        () => [
            {
                id: 'stockStatus',
                name: 'stockStatus',
                label: 'Trạng thái tồn kho',
                type: 'select',
                placeholder: 'Tất cả tình trạng kho',
                icon: Boxes,
                options: [
                    { label: 'Còn hàng (> 5)', value: 'IN_STOCK' },
                    { label: 'Sắp hết hàng (1 - 5)', value: 'LOW_STOCK' },
                    { label: 'Hết hàng (0)', value: 'OUT_OF_STOCK' },
                    { label: 'Có hàng lỗi chờ trả NCC', value: 'DEFECTIVE' },
                ],
            },
            {
                id: 'category',
                name: 'category',
                label: 'Danh mục',
                type: 'select',
                placeholder: 'Tất cả danh mục',
                icon: Layers,
                options: categories.map((c) => ({
                    label: c.name,
                    value: String(c.id),
                })),
            },
            {
                id: 'brand',
                name: 'brand',
                label: 'Thương hiệu',
                type: 'select',
                placeholder: 'Tất cả thương hiệu',
                icon: Award,
                options: brands.map((b) => ({
                    label: b.name,
                    value: String(b.id),
                })),
            },
            {
                id: 'productType',
                name: 'productType',
                label: 'Loại sản phẩm',
                type: 'select',
                placeholder: 'Tất cả loại sản phẩm',
                icon: Package,
                options: [
                    { label: 'Linh kiện (COMPONENT)', value: 'COMPONENT' },
                    { label: 'Laptop (LAPTOP)', value: 'LAPTOP' },
                    { label: 'Máy bộ / Desktop (PC)', value: 'PC' },
                    { label: 'Khác (OTHER)', value: 'OTHER' },
                ],
            },
            {
                id: 'businessStatus',
                name: 'businessStatus',
                label: 'Trạng thái kinh doanh',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Tag,
                options: [
                    { label: 'Đang bán (ACTIVE)', value: 'ACTIVE' },
                    { label: 'Hết hàng (OUT_OF_STOCK)', value: 'OUT_OF_STOCK' },
                    { label: 'Ngừng kinh doanh (INACTIVE)', value: 'INACTIVE' },
                ],
            },
        ],
        [categories, brands]
    );

    // Filter values passed to AdminFilter (only active filters with values)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (stockFilter && stockFilter !== 'ALL') {
            vals.stockStatus = stockFilter;
        }
        if (categoryFilter && categoryFilter !== 'ALL') {
            vals.category = categoryFilter;
        }
        if (brandFilter && brandFilter !== 'ALL') {
            vals.brand = brandFilter;
        }
        if (productTypeFilter && productTypeFilter !== 'ALL') {
            vals.productType = productTypeFilter;
        }
        if (businessStatusFilter && businessStatusFilter !== 'ALL') {
            vals.businessStatus = businessStatusFilter;
        }
        return vals;
    }, [stockFilter, categoryFilter, brandFilter, productTypeFilter, businessStatusFilter]);

    const handleSearchChange = (q: string) => {
        setSearchQuery(q);
        setCurrentPage(1);
    };

    const handleFilterChange = (newValues: Record<string, any>) => {
        setStockFilter(newValues.stockStatus || 'ALL');
        setCategoryFilter(newValues.category || 'ALL');
        setBrandFilter(newValues.brand || 'ALL');
        setProductTypeFilter(newValues.productType || 'ALL');
        setBusinessStatusFilter(newValues.businessStatus || 'ALL');
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStockFilter('ALL');
        setCategoryFilter('ALL');
        setBrandFilter('ALL');
        setProductTypeFilter('ALL');
        setBusinessStatusFilter('ALL');
        setCurrentPage(1);
    };

    const renderStockStatusIndicator = (status: StockLevelStatus) => {
        const conf = STOCK_LEVEL_CONFIG[status];
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dotColor}`} />
                <span className={status === 'OUT_OF_STOCK' ? 'text-slate-500' : 'text-slate-700'}>
                    {conf.label}
                </span>
            </span>
        );
    };

    // Columns definition
    const columns: Column<WarehouseInventoryItemUI>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            render: (item) => (
                <div className="flex items-center gap-3 min-w-0">
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0 bg-slate-50"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item);
                            }}
                            className="text-sm font-medium text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm"
                            title={item.productName}
                        >
                            {item.productName}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">
                            <span className="font-mono tabular-nums text-slate-600">{item.productCode}</span>
                            <span className="text-slate-300">·</span>
                            <span className="truncate">{item.categoryName}</span>
                            {item.brandName !== '---' && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="truncate">{item.brandName}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'totalSerials',
            header: 'Tổng tồn',
            align: 'right',
            render: (item) => (
                <div className="text-xs font-medium text-slate-700 text-right tabular-nums whitespace-nowrap">
                    {item.totalSerialsReceived.toLocaleString('vi-VN')}
                </div>
            ),
        },
        {
            key: 'availableStock',
            header: 'Khả dụng',
            align: 'right',
            render: (item) => (
                <div
                    className={`text-sm font-semibold text-right tabular-nums whitespace-nowrap ${
                        item.stockStatus === 'OUT_OF_STOCK'
                            ? 'text-rose-600'
                            : item.stockStatus === 'LOW_STOCK'
                            ? 'text-amber-700'
                            : 'text-slate-900'
                    }`}
                >
                    {item.availableStock.toLocaleString('vi-VN')}
                </div>
            ),
        },
        {
            key: 'soldStock',
            header: 'Đã bán / Giữ',
            align: 'right',
            render: (item) => (
                <div className="text-xs text-slate-600 text-right tabular-nums whitespace-nowrap">
                    {item.soldStock.toLocaleString('vi-VN')}
                </div>
            ),
        },
        {
            key: 'defectiveStock',
            header: 'Lỗi / BH',
            align: 'right',
            render: (item) => {
                const count = item.defectiveStock + item.technicalStock;
                return (
                    <div
                        className={`text-xs text-right tabular-nums whitespace-nowrap ${
                            count > 0 ? 'font-medium text-rose-600' : 'text-slate-400'
                        }`}
                    >
                        {count.toLocaleString('vi-VN')}
                    </div>
                );
            },
        },
        {
            key: 'inventoryValue',
            header: 'Giá trị tồn',
            align: 'right',
            render: (item) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                        {formatVND(item.inventoryValue)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                        ĐG: {formatVND(item.price)}
                    </div>
                </div>
            ),
        },
        {
            key: 'stockStatus',
            header: 'Trạng thái',
            render: (item) => renderStockStatusIndicator(item.stockStatus),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(item)}
                    viewLabel="Xem Thẻ kho & Danh sách Serial"
                    actions={[
                        {
                            key: 'status-change',
                            label: 'Đổi trạng thái kinh doanh kho',
                            description: 'Cập nhật trạng thái mở bán / hết hàng',
                            icon: SlidersHorizontal,
                            variant: 'warning',
                            onClick: () => handleOpenStatusChange(item),
                        },
                        {
                            key: 'lookup-serials',
                            label: 'Tra cứu Serial sản phẩm',
                            description: 'Mở danh sách Serial thuộc sản phẩm này',
                            icon: Barcode,
                            variant: 'primary',
                            onClick: () =>
                                navigate(`/admin/warehouse/serials?productId=${item.productId}`),
                        },
                    ]}
                />
            ),
        },
    ];

    // Detail Modal Tabs
    const detailTabs: ModalTab[] = [
        { id: 'card', label: 'Thẻ kho & Tổng quan', icon: Warehouse },
        { id: 'serials', label: `Danh sách Serial (${selectedItem?.availableStock || 0})`, icon: Barcode },
    ];

    // Filtered serials in modal
    const filteredModalSerials = useMemo(() => {
        if (!selectedItem) return [];
        const query = (serialSearchFilter || '').trim().toLowerCase();
        const list = activeProductSerials.length > 0 ? activeProductSerials : (selectedItem.serials || []);
        return list.filter((s) => !query || (s?.serialNumber || '').toLowerCase().includes(query));
    }, [selectedItem, activeProductSerials, serialSearchFilter]);

    return (
        <div className="space-y-4">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý sản phẩm trong kho
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                        {kpiStats.totalProducts.toLocaleString('vi-VN')} mặt hàng · {kpiStats.totalAvailableStock.toLocaleString('vi-VN')} khả dụng · {kpiStats.lowOrOutCount} cần bổ sung · {kpiStats.totalDefective} lỗi
                    </p>
                </div>

                {/* Header Utility Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadInventory(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportInventoryCSV}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Xuất CSV</span>
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
                        onClick={() => loadInventory(true)}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-md text-xs font-medium hover:bg-rose-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Single-row Toolbar: Search + Filters + Primary CTA */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Tìm theo tên sản phẩm, mã SKU, thương hiệu, danh mục hoặc mã Serial..."
                fields={filterFields}
                values={filterValues}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                actions={
                    <button
                        type="button"
                        onClick={() => navigate('/admin/import')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Lập đơn nhập hàng</span>
                    </button>
                }
            />

            {/* Main Table (Border-first, no outer card-in-card) */}
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

            {/* ======================================================== */}
            {/* STOCK CARD & SERIALS DETAIL MODAL                        */}
            {/* ======================================================== */}
            {selectedItem && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="truncate">{selectedItem.productName}</span>
                            <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {selectedItem.productCode}
                            </span>
                        </div>
                    }
                    subtitle={`${selectedItem.categoryName} • ${selectedItem.brandName}`}
                    icon={Warehouse}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={true}
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="text-xs text-slate-500 tabular-nums">
                                Giá trị lưu kho:{' '}
                                <strong className="text-sm font-semibold text-slate-900">
                                    {formatVND(selectedItem.inventoryValue)}
                                </strong>
                            </div>
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    size="sm"
                                    variant="primary"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        navigate('/admin/import');
                                    }}
                                    icon={Plus}
                                >
                                    Lập đơn nhập bổ sung
                                </AdminButton>
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
                    {/* Tab 1: Stock Card Overview */}
                    {activeDetailTab === 'card' && (
                        <div className="space-y-4">
                            {/* Flat Product Summary Bar */}
                            <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {selectedItem.imageUrl ? (
                                        <img
                                            src={selectedItem.imageUrl}
                                            alt={selectedItem.productName}
                                            className="w-12 h-12 rounded-md object-cover border border-slate-200 bg-white shrink-0"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                            <Package className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-900 text-sm truncate">{selectedItem.productName}</h3>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5 tabular-nums">
                                            <span className="font-mono text-slate-700">{selectedItem.productCode}</span>
                                            <span className="text-slate-300">·</span>
                                            <span>Đơn giá: <strong className="text-slate-800">{formatVND(selectedItem.price)}</strong></span>
                                            <span className="text-slate-300">·</span>
                                            <span>{selectedItem.brandName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {renderStockStatusIndicator(selectedItem.stockStatus)}
                                </div>
                            </div>

                            {/* Flat 4-column Stock Metrics Strip */}
                            <div className="border border-slate-200 rounded-md bg-white grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-x divide-slate-200 tabular-nums">
                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Tồn khả dụng</div>
                                    <div className="text-lg font-semibold text-emerald-700 mt-0.5">
                                        {selectedItem.availableStock.toLocaleString('vi-VN')}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">Sẵn sàng xuất bán</div>
                                </div>

                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Đã bán / Giữ chỗ</div>
                                    <div className="text-lg font-semibold text-slate-900 mt-0.5">
                                        {selectedItem.soldStock.toLocaleString('vi-VN')}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">Đang giao hoặc đã bán</div>
                                </div>

                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Hàng lỗi / Bảo hành</div>
                                    <div className="text-lg font-semibold text-rose-700 mt-0.5">
                                        {(selectedItem.defectiveStock + selectedItem.technicalStock).toLocaleString('vi-VN')}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">Chờ trả NCC / Kỹ thuật</div>
                                </div>

                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Tổng giá trị tồn</div>
                                    <div className="text-lg font-semibold text-slate-900 mt-0.5">
                                        {formatVND(selectedItem.inventoryValue)}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">Khả dụng × Đơn giá</div>
                                </div>
                            </div>

                            {/* Flat Safety Stock & Spec Table */}
                            <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200/80 text-xs">
                                <div className="px-4 py-2.5 bg-slate-50 font-semibold text-slate-700">
                                    Thông số tồn kho an toàn & Đánh giá
                                </div>
                                <div className="px-4 py-2.5 flex justify-between gap-4">
                                    <span className="text-slate-500">Định mức an toàn tối thiểu</span>
                                    <span className="font-semibold text-slate-900 tabular-nums">5 sản phẩm</span>
                                </div>
                                <div className="px-4 py-2.5 flex justify-between gap-4">
                                    <span className="text-slate-500">Tổng Serial đã ghi nhận qua các đợt nhập</span>
                                    <span className="font-semibold text-slate-900 tabular-nums">{selectedItem.totalSerialsReceived.toLocaleString('vi-VN')} serial</span>
                                </div>
                                <div className="px-4 py-2.5 flex justify-between gap-4">
                                    <span className="text-slate-500 shrink-0">Đánh giá tồn kho</span>
                                    <span className="font-medium text-slate-800 text-right">
                                        {selectedItem.availableStock > 5
                                            ? 'Mức tồn kho ổn định, đáp ứng tốt nhu cầu bán lẻ.'
                                            : selectedItem.availableStock > 0
                                            ? 'Tồn kho dưới ngưỡng an toàn, nên lập kế hoạch nhập bổ sung.'
                                            : 'Sản phẩm đã hết hàng trong kho, cần lập đơn đặt hàng.'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Serials list for this product */}
                    {activeDetailTab === 'serials' && (
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between gap-2.5">
                                <div className="flex-1">
                                    <AdminInput
                                        type="text"
                                        value={serialSearchFilter}
                                        onChange={(e) => setSerialSearchFilter(e.target.value)}
                                        placeholder="Tra cứu số Serial của sản phẩm này..."
                                        prefixIcon={Search}
                                        className="font-mono tabular-nums"
                                    />
                                </div>

                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        navigate(`/admin/warehouse/serials?productId=${selectedItem.productId}`);
                                    }}
                                    icon={Barcode}
                                >
                                    Quản lý Serial đầy đủ
                                </AdminButton>
                            </div>

                            {/* Compact Serials Table */}
                            <div className="border border-slate-200 rounded-md overflow-x-auto bg-white max-h-[380px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                                            <th className="px-3.5 py-2.5">Mã Serial</th>
                                            <th className="px-3.5 py-2.5">Trạng thái vòng đời</th>
                                            <th className="px-3.5 py-2.5 text-right">Ngày tiếp nhận</th>
                                            <th className="px-3.5 py-2.5 text-right">Hiệu lực</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/80">
                                        {productSerialsLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-2" />
                                                    Đang tải danh sách serial...
                                                </td>
                                            </tr>
                                        ) : filteredModalSerials.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                    Sản phẩm này chưa phát sinh Serial hoặc không khớp bộ lọc.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredModalSerials.map((ser, sIdx) => {
                                                const stConf = SERIAL_LIFECYCLE_LABELS[ser.status] || {
                                                    label: ser.status,
                                                    cls: 'bg-slate-50 text-slate-700 border-slate-200',
                                                };
                                                return (
                                                    <tr key={ser.id || sIdx} className="hover:bg-slate-50">
                                                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono tabular-nums">{sIdx + 1}</td>
                                                        <td className="px-3.5 py-2.5 font-mono font-medium tabular-nums text-slate-900">
                                                            {ser.serialNumber}
                                                        </td>
                                                        <td className="px-3.5 py-2.5">
                                                            <span
                                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${stConf.cls}`}
                                                            >
                                                                {stConf.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-right text-slate-500 tabular-nums whitespace-nowrap">
                                                            {formatDateTime(ser.createdDate)}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                                            {ser.isTerminated || ser.terminated ? (
                                                                <span className="text-rose-600 font-medium">Đã hủy</span>
                                                            ) : (
                                                                <span className="text-emerald-700 font-medium">Hoạt động</span>
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
                            <p className="text-xs text-slate-600">
                                Chọn trạng thái kinh doanh mới cho sản phẩm: <strong className="text-slate-900">{statusChangeTarget.productName}</strong>
                            </p>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as BackendProductStatus)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
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
