import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RotateCcw,
    ShieldAlert,
    AlertTriangle,
    Package,
    Building2,
    Search,
    RefreshCw,
    Download,
    Eye,
    Printer,
    CheckCircle2,
    Clock,
    XCircle,
    Barcode,
    Send,
    Check,
    DollarSign,
    Calendar,
    Phone,
    Mail,
    FileText,
    Boxes,
    ArrowRight,
    ExternalLink,
    Ticket,
    Copy,
    Tag,
    Truck,
    Box,
    User,
    UserCheck,
    Layers,
    FileCheck2,
    ChevronRight,
    Info,
    HelpCircle,
    CheckSquare,
    Square,
    AlertCircle,
    Sparkles,
    ShieldCheck,
    ArrowUpRight,
    Filter,
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
    AdminButton,
    AdminLabel,
    AdminTextarea,
    AdminModalFooter,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminSupplierService } from '../../../services/adminSupplierService';
import { adminProductService } from '../../../services/adminProductService';
import { adminGoodsReceiptService } from '../../../services/adminGoodsReceiptService';
import { supplierReturnService } from '../../../services/supplierReturnService';
import type {
    SupplierReturnOrder,
    SupplierReturnStatus,
    ReturnResolutionType,
    SupplierReturnItem,
    DefectiveSerialCandidate,
} from '../../../types/supplierReturn';
import type { SupplierResponse } from '../../../types/adminSupplier';

