import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Package,
    Barcode,
    Search,
    RefreshCw,
    Printer,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Check,
    ArrowRight,
    Copy,
    Tag,
    Truck,
    User,
    Phone,
    MapPin,
    Calendar,
    Sparkles,
    Eye,
    QrCode,
    FileText,
    ShieldCheck,
    CheckSquare,
    Square,
    ChevronRight,
    Layers,
    DollarSign,
    Filter,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import {
    AdminModal,
    type ModalTab,
    AdminModalHeader,
    AdminModalFooter,
    AdminLabel,
    AdminInput,
    AdminSelect,
    AdminTextarea,
    AdminButton,
} from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { orderFulfillmentService } from '../../../services/orderFulfillmentService';
import { adminOrderService } from '../../../services/adminOrderService';
import type {
    OrderFulfillmentRecord,
    OrderFulfillmentStatus,
    AssignedOrderSerialItem,
} from '../../../types/orderFulfillment';
import { FULFILLMENT_STATUS_MAP } from '../../../types/orderFulfillment';
import type { OrderResponse } from '../../../types/adminOrder';

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

export default function PackagingList() {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Data State
    const [fulfillments, setFulfillments] = useState<OrderFulfillmentRecord[]>([]);
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Search & Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [serialFilter, setSerialFilter] = useState<string>('ALL');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Stepper workflow toggle
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

    // Modal Soạn hàng FIFO & Đóng gói
    const [isPackingModalOpen, setIsPackingModalOpen] = useState(false);
    const [targetRecord, setTargetRecord] = useState<OrderFulfillmentRecord | null>(null);
    const [targetOrder, setTargetOrder] = useState<OrderResponse | null>(null);

    // State khi thực hiện đóng gói
    const [warehouseStaff, setWarehouseStaff] = useState('Lê Kho Vận (Thủ kho)');
    const [packingNotes, setPackingNotes] = useState('Lấy đúng serial theo nguyên tắc FIFO nhập trước xuất trước, bọc 2 lớp xốp bong bóng khí và dán tem niêm phong.');
    const [boxDimensions, setBoxDimensions] = useState('45 x 35 x 25 cm');
    const [boxWeight, setBoxWeight] = useState<number>(3.2);
    const [checklist, setChecklist] = useState({
        inspectedAppearance: true,
        testedPowerAccessories: true,
        bubbleWrapProtected: true,
        securityTapeSealed: true,
        fragileLabelApplied: true,
    });

    // Quét và gán mã serial
    const [activeSerials, setActiveSerials] = useState<AssignedOrderSerialItem[]>([]);
    const [inputBarcode, setInputBarcode] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<number>(0);
    const [fifoSuggestions, setFifoSuggestions] = useState<any[]>([]);
    const [isLoadingFifo, setIsLoadingFifo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal In phiếu đóng gói
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printRecord, setPrintRecord] = useState<OrderFulfillmentRecord | null>(null);

    // Copy helper
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

    /**
     * Tải dữ liệu ban đầu
     */
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const records = orderFulfillmentService.getFulfillments();
            setFulfillments(records);

            // Tải thêm orders từ backend nếu có
            try {
                const res = await adminOrderService.getAllOrders({ size: 100 });
                if (res?.content) {
                    setOrders(res.content);
                    // Đảm bảo mỗi backend order đều có fulfillment
                    res.content.forEach((ord) => {
                        orderFulfillmentService.ensureFulfillmentRecord(ord);
                    });
                    setFulfillments(orderFulfillmentService.getFulfillments());
                }
            } catch (err) {
                console.warn('Lấy đơn từ backend gặp lỗi, dùng dữ liệu fulfillment cục bộ:', err);
            }
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải danh sách đóng gói đơn hàng');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Thống kê nhanh cho thủ kho
    const stats = useMemo(() => {
        let readyToPack = 0;
        let packingInProgress = 0;
        let packedWaitingHandover = 0;
        let handedOverToCarrier = 0;
        let totalAssignedSerials = 0;
        let totalPackaging = 0;

        fulfillments.forEach((r) => {
            const isPackagingStage =
                r.fulfillmentStatus === 'READY_TO_PACK' ||
                r.fulfillmentStatus === 'PACKING_IN_PROGRESS' ||
                r.fulfillmentStatus === 'PACKED_WAITING_HANDOVER' ||
                r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER';

            if (isPackagingStage) {
                totalPackaging++;
            }
            if (r.fulfillmentStatus === 'READY_TO_PACK') readyToPack++;
            if (r.fulfillmentStatus === 'PACKING_IN_PROGRESS') packingInProgress++;
            if (r.fulfillmentStatus === 'PACKED_WAITING_HANDOVER') packedWaitingHandover++;
            if (r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER') handedOverToCarrier++;
            totalAssignedSerials += r.assignedSerials?.length || 0;
        });

        return {
            readyToPack,
            packingInProgress,
            packedWaitingHandover,
            handedOverToCarrier,
            totalAssignedSerials,
            totalPackaging,
        };
    }, [fulfillments]);

    // Quick status navigation tabs
    const statusTabs = useMemo(
        () => [
            {
                key: 'ALL',
                label: 'Tất cả đơn đóng gói',
                icon: Layers,
                count: stats.totalPackaging,
            },
            {
                key: 'READY_TO_PACK',
                label: 'Chờ đóng gói',
                icon: Clock,
                count: stats.readyToPack,
            },
            {
                key: 'PACKING_IN_PROGRESS',
                label: 'Đang soạn hàng FIFO',
                icon: Barcode,
                count: stats.packingInProgress,
            },
            {
                key: 'PACKED_WAITING_HANDOVER',
                label: 'Đã đóng gói xong',
                icon: Package,
                count: stats.packedWaitingHandover,
            },
            {
                key: 'HANDED_OVER_TO_CARRIER',
                label: 'Đã bàn giao ĐVVC',
                icon: Truck,
                count: stats.handedOverToCarrier,
            },
        ],
        [stats]
    );

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = useMemo(
        () => [
            {
                id: 'status',
                label: 'Trạng thái đóng gói',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Clock,
                options: [
                    { label: 'Chờ đóng gói (READY_TO_PACK)', value: 'READY_TO_PACK' },
                    { label: 'Đang soạn hàng FIFO (PACKING_IN_PROGRESS)', value: 'PACKING_IN_PROGRESS' },
                    { label: 'Đã đóng gói - Chờ bàn giao (PACKED_WAITING_HANDOVER)', value: 'PACKED_WAITING_HANDOVER' },
                    { label: 'Đã bàn giao cho ĐVVC (HANDED_OVER_TO_CARRIER)', value: 'HANDED_OVER_TO_CARRIER' },
                ],
            },
            {
                id: 'type',
                label: 'Loại đơn hàng',
                type: 'select',
                placeholder: 'Tất cả loại đơn',
                icon: Tag,
                options: [
                    { label: 'Trực tuyến (ONLINE)', value: 'ONLINE' },
                    { label: 'Bán tại quầy (IN_STORE)', value: 'IN_STORE' },
                ],
            },
            {
                id: 'serialStatus',
                label: 'Tình trạng Serial FIFO',
                type: 'select',
                placeholder: 'Tất cả tình trạng',
                icon: Barcode,
                options: [
                    { label: 'Đã gán mã Serial', value: 'ASSIGNED' },
                    { label: 'Chưa gán Serial (Cần quét FIFO)', value: 'UNASSIGNED' },
                ],
            },
            {
                id: 'fromDate',
                label: 'Từ ngày đặt',
                type: 'date',
                icon: Calendar,
            },
            {
                id: 'toDate',
                label: 'Đến ngày đặt',
                type: 'date',
                icon: Calendar,
            },
        ],
        []
    );

    // Active filter values passed to AdminFilter (only truly active filters)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (statusFilter && statusFilter !== 'ALL') {
            vals.status = statusFilter;
        }
        if (typeFilter && typeFilter !== 'ALL') {
            vals.type = typeFilter;
        }
        if (serialFilter && serialFilter !== 'ALL') {
            vals.serialStatus = serialFilter;
        }
        if (fromDate) {
            vals.fromDate = fromDate;
        }
        if (toDate) {
            vals.toDate = toDate;
        }
        return vals;
    }, [statusFilter, typeFilter, serialFilter, fromDate, toDate]);

    // Handle filter changes from AdminFilter (dropdowns, chips, clear button)
    const handleFilterChange = (newValues: Record<string, any>) => {
        setStatusFilter(newValues.status || 'ALL');
        setTypeFilter(newValues.type || 'ALL');
        setSerialFilter(newValues.serialStatus || 'ALL');
        setFromDate(newValues.fromDate || '');
        setToDate(newValues.toDate || '');
        setCurrentPage(1);
    };

    // Handle complete filter reset
    const handleResetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setStatusFilter('ALL');
        setTypeFilter('ALL');
        setSerialFilter('ALL');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    // Lọc danh sách đơn phù hợp với trang Đóng gói kho:
    // Hiển thị các đơn ở Giai đoạn 3 (READY_TO_PACK, PACKING_IN_PROGRESS, PACKED_WAITING_HANDOVER, HANDED_OVER_TO_CARRIER) hoặc theo bộ lọc
    const filteredRecords = useMemo(() => {
        return fulfillments.filter((r) => {
            // Bộ lọc search
            const q = debouncedSearch.toLowerCase().trim();
            if (q) {
                const matchOrderCode = r.orderCode?.toLowerCase().includes(q);
                const matchCustomer = r.customerName?.toLowerCase().includes(q);
                const matchCustomerPhone = r.customerPhone?.includes(q);
                const matchRecipient = r.recipientName?.toLowerCase().includes(q);
                const matchRecipientPhone = r.recipientPhone?.includes(q);
                const matchAddress = r.address?.toLowerCase().includes(q);
                const matchStaff = r.warehouseStaffName?.toLowerCase().includes(q);
                const matchSerial = r.assignedSerials?.some(
                    (s) =>
                        s.serialNumber?.toLowerCase().includes(q) ||
                        s.productName?.toLowerCase().includes(q) ||
                        s.productCode?.toLowerCase().includes(q)
                );

                if (
                    !matchOrderCode &&
                    !matchCustomer &&
                    !matchCustomerPhone &&
                    !matchRecipient &&
                    !matchRecipientPhone &&
                    !matchAddress &&
                    !matchStaff &&
                    !matchSerial
                ) {
                    return false;
                }
            }

            // Bộ lọc status
            if (statusFilter === 'ALL') {
                const isPackagingStage =
                    r.fulfillmentStatus === 'READY_TO_PACK' ||
                    r.fulfillmentStatus === 'PACKING_IN_PROGRESS' ||
                    r.fulfillmentStatus === 'PACKED_WAITING_HANDOVER' ||
                    r.fulfillmentStatus === 'HANDED_OVER_TO_CARRIER';
                if (!isPackagingStage) return false;
            } else if (r.fulfillmentStatus !== statusFilter) {
                return false;
            }

            // Bộ lọc loại đơn
            if (typeFilter && typeFilter !== 'ALL' && r.orderType !== typeFilter) {
                return false;
            }

            // Bộ lọc tình trạng Serial
            if (serialFilter === 'ASSIGNED') {
                if (!r.assignedSerials || r.assignedSerials.length === 0) return false;
            } else if (serialFilter === 'UNASSIGNED') {
                if (r.assignedSerials && r.assignedSerials.length > 0) return false;
            }

            // Bộ lọc khoảng thời gian
            if (fromDate) {
                const orderTime = new Date(r.createdAt).getTime();
                const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
                if (!isNaN(orderTime) && !isNaN(fromTime) && orderTime < fromTime) {
                    return false;
                }
            }

            if (toDate) {
                const orderTime = new Date(r.createdAt).getTime();
                const toTime = new Date(`${toDate}T23:59:59`).getTime();
                if (!isNaN(orderTime) && !isNaN(toTime) && orderTime > toTime) {
                    return false;
                }
            }

            return true;
        });
    }, [fulfillments, debouncedSearch, statusFilter, typeFilter, serialFilter, fromDate, toDate]);

    // Phân trang danh sách đơn đóng gói
    const totalElements = filteredRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage, pageSize]);

    /**
     * Mở Modal Soạn hàng FIFO & Đóng gói
     */
    const handleOpenPackingModal = async (record: OrderFulfillmentRecord) => {
        setTargetRecord(record);
        setActiveSerials([...record.assignedSerials]);
        setInputBarcode('');
        setWarehouseStaff(record.warehouseStaffName || 'Lê Kho Vận (Thủ kho)');
        setPackingNotes(record.packingNotes || 'Lấy đúng serial theo nguyên tắc FIFO nhập trước xuất trước, bọc 2 lớp xốp bong bóng khí và dán tem niêm phong.');
        setBoxDimensions(record.boxDimensionsCm || '45 x 35 x 25 cm');
        setBoxWeight(record.boxWeightKg || 3.2);

        // Lấy chi tiết order từ backend để có danh sách items
        let orderObj: OrderResponse | undefined = orders.find((o) => o.id === record.orderId);
        if (!orderObj) {
            try {
                orderObj = await adminOrderService.getOrderById(record.orderId);
            } catch {
                // Mock items nếu backend không phản hồi
                orderObj = {
                    id: record.orderId,
                    code: record.orderCode,
                    userId: 1,
                    recipientName: record.recipientName,
                    recipientPhone: record.recipientPhone,
                    address: record.address,
                    type: record.orderType,
                    totalAmount: record.totalAmount,
                    discountAmount: 0,
                    finalAmount: record.finalAmount,
                    status: record.backendStatus,
                    items: [
                        {
                            id: 1,
                            productId: 1,
                            productCode: 'MB-ASUS-Z790-ROG',
                            productName: 'Mainboard ASUS ROG MAXIMUS Z790 HERO',
                            quantity: 1,
                            unitPrice: 16500000,
                            discountAmount: 0,
                            subtotal: 16500000,
                        },
                    ],
                };
            }
        }
        setTargetOrder(orderObj);

        // Tự động load gợi ý FIFO cho sản phẩm đầu tiên
        if (orderObj?.items && orderObj.items.length > 0) {
            const firstProd = orderObj.items[0];
            setSelectedProductId(firstProd.productId);
            loadFifoForProduct(firstProd.productId, firstProd.quantity);
        }

        setIsPackingModalOpen(true);
    };

    /**
     * Tải danh sách Serial theo nguyên tắc FIFO cho sản phẩm
     */
    const loadFifoForProduct = async (prodId: number, qtyNeeded: number) => {
        setIsLoadingFifo(true);
        try {
            const list = await orderFulfillmentService.getFifoAvailableSerials(prodId, qtyNeeded);
            setFifoSuggestions(list);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingFifo(false);
        }
    };

    /**
     * Gán nhanh các Serial theo nguyên tắc FIFO
     */
    const handleApplyFifoSerials = (prod: any) => {
        if (!targetRecord) return;
        const needed = prod.quantity;
        const currentForProd = activeSerials.filter((s) => s.productId === prod.productId).length;
        const stillNeeded = needed - currentForProd;

        if (stillNeeded <= 0) {
            toast.info(`Sản phẩm ${prod.productName} đã được gán đủ ${needed} serial.`);
            return;
        }

        const availableFifo = fifoSuggestions.filter(
            (f) => !activeSerials.some((a) => a.serialNumber === f.serialNumber)
        );

        const toAdd = availableFifo.slice(0, stillNeeded);
        if (toAdd.length === 0) {
            toast.warning('Không còn serial FIFO khả dụng nào khác cho sản phẩm này.');
            return;
        }

        const newItems: AssignedOrderSerialItem[] = toAdd.map((s, idx) => ({
            id: `ser-${targetRecord.orderId}-${prod.productId}-${Date.now()}-${idx}`,
            orderId: targetRecord.orderId,
            orderCode: targetRecord.orderCode,
            orderItemId: prod.id,
            productId: prod.productId,
            productName: prod.productName,
            productCode: prod.productCode,
            productPrice: prod.unitPrice,
            serialId: s.serialId,
            serialNumber: s.serialNumber,
            goodsReceiptCode: s.receiptCode,
            receiptDate: s.receiptDate,
            warehouseLocation: s.warehouseLocation,
            assignedAt: new Date().toISOString(),
            assignedBy: warehouseStaff,
            status: 'PACKED',
        }));

        setActiveSerials((prev) => [...prev, ...newItems]);
        toast.success(`Đã tự động gán ${newItems.length} mã Serial theo nguyên tắc FIFO (Nhập trước - Xuất trước)!`);
    };

    /**
     * Quét barcode / Nhập mã Serial thủ công
     */
    const handleAddManualSerial = () => {
        if (!inputBarcode.trim() || !targetRecord || !targetOrder) return;
        const code = inputBarcode.trim().toUpperCase();

        if (activeSerials.some((s) => s.serialNumber.toUpperCase() === code)) {
            toast.warning(`Mã serial ${code} đã được quét vào đơn hàng này!`);
            return;
        }

        const prod = targetOrder.items.find((p) => p.productId === selectedProductId) || targetOrder.items[0];
        if (!prod) {
            toast.error('Vui lòng chọn sản phẩm tương ứng với mã Serial cần quét.');
            return;
        }

        const currentCount = activeSerials.filter((s) => s.productId === prod.productId).length;
        if (currentCount >= prod.quantity) {
            toast.warning(`Sản phẩm "${prod.productName}" đã đủ số lượng yêu cầu (${prod.quantity} chiếc).`);
            return;
        }

        // Tìm xem serial này có trong gợi ý FIFO không để lấy thêm thông tin phiếu nhập
        const matchedFifo = fifoSuggestions.find((f) => f.serialNumber.toUpperCase() === code);

        const newSerialItem: AssignedOrderSerialItem = {
            id: `ser-${targetRecord.orderId}-${prod.productId}-${Date.now()}`,
            orderId: targetRecord.orderId,
            orderCode: targetRecord.orderCode,
            orderItemId: prod.id,
            productId: prod.productId,
            productName: prod.productName,
            productCode: prod.productCode,
            productPrice: prod.unitPrice,
            serialId: matchedFifo?.serialId,
            serialNumber: code,
            goodsReceiptCode: matchedFifo?.receiptCode || 'GR-KHO-TON',
            receiptDate: matchedFifo?.receiptDate || '15/10/2026',
            warehouseLocation: matchedFifo?.warehouseLocation || 'Kệ A1 - Ô 05',
            assignedAt: new Date().toISOString(),
            assignedBy: warehouseStaff,
            status: 'PACKED',
        };

        setActiveSerials((prev) => [...prev, newSerialItem]);
        setInputBarcode('');
        toast.success(`Đã quét & gán thành công Serial: ${code}`);
    };

    /**
     * Xóa 1 serial khỏi danh sách gán
     */
    const handleRemoveAssignedSerial = (serialNumber: string) => {
        setActiveSerials((prev) => prev.filter((s) => s.serialNumber !== serialNumber));
    };

    /**
     * Xác nhận đóng gói hoàn tất (Giai đoạn 3: Bước 4)
     */
    const handleConfirmPackaging = async () => {
        if (!targetRecord || !targetOrder) return;

        // Kiểm tra xem đã gán đủ serial cho từng sản phẩm chưa
        for (const item of targetOrder.items) {
            const count = activeSerials.filter((s) => s.productId === item.productId).length;
            if (count < item.quantity) {
                toast.error(
                    `Sản phẩm "${item.productName}" cần ${item.quantity} serial, hiện mới quét ${count}. Vui lòng quét đủ serial theo nguyên tắc FIFO!`
                );
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const updated = await orderFulfillmentService.confirmPackaging(targetRecord.orderId, {
                warehouseStaffName: warehouseStaff,
                assignedSerials: activeSerials,
                packingNotes,
                boxWeightKg: boxWeight,
                boxDimensionsCm: boxDimensions,
            });

            toast.success(
                `Đã xác nhận đóng gói thành công đơn ${targetRecord.orderCode}! Trạng thái chuyển sang "Chờ bàn giao ĐVVC".`
            );
            setIsPackingModalOpen(false);
            loadData();

            // Mở modal in phiếu đóng gói cho thủ kho
            setPrintRecord(updated);
            setIsPrintModalOpen(true);
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi xác nhận đóng gói');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Sao chép mã
     */
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSerial(text);
        setTimeout(() => setCopiedSerial(null), 2000);
        toast.success(`Đã sao chép: ${text}`);
    };

    // Columns cho AdminTable
    const columns: Column<OrderFulfillmentRecord>[] = [
        {
            key: 'orderCode',
            header: 'Mã đơn hàng',
            render: (rec) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 font-mono">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span>{rec.orderCode}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatDateTime(rec.createdAt)}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng & Địa chỉ giao',
            render: (rec) => (
                <div className="space-y-1 max-w-xs">
                    <div className="font-semibold text-gray-800 flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{rec.customerName}</span>
                        <span className="text-gray-400">({rec.customerPhone})</span>
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-1 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <span>{rec.address}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'assignedSerials',
            header: 'Mã Serial gán (FIFO)',
            render: (rec) => {
                if (!rec.assignedSerials || rec.assignedSerials.length === 0) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Chờ quét Serial FIFO</span>
                        </span>
                    );
                }
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã gán {rec.assignedSerials.length} serial</span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                            {rec.assignedSerials.map((s) => (
                                <span
                                    key={s.serialNumber}
                                    className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
                                    title={`Ngày nhập: ${s.receiptDate || 'FIFO'} | Phiếu: ${s.goodsReceiptCode || 'GR'}`}
                                >
                                    {s.serialNumber}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            },
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
                            Phụ trách: {conf.responsibleRole}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'finalAmount',
            header: 'Giá trị đơn',
            render: (rec) => (
                <div className="font-bold text-gray-900 font-mono text-xs">
                    {formatVND(rec.finalAmount)}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác kho',
            render: (rec) => (
                <div className="flex items-center gap-1.5">
                    {rec.fulfillmentStatus === 'READY_TO_PACK' || rec.fulfillmentStatus === 'PACKING_IN_PROGRESS' ? (
                        <button
                            type="button"
                            onClick={() => handleOpenPackingModal(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>Soạn & Đóng gói</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setPrintRecord(rec);
                                setIsPrintModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                        >
                            <Printer className="w-3.5 h-3.5 text-gray-500" />
                            <span>In phiếu</span>
                        </button>
                    )}

                    {rec.fulfillmentStatus === 'PACKED_WAITING_HANDOVER' && (
                        <button
                            type="button"
                            onClick={() => navigate('/admin/warehouse/handover')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all cursor-pointer"
                            title="Chuyển sang trang Bàn giao ĐVVC"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Bàn giao ĐVVC</span>
                        </button>
                    )}
                </div>
            ),
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
                        <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                            <Box className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý đóng gói hàng hóa (Packaging Management)
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* STAT CARDS (CLICK TO FILTER)                             */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => {
                        setStatusFilter(statusFilter === 'READY_TO_PACK' ? 'ALL' : 'READY_TO_PACK');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        statusFilter === 'READY_TO_PACK'
                            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
                            : 'border-gray-100 hover:border-amber-200'
                    } flex items-center justify-between`}
                    title="Bấm để lọc đơn chờ đóng gói"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Chờ đóng gói</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.readyToPack}</p>
                        <p className="text-[11px] text-gray-400">Đã thẩm định tồn kho khả dụng</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter(statusFilter === 'PACKING_IN_PROGRESS' ? 'ALL' : 'PACKING_IN_PROGRESS');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        statusFilter === 'PACKING_IN_PROGRESS'
                            ? 'border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-50/20'
                            : 'border-gray-100 hover:border-indigo-200'
                    } flex items-center justify-between`}
                    title="Bấm để lọc đơn đang soạn hàng FIFO"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang soạn hàng FIFO</p>
                        <p className="text-2xl font-bold text-indigo-600">{stats.packingInProgress}</p>
                        <p className="text-[11px] text-gray-400">Kho đang quét mã Serial</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                        <Barcode className="w-6 h-6" />
                    </div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter(statusFilter === 'PACKED_WAITING_HANDOVER' ? 'ALL' : 'PACKED_WAITING_HANDOVER');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        statusFilter === 'PACKED_WAITING_HANDOVER'
                            ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20'
                            : 'border-gray-100 hover:border-purple-200'
                    } flex items-center justify-between`}
                    title="Bấm để lọc đơn đã đóng gói xong"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã đóng gói xong</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.packedWaitingHandover}</p>
                        <p className="text-[11px] text-gray-400">Chờ bàn giao ĐVVC ngoài</p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div
                    onClick={() => {
                        setSerialFilter(serialFilter === 'ASSIGNED' ? 'ALL' : 'ASSIGNED');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        serialFilter === 'ASSIGNED'
                            ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20'
                            : 'border-gray-100 hover:border-emerald-200'
                    } flex items-center justify-between`}
                    title="Bấm để lọc đơn đã gán mã Serial"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Serial đã gán</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.totalAssignedSerials}</p>
                        <p className="text-[11px] text-gray-400">Đã liên kết đúng quy chuẩn FIFO</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* QUICK STATUS PILLS & FILTER SECTION                      */}
            {/* ======================================================== */}
            <div className="space-y-3">
                {/* Horizontal Quick Status Navigation Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {statusTabs.map((tab) => {
                        const isActive = statusFilter === tab.key;
                        const IconComponent = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    setCurrentPage(1);
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                    isActive
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
                                }`}
                            >
                                <IconComponent className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
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
                    onSearch={(q) => {
                        setSearchQuery(q);
                        setDebouncedSearch(q);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Tìm kiếm theo mã đơn, khách hàng, người nhận, số điện thoại, serial..."
                    fields={filterFields}
                    values={filterValues}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />
            </div>

            {/* ======================================================== */}
            {/* MAIN PACKAGING TABLE                                     */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
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
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    emptyText="Không có đơn hàng nào cần đóng gói phù hợp với bộ lọc"
                />
            </div>

            {/* ======================================================== */}
            {/* MODAL SOẠN HÀNG FIFO & ĐÓNG GÓI SẢN PHẨM (GIAI ĐOẠN 3)    */}
            {/* ======================================================== */}
            {isPackingModalOpen && targetRecord && targetOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <AdminModalHeader
                            title={`Soạn hàng theo FIFO & Đóng gói: ${targetRecord.orderCode}`}
                            badge={
                                <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono border border-amber-200">
                                    Giai đoạn 3 (Kho)
                                </span>
                            }
                            subtitle={`Người nhận: ${targetRecord.recipientName} (${targetRecord.recipientPhone}) • ${targetRecord.address}`}
                            icon={Barcode}
                            onClose={() => setIsPackingModalOpen(false)}
                        />

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* BƯỚC 1: TIẾP NHẬN YÊU CẦU ĐÓNG GÓI TỪ BÁN HÀNG */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                        Bước 1: Tiếp nhận thông tin yêu cầu đóng gói từ bộ phận bán hàng
                                    </span>
                                    <span className="text-blue-700 font-mono">
                                        NV thẩm định: {targetRecord.appraisalStaffName || 'Nhân viên bán hàng'}
                                    </span>
                                </div>
                                <p className="text-blue-800">
                                    {targetRecord.appraisalNotes || 'Đã kiểm tra số lượng tồn kho khả dụng đầy đủ đáp ứng, yêu cầu kho tiến hành soạn hàng và đóng gói.'}
                                </p>
                            </div>

                            {/* BƯỚC 2 & 3: SOẠN HÀNG FIFO & QUÉT MÃ SERIAL */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            Bước 2 & 3: Lấy hàng theo nguyên tắc "Nhập trước - Xuất trước" (FIFO) & Quét mã Serial
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Hệ thống ưu tiên hiển thị các mã serial có ngày nhập kho sớm nhất để tránh ứ đọng tồn kho
                                        </p>
                                    </div>
                                </div>

                                {/* Danh sách sản phẩm trong đơn */}
                                <div className="space-y-3">
                                    {targetOrder.items.map((prod) => {
                                        const assignedForThis = activeSerials.filter((s) => s.productId === prod.productId);
                                        const isDone = assignedForThis.length >= prod.quantity;

                                        return (
                                            <div
                                                key={prod.id}
                                                className={`p-4 rounded-xl border transition-all ${isDone
                                                    ? 'bg-emerald-50/50 border-emerald-200'
                                                    : 'bg-white border-indigo-200 shadow-xs'
                                                    }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900 text-sm">
                                                                {prod.productName}
                                                            </span>
                                                            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                                                                {prod.productCode}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            Số lượng yêu cầu: <span className="font-bold text-gray-800">{prod.quantity} chiếc</span> •
                                                            Đơn giá: {formatVND(prod.unitPrice)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isDone
                                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 border-amber-300'
                                                                }`}
                                                        >
                                                            Đã gán: {assignedForThis.length} / {prod.quantity}
                                                        </span>

                                                        <AdminButton
                                                            type="button"
                                                            onClick={() => handleApplyFifoSerials(prod)}
                                                            icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                                                            size="sm"
                                                            title="Tự động chọn các serial nhập sớm nhất"
                                                            className="!px-3 !py-1 text-xs"
                                                        >
                                                            Chọn nhanh theo FIFO
                                                        </AdminButton>
                                                    </div>
                                                </div>

                                                {/* Danh sách gợi ý FIFO cho sản phẩm này */}
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                                    <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                                                        <span>Gợi ý Serial theo nguyên tắc FIFO (Ngày nhập cũ nhất xếp trước):</span>
                                                        {isLoadingFifo && (
                                                            <span className="text-blue-600 flex items-center gap-1">
                                                                <RefreshCw className="w-3 h-3 animate-spin" /> Đang tra cứu FIFO...
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                        {fifoSuggestions
                                                            .filter((f) => !activeSerials.some((a) => a.serialNumber === f.serialNumber))
                                                            .map((f, idx) => (
                                                                <div
                                                                    key={f.serialNumber}
                                                                    onClick={() => {
                                                                        setInputBarcode(f.serialNumber);
                                                                        setSelectedProductId(prod.productId);
                                                                    }}
                                                                    className={`p-2 rounded border text-xs cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50/50 ${f.isFifoRecommended
                                                                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/30'
                                                                        : 'bg-white border-slate-200'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between font-mono font-bold text-gray-900">
                                                                        <span>{f.serialNumber}</span>
                                                                        {f.isFifoRecommended && (
                                                                            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-sans">
                                                                                FIFO #{idx + 1}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                                                                        <span>Ngày nhập: {f.receiptDate}</span>
                                                                        <span className="font-semibold text-slate-700">{f.warehouseLocation}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                {/* Danh sách các serial đã quét cho sản phẩm này */}
                                                {assignedForThis.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                                                        <div className="text-[11px] font-semibold text-emerald-800">
                                                            Các mã Serial đã liên kết vào đơn hàng:
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedForThis.map((s) => (
                                                                <div
                                                                    key={s.serialNumber}
                                                                    className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md text-xs font-mono font-bold border border-emerald-300"
                                                                >
                                                                    <span>{s.serialNumber}</span>
                                                                    <span className="text-[10px] text-emerald-700 font-normal">
                                                                        ({s.receiptDate} - {s.warehouseLocation})
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveAssignedSerial(s.serialNumber)}
                                                                        className="text-emerald-700 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                                                                        title="Gỡ serial này"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Ô Quét Barcode trực tiếp */}
                                <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                                        <span className="flex items-center gap-1.5">
                                            <Barcode className="w-4 h-4 text-indigo-600" />
                                            Quét mã vạch Barcode máy quét hoặc nhập mã Serial:
                                        </span>
                                        <span className="text-gray-500 font-normal">
                                            Nhấn Enter hoặc bấm "Gán Serial"
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <AdminSelect
                                            value={selectedProductId}
                                            onChange={(e) => {
                                                const pId = Number(e.target.value);
                                                setSelectedProductId(pId);
                                                const pr = targetOrder.items.find((x) => x.productId === pId);
                                                if (pr) loadFifoForProduct(pId, pr.quantity);
                                            }}
                                            className="w-auto font-medium"
                                        >
                                            {targetOrder.items.map((it) => (
                                                <option key={it.productId} value={it.productId}>
                                                    {it.productName} ({it.productCode})
                                                </option>
                                            ))}
                                        </AdminSelect>
                                        <AdminInput
                                            type="text"
                                            value={inputBarcode}
                                            onChange={(e) => setInputBarcode(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddManualSerial();
                                                }
                                            }}
                                            placeholder="Quét Barcode hoặc dán mã Serial (VD: ASUS-ROG-Z790-FIFO-001)..."
                                            className="flex-1 font-mono"
                                        />
                                        <AdminButton
                                            type="button"
                                            onClick={handleAddManualSerial}
                                            variant="primary"
                                            className="shrink-0"
                                        >
                                            Gán Serial
                                        </AdminButton>
                                    </div>
                                </div>
                            </div>

                            {/* BƯỚC 4: TIÊU CHUẨN ĐÓNG GÓI & THÔNG TIN KIỆN HÀNG */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <Package className="w-4 h-4 text-indigo-600" />
                                    Bước 4: Tiêu chuẩn đóng gói kiện hàng & Quy cách bảo quản
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="font-semibold text-gray-700">Checklist đóng gói:</div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checklist.inspectedAppearance}
                                                onChange={(e) =>
                                                    setChecklist({ ...checklist, inspectedAppearance: e.target.checked })
                                                }
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>Kiểm tra ngoại quan linh kiện nguyên vẹn, không trầy xước</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checklist.testedPowerAccessories}
                                                onChange={(e) =>
                                                    setChecklist({ ...checklist, testedPowerAccessories: e.target.checked })
                                                }
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>Kiểm tra đầy đủ phụ kiện, cáp nguồn, ốc vít theo hộp</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checklist.bubbleWrapProtected}
                                                onChange={(e) =>
                                                    setChecklist({ ...checklist, bubbleWrapProtected: e.target.checked })
                                                }
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>Bọc xốp chống sốc bóng khí 2 lớp bảo quản linh kiện điện tử</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checklist.securityTapeSealed}
                                                onChange={(e) =>
                                                    setChecklist({ ...checklist, securityTapeSealed: e.target.checked })
                                                }
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>Dán băng keo niêm phong thương hiệu PCStore ở 2 mép thùng</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checklist.fragileLabelApplied}
                                                onChange={(e) =>
                                                    setChecklist({ ...checklist, fragileLabelApplied: e.target.checked })
                                                }
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>Dán tem cảnh báo Hàng Dễ Vỡ / Không Đè Lên Kiện Hàng</span>
                                        </label>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <AdminLabel>
                                                Nhân viên kho thực hiện đóng gói:
                                            </AdminLabel>
                                            <AdminInput
                                                type="text"
                                                value={warehouseStaff}
                                                onChange={(e) => setWarehouseStaff(e.target.value)}
                                                className="font-semibold text-gray-800"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <AdminLabel>
                                                    Kích thước thùng (D x R x C):
                                                </AdminLabel>
                                                <AdminInput
                                                    type="text"
                                                    value={boxDimensions}
                                                    onChange={(e) => setBoxDimensions(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <AdminLabel>
                                                    Khối lượng kiện (kg):
                                                </AdminLabel>
                                                <AdminInput
                                                    type="number"
                                                    step="0.1"
                                                    value={boxWeight}
                                                    onChange={(e) => setBoxWeight(Number(e.target.value))}
                                                    className="font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <AdminLabel>
                                                Ghi chú quy cách đóng gói:
                                            </AdminLabel>
                                            <AdminTextarea
                                                rows={2}
                                                value={packingNotes}
                                                onChange={(e) => setPackingNotes(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t flex items-center justify-between shrink-0">
                            <div className="text-xs text-gray-500">
                                Sau khi xác nhận, đơn sẽ chuyển sang trạng thái{' '}
                                <span className="font-bold text-purple-700">"Chờ bàn giao ĐVVC"</span> (GĐ 3 Bước 5).
                            </div>
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsPackingModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    onClick={handleConfirmPackaging}
                                    isLoading={isSubmitting}
                                    icon={CheckCircle2}
                                >
                                    Xác nhận đóng gói hoàn tất & In phiếu
                                </AdminButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL IN PHIẾU ĐÓNG GÓI & TEM NIÊM PHONG (PACKING SLIP)   */}
            {/* ======================================================== */}
            {isPrintModalOpen && printRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Phiếu đóng gói & Tem niêm phong kiện hàng: ${printRecord.orderCode}`}
                            icon={Printer}
                            onClose={() => setIsPrintModalOpen(false)}
                        />

                        {/* Nội dung mẫu in ấn */}
                        <div className="p-6 bg-white space-y-5 text-gray-900 border-2 border-dashed border-gray-300 m-4 rounded-xl print:m-0 print:border-none overflow-y-auto flex-1">
                            {/* Tiêu đề phiếu */}
                            <div className="flex items-start justify-between border-b pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-indigo-900 tracking-wide">
                                        PCSTORE VIỆT NAM
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Hệ thống bán lẻ & Phân phối máy tính cao cấp
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Địa chỉ: 285 CMT8, Phường 12, Quận 10, TP. Hồ Chí Minh • Hotline: 1900 8888
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="inline-block bg-slate-900 text-white font-mono font-bold px-3 py-1 rounded text-sm">
                                        {printRecord.orderCode}
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Ngày đóng gói: {formatDateTime(printRecord.packedAt || new Date().toISOString())}
                                    </p>
                                </div>
                            </div>

                            {/* Thông tin giao hàng */}
                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-lg border">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                                        Người gửi (Kho hàng):
                                    </div>
                                    <div className="font-bold text-gray-900">Tổng kho PCStore Center</div>
                                    <div className="text-gray-600">Thủ kho đóng gói: {printRecord.warehouseStaffName}</div>
                                    <div className="text-gray-600">Hotline điều phối: 1900 8888 (Nhánh 2)</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                                        Người nhận (Khách hàng):
                                    </div>
                                    <div className="font-bold text-gray-900">{printRecord.recipientName}</div>
                                    <div className="font-bold text-blue-700">{printRecord.recipientPhone}</div>
                                    <div className="text-gray-600 line-clamp-2">{printRecord.address}</div>
                                </div>
                            </div>

                            {/* Danh sách cá thể Serial đã gán (FIFO) */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                                    <span>Danh sách cá thể sản phẩm & Mã Serial gán (FIFO):</span>
                                    <span className="text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Đã quét {printRecord.assignedSerials.length} serial
                                    </span>
                                </div>
                                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100 text-gray-700 font-semibold">
                                        <tr>
                                            <th className="p-2 text-left border-b">#</th>
                                            <th className="p-2 text-left border-b">Tên sản phẩm</th>
                                            <th className="p-2 text-left border-b">Mã Serial định danh</th>
                                            <th className="p-2 text-left border-b">Ngày nhập (FIFO)</th>
                                            <th className="p-2 text-left border-b">Vị trí kho</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                        {printRecord.assignedSerials.map((s, idx) => (
                                            <tr key={s.serialNumber} className="hover:bg-gray-50">
                                                <td className="p-2 font-sans">{idx + 1}</td>
                                                <td className="p-2 font-sans font-medium text-gray-900">{s.productName}</td>
                                                <td className="p-2 font-bold text-indigo-700">{s.serialNumber}</td>
                                                <td className="p-2 text-gray-600">{s.receiptDate || 'FIFO'}</td>
                                                <td className="p-2 text-gray-600">{s.warehouseLocation || 'Kệ A1'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Thông số kiện hàng & Tem cảnh báo */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="p-2 bg-slate-50 border rounded-lg">
                                    <div className="text-[10px] text-gray-400">Kích thước</div>
                                    <div className="font-bold text-gray-800">{printRecord.boxDimensionsCm || '45x35x25 cm'}</div>
                                </div>
                                <div className="p-2 bg-slate-50 border rounded-lg">
                                    <div className="text-[10px] text-gray-400">Trọng lượng</div>
                                    <div className="font-bold text-gray-800">{printRecord.boxWeightKg || 3.2} kg</div>
                                </div>
                                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    <div className="text-[10px] uppercase font-bold">Cảnh báo</div>
                                    <div className="font-bold">HÀNG DỄ VỠ - KHÔNG ĐÈ LÊN</div>
                                </div>
                            </div>

                            {/* Chữ ký hai bên */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t text-xs text-center">
                                <div className="space-y-10">
                                    <p className="font-semibold text-gray-700">Thủ kho đóng gói</p>
                                    <p className="font-bold text-gray-900">{printRecord.warehouseStaffName}</p>
                                </div>
                                <div className="space-y-10">
                                    <p className="font-semibold text-gray-700">Đơn vị vận chuyển (Ký nhận)</p>
                                    <p className="text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
                                </div>
                            </div>
                        </div>

                        {/* Nút in */}
                        <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                            <span className="text-xs text-gray-500">Mẫu tem nhãn phiếu đóng gói chuẩn ISO Logistics</span>
                            <div className="flex gap-2">
                                <AdminButton
                                    type="button"
                                    onClick={() => window.print()}
                                    variant="primary"
                                    icon={Printer}
                                >
                                    In phiếu ngay
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    onClick={() => {
                                        setIsPrintModalOpen(false);
                                        navigate('/admin/warehouse/handover');
                                    }}
                                    variant="secondary"
                                    icon={Truck}
                                    className="!text-purple-700 !bg-purple-50 hover:!bg-purple-100 !border-purple-200"
                                >
                                    Chuyển sang Bàn giao ĐVVC
                                </AdminButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
