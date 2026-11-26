import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
    SystemLogItem,
    SystemLogFilterParams,
    SystemLogStats,
    SystemLogModule,
    SystemLogAction,
    SystemLogLevel,
} from '../types/systemLog';

export interface BackendSystemLogResponse {
    id: number;
    userId?: number | null;
    username?: string | null;
    userRole?: string | null;
    module: string;
    moduleLabel?: string | null;
    action: string;
    actionLabel?: string | null;
    status: 'SUCCESS' | 'FAILED' | string;
    resourceType?: string | null;
    resourceId?: number | null;
    resourceCode?: string | null;
    description?: string | null;
    detailJson?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    httpMethod?: string | null;
    requestUri?: string | null;
    createdDate?: string | null;
}

export interface BackendSystemLogSummaryResponse {
    totalLogs: number;
    successCount: number;
    failedCount: number;
    successRate: number;
    moduleBreakdown?: Array<{ module: string; moduleLabel: string; count: number }>;
    actionBreakdown?: Array<{ action: string; actionLabel: string; count: number }>;
}

const STORAGE_KEY = 'pcstore_system_logs_v1';

function mapBackendModuleToUI(beModule?: string): SystemLogModule {
    const m = (beModule || 'SYSTEM').toUpperCase();
    switch (m) {
        case 'AUTH':
            return 'AUTH';
        case 'USER':
            return 'USER';
        case 'CATALOG':
        case 'PRODUCT':
            return 'PRODUCT';
        case 'CATEGORY':
            return 'CATEGORY';
        case 'BRAND':
            return 'BRAND';
        case 'ORDER':
        case 'DELIVERY':
            return 'ORDER';
        case 'SUPPLIER':
        case 'GOODS_RECEIPT':
        case 'PRODUCT_SERIAL':
        case 'PURCHASE_RETURN':
        case 'WAREHOUSE':
            return 'WAREHOUSE';
        case 'PURCHASE_ORDER':
            return 'PURCHASE_ORDER';
        case 'WARRANTY':
            return 'WARRANTY';
        case 'PAYMENT':
            return 'PAYMENT';
        case 'REVIEW':
            return 'REVIEW';
        default:
            return 'SYSTEM';
    }
}

function mapUIModuleToBackend(uiModule?: string): string | undefined {
    if (!uiModule || uiModule === 'ALL') return undefined;
    const m = uiModule.toUpperCase();
    switch (m) {
        case 'PRODUCT':
        case 'CATEGORY':
        case 'BRAND':
            return 'CATALOG';
        case 'WAREHOUSE':
            return undefined; // Covers GOODS_RECEIPT, PRODUCT_SERIAL, PURCHASE_RETURN, SUPPLIER — filter client-side
        case 'REVIEW':
            return undefined;
        default:
            return m;
    }
}

function mapBackendActionToUI(beAction?: string): SystemLogAction {
    const a = (beAction || 'UPDATE').toUpperCase();
    switch (a) {
        case 'LOGIN':
            return 'LOGIN';
        case 'LOGOUT':
            return 'LOGOUT';
        case 'CREATE':
            return 'CREATE';
        case 'UPDATE':
            return 'UPDATE';
        case 'UPDATE_STATUS':
            return 'STATUS_CHANGE';
        case 'DELETE':
            return 'DELETE';
        case 'ASSIGN_SERIAL':
            return 'SYNC';
        case 'PAYMENT_CONFIRM':
        case 'PAYMENT_WEBHOOK':
            return 'PAYMENT_PROCESS';
        case 'EXPORT':
            return 'EXPORT';
        case 'SCHEDULED_JOB':
            return 'SYNC';
        default:
            return 'UPDATE';
    }
}

function mapUIActionToBackend(uiAction?: string): string | undefined {
    if (!uiAction || uiAction === 'ALL') return undefined;
    switch (uiAction.toUpperCase()) {
        case 'LOGIN':
            return 'LOGIN';
        case 'LOGOUT':
            return 'LOGOUT';
        case 'CREATE':
            return 'CREATE';
        case 'UPDATE':
            return 'UPDATE';
        case 'DELETE':
            return 'DELETE';
        case 'STATUS_CHANGE':
            return 'UPDATE_STATUS';
        case 'EXPORT':
            return 'EXPORT';
        case 'PAYMENT_PROCESS':
            return 'PAYMENT_CONFIRM';
        default:
            return undefined;
    }
}

