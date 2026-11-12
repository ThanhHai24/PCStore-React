export type DetailedOrderStatus =
    | 'PENDING'       // Chờ xử lý
    | 'PAID'          // Đã thanh toán
    | 'CONFIRMED'     // Đã xác nhận
    | 'PACKING'       // Đang đóng gói
    | 'SHIPPING'      // Đang giao hàng
    | 'DELIVERED'     // Giao thành công
    | 'CANCELLED'     // Đã hủy
    | 'RETURNED';     // Hoàn trả

export type PaymentMethodType =
    | 'VNPAY_QR'
    | 'BANK_TRANSFER'
    | 'COD'
    | 'INSTALLMENT_CARD'
    | 'POS_SWIPE';

export type SalesChannelType =
    | 'WEBSITE_ONLINE'
    | 'SHOWROOM_POS'
    | 'BUILD_PC_CONSULT'
    | 'B2B_PROJECT';

export interface OrderStatusMeta {
    code: DetailedOrderStatus;
    label: string;
    group: 'SUCCESS' | 'IN_PROGRESS' | 'FAILED';
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    chartColor: string;
    dotColor: string;
}

export const ORDER_STATUS_META: Record<DetailedOrderStatus, OrderStatusMeta> = {
    PENDING: {
        code: 'PENDING',
        label: 'Chờ xử lý',
        group: 'IN_PROGRESS',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200',
        chartColor: '#F59E0B',
        dotColor: 'bg-amber-500',
    },
    PAID: {
        code: 'PAID',
        label: 'Đã thanh toán',
        group: 'IN_PROGRESS',
        badgeBg: 'bg-sky-50',
        badgeText: 'text-sky-700',
        badgeBorder: 'border-sky-200',
        chartColor: '#0EA5E9',
        dotColor: 'bg-sky-500',
    },
    CONFIRMED: {
        code: 'CONFIRMED',
        label: 'Đã xác nhận',
        group: 'IN_PROGRESS',
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-700',
        badgeBorder: 'border-indigo-200',
        chartColor: '#6366F1',
        dotColor: 'bg-indigo-500',
    },
    PACKING: {
        code: 'PACKING',
        label: 'Đang đóng gói',
        group: 'IN_PROGRESS',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-200',
        chartColor: '#8B5CF6',
        dotColor: 'bg-purple-500',
    },
    SHIPPING: {
        code: 'SHIPPING',
        label: 'Đang giao hàng',
        group: 'IN_PROGRESS',
        badgeBg: 'bg-blue-50',
        badgeText: 'text-[#2563EB]',
        badgeBorder: 'border-blue-200',
        chartColor: '#2563EB',
        dotColor: 'bg-[#2563EB]',
    },
    DELIVERED: {
        code: 'DELIVERED',
        label: 'Giao thành công',
        group: 'SUCCESS',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
        badgeBorder: 'border-emerald-200',
        chartColor: '#10B981',
        dotColor: 'bg-emerald-500',
    },
    CANCELLED: {
        code: 'CANCELLED',
        label: 'Đã hủy',
        group: 'FAILED',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-200',
        chartColor: '#F43F5E',
        dotColor: 'bg-rose-500',
    },
    RETURNED: {
        code: 'RETURNED',
        label: 'Hoàn trả',
        group: 'FAILED',
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-700',
        badgeBorder: 'border-orange-200',
        chartColor: '#F97316',
        dotColor: 'bg-orange-500',
    },
};

export const ORDER_STATUS_LIST: OrderStatusMeta[] = [
    ORDER_STATUS_META.PENDING,
    ORDER_STATUS_META.PAID,
    ORDER_STATUS_META.CONFIRMED,
    ORDER_STATUS_META.PACKING,
    ORDER_STATUS_META.SHIPPING,
    ORDER_STATUS_META.DELIVERED,
    ORDER_STATUS_META.CANCELLED,
    ORDER_STATUS_META.RETURNED,
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
    VNPAY_QR: 'VNPay QR Gateway',
    BANK_TRANSFER: 'Chuyển khoản Ngân hàng',
    COD: 'Thanh toán khi nhận hàng (COD)',
    INSTALLMENT_CARD: 'Trả góp 0% qua Thẻ tín dụng',
    POS_SWIPE: 'Quẹt thẻ POS tại Showroom',
};

