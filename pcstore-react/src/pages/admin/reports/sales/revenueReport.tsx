import React, { useState, useMemo } from 'react';
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
                        <div className="flex items-start gap-3 py-0.5 max-w-md">
                            <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 border ${
                                    rankNumber <= 3 && activeDimensionTab !== 'TIME'
                                        ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                                        : 'bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]'
                                }`}
                            >
                                {activeDimensionTab === 'TIME' ? (
                                    <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                                ) : (
                                    `#${rankNumber}`
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 hover:text-[#2563EB] transition-colors">
                                    {item.name}
                                </div>
                                {item.subLabel && (
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        {item.subLabel}
                                    </div>
                                )}
                                {item.badgeText && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-semibold text-slate-600">
                                        {item.badgeText}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'completedOrders',
                header: 'Số đơn hoàn tất',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.completedOrders,
                render: (item) => (
                    <div className="inline-flex flex-col items-center">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                            {formatNumber(item.completedOrders)} đơn
                        </span>
                        {item.cancelledReturnOrders > 0 && (
                            <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                                ({item.cancelledReturnOrders} hủy/hoàn)
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: 'unitsSold',
                header: 'Sản lượng bán',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.unitsSold,
                render: (item) => (
                    <div className="font-bold text-slate-800 text-xs">
                        {formatNumber(item.unitsSold)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">SP</span>
                    </div>
                ),
            },
            {
                key: 'grossRevenue',
                header: 'Doanh thu gộp',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.grossRevenue,
                render: (item) => (
                    <span className="font-semibold text-slate-700 font-mono text-xs">
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
                    <div className="text-right">
                        {item.deductionRevenue > 0 ? (
                            <span className="font-semibold text-rose-600 font-mono text-xs bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                -{formatVND(item.deductionRevenue)}
                            </span>
                        ) : (
                            <span className="text-slate-400 font-mono text-xs">0 ₫</span>
                        )}
                    </div>
                ),
            },
            {
                key: 'netRevenue',
                header: 'Doanh thu thuần',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.netRevenue,
                render: (item) => (
                    <div className="font-extrabold text-[#2563EB] font-mono text-xs">
                        {formatVND(item.netRevenue)}
                    </div>
                ),
            },
            {
                key: 'sharePercent',
                header: 'Tỷ trọng (%)',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.sharePercent,
                render: (item) => (
                    <div className="w-32 ml-auto space-y-1">
                        <div className="flex items-center justify-end gap-1.5 text-xs">
                            <span className="font-bold text-slate-800 font-mono">
                                {item.sharePercent.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-[#E2E8F0]">
                            <div
                                className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(2, item.sharePercent))}%` }}
                            />
                        </div>
                    </div>
                ),
            },
            {
                key: 'actions',
                header: 'Chi tiết',
                align: 'center',
                render: (item) => (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDrilldownRow(item);
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
            <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0] font-bold text-slate-900">
                <td className="px-4 py-3.5 text-xs uppercase tracking-wider text-slate-700">
                    Tổng cộng ({searchedTableRows.length} mục)
                </td>
                <td className="px-4 py-3.5 text-center text-xs text-emerald-700">
                    {formatNumber(totCompleted)} đơn
                </td>
                <td className="px-4 py-3.5 text-center text-xs text-slate-900">
                    {formatNumber(totUnits)} SP
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-800">
                    {formatVND(totGross)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-xs text-rose-600">
                    {totDeduction > 0 ? `-${formatVND(totDeduction)}` : '0 ₫'}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-xs text-[#2563EB] font-extrabold">
                    {formatVND(totNet)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-900">
                    {Math.min(100, totShare).toFixed(1)}%
                </td>
                <td className="px-4 py-3.5 text-center text-xs text-slate-400">—</td>
            </tr>
        );
    }, [searchedTableRows]);

    // Custom Tooltip cho biểu đồ Recharts
    const renderCustomChartTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const dataPoint = payload[0]?.payload;
        return (
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-3.5 min-w-[250px] text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                        {label}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] font-bold text-[10px]">
                        {dataPoint?.completedOrders || 0} đơn hoàn tất
                    </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
                            Doanh thu gộp:
                        </span>
                        <span className="font-semibold text-slate-800 font-mono">
                            {formatVND(dataPoint?.grossRevenue || 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                            Giảm trừ hoàn/hủy:
                        </span>
                        <span className="font-semibold text-rose-600 font-mono">
                            -{formatVND(dataPoint?.deductionRevenue || 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB] inline-block" />
                            Doanh thu thuần:
                        </span>
                        <span className="font-extrabold text-[#2563EB] font-mono">
                            {formatVND(dataPoint?.netRevenue || 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500">
                        <span>Sản lượng xuất bán:</span>
                        <span className="font-semibold text-slate-700">
                            {formatNumber(dataPoint?.unitsSold || 0)} sản phẩm
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
        <div className="min-h-screen bg-[#F8FAFC] space-y-6 pb-10">
            {/* ==================== PAGE HEADER ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-sm shrink-0">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                Báo cáo bán hàng
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">
                                Kỳ báo cáo: {formatDateVN(fromDate)} — {formatDateVN(toDate)}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                            Báo Cáo Doanh Thu Thực Tế
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                            Phân tích đa chiều doanh thu gộp, giá trị giảm trừ (đơn hủy / hoàn trả) và{' '}
                            <strong className="text-slate-700">doanh thu thuần thực tế</strong> (chỉ ghi nhận
                            các đơn hàng ở trạng thái{' '}
                            <span className="text-emerald-700 font-semibold">
                                &ldquo;Đã đưa tới khách hàng&rdquo;
                            </span>
                            ).
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] transition-colors cursor-pointer shadow-2xs"
                    >
                        <Printer className="w-4 h-4 text-slate-500" />
                        <span>In báo cáo</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Xuất Excel / CSV</span>
                    </button>
                </div>
            </div>

            {/* ==================== 1. MULTI-DIMENSIONAL FILTER BAR ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
                {/* Top Row: Quick Date Presets & Period Grouping */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-[#E2E8F0]">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                            <Filter className="w-4 h-4 text-[#2563EB]" />
                            Bộ lọc đa chiều:
                        </span>
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                    activeDatePreset === preset.id
                                        ? 'bg-blue-50 text-[#2563EB] border-blue-200 shadow-2xs'
                                        : 'bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:bg-slate-100'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Chu kỳ gộp: Ngày / Tháng / Quý / Năm */}
                    <div className="flex items-center gap-2 self-start xl:self-auto">
                        <span className="text-xs font-semibold text-slate-500">Chu kỳ gộp:</span>
                        <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
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
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        periodGroup === g.id
                                            ? 'bg-[#2563EB] text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Filter Grid: Từ ngày, Đến ngày, Danh mục, Phân loại, Thương hiệu, Sản phẩm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                    {/* Từ ngày */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                            Từ ngày
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setActiveDatePreset('CUSTOM');
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                        />
                    </div>

                    {/* Đến ngày */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                            Đến ngày
                        </label>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setActiveDatePreset('CUSTOM');
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                        />
                    </div>

                    {/* Danh mục */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                            Danh mục
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedProduct('ALL');
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">Tất cả danh mục ({PC_CATEGORIES.length})</option>
                            {PC_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Phân loại */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-[#2563EB]" />
                            Phân loại
                        </label>
                        <select
                            value={selectedClassification}
                            onChange={(e) => {
                                setSelectedClassification(e.target.value);
                                setSelectedProduct('ALL');
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">Tất cả phân loại ({PC_CLASSIFICATIONS.length})</option>
                            {PC_CLASSIFICATIONS.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Thương hiệu */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[#2563EB]" />
                            Thương hiệu
                        </label>
                        <select
                            value={selectedBrand}
                            onChange={(e) => {
                                setSelectedBrand(e.target.value);
                                setSelectedProduct('ALL');
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">Tất cả thương hiệu ({PC_BRANDS.length})</option>
                            {PC_BRANDS.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sản phẩm */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-[#2563EB]" />
                            Sản phẩm linh kiện
                        </label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">
                                Tất cả sản phẩm ({availableProductsForFilter.length})
                            </option>
                            {availableProductsForFilter.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                    [{prod.sku}] {prod.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Bottom Active Filter Status & Reset */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-slate-500">
                        <span>
                            Tìm thấy{' '}
                            <strong className="text-slate-900">{currentPeriodRecords.length}</strong> giao
                            dịch phát sinh trong kỳ
                        </span>
                        {(selectedCategory !== 'ALL' ||
                            selectedClassification !== 'ALL' ||
                            selectedBrand !== 'ALL' ||
                            selectedProduct !== 'ALL') && (
                            <>
                                <span>•</span>
                                <span className="text-[#2563EB] font-semibold">
                                    Đang áp dụng bộ lọc chuyên sâu theo chiều sản phẩm
                                </span>
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại bộ lọc</span>
                    </button>
                </div>
            </div>

            {/* ==================== 2. 4 KPI CARDS ==================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* KPI 1: Tổng doanh thu gộp */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                1. Tổng doanh thu gộp
                            </p>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1.5">
                                {formatVND(kpiMetrics.grossRevenue)}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Tổng số đơn phát sinh:</span>
                        <span className="font-bold text-slate-800">
                            {formatNumber(kpiMetrics.totalOrdersCount)} đơn hàng
                        </span>
                    </div>
                </div>

                {/* KPI 2: Giá trị đơn hủy / hoàn trả (loại trừ khỏi doanh thu thực) */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                2. Giá trị đơn hủy / hoàn trả
                            </p>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 font-mono mt-1.5">
                                -{formatVND(kpiMetrics.cancelledReturnedAmount)}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-rose-600 font-medium">
                            Loại trừ khỏi doanh thu thực ({kpiMetrics.deductionRate.toFixed(1)}%)
                        </span>
                        <span className="font-bold text-slate-700">
                            {formatNumber(kpiMetrics.cancelledReturnedOrdersCount)} đơn hủy/hoàn
                        </span>
                    </div>
                </div>

                {/* KPI 3: Doanh thu thuần thực tế (chỉ tính đơn "Đã đưa tới khách hàng") */}
                <div className="bg-white border-2 border-[#2563EB] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-[#2563EB] text-white text-[10px] font-bold rounded-bl-xl">
                        CHỈ SỐ CHÍNH
                    </div>
                    <div className="flex items-start justify-between gap-3 pt-1">
                        <div>
                            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                                3. Doanh thu thuần thực tế
                            </p>
                            <h3 className="text-xl sm:text-2xl font-black text-[#2563EB] font-mono mt-1.5">
                                {formatVND(kpiMetrics.netActualRevenue)}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-blue-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Đơn &ldquo;Đã đưa tới khách hàng&rdquo;
                        </span>
                        <span className="font-bold text-slate-900">
                            {formatNumber(kpiMetrics.completedOrdersCount)} đơn ({formatNumber(kpiMetrics.totalUnitsSold)} SP)
                        </span>
                    </div>
                </div>

                {/* KPI 4: Tỷ lệ tăng trưởng so với kỳ trước (%) */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                4. Tăng trưởng so với kỳ trước
                            </p>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <h3
                                    className={`text-xl sm:text-2xl font-extrabold font-mono ${
                                        kpiMetrics.growthPercent >= 0
                                            ? 'text-emerald-600'
                                            : 'text-rose-600'
                                    }`}
                                >
                                    {kpiMetrics.growthPercent >= 0 ? '+' : ''}
                                    {kpiMetrics.growthPercent.toFixed(2)}%
                                </h3>
                                <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                        kpiMetrics.growthPercent >= 0
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                >
                                    {kpiMetrics.growthPercent >= 0 ? 'Tăng trưởng' : 'Sụt giảm'}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                kpiMetrics.growthPercent >= 0
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                        >
                            {kpiMetrics.growthPercent >= 0 ? (
                                <TrendingUp className="w-5 h-5" />
                            ) : (
                                <TrendingDown className="w-5 h-5" />
                            )}
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Kỳ liền trước:</span>
                        <span className="font-semibold text-slate-700 font-mono">
                            {formatVND(kpiMetrics.prevNetRevenue)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ==================== 3. MAIN REVENUE CHART (RECHARTS) ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                            <h2 className="text-base font-bold text-slate-900">
                                Biểu Đồ Biến Động Doanh Thu Thuần Theo Trục Thời Gian (
                                {periodGroup === 'DAY'
                                    ? 'Theo Ngày'
                                    : periodGroup === 'MONTH'
                                      ? 'Theo Tháng'
                                      : periodGroup === 'QUARTER'
                                        ? 'Theo Quý'
                                        : 'Theo Năm'}
                                )
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Đối chiếu trực quan giữa Doanh thu thuần thực tế (màu xanh #2563EB), Doanh thu gộp
                            và Giá trị đơn hủy/hoàn trả qua từng mốc thời gian
                        </p>
                    </div>

                    {/* Chuyển kiểu biểu đồ */}
                    <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setChartMode('COMPOSED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                chartMode === 'COMPOSED'
                                    ? 'bg-[#2563EB] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Cột & Đường</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('BAR')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                chartMode === 'BAR'
                                    ? 'bg-[#2563EB] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Biểu đồ Cột</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('AREA')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                chartMode === 'AREA'
                                    ? 'bg-[#2563EB] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <LineChartIcon className="w-3.5 h-3.5" />
                            <span>Đường xu hướng</span>
                        </button>
                    </div>
                </div>

                {timeSeriesChartData.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-slate-400 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                        <BarChart3 className="w-10 h-10 mb-2 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-500">
                            Không có dữ liệu giao dịch trong khoảng thời gian và bộ lọc đã chọn.
                        </p>
                    </div>
                ) : (
                    <div className="h-[370px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartMode === 'COMPOSED' ? (
                                <ComposedChart
                                    data={timeSeriesChartData}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompactVND}
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={70}
                                    />
                                    <Tooltip content={renderCustomChartTooltip} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '12px', fontWeight: 600 }}
                                    />
                                    <Bar
                                        dataKey="grossRevenue"
                                        name="Doanh thu gộp"
                                        fill="#CBD5E1"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={36}
                                    />
                                    <Bar
                                        dataKey="netRevenue"
                                        name="Doanh thu thuần thực tế"
                                        fill="#2563EB"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={36}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="netRevenue"
                                        name="Đường xu hướng DT thuần"
                                        stroke="#1D4ED8"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </ComposedChart>
                            ) : chartMode === 'BAR' ? (
                                <BarChart
                                    data={timeSeriesChartData}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompactVND}
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={70}
                                    />
                                    <Tooltip content={renderCustomChartTooltip} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '12px', fontWeight: 600 }}
                                    />
                                    <Bar
                                        dataKey="netRevenue"
                                        name="Doanh thu thuần thực tế"
                                        fill="#2563EB"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={42}
                                    />
                                    <Bar
                                        dataKey="deductionRevenue"
                                        name="Giá trị đơn hủy / hoàn trả"
                                        fill="#F43F5E"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={42}
                                    />
                                </BarChart>
                            ) : (
                                <AreaChart
                                    data={timeSeriesChartData}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                                >
                                    <defs>
                                        <linearGradient id="netRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompactVND}
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={70}
                                    />
                                    <Tooltip content={renderCustomChartTooltip} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '12px', fontWeight: 600 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="netRevenue"
                                        name="Doanh thu thuần thực tế"
                                        stroke="#2563EB"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#netRevGrad)"
                                        dot={{ r: 4, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="deductionRevenue"
                                        name="Giảm trừ hoàn/hủy"
                                        stroke="#F43F5E"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        dot={{ r: 3, fill: '#F43F5E' }}
                                    />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ==================== 4. DETAILED DATATABLE WITH 5 PERSPECTIVE TABS ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
                {/* Section Header + Perspective Tabs */}
                <div className="p-5 pb-0 border-b border-[#E2E8F0] bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Bảng Thống Kê Chi Tiết Doanh Thu Đa Chiều
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Nhấn vào các Tab bên dưới để chuyển góc nhìn phân tích hoặc nhấp vào tiêu đề cột
                                để sắp xếp dữ liệu
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
                            <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
                            <span>
                                Nhấn vào một dòng bất kỳ để xem danh sách đơn hàng chi tiết
                            </span>
                        </div>
                    </div>

                    {/* 5 Dimension Tabs: Theo Thời gian | Theo Danh mục | Theo Phân loại | Theo Thương hiệu | Theo Sản phẩm */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {dimensionTabs.map((tab) => {
                            const IconComp = tab.icon;
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
                                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                                        isActive
                                            ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/50 rounded-t-xl'
                                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
                                    }`}
                                >
                                    <IconComp className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-[#2563EB] text-white'
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
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
                    <div className="space-y-5">
                        {/* Mini summary cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase">
                                    Doanh thu gộp
                                </div>
                                <div className="text-base font-extrabold text-slate-900 font-mono mt-1">
                                    {formatVND(drilldownRow.grossRevenue)}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                                <div className="text-[11px] font-semibold text-rose-600 uppercase">
                                    Giảm trừ hoàn / hủy ({drilldownRow.cancelledReturnOrders} đơn)
                                </div>
                                <div className="text-base font-extrabold text-rose-600 font-mono mt-1">
                                    -{formatVND(drilldownRow.deductionRevenue)}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                                <div className="text-[11px] font-bold text-[#2563EB] uppercase">
                                    Doanh thu thuần ({drilldownRow.completedOrders} đơn hoàn tất)
                                </div>
                                <div className="text-base font-black text-[#2563EB] font-mono mt-1">
                                    {formatVND(drilldownRow.netRevenue)}
                                </div>
                            </div>
                        </div>

                        {/* List of orders */}
                        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                            <div className="overflow-x-auto max-h-[420px]">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase border-b border-[#E2E8F0] sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Mã đơn</th>
                                            <th className="px-4 py-3">Ngày GD</th>
                                            <th className="px-4 py-3">Khách hàng</th>
                                            <th className="px-4 py-3">Sản phẩm linh kiện</th>
                                            <th className="px-4 py-3 text-center">SL</th>
                                            <th className="px-4 py-3 text-center">Trạng thái đơn</th>
                                            <th className="px-4 py-3 text-right">Doanh thu thuần</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2E8F0]">
                                        {drilldownTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-[#F8FAFC]">
                                                <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">
                                                    {tx.orderCode}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 font-mono">
                                                    {formatDateVN(tx.date)}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-800">
                                                    {tx.customerName}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900 line-clamp-1">
                                                        {tx.productName}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                        {tx.productSku} • {tx.brandName}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800">
                                                    {tx.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {tx.status === 'DELIVERED' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Đã đưa tới khách hàng
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <XCircle className="w-3 h-3" />
                                                            {tx.statusLabel} (Loại trừ)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold">
                                                    {tx.status === 'DELIVERED' ? (
                                                        <span className="text-[#2563EB]">
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

