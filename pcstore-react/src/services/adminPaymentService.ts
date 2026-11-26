import { adminOrderService } from './adminOrderService';
import { systemLogService } from './systemLogService';
import { escapeHtml } from '../utils/sanitize';
import type {
    CreatePaymentPayload,
    PaymentFilterParams,
    PaymentMethodCode,
    PaymentMethodConfig,
    PaymentStats,
    PaymentTransaction,
    PaymentTransactionStatus,
} from '../types/adminPayment';
import type { OrderResponse } from '../types/adminOrder';

const TXN_STORAGE_KEY = 'pcstore_admin_payments_v1';
const METHOD_CONFIG_STORAGE_KEY = 'pcstore_admin_payment_methods_v1';

function createRelativeDate(hoursAgo: number, minutesAgo = 0): string {
    const d = new Date(Date.now() - (hoursAgo * 3600 + minutesAgo * 60) * 1000);
    return d.toISOString();
}

export function formatVND(val: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(val || 0);
}

function getCurrentLogActor() {
    try {
        const raw = localStorage.getItem('pcstore_user');
        if (raw) {
            const u = JSON.parse(raw);
            return {
                id: String(u.id || '1'),
                username: u.username || 'admin',
                fullName: u.fullName || u.username || 'Quản trị viên',
                role: u.role || 'ADMIN',
                email: u.email || undefined,
                avatar: u.avatar || undefined,
            };
        }
    } catch {
        // ignore
    }
    return {
        id: '1',
        username: 'admin',
        fullName: 'Quản trị viên',
        role: 'ADMIN',
    };
}

const DEFAULT_METHOD_CONFIGS: PaymentMethodConfig[] = [
    {
        id: 'PM-VNPAY',
        code: 'VNPAY',
        name: 'Cổng thanh toán VNPAY QR / ATM / Visa',
        shortDescription: 'Thanh toán trực tuyến qua mã VNPAY-QR, thẻ ATM nội địa và thẻ quốc tế Visa/Mastercard.',
        enabled: true,
        environment: 'SANDBOX',
        feePercent: 1.1,
        minAmount: 10000,
        maxAmount: 500000000,
        merchantCode: 'PCSTORE2026',
        bankName: 'VNPAY Gateway',
        displayOrder: 1,
        updatedAt: createRelativeDate(24, 0),
    },
    {
        id: 'PM-BANK',
        code: 'BANK_TRANSFER',
        name: 'Chuyển khoản ngân hàng (VietQR 24/7)',
        shortDescription: 'Chuyển khoản nhanh Napas 247 bằng mã VietQR tự động điền số tiền và mã đơn hàng.',
        enabled: true,
        environment: 'PRODUCTION',
        feePercent: 0,
        minAmount: 50000,
        maxAmount: 2000000000,
        bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        accountNumber: '102899998888',
        accountHolder: 'CONG TY TNHH CONG NGHE PC STORE',
        bankBranch: 'Chi nhánh Sở Giao Dịch - Hà Nội',
        displayOrder: 2,
        updatedAt: createRelativeDate(48, 0),
    },
    {
        id: 'PM-CASH',
        code: 'CASH',
        name: 'Tiền mặt tại quầy Showroom (CASH)',
        shortDescription: 'Khách hàng thanh toán trực tiếp bằng tiền mặt tại thu ngân showroom PCStore.',
        enabled: true,
        environment: 'PRODUCTION',
        feePercent: 0,
        minAmount: 0,
        maxAmount: 100000000,
        displayOrder: 3,
        updatedAt: createRelativeDate(72, 0),
    },
    {
        id: 'PM-CARD',
        code: 'CARD',
        name: 'Quẹt thẻ POS / Trả góp 0% (CARD)',
        shortDescription: 'Hỗ trợ quẹt thẻ Visa, Mastercard, JCB và chuyển đổi trả góp 0% qua máy mPOS tại cửa hàng.',
        enabled: true,
        environment: 'PRODUCTION',
        feePercent: 1.5,
        minAmount: 100000,
        maxAmount: 300000000,
        bankName: 'mPOS / Techcombank POS',
        displayOrder: 4,
        updatedAt: createRelativeDate(96, 0),
    },
    {
        id: 'PM-COD',
        code: 'COD',
        name: 'Thanh toán khi nhận hàng (COD)',
        shortDescription: 'Đơn vị vận chuyển thu hộ tiền mặt khi giao linh kiện PC tới địa chỉ khách hàng.',
        enabled: true,
        environment: 'PRODUCTION',
        feePercent: 0.5,
        minAmount: 0,
        maxAmount: 50000000,
        displayOrder: 5,
        updatedAt: createRelativeDate(120, 0),
    },
];

