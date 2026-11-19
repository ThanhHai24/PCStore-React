export type PaymentTransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

export type PaymentMethodCode =
    | 'VNPAY'
    | 'BANK_TRANSFER'
    | 'CASH'
    | 'CARD'
    | 'COD';

export interface PaymentTransaction {
    id: string;
    transactionCode: string; // VD: TXN-20261119-88412
    gatewayRef?: string; // VD: VNP14298312 hoặc mã bút toán ngân hàng
    orderCode: string;
    orderId?: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    method: PaymentMethodCode;
    bankName?: string; // VD: Vietcombank, Techcombank, MB Bank, VNPAY QR
    amount: number;
    feeAmount: number;
    refundedAmount?: number;
    refundReason?: string;
    status: PaymentTransactionStatus;
    reconciled: boolean; // Đã đối soát kế toán chưa
    gatewayResponseCode?: string; // VD: '00', '24', '51'
    gatewayMessage?: string;
    paidAt: string;
    note?: string;
    source: 'BACKEND_SYNC' | 'MANUAL' | 'SEED';
}

export interface PaymentMethodConfig {
    id: string;
    code: PaymentMethodCode;
    name: string;
    shortDescription: string;
    enabled: boolean;
    environment?: 'SANDBOX' | 'PRODUCTION';
    feePercent: number;
    minAmount: number;
    maxAmount: number;
    // Gateway / Bank specific fields
    merchantCode?: string; // VNPAY TmnCode
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    bankBranch?: string;
    displayOrder: number;
    updatedAt: string;
}

export interface PaymentFilterParams {
    keyword?: string;
    status?: string;
    method?: string;
    reconciled?: string; // 'true' | 'false' | ''
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
    refundedCount: number;
    totalSuccessAmount: number;
    totalPendingAmount: number;
    totalRefundedAmount: number;
    totalFeeAmount: number;
}

export interface CreatePaymentPayload {
    orderCode?: string;
    orderId?: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    method: PaymentMethodCode;
    bankName?: string;
    gatewayRef?: string;
    amount: number;
    feeAmount?: number;
    status: PaymentTransactionStatus;
    reconciled?: boolean;
    note?: string;
}
