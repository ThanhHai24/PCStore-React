export type SystemLogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type SystemLogModule =
    | 'AUTH'
    | 'USER'
    | 'PRODUCT'
    | 'CATEGORY'
    | 'BRAND'
    | 'ORDER'
    | 'WAREHOUSE'
    | 'PURCHASE_ORDER'
    | 'WARRANTY'
    | 'PAYMENT'
    | 'REVIEW'
    | 'SYSTEM';

export type SystemLogAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STATUS_CHANGE'
    | 'EXPORT'
    | 'IMPORT'
    | 'PERMISSION_CHANGE'
    | 'PURGE'
    | 'BACKUP'
    | 'PAYMENT_PROCESS'
    | 'SYNC';

export interface SystemLogActor {
    id: string;
    username: string;
    fullName: string;
    role: string;
    avatar?: string;
    email?: string;
}

export interface SystemLogChangeField {
    field: string;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface SystemLogItem {
    id: string;
    timestamp: string;
    actor: SystemLogActor;
    action: SystemLogAction;
    actionTitle: string;
    module: SystemLogModule;
    level: SystemLogLevel;
    description: string;
    targetEntity?: string;
    targetId?: string;
    ipAddress: string;
    userAgent: string;
    endpoint?: string;
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    statusCode?: number;
    executionTimeMs?: number;
    changes?: SystemLogChangeField[];
    requestPayload?: unknown;
    responsePayload?: unknown;
    errorMessage?: string;
    stackTrace?: string;
}

export interface SystemLogFilterParams {
    keyword?: string;
    level?: string;
    module?: string;
    action?: string;
    dateRange?: string; // 'today' | '3days' | '7days' | '30days' | 'all'
    startDate?: string;
    endDate?: string;
    statusCode?: string;
}

export interface SystemLogStats {
    total: number;
    todayCount: number;
    successCount: number;
    warningCount: number;
    errorCount: number;
    criticalCount: number;
    uniqueUsersCount: number;
}
