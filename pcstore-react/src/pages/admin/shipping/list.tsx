import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PackageCheck,
    Truck,
    Package,
    Barcode,
    Search,
    RefreshCw,
    Printer,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowRight,
    Copy,
    Tag,
    User,
    Phone,
    MapPin,
    Calendar,
    Sparkles,
    Eye,
    QrCode,
    FileText,
    ShieldCheck,
    ChevronRight,
    ExternalLink,
    Send,
    DollarSign,
    Box,
    Check,
    CheckSquare,
    Square,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, AdminActionDropdown, type Column } from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminModalHeader,
    AdminLabel,
    AdminInput,
    AdminSelect,
    AdminTextarea,
    AdminButton,
} from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { orderFulfillmentService } from '../../../services/orderFulfillmentService';
import type {
    OrderFulfillmentRecord,
    OrderFulfillmentStatus,
} from '../../../types/orderFulfillment';
import {
    FULFILLMENT_STATUS_MAP,
    POPULAR_LOGISTICS_CARRIERS,
} from '../../../types/orderFulfillment';

// Format tiền VND
function formatVND(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Format ngày giờ
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

export default function DeliveryList() {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Data State
    const [fulfillments, setFulfillments] = useState<OrderFulfillmentRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [carrierFilter, setCarrierFilter] = useState('ALL');

    // Stepper workflow toggle
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

    // Modal Nghiệm thu & Xác nhận nhận hàng thành công (Giai đoạn 4 Bước 3)
    const [isDeliveryConfirmModalOpen, setIsDeliveryConfirmModalOpen] = useState(false);
    const [targetRecord, setTargetRecord] = useState<OrderFulfillmentRecord | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerNotes, setCustomerNotes] = useState('Khách hàng đã nhận kiện hàng, kiểm tra ngoại quan nguyên vẹn seal niêm phong, linh kiện hoạt động tốt.');
    const [inspectionPassed, setInspectionPassed] = useState(true);
    const [staffName, setStaffName] = useState('Bộ phận Chăm sóc khách hàng & Điều phối');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal Tra cứu Lộ trình ĐVVC ngoài
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingRecord, setTrackingRecord] = useState<OrderFulfillmentRecord | null>(null);

    // Modal In Biên bản nghiệm thu giao hàng thành công
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printRecord, setPrintRecord] = useState<OrderFulfillmentRecord | null>(null);

    /**
     * Tải dữ liệu ban đầu
     */
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const records = orderFulfillmentService.getFulfillments();
            setFulfillments(records);
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải danh sách đơn giao hàng');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Lọc danh sách đơn thuộc Giai đoạn 4: Vận chuyển và hoàn tất giao nhận
    const deliveryRecords = useMemo(() => {
        return fulfillments.filter((r) => {
            // Bộ lọc search
            const q = searchQuery.toLowerCase().trim();
            const matchSearch =
                !q ||
                r.orderCode.toLowerCase().includes(q) ||
                r.customerName.toLowerCase().includes(q) ||
                r.customerPhone.includes(q) ||
                r.carrierInfo?.trackingNumber.toLowerCase().includes(q);

            if (!matchSearch) return false;

            // Bộ lọc carrier
            if (carrierFilter !== 'ALL' && r.carrierInfo?.carrierName !== carrierFilter) {
                return false;
            }

            // Bộ lọc status
            if (statusFilter === 'ALL') {
                return (
                    r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER' ||
                    r.fulfillmentStatus === 'SHIPPING_IN_TRANSIT' ||
                    r.fulfillmentStatus === 'OUT_FOR_DELIVERY' ||
                    r.fulfillmentStatus === 'DELIVERED_SUCCESS' ||
                    r.fulfillmentStatus === 'COMPLETED'
                );
            }
            return r.fulfillmentStatus === statusFilter;
        });
    }, [fulfillments, searchQuery, statusFilter, carrierFilter]);

    // Thống kê nhanh
    const stats = useMemo(() => {
        let inTransit = 0;
        let outForDelivery = 0;
        let delivered = 0;
        let completed = 0;

        fulfillments.forEach((r) => {
            if (r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER' || r.fulfillmentStatus === 'SHIPPING_IN_TRANSIT') inTransit++;
            if (r.fulfillmentStatus === 'OUT_FOR_DELIVERY') outForDelivery++;
            if (r.fulfillmentStatus === 'DELIVERED_SUCCESS') delivered++;
            if (r.fulfillmentStatus === 'COMPLETED') completed++;
        });

        return { inTransit, outForDelivery, delivered, completed };
    }, [fulfillments]);

    /**
     * Mở modal xác nhận khách hàng nhận hàng thành công
     */
    const handleOpenConfirmDelivery = (record: OrderFulfillmentRecord) => {
        setTargetRecord(record);
        setCustomerName(record.customerName || record.recipientName);
        setCustomerNotes(
            'Khách hàng đã nhận kiện hàng, kiểm tra ngoại quan nguyên vẹn seal niêm phong, linh kiện hoạt động tốt.'
        );
        setInspectionPassed(true);
        setStaffName('Bộ phận Chăm sóc khách hàng & Điều phối');
        setIsDeliveryConfirmModalOpen(true);
    };

    /**
     * Thực hiện xác nhận nhận hàng thành công (Giai đoạn 4 Bước 3)
     */
    const handleConfirmDeliverySuccess = async () => {
        if (!targetRecord) return;

        setIsSubmitting(true);
        try {
            const updated = await orderFulfillmentService.confirmCustomerDelivery(targetRecord.orderId, {
                customerName,
                customerNotes,
                inspectionPassed,
                staffName,
            });

            toast.success(
                `Khách hàng đã nhận hàng thành công đơn ${targetRecord.orderCode}! Quy trình bán hàng hoàn tất.`
            );
            setIsDeliveryConfirmModalOpen(false);
            loadData();

            // Mở modal in biên bản giao nhận hoàn tất
            setPrintRecord(updated);
            setIsPrintModalOpen(true);
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi xác nhận nhận hàng');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Restrained 6px status dot indicator (no colorful rounded-full pills)
    const renderDeliveryStatusIndicator = (st: OrderFulfillmentStatus) => {
        const conf = FULFILLMENT_STATUS_MAP[st];
        let dotClass = 'bg-slate-400';
        if (st === 'HANDED_OVER_TO_CARRIER' || st === 'SHIPPING_IN_TRANSIT') {
            dotClass = 'bg-blue-600';
        } else if (st === 'OUT_FOR_DELIVERY') {
            dotClass = 'bg-amber-500';
        } else if (st === 'DELIVERED_SUCCESS' || st === 'COMPLETED') {
            dotClass = 'bg-emerald-600';
        }

        return (
            <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap"
                title={conf.description}
            >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                <span>{conf.label}</span>
            </span>
        );
    };

    // Columns cho AdminTable
    const columns: Column<OrderFulfillmentRecord>[] = [
        {
            key: 'orderCode',
            header: 'Mã đơn & Vận đơn',
            render: (rec) => (
                <div className="space-y-1 min-w-[155px]">
                    <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {rec.orderCode}
                    </div>
                    {rec.carrierInfo?.trackingNumber ? (
                        <div className="inline-flex items-center font-mono text-[11px] font-medium text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 tabular-nums whitespace-nowrap">
                            {rec.carrierInfo.trackingNumber}
                        </div>
                    ) : (
                        <span className="text-[11px] text-slate-400">Chưa có mã vận đơn</span>
                    )}
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Người nhận & Địa chỉ',
            render: (rec) => (
                <div className="space-y-0.5 max-w-[250px]">
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-slate-900 truncate">{rec.recipientName}</span>
                        <span className="font-mono text-slate-500 tabular-nums shrink-0">{rec.recipientPhone}</span>
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2" title={rec.address}>
                        {rec.address}
                    </div>
                </div>
            ),
        },
        {
            key: 'carrier',
            header: 'Đơn vị vận chuyển',
            render: (rec) => (
                <div className="space-y-0.5 max-w-[200px]">
                    <div className="text-xs font-medium text-slate-900 truncate">
                        {rec.carrierInfo?.carrierName || 'ĐVVC đối tác'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate tabular-nums">
                        {rec.carrierInfo?.driverName || 'Đang điều phối'}
                        {rec.carrierInfo?.driverPhone ? ` · ${rec.carrierInfo.driverPhone}` : ''}
                    </div>
                </div>
            ),
        },
        {
            key: 'amount',
            header: 'Giá trị / COD',
            align: 'right',
            render: (rec) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div className="font-mono text-xs font-semibold text-slate-900">
                        {formatVND(rec.finalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                        {rec.assignedSerials.length} serial
                    </div>
                </div>
            ),
        },
        {
            key: 'updatedAt',
            header: 'Thời gian',
            align: 'right',
            render: (rec) => (
                <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDateTime(rec.customerReceivedAt || rec.carrierInfo?.handoverAt || rec.packedAt)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (rec) => renderDeliveryStatusIndicator(rec.fulfillmentStatus),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (rec) => {
                const isCompleted = rec.fulfillmentStatus === 'COMPLETED';
                return (
                    <AdminActionDropdown
                        maxInline={3}
                        actions={[
                            {
                                key: 'confirm-delivery',
                                label: 'Xác nhận nhận hàng',
                                icon: CheckCircle2,
                                variant: 'success',
                                highlight: true,
                                hidden: isCompleted,
                                onClick: () => handleOpenConfirmDelivery(rec),
                            },
                            {
                                key: 'view-tracking',
                                label: 'Xem lộ trình vận chuyển',
                                icon: ExternalLink,
                                variant: 'primary',
                                onClick: () => {
                                    setTrackingRecord(rec);
                                    setIsTrackingModalOpen(true);
                                },
                            },
                        ]}
                        moreActions={
                            isCompleted
                                ? [
                                      {
                                          key: 'print-delivery',
                                          label: 'In biên bản giao nhận',
                                          description: 'Xuất bản in biên bản hoàn tất giao hàng',
                                          icon: Printer,
                                          variant: 'primary',
                                          onClick: () => {
                                              setPrintRecord(rec);
                                              setIsPrintModalOpen(true);
                                          },
                                      },
                                  ]
                                : []
                        }
                    />
                );
            },
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            id: 'carrier',
            label: 'Đơn vị vận chuyển',
            type: 'select',
            options: [
                { label: 'Tất cả ĐVVC', value: 'ALL' },
                ...POPULAR_LOGISTICS_CARRIERS.map((c) => ({
                    label: c.name,
                    value: c.name,
                })),
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái giao nhận',
            type: 'select',
            options: [
                { label: 'Tất cả trạng thái', value: 'ALL' },
                { label: 'Đang vận chuyển (SHIPPING_IN_TRANSIT)', value: 'SHIPPING_IN_TRANSIT' },
                { label: 'Đang phát hàng (OUT_FOR_DELIVERY)', value: 'OUT_FOR_DELIVERY' },
                { label: 'Đã nhận hàng thành công (DELIVERED_SUCCESS)', value: 'DELIVERED_SUCCESS' },
                { label: 'Hoàn tất quy trình bán hàng (COMPLETED)', value: 'COMPLETED' },
            ],
        },
    ];

    return (
        <div className="space-y-5">
            {/* ======================================================== */}
            {/* HEADER                                                   */}
            {/* ======================================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý đơn giao hàng
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.inTransit} đang vận chuyển · {stats.outForDelivery} đang phát · {stats.completed} hoàn tất
                    </p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/sales/orders')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <span>Danh sách đơn bán hàng</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* FILTER & TABLE                                           */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => setSearchQuery(q)}
                    onSearch={(q) => setSearchQuery(q)}
                    searchPlaceholder="Tìm kiếm theo mã đơn, mã vận đơn, khách hàng, số điện thoại..."
                    fields={filterFields}
                    values={{ status: statusFilter, carrier: carrierFilter }}
                    onFilterChange={(vals) => {
                        setStatusFilter(vals.status || 'ALL');
                        setCarrierFilter(vals.carrier || 'ALL');
                    }}
                    onReset={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                        setCarrierFilter('ALL');
                    }}
                />

                <AdminTable
                    columns={columns}
                    data={deliveryRecords}
                    loading={isLoading}
                    rowKey="orderId"
                    emptyText="Không có đơn giao hàng nào vào lúc này"
                />
            </div>

            {/* ======================================================== */}
            {/* MODAL XÁC NHẬN KHÁCH HÀNG NHẬN HÀNG THÀNH CÔNG (GĐ 4 B3) */}
            {/* ======================================================== */}
            {isDeliveryConfirmModalOpen && targetRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full max-h-[90vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Xác nhận nhận hàng: ${targetRecord.orderCode}`}
                            subtitle="Nghiệm thu ngoại quan & Đóng quy trình bán hàng"
                            icon={CheckCircle2}
                            onClose={() => setIsDeliveryConfirmModalOpen(false)}
                        />

                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            {/* Flat 2-column order & carrier summary */}
                            <dl className="bg-slate-50 p-3.5 rounded-md border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <dt className="text-slate-500">Người nhận</dt>
                                    <dd className="font-medium text-slate-900 mt-0.5">{targetRecord.recipientName}</dd>
                                    <dd className="font-mono text-slate-600 tabular-nums">{targetRecord.recipientPhone}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">Đơn vị vận chuyển &amp; Vận đơn</dt>
                                    <dd className="font-medium text-slate-900 mt-0.5">{targetRecord.carrierInfo?.carrierName}</dd>
                                    <dd className="font-mono text-slate-600 tabular-nums">{targetRecord.carrierInfo?.trackingNumber}</dd>
                                </div>
                                <div className="sm:col-span-2 border-t border-slate-200 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="text-slate-600 truncate" title={targetRecord.address}>
                                        <span className="text-slate-500">Địa chỉ:</span> {targetRecord.address}
                                    </div>
                                    <div className="font-mono font-semibold text-slate-900 text-sm tabular-nums shrink-0">
                                        {formatVND(targetRecord.finalAmount)}
                                    </div>
                                </div>
                            </dl>

                            {/* Kiểm tra ngoại quan kiện hàng */}
                            <div className="bg-emerald-50/70 p-3.5 rounded-md border border-emerald-200">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inspectionPassed}
                                        onChange={(e) => setInspectionPassed(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                                    />
                                    <div>
                                        <span className="font-semibold text-emerald-950 block">
                                            Khách hàng đã kiểm tra ngoại quan kiện hàng nguyên vẹn
                                        </span>
                                        <span className="text-[11px] text-emerald-800 tabular-nums">
                                            Tem niêm phong PCStore còn nguyên seal, thùng carton không cấn móp, đầy đủ {targetRecord.assignedSerials.length} mã serial chỉ định.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            {/* Người nhận thực tế */}
                            <div>
                                <AdminLabel>Họ tên người nhận thực tế</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="font-medium"
                                />
                            </div>

                            {/* Ghi chú phản hồi của khách hàng */}
                            <div>
                                <AdminLabel>Ý kiến / Ghi chú phản hồi của khách hàng</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                />
                            </div>

                            {/* Cảnh báo cập nhật serial */}
                            <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900">
                                <strong>Hiệu lực hệ thống:</strong> Khi bấm xác nhận, đơn hàng sẽ chuyển sang{' '}
                                <strong>Hoàn tất giao dịch (COMPLETED)</strong> và toàn bộ các mã serial gán vào đơn sẽ chuyển trạng thái{' '}
                                <strong>ĐÃ BÁN (SOLD)</strong>.
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsDeliveryConfirmModalOpen(false)}
                            >
                                Hủy
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleConfirmDeliverySuccess}
                                isLoading={isSubmitting}
                                icon={CheckCircle2}
                                className="!bg-emerald-600 hover:!bg-emerald-700"
                            >
                                Xác nhận nhận hàng thành công
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL XEM CHI TIẾT LỘ TRÌNH ĐVVC NGOÀI                   */}
            {/* ======================================================== */}
            {isTrackingModalOpen && trackingRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Lộ trình vận chuyển: ${trackingRecord.carrierInfo?.carrierName}`}
                            subtitle={`Mã vận đơn: ${trackingRecord.carrierInfo?.trackingNumber} · Đơn: ${trackingRecord.orderCode}`}
                            icon={Truck}
                            onClose={() => setIsTrackingModalOpen(false)}
                        />

                        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                            {/* Flat 2-column carrier & recipient summary */}
                            <dl className="bg-slate-50 p-3.5 rounded-md border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <dt className="text-[11px] text-slate-500 uppercase font-medium">Người nhận &amp; Địa chỉ</dt>
                                    <dd className="font-semibold text-slate-900 mt-0.5">
                                        {trackingRecord.recipientName}{' '}
                                        <span className="font-mono font-normal text-slate-600 tabular-nums">
                                            ({trackingRecord.recipientPhone})
                                        </span>
                                    </dd>
                                    <dd className="text-slate-600 mt-0.5">{trackingRecord.address}</dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-slate-500 uppercase font-medium">Vận chuyển &amp; COD</dt>
                                    <dd className="font-semibold text-slate-900 mt-0.5">
                                        {trackingRecord.carrierInfo?.carrierName || 'ĐVVC đối tác'}
                                    </dd>
                                    <dd className="font-mono text-slate-600 tabular-nums mt-0.5">
                                        Vận đơn: {trackingRecord.carrierInfo?.trackingNumber || '—'} · COD:{' '}
                                        <strong className="text-slate-900">{formatVND(trackingRecord.finalAmount)}</strong>
                                    </dd>
                                </div>
                            </dl>

                            {/* Flat tracking log list (divide-y) */}
                            <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                <div className="px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-900 uppercase tracking-wider">
                                    Nhật ký hành trình ({trackingRecord.carrierTimeline.length})
                                </div>
                                {trackingRecord.carrierTimeline.map((evt, idx) => (
                                    <div key={evt.id || idx} className="px-4 py-3 space-y-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                        idx === 0 ? 'bg-blue-600' : 'bg-slate-300'
                                                    }`}
                                                />
                                                <span className="font-semibold text-slate-900">{evt.statusTitle}</span>
                                            </div>
                                            <span className="text-[11px] text-slate-500 font-mono tabular-nums shrink-0">
                                                {formatDateTime(evt.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 pl-3.5">{evt.description}</p>
                                        {evt.location && (
                                            <div className="text-[11px] text-slate-700 flex items-center gap-1 font-medium pl-3.5">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span>{evt.location}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsTrackingModalOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL IN BIÊN BẢN GIAO NHẬN HOÀN TẤT                     */}
            {/* ======================================================== */}
            {isPrintModalOpen && printRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Biên bản giao nhận hoàn tất: ${printRecord.orderCode}`}
                            icon={Printer}
                            onClose={() => setIsPrintModalOpen(false)}
                        />

                        {/* Mẫu in biên bản giao nhận */}
                        <div className="p-6 bg-white space-y-5 text-slate-900 border border-dashed border-slate-300 m-4 rounded-md overflow-y-auto flex-1">
                            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                                <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">
                                    BIÊN BẢN GIAO NHẬN HÀNG HÓA &amp; NGHIỆM THU HOÀN TẤT
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Chứng nhận khách hàng đã nhận đủ sản phẩm và xác nhận ngoại quan nguyên vẹn
                                </p>
                                <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-slate-700 mt-2 tabular-nums">
                                    <span>Mã đơn: <strong className="text-slate-900">{printRecord.orderCode}</strong></span>
                                    <span className="text-slate-300">|</span>
                                    <span>Vận đơn: <strong className="text-slate-900">{printRecord.carrierInfo?.trackingNumber}</strong></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-md border border-slate-200">
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-medium text-slate-500 uppercase">Đơn vị vận chuyển</div>
                                    <div className="font-semibold text-slate-900">{printRecord.carrierInfo?.carrierName}</div>
                                    <div className="text-slate-600">Tài xế giao: {printRecord.carrierInfo?.driverName}</div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-medium text-slate-500 uppercase">Khách hàng nhận hàng</div>
                                    <div className="font-semibold text-slate-900">{printRecord.recipientName}</div>
                                    <div className="text-slate-600 tabular-nums">
                                        Thời gian nhận: {formatDateTime(printRecord.customerReceivedAt)}
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách serial */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-900">Danh sách cá thể sản phẩm đã bàn giao (Serial)</div>
                                <div className="border border-slate-200 rounded-md overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium w-10">#</th>
                                                <th className="px-3 py-2 text-left font-medium">Tên sản phẩm</th>
                                                <th className="px-3 py-2 text-left font-medium">Mã Serial</th>
                                                <th className="px-3 py-2 text-right font-medium">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {printRecord.assignedSerials.map((s, idx) => (
                                                <tr key={s.serialNumber}>
                                                    <td className="px-3 py-2 text-slate-500 tabular-nums">{idx + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-slate-900">{s.productName}</td>
                                                    <td className="px-3 py-2 font-mono font-medium text-slate-700 tabular-nums">{s.serialNumber}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-emerald-700">ĐÃ BÁN (SOLD)</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Nhận xét của khách */}
                            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">
                                <strong className="text-slate-900">Xác nhận từ khách hàng:</strong> &ldquo;{printRecord.customerNotes || 'Đã nhận đúng hàng, ngoại quan nguyên vẹn.'}&rdquo;
                            </div>

                            {/* Chữ ký 2 bên */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs text-center">
                                <div className="space-y-10">
                                    <p className="font-medium text-slate-600">Người giao hàng (ĐVVC)</p>
                                    <p className="font-semibold text-slate-900">{printRecord.carrierInfo?.driverName}</p>
                                </div>
                                <div className="space-y-10">
                                    <p className="font-medium text-slate-600">Khách hàng nhận hàng</p>
                                    <p className="font-semibold text-slate-900">{printRecord.recipientName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsPrintModalOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={() => window.print()}
                                icon={Printer}
                            >
                                In biên bản giao nhận
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