export const SALES_CHANNEL_LABELS: Record<SalesChannelType, string> = {
    WEBSITE_ONLINE: 'Website PCStore Online',
    SHOWROOM_POS: 'Mua trực tiếp tại Showroom',
    BUILD_PC_CONSULT: 'Tư vấn Build PC theo yêu cầu',
    B2B_PROJECT: 'Đơn hàng Dự án / Phòng máy B2B',
};

export interface CancelReturnReasonMeta {
    id: string;
    reason: string;
    type: 'CANCELLED' | 'RETURNED';
    color: string;
}

export const CANCEL_RETURN_REASONS: CancelReturnReasonMeta[] = [
    {
        id: 'RSN_UPGRADE_SPEC',
        reason: 'Đổi cấu hình linh kiện (Nâng cấp CPU / VGA)',
        type: 'CANCELLED',
        color: '#2563EB',
    },
    {
        id: 'RSN_WRONG_SOCKET',
        reason: 'Đặt nhầm Socket Mainboard / Chuẩn RAM DDR5',
        type: 'CANCELLED',
        color: '#6366F1',
    },
    {
        id: 'RSN_FINANCE_CHANGE',
        reason: 'Khách đổi ý / Chưa duyệt hồ sơ trả góp',
        type: 'CANCELLED',
        color: '#F59E0B',
    },
    {
        id: 'RSN_UNREACHABLE_COD',
        reason: 'Không liên hệ được người nhận khi giao COD',
        type: 'CANCELLED',
        color: '#F43F5E',
    },
    {
        id: 'RSN_HARDWARE_DOA',
        reason: 'Lỗi kỹ thuật NSX (DOA) / Hoàn trả đổi mới',
        type: 'RETURNED',
        color: '#F97316',
    },
    {
        id: 'RSN_SHIPPING_DELAY',
        reason: 'Cần lắp máy gấp nhưng chờ điều chuyển kho',
        type: 'RETURNED',
        color: '#8B5CF6',
    },
];

export interface OrderItemSummary {
    sku: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
}

export interface OrderStatusRecord {
    id: string;
    orderCode: string;
    orderDate: string;          // YYYY-MM-DD
    orderTime: string;          // HH:mm
    customerName: string;
    customerPhone: string;
    customerCity: string;
    channel: SalesChannelType;
    channelLabel: string;
    paymentMethod: PaymentMethodType;
    paymentMethodLabel: string;
    status: DetailedOrderStatus;
    statusLabel: string;
    totalAmount: number;
    itemsCount: number;
    primaryProductSummary: string;
    items: OrderItemSummary[];
    processingHours: number;    // Thời gian xử lý trung bình (giờ)
    cancelReturnReasonId?: string;
    cancelReturnReasonText?: string;
}

