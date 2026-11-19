import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FileText,
    Activity,
    Shield,
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Download,
    Trash2,
    Copy,
    Globe,
    Laptop,
    Server,
    Database,
    Zap,
    User,
    Key,
    Layers,
    Package,
    ShoppingCart,
    Wrench,
    CreditCard,
    MessageSquare,
    ChevronRight,
    ChevronLeft,
    Plus,
    BarChart3,
    Check,
    Code2,
    Sparkles,
    Calendar,
    Filter,
    SlidersHorizontal,
    Share2,
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from 'recharts';
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

// Helper format date
function formatLogDateTime(isoString: string): string {
    if (!isoString) return 'Chưa cập nhật';
    try {
        const d = new Date(isoString);
        return d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return isoString;
    }
}

// Relative time calculation
function getRelativeTimeString(isoString: string): string {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

        if (diffSeconds < 60) return 'Vừa xong';
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
        if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} ngày trước`;
        return d.toLocaleDateString('vi-VN');
    } catch {
        return '';
    }
}

// Color palette for charts
const MODULE_COLORS: Record<string, string> = {
    AUTH: '#8b5cf6',
    USER: '#6366f1',
    PRODUCT: '#0ea5e9',
    CATEGORY: '#14b8a6',
    BRAND: '#06b6d4',
    ORDER: '#f59e0b',
    WAREHOUSE: '#10b981',
    PURCHASE_ORDER: '#84cc16',
    WARRANTY: '#3b82f6',
    PAYMENT: '#a855f7',
    REVIEW: '#ec4899',
    SYSTEM: '#64748b',
};

export default function SystemLogList() {
    const { addToast } = useToast();

    // Data states
    const [logs, setLogs] = useState<SystemLogItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState<SystemLogStats>({
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
            const rawLogs = await systemLogService.getLogs({
                keyword: searchQuery,
                level: filterValues.level || undefined,
                module: filterValues.module || undefined,
                action: filterValues.action || undefined,
                statusCode: filterValues.statusCode || undefined,
                role: filterValues.role || undefined,
                dateRange: filterValues.dateRange || undefined,
                startDate: filterValues.startDate || undefined,
                endDate: filterValues.endDate || undefined,
            });

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

    // Open detail modal
    const handleOpenDetail = (log: SystemLogItem) => {
        setDetailLog(log);
        setIsDetailModalOpen(true);
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

    // Reset default logs
    const handleResetDefaults = () => {
        systemLogService.resetToDefaults();
        setIsPurgeModalOpen(false);
        loadLogs();
        addToast({
            type: 'info',
            title: 'Đã khôi phục',
            message: 'Đã thiết lập lại dữ liệu mẫu nhật ký hệ thống ban đầu.',
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
                avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thành+An&background=2563eb&color=fff&bold=true',
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

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'level',
            label: 'Mức độ',
            type: 'select',
            options: [
                { label: 'Tất cả mức độ', value: '' },
                { label: 'Thành công (SUCCESS)', value: 'SUCCESS', dotColor: 'bg-emerald-500' },
                { label: 'Thông tin (INFO)', value: 'INFO', dotColor: 'bg-blue-500' },
                { label: 'Cảnh báo (WARNING)', value: 'WARNING', dotColor: 'bg-amber-500' },
                { label: 'Lỗi (ERROR)', value: 'ERROR', dotColor: 'bg-rose-500' },
                { label: 'Nghiêm trọng (CRITICAL)', value: 'CRITICAL', dotColor: 'bg-red-700' },
            ],
        },
        {
            name: 'module',
            label: 'Phân hệ',
            type: 'select',
            options: [
                { label: 'Tất cả phân hệ', value: '' },
                { label: 'Xác thực & Bảo mật (AUTH)', value: 'AUTH' },
                { label: 'Tài khoản người dùng (USER)', value: 'USER' },
                { label: 'Sản phẩm (PRODUCT)', value: 'PRODUCT' },
                { label: 'Danh mục (CATEGORY)', value: 'CATEGORY' },
                { label: 'Thương hiệu (BRAND)', value: 'BRAND' },
                { label: 'Đơn hàng (ORDER)', value: 'ORDER' },
                { label: 'Kho vận (WAREHOUSE)', value: 'WAREHOUSE' },
                { label: 'Bảo hành (WARRANTY)', value: 'WARRANTY' },
                { label: 'Thanh toán (PAYMENT)', value: 'PAYMENT' },
                { label: 'Đánh giá & Bình luận (REVIEW)', value: 'REVIEW' },
                { label: 'Hệ thống (SYSTEM)', value: 'SYSTEM' },
            ],
        },
        {
            name: 'action',
            label: 'Loại thao tác',
            type: 'select',
            options: [
                { label: 'Tất cả thao tác', value: '' },
                { label: 'Đăng nhập (LOGIN)', value: 'LOGIN' },
                { label: 'Đăng xuất (LOGOUT)', value: 'LOGOUT' },
                { label: 'Thêm mới (CREATE)', value: 'CREATE' },
                { label: 'Cập nhật (UPDATE)', value: 'UPDATE' },
                { label: 'Xóa bỏ (DELETE)', value: 'DELETE' },
                { label: 'Đổi trạng thái (STATUS_CHANGE)', value: 'STATUS_CHANGE' },
                { label: 'Phân quyền (PERMISSION_CHANGE)', value: 'PERMISSION_CHANGE' },
                { label: 'Xuất dữ liệu (EXPORT)', value: 'EXPORT' },
                { label: 'Sao lưu CSDL (BACKUP)', value: 'BACKUP' },
                { label: 'Giao dịch thanh toán (PAYMENT_PROCESS)', value: 'PAYMENT_PROCESS' },
                { label: 'Đồng bộ hóa (SYNC)', value: 'SYNC' },
            ],
        },
        {
            name: 'statusCode',
            label: 'Mã phản hồi HTTP',
            type: 'select',
            options: [
                { label: 'Tất cả mã HTTP', value: '' },
                { label: '2xx - Thành công (200, 201)', value: '2xx', dotColor: 'bg-emerald-500' },
                { label: '4xx - Lỗi Client (400, 401, 403, 404)', value: '4xx', dotColor: 'bg-amber-500' },
                { label: '5xx - Lỗi Server (500, 504)', value: '5xx', dotColor: 'bg-rose-500' },
                { label: '200 OK', value: '200' },
                { label: '201 Created', value: '201' },
                { label: '401 Unauthorized', value: '401' },
                { label: '403 Forbidden', value: '403' },
                { label: '404 Not Found', value: '404' },
                { label: '500 Server Error', value: '500' },
                { label: '504 Gateway Timeout', value: '504' },
            ],
        },
        {
            name: 'role',
            label: 'Vai trò tài khoản',
            type: 'select',
            options: [
                { label: 'Tất cả vai trò', value: '' },
                { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                { label: 'Quản lý (MANAGER)', value: 'MANAGER' },
                { label: 'Nhân viên bán hàng (STAFF_SALES)', value: 'STAFF_SALES' },
                { label: 'Nhân viên kho (STAFF_WAREHOUSE)', value: 'STAFF_WAREHOUSE' },
                { label: 'Kỹ thuật viên (STAFF_TECH)', value: 'STAFF_TECH' },
                { label: 'Dịch vụ Hệ thống (SYSTEM)', value: 'SYSTEM' },
                { label: 'Khách / Ẩn danh (GUEST)', value: 'GUEST' },
            ],
        },
        {
            name: 'dateRange',
            label: 'Khoảng thời gian nhanh',
            type: 'select',
            options: [
                { label: 'Tất cả thời gian', value: '' },
                { label: 'Hôm nay', value: 'today' },
                { label: '3 ngày gần nhất', value: '3days' },
                { label: '7 ngày gần nhất', value: '7days' },
                { label: '30 ngày gần nhất', value: '30days' },
            ],
        },
        {
            name: 'startDate',
            label: 'Từ ngày',
            type: 'date',
        },
        {
            name: 'endDate',
            label: 'Đến ngày',
            type: 'date',
        },
    ];

    // Badge Renderers
    const renderLevelBadge = (level: SystemLogLevel) => {
        switch (level) {
            case 'SUCCESS':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        SUCCESS
                    </span>
                );
            case 'INFO':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        INFO
                    </span>
                );
            case 'WARNING':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        WARNING
                    </span>
                );
            case 'ERROR':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ERROR
                    </span>
                );
            case 'CRITICAL':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-300 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                        CRITICAL
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                        {level}
                    </span>
                );
        }
    };

    const renderModuleBadge = (mod: SystemLogModule) => {
        const config: Record<SystemLogModule, { label: string; color: string; icon: React.ElementType }> = {
            AUTH: { label: 'XÁC THỰC', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Key },
            USER: { label: 'TÀI KHOẢN', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: User },
            PRODUCT: { label: 'SẢN PHẨM', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Package },
            CATEGORY: { label: 'DANH MỤC', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: Layers },
            BRAND: { label: 'THƯƠNG HIỆU', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Sparkles },
            ORDER: { label: 'ĐƠN HÀNG', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShoppingCart },
            WAREHOUSE: { label: 'KHO VẬN', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Server },
            PURCHASE_ORDER: { label: 'NHẬP HÀNG', color: 'bg-lime-50 text-lime-700 border-lime-200', icon: Database },
            WARRANTY: { label: 'BẢO HÀNH', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Wrench },
            PAYMENT: { label: 'THANH TOÁN', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: CreditCard },
            REVIEW: { label: 'ĐÁNH GIÁ', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: MessageSquare },
            SYSTEM: { label: 'HỆ THỐNG', color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Shield },
        };

        const item = config[mod] || { label: mod, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Activity };
        const Icon = item.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${item.color}`}>
                <Icon className="w-3 h-3" />
                {item.label}
            </span>
        );
    };

    const renderActionBadge = (action: SystemLogAction) => {
        let badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
        let actionLabel: string = action;

        switch (action) {
            case 'LOGIN':
                badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                actionLabel = 'ĐĂNG NHẬP';
                break;
            case 'LOGOUT':
                badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
                actionLabel = 'ĐĂNG XUẤT';
                break;
            case 'CREATE':
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                actionLabel = 'THÊM MỚI';
                break;
            case 'UPDATE':
                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                actionLabel = 'CẬP NHẬT';
                break;
            case 'DELETE':
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                actionLabel = 'XÓA BỎ';
                break;
            case 'STATUS_CHANGE':
                badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                actionLabel = 'ĐỔI TRẠNG THÁI';
                break;
            case 'PERMISSION_CHANGE':
                badgeColor = 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
                actionLabel = 'PHÂN QUYỀN';
                break;
            case 'EXPORT':
                badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                actionLabel = 'XUẤT DỮ LIỆU';
                break;
            case 'BACKUP':
                badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                actionLabel = 'SAO LƯU CSDL';
                break;
            case 'PAYMENT_PROCESS':
                badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                actionLabel = 'GIAO DỊCH';
                break;
            case 'SYNC':
                badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                actionLabel = 'ĐỒNG BỘ';
                break;
        }

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${badgeColor}`}>
                {actionLabel}
            </span>
        );
    };

    const renderStatusCodeBadge = (code?: number) => {
        if (!code) return <span className="text-gray-300 text-xs">—</span>;
        let color = 'bg-gray-100 text-gray-700';
        if (code >= 200 && code < 300) color = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        else if (code >= 300 && code < 400) color = 'bg-blue-50 text-blue-700 border border-blue-200';
        else if (code >= 400 && code < 500) color = 'bg-amber-50 text-amber-700 border border-amber-200';
        else if (code >= 500) color = 'bg-rose-50 text-rose-700 border border-rose-200';

        return (
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${color}`}>
                {code}
            </span>
        );
    };

    // Table columns definition
    const tableColumns: Column<SystemLogItem>[] = [
        {
            key: 'id',
            header: 'Mã & Thời gian',
            sortable: true,
            sortValue: (item) => new Date(item.timestamp).getTime(),
            render: (log) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                            {log.id}
                        </span>
                        {log.executionTimeMs !== undefined && (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded" title="Thời gian phản hồi">
                                {log.executionTimeMs}ms
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{formatLogDateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                        {getRelativeTimeString(log.timestamp)}
                    </p>
                </div>
            ),
        },
        {
            key: 'actor',
            header: 'Người thực hiện',
            render: (log) => (
                <div className="flex items-center gap-2.5">
                    <img
                        src={log.actor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.actor.fullName)}&background=2563eb&color=fff`}
                        alt={log.actor.fullName}
                        className="w-8 h-8 rounded-full border border-gray-200 shrink-0 object-cover"
                    />
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                            {log.actor.fullName}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <span className="truncate">@{log.actor.username}</span>
                            <span>•</span>
                            <span className="font-semibold text-gray-600 text-[10px] uppercase">
                                {log.actor.role}
                            </span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'module_action',
            header: 'Phân hệ / Thao tác',
            render: (log) => (
                <div className="space-y-1">
                    <div>{renderModuleBadge(log.module)}</div>
                    <div>{renderActionBadge(log.action)}</div>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Nội dung hoạt động',
            className: 'max-w-[320px]',
            render: (log) => (
                <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">
                        {log.actionTitle}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {log.description}
                    </p>
                    {log.targetEntity && log.targetId && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                            <span className="font-medium text-gray-400">{log.targetEntity}:</span>
                            <span className="font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                {log.targetId}
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'network',
            header: 'IP & Môi trường',
            render: (log) => (
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1 font-mono text-gray-700 font-medium">
                        <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{log.ipAddress}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate max-w-[170px]" title={log.userAgent}>
                        <Laptop className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{log.userAgent}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'level',
            header: 'Mức độ & Mã HTTP',
            render: (log) => (
                <div className="space-y-1.5">
                    <div>{renderLevelBadge(log.level)}</div>
                    <div className="flex items-center gap-1.5">
                        {log.httpMethod && (
                            <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-1 rounded">
                                {log.httpMethod}
                            </span>
                        )}
                        {renderStatusCodeBadge(log.statusCode)}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
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
        { id: 'overview', label: 'Tổng quan hoạt động', icon: Activity },
        { id: 'changes', label: `Dữ liệu thay đổi (${detailLog?.changes?.length || 0})`, icon: Layers },
        { id: 'payload', label: 'Request & Response', icon: Code2 },
        ...(detailLog?.errorMessage ? [{ id: 'error', label: 'Thông tin lỗi & Trace', icon: AlertTriangle }] : []),
    ];

    // Analytics chart data calculations
    const chartAnalytics = useMemo(() => {
        // Module distribution
        const moduleMap: Record<string, number> = {};
        const levelMap: Record<string, number> = {
            SUCCESS: 0,
            INFO: 0,
            WARNING: 0,
            ERROR: 0,
            CRITICAL: 0,
        };

        // Timeline distribution (group by hours or day slices)
        const timelineMap: Record<string, { time: string; total: number; success: number; error: number }> = {};

        for (const item of logs) {
            moduleMap[item.module] = (moduleMap[item.module] || 0) + 1;
            if (levelMap[item.level] !== undefined) {
                levelMap[item.level]++;
            }

            // Timeline key
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
            color: MODULE_COLORS[name] || '#3b82f6',
        }));

        const timelineData = Object.values(timelineMap).slice(-7);

        return { pieData, timelineData, levelMap };
    }, [logs]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1">
                        <span>Quản trị hệ thống</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-blue-600 font-semibold">Nhật ký hệ thống</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <FileText className="w-7 h-7 text-blue-600" />
                        <span>Nhật Ký Hệ Thống (Audit & System Logs)</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                        Ghi nhận, giám sát và kiểm toán toàn diện tất cả thao tác của người dùng, thay đổi dữ liệu, sự kiện bảo mật và giao dịch trong hệ thống PCStore.
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Live auto-refresh selector */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs text-gray-700 gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${autoRefreshSecs > 0 ? 'bg-emerald-500 animate-ping' : 'bg-gray-300'}`} />
                            <span className="text-[11px] font-semibold text-gray-500">Tự động làm mới:</span>
                        </div>
                        <select
                            value={autoRefreshSecs}
                            onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
                            className="text-xs font-bold text-blue-600 bg-transparent border-none focus:outline-none cursor-pointer"
                        >
                            <option value={0}>Tắt</option>
                            <option value={10}>Mỗi 10s</option>
                            <option value={30}>Mỗi 30s</option>
                            <option value={60}>Mỗi 60s</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => loadLogs()}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    {/* Visual Analytics Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`flex items-center gap-1.5 px-3 py-2 font-semibold text-xs rounded-xl border shadow-sm transition-colors cursor-pointer ${
                            showAnalytics
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                        title="Xem biểu đồ phân tích"
                    >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Biểu đồ thống kê</span>
                    </button>

                    {/* Export Dropdown / Buttons */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="flex items-center gap-1 px-2.5 py-1 text-gray-700 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Xuất file CSV"
                        >
                            <Download className="w-3 h-3" />
                            <span>CSV</span>
                        </button>
                        <span className="text-gray-200 text-xs">|</span>
                        <button
                            type="button"
                            onClick={handleExportJson}
                            className="flex items-center gap-1 px-2.5 py-1 text-gray-700 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Xuất file JSON"
                        >
                            <Code2 className="w-3 h-3" />
                            <span>JSON</span>
                        </button>
                    </div>

                    {/* Purge Logs Button */}
                    <button
                        type="button"
                        onClick={() => setIsPurgeModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 shadow-sm transition-colors cursor-pointer"
                        title="Dọn dẹp nhật ký cũ"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span className="hidden sm:inline">Dọn dẹp log</span>
                    </button>

                    {/* Test Log Simulator Button */}
                    <button
                        type="button"
                        onClick={() => setIsAddTestModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all hover:shadow cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Ghi log thử nghiệm</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Logs */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between text-blue-600">
                        <span className="text-xs font-semibold text-gray-500">Tổng Số Nhật Ký</span>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>Hôm nay: <strong className="text-gray-700">{stats.todayCount}</strong> sự kiện</span>
                    </div>
                </div>

                {/* Successful Actions */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center justify-between text-emerald-600">
                        <span className="text-xs font-semibold text-gray-500">Thành Công (Success)</span>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{stats.successCount.toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                        {stats.total > 0 ? `${Math.round((stats.successCount / stats.total) * 100)}% tỷ lệ thành công` : '100%'}
                    </p>
                </div>

                {/* Warnings */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-amber-200 transition-colors">
                    <div className="flex items-center justify-between text-amber-600">
                        <span className="text-xs font-semibold text-gray-500">Cảnh Báo (Warnings)</span>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{stats.warningCount.toLocaleString()}</p>
                    <span className="text-[11px] text-amber-700 font-medium">Xác thực & quyền truy cập</span>
                </div>

                {/* Errors */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-rose-200 transition-colors">
                    <div className="flex items-center justify-between text-rose-600">
                        <span className="text-xs font-semibold text-gray-500">Lỗi Hệ Thống (Errors)</span>
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                            <XCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-rose-600">{stats.errorCount.toLocaleString()}</p>
                    <span className="text-[11px] text-rose-600 font-medium">Mã lỗi 5xx & Gateway</span>
                </div>

                {/* Critical / Active Actors */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 hover:border-purple-200 transition-colors">
                    <div className="flex items-center justify-between text-purple-600">
                        <span className="text-xs font-semibold text-gray-500">Bảo Mật & Người Dùng</span>
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                            <Shield className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{stats.uniqueUsersCount}</p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <span>Cảnh báo nghiêm trọng: </span>
                        <strong className="text-red-600 font-bold">{stats.criticalCount}</strong>
                    </div>
                </div>
            </div>

            {/* Collapsible Visual Analytics Widget with Recharts */}
            {showAnalytics && (
                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <div>
                                <h3 className="font-bold text-sm text-gray-900">Phân Tích Trực Quan Hoạt Động & Sự Kiện</h3>
                                <p className="text-[11px] text-gray-400">Biểu đồ thể hiện phân bổ sự kiện theo phân hệ và xu hướng hoạt động</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAnalytics(false)}
                            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                            Đóng biểu đồ ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 1. Module Distribution Chart */}
                        <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span>Phân bổ nhật ký theo phân hệ nghiệp vụ</span>
                            </h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartAnalytics.pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                        >
                                            {chartAnalytics.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${value} sự kiện`, 'Số lượng']}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Timeline Activity Trend */}
                        <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-emerald-600" />
                                <span>Xu hướng sự kiện gần đây (Thành công vs Cảnh báo/Lỗi)</span>
                            </h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartAnalytics.timelineData}>
                                        <defs>
                                            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
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

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
                {[
                    { id: 'ALL', label: 'Tất cả nhật ký', count: stats.total },
                    { id: 'AUTH_USER', label: 'Xác thực & Tài khoản', icon: Key },
                    { id: 'CATALOG', label: 'Sản phẩm & Danh mục', icon: Package },
                    { id: 'ORDER_PAYMENT', label: 'Đơn hàng & Thanh toán', icon: ShoppingCart },
                    { id: 'WAREHOUSE', label: 'Kho vận & Nhập hàng', icon: Server },
                    { id: 'WARRANTY', label: 'Bảo hành & Sửa chữa', icon: Wrench },
                    { id: 'WARNING_ERROR', label: 'Cảnh báo & Lỗi', icon: AlertTriangle, badgeColor: 'bg-rose-100 text-rose-700' },
                ].map((tab) => {
                    const isActive = quickTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setQuickTab(tab.id);
                                setCurrentPage(1);
                            }}
                            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                                isActive
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Standard AdminFilter Toolbar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                    setSearchQuery(q);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm mã log (#LOG-...), người thực hiện, username, IP, API endpoint, đối tượng..."
                fields={filterFields}
                values={filterValues}
                onChange={(vals) => {
                    setFilterValues(vals);
                    setCurrentPage(1);
                }}
                onReset={() => {
                    setSearchQuery('');
                    setFilterValues({ level: '', module: '', action: '', statusCode: '', role: '', dateRange: '', startDate: '', endDate: '' });
                    setQuickTab('ALL');
                    setCurrentPage(1);
                }}
            />

            {/* Batch Selection Banner */}
            {selectedLogIds.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600" />
                        <span>Đang chọn <strong>{selectedLogIds.length}</strong> dòng nhật ký.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-blue-700 font-semibold border border-blue-200 rounded-lg shadow-sm cursor-pointer"
                        >
                            Xuất CSV đã chọn
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsBatchDeleteModalOpen(true)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                        >
                            Xóa các mục đã chọn
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLogIds([])}
                            className="px-2 py-1 text-gray-500 hover:text-gray-800 cursor-pointer"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {/* Standard AdminTable with sliced pagination data */}
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

            {/* MODAL 1: CHI TIẾT NHẬT KÝ (LOG DETAIL MODAL) */}
            <AdminModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Chi tiết nhật ký: ${detailLog?.id || ''}`}
                subtitle={`Ghi nhận lúc: ${detailLog ? formatLogDateTime(detailLog.timestamp) : ''}`}
                icon={FileText}
                size="xl"
                tabs={modalTabs}
            >
                {(activeTab) => {
                    if (!detailLog) return null;

                    return (
                        <div className="space-y-4">
                            {/* Modal Header Navigation Toolbar */}
                            <div className="flex items-center justify-between p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handlePrevLog}
                                        disabled={currentDetailIndex <= 0}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
                                        title="Xem log liền trước"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Log trước</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextLog}
                                        disabled={currentDetailIndex >= logs.length - 1}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
                                        title="Xem log kế tiếp"
                                    >
                                        <span>Log sau</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-gray-400 text-[11px] ml-1">
                                        Vị trí: <strong>{currentDetailIndex + 1}</strong> / {logs.length}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(JSON.stringify(detailLog, null, 2), 'JSON nhật ký')}
                                        className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="Sao chép toàn bộ dữ liệu log dạng JSON"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Sao chép JSON</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRequestDeleteSingle(detailLog)}
                                        className="flex items-center gap-1 px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Xóa bản ghi này"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Xóa log</span>
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: TỔNG QUAN HOẠT ĐỘNG */}
                            {activeTab === 'overview' && (
                                <div className="space-y-5 animate-in fade-in duration-150">
                                    {/* Top Status Card */}
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {renderLevelBadge(detailLog.level)}
                                                {renderModuleBadge(detailLog.module)}
                                                {renderActionBadge(detailLog.action)}
                                            </div>
                                            <h3 className="text-base font-bold text-gray-900 mt-1">
                                                {detailLog.actionTitle}
                                            </h3>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {detailLog.description}
                                            </p>
                                        </div>

                                        <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-gray-200 text-right">
                                            <span className="text-xs text-gray-400">Mã phản hồi</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {renderStatusCodeBadge(detailLog.statusCode)}
                                                {detailLog.executionTimeMs !== undefined && (
                                                    <span className="text-xs font-mono font-semibold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                        {detailLog.executionTimeMs} ms
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actor & Target Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Actor Card */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider border-b pb-2">
                                                <User className="w-4 h-4 text-blue-600" />
                                                <span>Người thực hiện thao tác</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={detailLog.actor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(detailLog.actor.fullName)}&background=2563eb&color=fff`}
                                                    alt={detailLog.actor.fullName}
                                                    className="w-11 h-11 rounded-full border border-gray-200 object-cover"
                                                />
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{detailLog.actor.fullName}</p>
                                                    <p className="text-xs text-gray-400">@{detailLog.actor.username}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                            {detailLog.actor.role}
                                                        </span>
                                                        {detailLog.actor.email && (
                                                            <span className="text-[11px] text-gray-500">{detailLog.actor.email}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Target Entity Card */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider border-b pb-2">
                                                <Database className="w-4 h-4 text-indigo-600" />
                                                <span>Đối tượng bị tác động</span>
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500">Loại đối tượng:</span>
                                                    <strong className="text-gray-800">{detailLog.targetEntity || 'Toàn hệ thống'}</strong>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500">Mã định danh ID:</span>
                                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        {detailLog.targetId || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500">Thời gian ghi nhận:</span>
                                                    <span className="font-medium text-gray-700">{formatLogDateTime(detailLog.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Network & Endpoint Details */}
                                    <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider border-b pb-2">
                                            <Globe className="w-4 h-4 text-emerald-600" />
                                            <span>Thông tin mạng & API Endpoint</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="text-gray-400 block mb-0.5">Địa chỉ IP Khách:</span>
                                                <span className="font-mono font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block">
                                                    {detailLog.ipAddress}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block mb-0.5">Trình duyệt & Hệ điều hành:</span>
                                                <span className="font-medium text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block">
                                                    {detailLog.userAgent}
                                                </span>
                                            </div>
                                            <div className="md:col-span-2">
                                                <span className="text-gray-400 block mb-0.5">API Endpoint gọi đến:</span>
                                                <div className="flex items-center gap-2">
                                                    {detailLog.httpMethod && (
                                                        <span className="px-2 py-1 font-mono font-bold text-white bg-gray-800 rounded text-xs">
                                                            {detailLog.httpMethod}
                                                        </span>
                                                    )}
                                                    <code className="font-mono text-xs text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded border border-blue-200 flex-1 break-all">
                                                        {detailLog.endpoint || 'Không ghi nhận endpoint trực tiếp'}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: DỮ LIỆU THAY ĐỔI (DIFF) */}
                            {activeTab === 'changes' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <p className="text-xs text-gray-500">
                                        Chi tiết các trường dữ liệu được chỉnh sửa trước và sau khi thao tác diễn ra:
                                    </p>
                                    {detailLog.changes && detailLog.changes.length > 0 ? (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                                    <tr>
                                                        <th className="p-3">Trường dữ liệu</th>
                                                        <th className="p-3">Giá trị trước thay đổi</th>
                                                        <th className="p-3">Giá trị mới cập nhật</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {detailLog.changes.map((ch, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-gray-800">
                                                                <div>{ch.fieldName}</div>
                                                                <span className="font-mono text-[10px] text-gray-400">
                                                                    ({ch.field})
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="inline-block p-1.5 rounded bg-rose-50 text-rose-700 font-mono text-[11px] border border-rose-200 break-all">
                                                                    {String(ch.oldValue ?? 'Trống')}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="inline-block p-1.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] border border-emerald-200 break-all font-semibold">
                                                                    {String(ch.newValue ?? 'Trống')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                                            <p className="text-xs text-gray-500 font-medium">
                                                Thao tác này là hoạt động truy vấn hoặc không làm thay đổi các trường dữ liệu cụ thể.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: REQUEST & RESPONSE PAYLOAD */}
                            {activeTab === 'payload' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                                <Code2 className="w-3.5 h-3.5 text-blue-600" /> Request Payload (Body gửi lên)
                                            </span>
                                            {Boolean(detailLog.requestPayload) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(JSON.stringify(detailLog.requestPayload, null, 2), 'Request Payload')}
                                                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Copy className="w-3 h-3" /> Sao chép
                                                </button>
                                            )}
                                        </div>
                                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-56 scrollbar-thin">
                                            {detailLog.requestPayload !== undefined && detailLog.requestPayload !== null
                                                ? JSON.stringify(detailLog.requestPayload, null, 2)
                                                : '// Không có dữ liệu Request Body'}
                                        </pre>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                                <Server className="w-3.5 h-3.5 text-emerald-600" /> Response Payload (Dữ liệu trả về)
                                            </span>
                                            {Boolean(detailLog.responsePayload) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(JSON.stringify(detailLog.responsePayload, null, 2), 'Response Payload')}
                                                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Copy className="w-3 h-3" /> Sao chép
                                                </button>
                                            )}
                                        </div>
                                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-56 scrollbar-thin">
                                            {detailLog.responsePayload !== undefined && detailLog.responsePayload !== null
                                                ? JSON.stringify(detailLog.responsePayload, null, 2)
                                                : '// Không có dữ liệu Response Body'}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: THÔNG TIN LỖI & STACK TRACE */}
                            {activeTab === 'error' && detailLog.errorMessage && (
                                <div className="space-y-3 animate-in fade-in duration-150">
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                                        <div className="font-bold flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                                            <span>Thông báo ngoại lệ (Exception Message):</span>
                                        </div>
                                        <p className="font-mono text-rose-900">{detailLog.errorMessage}</p>
                                    </div>

                                    {detailLog.stackTrace && (
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-gray-700">Chi tiết vết ngăn xếp (Stack Trace):</span>
                                            <pre className="p-3 bg-red-950 text-red-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 scrollbar-thin">
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
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Lưu ý an toàn kiểm toán:</p>
                                <p className="mt-0.5">
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

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span className="text-gray-500">Khôi phục về bộ log mẫu gốc:</span>
                            <button
                                type="button"
                                onClick={handleResetDefaults}
                                className="text-blue-600 font-bold hover:underline cursor-pointer"
                            >
                                Đặt lại mặc định
                            </button>
                        </div>
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
                        <div className="grid grid-cols-2 gap-3">
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
                                    { label: 'Kho vận (WAREHOUSE)', value: 'WAREHOUSE' },
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
                                    { label: 'ERROR (Lỗi)', value: 'ERROR' },
                                    { label: 'CRITICAL (Nghiêm trọng)', value: 'CRITICAL' },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
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
                                onChange={(e) => setTestLogData({ ...testLogData, httpMethod: e.target.value as any })}
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

                        <div className="grid grid-cols-2 gap-3">
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

            {/* MODAL 4: XÁC NHẬN XÓA 1 DÒNG LOG (CONFIRM DELETE SINGLE) */}
            <AdminConfirmModal
                isOpen={isDeleteSingleModalOpen}
                onClose={() => setIsDeleteSingleModalOpen(false)}
                onConfirm={handleConfirmDeleteSingle}
                title="Xác nhận xóa nhật ký"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa bản ghi nhật ký <strong>{logToDelete?.id}</strong>? Thao tác này không thể hoàn tác.
                    </span>
                }
                variant="danger"
                confirmText="Xóa bản ghi"
                cancelText="Hủy bỏ"
            />

            {/* MODAL 5: XÁC NHẬN XÓA NHIỀU DÒNG LOG (CONFIRM BATCH DELETE) */}
            <AdminConfirmModal
                isOpen={isBatchDeleteModalOpen}
                onClose={() => setIsBatchDeleteModalOpen(false)}
                onConfirm={handleConfirmBatchDelete}
                title="Xác nhận xóa hàng loạt"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa <strong>{selectedLogIds.length}</strong> bản ghi nhật ký đã chọn? Thao tác này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống kiểm toán.
                    </span>
                }
                variant="danger"
                confirmText={`Xóa ${selectedLogIds.length} bản ghi`}
                cancelText="Hủy bỏ"
            />
        </div>
    );
}
