export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type PaymentMethodCode = 'COD' | 'ZALOPAY';

export interface PaymentMethodInfo {
    id: number;
    code: PaymentMethodCode | string;
    name: string;
    type: 'CASH' | 'ONLINE' | string;
    bankName?: string | null;
    accountNumber?: string | null;
    status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface PaymentTransaction {
    id: number;
    transactionCode: string;
    orderId: number;
    orderCode: string;
    orderStatus?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    paymentMethodId?: number | null;
    method: PaymentMethodCode;
    paymentMethodName: string;
    amount: number;
    status: PaymentTransactionStatus;
    paidAt?: string | null;
    createdDate?: string | null;
    lastModifiedDate?: string | null;
    displayTime: string;
}

export interface PaymentFilterParams {
    keyword?: string;
    status?: string;
    method?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
}

export interface PaymentStats {
    totalTransactions: number;
    todayTransactions: number;
    successCount: number;
    pendingCount: number;
    failedCount: number;
    totalSuccessAmount: number;
    totalPendingAmount: number;
}
