import React, { useState, useMemo, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    Filter,
    RotateCcw,
    Download,
    CheckCircle2,
    XCircle,
    BarChart3,
    LineChart as LineChartIcon,
    Layers,
    Award,
    Package,
    Tag,
    Clock,
    FileSpreadsheet,
    Eye,
    Sparkles,
    Info,
    ArrowUpRight,
    ShoppingBag,
    Cpu,
    Printer,
} from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    BarChart,
    AreaChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { DataTable, type Column } from '../../../../components/admin/common/table';
import { AdminModal, AdminButton } from '../../../../components/admin/common/modal';
import { useToast } from '../../../../components/admin/common/toast';
import { SelectDropdown } from '../../../../components/admin/common/selectDropdown';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
    TimeSeriesPointDto,
    PeriodComparisonDto,
    BrandBreakdownDto,
    CategoryBreakdownDto,
    ProductMatrixDto,
    DashboardKpiResponse,
} from '../../../../types/adminAnalytics';
import {
    MOCK_REVENUE_TRANSACTIONS,
    PC_CATEGORIES,
    PC_CLASSIFICATIONS,
    PC_BRANDS,
    PC_PRODUCTS,
    getPeriodKeyAndLabel,
    type PeriodGrouping,
    type ReportDimensionTab,
    type AggregatedRevenueRow,
    type RevenueTransactionRecord,
} from '../../../../data/mockRevenueData';

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

