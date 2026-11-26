import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    Barcode,
    Search,
    RefreshCw,
    Download,
    Eye,
    Plus,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    User,
    Phone,
    ShoppingCart,
    Copy,
    Check,
    ExternalLink,
    Wrench,
    FileText,
    History,
    Sparkles,
    ChevronLeft,
    ChevronRight,
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
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import type {
    ProductWarrantyItem,
    ProductWarrantyStatus,
    WarrantyRequestCreateInput,
} from '../../../types/adminWarranty';

export default function ProductWarrantyList() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Data State
    const [loading, setLoading] = useState<boolean>(true);
    const [warranties, setWarranties] = useState<ProductWarrantyItem[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [quickStatusTab, setQuickStatusTab] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');

    // Selected item & Modals
    const [selectedWarranty, setSelectedWarranty] = useState<ProductWarrantyItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [detailTab, setDetailTab] = useState<string>('general');
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

    // Extend Modal
    const [isExtendOpen, setIsExtendOpen] = useState<boolean>(false);
    const [extendDays, setExtendDays] = useState<number>(30);
    const [extendReason, setExtendReason] = useState<string>('');
    const [isExtending, setIsExtending] = useState<boolean>(false);

    // Direct Intake Request Modal
    const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
    const [intakeIssue, setIntakeIssue] = useState<string>('');
    const [intakeAccessories, setIntakeAccessories] = useState<string>('Thân máy, vỏ hộp');
    const [intakeCondition, setIntakeCondition] = useState<string>('Máy nguyên vẹn, tem ốc chưa rách');
    const [isSubmittingIntake, setIsSubmittingIntake] = useState<boolean>(false);

    // Void Warranty Confirm Modal
    const [isVoidOpen, setIsVoidOpen] = useState<boolean>(false);
    const [isVoiding, setIsVoiding] = useState<boolean>(false);

    // Copy to clipboard helper
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSerial(text);
        setTimeout(() => setCopiedSerial(null), 2000);
        addToast({ type: 'info', title: 'Đã sao chép', message: text });
    };

    // Fetch warranties
    const fetchWarranties = useCallback(async () => {
        setLoading(true);
        try {
            let effectiveStatus: string | undefined = filters.status;
            if (quickStatusTab !== 'ALL') {
                effectiveStatus = quickStatusTab;
            }

            const res = await adminWarrantyService.getAllWarranties({
                keyword: searchQuery.trim() || undefined,
                status: (effectiveStatus as ProductWarrantyStatus) || undefined,
                page: currentPage - 1,
                size: pageSize,
            });

            const content = res.content || [];
            const total = res.totalElements || content.length;
            setWarranties(content);
            setTotalElements(total);
            setTotalPages(Math.max(1, res.totalPages || Math.ceil(total / pageSize)));
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: error.message || 'Không thể tải danh sách bảo hành sản phẩm',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters, quickStatusTab, currentPage, pageSize, addToast]);

    useEffect(() => {
        fetchWarranties();
    }, [fetchWarranties]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = totalElements || warranties.length;
        const active = warranties.filter((w) => w.status === 'ACTIVE').length;
        const expiringSoon = warranties.filter((w) => w.status === 'EXPIRING_SOON').length;
        const expired = warranties.filter((w) => w.status === 'EXPIRED').length;
        return { total, active, expiringSoon, expired };
    }, [warranties, totalElements]);

    // Search and filter handlers
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleFilterChange = (newFilters: Record<string, any>) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleFilterReset = () => {
        setSearchQuery('');
        setFilters({});
        setQuickStatusTab('ALL');
        setCurrentPage(1);
        addToast({ type: 'info', title: 'Đặt lại bộ lọc', message: 'Đã xóa toàn bộ bộ lọc bảo hành sản phẩm' });
    };

    // Actions
    const handleOpenDetail = async (w: ProductWarrantyItem) => {
        setSelectedWarranty(w);
        setDetailTab('general');
        setIsDetailOpen(true);

        try {
            const fresh = await adminWarrantyService.getWarrantyById(w.id);
            setSelectedWarranty((prev) =>
                prev && prev.id === fresh.id ? { ...prev, ...fresh } : prev
            );
        } catch {
            // Keep optimistic row data if detail fetch fails
        }
    };

    const handleOpenExtend = (w: ProductWarrantyItem) => {
        setSelectedWarranty(w);
        setExtendDays(30);
        setExtendReason('Chăm sóc khách hàng VIP / Bù thời gian chờ linh kiện');
        setIsExtendOpen(true);
    };

    const handleConfirmExtend = async () => {
        if (!selectedWarranty) return;
        setIsExtending(true);
        try {
            await adminWarrantyService.extendWarranty(selectedWarranty.id, extendDays, extendReason);
            addToast({
                type: 'success',
                title: 'Gia hạn thành công',
                message: `Đã cộng thêm ${extendDays} ngày bảo hành cho serial ${selectedWarranty.serialNumber}`,
            });
            setIsExtendOpen(false);
            fetchWarranties();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Gia hạn thất bại',
                message: error.message || 'Không thể gia hạn bảo hành',
            });
        } finally {
            setIsExtending(false);
        }
    };

    const handleOpenIntake = (w: ProductWarrantyItem) => {
        setSelectedWarranty(w);
        setIntakeIssue('');
        setIntakeAccessories('Thân máy, phụ kiện tiêu chuẩn');
        setIntakeCondition('Ngoại quan đẹp, tem bảo hành còn nguyên');
        setIsIntakeOpen(true);
    };

    const handleConfirmIntake = async () => {
        if (!selectedWarranty) return;
        if (!intakeIssue.trim()) {
            addToast({ type: 'warning', title: 'Cảnh báo', message: 'Vui lòng nhập mô tả hiện tượng lỗi của máy' });
            return;
        }

        setIsSubmittingIntake(true);
        try {
            const input: WarrantyRequestCreateInput = {
                warrantyId: selectedWarranty.id,
                customerId: selectedWarranty.customerId || 1,
                issueDescription: intakeIssue.trim(),
                intakeAccessories: intakeAccessories.trim(),
                deviceCondition: intakeCondition.trim(),
            };

            const created = await adminWarrantyService.createRequest(input);
            addToast({
                type: 'success',
                title: 'Tiếp nhận thành công',
                message: `Đã tạo phiếu tiếp nhận bảo hành ${created.requestCode}`,
            });
            setIsIntakeOpen(false);
            fetchWarranties();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Tiếp nhận thất bại',
                message: error.message || 'Lỗi khi tạo phiếu tiếp nhận bảo hành',
            });
        } finally {
            setIsSubmittingIntake(false);
        }
    };

    const handleOpenVoid = (w: ProductWarrantyItem) => {
        setSelectedWarranty(w);
        setIsVoidOpen(true);
    };

    const handleConfirmVoid = async () => {
        if (!selectedWarranty) return;
        setIsVoiding(true);
        try {
            await adminWarrantyService.voidWarranty(selectedWarranty.id);
            addToast({
                type: 'success',
                title: 'Đã hủy hiệu lực bảo hành',
                message: `Gói bảo hành của serial ${selectedWarranty.serialNumber} đã bị vô hiệu hóa`,
            });
            setIsVoidOpen(false);
            fetchWarranties();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Hủy hiệu lực thất bại',
                message: error.message || 'Không thể hủy hiệu lực bảo hành',
            });
        } finally {
            setIsVoiding(false);
        }
    };

    // Format Date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Chưa có';
        try {
            return new Date(dateStr).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    // Export CSV
    const handleExport = () => {
        if (warranties.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }

        const headers = ['Số Serial', 'Tên sản phẩm', 'Khách hàng', 'SĐT', 'Đơn hàng', 'Chính sách', 'Ngày bắt đầu', 'Ngày hết hạn', 'Số ngày còn lại', 'Trạng thái'];
        const csvRows = warranties.map((w) => [
            `"${w.serialNumber}"`,
            `"${(w.productName || '').replace(/"/g, '""')}"`,
            `"${(w.customerName || '').replace(/"/g, '""')}"`,
            `"${w.customerPhone || ''}"`,
            `"${w.orderCode || ''}"`,
            `"${(w.policyName || '').replace(/"/g, '""')}"`,
            formatDate(w.startDate),
            formatDate(w.endDate),
            w.remainingDays,
            w.status === 'ACTIVE' ? 'Còn hạn' : w.status === 'EXPIRING_SOON' ? 'Sắp hết hạn' : 'Đã hết hạn',
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `danh-sach-bao-hanh-san-pham-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã xuất file danh sách bảo hành' });
    };

    // Restrained 6px status dot indicator (no colorful rounded-full pills)
    const renderWarrantyStatusIndicator = (status: ProductWarrantyItem['status']) => {
        if (status === 'ACTIVE') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Còn hạn</span>
                </span>
            );
        }
        if (status === 'EXPIRING_SOON') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Sắp hết hạn</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Đã hết hạn</span>
            </span>
        );
    };

    // Table Columns
    const columns: Column<ProductWarrantyItem>[] = [
        {
            key: 'serialNumber',
            header: 'Serial & Chứng từ',
            render: (item) => (
                <div className="space-y-0.5 min-w-[155px]">
                    <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        <span>{item.serialNumber}</span>
                        <button
                            type="button"
                            onClick={() => handleCopy(item.serialNumber)}
                            className="p-0.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Sao chép Serial"
                        >
                            {copiedSerial === item.serialNumber ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    {item.orderCode && (
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                            Đơn: {item.orderCode}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'productName',
            header: 'Sản phẩm & Chính sách',
            render: (item) => (
                <div className="max-w-[280px] space-y-0.5">
                    <div className="text-xs font-medium text-slate-900 truncate" title={item.productName}>
                        {item.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate tabular-nums" title={item.policyName}>
                        {item.policyName} · {Math.round(item.durationDays / 30)} tháng
                    </div>
                </div>
            ),
        },
        {
            key: 'customerName',
            header: 'Khách hàng',
            render: (item) => (
                <div className="space-y-0.5 max-w-[180px]">
                    <div className="text-xs font-medium text-slate-900 truncate">{item.customerName}</div>
                    <div className="text-xs font-mono text-slate-500 tabular-nums">{item.customerPhone}</div>
                </div>
            ),
        },
        {
            key: 'remainingDays',
            header: 'Thời hạn bảo hành',
            align: 'right',
            render: (item) => {
                const isExpiring = item.status === 'EXPIRING_SOON';
                const isExpired = item.status === 'EXPIRED';

                return (
                    <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-900">
                            {formatDate(item.startDate)} → {formatDate(item.endDate)}
                        </div>
                        <div
                            className={`text-[11px] ${
                                isExpired
                                    ? 'text-rose-600 font-medium'
                                    : isExpiring
                                    ? 'text-amber-700 font-medium'
                                    : 'text-slate-500'
                            }`}
                        >
                            {isExpired ? 'Đã hết hạn' : `Còn ${item.remainingDays} ngày`}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => renderWarrantyStatusIndicator(item.status),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(item)}
                    viewLabel="Xem chi tiết bảo hành"
                    actions={[
                        {
                            key: 'intake',
                            label: 'Tiếp nhận bảo hành',
                            description: 'Tạo phiếu tiếp nhận bảo hành cho Serial này',
                            icon: Wrench,
                            variant: 'warning',
                            onClick: () => handleOpenIntake(item),
                        },
                        {
                            key: 'extend',
                            label: 'Gia hạn bảo hành',
                            description: 'Cộng thêm số tháng bảo hành',
                            icon: Calendar,
                            variant: 'success',
                            onClick: () => handleOpenExtend(item),
                        },
                        {
                            key: 'history',
                            label: 'Tra cứu lịch sử bảo hành',
                            description: 'Xem toàn bộ dòng thời gian bảo hành',
                            icon: History,
                            variant: 'primary',
                            onClick: () =>
                                navigate(
                                    `/admin/warranty/history?serial=${encodeURIComponent(
                                        item.serialNumber
                                    )}`
                                ),
                        },
                        ...(item.active
                            ? [
                                  {
                                      key: 'void',
                                      label: 'Hủy hiệu lực bảo hành',
                                      description: 'Vô hiệu hóa thẻ bảo hành của Serial này',
                                      icon: XCircle,
                                      variant: 'danger' as const,
                                      onClick: () => handleOpenVoid(item),
                                  },
                              ]
                            : []),
                    ]}
                />
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái bảo hành',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Còn hạn bảo hành', value: 'ACTIVE' },
                { label: 'Sắp hết hạn (<= 30 ngày)', value: 'EXPIRING_SOON' },
                { label: 'Đã hết hạn', value: 'EXPIRED' },
            ],
        },
    ];

    const detailTabs: ModalTab[] = [
        { id: 'general', label: 'Thông tin bảo hành', icon: ShieldCheck },
        { id: 'device', label: 'Thiết bị & Khách hàng', icon: Barcode },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý bảo hành sản phẩm
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.total} serial · {stats.active} còn hạn · {stats.expiringSoon} sắp hết hạn
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />}
                        onClick={fetchWarranties}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất file
                    </AdminButton>
                    <AdminButton
                        variant="primary"
                        icon={<Wrench className="w-4 h-4" />}
                        onClick={() => navigate('/admin/warranty/requests')}
                    >
                        Phiếu yêu cầu bảo hành
                    </AdminButton>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto">
                {(
                    [
                        { id: 'ALL', label: 'Tất cả sản phẩm', count: stats.total },
                        { id: 'ACTIVE', label: 'Còn hạn', count: stats.active },
                        { id: 'EXPIRING_SOON', label: 'Sắp hết hạn', count: stats.expiringSoon },
                        { id: 'EXPIRED', label: 'Đã hết hạn', count: stats.expired },
                    ] as const
                ).map((tab) => {
                    const isActive = quickStatusTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setQuickStatusTab(tab.id);
                                setCurrentPage(1);
                            }}
                            className={`pb-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-blue-600 ${
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
                    searchPlaceholder="Tìm theo số serial, tên sản phẩm, khách hàng, mã đơn..."
                    searchQuery={searchQuery}
                    onSearchChange={handleSearch}
                    values={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleFilterReset}
                />

                <AdminTable
                    columns={columns}
                    data={warranties}
                    rowKey="id"
                    loading={loading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 15, 20, 50]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    showPagination={true}
                    showPageSizeSelector={true}
                    itemUnitName="sản phẩm"
                    emptyText="Không tìm thấy bản ghi bảo hành sản phẩm nào phù hợp"
                />
            </div>

            {/* Modal Detail */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Thông tin chi tiết bảo hành thiết bị"
                size="lg"
                tabs={detailTabs}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsDetailOpen(false)}>
                            Đóng
                        </AdminButton>
                        <AdminButton
                            variant="primary"
                            icon={<Wrench className="w-4 h-4" />}
                            onClick={() => {
                                setIsDetailOpen(false);
                                if (selectedWarranty) handleOpenIntake(selectedWarranty);
                            }}
                        >
                            Tiếp nhận máy này
                        </AdminButton>
                    </div>
                }
            >
                {selectedWarranty && (
                    <div className="space-y-4">
                        {detailTab === 'general' && (
                            <div className="space-y-4">
                                {/* Flat Serial summary strip */}
                                <div className="px-4 py-3 bg-slate-50 rounded-md border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="text-[11px] text-slate-500">Mã số Serial</div>
                                        <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                                            {selectedWarranty.serialNumber}
                                        </div>
                                    </div>
                                    {renderWarrantyStatusIndicator(selectedWarranty.status)}
                                </div>

                                {/* Flat 2-column grid (no card-in-card) */}
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-1">
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Ngày bắt đầu hiệu lực</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                                            {formatDate(selectedWarranty.startDate)}
                                        </dd>
                                    </div>
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Ngày hết hạn bảo hành</dt>
                                        <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                                            {formatDate(selectedWarranty.endDate)}
                                        </dd>
                                    </div>
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Gói chính sách áp dụng</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900">
                                            {selectedWarranty.policyName}
                                        </dd>
                                    </div>
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Thời hạn cam kết &amp; còn lại</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                                            {Math.round(selectedWarranty.durationDays / 30)} tháng ({selectedWarranty.durationDays} ngày) ·{' '}
                                            <span
                                                className={
                                                    selectedWarranty.status === 'EXPIRED'
                                                        ? 'text-rose-600 font-semibold'
                                                        : 'text-emerald-700 font-semibold'
                                                }
                                            >
                                                Còn {selectedWarranty.remainingDays} ngày
                                            </span>
                                        </dd>
                                    </div>
                                </dl>

                                {selectedWarranty.note && (
                                    <div className="px-3.5 py-2.5 bg-amber-50 rounded-md border border-amber-200 text-xs text-amber-900">
                                        <span className="font-semibold">Ghi chú:</span> {selectedWarranty.note}
                                    </div>
                                )}
                            </div>
                        )}

                        {detailTab === 'device' && (
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-1">
                                <div className="sm:col-span-2 border-b border-slate-100 pb-2">
                                    <dt className="text-slate-500">Tên thiết bị linh kiện</dt>
                                    <dd className="mt-0.5 font-semibold text-slate-900">
                                        {selectedWarranty.productName}
                                    </dd>
                                    <dd className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                                        Thương hiệu: {selectedWarranty.brandName || 'Chính hãng'} · Mã SP: {selectedWarranty.productCode || 'N/A'}
                                    </dd>
                                </div>

                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-slate-500">Khách hàng sở hữu</dt>
                                    <dd className="mt-0.5 font-medium text-slate-900">
                                        {selectedWarranty.customerName}
                                    </dd>
                                    <dd className="font-mono text-slate-500 tabular-nums mt-0.5">
                                        {selectedWarranty.customerPhone}
                                    </dd>
                                    {selectedWarranty.customerEmail && (
                                        <dd className="text-slate-500 mt-0.5">{selectedWarranty.customerEmail}</dd>
                                    )}
                                </div>

                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-slate-500">Đơn hàng xuất bán</dt>
                                    <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                                        {selectedWarranty.orderCode}
                                    </dd>
                                    <dd className="text-slate-500 mt-0.5 tabular-nums">
                                        Số lần đã tiếp nhận bảo hành:{' '}
                                        <strong className="text-slate-900">{selectedWarranty.requestsCount || 0} lần</strong>
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* Modal Extend Warranty */}
            <AdminModal
                isOpen={isExtendOpen}
                onClose={() => setIsExtendOpen(false)}
                title="Gia hạn thời gian bảo hành"
                size="md"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsExtendOpen(false)} disabled={isExtending}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleConfirmExtend} isLoading={isExtending}>
                            Xác nhận gia hạn
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-1">
                        <div>
                            <span className="text-slate-500">Thiết bị:</span>{' '}
                            <strong className="text-slate-900">{selectedWarranty?.productName}</strong>
                        </div>
                        <div>
                            <span className="text-slate-500">Serial:</span>{' '}
                            <strong className="font-mono text-slate-900 tabular-nums">{selectedWarranty?.serialNumber}</strong>
                        </div>
                    </div>

                    <div>
                        <AdminLabel required>Số ngày gia hạn thêm</AdminLabel>
                        <AdminSelect
                            value={String(extendDays)}
                            onChange={(e) => setExtendDays(Number(e.target.value))}
                            options={[
                                { label: 'Gia hạn thêm 30 ngày (1 tháng)', value: '30' },
                                { label: 'Gia hạn thêm 60 ngày (2 tháng)', value: '60' },
                                { label: 'Gia hạn thêm 90 ngày (3 tháng)', value: '90' },
                                { label: 'Gia hạn thêm 180 ngày (6 tháng)', value: '180' },
                                { label: 'Gia hạn thêm 365 ngày (1 năm)', value: '365' },
                            ]}
                        />
                    </div>

                    <div>
                        <AdminLabel>Lý do gia hạn</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Ghi rõ lý do ví dụ: Bù thời gian bảo hành chậm, khuyến mãi tri ân..."
                            value={extendReason}
                            onChange={(e) => setExtendReason(e.target.value)}
                        />
                    </div>
                </div>
            </AdminModal>

            {/* Modal Quick Intake Request */}
            <AdminModal
                isOpen={isIntakeOpen}
                onClose={() => setIsIntakeOpen(false)}
                title="Lập phiếu tiếp nhận máy bảo hành"
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsIntakeOpen(false)} disabled={isSubmittingIntake}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleConfirmIntake} isLoading={isSubmittingIntake}>
                            Tạo phiếu tiếp nhận
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <dl className="p-3.5 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <dt className="text-slate-500">Khách hàng</dt>
                            <dd className="font-medium text-slate-900 mt-0.5">
                                {selectedWarranty?.customerName}
                            </dd>
                            <dd className="font-mono text-slate-500 tabular-nums">
                                {selectedWarranty?.customerPhone}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Serial &amp; Gói bảo hành</dt>
                            <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                                {selectedWarranty?.serialNumber}
                            </dd>
                            <dd className="text-slate-600">{selectedWarranty?.policyName}</dd>
                        </div>
                    </dl>

                    <div>
                        <AdminLabel required>Mô tả hiện tượng lỗi khách hàng báo</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Ví dụ: Máy không lên nguồn, màn hình sọc xanh, quạt kêu to khi chơi game..."
                            value={intakeIssue}
                            onChange={(e) => setIntakeIssue(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel>Phụ kiện tiếp nhận kèm theo</AdminLabel>
                            <AdminInput
                                placeholder="Sạc, dây cáp, vỏ hộp, adapter..."
                                value={intakeAccessories}
                                onChange={(e) => setIntakeAccessories(e.target.value)}
                            />
                        </div>

                        <div>
                            <AdminLabel>Tình trạng ngoại quan khi nhận máy</AdminLabel>
                            <AdminInput
                                placeholder="Trầy nhẹ mặt lưng, tem bảo hành nguyên vẹn..."
                                value={intakeCondition}
                                onChange={(e) => setIntakeCondition(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </AdminModal>

            {/* Modal Confirm Void Warranty */}
            <AdminConfirmModal
                isOpen={isVoidOpen}
                onClose={() => setIsVoidOpen(false)}
                onConfirm={handleConfirmVoid}
                title="Xác nhận hủy hiệu lực bảo hành"
                message={`Bạn có chắc chắn muốn hủy hiệu lực (vô hiệu hóa) bảo hành cho thiết bị Serial "${selectedWarranty?.serialNumber}"?`}
                confirmText="Hủy hiệu lực"
                cancelText="Đóng"
                variant="danger"
                isLoading={isVoiding}
            />
        </div>
    );
}
