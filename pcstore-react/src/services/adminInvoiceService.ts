import { adminAnalyticsService } from './adminAnalyticsService';
import { adminOrderService } from './adminOrderService';
import { systemLogService } from './systemLogService';
import type {
    AdminInvoice,
    CreateInvoicePayload,
    InvoiceFilterParams,
    InvoicePaymentMethod,
    InvoiceStats,
    InvoiceStatus,
    InvoiceType,
} from '../types/adminInvoice';
import type { TaxInvoiceDetailDto } from '../types/adminAnalytics';
import type { OrderResponse } from '../types/adminOrder';

const MANUAL_INVOICES_KEY = 'pcstore_admin_invoices_manual_v1';
const INVOICE_OVERRIDES_KEY = 'pcstore_admin_invoices_overrides_v1';

interface InvoiceOverride {
    invoiceType?: InvoiceType;
    companyName?: string;
    taxCode?: string;
    companyAddress?: string;
    customerEmail?: string;
    customerAddress?: string;
    paymentMethod?: InvoicePaymentMethod;
    status?: InvoiceStatus;
    eInvoiceStatus?: 'ISSUED' | 'DRAFT' | 'CANCELLED';
    note?: string;
    taxRate?: number;
    taxAmount?: number;
}

function createRelativeDate(hoursAgo: number, minutesAgo = 0): string {
    const d = new Date(Date.now() - (hoursAgo * 3600 + minutesAgo * 60) * 1000);
    return d.toISOString();
}

