import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    RotateCcw,
    Download,
    RefreshCw,
    Plus,
    Copy,
    ChevronRight,
    Building2,
    Banknote,
    ShoppingBag,
    DollarSign,
    ShieldCheck,
    AlertTriangle,
    Settings,
    Printer,
    BarChart3,
    Check,
    SlidersHorizontal,
    FileCheck,
    Wallet,
    ArrowLeftRight,
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
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminSelect,
    AdminTextarea,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminPaymentService, formatVND } from '../../../services/adminPaymentService';
import type {
    PaymentMethodCode,
    PaymentMethodConfig,
    PaymentStats,
    PaymentTransaction,
    PaymentTransactionStatus,
} from '../../../types/adminPayment';
import type { OrderResponse } from '../../../types/adminOrder';

function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

const METHOD_META: Record<
    PaymentMethodCode,
    { label: string; color: string; chartColor: string; icon: React.ElementType }
> = {
    VNPAY: {
        label: 'VNPAY QR / ATM',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        chartColor: '#2563eb',
        icon: CreditCard,
    },
    BANK_TRANSFER: {
        label: 'Chuyển khoản VietQR',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        chartColor: '#6366f1',
        icon: Building2,
    },
    CASH: {
        label: 'Tiền mặt (CASH)',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        chartColor: '#10b981',
        icon: Banknote,
    },
    CARD: {
        label: 'Quẹt thẻ POS',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        chartColor: '#9333ea',
        icon: Wallet,
    },
    COD: {
        label: 'Thu hộ (COD)',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        chartColor: '#f59e0b',
        icon: ShoppingBag,
    },
};

