export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELED';

export type InvoiceType = 'RETAIL' | 'VAT_COMPANY';

export type InvoicePaymentMethod =
    | 'VNPAY'
    | 'BANK_TRANSFER'
    | 'CASH'
    | 'CARD'
    | 'COD';

export type EInvoiceSyncStatus = 'ISSUED' | 'DRAFT' | 'CANCELLED';

export interface InvoiceLineItem {
    id: string | number;
    productCode: string;
    productName: string;
    productImageUrl?: string | null;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    subtotal: number;
}

export interface AdminInvoice {
    id: string;
    invoiceId?: number;
    invoiceCode: string;
    orderCode: string;
    orderId?: number;
    invoiceDate: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress?: string;
    invoiceType: InvoiceType;
    companyName?: string;
    taxCode?: string;
    companyAddress?: string;
    paymentMethod: InvoicePaymentMethod;
    totalAmount: number;
    discountAmount: number;
    taxRate: number; // % ví dụ: 0, 8, 10
    taxAmount: number;
    amount: number; // Tổng tiền thanh toán cuối cùng
    status: InvoiceStatus;
    eInvoiceStatus: EInvoiceSyncStatus;
    note?: string;
    items: InvoiceLineItem[];
    source: 'BACKEND' | 'MANUAL' | 'SEED';
}

export interface InvoiceFilterParams {
    keyword?: string;
    status?: string;
    invoiceType?: string;
    paymentMethod?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
}

export interface InvoiceStats {
    totalCount: number;
    todayCount: number;
    paidCount: number;
    pendingCount: number;
    canceledCount: number;
    vatInvoiceCount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
    totalTaxAmount: number;
    totalDiscountAmount: number;
}

export interface CreateInvoicePayload {
    orderCode?: string;
    orderId?: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress?: string;
    invoiceType: InvoiceType;
    companyName?: string;
    taxCode?: string;
    companyAddress?: string;
    paymentMethod: InvoicePaymentMethod;
    totalAmount: number;
    discountAmount: number;
    taxRate: number;
    status: InvoiceStatus;
    note?: string;
    items?: InvoiceLineItem[];
}