const SAMPLE_ORDER_BASKETS: { summary: string; total: number; items: OrderItemSummary[] }[] = [
    {
        summary: 'Combo Intel Core i9-14900K + Main ASUS ROG Maximus Z790 Hero + RAM 64GB DDR5',
        total: 38370000,
        items: [
            { sku: 'CPU-INT-14900K', name: 'CPU Intel Core i9-14900K (24 Nhân 32 Luồng)', category: 'CPU', quantity: 1, unitPrice: 14890000 },
            { sku: 'MB-ASUS-Z790HERO', name: 'Mainboard ASUS ROG MAXIMUS Z790 HERO DDR5', category: 'Mainboard', quantity: 1, unitPrice: 15990000 },
            { sku: 'RAM-COR-64GDDR5', name: 'RAM Corsair Dominator Titanium RGB 64GB DDR5', category: 'RAM', quantity: 1, unitPrice: 7490000 },
        ],
    },
    {
        summary: 'VGA ASUS ROG Strix GeForce RTX 4090 OC 24GB + Nguồn Corsair RM1000e ATX 3.0',
        total: 59180000,
        items: [
            { sku: 'VGA-ASUS-4090OC', name: 'VGA ASUS ROG Strix GeForce RTX 4090 OC 24GB', category: 'VGA', quantity: 1, unitPrice: 54990000 },
            { sku: 'PSU-COR-RM1000E', name: 'Nguồn Corsair RM1000e 1000W 80 Plus Gold ATX 3.0', category: 'PSU', quantity: 1, unitPrice: 4190000 },
        ],
    },
    {
        summary: 'PC Gaming Sentinel Ultra (Core i9-14900K / RTX 4080 Super / 64GB DDR5 / 2TB SSD)',
        total: 68500000,
        items: [
            { sku: 'PC-ROG-SENTINEL', name: 'PC Gaming Sentinel Ultra Full Tower', category: 'PC Bộ', quantity: 1, unitPrice: 68500000 },
        ],
    },
    {
        summary: 'Combo Gaming AMD Ryzen 7 7800X3D + GIGABYTE B650 AORUS Elite + RAM Kingston 32GB DDR5',
        total: 19970000,
        items: [
            { sku: 'CPU-AMD-7800X3D', name: 'CPU AMD Ryzen 7 7800X3D (96MB 3D V-Cache)', category: 'CPU', quantity: 1, unitPrice: 10990000 },
            { sku: 'MB-GIGA-B650AOR', name: 'Mainboard GIGABYTE B650 AORUS ELITE AX V2', category: 'Mainboard', quantity: 1, unitPrice: 5790000 },
            { sku: 'RAM-KGS-32GDDR5', name: 'RAM Kingston Fury Beast RGB 32GB DDR5 6000MHz', category: 'RAM', quantity: 1, unitPrice: 3190000 },
        ],
    },
    {
        summary: 'VGA MSI GeForce RTX 4070 Ti SUPER 16G Gaming X Slim + SSD Samsung 990 PRO 2TB',
        total: 29080000,
        items: [
            { sku: 'VGA-MSI-4070TIS', name: 'VGA MSI GeForce RTX 4070 Ti SUPER 16G', category: 'VGA', quantity: 1, unitPrice: 24490000 },
            { sku: 'SSD-SAM-990P2TB', name: 'Ổ cứng SSD Samsung 990 PRO 2TB PCIe 4.0 NVMe', category: 'SSD', quantity: 1, unitPrice: 4590000 },
        ],
    },
    {
        summary: 'Combo Quốc Dân Core i5-13400F + MSI B760M Mortar WiFi + RTX 4060 Gaming OC 8GB',
        total: 17970000,
        items: [
            { sku: 'CPU-INT-13400F', name: 'CPU Intel Core i5-13400F (10 Nhân 16 Luồng)', category: 'CPU', quantity: 1, unitPrice: 4690000 },
            { sku: 'MB-MSI-B760MMOR', name: 'Mainboard MSI MAG B760M MORTAR WIFI II DDR5', category: 'Mainboard', quantity: 1, unitPrice: 4890000 },
            { sku: 'VGA-GIGA-4060OC', name: 'VGA GIGABYTE GeForce RTX 4060 Gaming OC 8GB', category: 'VGA', quantity: 1, unitPrice: 8390000 },
        ],
    },
    {
        summary: 'Màn hình LG UltraGear 27GR95QE-B 27" OLED 240Hz + Tản nước NZXT Kraken Elite 360',
        total: 25880000,
        items: [
            { sku: 'MON-LG-27GR95QE', name: 'Màn hình LG UltraGear 27GR95QE-B 27" 2K OLED 240Hz', category: 'Màn hình', quantity: 1, unitPrice: 18990000 },
            { sku: 'AIO-NZXT-KR360', name: 'Tản nhiệt nước AIO NZXT Kraken Elite 360 RGB', category: 'Tản nhiệt', quantity: 1, unitPrice: 6890000 },
        ],
    },
    {
        summary: 'Nâng cấp Lưu trữ & RAM: 2x SSD Kingston KC3000 1TB NVMe + RAM Kingston Fury 32GB DDR5',
        total: 7770000,
        items: [
            { sku: 'SSD-KGS-KC30001T', name: 'Ổ cứng SSD Kingston KC3000 1TB PCIe 4.0 NVMe', category: 'SSD', quantity: 2, unitPrice: 2290000 },
            { sku: 'RAM-KGS-32GDDR5', name: 'RAM Kingston Fury Beast RGB 32GB DDR5 6000MHz', category: 'RAM', quantity: 1, unitPrice: 3190000 },
        ],
    },
    {
        summary: 'PC Gaming AORUS Esport Pro (Ryzen 7 7800X3D / RTX 4070 Ti Super / 32GB DDR5)',
        total: 43900000,
        items: [
            { sku: 'PC-AOR-CREATOR', name: 'PC Gaming AORUS Esport Pro Custom', category: 'PC Bộ', quantity: 1, unitPrice: 43900000 },
        ],
    },
    {
        summary: 'CPU Intel Core i7-14700K + VGA ASUS TUF Gaming Radeon RX 7800 XT OC 16GB',
        total: 25780000,
        items: [
            { sku: 'CPU-INT-14700K', name: 'CPU Intel Core i7-14700K (20 Nhân 28 Luồng)', category: 'CPU', quantity: 1, unitPrice: 10490000 },
            { sku: 'VGA-ASUS-7800XT', name: 'VGA ASUS TUF Gaming Radeon RX 7800 XT OC 16GB', category: 'VGA', quantity: 1, unitPrice: 15290000 },
        ],
    },
];

