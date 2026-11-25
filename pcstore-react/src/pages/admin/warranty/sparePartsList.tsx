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
import { AdminTable, AdminActionDropdown, type Column } from '../../../components/admin/common/table';
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
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
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

    // Fetch spare parts (server-side pagination & filtering)
    const fetchParts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminWarrantyService.getSparePartsPage({
                keyword: searchQuery.trim() || undefined,
                status: filters.status || undefined,
                page: page - 1,
                size: pageSize,
            });
            setParts(res.content || []);
            const total = res.totalElements ?? (res.content?.length || 0);
            setTotalElements(total);
            setTotalPages(Math.max(1, res.totalPages || Math.ceil(total / pageSize)));
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: error.message || 'Không thể tải danh sách linh kiện bảo hành',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.status, page, pageSize, addToast]);

    useEffect(() => {
        fetchParts();
    }, [fetchParts]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = totalElements || parts.length;
        const reserved = parts.filter((p) => p.status === 'RESERVED' || p.status === 1).length;
        const installed = parts.filter((p) => p.status === 'INSTALLED' || p.status === 2).length;
        const returned = parts.filter((p) => p.status === 'RETURNED' || p.status === 3).length;
        const totalCost = parts.reduce((acc, cur) => acc + (cur.totalCost || 0), 0);
        return { total, reserved, installed, returned, totalCost };
    }, [parts, totalElements]);

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

    // Restrained 6px status dot indicator (no colorful rounded-full pills)
    const renderPartStatusIndicator = (st: SparePartItem['status']) => {
        if (st === 'PENDING' || st === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Chờ duyệt xuất</span>
                </span>
            );
        }
        if (st === 'RESERVED' || st === 1) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Đã giữ kho</span>
                </span>
            );
        }
        if (st === 'INSTALLED' || st === 2) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Đã lắp vào máy</span>
                </span>
            );
        }
        if (st === 'RETURNED' || st === 3) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span>Đã hoàn kho</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Đã hủy</span>
            </span>
        );
    };

    // Table Columns
    const columns: Column<SparePartItem>[] = [
        {
            key: 'productName',
            header: 'Linh kiện & Mã',
            render: (item) => (
                <div className="max-w-[260px] space-y-0.5">
                    <div className="text-xs font-medium text-slate-900 truncate" title={item.productName}>
                        {item.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Mã: {item.productCode}
                    </div>
                </div>
            ),
        },
        {
            key: 'requestCode',
            header: 'Phiếu BH & Serial',
            render: (item) => (
                <div className="space-y-1 min-w-[160px]">
                    <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {item.requestCode}
                    </div>
                    {item.serialNumbers && item.serialNumbers.length > 0 ? (
                        <span className="inline-block font-mono text-[11px] text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 tabular-nums">
                            {item.serialNumbers.join(', ')}
                        </span>
                    ) : (
                        <span className="text-[11px] text-slate-400">Chưa gắn serial</span>
                    )}
                </div>
            ),
        },
        {
            key: 'assignedTechnician',
            header: 'Kỹ thuật thực hiện',
            render: (item) => (
                <span className="text-xs text-slate-800 whitespace-nowrap">
                    {item.assignedTechnician || <span className="text-slate-400">Chưa phân công</span>}
                </span>
            ),
        },
        {
            key: 'quantity',
            header: 'SL',
            align: 'right',
            render: (item) => (
                <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {item.quantity}
                </span>
            ),
        },
        {
            key: 'totalCost',
            header: 'Đơn giá / Thành tiền',
            align: 'right',
            render: (item) => (
                <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                    <div className="font-mono text-xs font-semibold text-slate-900">
                        {formatVND(item.totalCost)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                        {formatVND(item.unitCost)} / cái
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => renderPartStatusIndicator(item.status),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    actions={[
                        {
                            key: 'change-status',
                            label: 'Đổi trạng thái linh kiện',
                            icon: RefreshCw,
                            variant: 'primary',
                            highlight: true,
                            onClick: () => handleOpenStatus(item),
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
            label: 'Trạng thái linh kiện',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Chờ duyệt xuất (PENDING)', value: 'PENDING' },
                { label: 'Đang giữ kho (RESERVED)', value: 'RESERVED' },
                { label: 'Đã lắp vào máy (INSTALLED)', value: 'INSTALLED' },
                { label: 'Đã hoàn kho (RETURNED)', value: 'RETURNED' },
                { label: 'Đã hủy (CANCELLED)', value: 'CANCELLED' },
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
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý linh kiện thay thế
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.total} linh kiện · {stats.reserved} đang giữ kho · {stats.installed} đã lắp · {formatVND(stats.totalCost)}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />}
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

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200">
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

                <AdminTable
                    columns={columns}
                    data={parts}
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
                    emptyText="Chưa có linh kiện thay thế nào trong danh sách"
                />
            </div>

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
                    <dl className="p-3.5 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <dt className="text-slate-500">Linh kiện</dt>
                            <dd className="font-medium text-slate-900 mt-0.5">{selectedPart?.productName}</dd>
                            <dd className="font-mono text-[11px] text-slate-500 tabular-nums">
                                {selectedPart?.productCode}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Phiếu bảo hành</dt>
                            <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                                {selectedPart?.requestCode}
                            </dd>
                            <dd className="font-mono text-[11px] text-slate-500 tabular-nums">
                                SL: {selectedPart?.quantity} · {formatVND(selectedPart?.totalCost)}
                            </dd>
                        </div>
                    </dl>

                    <div>
                        <AdminLabel required>Trạng thái mới của linh kiện</AdminLabel>
                        <AdminSelect
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            options={[
                                { label: 'Chờ duyệt xuất kho (PENDING)', value: 'PENDING' },
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
