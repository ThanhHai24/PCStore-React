import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Receipt,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    RefreshCw,
    Plus,
    Printer,
    Copy,
    ChevronRight,
    Building2,
    User,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    Banknote,
    DollarSign,
    ShieldCheck,
    AlertTriangle,
    Edit3,
    Check,
    ShoppingBag,
    FileCheck,
    Ban,
    Sparkles,
    Save,
    Loader2,
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
    AdminSelect,
    AdminTextarea,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import {
    adminInvoiceService,
    formatVND,
    numberToVietnameseWords,
} from '../../../services/adminInvoiceService';
import type {
    AdminInvoice,
    InvoicePaymentMethod,
    InvoiceStats,
    InvoiceStatus,
    InvoiceType,
} from '../../../types/adminInvoice';
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

const PAYMENT_METHOD_META: Record<
    InvoicePaymentMethod,
    { label: string; color: string; icon: React.ElementType }
> = {
    VNPAY: {
        label: 'VNPAY QR',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: CreditCard,
    },
    BANK_TRANSFER: {
        label: 'Chuyển khoản',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Building2,
    },
    CASH: {
        label: 'Tiền mặt',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: Banknote,
    },
    CARD: {
        label: 'Quẹt thẻ POS',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: CreditCard,
    },
    COD: {
        label: 'Thu hộ (COD)',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: ShoppingBag,
    },
};

