import { adminOrderService } from './adminOrderService';
import {
    paymentService,
    type BackendPaymentResponse,
    type ZaloPayCreateRequest,
    type ZaloPayCreateResponse,
    type ZaloPayStatusResponse,
} from './paymentService';
import { escapeHtml } from '../utils/sanitize';
import type {
    PaymentFilterParams,
    PaymentMethodCode,
    PaymentMethodInfo,
    PaymentStats,
    PaymentTransaction,
    PaymentTransactionStatus,
} from '../types/adminPayment';
import type { OrderResponse } from '../types/adminOrder';

export function formatVND(val: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(val || 0);
}

function normalizeMethodCode(raw?: string | null): PaymentMethodCode {
    return String(raw || '').toUpperCase() === 'ZALOPAY' ? 'ZALOPAY' : 'COD';
}

function normalizePaymentStatus(raw?: string | null): PaymentTransactionStatus {
    const upper = String(raw || 'PENDING').toUpperCase();
    if (upper === 'SUCCESS') return 'SUCCESS';
    if (upper === 'FAILED') return 'FAILED';
    return 'PENDING';
}

async function fetchAllOrdersFromBackend(): Promise<OrderResponse[]> {
    const pageSize = 100;
    const firstPage = await adminOrderService.getAllOrders({ page: 0, size: pageSize });
    const orders: OrderResponse[] = [...(firstPage?.content || [])];
    const totalPages = Math.min(firstPage?.totalPages || 1, 5);

    if (totalPages > 1) {
        const pagePromises: Promise<OrderResponse[]>[] = [];
        for (let page = 1; page < totalPages; page++) {
            pagePromises.push(
                adminOrderService
                    .getAllOrders({ page, size: pageSize })
                    .then((res) => res?.content || [])
            );
        }
        const restPages = await Promise.all(pagePromises);
        for (const pageOrders of restPages) {
            orders.push(...pageOrders);
        }
    }

    return orders;
}

