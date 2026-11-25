import { useState, useMemo, useEffect } from 'react';
import {
    ShoppingBag,
    Clock,
    Calendar,
    RotateCcw,
    FileSpreadsheet,
    Printer,
    Download,
    Eye,
    AlertTriangle,
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
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { DataTable, type Column } from '../../../../components/admin/common/table';
import { AdminModal, AdminButton } from '../../../../components/admin/common/modal';
import { useToast } from '../../../../components/admin/common/toast';
import { SelectDropdown } from '../../../../components/admin/common/selectDropdown';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import { adminOrderService } from '../../../../services/adminOrderService';
import type { OrderStatusDistributionDto } from '../../../../types/adminAnalytics';
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

    // Live Backend Orders & Analytics States
    const [backendStatusDistribution, setBackendStatusDistribution] = useState<OrderStatusDistributionDto[] | null>(null);
    const [backendOrders, setBackendOrders] = useState<OrderStatusRecord[] | null>(null);
    const [isApiLoading, setIsApiLoading] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        const loadBackendOrderData = async () => {
            setIsApiLoading(true);
            try {
                const [distRes, ordersRes] = await Promise.allSettled([
                    adminAnalyticsService.getOrderStatusDistribution(),
                    adminOrderService.getAllOrders({
                        fromDate,
                        toDate,
                        size: 200,
                    }),
                ]);

                if (isMounted) {
                    if (distRes.status === 'fulfilled' && distRes.value.length > 0) {
                        setBackendStatusDistribution(distRes.value);
                    }
                    if (ordersRes.status === 'fulfilled' && ordersRes.value?.content && ordersRes.value.content.length > 0) {
                        const mapped: OrderStatusRecord[] = ordersRes.value.content.map((o) => {
                            let status: DetailedOrderStatus = 'PENDING';
                            if (o.status === 'CONFIRMED') status = 'CONFIRMED';
                            else if (o.status === 'PROCESSING') status = 'SHIPPING';
                            else if (o.status === 'COMPLETED') status = 'DELIVERED';
                            else if (o.status === 'CANCELLED') status = 'CANCELLED';
                            else if (o.status === 'RETURNED') status = 'RETURNED';

                            const d = o.createdDate ? new Date(o.createdDate) : new Date();
                            const orderDate = d.toISOString().slice(0, 10);
                            const orderTime = d.toTimeString().slice(0, 5);

                            const channel: SalesChannelType = o.type === 'IN_STORE' ? 'SHOWROOM_POS' : 'WEBSITE_ONLINE';
                            const channelLabel = o.type === 'IN_STORE' ? 'Mua trực tiếp tại Showroom' : 'Website PCStore Online';
                            const paymentMethod: PaymentMethodType = 'VNPAY_QR';
                            const paymentMethodLabel = 'VNPay QR Gateway';

                            return {
                                id: String(o.id),
                                orderId: o.code || `ORD-${o.id}`,
                                orderCode: o.code || `ORD-${o.id}`,
                                orderDate,
                                orderTime,
                                customerName: o.customerName || 'Khách hàng',
                                customerPhone: o.customerPhone || 'N/A',
                                customerCity: 'Hà Nội',
                                channel,
                                channelLabel,
                                paymentMethod,
                                paymentMethodLabel,
                                status,
                                statusLabel: ORDER_STATUS_META[status]?.label || status,
                                totalAmount: o.finalAmount || o.totalAmount || 0,
                                itemsCount: o.items?.length || 1,
                                primaryProductSummary: o.items?.[0]?.productName || 'Linh kiện PC',
                                processingHours: 12,
                                staffInCharge: 'Hệ thống',
                                deliveryPartner: 'Giao Hàng Nhanh (GHN)',
                                items: (o.items || []).map((it) => ({
                                    sku: it.productCode || `SKU-${it.productId}`,
                                    name: it.productName,
                                    category: 'Linh kiện PC',
                                    quantity: it.quantity,
                                    unitPrice: it.unitPrice || 0,
                                })),
                            };
                        });
                        setBackendOrders(mapped);
                    }
                }
            } catch {
                // Fallback to mock data if BE is unreachable
            } finally {
                if (isMounted) setIsApiLoading(false);
            }
        };

        loadBackendOrderData();
        return () => {
            isMounted = false;
        };
    }, [fromDate, toDate]);

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
    const activeSourceRecords = backendOrders && backendOrders.length > 0 ? backendOrders : MOCK_ORDER_STATUS_RECORDS;

    const baseFilteredRecords = useMemo(() => {
        return activeSourceRecords.filter((rec) => {
            if (fromDate && rec.orderDate < fromDate) return false;
            if (toDate && rec.orderDate > toDate) return false;
            if (selectedChannel !== 'ALL' && rec.channel !== selectedChannel) return false;
            if (selectedPayment !== 'ALL' && rec.paymentMethod !== selectedPayment) return false;
            return true;
        });
    }, [activeSourceRecords, fromDate, toDate, selectedChannel, selectedPayment]);

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
                        <div className="font-semibold text-blue-600 text-xs tabular-nums hover:underline">
                            {item.orderCode}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
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
                    <div className="text-xs tabular-nums">
                        <div className="font-medium text-slate-800">
                            {formatDateVN(item.orderDate)}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.orderTime}</div>
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
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900 text-xs">
                                {item.customerName}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
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
                header: 'Tổng giá trị',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.totalAmount,
                render: (item) => (
                    <div className="text-right tabular-nums">
                        <div className="font-semibold text-slate-900 text-xs">
                            {formatVND(item.totalAmount)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {item.itemsCount} linh kiện
                        </div>
                    </div>
                ),
            },
            {
                key: 'paymentMethod',
                header: 'Thanh toán',
                sortable: true,
                sortValue: (item) => item.paymentMethodLabel,
                render: (item) => (
                    <span className="text-xs text-slate-700">
                        {item.paymentMethodLabel}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Trạng thái',
                sortable: true,
                sortValue: (item) => item.statusLabel,
                render: (item) => {
                    const meta = ORDER_STATUS_META[item.status];
                    return (
                        <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotColor}`} />
                                <span>{meta.label}</span>
                            </span>
                            {item.cancelReturnReasonText && (
                                <span className="text-[11px] text-rose-600 mt-0.5 max-w-[180px] truncate">
                                    {item.cancelReturnReasonText}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: 'processingHours',
                header: 'Xử lý TB',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.processingHours,
                render: (item) => {
                    const isFast = item.processingHours <= 12;
                    const isWarning = item.processingHours > 18;
                    return (
                        <div className="text-right tabular-nums">
                            <div className="font-medium text-slate-800 text-xs">
                                {item.processingHours.toFixed(1)} giờ
                            </div>
                            <span
                                className={`text-[11px] ${
                                    isFast
                                        ? 'text-emerald-600'
                                        : isWarning
                                          ? 'text-amber-600'
                                          : 'text-slate-500'
                                }`}
                            >
                                {isFast ? 'Đạt SLA' : isWarning ? 'Vượt SLA' : 'Đúng hạn'}
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
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
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
                        <div className="font-medium text-slate-900 text-xs">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.subLabel}</div>
                    </div>
                ),
            },
            {
                key: 'totalOrders',
                header: 'Tổng đơn',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.totalOrders,
                render: (item) => (
                    <span className="font-semibold text-slate-900 text-xs tabular-nums">
                        {formatNumber(item.totalOrders)}
                    </span>
                ),
            },
            {
                key: 'deliveredOrders',
                header: 'Hoàn thành (%)',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.deliveredOrders,
                render: (item) => (
                    <div className="text-right tabular-nums">
                        <span className="font-medium text-slate-900 text-xs">
                            {formatNumber(item.deliveredOrders)}
                        </span>
                        <span className="text-[11px] text-emerald-600 ml-1.5">
                            ({item.deliveredRate.toFixed(1)}%)
                        </span>
                    </div>
                ),
            },
            {
                key: 'inProgressOrders',
                header: 'Đang xử lý / giao',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.inProgressOrders,
                render: (item) => (
                    <span className="font-medium text-slate-700 text-xs tabular-nums">
                        {formatNumber(item.inProgressOrders)}
                    </span>
                ),
            },
            {
                key: 'cancelledReturnedOrders',
                header: 'Hủy / Hoàn (%)',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.cancelledReturnedOrders,
                render: (item) => (
                    <div className="text-right tabular-nums">
                        <span className="font-medium text-slate-900 text-xs">
                            {formatNumber(item.cancelledReturnedOrders)}
                        </span>
                        <span className="text-[11px] text-rose-600 ml-1.5">
                            ({item.cancelledReturnedRate.toFixed(1)}%)
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
                    <span className="font-semibold text-slate-900 text-xs tabular-nums">
                        {formatVND(item.totalAmount)}
                    </span>
                ),
            },
            {
                key: 'avgProcessingHours',
                header: 'Xử lý TB',
                align: 'right',
                sortable: true,
                sortValue: (item) => item.avgProcessingHours,
                render: (item) => (
                    <span className="text-slate-700 text-xs tabular-nums">
                        {item.avgProcessingHours.toFixed(1)} giờ
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
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-3 min-w-[220px] text-xs space-y-2 tabular-nums">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-semibold text-slate-900">{label}</span>
                    <span className="text-[11px] font-medium text-slate-600">
                        Tổng: <strong className="text-slate-900">{formatNumber(rowData?.total || 0)}</strong> đơn
                    </span>
                </div>
                <div className="space-y-1">
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
                                        className="w-2 h-2 rounded-full inline-block shrink-0"
                                        style={{ backgroundColor: st.chartColor }}
                                    />
                                    {st.label}
                                </span>
                                <span className="font-semibold text-slate-900">
                                    {formatNumber(count)} đơn
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
            {/* ==================== PAGE HEADER ==================== */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Báo cáo bán hàng</span>
                        <span className="text-slate-300">/</span>
                        <span className="tabular-nums">
                            Kỳ theo dõi: {formatDateVN(fromDate)} — {formatDateVN(toDate)}
                        </span>
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
                        Báo cáo tình hình đơn hàng
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                        Theo dõi tiến độ xử lý qua 8 trạng thái vận hành, tỷ lệ giao thành công, thời gian xử lý trung bình (SLA) và nguyên nhân hủy / hoàn trả.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>In báo cáo</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Xuất Excel / CSV</span>
                    </button>
                </div>
            </div>

            {/* ==================== 1. FILTER BAR ==================== */}
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3.5">
                {/* Top Quick Presets & Time Axis Grouping */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-600 mr-1">
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
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                                    activeDatePreset === preset.id
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 self-start xl:self-auto">
                        <span className="text-xs text-slate-500">Nhóm theo:</span>
                        <div className="inline-flex p-0.5 rounded-md bg-slate-100 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setTimeGrouping('DAY')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                    timeGrouping === 'DAY'
                                        ? 'bg-white text-slate-900 border border-slate-200'
                                        : 'text-slate-600 hover:text-slate-900 border border-transparent'
                                }`}
                            >
                                Ngày
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeGrouping('MONTH')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                    timeGrouping === 'MONTH'
                                        ? 'bg-white text-slate-900 border border-slate-200'
                                        : 'text-slate-600 hover:text-slate-900 border border-transparent'
                                }`}
                            >
                                Tháng
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Từ ngày */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">
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
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                        />
                    </div>

                    {/* Đến ngày */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">
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
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                        />
                    </div>

                    {/* Trạng thái đơn hàng (8 trạng thái chuẩn) */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">
                            Trạng thái đơn hàng
                        </label>
                        <SelectDropdown
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: `Tất cả 8 trạng thái (${baseFilteredRecords.length})`, value: 'ALL' },
                                ...ORDER_STATUS_LIST.map((st) => ({ label: st.label, value: st.code })),
                            ]}
                            size="sm"
                            className="w-full"
                            triggerClassName="h-9 bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>

                    {/* Kênh bán hàng */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">
                            Kênh đặt hàng
                        </label>
                        <SelectDropdown
                            value={selectedChannel}
                            onChange={(e) => {
                                setSelectedChannel(e.target.value);
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: 'Tất cả kênh bán', value: 'ALL' },
                                ...(Object.keys(SALES_CHANNEL_LABELS) as SalesChannelType[]).map((ch) => ({
                                    label: SALES_CHANNEL_LABELS[ch],
                                    value: ch,
                                })),
                            ]}
                            size="sm"
                            className="w-full"
                            triggerClassName="h-9 bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 block">
                            Phương thức thanh toán
                        </label>
                        <SelectDropdown
                            value={selectedPayment}
                            onChange={(e) => {
                                setSelectedPayment(e.target.value);
                                setCurrentPage(1);
                            }}
                            options={[
                                { label: 'Tất cả phương thức', value: 'ALL' },
                                ...(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodType[]).map((pm) => ({
                                    label: PAYMENT_METHOD_LABELS[pm],
                                    value: pm,
                                })),
                            ]}
                            size="sm"
                            className="w-full"
                            triggerClassName="h-9 bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        />
                    </div>
                </div>

                {/* Quick Status Filters (8 trạng thái) */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus('ALL');
                                setCurrentPage(1);
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border tabular-nums ${
                                selectedStatus === 'ALL'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            Tất cả ({formatNumber(baseFilteredRecords.length)})
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
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border tabular-nums ${
                                        isActive
                                            ? 'bg-slate-100 text-slate-900 border-slate-400 font-semibold'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dotColor}`} />
                                    <span>{st.label}</span>
                                    <span className="text-[11px] text-slate-400">
                                        {formatNumber(count)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại</span>
                    </button>
                </div>
            </div>

            {/* ==================== 2. FLAT 4-COLUMN KPI STRIP ==================== */}
            <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                {/* KPI 1: Tổng đơn phát sinh */}
                <div className="p-4 flex flex-col justify-between gap-2.5">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Tổng đơn phát sinh</p>
                        <div className="flex items-baseline gap-1.5 mt-1 tabular-nums">
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {formatNumber(kpiMetrics.totalOrders)}
                            </span>
                            <span className="text-xs text-slate-500">đơn</span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
                        <span className="text-slate-500">Tổng giá trị</span>
                        <span className="font-medium text-slate-800">
                            {formatVND(kpiMetrics.totalValue)}
                        </span>
                    </div>
                </div>

                {/* KPI 2: Đơn giao thành công */}
                <div className="p-4 flex flex-col justify-between gap-2.5">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Hoàn thành giao hàng</p>
                        <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {formatNumber(kpiMetrics.deliveredCount)}
                            </span>
                            <span className="text-xs font-medium text-emerald-600">
                                {kpiMetrics.deliveredRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
                        <span className="text-slate-500">Doanh thu thực thu</span>
                        <span className="font-medium text-slate-800">
                            {formatVND(kpiMetrics.deliveredValue)}
                        </span>
                    </div>
                </div>

                {/* KPI 3: Đơn đang xử lý / đang giao */}
                <div className="p-4 flex flex-col justify-between gap-2.5">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Đang xử lý / Đang giao</p>
                        <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {formatNumber(kpiMetrics.inProgressCount)}
                            </span>
                            <span className="text-xs font-medium text-blue-600">
                                {kpiMetrics.inProgressRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
                        <span className="text-slate-500">Xử lý trung bình</span>
                        <span className="font-medium text-slate-800">
                            {kpiMetrics.avgProcessingHours} giờ / đơn
                        </span>
                    </div>
                </div>

                {/* KPI 4: Đơn hủy & Hoàn trả */}
                <div className="p-4 flex flex-col justify-between gap-2.5">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Đơn hủy &amp; Hoàn trả</p>
                        <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {formatNumber(kpiMetrics.cancelledReturnedCount)}
                            </span>
                            <span className="text-xs font-medium text-rose-600">
                                {kpiMetrics.cancelledReturnedRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs tabular-nums">
                        <span className="text-slate-500 truncate">
                            Hủy: <strong className="font-medium text-slate-700">{kpiMetrics.cancelledCount}</strong> • Hoàn:{' '}
                            <strong className="font-medium text-slate-700">{kpiMetrics.returnedCount}</strong>
                        </span>
                        <span className="font-medium text-rose-600 shrink-0">
                            {formatVND(kpiMetrics.cancelledReturnedValue)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ==================== 3. CHARTS GRID (2 COLUMNS) ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Cột 1 (7/12): Biểu đồ cột chồng (Stacked Bar Chart) số lượng đơn theo trạng thái */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Diễn biến đơn hàng theo trạng thái ({timeGrouping === 'DAY' ? 'theo ngày' : 'theo tháng'})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Cơ cấu 8 trạng thái vận hành đơn hàng qua từng kỳ
                        </p>
                    </div>

                    {stackedBarData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
                            Không có dữ liệu biểu đồ trong kỳ đã chọn
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stackedBarData}
                                        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#E2E8F0"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="periodLabel"
                                            tick={{ fontSize: 11, fill: '#64748B' }}
                                            axisLine={{ stroke: '#E2E8F0' }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748B' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={renderStackedBarTooltip} />
                                        <Bar
                                            dataKey="DELIVERED"
                                            name="Giao thành công"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.DELIVERED.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="SHIPPING"
                                            name="Đang giao hàng"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.SHIPPING.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="PACKING"
                                            name="Đang đóng gói"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.PACKING.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="CONFIRMED"
                                            name="Đã xác nhận"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.CONFIRMED.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="PAID"
                                            name="Đã thanh toán"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.PAID.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="PENDING"
                                            name="Chờ xử lý"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.PENDING.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="CANCELLED"
                                            name="Đã hủy"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.CANCELLED.chartColor}
                                            maxBarSize={34}
                                        />
                                        <Bar
                                            dataKey="RETURNED"
                                            name="Hoàn trả"
                                            stackId="orders"
                                            fill={ORDER_STATUS_META.RETURNED.chartColor}
                                            radius={[3, 3, 0, 0]}
                                            maxBarSize={34}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Custom responsive legend (never overlaps chart at 768px) */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                                {ORDER_STATUS_LIST.map((st) => (
                                    <span key={st.code} className="inline-flex items-center gap-1.5">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: st.chartColor }}
                                        />
                                        <span>{st.label}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cột 2 (5/12): Biểu đồ tròn (Donut Chart) phân bổ lý do hủy đơn / hoàn trả hàng */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Phân bổ lý do hủy đơn &amp; hoàn trả
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Tỷ trọng nguyên nhân khách hủy hoặc yêu cầu đổi trả
                        </p>
                    </div>

                    {cancelReturnDonutData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
                            Không có đơn hủy hoặc hoàn trả trong kỳ
                        </div>
                    ) : (
                        <div className="flex flex-col justify-between flex-1 space-y-3">
                            <div className="h-[185px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={cancelReturnDonutData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={78}
                                            paddingAngle={2}
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
                                                borderRadius: '6px',
                                                borderColor: '#E2E8F0',
                                                fontSize: '12px',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bảng chú giải chi tiết tỷ trọng từng lý do */}
                            <div className="space-y-1 pt-2 border-t border-slate-100 max-h-[155px] overflow-y-auto pr-1">
                                {cancelReturnDonutData.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded-md hover:bg-slate-50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-slate-700 truncate">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                                            <span className="font-medium text-slate-900">
                                                {formatNumber(item.value)} đơn
                                            </span>
                                            <span className="text-[11px] text-slate-500 w-10 text-right">
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
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <div className="px-5 pt-4 pb-0 border-b border-slate-200 bg-white space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Bảng thống kê &amp; danh sách chi tiết đơn hàng
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tra cứu đơn hàng chi tiết hoặc đối soát tổng hợp theo kỳ và kênh bán
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 tabular-nums shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>
                                SLA chuẩn: <strong className="font-semibold text-slate-900">&le; 18.0 giờ</strong>
                            </span>
                        </div>
                    </div>

                    {/* Tabs chuyển chế độ bảng */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
                        {[
                            {
                                id: 'DETAIL_ORDERS' as TableViewTab,
                                label: 'Danh sách đơn chi tiết',
                                icon: ShoppingBag,
                                count: searchedDetailOrders.length,
                            },
                            {
                                id: 'SUMMARY_BY_DATE' as TableViewTab,
                                label: `Tổng hợp theo ${timeGrouping === 'DAY' ? 'Ngày' : 'Tháng'}`,
                                icon: Calendar,
                                count: stackedBarData.length,
                            },
                            {
                                id: 'SUMMARY_BY_CHANNEL' as TableViewTab,
                                label: 'Tổng hợp theo Kênh bán',
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
                                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                                        isActive
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <IconComp className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {formatNumber(tab.count)}
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
                        searchPlaceholder="Tìm theo mã đơn, tên khách, SĐT, sản phẩm, thanh toán..."
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải CSV</span>
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải CSV</span>
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
                    <div className="space-y-4">
                        {/* Top status & customer info (flat 3-column divide-x strip) */}
                        <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                            <div className="p-3.5 space-y-1">
                                <div className="text-[11px] font-medium text-slate-500">
                                    Thông tin khách hàng
                                </div>
                                <div className="font-semibold text-slate-900 text-sm">
                                    {selectedOrderDetail.customerName}
                                </div>
                                <div className="text-xs text-slate-600 tabular-nums">
                                    {selectedOrderDetail.customerPhone} • {selectedOrderDetail.customerCity}
                                </div>
                            </div>

                            <div className="p-3.5 space-y-1 tabular-nums">
                                <div className="text-[11px] font-medium text-slate-500">
                                    Thanh toán &amp; Giá trị
                                </div>
                                <div className="font-semibold text-slate-900 text-base">
                                    {formatVND(selectedOrderDetail.totalAmount)}
                                </div>
                                <div className="text-xs text-slate-600">
                                    {selectedOrderDetail.paymentMethodLabel} • {selectedOrderDetail.itemsCount} sản phẩm
                                </div>
                            </div>

                            <div className="p-3.5 space-y-1">
                                <div className="text-[11px] font-medium text-slate-500">
                                    Trạng thái &amp; SLA xử lý
                                </div>
                                <div>
                                    {(() => {
                                        const meta = ORDER_STATUS_META[selectedOrderDetail.status];
                                        return (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                                                {meta.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="text-xs text-slate-600 tabular-nums">
                                    Thời gian xử lý: <strong className="font-medium text-slate-900">{selectedOrderDetail.processingHours} giờ</strong>
                                </div>
                                {selectedOrderDetail.cancelReturnReasonText && (
                                    <div className="text-xs text-rose-600 flex items-center gap-1 pt-0.5">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{selectedOrderDetail.cancelReturnReasonText}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700">
                                Danh mục linh kiện PC trong đơn hàng
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Mã SKU</th>
                                            <th className="px-3.5 py-2.5">Tên linh kiện / Sản phẩm</th>
                                            <th className="px-3.5 py-2.5">Nhóm</th>
                                            <th className="px-3.5 py-2.5 text-right">SL</th>
                                            <th className="px-3.5 py-2.5 text-right">Đơn giá</th>
                                            <th className="px-3.5 py-2.5 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 tabular-nums">
                                        {selectedOrderDetail.items.map((it, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-3.5 py-2.5 font-medium text-blue-600 whitespace-nowrap">
                                                    {it.sku}
                                                </td>
                                                <td className="px-3.5 py-2.5 font-medium text-slate-900">
                                                    {it.name}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                                                    {it.category}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">
                                                    {it.quantity}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right text-slate-700 whitespace-nowrap">
                                                    {formatVND(it.unitPrice)}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                                                    {formatVND(it.unitPrice * it.quantity)}
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

