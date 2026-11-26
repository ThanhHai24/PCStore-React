import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CreditCard,
    CheckCircle2,
    Download,
    RefreshCw,
    Plus,
    Copy,
    Settings,
    Printer,
    BarChart3,
    Check,
    SlidersHorizontal,
    ArrowLeftRight,
    Calendar,
    RotateCw,
    X,
    ExternalLink,
} from 'lucide-react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from 'recharts';
import { SearchBar } from '../../../components/admin/common/searchbar';
import { SelectDropdown } from '../../../components/admin/common/selectDropdown';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminButton,
    AdminSelect,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminPaymentService, formatVND } from '../../../services/adminPaymentService';
import type { ZaloPayCreateResponse } from '../../../services/paymentService';
import type {
    PaymentMethodCode,
    PaymentMethodInfo,
    PaymentStats,
    PaymentTransaction,
    PaymentTransactionStatus,
} from '../../../types/adminPayment';
import type { OrderResponse } from '../../../types/adminOrder';

function formatDateTime(iso?: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return iso;
    }
}

const METHOD_META: Record<
    PaymentMethodCode,
    { label: string; shortLabel: string; chartColor: string }
> = {
    ZALOPAY: {
        label: 'ZaloPay Sandbox',
        shortLabel: 'ZaloPay',
        chartColor: '#0284c7',
    },
    COD: {
        label: 'Thu hộ (COD)',
        shortLabel: 'COD',
        chartColor: '#d97706',
    },
};

