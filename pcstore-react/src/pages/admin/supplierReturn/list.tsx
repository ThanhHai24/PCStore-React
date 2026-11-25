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
        dotColor: string;
        icon: React.ElementType;
        description: string;
        nextActor: string;
    }
> = {
    WAITING_PACK: {
        stageNumber: 1,
        stageName: 'Giai đoạn 1: Lập đơn',
        label: 'Chờ đóng gói',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        icon: Box,
        description: 'Quản lý đã tạo đơn và gửi yêu cầu xuống kho, chờ nhân viên kho nhặt hàng lỗi & đóng gói',
        nextActor: 'Nhân viên kho',
    },
    WAITING_HANDOVER: {
        stageNumber: 2,
        stageName: 'Giai đoạn 2: Đóng gói xong',
        label: 'Chờ bàn giao ĐVVC',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        dotColor: 'bg-sky-500',
        icon: Package,
        description: 'Kho đã đóng gói đúng quy chuẩn, dán tem niêm phong và đang chờ Đơn vị vận chuyển tới lấy kiện hàng',
        nextActor: 'Nhân viên kho & ĐVVC',
    },
    HANDED_OVER: {
        stageNumber: 3,
        stageName: 'Giai đoạn 3: Vận chuyển',
        label: 'Đang gửi trả NCC',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
        icon: Truck,
        description: 'ĐVVC đã nhận kiện hàng và chứng từ, đang trong lộ trình vận chuyển tới kho Nhà cung cấp',
        nextActor: 'Đơn vị vận chuyển',
    },
    DELIVERED_SUPPLIER: {
        stageNumber: 4,
        stageName: 'Giai đoạn 4: Tiếp nhận tại NCC',
        label: 'Đã giao NCC / Đối soát',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotColor: 'bg-slate-700',
        icon: Building2,
        description: 'ĐVVC đã bàn giao thực tế tại kho NCC. NCC đang kiểm tra ngoại quan và đối soát mã Serial',
        nextActor: 'Nhà cung cấp & Quản lý',
    },
    COMPLETED: {
        stageNumber: 4,
        stageName: 'Giai đoạn 4: Hoàn tất',
        label: 'Đã hoàn tất',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        icon: CheckCircle2,
        description: 'NCC xác nhận đối soát xong, Quản lý xác nhận chuyển trạng thái sản phẩm thành Đã trả về NCC và đóng quy trình',
        nextActor: 'Hoàn tất',
    },
    CANCELLED: {
        stageNumber: 1,
        stageName: 'Đã hủy',
        label: 'Đã hủy',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        dotColor: 'bg-slate-400',
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

    const selectedCreateEstimatedTotal = useMemo(() => {
        return availableSerialsForSelectedSupplier
            .filter((c) => selectedCandidateSerials.includes(c.serialNumber))
            .reduce((sum, c) => sum + (c.productPrice || 0), 0);
    }, [availableSerialsForSelectedSupplier, selectedCandidateSerials]);

    const renderReturnStatusIndicator = (status: SupplierReturnStatus) => {
        const conf = RETURN_STATUS_CONFIG[status] || RETURN_STATUS_CONFIG.WAITING_PACK;
        return (
            <span
                className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                title={conf.description}
            >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dotColor}`} />
                <span className={status === 'CANCELLED' ? 'text-slate-500' : 'text-slate-700'}>
                    {conf.label}
                </span>
            </span>
        );
    };

    /**
     * Cột bảng Phiếu hoàn hàng
     */
    const orderColumns: Column<SupplierReturnOrder>[] = [
        {
            key: 'code',
            header: 'Mã phiếu hoàn',
            render: (order) => {
                const receiptCode = order.items[0]?.goodsReceiptCode;
                return (
                    <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                className="font-mono text-xs font-semibold tabular-nums text-slate-900 hover:text-blue-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm text-left"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetail(order);
                                }}
                            >
                                {order.code}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(order.code);
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                title="Sao chép mã phiếu"
                            >
                                {copiedSerial === order.code ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                            </button>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate max-w-[190px]">
                            {receiptCode ? `Phiếu nhập: ${receiptCode}` : order.trackingNumber ? `VĐ: ${order.trackingNumber}` : '---'}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (order) => (
                <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate max-w-[190px]" title={order.supplierName}>
                        {order.supplierName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums flex items-center gap-1.5">
                        <span>{order.supplierCode}</span>
                        {order.supplierPhone && order.supplierPhone !== '---' && (
                            <>
                                <span className="text-slate-300">·</span>
                                <span>{order.supplierPhone}</span>
                            </>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'reason',
            header: 'Lý do hoàn hàng',
            render: (order) => (
                <div className="space-y-0.5 max-w-[220px]">
                    <div
                        className="text-xs text-slate-700 line-clamp-2 leading-relaxed"
                        title={order.returnReasonGeneral || order.items[0]?.defectReason || ''}
                    >
                        {order.returnReasonGeneral || order.items[0]?.defectReason || '---'}
                    </div>
                    {order.carrierName && (
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                            {order.carrierName}{order.trackingNumber ? ` · ${order.trackingNumber}` : ''}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'items',
            header: 'SL hoàn',
            align: 'right',
            render: (order) => (
                <div className="space-y-0.5 text-right tabular-nums">
                    <div className="text-xs font-medium text-slate-900 whitespace-nowrap">
                        {order.totalQuantity} Serial
                    </div>
                    <div
                        className="text-[11px] text-slate-500 font-mono truncate max-w-[140px] ml-auto"
                        title={order.items.map((it) => it.serialNumber).join(', ')}
                    >
                        {order.items.map((it) => it.serialNumber).join(', ')}
                    </div>
                </div>
            ),
        },
        {
            key: 'totalValue',
            header: 'Tổng giá trị hoàn',
            align: 'right',
            render: (order) => (
                <div className="text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                    {formatVND(order.totalEstimatedValue)}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (order) => renderReturnStatusIndicator(order.status),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo phiếu',
            align: 'right',
            render: (order) => (
                <div className="text-xs text-slate-600 text-right tabular-nums whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (order) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <AdminActionDropdown
                        maxInline={3}
                        actions={[
                            {
                                key: 'pack-order',
                                label: 'Kho đóng gói',
                                icon: Box,
                                variant: 'warning',
                                highlight: true,
                                hidden: order.status !== 'WAITING_PACK',
                                onClick: () => handleOpenPackModal(order),
                            },
                            {
                                key: 'handover-carrier',
                                label: 'Giao ĐVVC',
                                icon: Truck,
                                variant: 'primary',
                                highlight: true,
                                hidden: order.status !== 'WAITING_HANDOVER',
                                onClick: () => handleOpenHandoverModal(order),
                            },
                            {
                                key: 'delivered-supplier',
                                label: 'Xác nhận đã tới NCC',
                                icon: Building2,
                                variant: 'primary',
                                highlight: true,
                                hidden: order.status !== 'HANDED_OVER',
                                onClick: () => handleOpenDeliveredModal(order),
                            },
                            {
                                key: 'complete-return',
                                label: 'Hoàn tất quy trình',
                                icon: CheckCircle2,
                                variant: 'success',
                                highlight: true,
                                hidden: order.status !== 'DELIVERED_SUPPLIER',
                                onClick: () => handleOpenCompleteModal(order),
                            },
                            {
                                key: 'view-order',
                                label: 'Xem chi tiết & Tiến trình',
                                icon: Eye,
                                variant: 'primary',
                                onClick: () => handleOpenDetail(order),
                            },
                        ]}
                        moreActions={[
                            {
                                key: 'print',
                                label: 'In biên bản xuất hoàn & Bàn giao ĐVVC',
                                description: 'Xuất bản in biên bản bàn giao',
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
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900">
                        <span>{item.serialNumber}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.serialNumber);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            title="Sao chép Serial"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Phiếu nhập: {item.goodsReceiptCode || '---'}
                    </div>
                </div>
            ),
        },
        {
            key: 'product',
            header: 'Linh kiện / Thiết bị',
            render: (item) => (
                <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate max-w-[220px]" title={item.productName}>
                        {item.productName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {item.productCode}
                    </div>
                </div>
            ),
        },
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (item) => (
                <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate max-w-[180px]" title={item.supplierName}>
                        {item.supplierName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">{item.supplierCode}</div>
                </div>
            ),
        },
        {
            key: 'defectReason',
            header: 'Mô tả lỗi',
            render: (item) => (
                <div className="text-xs text-slate-600 max-w-[230px] line-clamp-2" title={item.defectReason}>
                    {item.defectReason}
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Đơn giá',
            align: 'right',
            render: (item) => (
                <div className="text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                    {formatVND(item.productPrice)}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isInActiveReturnOrder ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                    />
                    {item.isInActiveReturnOrder ? 'Đã lập đơn hoàn' : 'Chờ lập đơn hoàn'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    actions={[
                        {
                            key: 'create-return-order',
                            label: 'Lập đơn hoàn NCC',
                            icon: ShieldAlert,
                            variant: 'danger',
                            highlight: true,
                            hidden: item.isInActiveReturnOrder,
                            onClick: () => handleOpenCreateModal(item.supplierId, [item.serialNumber]),
                        },
                    ]}
                />
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
        <div className="space-y-4">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý hoàn hàng nhà cung cấp
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                        {kpiStats.total} phiếu hoàn · {kpiStats.waitingPack + kpiStats.waitingHandover} tại kho · {kpiStats.handedOver + kpiStats.deliveredSupplier} đang xử lý · {kpiStats.completed} hoàn tất
                    </p>
                </div>

                {/* Header Utility Action */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadAllData(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE TABS NAVIGATION & ROLE FILTER                  */}
            {/* ======================================================== */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
                <div className="flex items-center gap-5">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab('orders');
                            setCurrentPage(1);
                        }}
                        className={`flex items-center gap-2 pb-2.5 px-0.5 border-b-2 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-none ${
                            activeMainTab === 'orders'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span>Phiếu hoàn hàng NCC</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 tabular-nums font-medium">
                            {filteredOrders.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab('defective_pool');
                            setCandidatePage(1);
                        }}
                        className={`flex items-center gap-2 pb-2.5 px-0.5 border-b-2 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-none ${
                            activeMainTab === 'defective_pool'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span>Kho linh kiện lỗi chờ hoàn trả</span>
                        {kpiStats.activeDefectiveSerials > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 tabular-nums font-medium">
                                {kpiStats.activeDefectiveSerials}
                            </span>
                        )}
                    </button>
                </div>

                {/* Compact Role View Selector */}
                {activeMainTab === 'orders' && (
                    <div className="hidden lg:flex items-center gap-1.5 pb-2">
                        <span className="text-xs text-slate-500">Vai trò:</span>
                        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
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
                                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                                        selectedRoleView === role.key
                                            ? 'bg-white text-slate-900 border border-slate-200'
                                            : 'text-slate-600 hover:text-slate-900 border border-transparent'
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
                    {/* Single-row Toolbar: Search + Filters + Primary CTA */}
                    <AdminFilter
                        searchQuery={searchQuery}
                        onSearchChange={(q) => {
                            setSearchQuery(q);
                            setCurrentPage(1);
                        }}
                        searchPlaceholder="Tìm theo mã phiếu hoàn, phiếu nhập gốc, nhà cung cấp, mã Serial..."
                        fields={filterFields}
                        values={filterValues}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        actions={
                            <button
                                type="button"
                                onClick={() => handleOpenCreateModal()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Tạo phiếu hoàn hàng</span>
                            </button>
                        }
                    />

                    {/* Table Orders (Border-first, no outer card-in-card) */}
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
                        itemUnitName="phiếu hoàn"
                        onRowClick={(order) => handleOpenDetail(order)}
                    />
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: KHO HÀNG LỖI & SERIAL CHỜ LẬP ĐƠN HOÀN TRẢ         */}
            {/* ======================================================== */}
            {activeMainTab === 'defective_pool' && (
                <div className="space-y-4">
                    {/* Single-row Toolbar for Defective Candidates */}
                    <AdminFilter
                        searchQuery={candidateSearchQuery}
                        onSearchChange={(q) => {
                            setCandidateSearchQuery(q);
                            setCandidatePage(1);
                        }}
                        searchPlaceholder="Tìm mã Serial lỗi, tên linh kiện, phiếu nhập gốc, lý do lỗi..."
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
                        actions={
                            <button
                                type="button"
                                onClick={() => handleOpenCreateModal()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Tạo phiếu hoàn hàng</span>
                            </button>
                        }
                    />

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
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 1: QUẢN LÝ LẬP ĐƠN HOÀN HÀNG MỚI          */}
            {/* ======================================================== */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-md max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-white">
                            <div>
                                <h3 className="font-semibold text-slate-900 text-base">
                                    Tạo phiếu hoàn hàng nhà cung cấp
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Chọn nhà cung cấp, chỉ định mã Serial lỗi và thiết lập phương án xử lý
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body - Scrollable Flat Layout */}
                        <div className="p-5 overflow-y-auto space-y-5 text-xs">
                            {/* Section 1: Nhà cung cấp & Hình thức xử lý */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <AdminLabel required>Nhà cung cấp cần hoàn hàng</AdminLabel>
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

                                <div>
                                    <AdminLabel>Hình thức xử lý</AdminLabel>
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
                                    <AdminLabel>Quản lý phụ trách lập phiếu</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={createManagerName}
                                        onChange={(e) => setCreateManagerName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Chọn mã Serial cần hoàn trả */}
                            <div className="border-t border-slate-200 pt-4 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <AdminLabel required className="!mb-0">
                                        Danh sách mã Serial lỗi khả dụng ({availableSerialsForSelectedSupplier.length})
                                    </AdminLabel>

                                    <div className="flex items-center gap-2.5 tabular-nums">
                                        <span className="text-xs text-slate-600">
                                            Đã chọn: <strong className="text-slate-900">{selectedCandidateSerials.length}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleSelectAllCandidates}
                                            className="px-2.5 py-1 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-md cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        >
                                            {selectedCandidateSerials.length === availableSerialsForSelectedSupplier.length && availableSerialsForSelectedSupplier.length > 0
                                                ? 'Bỏ chọn tất cả'
                                                : 'Chọn tất cả'}
                                        </button>
                                    </div>
                                </div>

                                {availableSerialsForSelectedSupplier.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500 border border-dashed border-slate-300 rounded-md bg-slate-50/70 space-y-1">
                                        <p className="font-medium text-slate-700">Không có mã Serial lỗi nào đang tồn đọng của nhà cung cấp này.</p>
                                        <p className="text-[11px] text-slate-400">Chọn nhà cung cấp khác hoặc kiểm tra lại kho kiểm đếm.</p>
                                    </div>
                                ) : (
                                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-200/80 bg-white">
                                        {availableSerialsForSelectedSupplier.map((item) => {
                                            const isSelected = selectedCandidateSerials.includes(item.serialNumber);
                                            return (
                                                <button
                                                    key={item.serialNumber}
                                                    type="button"
                                                    onClick={() => handleToggleSerialCandidate(item.serialNumber)}
                                                    className={`w-full text-left p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40 ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <div className="mt-0.5 shrink-0">
                                                            {isSelected ? (
                                                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                                                    {item.serialNumber}
                                                                </span>
                                                                <span className="text-[11px] font-mono tabular-nums bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                                                    {item.productCode}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-700 font-medium line-clamp-1 mt-0.5">{item.productName}</div>
                                                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">Lỗi: {item.defectReason}</div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0 tabular-nums">
                                                        <div className="font-semibold text-slate-900">{formatVND(item.productPrice)}</div>
                                                        <div className="text-[11px] text-slate-400 font-mono">Phiếu: {item.goodsReceiptCode || '---'}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Lý do & Ghi chú kho */}
                            <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <AdminLabel>Lý do hoàn trả chung</AdminLabel>
                                    <AdminTextarea
                                        rows={2}
                                        value={createReason}
                                        onChange={(e) => setCreateReason(e.target.value)}
                                        placeholder="Nhập lý do xuất trả hàng..."
                                    />
                                </div>

                                <div>
                                    <AdminLabel>Ghi chú hướng dẫn đóng gói cho kho</AdminLabel>
                                    <AdminTextarea
                                        rows={2}
                                        value={createManagerNotes}
                                        onChange={(e) => setCreateManagerNotes(e.target.value)}
                                        placeholder="Ví dụ: Bọc xốp chống sốc 2 lớp, niêm phong tem..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
                            <div className="text-xs text-slate-600 tabular-nums">
                                Đã chọn: <strong className="text-slate-900">{selectedCandidateSerials.length} serial</strong>
                                <span className="mx-2 text-slate-300">·</span>
                                Tổng giá trị hoàn:{' '}
                                <strong className="text-sm font-semibold text-slate-900">
                                    {formatVND(selectedCreateEstimatedTotal)}
                                </strong>
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
                                    variant="primary"
                                    onClick={handleConfirmCreateOrder}
                                    disabled={isSubmittingCreate || selectedCandidateSerials.length === 0}
                                    isLoading={isSubmittingCreate}
                                    icon={Send}
                                >
                                    Tạo phiếu & Gửi kho đóng gói
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-md max-w-2xl w-full max-h-[88vh] border border-slate-200 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="font-semibold text-slate-900 text-base">
                                    Xác nhận kho đóng gói
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                    Phiếu: <strong className="font-mono text-slate-800">{packTargetOrder.code}</strong> · NCC: {packTargetOrder.supplierName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPackModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            {packTargetOrder.managerNotes && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 space-y-1">
                                    <div className="font-semibold text-slate-800">Yêu cầu từ Quản lý cửa hàng</div>
                                    <p className="leading-relaxed">{packTargetOrder.managerNotes}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <AdminLabel className="tabular-nums">
                                    Danh sách Serial cần đóng gói ({packTargetOrder.items.length})
                                </AdminLabel>
                                <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200/80 max-h-44 overflow-y-auto">
                                    {packTargetOrder.items.map((it) => (
                                        <div key={it.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                                            <div className="min-w-0">
                                                <span className="font-mono font-semibold tabular-nums text-slate-900">{it.serialNumber}</span>
                                                <span className="text-slate-500 ml-2 truncate">{it.productName}</span>
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Đã kiểm
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Nhân viên kho phụ trách đóng gói</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={packStaffName}
                                    onChange={(e) => setPackStaffName(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Quy cách & Ghi chú đóng gói</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={packNotes}
                                    onChange={(e) => setPackNotes(e.target.value)}
                                    placeholder="Ghi chú quy chuẩn đóng gói thùng xốp, dán tem..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
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
                            >
                                Xác nhận đã đóng gói
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 2 -> 3: BÀN GIAO CHO ĐVVC                */}
            {/* ======================================================== */}
            {isHandoverModalOpen && handoverTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-md max-w-2xl w-full max-h-[88vh] border border-slate-200 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="font-semibold text-slate-900 text-base">
                                    Bàn giao kiện hàng cho ĐVVC
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                    Phiếu: <strong className="font-mono text-slate-800">{handoverTargetOrder.code}</strong> · {handoverTargetOrder.supplierAddress || 'Kho trung tâm NCC'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHandoverModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <AdminLabel required>Mã vận đơn (Tracking)</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={handoverTracking}
                                        onChange={(e) => setHandoverTracking(e.target.value)}
                                        className="font-mono font-semibold tabular-nums"
                                        placeholder="Ví dụ: VTP-8849201948VN"
                                        required
                                    />
                                </div>

                                <div>
                                    <AdminLabel>SĐT tài xế / Tổng đài ĐVVC</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        value={handoverPhone}
                                        onChange={(e) => setHandoverPhone(e.target.value)}
                                        className="font-mono tabular-nums"
                                        placeholder="09xx..."
                                    />
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Nhân viên kho bàn giao</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={handoverStaffName}
                                    onChange={(e) => setHandoverStaffName(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Ghi chú biên bản bàn giao</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={handoverNotes}
                                    onChange={(e) => setHandoverNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
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
                                Xác nhận bàn giao ĐVVC
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 3 -> 4: ĐVVC GIAO TỚI NCC                 */}
            {/* ======================================================== */}
            {isDeliveredModalOpen && deliveredTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-md max-w-2xl w-full max-h-[88vh] border border-slate-200 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="font-semibold text-slate-900 text-base">
                                    Xác nhận đã giao tới nhà cung cấp
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                    ĐVVC {deliveredTargetOrder.carrierName} · Vận đơn: <span className="font-mono">{deliveredTargetOrder.trackingNumber}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDeliveredModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                                <div className="font-semibold text-slate-900">{deliveredTargetOrder.supplierName}</div>
                                <p className="text-slate-600">{deliveredTargetOrder.supplierAddress || 'Địa chỉ kho đối tác đăng ký trong hợp đồng'}</p>
                                <p className="text-slate-500 font-mono tabular-nums">SĐT: {deliveredTargetOrder.supplierPhone}</p>
                            </div>

                            <div>
                                <AdminLabel>Đại diện bên nhận tại kho NCC</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={deliveredRecipient}
                                    onChange={(e) => setDeliveredRecipient(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Ghi chú giao nhận thực tế</AdminLabel>
                                <AdminTextarea
                                    rows={2}
                                    value={deliveredNotes}
                                    onChange={(e) => setDeliveredNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
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
                                Xác nhận đã tới NCC
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL GIAI ĐOẠN 4: QUẢN LÝ XÁC NHẬN HOÀN TẤT              */}
            {/* ======================================================== */}
            {isCompleteModalOpen && completeTargetOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-md max-w-2xl w-full max-h-[88vh] border border-slate-200 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="font-semibold text-slate-900 text-base">
                                    Xác nhận hoàn tất quy trình hoàn hàng
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                    Phiếu: <strong className="font-mono text-slate-800">{completeTargetOrder.code}</strong> · NCC: {completeTargetOrder.supplierName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCompleteModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1 tabular-nums">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Số lượng hoàn</span>
                                    <span className="font-semibold text-slate-900">{completeTargetOrder.totalQuantity} mã Serial</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Giá trị hoàn trả</span>
                                    <span className="font-semibold text-slate-900">{formatVND(completeTargetOrder.totalEstimatedValue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Phương án xử lý</span>
                                    <span className="font-medium text-slate-800">{RESOLUTION_LABELS[completeTargetOrder.resolution]}</span>
                                </div>
                            </div>

                            <div>
                                <AdminLabel>Quản lý phụ trách xác nhận</AdminLabel>
                                <AdminInput
                                    type="text"
                                    value={completeManagerName}
                                    onChange={(e) => setCompleteManagerName(e.target.value)}
                                />
                            </div>

                            <div>
                                <AdminLabel>Nội dung phản hồi & Biên bản đối soát từ NCC</AdminLabel>
                                <AdminTextarea
                                    rows={3}
                                    value={completeFeedback}
                                    onChange={(e) => setCompleteFeedback(e.target.value)}
                                    placeholder="NCC đã nhận đủ serial, xác nhận đổi mới 1:1 hoặc cấn trừ công nợ..."
                                />
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-600 text-[11px] space-y-1">
                                <div className="font-semibold text-slate-800">Khi xác nhận hoàn tất:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>Chuyển trạng thái phiếu hoàn sang <strong>COMPLETED</strong>.</li>
                                    <li>Cập nhật toàn bộ mã Serial liên quan sang trạng thái <strong>RETURNED</strong>.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
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
                                className="!bg-emerald-600 hover:!bg-emerald-700"
                            >
                                Xác nhận hoàn tất
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
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono tabular-nums text-slate-900">{selectedOrder.code}</span>
                            <span className="text-slate-300">·</span>
                            {renderReturnStatusIndicator(selectedOrder.status)}
                        </div>
                    }
                    subtitle={`${selectedOrder.supplierName} • ${selectedOrder.totalQuantity} mã Serial`}
                    icon={RotateCcw}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(t) => setActiveDetailTab(t as any)}
                    showFooter={true}
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="text-xs text-slate-500 tabular-nums">
                                Tổng giá trị hoàn:{' '}
                                <strong className="text-sm font-semibold text-slate-900">
                                    {formatVND(selectedOrder.totalEstimatedValue)}
                                </strong>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {selectedOrder.status === 'WAITING_PACK' && (
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleOpenPackModal(selectedOrder)}
                                        icon={Box}
                                    >
                                        Kho đóng gói
                                    </AdminButton>
                                )}
                                {selectedOrder.status === 'WAITING_HANDOVER' && (
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleOpenHandoverModal(selectedOrder)}
                                        icon={Truck}
                                    >
                                        Bàn giao ĐVVC
                                    </AdminButton>
                                )}
                                {selectedOrder.status === 'HANDED_OVER' && (
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleOpenDeliveredModal(selectedOrder)}
                                        icon={Building2}
                                    >
                                        Đã giao tới NCC
                                    </AdminButton>
                                )}
                                {selectedOrder.status === 'DELIVERED_SUPPLIER' && (
                                    <AdminButton
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleOpenCompleteModal(selectedOrder)}
                                        icon={CheckCircle2}
                                        className="!bg-emerald-600 hover:!bg-emerald-700"
                                    >
                                        Xác nhận hoàn tất
                                    </AdminButton>
                                )}
                                <AdminButton
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    {/* Tab 1: Info & Interactive Workflow */}
                    {activeDetailTab === 'info' && (
                        <div className="space-y-4 text-xs">
                            {/* Flat 4-stage Progress Strip */}
                            <div className="border border-slate-200 rounded-md bg-white grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 tabular-nums">
                                <div className={`p-3 ${selectedOrder.createdAt ? 'bg-emerald-50/40' : ''}`}>
                                    <div className="font-semibold text-slate-900">1. Lập đơn</div>
                                    <div className="text-[11px] text-slate-600 mt-0.5 truncate">{selectedOrder.createdByName}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(selectedOrder.createdAt)}</div>
                                </div>

                                <div className={`p-3 ${selectedOrder.packedAt ? 'bg-emerald-50/40' : selectedOrder.status === 'WAITING_PACK' ? 'bg-amber-50/50' : ''}`}>
                                    <div className="font-semibold text-slate-900">2. Đóng gói</div>
                                    <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                                        {selectedOrder.packedByName || 'Chờ nhân viên kho'}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                        {selectedOrder.packedAt ? formatDateTime(selectedOrder.packedAt) : '---'}
                                    </div>
                                </div>

                                <div className={`p-3 ${selectedOrder.deliveredAt ? 'bg-emerald-50/40' : selectedOrder.status === 'HANDED_OVER' ? 'bg-blue-50/50' : ''}`}>
                                    <div className="font-semibold text-slate-900">3. Vận chuyển</div>
                                    <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                                        {selectedOrder.carrierName || 'Chưa bàn giao ĐVVC'}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                        {selectedOrder.deliveredAt ? formatDateTime(selectedOrder.deliveredAt) : selectedOrder.trackingNumber || '---'}
                                    </div>
                                </div>

                                <div className={`p-3 ${selectedOrder.status === 'COMPLETED' ? 'bg-emerald-50/40' : selectedOrder.status === 'DELIVERED_SUPPLIER' ? 'bg-slate-50' : ''}`}>
                                    <div className="font-semibold text-slate-900">4. NCC & Hoàn tất</div>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                        {selectedOrder.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chờ đối soát'}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                        {selectedOrder.completedAt ? formatDateTime(selectedOrder.completedAt) : '---'}
                                    </div>
                                </div>
                            </div>

                            {/* Flat 2-column Specification Grid: NCC & Logistics */}
                            <div className="border border-slate-200 rounded-md bg-white grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                <div className="p-4 space-y-2">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        Nhà cung cấp tiếp nhận
                                    </div>
                                    <dl className="space-y-1.5">
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Đơn vị</dt>
                                            <dd className="font-semibold text-slate-900 text-right">{selectedOrder.supplierName}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Mã NCC</dt>
                                            <dd className="font-mono tabular-nums text-slate-800">{selectedOrder.supplierCode}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Số điện thoại</dt>
                                            <dd className="font-mono tabular-nums text-slate-800">{selectedOrder.supplierPhone}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Email RMA</dt>
                                            <dd className="text-slate-700 truncate max-w-[200px]">{selectedOrder.supplierEmail}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500 shrink-0">Địa chỉ kho</dt>
                                            <dd className="text-slate-700 text-right">{selectedOrder.supplierAddress || 'Chưa cập nhật'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="p-4 space-y-2">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        Vận chuyển & Phương án xử lý
                                    </div>
                                    <dl className="space-y-1.5">
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Đơn vị vận chuyển</dt>
                                            <dd className="font-medium text-slate-900">{selectedOrder.carrierName || 'Chưa bàn giao'}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Mã vận đơn</dt>
                                            <dd className="font-mono font-semibold tabular-nums text-slate-900">{selectedOrder.trackingNumber || '---'}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">SĐT tài xế / ĐVVC</dt>
                                            <dd className="font-mono tabular-nums text-slate-800">{selectedOrder.carrierPhone || '---'}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Hình thức xử lý</dt>
                                            <dd className="font-medium text-slate-900 text-right">{RESOLUTION_LABELS[selectedOrder.resolution]}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">Tổng giá trị hoàn</dt>
                                            <dd className="font-semibold tabular-nums text-slate-900">{formatVND(selectedOrder.totalEstimatedValue)}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            {/* Compact Serial Items Table */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-800 tabular-nums">
                                    Danh sách Serial hoàn trả ({selectedOrder.items.length})
                                </div>

                                <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="p-2.5 text-center w-10">STT</th>
                                                <th className="p-2.5 text-left">Mã Serial lỗi</th>
                                                <th className="p-2.5 text-left">Linh kiện / Thiết bị</th>
                                                <th className="p-2.5 text-left">Mô tả lỗi</th>
                                                <th className="p-2.5 text-right">Đơn giá nhập</th>
                                                <th className="p-2.5 text-left">Đóng gói</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/80">
                                            {selectedOrder.items.map((it, idx) => (
                                                <tr key={it.id} className="hover:bg-slate-50/70">
                                                    <td className="p-2.5 text-center text-slate-400 font-mono tabular-nums">{idx + 1}</td>
                                                    <td className="p-2.5 font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                                                        {it.serialNumber}
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="font-medium text-slate-900">{it.productName}</div>
                                                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">{it.productCode}</div>
                                                    </td>
                                                    <td className="p-2.5 text-slate-600 max-w-xs">{it.defectReason}</td>
                                                    <td className="p-2.5 text-right font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                                                        {formatVND(it.productPrice)}
                                                    </td>
                                                    <td className="p-2.5 whitespace-nowrap">
                                                        {it.isPacked || selectedOrder.packedAt ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Đã đóng
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                Chờ kho
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
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                                    <div className="font-semibold text-slate-800">
                                        Phản hồi & Biên bản đối soát từ Nhà cung cấp
                                    </div>
                                    <p className="text-slate-700 leading-relaxed">{selectedOrder.supplierFeedback}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Audit History Log */}
                    {activeDetailTab === 'history' && (
                        <div className="space-y-4 text-xs">
                            <div className="font-semibold text-slate-900 text-sm border-b border-slate-200 pb-2">
                                Nhật ký thực hiện qua các giai đoạn
                            </div>

                            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                {selectedOrder.history.map((log) => (
                                    <div key={log.id} className="relative space-y-1">
                                        <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-md bg-slate-800 text-white flex items-center justify-center font-semibold text-[10px] tabular-nums">
                                            {log.stageNumber}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-slate-900 text-xs">{log.title}</span>
                                            <span className="text-[11px] text-slate-400 font-mono tabular-nums">{formatDateTime(log.timestamp)}</span>
                                        </div>
                                        <div className="text-slate-600 flex items-center gap-2 text-[11px]">
                                            <span className="font-medium text-slate-800">{log.actorName}</span>
                                            <span className="text-slate-300">·</span>
                                            <span className="text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                                                {log.actorRole}
                                            </span>
                                        </div>
                                        {log.note && (
                                            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs leading-relaxed mt-1">
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
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-end">
                                <AdminButton
                                    type="button"
                                    onClick={() => window.print()}
                                    icon={Printer}
                                    variant="primary"
                                    size="sm"
                                >
                                    In biên bản bàn giao (A4)
                                </AdminButton>
                            </div>

                            {/* Khổ giấy A4 */}
                            <div className="p-6 sm:p-8 bg-white border border-slate-300 rounded-md text-black font-serif space-y-5">
                                <div className="text-center space-y-1">
                                    <div className="font-bold text-xs uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div className="text-[11px] italic underline">Độc lập - Tự do - Hạnh phúc</div>
                                </div>

                                <div className="text-center pt-2">
                                    <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 font-sans">
                                        BIÊN BẢN XUẤT HOÀN TRẢ HÀNG LỖI TỚI NHÀ CUNG CẤP & BÀN GIAO ĐVVC
                                    </h2>
                                    <div className="text-xs text-slate-600 font-sans tabular-nums mt-0.5">
                                        Mã phiếu hoàn hàng: <b>{selectedOrder.code}</b>
                                        {selectedOrder.trackingNumber ? ` • Mã vận đơn: ${selectedOrder.trackingNumber}` : ''}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                                    <div className="space-y-1 border border-slate-300 p-3 rounded-md">
                                        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">1. BÊN GIAO (CỬA HÀNG PCSTORE)</div>
                                        <div>Đơn vị: Hệ thống máy tính & thiết bị PCStore</div>
                                        <div>Đại diện kho: {selectedOrder.packedByName || selectedOrder.createdByName}</div>
                                        <div>Địa chỉ kho: Số 123 Đường Công Nghệ, Q. Cầu Giấy, Hà Nội</div>
                                        <div>Hotline: 1900 8888 • contact@pcstore.vn</div>
                                    </div>

                                    <div className="space-y-1 border border-slate-300 p-3 rounded-md">
                                        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">2. BÊN NHẬN (NHÀ CUNG CẤP)</div>
                                        <div>Nhà cung cấp: <b>{selectedOrder.supplierName}</b></div>
                                        <div className="tabular-nums">Mã đối tác: {selectedOrder.supplierCode} • SĐT: {selectedOrder.supplierPhone}</div>
                                        <div>Địa chỉ kho nhận: {selectedOrder.supplierAddress || 'Theo hợp đồng cung ứng'}</div>
                                        <div>Phương án: <b>{RESOLUTION_LABELS[selectedOrder.resolution]}</b></div>
                                    </div>
                                </div>

                                {selectedOrder.carrierName && (
                                    <div className="border border-slate-300 p-2.5 rounded-md font-sans text-xs bg-slate-50 flex items-center justify-between tabular-nums">
                                        <span><b>3. ĐƠN VỊ VẬN CHUYỂN TRUNG GIAN (ĐVVC):</b> {selectedOrder.carrierName}</span>
                                        <span><b>Mã vận đơn:</b> {selectedOrder.trackingNumber}</span>
                                    </div>
                                )}

                                <table className="w-full text-xs border-collapse border border-slate-400 font-sans tabular-nums">
                                    <thead>
                                        <tr className="bg-slate-100 font-bold">
                                            <th className="border border-slate-400 p-2 text-center w-10">STT</th>
                                            <th className="border border-slate-400 p-2 text-left">Tên sản phẩm / Linh kiện</th>
                                            <th className="border border-slate-400 p-2 text-left">Mã Serial lỗi</th>
                                            <th className="border border-slate-400 p-2 text-left">Tình trạng kiểm đếm</th>
                                            <th className="border border-slate-400 p-2 text-right">Đơn giá</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items.map((it, idx) => (
                                            <tr key={it.id}>
                                                <td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
                                                <td className="border border-slate-400 p-2 font-medium">{it.productName}</td>
                                                <td className="border border-slate-400 p-2 font-mono font-semibold text-slate-900">
                                                    {it.serialNumber}
                                                </td>
                                                <td className="border border-slate-400 p-2 text-slate-700">{it.defectReason}</td>
                                                <td className="border border-slate-400 p-2 text-right font-mono font-semibold">
                                                    {formatVND(it.productPrice)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50 font-bold">
                                            <td colSpan={4} className="border border-slate-400 p-2 text-right">TỔNG GIÁ TRỊ BỒI HOÀN:</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-900 font-mono">
                                                {formatVND(selectedOrder.totalEstimatedValue)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="text-[11px] font-sans space-y-1 italic text-slate-700">
                                    <p>* Cam kết đối soát: Nhà cung cấp có trách nhiệm kiểm tra ngoại quan, đối soát các mã serial trên kiện hàng thực nhận và phản hồi kết quả trong vòng 03 - 07 ngày làm việc kể từ thời điểm nhận hàng.</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs font-sans">
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN BÊN GIAO (KHO CỬA HÀNG)</div>
                                        <div className="font-mono italic text-slate-400">(Ký, ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN ĐƠN VỊ VẬN CHUYỂN</div>
                                        <div className="font-mono italic text-slate-400">(Ký, ghi rõ họ tên)</div>
                                    </div>
                                    <div className="space-y-16">
                                        <div className="font-bold">ĐẠI DIỆN BÊN NHẬN (NHÀ CUNG CẤP)</div>
                                        <div className="font-mono italic text-slate-400">(Ký, ghi rõ họ tên và đóng dấu)</div>
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