const SEED_TRANSACTIONS: PaymentTransaction[] = [
    {
        id: 'TXN-SEED-01',
        transactionCode: 'TXN-20261119-90412',
        gatewayRef: 'VNP14582910',
        orderCode: 'ORD-20261119-002',
        customerName: 'Trần Thị Hồng Nhung',
        customerPhone: '0912345678',
        customerEmail: 'nhung.tth@gmail.com',
        method: 'VNPAY',
        bankName: 'NCB / VNPAY QR',
        amount: 24000000,
        feeAmount: 264000,
        status: 'SUCCESS',
        reconciled: true,
        gatewayResponseCode: '00',
        gatewayMessage: 'Giao dịch thành công (Approved)',
        paidAt: createRelativeDate(0, 35),
        note: 'Thanh toán thành công qua cổng VNPAY QR.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-02',
        transactionCode: 'TXN-20261119-90411',
        gatewayRef: 'FT26323819201',
        orderCode: 'ORD-20261119-001',
        customerName: 'Nguyễn Minh Quân',
        customerPhone: '0987654321',
        customerEmail: 'quan.nm@techcorp.vn',
        method: 'BANK_TRANSFER',
        bankName: 'Vietcombank',
        amount: 53480000,
        feeAmount: 0,
        status: 'SUCCESS',
        reconciled: true,
        gatewayResponseCode: '00',
        gatewayMessage: 'Đã nhận báo có tài khoản VCB 102899998888',
        paidAt: createRelativeDate(2, 10),
        note: 'Khách doanh nghiệp chuyển khoản đủ theo hợp đồng.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-03',
        transactionCode: 'TXN-20261118-89945',
        gatewayRef: 'PENDING-VCB-014',
        orderCode: 'ORD-20261118-014',
        customerName: 'Lê Hoàng Việt',
        customerPhone: '0938112233',
        customerEmail: 'viet.lh@studio3d.vn',
        method: 'BANK_TRANSFER',
        bankName: 'Techcombank',
        amount: 38000000,
        feeAmount: 0,
        status: 'PENDING',
        reconciled: false,
        gatewayMessage: 'Chờ kế toán xác nhận sao kê chuyển khoản',
        paidAt: createRelativeDate(18, 25),
        note: 'Khách đã gửi ảnh UNC, chờ tiền nổi trên tài khoản công ty.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-04',
        transactionCode: 'TXN-20261118-89912',
        gatewayRef: 'VNP14579004',
        orderCode: 'ORD-20261118-011',
        customerName: 'Hoàng Việt Khoa',
        customerPhone: '0966223344',
        customerEmail: 'khoa.hv@gmail.com',
        method: 'VNPAY',
        bankName: 'MB Bank',
        amount: 18990000,
        feeAmount: 0,
        status: 'FAILED',
        reconciled: false,
        gatewayResponseCode: '51',
        gatewayMessage: 'Tài khoản không đủ số dư để thực hiện giao dịch',
        paidAt: createRelativeDate(26, 40),
        note: 'Khách hủy bước nhập OTP trên VNPAY.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-05',
        transactionCode: 'TXN-20261117-89530',
        gatewayRef: 'POS-TCB-44182',
        orderCode: 'ORD-20261117-009',
        customerName: 'Phạm Đức Anh',
        customerPhone: '0977889900',
        customerEmail: 'ducanh.pham@gmail.com',
        method: 'CARD',
        bankName: 'Visa / Techcombank POS',
        amount: 12450000,
        feeAmount: 186750,
        status: 'SUCCESS',
        reconciled: true,
        gatewayResponseCode: '00',
        gatewayMessage: 'Thanh toán POS thành công (Batch #042)',
        paidAt: createRelativeDate(44, 15),
        note: 'Quẹt thẻ Visa tại showroom Thái Hà.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-06',
        transactionCode: 'TXN-20261116-89201',
        gatewayRef: 'CASH-SR1-108',
        orderCode: 'ORD-20261116-005',
        customerName: 'Đặng Bảo Long',
        customerPhone: '0909887766',
        method: 'CASH',
        bankName: 'Quầy thu ngân Showroom 1',
        amount: 8750000,
        feeAmount: 0,
        status: 'SUCCESS',
        reconciled: true,
        paidAt: createRelativeDate(68, 0),
        note: 'Thu tiền mặt tại quầy, đã nộp két cuối ca.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-07',
        transactionCode: 'TXN-20261115-88914',
        gatewayRef: 'VNP14560122',
        orderCode: 'ORD-20261115-021',
        customerName: 'Vũ Quang Huy',
        customerPhone: '0904556677',
        customerEmail: 'huy.vq@gmail.com',
        method: 'VNPAY',
        bankName: 'VietinBank',
        amount: 9000000,
        feeAmount: 99000,
        refundedAmount: 9000000,
        refundReason: 'Khách hủy đơn để nâng cấp sang cấu hình RTX 4080 Super.',
        status: 'REFUNDED',
        reconciled: true,
        gatewayResponseCode: '00',
        gatewayMessage: 'Đã hoàn tiền 100% về thẻ gốc khách hàng',
        paidAt: createRelativeDate(95, 30),
        note: 'Hoàn tiền toàn phần theo phiếu yêu cầu HT-2026-019.',
        source: 'SEED',
    },
    {
        id: 'TXN-SEED-08',
        transactionCode: 'TXN-20261114-88603',
        gatewayRef: 'GHN-COD-77812',
        orderCode: 'ORD-20261114-018',
        customerName: 'Bùi Thanh Tùng',
        customerPhone: '0944551122',
        method: 'COD',
        bankName: 'Giao Hàng Nhanh (GHN)',
        amount: 15200000,
        feeAmount: 76000,
        status: 'PENDING',
        reconciled: false,
        gatewayMessage: 'ĐVVC đã thu hộ, chờ phiên đối soát COD thứ 6',
        paidAt: createRelativeDate(115, 0),
        note: 'Chờ tiền COD từ ví đối tác GHN về tài khoản.',
        source: 'SEED',
    },
];

