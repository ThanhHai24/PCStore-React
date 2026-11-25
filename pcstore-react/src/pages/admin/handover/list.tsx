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

    // Search & Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [carrierFilter, setCarrierFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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
    const [handoverStaff, setHandoverStaff] = useState(user?.fullName || 'Lê Kho Vận (Thủ kho)');
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

    // Lọc danh sách theo tab và các điều kiện lọc
    const filteredRecords = useMemo(() => {
        return fulfillments.filter((r) => {
            // 1. Theo Tab
            if (activeTab === 'waiting_handover') {
                if (r.fulfillmentStatus !== 'PACKED_WAITING_HANDOVER') return false;
            } else {
                const isHandedOverStage =
                    r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER' ||
                    r.fulfillmentStatus === 'SHIPPING_IN_TRANSIT' ||
                    r.fulfillmentStatus === 'OUT_FOR_DELIVERY' ||
                    r.fulfillmentStatus === 'DELIVERED_SUCCESS' ||
                    r.fulfillmentStatus === 'COMPLETED';

                if (!isHandedOverStage) return false;

                // Bộ lọc trạng thái vận chuyển cụ thể trong tab Đã bàn giao
                if (statusFilter !== 'ALL') {
                    if (statusFilter === 'COMPLETED') {
                        if (r.fulfillmentStatus !== 'COMPLETED' && r.fulfillmentStatus !== 'DELIVERED_SUCCESS') {
                            return false;
                        }
                    } else if (statusFilter === 'HANDED_OVER_TO_CARRIER') {
                        if (r.fulfillmentStatus !== 'HANDED_OVER_TO_CARRIER' && r.fulfillmentStatus !== 'SHIPPING_IN_TRANSIT') {
                            return false;
                        }
                    } else if (r.fulfillmentStatus !== statusFilter) {
                        return false;
                    }
                }

                // Bộ lọc ĐVVC ngoài
                if (carrierFilter !== 'ALL' && r.carrierInfo?.carrierName !== carrierFilter) {
                    return false;
                }
            }

            // 2. Bộ lọc hình thức mua
            if (typeFilter !== 'ALL' && r.orderType !== typeFilter) {
                return false;
            }

            // 3. Bộ lọc tìm kiếm từ khóa
            const q = debouncedSearch.toLowerCase().trim();
            if (q) {
                const matchOrderCode = r.orderCode?.toLowerCase().includes(q);
                const matchCustomer = r.customerName?.toLowerCase().includes(q);
                const matchCustomerPhone = r.customerPhone?.includes(q);
                const matchRecipient = r.recipientName?.toLowerCase().includes(q);
                const matchRecipientPhone = r.recipientPhone?.includes(q);
                const matchAddress = r.address?.toLowerCase().includes(q);
                const matchTracking = r.carrierInfo?.trackingNumber?.toLowerCase().includes(q);
                const matchCarrierName = r.carrierInfo?.carrierName?.toLowerCase().includes(q);
                const matchDriverName = r.carrierInfo?.driverName?.toLowerCase().includes(q);
                const matchDriverPhone = r.carrierInfo?.driverPhone?.includes(q);
                const matchSerial = r.assignedSerials?.some((s) => s.serialNumber?.toLowerCase().includes(q));

                if (
                    !matchOrderCode &&
                    !matchCustomer &&
                    !matchCustomerPhone &&
                    !matchRecipient &&
                    !matchRecipientPhone &&
                    !matchAddress &&
                    !matchTracking &&
                    !matchCarrierName &&
                    !matchDriverName &&
                    !matchDriverPhone &&
                    !matchSerial
                ) {
                    return false;
                }
            }

            // 4. Bộ lọc khoảng ngày
            if (fromDate) {
                const recTime = new Date(r.createdAt).getTime();
                const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
                if (!isNaN(recTime) && !isNaN(fromTime) && recTime < fromTime) {
                    return false;
                }
            }

            if (toDate) {
                const recTime = new Date(r.createdAt).getTime();
                const toTime = new Date(`${toDate}T23:59:59`).getTime();
                if (!isNaN(recTime) && !isNaN(toTime) && recTime > toTime) {
                    return false;
                }
            }

            return true;
        });
    }, [fulfillments, activeTab, statusFilter, carrierFilter, typeFilter, debouncedSearch, fromDate, toDate]);

    // Phân trang danh sách bàn giao
    const totalElements = filteredRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage, pageSize]);

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
        setHandoverStaff(user?.fullName || record.warehouseStaffName || 'Lê Kho Vận (Thủ kho)');
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

    // Status dot indicator (restrained border-first style, no saturated pill clutter)
    const renderFulfillmentStatusIndicator = (status: OrderFulfillmentStatus) => {
        const conf = FULFILLMENT_STATUS_MAP[status];
        let dotClass = 'bg-slate-400';
        if (status === 'PACKED_WAITING_HANDOVER' || status === 'OUT_FOR_DELIVERY') {
            dotClass = 'bg-amber-500';
        } else if (status === 'HANDED_OVER_TO_CARRIER' || status === 'SHIPPING_IN_TRANSIT') {
            dotClass = 'bg-blue-600';
        } else if (status === 'DELIVERED_SUCCESS' || status === 'COMPLETED') {
            dotClass = 'bg-emerald-600';
        }

        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                <span>{conf.label}</span>
            </span>
        );
    };

    // Columns cho AdminTable
    const columns: Column<OrderFulfillmentRecord>[] = [
        {
            key: 'orderCode',
            header: 'Mã đơn hàng',
            render: (rec) => (
                <div className="space-y-0.5">
                    <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {rec.orderCode}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                        {rec.carrierInfo?.handoverAt
                            ? `Bàn giao: ${formatDateTime(rec.carrierInfo.handoverAt)}`
                            : `Đóng gói: ${formatDateTime(rec.packedAt)}`}
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Thông tin giao hàng',
            render: (rec) => (
                <div className="space-y-0.5 max-w-[260px]">
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-slate-900 truncate">{rec.recipientName}</span>
                        <span className="text-slate-500 tabular-nums shrink-0">{rec.recipientPhone}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate" title={rec.address}>
                        {rec.address}
                    </div>
                </div>
            ),
        },
        {
            key: 'carrier',
            header: 'Đơn vị vận chuyển',
            render: (rec) => {
                if (!rec.carrierInfo) {
                    return <span className="text-xs text-slate-400">Chưa bàn giao</span>;
                }

                return (
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-900">
                            {rec.carrierInfo.carrierName}
                        </div>
                        <div className="inline-flex items-center font-mono text-[11px] font-medium text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 tabular-nums">
                            {rec.carrierInfo.trackingNumber}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'serialCount',
            header: 'Serial',
            align: 'right',
            render: (rec) => (
                <div className="space-y-0.5 text-right tabular-nums">
                    <div className="text-xs font-medium text-slate-900">
                        {rec.assignedSerials.length} mã
                    </div>
                    {rec.boxWeightKg ? (
                        <div className="text-xs text-slate-500">{rec.boxWeightKg} kg</div>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'amount',
            header: 'Giá trị đơn',
            align: 'right',
            render: (rec) => (
                <span className="text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {formatVND(rec.finalAmount)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (rec) => renderFulfillmentStatusIndicator(rec.fulfillmentStatus),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (rec) => {
                const isWaitingHandover = rec.fulfillmentStatus === 'PACKED_WAITING_HANDOVER';
                return (
                    <AdminActionDropdown
                        maxInline={3}
                        actions={[
                            {
                                key: 'handover-carrier',
                                label: 'Bàn giao ĐVVC',
                                icon: Truck,
                                variant: 'primary',
                                highlight: true,
                                hidden: !isWaitingHandover,
                                onClick: () => handleOpenHandoverModal(rec),
                            },
                            {
                                key: 'confirm-delivery',
                                label: 'Giao thành công (Khách hàng đã nhận hàng & Hoàn tất)',
                                icon: CheckCircle2,
                                variant: 'success',
                                highlight: true,
                                hidden: isWaitingHandover || rec.fulfillmentStatus === 'COMPLETED',
                                onClick: () => handleConfirmCustomerDelivery(rec),
                            },
                            {
                                key: 'shipping-tracking',
                                label: 'Chi tiết vận chuyển',
                                icon: ExternalLink,
                                variant: 'primary',
                                hidden: isWaitingHandover,
                                onClick: () => {
                                    setTrackingRecord(rec);
                                    setIsTrackingModalOpen(true);
                                },
                            },
                        ]}
                        moreActions={
                            isWaitingHandover
                                ? []
                                : [
                                      {
                                          key: 'print-handover',
                                          label: 'In biên bản bàn giao',
                                          description: 'Xuất bản in biên bản bàn giao ĐVVC',
                                          icon: Printer,
                                          variant: 'primary',
                                          onClick: () => {
                                              setPrintRecord(rec);
                                              setIsPrintModalOpen(true);
                                          },
                                      },
                                  ]
                        }
                    />
                );
            },
        },
    ];

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = useMemo(() => {
        const fields: FilterField[] = [];

        // Nếu ở tab Đã bàn giao, hiển thị thêm bộ lọc trạng thái vận chuyển và ĐVVC
        if (activeTab === 'handed_over') {
            fields.push({
                id: 'status',
                label: 'Trạng thái vận chuyển',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Clock,
                options: [
                    { label: 'Đã bàn giao ĐVVC (HANDED_OVER_TO_CARRIER)', value: 'HANDED_OVER_TO_CARRIER' },
                    { label: 'Đang phát hàng (OUT_FOR_DELIVERY)', value: 'OUT_FOR_DELIVERY' },
                    { label: 'Giao thành công & Hoàn tất (COMPLETED)', value: 'COMPLETED' },
                ],
            });

            fields.push({
                id: 'carrier',
                label: 'Đơn vị vận chuyển',
                type: 'select',
                placeholder: 'Tất cả ĐVVC',
                icon: Truck,
                options: POPULAR_LOGISTICS_CARRIERS.map((c) => ({
                    label: c.name,
                    value: c.name,
                })),
            });
        }

        fields.push({
            id: 'type',
            label: 'Hình thức mua',
            type: 'select',
            placeholder: 'Tất cả hình thức',
            icon: Tag,
            options: [
                { label: 'Trực tuyến (ONLINE)', value: 'ONLINE' },
                { label: 'Bán tại quầy (IN_STORE)', value: 'IN_STORE' },
            ],
        });

        fields.push({
            id: 'fromDate',
            label: 'Từ ngày đặt',
            type: 'date',
            icon: Calendar,
        });

        fields.push({
            id: 'toDate',
            label: 'Đến ngày đặt',
            type: 'date',
            icon: Calendar,
        });

        return fields;
    }, [activeTab]);

    // Filter values passed to AdminFilter (chỉ truyền các giá trị đang kích hoạt thực tế)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (activeTab === 'handed_over') {
            if (statusFilter && statusFilter !== 'ALL') vals.status = statusFilter;
            if (carrierFilter && carrierFilter !== 'ALL') vals.carrier = carrierFilter;
        }
        if (typeFilter && typeFilter !== 'ALL') vals.type = typeFilter;
        if (fromDate) vals.fromDate = fromDate;
        if (toDate) vals.toDate = toDate;
        return vals;
    }, [activeTab, statusFilter, carrierFilter, typeFilter, fromDate, toDate]);

    // Xử lý thay đổi bộ lọc
    const handleFilterChange = (newValues: Record<string, any>) => {
        setCarrierFilter(newValues.carrier || 'ALL');
        setStatusFilter(newValues.status || 'ALL');
        setTypeFilter(newValues.type || 'ALL');
        setFromDate(newValues.fromDate || '');
        setToDate(newValues.toDate || '');
        setCurrentPage(1);
    };

    // Đặt lại toàn bộ bộ lọc
    const handleResetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setCarrierFilter('ALL');
        setStatusFilter('ALL');
        setTypeFilter('ALL');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    const handedOverTotal = stats.handedOver + stats.outForDelivery + stats.completed;

    return (
        <div className="space-y-5">
            {/* ======================================================== */}
            {/* HEADER                                                   */}
            {/* ======================================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý đơn bàn giao
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.waitingHandover} chờ bàn giao · {handedOverTotal} đã bàn giao ĐVVC
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* TABS CHUYỂN ĐỔI                                          */}
            {/* ======================================================== */}
            <div className="flex border-b border-slate-200 gap-6">
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('waiting_handover');
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                    }}
                    className={`pb-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors cursor-pointer ${
                        activeTab === 'waiting_handover'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <span>Đơn chờ bàn giao</span>
                    <span
                        className={`text-xs px-1.5 py-0.5 rounded-md font-medium tabular-nums ${
                            activeTab === 'waiting_handover'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        {stats.waitingHandover}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('handed_over');
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                    }}
                    className={`pb-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors cursor-pointer ${
                        activeTab === 'handed_over'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <span>Đã bàn giao</span>
                    <span
                        className={`text-xs px-1.5 py-0.5 rounded-md font-medium tabular-nums ${
                            activeTab === 'handed_over'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        {handedOverTotal}
                    </span>
                </button>
            </div>

            {/* ======================================================== */}
            {/* FILTER & TABLE                                           */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <AdminFilter
                    searchQuery={searchQuery}
                    onSearchChange={(q) => {
                        setSearchQuery(q);
                        setCurrentPage(1);
                    }}
                    onSearch={(q) => {
                        setSearchQuery(q);
                        setDebouncedSearch(q);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Tìm kiếm theo mã đơn, mã vận đơn, khách hàng, số điện thoại, tài xế..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />

                <AdminTable
                    columns={columns}
                    data={paginatedRecords}
                    loading={isLoading}
                    rowKey="orderId"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 15, 20, 50]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    emptyText={
                        activeTab === 'waiting_handover'
                            ? 'Hiện không có kiện hàng nào đang chờ bàn giao cho ĐVVC phù hợp với bộ lọc'
                            : 'Chưa có đơn hàng nào đã bàn giao phù hợp với bộ lọc'
                    }
                />
            </div>

            {/* ======================================================== */}
            {/* MODAL BÀN GIAO ĐƠN HÀNG CHO ĐVVC NGOÀI HỆ THỐNG          */}
            {/* ======================================================== */}
            <AdminModal
                isOpen={isHandoverModalOpen && !!targetRecord}
                onClose={() => setIsHandoverModalOpen(false)}
                title={`Bàn giao đơn hàng cho ĐVVC: ${targetRecord?.orderCode || ''}`}
                subtitle="Đơn vị vận chuyển là đối tác dịch vụ bên ngoài hệ thống"
                icon={Truck}
                size="lg"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
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
                        >
                            Xác nhận bàn giao
                        </AdminButton>
                    </div>
                }
            >
                {targetRecord && (
                    <div className="space-y-4 text-xs">
                        {/* Tóm tắt kiện hàng bàn giao */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5">
                            <div>
                                <div className="text-[11px] text-slate-500">Người nhận</div>
                                <div className="font-medium text-slate-900 truncate">
                                    {targetRecord.recipientName}
                                </div>
                                <div className="text-slate-500 tabular-nums">{targetRecord.recipientPhone}</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-slate-500">Kiện hàng & Serial</div>
                                <div className="font-medium text-slate-900 tabular-nums">
                                    {targetRecord.assignedSerials.length} mã serial niêm phong
                                </div>
                                <div className="text-slate-500 tabular-nums">
                                    Trọng lượng: {targetRecord.boxWeightKg || 3} kg
                                </div>
                            </div>
                            <div className="sm:text-right">
                                <div className="text-[11px] text-slate-500">Giá trị đơn hàng</div>
                                <div className="font-semibold text-slate-900 tabular-nums">
                                    {formatVND(targetRecord.finalAmount)}
                                </div>
                                <div className="text-slate-500 tabular-nums">
                                    Đóng gói: {formatDateTime(targetRecord.packedAt)}
                                </div>
                            </div>
                        </div>

                        {/* Chọn ĐVVC ngoài hệ thống - Thẻ select */}
                        <div>
                            <AdminSelect
                                label="Đơn vị vận chuyển"
                                required
                                value={selectedCarrier}
                                onChange={(e) => handleCarrierChange(e.target.value)}
                                className="font-medium"
                                helperText={(() => {
                                    const c = POPULAR_LOGISTICS_CARRIERS.find((item) => item.name === selectedCarrier);
                                    return c ? `Hotline đối tác: ${c.hotline} · Thời gian toàn trình ước tính: ${c.estimatedHours}` : undefined;
                                })()}
                            >
                                {POPULAR_LOGISTICS_CARRIERS.map((c) => (
                                    <option key={c.code} value={c.name}>
                                        {c.name} ({c.code}) - Hotline: {c.hotline}
                                    </option>
                                ))}
                            </AdminSelect>
                        </div>

                        {/* Mã vận đơn (Tracking Code) */}
                        <div>
                            <AdminLabel required>
                                Mã vận đơn
                            </AdminLabel>
                            <AdminInput
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Nhập mã vận đơn (VD: VTP-8849201948VN, GHTK-990142851)..."
                                className="font-mono font-semibold tabular-nums"
                            />
                        </div>

                        {/* Thông tin thủ kho bàn giao */}
                        <div>
                            <AdminLabel>
                                Nhân viên kho thực hiện bàn giao
                            </AdminLabel>
                            <AdminInput
                                type="text"
                                value={handoverStaff}
                                onChange={(e) => setHandoverStaff(e.target.value)}
                                className="font-medium bg-slate-50 text-slate-700"
                                helperText="Tự động cập nhật theo tài khoản nhân viên đang đăng nhập"
                            />
                        </div>

                        <div>
                            <AdminLabel>
                                Ghi chú biên bản bàn giao
                            </AdminLabel>
                            <AdminTextarea
                                rows={2}
                                value={handoverNotes}
                                onChange={(e) => setHandoverNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* ======================================================== */}
            {/* MODAL IN BIÊN BẢN BÀN GIAO HÀNG HÓA CHO ĐVVC             */}
            {/* ======================================================== */}
            {isPrintModalOpen && printRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Biên bản bàn giao hàng hóa: ${printRecord.orderCode}`}
                            icon={Printer}
                            onClose={() => setIsPrintModalOpen(false)}
                        />

                        {/* Mẫu biên bản bàn giao in ấn */}
                        <div className="p-6 bg-white space-y-5 text-slate-900 border border-dashed border-slate-300 m-4 rounded-md overflow-y-auto flex-1">
                            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                                <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">
                                    Biên bản bàn giao hàng hóa cho đơn vị vận chuyển
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Áp dụng dịch vụ vận chuyển bên thứ ba (3PL)
                                </p>
                                <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-slate-700 mt-2 tabular-nums">
                                    <span>Mã đơn: <strong className="text-slate-900">{printRecord.orderCode}</strong></span>
                                    <span className="text-slate-300">|</span>
                                    <span>Mã vận đơn: <strong className="text-slate-900">{printRecord.carrierInfo?.trackingNumber}</strong></span>
                                </div>
                            </div>

                            {/* Thông tin 2 bên */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-md border border-slate-200">
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-medium text-slate-500 uppercase">Bên giao (Cửa hàng)</div>
                                    <div className="font-semibold text-slate-900">PCStore Việt Nam Center</div>
                                    <div className="text-slate-600">Thủ kho: {printRecord.carrierInfo?.handoverStaffName}</div>
                                    <div className="text-slate-600 tabular-nums">Thời gian: {formatDateTime(printRecord.carrierInfo?.handoverAt)}</div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-medium text-slate-500 uppercase">Bên nhận (ĐVVC ngoài)</div>
                                    <div className="font-semibold text-slate-900">{printRecord.carrierInfo?.carrierName}</div>
                                    <div className="text-slate-600">Tài xế: {printRecord.carrierInfo?.driverName}</div>
                                    <div className="text-slate-600 tabular-nums">
                                        SĐT: {printRecord.carrierInfo?.driverPhone} · Xe: {printRecord.carrierInfo?.licensePlate}
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách linh kiện kèm serial */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-900">Chi tiết kiện hàng bàn giao</div>
                                <div className="border border-slate-200 rounded-md overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium w-10">#</th>
                                                <th className="px-3 py-2 text-left font-medium">Tên sản phẩm</th>
                                                <th className="px-3 py-2 text-left font-medium">Mã Serial niêm phong</th>
                                                <th className="px-3 py-2 text-right font-medium">Giá trị</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {printRecord.assignedSerials.map((s, idx) => (
                                                <tr key={s.serialNumber}>
                                                    <td className="px-3 py-2 text-slate-500 tabular-nums">{idx + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-slate-900">{s.productName}</td>
                                                    <td className="px-3 py-2 font-mono font-medium text-slate-700 tabular-nums">{s.serialNumber}</td>
                                                    <td className="px-3 py-2 text-right text-slate-900 tabular-nums">{formatVND(s.productPrice)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Quy cách và cam kết */}
                            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1">
                                <div className="tabular-nums">
                                    <strong className="text-slate-900">Quy cách:</strong> Đóng thùng xốp, dán tem niêm phong PCStore. Trọng lượng: {printRecord.boxWeightKg || 3} kg.
                                </div>
                                <div>
                                    <strong className="text-slate-900">Cam kết:</strong> ĐVVC ngoài xác nhận kiện hàng còn nguyên vẹn tem niêm phong, không cấn móp, cam kết giao đến đúng địa chỉ người nhận.
                                </div>
                            </div>

                            {/* Chữ ký 2 bên */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs text-center">
                                <div className="space-y-10">
                                    <p className="font-medium text-slate-600">Đại diện bên giao (Thủ kho)</p>
                                    <p className="font-semibold text-slate-900">{printRecord.carrierInfo?.handoverStaffName}</p>
                                </div>
                                <div className="space-y-10">
                                    <p className="font-medium text-slate-600">Đại diện bên nhận</p>
                                    <p className="font-semibold text-slate-900">{printRecord.carrierInfo?.driverName}</p>
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Lộ trình vận chuyển: ${trackingRecord.carrierInfo?.carrierName}`}
                            subtitle={`Mã vận đơn: ${trackingRecord.carrierInfo?.trackingNumber} · Đơn: ${trackingRecord.orderCode}`}
                            icon={Truck}
                            onClose={() => setIsTrackingModalOpen(false)}
                        />

                        <div className="p-5 overflow-y-auto space-y-5 flex-1">
                            {/* Thông tin đối tác ĐVVC */}
                            <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-0.5">
                                    <div className="text-[11px] text-slate-500 uppercase font-medium">Đối tác vận chuyển</div>
                                    <div className="font-semibold text-slate-900 text-sm">
                                        {trackingRecord.carrierInfo?.carrierName}
                                    </div>
                                    <div className="text-slate-600 font-mono tabular-nums">
                                        Mã vận đơn: <strong className="text-slate-900">{trackingRecord.carrierInfo?.trackingNumber}</strong>
                                    </div>
                                    <div className="text-slate-600 tabular-nums">
                                        Hotline: {trackingRecord.carrierInfo?.carrierHotline || '1900 8095'}
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[11px] text-slate-500 uppercase font-medium">Tài xế giao nhận</div>
                                    <div className="font-semibold text-slate-900">{trackingRecord.carrierInfo?.driverName}</div>
                                    <div className="text-slate-600 tabular-nums">SĐT: {trackingRecord.carrierInfo?.driverPhone}</div>
                                    <div className="text-slate-600 tabular-nums">
                                        Biển số: {trackingRecord.carrierInfo?.licensePlate || 'Chưa cập nhật'}
                                    </div>
                                </div>
                            </div>

                            {/* Lộ trình Timeline */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-slate-900">
                                        Tiến trình giao hàng ({trackingRecord.carrierTimeline.length})
                                    </h3>
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setIsSimulateEventModalOpen(true)}
                                    >
                                        + Cập nhật tiến độ ĐVVC
                                    </AdminButton>
                                </div>

                                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                    {trackingRecord.carrierTimeline.map((evt, idx) => (
                                        <div key={evt.id || idx} className="p-3.5 text-xs space-y-1">
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
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-3.5 text-[11px] text-slate-500">
                                                {evt.location && (
                                                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        <span>{evt.location}</span>
                                                    </span>
                                                )}
                                                <span>
                                                    Ghi nhận bởi: {evt.actorRole} {evt.actorName ? `(${evt.actorName})` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                            {trackingRecord.fulfillmentStatus !== 'COMPLETED' && (
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={() => handleConfirmCustomerDelivery(trackingRecord)}
                                    className="!bg-emerald-600 hover:!bg-emerald-700"
                                >
                                    Hoàn tất đơn hàng
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
                <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-xl w-full max-h-[88vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title="Cập nhật tiến độ từ ĐVVC ngoài"
                            icon={Send}
                            onClose={() => setIsSimulateEventModalOpen(false)}
                        />

                        <div className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
                            <p className="text-slate-600">
                                Mô phỏng thông điệp phản hồi / webhook từ hệ thống bưu cục của{' '}
                                <strong className="text-slate-900">{trackingRecord.carrierInfo?.carrierName}</strong>.
                            </p>

                            <div>
                                <AdminLabel>Tiêu đề trạng thái</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={simEventTitle}
                                    onChange={(e) => setSimEventTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Vị trí hiện tại</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={simEventLocation}
                                    onChange={(e) => setSimEventLocation(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Mô tả chi tiết</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={simEventDesc}
                                    onChange={(e) => setSimEventDesc(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Cập nhật trạng thái đơn</AdminLabel>
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

                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
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