function parseDetailJson(raw?: string | null): unknown {
    if (!raw) return undefined;
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

function mapBackendLogToItem(raw: BackendSystemLogResponse): SystemLogItem {
    const isFailed = String(raw.status || '').toUpperCase() === 'FAILED';
    const level: SystemLogLevel = isFailed ? 'ERROR' : 'SUCCESS';
    const username = raw.username || (raw.userId ? `user_${raw.userId}` : 'system');
    const fullName = raw.username || (raw.userId ? `Người dùng #${raw.userId}` : 'Hệ thống');
    const role = raw.userRole || 'SYSTEM';
    const parsedDetail = parseDetailJson(raw.detailJson);
    const httpMethod = (raw.httpMethod || 'GET').toUpperCase() as SystemLogItem['httpMethod'];

    return {
        id: String(raw.id),
        timestamp: raw.createdDate || new Date().toISOString(),
        actor: {
            id: raw.userId != null ? String(raw.userId) : '0',
            username,
            fullName,
            role,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=${isFailed ? 'ef4444' : '2563eb'}&color=fff&bold=true`,
        },
        action: mapBackendActionToUI(raw.action),
        actionTitle: raw.actionLabel
            ? `${raw.actionLabel}${raw.moduleLabel ? ` - ${raw.moduleLabel}` : ''}`
            : raw.action || 'Thao tác hệ thống',
        module: mapBackendModuleToUI(raw.module),
        level,
        description: raw.description || `${raw.actionLabel || raw.action} (${raw.moduleLabel || raw.module})`,
        targetEntity: raw.resourceType || raw.moduleLabel || undefined,
        targetId: raw.resourceCode || (raw.resourceId != null ? String(raw.resourceId) : undefined),
        ipAddress: raw.ipAddress || '---',
        userAgent: raw.userAgent || '---',
        endpoint: raw.requestUri || undefined,
        httpMethod: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod || '') ? httpMethod : undefined,
        statusCode: isFailed ? 400 : 200,
        responsePayload: parsedDetail,
        errorMessage: isFailed ? raw.description || 'Thao tác thất bại trên hệ thống' : undefined,
    };
}

class SystemLogService {
    private logs: SystemLogItem[] = [];
    private latestSummary: BackendSystemLogSummaryResponse | null = null;

    constructor() {
        this.loadLocalCache();
    }

    private loadLocalCache(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this.logs = parsed;
                }
            }
        } catch {
            this.logs = [];
        }
    }

    private saveLocalCache(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, 200)));
        } catch {
            // ignore storage errors
        }
    }

    private buildDateRangeBounds(params: SystemLogFilterParams): { fromDate?: string; toDate?: string } {
        let fromDate: Date | undefined;
        let toDate: Date | undefined;

        if (params.dateRange && params.dateRange !== 'ALL') {
            const now = new Date();
            if (params.dateRange === 'today') {
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            } else if (params.dateRange === '3days') {
                fromDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            } else if (params.dateRange === '7days') {
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (params.dateRange === '30days') {
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
        }

        if (params.startDate) {
            const start = new Date(params.startDate);
            start.setHours(0, 0, 0, 0);
            fromDate = start;
        }
        if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            toDate = end;
        }

        return {
            fromDate: fromDate ? fromDate.toISOString() : undefined,
            toDate: toDate ? toDate.toISOString() : undefined,
        };
    }

    /**
     * GET /api/admin/system-logs
     */
    public async getLogs(params: SystemLogFilterParams = {}): Promise<SystemLogItem[]> {
        const query = new URLSearchParams();
        query.set('page', '0');
        query.set('size', '200');
        query.set('sort', 'createdDate,DESC');

        if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());

        const beModule = mapUIModuleToBackend(params.module);
        if (beModule) query.set('module', beModule);

        const beAction = mapUIActionToBackend(params.action);
        if (beAction) query.set('action', beAction);

        if (params.level && params.level !== 'ALL') {
            if (params.level === 'SUCCESS' || params.level === 'INFO') {
                query.set('status', 'SUCCESS');
            } else if (params.level === 'ERROR' || params.level === 'CRITICAL' || params.level === 'WARNING') {
                query.set('status', 'FAILED');
            }
        }

        if (params.role && params.role !== 'ALL') {
            query.set('userRole', params.role);
        }

        const { fromDate, toDate } = this.buildDateRangeBounds(params);
        if (fromDate) query.set('fromDate', fromDate);
        if (toDate) query.set('toDate', toDate);

        try {
            const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.SYSTEM_LOGS}?${query.toString()}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const pageData = await res.json();
            const content: BackendSystemLogResponse[] = Array.isArray(pageData?.content) ? pageData.content : [];
            let result = content.map(mapBackendLogToItem);

            // Cache latest fetched logs for stats fallback
            this.logs = result;

            // Secondary client filters not natively exposed as query params on BE
            if (params.module && params.module !== 'ALL' && !beModule) {
                result = result.filter((item) => item.module === params.module);
            }
            if (params.httpMethod && params.httpMethod !== 'ALL') {
                result = result.filter((item) => item.httpMethod === params.httpMethod);
            }
            if (params.statusCode && params.statusCode !== 'ALL') {
                if (params.statusCode === '2xx') {
                    result = result.filter((item) => item.statusCode && item.statusCode >= 200 && item.statusCode < 300);
                } else if (params.statusCode === '4xx' || params.statusCode === '5xx') {
                    result = result.filter((item) => item.statusCode && item.statusCode >= 400);
                }
            }

            return result;
        } catch (err) {
            console.warn('Không thể tải nhật ký từ BE (/api/admin/system-logs), sử dụng bộ nhớ tạm:', err);
            return this.filterLocalLogs(params);
        }
    }

    private filterLocalLogs(params: SystemLogFilterParams): SystemLogItem[] {
        let result = [...this.logs];
        if (params.keyword?.trim()) {
            const q = params.keyword.trim().toLowerCase();
            result = result.filter(
                (item) =>
                    item.id.toLowerCase().includes(q) ||
                    item.actionTitle.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q) ||
                    item.actor.username.toLowerCase().includes(q) ||
                    (item.targetId && item.targetId.toLowerCase().includes(q))
            );
        }
        if (params.level && params.level !== 'ALL') {
            result = result.filter((item) => item.level === params.level);
        }
        if (params.module && params.module !== 'ALL') {
            result = result.filter((item) => item.module === params.module);
        }
        if (params.action && params.action !== 'ALL') {
            result = result.filter((item) => item.action === params.action);
        }
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return result;
    }

    /**
     * GET /api/admin/system-logs/summary
     */
    public async getSummary(fromDate?: string, toDate?: string): Promise<BackendSystemLogSummaryResponse | null> {
        const query = new URLSearchParams();
        if (fromDate) query.set('fromDate', fromDate);
        if (toDate) query.set('toDate', toDate);
        const qs = query.toString();

        try {
            const res = await fetchWithAuth(
                `${API_ENDPOINTS.ADMIN.SYSTEM_LOGS_SUMMARY}${qs ? `?${qs}` : ''}`
            );
            if (!res.ok) return null;
            const summary: BackendSystemLogSummaryResponse = await res.json();
            this.latestSummary = summary;
            return summary;
        } catch (err) {
            console.warn('Không thể tải thống kê nhật ký từ BE (/api/admin/system-logs/summary):', err);
            return null;
        }
    }

    /**
     * GET /api/admin/system-logs/by-resource/{resourceType}/{resourceId}
     */
    public async getLogsByResource(
        resourceType: string,
        resourceId: number | string,
        page = 0,
        size = 50
    ): Promise<SystemLogItem[]> {
        try {
            const url = `${API_ENDPOINTS.ADMIN.SYSTEM_LOGS_BY_RESOURCE(resourceType, resourceId)}?page=${page}&size=${size}&sort=createdDate,DESC`;
            const res = await fetchWithAuth(url);
            if (!res.ok) return [];
            const pageData = await res.json();
            const content: BackendSystemLogResponse[] = Array.isArray(pageData?.content) ? pageData.content : [];
            return content.map(mapBackendLogToItem);
        } catch (err) {
            console.warn('Không thể tải audit trail theo chứng từ:', err);
            return [];
        }
    }

    /**
     * GET /api/admin/system-logs/{id}
     */
    public async getLogById(id: string | number): Promise<SystemLogItem | null> {
        const numericId = Number(id);
        if (!Number.isNaN(numericId) && numericId > 0) {
            try {
                const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.SYSTEM_LOG_DETAIL(numericId));
                if (res.ok) {
                    const raw: BackendSystemLogResponse = await res.json();
                    return mapBackendLogToItem(raw);
                }
            } catch (err) {
                console.warn('Không thể tải chi tiết log từ BE:', err);
            }
        }
        return this.logs.find((item) => item.id === String(id)) || null;
    }

    public getStats(): SystemLogStats {
        const todayStr = new Date().toISOString().split('T')[0];
        const uniqueActors = new Set<string>();

        let todayCount = 0;
        let successCount = 0;
        let warningCount = 0;
        let errorCount = 0;
        let criticalCount = 0;

        for (const item of this.logs) {
            uniqueActors.add(item.actor.username);
            if (item.timestamp.startsWith(todayStr)) {
                todayCount++;
            }
            if (item.level === 'SUCCESS') successCount++;
            else if (item.level === 'WARNING') warningCount++;
            else if (item.level === 'ERROR') errorCount++;
            else if (item.level === 'CRITICAL') criticalCount++;
        }

        if (this.latestSummary) {
            return {
                total: this.latestSummary.totalLogs,
                todayCount,
                successCount: this.latestSummary.successCount,
                warningCount,
                errorCount: this.latestSummary.failedCount,
                criticalCount,
                uniqueUsersCount: uniqueActors.size,
            };
        }

        return {
            total: this.logs.length,
            todayCount,
            successCount,
            warningCount,
            errorCount,
            criticalCount,
            uniqueUsersCount: uniqueActors.size,
        };
    }

    public deleteLog(id: string): boolean {
        const idx = this.logs.findIndex((l) => l.id === id);
        if (idx !== -1) {
            this.logs.splice(idx, 1);
            this.saveLocalCache();
            return true;
        }
        return false;
    }

    public deleteLogs(ids: (string | number)[]): number {
        const idSet = new Set(ids.map(String));
        const initialCount = this.logs.length;
        this.logs = this.logs.filter((item) => !idSet.has(item.id));
        this.saveLocalCache();
        return initialCount - this.logs.length;
    }

    public clearAllLogs(): void {
        this.logs = [];
        this.saveLocalCache();
    }

    public purgeLogs(options: { olderThanDays?: number; level?: string } = {}): number {
        const initialCount = this.logs.length;
        const now = new Date();

        this.logs = this.logs.filter((item) => {
            if (options.level && options.level !== 'ALL' && item.level === options.level) {
                return false;
            }
            if (options.olderThanDays && options.olderThanDays > 0) {
                const itemDate = new Date(item.timestamp);
                const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
                if (diffDays >= options.olderThanDays) {
                    return false;
                }
            }
            return true;
        });

        this.saveLocalCache();
        return initialCount - this.logs.length;
    }

    public addLog(log: Omit<SystemLogItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): SystemLogItem {
        const newLog: SystemLogItem = {
            id: log.id || `LOCAL-${Date.now()}`,
            timestamp: log.timestamp || new Date().toISOString(),
            ...log,
        };
        this.logs.unshift(newLog);
        this.saveLocalCache();
        return newLog;
    }

    public exportToCsv(logsToExport: SystemLogItem[]): void {
        const headers = [
            'Mã Log',
            'Thời Gian',
            'Người Thực Hiện',
            'Tài Khoản',
            'Vai Trò',
            'Phân Hệ',
            'Hành Động',
            'Mô Tả Hoạt Động',
            'Đối Tượng',
            'Mã Đối Tượng',
            'IP',
            'Trình Duyệt',
            'Mức Độ',
            'Mã HTTP',
            'Thời Gian Xử Lý (ms)',
        ];

        const rows = logsToExport.map((log) => [
            log.id,
            log.timestamp,
            `"${(log.actor.fullName || '').replace(/"/g, '""')}"`,
            log.actor.username,
            log.actor.role,
            log.module,
            log.action,
            `"${(log.description || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
            log.targetEntity || '',
            log.targetId || '',
            log.ipAddress,
            `"${(log.userAgent || '').replace(/"/g, '""')}"`,
            log.level,
            log.statusCode || '',
            log.executionTimeMs ?? '',
        ]);

        const csvContent =
            '\uFEFF' +
            [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nhat_ky_he_thong_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    public exportToJson(logsToExport: SystemLogItem[]): void {
        const blob = new Blob([JSON.stringify(logsToExport, null, 2)], {
            type: 'application/json;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nhat_ky_he_thong_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

export const systemLogService = new SystemLogService();