function generateDeterministicOrderStatusRecords(): OrderStatusRecord[] {
    const records: OrderStatusRecord[] = [];

    const customers = [
        { name: 'Nguyễn Minh Tuấn', phone: '0903 412 889', city: 'TP. Hồ Chí Minh' },
        { name: 'Trần Hoàng Nam', phone: '0918 225 671', city: 'Hà Nội' },
        { name: 'Lê Quang Huy', phone: '0987 654 312', city: 'Đà Nẵng' },
        { name: 'Phạm Đức Anh', phone: '0935 119 402', city: 'Hải Phòng' },
        { name: 'Võ Thành Đạt', phone: '0972 881 920', city: 'Cần Thơ' },
        { name: 'Đặng Quốc Bảo', phone: '0966 340 115', city: 'Bình Dương' },
        { name: 'Bùi Thanh Tùng', phone: '0944 512 908', city: 'Đồng Nai' },
        { name: 'Hoàng Gia Khánh', phone: '0909 778 234', city: 'TP. Hồ Chí Minh' },
        { name: 'Ngô Trọng Nghĩa', phone: '0938 601 552', city: 'Hà Nội' },
        { name: 'Đỗ Phương Nam', phone: '0912 990 341', city: 'Quảng Ninh' },
        { name: 'Lý Hải Đăng', phone: '0983 410 765', city: 'Khánh Hòa' },
        { name: 'Dương Minh Khang', phone: '0979 203 814', city: 'Nghệ An' },
    ];

    const paymentKeys: PaymentMethodType[] = [
        'VNPAY_QR',
        'BANK_TRANSFER',
        'COD',
        'INSTALLMENT_CARD',
        'POS_SWIPE',
    ];

    const channelKeys: SalesChannelType[] = [
        'WEBSITE_ONLINE',
        'SHOWROOM_POS',
        'BUILD_PC_CONSULT',
        'B2B_PROJECT',
    ];

    const start = new Date('2026-01-02T00:00:00');
    const end = new Date('2026-11-12T00:00:00');

    let seq = 2001;
    let seed = 1337;
    const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 2)) {
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isRecentMonth = month >= 10;

        const ordersPerDay = (isRecentMonth ? 3 : 2) + Math.floor(nextRand() * 2);

        for (let i = 0; i < ordersPerDay; i++) {
            const cust = customers[Math.floor(nextRand() * customers.length)];
            const basket = SAMPLE_ORDER_BASKETS[Math.floor(nextRand() * SAMPLE_ORDER_BASKETS.length)];
            const channel = channelKeys[Math.floor(nextRand() * channelKeys.length)];
            const payment =
                channel === 'SHOWROOM_POS' && nextRand() > 0.4
                    ? 'POS_SWIPE'
                    : paymentKeys[Math.floor(nextRand() * paymentKeys.length)];

            // Phân bổ trạng thái: các ngày gần đây (tháng 10-11/2026) có nhiều đơn đang xử lý/đóng gói/đang giao hơn
            const roll = nextRand();
            let status: DetailedOrderStatus = 'DELIVERED';

            if (isRecentMonth) {
                if (roll < 0.54) status = 'DELIVERED';
                else if (roll < 0.62) status = 'SHIPPING';
                else if (roll < 0.69) status = 'PACKING';
                else if (roll < 0.75) status = 'CONFIRMED';
                else if (roll < 0.81) status = 'PAID';
                else if (roll < 0.87) status = 'PENDING';
                else if (roll < 0.95) status = 'CANCELLED';
                else status = 'RETURNED';
            } else {
                if (roll < 0.74) status = 'DELIVERED';
                else if (roll < 0.78) status = 'SHIPPING';
                else if (roll < 0.81) status = 'PACKING';
                else if (roll < 0.84) status = 'CONFIRMED';
                else if (roll < 0.86) status = 'PAID';
                else if (roll < 0.88) status = 'PENDING';
                else if (roll < 0.96) status = 'CANCELLED';
                else status = 'RETURNED';
            }

            // Thời gian xử lý trung bình (giờ) sát thực tế lắp ráp/kiểm thử/giao hàng PC
            let processingHours = Number((2.5 + nextRand() * 22).toFixed(1));
            if (channel === 'SHOWROOM_POS') {
                processingHours = Number((0.5 + nextRand() * 2.0).toFixed(1));
            } else if (channel === 'BUILD_PC_CONSULT') {
                // Đơn Build PC cần lắp ráp, đi dây, cài OS, stress-test 3DMark/FurMark
                processingHours = Number((6.0 + nextRand() * 18.0).toFixed(1));
            }

            // Lý do hủy / hoàn trả nếu thuộc trạng thái CANCELLED hoặc RETURNED
            let cancelReturnReasonId: string | undefined;
            let cancelReturnReasonText: string | undefined;

            if (status === 'CANCELLED') {
                const cancelPool = CANCEL_RETURN_REASONS.filter((r) => r.type === 'CANCELLED');
                // Tạo trọng số hợp lý để biểu đồ tròn hiển thị phân bổ đẹp mắt
                const rRoll = nextRand();
                const chosen =
                    rRoll < 0.36
                        ? cancelPool[0]
                        : rRoll < 0.64
                          ? cancelPool[1]
                          : rRoll < 0.85
                            ? cancelPool[2]
                            : cancelPool[3];
                cancelReturnReasonId = chosen.id;
                cancelReturnReasonText = chosen.reason;
            } else if (status === 'RETURNED') {
                const returnPool = CANCEL_RETURN_REASONS.filter((r) => r.type === 'RETURNED');
                const chosen = nextRand() < 0.65 ? returnPool[0] : returnPool[1];
                cancelReturnReasonId = chosen.id;
                cancelReturnReasonText = chosen.reason;
            }

            const hour = 8 + Math.floor(nextRand() * 13);
            const minute = Math.floor(nextRand() * 60);
            const orderTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            records.push({
                id: `OSR-${seq}`,
                orderCode: `ORD-${year}${String(month).padStart(2, '0')}-${seq}`,
                orderDate: dateStr,
                orderTime,
                customerName: cust.name,
                customerPhone: cust.phone,
                customerCity: cust.city,
                channel,
                channelLabel: SALES_CHANNEL_LABELS[channel],
                paymentMethod: payment,
                paymentMethodLabel: PAYMENT_METHOD_LABELS[payment],
                status,
                statusLabel: ORDER_STATUS_META[status].label,
                totalAmount: basket.total,
                itemsCount: basket.items.reduce((s, it) => s + it.quantity, 0),
                primaryProductSummary: basket.summary,
                items: basket.items,
                processingHours,
                cancelReturnReasonId,
                cancelReturnReasonText,
            });

            seq++;
        }
    }

    return records.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

export const MOCK_ORDER_STATUS_RECORDS: OrderStatusRecord[] =
    generateDeterministicOrderStatusRecords();

