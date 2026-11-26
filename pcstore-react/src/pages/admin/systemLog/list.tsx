import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FileText,
    Activity,
    AlertTriangle,
    RefreshCw,
    Download,
    Trash2,
    Copy,
    Layers,
    ChevronRight,
    ChevronLeft,
    Plus,
    BarChart3,
    Check,
    Code2,
    Calendar,
    SlidersHorizontal,
    RotateCcw,
    X,
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from 'recharts';
import { SearchBar } from '../../../components/admin/common/searchbar';
import { SelectDropdown } from '../../../components/admin/common/selectDropdown';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminSelect,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { systemLogService } from '../../../services/systemLogService';
import type {
    SystemLogItem,
    SystemLogLevel,
    SystemLogModule,
    SystemLogAction,
    SystemLogStats,
} from '../../../types/systemLog';

// Helper format date: DD/MM/YYYY HH:mm:ss
function formatLogDateTime(isoString: string): string {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return isoString;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
        return isoString;
    }
}

// Color palette for optional analytics charts (restrained, no violet/lavender)
const MODULE_COLORS: Record<string, string> = {
    AUTH: '#2563eb',
    USER: '#3b82f6',
    PRODUCT: '#0284c7',
    CATEGORY: '#0d9488',
    BRAND: '#0891b2',
    ORDER: '#d97706',
    WAREHOUSE: '#059669',
    PURCHASE_ORDER: '#65a30d',
    WARRANTY: '#0369a1',
    PAYMENT: '#475569',
    REVIEW: '#e11d48',
    SYSTEM: '#64748b',
};

const MODULE_LABELS: Record<SystemLogModule, string> = {
    AUTH: 'Xác thực',
    USER: 'Tài khoản',
    PRODUCT: 'Sản phẩm',
    CATEGORY: 'Danh mục',
    BRAND: 'Thương hiệu',
    ORDER: 'Đơn hàng',
    WAREHOUSE: 'Kho & Serial',
    PURCHASE_ORDER: 'Nhập hàng',
    WARRANTY: 'Bảo hành',
    PAYMENT: 'Thanh toán',
    REVIEW: 'Đánh giá',
    SYSTEM: 'Hệ thống',
};

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    STAFF_SALES: 'NV Bán hàng',
    STAFF_WAREHOUSE: 'Thủ kho',
    STAFF_TECH: 'Kỹ thuật viên',
    SYSTEM: 'Hệ thống',
    GUEST: 'Khách',
};