const SEED_INVOICES: AdminInvoice[] = [
    {
        id: 'SEED-HD-01',
        invoiceId: 1001,
        invoiceCode: 'HD-20261119-A8F21C',
        orderCode: 'ORD-20261119-001',
        invoiceDate: createRelativeDate(1, 20),
        customerName: 'Nguyễn Minh Quân',
        customerPhone: '0987654321',
        customerEmail: 'quan.nm@techcorp.vn',
        customerAddress: 'Tầng 12, Tòa nhà Keangnam Landmark 72, Nam Từ Liêm, Hà Nội',
        invoiceType: 'VAT_COMPANY',
        companyName: 'Công ty Cổ phần Giải pháp Công nghệ TechCorp Việt Nam',
        taxCode: '0109482716',
        companyAddress: 'Tầng 12, Tòa nhà Keangnam Landmark 72, Nam Từ Liêm, Hà Nội',
        paymentMethod: 'BANK_TRANSFER',
        totalAmount: 54980000,
        discountAmount: 1500000,
        taxRate: 8,
        taxAmount: 4278400,
        amount: 53480000,
        status: 'PAID',
        eInvoiceStatus: 'ISSUED',
        note: 'Xuất hóa đơn GTGT điện tử gửi qua email kế toán trong ngày.',
        source: 'SEED',
        items: [
            {
                id: 1,
                productCode: 'VGA-ASUS-4080S',
                productName: 'Card màn hình ASUS ROG Strix GeForce RTX 4080 Super 16GB GDDR6X',
                quantity: 1,
                unitPrice: 32990000,
                discountAmount: 1000000,
                subtotal: 31990000,
            },
            {
                id: 2,
                productCode: 'CPU-INT-14900K',
                productName: 'CPU Intel Core i9-14900K (3.2GHz Turbo 6.0GHz, 24 nhân 32 luồng)',
                quantity: 1,
                unitPrice: 15490000,
                discountAmount: 500000,
                subtotal: 14990000,
            },
            {
                id: 3,
                productCode: 'RAM-GSK-64GB',
                productName: 'RAM G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6000MHz',
                quantity: 1,
                unitPrice: 6500000,
                discountAmount: 0,
                subtotal: 6500000,
            },
        ],
    },
    {
        id: 'SEED-HD-02',
        invoiceId: 1002,
        invoiceCode: 'HD-20261119-B4D90E',
        orderCode: 'ORD-20261119-002',
        invoiceDate: createRelativeDate(3, 45),
        customerName: 'Trần Thị Hồng Nhung',
        customerPhone: '0912345678',
        customerEmail: 'nhung.tth@gmail.com',
        customerAddress: 'Số 45 Ngõ 165 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
        invoiceType: 'RETAIL',
        paymentMethod: 'VNPAY',
        totalAmount: 24500000,
        discountAmount: 500000,
        taxRate: 8,
        taxAmount: 1920000,
        amount: 24000000,
        status: 'PAID',
        eInvoiceStatus: 'ISSUED',
        note: 'Khách thanh toán qua cổng VNPAY QR thành công.',
        source: 'SEED',
        items: [
            {
                id: 1,
                productCode: 'MON-ASUS-XG27',
                productName: 'Màn hình Gaming ASUS ROG Strix XG27ACS 27" 2K IPS 180Hz',
                quantity: 1,
                unitPrice: 8990000,
                discountAmount: 200000,
                subtotal: 8790000,
            },
            {
                id: 2,
                productCode: 'VGA-MSI-4060TI',
                productName: 'Card màn hình MSI GeForce RTX 4060 Ti Gaming X Slim 16GB',
                quantity: 1,
                unitPrice: 15510000,
                discountAmount: 300000,
                subtotal: 15210000,
            },
        ],
    },
    {
        id: 'SEED-HD-03',
        invoiceId: 1003,
        invoiceCode: 'HD-20261118-C7E12F',
        orderCode: 'ORD-20261118-014',
        invoiceDate: createRelativeDate(22, 10),
        customerName: 'Lê Hoàng Việt',
        customerPhone: '0938112233',
        customerEmail: 'viet.lh@studio3d.vn',
        customerAddress: '284 Hoàng Quốc Việt, Bắc Từ Liêm, Hà Nội',
        invoiceType: 'VAT_COMPANY',
        companyName: 'Công ty TNHH Thiết kế Đồ họa Studio 3D',
        taxCode: '0108391024',
        companyAddress: '284 Hoàng Quốc Việt, Bắc Từ Liêm, Hà Nội',
        paymentMethod: 'BANK_TRANSFER',
        totalAmount: 38900000,
        discountAmount: 900000,
        taxRate: 10,
        taxAmount: 3800000,
        amount: 38000000,
        status: 'PENDING',
        eInvoiceStatus: 'DRAFT',
        note: 'Chờ kế toán doanh nghiệp xác nhận chuyển khoản công nợ.',
        source: 'SEED',
        items: [
            {
                id: 1,
                productCode: 'PC-WORK-PRO01',
                productName: 'Bộ PC Workstation Render 3D Core i7-14700K / RTX 4070 Super / 32GB DDR5',
                quantity: 1,
                unitPrice: 38900000,
                discountAmount: 900000,
                subtotal: 38000000,
            },
        ],
    },
    {
        id: 'SEED-HD-04',
        invoiceId: 1004,
        invoiceCode: 'HD-20261117-D9A44B',
        orderCode: 'ORD-20261117-009',
        invoiceDate: createRelativeDate(48, 30),
        customerName: 'Phạm Đức Anh',
        customerPhone: '0977889900',
        customerEmail: 'ducanh.pham@gmail.com',
        customerAddress: '112 Thái Hà, Đống Đa, Hà Nội',
        invoiceType: 'RETAIL',
        paymentMethod: 'CASH',
        totalAmount: 12450000,
        discountAmount: 0,
        taxRate: 8,
        taxAmount: 996000,
        amount: 12450000,
        status: 'PAID',
        eInvoiceStatus: 'ISSUED',
        note: 'Mua trực tiếp tại showroom Thái Hà.',
        source: 'SEED',
        items: [
            {
                id: 1,
                productCode: 'MAIN-ASUS-Z790',
                productName: 'Bo mạch chủ ASUS TUF GAMING Z790-PLUS WIFI DDR5',
                quantity: 1,
                unitPrice: 6850000,
                discountAmount: 0,
                subtotal: 6850000,
            },
            {
                id: 2,
                productCode: 'SSD-SAM-990PRO',
                productName: 'Ổ cứng SSD Samsung 990 PRO 2TB M.2 NVMe PCIe Gen4',
                quantity: 1,
                unitPrice: 5600000,
                discountAmount: 0,
                subtotal: 5600000,
            },
        ],
    },
    {
        id: 'SEED-HD-05',
        invoiceId: 1005,
        invoiceCode: 'HD-20261115-E3C81A',
        orderCode: 'ORD-20261115-021',
        invoiceDate: createRelativeDate(96, 0),
        customerName: 'Vũ Quang Huy',
        customerPhone: '0904556677',
        customerEmail: 'huy.vq@gmail.com',
        customerAddress: 'Số 8 Lê Văn Lương, Thanh Xuân, Hà Nội',
        invoiceType: 'RETAIL',
        paymentMethod: 'COD',
        totalAmount: 9200000,
        discountAmount: 200000,
        taxRate: 8,
        taxAmount: 720000,
        amount: 9000000,
        status: 'CANCELED',
        eInvoiceStatus: 'CANCELLED',
        note: 'Hủy hóa đơn do khách hàng đổi sang cấu hình khác cao hơn.',
        source: 'SEED',
        items: [
            {
                id: 1,
                productCode: 'PSU-COR-RM1000E',
                productName: 'Nguồn máy tính Corsair RM1000e 1000W 80 Plus Gold Full Modular',
                quantity: 1,
                unitPrice: 4400000,
                discountAmount: 100000,
                subtotal: 4300000,
            },
            {
                id: 2,
                productCode: 'CASE-NZXT-H9',
                productName: 'Vỏ case NZXT H9 Flow Dual-Chamber Mid-Tower Black',
                quantity: 1,
                unitPrice: 4800000,
                discountAmount: 100000,
                subtotal: 4700000,
            },
        ],
    },
];

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