// Định dạng tiền tệ VND
function formatVND(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Định dạng ngày giờ
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

// Cấu hình hiển thị theo từng trạng thái hoàn hàng
export const RETURN_STATUS_CONFIG: Record<
    SupplierReturnStatus,
    {
        stageNumber: 1 | 2 | 3 | 4;
        stageName: string;
        label: string;
        badgeClass: string;
        icon: React.ElementType;
        description: string;
        nextActor: string;
    }
> = {
    WAITING_PACK: {
        stageNumber: 1,
        stageName: 'Giai đoạn 1: Lập đơn',
        label: 'Chờ đóng gói hoàn hàng',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/10',
        icon: Box,
        description: 'Quản lý đã tạo đơn và gửi yêu cầu xuống kho, chờ nhân viên kho nhặt hàng lỗi & đóng gói',
        nextActor: 'Nhân viên kho',
    },
    WAITING_HANDOVER: {
        stageNumber: 2,
        stageName: 'Giai đoạn 2: Đóng gói xong',
        label: 'Chờ bàn giao ĐVVC',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-indigo-500/10',
        icon: Package,
        description: 'Kho đã đóng gói đúng quy chuẩn, dán tem niêm phong và đang chờ Đơn vị vận chuyển tới lấy kiện hàng',
        nextActor: 'Nhân viên kho & ĐVVC',
    },
    HANDED_OVER: {
        stageNumber: 3,
        stageName: 'Giai đoạn 3: Vận chuyển',
        label: 'Đã bàn giao ĐVVC / Đang vận chuyển',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-500/10',
        icon: Truck,
        description: 'ĐVVC đã nhận kiện hàng và chứng từ, đang trong lộ trình vận chuyển tới kho Nhà cung cấp',
        nextActor: 'Đơn vị vận chuyển',
    },
    DELIVERED_SUPPLIER: {
        stageNumber: 4,
        stageName: 'Giai đoạn 4: Tiếp nhận tại NCC',
        label: 'Đã giao NCC / Đang đối soát',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 ring-purple-500/10',
        icon: Building2,
        description: 'ĐVVC đã bàn giao thực tế tại kho NCC. NCC đang kiểm tra ngoại quan và đối soát mã Serial',
        nextActor: 'Nhà cung cấp & Quản lý',
    },
    COMPLETED: {
        stageNumber: 4,
        stageName: 'Giai đoạn 4: Hoàn tất',
        label: 'Đã hoàn hàng thành công',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/10',
        icon: CheckCircle2,
        description: 'NCC xác nhận đối soát xong, Quản lý xác nhận chuyển trạng thái sản phẩm thành Đã trả về NCC và đóng quy trình',
        nextActor: 'Quy trình hoàn tất',
    },
    CANCELLED: {
        stageNumber: 1,
        stageName: 'Đã hủy',
        label: 'Đã hủy đơn hoàn trả',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 ring-gray-500/10',
        icon: XCircle,
        description: 'Đơn hoàn hàng bị hủy, các serial được hoàn trả lại danh sách hàng lỗi tồn kho',
        nextActor: '---',
    },
};

export const RESOLUTION_LABELS: Record<ReturnResolutionType, string> = {
    REPLACE: 'Đổi mới sản phẩm tương đương 1:1',
    REFUND: 'Bồi hoàn tiền mặt / Trừ công nợ',
    REPAIR: 'Bảo hành sửa chữa chính hãng',
};

// Đơn vị vận chuyển phổ biến
const POPULAR_CARRIERS = [
    { name: 'Viettel Post', hotline: '1900 8095', speed: '24-48 giờ' },
    { name: 'Giao Hàng Tiết Kiệm (GHTK)', hotline: '1900 6092', speed: '24 giờ' },
    { name: 'Giao Hàng Nhanh (GHN)', hotline: '1900 636677', speed: '24-48 giờ' },
    { name: 'J&T Express', hotline: '1900 1088', speed: '24-36 giờ' },
    { name: 'Đội xe giao hàng nội bộ PCStore', hotline: '1900 8888', speed: 'Giao trong ngày' },
];

export default function SupplierReturnList() {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Data State
    const [returnOrders, setReturnOrders] = useState<SupplierReturnOrder[]>([]);
    const [defectiveCandidates, setDefectiveCandidates] = useState<DefectiveSerialCandidate[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Active View Tabs: 'orders' | 'defective_pool'
    const [activeMainTab, setActiveMainTab] = useState<'orders' | 'defective_pool'>('orders');

    // Role View Filter: 'ALL' | 'STORE_MANAGER' | 'WAREHOUSE_STAFF' | 'CARRIER_SUPPLIER'
    const [selectedRoleView, setSelectedRoleView] = useState<'ALL' | 'STORE_MANAGER' | 'WAREHOUSE_STAFF' | 'CARRIER_SUPPLIER'>('ALL');

    // Search, Filters & Pagination cho Đơn hoàn hàng (Tab 1)
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
    const [resolutionFilter, setResolutionFilter] = useState<string>('ALL');
    const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Search, Filters & Pagination cho Kho hàng lỗi (Tab 2)
    const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
    const [candidateSupplierFilter, setCandidateSupplierFilter] = useState<string>('ALL');
    const [candidatePage, setCandidatePage] = useState<number>(1);
    const [candidatePageSize, setCandidatePageSize] = useState<number>(10);

    // Modal Details & Execution State
    const [selectedOrder, setSelectedOrder] = useState<SupplierReturnOrder | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'history' | 'print'>('info');

    // Modal Create Order State (Giai đoạn 1)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createSupplierId, setCreateSupplierId] = useState<number>(0);
    const [createResolution, setCreateResolution] = useState<ReturnResolutionType>('REPLACE');
    const [createReason, setCreateReason] = useState('Phát hiện lỗi không hoạt động / trầy xước ngoại quan khi kiểm đếm nhập kho');
    const [createManagerNotes, setCreateManagerNotes] = useState('Yêu cầu bọc xốp chống sốc 2 lớp, kiểm tra đúng serial trên thân máy và dán tem niêm phong.');
    const [createManagerName, setCreateManagerName] = useState('Nguyễn Văn Quản Lý (Cửa hàng trưởng)');
    const [selectedCandidateSerials, setSelectedCandidateSerials] = useState<string[]>([]);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    // Modal Workflow Action: Đóng gói (Giai đoạn 2)
    const [isPackModalOpen, setIsPackModalOpen] = useState(false);
    const [packTargetOrder, setPackTargetOrder] = useState<SupplierReturnOrder | null>(null);
    const [packStaffName, setPackStaffName] = useState('Lê Kho Vận (Thủ kho)');
    const [packNotes, setPackNotes] = useState('Đã lấy các serial chỉ định từ khu hàng lỗi, đóng gói thùng xốp và dán tem niêm phong.');
    const [packedSerialItemIds, setPackedSerialItemIds] = useState<string[]>([]);

    // Modal Workflow Action: Bàn giao ĐVVC (Giai đoạn 2 -> 3)
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
    const [handoverTargetOrder, setHandoverTargetOrder] = useState<SupplierReturnOrder | null>(null);
    const [handoverCarrier, setHandoverCarrier] = useState('Viettel Post');
    const [handoverTracking, setHandoverTracking] = useState('');
    const [handoverPhone, setHandoverPhone] = useState('0988.112.334');
    const [handoverStaffName, setHandoverStaffName] = useState('Lê Kho Vận (Thủ kho)');
    const [handoverNotes, setHandoverNotes] = useState('Bàn giao kiện hàng và chứng từ xuất hoàn trả có chữ ký hai bên.');

    // Modal Workflow Action: Giao tới NCC (Giai đoạn 3 -> 4)
    const [isDeliveredModalOpen, setIsDeliveredModalOpen] = useState(false);
    const [deliveredTargetOrder, setDeliveredTargetOrder] = useState<SupplierReturnOrder | null>(null);
    const [deliveredRecipient, setDeliveredRecipient] = useState('Bộ phận tiếp nhận RMA');
    const [deliveredNotes, setDeliveredNotes] = useState('ĐVVC đã bàn giao kiện hàng còn nguyên niêm phong tại kho NCC.');

    // Modal Workflow Action: Quản lý xác nhận hoàn tất (Giai đoạn 4)
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [completeTargetOrder, setCompleteTargetOrder] = useState<SupplierReturnOrder | null>(null);
    const [completeManagerName, setCompleteManagerName] = useState('Nguyễn Văn Quản Lý');
    const [completeFeedback, setCompleteFeedback] = useState('NCC đã đối soát đúng số lượng và mã serial. Đồng ý đổi mới 1:1 theo biên bản.');

    // Copy helper
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

    // Toggle quy trình nghiệp vụ stepper (mở rộng/thu gọn)
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

    /**
     * Tải dữ liệu ban đầu
     */
    const loadAllData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            // Lấy suppliers
            const [supRes, candidates] = await Promise.all([
                adminSupplierService.getAllSuppliers({ size: 100 }).catch(() => ({ content: [] })),
                supplierReturnService.getDefectiveSerialsCandidates(),
            ]);

            const sups = supRes.content || [];
            setSuppliers(sups);
            setDefectiveCandidates(candidates);

            // Lấy orders từ service
            const orders = supplierReturnService.getOrders();
            setReturnOrders(orders);
        } catch (err: any) {
            toast.error(err?.message || 'Không thể tải dữ liệu hoàn trả hàng cho NCC.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSerial(text);
        toast.success(`Đã sao chép mã: ${text}`);
        setTimeout(() => setCopiedSerial(null), 2000);
    };

    /**
     * Thống kê KPI
     */
    const kpiStats = useMemo(() => {
        let total = returnOrders.length;
        let waitingPack = 0;
        let waitingHandover = 0;
        let handedOver = 0;
        let deliveredSupplier = 0;
        let completed = 0;
        let totalEstimatedValue = 0;

        returnOrders.forEach((o) => {
            if (o.status !== 'CANCELLED') {
                totalEstimatedValue += o.totalEstimatedValue || 0;
            }
            if (o.status === 'WAITING_PACK') waitingPack++;
            if (o.status === 'WAITING_HANDOVER') waitingHandover++;
            if (o.status === 'HANDED_OVER') handedOver++;
            if (o.status === 'DELIVERED_SUPPLIER') deliveredSupplier++;
            if (o.status === 'COMPLETED') completed++;
        });

        const activeDefectiveSerials = defectiveCandidates.filter((c) => !c.isInActiveReturnOrder).length;

        return {
            total,
            waitingPack,
            waitingHandover,
            handedOver,
            deliveredSupplier,
            completed,
            totalEstimatedValue,
            activeDefectiveSerials,
        };
    }, [returnOrders, defectiveCandidates]);

    /**
     * Danh sách đơn vị vận chuyển duy nhất
     */
    const carrierOptions = useMemo(() => {
        const set = new Set<string>();
        POPULAR_CARRIERS.forEach((c) => set.add(c.name));
        returnOrders.forEach((o) => {
            if (o.carrierName) set.add(o.carrierName);
        });
        return Array.from(set).map((name) => ({ label: name, value: name }));
    }, [returnOrders]);

    /**
     * Lọc danh sách Đơn hoàn hàng (Tab 1)
     */
    const filteredOrders = useMemo(() => {
        return returnOrders.filter((order) => {
            // Lọc theo Role View
            if (selectedRoleView === 'STORE_MANAGER') {
                if (order.status !== 'WAITING_PACK' && order.status !== 'DELIVERED_SUPPLIER' && order.status !== 'COMPLETED') {
                    return false;
                }
            } else if (selectedRoleView === 'WAREHOUSE_STAFF') {
                if (order.status !== 'WAITING_PACK' && order.status !== 'WAITING_HANDOVER') {
                    return false;
                }
            } else if (selectedRoleView === 'CARRIER_SUPPLIER') {
                if (order.status !== 'HANDED_OVER' && order.status !== 'DELIVERED_SUPPLIER') {
                    return false;
                }
            }

            const q = searchQuery.trim().toLowerCase();
            const matchSearch =
                !q ||
                order.code.toLowerCase().includes(q) ||
                order.supplierName.toLowerCase().includes(q) ||
                order.supplierCode.toLowerCase().includes(q) ||
                (order.trackingNumber && order.trackingNumber.toLowerCase().includes(q)) ||
                (order.carrierName && order.carrierName.toLowerCase().includes(q)) ||
                (order.createdByName && order.createdByName.toLowerCase().includes(q)) ||
                (order.warehouseStaff && order.warehouseStaff.toLowerCase().includes(q)) ||
                (order.packedByName && order.packedByName.toLowerCase().includes(q)) ||
                order.items.some(
                    (it) =>
                        it.serialNumber.toLowerCase().includes(q) ||
                        it.productName.toLowerCase().includes(q) ||
                        it.productCode.toLowerCase().includes(q) ||
                        (it.defectReason && it.defectReason.toLowerCase().includes(q))
                );

            const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
            const matchSupplier = supplierFilter === 'ALL' || String(order.supplierId) === String(supplierFilter);
            const matchResolution = resolutionFilter === 'ALL' || order.resolution === resolutionFilter;
            const matchCarrier =
                carrierFilter === 'ALL' ||
                (order.carrierName && order.carrierName.toLowerCase().includes(carrierFilter.toLowerCase()));

            let matchDate = true;
            if (fromDate) {
                const start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                const orderDate = new Date(order.createdAt);
                if (!isNaN(start.getTime()) && !isNaN(orderDate.getTime())) {
                    matchDate = matchDate && orderDate >= start;
                }
            }
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                const orderDate = new Date(order.createdAt);
                if (!isNaN(end.getTime()) && !isNaN(orderDate.getTime())) {
                    matchDate = matchDate && orderDate <= end;
                }
            }

            return matchSearch && matchStatus && matchSupplier && matchResolution && matchCarrier && matchDate;
        });
    }, [returnOrders, searchQuery, statusFilter, supplierFilter, resolutionFilter, carrierFilter, fromDate, toDate, selectedRoleView]);

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, currentPage, pageSize]);

    const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

    /**
     * Lọc danh sách Serial lỗi chờ lập đơn (Tab 2)
     */
    const filteredCandidates = useMemo(() => {
        return defectiveCandidates.filter((c) => {
            const q = candidateSearchQuery.trim().toLowerCase();
            const matchSearch =
                !q ||
                c.serialNumber.toLowerCase().includes(q) ||
                c.productName.toLowerCase().includes(q) ||
                c.productCode.toLowerCase().includes(q) ||
                (c.goodsReceiptCode && c.goodsReceiptCode.toLowerCase().includes(q)) ||
                (c.defectReason && c.defectReason.toLowerCase().includes(q));

            const matchSupplier =
                candidateSupplierFilter === 'ALL' || String(c.supplierId) === String(candidateSupplierFilter);

            return matchSearch && matchSupplier;
        });
    }, [defectiveCandidates, candidateSearchQuery, candidateSupplierFilter]);

    const paginatedCandidates = useMemo(() => {
        const start = (candidatePage - 1) * candidatePageSize;
        return filteredCandidates.slice(start, start + candidatePageSize);
    }, [filteredCandidates, candidatePage, candidatePageSize]);

    const totalCandidatePages = Math.max(1, Math.ceil(filteredCandidates.length / candidatePageSize));

    /**
     * Mở modal tạo đơn hoàn hàng (Giai đoạn 1)
     */
    const handleOpenCreateModal = (preselectedSupplierId?: number, preselectedSerials?: string[]) => {
        const defaultSupId = preselectedSupplierId || (suppliers.length > 0 ? suppliers[0].id : 1);
        setCreateSupplierId(defaultSupId);
        setCreateResolution('REPLACE');
        setCreateReason('Phát hiện lỗi không hoạt động / trầy xước ngoại quan khi kiểm đếm nhập kho');
        setCreateManagerNotes('Yêu cầu bọc xốp chống sốc 2 lớp, kiểm tra đúng serial trên thân máy và dán tem niêm phong.');
        setSelectedCandidateSerials(preselectedSerials || []);
        setIsCreateModalOpen(true);
    };

    /**
     * Danh sách serial lỗi khả dụng cho NCC đang chọn trong modal tạo đơn
     */
    const availableSerialsForSelectedSupplier = useMemo(() => {
        return defectiveCandidates.filter(
            (c) => c.supplierId === createSupplierId && !c.isInActiveReturnOrder
        );
    }, [defectiveCandidates, createSupplierId]);

    const handleToggleSerialCandidate = (serialNumber: string) => {
        setSelectedCandidateSerials((prev) =>
            prev.includes(serialNumber) ? prev.filter((s) => s !== serialNumber) : [...prev, serialNumber]
        );
    };

    const handleSelectAllCandidates = () => {
        if (selectedCandidateSerials.length === availableSerialsForSelectedSupplier.length) {
            setSelectedCandidateSerials([]);
        } else {
            setSelectedCandidateSerials(availableSerialsForSelectedSupplier.map((s) => s.serialNumber));
        }
    };

    /**
     * Xác nhận tạo đơn hoàn hàng (Giai đoạn 1: Quản lý cửa hàng hoàn tất & gửi kho)
     */
    const handleConfirmCreateOrder = () => {
        const sup = suppliers.find((s) => s.id === createSupplierId);
        if (!sup) {
            toast.warning('Vui lòng chọn Nhà cung cấp hợp lệ.');
            return;
        }

        if (selectedCandidateSerials.length === 0) {
            toast.warning('Vui lòng chọn ít nhất 01 mã Serial lỗi để xuất hoàn trả.');
            return;
        }

        const chosenSerials = defectiveCandidates.filter((c) => selectedCandidateSerials.includes(c.serialNumber));

        setIsSubmittingCreate(true);
        try {
            const newOrder = supplierReturnService.createOrder({
                supplierId: sup.id,
                supplierName: sup.name,
                supplierCode: sup.code,
                supplierPhone: sup.phoneNumber || '---',
                supplierEmail: sup.email || '---',
                supplierAddress: sup.address || undefined,
                resolution: createResolution,
                returnReasonGeneral: createReason,
                managerNotes: createManagerNotes,
                createdByName: createManagerName,
                selectedSerials: chosenSerials,
            });

            // Reload data
            loadAllData();
            setIsCreateModalOpen(false);
            toast.success(
                `Khởi tạo thành công Phiếu hoàn hàng ${newOrder.code}! Trạng thái: "Chờ đóng gói hoàn hàng" đã được gửi xuống bộ phận kho.`
            );
        } catch (err: any) {
            toast.error(err?.message || 'Không thể tạo đơn hoàn hàng.');
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    /**
     * GIAI ĐOẠN 2: Mở modal đóng gói của nhân viên kho
     */
    const handleOpenPackModal = (order: SupplierReturnOrder) => {
        setPackTargetOrder(order);
        setPackStaffName('Lê Kho Vận (Thủ kho)');
        setPackNotes('Đã lấy các serial chỉ định từ khu hàng lỗi, đóng gói thùng xốp theo quy chuẩn bảo quản và dán tem niêm phong.');
        setPackedSerialItemIds(order.items.map((it) => it.id));
        setIsPackModalOpen(true);
    };

    const handleConfirmPackOrder = () => {
        if (!packTargetOrder) return;
        try {
            const updated = supplierReturnService.confirmPacking(packTargetOrder.id, {
                warehouseStaff: packStaffName,
                warehouseNotes: packNotes,
                packedItemIds: packedSerialItemIds,
            });
            loadAllData();
            if (selectedOrder && selectedOrder.id === updated.id) {
                setSelectedOrder(updated);
            }
            setIsPackModalOpen(false);
            toast.success(
                `Nhân viên kho đã đóng gói thành công phiếu ${updated.code}! Trạng thái chuyển sang: "Chờ bàn giao ĐVVC".`
            );
        } catch (err: any) {
            toast.error(err?.message || 'Lỗi khi xác nhận đóng gói.');
        }
    };

    /**
     * GIAI ĐOẠN 2 -> 3: Bàn giao cho ĐVVC
     */
    const handleOpenHandoverModal = (order: SupplierReturnOrder) => {
        setHandoverTargetOrder(order);
        const randTracking = `VTP-${Math.floor(1000000000 + Math.random() * 9000000000)}VN`;
        setHandoverCarrier('Viettel Post');
        setHandoverTracking(randTracking);
        setHandoverPhone('0988.112.334');
        setHandoverStaffName('Lê Kho Vận (Thủ kho)');
        setHandoverNotes('Bàn giao kiện hàng và chứng từ xuất hoàn trả có chữ ký hai bên.');
        setIsHandoverModalOpen(true);
    };

    const handleConfirmHandover = () => {
        if (!handoverTargetOrder) return;
        if (!handoverTracking.trim()) {
            toast.warning('Vui lòng nhập Mã vận đơn (Tracking number).');
            return;
        }

        try {
            const updated = supplierReturnService.handoverToCarrier(handoverTargetOrder.id, {
                carrierName: handoverCarrier,
                trackingNumber: handoverTracking.trim(),
                carrierPhone: handoverPhone.trim(),
                carrierNotes: handoverNotes.trim(),
                staffName: handoverStaffName,
            });
            loadAllData();
            if (selectedOrder && selectedOrder.id === updated.id) {
                setSelectedOrder(updated);
            }
            setIsHandoverModalOpen(false);
            toast.success(
                `Đã bàn giao kiện hàng phiếu ${updated.code} cho ${handoverCarrier}! Mã vận đơn: ${handoverTracking}. Trạng thái: "Đã bàn giao ĐVVC / Đang vận chuyển".`
            );
        } catch (err: any) {
            toast.error(err?.message || 'Lỗi khi bàn giao cho ĐVVC.');
        }
    };

    /**
     * GIAI ĐOẠN 3 -> 4: ĐVVC giao hàng tới NCC
     */
    const handleOpenDeliveredModal = (order: SupplierReturnOrder) => {
        setDeliveredTargetOrder(order);
        setDeliveredRecipient(order.supplierContactPerson || 'Bộ phận tiếp nhận RMA NCC');
        setDeliveredNotes(`ĐVVC ${order.carrierName || 'Vận chuyển'} đã bàn giao kiện hàng còn nguyên vẹn niêm phong tại kho của ${order.supplierName}.`);
        setIsDeliveredModalOpen(true);
    };

    const handleConfirmDelivered = () => {
        if (!deliveredTargetOrder) return;
        try {
            const updated = supplierReturnService.confirmDeliveredToSupplier(deliveredTargetOrder.id, {
                receivedByAtSupplier: deliveredRecipient,
                deliveryNotes: deliveredNotes,
            });
            loadAllData();
            if (selectedOrder && selectedOrder.id === updated.id) {
                setSelectedOrder(updated);
            }
            setIsDeliveredModalOpen(false);
            toast.success(
                `Kiện hàng ${updated.code} đã được giao thành công tới ${updated.supplierName}! Nhà cung cấp đang tiến hành đối soát serial.`
            );
        } catch (err: any) {
            toast.error(err?.message || 'Lỗi khi cập nhật giao hàng tới NCC.');
        }
    };

    /**
     * GIAI ĐOẠN 4: Quản lý cửa hàng nhận phản hồi & xác nhận hoàn tất quy trình
     */
    const handleOpenCompleteModal = (order: SupplierReturnOrder) => {
        setCompleteTargetOrder(order);
        setCompleteManagerName('Nguyễn Văn Quản Lý');
        setCompleteFeedback(
            `NCC ${order.supplierName} đã kiểm tra ngoại quan và đối soát đúng ${order.totalQuantity} mã serial. Đồng ý ${RESOLUTION_LABELS[order.resolution].toLowerCase()}. Biên bản RMA số ${order.code}-OK.`
        );
        setIsCompleteModalOpen(true);
    };

    const handleConfirmComplete = () => {
        if (!completeTargetOrder) return;
        try {
            const updated = supplierReturnService.completeOrder(completeTargetOrder.id, {
                managerName: completeManagerName,
                supplierFeedbackNote: completeFeedback,
            });
            loadAllData();
            if (selectedOrder && selectedOrder.id === updated.id) {
                setSelectedOrder(updated);
            }
            setIsCompleteModalOpen(false);
            toast.success(
                `Quản lý cửa hàng đã xác nhận hoàn hàng thành công cho phiếu ${updated.code}! Toàn bộ mã serial đã được đóng quy trình hoàn trả.`
            );
        } catch (err: any) {
            toast.error(err?.message || 'Lỗi khi xác nhận hoàn tất.');
        }
    };

    /**
     * Mở modal chi tiết
     */
    const handleOpenDetail = (order: SupplierReturnOrder) => {
        setSelectedOrder(order);
        setActiveDetailTab('info');
        setIsDetailModalOpen(true);
    };

    // Filter fields cho AdminFilter (Tab 1: Phiếu hoàn hàng)
    const filterFields: FilterField[] = useMemo(
        () => [
            {
                id: 'status',
                name: 'status',
                label: 'Giai đoạn / Trạng thái',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                icon: Clock,
                options: [
                    { label: 'GĐ 1: Chờ đóng gói hoàn hàng (WAITING_PACK)', value: 'WAITING_PACK' },
                    { label: 'GĐ 2: Chờ bàn giao ĐVVC (WAITING_HANDOVER)', value: 'WAITING_HANDOVER' },
                    { label: 'GĐ 3: Đã bàn giao ĐVVC / Đang vận chuyển (HANDED_OVER)', value: 'HANDED_OVER' },
                    { label: 'GĐ 4: Đã giao NCC / Đang đối soát (DELIVERED_SUPPLIER)', value: 'DELIVERED_SUPPLIER' },
                    { label: 'GĐ 4: Đã hoàn hàng thành công (COMPLETED)', value: 'COMPLETED' },
                    { label: 'Đã hủy đơn hoàn trả (CANCELLED)', value: 'CANCELLED' },
                ],
            },
            {
                id: 'supplier',
                name: 'supplier',
                label: 'Nhà cung cấp',
                type: 'select',
                placeholder: 'Tất cả nhà cung cấp',
                icon: Building2,
                options: suppliers.map((s) => ({
                    label: `${s.name} (${s.code})`,
                    value: String(s.id),
                })),
            },
            {
                id: 'resolution',
                name: 'resolution',
                label: 'Hình thức xử lý',
                type: 'select',
                placeholder: 'Tất cả hình thức',
                icon: Tag,
                options: [
                    { label: 'Đổi mới sản phẩm tương đương 1:1 (REPLACE)', value: 'REPLACE' },
                    { label: 'Bồi hoàn tiền mặt / Trừ công nợ (REFUND)', value: 'REFUND' },
                    { label: 'Bảo hành sửa chữa chính hãng (REPAIR)', value: 'REPAIR' },
                ],
            },
            {
                id: 'carrier',
                name: 'carrier',
                label: 'Đơn vị vận chuyển',
                type: 'select',
                placeholder: 'Tất cả ĐVVC',
                icon: Truck,
                options: carrierOptions,
            },
            {
                id: 'fromDate',
                name: 'fromDate',
                label: 'Từ ngày lập',
                type: 'date',
                icon: Calendar,
            },
            {
                id: 'toDate',
                name: 'toDate',
                label: 'Đến ngày lập',
                type: 'date',
                icon: Calendar,
            },
        ],
        [suppliers, carrierOptions]
    );

    // Active filter values passed to AdminFilter (chỉ giữ lại các giá trị lọc thực sự kích hoạt)
    const filterValues = useMemo(() => {
        const vals: Record<string, any> = {};
        if (statusFilter && statusFilter !== 'ALL') {
            vals.status = statusFilter;
        }
        if (supplierFilter && supplierFilter !== 'ALL') {
            vals.supplier = supplierFilter;
        }
        if (resolutionFilter && resolutionFilter !== 'ALL') {
            vals.resolution = resolutionFilter;
        }
        if (carrierFilter && carrierFilter !== 'ALL') {
            vals.carrier = carrierFilter;
        }
        if (fromDate) {
            vals.fromDate = fromDate;
        }
        if (toDate) {
            vals.toDate = toDate;
        }
        return vals;
    }, [statusFilter, supplierFilter, resolutionFilter, carrierFilter, fromDate, toDate]);

    // Xử lý thay đổi filter từ AdminFilter (dropdown, chips tag, xóa lọc)
    const handleFilterChange = (newValues: Record<string, any>) => {
        setStatusFilter(newValues.status || 'ALL');
        setSupplierFilter(newValues.supplier || 'ALL');
        setResolutionFilter(newValues.resolution || 'ALL');
        setCarrierFilter(newValues.carrier || 'ALL');
        setFromDate(newValues.fromDate || '');
        setToDate(newValues.toDate || '');
        setCurrentPage(1);
    };

    // Đặt lại toàn bộ bộ lọc
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setSupplierFilter('ALL');
        setResolutionFilter('ALL');
        setCarrierFilter('ALL');
        setFromDate('');
        setToDate('');
        setSelectedRoleView('ALL');
        setCurrentPage(1);
    };

    /**
     * Cột bảng Phiếu hoàn hàng
     */
    const orderColumns: Column<SupplierReturnOrder>[] = [
        {
            key: 'code',
            header: 'Mã đơn hoàn hàng',
            render: (order) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                        <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span
                                className="font-mono font-bold text-gray-900 hover:text-blue-600 cursor-pointer"
                                onClick={() => handleOpenDetail(order)}
                            >
                                {order.code}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(order.code);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                title="Sao chép mã đơn"
                            >
                                {copiedSerial === order.code ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateTime(order.createdAt)}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp tiếp nhận',
            render: (order) => (
                <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{order.supplierName}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>Mã: <b className="font-mono text-gray-700">{order.supplierCode}</b></span>
                        <span>•</span>
                        <span>{order.supplierPhone}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'items',
            header: 'Sản phẩm & Serial chỉ định',
            render: (order) => (
                <div>
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                        <Boxes className="w-4 h-4 text-indigo-600" />
                        <span>{order.totalQuantity} mã Serial</span>
                        <span className="text-xs font-normal text-gray-400">({formatVND(order.totalEstimatedValue)})</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5 line-clamp-1">
                        {order.items.map((it) => it.serialNumber).join(', ')}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Tiến độ 4 giai đoạn',
            align: 'center',
            render: (order) => {
                const conf = RETURN_STATUS_CONFIG[order.status] || RETURN_STATUS_CONFIG.WAITING_PACK;
                const IconComp = conf.icon;
                return (
                    <div className="flex flex-col items-center gap-1">
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${conf.badgeClass}`}
                        >
                            <IconComp className="w-3.5 h-3.5" />
                            {conf.label}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                            Bước tiếp: <b className="text-gray-700">{conf.nextActor}</b>
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'shipping',
            header: 'Vận chuyển & Bàn giao',
            render: (order) => {
                if (order.carrierName) {
                    return (
                        <div className="text-xs">
                            <div className="font-medium text-blue-700 flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5" />
                                <span>{order.carrierName}</span>
                            </div>
                            <div className="font-mono text-gray-600 text-[11px] mt-0.5">
                                Vận đơn: <b>{order.trackingNumber || '---'}</b>
                            </div>
                        </div>
                    );
                }
                return (
                    <span className="text-xs text-gray-400 italic flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Chưa bàn giao ĐVVC
                    </span>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác nghiệp vụ',
            align: 'right',
            render: (order) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Nút hành động nhanh theo giai đoạn */}
                    {order.status === 'WAITING_PACK' && (
                        <button
                            type="button"
                            onClick={() => handleOpenPackModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Nhân viên kho tiếp nhận đóng gói"
                        >
                            <Box className="w-3.5 h-3.5" />
                            <span>Kho đóng gói</span>
                        </button>
                    )}

                    {order.status === 'WAITING_HANDOVER' && (
                        <button
                            type="button"
                            onClick={() => handleOpenHandoverModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Bàn giao kiện hàng cho ĐVVC"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Giao ĐVVC</span>
                        </button>
                    )}

                    {order.status === 'HANDED_OVER' && (
                        <button
                            type="button"
                            onClick={() => handleOpenDeliveredModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Xác nhận ĐVVC đã giao tới NCC"
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Đã tới NCC</span>
                        </button>
                    )}

                    {order.status === 'DELIVERED_SUPPLIER' && (
                        <button
                            type="button"
                            onClick={() => handleOpenCompleteModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Quản lý xác nhận đối soát & Hoàn tất"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Hoàn tất quy trình</span>
                        </button>
                    )}

                    {/* Xem chi tiết & In biên bản */}
                    <AdminActionDropdown
                        onView={() => handleOpenDetail(order)}
                        viewLabel="Xem chi tiết & Tiến trình"
                        actions={[
                            {
                                key: 'print',
                                label: 'In biên bản xuất hoàn & Bàn giao ĐVVC',
                                icon: Printer,
                                variant: 'primary',
                                onClick: () => {
                                    handleOpenDetail(order);
                                    setActiveDetailTab('print');
                                },
                            },
                        ]}
                    />
                </div>
            ),
        },
    ];

    /**
     * Cột bảng Kho hàng lỗi & Serial chờ xuất trả (Defective Pool Tab)
     */
    const candidateColumns: Column<DefectiveSerialCandidate>[] = [
        {
            key: 'serialNumber',
            header: 'Mã Serial lỗi',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900">
                            <span>{item.serialNumber}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(item.serialNumber);
                                }}
                                className="p-0.5 text-gray-400 hover:text-blue-600 rounded"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="text-[11px] text-gray-400">Phiếu nhập: {item.goodsReceiptCode || '---'}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'product',
            header: 'Linh kiện / Thiết bị',
            render: (item) => (
                <div>
                    <div className="font-semibold text-gray-900 line-clamp-1">{item.productName}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                        <span>{item.productCode}</span> • <span className="font-sans text-gray-700 font-medium">{formatVND(item.productPrice)}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp cung ứng',
            render: (item) => (
                <div>
                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.supplierName}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{item.supplierCode}</div>
                </div>
            ),
        },
        {
            key: 'defectReason',
            header: 'Mô tả tình trạng lỗi kiểm đếm',
            render: (item) => (
                <div className="text-xs text-rose-700 max-w-md line-clamp-2">
                    {item.defectReason}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Tình trạng xử lý',
            align: 'center',
            render: (item) => {
                if (item.isInActiveReturnOrder) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Box className="w-3 h-3" />
                            Đã đưa vào đơn hoàn hàng
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                        <Clock className="w-3 h-3" />
                        Chờ Quản lý lập đơn hoàn trả
                    </span>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div>
                    {!item.isInActiveReturnOrder && (
                        <button
                            type="button"
                            onClick={() => handleOpenCreateModal(item.supplierId, [item.serialNumber])}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Lập đơn hoàn NCC</span>
                        </button>
                    )}
                </div>
            ),
        },
    ];

    // Detail Tabs
    const detailTabs: ModalTab[] = [
        { id: 'info', label: 'Tiến độ & Chi tiết sản phẩm', icon: FileText },
        { id: 'history', label: 'Nhật ký 4 giai đoạn', icon: Clock },
        { id: 'print', label: 'In biên bản bàn giao ĐVVC & NCC', icon: Printer },
    ];

    return (
        <div className="space-y-6">
            {/* ======================================================== */}
            {/* HEADER                                                   */}
            {/* ======================================================== */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
                            <RotateCcw className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Quản lý hoàn trả hàng cho Nhà Cung Cấp
                            </h1>
                            <p className="text-sm text-gray-500">
                                Quy trình hoàn hàng 4 giai đoạn: Cửa hàng (Quản lý & Kho) ➔ Đơn vị vận chuyển (ĐVVC) ➔ Nhà cung cấp
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadAllData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenCreateModal()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all cursor-pointer shadow-sm shadow-rose-600/30"
                    >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Lập đơn hoàn hàng (GĐ 1)</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* KPI STATS CARDS                                          */}
            {/* ======================================================== */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div
                    onClick={() => {
                        setStatusFilter('ALL');
                        setActiveMainTab('orders');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer ${statusFilter === 'ALL' && activeMainTab === 'orders'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 shadow-xs'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Tổng đơn hoàn</span>
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                            <RotateCcw className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{kpiStats.total} đơn</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 font-sans">{formatVND(kpiStats.totalEstimatedValue)}</div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('WAITING_PACK');
                        setActiveMainTab('orders');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer ${statusFilter === 'WAITING_PACK' && activeMainTab === 'orders'
                        ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 shadow-xs'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">1. Chờ đóng gói</span>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Box className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-amber-700 mt-1">{kpiStats.waitingPack} đơn</div>
                    <div className="text-[11px] text-amber-600 font-medium mt-0.5">Kho chuẩn bị đóng</div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('WAITING_HANDOVER');
                        setActiveMainTab('orders');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer ${statusFilter === 'WAITING_HANDOVER' && activeMainTab === 'orders'
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 shadow-xs'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">2. Chờ bàn giao</span>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-indigo-700 mt-1">{kpiStats.waitingHandover} đơn</div>
                    <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Đã đóng gói xong</div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('HANDED_OVER');
                        setActiveMainTab('orders');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer ${statusFilter === 'HANDED_OVER' && activeMainTab === 'orders'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 shadow-xs'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">3. Đang vận chuyển</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Truck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-blue-700 mt-1">{kpiStats.handedOver} đơn</div>
                    <div className="text-[11px] text-blue-600 font-medium mt-0.5">ĐVVC đang giao</div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('DELIVERED_SUPPLIER');
                        setActiveMainTab('orders');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer ${statusFilter === 'DELIVERED_SUPPLIER' && activeMainTab === 'orders'
                        ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 shadow-xs'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">4. NCC đối soát</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-purple-700 mt-1">{kpiStats.deliveredSupplier} đơn</div>
                    <div className="text-[11px] text-purple-600 font-medium mt-0.5">Chờ Quản lý duyệt</div>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter('COMPLETED');
                        setActiveMainTab('orders');
                        setCurrentPage(1);
                    }}
                    className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer ${statusFilter === 'COMPLETED' && activeMainTab === 'orders'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 shadow-xs'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Hoàn tất thành công</span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">{kpiStats.completed} đơn</div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Đã đóng quy trình</div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE TABS NAVIGATION & ROLE FILTER                  */}
            {/* ======================================================== */}
            <div className="flex items-center justify-between border-b border-gray-200 pt-1">
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab('orders');
                            setCurrentPage(1);
                        }}
                        className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm transition-all cursor-pointer ${
                            activeMainTab === 'orders'
                                ? 'border-rose-600 text-rose-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Phiếu hoàn hàng NCC</span>
                        <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                activeMainTab === 'orders' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {filteredOrders.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab('defective_pool');
                            setCandidatePage(1);
                        }}
                        className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm transition-all cursor-pointer ${
                            activeMainTab === 'defective_pool'
                                ? 'border-rose-600 text-rose-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Kho linh kiện lỗi chờ hoàn trả</span>
                        {kpiStats.activeDefectiveSerials > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                {kpiStats.activeDefectiveSerials}
                            </span>
                        )}
                    </button>
                </div>

                {/* Role View Filter Selector */}
                {activeMainTab === 'orders' && (
                    <div className="hidden lg:flex items-center gap-1.5 pb-2">
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                            Góc nhìn vai trò:
                        </span>
                        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
                            {[
                                { key: 'ALL', label: 'Tất cả' },
                                { key: 'STORE_MANAGER', label: 'Quản lý' },
                                { key: 'WAREHOUSE_STAFF', label: 'Thủ kho' },
                                { key: 'CARRIER_SUPPLIER', label: 'ĐVVC / NCC' },
                            ].map((role) => (
                                <button
                                    key={role.key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedRoleView(role.key as any);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                        selectedRoleView === role.key
                                            ? 'bg-white text-gray-900 shadow-2xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* TAB 1: DANH SÁCH PHIẾU HOÀN HÀNG TỚI NCC                  */}
            {/* ======================================================== */}
            {activeMainTab === 'orders' && (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <AdminFilter
                        searchQuery={searchQuery}
                        onSearchChange={(q) => {
                            setSearchQuery(q);
                            setCurrentPage(1);
                        }}
                        searchPlaceholder="Tìm kiếm theo mã đơn hoàn hàng (PR-...), tên NCC, mã vận đơn, mã Serial..."
                        fields={filterFields}
                        values={filterValues}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />

                    {/* Table Orders */}
                    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                        <AdminTable<SupplierReturnOrder>
                            columns={orderColumns}
                            data={paginatedOrders}
                            rowKey="id"
                            loading={isLoading}
                            emptyText="Không tìm thấy phiếu hoàn trả hàng nào phù hợp với bộ lọc."
                            emptyIcon={RotateCcw}
                            currentPage={currentPage}
                            totalPages={totalOrderPages}
                            totalItems={filteredOrders.length}
                            pageSize={pageSize}
                            pageSizeOptions={[10, 20, 30]}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={(sz) => {
                                setPageSize(sz);
                                setCurrentPage(1);
                            }}
                            showPageSizeSelector={true}
                            itemUnitName="đơn"
                            onRowClick={(order) => handleOpenDetail(order)}
                        />
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: KHO HÀNG LỖI & SERIAL CHỜ LẬP ĐƠN HOÀN TRẢ         */}
            {/* ======================================================== */}
            {activeMainTab === 'defective_pool' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">
                                    Kho hàng lỗi & Linh kiện kiểm đếm không đạt chuẩn (Defective Items Pool)
                                </p>
                                <p className="text-amber-800 mt-0.5">
                                    Đây là danh sách các sản phẩm và mã Serial phát hiện lỗi khi kiểm đếm nhập kho hoặc kiểm tra kỹ thuật.
                                    Quản lý cửa hàng có thể rà soát và bấm <b>"Lập đơn hoàn NCC"</b> để bắt đầu Giai đoạn 1 của quy trình.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleOpenCreateModal()}
                            className="shrink-0 px-3 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span>Tạo đơn hoàn mới</span>
                        </button>
                    </div>

                    {/* Filter Bar for Defective Candidates */}
                    <AdminFilter
                        searchQuery={candidateSearchQuery}
                        onSearchChange={(q) => {
                            setCandidateSearchQuery(q);
                            setCandidatePage(1);
                        }}
                        searchPlaceholder="Tìm kiếm mã Serial lỗi, mã linh kiện, tên linh kiện, phiếu nhập, lý do lỗi..."
                        fields={[
                            {
                                id: 'supplier',
                                name: 'supplier',
                                label: 'Nhà cung cấp',
                                type: 'select',
                                placeholder: 'Tất cả nhà cung cấp',
                                icon: Building2,
                                options: suppliers.map((s) => ({
                                    label: `${s.name} (${s.code})`,
                                    value: String(s.id),
                                })),
                            },
                        ]}
                        values={candidateSupplierFilter !== 'ALL' ? { supplier: candidateSupplierFilter } : {}}
                        onFilterChange={(vals) => {
                            setCandidateSupplierFilter(vals.supplier || 'ALL');
                            setCandidatePage(1);
                        }}
                        onReset={() => {
                            setCandidateSearchQuery('');
                            setCandidateSupplierFilter('ALL');
                            setCandidatePage(1);
                        }}
                    />

                    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                        <AdminTable<DefectiveSerialCandidate>
                            columns={candidateColumns}
                            data={paginatedCandidates}
                            rowKey="serialNumber"
                            loading={isLoading}
                            emptyText="Hiện tại không có mã Serial lỗi nào đang tồn đọng trong kho phù hợp với bộ lọc."
                            emptyIcon={CheckCircle2}
                            currentPage={candidatePage}
                            totalPages={totalCandidatePages}
                            totalItems={filteredCandidates.length}
                            pageSize={candidatePageSize}
                            pageSizeOptions={[10, 20, 30]}
                            onPageChange={setCandidatePage}
                            onPageSizeChange={(sz) => {
                                setCandidatePageSize(sz);
                                setCandidatePage(1);
                            }}
                            showPageSizeSelector={true}
                            itemUnitName="serial"
                        />
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 1: QUẢN LÝ LẬP ĐƠN HOÀN HÀNG MỚI          */}
            {/* ======================================================== */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-rose-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">
                                        Khởi tạo đơn hoàn hàng tới Nhà cung cấp (Giai đoạn 1)
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Quản lý cửa hàng lựa chọn NCC, chỉ định mã Serial lỗi và gửi yêu cầu đóng gói xuống kho
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-5 text-xs">
                            {/* BƯỚC 1: CHỌN NHÀ CUNG CẤP */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-rose-600" />
                                        <span>Bước 1: Chọn Nhà cung cấp cần hoàn hàng <span className="text-rose-500">*</span></span>
                                    </label>
                                    <span className="text-gray-500 text-[11px]">
                                        Chỉ hiển thị các serial lỗi thuộc về NCC này
                                    </span>
                                </div>

                                <AdminSelect
                                    value={createSupplierId}
                                    onChange={(e) => {
                                        setCreateSupplierId(Number(e.target.value));
                                        setSelectedCandidateSerials([]);
                                    }}
                                >
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.code}) - {s.phoneNumber || 'Không có SĐT'}
                                        </option>
                                    ))}
                                </AdminSelect>
                            </div>

                            {/* BƯỚC 2: CHỈ ĐỊNH SẢN PHẨM & MÃ SERIAL */}
                            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                                    <label className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <Barcode className="w-4 h-4 text-blue-600" />
                                        <span>Bước 2: Kiểm tra và chọn mã Serial cần hoàn hàng <span className="text-rose-500">*</span></span>
                                    </label>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllCandidates}
                                            className="px-2.5 py-1 text-xs text-blue-700 font-semibold hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                        >
                                            {selectedCandidateSerials.length === availableSerialsForSelectedSupplier.length && availableSerialsForSelectedSupplier.length > 0
                                                ? 'Bỏ chọn tất cả'
                                                : 'Chọn tất cả serial'}
                                        </button>
                                        <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                                            Đã chọn: {selectedCandidateSerials.length}
                                        </span>
                                    </div>
                                </div>

                                {availableSerialsForSelectedSupplier.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500 border border-dashed rounded-xl space-y-1">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                                        <p className="font-medium text-gray-700">Không có mã Serial lỗi nào đang tồn đọng của Nhà cung cấp này.</p>
                                        <p className="text-[11px] text-gray-400">Bạn có thể chọn Nhà cung cấp khác hoặc kiểm tra lại kho kiểm đếm.</p>
                                    </div>
                                ) : (
                                    <div className="max-h-56 overflow-y-auto border rounded-xl divide-y">
                                        {availableSerialsForSelectedSupplier.map((item) => {
                                            const isSelected = selectedCandidateSerials.includes(item.serialNumber);
                                            return (
                                                <div
                                                    key={item.serialNumber}
                                                    onClick={() => handleToggleSerialCandidate(item.serialNumber)}
                                                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-rose-50/70 border-rose-200' : 'hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-rose-600">
                                                            {isSelected ? (
                                                                <CheckSquare className="w-4 h-4 text-rose-600" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-mono font-bold text-gray-900 flex items-center gap-1.5">
                                                                <span>{item.serialNumber}</span>
                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-sans">
                                                                    {item.productCode}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-600 font-medium line-clamp-1">{item.productName}</div>
                                                            <div className="text-[11px] text-rose-600 italic mt-0.5">Lỗi: {item.defectReason}</div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <div className="font-bold text-gray-900 font-mono">{formatVND(item.productPrice)}</div>
                                                        <div className="text-[10px] text-gray-400">Phiếu: {item.goodsReceiptCode || '---'}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* BƯỚC 3: THIẾT LẬP PHƯƠNG ÁN & GỬI YÊU CẦU ĐÓNG GÓI XUỐNG KHO */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                <label className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                                    <span>Bước 3: Phương án giải quyết & Giao nhiệm vụ xuống kho</span>
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <AdminLabel>Hình thức xử lý mong muốn:</AdminLabel>
                                        <AdminSelect
                                            value={createResolution}
                                            onChange={(e) => setCreateResolution(e.target.value as ReturnResolutionType)}
                                        >
                                            <option value="REPLACE">Đổi mới sản phẩm 1:1 theo hợp đồng</option>
                                            <option value="REFUND">Bồi hoàn tiền mặt / Cấn trừ công nợ</option>
                                            <option value="REPAIR">Gửi sang trung tâm bảo hành chính hãng</option>
                                        </AdminSelect>
                                    </div>

                                    <div>
                                        <AdminLabel>Quản lý phụ trách lập phiếu:</AdminLabel>
                                        <AdminInput
                                            type="text"
                                            value={createManagerName}
                                            onChange={(e) => setCreateManagerName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <AdminLabel>Lý do hoàn trả chung ghi nhận:</AdminLabel>
                                    <AdminTextarea
                                        rows={2}
                                        value={createReason}
                                        onChange={(e) => setCreateReason(e.target.value)}
                                        placeholder="Nhập lý do xuất trả hàng..."
                                    />
                                </div>

                                <div>
                                    <AdminLabel className="flex items-center gap-1.5 text-blue-700">
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Ghi chú dặn dò gửi Bộ phận kho (Hướng dẫn đóng gói bảo quản):</span>
                                    </AdminLabel>
                                    <AdminTextarea
                                        rows={2}
                                        value={createManagerNotes}
                                        onChange={(e) => setCreateManagerNotes(e.target.value)}
                                        placeholder="Ví dụ: Bọc xốp chống sốc 2 lớp, niêm phong tem đỏ, đối chiếu kỹ mã SN..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-t">
                            <div className="text-xs">
                                <span className="text-gray-500">Tổng sản phẩm hoàn: </span>
                                <b className="text-gray-900">{selectedCandidateSerials.length} serial</b>
                            </div>

                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Hủy bỏ
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="danger"
                                    onClick={handleConfirmCreateOrder}
                                    disabled={isSubmittingCreate || selectedCandidateSerials.length === 0}
                                    isLoading={isSubmittingCreate}
                                    icon={Send}
                                >
                                    Khởi tạo đơn & Gửi yêu cầu đóng gói xuống kho
                                </AdminButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 2: NHÂN VIÊN KHO ĐÓNG GÓI                 */}
            {/* ======================================================== */}
            {isPackModalOpen && packTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-[80vw] h-[80vh] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-amber-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-600 text-white rounded-xl">
                                    <Box className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">
                                        Giai đoạn 2: Nhân viên kho thực hiện đóng gói
                                    </h3>
                                    <p className="text-xs text-amber-800">
                                        Phiếu hoàn hàng: <b>{packTargetOrder.code}</b> • NCC: {packTargetOrder.supplierName}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPackModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            {/* Ghi chú từ Quản lý */}
                            {packTargetOrder.managerNotes && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5 text-blue-800">
                                        <Info className="w-3.5 h-3.5" />
                                        <span>Yêu cầu từ Quản lý cửa hàng:</span>
                                    </div>
                                    <p className="text-blue-950 leading-relaxed">{packTargetOrder.managerNotes}</p>
                                </div>
                            )}

                            {/* Danh sách serial cần đóng gói */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-gray-800 block">
                                    Các mã Serial chỉ định cần lấy từ khu hàng lỗi ({packTargetOrder.items.length} cá thể):
                                </label>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 max-h-40 overflow-y-auto">
                                    {packTargetOrder.items.map((it) => (
                                        <div key={it.id} className="flex items-center justify-between text-xs">
                                            <div>
                                                <span className="font-mono font-bold text-rose-700">{it.serialNumber}</span>
                                                <span className="text-gray-500 ml-2 font-medium">{it.productName}</span>
                                            </div>
                                            <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                                                <CheckCircle2 className="w-3 h-3" /> Đã kiểm ngoại quan
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Tên nhân viên kho phụ trách đóng gói:</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={packStaffName}
                                    onChange={(e) => setPackStaffName(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Quy cách & Ghi chú đóng gói:</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={packNotes}
                                    onChange={(e) => setPackNotes(e.target.value)}
                                    placeholder="Ghi chú quy chuẩn đóng gói thùng xốp, dán tem..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 border-t">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsPackModalOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleConfirmPackOrder}
                                icon={CheckCircle2}
                                className="!bg-amber-600 hover:!bg-amber-700 shadow-amber-600/30"
                            >
                                Xác nhận đóng gói hoàn tất (Chuyển sang Chờ bàn giao ĐVVC)
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 2 -> 3: BÀN GIAO CHO ĐVVC                */}
            {/* ======================================================== */}
            {isHandoverModalOpen && handoverTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-[80vw] h-[80vh] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-indigo-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">
                                        Giai đoạn 2 ➔ 3: Bàn giao đơn hoàn tới Đơn vị vận chuyển (ĐVVC)
                                    </h3>
                                    <p className="text-xs text-indigo-800">
                                        Phiếu: <b>{handoverTargetOrder.code}</b> • Địa chỉ NCC: {handoverTargetOrder.supplierAddress || 'Kho trung tâm NCC'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHandoverModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            <div>
                                <AdminLabel required>Đơn vị vận chuyển đối tác</AdminLabel>
                                <AdminSelect
                                    value={handoverCarrier}
                                    onChange={(e) => setHandoverCarrier(e.target.value)}
                                    required
                                >
                                    {POPULAR_CARRIERS.map((c) => (
                                        <option key={c.name} value={c.name}>
                                            {c.name} ({c.speed} - Hotline: {c.hotline})
                                        </option>
                                    ))}
                                </AdminSelect>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <AdminLabel required>Mã vận đơn (Tracking number)</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={handoverTracking}
                                        onChange={(e) => setHandoverTracking(e.target.value)}
                                        className="font-mono font-bold text-blue-700"
                                        placeholder="Ví dụ: VTP-8849201948VN"
                                        required
                                    />
                                </div>

                                <div>
                                    <AdminLabel>SĐT tài xế / tổng đài ĐVVC:</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={handoverPhone}
                                        onChange={(e) => setHandoverPhone(e.target.value)}
                                        placeholder="09xx..."
                                    />
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Nhân viên kho bàn giao:</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={handoverStaffName}
                                    onChange={(e) => setHandoverStaffName(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Ghi chú biên bản bàn giao:</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={handoverNotes}
                                    onChange={(e) => setHandoverNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 border-t">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsHandoverModalOpen(false)}
                            >
                                Hủy bỏ
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleConfirmHandover}
                                icon={Truck}
                            >
                                Xác nhận bàn giao cho ĐVVC (Chuyển sang Đang vận chuyển)
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 3 -> 4: ĐVVC GIAO TỚI NCC                 */}
            {/* ======================================================== */}
            {isDeliveredModalOpen && deliveredTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-[80vw] h-[80vh] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-600 text-white rounded-xl">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">
                                        Giai đoạn 3 ➔ 4: Bàn giao kiện hàng tới Nhà cung cấp
                                    </h3>
                                    <p className="text-xs text-blue-800">
                                        ĐVVC {deliveredTargetOrder.carrierName} • Vận đơn: {deliveredTargetOrder.trackingNumber}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDeliveredModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="p-3 bg-gray-50 rounded-xl border space-y-1">
                                <div className="font-bold text-gray-900">Địa chỉ bàn giao Nhà cung cấp:</div>
                                <p className="text-gray-700">{deliveredTargetOrder.supplierAddress || 'Địa chỉ kho đối tác đăng ký trong hợp đồng'}</p>
                                <p className="text-gray-500">Đối tác: <b>{deliveredTargetOrder.supplierName}</b> ({deliveredTargetOrder.supplierPhone})</p>
                            </div>

                            <div>
                                <AdminLabel>
                                    Đại diện bên nhận tại kho NCC (Ký nhận kiện hàng):
                                </AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={deliveredRecipient}
                                    onChange={(e) => setDeliveredRecipient(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Biên bản / Ghi chú giao nhận thực tế:</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={deliveredNotes}
                                    onChange={(e) => setDeliveredNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 border-t">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsDeliveredModalOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleConfirmDelivered}
                                icon={CheckCircle2}
                            >
                                Xác nhận ĐVVC đã giao tới Nhà cung cấp (Bắt đầu đối soát)
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 4: QUẢN LÝ XÁC NHẬN HOÀN TẤT              */}
            {/* ======================================================== */}
            {isCompleteModalOpen && completeTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-[80vw] h-[80vh] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-emerald-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">
                                        Giai đoạn 4: Xác nhận hoàn hàng thành công & Đóng quy trình
                                    </h3>
                                    <p className="text-xs text-emerald-800">
                                        Quản lý cửa hàng nhận phản hồi đối soát từ NCC và cập nhật trạng thái kết thúc
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCompleteModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                                <div className="font-bold">Đơn hoàn: {completeTargetOrder.code}</div>
                                <div>Nhà cung cấp: <b>{completeTargetOrder.supplierName}</b></div>
                                <div>
                                    Số lượng: <b>{completeTargetOrder.totalQuantity} mã Serial</b> • Giá trị: <b>{formatVND(completeTargetOrder.totalEstimatedValue)}</b>
                                </div>
                                <div className="text-[11px] text-emerald-800 font-medium">
                                    Phương án xử lý: {RESOLUTION_LABELS[completeTargetOrder.resolution]}
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Quản lý cửa hàng phụ trách xác nhận:</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={completeManagerName}
                                    onChange={(e) => setCompleteManagerName(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>
                                    Nội dung thông điệp xác nhận & Biên bản đối soát từ Nhà cung cấp:
                                </AdminLabel>
                                <AdminTextarea
                                    rows={3}
                                    value={completeFeedback}
                                    onChange={(e) => setCompleteFeedback(e.target.value)}
                                    placeholder="NCC đã nhận đủ serial, xác nhận đổi mới 1:1 hoặc cấn trừ công nợ..."
                                />
                            </div>

                            <div className="p-3 bg-gray-50 border rounded-xl text-gray-600">
                                <p className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Hành động hệ thống khi xác nhận:</span>
                                </p>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                    <li>Chuyển trạng thái đơn hoàn sang <b>"Đã hoàn hàng thành công" (COMPLETED)</b>.</li>
                                    <li>Cập nhật toàn bộ các mã Serial liên quan sang trạng thái <b>"Đã trả về nhà cung cấp" (RETURNED)</b>.</li>
                                    <li>Lưu log lịch sử và chính thức đóng quy trình hoàn trả.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 border-t">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsCompleteModalOpen(false)}
                            >
                                Đóng
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleConfirmComplete}
                                icon={CheckCircle2}
                                className="!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-600/30"
                            >
                                Xác nhận hoàn tất & Đóng quy trình hoàn hàng
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* DETAIL & PRINT MODAL                                     */}
            {/* ======================================================== */}
            {selectedOrder && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Chi tiết Đơn hoàn hàng NCC: ${selectedOrder.code}`}
                    subtitle={`${selectedOrder.supplierName} • Tổng ${selectedOrder.totalQuantity} mã Serial (${formatVND(selectedOrder.totalEstimatedValue)})`}
                    icon={RotateCcw}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={false}
                >
                    {/* Tab 1: Info & Interactive Workflow */}
                    {activeDetailTab === 'info' && (
                        <div className="space-y-6 p-2 text-xs">
                            {/* Banner Trạng thái hiện tại */}
                            {(() => {
                                const conf = RETURN_STATUS_CONFIG[selectedOrder.status] || RETURN_STATUS_CONFIG.WAITING_PACK;
                                const IconComp = conf.icon;
                                return (
                                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${conf.badgeClass}`}>
                                        <div className="flex items-center gap-3">
                                            <IconComp className="w-6 h-6 shrink-0" />
                                            <div>
                                                <div className="font-bold text-sm">
                                                    {conf.stageName}: {conf.label}
                                                </div>
                                                <div className="text-[11.5px] opacity-90 mt-0.5">
                                                    {conf.description}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nút hành động trực tiếp */}
                                        <div className="shrink-0 flex items-center gap-2">
                                            {selectedOrder.status === 'WAITING_PACK' && (
                                                <AdminButton
                                                    type="button"
                                                    onClick={() => handleOpenPackModal(selectedOrder)}
                                                    className="!px-3.5 !py-1.5 !bg-amber-700 hover:!bg-amber-800 text-white rounded-lg font-bold shadow-xs transition-colors"
                                                >
                                                    Kho thực hiện đóng gói
                                                </AdminButton>
                                            )}
                                            {selectedOrder.status === 'WAITING_HANDOVER' && (
                                                <AdminButton
                                                    type="button"
                                                    onClick={() => handleOpenHandoverModal(selectedOrder)}
                                                    className="!px-3.5 !py-1.5 !bg-indigo-700 hover:!bg-indigo-800 text-white rounded-lg font-bold shadow-xs transition-colors"
                                                >
                                                    Bàn giao cho ĐVVC
                                                </AdminButton>
                                            )}
                                            {selectedOrder.status === 'HANDED_OVER' && (
                                                <AdminButton
                                                    type="button"
                                                    onClick={() => handleOpenDeliveredModal(selectedOrder)}
                                                    className="!px-3.5 !py-1.5 !bg-blue-700 hover:!bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors"
                                                >
                                                    Cập nhật ĐVVC đã giao tới NCC
                                                </AdminButton>
                                            )}
                                            {selectedOrder.status === 'DELIVERED_SUPPLIER' && (
                                                <AdminButton
                                                    type="button"
                                                    onClick={() => handleOpenCompleteModal(selectedOrder)}
                                                    className="!px-3.5 !py-1.5 !bg-emerald-700 hover:!bg-emerald-800 text-white rounded-lg font-bold shadow-xs transition-colors"
                                                >
                                                    Xác nhận hoàn tất quy trình
                                                </AdminButton>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Stepper 4 giai đoạn tiến trình */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                <div className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span>Tiến trình 4 giai đoạn thực tế</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                    {/* Bước 1 */}
                                    <div
                                        className={`p-3 rounded-xl border ${selectedOrder.createdAt
                                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                                            : 'bg-white border-gray-200 text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span>GĐ 1: Lập đơn & Serial</span>
                                        </div>
                                        <div className="text-[11px] text-gray-600">Bởi: {selectedOrder.createdByName}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">{formatDateTime(selectedOrder.createdAt)}</div>
                                    </div>

                                    {/* Bước 2 */}
                                    <div
                                        className={`p-3 rounded-xl border ${selectedOrder.packedAt
                                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                                            : selectedOrder.status === 'WAITING_PACK'
                                                ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-500/20'
                                                : 'bg-white border-gray-200 text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                                            {selectedOrder.packedAt ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <Box className="w-4 h-4 text-amber-600" />
                                            )}
                                            <span>GĐ 2: Đóng gói & Bàn giao</span>
                                        </div>
                                        <div className="text-[11px] text-gray-600">
                                            {selectedOrder.packedByName ? `Kho: ${selectedOrder.packedByName}` : 'Chờ nhân viên kho'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            {selectedOrder.packedAt ? formatDateTime(selectedOrder.packedAt) : '---'}
                                        </div>
                                    </div>

                                    {/* Bước 3 */}
                                    <div
                                        className={`p-3 rounded-xl border ${selectedOrder.deliveredAt
                                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                                            : selectedOrder.status === 'HANDED_OVER'
                                                ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20'
                                                : 'bg-white border-gray-200 text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                                            {selectedOrder.deliveredAt ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <Truck className="w-4 h-4 text-blue-600" />
                                            )}
                                            <span>GĐ 3: Vận chuyển ĐVVC</span>
                                        </div>
                                        <div className="text-[11px] text-gray-600">
                                            {selectedOrder.carrierName ? selectedOrder.carrierName : 'Chưa giao ĐVVC'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            {selectedOrder.deliveredAt
                                                ? `Đã đến NCC: ${formatDateTime(selectedOrder.deliveredAt)}`
                                                : selectedOrder.trackingNumber || '---'}
                                        </div>
                                    </div>

                                    {/* Bước 4 */}
                                    <div
                                        className={`p-3 rounded-xl border ${selectedOrder.status === 'COMPLETED'
                                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                                            : selectedOrder.status === 'DELIVERED_SUPPLIER'
                                                ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-500/20'
                                                : 'bg-white border-gray-200 text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                                            {selectedOrder.status === 'COMPLETED' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <Building2 className="w-4 h-4 text-purple-600" />
                                            )}
                                            <span>GĐ 4: NCC & Hoàn tất</span>
                                        </div>
                                        <div className="text-[11px] text-gray-600">
                                            {selectedOrder.status === 'COMPLETED' ? 'Đã hoàn hàng thành công' : 'Chờ đối soát & duyệt'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            {selectedOrder.completedAt ? formatDateTime(selectedOrder.completedAt) : '---'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details 2 Columns: NCC & Logistic Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
                                    <div className="font-semibold text-gray-900 text-xs border-b pb-1.5 flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-rose-600" />
                                        <span>Thông tin Nhà cung cấp tiếp nhận</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Đơn vị tiếp nhận:</span>
                                        <span className="font-bold text-gray-900">{selectedOrder.supplierName}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã nhà cung cấp:</span>
                                        <span className="font-mono font-semibold text-gray-800">{selectedOrder.supplierCode}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Số điện thoại NCC:</span>
                                        <span className="text-gray-800">{selectedOrder.supplierPhone}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Email RMA:</span>
                                        <span className="text-gray-800">{selectedOrder.supplierEmail}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Địa chỉ kho NCC:</span>
                                        <span className="text-gray-800 text-right max-w-xs">{selectedOrder.supplierAddress || 'Chưa cập nhật'}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
                                    <div className="font-semibold text-gray-900 text-xs border-b pb-1.5 flex items-center gap-1.5">
                                        <Truck className="w-4 h-4 text-blue-600" />
                                        <span>Thông tin Vận chuyển & Đối tác ĐVVC</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Đơn vị vận chuyển:</span>
                                        <span className="font-bold text-blue-700">{selectedOrder.carrierName || 'Chưa bàn giao'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Mã vận đơn (Tracking):</span>
                                        <span className="font-mono font-bold text-gray-900">{selectedOrder.trackingNumber || '---'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Liên hệ tài xế ĐVVC:</span>
                                        <span className="text-gray-800">{selectedOrder.carrierPhone || '---'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500">Phương án bồi hoàn:</span>
                                        <span className="font-bold text-emerald-700">{RESOLUTION_LABELS[selectedOrder.resolution]}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500">Tổng giá trị dự tính:</span>
                                        <span className="font-bold text-blue-700 font-mono">{formatVND(selectedOrder.totalEstimatedValue)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bảng kê chi tiết từng Serial */}
                            <div className="space-y-2">
                                <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Boxes className="w-4 h-4 text-indigo-600" />
                                        <span>Danh sách cá thể Serial trong đơn ({selectedOrder.items.length} thiết bị):</span>
                                    </span>
                                </div>

                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 text-gray-600 border-b">
                                            <tr>
                                                <th className="p-2.5 text-center w-10">STT</th>
                                                <th className="p-2.5 text-left">Mã Serial lỗi</th>
                                                <th className="p-2.5 text-left">Tên linh kiện / Thiết bị</th>
                                                <th className="p-2.5 text-left">Mô tả tình trạng lỗi</th>
                                                <th className="p-2.5 text-right">Đơn giá nhập</th>
                                                <th className="p-2.5 text-center">Đóng gói kho</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedOrder.items.map((it, idx) => (
                                                <tr key={it.id} className="hover:bg-gray-50/50">
                                                    <td className="p-2.5 text-center text-gray-500 font-mono">{idx + 1}</td>
                                                    <td className="p-2.5 font-mono font-bold text-rose-700">
                                                        {it.serialNumber}
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="font-medium text-gray-900">{it.productName}</div>
                                                        <div className="text-[11px] text-gray-400 font-mono">{it.productCode}</div>
                                                    </td>
                                                    <td className="p-2.5 text-gray-700 italic max-w-xs">{it.defectReason}</td>
                                                    <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                                                        {formatVND(it.productPrice)}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        {it.isPacked || selectedOrder.packedAt ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                <Check className="w-3 h-3" /> Đã đóng
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                                <Clock className="w-3 h-3" /> Chờ kho lấy
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Phản hồi đối soát NCC nếu có */}
                            {selectedOrder.supplierFeedback && (
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                                    <div className="font-bold text-purple-900 flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-purple-700" />
                                        <span>Phản hồi & Biên bản đối soát từ Nhà cung cấp:</span>
                                    </div>
                                    <p className="text-purple-950 leading-relaxed">{selectedOrder.supplierFeedback}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Audit History Log */}
                    {activeDetailTab === 'history' && (
                        <div className="p-4 space-y-4 text-xs">
                            <div className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>Nhật ký thời gian thực hiện qua các giai đoạn</span>
                            </div>

                            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                {selectedOrder.history.map((log) => (
                                    <div key={log.id} className="relative space-y-1">
                                        <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white">
                                            {log.stageNumber}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-900 text-xs">{log.title}</span>
                                            <span className="text-[11px] text-gray-400 font-mono">{formatDateTime(log.timestamp)}</span>
                                        </div>
                                        <div className="text-gray-600 flex items-center gap-2 text-[11px]">
                                            <span className="font-semibold text-gray-800">{log.actorName}</span>
                                            <span>•</span>
                                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-medium">
                                                {log.actorRole}
                                            </span>
                                        </div>
                                        {log.note && (
                                            <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-[11.5px] leading-relaxed mt-1">
                                                {log.note}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Official Printable Document */}
                    {activeDetailTab === 'print' && (
                        <div className="p-4 space-y-4 text-xs">
                            <div className="flex justify-end gap-2">
                                <AdminButton
                                    type="button"
                                    onClick={() => window.print()}
                                    icon={Printer}
                                    variant="primary"
                                    className="!text-xs !font-bold"
                                >
                                    In biên bản bàn giao này (A4)
                                </AdminButton>
                            </div>

                            {/* Khổ giấy A4 */}
                            <div className="p-8 bg-white border border-gray-300 rounded-xl shadow-xs text-black font-serif space-y-5">
                                <div className="text-center space-y-1">
                                    <div className="font-bold text-xs uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div className="text-[11px] italic underline">Độc lập - Tự do - Hạnh phúc</div>
                                </div>

                                <div className="text-center pt-2">
                                    <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 font-sans">
                                        BIÊN BẢN XUẤT HOÀN TRẢ HÀNG LỖI TỚI NHÀ CUNG CẤP & BÀN GIAO ĐVVC
                                    </h2>
                                    <div className="text-xs text-gray-600 font-sans mt-0.5">
                                        Mã phiếu hoàn hàng: <b>{selectedOrder.code}</b>
                                        {selectedOrder.trackingNumber ? ` • Mã vận đơn: ${selectedOrder.trackingNumber}` : ''}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                                    <div className="space-y-1 border p-3 rounded-lg">
                                        <div className="font-bold text-gray-900 border-b pb-1">1. BÊN GIAO (CỬA HÀNG PCSTORE)</div>
                                        <div>Đơn vị: Hệ thống máy tính & thiết bị PCStore</div>
                                        <div>Đại diện kho: {selectedOrder.packedByName || selectedOrder.createdByName}</div>
                                        <div>Địa chỉ kho: Số 123 Đường Công Nghệ, Q. Cầu Giấy, Hà Nội</div>
                                        <div>Hotline: 1900 8888 • contact@pcstore.vn</div>
                                    </div>

                                    <div className="space-y-1 border p-3 rounded-lg">
                                        <div className="font-bold text-gray-900 border-b pb-1">2. BÊN NHẬN (NHÀ CUNG CẤP)</div>
                                        <div>Nhà cung cấp: <b>{selectedOrder.supplierName}</b></div>
                                        <div>Mã đối tác: {selectedOrder.supplierCode} • SĐT: {selectedOrder.supplierPhone}</div>
                                        <div>Địa chỉ kho nhận: {selectedOrder.supplierAddress || 'Theo hợp đồng cung ứng'}</div>
                                        <div>Phương án: <b>{RESOLUTION_LABELS[selectedOrder.resolution]}</b></div>
                                    </div>
                                </div>

                                {selectedOrder.carrierName && (
                                    <div className="border p-2.5 rounded-lg font-sans text-xs bg-gray-50 flex items-center justify-between">
                                        <span><b>3. ĐƠN VỊ VẬN CHUYỂN TRUNG GIAN (ĐVVC):</b> {selectedOrder.carrierName}</span>
                                        <span><b>Mã vận đơn (Tracking):</b> {selectedOrder.trackingNumber}</span>
                                    </div>
                                )}

                                <table className="w-full text-xs border-collapse border border-gray-400 font-sans">
                                    <thead>
                                        <tr className="bg-gray-100 font-bold">
                                            <th className="border border-gray-400 p-2 text-center w-10">STT</th>
                                            <th className="border border-gray-400 p-2 text-left">Tên sản phẩm / Linh kiện</th>
                                            <th className="border border-gray-400 p-2 text-left">Mã Serial lỗi</th>
                                            <th className="border border-gray-400 p-2 text-left">Tình trạng kiểm đếm</th>
                                            <th className="border border-gray-400 p-2 text-right">Đơn giá</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items.map((it, idx) => (
                                            <tr key={it.id}>
                                                <td className="border border-gray-400 p-2 text-center">{idx + 1}</td>
                                                <td className="border border-gray-400 p-2 font-medium">{it.productName}</td>
                                                <td className="border border-gray-400 p-2 font-mono font-bold text-rose-700">
                                                    {it.serialNumber}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-gray-700">{it.defectReason}</td>
                                                <td className="border border-gray-400 p-2 text-right font-mono font-bold">
                                                    {formatVND(it.productPrice)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-bold">
                                            <td colSpan={4} className="border border-gray-400 p-2 text-right">TỔNG GIÁ TRỊ BỒI HOÀN:</td>
                                            <td className="border border-gray-400 p-2 text-right text-blue-700 font-mono">
                                                {formatVND(selectedOrder.totalEstimatedValue)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="text-[11px] font-sans space-y-1 italic text-gray-700">
                                    <p>* Cam kết đối soát: Nhà cung cấp có trách nhiệm kiểm tra ngoại quan, đối soát các mã serial trên kiện hàng thực nhận và phản hồi kết quả trong vòng 03 - 07 ngày làm việc kể từ thời điểm nhận hàng.</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs font-sans">
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN BÊN GIAO (KHO CỬA HÀNG)</div>
                                        <div className="font-mono italic text-gray-400">(Ký, ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN ĐƠN VỊ VẬN CHUYỂN</div>
                                        <div className="font-mono italic text-gray-400">(Ký, ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN BÊN NHẬN (NHÀ CUNG CẤP)</div>
                                        <div className="font-mono italic text-gray-400">(Ký, ghi rõ họ tên và đóng dấu)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}
        </div>
    );
}
