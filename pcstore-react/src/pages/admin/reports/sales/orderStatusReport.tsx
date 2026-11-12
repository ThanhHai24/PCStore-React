import React, { useState, useMemo } from 'react';
import {
    ShoppingBag,
    CheckCircle2,
    Clock,
    XCircle,
    Truck,
    Calendar,
    Filter,
    RotateCcw,
    FileSpreadsheet,
    Printer,
    Download,
    Eye,
    CreditCard,
    Store,
    BarChart3,
    PieChart as PieChartIcon,
    AlertTriangle,
    Package,
    User,
    Phone,
    MapPin,
    Info,
    Layers,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { DataTable, type Column } from '../../../../components/admin/common/table';
import { AdminModal, AdminButton } from '../../../../components/admin/common/modal';
import { useToast } from '../../../../components/admin/common/toast';
import {
    MOCK_ORDER_STATUS_RECORDS,
    ORDER_STATUS_META,
    ORDER_STATUS_LIST,
    PAYMENT_METHOD_LABELS,
    SALES_CHANNEL_LABELS,
    CANCEL_RETURN_REASONS,
    type DetailedOrderStatus,
    type PaymentMethodType,
    type SalesChannelType,
    type OrderStatusRecord,
} from '../../../../data/mockOrderStatusData';

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount || 0);
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

type TimeGrouping = 'DAY' | 'MONTH';
type TableViewTab = 'DETAIL_ORDERS' | 'SUMMARY_BY_DATE' | 'SUMMARY_BY_CHANNEL';

interface AggregatedOrderSummaryRow {
    id: string;
    name: string;
    subLabel: string;
    totalOrders: number;
    deliveredOrders: number;
    deliveredRate: number;
    inProgressOrders: number;
    cancelledReturnedOrders: number;
    cancelledReturnedRate: number;
    totalAmount: number;
    avgProcessingHours: number;
    sortKey: string;
}