export const adminPaymentService = {
    async getPaymentMethods(): Promise<PaymentMethodInfo[]> {
        const methods = await paymentService.getActiveMethods();
        return methods.map((m) => ({
            id: m.id,
            code: String(m.code || '').toUpperCase(),
            name: m.name,
            type: m.type,
            bankName: m.bankName ?? null,
            accountNumber: m.accountNumber ?? null,
            status: m.status,
        }));
    },

    async createCodPayment(orderId: number): Promise<BackendPaymentResponse> {
        return paymentService.createCodPayment(orderId);
    },

    async confirmCodPayment(orderId: number | string): Promise<BackendPaymentResponse> {
        return paymentService.confirmCodPayment(orderId);
    },

    async createZaloPayOrder(payload: ZaloPayCreateRequest): Promise<ZaloPayCreateResponse> {
        return paymentService.createZaloPayOrder(payload);
    },

    async syncZaloPayStatus(appTransId: string): Promise<ZaloPayStatusResponse> {
        return paymentService.queryZaloPayStatus(appTransId);
    },

    async getTransactions(params: PaymentFilterParams = {}): Promise<PaymentTransaction[]> {
        const orders = await fetchAllOrdersFromBackend();

        const paymentLists = await Promise.all(
            orders.map(async (order) => {
                const payments = await paymentService.getPaymentsByOrder(order.id);
                return { order, payments };
            })
        );

        let result: PaymentTransaction[] = [];

        for (const { order, payments } of paymentLists) {
            for (const p of payments) {
                const method = normalizeMethodCode(p.paymentMethodCode);
                const status = normalizePaymentStatus(p.status);
                const displayTime =
                    p.paidAt || p.lastModifiedDate || p.createdDate || order.createdDate || '';

                result.push({
                    id: p.id,
                    transactionCode: p.transactionCode || `PAY-${p.id}`,
                    orderId: p.orderId ?? order.id,
                    orderCode: p.orderCode || order.code || `ORD-${order.id}`,
                    orderStatus: order.status,
                    customerName:
                        order.recipientName ||
                        order.customerName ||
                        `Khách hàng #${order.userId || order.id}`,
                    customerPhone: order.recipientPhone || order.customerPhone || '—',
                    customerEmail: order.customerEmail || undefined,
                    paymentMethodId: p.paymentMethodId ?? null,
                    method,
                    paymentMethodName:
                        p.paymentMethodName ||
                        (method === 'ZALOPAY'
                            ? 'Thanh toán trực tuyến ZaloPay'
                            : 'Thanh toán khi nhận hàng (COD)'),
                    amount: p.amount ?? order.finalAmount ?? order.totalAmount ?? 0,
                    status,
                    paidAt: p.paidAt ?? null,
                    createdDate: p.createdDate ?? order.createdDate ?? null,
                    lastModifiedDate: p.lastModifiedDate ?? null,
                    displayTime,
                });
            }
        }

        if (params.keyword && params.keyword.trim()) {
            const q = params.keyword.trim().toLowerCase();
            result = result.filter(
                (t) =>
                    t.transactionCode.toLowerCase().includes(q) ||
                    t.orderCode.toLowerCase().includes(q) ||
                    t.customerName.toLowerCase().includes(q) ||
                    t.customerPhone.toLowerCase().includes(q) ||
                    t.paymentMethodName.toLowerCase().includes(q)
            );
        }

        if (params.status && params.status !== 'ALL') {
            result = result.filter((t) => t.status === params.status);
        }

        if (params.method && params.method !== 'ALL') {
            result = result.filter((t) => t.method === params.method);
        }

        if (params.dateRange && params.dateRange !== 'ALL') {
            const now = new Date();
            let threshold = new Date(0);
            if (params.dateRange === 'today') {
                threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            } else if (params.dateRange === '7days') {
                threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (params.dateRange === '30days') {
                threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            result = result.filter((t) => t.displayTime && new Date(t.displayTime) >= threshold);
        }

        if (params.startDate) {
            const start = new Date(params.startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((t) => t.displayTime && new Date(t.displayTime) >= start);
        }

        if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((t) => t.displayTime && new Date(t.displayTime) <= end);
        }

        result.sort((a, b) => {
            const timeDiff =
                (b.displayTime ? new Date(b.displayTime).getTime() : 0) -
                (a.displayTime ? new Date(a.displayTime).getTime() : 0);
            if (timeDiff !== 0) return timeDiff;
            return b.id - a.id;
        });

        return result;
    },

    async getEligibleOrdersForPayment(): Promise<OrderResponse[]> {
        const orders = await fetchAllOrdersFromBackend();
        return orders.filter(
            (o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED' && o.status !== 'RETURNED'
        );
    },

    computeStats(list: PaymentTransaction[]): PaymentStats {
        const todayStr = new Date().toISOString().split('T')[0];
        let todayTransactions = 0;
        let successCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        let totalSuccessAmount = 0;
        let totalPendingAmount = 0;

        for (const t of list) {
            if (t.displayTime && t.displayTime.startsWith(todayStr)) {
                todayTransactions++;
            }
            if (t.status === 'SUCCESS') {
                successCount++;
                totalSuccessAmount += t.amount || 0;
            } else if (t.status === 'PENDING') {
                pendingCount++;
                totalPendingAmount += t.amount || 0;
            } else if (t.status === 'FAILED') {
                failedCount++;
            }
        }

        return {
            totalTransactions: list.length,
            todayTransactions,
            successCount,
            pendingCount,
            failedCount,
            totalSuccessAmount,
            totalPendingAmount,
        };
    },

    exportToCsv(list: PaymentTransaction[]): void {
        const headers = [
            'ID',
            'Mã Giao Dịch',
            'Mã Đơn Hàng',
            'Khách Hàng',
            'Số Điện Thoại',
            'Phương Thức',
            'Tên Phương Thức',
            'Số Tiền (VND)',
            'Trạng Thái',
            'Thời Gian Thanh Toán',
            'Thời Gian Tạo',
        ];

        const rows = list.map((t) => [
            t.id,
            t.transactionCode,
            t.orderCode,
            `"${(t.customerName || '').replace(/"/g, '""')}"`,
            `"${t.customerPhone || ''}"`,
            t.method,
            `"${(t.paymentMethodName || '').replace(/"/g, '""')}"`,
            t.amount,
            t.status,
            t.paidAt ? new Date(t.paidAt).toLocaleString('vi-VN') : '',
            t.createdDate ? new Date(t.createdDate).toLocaleString('vi-VN') : '',
        ]);

        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `giao_dich_thanh_toan_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    printReceipt(txn: PaymentTransaction): void {
        const win = window.open('', '_blank', 'width=720,height=640');
        if (!win) return;
        win.opener = null;

        const statusLabel =
            txn.status === 'SUCCESS'
                ? 'Đã thanh toán (SUCCESS)'
                : txn.status === 'FAILED'
                ? 'Thất bại / Đã hủy (FAILED)'
                : 'Chờ thanh toán (PENDING)';

        const timeDisplay = txn.displayTime
            ? new Date(txn.displayTime).toLocaleString('vi-VN')
            : '—';

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Biên lai thanh toán ${escapeHtml(txn.transactionCode)}</title>
<style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #111827; font-size: 13px; }
    .box { max-width: 600px; margin: 0 auto; border: 1px solid #d1d5db; border-radius: 10px; padding: 24px 28px; }
    .top { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
    .title { text-align: center; font-size: 18px; font-weight: 800; margin: 10px 0 16px; text-transform: uppercase; }
    .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #e5e7eb; }
    .label { color: #6b7280; }
    .val { font-weight: 700; text-align: right; }
    .amount { font-size: 18px; color: #059669; }
    .footer { margin-top: 28px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; }
</style>
</head>
<body>
<div class="box">
    <div class="top">
        <div>
            <div style="font-size:16px;font-weight:800;color:#1d4ed8;">PC STORE VIETNAM</div>
            <div style="font-size:11px;color:#6b7280;">128 Thái Hà, Đống Đa, Hà Nội • 1900 1903</div>
        </div>
        <div style="text-align:right;font-size:11px;color:#4b5563;">
            <div>Mã GD: <strong style="font-family:monospace;">${escapeHtml(txn.transactionCode)}</strong></div>
            <div>${escapeHtml(timeDisplay)}</div>
        </div>
    </div>
    <div class="title">BIÊN LAI XÁC NHẬN THANH TOÁN</div>
    <div class="row"><span class="label">Mã đơn hàng:</span><span class="val">${escapeHtml(txn.orderCode)}</span></div>
    <div class="row"><span class="label">Khách hàng:</span><span class="val">${escapeHtml(txn.customerName)} (${escapeHtml(txn.customerPhone)})</span></div>
    <div class="row"><span class="label">Phương thức:</span><span class="val">${escapeHtml(txn.paymentMethodName)} (${escapeHtml(txn.method)})</span></div>
    <div class="row"><span class="label">Trạng thái:</span><span class="val">${escapeHtml(statusLabel)}</span></div>
    <div class="row"><span class="label">Số tiền thanh toán:</span><span class="val amount">${escapeHtml(formatVND(txn.amount))}</span></div>
    <div class="footer">
        <div style="width:45%;"><strong>Người nộp tiền</strong><br/><span style="color:#6b7280;font-style:italic;">(Ký, ghi rõ họ tên)</span></div>
        <div style="width:45%;"><strong>Thu ngân / Kế toán</strong><br/><span style="color:#6b7280;font-style:italic;">(Ký, đóng dấu)</span></div>
    </div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };</script>
</body>
</html>`;
        win.document.open();
        win.document.write(html);
        win.document.close();
    },
};
