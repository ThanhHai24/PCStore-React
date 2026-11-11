import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wrench,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    Search,
    RefreshCw,
    Download,
    Eye,
    Edit,
    User,
    UserCheck,
    Cpu,
    Component,
    FileText,
    Barcode,
    Sparkles,
    ShieldCheck,
    Plus,
    Trash2,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminSelect,
    AdminButton,
    AdminLabel,
    AdminTextarea,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import { adminProductService } from '../../../services/adminProductService';
import type {
    WarrantyRequestItem,
    WarrantyRequestStatus,
    TechnicalHandlingUpdateInput,
} from '../../../types/adminWarranty';

const TECHNICIAN_LIST = [
    { id: 12, name: 'Trịnh Quốc Bảo (Kỹ thuật trưởng)', phone: '0981122334' },
    { id: 14, name: 'Đặng Tuấn Anh (Kỹ thuật viên phần cứng)', phone: '0977223344' },
    { id: 15, name: 'Lê Hoàng Long (Kỹ thuật viên VGA & Main)', phone: '0966334455' },
    { id: 16, name: 'Nguyễn Văn Minh (Kỹ thuật viên hệ thống)', phone: '0933445566' },
];

export default function TechnicalHandlingList() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Data State
    const [loading, setLoading] = useState<boolean>(true);
    const [requests, setRequests] = useState<WarrantyRequestItem[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);

    // Filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, string>>({
        status: '',
    });
    const [quickStatusTab, setQuickStatusTab] = useState<string>('ALL');

    // Modals
    const [selectedRequest, setSelectedRequest] = useState<WarrantyRequestItem | null>(null);
    const [isHandlingOpen, setIsHandlingOpen] = useState<boolean>(false);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [detailTab, setDetailTab] = useState<string>('diagnostic');

    // Handling Form State
    const [techId, setTechId] = useState<string>('');
    const [faultType, setFaultType] = useState<string>('MANUFACTURER');
    const [inspectionNotes, setInspectionNotes] = useState<string>('');
    const [solution, setSolution] = useState<string>('');
    const [status, setStatus] = useState<string>('IN_PROGRESS');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Spare parts quick add state
    const [sparePartProductId, setSparePartProductId] = useState<string>('');
    const [sparePartName, setSparePartName] = useState<string>('');
    const [sparePartQty, setSparePartQty] = useState<number>(1);
    const [sparePartCost, setSparePartCost] = useState<number>(200000);
    const [sparePartSerial, setSparePartSerial] = useState<string>('');
    const [catalogProducts, setCatalogProducts] = useState<Array<{ id: number; name: string }>>([]);

    // Load catalog products for spare parts
    useEffect(() => {
        adminProductService.getAllProducts({ size: 100 })
            .then((res: any) => {
                if (res?.content) {
                    setCatalogProducts(res.content.map((p: any) => ({ id: p.id, name: p.name })));
                }
            })
            .catch(() => { });
    }, []);

    // Fetch requests
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminWarrantyService.getAllRequests({
                keyword: searchQuery || undefined,
                status: filters.status ? (filters.status as WarrantyRequestStatus) : undefined,
                page: page - 1,
                size: pageSize,
            });

            setRequests(res.content || []);
            const total = res.totalElements || res.content?.length || 0;
            setTotalElements(total);
            setTotalPages(Math.max(1, res.totalPages || Math.ceil(total / pageSize)));
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: error.message || 'Không thể tải danh sách ca kỹ thuật',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.status, page, pageSize, addToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = totalElements || requests.length;
        const pending = requests.filter((r) => r.status === 'PENDING' || r.status === 0).length;
        const inProgress = requests.filter((r) => r.status === 'IN_PROGRESS' || r.status === 1).length;
        const completed = requests.filter((r) => r.status === 'COMPLETED' || r.status === 3).length;
        return { total, pending, inProgress, completed };
    }, [requests, totalElements]);

    // Open Handling Modal
    const handleOpenHandling = (r: WarrantyRequestItem) => {
        setSelectedRequest(r);
        setTechId(r.technicianId ? String(r.technicianId) : '12');
        setFaultType(r.faultType || 'MANUFACTURER');
        setInspectionNotes(r.inspectionNotes || '');
        setSolution(r.solution || '');
        setStatus(String(r.status));
        setIsHandlingOpen(true);
    };

    // Submit Handling Update
    const handleSubmitHandling = async () => {
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
            const tech = TECHNICIAN_LIST.find((t) => String(t.id) === techId);
            const input: TechnicalHandlingUpdateInput = {
                requestId: selectedRequest.id,
                technicianId: tech ? tech.id : undefined,
                technicianName: tech ? tech.name : undefined,
                faultType: faultType as any,
                inspectionNotes: inspectionNotes.trim(),
                solution: solution.trim(),
                status: status as any,
            };

            await adminWarrantyService.updateTechnicalHandling(input);
            addToast({
                type: 'success',
                title: 'Cập nhật thành công',
                message: `Đã lưu biên bản xử lý kỹ thuật cho ca ${selectedRequest.requestCode}`,
            });
            setIsHandlingOpen(false);
            fetchRequests();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Cập nhật thất bại',
                message: error.message || 'Lỗi lưu thông tin kỹ thuật',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add Spare Part to Request
    const handleAddPart = async () => {
        if (!selectedRequest) return;
        if (!sparePartName.trim()) {
            addToast({ type: 'warning', title: 'Cảnh báo', message: 'Vui lòng nhập tên linh kiện thay thế' });
            return;
        }

        try {
            const updated = await adminWarrantyService.addPartToRequest(selectedRequest.id, {
                productId: sparePartProductId ? Number(sparePartProductId) : 999,
                productName: sparePartName.trim(),
                quantity: sparePartQty,
                unitCost: sparePartCost,
                serials: sparePartSerial.trim() ? [sparePartSerial.trim()] : [],
            });

            setSelectedRequest({ ...updated });
            setSparePartName('');
            setSparePartSerial('');
            addToast({ type: 'success', title: 'Đã thêm linh kiện', message: 'Linh kiện đã được xuất cho ca này' });
            fetchRequests();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Lỗi', message: error.message || 'Không thể thêm linh kiện' });
        }
    };

    // Export CSV
    const handleExport = () => {
        if (requests.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }

        const headers = ['Mã phiếu', 'Serial máy', 'Sản phẩm', 'Khách hàng', 'Kỹ thuật viên', 'Phân loại lỗi', 'Chẩn đoán', 'Biện pháp giải quyết', 'Trạng thái'];
        const csvRows = requests.map((r) => [
            `"${r.requestCode}"`,
            `"${r.serialNumber}"`,
            `"${r.productName.replace(/"/g, '""')}"`,
            `"${r.customerName}"`,
            `"${r.technicianName || 'Chưa phân công'}"`,
            r.faultType === 'MANUFACTURER'
                ? 'Lỗi nhà sản xuất'
                : r.faultType === 'USER_DAMAGE'
                    ? 'Lỗi người dùng / Ngoại lực'
                    : 'Lỗi phần mềm / BIOS',
            `"${(r.inspectionNotes || '').replace(/"/g, '""')}"`,
            `"${(r.solution || '').replace(/"/g, '""')}"`,
            r.status === 'COMPLETED' || r.status === 3 ? 'Hoàn tất' : 'Đang xử lý',
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xu-ly-ky-thuat-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã xuất file báo cáo kỹ thuật' });
    };

    // Table Columns
    const columns: Column<WarrantyRequestItem>[] = [
        {
            key: 'requestCode',
            header: 'Mã phiếu / Serial',
            render: (item) => (
                <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{item.requestCode}</div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-600 mt-0.5">
                        <Barcode className="w-3 h-3" />
                        <span>{item.serialNumber}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'productName',
            header: 'Thiết bị & Hiện tượng',
            render: (item) => (
                <div className="max-w-xs">
                    <div className="font-medium text-slate-900 line-clamp-1">{item.productName}</div>
                    <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 italic">
                        Lỗi: {item.issueDescription}
                    </div>
                </div>
            ),
        },
        {
            key: 'technicianName',
            header: 'Kỹ thuật phụ trách',
            render: (item) => (
                <div className="text-xs">
                    {item.technicianName ? (
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{item.technicianName}</span>
                        </div>
                    ) : (
                        <span className="text-amber-600 font-medium italic">Chờ phân công</span>
                    )}
                </div>
            ),
        },
        {
            key: 'faultType',
            header: 'Phân loại lỗi',
            render: (item) => {
                if (item.faultType === 'MANUFACTURER') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Lỗi NSX (Miễn phí)
                        </span>
                    );
                }
                if (item.faultType === 'USER_DAMAGE') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Lỗi ngoại lực / Sét đánh
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Chưa kết luận
                    </span>
                );
            },
        },
        {
            key: 'inspectionNotes',
            header: 'Chẩn đoán & Giải pháp',
            render: (item) => (
                <div className="max-w-xs text-xs">
                    {item.inspectionNotes ? (
                        <div className="line-clamp-1 text-slate-800 font-medium">
                            {item.inspectionNotes}
                        </div>
                    ) : (
                        <span className="text-slate-400 italic">Đang kiểm tra...</span>
                    )}
                    {item.solution && (
                        <div className="line-clamp-1 text-emerald-700 text-[11px] mt-0.5">
                            &gt; {item.solution}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Tiến độ',
            render: (item) => {
                if (item.status === 'PENDING' || item.status === 0) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            Chờ nhận ca
                        </span>
                    );
                }
                if (item.status === 'IN_PROGRESS' || item.status === 1) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300">
                            <Wrench className="w-3 h-3" />
                            Đang xử lý
                        </span>
                    );
                }
                if (item.status === 'COMPLETED' || item.status === 3) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã xử lý xong
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-300">
                        <XCircle className="w-3 h-3" />
                        Từ chối BH
                    </span>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => {
                            setSelectedRequest(item);
                            setDetailTab('diagnostic');
                            setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                        title="Xem chi tiết"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleOpenHandling(item)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                        title="Cập nhật xử lý kỹ thuật"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Tiến độ xử lý',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả tiến độ', value: '' },
                { label: 'Chờ nhận ca', value: 'PENDING' },
                { label: 'Đang xử lý kỹ thuật', value: 'IN_PROGRESS' },
                { label: 'Đã hoàn tất', value: 'COMPLETED' },
                { label: 'Từ chối bảo hành', value: 'REJECTED' },
            ],
        },
    ];

    const quickTabs = [
        { key: 'ALL', label: 'Tất cả ca xử lý', count: stats.total },
        { key: 'PENDING', label: 'Chờ nhận ca', count: stats.pending },
        { key: 'IN_PROGRESS', label: 'Đang xử lý', count: stats.inProgress },
        { key: 'COMPLETED', label: 'Đã hoàn tất', count: stats.completed },
    ];

    const handleTabChange = (key: string) => {
        setQuickStatusTab(key);
        setFilters((prev) => ({
            ...prev,
            status: key === 'ALL' ? '' : key,
        }));
        setPage(1);
    };

    const detailTabs: ModalTab[] = [
        { id: 'diagnostic', label: 'Kết quả chẩn đoán', icon: Wrench },
        { id: 'parts', label: 'Linh kiện thay thế', icon: Component },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Quản lý thông tin xử lý kỹ thuật</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Theo dõi quy trình kiểm tra chẩn đoán lỗi, phân công kỹ thuật viên và ghi nhận giải pháp sửa chữa
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                        onClick={fetchRequests}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất báo cáo
                    </AdminButton>
                    <AdminButton
                        variant="primary"
                        icon={<Component className="w-4 h-4" />}
                        onClick={() => navigate('/admin/warranty/spare-parts')}
                    >
                        Kho linh kiện bảo hành
                    </AdminButton>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng số ca tiếp nhận</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Wrench className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chờ phân công / kiểm tra</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang kiểm tra & sửa</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Cpu className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hoàn tất kiểm thử</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {quickTabs.map((tab) => {
                    const isActive = quickStatusTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter */}
            <AdminFilter
                fields={filterFields}
                searchPlaceholder="Tìm theo mã phiếu WR, số serial, tên thiết bị, kỹ thuật..."
                searchQuery={searchQuery}
                onSearchChange={(v) => {
                    setSearchQuery(v);
                    setPage(1);
                }}
                values={filters}
                onFilterChange={(vals) => {
                    const nextFilters = { ...filters, ...vals };
                    setFilters(nextFilters);
                    setQuickStatusTab(nextFilters.status || 'ALL');
                    setPage(1);
                }}
                onReset={() => {
                    setSearchQuery('');
                    setFilters({ status: '' });
                    setQuickStatusTab('ALL');
                    setPage(1);
                }}
            />

            {/* Table */}
            <AdminTable
                columns={columns}
                data={requests}
                rowKey="id"
                loading={loading}
                totalItems={totalElements}
                currentPage={page}
                pageSize={pageSize}
                totalPages={totalPages}
                pageSizeOptions={[5, 10, 15, 20, 50]}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                }}
                emptyText="Chưa có ca xử lý kỹ thuật nào"
            />


            {/* Modal Handling Update */}
            <AdminModal
                isOpen={isHandlingOpen}
                onClose={() => setIsHandlingOpen(false)}
                title={`Cập nhật thông tin xử lý kỹ thuật: ${selectedRequest?.requestCode}`}
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsHandlingOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleSubmitHandling} isLoading={isSubmitting}>
                            Lưu thông tin kỹ thuật
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-slate-500">Thiết bị:</span>{' '}
                            <span className="font-bold text-slate-900">{selectedRequest?.productName}</span>
                            <br />
                            <span className="text-slate-500">Serial:</span>{' '}
                            <span className="font-mono font-bold text-indigo-700">{selectedRequest?.serialNumber}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Khách hàng:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRequest?.customerName}</span>
                            <br />
                            <span className="text-slate-500">Lỗi khách báo:</span>{' '}
                            <span className="text-slate-700 italic">{selectedRequest?.issueDescription}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel required>Kỹ thuật viên phụ trách</AdminLabel>
                            <AdminSelect
                                value={techId}
                                onChange={(e) => setTechId(e.target.value)}
                                options={TECHNICIAN_LIST.map((t) => ({ label: t.name, value: String(t.id) }))}
                            />
                        </div>

                        <div>
                            <AdminLabel required>Phân loại nguồn gốc lỗi</AdminLabel>
                            <AdminSelect
                                value={faultType}
                                onChange={(e) => setFaultType(e.target.value)}
                                options={[
                                    { label: 'Lỗi nhà sản xuất (Bảo hành miễn phí)', value: 'MANUFACTURER' },
                                    { label: 'Lỗi do người dùng / Rơi vỡ / Sét đánh (Sửa tính phí)', value: 'USER_DAMAGE' },
                                    { label: 'Lỗi phần mềm / Xung đột driver / BIOS', value: 'SOFTWARE' },
                                    { label: 'Khác', value: 'OTHER' },
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <AdminLabel required>Biên bản kiểm tra & Giám định kỹ thuật</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Mô tả nguyên nhân chấn đoán: Đo xung clock bị mất, tụ đường nguồn chập, cháy chip IO..."
                            value={inspectionNotes}
                            onChange={(e) => setInspectionNotes(e.target.value)}
                        />
                    </div>

                    <div>
                        <AdminLabel required>Biện pháp xử lý & Kết quả kiểm thử</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Đã thay thế linh kiện gì, chạy thử nghiệm bằng phần mềm test tải bao nhiêu lâu..."
                            value={solution}
                            onChange={(e) => setSolution(e.target.value)}
                        />
                    </div>

                    <div>
                        <AdminLabel required>Cập nhật trạng thái ca</AdminLabel>
                        <AdminSelect
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            options={[
                                { label: 'Đang kiểm tra & xử lý (IN_PROGRESS)', value: 'IN_PROGRESS' },
                                { label: 'Đã xử lý xong hoàn tất (COMPLETED)', value: 'COMPLETED' },
                                { label: 'Từ chối bảo hành (REJECTED)', value: 'REJECTED' },
                            ]}
                        />
                    </div>

                    {/* Section Add Spare Part quickly */}
                    <div className="border-t pt-4">
                        <div className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center justify-between">
                            <span>Linh kiện xuất dùng cho ca này</span>
                            <span className="text-slate-400 font-normal">
                                Đã có: {selectedRequest?.parts?.length || 0} món
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div className="sm:col-span-2">
                                <AdminInput
                                    placeholder="Tên linh kiện thay thế..."
                                    value={sparePartName}
                                    onChange={(e) => setSparePartName(e.target.value)}
                                />
                            </div>
                            <div>
                                <AdminInput
                                    placeholder="Số Serial linh kiện..."
                                    value={sparePartSerial}
                                    onChange={(e) => setSparePartSerial(e.target.value)}
                                />
                            </div>
                            <div>
                                <AdminButton
                                    variant="secondary"
                                    icon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={handleAddPart}
                                    className="w-full"
                                >
                                    Thêm linh kiện
                                </AdminButton>
                            </div>
                        </div>

                        {selectedRequest?.parts && selectedRequest.parts.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {selectedRequest.parts.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs"
                                    >
                                        <span className="font-medium text-slate-800">{p.productName}</span>
                                        <span className="text-indigo-600 font-mono text-[11px]">
                                            {p.serialNumbers?.join(', ') || 'Chưa gắn serial'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </AdminModal>

            {/* Modal Detail */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Hồ sơ kỹ thuật thiết bị bảo hành"
                size="md"
                tabs={detailTabs}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                footer={
                    <AdminButton variant="secondary" onClick={() => setIsDetailOpen(false)}>
                        Đóng
                    </AdminButton>
                }
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        {detailTab === 'diagnostic' && (
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Mã phiếu</div>
                                    <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                                        {selectedRequest.requestCode}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Kỹ thuật viên phụ trách: <span className="font-bold text-slate-800">{selectedRequest.technicianName || 'Chưa phân công'}</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Kết quả giám định</div>
                                    <p className="text-sm text-slate-800 mt-1 font-medium whitespace-pre-line">
                                        {selectedRequest.inspectionNotes || 'Chưa ghi nhận kết quả giám định'}
                                    </p>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Giải pháp xử lý</div>
                                    <p className="text-sm text-slate-800 mt-1 font-medium whitespace-pre-line">
                                        {selectedRequest.solution || 'Chưa ghi nhận giải pháp'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {detailTab === 'parts' && (
                            <div className="space-y-2">
                                {selectedRequest.parts && selectedRequest.parts.length > 0 ? (
                                    selectedRequest.parts.map((part) => (
                                        <div
                                            key={part.id}
                                            className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1"
                                        >
                                            <div className="font-bold text-slate-900">{part.productName}</div>
                                            <div className="text-slate-500">Số lượng: {part.quantity}</div>
                                            <div className="font-mono text-indigo-600">
                                                Serial linh kiện: {part.serialNumbers?.join(', ') || 'N/A'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                                        Không có linh kiện thay thế cho ca này
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>
        </div>
    );
}