function readStoredTransactions(): PaymentTransaction[] {
    try {
        const raw = localStorage.getItem(TXN_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // ignore
    }
    localStorage.setItem(TXN_STORAGE_KEY, JSON.stringify(SEED_TRANSACTIONS));
    return [...SEED_TRANSACTIONS];
}

function saveStoredTransactions(list: PaymentTransaction[]) {
    try {
        localStorage.setItem(TXN_STORAGE_KEY, JSON.stringify(list));
    } catch {
        // ignore
    }
}

function readMethodConfigs(): PaymentMethodConfig[] {
    try {
        const raw = localStorage.getItem(METHOD_CONFIG_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // ignore
    }
    localStorage.setItem(METHOD_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_METHOD_CONFIGS));
    return [...DEFAULT_METHOD_CONFIGS];
}

function saveMethodConfigs(list: PaymentMethodConfig[]) {
    try {
        localStorage.setItem(METHOD_CONFIG_STORAGE_KEY, JSON.stringify(list));
    } catch {
        // ignore
    }
}

export const adminPaymentService = {
    async getTransactions(params: PaymentFilterParams = {}): Promise<PaymentTransaction[]> {
        await new Promise((r) => setTimeout(r, 60));
        let result = [...readStoredTransactions()];

        if (params.keyword && params.keyword.trim()) {
            const q = params.keyword.trim().toLowerCase();
            result = result.filter(
                (t) =>
                    t.transactionCode.toLowerCase().includes(q) ||
                    (t.gatewayRef && t.gatewayRef.toLowerCase().includes(q)) ||
                    t.orderCode.toLowerCase().includes(q) ||
                    t.customerName.toLowerCase().includes(q) ||
                    t.customerPhone.toLowerCase().includes(q) ||
                    (t.bankName && t.bankName.toLowerCase().includes(q))
            );
        }

        if (params.status && params.status !== 'ALL') {
            result = result.filter((t) => t.status === params.status);
        }

        if (params.method && params.method !== 'ALL') {
            result = result.filter((t) => t.method === params.method);
        }

        if (params.reconciled === 'true') {
            result = result.filter((t) => t.reconciled);
        } else if (params.reconciled === 'false') {
            result = result.filter((t) => !t.reconciled);
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
            result = result.filter((t) => new Date(t.paidAt) >= threshold);
        }

        if (params.startDate) {
            const start = new Date(params.startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((t) => new Date(t.paidAt) >= start);
        }

        if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((t) => new Date(t.paidAt) <= end);
        }

        result.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
        return result;
    },

    async getRecentOrders(): Promise<OrderResponse[]> {
        try {
            const res = await adminOrderService.getAllOrders({ page: 0, size: 50 });
            return res.content || [];
        } catch {
            return [];
        }
    },

    createTransaction(payload: CreatePaymentPayload): PaymentTransaction {
        const now = new Date();
        const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
            now.getDate()
        ).padStart(2, '0')}`;
        const rand = Math.floor(10000 + Math.random() * 90000);

        const configs = readMethodConfigs();
        const methodCfg = configs.find((c) => c.code === payload.method);
        const calcFee =
            payload.feeAmount !== undefined
                ? payload.feeAmount
                : Math.round(((payload.amount || 0) * (methodCfg?.feePercent || 0)) / 100);

        const newTxn: PaymentTransaction = {
            id: `TXN-${Date.now()}`,
            transactionCode: `TXN-${ymd}-${rand}`,
            gatewayRef: payload.gatewayRef?.trim() || `${payload.method}-${rand}`,
            orderCode: payload.orderCode?.trim() || `ORD-${ymd}-MAN`,
            orderId: payload.orderId,
            customerName: payload.customerName.trim(),
            customerPhone: payload.customerPhone.trim(),
            customerEmail: payload.customerEmail?.trim() || undefined,
            method: payload.method,
            bankName: payload.bankName?.trim() || methodCfg?.bankName || payload.method,
            amount: payload.amount,
            feeAmount: calcFee,
            status: payload.status,
            reconciled: payload.reconciled ?? payload.status === 'SUCCESS',
            gatewayResponseCode: payload.status === 'SUCCESS' ? '00' : undefined,
            gatewayMessage:
                payload.status === 'SUCCESS'
                    ? 'Ghi nhận thanh toán thành công'
                    : 'Đang chờ xác nhận thanh toán',
            paidAt: now.toISOString(),
            note: payload.note?.trim() || undefined,
            source: 'MANUAL',
        };

        const list = readStoredTransactions();
        list.unshift(newTxn);
        saveStoredTransactions(list);

        try {
            systemLogService.addLog({
                actor: getCurrentLogActor(),
                action: 'PAYMENT_PROCESS',
                actionTitle: `Ghi nhận giao dịch thanh toán ${newTxn.transactionCode}`,
                module: 'PAYMENT',
                level: 'SUCCESS',
                description: `Ghi nhận thanh toán ${formatVND(newTxn.amount)} qua ${newTxn.method} cho đơn hàng ${newTxn.orderCode} (${newTxn.customerName}).`,
                targetEntity: 'Giao dịch thanh toán',
                targetId: newTxn.transactionCode,
                ipAddress: '127.0.0.1 (Client)',
                userAgent: navigator.userAgent || 'Chrome / Windows',
                endpoint: '/admin/payment',
                httpMethod: 'POST',
                statusCode: 201,
            });
        } catch {
            // ignore
        }

        return newTxn;
    },

    updateTransactionStatus(
        id: string,
        status: PaymentTransactionStatus,
        extra: Partial<PaymentTransaction> = {}
    ): PaymentTransaction | null {
        const list = readStoredTransactions();
        const idx = list.findIndex((t) => t.id === id);
        if (idx === -1) return null;

        const updated: PaymentTransaction = {
            ...list[idx],
            ...extra,
            status,
            reconciled: status === 'SUCCESS' ? true : extra.reconciled ?? list[idx].reconciled,
            gatewayResponseCode:
                status === 'SUCCESS'
                    ? '00'
                    : status === 'FAILED'
                    ? '99'
                    : list[idx].gatewayResponseCode,
        };
        list[idx] = updated;
        saveStoredTransactions(list);

        try {
            systemLogService.addLog({
                actor: getCurrentLogActor(),
                action: 'STATUS_CHANGE',
                actionTitle: `Cập nhật trạng thái thanh toán ${updated.transactionCode} -> ${status}`,
                module: 'PAYMENT',
                level: status === 'FAILED' || status === 'REFUNDED' ? 'WARNING' : 'SUCCESS',
                description: `Giao dịch ${updated.transactionCode} (${formatVND(updated.amount)}) chuyển trạng thái thành ${status}.`,
                targetEntity: 'Giao dịch thanh toán',
                targetId: updated.transactionCode,
                ipAddress: '127.0.0.1 (Client)',
                userAgent: navigator.userAgent || 'Chrome / Windows',
                endpoint: `/admin/payment/${updated.transactionCode}/status`,
                httpMethod: 'PATCH',
                statusCode: 200,
            });
        } catch {
            // ignore
        }

        return updated;
    },

    toggleReconciled(id: string): PaymentTransaction | null {
        const list = readStoredTransactions();
        const idx = list.findIndex((t) => t.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], reconciled: !list[idx].reconciled };
        saveStoredTransactions(list);
        return list[idx];
    },

    getMethodConfigs(): PaymentMethodConfig[] {
        return readMethodConfigs().sort((a, b) => a.displayOrder - b.displayOrder);
    },

    updateMethodConfig(
        code: PaymentMethodCode,
        updates: Partial<PaymentMethodConfig>
    ): PaymentMethodConfig[] {
        const list = readMethodConfigs();
        const idx = list.findIndex((c) => c.code === code);
        if (idx !== -1) {
            list[idx] = {
                ...list[idx],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            saveMethodConfigs(list);

            try {
                systemLogService.addLog({
                    actor: getCurrentLogActor(),
                    action: 'UPDATE',
                    actionTitle: `Cập nhật cấu hình phương thức thanh toán ${list[idx].name}`,
                    module: 'PAYMENT',
                    level: 'INFO',
                    description: `Cập nhật cài đặt cổng thanh toán ${code} (Trạng thái: ${
                        list[idx].enabled ? 'Đang bật' : 'Đã tắt'
                    }, Phí: ${list[idx].feePercent}%).`,
                    targetEntity: 'Cấu hình thanh toán',
                    targetId: code,
                    ipAddress: '127.0.0.1 (Client)',
                    userAgent: navigator.userAgent || 'Chrome / Windows',
                    endpoint: `/admin/payment/methods/${code}`,
                    httpMethod: 'PUT',
                    statusCode: 200,
                });
            } catch {
                // ignore
            }
        }
        return list;
    },

    computeStats(list: PaymentTransaction[]): PaymentStats {
        const todayStr = new Date().toISOString().split('T')[0];
        let todayTransactions = 0;
        let successCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        let refundedCount = 0;
        let totalSuccessAmount = 0;
        let totalPendingAmount = 0;
        let totalRefundedAmount = 0;
        let totalFeeAmount = 0;

        for (const t of list) {
            if (t.paidAt && t.paidAt.startsWith(todayStr)) {
                todayTransactions++;
            }
            if (t.status === 'SUCCESS') {
                successCount++;
                totalSuccessAmount += t.amount || 0;
                totalFeeAmount += t.feeAmount || 0;
            } else if (t.status === 'PENDING') {
                pendingCount++;
                totalPendingAmount += t.amount || 0;
            } else if (t.status === 'FAILED') {
                failedCount++;
            } else if (t.status === 'REFUNDED') {
                refundedCount++;
                totalRefundedAmount += t.refundedAmount || t.amount || 0;
            }
        }

        return {
            totalTransactions: list.length,
            todayTransactions,
            successCount,
            pendingCount,
            failedCount,
            refundedCount,
            totalSuccessAmount,
            totalPendingAmount,
            totalRefundedAmount,
            totalFeeAmount,
        };
    },

    exportToCsv(list: PaymentTransaction[]): void {
        const headers = [
            'Mã Giao Dịch',
            'Mã Tham Chiếu Cổng',
            'Thời Gian',
            'Mã Đơn Hàng',
            'Khách Hàng',
            'Số Điện Thoại',
            'Phương Thức',
            'Ngân Hàng / Kênh',
            'Số Tiền (VND)',
            'Phí GD (VND)',
            'Số Tiền Hoàn (VND)',
            'Trạng Thái',
            'Đối Soát',
        ];

        const rows = list.map((t) => [
            t.transactionCode,
            t.gatewayRef || '',
            new Date(t.paidAt).toLocaleString('vi-VN'),
            t.orderCode,
            `"${(t.customerName || '').replace(/"/g, '""')}"`,
            `"${t.customerPhone || ''}"`,
            t.method,
            `"${(t.bankName || '').replace(/"/g, '""')}"`,
            t.amount,
            t.feeAmount,
            t.refundedAmount || 0,
            t.status,
            t.reconciled ? 'Đã đối soát' : 'Chưa đối soát',
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
            <div>${escapeHtml(new Date(txn.paidAt).toLocaleString('vi-VN'))}</div>
        </div>
    </div>
    <div class="title">BIÊN LAI XÁC NHẬN THANH TOÁN</div>
    <div class="row"><span class="label">Mã đơn hàng:</span><span class="val">${escapeHtml(txn.orderCode)}</span></div>
    <div class="row"><span class="label">Khách hàng:</span><span class="val">${escapeHtml(txn.customerName)} (${escapeHtml(txn.customerPhone)})</span></div>
    <div class="row"><span class="label">Phương thức:</span><span class="val">${escapeHtml(txn.method)} ${txn.bankName ? `(${escapeHtml(txn.bankName)})` : ''}</span></div>
    <div class="row"><span class="label">Mã tham chiếu cổng:</span><span class="val" style="font-family:monospace;">${escapeHtml(txn.gatewayRef || '—')}</span></div>
    <div class="row"><span class="label">Trạng thái:</span><span class="val">${escapeHtml(txn.status)}</span></div>
    <div class="row"><span class="label">Số tiền thanh toán:</span><span class="val amount">${escapeHtml(formatVND(txn.amount))}</span></div>
    ${txn.note ? `<div class="row"><span class="label">Ghi chú:</span><span class="val" style="font-weight:500;">${escapeHtml(txn.note)}</span></div>` : ''}
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
