import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    History,
    Search,
    RefreshCw,
    Download,
    Barcode,
    Calendar,
    Clock,
    User,
    Phone,
    ShoppingCart,
    ShieldCheck,
    CheckCircle2,
    Wrench,
    Component,
    FileText,
    ArrowRight,
    AlertCircle,
    Printer,
    Sparkles,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, AdminActionDropdown, type Column } from '../../../components/admin/common/table';
import { AdminButton, AdminInput } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import type {
    WarrantyHistoryRecord,
    ProductWarrantyItem,
    WarrantyTimelineEvent,
} from '../../../types/adminWarranty';

export default function WarrantyHistoryList() {
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();

    // Query states
    const [serialQuery, setSerialQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [historyRecord, setHistoryRecord] = useState<WarrantyHistoryRecord | null>(null);

    // General History Table State
    const [allWarranties, setAllWarranties] = useState<ProductWarrantyItem[]>([]);
    const [loadingTable, setLoadingTable] = useState<boolean>(true);
    const [tableKeyword, setTableKeyword] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, string>>({
        status: '',
    });
    const [quickStatusTab, setQuickStatusTab] = useState<string>('ALL');
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Initial search from url query param
    useEffect(() => {
        const paramSerial = searchParams.get('serial');
        if (paramSerial) {
            setSerialQuery(paramSerial);
            lookupSerial(paramSerial);
        }
    }, [searchParams]);

    // Load table data
    const fetchTableData = useCallback(async () => {
        setLoadingTable(true);
        try {
            const res = await adminWarrantyService.getAllWarranties({
                keyword: tableKeyword || undefined,
                size: 100,
            });
            setAllWarranties(res.content || []);
        } catch {
            // ignore
        } finally {
            setLoadingTable(false);
        }
    }, [tableKeyword]);

    useEffect(() => {
        fetchTableData();
    }, [fetchTableData]);

    // Lookup Serial Timeline
    const lookupSerial = async (serial: string) => {
        const clean = serial.trim();
        if (!clean) return;

        setIsSearching(true);
        try {
            const res = await adminWarrantyService.getWarrantyHistoryBySerial(clean);
            if (res) {
                setHistoryRecord(res);
            } else {
                addToast({
                    type: 'warning',
                    title: 'Không tìm thấy',
                    message: `Không có thông tin bảo hành cho số serial "${clean}"`,
                });
                setHistoryRecord(null);
            }
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tra cứu',
                message: error.message || 'Không thể tra cứu lịch sử bảo hành',
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        lookupSerial(serialQuery);
    };

    // Format date
    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Chưa cập nhật';
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

    // Export CSV
    const handleExport = () => {
        if (allWarranties.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }

        const headers = ['Số Serial', 'Sản phẩm', 'Khách hàng', 'SĐT', 'Đơn hàng', 'Gói BH', 'Ngày kích hoạt', 'Ngày hết hạn', 'Số lần bảo hành'];
        const csvRows = allWarranties.map((w) => [
            `"${w.serialNumber}"`,
            `"${(w.productName || '').replace(/"/g, '""')}"`,
            `"${w.customerName || ''}"`,
            `"${w.customerPhone || ''}"`,
            `"${w.orderCode || ''}"`,
            `"${w.policyName || ''}"`,
            formatDate(w.startDate),
            formatDate(w.endDate),
            w.requestsCount || 0,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lich-su-bao-hanh-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã xuất file lịch sử bảo hành' });
    };

    // Restrained 6px status dot indicator
    const renderWarrantyStatusDot = (st?: string) => {
        if (st === 'ACTIVE') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Còn hạn</span>
                </span>
            );
        }
        if (st === 'EXPIRING_SOON') {
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

    // Columns
    const columns: Column<ProductWarrantyItem>[] = [
        {
            key: 'serialNumber',
            header: 'Serial & Chứng từ',
            render: (item) => (
                <div className="space-y-0.5 min-w-[155px]">
                    <button
                        type="button"
                        onClick={() => {
                            setSerialQuery(item.serialNumber);
                            lookupSerial(item.serialNumber);
                        }}
                        className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline tabular-nums whitespace-nowrap cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        {item.serialNumber}
                    </button>
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
            header: 'Sản phẩm',
            render: (item) => (
                <div className="max-w-[240px] space-y-0.5">
                    <div className="text-xs font-medium text-slate-900 truncate" title={item.productName}>
                        {item.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {item.productCode}
                    </div>
                </div>
            ),
        },
        {
            key: 'customerName',
            header: 'Khách hàng',
            render: (item) => (
                <div className="space-y-0.5 max-w-[175px]">
                    <div className="text-xs font-medium text-slate-900 truncate">{item.customerName}</div>
                    <div className="text-xs font-mono text-slate-500 tabular-nums">{item.customerPhone}</div>
                </div>
            ),
        },
        {
            key: 'policyName',
            header: 'Chính sách & Thời hạn',
            render: (item) => (
                <div className="max-w-[230px] space-y-0.5">
                    <div className="text-xs font-medium text-slate-800 truncate" title={item.policyName}>
                        {item.policyName}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => renderWarrantyStatusDot(String(item.status)),
        },
        {
            key: 'requestsCount',
            header: 'Số ca BH',
            align: 'right',
            render: (item) => {
                const count = item.requestsCount || 0;
                return (
                    <span
                        className={`font-mono text-xs tabular-nums whitespace-nowrap ${
                            count > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'
                        }`}
                    >
                        {count} lần
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
                    actions={[
                        {
                            key: 'view-timeline',
                            label: 'Xem dòng thời gian',
                            icon: Search,
                            variant: 'primary',
                            onClick: () => {
                                setSerialQuery(item.serialNumber);
                                lookupSerial(item.serialNumber);
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
            label: 'Trạng thái bảo hành',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Còn hạn bảo hành', value: 'ACTIVE' },
                { label: 'Đã hết hạn', value: 'EXPIRED' },
                { label: 'Đã bị từ chối / hủy', value: 'VOID' },
            ],
        },
    ];

    const quickTabs = useMemo(() => [
        { key: 'ALL', label: 'Tất cả thiết bị', count: allWarranties.length },
        { key: 'ACTIVE', label: 'Còn hạn', count: allWarranties.filter((w) => w.status === 'ACTIVE').length },
        { key: 'EXPIRED', label: 'Đã hết hạn', count: allWarranties.filter((w) => w.status === 'EXPIRED').length },
        { key: 'HAS_REQUESTS', label: 'Từng có bảo hành (> 0 lần)', count: allWarranties.filter((w) => (w.requestsCount || 0) > 0).length },
    ], [allWarranties]);

    const handleTabChange = (key: string) => {
        setQuickStatusTab(key);
        if (key === 'HAS_REQUESTS') {
            setFilters((prev) => ({ ...prev, status: '' }));
        } else {
            setFilters((prev) => ({
                ...prev,
                status: key === 'ALL' ? '' : key,
            }));
        }
        setPage(1);
    };

    // Filtered warranties
    const filteredWarranties = useMemo(() => {
        return allWarranties.filter((w) => {
            if (quickStatusTab === 'HAS_REQUESTS') {
                if ((w.requestsCount || 0) <= 0) return false;
            }
            if (filters.status) {
                if (String(w.status) !== filters.status) return false;
            }
            return true;
        });
    }, [allWarranties, quickStatusTab, filters.status]);

    const totalPages = Math.max(1, Math.ceil(filteredWarranties.length / pageSize));

    // Paginated
    const paginatedWarranties = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredWarranties.slice(start, start + pageSize);
    }, [filteredWarranties, page, pageSize]);

    const withHistoryCount = useMemo(
        () => allWarranties.filter((w) => (w.requestsCount || 0) > 0).length,
        [allWarranties]
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý lịch sử bảo hành
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {allWarranties.length} thiết bị · {withHistoryCount} thiết bị từng phát sinh bảo hành
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loadingTable ? 'animate-spin text-blue-600' : ''}`} />}
                        onClick={fetchTableData}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất file
                    </AdminButton>
                </div>
            </div>

            {/* Compact Serial Lookup Bar */}
            <div className="bg-white p-4 rounded-md border border-slate-200">
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row sm:items-center gap-2.5 max-w-2xl">
                    <div className="relative flex-1">
                        <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tra cứu nhanh vòng đời theo số Serial thiết bị..."
                            value={serialQuery}
                            onChange={(e) => setSerialQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono tabular-nums"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 font-medium text-sm rounded-md transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    >
                        <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                        <span>Tra cứu</span>
                    </button>
                </form>
            </div>

            {/* Timeline View if record loaded */}
            {historyRecord && (
                <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                    {/* Device Overview Strip (flat 2-col grid, no card-in-card) */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="font-mono text-xs font-semibold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 tabular-nums">
                                    {historyRecord.serialNumber}
                                </span>
                                {renderWarrantyStatusDot(historyRecord.status)}
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">{historyRecord.productName}</h3>
                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                                <span>
                                    Khách hàng: <strong className="text-slate-900">{historyRecord.customerName}</strong> ({historyRecord.customerPhone})
                                </span>
                                <span>
                                    Đơn hàng: <strong className="font-mono text-slate-900">{historyRecord.orderCode}</strong>
                                </span>
                                <span>
                                    Chính sách: <strong className="text-slate-900">{historyRecord.policyName}</strong>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 lg:border-l lg:pl-5 border-slate-200 shrink-0">
                            <div className="lg:text-right tabular-nums">
                                <div className="text-[11px] text-slate-500">Tổng số ca bảo hành</div>
                                <div className="text-lg font-mono font-semibold text-slate-900">
                                    {historyRecord.totalRequests} lần
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Hết hạn: {formatDate(historyRecord.warrantyEndDate)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHistoryRecord(null)}
                                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>

                    {/* Flat Timeline List (divide-y) */}
                    <div className="divide-y divide-slate-200">
                        <div className="px-4 py-2.5 bg-white text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Dòng thời gian sự kiện thiết bị ({historyRecord.timeline.length})
                        </div>
                        {historyRecord.timeline.map((event, idx) => (
                            <div key={event.id || idx} className="px-4 py-3.5 text-xs space-y-1 hover:bg-slate-50/70">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                idx === 0 ? 'bg-blue-600' : 'bg-slate-300'
                                            }`}
                                        />
                                        <span className="font-semibold text-slate-900">{event.title}</span>
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                                        {formatDateTime(event.timestamp)}
                                    </span>
                                </div>

                                <p className="text-slate-600 leading-relaxed pl-3.5 whitespace-pre-line">
                                    {event.description}
                                </p>

                                {event.actor && (
                                    <div className="pl-3.5 text-[11px] text-slate-500">
                                        Người thực hiện: <span className="font-medium text-slate-800">{event.actor}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

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

            {/* Filter & General History Table */}
            <div className="space-y-4">
                <AdminFilter
                    fields={filterFields}
                    searchPlaceholder="Lọc theo serial, tên máy, khách hàng..."
                    searchQuery={tableKeyword}
                    onSearchChange={(v) => {
                        setTableKeyword(v);
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
                        setTableKeyword('');
                        setFilters({ status: '' });
                        setQuickStatusTab('ALL');
                        setPage(1);
                    }}
                />

                <AdminTable
                    columns={columns}
                    data={paginatedWarranties}
                    rowKey="id"
                    loading={loadingTable}
                    totalItems={filteredWarranties.length}
                    currentPage={page}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    pageSizeOptions={[5, 10, 15, 20, 50]}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                    emptyText="Không có dữ liệu thiết bị"
                />
            </div>
        </div>
    );
}