function formatCompactVND(value: number): string {
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '')} tỷ`;
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(0)} tr`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(0)}k`;
    }
    return String(value);
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat('vi-VN').format(num || 0);
}

function formatDateVN(isoDate: string): string {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
}

type ChartMode = 'COMPOSED' | 'BAR' | 'AREA';

export default function RevenueReportPage() {
    const { toast } = useToast();

    // ==================== 1. FILTER BAR STATES ====================
    const [fromDate, setFromDate] = useState<string>('2026-01-01');
    const [toDate, setToDate] = useState<string>('2026-11-12');
    const [periodGroup, setPeriodGroup] = useState<PeriodGrouping>('MONTH');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
    const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
    const [selectedProduct, setSelectedProduct] = useState<string>('ALL');

    // Quick preset date ranges
    const [activeDatePreset, setActiveDatePreset] = useState<string>('YEAR_2026');

    // ==================== 2. CHART & TABLE STATES ====================
    const [chartMode, setChartMode] = useState<ChartMode>('COMPOSED');
    const [activeDimensionTab, setActiveDimensionTab] = useState<ReportDimensionTab>('TIME');
    const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Drill-down modal state
    const [drilldownRow, setDrilldownRow] = useState<AggregatedRevenueRow | null>(null);

    // Backend Analytics Live API States
    const [backendKpi, setBackendKpi] = useState<DashboardKpiResponse | null>(null);
    const [backendTrend, setBackendTrend] = useState<TimeSeriesPointDto[] | null>(null);
    const [backendComparison, setBackendComparison] = useState<PeriodComparisonDto | null>(null);
    const [backendBrandList, setBackendBrandList] = useState<BrandBreakdownDto[] | null>(null);
    const [backendMatrix, setBackendMatrix] = useState<ProductMatrixDto[] | null>(null);
    const [isApiLoading, setIsApiLoading] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        const fetchBackendAnalytics = async () => {
            setIsApiLoading(true);
            try {
                const filter = {
                    startDate: fromDate,
                    endDate: toDate,
                    groupBy: periodGroup as any,
                };
                const [kpiRes, trendRes, compRes, brandRes, matrixRes] = await Promise.allSettled([
                    adminAnalyticsService.getDashboardKpis(filter),
                    adminAnalyticsService.getRevenueTrend(filter),
                    adminAnalyticsService.compareRevenue({ ...filter, compareWith: 'PREVIOUS_PERIOD' }),
                    adminAnalyticsService.getRevenueByBrand(filter),
                    adminAnalyticsService.getProductPerformanceMatrix(filter),
                ]);

                if (isMounted) {
                    if (kpiRes.status === 'fulfilled') setBackendKpi(kpiRes.value);
                    if (trendRes.status === 'fulfilled' && trendRes.value.length > 0) setBackendTrend(trendRes.value);
                    if (compRes.status === 'fulfilled') setBackendComparison(compRes.value);
                    if (brandRes.status === 'fulfilled' && brandRes.value.length > 0) setBackendBrandList(brandRes.value);
                    if (matrixRes.status === 'fulfilled' && matrixRes.value.length > 0) setBackendMatrix(matrixRes.value);
                }
            } catch {
                // Keep fallback data active if BE is not answering
            } finally {
                if (isMounted) setIsApiLoading(false);
            }
        };

        fetchBackendAnalytics();
        return () => {
            isMounted = false;
        };
    }, [fromDate, toDate, periodGroup]);

    // Danh sách sản phẩm trong dropdown được lọc thông minh theo Danh mục / Phân loại / Thương hiệu đang chọn
    const availableProductsForFilter = useMemo(() => {
        return PC_PRODUCTS.filter((p) => {
            if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
            if (selectedClassification !== 'ALL' && p.classificationId !== selectedClassification) return false;
            if (selectedBrand !== 'ALL' && p.brandId !== selectedBrand) return false;
            return true;
        });
    }, [selectedCategory, selectedClassification, selectedBrand]);

    // Áp dụng chọn nhanh khoảng thời gian
    const handleApplyDatePreset = (preset: string) => {
        setActiveDatePreset(preset);
        setCurrentPage(1);
        if (preset === 'LAST_30_DAYS') {
            setFromDate('2026-10-13');
            setToDate('2026-11-12');
            setPeriodGroup('DAY');
        } else if (preset === 'THIS_QUARTER') {
            setFromDate('2026-10-01');
            setToDate('2026-11-12');
            setPeriodGroup('DAY');
        } else if (preset === 'LAST_6_MONTHS') {
            setFromDate('2026-06-01');
            setToDate('2026-11-12');
            setPeriodGroup('MONTH');
        } else if (preset === 'YEAR_2026') {
            setFromDate('2026-01-01');
            setToDate('2026-11-12');
            setPeriodGroup('MONTH');
        } else if (preset === 'ALL_TIME') {
            setFromDate('2025-01-01');
            setToDate('2026-11-12');
            setPeriodGroup('QUARTER');
        }
    };

    const handleResetFilters = () => {
        setFromDate('2026-01-01');
        setToDate('2026-11-12');
        setPeriodGroup('MONTH');
        setSelectedCategory('ALL');
        setSelectedClassification('ALL');
        setSelectedBrand('ALL');
        setSelectedProduct('ALL');
        setActiveDatePreset('YEAR_2026');
        setTableSearchQuery('');
        setCurrentPage(1);
        toast.info('Đã đặt lại toàn bộ bộ lọc báo cáo doanh thu về mặc định.');
    };

    // ==================== 3. FILTERED TRANSACTIONS (CURRENT & PREVIOUS PERIOD) ====================
    // Lọc theo các chiều sản phẩm (Danh mục, Phân loại, Thương hiệu, Sản phẩm)
    const dimensionFilteredRecords = useMemo(() => {
        return MOCK_REVENUE_TRANSACTIONS.filter((tx) => {
            if (selectedCategory !== 'ALL' && tx.categoryId !== selectedCategory) return false;
            if (selectedClassification !== 'ALL' && tx.classificationId !== selectedClassification) return false;
            if (selectedBrand !== 'ALL' && tx.brandId !== selectedBrand) return false;
            if (selectedProduct !== 'ALL' && tx.productId !== selectedProduct) return false;
            return true;
        });
    }, [selectedCategory, selectedClassification, selectedBrand, selectedProduct]);

    // Giao dịch trong khoảng thời gian đang chọn
    const currentPeriodRecords = useMemo(() => {
        return dimensionFilteredRecords.filter((tx) => {
            if (fromDate && tx.date < fromDate) return false;
            if (toDate && tx.date > toDate) return false;
            return true;
        });
    }, [dimensionFilteredRecords, fromDate, toDate]);

    // Giao dịch của kỳ liền trước (cùng độ dài ngày) để tính % tăng trưởng thực tế
    const previousPeriodRecords = useMemo(() => {
        const startMs = new Date(`${fromDate}T00:00:00`).getTime();
        const endMs = new Date(`${toDate}T00:00:00`).getTime();
        if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return [];

        const durationMs = Math.max(86400000, endMs - startMs + 86400000);
        const prevEndDate = new Date(startMs - 86400000).toISOString().slice(0, 10);
        const prevStartDate = new Date(startMs - durationMs).toISOString().slice(0, 10);

        return dimensionFilteredRecords.filter(
            (tx) => tx.date >= prevStartDate && tx.date <= prevEndDate
        );
    }, [dimensionFilteredRecords, fromDate, toDate]);

    // ==================== 4. KPI METRICS CALCULATION ====================
    const kpiMetrics = useMemo(() => {
        if (backendKpi && backendKpi.totalRevenue > 0) {
            const netActualRevenue = backendKpi.totalRevenue;
            const completedOrdersCount = Number(backendKpi.totalPaidInvoices);
            const totalUnitsSold = Number(backendKpi.totalProductsSold);
            const prevNetRevenue = backendComparison ? backendComparison.comparedRevenue : 0;
            const growthDiff = backendComparison ? backendComparison.growthAmount : 0;
            const growthPercent = backendComparison ? backendComparison.growthRatePercentage : 0;
            const grossRevenue = netActualRevenue;
            const cancelledReturnedAmount = 0;
            const cancelledReturnedOrdersCount = 0;
            const deductionRate = 0;

            return {
                grossRevenue,
                cancelledReturnedAmount,
                netActualRevenue,
                completedOrdersCount,
                cancelledReturnedOrdersCount,
                totalOrdersCount: completedOrdersCount,
                totalUnitsSold,
                prevNetRevenue,
                growthDiff,
                growthPercent,
                deductionRate,
            };
        }

        let grossRevenue = 0;
        let cancelledReturnedAmount = 0;
        let netActualRevenue = 0;
        let completedOrdersCount = 0;
        let cancelledReturnedOrdersCount = 0;
        let totalUnitsSold = 0;

        currentPeriodRecords.forEach((tx) => {
            grossRevenue += tx.grossAmount;
            if (tx.status === 'DELIVERED') {
                // Chỉ tính đơn trạng thái "Đã đưa tới khách hàng" vào Doanh thu thuần thực tế
                netActualRevenue += tx.netActualRevenue;
                completedOrdersCount += 1;
                totalUnitsSold += tx.quantity;
            } else {
                // Đơn hủy / hoàn trả bị loại trừ khỏi doanh thu thực
                cancelledReturnedAmount += tx.deductionAmount;
                cancelledReturnedOrdersCount += 1;
            }
        });

        const prevNetRevenue = previousPeriodRecords.reduce(
            (sum, tx) => sum + (tx.status === 'DELIVERED' ? tx.netActualRevenue : 0),
            0
        );

        const growthPercent =
            prevNetRevenue > 0
                ? ((netActualRevenue - prevNetRevenue) / prevNetRevenue) * 100
                : netActualRevenue > 0
                  ? 100
                  : 0;

        const deductionRate = grossRevenue > 0 ? (cancelledReturnedAmount / grossRevenue) * 100 : 0;

        return {
            grossRevenue,
            cancelledReturnedAmount,
            netActualRevenue,
            completedOrdersCount,
            cancelledReturnedOrdersCount,
            totalOrdersCount: currentPeriodRecords.length,
            totalUnitsSold,
            prevNetRevenue,
            growthDiff: netActualRevenue - prevNetRevenue,
            growthPercent,
            deductionRate,
        };
    }, [currentPeriodRecords, previousPeriodRecords]);

    // ==================== 5. MAIN TIME-SERIES CHART DATA ====================
    const timeSeriesChartData = useMemo(() => {
        if (backendTrend && backendTrend.length > 0) {
            return backendTrend.map((p) => ({
                key: p.timeBucket,
                periodLabel: p.label,
                sortKey: p.timeBucket,
                grossRevenue: p.revenue,
                deductionRevenue: 0,
                netRevenue: p.revenue,
                completedOrders: p.orderCount,
                unitsSold: p.orderCount,
            }));
        }

        const map = new Map<
            string,
            {
                key: string;
                periodLabel: string;
                sortKey: string;
                grossRevenue: number;
                deductionRevenue: number;
                netRevenue: number;
                completedOrders: number;
                unitsSold: number;
            }
        >();

        currentPeriodRecords.forEach((tx) => {
            const { key, label, sortKey } = getPeriodKeyAndLabel(tx.date, periodGroup);
            const existing = map.get(key) || {
                key,
                periodLabel: label,
                sortKey,
                grossRevenue: 0,
                deductionRevenue: 0,
                netRevenue: 0,
                completedOrders: 0,
                unitsSold: 0,
            };

            existing.grossRevenue += tx.grossAmount;
            if (tx.status === 'DELIVERED') {
                existing.netRevenue += tx.netActualRevenue;
                existing.completedOrders += 1;
                existing.unitsSold += tx.quantity;
            } else {
                existing.deductionRevenue += tx.deductionAmount;
            }

            map.set(key, existing);
        });

        return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [currentPeriodRecords, periodGroup]);

    // ==================== 6. MULTI-DIMENSIONAL DATATABLE AGGREGATION ====================
    const aggregatedTableRows = useMemo<AggregatedRevenueRow[]>(() => {
        const totalNetAll = kpiMetrics.netActualRevenue || 1;

        if (activeDimensionTab === 'BRAND' && backendBrandList && backendBrandList.length > 0) {
            return backendBrandList.map((b) => ({
                id: String(b.brandId || b.brandName),
                name: b.brandName,
                subLabel: `Thương hiệu chính hãng`,
                badgeText: 'Thương hiệu',
                completedOrders: 0,
                cancelledReturnOrders: 0,
                unitsSold: 0,
                grossRevenue: b.revenue,
                deductionRevenue: 0,
                netRevenue: b.revenue,
                sharePercent: b.percentage,
                cancelledReturnedRate: 0,
                sortOrder: b.revenue,
            }));
        }

        if (activeDimensionTab === 'PRODUCT' && backendMatrix && backendMatrix.length > 0) {
            return backendMatrix.map((m) => ({
                id: String(m.productId),
                name: m.productName,
                subLabel: `SKU: ${m.productCode}`,
                badgeText: `${m.brandName} • ${m.categoryName}`,
                completedOrders: 0,
                cancelledReturnOrders: 0,
                unitsSold: m.quantitySold,
                grossRevenue: m.revenue,
                deductionRevenue: 0,
                netRevenue: m.revenue,
                sharePercent: totalNetAll > 0 ? Number(((m.revenue / totalNetAll) * 100).toFixed(2)) : 0,
                cancelledReturnedRate: 0,
                sortOrder: m.revenue,
            }));
        }

        const map = new Map<string, AggregatedRevenueRow>();

        currentPeriodRecords.forEach((tx) => {
            let groupKey = '';
            let displayName = '';
            let subLabel: string | undefined;
            let badgeText: string | undefined;
            let sortOrder: string | number = '';

            if (activeDimensionTab === 'TIME') {
                const p = getPeriodKeyAndLabel(tx.date, periodGroup);
                groupKey = p.key;
                displayName = p.label;
                subLabel = `Chu kỳ ${
                    periodGroup === 'DAY'
                        ? 'Ngày'
                        : periodGroup === 'MONTH'
                          ? 'Tháng'
                          : periodGroup === 'QUARTER'
                            ? 'Quý'
                            : 'Năm'
                }`;
                sortOrder = p.sortKey;
            } else if (activeDimensionTab === 'CATEGORY') {
                groupKey = tx.categoryId;
                displayName = tx.categoryName;
                subLabel = `Mã danh mục: ${tx.categoryId}`;
                badgeText = 'Danh mục phần cứng';
            } else if (activeDimensionTab === 'CLASSIFICATION') {
                groupKey = tx.classificationId;
                displayName = tx.classificationName;
                subLabel = `Mã phân loại: ${tx.classificationId}`;
                badgeText = 'Phân khúc PC';
            } else if (activeDimensionTab === 'BRAND') {
                groupKey = tx.brandId;
                displayName = tx.brandName;
                subLabel = `Mã hãng: ${tx.brandId}`;
                badgeText = 'Thương hiệu chính hãng';
            } else {
                // PRODUCT
                groupKey = tx.productId;
                displayName = tx.productName;
                subLabel = `SKU: ${tx.productSku} • Đơn giá: ${formatVND(tx.unitPrice)}`;
                badgeText = `${tx.brandName} • ${tx.categoryName}`;
            }

            const row = map.get(groupKey) || {
                id: groupKey,
                name: displayName,
                subLabel,
                badgeText,
                completedOrders: 0,
                cancelledReturnOrders: 0,
                unitsSold: 0,
                grossRevenue: 0,
                deductionRevenue: 0,
                netRevenue: 0,
                sharePercent: 0,
                sortOrder,
            };

            row.grossRevenue += tx.grossAmount;
            if (tx.status === 'DELIVERED') {
                row.completedOrders += 1;
                row.unitsSold += tx.quantity;
                row.netRevenue += tx.netActualRevenue;
            } else {
                row.cancelledReturnOrders += 1;
                row.deductionRevenue += tx.deductionAmount;
            }

            map.set(groupKey, row);
        });

        const list = Array.from(map.values()).map((r) => ({
            ...r,
            sharePercent:
                kpiMetrics.netActualRevenue > 0
                    ? Number(((r.netRevenue / totalNetAll) * 100).toFixed(2))
                    : 0,
        }));

        // Mặc định tab TIME sắp xếp theo thời gian mới nhất/cũ nhất, các tab khác theo Doanh thu thuần giảm dần
        if (activeDimensionTab === 'TIME') {
            return list.sort((a, b) => String(b.sortOrder).localeCompare(String(a.sortOrder)));
        }
        return list.sort((a, b) => b.netRevenue - a.netRevenue);
    }, [currentPeriodRecords, activeDimensionTab, periodGroup, kpiMetrics.netActualRevenue]);

    // Lọc theo từ khóa tìm kiếm trên DataTable
    const searchedTableRows = useMemo(() => {
        const q = tableSearchQuery.trim().toLowerCase();
        if (!q) return aggregatedTableRows;
        return aggregatedTableRows.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                (r.subLabel && r.subLabel.toLowerCase().includes(q)) ||
                (r.badgeText && r.badgeText.toLowerCase().includes(q))
        );
    }, [aggregatedTableRows, tableSearchQuery]);

    // Phân trang
    const totalPages = Math.max(1, Math.ceil(searchedTableRows.length / pageSize));
    const paginatedTableRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return searchedTableRows.slice(start, start + pageSize);
    }, [searchedTableRows, currentPage, pageSize]);

    // Các đơn hàng thuộc dòng đang mở Modal chi tiết (Drill-down)
    const drilldownTransactions = useMemo<RevenueTransactionRecord[]>(() => {
        if (!drilldownRow) return [];
        return currentPeriodRecords.filter((tx) => {
            if (activeDimensionTab === 'TIME') {
                return getPeriodKeyAndLabel(tx.date, periodGroup).key === drilldownRow.id;
            }
            if (activeDimensionTab === 'CATEGORY') return tx.categoryId === drilldownRow.id;
            if (activeDimensionTab === 'CLASSIFICATION') return tx.classificationId === drilldownRow.id;
            if (activeDimensionTab === 'BRAND') return tx.brandId === drilldownRow.id;
            return tx.productId === drilldownRow.id;
        });
    }, [drilldownRow, currentPeriodRecords, activeDimensionTab, periodGroup]);

    // ==================== 7. EXPORT CSV / EXCEL ====================
    const handleExportCSV = () => {
        if (searchedTableRows.length === 0) {
            toast.warning('Không có dữ liệu thống kê để xuất báo cáo.');
            return;
        }

        const dimensionHeader =
            activeDimensionTab === 'TIME'
                ? 'Mốc thời gian'
                : activeDimensionTab === 'CATEGORY'
                  ? 'Danh mục sản phẩm'
                  : activeDimensionTab === 'CLASSIFICATION'
                    ? 'Phân loại sản phẩm'
                    : activeDimensionTab === 'BRAND'
                      ? 'Thương hiệu'
                      : 'Sản phẩm (SKU)';

        const headers = [
            dimensionHeader,
            'Thông tin bổ sung',
            'Số đơn hoàn tất (Đã đưa tới KH)',
            'Sản lượng bán (SP)',
            'Doanh thu gộp (VNĐ)',
            'Giảm trừ hoàn/hủy (VNĐ)',
            'Doanh thu thuần thực tế (VNĐ)',
            'Tỷ trọng (%)',
        ];

        const rows = searchedTableRows.map((r) => [
            `"${r.name.replace(/"/g, '""')}"`,
            `"${(r.subLabel || '').replace(/"/g, '""')}"`,
            r.completedOrders,
            r.unitsSold,
            r.grossRevenue,
            r.deductionRevenue,
            r.netRevenue,
            `${r.sharePercent}%`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Doanh_Thu_${activeDimensionTab}_${fromDate}_${toDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(
            `Đã xuất báo cáo doanh thu (${searchedTableRows.length} dòng) ra file CSV chuẩn Excel.`
        );
    };

    // ==================== 8. DATATABLE COLUMNS DEFINITION ====================
    const dimensionLabelMap: Record<ReportDimensionTab, string> = {
        TIME: 'Mốc thời gian',
        CATEGORY: 'Tên danh mục linh kiện',
        CLASSIFICATION: 'Tên phân loại / phân khúc',
        BRAND: 'Thương hiệu (Hãng)',
        PRODUCT: 'Tên sản phẩm & Mã SKU',
    };

    const columns: Column<AggregatedRevenueRow>[] = useMemo(
        () => [
            {
                key: 'name',
                header: dimensionLabelMap[activeDimensionTab],
                sortable: true,
                sortValue: (item) =>
                    activeDimensionTab === 'TIME' ? String(item.sortOrder || item.name) : item.name,
                render: (item, idx) => {
                    const rankNumber = (currentPage - 1) * pageSize + idx + 1;
                    return (
                        <div className="flex items-start gap-2.5 max-w-md">
                            {activeDimensionTab !== 'TIME' && (
                                <span className="font-mono text-[11px] font-medium text-slate-400 tabular-nums shrink-0 mt-0.5 w-6">
                                    #{rankNumber}
                                </span>
                            )}
                            <div className="min-w-0 space-y-0.5">
                                <div className="font-medium text-slate-900 text-xs leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
                                    {item.name}
                                </div>
                                {item.subLabel && (
                                    <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                                        {item.subLabel}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'completedOrders',
                header: 'Số đơn hoàn tất',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.completedOrders,
                render: (item) => (
                    <div className="text-right tabular-nums whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-900">
                            {formatNumber(item.completedOrders)} đơn
                        </div>
                        {item.cancelledReturnOrders > 0 && (
                            <div className="text-[11px] text-rose-600">
                                {item.cancelledReturnOrders} hủy/hoàn
                            </div>
                        )}
                    </div>
                ),
            },
            {
                key: 'unitsSold',
                header: 'Sản lượng',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.unitsSold,
                render: (item) => (
                    <span className="font-mono text-xs font-medium text-slate-800 tabular-nums whitespace-nowrap">
                        {formatNumber(item.unitsSold)} SP
                    </span>
                ),
            },
            {
                key: 'grossRevenue',
                header: 'Doanh thu gộp',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.grossRevenue,
                render: (item) => (
                    <span className="font-medium text-slate-700 font-mono text-xs tabular-nums whitespace-nowrap">
                        {formatVND(item.grossRevenue)}
                    </span>
                ),
            },
            {
                key: 'deductionRevenue',
                header: 'Giảm trừ hoàn/hủy',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.deductionRevenue,
                render: (item) => (
                    <span
                        className={`font-mono text-xs tabular-nums whitespace-nowrap ${
                            item.deductionRevenue > 0 ? 'font-medium text-rose-600' : 'text-slate-400'
                        }`}
                    >
                        {item.deductionRevenue > 0 ? `-${formatVND(item.deductionRevenue)}` : '0 ₫'}
                    </span>
                ),
            },
            {
                key: 'netRevenue',
                header: 'Doanh thu thuần',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.netRevenue,
                render: (item) => (
                    <span className="font-semibold text-slate-900 font-mono text-xs tabular-nums whitespace-nowrap">
                        {formatVND(item.netRevenue)}
                    </span>
                ),
            },
            {
                key: 'sharePercent',
                header: 'Tỷ trọng',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.sharePercent,
                render: (item) => (
                    <div className="w-24 ml-auto space-y-1 tabular-nums">
                        <div className="text-right text-xs font-mono font-medium text-slate-700">
                            {item.sharePercent.toFixed(1)}%
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(2, item.sharePercent))}%` }}
                            />
                        </div>
                    </div>
                ),
            },
            {
                key: 'actions',
                header: 'Chi tiết',
                align: 'right',
                render: (item) => (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDrilldownRow(item);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title="Xem danh sách đơn hàng cấu thành"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                ),
            },
        ],
        [activeDimensionTab, currentPage, pageSize]
    );

    // Dòng tổng cộng (Summary Row) dưới cùng của DataTable
    const tableSummaryRow = useMemo(() => {
        if (searchedTableRows.length === 0) return null;
        const totCompleted = searchedTableRows.reduce((s, r) => s + r.completedOrders, 0);
        const totUnits = searchedTableRows.reduce((s, r) => s + r.unitsSold, 0);
        const totGross = searchedTableRows.reduce((s, r) => s + r.grossRevenue, 0);
        const totDeduction = searchedTableRows.reduce((s, r) => s + r.deductionRevenue, 0);
        const totNet = searchedTableRows.reduce((s, r) => s + r.netRevenue, 0);
        const totShare = searchedTableRows.reduce((s, r) => s + r.sharePercent, 0);

        return (
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900 tabular-nums">
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-slate-700">
                    Tổng cộng ({searchedTableRows.length} mục)
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-900 whitespace-nowrap">
                    {formatNumber(totCompleted)} đơn
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-900 whitespace-nowrap">
                    {formatNumber(totUnits)} SP
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-800 whitespace-nowrap">
                    {formatVND(totGross)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-rose-600 whitespace-nowrap">
                    {totDeduction > 0 ? `-${formatVND(totDeduction)}` : '0 ₫'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-blue-600 whitespace-nowrap">
                    {formatVND(totNet)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-900 whitespace-nowrap">
                    {Math.min(100, totShare).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400">—</td>
            </tr>
        );
    }, [searchedTableRows]);

    // Custom Tooltip cho biểu đồ Recharts
    const renderCustomChartTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const dataPoint = payload[0]?.payload;
        return (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-3 min-w-[230px] text-xs space-y-2 tabular-nums">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 gap-3">
                    <span className="font-semibold text-slate-900">{label}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                        {dataPoint?.completedOrders || 0} đơn hoàn tất
                    </span>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-slate-300 inline-block" />
                            Doanh thu gộp
                        </span>
                        <span className="font-medium text-slate-800 font-mono">
                            {formatVND(dataPoint?.grossRevenue || 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
                            Giảm trừ hoàn/hủy
                        </span>
                        <span className="font-medium text-rose-600 font-mono">
                            -{formatVND(dataPoint?.deductionRevenue || 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-blue-600 inline-block" />
                            Doanh thu thuần
                        </span>
                        <span className="font-semibold text-blue-600 font-mono">
                            {formatVND(dataPoint?.netRevenue || 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500">
                        <span>Sản lượng</span>
                        <span className="font-mono text-slate-700">
                            {formatNumber(dataPoint?.unitsSold || 0)} SP
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const dimensionTabs: {
        id: ReportDimensionTab;
        label: string;
        icon: React.ElementType;
        count: number;
    }[] = [
        {
            id: 'TIME',
            label: 'Theo Thời gian',
            icon: Clock,
            count: timeSeriesChartData.length,
        },
        {
            id: 'CATEGORY',
            label: 'Theo Danh mục',
            icon: Layers,
            count: new Set(currentPeriodRecords.map((r) => r.categoryId)).size,
        },
        {
            id: 'CLASSIFICATION',
            label: 'Theo Phân loại',
            icon: Tag,
            count: new Set(currentPeriodRecords.map((r) => r.classificationId)).size,
        },
        {
            id: 'BRAND',
            label: 'Theo Thương hiệu',
            icon: Award,
            count: new Set(currentPeriodRecords.map((r) => r.brandId)).size,
        },
        {
            id: 'PRODUCT',
            label: 'Theo Sản phẩm',
            icon: Cpu,
            count: new Set(currentPeriodRecords.map((r) => r.productId)).size,
        },
    ];

    return (
        <div className="space-y-5 pb-8">
            {/* ==================== PAGE HEADER ==================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Báo cáo doanh thu
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        Kỳ báo cáo: {formatDateVN(fromDate)} — {formatDateVN(toDate)} · {formatNumber(currentPeriodRecords.length)} giao dịch phát sinh
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <Printer className="w-4 h-4 text-slate-500" />
                        <span>In báo cáo</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Xuất Excel / CSV</span>
                    </button>
                </div>
            </div>

            {/* ==================== 1. MULTI-DIMENSIONAL FILTER BAR ==================== */}
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3.5">
                {/* Top Row: Quick Date Presets & Period Grouping */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'LAST_30_DAYS', label: '30 ngày qua' },
                            { id: 'THIS_QUARTER', label: 'Quý 4/2026' },
                            { id: 'LAST_6_MONTHS', label: '6 tháng gần nhất' },
                            { id: 'YEAR_2026', label: 'Năm 2026' },
                            { id: 'ALL_TIME', label: 'Toàn bộ (2025 - 2026)' },
                        ].map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplyDatePreset(preset.id)}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                    activeDatePreset === preset.id
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Chu kỳ gộp: Ngày / Tháng / Quý / Năm */}
                    <div className="flex items-center gap-2 self-start xl:self-auto">
                        <span className="text-xs text-slate-500">Chu kỳ:</span>
                        <div className="inline-flex p-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {(
                                [
                                    { id: 'DAY', label: 'Ngày' },
                                    { id: 'MONTH', label: 'Tháng' },
                                    { id: 'QUARTER', label: 'Quý' },
                                    { id: 'YEAR', label: 'Năm' },
                                ] as { id: PeriodGrouping; label: string }[]
                            ).map((g) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                        setPeriodGroup(g.id);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                        periodGroup === g.id
                                            ? 'bg-white text-slate-900 border border-slate-200'
                                            : 'text-slate-600 hover:text-slate-900 border border-transparent'
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Đặt lại bộ lọc"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Đặt lại</span>
                        </button>
                    </div>
                </div>

                {/* Main Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">Từ ngày</label>
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setActiveDatePreset('CUSTOM');
                                setCurrentPage(1);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">Đến ngày</label>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setActiveDatePreset('CUSTOM');
                                setCurrentPage(1);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">Danh mục</label>
                        <SelectDropdown
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedProduct('ALL');
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: `Tất cả danh mục (${PC_CATEGORIES.length})`, value: 'ALL' },
                                ...PC_CATEGORIES.map((c) => ({ label: c.name, value: c.id })),
                            ]}
                            size="sm"
                            searchable
                            className="w-full"
                            triggerClassName="bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">Phân loại</label>
                        <SelectDropdown
                            value={selectedClassification}
                            onChange={(e) => {
                                setSelectedClassification(e.target.value);
                                setSelectedProduct('ALL');
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: `Tất cả phân loại (${PC_CLASSIFICATIONS.length})`, value: 'ALL' },
                                ...PC_CLASSIFICATIONS.map((cls) => ({ label: cls.name, value: cls.id })),
                            ]}
                            size="sm"
                            searchable
                            className="w-full"
                            triggerClassName="bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">Thương hiệu</label>
                        <SelectDropdown
                            value={selectedBrand}
                            onChange={(e) => {
                                setSelectedBrand(e.target.value);
                                setSelectedProduct('ALL');
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: `Tất cả thương hiệu (${PC_BRANDS.length})`, value: 'ALL' },
                                ...PC_BRANDS.map((b) => ({ label: b.name, value: b.id })),
                            ]}
                            size="sm"
                            searchable
                            className="w-full"
                            triggerClassName="bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">Sản phẩm linh kiện</label>
                        <SelectDropdown
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: `Tất cả sản phẩm (${availableProductsForFilter.length})`, value: 'ALL' },
                                ...availableProductsForFilter.map((prod) => ({
                                    label: `[${prod.sku}] ${prod.name}`,
                                    value: prod.id,
                                })),
                            ]}
                            size="sm"
                            searchable
                            className="w-full"
                            triggerClassName="bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>
                </div>
            </div>

            {/* ==================== 2. FLAT KPI METRIC STRIP (DIVIDE-X) ==================== */}
            <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="p-4 space-y-1 tabular-nums">
                    <p className="text-xs font-medium text-slate-500">Tổng doanh thu gộp</p>
                    <p className="text-xl font-semibold text-slate-900 font-mono">
                        {formatVND(kpiMetrics.grossRevenue)}
                    </p>
                    <p className="text-xs text-slate-500">
                        {formatNumber(kpiMetrics.totalOrdersCount)} đơn phát sinh
                    </p>
                </div>

                <div className="p-4 space-y-1 tabular-nums">
                    <p className="text-xs font-medium text-slate-500">Đơn hủy / hoàn trả</p>
                    <p className="text-xl font-semibold text-rose-600 font-mono">
                        -{formatVND(kpiMetrics.cancelledReturnedAmount)}
                    </p>
                    <p className="text-xs text-slate-500">
                        {formatNumber(kpiMetrics.cancelledReturnedOrdersCount)} đơn · {kpiMetrics.deductionRate.toFixed(1)}% doanh thu gộp
                    </p>
                </div>

                <div className="p-4 space-y-1 tabular-nums bg-slate-50/60">
                    <p className="text-xs font-medium text-blue-700">Doanh thu thuần thực tế</p>
                    <p className="text-xl font-semibold text-blue-600 font-mono">
                        {formatVND(kpiMetrics.netActualRevenue)}
                    </p>
                    <p className="text-xs text-slate-600">
                        {formatNumber(kpiMetrics.completedOrdersCount)} đơn hoàn tất · {formatNumber(kpiMetrics.totalUnitsSold)} SP
                    </p>
                </div>

                <div className="p-4 space-y-1 tabular-nums">
                    <p className="text-xs font-medium text-slate-500">Tăng trưởng so với kỳ trước</p>
                    <p
                        className={`text-xl font-semibold font-mono ${
                            kpiMetrics.growthPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                    >
                        {kpiMetrics.growthPercent >= 0 ? '+' : ''}
                        {kpiMetrics.growthPercent.toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-500">
                        Kỳ trước: <span className="font-mono text-slate-700">{formatVND(kpiMetrics.prevNetRevenue)}</span>
                    </p>
                </div>
            </div>

            {/* ==================== 3. MAIN REVENUE CHART (RECHARTS) ==================== */}
            <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            Biến động doanh thu thuần theo thời gian (
                            {periodGroup === 'DAY'
                                ? 'Theo ngày'
                                : periodGroup === 'MONTH'
                                  ? 'Theo tháng'
                                  : periodGroup === 'QUARTER'
                                    ? 'Theo quý'
                                    : 'Theo năm'}
                            )
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            So sánh doanh thu thuần thực tế, doanh thu gộp và giá trị giảm trừ qua từng kỳ
                        </p>
                    </div>

                    {/* Chuyển kiểu biểu đồ */}
                    <div className="inline-flex p-0.5 rounded-md bg-slate-100 border border-slate-200 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setChartMode('COMPOSED')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                chartMode === 'COMPOSED'
                                    ? 'bg-white text-slate-900 border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                            }`}
                        >
                            Cột &amp; Đường
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('BAR')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                chartMode === 'BAR'
                                    ? 'bg-white text-slate-900 border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                            }`}
                        >
                            Biểu đồ cột
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('AREA')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                chartMode === 'AREA'
                                    ? 'bg-white text-slate-900 border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                            }`}
                        >
                            Xu hướng
                        </button>
                    </div>
                </div>

                {timeSeriesChartData.length === 0 ? (
                    <div className="h-72 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-md border border-dashed border-slate-200">
                        <BarChart3 className="w-8 h-8 mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-500">
                            Không có dữ liệu giao dịch trong khoảng thời gian và bộ lọc đã chọn.
                        </p>
                    </div>
                ) : (
                    <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartMode === 'COMPOSED' ? (
                                <ComposedChart
                                    data={timeSeriesChartData}
                                    margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompactVND}
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                    />
                                    <Tooltip content={renderCustomChartTooltip} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                    />
                                    <Bar
                                        dataKey="grossRevenue"
                                        name="Doanh thu gộp"
                                        fill="#CBD5E1"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={32}
                                    />
                                    <Bar
                                        dataKey="netRevenue"
                                        name="Doanh thu thuần thực tế"
                                        fill="#2563EB"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={32}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="netRevenue"
                                        name="Xu hướng DT thuần"
                                        stroke="#1D4ED8"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#2563EB', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                                        activeDot={{ r: 5 }}
                                    />
                                </ComposedChart>
                            ) : chartMode === 'BAR' ? (
                                <BarChart
                                    data={timeSeriesChartData}
                                    margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompactVND}
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                    />
                                    <Tooltip content={renderCustomChartTooltip} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                    />
                                    <Bar
                                        dataKey="netRevenue"
                                        name="Doanh thu thuần thực tế"
                                        fill="#2563EB"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={36}
                                    />
                                    <Bar
                                        dataKey="deductionRevenue"
                                        name="Giá trị đơn hủy / hoàn trả"
                                        fill="#E11D48"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={36}
                                    />
                                </BarChart>
                            ) : (
                                <AreaChart
                                    data={timeSeriesChartData}
                                    margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
                                >
                                    <defs>
                                        <linearGradient id="netRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompactVND}
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                    />
                                    <Tooltip content={renderCustomChartTooltip} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="netRevenue"
                                        name="Doanh thu thuần thực tế"
                                        stroke="#2563EB"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#netRevGrad)"
                                        dot={{ r: 3, fill: '#2563EB', stroke: '#fff', strokeWidth: 1.5 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="deductionRevenue"
                                        name="Giảm trừ hoàn/hủy"
                                        stroke="#E11D48"
                                        strokeWidth={1.75}
                                        strokeDasharray="4 4"
                                        dot={{ r: 2.5, fill: '#E11D48' }}
                                    />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ==================== 4. DETAILED DATATABLE WITH 5 PERSPECTIVE TABS ==================== */}
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                {/* Perspective Tabs */}
                <div className="px-4 pt-3.5 border-b border-slate-200 bg-white space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Chi tiết doanh thu đa chiều
                        </h2>
                        <span className="text-xs text-slate-500">
                            Nhấn vào một dòng để xem danh sách đơn hàng cấu thành
                        </span>
                    </div>

                    <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
                        {dimensionTabs.map((tab) => {
                            const isActive = activeDimensionTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveDimensionTab(tab.id);
                                        setTableSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className={`flex items-center gap-2 pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:text-blue-600 ${
                                        isActive
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-xs font-medium tabular-nums ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Reusable DataTable Component */}
                <DataTable
                    columns={columns}
                    data={paginatedTableRows}
                    rowKey="id"
                    searchable={true}
                    searchQuery={tableSearchQuery}
                    onSearchChange={(val) => {
                        setTableSearchQuery(val);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder={`Tìm kiếm trong ${dimensionLabelMap[activeDimensionTab].toLowerCase()}...`}
                    defaultSortKey="netRevenue"
                    defaultSortDirection="desc"
                    summaryRow={tableSummaryRow}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={searchedTableRows.length}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 15, 25]}
                    onPageChange={(p) => setCurrentPage(p)}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setCurrentPage(1);
                    }}
                    itemUnitName="dòng thống kê"
                    onRowClick={(item) => setDrilldownRow(item)}
                    className="border-0 rounded-none shadow-none"
                    toolbarRight={
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Tải CSV tab hiện tại</span>
                        </button>
                    }
                />
            </div>

            {/* ==================== DRILL-DOWN MODAL: CHI TIẾT ĐƠN HÀNG CẤU THÀNH ==================== */}
            <AdminModal
                isOpen={!!drilldownRow}
                onClose={() => setDrilldownRow(null)}
                title={`Chi tiết giao dịch: ${drilldownRow?.name || ''}`}
                subtitle={drilldownRow?.subLabel || 'Danh sách các đơn hàng phát sinh trong nhóm thống kê này'}
                icon={DollarSign}
                size="xl"
                footer={
                    <AdminButton variant="secondary" onClick={() => setDrilldownRow(null)}>
                        Đóng cửa sổ
                    </AdminButton>
                }
            >
                {drilldownRow && (
                    <div className="space-y-4">
                        {/* Flat 3-column summary strip (no nested cards) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50 border border-slate-200 rounded-md tabular-nums">
                            <div className="p-3.5">
                                <div className="text-[11px] font-medium text-slate-500">Doanh thu gộp</div>
                                <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
                                    {formatVND(drilldownRow.grossRevenue)}
                                </div>
                            </div>
                            <div className="p-3.5">
                                <div className="text-[11px] font-medium text-slate-500">
                                    Giảm trừ hoàn / hủy ({drilldownRow.cancelledReturnOrders} đơn)
                                </div>
                                <div className="text-base font-semibold text-rose-600 font-mono mt-0.5">
                                    -{formatVND(drilldownRow.deductionRevenue)}
                                </div>
                            </div>
                            <div className="p-3.5">
                                <div className="text-[11px] font-medium text-blue-700">
                                    Doanh thu thuần ({drilldownRow.completedOrders} đơn hoàn tất)
                                </div>
                                <div className="text-base font-semibold text-blue-600 font-mono mt-0.5">
                                    {formatVND(drilldownRow.netRevenue)}
                                </div>
                            </div>
                        </div>

                        {/* List of orders */}
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                            <div className="overflow-x-auto max-h-[420px]">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Mã đơn</th>
                                            <th className="px-3.5 py-2.5">Ngày GD</th>
                                            <th className="px-3.5 py-2.5">Khách hàng</th>
                                            <th className="px-3.5 py-2.5">Sản phẩm linh kiện</th>
                                            <th className="px-3.5 py-2.5 text-right">SL</th>
                                            <th className="px-3.5 py-2.5">Trạng thái</th>
                                            <th className="px-3.5 py-2.5 text-right">Doanh thu thuần</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {drilldownTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50/70">
                                                <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                                    {tx.orderCode}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-slate-600 font-mono tabular-nums whitespace-nowrap">
                                                    {formatDateVN(tx.date)}
                                                </td>
                                                <td className="px-3.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                                                    {tx.customerName}
                                                </td>
                                                <td className="px-3.5 py-2.5">
                                                    <div className="font-medium text-slate-900 line-clamp-1">
                                                        {tx.productName}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                                        {tx.productSku} · {tx.brandName}
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-800 tabular-nums">
                                                    {tx.quantity}
                                                </td>
                                                <td className="px-3.5 py-2.5">
                                                    {tx.status === 'DELIVERED' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                                            <span>Hoàn tất</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                                            <span>{tx.statusLabel}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                                                    {tx.status === 'DELIVERED' ? (
                                                        <span className="text-slate-900">
                                                            {formatVND(tx.netActualRevenue)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 line-through">
                                                            {formatVND(tx.grossAmount)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
}