function readManualInvoices(): AdminInvoice[] {
    try {
        const raw = localStorage.getItem(MANUAL_INVOICES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // ignore
    }
    return [];
}

function saveManualInvoices(list: AdminInvoice[]) {
    try {
        localStorage.setItem(MANUAL_INVOICES_KEY, JSON.stringify(list));
    } catch {
        // ignore
    }
}

function readOverrides(): Record<string, InvoiceOverride> {
    try {
        const raw = localStorage.getItem(INVOICE_OVERRIDES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        }
    } catch {
        // ignore
    }
    return {};
}

function saveOverrides(map: Record<string, InvoiceOverride>) {
    try {
        localStorage.setItem(INVOICE_OVERRIDES_KEY, JSON.stringify(map));
    } catch {
        // ignore
    }
}

function normalizeInvoiceStatus(raw?: string | null): InvoiceStatus {
    const upper = (raw || '').toUpperCase();
    if (upper === 'PENDING' || upper === '0') return 'PENDING';
    if (upper === 'CANCELED' || upper === 'CANCELLED' || upper === '1') return 'CANCELED';
    return 'PAID';
}

function mapTaxDtoToAdminInvoice(dto: TaxInvoiceDetailDto, override?: InvoiceOverride): AdminInvoice {
    const id = `BE-${dto.invoiceId}`;
    const status: InvoiceStatus = override?.status || normalizeInvoiceStatus(dto.status);
    const taxAmount = override?.taxAmount !== undefined ? override.taxAmount : dto.vatAmount || 0;
    const taxRate =
        override?.taxRate !== undefined
            ? override.taxRate
            : dto.amount > 0 && taxAmount > 0
            ? Math.round((taxAmount / dto.amount) * 100)
            : 8;

    return {
        id,
        invoiceId: dto.invoiceId,
        invoiceCode: dto.invoiceCode,
        orderCode: dto.orderCode,
        invoiceDate: dto.invoiceDate || new Date().toISOString(),
        customerName: dto.customerName || 'Khách lẻ',
        customerPhone: dto.customerPhone || '—',
        customerEmail: override?.customerEmail,
        customerAddress: override?.customerAddress,
        invoiceType: override?.invoiceType || 'RETAIL',
        companyName: override?.companyName,
        taxCode: override?.taxCode,
        companyAddress: override?.companyAddress,
        paymentMethod: override?.paymentMethod || 'BANK_TRANSFER',
        totalAmount: dto.totalAmount || 0,
        discountAmount: dto.discountAmount || 0,
        taxRate,
        taxAmount,
        amount: dto.amount || 0,
        status,
        eInvoiceStatus:
            override?.eInvoiceStatus ||
            (status === 'PAID' ? 'ISSUED' : status === 'CANCELED' ? 'CANCELLED' : 'DRAFT'),
        note: override?.note,
        items: [],
        source: 'BACKEND',
    };
}

/**
 * Đọc số tiền VND bằng chữ tiếng Việt (dùng cho bản in hóa đơn)
 */
export function numberToVietnameseWords(amount: number): string {
    const n = Math.round(Math.abs(amount || 0));
    if (n === 0) return 'Không đồng';

    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    function readTriple(num: number, full: boolean): string {
        const hundred = Math.floor(num / 100);
        const ten = Math.floor((num % 100) / 10);
        const one = num % 10;
        let res = '';

        if (hundred > 0 || full) {
            res += digits[hundred] + ' trăm';
            if (ten === 0 && one > 0) res += ' linh';
        }
        if (ten > 1) {
            res += (res ? ' ' : '') + digits[ten] + ' mươi';
            if (one === 1) res += ' mốt';
            else if (one === 5) res += ' lăm';
            else if (one > 0) res += ' ' + digits[one];
        } else if (ten === 1) {
            res += (res ? ' ' : '') + 'mười';
            if (one === 5) res += ' lăm';
            else if (one > 0) res += ' ' + digits[one];
        } else if (one > 0) {
            res += (res ? ' ' : '') + digits[one];
        }
        return res;
    }

    const groups: number[] = [];
    let temp = n;
    while (temp > 0) {
        groups.push(temp % 1000);
        temp = Math.floor(temp / 1000);
    }

    const parts: string[] = [];
    for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] > 0) {
            const isFull = i < groups.length - 1;
            parts.push(readTriple(groups[i], isFull) + (units[i] ? ' ' + units[i] : ''));
        }
    }

    const sentence = parts.join(' ').trim() + ' đồng chẵn./.';
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function formatVND(val: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(val || 0);
}

