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
import { AdminTable, type Column } from '../../../components/admin/common/table';
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

    // Columns cho AdminTable
    const columns: Column<OrderFulfillmentRecord>[] = [
        {
            key: 'orderCode',
            header: 'Mã đơn & Vận đơn ĐVVC ngoài',
            render: (rec) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 font-mono">
                        <PackageCheck className="w-4 h-4 text-emerald-600" />
                        <span>{rec.orderCode}</span>
                    </div>
                    {rec.carrierInfo?.trackingNumber ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 w-fit">
                            <Tag className="w-3 h-3" />
                            <span>{rec.carrierInfo.trackingNumber}</span>
                        </div>
                    ) : (
                        <span className="text-[11px] text-gray-400 italic">Chưa có mã vận đơn</span>
                    )}
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng & Địa chỉ',
            render: (rec) => (
                <div className="space-y-1 max-w-xs">
                    <div className="font-semibold text-gray-800 flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{rec.recipientName}</span>
                        <span className="text-gray-400">({rec.recipientPhone})</span>
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-1 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <span>{rec.address}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'carrier',
            header: 'Đối tác ĐVVC ngoài hệ thống',
            render: (rec) => (
                <div className="space-y-1">
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{rec.carrierInfo?.carrierName || 'ĐVVC đối tác'}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                        Shipper: {rec.carrierInfo?.driverName || 'Đang điều phối'} • {rec.carrierInfo?.driverPhone || ''}
                    </div>
                </div>
            ),
        },
        {
            key: 'serials',
            header: 'Mã Serial gán',
            render: (rec) => (
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-emerald-700">
                        {rec.assignedSerials.length} serial
                    </span>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                        {rec.assignedSerials.map((s) => (
                            <span
                                key={s.serialNumber}
                                className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                                    s.status === 'SOLD'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                        : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                                title={`Trạng thái: ${s.status === 'SOLD' ? 'ĐÃ BÁN (SOLD)' : s.status}`}
                            >
                                {s.serialNumber}
                            </span>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Tiến trình giao hàng',
            render: (rec) => {
                const conf = FULFILLMENT_STATUS_MAP[rec.fulfillmentStatus];
                return (
                    <div className="space-y-1">
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${conf.badgeClass}`}
                        >
                            <Box className="w-3 h-3" />
                            <span>{conf.label}</span>
                        </span>
                        <div className="text-[11px] text-gray-500">
                            {rec.customerReceivedAt ? `Nhận lúc: ${formatDateTime(rec.customerReceivedAt)}` : conf.description.slice(0, 40) + '...'}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác hoàn tất',
            render: (rec) => (
                <div className="flex items-center gap-1.5">
                    {rec.fulfillmentStatus !== 'COMPLETED' ? (
                        <button
                            type="button"
                            onClick={() => handleOpenConfirmDelivery(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-xs cursor-pointer"
                            title="Xác nhận khách hàng đã nhận hàng thành công và đóng quy trình"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Xác nhận nhận hàng</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setPrintRecord(rec);
                                setIsPrintModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Biên bản</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setTrackingRecord(rec);
                            setIsTrackingModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 p-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Xem lộ trình vận chuyển"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                </div>
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
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
        <div className="space-y-6">
            {/* ======================================================== */}
            {/* HEADER                                                   */}
            {/* ======================================================== */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
                            <PackageCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý đơn giao hàng (Deliveries & Logistics)
                            </h1>
                            <p className="text-sm text-gray-500">
                                Giai đoạn 4: Vận chuyển kiện hàng qua ĐVVC ngoài hệ thống, bàn giao tới khách hàng và xác nhận hoàn tất quy trình bán hàng
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                            showWorkflowGuide
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Sơ đồ nghiệp vụ 4 giai đoạn</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/sales/orders')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
                    >
                        <span>Danh sách đơn bán hàng</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* WORKFLOW GUIDE BANNER (GIAI ĐOẠN 4)                      */}
            {/* ======================================================== */}
            {showWorkflowGuide && (
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <h2 className="text-base font-bold text-white tracking-wide">
                                GIAI ĐOẠN 4: VẬN CHUYỂN VÀ HOÀN TẤT GIAO NHẬN (ĐVVC NGOÀI & KHÁCH HÀNG)
                            </h2>
                        </div>
                        <span className="text-xs text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full font-mono border border-emerald-400/30">
                            Bước kết thúc quy trình bán hàng
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                            <span className="font-mono font-bold text-blue-300 bg-blue-400/20 px-2 py-0.5 rounded text-[11px]">
                                BƯỚC 1 (ĐVVC NGOÀI)
                            </span>
                            <h3 className="font-bold text-white text-sm">Tiếp nhận đơn hàng</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Đơn vị vận chuyển ngoài hệ thống nhận kiện hàng cùng chứng từ giao hàng từ nhân viên kho để tiến hành lộ trình phát hàng.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                            <span className="font-mono font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded text-[11px]">
                                BƯỚC 2 (ĐVVC NGOÀI)
                            </span>
                            <h3 className="font-bold text-white text-sm">Bàn giao đơn hàng cho khách hàng</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Nhân viên giao hàng vận chuyển kiện hàng đến địa chỉ đăng ký và tiến hành bàn giao thực tế cho khách hàng.
                            </p>
                        </div>

                        <div className="bg-emerald-500/20 border-2 border-emerald-400 rounded-xl p-3.5 space-y-1.5 relative">
                            <span className="font-mono font-bold text-emerald-300 bg-emerald-400/30 px-2 py-0.5 rounded text-[11px]">
                                BƯỚC 3 (KHÁCH HÀNG)
                            </span>
                            <h3 className="font-bold text-white text-sm">Tiếp nhận & Xác nhận hoàn tất</h3>
                            <p className="text-emerald-100 leading-relaxed font-medium">
                                Khách hàng nhận hàng, kiểm tra ngoại quan kiện hàng nguyên vẹn, xác nhận nhận hàng thành công và kết thúc quy trình bán hàng. Serial chuyển sang ĐÃ BÁN (SOLD).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* STAT CARDS                                               */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang vận chuyển ngoài</p>
                        <p className="text-2xl font-bold text-indigo-600">{stats.inTransit}</p>
                        <p className="text-[11px] text-gray-400">Đang trung chuyển qua bưu cục</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Truck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang phát hàng</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.outForDelivery}</p>
                        <p className="text-[11px] text-gray-400">Shipper đang trên đường giao</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Khách đã nhận</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
                        <p className="text-[11px] text-gray-400">Kiểm tra ngoại quan đạt chuẩn</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Hoàn tất quy trình bán hàng</p>
                        <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
                        <p className="text-[11px] text-gray-400">Tất cả serial đã chuyển sang SOLD</p>
                    </div>
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                        <PackageCheck className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* FILTER & TABLE                                           */}
            {/* ======================================================== */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => setSearchQuery(q)}
                    onSearch={(q) => setSearchQuery(q)}
                    searchPlaceholder="Tìm kiếm theo mã đơn, mã vận đơn, khách hàng, số điện thoại..."
                    fields={filterFields}
                    values={{ status: statusFilter }}
                    onFilterChange={(vals) => setStatusFilter(vals.status || 'ALL')}
                    onReset={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Khách hàng xác nhận nhận hàng: ${targetRecord.orderCode}`}
                            subtitle="Giai đoạn 4 Bước 3: Nghiệm thu ngoại quan & Đóng quy trình bán hàng"
                            icon={CheckCircle2}
                            onClose={() => setIsDeliveryConfirmModalOpen(false)}
                        />

                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            {/* Card thông tin đơn & serial */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Khách hàng:</span>
                                    <span className="font-bold text-gray-900">{targetRecord.recipientName} ({targetRecord.recipientPhone})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Địa chỉ bàn giao:</span>
                                    <span className="font-medium text-gray-800 text-right max-w-xs">{targetRecord.address}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Đơn vị vận chuyển ngoài:</span>
                                    <span className="font-bold text-purple-700">
                                        {targetRecord.carrierInfo?.carrierName} (Vận đơn: {targetRecord.carrierInfo?.trackingNumber})
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-500">Tổng giá trị thanh toán:</span>
                                    <span className="font-bold text-emerald-700 font-mono text-sm">
                                        {formatVND(targetRecord.finalAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Kiểm tra ngoại quan kiện hàng */}
                            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-2.5">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inspectionPassed}
                                        onChange={(e) => setInspectionPassed(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                                    />
                                    <div>
                                        <span className="font-bold text-emerald-950 block">
                                            Khách hàng đã kiểm tra ngoại quan kiện hàng nguyên vẹn
                                        </span>
                                        <span className="text-[11px] text-emerald-800">
                                            Tem niêm phong PCStore còn nguyên seal, thùng carton không cấn móp, đầy đủ {targetRecord.assignedSerials.length} mã serial chỉ định.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            {/* Người nhận thực tế */}
                            <div>
                                <AdminLabel>
                                    Họ tên người nhận thực tế:
                                </AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="font-semibold"
                                />
                            </div>

                            {/* Ghi chú phản hồi của khách hàng */}
                            <div>
                                <AdminLabel>
                                    Ý kiến / Ghi chú phản hồi của khách hàng:
                                </AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                />
                            </div>

                            {/* Cảnh báo cập nhật serial */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Hiệu lực hệ thống:</strong> Khi bấm xác nhận, đơn hàng sẽ chuyển trạng thái{' '}
                                    <span className="font-bold text-emerald-700">"Hoàn tất giao dịch" (COMPLETED)</span> và toàn bộ các mã serial gán vào đơn sẽ chuyển trạng thái{' '}
                                    <span className="font-bold text-emerald-700">"ĐÃ BÁN" (SOLD)</span>. Quy trình bán hàng đóng hoàn tất.
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
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
                                className="!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-600/30"
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Lộ trình vận chuyển ngoài: ${trackingRecord.carrierInfo?.carrierName}`}
                            subtitle={`Mã vận đơn: ${trackingRecord.carrierInfo?.trackingNumber} • Đơn: ${trackingRecord.orderCode}`}
                            icon={Truck}
                            onClose={() => setIsTrackingModalOpen(false)}
                        />

                        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-emerald-200">
                                {trackingRecord.carrierTimeline.map((evt, idx) => (
                                    <div key={evt.id || idx} className="relative flex items-start gap-3 pl-8">
                                        <div className="absolute left-2 top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 w-full shadow-2xs space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-900">{evt.statusTitle}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {formatDateTime(evt.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-gray-600">{evt.description}</p>
                                            {evt.location && (
                                                <div className="text-[11px] text-indigo-700 flex items-center gap-1 font-medium">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{evt.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end shrink-0">
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Biên bản bàn giao & Nghiệm thu hoàn tất: ${printRecord.orderCode}`}
                            icon={Printer}
                            onClose={() => setIsPrintModalOpen(false)}
                        />

                        {/* Mẫu in biên bản giao nhận */}
                        <div className="p-6 bg-white space-y-5 text-gray-900 border-2 border-dashed border-gray-300 m-4 rounded-xl overflow-y-auto flex-1">
                            <div className="text-center space-y-1 border-b pb-4">
                                <h2 className="text-lg font-black text-emerald-900 uppercase">
                                    BIÊN BẢN GIAO NHẬN HÀNG HÓA & NGHIỆM THU HOÀN TẤT
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Chứng nhận khách hàng đã nhận đủ sản phẩm và xác nhận ngoại quan nguyên vẹn
                                </p>
                                <div className="flex justify-center gap-4 text-xs font-mono text-gray-700 mt-2">
                                    <span>Mã đơn: <strong>{printRecord.orderCode}</strong></span>
                                    <span>•</span>
                                    <span>Vận đơn: <strong>{printRecord.carrierInfo?.trackingNumber}</strong></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị vận chuyển (Ngoài):</div>
                                    <div className="font-bold text-indigo-900">{printRecord.carrierInfo?.carrierName}</div>
                                    <div>Tài xế giao: {printRecord.carrierInfo?.driverName}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Khách hàng nhận hàng:</div>
                                    <div className="font-bold text-emerald-900">{printRecord.recipientName}</div>
                                    <div>Thời gian nhận: {formatDateTime(printRecord.customerReceivedAt)}</div>
                                </div>
                            </div>

                            {/* Danh sách serial */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-800">Danh sách cá thể sản phẩm đã bàn giao (Serial):</div>
                                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="p-2 text-left border-b">#</th>
                                            <th className="p-2 text-left border-b">Tên sản phẩm</th>
                                            <th className="p-2 text-left border-b">Mã Serial</th>
                                            <th className="p-2 text-right border-b">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                        {printRecord.assignedSerials.map((s, idx) => (
                                            <tr key={s.serialNumber}>
                                                <td className="p-2 font-sans">{idx + 1}</td>
                                                <td className="p-2 font-sans font-medium text-gray-900">{s.productName}</td>
                                                <td className="p-2 font-bold text-indigo-700">{s.serialNumber}</td>
                                                <td className="p-2 text-right font-sans font-bold text-emerald-700">ĐÃ BÁN (SOLD)</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nhận xét của khách */}
                            <div className="text-xs text-gray-700 bg-emerald-50/60 p-3 rounded border border-emerald-200">
                                <strong>Xác nhận từ khách hàng:</strong> "{printRecord.customerNotes || 'Đã nhận đúng hàng, ngoại quan nguyên vẹn.'}"
                            </div>

                            {/* Chữ ký 2 bên */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t text-xs text-center">
                                <div className="space-y-10">
                                    <p className="font-semibold text-gray-700">Người giao hàng (ĐVVC)</p>
                                    <p className="font-bold text-gray-900">{printRecord.carrierInfo?.driverName}</p>
                                </div>
                                <div className="space-y-10">
                                    <p className="font-semibold text-gray-700">Khách hàng nhận hàng</p>
                                    <p className="font-bold text-emerald-900">{printRecord.recipientName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
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
                                className="!bg-emerald-600 hover:!bg-emerald-700"
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