export default function PaymentManagementList() {
    const { addToast } = useToast();

    // Active top view: Transactions vs Gateway Configuration
    const [activeSection, setActiveSection] = useState<'TRANSACTIONS' | 'METHODS'>('TRANSACTIONS');

    // Transaction Data states
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState<PaymentStats>({
        totalTransactions: 0,
        todayTransactions: 0,
        successCount: 0,
        pendingCount: 0,
        failedCount: 0,
        refundedCount: 0,
        totalSuccessAmount: 0,
        totalPendingAmount: 0,
        totalRefundedAmount: 0,
        totalFeeAmount: 0,
    });

    // Payment Method Configs
    const [methodConfigs, setMethodConfigs] = useState<PaymentMethodConfig[]>([]);
    const [editingMethod, setEditingMethod] = useState<PaymentMethodConfig | null>(null);
    const [methodForm, setMethodForm] = useState<{
        name: string;
        shortDescription: string;
        environment: 'SANDBOX' | 'PRODUCTION';
        feePercent: string;
        minAmount: string;
        maxAmount: string;
        merchantCode: string;
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        bankBranch: string;
    }>({
        name: '',
        shortDescription: '',
        environment: 'PRODUCTION',
        feePercent: '0',
        minAmount: '0',
        maxAmount: '100000000',
        merchantCode: '',
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        bankBranch: '',
    });

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [quickTab, setQuickTab] = useState<string>('ALL');
    const [filterValues, setFilterValues] = useState<Record<string, string>>({
        status: '',
        method: '',
        reconciled: '',
        dateRange: '',
        startDate: '',
        endDate: '',
    });
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [showAnalytics, setShowAnalytics] = useState<boolean>(false);

    // Detail Modal
    const [detailTxn, setDetailTxn] = useState<PaymentTransaction | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    // Create Transaction Modal
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
    const [selectedOrderCode, setSelectedOrderCode] = useState<string>('');
    const [createForm, setCreateForm] = useState<{
        orderCode: string;
        orderId?: number;
        customerName: string;
        customerPhone: string;
        customerEmail: string;
        method: PaymentMethodCode;
        bankName: string;
        gatewayRef: string;
        amount: string;
        status: PaymentTransactionStatus;
        note: string;
    }>({
        orderCode: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        method: 'BANK_TRANSFER',
        bankName: 'Vietcombank',
        gatewayRef: '',
        amount: '',
        status: 'SUCCESS',
        note: '',
    });

    // Refund Modal
    const [refundTarget, setRefundTarget] = useState<PaymentTransaction | null>(null);
    const [refundAmount, setRefundAmount] = useState<string>('');
    const [refundReason, setRefundReason] = useState<string>('');

    // Confirm Modal
    const [confirmAction, setConfirmAction] = useState<{
        type: 'APPROVE' | 'MARK_FAILED' | 'BATCH_APPROVE';
        txn?: PaymentTransaction;
    } | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminPaymentService.getTransactions({
                keyword: searchQuery,
                status: filterValues.status || undefined,
                method: filterValues.method || undefined,
                reconciled: filterValues.reconciled || undefined,
                dateRange: filterValues.dateRange || undefined,
                startDate: filterValues.startDate || undefined,
                endDate: filterValues.endDate || undefined,
            });

            setStats(adminPaymentService.computeStats(list));

            let filtered = list;
            if (quickTab !== 'ALL') {
                filtered = list.filter((t) => t.status === quickTab);
            }
            setTransactions(filtered);
            setMethodConfigs(adminPaymentService.getMethodConfigs());
        } catch {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: 'Không thể tải danh sách giao dịch thanh toán.',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterValues, quickTab, addToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Pagination slicing
    const totalItems = transactions.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(Math.max(1, totalPages));
        }
    }, [currentPage, totalPages]);

    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return transactions.slice(start, start + pageSize);
    }, [transactions, currentPage, pageSize]);

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
            color: METHOD_META[code as PaymentMethodCode]?.chartColor || '#3b82f6',
        }));

        const statusBarData = [
            { name: 'Thành công', count: stats.successCount, fill: '#10b981' },
            { name: 'Chờ xác nhận', count: stats.pendingCount, fill: '#f59e0b' },
            { name: 'Thất bại', count: stats.failedCount, fill: '#f43f5e' },
            { name: 'Hoàn tiền', count: stats.refundedCount, fill: '#8b5cf6' },
        ];

        return { pieData, statusBarData };
    }, [transactions, stats]);

    // Handlers
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast({
            type: 'info',
            title: 'Đã sao chép',
            message: `Đã sao chép ${label} vào bộ nhớ tạm.`,
        });
    };

    const handleOpenCreate = async () => {
        setSelectedOrderCode('');
        setCreateForm({
            orderCode: '',
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            method: 'BANK_TRANSFER',
            bankName: 'Vietcombank',
            gatewayRef: '',
            amount: '',
            status: 'SUCCESS',
            note: '',
        });
        setIsCreateOpen(true);
        const orders = await adminPaymentService.getRecentOrders();
        setRecentOrders(orders);
    };

    const handleSelectOrder = (code: string) => {
        setSelectedOrderCode(code);
        const found = recentOrders.find((o) => o.code === code);
        if (!found) return;
        setCreateForm((prev) => ({
            ...prev,
            orderCode: found.code,
            orderId: found.id,
            customerName: found.recipientName || found.customerName || '',
            customerPhone: found.recipientPhone || found.customerPhone || '',
            customerEmail: found.customerEmail || '',
            amount: String(found.finalAmount || found.totalAmount || 0),
            note: `Thanh toán cho đơn hàng ${found.code}`,
        }));
    };

    const handleSubmitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(createForm.amount) || 0;
        if (!createForm.customerName.trim() || !createForm.customerPhone.trim()) {
            addToast({
                type: 'warning',
                title: 'Thiếu thông tin khách hàng',
                message: 'Vui lòng nhập tên và số điện thoại khách hàng.',
            });
            return;
        }
        if (amountNum <= 0) {
            addToast({
                type: 'warning',
                title: 'Số tiền không hợp lệ',
                message: 'Số tiền giao dịch phải lớn hơn 0 ₫.',
            });
            return;
        }

        const created = adminPaymentService.createTransaction({
            orderCode: createForm.orderCode,
            orderId: createForm.orderId,
            customerName: createForm.customerName,
            customerPhone: createForm.customerPhone,
            customerEmail: createForm.customerEmail,
            method: createForm.method,
            bankName: createForm.bankName,
            gatewayRef: createForm.gatewayRef,
            amount: amountNum,
            status: createForm.status,
            note: createForm.note,
        });

        setIsCreateOpen(false);
        loadData();
        addToast({
            type: 'success',
            title: 'Ghi nhận thanh toán thành công',
            message: `Đã tạo giao dịch ${created.transactionCode} (${formatVND(created.amount)}).`,
        });
    };

    const handleOpenRefund = (txn: PaymentTransaction) => {
        setRefundTarget(txn);
        setRefundAmount(String(txn.amount));
        setRefundReason('');
    };

    const handleSubmitRefund = (e: React.FormEvent) => {
        e.preventDefault();
        if (!refundTarget) return;
        const amt = Number(refundAmount) || 0;
        if (amt <= 0 || amt > refundTarget.amount) {
            addToast({
                type: 'warning',
                title: 'Số tiền hoàn không hợp lệ',
                message: `Số tiền hoàn phải từ 1 ₫ đến ${formatVND(refundTarget.amount)}.`,
            });
            return;
        }
        const updated = adminPaymentService.updateTransactionStatus(refundTarget.id, 'REFUNDED', {
            refundedAmount: amt,
            refundReason: refundReason.trim() || 'Hoàn tiền theo yêu cầu khách hàng',
            gatewayMessage: `Đã hoàn tiền ${formatVND(amt)}`,
            reconciled: true,
        });
        if (updated && detailTxn?.id === updated.id) {
            setDetailTxn(updated);
        }
        setRefundTarget(null);
        loadData();
        addToast({
            type: 'success',
            title: 'Hoàn tiền thành công',
            message: `Đã hoàn ${formatVND(amt)} cho giao dịch ${refundTarget.transactionCode}.`,
        });
    };

    const handleExecuteConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === 'APPROVE' && confirmAction.txn) {
            const updated = adminPaymentService.updateTransactionStatus(
                confirmAction.txn.id,
                'SUCCESS',
                {
                    reconciled: true,
                    gatewayMessage: 'Kế toán đã xác nhận thu đủ tiền',
                }
            );
            if (updated && detailTxn?.id === updated.id) setDetailTxn(updated);
            addToast({
                type: 'success',
                title: 'Xác nhận thanh toán thành công',
                message: `Giao dịch ${confirmAction.txn.transactionCode} đã được xác nhận & đối soát.`,
            });
        } else if (confirmAction.type === 'MARK_FAILED' && confirmAction.txn) {
            const updated = adminPaymentService.updateTransactionStatus(
                confirmAction.txn.id,
                'FAILED',
                {
                    reconciled: false,
                    gatewayMessage: 'Giao dịch bị đánh dấu thất bại / không nhận được tiền',
                }
            );
            if (updated && detailTxn?.id === updated.id) setDetailTxn(updated);
            addToast({
                type: 'warning',
                title: 'Đã đánh dấu thất bại',
                message: `Giao dịch ${confirmAction.txn.transactionCode} đã chuyển sang trạng thái THẤT BẠI.`,
            });
        } else if (confirmAction.type === 'BATCH_APPROVE') {
            const targets = transactions.filter(
                (t) => selectedIds.includes(t.id) && t.status === 'PENDING'
            );
            targets.forEach((t) =>
                adminPaymentService.updateTransactionStatus(t.id, 'SUCCESS', {
                    reconciled: true,
                    gatewayMessage: 'Xác nhận đối soát hàng loạt',
                })
            );
            setSelectedIds([]);
            addToast({
                type: 'success',
                title: 'Đối soát hàng loạt thành công',
                message: `Đã xác nhận thanh toán cho ${targets.length} giao dịch.`,
            });
        }

        setConfirmAction(null);
        loadData();
    };

    const handleToggleReconciled = (txn: PaymentTransaction) => {
        const updated = adminPaymentService.toggleReconciled(txn.id);
        if (updated && detailTxn?.id === updated.id) setDetailTxn(updated);
        loadData();
        addToast({
            type: 'info',
            title: updated?.reconciled ? 'Đã đánh dấu đối soát' : 'Đã bỏ đánh dấu đối soát',
            message: `Giao dịch ${txn.transactionCode} đã được cập nhật trạng thái đối soát.`,
        });
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

    // Method config handlers
    const handleToggleMethodEnabled = (cfg: PaymentMethodConfig) => {
        const updated = adminPaymentService.updateMethodConfig(cfg.code, {
            enabled: !cfg.enabled,
        });
        setMethodConfigs(updated);
        addToast({
            type: !cfg.enabled ? 'success' : 'warning',
            title: !cfg.enabled ? 'Đã kích hoạt phương thức' : 'Đã tạm tắt phương thức',
            message: `${cfg.name} hiện đang ${!cfg.enabled ? 'HOẠT ĐỘNG' : 'TẠM NGƯNG'}.`,
        });
    };

    const handleOpenEditMethod = (cfg: PaymentMethodConfig) => {
        setEditingMethod(cfg);
        setMethodForm({
            name: cfg.name,
            shortDescription: cfg.shortDescription,
            environment: cfg.environment || 'PRODUCTION',
            feePercent: String(cfg.feePercent),
            minAmount: String(cfg.minAmount),
            maxAmount: String(cfg.maxAmount),
            merchantCode: cfg.merchantCode || '',
            bankName: cfg.bankName || '',
            accountNumber: cfg.accountNumber || '',
            accountHolder: cfg.accountHolder || '',
            bankBranch: cfg.bankBranch || '',
        });
    };

    const handleSaveMethodConfig = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMethod) return;
        const updated = adminPaymentService.updateMethodConfig(editingMethod.code, {
            name: methodForm.name.trim() || editingMethod.name,
            shortDescription: methodForm.shortDescription.trim(),
            environment: methodForm.environment,
            feePercent: Number(methodForm.feePercent) || 0,
            minAmount: Number(methodForm.minAmount) || 0,
            maxAmount: Number(methodForm.maxAmount) || 0,
            merchantCode: methodForm.merchantCode.trim() || undefined,
            bankName: methodForm.bankName.trim() || undefined,
            accountNumber: methodForm.accountNumber.trim() || undefined,
            accountHolder: methodForm.accountHolder.trim() || undefined,
            bankBranch: methodForm.bankBranch.trim() || undefined,
        });
        setMethodConfigs(updated);
        setEditingMethod(null);
        addToast({
            type: 'success',
            title: 'Lưu cấu hình thành công',
            message: `Đã cập nhật cấu hình cho ${methodForm.name}.`,
        });
    };

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái giao dịch',
            type: 'select',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Thành công (SUCCESS)', value: 'SUCCESS', dotColor: 'bg-emerald-500' },
                { label: 'Chờ xác nhận (PENDING)', value: 'PENDING', dotColor: 'bg-amber-500' },
                { label: 'Thất bại (FAILED)', value: 'FAILED', dotColor: 'bg-rose-500' },
                { label: 'Đã hoàn tiền (REFUNDED)', value: 'REFUNDED', dotColor: 'bg-purple-500' },
            ],
        },
        {
            name: 'method',
            label: 'Phương thức thanh toán',
            type: 'select',
            options: [
                { label: 'Tất cả phương thức', value: '' },
                { label: 'VNPAY QR / ATM', value: 'VNPAY' },
                { label: 'Chuyển khoản VietQR', value: 'BANK_TRANSFER' },
                { label: 'Tiền mặt (CASH)', value: 'CASH' },
                { label: 'Quẹt thẻ POS (CARD)', value: 'CARD' },
                { label: 'Thu hộ (COD)', value: 'COD' },
            ],
        },
        {
            name: 'reconciled',
            label: 'Trạng thái đối soát',
            type: 'select',
            options: [
                { label: 'Tất cả', value: '' },
                { label: 'Đã đối soát kế toán', value: 'true' },
                { label: 'Chưa đối soát', value: 'false' },
            ],
        },
        {
            name: 'dateRange',
            label: 'Khoảng thời gian nhanh',
            type: 'select',
            options: [
                { label: 'Tất cả thời gian', value: '' },
                { label: 'Hôm nay', value: 'today' },
                { label: '7 ngày gần nhất', value: '7days' },
                { label: '30 ngày gần nhất', value: '30days' },
            ],
        },
        { name: 'startDate', label: 'Từ ngày', type: 'date' },
        { name: 'endDate', label: 'Đến ngày', type: 'date' },
    ];

    // Badge renderers
    const renderStatusBadge = (status: PaymentTransactionStatus) => {
        switch (status) {
            case 'SUCCESS':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Thành công
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Chờ xác nhận
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Thất bại
                    </span>
                );
            case 'REFUNDED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        Đã hoàn tiền
                    </span>
                );
        }
    };

    const renderMethodBadge = (method: PaymentMethodCode) => {
        const meta = METHOD_META[method] || METHOD_META.BANK_TRANSFER;
        const Icon = meta.icon;
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.color}`}
            >
                <Icon className="w-3 h-3" />
                {meta.label}
            </span>
        );
    };

    // Table columns
    const columns: Column<PaymentTransaction>[] = [
        {
            key: 'transactionCode',
            header: 'Mã giao dịch & Thời gian',
            sortable: true,
            sortValue: (item) => new Date(item.paidAt).getTime(),
            render: (txn) => (
                <div className="space-y-1">
                    <div className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                        {txn.transactionCode}
                    </div>
                    {txn.gatewayRef && (
                        <div className="text-[10px] font-mono text-gray-500">
                            Ref: <span className="font-semibold text-gray-700">{txn.gatewayRef}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(txn.paidAt)}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'order_customer',
            header: 'Đơn hàng & Khách hàng',
            render: (txn) => (
                <div className="space-y-0.5">
                    <div className="font-mono text-xs font-bold text-gray-800">{txn.orderCode}</div>
                    <p className="text-xs font-semibold text-gray-900">{txn.customerName}</p>
                    <p className="text-[11px] text-gray-400">{txn.customerPhone}</p>
                </div>
            ),
        },
        {
            key: 'method',
            header: 'Phương thức & Ngân hàng',
            render: (txn) => (
                <div className="space-y-1">
                    <div>{renderMethodBadge(txn.method)}</div>
                    <p className="text-[11px] text-gray-500 truncate max-w-[170px]" title={txn.bankName}>
                        {txn.bankName || '—'}
                    </p>
                </div>
            ),
        },
        {
            key: 'amount',
            header: 'Số tiền & Phí GD',
            align: 'right',
            sortable: true,
            sortValue: (item) => item.amount,
            render: (txn) => (
                <div className="space-y-0.5">
                    <div
                        className={`text-sm font-extrabold ${
                            txn.status === 'FAILED'
                                ? 'text-gray-400 line-through'
                                : txn.status === 'REFUNDED'
                                ? 'text-purple-600'
                                : 'text-emerald-600'
                        }`}
                    >
                        {formatVND(txn.amount)}
                    </div>
                    {txn.feeAmount > 0 && (
                        <div className="text-[10px] text-gray-400">
                            Phí cổng: {formatVND(txn.feeAmount)}
                        </div>
                    )}
                    {txn.refundedAmount && txn.refundedAmount > 0 && (
                        <div className="text-[10px] text-purple-600 font-semibold">
                            Đã hoàn: -{formatVND(txn.refundedAmount)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái & Đối soát',
            render: (txn) => (
                <div className="space-y-1.5">
                    <div>{renderStatusBadge(txn.status)}</div>
                    <div className="flex items-center gap-1 text-[10px]">
                        {txn.reconciled ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Đã đối soát
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Chưa đối soát
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
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
                        ...(txn.status === 'PENDING'
                            ? [
                                  {
                                      key: 'approve',
                                      label: 'Xác nhận đã thu tiền',
                                      icon: CheckCircle2,
                                      onClick: () => setConfirmAction({ type: 'APPROVE', txn }),
                                  },
                                  {
                                      key: 'fail',
                                      label: 'Đánh dấu thất bại',
                                      icon: XCircle,
                                      variant: 'danger' as const,
                                      onClick: () => setConfirmAction({ type: 'MARK_FAILED', txn }),
                                  },
                              ]
                            : []),
                        ...(txn.status === 'SUCCESS'
                            ? [
                                  {
                                      key: 'refund',
                                      label: 'Hoàn tiền giao dịch',
                                      icon: RotateCcw,
                                      variant: 'danger' as const,
                                      onClick: () => handleOpenRefund(txn),
                                  },
                              ]
                            : []),
                        {
                            key: 'reconcile',
                            label: txn.reconciled ? 'Bỏ đánh dấu đối soát' : 'Đánh dấu đã đối soát',
                            icon: FileCheck,
                            onClick: () => handleToggleReconciled(txn),
                        },
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

    const pendingSelectedCount = useMemo(
        () =>
            transactions.filter((t) => selectedIds.includes(t.id) && t.status === 'PENDING').length,
        [transactions, selectedIds]
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1">
                        <span>Quản trị hệ thống</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-blue-600 font-semibold">Quản lý thanh toán</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <CreditCard className="w-7 h-7 text-blue-600" />
                        <span>Quản Lý Thanh Toán & Đối Soát (Payments & Gateways)</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                        Giám sát giao dịch thanh toán, đối soát dòng tiền VNPAY / VietQR / POS / COD, xử lý hoàn tiền và cấu hình các cổng thanh toán trong hệ thống.
                    </p>
                </div>

                {/* Top Section Switcher + Primary Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {activeSection === 'TRANSACTIONS' && (
                        <>
                            <button
                                type="button"
                                onClick={() => loadData()}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors cursor-pointer"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                                <span>Làm mới</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAnalytics(!showAnalytics)}
                                className={`flex items-center gap-1.5 px-3 py-2 font-semibold text-xs rounded-xl border shadow-sm transition-colors cursor-pointer ${
                                    showAnalytics
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Thống kê</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5 text-blue-600" />
                                <span>Xuất CSV</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                            >
                                <Plus className="w-4 h-4 text-white" />
                                <span>Ghi nhận thanh toán</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Mode Switcher Bar */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                    type="button"
                    onClick={() => setActiveSection('TRANSACTIONS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeSection === 'TRANSACTIONS'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Giao dịch & Đối soát</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700">
                        {stats.totalTransactions}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('METHODS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeSection === 'METHODS'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Cấu hình Cổng & Phương thức</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700">
                        {methodConfigs.filter((m) => m.enabled).length}/{methodConfigs.length}
                    </span>
                </button>
            </div>

            {/* ==================== SECTION 1: TRANSACTIONS ==================== */}
            {activeSection === 'TRANSACTIONS' && (
                <div className="space-y-6">
                    {/* 5 KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-emerald-200 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Tổng Tiền Đã Thu</span>
                                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-xl font-extrabold text-emerald-600 truncate" title={formatVND(stats.totalSuccessAmount)}>
                                {formatVND(stats.totalSuccessAmount)}
                            </p>
                            <p className="text-[11px] text-emerald-600 font-medium">
                                {stats.successCount} giao dịch thành công
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-blue-200 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Tổng Giao Dịch</span>
                                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                            <p className="text-[11px] text-gray-500">
                                Hôm nay: <strong className="text-blue-600">{stats.todayTransactions}</strong> giao dịch
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-amber-200 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Chờ Xác Nhận</span>
                                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">{stats.pendingCount}</p>
                            <p className="text-[11px] text-amber-700 font-medium truncate">
                                Giá trị: {formatVND(stats.totalPendingAmount)}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-purple-200 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Đã Hoàn Tiền</span>
                                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                                    <RotateCcw className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-xl font-extrabold text-purple-600 truncate">
                                {formatVND(stats.totalRefundedAmount)}
                            </p>
                            <p className="text-[11px] text-gray-500">
                                {stats.refundedCount} giao dịch hoàn tiền
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-rose-200 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Lỗi & Phí Cổng</span>
                                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                                    <XCircle className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-rose-600">{stats.failedCount}</p>
                            <p className="text-[11px] text-gray-500 truncate">
                                Phí GD: <strong className="text-gray-700">{formatVND(stats.totalFeeAmount)}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Collapsible Analytics Charts */}
                    {showAnalytics && (
                        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-bold text-sm text-gray-900">
                                        Phân Tích Dòng Tiền & Phương Thức Thanh Toán
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAnalytics(false)}
                                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    Đóng biểu đồ ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-2">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase">
                                        Cơ cấu doanh thu theo phương thức thanh toán
                                    </h4>
                                    <div className="h-60 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData.pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={52}
                                                    outerRadius={82}
                                                    paddingAngle={3}
                                                >
                                                    {chartData.pieData.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(v) => formatVND(Number(v))}
                                                    contentStyle={{
                                                        borderRadius: '12px',
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: '11px',
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-2">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase">
                                        Số lượng giao dịch theo trạng thái
                                    </h4>
                                    <div className="h-60 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData.statusBarData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                <Tooltip
                                                    formatter={(v) => [`${v} giao dịch`, 'Số lượng']}
                                                    contentStyle={{
                                                        borderRadius: '12px',
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: '11px',
                                                    }}
                                                />
                                                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
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

                    {/* Quick Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
                        {[
                            { id: 'ALL', label: 'Tất cả giao dịch', count: stats.totalTransactions, icon: CreditCard },
                            { id: 'SUCCESS', label: 'Thành công', count: stats.successCount, icon: CheckCircle2 },
                            { id: 'PENDING', label: 'Chờ xác nhận', count: stats.pendingCount, icon: Clock },
                            { id: 'FAILED', label: 'Thất bại', count: stats.failedCount, icon: XCircle },
                            { id: 'REFUNDED', label: 'Đã hoàn tiền', count: stats.refundedCount, icon: RotateCcw },
                        ].map((tab) => {
                            const isActive = quickTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setQuickTab(tab.id);
                                        setCurrentPage(1);
                                    }}
                                    className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                                        isActive
                                            ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                            isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
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
                        searchPlaceholder="Tìm mã giao dịch (TXN-...), mã tham chiếu cổng, mã đơn hàng, khách hàng, SĐT, ngân hàng..."
                        fields={filterFields}
                        values={filterValues}
                        onChange={(vals) => {
                            setFilterValues(vals);
                            setCurrentPage(1);
                        }}
                        onReset={() => {
                            setSearchQuery('');
                            setFilterValues({
                                status: '',
                                method: '',
                                reconciled: '',
                                dateRange: '',
                                startDate: '',
                                endDate: '',
                            });
                            setQuickTab('ALL');
                            setCurrentPage(1);
                        }}
                    />

                    {/* Batch Selection Banner */}
                    {selectedIds.length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-blue-600" />
                                <span>
                                    Đang chọn <strong>{selectedIds.length}</strong> giao dịch.
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    className="px-2.5 py-1 bg-white hover:bg-gray-50 text-blue-700 font-semibold border border-blue-200 rounded-lg shadow-sm cursor-pointer"
                                >
                                    Xuất CSV đã chọn
                                </button>
                                {pendingSelectedCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction({ type: 'BATCH_APPROVE' })}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                                    >
                                        Xác nhận & Đối soát ({pendingSelectedCount})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds([])}
                                    className="px-2 py-1 text-gray-500 hover:text-gray-800 cursor-pointer"
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
                        currentPage={currentPage}
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
                        emptyText="Không tìm thấy giao dịch thanh toán nào phù hợp."
                    />
                </div>
            )}

            {/* ==================== SECTION 2: PAYMENT METHODS & GATEWAYS ==================== */}
            {activeSection === 'METHODS' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
                        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Quản lý kênh thanh toán hệ thống PCStore</p>
                            <p className="text-blue-700/90 mt-0.5">
                                Bật/tắt các phương thức thanh toán hiển thị tại trang Checkout, cấu hình tài khoản ngân hàng nhận chuyển khoản VietQR, mã đối tác VNPAY và biểu phí giao dịch.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {methodConfigs.map((cfg) => {
                            const meta = METHOD_META[cfg.code];
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={cfg.id}
                                    className={`bg-white p-5 rounded-2xl border shadow-sm transition-all flex flex-col justify-between gap-4 ${
                                        cfg.enabled
                                            ? 'border-gray-200 hover:border-blue-300'
                                            : 'border-gray-200 opacity-75 bg-gray-50/50'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl border ${meta.color}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-bold text-gray-900">
                                                            {cfg.name}
                                                        </h3>
                                                        {cfg.environment && (
                                                            <span
                                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                                    cfg.environment === 'PRODUCTION'
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                }`}
                                                            >
                                                                {cfg.environment}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        {cfg.shortDescription}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Toggle Switch */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleMethodEnabled(cfg)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                                                    cfg.enabled ? 'bg-blue-600' : 'bg-gray-300'
                                                }`}
                                                title={cfg.enabled ? 'Tắt phương thức này' : 'Bật phương thức này'}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                                        cfg.enabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Key info grid */}
                                        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                            <div>
                                                <span className="text-gray-400 text-[11px] block">Phí giao dịch:</span>
                                                <strong className="text-gray-800">{cfg.feePercent}%</strong>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 text-[11px] block">Hạn mức tối đa:</span>
                                                <strong className="text-gray-800">{formatVND(cfg.maxAmount)}</strong>
                                            </div>
                                            {cfg.merchantCode && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-400 text-[11px]">Mã Terminal (TmnCode): </span>
                                                    <strong className="font-mono text-blue-700">{cfg.merchantCode}</strong>
                                                </div>
                                            )}
                                            {cfg.accountNumber && (
                                                <div className="col-span-2 space-y-0.5 pt-1 border-t border-gray-200/70">
                                                    <div className="text-[11px] text-gray-600">
                                                        <strong>{cfg.bankName}</strong>
                                                    </div>
                                                    <div className="text-[11px] text-gray-600">
                                                        STK: <strong className="font-mono text-blue-700">{cfg.accountNumber}</strong> • {cfg.accountHolder}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                                        <span className="text-gray-400">
                                            Cập nhật: {formatDateTime(cfg.updatedAt)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditMethod(cfg)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                        >
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                            <span>Cấu hình chi tiết</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ==================== MODAL 1: CHI TIẾT GIAO DỊCH ==================== */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Chi tiết giao dịch ${detailTxn?.transactionCode || ''}`}
                subtitle={`Ghi nhận lúc: ${formatDateTime(detailTxn?.paidAt)}`}
                icon={CreditCard}
                size="lg"
            >
                {() => {
                    if (!detailTxn) return null;
                    return (
                        <div className="space-y-4">
                            {/* Top Status & Quick Action Bar */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {renderStatusBadge(detailTxn.status)}
                                        {renderMethodBadge(detailTxn.method)}
                                    </div>
                                    <p className="text-2xl font-black text-emerald-600 mt-1">
                                        {formatVND(detailTxn.amount)}
                                    </p>
                                    {detailTxn.feeAmount > 0 && (
                                        <p className="text-[11px] text-gray-500">
                                            Phí cổng thanh toán: {formatVND(detailTxn.feeAmount)} • Thực nhận:{' '}
                                            <strong className="text-gray-800">
                                                {formatVND(detailTxn.amount - detailTxn.feeAmount)}
                                            </strong>
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => adminPaymentService.printReceipt(detailTxn)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>In biên lai</span>
                                    </button>
                                    {detailTxn.status === 'PENDING' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmAction({ type: 'APPROVE', txn: detailTxn })
                                            }
                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Xác nhận thu</span>
                                        </button>
                                    )}
                                    {detailTxn.status === 'SUCCESS' && (
                                        <button
                                            type="button"
                                            onClick={() => handleOpenRefund(detailTxn)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>Hoàn tiền</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                                    <p className="font-bold text-gray-800 uppercase tracking-wider border-b pb-1.5">
                                        Thông tin đơn hàng & Khách hàng
                                    </p>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Mã đơn hàng:</span>
                                        <strong className="font-mono text-blue-700">{detailTxn.orderCode}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Khách hàng:</span>
                                        <strong className="text-gray-900">{detailTxn.customerName}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Số điện thoại:</span>
                                        <span className="font-mono">{detailTxn.customerPhone}</span>
                                    </div>
                                    {detailTxn.customerEmail && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Email:</span>
                                            <span>{detailTxn.customerEmail}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                                    <p className="font-bold text-gray-800 uppercase tracking-wider border-b pb-1.5">
                                        Thông tin cổng thanh toán & Đối soát
                                    </p>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Mã tham chiếu (Ref):</span>
                                        <strong className="font-mono text-gray-800">{detailTxn.gatewayRef || '—'}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Ngân hàng / Kênh:</span>
                                        <strong className="text-gray-800">{detailTxn.bankName || '—'}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Mã phản hồi cổng:</span>
                                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100">
                                            {detailTxn.gatewayResponseCode || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Trạng thái đối soát:</span>
                                        <strong className={detailTxn.reconciled ? 'text-emerald-600' : 'text-amber-600'}>
                                            {detailTxn.reconciled ? 'Đã đối soát kế toán' : 'Chưa đối soát'}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {detailTxn.gatewayMessage && (
                                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                                    <strong>Thông điệp hệ thống / Cổng thanh toán:</strong> {detailTxn.gatewayMessage}
                                </div>
                            )}

                            {detailTxn.refundReason && (
                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                                    <div className="font-bold">
                                        Thông tin hoàn tiền: -{formatVND(detailTxn.refundedAmount || detailTxn.amount)}
                                    </div>
                                    <p>Lý do: {detailTxn.refundReason}</p>
                                </div>
                            )}

                            {detailTxn.note && (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700">
                                    <strong>Ghi chú:</strong> {detailTxn.note}
                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* ==================== MODAL 2: GHI NHẬN THANH TOÁN MỚI ==================== */}
            <AdminModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Ghi nhận giao dịch thanh toán"
                subtitle="Tạo bản ghi thu tiền tại quầy, chuyển khoản VietQR hoặc đối soát thanh toán đơn hàng"
                icon={Plus}
                size="lg"
                onSubmit={handleSubmitCreate}
                submitText="Lưu giao dịch thanh toán"
            >
                {() => (
                    <div className="space-y-4">
                        {recentOrders.length > 0 && (
                            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                                <span className="text-xs font-bold text-blue-800 block">
                                    Chọn nhanh từ đơn hàng thực tế
                                </span>
                                <AdminSelect
                                    value={selectedOrderCode}
                                    onChange={(e) => handleSelectOrder(e.target.value)}
                                    options={[
                                        { label: '-- Nhập thủ công --', value: '' },
                                        ...recentOrders.map((o) => ({
                                            label: `${o.code} • ${o.recipientName || o.customerName || 'Khách lẻ'} (${formatVND(o.finalAmount)})`,
                                            value: o.code,
                                        })),
                                    ]}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <AdminInput
                                label="Mã đơn hàng"
                                placeholder="VD: ORD-20261119-001"
                                value={createForm.orderCode}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, orderCode: e.target.value })
                                }
                            />
                            <AdminInput
                                label="Số tiền thanh toán (VND)"
                                type="number"
                                required
                                min={1000}
                                value={createForm.amount}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, amount: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <AdminInput
                                label="Tên khách hàng"
                                required
                                value={createForm.customerName}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, customerName: e.target.value })
                                }
                            />
                            <AdminInput
                                label="Số điện thoại"
                                required
                                value={createForm.customerPhone}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, customerPhone: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <AdminSelect
                                label="Phương thức thanh toán"
                                required
                                value={createForm.method}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        method: e.target.value as PaymentMethodCode,
                                    })
                                }
                                options={[
                                    { label: 'Chuyển khoản VietQR', value: 'BANK_TRANSFER' },
                                    { label: 'VNPAY QR / ATM', value: 'VNPAY' },
                                    { label: 'Tiền mặt tại quầy', value: 'CASH' },
                                    { label: 'Quẹt thẻ POS', value: 'CARD' },
                                    { label: 'Thu hộ (COD)', value: 'COD' },
                                ]}
                            />
                            <AdminInput
                                label="Ngân hàng / Kênh thu"
                                placeholder="Vietcombank, VNPAY..."
                                value={createForm.bankName}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, bankName: e.target.value })
                                }
                            />
                            <AdminSelect
                                label="Trạng thái"
                                value={createForm.status}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        status: e.target.value as PaymentTransactionStatus,
                                    })
                                }
                                options={[
                                    { label: 'Thành công (SUCCESS)', value: 'SUCCESS' },
                                    { label: 'Chờ xác nhận (PENDING)', value: 'PENDING' },
                                ]}
                            />
                        </div>

                        <AdminInput
                            label="Mã tham chiếu cổng / Số bút toán (UNC)"
                            placeholder="VD: FT26323819201 hoặc VNP14582910"
                            value={createForm.gatewayRef}
                            onChange={(e) =>
                                setCreateForm({ ...createForm, gatewayRef: e.target.value })
                            }
                        />

                        <AdminTextarea
                            label="Ghi chú"
                            rows={2}
                            value={createForm.note}
                            onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                        />
                    </div>
                )}
            </AdminModal>

            {/* ==================== MODAL 3: HOÀN TIỀN GIAO DỊCH ==================== */}
            <AdminModal
                isOpen={!!refundTarget}
                onClose={() => setRefundTarget(null)}
                title={`Hoàn tiền giao dịch ${refundTarget?.transactionCode || ''}`}
                subtitle={`Số tiền gốc: ${formatVND(refundTarget?.amount || 0)} • Khách hàng: ${refundTarget?.customerName || ''}`}
                icon={RotateCcw}
                size="md"
                onSubmit={handleSubmitRefund}
                submitText="Xác nhận hoàn tiền"
            >
                {() => (
                    <div className="space-y-4">
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
                            Nhập số tiền cần hoàn trả cho khách hàng (toàn phần hoặc một phần). Hệ thống sẽ ghi nhận trạng thái <strong>REFUNDED</strong> và lưu nhật ký kiểm toán.
                        </div>
                        <AdminInput
                            label="Số tiền hoàn trả (VND)"
                            type="number"
                            required
                            min={1000}
                            max={refundTarget?.amount || undefined}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                        />
                        <AdminTextarea
                            label="Lý do hoàn tiền"
                            required
                            rows={3}
                            placeholder="VD: Khách hủy đơn hàng trước khi xuất kho / Đổi sản phẩm khác..."
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                        />
                    </div>
                )}
            </AdminModal>

            {/* ==================== MODAL 4: CẤU HÌNH PHƯƠNG THỨC THANH TOÁN ==================== */}
            <AdminModal
                isOpen={!!editingMethod}
                onClose={() => setEditingMethod(null)}
                title={`Cấu hình: ${editingMethod?.code || ''}`}
                subtitle="Chỉnh sửa thông số kết nối, tài khoản nhận tiền và biểu phí giao dịch"
                icon={Settings}
                size="lg"
                onSubmit={handleSaveMethodConfig}
                submitText="Lưu cấu hình"
            >
                {() => (
                    <div className="space-y-4">
                        <AdminInput
                            label="Tên hiển thị phương thức"
                            required
                            value={methodForm.name}
                            onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                        />
                        <AdminTextarea
                            label="Mô tả ngắn"
                            rows={2}
                            value={methodForm.shortDescription}
                            onChange={(e) =>
                                setMethodForm({ ...methodForm, shortDescription: e.target.value })
                            }
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <AdminSelect
                                label="Môi trường chạy"
                                value={methodForm.environment}
                                onChange={(e) =>
                                    setMethodForm({
                                        ...methodForm,
                                        environment: e.target.value as 'SANDBOX' | 'PRODUCTION',
                                    })
                                }
                                options={[
                                    { label: 'PRODUCTION (Chính thức)', value: 'PRODUCTION' },
                                    { label: 'SANDBOX (Thử nghiệm)', value: 'SANDBOX' },
                                ]}
                            />
                            <AdminInput
                                label="Phí giao dịch (%)"
                                type="number"
                                step="0.1"
                                min={0}
                                value={methodForm.feePercent}
                                onChange={(e) =>
                                    setMethodForm({ ...methodForm, feePercent: e.target.value })
                                }
                            />
                            <AdminInput
                                label="Hạn mức tối đa (VND)"
                                type="number"
                                min={0}
                                value={methodForm.maxAmount}
                                onChange={(e) =>
                                    setMethodForm({ ...methodForm, maxAmount: e.target.value })
                                }
                            />
                        </div>

                        {editingMethod?.code === 'VNPAY' && (
                            <AdminInput
                                label="Mã Website / Terminal ID (vnp_TmnCode)"
                                value={methodForm.merchantCode}
                                onChange={(e) =>
                                    setMethodForm({ ...methodForm, merchantCode: e.target.value })
                                }
                            />
                        )}

                        {(editingMethod?.code === 'BANK_TRANSFER' || editingMethod?.code === 'CARD') && (
                            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                                <p className="text-xs font-bold text-gray-700">
                                    Thông tin ngân hàng thụ hưởng
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <AdminInput
                                        label="Tên ngân hàng"
                                        value={methodForm.bankName}
                                        onChange={(e) =>
                                            setMethodForm({ ...methodForm, bankName: e.target.value })
                                        }
                                    />
                                    <AdminInput
                                        label="Số tài khoản"
                                        value={methodForm.accountNumber}
                                        onChange={(e) =>
                                            setMethodForm({
                                                ...methodForm,
                                                accountNumber: e.target.value,
                                            })
                                        }
                                    />
                                    <AdminInput
                                        label="Chủ tài khoản"
                                        value={methodForm.accountHolder}
                                        onChange={(e) =>
                                            setMethodForm({
                                                ...methodForm,
                                                accountHolder: e.target.value,
                                            })
                                        }
                                    />
                                    <AdminInput
                                        label="Chi nhánh"
                                        value={methodForm.bankBranch}
                                        onChange={(e) =>
                                            setMethodForm({ ...methodForm, bankBranch: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* ==================== MODAL 5: XÁC NHẬN HÀNH ĐỘNG ==================== */}
            <AdminConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleExecuteConfirm}
                title={
                    confirmAction?.type === 'MARK_FAILED'
                        ? 'Đánh dấu giao dịch thất bại'
                        : confirmAction?.type === 'BATCH_APPROVE'
                        ? 'Xác nhận & Đối soát hàng loạt'
                        : 'Xác nhận đã nhận thanh toán'
                }
                message={
                    confirmAction?.type === 'MARK_FAILED' ? (
                        <span>
                            Bạn có chắc muốn đánh dấu giao dịch{' '}
                            <strong>{confirmAction.txn?.transactionCode}</strong> là THẤT BẠI?
                        </span>
                    ) : confirmAction?.type === 'BATCH_APPROVE' ? (
                        <span>
                            Xác nhận đã thu tiền và hoàn tất đối soát cho{' '}
                            <strong>{pendingSelectedCount}</strong> giao dịch đang chờ?
                        </span>
                    ) : (
                        <span>
                            Xác nhận đã nhận đủ{' '}
                            <strong>{formatVND(confirmAction?.txn?.amount || 0)}</strong> cho giao dịch{' '}
                            <strong>{confirmAction?.txn?.transactionCode}</strong>?
                        </span>
                    )
                }
                variant={confirmAction?.type === 'MARK_FAILED' ? 'danger' : 'success'}
                confirmText={
                    confirmAction?.type === 'MARK_FAILED' ? 'Đánh dấu thất bại' : 'Xác nhận đã thu'
                }
                cancelText="Đóng"
            />
        </div>
    );
}
