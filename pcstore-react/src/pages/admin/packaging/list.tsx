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
import { AdminTable, AdminActionDropdown, type Column } from '../../../components/admin/common/table';
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
                    // Đảm bảo mỗi backend order đều có fulfillment và chỉ hiển thị đơn thật từ BE
                    res.content.forEach((ord) => {
                        orderFulfillmentService.ensureFulfillmentRecord(ord);
                    });
                    const backendIds = new Set(res.content.map((o) => o.id));
                    setFulfillments(
                        orderFulfillmentService.getFulfillments().filter((f) => backendIds.has(f.orderId))
                    );
                }
            } catch (err) {
                setOrders([]);
                setFulfillments([]);
                toast.error((err as Error)?.message || 'Không thể tải danh sách đơn hàng từ hệ thống');
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
                toast.error(`Không thể tải chi tiết đơn hàng ${record.orderCode} từ hệ thống.`);
                return;
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
                    `Sản phẩm "${item.productName}" cần ${item.quantity} serial, hiện mới quét ${count}. Vui lòng quét đủ serial!`
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

    const renderFulfillmentStatusIndicator = (status: OrderFulfillmentStatus) => {
        const conf = FULFILLMENT_STATUS_MAP[status];
        const dotColor =
            status === 'READY_TO_PACK'
                ? 'bg-amber-500'
                : status === 'PACKING_IN_PROGRESS'
                ? 'bg-blue-500'
                : status === 'PACKED_WAITING_HANDOVER'
                ? 'bg-emerald-500'
                : status === 'HANDED_OVER_TO_CARRIER'
                ? 'bg-sky-500'
                : 'bg-slate-400';

        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                <span>{conf?.label || status}</span>
            </span>
        );
    };

    // Columns cho AdminTable
    const columns: Column<OrderFulfillmentRecord>[] = [
        {
            key: 'orderCode',
            header: 'Mã đơn hàng',
            render: (rec) => (
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                            {rec.orderCode}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(rec.orderCode);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            title="Sao chép mã đơn"
                        >
                            {copiedSerial === rec.orderCode ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={rec.packingNotes || ''}>
                        {rec.orderType === 'IN_STORE' ? 'Tại quầy' : 'Trực tuyến'}
                        {rec.packingNotes ? ` · ${rec.packingNotes}` : ''}
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            render: (rec) => (
                <div className="space-y-0.5 min-w-0 max-w-[220px]">
                    <div className="text-sm font-medium text-slate-900 truncate" title={rec.customerName}>
                        {rec.customerName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums truncate">
                        {rec.customerPhone}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1" title={rec.address}>
                        {rec.address}
                    </div>
                </div>
            ),
        },
        {
            key: 'staff',
            header: 'Nhân viên kho',
            render: (rec) => (
                <div className="text-xs text-slate-700 whitespace-nowrap">
                    {rec.warehouseStaffName || <span className="text-slate-400">Chưa phân công</span>}
                </div>
            ),
        },
        {
            key: 'assignedSerials',
            header: 'Tiến độ Serial',
            align: 'right',
            render: (rec) => {
                const count = rec.assignedSerials?.length || 0;
                if (count === 0) {
                    return (
                        <div className="text-xs text-slate-500 text-right tabular-nums whitespace-nowrap">
                            Chờ gán Serial
                        </div>
                    );
                }
                return (
                    <div className="space-y-0.5 text-right tabular-nums">
                        <div className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                            Đã gán {count} Serial
                        </div>
                        <div
                            className="font-mono text-[11px] text-slate-500 truncate max-w-[160px] ml-auto"
                            title={rec.assignedSerials.map((s) => s.serialNumber).join(', ')}
                        >
                            {rec.assignedSerials.map((s) => s.serialNumber).join(', ')}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'finalAmount',
            header: 'Giá trị đơn',
            align: 'right',
            render: (rec) => (
                <div className="text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                    {formatVND(rec.finalAmount)}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (rec) => renderFulfillmentStatusIndicator(rec.fulfillmentStatus),
        },
        {
            key: 'time',
            header: 'Thời gian',
            align: 'right',
            render: (rec) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div className="text-xs text-slate-700">
                        {formatDateTime(rec.packedAt || rec.createdAt)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                        {rec.packedAt ? 'Hoàn tất đóng gói' : 'Thời gian đặt'}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (rec) => {
                const canPack =
                    rec.fulfillmentStatus === 'READY_TO_PACK' ||
                    rec.fulfillmentStatus === 'PACKING_IN_PROGRESS';
                return (
                    <AdminActionDropdown
                        maxInline={3}
                        actions={[
                            {
                                key: 'pack-order',
                                label: 'Đóng gói',
                                icon: Box,
                                variant: 'primary',
                                highlight: true,
                                hidden: !canPack,
                                onClick: () => handleOpenPackingModal(rec),
                            },
                            {
                                key: 'handover-carrier',
                                label: 'Bàn giao ĐVVC',
                                icon: Truck,
                                variant: 'primary',
                                highlight: true,
                                hidden: rec.fulfillmentStatus !== 'PACKED_WAITING_HANDOVER',
                                onClick: () => navigate('/admin/warehouse/handover'),
                            },
                        ]}
                        moreActions={
                            canPack
                                ? []
                                : [
                                      {
                                          key: 'print-packing',
                                          label: 'In phiếu đóng gói',
                                          description: 'Xuất bản in phiếu đóng gói đơn hàng',
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

    const totalRequiredPackingQty = targetOrder
        ? targetOrder.items.reduce((sum, it) => sum + (it.quantity || 0), 0)
        : 0;

    return (
        <div className="space-y-4">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý đóng gói hàng
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                        {stats.totalPackaging} đơn · {stats.readyToPack} chờ đóng gói · {stats.packingInProgress} đang xử lý · {stats.packedWaitingHandover} đã đóng gói
                    </p>
                </div>

                {/* Header Utility Action */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Single-row Toolbar: Search + Filters */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                    setSearchQuery(q);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm theo mã đơn hàng, tên/SĐT khách hàng, mã Serial..."
                fields={filterFields}
                values={filterValues}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
            />

            {/* Main Packaging Table (Border-first, no outer card-in-card) */}
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

            {/* ======================================================== */}
            {/* MODAL LẤY HÀNG TRONG KHO & ĐÓNG GÓI SẢN PHẨM (GIAI ĐOẠN 3) */}
            {/* ======================================================== */}
            {isPackingModalOpen && targetRecord && targetOrder && (
                <AdminModal
                    isOpen={isPackingModalOpen}
                    onClose={() => setIsPackingModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span>Đóng gói đơn hàng</span>
                            <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                {targetRecord.orderCode}
                            </span>
                        </div>
                    }
                    subtitle={`${targetRecord.recipientName} • ${targetRecord.recipientPhone}`}
                    icon={Package2}
                    size="xl"
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="text-xs text-slate-600 tabular-nums">
                                Tiến độ gán Serial:{' '}
                                <strong className="text-slate-900">
                                    {activeSerials.length} / {totalRequiredPackingQty} SP
                                </strong>
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
                                    disabled={isSubmitting}
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                >
                                    Hoàn tất đóng gói
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4 text-xs">
                        {/* Flat Order Info Strip */}
                        <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <div className="text-[11px] text-slate-500">Người nhận</div>
                                <div className="font-medium text-slate-900 mt-0.5">
                                    {targetRecord.recipientName} · <span className="font-mono tabular-nums">{targetRecord.recipientPhone}</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-[11px] text-slate-500">Địa chỉ giao hàng</div>
                                <div className="text-slate-700 mt-0.5 line-clamp-1" title={targetRecord.address}>
                                    {targetRecord.address}
                                </div>
                            </div>
                            <div className="sm:text-right tabular-nums">
                                <div className="text-[11px] text-slate-500">Giá trị đơn hàng</div>
                                <div className="font-semibold text-slate-900 mt-0.5">
                                    {formatVND(targetRecord.finalAmount)}
                                </div>
                            </div>
                        </div>

                        {/* Barcode Scan Bar */}
                        <div className="p-3.5 bg-white rounded-md border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-800 tabular-nums">
                                <span className="flex items-center gap-1.5">
                                    <Barcode className="w-4 h-4 text-slate-500" />
                                    Nhập / Quét mã Serial sản phẩm
                                </span>
                                <span className="text-slate-600">
                                    Đã quét: <strong className="text-slate-900">{activeSerials.length} / {totalRequiredPackingQty}</strong>
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
                                    placeholder="Quét mã vạch Barcode hoặc nhập Serial rồi nhấn Enter..."
                                    className="flex-1 font-mono tabular-nums uppercase bg-white text-xs"
                                    autoFocus
                                />
                                <AdminButton
                                    type="button"
                                    onClick={() => handleScanSingleSerial()}
                                    variant="primary"
                                    className="shrink-0"
                                >
                                    Gán Serial
                                </AdminButton>
                            </div>
                        </div>

                        {/* Flat divide-y Product & Serial Assignment List */}
                        <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200/80">
                            {targetOrder.items.map((prod) => {
                                const assignedForThis = activeSerials.filter((s) => s.productId === prod.productId);
                                const isDone = assignedForThis.length >= prod.quantity;
                                const availableFifo = fifoSuggestions.filter(
                                    (f) =>
                                        f.productId === prod.productId &&
                                        !activeSerials.some((a) => a.serialNumber === f.serialNumber)
                                );

                                return (
                                    <div key={prod.id} className={`p-3.5 space-y-2.5 ${isDone ? 'bg-emerald-50/30' : 'bg-white'}`}>
                                        {/* Product Row Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {(prod as any).productImage ? (
                                                    <img
                                                        src={(prod as any).productImage}
                                                        alt={prod.productName}
                                                        className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-slate-900 text-sm truncate">
                                                            {prod.productName}
                                                        </span>
                                                        <span className="font-mono text-[11px] tabular-nums bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200">
                                                            {prod.productCode}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                                        SL: <strong className="text-slate-800">{prod.quantity}</strong> · Đơn giá: {formatVND(prod.unitPrice)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 tabular-nums">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-amber-500'
                                                            }`}
                                                    />
                                                    {isDone
                                                        ? `Đã đủ ${assignedForThis.length}/${prod.quantity}`
                                                        : `Đã gán ${assignedForThis.length}/${prod.quantity}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Assigned Serial Chips */}
                                        {assignedForThis.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 pl-12">
                                                {assignedForThis.map((s) => (
                                                    <span
                                                        key={s.serialNumber}
                                                        className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-xs font-mono tabular-nums font-medium border border-emerald-200"
                                                    >
                                                        <span>{s.serialNumber}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAssignedSerial(s.serialNumber)}
                                                            className="text-emerald-700 hover:text-rose-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 rounded-sm"
                                                            title="Gỡ serial này"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-[11px] pl-12">
                                                Chưa gán mã Serial cho sản phẩm này.
                                            </div>
                                        )}

                                        {/* FIFO Suggestions */}
                                        {availableFifo.length > 0 && !isDone && (
                                            <div className="pl-12 pt-1.5 flex flex-wrap items-center gap-1.5">
                                                <span className="text-[11px] text-slate-500 mr-1">
                                                    {isLoadingFifo ? 'Đang tra cứu...' : 'Gợi ý FIFO:'}
                                                </span>
                                                {availableFifo.slice(0, 6).map((f) => (
                                                    <button
                                                        key={f.serialNumber}
                                                        type="button"
                                                        onClick={() => handleScanSingleSerial(f.serialNumber)}
                                                        className="px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-medium bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                                        title={`Gán Serial: ${f.serialNumber}`}
                                                    >
                                                        + {f.serialNumber}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Packing Specs Form */}
                        <div className="border-t border-slate-200 pt-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <AdminLabel>Nhân viên đóng gói</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={warehouseStaff}
                                        disabled
                                        readOnly
                                        className="bg-slate-50 text-slate-700 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <AdminLabel>Kích thước thùng (D × R × C)</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={boxDimensions}
                                        onChange={(e) => setBoxDimensions(e.target.value)}
                                        className="tabular-nums"
                                    />
                                </div>
                                <div>
                                    <AdminLabel>Khối lượng kiện (kg)</AdminLabel>
                                    <AdminInput
                                        type="number"
                                        step="0.1"
                                        value={boxWeight}
                                        onChange={(e) => setBoxWeight(Number(e.target.value))}
                                        className="font-medium tabular-nums"
                                    />
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Ghi chú quy cách đóng gói</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={packingNotes}
                                    onChange={(e) => setPackingNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </AdminModal>
            )}

            {/* ======================================================== */}
            {/* MODAL IN PHIẾU ĐÓNG GÓI & TEM NIÊM PHONG (PACKING SLIP)   */}
            {/* ======================================================== */}
            {isPrintModalOpen && printRecord && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-md border border-slate-200 overflow-hidden flex flex-col">
                        <AdminModalHeader
                            title={`Phiếu đóng gói: ${printRecord.orderCode}`}
                            icon={Printer}
                            onClose={() => setIsPrintModalOpen(false)}
                        />

                        {/* Nội dung mẫu in ấn */}
                        <div className="p-6 bg-white space-y-4 text-slate-900 border border-dashed border-slate-300 m-4 rounded-md print:m-0 print:border-none overflow-y-auto flex-1">
                            {/* Tiêu đề phiếu */}
                            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                        PCSTORE VIỆT NAM
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Hệ thống bán lẻ & Phân phối máy tính
                                    </p>
                                    <p className="text-xs text-slate-500 tabular-nums">
                                        Hotline: 1900 8888
                                    </p>
                                </div>
                                <div className="text-right tabular-nums">
                                    <div className="inline-block bg-slate-900 text-white font-mono font-semibold px-2.5 py-1 rounded-md text-xs">
                                        {printRecord.orderCode}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Ngày đóng gói: {formatDateTime(printRecord.packedAt || new Date().toISOString())}
                                    </p>
                                </div>
                            </div>

                            {/* Thông tin giao hàng */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-md border border-slate-200">
                                <div>
                                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                                        Người gửi (Kho hàng)
                                    </div>
                                    <div className="font-semibold text-slate-900">Tổng kho PCStore Center</div>
                                    <div className="text-slate-600">Thủ kho: {printRecord.warehouseStaffName}</div>
                                    <div className="text-slate-600 tabular-nums">Hotline điều phối: 1900 8888 (Nhánh 2)</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                                        Người nhận (Khách hàng)
                                    </div>
                                    <div className="font-semibold text-slate-900">{printRecord.recipientName}</div>
                                    <div className="font-mono font-medium tabular-nums text-slate-800">{printRecord.recipientPhone}</div>
                                    <div className="text-slate-600 line-clamp-2">{printRecord.address}</div>
                                </div>
                            </div>

                            {/* Danh sách cá thể Serial đã gán */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-800 flex items-center justify-between tabular-nums">
                                    <span>Danh sách sản phẩm & Mã Serial xuất kho</span>
                                    <span className="text-slate-500 font-normal">
                                        {printRecord.assignedSerials.length} serial
                                    </span>
                                </div>
                                <div className="border border-slate-200 rounded-md overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2 text-center w-10">#</th>
                                                <th className="px-3 py-2 text-left">Tên sản phẩm</th>
                                                <th className="px-3 py-2 text-left">Mã Serial</th>
                                                <th className="px-3 py-2 text-right">Ngày nhập</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/80 text-xs">
                                            {printRecord.assignedSerials.map((s, idx) => (
                                                <tr key={s.serialNumber} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-center text-slate-400 font-mono tabular-nums">{idx + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-slate-900">{s.productName}</td>
                                                    <td className="px-3 py-2 font-mono font-semibold tabular-nums text-slate-900">{s.serialNumber}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600 tabular-nums whitespace-nowrap">{s.receiptDate || 'FIFO'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Thông số kiện hàng */}
                            <div className="border border-slate-200 rounded-md bg-slate-50 grid grid-cols-3 divide-x divide-slate-200 text-center text-xs tabular-nums">
                                <div className="p-2.5">
                                    <div className="text-[10px] text-slate-500">Kích thước</div>
                                    <div className="font-semibold text-slate-900 mt-0.5">{printRecord.boxDimensionsCm || '45x35x25 cm'}</div>
                                </div>
                                <div className="p-2.5">
                                    <div className="text-[10px] text-slate-500">Trọng lượng</div>
                                    <div className="font-semibold text-slate-900 mt-0.5">{printRecord.boxWeightKg || 3.2} kg</div>
                                </div>
                                <div className="p-2.5 bg-rose-50/70 text-rose-700">
                                    <div className="text-[10px] uppercase font-semibold">Cảnh báo</div>
                                    <div className="font-semibold mt-0.5">HÀNG DỄ VỠ</div>
                                </div>
                            </div>

                            {/* Chữ ký hai bên */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs text-center">
                                <div className="space-y-10">
                                    <p className="font-semibold text-slate-700">Thủ kho đóng gói</p>
                                    <p className="font-semibold text-slate-900">{printRecord.warehouseStaffName}</p>
                                </div>
                                <div className="space-y-10">
                                    <p className="font-semibold text-slate-700">Đơn vị vận chuyển (Ký nhận)</p>
                                    <p className="text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                                </div>
                            </div>
                        </div>

                        {/* Chân modal in */}
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">Phiếu đóng gói xuất kho</span>
                            <div className="flex gap-2">
                                <AdminButton
                                    type="button"
                                    onClick={() => window.print()}
                                    variant="primary"
                                    size="sm"
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
                                    size="sm"
                                    icon={Truck}
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
