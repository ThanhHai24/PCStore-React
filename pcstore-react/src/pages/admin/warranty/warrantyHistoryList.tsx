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
import { AdminTable, type Column } from '../../../components/admin/common/table';
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

    // Columns
    const columns: Column<ProductWarrantyItem>[] = [
        {
            key: 'serialNumber',
            header: 'Số Serial',
            render: (item) => (
                <button
                    onClick={() => {
                        setSerialQuery(item.serialNumber);
                        lookupSerial(item.serialNumber);
                    }}
                    className="font-mono text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
                >
                    <Barcode className="w-3.5 h-3.5" />
                    <span>{item.serialNumber}</span>
                </button>
            ),
        },
        {
            key: 'productName',
            header: 'Sản phẩm',
            render: (item) => (
                <div className="max-w-xs">
                    <div className="font-medium text-slate-900 line-clamp-1">{item.productName}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{item.productCode}</div>
                </div>
            ),
        },
        {
            key: 'customerName',
            header: 'Khách hàng',
            render: (item) => (
                <div>
                    <div className="text-xs font-semibold text-slate-900">{item.customerName}</div>
                    <div className="text-[11px] text-slate-500">{item.customerPhone}</div>
                </div>
            ),
        },
        {
            key: 'policyName',
            header: 'Chính sách áp dụng',
            render: (item) => (
                <div className="text-xs">
                    <div className="font-medium text-slate-800 line-clamp-1">{item.policyName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                        Từ {formatDate(item.startDate)} đến {formatDate(item.endDate)}
                    </div>
                </div>
            ),
        },
        {
            key: 'requestsCount',
            header: 'Số ca đã tiếp nhận',
            align: 'center',
            render: (item) => (
                <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${item.requestsCount && item.requestsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    {item.requestsCount || 0} lần
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Tra cứu',
            align: 'right',
            render: (item) => (
                <AdminButton
                    variant="secondary"
                    size="sm"
                    icon={<Search className="w-3.5 h-3.5" />}
                    onClick={() => {
                        setSerialQuery(item.serialNumber);
                        lookupSerial(item.serialNumber);
                    }}
                >
                    Xem dòng thời gian
                </AdminButton>
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

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Lịch sử & Vòng đời bảo hành</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Tra cứu toàn bộ chuỗi sự kiện từ thời điểm xuất bán, các lần tiếp nhận lỗi, linh kiện thay thế đến nghiệm thu
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loadingTable ? 'animate-spin' : ''}`} />}
                        onClick={fetchTableData}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất file
                    </AdminButton>
                </div>
            </div>

            {/* Smart Search Bar */}
            <div className="bg-white p-6 rounded-md shadow-md text-black">
                <div className="max-w-2xl">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Barcode className="w-5 h-5 text-blue-600" />
                        Tra cứu lịch sử bảo hành thiết bị
                    </h2>

                    <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Nhập số Serial..."
                                value={serialQuery}
                                onChange={(e) => setSerialQuery(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 text-sm rounded-md bg-white/10 text-black placeholder-gray-300 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
                        >
                            <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                            Tra cứu
                        </button>
                    </form>
                </div>
            </div>

            {/* Timeline View if record loaded */}
            {historyRecord && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    {/* Device Overview Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                                    {historyRecord.serialNumber}
                                </span>
                                <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${historyRecord.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                        }`}
                                >
                                    {historyRecord.status === 'ACTIVE' ? 'CÒN HẠN BẢO HÀNH' : 'ĐÃ HẾT HẠN'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mt-2">{historyRecord.productName}</h3>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>Khách hàng: <strong className="text-slate-800">{historyRecord.customerName}</strong> ({historyRecord.customerPhone})</span>
                                <span>Đơn hàng: <strong className="text-slate-800">{historyRecord.orderCode}</strong></span>
                                <span>Chính sách: <strong className="text-indigo-600">{historyRecord.policyName}</strong></span>
                            </div>
                        </div>

                        <div className="text-right sm:border-l sm:pl-6 border-slate-200">
                            <div className="text-xs text-slate-500">Tổng số ca bảo hành</div>
                            <div className="text-2xl font-bold text-indigo-700 mt-0.5">
                                {historyRecord.totalRequests} lần
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                                Hết hạn: {formatDate(historyRecord.warrantyEndDate)}
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            Dòng thời gian sự kiện thiết bị
                        </h4>

                        <div className="relative border-l-2 border-indigo-100 ml-4 space-y-8 pl-6 py-2">
                            {historyRecord.timeline.map((event, idx) => (
                                <div key={event.id || idx} className="relative group">
                                    {/* Bullet point */}
                                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white bg-indigo-600 ring-4 ring-indigo-50 shadow-sm"></div>

                                    <div className="bg-slate-50 hover:bg-slate-100/80 p-4 rounded-xl border border-slate-200 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                                            <span className="font-bold text-slate-900 text-sm">{event.title}</span>
                                            <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
                                                {formatDateTime(event.timestamp)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                            {event.description}
                                        </p>

                                        {event.actor && (
                                            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                                                <span>Người thực hiện / ghi nhận:</span>
                                                <span className="font-semibold text-slate-800">{event.actor}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* General History Table */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Danh mục thiết bị & Thống kê số lần bảo hành</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Chọn bất kỳ số Serial nào bên dưới để mở dòng thời gian sự kiện chi tiết
                        </p>
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