export default function OrderStatusReportPage() {
    const { toast } = useToast();

    // ==================== 1. FILTER STATES ====================
    const [fromDate, setFromDate] = useState<string>('2026-01-01');
    const [toDate, setToDate] = useState<string>('2026-11-12');
    const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('MONTH');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
    const [selectedPayment, setSelectedPayment] = useState<string>('ALL');
    const [activeDatePreset, setActiveDatePreset] = useState<string>('YEAR_2026');

    // ==================== 2. TABLE & MODAL STATES ====================
    const [activeTableTab, setActiveTableTab] = useState<TableViewTab>('DETAIL_ORDERS');
    const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderStatusRecord | null>(null);

    const handleApplyDatePreset = (preset: string) => {
        setActiveDatePreset(preset);
        setCurrentPage(1);
        if (preset === 'LAST_30_DAYS') {
            setFromDate('2026-10-13');
            setToDate('2026-11-12');
            setTimeGrouping('DAY');
        } else if (preset === 'THIS_QUARTER') {
            setFromDate('2026-10-01');
            setToDate('2026-11-12');
            setTimeGrouping('DAY');
        } else if (preset === 'LAST_6_MONTHS') {
            setFromDate('2026-06-01');
            setToDate('2026-11-12');
            setTimeGrouping('MONTH');
        } else if (preset === 'YEAR_2026') {
            setFromDate('2026-01-01');
            setToDate('2026-11-12');
            setTimeGrouping('MONTH');
        }
    };

    const handleResetFilters = () => {
        setFromDate('2026-01-01');
        setToDate('2026-11-12');
        setTimeGrouping('MONTH');
        setSelectedStatus('ALL');
        setSelectedChannel('ALL');
        setSelectedPayment('ALL');
        setActiveDatePreset('YEAR_2026');
        setTableSearchQuery('');
        setCurrentPage(1);
        toast.info('Đã đặt lại bộ lọc báo cáo tình hình đơn hàng.');
    };

    // ==================== 3. FILTERED RECORDS ====================
    // Lọc theo ngày, kênh, phương thức thanh toán (dùng để đếm số lượng từng trạng thái trên thanh pill)
    const baseFilteredRecords = useMemo(() => {
        return MOCK_ORDER_STATUS_RECORDS.filter((rec) => {
            if (fromDate && rec.orderDate < fromDate) return false;
            if (toDate && rec.orderDate > toDate) return false;
            if (selectedChannel !== 'ALL' && rec.channel !== selectedChannel) return false;
            if (selectedPayment !== 'ALL' && rec.paymentMethod !== selectedPayment) return false;
            return true;
        });
    }, [fromDate, toDate, selectedChannel, selectedPayment]);

    // Lọc thêm theo trạng thái đơn hàng đang chọn
    const filteredRecords = useMemo(() => {
        if (selectedStatus === 'ALL') return baseFilteredRecords;
        return baseFilteredRecords.filter((rec) => rec.status === selectedStatus);
    }, [baseFilteredRecords, selectedStatus]);

    // ==================== 4. 4 KPI CARDS CALCULATION ====================
    const kpiMetrics = useMemo(() => {
        const totalOrders = filteredRecords.length;
        let deliveredCount = 0;
        let deliveredValue = 0;
        let inProgressCount = 0;
        let inProgressValue = 0;
        let cancelledCount = 0;
        let returnedCount = 0;
        let cancelledReturnedValue = 0;
        let totalValue = 0;
        let totalProcessingHours = 0;

        const statusBreakdown: Record<DetailedOrderStatus, number> = {
            PENDING: 0,
            PAID: 0,
            CONFIRMED: 0,
            PACKING: 0,
            SHIPPING: 0,
            DELIVERED: 0,
            CANCELLED: 0,
            RETURNED: 0,
        };

        filteredRecords.forEach((rec) => {
            totalValue += rec.totalAmount;
            totalProcessingHours += rec.processingHours;
            statusBreakdown[rec.status] = (statusBreakdown[rec.status] || 0) + 1;

            if (rec.status === 'DELIVERED') {
                deliveredCount += 1;
                deliveredValue += rec.totalAmount;
            } else if (rec.status === 'CANCELLED') {
                cancelledCount += 1;
                cancelledReturnedValue += rec.totalAmount;
            } else if (rec.status === 'RETURNED') {
                returnedCount += 1;
                cancelledReturnedValue += rec.totalAmount;
            } else {
                inProgressCount += 1;
                inProgressValue += rec.totalAmount;
            }
        });

        const cancelledReturnedCount = cancelledCount + returnedCount;
        const deliveredRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
        const inProgressRate = totalOrders > 0 ? (inProgressCount / totalOrders) * 100 : 0;
        const cancelledReturnedRate =
            totalOrders > 0 ? (cancelledReturnedCount / totalOrders) * 100 : 0;
        const avgProcessingHours =
            totalOrders > 0 ? Number((totalProcessingHours / totalOrders).toFixed(1)) : 0;

        return {
            totalOrders,
            totalValue,
            deliveredCount,
            deliveredValue,
            deliveredRate,
            inProgressCount,
            inProgressValue,
            inProgressRate,
            cancelledCount,
            returnedCount,
            cancelledReturnedCount,
            cancelledReturnedValue,
            cancelledReturnedRate,
            avgProcessingHours,
            statusBreakdown,
        };
    }, [filteredRecords]);

    // ==================== 5. STACKED BAR CHART DATA ====================
    const stackedBarData = useMemo(() => {
        const map = new Map<
            string,
            {
                key: string;
                periodLabel: string;
                sortKey: string;
                PENDING: number;
                PAID: number;
                CONFIRMED: number;
                PACKING: number;
                SHIPPING: number;
                DELIVERED: number;
                CANCELLED: number;
                RETURNED: number;
                total: number;
            }
        >();

        filteredRecords.forEach((rec) => {
            const [y, m, d] = rec.orderDate.split('-');
            const key = timeGrouping === 'DAY' ? rec.orderDate : `${y}-${m}`;
            const label =
                timeGrouping === 'DAY' ? `${d}/${m}` : `Tháng ${m}/${y}`;

            const row = map.get(key) || {
                key,
                periodLabel: label,
                sortKey: key,
                PENDING: 0,
                PAID: 0,
                CONFIRMED: 0,
                PACKING: 0,
                SHIPPING: 0,
                DELIVERED: 0,
                CANCELLED: 0,
                RETURNED: 0,
                total: 0,
            };

            row[rec.status] += 1;
            row.total += 1;
            map.set(key, row);
        });

        return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [filteredRecords, timeGrouping]);

    // ==================== 6. DONUT CHART: CANCEL & RETURN REASONS ====================
    const cancelReturnDonutData = useMemo(() => {
        // Lấy từ baseFilteredRecords nếu người dùng đang lọc 1 trạng thái khác CANCELLED/RETURNED để biểu đồ tròn luôn có thông tin đối chiếu
        const sourceRecords =
            selectedStatus === 'ALL' ||
            selectedStatus === 'CANCELLED' ||
            selectedStatus === 'RETURNED'
                ? filteredRecords
                : baseFilteredRecords;

        const counts = new Map<string, number>();
        let totalFailed = 0;

        sourceRecords.forEach((rec) => {
            if (
                (rec.status === 'CANCELLED' || rec.status === 'RETURNED') &&
                rec.cancelReturnReasonId
            ) {
                counts.set(
                    rec.cancelReturnReasonId,
                    (counts.get(rec.cancelReturnReasonId) || 0) + 1
                );
                totalFailed += 1;
            }
        });

        return CANCEL_RETURN_REASONS.map((meta) => {
            const count = counts.get(meta.id) || 0;
            const percent =
                totalFailed > 0 ? Number(((count / totalFailed) * 100).toFixed(1)) : 0;
            return {
                id: meta.id,
                name: meta.reason,
                type: meta.type,
                typeLabel: meta.type === 'CANCELLED' ? 'Hủy đơn' : 'Hoàn trả',
                value: count,
                percent,
                color: meta.color,
            };
        }).filter((item) => item.value > 0);
    }, [filteredRecords, baseFilteredRecords, selectedStatus]);

    // ==================== 7. AGGREGATED SUMMARY ROWS (BY DATE / BY CHANNEL) ====================
    const aggregatedSummaryRows = useMemo<AggregatedOrderSummaryRow[]>(() => {
        if (activeTableTab === 'DETAIL_ORDERS') return [];

        const map = new Map<
            string,
            {
                id: string;
                name: string;
                subLabel: string;
                totalOrders: number;
                deliveredOrders: number;
                inProgressOrders: number;
                cancelledReturnedOrders: number;
                totalAmount: number;
                sumProcessingHours: number;
                sortKey: string;
            }
        >();

        filteredRecords.forEach((rec) => {
            let groupKey = '';
            let name = '';
            let subLabel = '';
            let sortKey = '';

            if (activeTableTab === 'SUMMARY_BY_DATE') {
                const [y, m, d] = rec.orderDate.split('-');
                if (timeGrouping === 'DAY') {
                    groupKey = rec.orderDate;
                    name = `Ngày ${d}/${m}/${y}`;
                    subLabel = 'Tổng hợp vận hành theo ngày';
                    sortKey = rec.orderDate;
                } else {
                    groupKey = `${y}-${m}`;
                    name = `Tháng ${m}/${y}`;
                    subLabel = 'Tổng hợp vận hành theo tháng';
                    sortKey = `${y}-${m}`;
                }
            } else {
                // SUMMARY_BY_CHANNEL
                groupKey = rec.channel;
                name = rec.channelLabel;
                subLabel = `Mã kênh: ${rec.channel}`;
                sortKey = rec.channelLabel;
            }

            const item = map.get(groupKey) || {
                id: groupKey,
                name,
                subLabel,
                totalOrders: 0,
                deliveredOrders: 0,
                inProgressOrders: 0,
                cancelledReturnedOrders: 0,
                totalAmount: 0,
                sumProcessingHours: 0,
                sortKey,
            };

            item.totalOrders += 1;
            item.totalAmount += rec.totalAmount;
            item.sumProcessingHours += rec.processingHours;

            if (rec.status === 'DELIVERED') {
                item.deliveredOrders += 1;
            } else if (rec.status === 'CANCELLED' || rec.status === 'RETURNED') {
                item.cancelledReturnedOrders += 1;
            } else {
                item.inProgressOrders += 1;
            }

            map.set(groupKey, item);
        });

        return Array.from(map.values())
            .map((r) => ({
                id: r.id,
                name: r.name,
                subLabel: r.subLabel,
                totalOrders: r.totalOrders,
                deliveredOrders: r.deliveredOrders,
                deliveredRate:
                    r.totalOrders > 0
                        ? Number(((r.deliveredOrders / r.totalOrders) * 100).toFixed(1))
                        : 0,
                inProgressOrders: r.inProgressOrders,
                cancelledReturnedOrders: r.cancelledReturnedOrders,
                cancelledReturnedRate:
                    r.totalOrders > 0
                        ? Number(((r.cancelledReturnedOrders / r.totalOrders) * 100).toFixed(1))
                        : 0,
                totalAmount: r.totalAmount,
                avgProcessingHours:
                    r.totalOrders > 0
                        ? Number((r.sumProcessingHours / r.totalOrders).toFixed(1))
                        : 0,
                sortKey: r.sortKey,
            }))
            .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [filteredRecords, activeTableTab, timeGrouping]);

    // ==================== 8. SEARCH & PAGINATION FOR DATATABLE ====================
    const searchedDetailOrders = useMemo(() => {
        const q = tableSearchQuery.trim().toLowerCase();
        if (!q) return filteredRecords;
        return filteredRecords.filter(
            (r) =>
                r.orderCode.toLowerCase().includes(q) ||
                r.customerName.toLowerCase().includes(q) ||
                r.customerPhone.toLowerCase().includes(q) ||
                r.primaryProductSummary.toLowerCase().includes(q) ||
                r.paymentMethodLabel.toLowerCase().includes(q) ||
                r.statusLabel.toLowerCase().includes(q)
        );
    }, [filteredRecords, tableSearchQuery]);

    const searchedSummaryRows = useMemo(() => {
        const q = tableSearchQuery.trim().toLowerCase();
        if (!q) return aggregatedSummaryRows;
        return aggregatedSummaryRows.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                r.subLabel.toLowerCase().includes(q)
        );
    }, [aggregatedSummaryRows, tableSearchQuery]);

    const activeTotalItems =
        activeTableTab === 'DETAIL_ORDERS'
            ? searchedDetailOrders.length
            : searchedSummaryRows.length;

    const totalPages = Math.max(1, Math.ceil(activeTotalItems / pageSize));

    const paginatedDetailOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return searchedDetailOrders.slice(start, start + pageSize);
    }, [searchedDetailOrders, currentPage, pageSize]);

    const paginatedSummaryRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return searchedSummaryRows.slice(start, start + pageSize);
    }, [searchedSummaryRows, currentPage, pageSize]);

    // ==================== 9. EXPORT CSV ====================
    const handleExportCSV = () => {
        if (activeTotalItems === 0) {
            toast.warning('Không có dữ liệu đơn hàng để xuất file.');
            return;
        }

        if (activeTableTab === 'DETAIL_ORDERS') {
            const headers = [
                'Mã đơn hàng',
                'Ngày đặt',
                'Giờ đặt',
                'Khách hàng',
                'Số điện thoại',
                'Kênh bán',
                'Sản phẩm chính',
                'Tổng tiền (VNĐ)',
                'Phương thức thanh toán',
                'Trạng thái hiện tại',
                'Thời gian xử lý TB (Giờ)',
                'Lý do Hủy / Hoàn trả',
            ];

            const rows = searchedDetailOrders.map((r) => [
                `"${r.orderCode}"`,
                formatDateVN(r.orderDate),
                r.orderTime,
                `"${r.customerName}"`,
                `"${r.customerPhone}"`,
                `"${r.channelLabel}"`,
                `"${r.primaryProductSummary.replace(/"/g, '""')}"`,
                r.totalAmount,
                `"${r.paymentMethodLabel}"`,
                `"${r.statusLabel}"`,
                r.processingHours,
                `"${r.cancelReturnReasonText || ''}"`,
            ]);

            const csvContent =
                '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Tinh_Hinh_Don_Hang_Chi_Tiet_${fromDate}_${toDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            const headers = [
                activeTableTab === 'SUMMARY_BY_DATE' ? 'Mốc thời gian' : 'Kênh bán hàng',
                'Tổng đơn phát sinh',
                'Đơn giao thành công',
                'Tỷ lệ thành công (%)',
                'Đơn đang xử lý / giao',
                'Đơn hủy & hoàn trả',
                'Tỷ lệ hủy / hoàn (%)',
                'Tổng giá trị (VNĐ)',
                'Thời gian xử lý TB (Giờ)',
            ];

            const rows = searchedSummaryRows.map((r) => [
                `"${r.name}"`,
                r.totalOrders,
                r.deliveredOrders,
                `${r.deliveredRate}%`,
                r.inProgressOrders,
                r.cancelledReturnedOrders,
                `${r.cancelledReturnedRate}%`,
                r.totalAmount,
                r.avgProcessingHours,
            ]);

            const csvContent =
                '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Tong_Hop_Tinh_Hinh_Don_Hang_${activeTableTab}_${fromDate}_${toDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        toast.success(`Đã xuất báo cáo Tình hình đơn hàng (${activeTotalItems} dòng) thành công.`);
    };

    // ==================== 10. DATATABLE COLUMNS ====================
    const detailOrderColumns: Column<OrderStatusRecord>[] = useMemo(
        () => [
            {
                key: 'orderCode',
                header: 'Mã đơn',
                sortable: true,
                sortValue: (item) => item.orderCode,
                render: (item) => (
                    <div>
                        <div className="font-mono font-bold text-[#2563EB] text-xs hover:underline">
                            {item.orderCode}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {item.channelLabel}
                        </div>
                    </div>
                ),
            },
            {
                key: 'orderDate',
                header: 'Ngày đặt',
                sortable: true,
                sortValue: (item) => `${item.orderDate} ${item.orderTime}`,
                render: (item) => (
                    <div className="font-mono text-xs">
                        <div className="font-semibold text-slate-800">
                            {formatDateVN(item.orderDate)}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.orderTime}</div>
                    </div>
                ),
            },
            {
                key: 'customerName',
                header: 'Khách hàng & Sản phẩm',
                sortable: true,
                sortValue: (item) => item.customerName,
                render: (item) => (
                    <div className="max-w-xs xl:max-w-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                                {item.customerName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                                ({item.customerPhone})
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.primaryProductSummary}
                        </div>
                    </div>
                ),
            },
            {
                key: 'totalAmount',
                header: 'Tổng tiền',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.totalAmount,
                render: (item) => (
                    <div>
                        <div className="font-extrabold text-slate-900 font-mono text-xs">
                            {formatVND(item.totalAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                            {item.itemsCount} linh kiện
                        </div>
                    </div>
                ),
            },
            {
                key: 'paymentMethod',
                header: 'Phương thức thanh toán',
                sortable: true,
                sortValue: (item) => item.paymentMethodLabel,
                render: (item) => (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 text-xs font-medium">
                        <CreditCard className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        <span>{item.paymentMethodLabel}</span>
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Trạng thái hiện tại',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.statusLabel,
                render: (item) => {
                    const meta = ORDER_STATUS_META[item.status];
                    return (
                        <div className="inline-flex flex-col items-center">
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                                {meta.label}
                            </span>
                            {item.cancelReturnReasonText && (
                                <span className="text-[10px] text-rose-500 font-medium mt-0.5 max-w-[170px] truncate">
                                    {item.cancelReturnReasonText}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: 'processingHours',
                header: 'Thời gian xử lý TB',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.processingHours,
                render: (item) => {
                    const isFast = item.processingHours <= 12;
                    const isWarning = item.processingHours > 18;
                    return (
                        <div className="text-right">
                            <div className="font-mono font-bold text-slate-800 text-xs">
                                {item.processingHours.toFixed(1)} giờ
                            </div>
                            <span
                                className={`text-[10px] font-semibold ${
                                    isFast
                                        ? 'text-emerald-600'
                                        : isWarning
                                          ? 'text-amber-600'
                                          : 'text-slate-500'
                                }`}
                            >
                                {isFast ? 'Nhanh (Đạt SLA)' : isWarning ? 'Cần lưu ý SLA' : 'Đúng hạn SLA'}
                            </span>
                        </div>
                    );
                },
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
                            setSelectedOrderDetail(item);
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết đơn hàng"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                ),
            },
        ],
        []
    );

    const summaryColumns: Column<AggregatedOrderSummaryRow>[] = useMemo(
        () => [
            {
                key: 'name',
                header:
                    activeTableTab === 'SUMMARY_BY_DATE'
                        ? 'Mốc thời gian'
                        : 'Kênh bán hàng',
                sortable: true,
                sortValue: (item) => item.sortKey,
                render: (item) => (
                    <div>
                        <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.subLabel}</div>
                    </div>
                ),
            },
            {
                key: 'totalOrders',
                header: 'Tổng đơn phát sinh',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.totalOrders,
                render: (item) => (
                    <span className="font-extrabold text-slate-900 text-xs font-mono">
                        {formatNumber(item.totalOrders)} đơn
                    </span>
                ),
            },
            {
                key: 'deliveredOrders',
                header: 'Giao thành công',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.deliveredOrders,
                render: (item) => (
                    <div className="inline-flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                            {formatNumber(item.deliveredOrders)}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 font-mono">
                            ({item.deliveredRate}%)
                        </span>
                    </div>
                ),
            },
            {
                key: 'inProgressOrders',
                header: 'Đang xử lý / Đang giao',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.inProgressOrders,
                render: (item) => (
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#2563EB] border border-blue-200 font-bold text-xs">
                        {formatNumber(item.inProgressOrders)} đơn
                    </span>
                ),
            },
            {
                key: 'cancelledReturnedOrders',
                header: 'Đơn hủy & Hoàn trả',
                align: 'center',
                sortable: true,
                sortValue: (item) => item.cancelledReturnedOrders,
                render: (item) => (
                    <div className="inline-flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                            {formatNumber(item.cancelledReturnedOrders)}
                        </span>
                        <span className="text-[11px] font-semibold text-rose-600 font-mono">
                            ({item.cancelledReturnedRate}%)
                        </span>
                    </div>
                ),
            },
            {
                key: 'totalAmount',
                header: 'Tổng giá trị đơn',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.totalAmount,
                render: (item) => (
                    <span className="font-bold text-[#2563EB] font-mono text-xs">
                        {formatVND(item.totalAmount)}
                    </span>
                ),
            },
            {
                key: 'avgProcessingHours',
                header: 'Thời gian xử lý TB',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.avgProcessingHours,
                render: (item) => (
                    <span className="font-mono font-bold text-slate-800 text-xs">
                        {item.avgProcessingHours.toFixed(1)} giờ / đơn
                    </span>
                ),
            },
        ],
        [activeTableTab]
    );

    // Custom Tooltip cho Stacked Bar Chart
    const renderStackedBarTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const rowData = payload[0]?.payload;
        return (
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-3.5 min-w-[240px] text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                        {label}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] font-bold text-[10px]">
                        Tổng: {rowData?.total || 0} đơn
                    </span>
                </div>
                <div className="space-y-1 pt-0.5">
                    {ORDER_STATUS_LIST.map((st) => {
                        const count = rowData?.[st.code] || 0;
                        if (count === 0) return null;
                        return (
                            <div
                                key={st.code}
                                className="flex items-center justify-between gap-4"
                            >
                                <span className="text-slate-600 flex items-center gap-1.5">
                                    <span
                                        className="w-2.5 h-2.5 rounded-sm inline-block"
                                        style={{ backgroundColor: st.chartColor }}
                                    />
                                    {st.label}:
                                </span>
                                <span className="font-bold text-slate-900 font-mono">
                                    {count} đơn
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] space-y-6 pb-10">
            {/* ==================== PAGE HEADER ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-sm shrink-0">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                Báo cáo bán hàng
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">
                                Kỳ theo dõi: {formatDateVN(fromDate)} — {formatDateVN(toDate)}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                            Báo Cáo Tình Hình Đơn Hàng
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                            Theo dõi toàn diện tiến độ xử lý đơn hàng qua 8 trạng thái vận hành, tỷ lệ giao
                            hàng thành công, thời gian xử lý trung bình (SLA) và phân tích nguyên nhân hủy /
                            hoàn trả hàng linh kiện PC.
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

            {/* ==================== 1. FILTER BAR ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
                {/* Top Quick Presets & Time Axis Grouping */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-[#E2E8F0]">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                            <Filter className="w-4 h-4 text-[#2563EB]" />
                            Khoảng thời gian:
                        </span>
                        {[
                            { id: 'LAST_30_DAYS', label: '30 ngày qua' },
                            { id: 'THIS_QUARTER', label: 'Quý 4/2026' },
                            { id: 'LAST_6_MONTHS', label: '6 tháng gần nhất' },
                            { id: 'YEAR_2026', label: 'Năm 2026' },
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

                    <div className="flex items-center gap-2 self-start xl:self-auto">
                        <span className="text-xs font-semibold text-slate-500">Đơn vị trục biểu đồ:</span>
                        <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                            <button
                                type="button"
                                onClick={() => setTimeGrouping('DAY')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    timeGrouping === 'DAY'
                                        ? 'bg-[#2563EB] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Theo Ngày
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeGrouping('MONTH')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    timeGrouping === 'MONTH'
                                        ? 'bg-[#2563EB] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Theo Tháng
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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

                    {/* Trạng thái đơn hàng (8 trạng thái chuẩn) */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-[#2563EB]" />
                            Trạng thái đơn hàng
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">Tất cả 8 trạng thái ({baseFilteredRecords.length})</option>
                            {ORDER_STATUS_LIST.map((st) => (
                                <option key={st.code} value={st.code}>
                                    {st.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Kênh bán hàng */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-[#2563EB]" />
                            Kênh bán hàng
                        </label>
                        <select
                            value={selectedChannel}
                            onChange={(e) => {
                                setSelectedChannel(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">Tất cả kênh bán</option>
                            {(Object.keys(SALES_CHANNEL_LABELS) as SalesChannelType[]).map((ch) => (
                                <option key={ch} value={ch}>
                                    {SALES_CHANNEL_LABELS[ch]}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
                            Phương thức thanh toán
                        </label>
                        <select
                            value={selectedPayment}
                            onChange={(e) => {
                                setSelectedPayment(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                        >
                            <option value="ALL">Tất cả phương thức</option>
                            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodType[]).map((pm) => (
                                <option key={pm} value={pm}>
                                    {PAYMENT_METHOD_LABELS[pm]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quick Status Pills (8 trạng thái) */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus('ALL');
                                setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                selectedStatus === 'ALL'
                                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs'
                                    : 'bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:bg-slate-100'
                            }`}
                        >
                            Tất cả ({baseFilteredRecords.length})
                        </button>
                        {ORDER_STATUS_LIST.map((st) => {
                            const count = baseFilteredRecords.filter((r) => r.status === st.code).length;
                            const isActive = selectedStatus === st.code;
                            return (
                                <button
                                    key={st.code}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStatus(isActive ? 'ALL' : st.code);
                                        setCurrentPage(1);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                        isActive
                                            ? `${st.badgeBg} ${st.badgeText} ${st.badgeBorder} ring-2 ring-[#2563EB]/15 font-bold`
                                            : 'bg-white text-slate-600 border-[#E2E8F0] hover:bg-[#F8FAFC]'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${st.dotColor}`} />
                                    <span>{st.label}</span>
                                    <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại</span>
                    </button>
                </div>
            </div>

            {/* ==================== 2. 4 KPI CARDS ==================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* KPI 1: Tổng đơn phát sinh */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                1. Tổng đơn phát sinh
                            </p>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
                                    {formatNumber(kpiMetrics.totalOrders)}
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">đơn hàng</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Tổng giá trị phát sinh:</span>
                        <span className="font-bold text-slate-800 font-mono">
                            {formatVND(kpiMetrics.totalValue)}
                        </span>
                    </div>
                </div>

                {/* KPI 2: Đơn giao thành công (kèm tỷ lệ %) */}
                <div className="bg-white border-2 border-[#2563EB] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-[#2563EB] text-white text-[10px] font-bold rounded-bl-xl">
                        HOÀN TẤT GIAO
                    </div>
                    <div className="flex items-start justify-between gap-3 pt-1">
                        <div>
                            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                                2. Đơn giao thành công
                            </p>
                            <div className="flex items-baseline gap-2.5 mt-1.5">
                                <h3 className="text-2xl font-black text-emerald-600 font-mono">
                                    {formatNumber(kpiMetrics.deliveredCount)}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold font-mono">
                                    {kpiMetrics.deliveredRate.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-blue-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Doanh thu thực thu:</span>
                        <span className="font-bold text-[#2563EB] font-mono">
                            {formatVND(kpiMetrics.deliveredValue)}
                        </span>
                    </div>
                </div>

                {/* KPI 3: Đơn đang xử lý / đang giao */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                3. Đơn đang xử lý / đang giao
                            </p>
                            <div className="flex items-baseline gap-2.5 mt-1.5">
                                <h3 className="text-2xl font-extrabold text-[#2563EB] font-mono">
                                    {formatNumber(kpiMetrics.inProgressCount)}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-xs font-bold font-mono">
                                    {kpiMetrics.inProgressRate.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                            <Truck className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Thời gian xử lý TB:</span>
                        <span className="font-bold text-slate-800 font-mono">
                            {kpiMetrics.avgProcessingHours} giờ / đơn
                        </span>
                    </div>
                </div>

                {/* KPI 4: Đơn hủy & Hoàn trả (kèm tỷ lệ %) */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                4. Đơn hủy & Hoàn trả
                            </p>
                            <div className="flex items-baseline gap-2.5 mt-1.5">
                                <h3 className="text-2xl font-extrabold text-rose-600 font-mono">
                                    {formatNumber(kpiMetrics.cancelledReturnedCount)}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold font-mono">
                                    {kpiMetrics.cancelledReturnedRate.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                            Đã hủy: <strong className="text-rose-600">{kpiMetrics.cancelledCount}</strong> • Hoàn trả:{' '}
                            <strong className="text-orange-600">{kpiMetrics.returnedCount}</strong>
                        </span>
                        <span className="font-semibold text-rose-600 font-mono">
                            {formatVND(kpiMetrics.cancelledReturnedValue)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ==================== 3. CHARTS GRID (2 COLUMNS) ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cột 1 (7/12): Biểu đồ cột chồng (Stacked Bar Chart) số lượng đơn theo trạng thái */}
                <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="pb-3 border-b border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                            <h2 className="text-base font-bold text-slate-900">
                                Số Lượng Đơn Hàng Theo Trạng Thái Qua Các{' '}
                                {timeGrouping === 'DAY' ? 'Ngày' : 'Tháng'}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Biểu đồ cột chồng (Stacked Bar Chart) phản ánh cơ cấu trạng thái vận hành đơn
                            hàng theo từng kỳ
                        </p>
                    </div>

                    {stackedBarData.length === 0 ? (
                        <div className="h-[340px] flex items-center justify-center text-xs text-slate-400">
                            Không có dữ liệu biểu đồ trong kỳ đã chọn
                        </div>
                    ) : (
                        <div className="h-[340px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stackedBarData}
                                    margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#E2E8F0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="periodLabel"
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={renderStackedBarTooltip} />
                                    <Legend
                                        wrapperStyle={{
                                            fontSize: '11px',
                                            paddingTop: '10px',
                                            fontWeight: 600,
                                        }}
                                    />
                                    <Bar
                                        dataKey="DELIVERED"
                                        name="Giao thành công"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.DELIVERED.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="SHIPPING"
                                        name="Đang giao hàng"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.SHIPPING.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="PACKING"
                                        name="Đang đóng gói"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.PACKING.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="CONFIRMED"
                                        name="Đã xác nhận"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.CONFIRMED.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="PAID"
                                        name="Đã thanh toán"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.PAID.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="PENDING"
                                        name="Chờ xử lý"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.PENDING.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="CANCELLED"
                                        name="Đã hủy"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.CANCELLED.chartColor}
                                        maxBarSize={38}
                                    />
                                    <Bar
                                        dataKey="RETURNED"
                                        name="Hoàn trả"
                                        stackId="orders"
                                        fill={ORDER_STATUS_META.RETURNED.chartColor}
                                        radius={[5, 5, 0, 0]}
                                        maxBarSize={38}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Cột 2 (5/12): Biểu đồ tròn (Donut Chart) phân bổ lý do hủy đơn / hoàn trả hàng */}
                <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="pb-3 border-b border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-[#2563EB]" />
                            <h2 className="text-base font-bold text-slate-900">
                                Phân Bổ Lý Do Hủy Đơn & Hoàn Trả Hàng
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Thống kê nguyên nhân khách hủy đơn hoặc yêu cầu đổi trả linh kiện PC
                        </p>
                    </div>

                    {cancelReturnDonutData.length === 0 ? (
                        <div className="h-[340px] flex items-center justify-center text-xs text-slate-400">
                            Không có đơn hủy hoặc hoàn trả trong kỳ
                        </div>
                    ) : (
                        <div className="flex flex-col justify-between flex-1 space-y-3">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={cancelReturnDonutData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={52}
                                            outerRadius={82}
                                            paddingAngle={3}
                                        >
                                            {cancelReturnDonutData.map((entry) => (
                                                <Cell key={entry.id} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any, _name: any, props: any) => [
                                                `${value} đơn (${props?.payload?.percent || 0}%)`,
                                                props?.payload?.name || '',
                                            ]}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                borderColor: '#E2E8F0',
                                                fontSize: '12px',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bảng chú giải chi tiết tỷ trọng từng lý do */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 max-h-[155px] overflow-y-auto pr-1">
                                {cancelReturnDonutData.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg hover:bg-[#F8FAFC]"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-slate-700 font-medium truncate">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 font-mono">
                                            <span className="font-bold text-slate-900">
                                                {item.value} đơn
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                                {item.percent}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================== 4. SUMMARY & DETAILED DATATABLE ==================== */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
                <div className="p-5 pb-0 border-b border-[#E2E8F0] bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Bảng Danh Sách Tổng Hợp & Chi Tiết Tình Hình Đơn Hàng
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tra cứu danh sách đơn hàng chi tiết, đối soát theo ngày/tháng hoặc theo kênh bán
                                hàng kèm thời gian xử lý trung bình
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
                            <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
                            <span>
                                SLA chuẩn xử lý đơn PCStore: <strong className="text-slate-800">&le; 18.0 giờ</strong>
                            </span>
                        </div>
                    </div>

                    {/* Tabs chuyển chế độ bảng */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {[
                            {
                                id: 'DETAIL_ORDERS' as TableViewTab,
                                label: 'Danh sách đơn hàng chi tiết',
                                icon: ShoppingBag,
                                count: searchedDetailOrders.length,
                            },
                            {
                                id: 'SUMMARY_BY_DATE' as TableViewTab,
                                label: `Thống kê tổng hợp theo ${timeGrouping === 'DAY' ? 'Ngày' : 'Tháng'}`,
                                icon: Calendar,
                                count: stackedBarData.length,
                            },
                            {
                                id: 'SUMMARY_BY_CHANNEL' as TableViewTab,
                                label: 'Thống kê tổng hợp theo Kênh bán',
                                icon: Layers,
                                count: Object.keys(SALES_CHANNEL_LABELS).length,
                            },
                        ].map((tab) => {
                            const IconComp = tab.icon;
                            const isActive = activeTableTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTableTab(tab.id);
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

                {activeTableTab === 'DETAIL_ORDERS' ? (
                    <DataTable
                        columns={detailOrderColumns}
                        data={paginatedDetailOrders}
                        rowKey="id"
                        searchable={true}
                        searchQuery={tableSearchQuery}
                        onSearchChange={(val) => {
                            setTableSearchQuery(val);
                            setCurrentPage(1);
                        }}
                        searchPlaceholder="Tìm theo mã đơn, tên khách, SĐT, sản phẩm, phương thức thanh toán..."
                        defaultSortKey="orderDate"
                        defaultSortDirection="desc"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={searchedDetailOrders.length}
                        pageSize={pageSize}
                        pageSizeOptions={[10, 15, 25, 50]}
                        onPageChange={(p) => setCurrentPage(p)}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                            setCurrentPage(1);
                        }}
                        itemUnitName="đơn hàng"
                        onRowClick={(item) => setSelectedOrderDetail(item)}
                        className="border-0 rounded-none shadow-none"
                        toolbarRight={
                            <button
                                type="button"
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải CSV danh sách đơn</span>
                            </button>
                        }
                    />
                ) : (
                    <DataTable
                        columns={summaryColumns}
                        data={paginatedSummaryRows}
                        rowKey="id"
                        searchable={true}
                        searchQuery={tableSearchQuery}
                        onSearchChange={(val) => {
                            setTableSearchQuery(val);
                            setCurrentPage(1);
                        }}
                        searchPlaceholder="Tìm kiếm mốc thời gian hoặc kênh bán hàng..."
                        defaultSortKey="totalOrders"
                        defaultSortDirection="desc"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={searchedSummaryRows.length}
                        pageSize={pageSize}
                        pageSizeOptions={[10, 15, 25]}
                        onPageChange={(p) => setCurrentPage(p)}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                            setCurrentPage(1);
                        }}
                        itemUnitName="mục tổng hợp"
                        className="border-0 rounded-none shadow-none"
                        toolbarRight={
                            <button
                                type="button"
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải CSV bảng tổng hợp</span>
                            </button>
                        }
                    />
                )}
            </div>

            {/* ==================== ORDER DETAIL MODAL ==================== */}
            <AdminModal
                isOpen={!!selectedOrderDetail}
                onClose={() => setSelectedOrderDetail(null)}
                title={`Chi tiết đơn hàng: ${selectedOrderDetail?.orderCode || ''}`}
                subtitle={`Ngày đặt: ${
                    selectedOrderDetail ? formatDateVN(selectedOrderDetail.orderDate) : ''
                } lúc ${selectedOrderDetail?.orderTime || ''} • Kênh: ${
                    selectedOrderDetail?.channelLabel || ''
                }`}
                icon={ShoppingBag}
                size="lg"
                footer={
                    <AdminButton variant="secondary" onClick={() => setSelectedOrderDetail(null)}>
                        Đóng cửa sổ
                    </AdminButton>
                }
            >
                {selectedOrderDetail && (
                    <div className="space-y-5">
                        {/* Top status & customer info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#2563EB]" />
                                    Thông tin khách hàng
                                </div>
                                <div className="font-bold text-slate-900 text-sm">
                                    {selectedOrderDetail.customerName}
                                </div>
                                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {selectedOrderDetail.customerPhone}
                                </div>
                                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {selectedOrderDetail.customerCity}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
                                    Thanh toán & Giá trị
                                </div>
                                <div className="font-extrabold text-[#2563EB] text-base font-mono">
                                    {formatVND(selectedOrderDetail.totalAmount)}
                                </div>
                                <div className="text-xs text-slate-700 font-medium">
                                    {selectedOrderDetail.paymentMethodLabel}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Tổng số lượng: {selectedOrderDetail.itemsCount} sản phẩm
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                                    Trạng thái & SLA xử lý
                                </div>
                                <div>
                                    {(() => {
                                        const meta = ORDER_STATUS_META[selectedOrderDetail.status];
                                        return (
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                                                {meta.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="text-xs text-slate-700 font-mono">
                                    Thời gian xử lý: <strong>{selectedOrderDetail.processingHours} giờ</strong>
                                </div>
                                {selectedOrderDetail.cancelReturnReasonText && (
                                    <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        {selectedOrderDetail.cancelReturnReasonText}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-xs text-slate-800 uppercase">
                                Danh mục linh kiện PC trong đơn hàng
                            </div>
                            <table className="w-full text-left text-xs">
                                <thead className="bg-white text-slate-500 font-semibold uppercase border-b border-[#E2E8F0]">
                                    <tr>
                                        <th className="px-4 py-3">Mã SKU</th>
                                        <th className="px-4 py-3">Tên linh kiện / Sản phẩm</th>
                                        <th className="px-4 py-3 text-center">Nhóm</th>
                                        <th className="px-4 py-3 text-center">Số lượng</th>
                                        <th className="px-4 py-3 text-right">Đơn giá</th>
                                        <th className="px-4 py-3 text-right">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {selectedOrderDetail.items.map((it, i) => (
                                        <tr key={i} className="hover:bg-[#F8FAFC]">
                                            <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">
                                                {it.sku}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                {it.name}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                                                    {it.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-800">
                                                {it.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                {formatVND(it.unitPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                                                {formatVND(it.unitPrice * it.quantity)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
}

