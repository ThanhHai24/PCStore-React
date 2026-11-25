import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Plus,
    Search,
    RefreshCw,
    Download,
    Eye,
    Printer,
    CheckCircle2,
    Clock,
    XCircle,
    Barcode,
    Phone,
    User,
    Wrench,
    FileText,
    Copy,
    Check,
    AlertCircle,
    Calendar,
    ArrowRight,
    Tag,
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
    type ModalTab,
} from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import type {
    WarrantyRequestItem,
    WarrantyRequestStatus,
    ProductWarrantyItem,
    WarrantyRequestCreateInput,
} from '../../../types/adminWarranty';

export default function WarrantyRequestList() {
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
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [detailTab, setDetailTab] = useState<string>('overview');

    // Create Form State
    const [warrantyCandidates, setWarrantyCandidates] = useState<ProductWarrantyItem[]>([]);
    const [selectedWarrantyId, setSelectedWarrantyId] = useState<string>('');
    const [issueDescription, setIssueDescription] = useState<string>('');
    const [intakeAccessories, setIntakeAccessories] = useState<string>('Thân máy, vỏ hộp, adapter');
    const [deviceCondition, setDeviceCondition] = useState<string>('Tem ốc nguyên vẹn, trầy nhẹ không đáng kể');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Copy helper
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
        addToast({ type: 'info', title: 'Đã sao chép', message: code });
    };

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
                message: error.message || 'Không thể tải danh sách phiếu bảo hành',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.status, page, pageSize, addToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Fetch candidates when create modal opens
    const handleOpenCreate = async () => {
        try {
            const res = await adminWarrantyService.getAllWarranties({ size: 100 });
            setWarrantyCandidates(res.content || []);
            if (res.content?.length > 0) {
                setSelectedWarrantyId(String(res.content[0].id));
            }
            setIssueDescription('');
            setIntakeAccessories('Thân máy, vỏ hộp, phụ kiện theo máy');
            setDeviceCondition('Ngoại quan đẹp, tem bảo hành niêm phong nguyên vẹn');
            setIsCreateOpen(true);
        } catch {
            addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải danh sách bảo hành đã cấp' });
        }
    };

    // Submit Create
    const handleSubmitCreate = async () => {
        if (!selectedWarrantyId) {
            addToast({ type: 'warning', title: 'Cảnh báo', message: 'Vui lòng chọn thiết bị được bảo hành' });
            return;
        }
        if (!issueDescription.trim()) {
            addToast({ type: 'warning', title: 'Cảnh báo', message: 'Vui lòng nhập mô tả hiện tượng lỗi' });
            return;
        }

        setIsSubmitting(true);
        try {
            const chosen = warrantyCandidates.find((w) => String(w.id) === selectedWarrantyId);
            const input: WarrantyRequestCreateInput = {
                warrantyId: Number(selectedWarrantyId),
                customerId: chosen?.customerId || 1,
                issueDescription: issueDescription.trim(),
                intakeAccessories: intakeAccessories.trim(),
                deviceCondition: deviceCondition.trim(),
            };

            const created = await adminWarrantyService.createRequest(input);
            addToast({
                type: 'success',
                title: 'Tạo phiếu thành công',
                message: `Đã lập phiếu tiếp nhận bảo hành ${created.requestCode}`,
            });
            setIsCreateOpen(false);
            fetchRequests();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Tạo phiếu thất bại',
                message: error.message || 'Không thể tạo phiếu tiếp nhận bảo hành',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // KPI Metrics
    const stats = useMemo(() => {
        const total = totalElements || requests.length;
        const pending = requests.filter((r) => r.status === 'PENDING' || r.status === 0).length;
        const inProgress = requests.filter((r) => r.status === 'IN_PROGRESS' || r.status === 1).length;
        const completed = requests.filter((r) => r.status === 'COMPLETED' || r.status === 3).length;
        return { total, pending, inProgress, completed };
    }, [requests, totalElements]);

    // Format Date
    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return 'Chưa cập nhật';
        try {
            return new Date(dateStr).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    // Print Receipt
    const handlePrint = () => {
        window.print();
    };

    // Export CSV
    const handleExport = () => {
        if (requests.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }

        const headers = ['Mã phiếu', 'Ngày nhận', 'Khách hàng', 'SĐT', 'Serial máy lỗi', 'Tên sản phẩm', 'Hiện tượng lỗi', 'Kỹ thuật viên', 'Trạng thái'];
        const csvRows = requests.map((r) => [
            `"${r.requestCode}"`,
            formatDateTime(r.createdDate),
            `"${r.customerName}"`,
            `"${r.customerPhone}"`,
            `"${r.serialNumber}"`,
            `"${r.productName.replace(/"/g, '""')}"`,
            `"${(r.issueDescription || '').replace(/"/g, '""')}"`,
            `"${r.technicianName || 'Chưa phân công'}"`,
            r.status === 'PENDING' || r.status === 0
                ? 'Chờ tiếp nhận'
                : r.status === 'IN_PROGRESS' || r.status === 1
                    ? 'Đang xử lý'
                    : r.status === 'COMPLETED' || r.status === 3
                        ? 'Hoàn tất'
                        : 'Từ chối',
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phieu-tiep-nhan-bao-hanh-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã xuất file danh sách phiếu bảo hành' });
    };

    // Restrained 6px status dot indicator (no colorful rounded-full pills)
    const renderStatusIndicator = (status: WarrantyRequestItem['status']) => {
        if (status === 'PENDING' || status === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Chờ tiếp nhận</span>
                </span>
            );
        }
        if (status === 'IN_PROGRESS' || status === 1) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span>Đang xử lý</span>
                </span>
            );
        }
        if (status === 'COMPLETED' || status === 3) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Hoàn tất</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Từ chối</span>
            </span>
        );
    };

    // Table Columns
    const columns: Column<WarrantyRequestItem>[] = [
        {
            key: 'requestCode',
            header: 'Phiếu & Serial',
            render: (item) => (
                <div className="space-y-0.5 min-w-[150px]">
                    <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        <span>{item.requestCode}</span>
                        <button
                            type="button"
                            onClick={() => handleCopy(item.requestCode)}
                            className="p-0.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Sao chép mã phiếu"
                        >
                            {copiedCode === item.requestCode ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        SN: {item.serialNumber}
                    </div>
                </div>
            ),
        },
        {
            key: 'productName',
            header: 'Sản phẩm',
            render: (item) => (
                <div className="max-w-[220px] text-xs font-medium text-slate-900 line-clamp-2" title={item.productName}>
                    {item.productName}
                </div>
            ),
        },
        {
            key: 'customerName',
            header: 'Khách hàng',
            render: (item) => (
                <div className="space-y-0.5 max-w-[170px]">
                    <div className="text-xs font-medium text-slate-900 truncate">{item.customerName}</div>
                    <div className="text-xs font-mono text-slate-500 tabular-nums">{item.customerPhone}</div>
                </div>
            ),
        },
        {
            key: 'issueDescription',
            header: 'Mô tả lỗi',
            render: (item) => (
                <div className="max-w-[220px] text-xs text-slate-600 line-clamp-2" title={item.issueDescription}>
                    {item.issueDescription}
                </div>
            ),
        },
        {
            key: 'technicianName',
            header: 'Kỹ thuật viên',
            render: (item) => (
                <div className="text-xs whitespace-nowrap">
                    {item.technicianName ? (
                        <span className="font-medium text-slate-800">{item.technicianName}</span>
                    ) : (
                        <span className="text-slate-400">Chưa phân công</span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => renderStatusIndicator(item.status),
        },
        {
            key: 'createdDate',
            header: 'Ngày tiếp nhận',
            align: 'right',
            render: (item) => (
                <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDateTime(item.createdDate)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={() => {
                        setSelectedRequest(item);
                        setDetailTab('overview');
                        setIsDetailOpen(true);
                    }}
                    viewLabel="Xem chi tiết phiếu"
                    actions={[
                        {
                            key: 'technical',
                            label: 'Chuyển sang xử lý kỹ thuật',
                            description: 'Mở trang kỹ thuật viên chẩn đoán & sửa chữa',
                            icon: Wrench,
                            variant: 'warning',
                            onClick: () => navigate('/admin/warranty/technical-handling'),
                        },
                        {
                            key: 'print',
                            label: 'In phiếu tiếp nhận',
                            description: 'Xuất bản in biên nhận bảo hành',
                            icon: Printer,
                            variant: 'primary',
                            onClick: () => {
                                setSelectedRequest(item);
                                setIsPrintOpen(true);
                            },
                        },
                    ]}
                />
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái xử lý',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Chờ tiếp nhận', value: 'PENDING' },
                { label: 'Đang xử lý kỹ thuật', value: 'IN_PROGRESS' },
                { label: 'Đã hoàn tất', value: 'COMPLETED' },
                { label: 'Từ chối bảo hành', value: 'REJECTED' },
            ],
        },
    ];

    const quickTabs = [
        { key: 'ALL', label: 'Tất cả phiếu', count: stats.total },
        { key: 'PENDING', label: 'Chờ tiếp nhận', count: stats.pending },
        { key: 'IN_PROGRESS', label: 'Đang xử lý', count: stats.inProgress },
        { key: 'COMPLETED', label: 'Đã hoàn tất', count: stats.completed },
        { key: 'REJECTED', label: 'Từ chối', count: Math.max(0, stats.total - stats.pending - stats.inProgress - stats.completed) },
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
        { id: 'overview', label: 'Thông tin phiếu nhận', icon: ClipboardList },
        { id: 'technical', label: 'Tiến độ & Linh kiện', icon: Wrench },
    ];

    const activeCandidate = warrantyCandidates.find((w) => String(w.id) === selectedWarrantyId);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý yêu cầu bảo hành
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.total} phiếu · {stats.pending} chờ tiếp nhận · {stats.inProgress} đang xử lý
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />}
                        onClick={fetchRequests}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất file
                    </AdminButton>
                    <AdminButton variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
                        Lập phiếu tiếp nhận
                    </AdminButton>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-5 overflow-x-auto border-b border-slate-200">
                {quickTabs.map((tab) => {
                    const isActive = quickStatusTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabChange(tab.key)}
                            className={`pb-2.5 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-px cursor-pointer focus-visible:outline-none focus-visible:text-blue-600 ${
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.5 rounded-md text-xs font-medium tabular-nums ${
                                    isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Table */}
            <div className="space-y-4">
                <AdminFilter
                    fields={filterFields}
                    searchPlaceholder="Tìm kiếm theo mã phiếu WR, số serial, khách hàng, SĐT..."
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
                    emptyText="Chưa có phiếu yêu cầu bảo hành nào"
                />
            </div>

            {/* Modal Create Request */}
            <AdminModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Lập phiếu tiếp nhận thiết bị bảo hành"
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleSubmitCreate} isLoading={isSubmitting}>
                            Lập phiếu tiếp nhận
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <AdminLabel required>Chọn thiết bị / Số serial cần bảo hành</AdminLabel>
                        <AdminSelect
                            value={selectedWarrantyId}
                            onChange={(e) => setSelectedWarrantyId(e.target.value)}
                            options={warrantyCandidates.map((w) => ({
                                label: `[${w.serialNumber}] - ${w.productName} (Khách: ${w.customerName})`,
                                value: String(w.id),
                            }))}
                        />
                    </div>

                    {activeCandidate && (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                            <div>
                                <dt className="text-slate-500">Khách hàng</dt>
                                <dd className="font-medium text-slate-900 mt-0.5 tabular-nums">
                                    {activeCandidate.customerName} · {activeCandidate.customerPhone}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Thời hạn bảo hành còn lại</dt>
                                <dd className="font-semibold text-emerald-700 mt-0.5 tabular-nums">
                                    {activeCandidate.remainingDays} ngày (Hết hạn: {activeCandidate.endDate.slice(0, 10)})
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-slate-500">Gói chính sách</dt>
                                <dd className="font-medium text-slate-900 mt-0.5">{activeCandidate.policyName}</dd>
                            </div>
                        </dl>
                    )}

                    <div>
                        <AdminLabel required>Mô tả hiện tượng lỗi khách hàng phản ánh</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Mô tả chi tiết: máy không lên hình, sập nguồn ngẫu nhiên, cổng mạng không nhận..."
                            value={issueDescription}
                            onChange={(e) => setIssueDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel>Phụ kiện bàn giao kèm máy</AdminLabel>
                            <AdminInput
                                placeholder="Dây nguồn, củ sạc, vỏ hộp, adapter..."
                                value={intakeAccessories}
                                onChange={(e) => setIntakeAccessories(e.target.value)}
                            />
                        </div>

                        <div>
                            <AdminLabel>Tình trạng ngoại quan</AdminLabel>
                            <AdminInput
                                placeholder="Trầy nhẹ mặt A, tem ốc niêm phong nguyên vẹn..."
                                value={deviceCondition}
                                onChange={(e) => setDeviceCondition(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </AdminModal>

            {/* Modal Detail Request */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Chi tiết phiếu bảo hành ${selectedRequest?.requestCode}`}
                size="lg"
                tabs={detailTabs}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton
                            variant="secondary"
                            icon={<Printer className="w-4 h-4" />}
                            onClick={() => {
                                setIsDetailOpen(false);
                                setIsPrintOpen(true);
                            }}
                        >
                            In phiếu tiếp nhận
                        </AdminButton>
                        <AdminButton variant="secondary" onClick={() => setIsDetailOpen(false)}>
                            Đóng
                        </AdminButton>
                    </div>
                }
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        {detailTab === 'overview' && (
                            <div className="space-y-4">
                                {/* Flat summary header strip */}
                                <div className="px-4 py-3 bg-slate-50 rounded-md border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                                            {selectedRequest.requestCode}
                                        </span>
                                        <span className="text-slate-300">·</span>
                                        {renderStatusIndicator(selectedRequest.status)}
                                    </div>
                                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                                        Tiếp nhận: {formatDateTime(selectedRequest.createdDate)}
                                    </span>
                                </div>

                                {/* Flat 2-column detail grid (no card-in-card) */}
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-1">
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Khách hàng</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900">
                                            {selectedRequest.customerName}
                                        </dd>
                                        <dd className="font-mono text-slate-500 tabular-nums">
                                            {selectedRequest.customerPhone}
                                        </dd>
                                    </div>

                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Thiết bị &amp; Serial</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900 line-clamp-1">
                                            {selectedRequest.productName}
                                        </dd>
                                        <dd className="font-mono text-slate-600 tabular-nums">
                                            SN: {selectedRequest.serialNumber}
                                        </dd>
                                    </div>

                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Phụ kiện nhận kèm</dt>
                                        <dd className="mt-0.5 font-medium text-slate-800">
                                            {selectedRequest.intakeAccessories || 'Không có'}
                                        </dd>
                                    </div>

                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Tình trạng ngoại quan</dt>
                                        <dd className="mt-0.5 font-medium text-slate-800">
                                            {selectedRequest.deviceCondition || 'Bình thường'}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="p-3.5 bg-white rounded-md border border-slate-200 space-y-1">
                                    <div className="text-xs font-medium text-slate-500">Hiện tượng lỗi tiếp nhận</div>
                                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                        {selectedRequest.issueDescription}
                                    </p>
                                </div>
                            </div>
                        )}

                        {detailTab === 'technical' && (
                            <div className="space-y-4 text-xs">
                                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                    <div className="px-4 py-3 flex items-center justify-between gap-4">
                                        <span className="text-slate-500">Kỹ thuật viên phụ trách</span>
                                        <span className="font-semibold text-slate-900">
                                            {selectedRequest.technicianName || 'Chưa chỉ định kỹ thuật viên'}
                                        </span>
                                    </div>
                                    <div className="px-4 py-3 space-y-1">
                                        <div className="text-slate-500 font-medium">Biên bản chẩn đoán kỹ thuật</div>
                                        <p className="text-slate-800 leading-relaxed">
                                            {selectedRequest.inspectionNotes || 'Chưa có kết luận chẩn đoán'}
                                        </p>
                                    </div>
                                    <div className="px-4 py-3 space-y-1">
                                        <div className="text-slate-500 font-medium">Giải pháp xử lý</div>
                                        <p className="text-slate-800 leading-relaxed">
                                            {selectedRequest.solution || 'Chưa ghi nhận giải pháp'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider tabular-nums">
                                        Linh kiện thay thế ({selectedRequest.parts?.length || 0})
                                    </div>
                                    {selectedRequest.parts && selectedRequest.parts.length > 0 ? (
                                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                            {selectedRequest.parts.map((part) => (
                                                <div
                                                    key={part.id}
                                                    className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-slate-900 truncate">
                                                            {part.productName}
                                                        </div>
                                                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                                                            Mã: {part.productCode} · SL: {part.quantity}
                                                        </div>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 shrink-0">
                                                        {part.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3.5 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
                                            Không có linh kiện thay thế nào cho ca sửa này
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* Modal Print Receipt */}
            <AdminModal
                isOpen={isPrintOpen}
                onClose={() => setIsPrintOpen(false)}
                title="Phiếu tiếp nhận bảo hành & sửa chữa"
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsPrintOpen(false)}>
                            Đóng
                        </AdminButton>
                        <AdminButton variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
                            In biên bản này
                        </AdminButton>
                    </div>
                }
            >
                {selectedRequest && (
                    <div className="p-6 bg-white border border-slate-200 rounded-md space-y-5 print:border-none print:p-0">
                        {/* Print Header */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 uppercase">
                                    HỆ THỐNG MÁY TÍNH &amp; LINH KIỆN PCSTORE
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Trung Tâm Dịch Vụ Khách Hàng &amp; Bảo Hành Kỹ Thuật
                                </p>
                                <p className="text-xs text-slate-500 tabular-nums">Hotline kỹ thuật: 1900 8888 - 0988 888 999</p>
                            </div>
                            <div className="text-right tabular-nums">
                                <div className="text-xs text-slate-500">Mã biên nhận</div>
                                <div className="text-base font-mono font-semibold text-slate-900">
                                    {selectedRequest.requestCode}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                    {formatDateTime(selectedRequest.createdDate)}
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center">
                            <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">
                                BIÊN BẢN TIẾP NHẬN THIẾT BỊ BẢO HÀNH
                            </h3>
                            <p className="text-xs text-slate-500 italic mt-0.5">
                                (Khách hàng vui lòng mang theo phiếu này khi đến nhận lại thiết bị)
                            </p>
                        </div>

                        {/* Info tables */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border border-slate-200 p-3.5 rounded-md bg-slate-50">
                            <div className="space-y-1">
                                <div>
                                    <span className="text-slate-500">Khách hàng:</span>{' '}
                                    <strong className="text-slate-900">{selectedRequest.customerName}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500">Điện thoại:</span>{' '}
                                    <span className="font-mono text-slate-900 tabular-nums">{selectedRequest.customerPhone}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Đơn mua hàng:</span>{' '}
                                    <span className="font-mono text-slate-900 tabular-nums">{selectedRequest.orderCode || 'Bảo hành lẻ'}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div>
                                    <span className="text-slate-500">Thiết bị:</span>{' '}
                                    <strong className="text-slate-900">{selectedRequest.productName}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500">Số Serial:</span>{' '}
                                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                        {selectedRequest.serialNumber}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Phụ kiện kèm:</span>{' '}
                                    <span className="text-slate-900">{selectedRequest.intakeAccessories || 'Thân máy'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Issue description */}
                        <div className="border border-slate-200 p-3.5 rounded-md text-xs space-y-1">
                            <div className="font-medium text-slate-700">Tình trạng lỗi do khách hàng mô tả</div>
                            <div className="text-slate-900">{selectedRequest.issueDescription}</div>
                            <div className="text-slate-500 text-[11px] pt-1">
                                Tình trạng máy khi nhận:{' '}
                                <span className="font-medium text-slate-700">{selectedRequest.deviceCondition}</span>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-200 pt-3">
                            <p className="font-semibold text-slate-700">Quy định bảo hành:</p>
                            <p>- Thời gian xử lý kiểm tra và sửa chữa tiêu chuẩn từ 3 - 7 ngày làm việc.</p>
                            <p>- Công ty không chịu trách nhiệm về dữ liệu cá nhân lưu trữ trong ổ đĩa của khách hàng.</p>
                            <p>- Quá 30 ngày kể từ khi thông báo hoàn tất nếu khách hàng không đến nhận, thiết bị sẽ chuyển về kho lưu giữ.</p>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 text-center text-xs pt-4 border-t border-slate-200">
                            <div>
                                <div className="font-semibold text-slate-800">KHÁCH HÀNG KÝ NHẬN</div>
                                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                                <div className="h-14"></div>
                                <div className="font-medium text-slate-900">{selectedRequest.customerName}</div>
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">ĐẠI DIỆN TIẾP NHẬN BẢO HÀNH</div>
                                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký tên đóng dấu)</div>
                                <div className="h-14"></div>
                                <div className="font-medium text-slate-900">
                                    {selectedRequest.technicianName || 'Nhân viên tiếp nhận'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
}
