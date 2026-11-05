import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
    Radio,
    DollarSign,
    Box,
    Check,
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
import { useAuth } from '../../../context/AuthContext';
import { orderFulfillmentService } from '../../../services/orderFulfillmentService';
import type {
    OrderFulfillmentRecord,
    OrderFulfillmentStatus,
    CarrierHandoverInfo,
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

export default function HandoverList() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [fulfillments, setFulfillments] = useState<OrderFulfillmentRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Active View Tab: 'waiting_handover' (Đơn chờ bàn giao) | 'handed_over' (Đã bàn giao & Theo dõi ĐVVC ngoài)
    const [activeTab, setActiveTab] = useState<'waiting_handover' | 'handed_over'>('waiting_handover');

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [carrierFilter, setCarrierFilter] = useState('ALL');

    // Stepper workflow toggle
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

    // Modal Bàn giao ĐVVC (Giai đoạn 3 Bước 5)
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
    const [targetRecord, setTargetRecord] = useState<OrderFulfillmentRecord | null>(null);

    // Form Bàn giao ĐVVC ngoài hệ thống
    const [selectedCarrier, setSelectedCarrier] = useState(POPULAR_LOGISTICS_CARRIERS[0].name);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [driverName, setDriverName] = useState('Nguyễn Văn Tuấn');
    const [driverPhone, setDriverPhone] = useState('0988.112.334');
    const [licensePlate, setLicensePlate] = useState('29C-881.92');
    const [handoverStaff, setHandoverStaff] = useState('Lê Kho Vận (Thủ kho)');
    const [handoverNotes, setHandoverNotes] = useState('Bàn giao kiện hàng nguyên vẹn tem niêm phong kèm 01 phiếu đóng gói và chứng từ giao hàng có chữ ký hai bên.');
    const [shippingFee, setShippingFee] = useState<number>(45000);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal In Biên bản bàn giao
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printRecord, setPrintRecord] = useState<OrderFulfillmentRecord | null>(null);

    // Modal Xem chi tiết lộ trình ĐVVC ngoại hệ thống
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingRecord, setTrackingRecord] = useState<OrderFulfillmentRecord | null>(null);

    // Modal Cập nhật tiến độ ĐVVC ngoài (Mô phỏng Webhook / Dispatcher)
    const [isSimulateEventModalOpen, setIsSimulateEventModalOpen] = useState(false);
    const [simEventTitle, setSimEventTitle] = useState('Kiện hàng đến bưu cục phát');
    const [simEventDesc, setSimEventDesc] = useState('Kiện hàng đã đến bưu cục phát Quận 1, chuẩn bị phân tuyến giao tới khách hàng.');
    const [simEventLocation, setSimEventLocation] = useState('Bưu cục phát Quận 1, TP. HCM');
    const [simEventStatus, setSimEventStatus] = useState<OrderFulfillmentStatus>('OUT_FOR_DELIVERY');

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
            toast.error(error.message || 'Không thể tải danh sách bàn giao đơn hàng');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Lọc danh sách theo tab hiện tại
    const filteredRecords = useMemo(() => {
        return fulfillments.filter((r) => {
            // Bộ lọc search
            const q = searchQuery.toLowerCase().trim();
            const matchSearch =
                !q ||
                r.orderCode.toLowerCase().includes(q) ||
                r.customerName.toLowerCase().includes(q) ||
                r.customerPhone.includes(q) ||
                r.carrierInfo?.trackingNumber.toLowerCase().includes(q) ||
                r.carrierInfo?.carrierName.toLowerCase().includes(q);

            if (!matchSearch) return false;

            // Bộ lọc carrier
            if (carrierFilter !== 'ALL' && r.carrierInfo?.carrierName !== carrierFilter) {
                return false;
            }

            // Theo Tab
            if (activeTab === 'waiting_handover') {
                return r.fulfillmentStatus === 'PACKED_WAITING_HANDOVER';
            } else {
                return (
                    r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER' ||
                    r.fulfillmentStatus === 'SHIPPING_IN_TRANSIT' ||
                    r.fulfillmentStatus === 'OUT_FOR_DELIVERY' ||
                    r.fulfillmentStatus === 'DELIVERED_SUCCESS' ||
                    r.fulfillmentStatus === 'COMPLETED'
                );
            }
        });
    }, [fulfillments, activeTab, searchQuery, carrierFilter]);

    // Thống kê nhanh
    const stats = useMemo(() => {
        let waitingHandover = 0;
        let handedOver = 0;
        let outForDelivery = 0;
        let completed = 0;

        fulfillments.forEach((r) => {
            if (r.fulfillmentStatus === 'PACKED_WAITING_HANDOVER') waitingHandover++;
            if (r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER' || r.fulfillmentStatus === 'SHIPPING_IN_TRANSIT') handedOver++;
            if (r.fulfillmentStatus === 'OUT_FOR_DELIVERY') outForDelivery++;
            if (r.fulfillmentStatus === 'COMPLETED' || r.fulfillmentStatus === 'DELIVERED_SUCCESS') completed++;
        });

        return { waitingHandover, handedOver, outForDelivery, completed };
    }, [fulfillments]);

    /**
     * Mở modal bàn giao
     */
    const handleOpenHandoverModal = (record: OrderFulfillmentRecord) => {
        setTargetRecord(record);
        setSelectedCarrier(POPULAR_LOGISTICS_CARRIERS[0].name);
        // Sinh mã tracking mẫu tự động
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        setTrackingNumber(`VTP-${randomDigits}VN`);
        setDriverName('Nguyễn Văn Tuấn (Tài xế giao vận)');
        setDriverPhone('0988.112.334');
        setLicensePlate('29C-881.92');
        setHandoverStaff(record.warehouseStaffName || 'Lê Kho Vận (Thủ kho)');
        setShippingFee(45000);
        setIsHandoverModalOpen(true);
    };

    /**
     * Khi thay đổi ĐVVC ngoài, tự sinh mã vận đơn mẫu theo tiền tố của ĐVVC
     */
    const handleCarrierChange = (carrierName: string) => {
        setSelectedCarrier(carrierName);
        const carrierObj = POPULAR_LOGISTICS_CARRIERS.find((c) => c.name === carrierName);
        const prefix = carrierObj?.trackingPrefix || 'TRK-';
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        setTrackingNumber(`${prefix}${randomDigits}${carrierObj?.code === 'VTP' ? 'VN' : ''}`);
    };

    /**
     * Xác nhận bàn giao đơn hàng cho ĐVVC ngoài hệ thống
     */
    const handleConfirmHandover = async () => {
        if (!targetRecord) return;
        if (!trackingNumber.trim()) {
            toast.error('Vui lòng nhập mã vận đơn do ĐVVC ngoài cấp!');
            return;
        }

        setIsSubmitting(true);
        try {
            const updated = await orderFulfillmentService.handoverToCarrier(targetRecord.orderId, {
                carrierName: selectedCarrier,
                trackingNumber: trackingNumber.trim().toUpperCase(),
                driverName,
                driverPhone,
                licensePlate,
                handoverStaffName: handoverStaff,
                handoverNotes,
                shippingFee,
                estimatedDeliveryDate: '1-2 ngày tới',
            });

            toast.success(
                `Bàn giao thành công đơn ${targetRecord.orderCode} cho đối tác ${selectedCarrier}! Mã vận đơn: ${trackingNumber}.`
            );
            setIsHandoverModalOpen(false);
            loadData();

            // Mở modal in biên bản bàn giao
            setPrintRecord(updated);
            setIsPrintModalOpen(true);
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi bàn giao đơn hàng');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Thêm sự kiện lộ trình mới từ ĐVVC ngoài (Mô phỏng Webhook / Tra cứu bưu cục)
     */
    const handleAddSimulatedEvent = async () => {
        if (!trackingRecord) return;

        try {
            if (simEventStatus === 'DELIVERED_SUCCESS') {
                // Giai đoạn 4 Bước 3: Khách nhận hàng & Hoàn tất đơn -> Cập nhật serial sang SOLD!
                const updated = await orderFulfillmentService.confirmCustomerDelivery(trackingRecord.orderId, {
                    customerName: trackingRecord.recipientName,
                    inspectionPassed: true,
                    customerNotes: simEventDesc || 'Giao hàng thành công tới khách hàng.',
                    staffName: user?.fullName || 'Đơn vị vận chuyển',
                });
                toast.success(
                    `Đã cập nhật trạng thái đơn ${trackingRecord.orderCode} thành Giao thành công & toàn bộ serial đã chuyển sang ĐÃ BÁN (SOLD)!`
                );
                setIsSimulateEventModalOpen(false);
                setTrackingRecord(updated);
                loadData();
                return;
            }

            const updated = await orderFulfillmentService.addCarrierTimelineEvent(trackingRecord.orderId, {
                statusTitle: simEventTitle,
                description: simEventDesc,
                location: simEventLocation,
                fulfillmentStatus: simEventStatus,
            });

            toast.success('Đã cập nhật sự kiện mới từ hệ thống ĐVVC ngoài!');
            setIsSimulateEventModalOpen(false);
            setTrackingRecord(updated);
            loadData();
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi cập nhật lộ trình ĐVVC');
        }
    };

    /**
     * Giai đoạn 4 Bước 3: Xác nhận khách hàng nhận hàng thành công & Hoàn tất quy trình bán hàng
     * Cập nhật trạng thái serial sau khi đã hoàn thành đơn hàng -> SOLD
     */
    const handleConfirmCustomerDelivery = async (rec: OrderFulfillmentRecord) => {
        if (
            window.confirm(
                `Xác nhận khách hàng (${rec.recipientName}) đã nhận đơn hàng ${rec.orderCode}, ngoại quan nguyên vẹn và hoàn tất đơn hàng?\n\nToàn bộ các mã serial sẽ được cập nhật sang trạng thái ĐÃ BÁN (SOLD).`
            )
        ) {
            try {
                const updated = await orderFulfillmentService.confirmCustomerDelivery(rec.orderId, {
                    customerName: rec.recipientName,
                    inspectionPassed: true,
                    customerNotes: 'Giao hàng thành công, khách kiểm tra ngoại quan nguyên vẹn và ký nhận.',
                    staffName: user?.fullName || 'Nhân viên bán hàng',
                });
                toast.success(
                    `Đã hoàn tất đơn ${rec.orderCode}! Toàn bộ ${updated.assignedSerials?.length || 0} mã serial đã cập nhật sang trạng thái ĐÃ BÁN (SOLD).`
                );
                loadData();
                if (trackingRecord?.orderId === rec.orderId) {
                    setTrackingRecord(updated);
                }
            } catch (e: any) {
                toast.error(e.message || 'Lỗi khi xác nhận giao hàng');
            }
        }
    };

    // Columns cho AdminTable
    const columns: Column<OrderFulfillmentRecord>[] = [
        {
            key: 'orderCode',
            header: 'Mã đơn & Thời gian',
            render: (rec) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 font-mono">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span>{rec.orderCode}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>Đóng gói: {formatDateTime(rec.packedAt)}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Người nhận & Địa chỉ',
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
            header: 'ĐVVC ngoài & Mã vận đơn',
            render: (rec) => {
                if (!rec.carrierInfo) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Chờ bàn giao ĐVVC ngoài</span>
                        </span>
                    );
                }

                return (
                    <div className="space-y-1">
                        <div className="font-bold text-xs text-indigo-900 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{rec.carrierInfo.carrierName}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-fit">
                            <span>{rec.carrierInfo.trackingNumber}</span>
                        </div>
                        {rec.carrierInfo.driverName && (
                            <div className="text-[10px] text-gray-500">
                                Shipper: {rec.carrierInfo.driverName} ({rec.carrierInfo.driverPhone})
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'assignedSerials',
            header: 'Serial trong kiện hàng',
            render: (rec) => (
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-700">
                        {rec.assignedSerials.length} sản phẩm
                    </span>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                        {rec.assignedSerials.map((s) => (
                            <span
                                key={s.serialNumber}
                                className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
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
            header: 'Trạng thái quy trình',
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
                        <div className="text-[11px] text-gray-500 italic">
                            {conf.description.slice(0, 45)}...
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            render: (rec) => (
                <div className="flex items-center gap-1.5">
                    {rec.fulfillmentStatus === 'PACKED_WAITING_HANDOVER' ? (
                        <button
                            type="button"
                            onClick={() => handleOpenHandoverModal(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Bàn giao ĐVVC</span>
                        </button>
                    ) : (
                        <>
                            {rec.fulfillmentStatus !== 'COMPLETED' && (
                                <button
                                    type="button"
                                    onClick={() => handleConfirmCustomerDelivery(rec)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                                    title="Khách hàng đã nhận hàng & Hoàn tất (Cập nhật Serial sang SOLD)"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Giao thành công</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setTrackingRecord(rec);
                                    setIsTrackingModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer"
                                title="Theo dõi lộ trình từ đối tác vận chuyển ngoài"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Lộ trình ĐVVC</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPrintRecord(rec);
                                    setIsPrintModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 p-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                                title="In biên bản bàn giao"
                            >
                                <Printer className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            id: 'carrier',
            label: 'Đơn vị vận chuyển ngoài',
            type: 'select',
            options: [
                { label: 'Tất cả ĐVVC', value: 'ALL' },
                ...POPULAR_LOGISTICS_CARRIERS.map((c) => ({
                    label: c.name,
                    value: c.name,
                })),
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
                        <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý đơn bàn giao (Handover to Carrier)
                            </h1>
                            <p className="text-sm text-gray-500">
                                Giai đoạn 3 Bước 5: Bàn giao kiện hàng hoàn chỉnh cho ĐVVC là dịch vụ ngoài hệ thống (Viettel Post, GHTK, GHN...)
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
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
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
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/shipping/deliveries')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all cursor-pointer shadow-sm shadow-purple-600/30"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Quản lý đơn giao hàng (Giai đoạn 4)</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* WORKFLOW GUIDE BANNER (LƯU Ý: ĐVVC NGOÀI HỆ THỐNG)        */}
            {/* ======================================================== */}
            {showWorkflowGuide && (
                <div className="bg-gradient-to-br from-slate-900 to-purple-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                            <Truck className="w-5 h-5 text-amber-400" />
                            <h2 className="text-base font-bold text-white tracking-wide">
                                BÀN GIAO & VẬN CHUYỂN NGOÀI HỆ THỐNG (THIRD-PARTY LOGISTICS - 3PL)
                            </h2>
                        </div>
                        <span className="text-xs text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full font-mono border border-amber-400/30">
                            ĐVVC là dịch vụ ngoài hệ thống
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                            <span className="font-mono font-bold text-purple-300 bg-purple-400/20 px-2 py-0.5 rounded text-[11px]">
                                GĐ 3 - BƯỚC 5 (KHO)
                            </span>
                            <h3 className="font-bold text-white text-sm">Bàn giao đơn hàng cho ĐVVC</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Nhân viên kho bàn giao kiện hàng đã niêm phong cùng chứng từ giao hàng. Nhập mã vận đơn do ĐVVC ngoài cấp và thông tin tài xế tiếp nhận.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                            <span className="font-mono font-bold text-blue-300 bg-blue-400/20 px-2 py-0.5 rounded text-[11px]">
                                GĐ 4 - BƯỚC 1 (ĐVVC NGOÀI)
                            </span>
                            <h3 className="font-bold text-white text-sm">Tiếp nhận & Vận chuyển</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Đơn vị vận chuyển ngoài nhận kiện hàng và chứng từ thông qua thông điệp tiếp nhận, tiến hành lộ trình phát hàng qua mạng lưới bưu cục.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                            <span className="font-mono font-bold text-emerald-300 bg-emerald-400/20 px-2 py-0.5 rounded text-[11px]">
                                GĐ 4 - BƯỚC 2 & 3 (GIAO NHẬN)
                            </span>
                            <h3 className="font-bold text-white text-sm">Bàn giao & Khách nhận hàng</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Shipper ĐVVC giao hàng tới địa chỉ. Khách hàng kiểm tra ngoại quan kiện hàng, xác nhận nhận hàng thành công và kết thúc quy trình bán hàng.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* STAT CARDS                                               */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => setActiveTab('waiting_handover')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                        activeTab === 'waiting_handover'
                            ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Chờ bàn giao ĐVVC</p>
                        <p className="text-2xl font-bold text-purple-700">{stats.waitingHandover}</p>
                        <p className="text-[11px] text-gray-400">Kiện hàng đã đóng gói niêm phong</p>
                    </div>
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div
                    onClick={() => setActiveTab('handed_over')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                        activeTab === 'handed_over'
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã bàn giao ĐVVC ngoài</p>
                        <p className="text-2xl font-bold text-indigo-700">{stats.handedOver}</p>
                        <p className="text-[11px] text-gray-400">Đang trung chuyển trên lộ trình</p>
                    </div>
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                        <Truck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang phát hàng tới khách</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.outForDelivery}</p>
                        <p className="text-[11px] text-gray-400">Shipper ĐVVC đang đi phát</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Giao thành công & Hoàn tất</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                        <p className="text-[11px] text-gray-400">Khách hàng đã nhận hàng</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* TABS CHUYỂN ĐỔI                                          */}
            {/* ======================================================== */}
            <div className="flex border-b border-gray-200 gap-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('waiting_handover')}
                    className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'waiting_handover'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    <span>Đơn chờ bàn giao cho ĐVVC</span>
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-bold">
                        {stats.waitingHandover}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('handed_over')}
                    className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'handed_over'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Đã bàn giao & Theo dõi lộ trình ĐVVC ngoài</span>
                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold">
                        {stats.handedOver + stats.outForDelivery + stats.completed}
                    </span>
                </button>
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
                    values={{ carrier: carrierFilter }}
                    onFilterChange={(vals) => setCarrierFilter(vals.carrier || 'ALL')}
                    onReset={() => {
                        setSearchQuery('');
                        setCarrierFilter('ALL');
                    }}
                />

                <AdminTable
                    columns={columns}
                    data={filteredRecords}
                    loading={isLoading}
                    rowKey="orderId"
                    emptyText={
                        activeTab === 'waiting_handover'
                            ? 'Hiện không có kiện hàng nào đang chờ bàn giao cho ĐVVC'
                            : 'Chưa có đơn hàng nào đã bàn giao'
                    }
                />
            </div>

            {/* ======================================================== */}
            {/* MODAL BÀN GIAO ĐƠN HÀNG CHO ĐVVC NGOÀI HỆ THỐNG          */}
            {/* ======================================================== */}
            {isHandoverModalOpen && targetRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Bàn giao đơn hàng cho ĐVVC: ${targetRecord.orderCode}`}
                            subtitle="Đơn vị vận chuyển là đối tác dịch vụ bên ngoài hệ thống"
                            icon={Truck}
                            onClose={() => setIsHandoverModalOpen(false)}
                        />

                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            {/* Chọn ĐVVC ngoài hệ thống */}
                            <div>
                                <AdminLabel className="!font-bold">
                                    1. Chọn Đơn vị vận chuyển đối tác (Ngoài hệ thống):
                                </AdminLabel>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {POPULAR_LOGISTICS_CARRIERS.map((c) => (
                                        <div
                                            key={c.code}
                                            onClick={() => handleCarrierChange(c.name)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                                selectedCarrier === c.name
                                                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-bold text-gray-900">{c.name}</div>
                                                <div className="text-[10px] text-gray-500">
                                                    Hotline: {c.hotline} • Dự kiến: {c.estimatedHours}
                                                </div>
                                            </div>
                                            {selectedCarrier === c.name && (
                                                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mã vận đơn (Tracking Code) */}
                            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-2">
                                <AdminLabel required className="!text-purple-950 !font-bold">
                                    2. Mã vận đơn (Tracking Number do ĐVVC ngoài cấp)
                                </AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Nhập mã vận đơn (VD: VTP-8849201948VN, GHTK-990142851)..."
                                    className="font-mono font-bold"
                                />
                                <p className="text-[11px] text-gray-500">
                                    Mã này dùng để khách hàng và nhân viên tra cứu lộ trình vận chuyển từ đối tác giao vận bên ngoài.
                                </p>
                            </div>

                            {/* Thông tin tài xế ĐVVC tiếp nhận */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <AdminLabel>
                                        Tên tài xế / Shipper tiếp nhận:
                                    </AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <AdminLabel>
                                        Số điện thoại tài xế:
                                    </AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={driverPhone}
                                        onChange={(e) => setDriverPhone(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>

                                <div>
                                    <AdminLabel>
                                        Biển số xe giao nhận (nếu có):
                                    </AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={licensePlate}
                                        onChange={(e) => setLicensePlate(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>

                                <div>
                                    <AdminLabel>
                                        Cước phí vận chuyển (VND):
                                    </AdminLabel>
                                    <AdminInput
                                        type="number"
                                        value={shippingFee}
                                        onChange={(e) => setShippingFee(Number(e.target.value))}
                                        className="font-bold"
                                    />
                                </div>
                            </div>

                            {/* Thông tin thủ kho bàn giao */}
                            <div>
                                <AdminLabel>
                                    Nhân viên kho thực hiện bàn giao:
                                </AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={handoverStaff}
                                    onChange={(e) => setHandoverStaff(e.target.value)}
                                    className="font-semibold"
                                />
                            </div>

                            <div>
                                <AdminLabel>
                                    Ghi chú biên bản bàn giao:
                                </AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={handoverNotes}
                                    onChange={(e) => setHandoverNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Đơn sẽ chuyển sang trạng thái "Đã bàn giao cho ĐVVC" (GĐ 3 Bước 5).
                            </span>
                            <div className="flex gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsHandoverModalOpen(false)}
                                >
                                    Hủy
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={handleConfirmHandover}
                                    isLoading={isSubmitting}
                                    icon={Truck}
                                    className="!bg-purple-600 hover:!bg-purple-700 shadow-purple-600/30"
                                >
                                    Xác nhận bàn giao & In biên bản
                                </AdminButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL IN BIÊN BẢN BÀN GIAO HÀNG HÓA CHO ĐVVC             */}
            {/* ======================================================== */}
            {isPrintModalOpen && printRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Biên bản bàn giao hàng hóa cho ĐVVC: ${printRecord.orderCode}`}
                            icon={Printer}
                            onClose={() => setIsPrintModalOpen(false)}
                        />

                        {/* Mẫu biên bản bàn giao in ấn */}
                        <div className="p-6 bg-white space-y-5 text-gray-900 border-2 border-dashed border-gray-300 m-4 rounded-xl overflow-y-auto flex-1">
                            <div className="text-center space-y-1 border-b pb-4">
                                <h2 className="text-lg font-black text-gray-900 uppercase">
                                    BIÊN BẢN BÀN GIAO HÀNG HÓA CHO ĐƠN VỊ VẬN CHUYỂN
                                </h2>
                                <p className="text-xs text-gray-500">
                                    (Áp dụng dịch vụ vận chuyển bên thứ ba - 3PL)
                                </p>
                                <div className="flex justify-center gap-4 text-xs font-mono text-gray-700 mt-2">
                                    <span>Mã đơn: <strong>{printRecord.orderCode}</strong></span>
                                    <span>•</span>
                                    <span>Mã vận đơn: <strong className="text-purple-700">{printRecord.carrierInfo?.trackingNumber}</strong></span>
                                </div>
                            </div>

                            {/* Thông tin 2 bên */}
                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Bên giao (Cửa hàng):</div>
                                    <div className="font-bold text-gray-900">PCStore Việt Nam Center</div>
                                    <div>Thủ kho: {printRecord.carrierInfo?.handoverStaffName}</div>
                                    <div>Thời gian: {formatDateTime(printRecord.carrierInfo?.handoverAt)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Bên nhận (ĐVVC ngoài):</div>
                                    <div className="font-bold text-purple-700">{printRecord.carrierInfo?.carrierName}</div>
                                    <div>Tài xế: {printRecord.carrierInfo?.driverName}</div>
                                    <div>SĐT: {printRecord.carrierInfo?.driverPhone} • Xe: {printRecord.carrierInfo?.licensePlate}</div>
                                </div>
                            </div>

                            {/* Danh sách linh kiện kèm serial */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-800">Chi tiết kiện hàng bàn giao:</div>
                                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="p-2 text-left border-b">#</th>
                                            <th className="p-2 text-left border-b">Tên sản phẩm</th>
                                            <th className="p-2 text-left border-b">Mã Serial niêm phong</th>
                                            <th className="p-2 text-right border-b">Giá trị</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                        {printRecord.assignedSerials.map((s, idx) => (
                                            <tr key={s.serialNumber}>
                                                <td className="p-2 font-sans">{idx + 1}</td>
                                                <td className="p-2 font-sans font-medium text-gray-900">{s.productName}</td>
                                                <td className="p-2 font-bold text-purple-700">{s.serialNumber}</td>
                                                <td className="p-2 text-right font-sans">{formatVND(s.productPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quy cách và cam kết */}
                            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border space-y-1">
                                <div><strong>Quy cách:</strong> Đóng thùng xốp, dán tem niêm phong PCStore. Trọng lượng: {printRecord.boxWeightKg || 3} kg.</div>
                                <div><strong>Cam kết:</strong> ĐVVC ngoài xác nhận kiện hàng còn nguyên vẹn tem niêm phong, không cấn móp, cam kết giao đến đúng địa chỉ người nhận.</div>
                            </div>

                            {/* Chữ ký 2 bên */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t text-xs text-center">
                                <div className="space-y-10">
                                    <p className="font-semibold text-gray-700">Đại diện bên giao (Thủ kho)</p>
                                    <p className="font-bold text-gray-900">{printRecord.carrierInfo?.handoverStaffName}</p>
                                </div>
                                <div className="space-y-10">
                                    <p className="font-semibold text-gray-700">Đại diện bên nhận (Tài xế ĐVVC ngoài)</p>
                                    <p className="font-bold text-purple-700">{printRecord.carrierInfo?.driverName}</p>
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
                                className="!bg-purple-600 hover:!bg-purple-700"
                            >
                                In biên bản bàn giao
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL THEO DÕI LỘ TRÌNH ĐVVC NGOÀI HỆ THỐNG              */}
            {/* ======================================================== */}
            {isTrackingModalOpen && trackingRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Lộ trình vận chuyển ngoài hệ thống: ${trackingRecord.carrierInfo?.carrierName}`}
                            subtitle={`Mã vận đơn: ${trackingRecord.carrierInfo?.trackingNumber} • Đơn: ${trackingRecord.orderCode}`}
                            icon={Truck}
                            onClose={() => setIsTrackingModalOpen(false)}
                        />

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Card thông tin đối tác ĐVVC */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <div className="text-gray-400 text-[10px] uppercase font-bold">Đối tác vận chuyển:</div>
                                    <div className="font-bold text-indigo-900 text-sm">
                                        {trackingRecord.carrierInfo?.carrierName}
                                    </div>
                                    <div className="text-gray-500">Mã vận đơn: <strong>{trackingRecord.carrierInfo?.trackingNumber}</strong></div>
                                    <div className="text-gray-500">Hotline: {trackingRecord.carrierInfo?.carrierHotline || '1900 8095'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-[10px] uppercase font-bold">Thông tin tài xế giao nhận:</div>
                                    <div className="font-bold text-gray-900">{trackingRecord.carrierInfo?.driverName}</div>
                                    <div className="text-gray-600">SĐT: {trackingRecord.carrierInfo?.driverPhone}</div>
                                    <div className="text-gray-600">Biển số: {trackingRecord.carrierInfo?.licensePlate || 'Chưa cập nhật'}</div>
                                </div>
                            </div>

                            {/* Lộ trình Timeline */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        Tiến trình lộ trình giao hàng (Cập nhật từ ĐVVC ngoài)
                                    </h3>
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setIsSimulateEventModalOpen(true)}
                                        className="!text-xs !font-semibold !text-purple-600 !bg-purple-50 !border-purple-200 hover:!bg-purple-100"
                                    >
                                        + Cập nhật tiến độ ĐVVC
                                    </AdminButton>
                                </div>

                                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-indigo-200">
                                    {trackingRecord.carrierTimeline.map((evt, idx) => (
                                        <div key={evt.id || idx} className="relative flex items-start gap-3 pl-8 text-xs">
                                            <div className="absolute left-2 top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-200" />
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
                                                <div className="text-[10px] text-gray-400 italic">
                                                    Ghi nhận bởi: {evt.actorRole} {evt.actorName ? `(${evt.actorName})` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2 shrink-0">
                            {trackingRecord.fulfillmentStatus !== 'COMPLETED' && (
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={() => handleConfirmCustomerDelivery(trackingRecord)}
                                    className="!bg-emerald-600 hover:!bg-emerald-700 flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Khách đã nhận hàng & Hoàn tất (SOLD)</span>
                                </AdminButton>
                            )}
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
            {/* MODAL MÔ PHỎNG CẬP NHẬT TIẾN ĐỘ TỪ ĐVVC NGOÀI (WEBHOOK)  */}
            {/* ======================================================== */}
            {isSimulateEventModalOpen && trackingRecord && (
                <div className="fixed inset-0 z-60 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title="Cập nhật tiến độ từ ĐVVC ngoài hệ thống"
                            icon={Send}
                            onClose={() => setIsSimulateEventModalOpen(false)}
                        />

                        <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
                            <p className="text-gray-500">
                                Mô phỏng thông điệp phản hồi / webhook từ hệ thống bưu cục của{' '}
                                <strong className="text-gray-900">{trackingRecord.carrierInfo?.carrierName}</strong>.
                            </p>

                            <div>
                                <AdminLabel>Tiêu đề trạng thái:</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={simEventTitle}
                                    onChange={(e) => setSimEventTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Vị trí hiện tại:</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={simEventLocation}
                                    onChange={(e) => setSimEventLocation(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Mô tả chi tiết:</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={simEventDesc}
                                    onChange={(e) => setSimEventDesc(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Cập nhật trạng thái đơn:</AdminLabel>
                                <AdminSelect
                                    value={simEventStatus}
                                    onChange={(e) => setSimEventStatus(e.target.value as OrderFulfillmentStatus)}
                                >
                                    <option value="SHIPPING_IN_TRANSIT">Đang trung chuyển bưu cục (SHIPPING_IN_TRANSIT)</option>
                                    <option value="OUT_FOR_DELIVERY">Shipper đang phát hàng tới khách (OUT_FOR_DELIVERY)</option>
                                    <option value="DELIVERED_SUCCESS">Đã giao tới khách hàng (DELIVERED_SUCCESS)</option>
                                </AdminSelect>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsSimulateEventModalOpen(false)}
                            >
                                Hủy
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleAddSimulatedEvent}
                                className="!bg-purple-600 hover:!bg-purple-700"
                            >
                                Lưu sự kiện
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