export const adminInvoiceService = {
    /**
     * Lấy danh sách hóa đơn từ Backend (/api/analytics/tax/invoices) kết hợp hóa đơn thủ công & bộ lọc
     */
    async getInvoices(params: InvoiceFilterParams = {}): Promise<{
        invoices: AdminInvoice[];
        fromBackend: boolean;
    }> {
        const overrides = readOverrides();
        const manualInvoices = readManualInvoices();
        let backendInvoices: AdminInvoice[] = [];
        let fromBackend = false;

        try {
            const currentYear = new Date().getFullYear();
            const pageRes = await adminAnalyticsService.getTaxInvoices(
                { year: currentYear },
                0,
                200,
                'invoiceDate,desc'
            );
            if (pageRes && Array.isArray(pageRes.content)) {
                fromBackend = true;
                backendInvoices = pageRes.content.map((dto) =>
                    mapTaxDtoToAdminInvoice(dto, overrides[`BE-${dto.invoiceId}`])
                );
            }
        } catch {
            // Fallback gracefully if BE is offline or unauthorized
            fromBackend = false;
        }

        let merged: AdminInvoice[] = [];
        if (backendInvoices.length > 0) {
            merged = [...manualInvoices, ...backendInvoices];
        } else {
            // Apply overrides to seed invoices so user edits persist smoothly even without BE records
            const hydratedSeed = SEED_INVOICES.map((s) => {
                const ov = overrides[s.id];
                return ov ? { ...s, ...ov } : s;
            });
            merged = [...manualInvoices, ...hydratedSeed];
        }

        // Apply filters
        let result = [...merged];

        if (params.keyword && params.keyword.trim()) {
            const q = params.keyword.trim().toLowerCase();
            result = result.filter(
                (inv) =>
                    inv.invoiceCode.toLowerCase().includes(q) ||
                    inv.orderCode.toLowerCase().includes(q) ||
                    inv.customerName.toLowerCase().includes(q) ||
                    inv.customerPhone.toLowerCase().includes(q) ||
                    (inv.companyName && inv.companyName.toLowerCase().includes(q)) ||
                    (inv.taxCode && inv.taxCode.toLowerCase().includes(q)) ||
                    (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q))
            );
        }

        if (params.status && params.status !== 'ALL') {
            result = result.filter((inv) => inv.status === params.status);
        }

        if (params.invoiceType && params.invoiceType !== 'ALL') {
            result = result.filter((inv) => inv.invoiceType === params.invoiceType);
        }

        if (params.paymentMethod && params.paymentMethod !== 'ALL') {
            result = result.filter((inv) => inv.paymentMethod === params.paymentMethod);
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
            } else if (params.dateRange === 'thisMonth') {
                threshold = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            }
            result = result.filter((inv) => new Date(inv.invoiceDate) >= threshold);
        }

        if (params.startDate) {
            const start = new Date(params.startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((inv) => new Date(inv.invoiceDate) >= start);
        }

        if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((inv) => new Date(inv.invoiceDate) <= end);
        }

        result.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

        return { invoices: result, fromBackend };
    },

    /**
     * Nạp chi tiết danh sách sản phẩm từ API Đơn hàng nếu hóa đơn từ BE chưa có line items
     */
    async hydrateInvoiceWithOrder(invoice: AdminInvoice): Promise<AdminInvoice> {
        if (invoice.items && invoice.items.length > 0) {
            return invoice;
        }
        if (!invoice.orderCode) return invoice;

        try {
            const order: OrderResponse = await adminOrderService.getOrderByCode(invoice.orderCode);
            return {
                ...invoice,
                orderId: order.id,
                customerEmail: invoice.customerEmail || order.customerEmail || undefined,
                customerAddress: invoice.customerAddress || order.address || undefined,
                items: (order.items || []).map((it) => ({
                    id: it.id,
                    productCode: it.productCode,
                    productName: it.productName,
                    productImageUrl: it.productImageUrl,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    discountAmount: it.discountAmount,
                    subtotal: it.subtotal,
                })),
            };
        } catch {
            return invoice;
        }
    },

    /**
     * Lấy danh sách đơn hàng gần đây để chọn nhanh khi phát hành hóa đơn mới
     */
    async getRecentOrdersForInvoicing(): Promise<OrderResponse[]> {
        try {
            const res = await adminOrderService.getAllOrders({ page: 0, size: 50 });
            return res.content || [];
        } catch {
            return [];
        }
    },

    /**
     * Tạo / Phát hành hóa đơn mới
     */
    createInvoice(payload: CreateInvoicePayload): AdminInvoice {
        const now = new Date();
        const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
            now.getDate()
        ).padStart(2, '0')}`;
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        const invoiceCode = `HD-${ymd}-${rand}`;

        const taxableAmount = Math.max(0, payload.totalAmount - payload.discountAmount);
        const taxAmount = Math.round((taxableAmount * (payload.taxRate || 0)) / 100);
        const finalAmount = taxableAmount;

        const newInvoice: AdminInvoice = {
            id: `MAN-${Date.now()}`,
            invoiceCode,
            orderCode: payload.orderCode?.trim() || `ORD-${ymd}-MAN`,
            orderId: payload.orderId,
            invoiceDate: now.toISOString(),
            customerName: payload.customerName.trim(),
            customerPhone: payload.customerPhone.trim(),
            customerEmail: payload.customerEmail?.trim() || undefined,
            customerAddress: payload.customerAddress?.trim() || undefined,
            invoiceType: payload.invoiceType,
            companyName: payload.companyName?.trim() || undefined,
            taxCode: payload.taxCode?.trim() || undefined,
            companyAddress: payload.companyAddress?.trim() || undefined,
            paymentMethod: payload.paymentMethod,
            totalAmount: payload.totalAmount,
            discountAmount: payload.discountAmount,
            taxRate: payload.taxRate,
            taxAmount,
            amount: finalAmount,
            status: payload.status,
            eInvoiceStatus:
                payload.status === 'PAID'
                    ? 'ISSUED'
                    : payload.status === 'CANCELED'
                    ? 'CANCELLED'
                    : 'DRAFT',
            note: payload.note?.trim() || undefined,
            items: payload.items || [],
            source: 'MANUAL',
        };

        const existing = readManualInvoices();
        existing.unshift(newInvoice);
        saveManualInvoices(existing);

        try {
            systemLogService.addLog({
                actor: getCurrentLogActor(),
                action: 'CREATE',
                actionTitle: `Phát hành hóa đơn mới ${newInvoice.invoiceCode}`,
                module: 'ORDER',
                level: 'SUCCESS',
                description: `Phát hành hóa đơn ${newInvoice.invoiceCode} (${
                    newInvoice.invoiceType === 'VAT_COMPANY' ? 'Hóa đơn GTGT' : 'Bán lẻ'
                }) cho khách hàng ${newInvoice.customerName} với giá trị ${formatVND(newInvoice.amount)}.`,
                targetEntity: 'Hóa đơn',
                targetId: newInvoice.invoiceCode,
                ipAddress: '127.0.0.1 (Client)',
                userAgent: navigator.userAgent || 'Chrome / Windows',
                endpoint: '/admin/sales/invoices',
                httpMethod: 'POST',
                statusCode: 201,
            });
        } catch {
            // ignore
        }

        return newInvoice;
    },

    /**
     * Cập nhật thông tin hóa đơn (Thông tin VAT, trạng thái, thanh toán, ghi chú)
     */
    updateInvoice(invoice: AdminInvoice, updates: InvoiceOverride): void {
        if (invoice.source === 'MANUAL') {
            const list = readManualInvoices();
            const idx = list.findIndex((i) => i.id === invoice.id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...updates };
                saveManualInvoices(list);
            }
        } else {
            const overrides = readOverrides();
            overrides[invoice.id] = {
                ...(overrides[invoice.id] || {}),
                ...updates,
            };
            saveOverrides(overrides);
        }

        try {
            systemLogService.addLog({
                actor: getCurrentLogActor(),
                action: updates.status ? 'STATUS_CHANGE' : 'UPDATE',
                actionTitle: updates.status
                    ? `Cập nhật trạng thái hóa đơn ${invoice.invoiceCode} -> ${updates.status}`
                    : `Cập nhật thông tin hóa đơn ${invoice.invoiceCode}`,
                module: 'ORDER',
                level: updates.status === 'CANCELED' ? 'WARNING' : 'SUCCESS',
                description: `Đã cập nhật hóa đơn ${invoice.invoiceCode} của khách hàng ${invoice.customerName}.`,
                targetEntity: 'Hóa đơn',
                targetId: invoice.invoiceCode,
                ipAddress: '127.0.0.1 (Client)',
                userAgent: navigator.userAgent || 'Chrome / Windows',
                endpoint: `/admin/sales/invoices/${invoice.invoiceCode}`,
                httpMethod: 'PATCH',
                statusCode: 200,
            });
        } catch {
            // ignore
        }
    },

    /**
     * Tính toán chỉ số KPI từ danh sách hóa đơn
     */
    computeStats(invoices: AdminInvoice[]): InvoiceStats {
        const todayStr = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        let paidCount = 0;
        let pendingCount = 0;
        let canceledCount = 0;
        let vatInvoiceCount = 0;
        let totalPaidAmount = 0;
        let totalPendingAmount = 0;
        let totalTaxAmount = 0;
        let totalDiscountAmount = 0;

        for (const inv of invoices) {
            if (inv.invoiceDate && inv.invoiceDate.startsWith(todayStr)) {
                todayCount++;
            }
            if (inv.invoiceType === 'VAT_COMPANY') {
                vatInvoiceCount++;
            }
            if (inv.status === 'PAID') {
                paidCount++;
                totalPaidAmount += inv.amount || 0;
                totalTaxAmount += inv.taxAmount || 0;
                totalDiscountAmount += inv.discountAmount || 0;
            } else if (inv.status === 'PENDING') {
                pendingCount++;
                totalPendingAmount += inv.amount || 0;
            } else if (inv.status === 'CANCELED') {
                canceledCount++;
            }
        }

        return {
            totalCount: invoices.length,
            todayCount,
            paidCount,
            pendingCount,
            canceledCount,
            vatInvoiceCount,
            totalPaidAmount,
            totalPendingAmount,
            totalTaxAmount,
            totalDiscountAmount,
        };
    },

    /**
     * Xuất danh sách hóa đơn ra file CSV (UTF-8 BOM cho Excel)
     */
    exportToCsv(invoices: AdminInvoice[]): void {
        const headers = [
            'Số Hóa Đơn',
            'Ngày Lập',
            'Mã Đơn Hàng',
            'Loại Hóa Đơn',
            'Khách Hàng',
            'Số Điện Thoại',
            'Tên Doanh Nghiệp',
            'Mã Số Thuế',
            'Phương Thức TT',
            'Tiền Hàng (VND)',
            'Chiết Khấu (VND)',
            'Thuế GTGT (VND)',
            'Tổng Thanh Toán (VND)',
            'Trạng Thái',
        ];

        const rows = invoices.map((inv) => [
            inv.invoiceCode,
            new Date(inv.invoiceDate).toLocaleString('vi-VN'),
            inv.orderCode,
            inv.invoiceType === 'VAT_COMPANY' ? 'Hóa đơn GTGT (VAT)' : 'Hóa đơn bán lẻ',
            `"${(inv.customerName || '').replace(/"/g, '""')}"`,
            `"${inv.customerPhone || ''}"`,
            `"${(inv.companyName || '').replace(/"/g, '""')}"`,
            inv.taxCode || '',
            inv.paymentMethod,
            inv.totalAmount,
            inv.discountAmount,
            inv.taxAmount,
            inv.amount,
            inv.status === 'PAID' ? 'Đã thanh toán' : inv.status === 'PENDING' ? 'Chờ thanh toán' : 'Đã hủy',
        ]);

        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `danh_sach_hoa_don_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        try {
            systemLogService.addLog({
                actor: getCurrentLogActor(),
                action: 'EXPORT',
                actionTitle: `Xuất danh sách ${invoices.length} hóa đơn ra CSV`,
                module: 'ORDER',
                level: 'INFO',
                description: `Đã kết xuất ${invoices.length} hóa đơn tài chính ra tệp CSV.`,
                targetEntity: 'Báo cáo hóa đơn',
                targetId: `EXPORT-${invoices.length}`,
                ipAddress: '127.0.0.1 (Client)',
                userAgent: navigator.userAgent || 'Chrome / Windows',
                endpoint: '/admin/sales/invoices/export',
                httpMethod: 'GET',
                statusCode: 200,
            });
        } catch {
            // ignore
        }
    },

    /**
     * Mở cửa sổ in Hóa đơn khổ A4 chuẩn Việt Nam (VAT / Bán lẻ)
     */
    printInvoice(invoice: AdminInvoice): void {
        const win = window.open('', '_blank', 'width=900,height=780');
        if (!win) return;

        const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

        const itemsHtml =
            invoice.items && invoice.items.length > 0
                ? invoice.items
                      .map(
                          (item, index) => `
                <tr>
                    <td style="text-align:center;">${index + 1}</td>
                    <td>
                        <div style="font-weight:600;color:#111827;">${item.productName}</div>
                        <div style="font-size:11px;color:#6b7280;font-family:monospace;">Mã SP: ${item.productCode}</div>
                    </td>
                    <td style="text-align:center;">Chiếc</td>
                    <td style="text-align:center;font-weight:600;">${item.quantity}</td>
                    <td style="text-align:right;">${formatVND(item.unitPrice)}</td>
                    <td style="text-align:right;">${item.discountAmount > 0 ? '-' + formatVND(item.discountAmount) : '0 ₫'}</td>
                    <td style="text-align:right;font-weight:700;">${formatVND(item.subtotal)}</td>
                </tr>`
                      )
                      .join('')
                : `
                <tr>
                    <td style="text-align:center;">1</td>
                    <td>
                        <div style="font-weight:600;">Thanh toán đơn hàng ${invoice.orderCode}</div>
                        <div style="font-size:11px;color:#6b7280;">Linh kiện máy tính & thiết bị PCStore</div>
                    </td>
                    <td style="text-align:center;">Gói</td>
                    <td style="text-align:center;font-weight:600;">1</td>
                    <td style="text-align:right;">${formatVND(invoice.totalAmount)}</td>
                    <td style="text-align:right;">${invoice.discountAmount > 0 ? '-' + formatVND(invoice.discountAmount) : '0 ₫'}</td>
                    <td style="text-align:right;font-weight:700;">${formatVND(invoice.amount)}</td>
                </tr>`;

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Hóa đơn ${invoice.invoiceCode} - PCStore</title>
<style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1f2937; background: #fff; font-size: 13px; line-height: 1.5; }
    .container { max-width: 800px; margin: 0 auto; border: 1px solid #d1d5db; padding: 28px 32px; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 18px; }
    .brand-title { font-size: 20px; font-weight: 800; color: #1d4ed8; margin: 0; }
    .brand-sub { font-size: 11px; color: #4b5563; margin-top: 4px; }
    .inv-title { text-align: center; margin: 14px 0 18px; }
    .inv-title h1 { margin: 0; font-size: 22px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; }
    .inv-title p { margin: 4px 0 0; font-size: 12px; color: #4b5563; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
    .meta-row { display: flex; margin-bottom: 4px; }
    .meta-label { width: 170px; color: #4b5563; font-weight: 600; flex-shrink: 0; }
    .meta-val { color: #111827; flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th { background: #eff6ff; color: #1e3a8a; font-weight: 700; padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 12px; }
    td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
    .totals { width: 340px; margin-left: auto; margin-bottom: 14px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals-final { border-top: 2px solid #1d4ed8; padding-top: 8px; margin-top: 6px; font-size: 15px; font-weight: 800; color: #1d4ed8; }
    .words-box { background: #f9fafb; border: 1px dashed #cbd5e1; padding: 10px 14px; border-radius: 6px; margin-bottom: 24px; font-style: italic; }
    .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 24px; padding: 0 24px; }
    .sig-col { width: 42%; }
    .sig-title { font-weight: 700; margin-bottom: 4px; }
    .sig-sub { font-size: 11px; color: #6b7280; font-style: italic; margin-bottom: 58px; }
    .status-stamp { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; border: 2px solid; }
    .stamp-paid { color: #059669; border-color: #059669; }
    .stamp-pending { color: #d97706; border-color: #d97706; }
    .stamp-canceled { color: #dc2626; border-color: #dc2626; }
    @media print {
        body { padding: 0; }
        .container { border: none; padding: 12px; }
    }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <div>
            <p class="brand-title">CÔNG TY TNHH CÔNG NGHỆ PC STORE</p>
            <div class="brand-sub">
                <div>MST: <strong>0109876543</strong></div>
                <div>Địa chỉ: Số 128 Thái Hà, Phường Trung Liệt, Quận Đống Đa, TP. Hà Nội</div>
                <div>Hotline: 1900 1903 • Website: pcstore.vn • Email: ketoan@pcstore.vn</div>
            </div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:11px;color:#6b7280;">Mẫu số: <strong>1C26TPC</strong></div>
            <div style="font-size:12px;">Số HĐ: <strong style="color:#1d4ed8;font-family:monospace;">${invoice.invoiceCode}</strong></div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">Đơn hàng: ${invoice.orderCode}</div>
            <span class="status-stamp ${
                invoice.status === 'PAID'
                    ? 'stamp-paid'
                    : invoice.status === 'PENDING'
                    ? 'stamp-pending'
                    : 'stamp-canceled'
            }">${
                invoice.status === 'PAID'
                    ? 'ĐÃ THANH TOÁN'
                    : invoice.status === 'PENDING'
                    ? 'CHỜ THANH TOÁN'
                    : 'ĐÃ HỦY'
            }</span>
        </div>
    </div>

    <div class="inv-title">
        <h1>${invoice.invoiceType === 'VAT_COMPANY' ? 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG' : 'HÓA ĐƠN BÁN HÀNG'}</h1>
        <p>Ngày lập: ${formattedDate}</p>
    </div>

    <div class="meta-box">
        <div class="meta-row"><div class="meta-label">Họ tên người mua hàng:</div><div class="meta-val"><strong>${invoice.customerName}</strong></div></div>
        <div class="meta-row"><div class="meta-label">Số điện thoại:</div><div class="meta-val">${invoice.customerPhone}</div></div>
        ${
            invoice.invoiceType === 'VAT_COMPANY' && invoice.companyName
                ? `<div class="meta-row"><div class="meta-label">Tên đơn vị (Công ty):</div><div class="meta-val"><strong>${invoice.companyName}</strong></div></div>`
                : ''
        }
        ${
            invoice.taxCode
                ? `<div class="meta-row"><div class="meta-label">Mã số thuế:</div><div class="meta-val" style="font-family:monospace;font-weight:700;">${invoice.taxCode}</div></div>`
                : ''
        }
        <div class="meta-row"><div class="meta-label">Địa chỉ:</div><div class="meta-val">${invoice.companyAddress || invoice.customerAddress || 'Mua trực tiếp tại cửa hàng PCStore'}</div></div>
        <div class="meta-row"><div class="meta-label">Hình thức thanh toán:</div><div class="meta-val">${invoice.paymentMethod}</div></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:42px;">STT</th>
                <th>Tên hàng hóa, dịch vụ</th>
                <th style="width:58px;">ĐVT</th>
                <th style="width:52px;">SL</th>
                <th style="width:115px;">Đơn giá</th>
                <th style="width:105px;">Chiết khấu</th>
                <th style="width:125px;">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row"><span>Cộng tiền hàng:</span><strong>${formatVND(invoice.totalAmount)}</strong></div>
        <div class="totals-row"><span>Chiết khấu / Giảm giá:</span><strong>-${formatVND(invoice.discountAmount)}</strong></div>
        <div class="totals-row"><span>Thuế GTGT (${invoice.taxRate}% - đã gồm trong giá bán):</span><strong>${formatVND(invoice.taxAmount)}</strong></div>
        <div class="totals-row totals-final"><span>TỔNG CỘNG THANH TOÁN:</span><span>${formatVND(invoice.amount)}</span></div>
    </div>

    <div class="words-box">
        Số tiền viết bằng chữ: <strong>${numberToVietnameseWords(invoice.amount)}</strong>
    </div>

    <div class="signatures">
        <div class="sig-col">
            <div class="sig-title">Người mua hàng</div>
            <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
            <div>${invoice.customerName}</div>
        </div>
        <div class="sig-col">
            <div class="sig-title">Người bán hàng / Kế toán</div>
            <div class="sig-sub">(Ký, đóng dấu, ghi rõ họ tên)</div>
            <div><strong>CÔNG TY TNHH CÔNG NGHỆ PC STORE</strong></div>
        </div>
    </div>
</div>
<script>
    window.onload = function() {
        setTimeout(function() { window.print(); }, 250);
    };
</script>
</body>
</html>`;

        win.document.open();
        win.document.write(html);
        win.document.close();
    },
};