export default function PaymentManagementList() {
    const { addToast } = useToast();

    const [activeSection, setActiveSection] = useState<'TRANSACTIONS' | 'METHODS'>('TRANSACTIONS');

    // Real backend data states
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [stats, setStats] = useState<PaymentStats>({
        totalTransactions: 0,
        todayTransactions: 0,
        successCount: 0,
        pendingCount: 0,
        failedCount: 0,
        totalSuccessAmount: 0,
        totalPendingAmount: 0,
    });
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterValues, setFilterValues] = useState<Record<string, string>>({
        status: '',
        method: '',
        dateRange: '',
        startDate: '',
        endDate: '',
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [showAnalytics, setShowAnalytics] = useState<boolean>(false);

    // Detail Modal
    const [detailTxn, setDetailTxn] = useState<PaymentTransaction | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    // Create Payment Modal (BE: POST /api/payments/cod or POST /api/payments/zalopay/create)
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [creating, setCreating] = useState<boolean>(false);
    const [eligibleOrders, setEligibleOrders] = useState<OrderResponse[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodCode>('COD');
    const [zaloPayCreated, setZaloPayCreated] = useState<ZaloPayCreateResponse | null>(null);

    // Confirm Modal
    const [confirmAction, setConfirmAction] = useState<{
        type: 'CONFIRM_COD' | 'BATCH_CONFIRM_COD';
        txn?: PaymentTransaction;
    } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [list, methods] = await Promise.all([
                adminPaymentService.getTransactions({
                    keyword: searchQuery,
                    status: filterValues.status || undefined,
                    method: filterValues.method || undefined,
                    dateRange: filterValues.dateRange || undefined,
                    startDate: filterValues.startDate || undefined,
                    endDate: filterValues.endDate || undefined,
                }),
                adminPaymentService.getPaymentMethods(),
            ]);

            setStats(adminPaymentService.computeStats(list));
            setTransactions(list);
            setPaymentMethods(methods);
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách giao dịch thanh toán từ máy chủ.';
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu thanh toán',
                message: msg,
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterValues, addToast]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            adminPaymentService.getTransactions({
                keyword: searchQuery,
                status: filterValues.status || undefined,
                method: filterValues.method || undefined,
                dateRange: filterValues.dateRange || undefined,
                startDate: filterValues.startDate || undefined,
                endDate: filterValues.endDate || undefined,
            }),
            adminPaymentService.getPaymentMethods(),
        ])
            .then(([list, methods]) => {
                if (cancelled) return;
                setStats(adminPaymentService.computeStats(list));
                setTransactions(list);
                setPaymentMethods(methods);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg =
                    err instanceof Error
                        ? err.message
                        : 'Không thể tải danh sách giao dịch thanh toán từ máy chủ.';
                addToast({
                    type: 'error',
                    title: 'Lỗi tải dữ liệu thanh toán',
                    message: msg,
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [searchQuery, filterValues, addToast]);

    const totalItems = transactions.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedTransactions = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        return transactions.slice(start, start + pageSize);
    }, [transactions, safeCurrentPage, pageSize]);

    // Chart analytics
    const chartData = useMemo(() => {
        const methodMap: Record<string, number> = {};
        for (const t of transactions) {
            if (t.status === 'SUCCESS') {
                methodMap[t.method] = (methodMap[t.method] || 0) + t.amount;
            }
        }
        const pieData = Object.entries(methodMap).map(([code, value]) => ({
            name: METHOD_META[code as PaymentMethodCode]?.label || code,
            value,
            color: METHOD_META[code as PaymentMethodCode]?.chartColor || '#2563eb',
        }));

        const statusBarData = [
            { name: 'Đã thanh toán', count: stats.successCount, fill: '#10b981' },
            { name: 'Chờ thanh toán', count: stats.pendingCount, fill: '#f59e0b' },
            { name: 'Thất bại', count: stats.failedCount, fill: '#f43f5e' },
        ];

        return { pieData, statusBarData };
    }, [transactions, stats]);

    const updateFilter = (key: string, value: string) => {
        setFilterValues((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterValues({
            status: '',
            method: '',
            dateRange: '',
            startDate: '',
            endDate: '',
        });
        setCurrentPage(1);
    };

    const activeAdvancedCount = [filterValues.startDate, filterValues.endDate].filter(Boolean).length;

    const hasAnyFilter =
        Boolean(searchQuery.trim()) || Object.values(filterValues).some((v) => Boolean(v));

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast({
            type: 'info',
            title: 'Đã sao chép',
            message: `Đã sao chép ${label} vào bộ nhớ tạm.`,
        });
    };

    const handleOpenCreate = async () => {
        setSelectedOrderId('');
        setSelectedMethod('COD');
        setZaloPayCreated(null);
        setIsCreateOpen(true);
        try {
            const orders = await adminPaymentService.getEligibleOrdersForPayment();
            setEligibleOrders(orders);
        } catch (err: unknown) {
            setEligibleOrders([]);
            addToast({
                type: 'error',
                title: 'Không thể tải danh sách đơn hàng',
                message: err instanceof Error ? err.message : 'Vui lòng thử lại sau.',
            });
        }
    };

    const selectedOrderObj = useMemo(
        () => eligibleOrders.find((o) => String(o.id) === selectedOrderId) || null,
        [eligibleOrders, selectedOrderId]
    );

    const handleSubmitCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const orderIdNum = Number(selectedOrderId);
        if (!orderIdNum) {
            addToast({
                type: 'warning',
                title: 'Chưa chọn đơn hàng',
                message: 'Vui lòng chọn một đơn hàng từ hệ thống để khởi tạo thanh toán.',
            });
            return;
        }

        setCreating(true);
        try {
            if (selectedMethod === 'COD') {
                const res = await adminPaymentService.createCodPayment(orderIdNum);
                setIsCreateOpen(false);
                addToast({
                    type: 'success',
                    title: 'Đăng ký thanh toán COD thành công',
                    message: `Đã tạo bản ghi COD ${res.transactionCode || `#${res.id}`} cho đơn hàng ${res.orderCode || `#${orderIdNum}`}.`,
                });
                await loadData();
            } else {
                const redirectUrl = `${window.location.origin}/payment/zalopay-return`;
                const res = await adminPaymentService.createZaloPayOrder({
                    orderId: orderIdNum,
                    redirectUrl,
                });
                setZaloPayCreated(res);
                addToast({
                    type: 'success',
                    title: 'Tạo giao dịch ZaloPay thành công',
                    message: `Mã giao dịch ${res.appTransId} đã được khởi tạo trên ZaloPay Sandbox.`,
                });
                await loadData();
            }
        } catch (err: unknown) {
            addToast({
                type: 'error',
                title: 'Không thể tạo giao dịch thanh toán',
                message: err instanceof Error ? err.message : 'Lỗi khi gọi API thanh toán.',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleSyncZaloPay = async (txn: PaymentTransaction) => {
        if (!txn.transactionCode) return;
        setSyncingId(txn.id);
        try {
            const res = await adminPaymentService.syncZaloPayStatus(txn.transactionCode);
            const statusUpper = String(res.paymentStatus || '').toUpperCase();
            addToast({
                type: res.paid || statusUpper === 'SUCCESS' ? 'success' : statusUpper === 'FAILED' ? 'warning' : 'info',
                title: 'Đã đồng bộ trạng thái ZaloPay',
                message:
                    res.returnMessage ||
                    `Trạng thái hiện tại của ${txn.transactionCode}: ${statusUpper || txn.status}.`,
            });
            await loadData();
            if (detailTxn?.id === txn.id) {
                setDetailTxn((prev) =>
                    prev
                        ? {
                              ...prev,
                              status:
                                  statusUpper === 'SUCCESS'
                                      ? 'SUCCESS'
                                      : statusUpper === 'FAILED'
                                      ? 'FAILED'
                                      : prev.status,
                              paidAt: res.paidAt ?? prev.paidAt,
                          }
                        : prev
                );
            }
        } catch (err: unknown) {
            addToast({
                type: 'error',
                title: 'Lỗi đồng bộ ZaloPay',
                message: err instanceof Error ? err.message : 'Không thể truy vấn trạng thái từ ZaloPay.',
            });
        } finally {
            setSyncingId(null);
        }
    };

    const handleBatchSyncZaloPay = async () => {
        const targets = transactions.filter(
            (t) => selectedIds.includes(t.id) && t.status === 'PENDING' && t.method === 'ZALOPAY'
        );
        if (targets.length === 0) return;

        let successCount = 0;
        let errorCount = 0;
        for (const t of targets) {
            try {
                await adminPaymentService.syncZaloPayStatus(t.transactionCode);
                successCount++;
            } catch {
                errorCount++;
            }
        }

        setSelectedIds([]);
        await loadData();
        addToast({
            type: errorCount === 0 ? 'success' : 'warning',
            title: 'Đồng bộ ZaloPay hoàn tất',
            message: `Đã truy vấn ${successCount}/${targets.length} giao dịch ZaloPay${errorCount > 0 ? ` (${errorCount} lỗi)` : ''}.`,
        });
    };

    const handleExecuteConfirm = async () => {
        if (!confirmAction) return;

        if (confirmAction.type === 'CONFIRM_COD' && confirmAction.txn) {
            const targetTxn = confirmAction.txn;
            try {
                const updated = await adminPaymentService.confirmCodPayment(targetTxn.orderId);
                if (detailTxn?.id === targetTxn.id) {
                    setDetailTxn((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  status: 'SUCCESS',
                                  paidAt: updated.paidAt || new Date().toISOString(),
                              }
                            : prev
                    );
                }
                addToast({
                    type: 'success',
                    title: 'Xác nhận thu tiền COD thành công',
                    message: `Đơn hàng ${targetTxn.orderCode} (${formatVND(targetTxn.amount)}) đã được ghi nhận thanh toán.`,
                });
            } catch (err: unknown) {
                addToast({
                    type: 'error',
                    title: 'Không thể xác nhận thu tiền COD',
                    message: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.',
                });
            }
        } else if (confirmAction.type === 'BATCH_CONFIRM_COD') {
            const targets = transactions.filter(
                (t) => selectedIds.includes(t.id) && t.status === 'PENDING' && t.method === 'COD'
            );
            let okCount = 0;
            let failCount = 0;
            for (const t of targets) {
                try {
                    await adminPaymentService.confirmCodPayment(t.orderId);
                    okCount++;
                } catch {
                    failCount++;
                }
            }
            setSelectedIds([]);
            addToast({
                type: failCount === 0 ? 'success' : 'warning',
                title: 'Xác nhận COD hàng loạt hoàn tất',
                message: `Đã xác nhận thu tiền COD cho ${okCount}/${targets.length} giao dịch${failCount > 0 ? ` (${failCount} lỗi)` : ''}.`,
            });
        }

        setConfirmAction(null);
        await loadData();
    };

    const handleExportCsv = () => {
        const list =
            selectedIds.length > 0
                ? transactions.filter((t) => selectedIds.includes(t.id))
                : transactions;
        adminPaymentService.exportToCsv(list);
        addToast({
            type: 'success',
            title: 'Xuất file CSV thành công',
            message: `Đã xuất ${list.length} giao dịch thanh toán ra tệp CSV.`,
        });
    };

    const renderStatusIndicator = (status: PaymentTransactionStatus) => {
        switch (status) {
            case 'SUCCESS':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Đã thanh toán</span>
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Chờ thanh toán</span>
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Thất bại</span>
                    </span>
                );
        }
    };

    const renderMethodBadge = (method: PaymentMethodCode) => {
        const meta = METHOD_META[method] || METHOD_META.COD;
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 whitespace-nowrap">
                {meta.shortLabel}
            </span>
        );
    };

    const columns: Column<PaymentTransaction>[] = [
        {
            key: 'transactionCode',
            header: 'Mã giao dịch',
            headerClassName: 'w-[220px]',
            render: (txn) => (
                <div className="space-y-0.5 min-w-0 max-w-[210px]">
                    <div
                        className="font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap truncate"
                        title={txn.transactionCode}
                    >
                        {txn.transactionCode}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums min-w-0">
                        <span className="truncate" title={txn.orderCode}>
                            {txn.orderCode}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            headerClassName: 'w-[185px]',
            render: (txn) => (
                <div className="space-y-0.5 min-w-0 max-w-[175px]">
                    <p className="text-xs font-medium text-slate-900 truncate" title={txn.customerName}>
                        {txn.customerName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        {txn.customerPhone}
                    </p>
                </div>
            ),
        },
        {
            key: 'method',
            header: 'Phương thức',
            headerClassName: 'w-[180px]',
            render: (txn) => (
                <div className="space-y-0.5 min-w-0 max-w-[170px]">
                    <div>{renderMethodBadge(txn.method)}</div>
                    <p className="text-[11px] text-slate-500 truncate" title={txn.paymentMethodName}>
                        {txn.paymentMethodName}
                    </p>
                </div>
            ),
        },
        {
            key: 'amount',
            header: 'Số tiền',
            align: 'right',
            sortable: true,
            sortValue: (item) => item.amount,
            headerClassName: 'w-[145px]',
            render: (txn) => (
                <div
                    className={`text-xs font-semibold tabular-nums whitespace-nowrap ${
                        txn.status === 'FAILED' ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                >
                    {formatVND(txn.amount)}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            headerClassName: 'w-[140px]',
            render: (txn) => (
                <div className="space-y-0.5 whitespace-nowrap">
                    <div>{renderStatusIndicator(txn.status)}</div>
                    {txn.paidAt && (
                        <div className="text-[11px] text-slate-500 tabular-nums">
                            Thu: {formatDateTime(txn.paidAt)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'displayTime',
            header: 'Thời gian',
            align: 'right',
            sortable: true,
            sortValue: (item) => (item.displayTime ? new Date(item.displayTime).getTime() : 0),
            headerClassName: 'w-[135px]',
            render: (txn) => (
                <div className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDateTime(txn.displayTime)}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            headerClassName: 'w-[84px]',
            render: (txn) => (
                <AdminActionDropdown
                    onView={() => {
                        setDetailTxn(txn);
                        setIsDetailOpen(true);
                    }}
                    viewLabel="Xem chi tiết giao dịch"
                    moreActions={[
                        {
                            key: 'print',
                            label: 'In biên lai thanh toán',
                            icon: Printer,
                            onClick: () => adminPaymentService.printReceipt(txn),
                        },
                        ...(txn.status === 'PENDING' && txn.method === 'COD'
                            ? [
                                  {
                                      key: 'confirm-cod',
                                      label: 'Xác nhận đã thu tiền COD',
                                      icon: CheckCircle2,
                                      onClick: () => setConfirmAction({ type: 'CONFIRM_COD', txn }),
                                  },
                              ]
                            : []),
                        ...(txn.status === 'PENDING' && txn.method === 'ZALOPAY'
                            ? [
                                  {
                                      key: 'sync-zalopay',
                                      label:
                                          syncingId === txn.id
                                              ? 'Đang đồng bộ ZaloPay...'
                                              : 'Đồng bộ trạng thái ZaloPay',
                                      icon: RefreshCw,
                                      onClick: () => handleSyncZaloPay(txn),
                                  },
                              ]
                            : []),
                        {
                            key: 'copy',
                            label: 'Sao chép mã giao dịch',
                            icon: Copy,
                            onClick: () => handleCopy(txn.transactionCode, 'Mã giao dịch'),
                        },
                    ]}
                />
            ),
        },
    ];

    const pendingCodSelectedCount = useMemo(
        () =>
            transactions.filter(
                (t) => selectedIds.includes(t.id) && t.status === 'PENDING' && t.method === 'COD'
            ).length,
        [transactions, selectedIds]
    );

    const pendingZaloPaySelectedCount = useMemo(
        () =>
            transactions.filter(
                (t) => selectedIds.includes(t.id) && t.status === 'PENDING' && t.method === 'ZALOPAY'
            ).length,
        [transactions, selectedIds]
    );

    return (
        <div className="w-full space-y-4 min-w-0 font-sans">
            {/* Compact Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý thanh toán
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Giám sát giao dịch COD &amp; ZaloPay Sandbox, xác nhận thu tiền COD và đồng bộ trạng thái trực tiếp từ hệ thống.
                    </p>
                </div>

                {/* Header Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {activeSection === 'TRANSACTIONS' && (
                        <>
                            <button
                                type="button"
                                onClick={() => loadData()}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs rounded-md border border-slate-200 transition-colors disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                title="Tải lại danh sách"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                                <span>Làm mới</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAnalytics(!showAnalytics)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs rounded-md border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                                    showAnalytics
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 border-slate-200'
                                }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Biểu đồ</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs rounded-md border border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                <span>Xuất CSV</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md border border-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tạo giao dịch</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Segmented Section Switcher */}
            <div
                role="tablist"
                aria-label="Chế độ quản lý thanh toán"
                className="inline-flex items-center bg-slate-100 p-1 rounded-md border border-slate-200"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeSection === 'TRANSACTIONS'}
                    onClick={() => setActiveSection('TRANSACTIONS')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                        activeSection === 'TRANSACTIONS'
                            ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                    }`}
                >
                    <ArrowLeftRight className={`w-3.5 h-3.5 ${activeSection === 'TRANSACTIONS' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Giao dịch thanh toán</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums bg-slate-100 text-slate-700">
                        {stats.totalTransactions}
                    </span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeSection === 'METHODS'}
                    onClick={() => setActiveSection('METHODS')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                        activeSection === 'METHODS'
                            ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                    }`}
                >
                    <Settings className={`w-3.5 h-3.5 ${activeSection === 'METHODS' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Phương thức thanh toán</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums bg-slate-100 text-slate-700">
                        {paymentMethods.length}
                    </span>
                </button>
            </div>

            {/* ==================== SECTION 1: TRANSACTIONS ==================== */}
            {activeSection === 'TRANSACTIONS' && (
                <div className="space-y-4">
                    {/* Collapsible Analytics Charts */}
                    {showAnalytics && (
                        <div className="bg-white p-4 rounded-md border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <div>
                                    <h2 className="font-semibold text-sm text-slate-900">
                                        Phân tích dòng tiền &amp; phương thức thanh toán
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Tổng đã thu: <strong className="text-slate-800">{formatVND(stats.totalSuccessAmount)}</strong> · Đang chờ thu:{' '}
                                        <strong className="text-slate-800">{formatVND(stats.totalPendingAmount)}</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAnalytics(false)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                    aria-label="Đóng biểu đồ"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50/70 rounded-md border border-slate-200 space-y-2">
                                    <h3 className="text-xs font-semibold text-slate-800">
                                        Cơ cấu doanh thu theo phương thức (Đã thanh toán)
                                    </h3>
                                    <div className="h-56 w-full">
                                        {chartData.pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData.pieData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={48}
                                                        outerRadius={76}
                                                        paddingAngle={2}
                                                    >
                                                        {chartData.pieData.map((entry, idx) => (
                                                            <Cell key={idx} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(v) => formatVND(Number(v))}
                                                        contentStyle={{
                                                            borderRadius: '6px',
                                                            border: '1px solid #e2e8f0',
                                                            fontSize: '12px',
                                                        }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                                Chưa có giao dịch đã thanh toán.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50/70 rounded-md border border-slate-200 space-y-2">
                                    <h3 className="text-xs font-semibold text-slate-800">
                                        Số lượng giao dịch theo trạng thái
                                    </h3>
                                    <div className="h-56 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData.statusBarData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                <Tooltip
                                                    formatter={(v) => [`${v} giao dịch`, 'Số lượng']}
                                                    contentStyle={{
                                                        borderRadius: '6px',
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: '12px',
                                                    }}
                                                />
                                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                                                    {chartData.statusBarData.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Single-Row Unified Filter Toolbar */}
                    <div className="bg-white p-3 rounded-md border border-slate-200 space-y-2.5">
                        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
                            <SearchBar
                                value={searchQuery}
                                onChange={(q) => {
                                    setSearchQuery(q);
                                    setCurrentPage(1);
                                }}
                                placeholder="Tìm mã giao dịch, mã đơn hàng, tên/SĐT khách hàng..."
                                size="sm"
                                className="w-full xl:flex-1 min-w-[220px]"
                            />

                            {/* Method Filter */}
                            <div className="w-[calc(50%-4px)] sm:w-[168px] shrink-0">
                                <SelectDropdown
                                    variant="filter"
                                    size="sm"
                                    ariaLabel="Lọc theo phương thức thanh toán"
                                    value={filterValues.method || ''}
                                    onValueChange={(val) => updateFilter('method', val)}
                                    placeholder="Phương thức"
                                    options={[
                                        { label: 'Tất cả phương thức', value: '' },
                                        { label: 'Thu hộ (COD)', value: 'COD' },
                                        { label: 'ZaloPay Sandbox', value: 'ZALOPAY' },
                                    ]}
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="w-[calc(50%-4px)] sm:w-[158px] shrink-0">
                                <SelectDropdown
                                    variant="filter"
                                    size="sm"
                                    ariaLabel="Lọc theo trạng thái thanh toán"
                                    value={filterValues.status || ''}
                                    onValueChange={(val) => updateFilter('status', val)}
                                    placeholder="Trạng thái"
                                    options={[
                                        { label: 'Tất cả trạng thái', value: '' },
                                        { label: 'Chờ thanh toán', value: 'PENDING', dotColor: 'bg-amber-500' },
                                        { label: 'Đã thanh toán', value: 'SUCCESS', dotColor: 'bg-emerald-500' },
                                        { label: 'Thất bại', value: 'FAILED', dotColor: 'bg-rose-500' },
                                    ]}
                                />
                            </div>

                            {/* Date Range Filter */}
                            <div className="w-[calc(50%-4px)] sm:w-[148px] shrink-0">
                                <SelectDropdown
                                    variant="filter"
                                    size="sm"
                                    ariaLabel="Lọc theo khoảng thời gian"
                                    value={filterValues.dateRange || ''}
                                    onValueChange={(val) => updateFilter('dateRange', val)}
                                    placeholder="Thời gian"
                                    options={[
                                        { label: 'Tất cả thời gian', value: '' },
                                        { label: 'Hôm nay', value: 'today' },
                                        { label: '7 ngày gần nhất', value: '7days' },
                                        { label: '30 ngày gần nhất', value: '30days' },
                                    ]}
                                />
                            </div>

                            {/* Advanced Filters Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                                    showAdvancedFilters || activeAdvancedCount > 0
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                                title="Bộ lọc khoảng ngày tùy chọn"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Nâng cao</span>
                                {activeAdvancedCount > 0 && (
                                    <span className="min-w-4 h-4 px-1 rounded-md bg-blue-600 text-white text-[10px] inline-flex items-center justify-center font-semibold tabular-nums">
                                        {activeAdvancedCount}
                                    </span>
                                )}
                            </button>

                            {hasAnyFilter && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="inline-flex items-center justify-center p-1.5 text-rose-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                                    title="Đặt lại bộ lọc"
                                    aria-label="Đặt lại bộ lọc"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {showAdvancedFilters && (
                            <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label htmlFor="pay-start-date" className="block text-[11px] font-medium text-slate-600">
                                        Từ ngày
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        <input
                                            id="pay-start-date"
                                            type="date"
                                            value={filterValues.startDate || ''}
                                            onChange={(e) => updateFilter('startDate', e.target.value)}
                                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-md py-1.5 pl-8 pr-2.5 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="pay-end-date" className="block text-[11px] font-medium text-slate-600">
                                        Đến ngày
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        <input
                                            id="pay-end-date"
                                            type="date"
                                            value={filterValues.endDate || ''}
                                            onChange={(e) => updateFilter('endDate', e.target.value)}
                                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-md py-1.5 pl-8 pr-2.5 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Batch Selection Banner */}
                    {selectedIds.length > 0 && (
                        <div className="px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>
                                    Đang chọn <strong className="font-semibold tabular-nums">{selectedIds.length}</strong> giao dịch.
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-200 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                >
                                    Xuất CSV đã chọn
                                </button>
                                {pendingCodSelectedCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction({ type: 'BATCH_CONFIRM_COD' })}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md border border-emerald-600 cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                                    >
                                        Xác nhận thu COD ({pendingCodSelectedCount})
                                    </button>
                                )}
                                {pendingZaloPaySelectedCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBatchSyncZaloPay}
                                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md border border-sky-600 cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/40"
                                    >
                                        Đồng bộ ZaloPay ({pendingZaloPaySelectedCount})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds([])}
                                    className="px-2 py-1 text-slate-600 hover:text-slate-900 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                >
                                    Bỏ chọn
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Transactions Table */}
                    <AdminTable
                        columns={columns}
                        data={paginatedTransactions}
                        rowKey="id"
                        loading={loading}
                        selectable
                        selectedKeys={selectedIds}
                        onSelectionChange={setSelectedIds}
                        currentPage={safeCurrentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        pageSizeOptions={[10, 15, 25, 50]}
                        onPageChange={(p) => setCurrentPage(p)}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                        onRowClick={(txn) => {
                            setDetailTxn(txn);
                            setIsDetailOpen(true);
                        }}
                        itemUnitName="giao dịch"
                        emptyText="Không tìm thấy giao dịch thanh toán nào từ hệ thống."
                    />
                </div>
            )}

            {/* ==================== SECTION 2: PAYMENT METHODS (FROM BE) ==================== */}
            {activeSection === 'METHODS' && (
                <div className="space-y-4">
                    {paymentMethods.length === 0 && !loading ? (
                        <div className="bg-white p-8 rounded-md border border-slate-200 text-center text-xs text-slate-500">
                            Không có phương thức thanh toán nào đang hoạt động từ máy chủ.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {paymentMethods.map((method) => {
                                const isActive = String(method.status).toUpperCase() === 'ACTIVE';
                                return (
                                    <div
                                        key={method.id}
                                        className="bg-white p-4 rounded-md border border-slate-200 flex flex-col justify-between gap-4"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-sm font-semibold text-slate-900">
                                                            {method.name}
                                                        </h3>
                                                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border bg-slate-50 text-slate-700 border-slate-200">
                                                            {method.code}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {method.code === 'ZALOPAY'
                                                            ? 'Thanh toán trực tuyến qua cổng ZaloPay Sandbox (QR / Ví / ATM).'
                                                            : 'Thanh toán tiền mặt khi nhận hàng (COD), xác nhận thủ công hoặc tự động khi hoàn tất đơn.'}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border shrink-0 ${
                                                        isActive
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`}
                                                    />
                                                    {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                                                </span>
                                            </div>

                                            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 border-t border-slate-100 text-xs">
                                                <div>
                                                    <dt className="text-[11px] text-slate-500">ID hệ thống</dt>
                                                    <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                                                        #{method.id}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[11px] text-slate-500">Loại hình</dt>
                                                    <dd className="font-semibold text-slate-900 mt-0.5">
                                                        {method.type === 'ONLINE'
                                                            ? 'Trực tuyến (ONLINE)'
                                                            : 'Tiền mặt (CASH)'}
                                                    </dd>
                                                </div>
                                                {method.bankName && (
                                                    <div>
                                                        <dt className="text-[11px] text-slate-500">Cổng / Ngân hàng</dt>
                                                        <dd className="font-medium text-slate-900 mt-0.5">
                                                            {method.bankName}
                                                        </dd>
                                                    </div>
                                                )}
                                                {method.accountNumber && (
                                                    <div>
                                                        <dt className="text-[11px] text-slate-500">AppID / Số tài khoản</dt>
                                                        <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                                                            {method.accountNumber}
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== MODAL 1: CHI TIẾT GIAO DỊCH ==================== */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Chi tiết giao dịch ${detailTxn?.transactionCode || ''}`}
                subtitle={`Cập nhật lúc ${formatDateTime(detailTxn?.displayTime)}`}
                icon={CreditCard}
                size="lg"
                footer={
                    detailTxn ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                            <div className="flex flex-wrap items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    icon={Printer}
                                    onClick={() => adminPaymentService.printReceipt(detailTxn)}
                                >
                                    In biên lai
                                </AdminButton>
                                {detailTxn.status === 'PENDING' && detailTxn.method === 'COD' && (
                                    <AdminButton
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        icon={CheckCircle2}
                                        onClick={() =>
                                            setConfirmAction({ type: 'CONFIRM_COD', txn: detailTxn })
                                        }
                                    >
                                        Xác nhận thu tiền COD
                                    </AdminButton>
                                )}
                                {detailTxn.status === 'PENDING' && detailTxn.method === 'ZALOPAY' && (
                                    <AdminButton
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        icon={RefreshCw}
                                        disabled={syncingId === detailTxn.id}
                                        onClick={() => handleSyncZaloPay(detailTxn)}
                                    >
                                        {syncingId === detailTxn.id
                                            ? 'Đang đồng bộ...'
                                            : 'Đồng bộ ZaloPay'}
                                    </AdminButton>
                                )}
                            </div>
                            <AdminButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsDetailOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                        </div>
                    ) : undefined
                }
            >
                {() => {
                    if (!detailTxn) return null;
                    return (
                        <div className="space-y-5">
                            <div className="pb-4 border-b border-slate-200 flex flex-wrap items-end justify-between gap-3">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {renderStatusIndicator(detailTxn.status)}
                                        <span className="text-slate-300">·</span>
                                        {renderMethodBadge(detailTxn.method)}
                                    </div>
                                    <div className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">
                                        {formatVND(detailTxn.amount)}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-500 space-y-0.5 tabular-nums">
                                    <div>
                                        ID bản ghi: <strong className="font-mono text-slate-800">#{detailTxn.id}</strong>
                                    </div>
                                    <div>
                                        ID đơn hàng: <strong className="font-mono text-slate-800">#{detailTxn.orderId}</strong>
                                    </div>
                                </div>
                            </div>

                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Mã giao dịch</dt>
                                    <dd className="font-mono font-semibold text-slate-900 tabular-nums break-all">
                                        {detailTxn.transactionCode}
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Mã đơn hàng</dt>
                                    <dd className="font-mono font-semibold text-slate-900 tabular-nums break-all">
                                        {detailTxn.orderCode}
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Khách hàng</dt>
                                    <dd className="text-slate-900 font-medium break-words">
                                        <span>{detailTxn.customerName}</span>
                                        {detailTxn.customerEmail && (
                                            <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                                                {detailTxn.customerEmail}
                                            </span>
                                        )}
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Số điện thoại</dt>
                                    <dd className="font-mono font-medium text-slate-900 tabular-nums">
                                        {detailTxn.customerPhone}
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Phương thức thanh toán</dt>
                                    <dd className="font-medium text-slate-900">
                                        {detailTxn.paymentMethodName} ({detailTxn.method})
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Thời điểm thanh toán</dt>
                                    <dd className="font-medium text-slate-900 tabular-nums">
                                        {formatDateTime(detailTxn.paidAt)}
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Ngày tạo bản ghi</dt>
                                    <dd className="font-medium text-slate-900 tabular-nums">
                                        {formatDateTime(detailTxn.createdDate)}
                                    </dd>
                                </div>

                                <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                    <dt className="text-[11px] font-medium text-slate-500">Cập nhật lần cuối</dt>
                                    <dd className="font-medium text-slate-900 tabular-nums">
                                        {formatDateTime(detailTxn.lastModifiedDate)}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    );
                }}
            </AdminModal>

            {/* ==================== MODAL 2: TẠO GIAO DỊCH THANH TOÁN (BE) ==================== */}
            <AdminModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Khởi tạo giao dịch thanh toán"
                subtitle="Đăng ký thanh toán COD hoặc sinh link thanh toán ZaloPay Sandbox cho đơn hàng thực tế"
                icon={Plus}
                size="md"
                onSubmit={zaloPayCreated ? undefined : handleSubmitCreate}
                submitText={
                    creating
                        ? 'Đang xử lý...'
                        : selectedMethod === 'ZALOPAY'
                        ? 'Tạo link ZaloPay'
                        : 'Đăng ký COD'
                }
                footer={
                    zaloPayCreated ? (
                        <div className="flex items-center justify-end gap-2 w-full">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                        </div>
                    ) : undefined
                }
            >
                {() => (
                    <div className="space-y-4">
                        {zaloPayCreated ? (
                            <div className="space-y-3 text-xs">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
                                    Đã tạo giao dịch ZaloPay Sandbox thành công cho đơn hàng{' '}
                                    <strong className="font-mono">{zaloPayCreated.orderCode || `#${zaloPayCreated.orderId}`}</strong>.
                                </div>
                                <dl className="space-y-2 border border-slate-200 rounded-md p-3">
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-slate-500">Mã giao dịch (appTransId):</dt>
                                        <dd className="font-mono font-semibold text-slate-900">
                                            {zaloPayCreated.appTransId}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-slate-500">Số tiền:</dt>
                                        <dd className="font-semibold text-slate-900 tabular-nums">
                                            {formatVND(zaloPayCreated.amount)}
                                        </dd>
                                    </div>
                                </dl>
                                {zaloPayCreated.orderUrl && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <a
                                            href={zaloPayCreated.orderUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Mở cổng ZaloPay Sandbox</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(zaloPayCreated.orderUrl, 'link thanh toán ZaloPay')
                                            }
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md border border-slate-200 cursor-pointer"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Sao chép link</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <AdminSelect
                                    label="Chọn đơn hàng"
                                    required
                                    value={selectedOrderId}
                                    onChange={(e) => setSelectedOrderId(e.target.value)}
                                    options={[
                                        { label: '-- Chọn đơn hàng --', value: '' },
                                        ...eligibleOrders.map((o) => ({
                                            label: `${o.code} • ${o.recipientName || o.customerName || 'Khách hàng'} (${formatVND(o.finalAmount ?? o.totalAmount ?? 0)})`,
                                            value: String(o.id),
                                        })),
                                    ]}
                                />

                                {selectedOrderObj && (
                                    <dl className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
                                        <div>
                                            <dt className="text-[11px] text-slate-500">Khách hàng</dt>
                                            <dd className="font-medium text-slate-900 mt-0.5">
                                                {selectedOrderObj.recipientName || selectedOrderObj.customerName || '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[11px] text-slate-500">Số tiền cần thanh toán</dt>
                                            <dd className="font-semibold text-slate-900 tabular-nums mt-0.5">
                                                {formatVND(selectedOrderObj.finalAmount ?? selectedOrderObj.totalAmount ?? 0)}
                                            </dd>
                                        </div>
                                    </dl>
                                )}

                                <AdminSelect
                                    label="Phương thức thanh toán"
                                    required
                                    value={selectedMethod}
                                    onChange={(e) =>
                                        setSelectedMethod(e.target.value as PaymentMethodCode)
                                    }
                                    options={[
                                        { label: 'Thanh toán khi nhận hàng (COD)', value: 'COD' },
                                        { label: 'Thanh toán trực tuyến ZaloPay Sandbox', value: 'ZALOPAY' },
                                    ]}
                                />
                            </>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* ==================== MODAL 3: XÁC NHẬN THU TIỀN COD ==================== */}
            <AdminConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleExecuteConfirm}
                title={
                    confirmAction?.type === 'BATCH_CONFIRM_COD'
                        ? 'Xác nhận thu tiền COD hàng loạt'
                        : 'Xác nhận đã thu tiền COD'
                }
                message={
                    confirmAction?.type === 'BATCH_CONFIRM_COD' ? (
                        <span>
                            Xác nhận đã thu tiền mặt COD trên máy chủ cho{' '}
                            <strong className="tabular-nums">{pendingCodSelectedCount}</strong> giao dịch đang chờ?
                        </span>
                    ) : (
                        <span>
                            Xác nhận đã thu đủ{' '}
                            <strong className="tabular-nums">{formatVND(confirmAction?.txn?.amount || 0)}</strong> cho đơn hàng{' '}
                            <strong className="font-mono tabular-nums">{confirmAction?.txn?.orderCode}</strong>?
                        </span>
                    )
                }
                variant="success"
                confirmText="Xác nhận đã thu"
                cancelText="Đóng"
            />
        </div>
    );
}
