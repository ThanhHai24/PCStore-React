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
    const handleOpenDetail = (w: ProductWarrantyItem) => {
        setSelectedWarranty(w);
        setDetailTab('general');
        setIsDetailOpen(true);
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

    // Table Columns
    const columns: Column<ProductWarrantyItem>[] = [
        {
            key: 'serialNumber',
            header: 'Số Serial',
            render: (item) => (
                <div>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900">
                        <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{item.serialNumber}</span>
                        <button
                            onClick={() => handleCopy(item.serialNumber)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
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
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>Đơn:</span>
                            <span className="font-mono text-indigo-600">{item.orderCode}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'productName',
            header: 'Sản phẩm & Thương hiệu',
            render: (item) => (
                <div className="max-w-sm">
                    <div className="font-medium text-slate-900 line-clamp-1">{item.productName}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {item.brandName && (
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                                {item.brandName}
                            </span>
                        )}
                        <span className="text-[11px] text-slate-400">Mã: {item.productCode || 'N/A'}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'customerName',
            header: 'Khách hàng',
            render: (item) => (
                <div>
                    <div className="text-xs font-semibold text-slate-900">{item.customerName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.customerPhone}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'policyName',
            header: 'Gói bảo hành',
            render: (item) => (
                <div className="max-w-[200px]">
                    <div className="text-xs font-medium text-slate-800 line-clamp-1">{item.policyName}</div>
                    <div className="text-[11px] text-indigo-600 mt-0.5 font-medium">
                        {item.durationDays} ngày ({Math.round(item.durationDays / 30)} tháng)
                    </div>
                </div>
            ),
        },
        {
            key: 'remainingDays',
            header: 'Thời hạn còn lại',
            render: (item) => {
                const total = item.durationDays || 365;
                const percent = Math.min(100, Math.max(0, Math.round((item.remainingDays / total) * 100)));
                const isExpiring = item.status === 'EXPIRING_SOON';
                const isExpired = item.status === 'EXPIRED';

                return (
                    <div className="w-36">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span
                                className={`font-semibold ${isExpired
                                        ? 'text-rose-600'
                                        : isExpiring
                                            ? 'text-amber-600'
                                            : 'text-emerald-700'
                                    }`}
                            >
                                {isExpired ? 'Hết hạn' : `${item.remainingDays} ngày`}
                            </span>
                            <span className="text-[10px] text-slate-400">Đến {formatDate(item.endDate)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${isExpired
                                        ? 'bg-rose-500 w-full'
                                        : isExpiring
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                    }`}
                                style={{ width: isExpired ? '100%' : `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => {
                if (item.status === 'ACTIVE') {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Còn hạn
                        </span>
                    );
                }
                if (item.status === 'EXPIRING_SOON') {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Sắp hết hạn
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Đã hết hạn
                    </span>
                );
            },
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
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Quản lý bảo hành sản phẩm</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Tra cứu danh sách linh kiện và số Serial đã được cấp thẻ bảo hành chính hãng
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng serial bảo hành</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Barcode className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang còn hạn</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sắp hết hạn (&le; 30 ngày)</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.expiringSoon}</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã hết hạn</p>
                        <p className="text-2xl font-bold text-rose-600 mt-1">{stats.expired}</p>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <XCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <button
                    onClick={() => {
                        setQuickStatusTab('ALL');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${quickStatusTab === 'ALL'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    Tất cả sản phẩm ({stats.total})
                </button>
                <button
                    onClick={() => {
                        setQuickStatusTab('ACTIVE');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${quickStatusTab === 'ACTIVE'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Còn hạn ({stats.active})
                </button>
                <button
                    onClick={() => {
                        setQuickStatusTab('EXPIRING_SOON');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${quickStatusTab === 'EXPIRING_SOON'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sắp hết hạn ({stats.expiringSoon})
                </button>
                <button
                    onClick={() => {
                        setQuickStatusTab('EXPIRED');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${quickStatusTab === 'EXPIRED'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    <XCircle className="w-3.5 h-3.5" />
                    Đã hết hạn ({stats.expired})
                </button>
            </div>

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                searchPlaceholder="Tìm theo số serial, tên sản phẩm, khách hàng, mã đơn..."
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                values={filters}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
            />

            {/* Table with Pagination */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">Mã Số Serial</div>
                                        <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                                            {selectedWarranty.serialNumber}
                                        </div>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold ${selectedWarranty.status === 'ACTIVE'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : selectedWarranty.status === 'EXPIRING_SOON'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}
                                    >
                                        {selectedWarranty.status === 'ACTIVE'
                                            ? 'CÒN HẠN BẢO HÀNH'
                                            : selectedWarranty.status === 'EXPIRING_SOON'
                                                ? 'SẮP HẾT HẠN'
                                                : 'ĐÃ HẾT HẠN'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500">Ngày bắt đầu hiệu lực</div>
                                        <div className="text-sm font-semibold text-slate-900 mt-1">
                                            {formatDate(selectedWarranty.startDate)}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500">Ngày hết hạn bảo hành</div>
                                        <div className="text-sm font-semibold text-rose-600 mt-1">
                                            {formatDate(selectedWarranty.endDate)}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Gói chính sách bảo hành áp dụng</div>
                                    <div className="text-sm font-bold text-indigo-700 mt-1">
                                        {selectedWarranty.policyName}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Thời hạn cam kết: {selectedWarranty.durationDays} ngày (~
                                        {Math.round(selectedWarranty.durationDays / 30)} tháng) - Còn lại:{' '}
                                        <span className="font-semibold text-emerald-600">
                                            {selectedWarranty.remainingDays} ngày
                                        </span>
                                    </div>
                                </div>

                                {selectedWarranty.note && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                                        <span className="font-semibold">Ghi chú:</span> {selectedWarranty.note}
                                    </div>
                                )}
                            </div>
                        )}

                        {detailTab === 'device' && (
                            <div className="space-y-3">
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Tên thiết bị linh kiện</div>
                                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                                        {selectedWarranty.productName}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Thương hiệu: {selectedWarranty.brandName || 'Chính hãng'} | Mã:{' '}
                                        {selectedWarranty.productCode || 'N/A'}
                                    </div>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Thông tin khách hàng sở hữu</div>
                                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                                        {selectedWarranty.customerName}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
                                        <span>Số điện thoại: {selectedWarranty.customerPhone}</span>
                                        <span>Email: {selectedWarranty.customerEmail || 'Chưa cập nhật'}</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Đơn hàng xuất bán</div>
                                    <div className="text-sm font-mono font-bold text-indigo-600 mt-0.5">
                                        {selectedWarranty.orderCode}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Số lần đã tiếp nhận bảo hành:{' '}
                                        <span className="font-semibold text-slate-900">
                                            {selectedWarranty.requestsCount || 0} lần
                                        </span>
                                    </div>
                                </div>
                            </div>
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
                    <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-900">
                        Thiết bị: <span className="font-bold">{selectedWarranty?.productName}</span>
                        <br />
                        Serial: <span className="font-mono font-bold">{selectedWarranty?.serialNumber}</span>
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
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-slate-500">Khách hàng:</span>{' '}
                            <span className="font-bold text-slate-800">{selectedWarranty?.customerName}</span>
                            <br />
                            <span className="text-slate-500">SĐT:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedWarranty?.customerPhone}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Serial lỗi:</span>{' '}
                            <span className="font-mono font-bold text-indigo-600">{selectedWarranty?.serialNumber}</span>
                            <br />
                            <span className="text-slate-500">Gói BH:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedWarranty?.policyName}</span>
                        </div>
                    </div>

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
        </div>
    );
}
