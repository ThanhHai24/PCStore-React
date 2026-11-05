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
    Package2,
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
import { useAuth } from '../../../context/AuthContext';
import { orderFulfillmentService } from '../../../services/orderFulfillmentService';
import { adminOrderService } from '../../../services/adminOrderService';
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
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
    const { user } = useAuth();
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

    // Modal Lấy hàng & Đóng gói
    const [isPackingModalOpen, setIsPackingModalOpen] = useState(false);
    const [targetRecord, setTargetRecord] = useState<OrderFulfillmentRecord | null>(null);
    const [targetOrder, setTargetOrder] = useState<OrderResponse | null>(null);

    // State khi thực hiện đóng gói - Tự động cập nhật theo tài khoản đăng nhập
    const currentStaffName = user?.fullName || user?.username || 'Nhân viên kho';
    const [warehouseStaff, setWarehouseStaff] = useState(currentStaffName);
    const [packingNotes, setPackingNotes] = useState('Lấy hàng thực tế từ kho, kiểm tra ngoại quan linh kiện, bọc xốp chống sốc và dán tem niêm phong.');
    const [boxDimensions, setBoxDimensions] = useState('45 x 35 x 25 cm');
    const [boxWeight, setBoxWeight] = useState<number>(3.2);
    const [checklist, setChecklist] = useState({
        inspectedAppearance: true,
        testedPowerAccessories: true,
        bubbleWrapProtected: true,
        securityTapeSealed: true,
        fragileLabelApplied: true,
    });

    // Đồng bộ tên nhân viên theo tài khoản đăng nhập khi user thay đổi
    useEffect(() => {
        if (user?.fullName || user?.username) {
            setWarehouseStaff(user.fullName || user.username);
        }
    }, [user]);

    // Quét và gán mã serial (Duy nhất 1 ô nhập - tự động nhận diện sản phẩm)
    const [activeSerials, setActiveSerials] = useState<AssignedOrderSerialItem[]>([]);
    const [inputBarcode, setInputBarcode] = useState('');
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
                label: 'Đang đóng gói',
                icon: Barcode,
                count: stats.packingInProgress,
            },
            {
                key: 'PACKED_WAITING_HANDOVER',
                label: 'Đã đóng gói',
                icon: Package,
                count: stats.packedWaitingHandover,
            },
            {
                key: 'HANDED_OVER_TO_CARRIER',
                label: 'Đã bàn giao',
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
                    { label: 'Đang đóng gói (PACKING_IN_PROGRESS)', value: 'PACKING_IN_PROGRESS' },
                    { label: 'Đã đóng gói (PACKED_WAITING_HANDOVER)', value: 'PACKED_WAITING_HANDOVER' },
                    { label: 'Đã bàn giao (HANDED_OVER_TO_CARRIER)', value: 'HANDED_OVER_TO_CARRIER' },
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
     * Mở Modal Lấy hàng & Đóng gói
     */
    const handleOpenPackingModal = async (record: OrderFulfillmentRecord) => {
        setTargetRecord(record);
        setActiveSerials([...record.assignedSerials]);
        setInputBarcode('');
        // Nhân viên thực hiện tự động cập nhật theo tài khoản đang login
        setWarehouseStaff(user?.fullName || user?.username || record.warehouseStaffName || 'Nhân viên kho');
        setPackingNotes(record.packingNotes || 'Lấy hàng thực tế từ kho, kiểm tra ngoại quan linh kiện, bọc xốp chống sốc và dán tem niêm phong.');
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

        // Tự động load danh sách serial khả dụng cho tất cả sản phẩm trong đơn để tự động nhận diện
        if (orderObj?.items && orderObj.items.length > 0) {
            loadStockSerialsForAllItems(orderObj.items);
        }

        setIsPackingModalOpen(true);
    };

    /**
     * Tải danh sách Serial khả dụng trong kho cho toàn bộ sản phẩm trong đơn
     */
    const loadStockSerialsForAllItems = async (items: any[]) => {
        setIsLoadingFifo(true);
        try {
            const results = await Promise.all(
                items.map(async (item) => {
                    try {
                        const list = await orderFulfillmentService.getFifoAvailableSerials(item.productId, item.quantity);
                        return list.map((s) => ({
                            ...s,
                            productId: item.productId,
                            productName: item.productName,
                            productCode: item.productCode,
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            setFifoSuggestions(results.flat());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingFifo(false);
        }
    };

    /**
     * Quét / Nhập mã Serial duy nhất - Tự động nhận diện loại sản phẩm tương ứng và cập nhật vào đơn
     */
    const handleScanSingleSerial = async (rawCode?: string) => {
        const code = (rawCode !== undefined ? rawCode : inputBarcode).trim().toUpperCase();
        if (!code || !targetRecord || !targetOrder) return;

        // 1. Kiểm tra xem mã serial đã được quét vào đơn hàng này chưa
        if (activeSerials.some((s) => s.serialNumber.toUpperCase() === code)) {
            toast.warning(`Mã serial "${code}" đã được quét vào đơn hàng này rồi!`);
            return;
        }

        // 2. Tự động nhận diện loại sản phẩm của mã serial này
        // Cách 2.1: Tìm trong danh sách tồn kho đã tải trước của các sản phẩm trong đơn
        let matchedItem = targetOrder.items.find((item) =>
            fifoSuggestions.some(
                (s) => s.productId === item.productId && s.serialNumber.toUpperCase() === code
            )
        );
        let matchedStock = fifoSuggestions.find(
            (s) => s.serialNumber.toUpperCase() === code
        );

        // Cách 2.2: Nếu chưa tìm thấy, tra cứu trực tiếp qua API backend
        if (!matchedItem) {
            try {
                const serialDetail = await adminGoodsReceiptService.getSerialByNumber(code);
                if (serialDetail && serialDetail.productId) {
                    matchedItem = targetOrder.items.find((it) => it.productId === serialDetail.productId);
                    if (matchedItem) {
                        matchedStock = {
                            serialNumber: serialDetail.serialNumber,
                            serialId: Number(serialDetail.id),
                            receiptCode: (serialDetail as any).goodsReceiptCode || 'GR-KHO',
                            receiptDate: serialDetail.createdDate
                                ? new Date(serialDetail.createdDate).toLocaleDateString('vi-VN')
                                : 'Mới nhập',
                            warehouseLocation: (serialDetail as any).warehouseLocation || 'Kho PCStore',
                            isFifoRecommended: true,
                            productId: matchedItem.productId,
                            productName: matchedItem.productName,
                            productCode: matchedItem.productCode,
                        };
                    } else {
                        toast.error(
                            `Mã serial "${code}" thuộc sản phẩm khác (Product ID: ${serialDetail.productId}), không có trong đơn hàng này!`
                        );
                        return;
                    }
                }
            } catch {
                // Tiếp tục nhận diện fallback
            }
        }

        // Cách 2.3: Nhận diện theo chuỗi SKU / Mã định danh có trong số serial
        if (!matchedItem) {
            matchedItem = targetOrder.items.find((it) => {
                const skuClean = it.productCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const codeClean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                return codeClean.includes(skuClean) || (skuClean.length > 5 && codeClean.includes(skuClean.slice(0, 8)));
            });
        }

        // Cách 2.4: Nếu đơn hàng chỉ có 1 loại sản phẩm còn thiếu serial, tự động gán cho sản phẩm đó
        if (!matchedItem) {
            const pendingItems = targetOrder.items.filter((it) => {
                const count = activeSerials.filter((s) => s.productId === it.productId).length;
                return count < it.quantity;
            });

            if (pendingItems.length === 1) {
                matchedItem = pendingItems[0];
            }
        }

        // Nếu không tìm được sản phẩm nào phù hợp
        if (!matchedItem) {
            toast.error(
                `Không tìm thấy sản phẩm phù hợp trong đơn cho mã serial "${code}". Vui lòng kiểm tra lại!`
            );
            return;
        }

        // 3. Kiểm tra sản phẩm đã đủ số lượng serial yêu cầu chưa
        const currentCount = activeSerials.filter((s) => s.productId === matchedItem!.productId).length;
        if (currentCount >= matchedItem.quantity) {
            toast.warning(
                `Sản phẩm "${matchedItem.productName}" đã gán đủ ${matchedItem.quantity}/${matchedItem.quantity} serial. Vui lòng quét serial cho sản phẩm khác!`
            );
            return;
        }

        // 4. Tự động gán mã Serial vào đúng loại sản phẩm
        const newSerialItem: AssignedOrderSerialItem = {
            id: `ser-${targetRecord.orderId}-${matchedItem.productId}-${Date.now()}`,
            orderId: targetRecord.orderId,
            orderCode: targetRecord.orderCode,
            orderItemId: matchedItem.id,
            productId: matchedItem.productId,
            productName: matchedItem.productName,
            productCode: matchedItem.productCode,
            productPrice: matchedItem.unitPrice,
            serialId: matchedStock?.serialId,
            serialNumber: code,
            goodsReceiptCode: matchedStock?.receiptCode || 'GR-KHO-TON',
            receiptDate: matchedStock?.receiptDate || new Date().toLocaleDateString('vi-VN'),
            warehouseLocation: matchedStock?.warehouseLocation || 'Kho tổng PCStore',
            assignedAt: new Date().toISOString(),
            assignedBy: warehouseStaff,
            status: 'PACKED',
        };

        setActiveSerials((prev) => [...prev, newSerialItem]);
        setInputBarcode('');
        toast.success(
            `✓ Đã tự động nhận diện và gán Serial "${code}" cho "${matchedItem.productName}" (${currentCount + 1}/${matchedItem.quantity})!`
        );
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
            header: 'Thông tin nhận hàng',
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
            header: 'Mã Serial:',
            render: (rec) => {
                if (!rec.assignedSerials || rec.assignedSerials.length === 0) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Chờ chọn sản phẩm</span>
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
            header: 'Trạng thái',
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
            header: 'Thao tác',
            render: (rec) => (
                <div className="flex items-center gap-1.5">
                    {rec.fulfillmentStatus === 'READY_TO_PACK' || rec.fulfillmentStatus === 'PACKING_IN_PROGRESS' ? (
                        <button
                            type="button"
                            onClick={() => handleOpenPackingModal(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                            <span>Đóng gói</span>
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
                                Quản lý đóng gói hàng
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
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === 'READY_TO_PACK'
                        ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
                        : 'border-gray-100 hover:border-amber-200'
                        } flex items-center justify-between`}
                    title="Bấm để lọc đơn chờ đóng gói"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Chờ đóng gói</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.readyToPack}</p>
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
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === 'PACKING_IN_PROGRESS'
                        ? 'border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-50/20'
                        : 'border-gray-100 hover:border-indigo-200'
                        } flex items-center justify-between`}
                    title="Bấm để lọc đơn đang soạn hàng FIFO"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang xử lý</p>
                        <p className="text-2xl font-bold text-indigo-600">{stats.packingInProgress}</p>
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
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === 'PACKED_WAITING_HANDOVER'
                        ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20'
                        : 'border-gray-100 hover:border-purple-200'
                        } flex items-center justify-between`}
                    title="Bấm để lọc đơn đã đóng gói xong"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã đóng gói</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.packedWaitingHandover}</p>
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
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${serialFilter === 'ASSIGNED'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20'
                        : 'border-gray-100 hover:border-emerald-200'
                        } flex items-center justify-between`}
                    title="Bấm để lọc đơn đã gán mã Serial"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Serial đã gán</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.totalAssignedSerials}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
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
            {/* MODAL LẤY HÀNG TRONG KHO & ĐÓNG GÓI SẢN PHẨM (GIAI ĐOẠN 3) */}
            {/* ======================================================== */}
            {isPackingModalOpen && targetRecord && targetOrder && (
                <AdminModal
                    isOpen={isPackingModalOpen}
                    onClose={() => setIsPackingModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2">
                            <span>Đóng gói đơn hàng: </span>
                            <span className="font-mono text-indigo-600 font-bold">{targetRecord.orderCode}</span>
                        </div>
                    }
                    subtitle={``}
                    icon={Package2}
                    size="xl"
                    footer={
                        <div className="flex items-center justify-between w-full">

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
                                    disabled={isSubmitting}
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                    className="!bg-indigo-600 hover:!bg-indigo-700"
                                >
                                    Hoàn tất đóng gói
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6 text-xs">
                        {/* 1. KHỐI LẤY HÀNG VẬT LÝ & GÁN MÃ SERIAL VÀO ĐƠN */}
                        <div className="space-y-4">
                            {/* DUY NHẤT 1 Ô NHẬP / QUÉT MÃ SERIAL */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                                    <span className="flex items-center gap-1.5">
                                        <Barcode className="w-4 h-4 text-indigo-600" />
                                        Nhập / Quét mã Serial sản phẩm:
                                    </span>
                                    <span className="text-xs font-semibold text-indigo-700">
                                        Tiến độ: {activeSerials.length} / {targetOrder.items.reduce((sum, it) => sum + (it.quantity || 0), 0)} Sản phẩm
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <AdminInput
                                        type="text"
                                        value={inputBarcode}
                                        onChange={(e) => setInputBarcode(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScanSingleSerial();
                                            }
                                        }}
                                        placeholder="Quét mã vạch Barcode hoặc nhập Serial trên vỏ hộp (VD: ASUS-ROG-Z790-FIFO-001)..."
                                        className="flex-1 font-mono uppercase bg-white text-sm"
                                        autoFocus
                                    />
                                    <AdminButton
                                        type="button"
                                        onClick={() => handleScanSingleSerial()}
                                        variant="primary"
                                        className="shrink-0 !bg-blue-600 hover:!bg-indigo-700 font-semibold"
                                    >
                                        Xác nhận
                                    </AdminButton>
                                </div>
                                <p className="text-[11px] text-gray-500 italic">
                                    * Dùng máy quét Barcode quét mã hoặc gõ số serial rồi nhấn Enter. Hệ thống sẽ tự động đối soát và cập nhật vào đúng loại sản phẩm bên dưới.
                                </p>
                            </div>

                            {/* Danh sách từng sản phẩm trong đơn - Tự động cập nhật serial */}
                            <div className="space-y-3">
                                {targetOrder.items.map((prod) => {
                                    const assignedForThis = activeSerials.filter((s) => s.productId === prod.productId);
                                    const isDone = assignedForThis.length >= prod.quantity;

                                    return (
                                        <div
                                            key={prod.id}
                                            className={`p-4 rounded-xl border transition-all ${isDone
                                                ? 'bg-emerald-50/40 border-emerald-300'
                                                : 'bg-white border-slate-200 shadow-xs'
                                                }`}
                                        >
                                            {/* Tiêu đề sản phẩm & Trạng thái đã gán */}
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
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Số lượng: <strong className="text-gray-900">{prod.quantity} chiếc</strong> • Đơn giá: {formatVND(prod.unitPrice)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isDone
                                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                            : 'bg-amber-100 text-amber-800 border-amber-300'
                                                            }`}
                                                    >
                                                        {isDone
                                                            ? `✓ Đã đủ (${assignedForThis.length}/${prod.quantity})`
                                                            : `Chọn: ${assignedForThis.length} / ${prod.quantity} sản phẩm`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Danh sách các mã serial đã gán */}
                                            {assignedForThis.length > 0 ? (
                                                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                                    <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>Mã Serial đã chọn ({assignedForThis.length}/{prod.quantity}):</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {assignedForThis.map((s) => (
                                                            <div
                                                                key={s.serialNumber}
                                                                className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md text-xs font-mono font-bold border border-emerald-300"
                                                            >
                                                                <span>{s.serialNumber}</span>
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
                                            ) : (
                                                <div className="text-gray-400 italic text-[11px] pt-1">
                                                    Chưa chọn sản phẩm nào cho mặt hàng này.
                                                </div>
                                            )}

                                            {/* Gợi ý mã serial khả dụng trong kho (bấm vào sẽ tự động nhận diện và gán) */}
                                            {fifoSuggestions.filter((f) => f.productId === prod.productId).length > 0 && !isDone && (
                                                <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200">
                                                    <div className="text-[11px] text-gray-500 mb-1.5 flex items-center justify-between">
                                                        <span>Sản phẩm khả dụng:</span>
                                                        {isLoadingFifo && (
                                                            <span className="text-blue-600 flex items-center gap-1">
                                                                <RefreshCw className="w-3 h-3 animate-spin" /> Đang tra cứu kho...
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {fifoSuggestions
                                                            .filter(
                                                                (f) =>
                                                                    f.productId === prod.productId &&
                                                                    !activeSerials.some((a) => a.serialNumber === f.serialNumber)
                                                            )
                                                            .slice(0, 6)
                                                            .map((f) => (
                                                                <button
                                                                    key={f.serialNumber}
                                                                    type="button"
                                                                    onClick={() => handleScanSingleSerial(f.serialNumber)}
                                                                    className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 transition-all cursor-pointer"
                                                                    title={`Mã Serial: ${f.serialNumber}`}
                                                                >
                                                                    + {f.serialNumber}
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Banner khi đã gán đủ tất cả serial */}
                            {targetOrder.items.every(
                                (it) => activeSerials.filter((s) => s.productId === it.productId).length >= it.quantity
                            ) && (
                                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-800">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <span className="font-semibold">
                                            Đã gán đủ mã Serial cho tất cả sản phẩm trong đơn hàng. Bạn có thể tiến hành đóng gói kiện hàng bên dưới.
                                        </span>
                                    </div>
                                )}
                        </div>

                        {/* 2. KHỐI QUY CÁCH ĐÓNG GÓI & THÔNG TIN KIỆN HÀNG */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <span>Thông tin đóng gói</span>
                            </h3>

                            <div className=" gap-4 text-xs">


                                <div className="space-y-3">
                                    {/* 3. NHÂN VIÊN THỰC HIỆN TỰ ĐỘNG CẬP NHẬT THEO TÀI KHOẢN */}
                                    <div>
                                        <AdminLabel>Nhân viên thực hiện đóng gói:</AdminLabel>
                                        <AdminInput
                                            type="text"
                                            value={warehouseStaff}
                                            disabled
                                            readOnly
                                            className="bg-gray-100 text-gray-800 cursor-not-allowed font-medium"
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            * Tự động cập nhật theo tài khoản nhân viên đang đăng nhập ({user?.username || 'user'})
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <AdminLabel>Kích thước thùng (D x R x C):</AdminLabel>
                                            <AdminInput
                                                type="text"
                                                value={boxDimensions}
                                                onChange={(e) => setBoxDimensions(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <AdminLabel>Khối lượng kiện (kg):</AdminLabel>
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
                                        <AdminLabel>Ghi chú quy cách đóng gói:</AdminLabel>
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
                </AdminModal>
            )}

            {/* ======================================================== */}
            {/* MODAL IN PHIẾU ĐÓNG GÓI & TEM NIÊM PHONG (PACKING SLIP)   */}
            {/* ======================================================== */}
            {isPrintModalOpen && printRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-[80vw] h-[80vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Phiếu đóng gói: ${printRecord.orderCode}`}
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
                                    <span>Danh sách cá thể sản phẩm & Mã Serial gán:</span>
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                        {printRecord.assignedSerials.map((s, idx) => (
                                            <tr key={s.serialNumber} className="hover:bg-gray-50">
                                                <td className="p-2 font-sans">{idx + 1}</td>
                                                <td className="p-2 font-sans font-medium text-gray-900">{s.productName}</td>
                                                <td className="p-2 font-bold text-indigo-700">{s.serialNumber}</td>
                                                <td className="p-2 text-gray-600">{s.receiptDate || 'FIFO'}</td>
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