export default function SystemLogList() {
    const { addToast } = useToast();

    // Data states
    const [logs, setLogs] = useState<SystemLogItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [, setStats] = useState<SystemLogStats>({
        total: 0,
        todayCount: 0,
        successCount: 0,
        warningCount: 0,
        errorCount: 0,
        criticalCount: 0,
        uniqueUsersCount: 0,
    });

    // Filtering states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [quickTab, setQuickTab] = useState<string>('ALL');
    const [filterValues, setFilterValues] = useState<Record<string, string>>({
        level: '',
        module: '',
        action: '',
        statusCode: '',
        role: '',
        dateRange: '',
        startDate: '',
        endDate: '',
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Selected rows
    const [selectedLogIds, setSelectedLogIds] = useState<(string | number)[]>([]);

    // Detail Modal State
    const [detailLog, setDetailLog] = useState<SystemLogItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

    // Purge Modal State
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
    const [purgeOlderThanDays, setPurgeOlderThanDays] = useState<string>('30');
    const [purgeLevel, setPurgeLevel] = useState<string>('ALL');

    // Create Test Log Modal
    const [isAddTestModalOpen, setIsAddTestModalOpen] = useState<boolean>(false);
    const [testLogData, setTestLogData] = useState<{
        module: SystemLogModule;
        level: SystemLogLevel;
        action: SystemLogAction;
        actionTitle: string;
        description: string;
        targetEntity: string;
        targetId: string;
        statusCode: number;
        httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    }>({
        module: 'SYSTEM',
        level: 'INFO',
        action: 'UPDATE',
        actionTitle: 'Kiểm tra nhật ký thử nghiệm',
        description: 'Quản trị viên phát hành sự kiện nhật ký thử nghiệm từ trang quản trị.',
        targetEntity: 'Hệ thống',
        targetId: 'TEST-LOG-01',
        statusCode: 200,
        httpMethod: 'POST',
    });

    // Delete confirmation modals
    const [logToDelete, setLogToDelete] = useState<SystemLogItem | null>(null);
    const [isDeleteSingleModalOpen, setIsDeleteSingleModalOpen] = useState<boolean>(false);
    const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);

    // Analytics visual section toggle
    const [showAnalytics, setShowAnalytics] = useState<boolean>(false);

    // Auto-refresh interval (0 = disabled, 10 = 10s, 30 = 30s, 60 = 60s)
    const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(0);
    const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load logs from service
    const loadLogs = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [rawLogs] = await Promise.all([
                systemLogService.getLogs({
                    keyword: searchQuery,
                    level: filterValues.level || undefined,
                    module: filterValues.module || undefined,
                    action: filterValues.action || undefined,
                    statusCode: filterValues.statusCode || undefined,
                    role: filterValues.role || undefined,
                    dateRange: filterValues.dateRange || undefined,
                    startDate: filterValues.startDate || undefined,
                    endDate: filterValues.endDate || undefined,
                }),
                systemLogService.getSummary(),
            ]);

            // Quick tab secondary client filter
            let filtered = rawLogs;
            if (quickTab === 'AUTH_USER') {
                filtered = rawLogs.filter((l) => l.module === 'AUTH' || l.module === 'USER');
            } else if (quickTab === 'CATALOG') {
                filtered = rawLogs.filter((l) => l.module === 'PRODUCT' || l.module === 'CATEGORY' || l.module === 'BRAND');
            } else if (quickTab === 'ORDER_PAYMENT') {
                filtered = rawLogs.filter((l) => l.module === 'ORDER' || l.module === 'PAYMENT');
            } else if (quickTab === 'WAREHOUSE') {
                filtered = rawLogs.filter((l) => l.module === 'WAREHOUSE' || l.module === 'PURCHASE_ORDER');
            } else if (quickTab === 'WARRANTY') {
                filtered = rawLogs.filter((l) => l.module === 'WARRANTY');
            } else if (quickTab === 'WARNING_ERROR') {
                filtered = rawLogs.filter((l) => l.level === 'WARNING' || l.level === 'ERROR' || l.level === 'CRITICAL');
            }

            setLogs(filtered);
            setStats(systemLogService.getStats());
        } catch {
            addToast({
                type: 'error',
                title: 'Lỗi nạp dữ liệu',
                message: 'Không thể tải danh sách nhật ký hệ thống.',
            });
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [searchQuery, filterValues, quickTab, addToast]);

    // Initial load and on filters change
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Handle auto refresh timer
    useEffect(() => {
        if (autoRefreshTimerRef.current) {
            clearInterval(autoRefreshTimerRef.current);
            autoRefreshTimerRef.current = null;
        }

        if (autoRefreshSecs > 0) {
            autoRefreshTimerRef.current = setInterval(() => {
                loadLogs(true);
            }, autoRefreshSecs * 1000);
        }

        return () => {
            if (autoRefreshTimerRef.current) {
                clearInterval(autoRefreshTimerRef.current);
            }
        };
    }, [autoRefreshSecs, loadLogs]);

    // Pagination calculations
    const totalItems = logs.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(Math.max(1, totalPages));
        }
    }, [currentPage, totalPages]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return logs.slice(start, start + pageSize);
    }, [logs, currentPage, pageSize]);

    // Current detail index for sequential modal navigation
    const currentDetailIndex = useMemo(() => {
        if (!detailLog) return -1;
        return logs.findIndex((l) => l.id === detailLog.id);
    }, [detailLog, logs]);

    const handlePrevLog = () => {
        if (currentDetailIndex > 0) {
            setDetailLog(logs[currentDetailIndex - 1]);
        }
    };

    const handleNextLog = () => {
        if (currentDetailIndex >= 0 && currentDetailIndex < logs.length - 1) {
            setDetailLog(logs[currentDetailIndex + 1]);
        }
    };

    // Open detail modal & fetch fresh detail from BE GET /api/admin/system-logs/{id}
    const handleOpenDetail = (log: SystemLogItem) => {
        setDetailLog(log);
        setIsDetailModalOpen(true);
        systemLogService.getLogById(log.id).then((fresh) => {
            if (fresh) setDetailLog(fresh);
        });
    };

    // Copy to clipboard
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast({
            type: 'info',
            title: 'Đã sao chép',
            message: `Đã sao chép ${label} vào bộ nhớ tạm.`,
        });
    };

    // Single log delete
    const handleRequestDeleteSingle = (log: SystemLogItem) => {
        setLogToDelete(log);
        setIsDeleteSingleModalOpen(true);
    };

    const handleConfirmDeleteSingle = () => {
        if (!logToDelete) return;
        systemLogService.deleteLog(logToDelete.id);
        if (detailLog?.id === logToDelete.id) {
            setIsDetailModalOpen(false);
            setDetailLog(null);
        }
        setIsDeleteSingleModalOpen(false);
        setLogToDelete(null);
        loadLogs();
        addToast({
            type: 'success',
            title: 'Đã xóa bản ghi',
            message: `Đã xóa nhật ký "${logToDelete.id}" khỏi hệ thống.`,
        });
    };

    // Batch delete
    const handleConfirmBatchDelete = () => {
        if (selectedLogIds.length === 0) return;
        const count = systemLogService.deleteLogs(selectedLogIds);
        setSelectedLogIds([]);
        setIsBatchDeleteModalOpen(false);
        loadLogs();
        addToast({
            type: 'success',
            title: 'Xóa hàng loạt thành công',
            message: `Đã xóa ${count} bản ghi nhật ký được chọn.`,
        });
    };

    // Purge logs
    const handleConfirmPurge = () => {
        const olderDays = purgeOlderThanDays ? parseInt(purgeOlderThanDays, 10) : undefined;
        const deletedCount = systemLogService.purgeLogs({
            olderThanDays: olderDays,
            level: purgeLevel === 'ALL' ? undefined : purgeLevel,
        });

        setIsPurgeModalOpen(false);
        loadLogs();
        addToast({
            type: 'success',
            title: 'Dọn dẹp thành công',
            message: `Đã dọn dẹp ${deletedCount} bản ghi nhật ký.`,
        });
    };

    // Add test log entry
    const handleCreateTestLog = (e: React.FormEvent) => {
        e.preventDefault();
        const created = systemLogService.addLog({
            actor: {
                id: '1',
                username: 'admin',
                fullName: 'Nguyễn Thành An',
                role: 'ADMIN',
                email: 'admin@pcstore.vn',
            },
            action: testLogData.action,
            actionTitle: testLogData.actionTitle,
            module: testLogData.module,
            level: testLogData.level,
            description: testLogData.description,
            targetEntity: testLogData.targetEntity,
            targetId: testLogData.targetId,
            ipAddress: '113.161.42.18',
            userAgent: 'Chrome 131.0 / Windows 11',
            endpoint: '/api/admin/system/test-log',
            httpMethod: testLogData.httpMethod,
            statusCode: testLogData.statusCode,
            executionTimeMs: Math.floor(Math.random() * 80) + 20,
        });

        setIsAddTestModalOpen(false);
        loadLogs();
        addToast({
            type: 'success',
            title: 'Ghi nhật ký thành công',
            message: `Đã thêm sự kiện "${created.id}" vào nhật ký hệ thống.`,
        });
    };

    // Export CSV
    const handleExportCsv = () => {
        const toExport = selectedLogIds.length > 0
            ? logs.filter((l) => selectedLogIds.includes(l.id))
            : logs;
        systemLogService.exportToCsv(toExport);
        addToast({
            type: 'success',
            title: 'Xuất file CSV',
            message: `Đã xuất ${toExport.length} dòng nhật ký ra định dạng CSV.`,
        });
    };

    // Export JSON
    const handleExportJson = () => {
        const toExport = selectedLogIds.length > 0
            ? logs.filter((l) => selectedLogIds.includes(l.id))
            : logs;
        systemLogService.exportToJson(toExport);
        addToast({
            type: 'success',
            title: 'Xuất file JSON',
            message: `Đã xuất ${toExport.length} dòng nhật ký ra định dạng JSON.`,
        });
    };

    // Filter helpers
    const updateFilter = (key: string, value: string) => {
        setFilterValues((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterValues({
            level: '',
            module: '',
            action: '',
            statusCode: '',
            role: '',
            dateRange: '',
            startDate: '',
            endDate: '',
        });
        setQuickTab('ALL');
        setCurrentPage(1);
    };

    const activeAdvancedCount = [
        filterValues.statusCode,
        filterValues.role,
        filterValues.startDate,
        filterValues.endDate,
    ].filter(Boolean).length;

    const hasAnyFilter =
        Boolean(searchQuery.trim()) ||
        Object.values(filterValues).some((v) => Boolean(v)) ||
        quickTab !== 'ALL';

    // Restrained Status Indicator (small dot + neutral text, no colorful pills)
    const renderStatusIndicator = (level: SystemLogLevel) => {
        let dotClass = 'bg-slate-400';
        let label = 'Thông tin';

        switch (level) {
            case 'SUCCESS':
                dotClass = 'bg-emerald-500';
                label = 'Thành công';
                break;
            case 'INFO':
                dotClass = 'bg-blue-500';
                label = 'Thông tin';
                break;
            case 'WARNING':
                dotClass = 'bg-amber-500';
                label = 'Cảnh báo';
                break;
            case 'ERROR':
                dotClass = 'bg-rose-500';
                label = 'Thất bại';
                break;
            case 'CRITICAL':
                dotClass = 'bg-red-700';
                label = 'Nghiêm trọng';
                break;
        }

        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                <span>{label}</span>
            </span>
        );
    };

    // Restrained Action Badge (1px border, rounded-md, subtle tone)
    const renderActionBadge = (action: SystemLogAction) => {
        let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';

        switch (action) {
            case 'CREATE':
                badgeStyle = 'bg-blue-50/70 text-blue-700 border-blue-200';
                break;
            case 'UPDATE':
            case 'STATUS_CHANGE':
                badgeStyle = 'bg-amber-50/70 text-amber-800 border-amber-200';
                break;
            case 'DELETE':
            case 'PURGE':
                badgeStyle = 'bg-rose-50/70 text-rose-700 border-rose-200';
                break;
            case 'LOGIN':
            case 'BACKUP':
                badgeStyle = 'bg-emerald-50/70 text-emerald-700 border-emerald-200';
                break;
            default:
                badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';
                break;
        }

        return (
            <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border tracking-wide whitespace-nowrap ${badgeStyle}`}
            >
                {action}
            </span>
        );
    };

    const renderHttpCode = (code?: number) => {
        if (!code) return null;
        let textColor = 'text-slate-600';
        if (code >= 200 && code < 300) textColor = 'text-emerald-700';
        else if (code >= 400 && code < 500) textColor = 'text-amber-700';
        else if (code >= 500) textColor = 'text-rose-700';

        return (
            <span className={`font-mono text-[11px] font-semibold tabular-nums ${textColor}`}>
                {code}
            </span>
        );
    };

    // Table columns definition (high-density, no horizontal overflow at 1440px)
    const tableColumns: Column<SystemLogItem>[] = [
        {
            key: 'timestamp',
            header: 'Thời gian',
            sortable: true,
            sortValue: (item) => new Date(item.timestamp).getTime(),
            headerClassName: 'w-[175px]',
            render: (log) => (
                <div className="space-y-0.5">
                    <div className="text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatLogDateTime(log.timestamp)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        <span className="truncate max-w-[130px]" title={log.id}>
                            {log.id}
                        </span>
                        {log.executionTimeMs !== undefined && (
                            <>
                                <span className="text-slate-300">·</span>
                                <span title="Thời gian phản hồi">{log.executionTimeMs}ms</span>
                            </>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'actor',
            header: 'Người thực hiện',
            headerClassName: 'w-[195px]',
            render: (log) => (
                <div className="min-w-0 max-w-[185px] space-y-0.5">
                    <p className="text-xs font-semibold text-slate-900 truncate" title={log.actor.fullName}>
                        {log.actor.fullName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                        <span className="shrink-0">
                            {ROLE_LABELS[log.actor.role] || log.actor.role}
                        </span>
                        <span className="text-slate-300 shrink-0">·</span>
                        <span className="font-mono tabular-nums truncate" title={log.ipAddress}>
                            {log.ipAddress}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'action_target',
            header: 'Hành động & Đối tượng',
            headerClassName: 'w-[205px]',
            render: (log) => (
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {renderActionBadge(log.action)}
                        <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                            {MODULE_LABELS[log.module] || log.module}
                        </span>
                    </div>
                    {log.targetId ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
                            {log.targetEntity && (
                                <span className="truncate max-w-[85px]">{log.targetEntity}:</span>
                            )}
                            <span
                                className="font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md tabular-nums truncate max-w-[115px]"
                                title={log.targetId}
                            >
                                {log.targetId}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                    )}
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Mô tả chi tiết',
            className: 'max-w-[290px]',
            render: (log) => (
                <div className="max-w-[280px] space-y-0.5">
                    <p className="text-xs font-medium text-slate-900 truncate" title={log.actionTitle}>
                        {log.actionTitle}
                    </p>
                    <p
                        className="text-xs text-slate-600 line-clamp-2 break-words leading-snug"
                        title={log.description}
                    >
                        {log.description}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            headerClassName: 'w-[125px]',
            render: (log) => (
                <div className="space-y-0.5">
                    <div>{renderStatusIndicator(log.level)}</div>
                    {(log.httpMethod || log.statusCode) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            {log.httpMethod && (
                                <span className="font-mono font-medium text-slate-500">
                                    {log.httpMethod}
                                </span>
                            )}
                            {renderHttpCode(log.statusCode)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            headerClassName: 'w-[90px]',
            render: (log) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(log)}
                    viewLabel="Xem chi tiết nhật ký"
                    moreActions={[
                        {
                            key: 'copy-id',
                            label: 'Sao chép mã log',
                            icon: Copy,
                            onClick: () => handleCopy(log.id, 'Mã log'),
                        },
                        {
                            key: 'copy-json',
                            label: 'Sao chép JSON',
                            icon: Code2,
                            onClick: () => handleCopy(JSON.stringify(log, null, 2), 'Dữ liệu JSON log'),
                        },
                        {
                            key: 'delete-log',
                            label: 'Xóa bản ghi này',
                            icon: Trash2,
                            variant: 'danger',
                            onClick: () => handleRequestDeleteSingle(log),
                        },
                    ]}
                />
            ),
        },
    ];

    // Detail Modal Tabs Configuration
    const modalTabs: ModalTab[] = [
        { id: 'overview', label: 'Tổng quan', icon: Activity },
        { id: 'changes', label: `Dữ liệu thay đổi (${detailLog?.changes?.length || 0})`, icon: Layers },
        { id: 'payload', label: 'Payload JSON', icon: Code2 },
        ...(detailLog?.errorMessage ? [{ id: 'error', label: 'Lỗi & Trace', icon: AlertTriangle }] : []),
    ];

    // Analytics chart data calculations
    const chartAnalytics = useMemo(() => {
        const moduleMap: Record<string, number> = {};
        const levelMap: Record<string, number> = {
            SUCCESS: 0,
            INFO: 0,
            WARNING: 0,
            ERROR: 0,
            CRITICAL: 0,
        };

        const timelineMap: Record<string, { time: string; total: number; success: number; error: number }> = {};

        for (const item of logs) {
            moduleMap[item.module] = (moduleMap[item.module] || 0) + 1;
            if (levelMap[item.level] !== undefined) {
                levelMap[item.level]++;
            }

            const d = new Date(item.timestamp);
            const key = d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
            if (!timelineMap[key]) {
                timelineMap[key] = { time: key, total: 0, success: 0, error: 0 };
            }
            timelineMap[key].total++;
            if (item.level === 'SUCCESS' || item.level === 'INFO') {
                timelineMap[key].success++;
            } else if (item.level === 'ERROR' || item.level === 'CRITICAL' || item.level === 'WARNING') {
                timelineMap[key].error++;
            }
        }

        const pieData = Object.entries(moduleMap).map(([name, value]) => ({
            name,
            value,
            color: MODULE_COLORS[name] || '#2563eb',
        }));

        const timelineData = Object.values(timelineMap).slice(-7);

        return { pieData, timelineData, levelMap };
    }, [logs]);

    return (
        <div className="w-full space-y-4 min-w-0 font-sans">
            {/* Compact Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Nhật ký hệ thống
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Giám sát và kiểm toán thao tác người dùng, thay đổi dữ liệu và sự kiện bảo mật trên hệ thống.
                    </p>
                </div>

                {/* Header Action Buttons (border-first, rounded-md) */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Auto-refresh selector */}
                    <div className="inline-flex items-center bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 gap-1.5">
                        <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                autoRefreshSecs > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                        />
                        <label htmlFor="auto-refresh-select" className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                            Tự động:
                        </label>
                        <select
                            id="auto-refresh-select"
                            value={autoRefreshSecs}
                            onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
                            className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded cursor-pointer tabular-nums"
                        >
                            <option value={0}>Tắt</option>
                            <option value={10}>10s</option>
                            <option value={30}>30s</option>
                            <option value={60}>60s</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => loadLogs()}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs rounded-md border border-slate-200 transition-colors disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    {/* Analytics Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs rounded-md border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                            showAnalytics
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 border-slate-200'
                        }`}
                        title="Xem biểu đồ phân tích"
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Biểu đồ</span>
                    </button>

                    {/* Export CSV / JSON */}
                    <div className="inline-flex items-center bg-white border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/40"
                            title="Xuất file CSV"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportJson}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/40"
                            title="Xuất file JSON"
                        >
                            <Code2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>JSON</span>
                        </button>
                    </div>

                    {/* Purge Logs Button */}
                    <button
                        type="button"
                        onClick={() => setIsPurgeModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-700 font-medium text-xs rounded-md border border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                        title="Dọn dẹp nhật ký cũ"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Dọn dẹp</span>
                    </button>

                    {/* Test Log Simulator Button */}
                    <button
                        type="button"
                        onClick={() => setIsAddTestModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md border border-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ghi log thử</span>
                    </button>
                </div>
            </div>

            {/* Collapsible Visual Analytics Widget */}
            {showAnalytics && (
                <div className="bg-white p-4 rounded-md border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                            <h2 className="font-semibold text-sm text-slate-900">
                                Phân tích phân bổ & xu hướng nhật ký
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Thống kê sự kiện theo phân hệ nghiệp vụ và tỷ lệ thành công / lỗi.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAnalytics(false)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                            aria-label="Đóng biểu đồ"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50/70 rounded-md border border-slate-200 space-y-2">
                            <h3 className="text-xs font-semibold text-slate-800">
                                Phân bổ theo phân hệ
                            </h3>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartAnalytics.pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={48}
                                            outerRadius={76}
                                            paddingAngle={2}
                                        >
                                            {chartAnalytics.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${value} sự kiện`, 'Số lượng']}
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '6px',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={32}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '11px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50/70 rounded-md border border-slate-200 space-y-2">
                            <h3 className="text-xs font-semibold text-slate-800">
                                Xu hướng gần đây (Thành công vs Cảnh báo/Lỗi)
                            </h3>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartAnalytics.timelineData}>
                                        <defs>
                                            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '6px',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="success"
                                            name="Thành công / Info"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorSuccess)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="error"
                                            name="Cảnh báo / Lỗi"
                                            stroke="#f43f5e"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorError)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Single-Row Unified Filter Toolbar */}
            <div className="bg-white p-3 rounded-md border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
                    {/* Search Input */}
                    <SearchBar
                        value={searchQuery}
                        onChange={(q) => {
                            setSearchQuery(q);
                            setCurrentPage(1);
                        }}
                        placeholder="Tìm tài khoản, email, mã đối tượng, địa chỉ IP, mô tả..."
                        size="sm"
                        className="w-full xl:flex-1 min-w-[220px]"
                    />

                    {/* Module Filter */}
                    <div className="w-[calc(50%-4px)] sm:w-40 shrink-0">
                        <SelectDropdown
                            variant="filter"
                            size="sm"
                            ariaLabel="Lọc theo phân hệ"
                            value={filterValues.module || ''}
                            onValueChange={(val) => updateFilter('module', val)}
                            placeholder="Tất cả phân hệ"
                            options={[
                                { label: 'Tất cả phân hệ', value: '' },
                                { label: 'Sản phẩm', value: 'PRODUCT' },
                                { label: 'Đơn hàng', value: 'ORDER' },
                                { label: 'Kho & Serial', value: 'WAREHOUSE' },
                                { label: 'Bảo hành', value: 'WARRANTY' },
                                { label: 'Tài khoản', value: 'USER' },
                                { label: 'Xác thực', value: 'AUTH' },
                                { label: 'Thanh toán', value: 'PAYMENT' },
                                { label: 'Danh mục', value: 'CATEGORY' },
                                { label: 'Thương hiệu', value: 'BRAND' },
                                { label: 'Đánh giá', value: 'REVIEW' },
                                { label: 'Hệ thống', value: 'SYSTEM' },
                            ]}
                        />
                    </div>

                    {/* Action Filter */}
                    <div className="w-[calc(50%-4px)] sm:w-40 shrink-0">
                        <SelectDropdown
                            variant="filter"
                            size="sm"
                            ariaLabel="Lọc theo hành động"
                            value={filterValues.action || ''}
                            onValueChange={(val) => updateFilter('action', val)}
                            placeholder="Tất cả hành động"
                            options={[
                                { label: 'Tất cả hành động', value: '' },
                                { label: 'Tạo mới (CREATE)', value: 'CREATE' },
                                { label: 'Cập nhật (UPDATE)', value: 'UPDATE' },
                                { label: 'Xóa (DELETE)', value: 'DELETE' },
                                { label: 'Đăng nhập (LOGIN)', value: 'LOGIN' },
                                { label: 'Đăng xuất (LOGOUT)', value: 'LOGOUT' },
                                { label: 'Duyệt / Đổi trạng thái', value: 'STATUS_CHANGE' },
                                { label: 'Phân quyền', value: 'PERMISSION_CHANGE' },
                                { label: 'Thanh toán', value: 'PAYMENT_PROCESS' },
                                { label: 'Xuất dữ liệu', value: 'EXPORT' },
                                { label: 'Đồng bộ', value: 'SYNC' },
                            ]}
                        />
                    </div>

                    {/* Status / Level Filter */}
                    <div className="w-[calc(50%-4px)] sm:w-[158px] shrink-0">
                        <SelectDropdown
                            variant="filter"
                            size="sm"
                            ariaLabel="Lọc theo trạng thái"
                            value={filterValues.level || ''}
                            onValueChange={(val) => updateFilter('level', val)}
                            placeholder="Trạng thái"
                            options={[
                                { label: 'Tất cả trạng thái', value: '' },
                                { label: 'Thành công', value: 'SUCCESS', dotColor: 'bg-emerald-500' },
                                { label: 'Thất bại', value: 'ERROR', dotColor: 'bg-rose-500' },
                                { label: 'Cảnh báo', value: 'WARNING', dotColor: 'bg-amber-500' },
                                { label: 'Thông tin', value: 'INFO', dotColor: 'bg-blue-500' },
                                { label: 'Nghiêm trọng', value: 'CRITICAL', dotColor: 'bg-red-700' },
                            ]}
                        />
                    </div>

                    {/* Date Range Filter */}
                    <div className="w-[calc(50%-4px)] sm:w-36 shrink-0">
                        <SelectDropdown
                            variant="filter"
                            size="sm"
                            ariaLabel="Lọc theo thời gian"
                            value={filterValues.dateRange || ''}
                            onValueChange={(val) => updateFilter('dateRange', val)}
                            placeholder="Thời gian"
                            options={[
                                { label: 'Tất cả thời gian', value: '' },
                                { label: 'Hôm nay', value: 'today' },
                                { label: '3 ngày gần nhất', value: '3days' },
                                { label: '7 ngày gần nhất', value: '7days' },
                                { label: '30 ngày gần nhất', value: '30days' },
                            ]}
                        />
                    </div>

                    {/* Advanced Filters Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowAdvancedFilters((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                            showAdvancedFilters || activeAdvancedCount > 0
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        title="Bộ lọc nâng cao (Mã HTTP, Vai trò, Khoảng ngày tùy chọn)"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Nâng cao</span>
                        {activeAdvancedCount > 0 && (
                            <span className="min-w-4 h-4 px-1 rounded-md bg-blue-600 text-white text-[10px] inline-flex items-center justify-center font-semibold tabular-nums">
                                {activeAdvancedCount}
                            </span>
                        )}
                    </button>

                    {/* Reset Filters Button */}
                    {hasAnyFilter && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center justify-center p-1.5 text-rose-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                            title="Đặt lại bộ lọc"
                            aria-label="Đặt lại bộ lọc"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Optional Advanced Filters Row (HTTP Status, Role, Custom Date Range) */}
                {showAdvancedFilters && (
                    <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-600">
                                Mã phản hồi HTTP
                            </label>
                            <SelectDropdown
                                variant="filter"
                                size="sm"
                                value={filterValues.statusCode || ''}
                                onValueChange={(val) => updateFilter('statusCode', val)}
                                placeholder="Tất cả mã HTTP"
                                options={[
                                    { label: 'Tất cả mã HTTP', value: '' },
                                    { label: '2xx - Thành công', value: '2xx', dotColor: 'bg-emerald-500' },
                                    { label: '4xx - Lỗi Client', value: '4xx', dotColor: 'bg-amber-500' },
                                    { label: '5xx - Lỗi Server', value: '5xx', dotColor: 'bg-rose-500' },
                                    { label: '200 OK', value: '200' },
                                    { label: '201 Created', value: '201' },
                                    { label: '401 Unauthorized', value: '401' },
                                    { label: '403 Forbidden', value: '403' },
                                    { label: '404 Not Found', value: '404' },
                                    { label: '500 Server Error', value: '500' },
                                ]}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-600">
                                Vai trò tài khoản
                            </label>
                            <SelectDropdown
                                variant="filter"
                                size="sm"
                                value={filterValues.role || ''}
                                onValueChange={(val) => updateFilter('role', val)}
                                placeholder="Tất cả vai trò"
                                options={[
                                    { label: 'Tất cả vai trò', value: '' },
                                    { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                                    { label: 'Quản lý (MANAGER)', value: 'MANAGER' },
                                    { label: 'NV Bán hàng (STAFF_SALES)', value: 'STAFF_SALES' },
                                    { label: 'Thủ kho (STAFF_WAREHOUSE)', value: 'STAFF_WAREHOUSE' },
                                    { label: 'Kỹ thuật viên (STAFF_TECH)', value: 'STAFF_TECH' },
                                    { label: 'Hệ thống (SYSTEM)', value: 'SYSTEM' },
                                    { label: 'Khách (GUEST)', value: 'GUEST' },
                                ]}
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="log-start-date" className="block text-[11px] font-medium text-slate-600">
                                Từ ngày
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input
                                    id="log-start-date"
                                    type="date"
                                    value={filterValues.startDate || ''}
                                    onChange={(e) => updateFilter('startDate', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-md py-1.5 pl-8 pr-2.5 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="log-end-date" className="block text-[11px] font-medium text-slate-600">
                                Đến ngày
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input
                                    id="log-end-date"
                                    type="date"
                                    value={filterValues.endDate || ''}
                                    onChange={(e) => updateFilter('endDate', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-md py-1.5 pl-8 pr-2.5 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Batch Selection Banner */}
            {selectedLogIds.length > 0 && (
                <div className="px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800">
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                            Đang chọn <strong className="font-semibold tabular-nums">{selectedLogIds.length}</strong> bản ghi nhật ký.
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-200 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                        >
                            Xuất CSV đã chọn
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsBatchDeleteModalOpen(true)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md border border-rose-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                        >
                            Xóa mục đã chọn
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLogIds([])}
                            className="px-2 py-1 text-slate-600 hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded-md"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {/* High-Density Data Table */}
            <AdminTable
                columns={tableColumns}
                data={paginatedLogs}
                rowKey="id"
                loading={loading}
                selectable
                selectedKeys={selectedLogIds}
                onSelectionChange={setSelectedLogIds}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 25, 50]}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                onRowClick={(log) => handleOpenDetail(log)}
                itemUnitName="bản ghi"
                emptyText={
                    loading
                        ? 'Đang nạp nhật ký hệ thống...'
                        : 'Không tìm thấy bản ghi nhật ký nào thỏa mãn điều kiện lọc.'
                }
            />

            {/* MODAL 1: CHI TIẾT NHẬT KÝ (FLAT 2-COL METADATA + CLEAN JSON/DIFF) */}
            <AdminModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Chi tiết nhật ký: ${detailLog?.id || ''}`}
                subtitle={`Ghi nhận lúc ${detailLog ? formatLogDateTime(detailLog.timestamp) : '—'}`}
                icon={FileText}
                size="xl"
                tabs={modalTabs}
                cancelText="Đóng"
            >
                {(activeTab) => {
                    if (!detailLog) return null;

                    return (
                        <div className="space-y-4">
                            {/* Sequential Navigation & Quick Actions Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handlePrevLog}
                                        disabled={currentDetailIndex <= 0}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                        title="Xem log liền trước"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Log trước</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextLog}
                                        disabled={currentDetailIndex >= logs.length - 1}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                        title="Xem log kế tiếp"
                                    >
                                        <span>Log sau</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-slate-500 text-[11px] ml-1 tabular-nums">
                                        Vị trí: <strong className="font-semibold text-slate-800">{currentDetailIndex + 1}</strong> / {logs.length}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(JSON.stringify(detailLog, null, 2), 'JSON nhật ký')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                        title="Sao chép toàn bộ dữ liệu log dạng JSON"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Sao chép JSON</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRequestDeleteSingle(detailLog)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-600 border border-slate-200 rounded-md font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                                        title="Xóa bản ghi này"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Xóa log</span>
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: TỔNG QUAN (FLAT 2-COLUMN METADATA GRID, NO NESTED CARDS) */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    {/* Action Summary Header */}
                                    <div className="pb-4 border-b border-slate-200 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {renderActionBadge(detailLog.action)}
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {MODULE_LABELS[detailLog.module] || detailLog.module}
                                            </span>
                                            <span className="text-slate-300">·</span>
                                            {renderStatusIndicator(detailLog.level)}
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            {detailLog.actionTitle}
                                        </h3>
                                        <p className="text-xs text-slate-600 leading-relaxed break-words">
                                            {detailLog.description}
                                        </p>
                                    </div>

                                    {/* Flat 2-Column Metadata Grid */}
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Mã log</dt>
                                            <dd className="font-mono font-semibold text-slate-900 tabular-nums break-all">
                                                {detailLog.id}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Thời gian thực hiện</dt>
                                            <dd className="font-medium text-slate-900 tabular-nums">
                                                {formatLogDateTime(detailLog.timestamp)}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Người thao tác</dt>
                                            <dd className="text-slate-900 font-medium break-words">
                                                <span>{detailLog.actor.fullName}</span>
                                                <span className="text-slate-500 font-normal ml-1.5">
                                                    (@{detailLog.actor.username} · {ROLE_LABELS[detailLog.actor.role] || detailLog.actor.role})
                                                </span>
                                                {detailLog.actor.email && (
                                                    <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                                                        {detailLog.actor.email}
                                                    </span>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Địa chỉ IP</dt>
                                            <dd className="font-mono font-medium text-slate-900 tabular-nums break-all">
                                                {detailLog.ipAddress || '—'}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Phân hệ (Module)</dt>
                                            <dd className="font-medium text-slate-900">
                                                {MODULE_LABELS[detailLog.module] || detailLog.module}{' '}
                                                <span className="font-mono text-[11px] text-slate-500">({detailLog.module})</span>
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Đối tượng & ID</dt>
                                            <dd className="text-slate-900 font-medium flex items-center gap-1.5 flex-wrap">
                                                <span>{detailLog.targetEntity || 'Toàn hệ thống'}</span>
                                                {detailLog.targetId && (
                                                    <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md tabular-nums break-all">
                                                        {detailLog.targetId}
                                                    </span>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Trạng thái & Phản hồi</dt>
                                            <dd className="flex items-center gap-2 flex-wrap">
                                                {renderStatusIndicator(detailLog.level)}
                                                {detailLog.statusCode && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        <span className="text-slate-500">HTTP</span>
                                                        {renderHttpCode(detailLog.statusCode)}
                                                    </>
                                                )}
                                                {detailLog.executionTimeMs !== undefined && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        <span className="font-mono text-slate-600 tabular-nums">
                                                            {detailLog.executionTimeMs} ms
                                                        </span>
                                                    </>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pb-2.5 border-b border-slate-100 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">Trình duyệt / User-Agent</dt>
                                            <dd className="text-slate-700 font-mono text-[11px] break-words leading-relaxed">
                                                {detailLog.userAgent || '—'}
                                            </dd>
                                        </div>

                                        <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                                            <dt className="text-[11px] font-medium text-slate-500">API Endpoint</dt>
                                            <dd className="flex items-center gap-2 min-w-0">
                                                {detailLog.httpMethod && (
                                                    <span className="px-2 py-0.5 font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md text-[11px] shrink-0">
                                                        {detailLog.httpMethod}
                                                    </span>
                                                )}
                                                <code className="font-mono text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 flex-1 min-w-0 break-all">
                                                    {detailLog.endpoint || 'Không ghi nhận endpoint trực tiếp'}
                                                </code>
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            )}

                            {/* TAB 2: DỮ LIỆU THAY ĐỔI (DIFF) */}
                            {activeTab === 'changes' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-500">
                                        Chi tiết các trường dữ liệu được chỉnh sửa trước và sau khi thao tác diễn ra:
                                    </p>
                                    {detailLog.changes && detailLog.changes.length > 0 ? (
                                        <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3.5 py-2.5 whitespace-nowrap">Trường dữ liệu</th>
                                                        <th className="px-3.5 py-2.5 whitespace-nowrap">Giá trị trước</th>
                                                        <th className="px-3.5 py-2.5 whitespace-nowrap">Giá trị sau</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200/80">
                                                    {detailLog.changes.map((ch, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="px-3.5 py-2.5 font-medium text-slate-800 align-top">
                                                                <div>{ch.fieldName}</div>
                                                                <span className="font-mono text-[11px] text-slate-400">
                                                                    {ch.field}
                                                                </span>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 align-top">
                                                                <span className="inline-block px-2 py-1 rounded-md bg-rose-50/70 text-rose-800 font-mono tabular-nums text-[11px] border border-rose-200 break-all">
                                                                    {String(ch.oldValue ?? 'Trống')}
                                                                </span>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 align-top">
                                                                <span className="inline-block px-2 py-1 rounded-md bg-emerald-50/70 text-emerald-800 font-mono tabular-nums text-[11px] border border-emerald-200 break-all font-medium">
                                                                    {String(ch.newValue ?? 'Trống')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center bg-slate-50 rounded-md border border-slate-200">
                                            <p className="text-xs text-slate-500">
                                                Thao tác này không ghi nhận thay đổi từng trường dữ liệu (Before / After).
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: REQUEST & RESPONSE PAYLOAD (LIGHT NEUTRAL MONOSPACE BOXES) */}
                            {activeTab === 'payload' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-800">
                                                Request Payload
                                            </span>
                                            {Boolean(detailLog.requestPayload) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(JSON.stringify(detailLog.requestPayload, null, 2), 'Request Payload')}
                                                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded"
                                                >
                                                    <Copy className="w-3 h-3" /> Sao chép
                                                </button>
                                            )}
                                        </div>
                                        <pre className="p-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-md text-xs font-mono tabular-nums overflow-auto max-h-60 leading-relaxed">
                                            {detailLog.requestPayload !== undefined && detailLog.requestPayload !== null
                                                ? JSON.stringify(detailLog.requestPayload, null, 2)
                                                : '// Không có dữ liệu Request Body'}
                                        </pre>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-800">
                                                Response Payload
                                            </span>
                                            {Boolean(detailLog.responsePayload) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(JSON.stringify(detailLog.responsePayload, null, 2), 'Response Payload')}
                                                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded"
                                                >
                                                    <Copy className="w-3 h-3" /> Sao chép
                                                </button>
                                            )}
                                        </div>
                                        <pre className="p-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-md text-xs font-mono tabular-nums overflow-auto max-h-60 leading-relaxed">
                                            {detailLog.responsePayload !== undefined && detailLog.responsePayload !== null
                                                ? JSON.stringify(detailLog.responsePayload, null, 2)
                                                : '// Không có dữ liệu Response Body'}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: THÔNG TIN LỖI & STACK TRACE */}
                            {activeTab === 'error' && detailLog.errorMessage && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-md text-xs text-rose-900 space-y-1">
                                        <div className="font-semibold flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                            <span>Thông báo ngoại lệ (Exception Message)</span>
                                        </div>
                                        <p className="font-mono text-rose-800 break-words">{detailLog.errorMessage}</p>
                                    </div>

                                    {detailLog.stackTrace && (
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-semibold text-slate-800">
                                                Chi tiết vết ngăn xếp (Stack Trace)
                                            </span>
                                            <pre className="p-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-md text-xs font-mono tabular-nums overflow-auto max-h-64 leading-relaxed">
                                                {detailLog.stackTrace}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* MODAL 2: DỌN DẸP NHẬT KÝ (PURGE MODAL) */}
            <AdminModal
                isOpen={isPurgeModalOpen}
                onClose={() => setIsPurgeModalOpen(false)}
                title="Dọn dẹp nhật ký hệ thống"
                subtitle="Xóa bớt các nhật ký cũ hoặc không cần thiết để tối ưu dung lượng lưu trữ"
                icon={Trash2}
                size="md"
                onSubmit={handleConfirmPurge}
                submitText="Xác nhận dọn dẹp"
                submitIcon={Trash2}
            >
                {() => (
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md flex items-start gap-2.5 text-xs text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Lưu ý an toàn kiểm toán</p>
                                <p className="mt-0.5 text-amber-800">
                                    Các nhật ký bị xóa sẽ không thể phục hồi. Vui lòng xuất file sao lưu CSV/JSON trước khi thực hiện dọn dẹp diện rộng.
                                </p>
                            </div>
                        </div>

                        <AdminSelect
                            label="Khoảng thời gian lưu trữ"
                            value={purgeOlderThanDays}
                            onChange={(e) => setPurgeOlderThanDays(e.target.value)}
                            options={[
                                { label: 'Xóa nhật ký cũ hơn 7 ngày', value: '7' },
                                { label: 'Xóa nhật ký cũ hơn 30 ngày (Khuyến nghị)', value: '30' },
                                { label: 'Xóa nhật ký cũ hơn 60 ngày', value: '60' },
                                { label: 'Xóa nhật ký cũ hơn 90 ngày', value: '90' },
                            ]}
                        />

                        <AdminSelect
                            label="Mức độ nhật ký cần dọn"
                            value={purgeLevel}
                            onChange={(e) => setPurgeLevel(e.target.value)}
                            options={[
                                { label: 'Dọn tất cả mức độ thỏa mãn thời gian', value: 'ALL' },
                                { label: 'Chỉ xóa các log Thông tin (INFO)', value: 'INFO' },
                                { label: 'Chỉ xóa các log Thành công (SUCCESS)', value: 'SUCCESS' },
                            ]}
                        />
                    </div>
                )}
            </AdminModal>

            {/* MODAL 3: TẠO NHẬT KÝ THỬ NGHIỆM (TEST LOG GENERATOR) */}
            <AdminModal
                isOpen={isAddTestModalOpen}
                onClose={() => setIsAddTestModalOpen(false)}
                title="Ghi nhật ký thử nghiệm"
                subtitle="Mô phỏng phát sinh một sự kiện hệ thống mới để kiểm tra luồng giám sát"
                icon={Plus}
                size="md"
                onSubmit={handleCreateTestLog}
                submitText="Tạo sự kiện log"
            >
                {() => (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AdminSelect
                                label="Phân hệ"
                                required
                                value={testLogData.module}
                                onChange={(e) => setTestLogData({ ...testLogData, module: e.target.value as SystemLogModule })}
                                options={[
                                    { label: 'Hệ thống (SYSTEM)', value: 'SYSTEM' },
                                    { label: 'Xác thực (AUTH)', value: 'AUTH' },
                                    { label: 'Sản phẩm (PRODUCT)', value: 'PRODUCT' },
                                    { label: 'Đơn hàng (ORDER)', value: 'ORDER' },
                                    { label: 'Kho & Serial (WAREHOUSE)', value: 'WAREHOUSE' },
                                    { label: 'Bảo hành (WARRANTY)', value: 'WARRANTY' },
                                    { label: 'Thanh toán (PAYMENT)', value: 'PAYMENT' },
                                ]}
                            />
                            <AdminSelect
                                label="Mức độ nghiêm trọng"
                                required
                                value={testLogData.level}
                                onChange={(e) => setTestLogData({ ...testLogData, level: e.target.value as SystemLogLevel })}
                                options={[
                                    { label: 'INFO (Thông tin)', value: 'INFO' },
                                    { label: 'SUCCESS (Thành công)', value: 'SUCCESS' },
                                    { label: 'WARNING (Cảnh báo)', value: 'WARNING' },
                                    { label: 'ERROR (Thất bại)', value: 'ERROR' },
                                    { label: 'CRITICAL (Nghiêm trọng)', value: 'CRITICAL' },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AdminSelect
                                label="Hành động"
                                required
                                value={testLogData.action}
                                onChange={(e) => setTestLogData({ ...testLogData, action: e.target.value as SystemLogAction })}
                                options={[
                                    { label: 'CREATE (Thêm mới)', value: 'CREATE' },
                                    { label: 'UPDATE (Cập nhật)', value: 'UPDATE' },
                                    { label: 'DELETE (Xóa bỏ)', value: 'DELETE' },
                                    { label: 'STATUS_CHANGE (Đổi trạng thái)', value: 'STATUS_CHANGE' },
                                    { label: 'LOGIN (Đăng nhập)', value: 'LOGIN' },
                                    { label: 'PAYMENT_PROCESS (Thanh toán)', value: 'PAYMENT_PROCESS' },
                                ]}
                            />
                            <AdminSelect
                                label="Phương thức HTTP"
                                value={testLogData.httpMethod}
                                onChange={(e) => setTestLogData({ ...testLogData, httpMethod: e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' })}
                                options={[
                                    { label: 'POST', value: 'POST' },
                                    { label: 'PUT', value: 'PUT' },
                                    { label: 'PATCH', value: 'PATCH' },
                                    { label: 'DELETE', value: 'DELETE' },
                                    { label: 'GET', value: 'GET' },
                                ]}
                            />
                        </div>

                        <AdminInput
                            label="Tiêu đề thao tác"
                            required
                            value={testLogData.actionTitle}
                            onChange={(e) => setTestLogData({ ...testLogData, actionTitle: e.target.value })}
                        />

                        <AdminInput
                            label="Mô tả chi tiết hoạt động"
                            required
                            value={testLogData.description}
                            onChange={(e) => setTestLogData({ ...testLogData, description: e.target.value })}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AdminInput
                                label="Loại đối tượng"
                                value={testLogData.targetEntity}
                                onChange={(e) => setTestLogData({ ...testLogData, targetEntity: e.target.value })}
                            />
                            <AdminInput
                                label="Mã ID đối tượng"
                                value={testLogData.targetId}
                                onChange={(e) => setTestLogData({ ...testLogData, targetId: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* MODAL 4: XÁC NHẬN XÓA 1 DÒNG LOG */}
            <AdminConfirmModal
                isOpen={isDeleteSingleModalOpen}
                onClose={() => setIsDeleteSingleModalOpen(false)}
                onConfirm={handleConfirmDeleteSingle}
                title="Xác nhận xóa nhật ký"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa bản ghi nhật ký <strong className="font-mono tabular-nums">{logToDelete?.id}</strong>? Thao tác này không thể hoàn tác.
                    </span>
                }
                variant="danger"
                confirmText="Xóa bản ghi"
                cancelText="Hủy bỏ"
            />

            {/* MODAL 5: XÁC NHẬN XÓA NHIỀU DÒNG LOG */}
            <AdminConfirmModal
                isOpen={isBatchDeleteModalOpen}
                onClose={() => setIsBatchDeleteModalOpen(false)}
                onConfirm={handleConfirmBatchDelete}
                title="Xác nhận xóa hàng loạt"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa <strong className="tabular-nums">{selectedLogIds.length}</strong> bản ghi nhật ký đã chọn? Thao tác này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống kiểm toán.
                    </span>
                }
                variant="danger"
                confirmText={`Xóa ${selectedLogIds.length} bản ghi`}
                cancelText="Hủy bỏ"
            />
        </div>
    );
}