export default function InvoiceList() {
    const { addToast } = useToast();

    // Data states
    const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [fromBackend, setFromBackend] = useState<boolean>(false);
    const [stats, setStats] = useState<InvoiceStats>({
        totalCount: 0,
        todayCount: 0,
        paidCount: 0,
        pendingCount: 0,
        canceledCount: 0,
        vatInvoiceCount: 0,
        totalPaidAmount: 0,
        totalPendingAmount: 0,
        totalTaxAmount: 0,
        totalDiscountAmount: 0,
    });

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [quickTab, setQuickTab] = useState<string>('ALL');
    const [filterValues, setFilterValues] = useState<Record<string, string>>({
        status: '',
        invoiceType: '',
        paymentMethod: '',
        dateRange: '',
        startDate: '',
        endDate: '',
    });
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

    // Detail Modal states
    const [detailInvoice, setDetailInvoice] = useState<AdminInvoice | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [hydratingDetail, setHydratingDetail] = useState<boolean>(false);

    // Edit VAT / Info form inside Detail Modal
    const [editForm, setEditForm] = useState<{
        invoiceType: InvoiceType;
        companyName: string;
        taxCode: string;
        companyAddress: string;
        customerEmail: string;
        customerAddress: string;
        paymentMethod: InvoicePaymentMethod;
        note: string;
    }>({
        invoiceType: 'RETAIL',
        companyName: '',
        taxCode: '',
        companyAddress: '',
        customerEmail: '',
        customerAddress: '',
        paymentMethod: 'BANK_TRANSFER',
        note: '',
    });

    // Create Invoice Modal states
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
    const [selectedOrderCode, setSelectedOrderCode] = useState<string>('');
    const [createForm, setCreateForm] = useState<{
        orderCode: string;
        orderId?: number;
        customerName: string;
        customerPhone: string;
        customerEmail: string;
        customerAddress: string;
        invoiceType: InvoiceType;
        companyName: string;
        taxCode: string;
        companyAddress: string;
        paymentMethod: InvoicePaymentMethod;
        totalAmount: string;
        discountAmount: string;
        taxRate: string;
        status: InvoiceStatus;
        note: string;
    }>({
        orderCode: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        invoiceType: 'RETAIL',
        companyName: '',
        taxCode: '',
        companyAddress: '',
        paymentMethod: 'BANK_TRANSFER',
        totalAmount: '0',
        discountAmount: '0',
        taxRate: '8',
        status: 'PAID',
        note: '',
    });

    // Confirm Action Modal states
    const [confirmAction, setConfirmAction] = useState<{
        type: 'MARK_PAID' | 'CANCEL' | 'BATCH_PAID';
        invoice?: AdminInvoice;
    } | null>(null);

    // Load invoices
    const loadInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminInvoiceService.getInvoices({
                keyword: searchQuery,
                status: filterValues.status || undefined,
                invoiceType: filterValues.invoiceType || undefined,
                paymentMethod: filterValues.paymentMethod || undefined,
                dateRange: filterValues.dateRange || undefined,
                startDate: filterValues.startDate || undefined,
                endDate: filterValues.endDate || undefined,
            });

            setFromBackend(res.fromBackend);
            setStats(adminInvoiceService.computeStats(res.invoices));

            let list = res.invoices;
            if (quickTab === 'PAID') {
                list = list.filter((i) => i.status === 'PAID');
            } else if (quickTab === 'PENDING') {
                list = list.filter((i) => i.status === 'PENDING');
            } else if (quickTab === 'CANCELED') {
                list = list.filter((i) => i.status === 'CANCELED');
            } else if (quickTab === 'VAT') {
                list = list.filter((i) => i.invoiceType === 'VAT_COMPANY');
            }

            setInvoices(list);
        } catch {
            addToast({
                type: 'error',
                title: 'Lỗi tải hóa đơn',
                message: 'Không thể tải danh sách hóa đơn hệ thống.',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterValues, quickTab, addToast]);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    // Pagination slicing
    const totalItems = invoices.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(Math.max(1, totalPages));
        }
    }, [currentPage, totalPages]);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return invoices.slice(start, start + pageSize);
    }, [invoices, currentPage, pageSize]);

    // Open Detail Modal & Hydrate line items from BE Order if needed
    const handleOpenDetail = async (invoice: AdminInvoice) => {
        setDetailInvoice(invoice);
        setEditForm({
            invoiceType: invoice.invoiceType,
            companyName: invoice.companyName || '',
            taxCode: invoice.taxCode || '',
            companyAddress: invoice.companyAddress || '',
            customerEmail: invoice.customerEmail || '',
            customerAddress: invoice.customerAddress || '',
            paymentMethod: invoice.paymentMethod,
            note: invoice.note || '',
        });
        setIsDetailOpen(true);

        if (!invoice.items || invoice.items.length === 0) {
            setHydratingDetail(true);
            try {
                const hydrated = await adminInvoiceService.hydrateInvoiceWithOrder(invoice);
                setDetailInvoice(hydrated);
                setEditForm((prev) => ({
                    ...prev,
                    customerEmail: hydrated.customerEmail || prev.customerEmail,
                    customerAddress: hydrated.customerAddress || prev.customerAddress,
                }));
            } finally {
                setHydratingDetail(false);
            }
        }
    };

    // Open Create Modal & load recent orders from BE
    const handleOpenCreateModal = async () => {
        setSelectedOrderCode('');
        setCreateForm({
            orderCode: '',
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            customerAddress: '',
            invoiceType: 'RETAIL',
            companyName: '',
            taxCode: '',
            companyAddress: '',
            paymentMethod: 'BANK_TRANSFER',
            totalAmount: '',
            discountAmount: '0',
            taxRate: '8',
            status: 'PAID',
            note: '',
        });
        setIsCreateOpen(true);
        const orders = await adminInvoiceService.getRecentOrdersForInvoicing();
        setRecentOrders(orders);
    };

    // Autofill Create Form when selecting an order
    const handleSelectOrderForInvoice = (code: string) => {
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
            customerAddress: found.address || '',
            totalAmount: String(found.totalAmount || found.finalAmount || 0),
            discountAmount: String(found.discountAmount || 0),
            status: found.status === 'COMPLETED' ? 'PAID' : 'PENDING',
            note: found.note || `Xuất hóa đơn cho đơn hàng ${found.code}`,
        }));
    };

    // Submit Create Invoice
    const handleCreateInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        const totalNum = Number(createForm.totalAmount) || 0;
        const discountNum = Number(createForm.discountAmount) || 0;
        const taxRateNum = Number(createForm.taxRate) || 0;

        if (!createForm.customerName.trim() || !createForm.customerPhone.trim()) {
            addToast({
                type: 'warning',
                title: 'Thiếu thông tin khách hàng',
                message: 'Vui lòng nhập đầy đủ họ tên và số điện thoại người mua hàng.',
            });
            return;
        }
        if (totalNum <= 0) {
            addToast({
                type: 'warning',
                title: 'Giá trị hóa đơn không hợp lệ',
                message: 'Tổng tiền hàng phải lớn hơn 0 ₫.',
            });
            return;
        }
        if (createForm.invoiceType === 'VAT_COMPANY' && (!createForm.companyName.trim() || !createForm.taxCode.trim())) {
            addToast({
                type: 'warning',
                title: 'Thiếu thông tin VAT doanh nghiệp',
                message: 'Vui lòng nhập Tên đơn vị và Mã số thuế khi xuất hóa đơn GTGT.',
            });
            return;
        }

        const matchedOrder = recentOrders.find((o) => o.code === createForm.orderCode);
        const created = adminInvoiceService.createInvoice({
            orderCode: createForm.orderCode,
            orderId: createForm.orderId,
            customerName: createForm.customerName,
            customerPhone: createForm.customerPhone,
            customerEmail: createForm.customerEmail,
            customerAddress: createForm.customerAddress,
            invoiceType: createForm.invoiceType,
            companyName: createForm.companyName,
            taxCode: createForm.taxCode,
            companyAddress: createForm.companyAddress,
            paymentMethod: createForm.paymentMethod,
            totalAmount: totalNum,
            discountAmount: discountNum,
            taxRate: taxRateNum,
            status: createForm.status,
            note: createForm.note,
            items: matchedOrder?.items?.map((it) => ({
                id: it.id,
                productCode: it.productCode,
                productName: it.productName,
                productImageUrl: it.productImageUrl,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discountAmount: it.discountAmount,
                subtotal: it.subtotal,
            })),
        });

        setIsCreateOpen(false);
        loadInvoices();
        addToast({
            type: 'success',
            title: 'Phát hành hóa đơn thành công',
            message: `Đã phát hành hóa đơn ${created.invoiceCode} (${formatVND(created.amount)}).`,
        });
    };

    // Save VAT & Invoice Info edit
    const handleSaveInvoiceEdit = () => {
        if (!detailInvoice) return;
        if (editForm.invoiceType === 'VAT_COMPANY' && (!editForm.companyName.trim() || !editForm.taxCode.trim())) {
            addToast({
                type: 'warning',
                title: 'Thiếu thông tin doanh nghiệp',
                message: 'Hóa đơn GTGT bắt buộc phải có Tên doanh nghiệp và Mã số thuế.',
            });
            return;
        }

        adminInvoiceService.updateInvoice(detailInvoice, {
            invoiceType: editForm.invoiceType,
            companyName: editForm.companyName.trim() || undefined,
            taxCode: editForm.taxCode.trim() || undefined,
            companyAddress: editForm.companyAddress.trim() || undefined,
            customerEmail: editForm.customerEmail.trim() || undefined,
            customerAddress: editForm.customerAddress.trim() || undefined,
            paymentMethod: editForm.paymentMethod,
            note: editForm.note.trim() || undefined,
        });

        const updated: AdminInvoice = {
            ...detailInvoice,
            invoiceType: editForm.invoiceType,
            companyName: editForm.companyName.trim() || undefined,
            taxCode: editForm.taxCode.trim() || undefined,
            companyAddress: editForm.companyAddress.trim() || undefined,
            customerEmail: editForm.customerEmail.trim() || undefined,
            customerAddress: editForm.customerAddress.trim() || undefined,
            paymentMethod: editForm.paymentMethod,
            note: editForm.note.trim() || undefined,
        };
        setDetailInvoice(updated);
        loadInvoices();
        addToast({
            type: 'success',
            title: 'Đã cập nhật hóa đơn',
            message: `Thông tin hóa đơn ${detailInvoice.invoiceCode} đã được lưu.`,
        });
    };

    // Execute Confirmed Status Change
    const handleConfirmStatusAction = () => {
        if (!confirmAction) return;

        if (confirmAction.type === 'MARK_PAID' && confirmAction.invoice) {
            adminInvoiceService.updateInvoice(confirmAction.invoice, {
                status: 'PAID',
                eInvoiceStatus: 'ISSUED',
            });
            if (detailInvoice?.id === confirmAction.invoice.id) {
                setDetailInvoice({ ...detailInvoice, status: 'PAID', eInvoiceStatus: 'ISSUED' });
            }
            addToast({
                type: 'success',
                title: 'Xác nhận thanh toán thành công',
                message: `Hóa đơn ${confirmAction.invoice.invoiceCode} đã chuyển sang ĐÃ THANH TOÁN & phát hành HĐĐT.`,
            });
        } else if (confirmAction.type === 'CANCEL' && confirmAction.invoice) {
            adminInvoiceService.updateInvoice(confirmAction.invoice, {
                status: 'CANCELED',
                eInvoiceStatus: 'CANCELLED',
            });
            if (detailInvoice?.id === confirmAction.invoice.id) {
                setDetailInvoice({ ...detailInvoice, status: 'CANCELED', eInvoiceStatus: 'CANCELLED' });
            }
            addToast({
                type: 'warning',
                title: 'Đã hủy hóa đơn',
                message: `Hóa đơn ${confirmAction.invoice.invoiceCode} đã được đánh dấu ĐÃ HỦY.`,
            });
        } else if (confirmAction.type === 'BATCH_PAID') {
            const targets = invoices.filter(
                (inv) => selectedIds.includes(inv.id) && inv.status === 'PENDING'
            );
            targets.forEach((inv) =>
                adminInvoiceService.updateInvoice(inv, {
                    status: 'PAID',
                    eInvoiceStatus: 'ISSUED',
                })
            );
            setSelectedIds([]);
            addToast({
                type: 'success',
                title: 'Xác nhận thanh toán hàng loạt',
                message: `Đã xác nhận thanh toán cho ${targets.length} hóa đơn.`,
            });
        }

        setConfirmAction(null);
        loadInvoices();
    };

    // Copy helper
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast({
            type: 'info',
            title: 'Đã sao chép',
            message: `Đã sao chép ${label} vào bộ nhớ tạm.`,
        });
    };

    // Export CSV
    const handleExportCsv = () => {
        const list =
            selectedIds.length > 0
                ? invoices.filter((inv) => selectedIds.includes(inv.id))
                : invoices;
        if (list.length === 0) {
            addToast({
                type: 'warning',
                title: 'Không có dữ liệu',
                message: 'Không có hóa đơn nào để xuất tệp CSV.',
            });
            return;
        }
        adminInvoiceService.exportToCsv(list);
        addToast({
            type: 'success',
            title: 'Xuất file CSV thành công',
            message: `Đã xuất ${list.length} hóa đơn ra tệp bảng tính CSV.`,
        });
    };

    // Print Invoice (hydrate items first if needed)
    const handlePrintInvoice = async (invoice: AdminInvoice) => {
        const hydrated = await adminInvoiceService.hydrateInvoiceWithOrder(invoice);
        adminInvoiceService.printInvoice(hydrated);
    };

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái hóa đơn',
            type: 'select',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đã thanh toán (PAID)', value: 'PAID', dotColor: 'bg-emerald-500' },
                { label: 'Chờ thanh toán (PENDING)', value: 'PENDING', dotColor: 'bg-amber-500' },
                { label: 'Đã hủy (CANCELED)', value: 'CANCELED', dotColor: 'bg-rose-500' },
            ],
        },
        {
            name: 'invoiceType',
            label: 'Loại hóa đơn',
            type: 'select',
            options: [
                { label: 'Tất cả loại hóa đơn', value: '' },
                { label: 'Hóa đơn bán lẻ', value: 'RETAIL' },
                { label: 'Hóa đơn GTGT (VAT Doanh nghiệp)', value: 'VAT_COMPANY' },
            ],
        },
        {
            name: 'paymentMethod',
            label: 'Phương thức thanh toán',
            type: 'select',
            options: [
                { label: 'Tất cả phương thức', value: '' },
                { label: 'VNPAY QR', value: 'VNPAY' },
                { label: 'Chuyển khoản ngân hàng', value: 'BANK_TRANSFER' },
                { label: 'Tiền mặt tại quầy', value: 'CASH' },
                { label: 'Quẹt thẻ POS', value: 'CARD' },
                { label: 'Thanh toán khi nhận hàng (COD)', value: 'COD' },
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
                { label: 'Trong tháng này', value: 'thisMonth' },
            ],
        },
        {
            name: 'startDate',
            label: 'Từ ngày',
            type: 'date',
        },
        {
            name: 'endDate',
            label: 'Đến ngày',
            type: 'date',
        },
    ];

    // Badge Renderers (restrained 6px dot + neutral text / 1px rounded-md border)
    const renderStatusBadge = (status: InvoiceStatus) => {
        switch (status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
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
            case 'CANCELED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Đã hủy</span>
                    </span>
                );
        }
    };

    const renderPaymentBadge = (method: InvoicePaymentMethod) => {
        const meta = PAYMENT_METHOD_META[method] || PAYMENT_METHOD_META.BANK_TRANSFER;
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap">
                {meta.label}
            </span>
        );
    };

    // Table columns
    const columns: Column<AdminInvoice>[] = [
        {
            key: 'invoiceCode',
            header: 'Mã hóa đơn',
            sortable: true,
            sortValue: (item) => new Date(item.invoiceDate).getTime(),
            render: (inv) => (
                <div className="space-y-0.5 min-w-[140px]">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {inv.invoiceCode}
                        </span>
                        {inv.invoiceType === 'VAT_COMPANY' && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                VAT
                            </span>
                        )}
                        {inv.source === 'MANUAL' && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                                Thủ công
                            </span>
                        )}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        Đơn: {inv.orderCode}
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng / Đơn vị',
            render: (inv) => (
                <div className="space-y-0.5 max-w-[240px]">
                    <p className="text-xs font-medium text-slate-900 truncate">{inv.customerName}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">{inv.customerPhone}</p>
                    {inv.invoiceType === 'VAT_COMPANY' && inv.companyName && (
                        <div
                            className="text-[11px] text-slate-600 truncate tabular-nums"
                            title={inv.companyName}
                        >
                            {inv.companyName}
                            {inv.taxCode ? ` · MST: ${inv.taxCode}` : ''}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'paymentMethod',
            header: 'Thanh toán',
            render: (inv) => renderPaymentBadge(inv.paymentMethod),
        },
        {
            key: 'amount',
            header: 'Tổng thanh toán',
            align: 'right',
            sortable: true,
            sortValue: (item) => item.amount,
            render: (inv) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div
                        className={`font-mono text-xs font-semibold ${
                            inv.status === 'CANCELED'
                                ? 'text-slate-400 line-through'
                                : 'text-slate-900'
                        }`}
                    >
                        {formatVND(inv.amount)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                        VAT {inv.taxRate}%: {formatVND(inv.taxAmount)}
                    </div>
                </div>
            ),
        },
        {
            key: 'invoiceDate',
            header: 'Thời gian xuất',
            align: 'right',
            render: (inv) => (
                <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDateTime(inv.invoiceDate)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (inv) => (
                <div className="space-y-0.5">
                    <div>{renderStatusBadge(inv.status)}</div>
                    <div className="text-[11px] text-slate-500">
                        HĐĐT:{' '}
                        <span className="text-slate-700">
                            {inv.eInvoiceStatus === 'ISSUED'
                                ? 'Đã phát hành'
                                : inv.eInvoiceStatus === 'CANCELLED'
                                ? 'Đã hủy bỏ'
                                : 'Bản nháp'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (inv) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(inv)}
                    viewLabel="Xem chi tiết hóa đơn"
                    moreActions={[
                        {
                            key: 'print',
                            label: 'In hóa đơn A4 / PDF',
                            icon: Printer,
                            onClick: () => handlePrintInvoice(inv),
                        },
                        ...(inv.status === 'PENDING'
                            ? [
                                  {
                                      key: 'mark-paid',
                                      label: 'Xác nhận đã thanh toán',
                                      icon: CheckCircle2,
                                      onClick: () =>
                                          setConfirmAction({ type: 'MARK_PAID', invoice: inv }),
                                  },
                              ]
                            : []),
                        {
                            key: 'copy-code',
                            label: 'Sao chép số hóa đơn',
                            icon: Copy,
                            onClick: () => handleCopy(inv.invoiceCode, 'Số hóa đơn'),
                        },
                        ...(inv.status !== 'CANCELED'
                            ? [
                                  {
                                      key: 'cancel',
                                      label: 'Hủy hóa đơn',
                                      icon: Ban,
                                      variant: 'danger' as const,
                                      onClick: () =>
                                          setConfirmAction({ type: 'CANCEL', invoice: inv }),
                                  },
                              ]
                            : []),
                    ]}
                />
            ),
        },
    ];

    const detailTabs: ModalTab[] = [
        { id: 'overview', label: 'Chi tiết hóa đơn', icon: FileText },
        { id: 'preview', label: 'Xem trước bản in A4', icon: Printer },
        { id: 'edit', label: 'Thông tin VAT & Ghi chú', icon: Edit3 },
    ];

    // Live calculation for Create Form
    const createPreviewCalc = useMemo(() => {
        const total = Number(createForm.totalAmount) || 0;
        const discount = Number(createForm.discountAmount) || 0;
        const rate = Number(createForm.taxRate) || 0;
        const finalAmount = Math.max(0, total - discount);
        const taxAmount = Math.round((finalAmount * rate) / 100);
        return { total, discount, finalAmount, taxAmount };
    }, [createForm.totalAmount, createForm.discountAmount, createForm.taxRate]);

    const pendingSelectedCount = useMemo(
        () =>
            invoices.filter((inv) => selectedIds.includes(inv.id) && inv.status === 'PENDING')
                .length,
        [invoices, selectedIds]
    );

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý hóa đơn
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.totalCount.toLocaleString('vi-VN')} hóa đơn · {stats.paidCount} đã thanh toán · {stats.pendingCount} chờ thanh toán
                        {!fromBackend && ' · Dữ liệu cục bộ'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadInvoices()}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-sm rounded-md border border-slate-200 transition-colors disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-sm rounded-md border border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Xuất CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Phát hành hóa đơn</span>
                    </button>
                </div>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-5 overflow-x-auto border-b border-slate-200">
                {[
                    { id: 'ALL', label: 'Tất cả hóa đơn', count: stats.totalCount },
                    { id: 'PAID', label: 'Đã thanh toán', count: stats.paidCount },
                    { id: 'PENDING', label: 'Chờ thanh toán', count: stats.pendingCount },
                    { id: 'VAT', label: 'Hóa đơn GTGT (VAT)', count: stats.vatInvoiceCount },
                    { id: 'CANCELED', label: 'Đã hủy', count: stats.canceledCount },
                ].map((tab) => {
                    const isActive = quickTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setQuickTab(tab.id);
                                setCurrentPage(1);
                            }}
                            className={`flex items-center gap-2 pb-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-blue-600 ${
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.5 rounded-md text-xs font-medium tabular-nums ${
                                    isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Table */}
            <div className="space-y-4">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => {
                        setSearchQuery(q);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Tìm số hóa đơn (HD-...), mã đơn hàng (ORD-...), tên khách hàng, SĐT, công ty, MST..."
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
                            invoiceType: '',
                            paymentMethod: '',
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
                    <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
                        <div className="flex items-center gap-2 tabular-nums">
                            <Check className="w-4 h-4 text-blue-600" />
                            <span>
                                Đang chọn <strong>{selectedIds.length}</strong> hóa đơn.
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-700 font-medium border border-blue-200 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                Xuất CSV đã chọn
                            </button>
                            {pendingSelectedCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction({ type: 'BATCH_PAID' })}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    Xác nhận thanh toán ({pendingSelectedCount})
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="px-2 py-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    </div>
                )}

                {/* Invoices Table */}
                <AdminTable
                    columns={columns}
                    data={paginatedInvoices}
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
                    onRowClick={(inv) => handleOpenDetail(inv)}
                    itemUnitName="hóa đơn"
                    emptyText="Không tìm thấy hóa đơn nào phù hợp với điều kiện lọc."
                />
            </div>

            {/* MODAL 1: CHI TIẾT HÓA ĐƠN & XEM TRƯỚC BẢN IN */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Hóa đơn ${detailInvoice?.invoiceCode || ''}`}
                subtitle={`Liên kết đơn hàng: ${detailInvoice?.orderCode || '—'} · Lập lúc ${formatDateTime(detailInvoice?.invoiceDate)}`}
                icon={Receipt}
                size="xl"
                tabs={detailTabs}
            >
                {(activeTab) => {
                    if (!detailInvoice) return null;

                    return (
                        <div className="space-y-4">
                            {/* Quick Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 rounded-md border border-slate-200">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {renderStatusBadge(detailInvoice.status)}
                                    <span className="text-slate-300">·</span>
                                    {renderPaymentBadge(detailInvoice.paymentMethod)}
                                    {detailInvoice.invoiceType === 'VAT_COMPANY' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200">
                                            VAT Doanh nghiệp
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handlePrintInvoice(detailInvoice)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>In hóa đơn / PDF</span>
                                    </button>
                                    {detailInvoice.status === 'PENDING' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmAction({
                                                    type: 'MARK_PAID',
                                                    invoice: detailInvoice,
                                                })
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Xác nhận TT</span>
                                        </button>
                                    )}
                                    {detailInvoice.status !== 'CANCELED' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmAction({
                                                    type: 'CANCEL',
                                                    invoice: detailInvoice,
                                                })
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            <span>Hủy hóa đơn</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* TAB 1: TỔNG QUAN & CHI TIẾT MẶT HÀNG */}
                            {activeTab === 'overview' && (
                                <div className="space-y-5">
                                    {/* Flat 2-column info grid (no card-in-card) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                                        {/* Buyer Info */}
                                        <div className="space-y-2.5">
                                            <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                                                Thông tin người mua hàng
                                            </div>
                                            <dl className="space-y-2 text-xs">
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-slate-500 shrink-0">Họ tên</dt>
                                                    <dd className="font-medium text-slate-900 text-right">{detailInvoice.customerName}</dd>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-slate-500 shrink-0">Số điện thoại</dt>
                                                    <dd className="font-mono font-medium text-slate-900 tabular-nums">{detailInvoice.customerPhone}</dd>
                                                </div>
                                                {detailInvoice.customerEmail && (
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500 shrink-0">Email</dt>
                                                        <dd className="text-slate-700 truncate text-right">{detailInvoice.customerEmail}</dd>
                                                    </div>
                                                )}
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-slate-500 shrink-0">Địa chỉ</dt>
                                                    <dd className="text-slate-700 text-right">
                                                        {detailInvoice.customerAddress || 'Mua tại showroom PCStore'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>

                                        {/* VAT / Tax Info */}
                                        <div className="space-y-2.5">
                                            <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                                                Thông tin xuất hóa đơn GTGT (VAT)
                                            </div>
                                            {detailInvoice.invoiceType === 'VAT_COMPANY' ? (
                                                <dl className="space-y-2 text-xs">
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500 shrink-0">Đơn vị</dt>
                                                        <dd className="font-medium text-slate-900 text-right">
                                                            {detailInvoice.companyName || 'Chưa cập nhật'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500 shrink-0">Mã số thuế</dt>
                                                        <dd className="font-mono font-semibold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 tabular-nums">
                                                            {detailInvoice.taxCode || 'Chưa cập nhật'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500 shrink-0">Địa chỉ công ty</dt>
                                                        <dd className="text-slate-700 text-right">
                                                            {detailInvoice.companyAddress || '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            ) : (
                                                <p className="text-xs text-slate-500 py-1">
                                                    Hóa đơn bán lẻ cá nhân. Chuyển sang tab <strong className="text-slate-700">Thông tin VAT & Ghi chú</strong> để bổ sung MST nếu khách yêu cầu xuất hóa đơn đỏ.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Line Items Table */}
                                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                                                Chi tiết hàng hóa / dịch vụ
                                            </span>
                                            {hydratingDetail && (
                                                <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    Đang nạp chi tiết từ đơn hàng...
                                                </span>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-2 w-10 text-center">#</th>
                                                        <th className="px-3 py-2">Sản phẩm</th>
                                                        <th className="px-3 py-2 text-right">SL</th>
                                                        <th className="px-3 py-2 text-right">Đơn giá</th>
                                                        <th className="px-3 py-2 text-right">Giảm giá</th>
                                                        <th className="px-3 py-2 text-right">Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {detailInvoice.items && detailInvoice.items.length > 0 ? (
                                                        detailInvoice.items.map((item, idx) => (
                                                            <tr key={item.id || idx} className="hover:bg-slate-50/70">
                                                                <td className="px-3 py-2.5 text-center text-slate-500 font-mono tabular-nums">
                                                                    {idx + 1}
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <p className="font-medium text-slate-900">{item.productName}</p>
                                                                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                                                                        Mã SP: {item.productCode}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right font-semibold text-slate-900 font-mono tabular-nums">
                                                                    {item.quantity}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right text-slate-700 font-mono tabular-nums whitespace-nowrap">
                                                                    {formatVND(item.unitPrice)}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right text-rose-600 font-mono tabular-nums whitespace-nowrap">
                                                                    {item.discountAmount > 0
                                                                        ? `-${formatVND(item.discountAmount)}`
                                                                        : '0 ₫'}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right font-semibold text-slate-900 font-mono tabular-nums whitespace-nowrap">
                                                                    {formatVND(item.subtotal)}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">1</td>
                                                            <td className="px-3 py-2.5">
                                                                <p className="font-medium text-slate-900">
                                                                    Giá trị đơn hàng {detailInvoice.orderCode}
                                                                </p>
                                                                <span className="text-[11px] text-slate-500">
                                                                    Hóa đơn tổng hợp theo mã đơn hàng
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-semibold font-mono tabular-nums">1</td>
                                                            <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">{formatVND(detailInvoice.totalAmount)}</td>
                                                            <td className="px-3 py-2.5 text-right text-rose-600 font-mono tabular-nums whitespace-nowrap">
                                                                {detailInvoice.discountAmount > 0
                                                                    ? `-${formatVND(detailInvoice.discountAmount)}`
                                                                    : '0 ₫'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900 font-mono tabular-nums whitespace-nowrap">{formatVND(detailInvoice.amount)}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Totals Footer */}
                                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                                            <div className="text-xs text-slate-600 space-y-1 max-w-md">
                                                <p>
                                                    <strong className="text-slate-900">Số tiền bằng chữ:</strong>{' '}
                                                    <span className="italic text-slate-700">
                                                        {numberToVietnameseWords(detailInvoice.amount)}
                                                    </span>
                                                </p>
                                                {detailInvoice.note && (
                                                    <p>
                                                        <strong className="text-slate-900">Ghi chú:</strong> {detailInvoice.note}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="w-full md:w-72 space-y-1.5 text-xs tabular-nums">
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Cộng tiền hàng</span>
                                                    <span className="font-mono font-medium text-slate-900">{formatVND(detailInvoice.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-rose-600">
                                                    <span>Chiết khấu / Giảm giá</span>
                                                    <span className="font-mono font-medium">-{formatVND(detailInvoice.discountAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Thuế GTGT ({detailInvoice.taxRate}%)</span>
                                                    <span className="font-mono font-medium text-slate-900">{formatVND(detailInvoice.taxAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
                                                    <span>Tổng thanh toán</span>
                                                    <span className="font-mono">{formatVND(detailInvoice.amount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: XEM TRƯỚC BẢN IN A4 */}
                            {activeTab === 'preview' && (
                                <div className="space-y-4">
                                    <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5 text-xs">
                                        {/* Header */}
                                        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-300 pb-4">
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900 uppercase">
                                                    CÔNG TY TNHH CÔNG NGHỆ PC STORE
                                                </h3>
                                                <p className="text-slate-600 mt-0.5 tabular-nums">
                                                    MST: <strong className="font-mono text-slate-900">0109876543</strong>
                                                </p>
                                                <p className="text-slate-500">128 Thái Hà, Đống Đa, TP. Hà Nội · Hotline: 1900 1903</p>
                                            </div>
                                            <div className="sm:text-right space-y-0.5 tabular-nums">
                                                <p className="text-slate-500">Mẫu số: <strong className="text-slate-900">1C26TPC</strong></p>
                                                <p>
                                                    Số HĐ:{' '}
                                                    <span className="font-mono font-semibold text-slate-900">
                                                        {detailInvoice.invoiceCode}
                                                    </span>
                                                </p>
                                                <p className="text-slate-500">Ngày lập: {formatDateTime(detailInvoice.invoiceDate)}</p>
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">
                                                {detailInvoice.invoiceType === 'VAT_COMPANY'
                                                    ? 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG'
                                                    : 'HÓA ĐƠN BÁN HÀNG'}
                                            </h2>
                                            <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                                                Bản thể hiện của hóa đơn điện tử · Mã đơn hàng: {detailInvoice.orderCode}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 rounded-md p-3.5 border border-slate-200 space-y-1.5">
                                            <p className="tabular-nums">
                                                <span className="text-slate-500">Người mua hàng:</span>{' '}
                                                <strong className="text-slate-900">{detailInvoice.customerName}</strong> ({detailInvoice.customerPhone})
                                            </p>
                                            {detailInvoice.invoiceType === 'VAT_COMPANY' && detailInvoice.companyName && (
                                                <p className="tabular-nums">
                                                    <span className="text-slate-500">Đơn vị:</span>{' '}
                                                    <strong className="text-slate-900">{detailInvoice.companyName}</strong> — MST:{' '}
                                                    <strong className="font-mono text-slate-900">{detailInvoice.taxCode}</strong>
                                                </p>
                                            )}
                                            <p>
                                                <span className="text-slate-500">Địa chỉ:</span>{' '}
                                                <span className="text-slate-900">
                                                    {detailInvoice.companyAddress || detailInvoice.customerAddress || 'Showroom PCStore'}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500">Hình thức thanh toán:</span>{' '}
                                                <strong className="text-slate-900">
                                                    {PAYMENT_METHOD_META[detailInvoice.paymentMethod]?.label ||
                                                        detailInvoice.paymentMethod}
                                                </strong>
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 p-3.5 rounded-md border border-slate-200">
                                            <div>
                                                <p className="text-[11px] text-slate-500">Số tiền bằng chữ</p>
                                                <p className="font-medium italic text-slate-800">
                                                    {numberToVietnameseWords(detailInvoice.amount)}
                                                </p>
                                            </div>
                                            <div className="sm:text-right tabular-nums">
                                                <p className="text-[11px] text-slate-500">Tổng cộng thanh toán</p>
                                                <p className="text-lg font-mono font-semibold text-slate-900">
                                                    {formatVND(detailInvoice.amount)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handlePrintInvoice(detailInvoice)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                            >
                                                <Printer className="w-4 h-4" />
                                                <span>Mở cửa sổ In A4 / Lưu PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: CHỈNH SỬA THÔNG TIN VAT & GHI CHÚ */}
                            {activeTab === 'edit' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <AdminSelect
                                            label="Loại hóa đơn"
                                            value={editForm.invoiceType}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    invoiceType: e.target.value as InvoiceType,
                                                })
                                            }
                                            options={[
                                                { label: 'Hóa đơn bán lẻ cá nhân', value: 'RETAIL' },
                                                { label: 'Hóa đơn GTGT (VAT Doanh nghiệp)', value: 'VAT_COMPANY' },
                                            ]}
                                        />
                                        <AdminSelect
                                            label="Phương thức thanh toán"
                                            value={editForm.paymentMethod}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    paymentMethod: e.target.value as InvoicePaymentMethod,
                                                })
                                            }
                                            options={[
                                                { label: 'Chuyển khoản ngân hàng', value: 'BANK_TRANSFER' },
                                                { label: 'VNPAY QR', value: 'VNPAY' },
                                                { label: 'Tiền mặt tại quầy', value: 'CASH' },
                                                { label: 'Quẹt thẻ POS', value: 'CARD' },
                                                { label: 'Thanh toán khi nhận hàng (COD)', value: 'COD' },
                                            ]}
                                        />
                                    </div>

                                    {editForm.invoiceType === 'VAT_COMPANY' && (
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                                            <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                                                Thông tin doanh nghiệp nhận hóa đơn GTGT
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <AdminInput
                                                    label="Tên công ty / Đơn vị"
                                                    required
                                                    placeholder="VD: Công ty TNHH Công nghệ ABC"
                                                    value={editForm.companyName}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, companyName: e.target.value })
                                                    }
                                                />
                                                <AdminInput
                                                    label="Mã số thuế (MST)"
                                                    required
                                                    placeholder="VD: 0109482716"
                                                    value={editForm.taxCode}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, taxCode: e.target.value })
                                                    }
                                                    className="font-mono tabular-nums"
                                                />
                                            </div>
                                            <AdminInput
                                                label="Địa chỉ đăng ký kinh doanh"
                                                placeholder="Nhập địa chỉ ghi trên hóa đơn đỏ..."
                                                value={editForm.companyAddress}
                                                onChange={(e) =>
                                                    setEditForm({ ...editForm, companyAddress: e.target.value })
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <AdminInput
                                            label="Email nhận hóa đơn điện tử"
                                            type="email"
                                            placeholder="ketoan@congty.vn"
                                            value={editForm.customerEmail}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, customerEmail: e.target.value })
                                            }
                                        />
                                        <AdminInput
                                            label="Địa chỉ khách hàng"
                                            value={editForm.customerAddress}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, customerAddress: e.target.value })
                                            }
                                        />
                                    </div>

                                    <AdminTextarea
                                        label="Ghi chú kế toán / hóa đơn"
                                        rows={3}
                                        placeholder="Ghi chú nội bộ hoặc thông tin phát hành hóa đơn điện tử..."
                                        value={editForm.note}
                                        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                    />

                                    <div className="flex justify-end pt-3 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={handleSaveInvoiceEdit}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>Lưu thay đổi hóa đơn</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* MODAL 2: PHÁT HÀNH HÓA ĐƠN MỚI */}
            <AdminModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Phát hành hóa đơn mới"
                subtitle="Lập hóa đơn bán lẻ hoặc hóa đơn GTGT (VAT) từ đơn hàng có sẵn hoặc nhập trực tiếp"
                icon={Plus}
                size="lg"
                onSubmit={handleCreateInvoice}
                submitText="Phát hành hóa đơn"
                submitIcon={FileCheck}
            >
                {() => (
                    <div className="space-y-4">
                        {/* Quick Pick from existing BE orders */}
                        {recentOrders.length > 0 && (
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                                <div className="text-xs font-semibold text-slate-900">
                                    Chọn nhanh từ đơn hàng hệ thống (tự động điền thông tin)
                                </div>
                                <AdminSelect
                                    value={selectedOrderCode}
                                    onChange={(e) => handleSelectOrderForInvoice(e.target.value)}
                                    options={[
                                        { label: '-- Nhập thủ công / Không liên kết đơn --', value: '' },
                                        ...recentOrders.map((o) => ({
                                            label: `${o.code} · ${o.recipientName || o.customerName || 'Khách lẻ'} (${formatVND(o.finalAmount)})`,
                                            value: o.code,
                                        })),
                                    ]}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <AdminSelect
                                label="Loại hóa đơn"
                                required
                                value={createForm.invoiceType}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        invoiceType: e.target.value as InvoiceType,
                                    })
                                }
                                options={[
                                    { label: 'Hóa đơn bán lẻ', value: 'RETAIL' },
                                    { label: 'Hóa đơn GTGT (VAT Doanh nghiệp)', value: 'VAT_COMPANY' },
                                ]}
                            />
                            <AdminInput
                                label="Mã đơn hàng liên kết"
                                placeholder="VD: ORD-20261119-001 (tự tạo nếu để trống)"
                                value={createForm.orderCode}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, orderCode: e.target.value })
                                }
                                className="font-mono tabular-nums"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <AdminInput
                                label="Họ tên khách hàng"
                                required
                                placeholder="Nguyễn Văn A"
                                value={createForm.customerName}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, customerName: e.target.value })
                                }
                            />
                            <AdminInput
                                label="Số điện thoại"
                                required
                                placeholder="0987654321"
                                value={createForm.customerPhone}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, customerPhone: e.target.value })
                                }
                                className="font-mono tabular-nums"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <AdminInput
                                label="Email nhận hóa đơn"
                                type="email"
                                placeholder="khachhang@email.com"
                                value={createForm.customerEmail}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, customerEmail: e.target.value })
                                }
                            />
                            <AdminInput
                                label="Địa chỉ"
                                placeholder="Số nhà, quận/huyện, tỉnh/thành phố"
                                value={createForm.customerAddress}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, customerAddress: e.target.value })
                                }
                            />
                        </div>

                        {createForm.invoiceType === 'VAT_COMPANY' && (
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                                    Thông tin xuất hóa đơn đỏ (GTGT)
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <AdminInput
                                        label="Tên doanh nghiệp"
                                        required
                                        placeholder="Công ty Cổ phần..."
                                        value={createForm.companyName}
                                        onChange={(e) =>
                                            setCreateForm({ ...createForm, companyName: e.target.value })
                                        }
                                    />
                                    <AdminInput
                                        label="Mã số thuế"
                                        required
                                        placeholder="010xxxxxxx"
                                        value={createForm.taxCode}
                                        onChange={(e) =>
                                            setCreateForm({ ...createForm, taxCode: e.target.value })
                                        }
                                        className="font-mono tabular-nums"
                                    />
                                </div>
                                <AdminInput
                                    label="Địa chỉ doanh nghiệp"
                                    placeholder="Địa chỉ trên giấy phép ĐKKD"
                                    value={createForm.companyAddress}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, companyAddress: e.target.value })
                                    }
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <AdminInput
                                label="Tổng tiền hàng (VND)"
                                type="number"
                                required
                                min={0}
                                value={createForm.totalAmount}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, totalAmount: e.target.value })
                                }
                                className="font-mono tabular-nums"
                            />
                            <AdminInput
                                label="Chiết khấu / Giảm giá (VND)"
                                type="number"
                                min={0}
                                value={createForm.discountAmount}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, discountAmount: e.target.value })
                                }
                                className="font-mono tabular-nums"
                            />
                            <AdminSelect
                                label="Thuế suất GTGT (%)"
                                value={createForm.taxRate}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, taxRate: e.target.value })
                                }
                                options={[
                                    { label: '8% (Ưu đãi GTGT)', value: '8' },
                                    { label: '10% (Tiêu chuẩn)', value: '10' },
                                    { label: '0% (Không chịu thuế)', value: '0' },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <AdminSelect
                                label="Phương thức thanh toán"
                                value={createForm.paymentMethod}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        paymentMethod: e.target.value as InvoicePaymentMethod,
                                    })
                                }
                                options={[
                                    { label: 'Chuyển khoản ngân hàng', value: 'BANK_TRANSFER' },
                                    { label: 'VNPAY QR', value: 'VNPAY' },
                                    { label: 'Tiền mặt tại quầy', value: 'CASH' },
                                    { label: 'Quẹt thẻ POS', value: 'CARD' },
                                    { label: 'Thanh toán khi nhận hàng (COD)', value: 'COD' },
                                ]}
                            />
                            <AdminSelect
                                label="Trạng thái thanh toán"
                                value={createForm.status}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        status: e.target.value as InvoiceStatus,
                                    })
                                }
                                options={[
                                    { label: 'Đã thanh toán (PAID)', value: 'PAID' },
                                    { label: 'Chờ thanh toán (PENDING)', value: 'PENDING' },
                                ]}
                            />
                        </div>

                        {/* Live summary bar */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                            <div className="space-y-0.5 text-slate-600">
                                <div>
                                    Thuế GTGT ({createForm.taxRate}%):{' '}
                                    <strong className="font-mono text-slate-900">{formatVND(createPreviewCalc.taxAmount)}</strong>
                                </div>
                                <div className="text-[11px] italic text-slate-500">
                                    {numberToVietnameseWords(createPreviewCalc.finalAmount)}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[11px] text-slate-500 block">Tổng thanh toán</span>
                                <span className="text-base font-mono font-semibold text-slate-900">
                                    {formatVND(createPreviewCalc.finalAmount)}
                                </span>
                            </div>
                        </div>

                        <AdminTextarea
                            label="Ghi chú"
                            rows={2}
                            placeholder="Nhập ghi chú nếu có..."
                            value={createForm.note}
                            onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                        />
                    </div>
                )}
            </AdminModal>

            {/* MODAL 3: XÁC NHẬN THAY ĐỔI TRẠNG THÁI */}
            <AdminConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleConfirmStatusAction}
                title={
                    confirmAction?.type === 'CANCEL'
                        ? 'Xác nhận hủy hóa đơn'
                        : confirmAction?.type === 'BATCH_PAID'
                        ? 'Xác nhận thanh toán hàng loạt'
                        : 'Xác nhận đã thanh toán'
                }
                message={
                    confirmAction?.type === 'CANCEL' ? (
                        <span>
                            Bạn có chắc chắn muốn hủy hóa đơn{' '}
                            <strong>{confirmAction.invoice?.invoiceCode}</strong>? Hóa đơn sau khi hủy sẽ không được tính vào doanh thu.
                        </span>
                    ) : confirmAction?.type === 'BATCH_PAID' ? (
                        <span>
                            Xác nhận đã thu đủ tiền và phát hành hóa đơn điện tử cho{' '}
                            <strong>{pendingSelectedCount}</strong> hóa đơn đang chờ thanh toán?
                        </span>
                    ) : (
                        <span>
                            Xác nhận khách hàng đã thanh toán đủ{' '}
                            <strong>{formatVND(confirmAction?.invoice?.amount || 0)}</strong> cho hóa đơn{' '}
                            <strong>{confirmAction?.invoice?.invoiceCode}</strong>?
                        </span>
                    )
                }
                variant={confirmAction?.type === 'CANCEL' ? 'danger' : 'success'}
                confirmText={
                    confirmAction?.type === 'CANCEL' ? 'Hủy hóa đơn' : 'Xác nhận thanh toán'
                }
                cancelText="Đóng"
                icon={confirmAction?.type === 'CANCEL' ? AlertTriangle : CheckCircle2}
            />
        </div>
    );
}
