import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Component,
    Boxes,
    Search,
    RefreshCw,
    Download,
    Eye,
    RotateCcw,
    CheckCircle2,
    Clock,
    XCircle,
    Barcode,
    DollarSign,
    ClipboardList,
    User,
    Calendar,
    ArrowRight,
    Sparkles,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminSelect,
    AdminButton,
    AdminLabel,
} from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import type { SparePartItem } from '../../../types/adminWarranty';

// Helper format VND
function formatVND(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function SparePartsList() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Data State
    const [loading, setLoading] = useState<boolean>(true);
    const [parts, setParts] = useState<SparePartItem[]>([]);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, string>>({
        status: '',
    });
    const [quickStatusTab, setQuickStatusTab] = useState<string>('ALL');

    // Modals
    const [selectedPart, setSelectedPart] = useState<SparePartItem | null>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
    const [newStatus, setNewStatus] = useState<string>('INSTALLED');
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    // Fetch spare parts
    const fetchParts = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminWarrantyService.getAllSpareParts();
            setParts(list);
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: error.message || 'Không thể tải danh sách linh kiện bảo hành',
            });
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchParts();
    }, [fetchParts]);

    // Filtered data
    const filteredParts = useMemo(() => {
        return parts.filter((p) => {
            if (searchQuery.trim()) {
                const kw = searchQuery.trim().toLowerCase();
                const matchKw =
                    p.productName.toLowerCase().includes(kw) ||
                    p.productCode.toLowerCase().includes(kw) ||
                    p.requestCode.toLowerCase().includes(kw) ||
                    p.serialNumbers.some((s) => s.toLowerCase().includes(kw));
                if (!matchKw) return false;
            }

            if (filters.status) {
                if (String(p.status) !== filters.status) return false;
            }

            return true;
        });
    }, [parts, searchQuery, filters.status]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = parts.length;
        const reserved = parts.filter((p) => p.status === 'RESERVED' || p.status === 1).length;
        const installed = parts.filter((p) => p.status === 'INSTALLED' || p.status === 2).length;
        const returned = parts.filter((p) => p.status === 'RETURNED' || p.status === 3).length;
        const totalCost = parts.reduce((acc, cur) => acc + (cur.totalCost || 0), 0);
        return { total, reserved, installed, returned, totalCost };
    }, [parts]);

    // Total pages
    const totalPages = Math.max(1, Math.ceil(filteredParts.length / pageSize));

    // Paginated content
    const paginatedParts = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredParts.slice(start, start + pageSize);
    }, [filteredParts, page, pageSize]);

    // Open Status Modal
    const handleOpenStatus = (part: SparePartItem) => {
        setSelectedPart(part);
        setNewStatus(String(part.status));
        setIsStatusModalOpen(true);
    };

    // Update Status
    const handleConfirmStatus = async () => {
        if (!selectedPart) return;
        setIsUpdating(true);
        try {
            await adminWarrantyService.updatePartStatus(selectedPart.warrantyRequestId, selectedPart.id, newStatus);
            addToast({
                type: 'success',
                title: 'Thành công',
                message: `Đã cập nhật trạng thái linh kiện "${selectedPart.productName}" sang ${newStatus}`,
            });
            setIsStatusModalOpen(false);
            fetchParts();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Cập nhật thất bại',
                message: error.message || 'Lỗi cập nhật trạng thái linh kiện',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // Export CSV
    const handleExport = () => {
        if (parts.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }

        const headers = ['Mã linh kiện', 'Tên linh kiện', 'Mã phiếu WR', 'Serial linh kiện', 'Số lượng', 'Đơn giá', 'Tổng tiền', 'Kỹ thuật viên', 'Trạng thái'];
        const csvRows = parts.map((p) => [
            `"${p.productCode}"`,
            `"${p.productName.replace(/"/g, '""')}"`,
            `"${p.requestCode}"`,
            `"${p.serialNumbers.join(', ')}"`,
            p.quantity,
            p.unitCost,
            p.totalCost,
            `"${p.assignedTechnician || ''}"`,
            p.status,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linh-kien-thay-the-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã xuất file linh kiện thay thế' });
    };

    // Table Columns
    const columns: Column<SparePartItem>[] = [
        {
            key: 'productName',
            header: 'Tên linh kiện phụ tùng',
            render: (item) => (
                <div className="max-w-xs">
                    <div className="font-semibold text-slate-900 line-clamp-1">{item.productName}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">Mã: {item.productCode}</div>
                </div>
            ),
        },
        {
            key: 'requestCode',
            header: 'Phiếu bảo hành áp dụng',
            render: (item) => (
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-indigo-700">
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>{item.requestCode}</span>
                </div>
            ),
        },
        {
            key: 'serialNumbers',
            header: 'Serial linh kiện thay',
            render: (item) => (
                <div className="font-mono text-xs text-slate-700">
                    {item.serialNumbers && item.serialNumbers.length > 0 ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {item.serialNumbers.join(', ')}
                        </span>
                    ) : (
                        <span className="text-slate-400 italic">Chưa gắn serial</span>
                    )}
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Số lượng & Chi phí',
            render: (item) => (
                <div className="text-xs">
                    <div className="font-bold text-slate-900">
                        {item.quantity} cái x {formatVND(item.unitCost)}
                    </div>
                    <div className="text-emerald-700 font-semibold mt-0.5">
                        Tổng: {formatVND(item.totalCost)}
                    </div>
                </div>
            ),
        },
        {
            key: 'assignedTechnician',
            header: 'Kỹ thuật thực hiện',
            render: (item) => (
                <span className="text-xs text-slate-800 font-medium">{item.assignedTechnician || 'Chưa phân công'}</span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => {
                if (item.status === 'RESERVED' || item.status === 1) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            Đã giữ kho
                        </span>
                    );
                }
                if (item.status === 'INSTALLED' || item.status === 2) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã lắp vào máy
                        </span>
                    );
                }
                if (item.status === 'RETURNED' || item.status === 3) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300">
                            <RotateCcw className="w-3 h-3" />
                            Đã hoàn kho
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                        Đã hủy
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
                        onClick={() => handleOpenStatus(item)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                    >
                        Đổi trạng thái
                    </button>
                </div>
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái linh kiện',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang giữ kho (RESERVED)', value: 'RESERVED' },
                { label: 'Đã lắp vào máy (INSTALLED)', value: 'INSTALLED' },
                { label: 'Đã hoàn kho (RETURNED)', value: 'RETURNED' },
            ],
        },
    ];

    const quickTabs = [
        { key: 'ALL', label: 'Tất cả linh kiện', count: stats.total },
        { key: 'RESERVED', label: 'Đang giữ kho', count: stats.reserved },
        { key: 'INSTALLED', label: 'Đã lắp vào máy', count: stats.installed },
        { key: 'RETURNED', label: 'Đã hoàn kho', count: stats.returned },
    ];

    const handleTabChange = (key: string) => {
        setQuickStatusTab(key);
        setFilters((prev) => ({
            ...prev,
            status: key === 'ALL' ? '' : key,
        }));
        setPage(1);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Component className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Quản lý linh kiện thay thế</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Theo dõi xuất kho linh kiện dự phòng, số serial thay thế và đối soát chi phí vật tư bảo hành
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                        onClick={fetchParts}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất file
                    </AdminButton>
                    <AdminButton
                        variant="primary"
                        icon={<ClipboardList className="w-4 h-4" />}
                        onClick={() => navigate('/admin/warranty/technical-handling')}
                    >
                        Ca kỹ thuật đang xử lý
                    </AdminButton>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng linh kiện xuất</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Boxes className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang giữ chờ thay</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.reserved}</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã lắp ráp hoàn tất</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.installed}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng giá trị linh kiện</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatVND(stats.totalCost)}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <DollarSign className="w-6 h-6" />
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
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 text-slate-600'
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
                searchPlaceholder="Tìm theo tên linh kiện, mã linh kiện, mã phiếu WR, serial..."
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
                data={paginatedParts}
                rowKey="id"
                loading={loading}
                totalItems={filteredParts.length}
                currentPage={page}
                pageSize={pageSize}
                totalPages={totalPages}
                pageSizeOptions={[5, 10, 15, 20, 50]}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                }}
                emptyText="Chưa có linh kiện thay thế nào trong danh sách"
            />

            {/* Modal Update Part Status */}
            <AdminModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                title="Cập nhật trạng thái linh kiện"
                size="md"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsStatusModalOpen(false)} disabled={isUpdating}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleConfirmStatus} isLoading={isUpdating}>
                            Lưu trạng thái
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                        <div>
                            <span className="text-slate-500">Linh kiện:</span>{' '}
                            <span className="font-bold text-slate-900">{selectedPart?.productName}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Phiếu bảo hành:</span>{' '}
                            <span className="font-mono font-bold text-indigo-700">{selectedPart?.requestCode}</span>
                        </div>
                    </div>

                    <div>
                        <AdminLabel required>Trạng thái mới của linh kiện</AdminLabel>
                        <AdminSelect
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            options={[
                                { label: 'Đang giữ cho ca sửa (RESERVED)', value: 'RESERVED' },
                                { label: 'Đã lắp ráp vào thiết bị khách (INSTALLED)', value: 'INSTALLED' },
                                { label: 'Hoàn trả lại kho kỹ thuật (RETURNED)', value: 'RETURNED' },
                                { label: 'Hủy bỏ cấp linh kiện (CANCELLED)', value: 'CANCELLED' },
                            ]}
                        />
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
