export type PeriodGrouping = 'DAY' | 'MONTH' | 'QUARTER' | 'YEAR';

export type ReportDimensionTab =
    | 'TIME'
    | 'CATEGORY'
    | 'CLASSIFICATION'
    | 'BRAND'
    | 'PRODUCT';

export type OrderRevenueStatus = 'DELIVERED' | 'CANCELLED' | 'RETURNED';

export interface PCProductMeta {
    id: string;
    sku: string;
    name: string;
    categoryId: string;
    categoryName: string;
    classificationId: string;
    classificationName: string;
    brandId: string;
    brandName: string;
    unitPrice: number;
}

export interface RevenueTransactionRecord {
    id: string;
    orderCode: string;
    date: string; // YYYY-MM-DD
    customerName: string;
    channel: 'ONLINE' | 'SHOWROOM';
    status: OrderRevenueStatus;
    statusLabel: 'Đã đưa tới khách hàng' | 'Đơn đã hủy' | 'Đơn hoàn trả';
    productId: string;
    productSku: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    classificationId: string;
    classificationName: string;
    brandId: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    grossAmount: number;          // Tổng giá trị gộp phát sinh
    deductionAmount: number;      // Giảm trừ do hủy đơn / hoàn trả hoặc chiết khấu
    netActualRevenue: number;     // Doanh thu thuần thực tế (chỉ > 0 khi status === 'DELIVERED')
}

export interface AggregatedRevenueRow {
    id: string;
    name: string;                 // Tên đối tượng / Mốc thời gian
    subLabel?: string;            // Mã SKU / Phụ chú nhóm
    badgeText?: string;           // Tag phụ (VD: Thương hiệu, Danh mục)
    completedOrders: number;      // Số đơn hoàn tất ("Đã đưa tới khách hàng")
    cancelledReturnOrders: number;// Số đơn hủy/hoàn
    unitsSold: number;            // Sản lượng bán thực tế (đơn hoàn tất)
    grossRevenue: number;         // Doanh thu gộp
    deductionRevenue: number;     // Giảm trừ hoàn/hủy
    netRevenue: number;           // Doanh thu thuần thực tế
    sharePercent: number;         // Tỷ trọng (%) trên tổng doanh thu thuần
    sortOrder?: string | number;  // Dùng cho sắp xếp theo trục thời gian
}

// Danh mục chuẩn ngành PC Store
export const PC_CATEGORIES = [
    { id: 'CAT_CPU', name: 'Vi xử lý (CPU)' },
    { id: 'CAT_VGA', name: 'Card đồ họa (VGA)' },
    { id: 'CAT_MAIN', name: 'Bo mạch chủ (Mainboard)' },
    { id: 'CAT_RAM', name: 'Bộ nhớ trong (RAM DDR5)' },
    { id: 'CAT_SSD', name: 'Ổ cứng SSD NVMe' },
    { id: 'CAT_PSU_COOL', name: 'Nguồn & Tản nhiệt PC' },
    { id: 'CAT_PC_BUILD', name: 'PC Gaming & Workstation' },
    { id: 'CAT_MONITOR', name: 'Màn hình Gaming / Đồ họa' },
];

// Phân loại sản phẩm ngành PC
export const PC_CLASSIFICATIONS = [
    { id: 'CLS_HIGHEND', name: 'Linh kiện Cao cấp (High-End / Enthusiast)' },
    { id: 'CLS_MAINSTREAM', name: 'Linh kiện Phổ thông (Mainstream Gaming)' },
    { id: 'CLS_CUSTOM_PC', name: 'PC Bộ lắp sẵn (Custom Build PC)' },
    { id: 'CLS_DISPLAY_GEAR', name: 'Thiết bị Hiển thị & Ngoại vi (Màn hình)' },
];

// Thương hiệu phần cứng hàng đầu
export const PC_BRANDS = [
    { id: 'BRD_INTEL', name: 'Intel' },
    { id: 'BRD_AMD', name: 'AMD' },
    { id: 'BRD_ASUS', name: 'ASUS ROG / TUF' },
    { id: 'BRD_MSI', name: 'MSI' },
    { id: 'BRD_GIGABYTE', name: 'GIGABYTE AORUS' },
    { id: 'BRD_CORSAIR', name: 'Corsair' },
    { id: 'BRD_KINGSTON', name: 'Kingston Fury' },
    { id: 'BRD_SAMSUNG', name: 'Samsung' },
    { id: 'BRD_LG', name: 'LG UltraGear' },
    { id: 'BRD_NZXT', name: 'NZXT' },
];

// Danh mục sản phẩm mẫu sát thực tế
export const PC_PRODUCTS: PCProductMeta[] = [
    {
        id: 'PRD_I9_14900K',
        sku: 'CPU-INT-14900K',
        name: 'CPU Intel Core i9-14900K (24 Nhân 32 Luồng, Up to 6.0GHz, LGA1700)',
        categoryId: 'CAT_CPU',
        categoryName: 'Vi xử lý (CPU)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_INTEL',
        brandName: 'Intel',
        unitPrice: 14890000,
    },
    {
        id: 'PRD_I7_14700K',
        sku: 'CPU-INT-14700K',
        name: 'CPU Intel Core i7-14700K (20 Nhân 28 Luồng, Up to 5.6GHz, LGA1700)',
        categoryId: 'CAT_CPU',
        categoryName: 'Vi xử lý (CPU)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_INTEL',
        brandName: 'Intel',
        unitPrice: 10490000,
    },
    {
        id: 'PRD_I5_13400F',
        sku: 'CPU-INT-13400F',
        name: 'CPU Intel Core i5-13400F (10 Nhân 16 Luồng, 20MB Cache, LGA1700)',
        categoryId: 'CAT_CPU',
        categoryName: 'Vi xử lý (CPU)',
        classificationId: 'CLS_MAINSTREAM',
        classificationName: 'Linh kiện Phổ thông (Mainstream Gaming)',
        brandId: 'BRD_INTEL',
        brandName: 'Intel',
        unitPrice: 4690000,
    },
    {
        id: 'PRD_R7_7800X3D',
        sku: 'CPU-AMD-7800X3D',
        name: 'CPU AMD Ryzen 7 7800X3D (8 Nhân 16 Luồng, 96MB 3D V-Cache, Socket AM5)',
        categoryId: 'CAT_CPU',
        categoryName: 'Vi xử lý (CPU)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_AMD',
        brandName: 'AMD',
        unitPrice: 10990000,
    },
    {
        id: 'PRD_R9_7950X',
        sku: 'CPU-AMD-7950X',
        name: 'CPU AMD Ryzen 9 7950X (16 Nhân 32 Luồng, Up to 5.7GHz, Socket AM5)',
        categoryId: 'CAT_CPU',
        categoryName: 'Vi xử lý (CPU)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_AMD',
        brandName: 'AMD',
        unitPrice: 14290000,
    },
    {
        id: 'PRD_RTX_4090_STRIX',
        sku: 'VGA-ASUS-4090OC',
        name: 'VGA ASUS ROG Strix GeForce RTX 4090 OC Edition 24GB GDDR6X',
        categoryId: 'CAT_VGA',
        categoryName: 'Card đồ họa (VGA)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_ASUS',
        brandName: 'ASUS ROG / TUF',
        unitPrice: 54990000,
    },
    {
        id: 'PRD_RTX_4070TIS_MSI',
        sku: 'VGA-MSI-4070TIS',
        name: 'VGA MSI GeForce RTX 4070 Ti SUPER 16G GAMING X SLIM',
        categoryId: 'CAT_VGA',
        categoryName: 'Card đồ họa (VGA)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_MSI',
        brandName: 'MSI',
        unitPrice: 24490000,
    },
    {
        id: 'PRD_RTX_4060_GIGA',
        sku: 'VGA-GIGA-4060OC',
        name: 'VGA GIGABYTE GeForce RTX 4060 Gaming OC 8GB GDDR6 (3 Fan)',
        categoryId: 'CAT_VGA',
        categoryName: 'Card đồ họa (VGA)',
        classificationId: 'CLS_MAINSTREAM',
        classificationName: 'Linh kiện Phổ thông (Mainstream Gaming)',
        brandId: 'BRD_GIGABYTE',
        brandName: 'GIGABYTE AORUS',
        unitPrice: 8390000,
    },
    {
        id: 'PRD_RX_7800XT_ASUS',
        sku: 'VGA-ASUS-7800XT',
        name: 'VGA ASUS TUF Gaming Radeon RX 7800 XT OC Edition 16GB GDDR6',
        categoryId: 'CAT_VGA',
        categoryName: 'Card đồ họa (VGA)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_ASUS',
        brandName: 'ASUS ROG / TUF',
        unitPrice: 15290000,
    },
    {
        id: 'PRD_Z790_HERO',
        sku: 'MB-ASUS-Z790HERO',
        name: 'Mainboard ASUS ROG MAXIMUS Z790 HERO DDR5 (Wi-Fi 6E, LGA1700)',
        categoryId: 'CAT_MAIN',
        categoryName: 'Bo mạch chủ (Mainboard)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_ASUS',
        brandName: 'ASUS ROG / TUF',
        unitPrice: 15990000,
    },
    {
        id: 'PRD_B760M_MORTAR',
        sku: 'MB-MSI-B760MMOR',
        name: 'Mainboard MSI MAG B760M MORTAR WIFI II DDR5 (mATX, LGA1700)',
        categoryId: 'CAT_MAIN',
        categoryName: 'Bo mạch chủ (Mainboard)',
        classificationId: 'CLS_MAINSTREAM',
        classificationName: 'Linh kiện Phổ thông (Mainstream Gaming)',
        brandId: 'BRD_MSI',
        brandName: 'MSI',
        unitPrice: 4890000,
    },
    {
        id: 'PRD_B650_AORUS',
        sku: 'MB-GIGA-B650AOR',
        name: 'Mainboard GIGABYTE B650 AORUS ELITE AX V2 DDR5 (Socket AM5)',
        categoryId: 'CAT_MAIN',
        categoryName: 'Bo mạch chủ (Mainboard)',
        classificationId: 'CLS_MAINSTREAM',
        classificationName: 'Linh kiện Phổ thông (Mainstream Gaming)',
        brandId: 'BRD_GIGABYTE',
        brandName: 'GIGABYTE AORUS',
        unitPrice: 5790000,
    },
    {
        id: 'PRD_RAM_CORSAIR_64G',
        sku: 'RAM-COR-64GDDR5',
        name: 'RAM Corsair Dominator Titanium RGB 64GB (2x32GB) DDR5 6600MHz',
        categoryId: 'CAT_RAM',
        categoryName: 'Bộ nhớ trong (RAM DDR5)',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_CORSAIR',
        brandName: 'Corsair',
        unitPrice: 7490000,
    },
    {
        id: 'PRD_RAM_KINGSTON_32G',
        sku: 'RAM-KGS-32GDDR5',
        name: 'RAM Kingston Fury Beast RGB 32GB (2x16GB) DDR5 6000MHz CL36',
        categoryId: 'CAT_RAM',
        categoryName: 'Bộ nhớ trong (RAM DDR5)',
        classificationId: 'CLS_MAINSTREAM',
        classificationName: 'Linh kiện Phổ thông (Mainstream Gaming)',
        brandId: 'BRD_KINGSTON',
        brandName: 'Kingston Fury',
        unitPrice: 3190000,
    },
    {
        id: 'PRD_SSD_990PRO_2TB',
        sku: 'SSD-SAM-990P2TB',
        name: 'Ổ cứng SSD Samsung 990 PRO 2TB PCIe Gen 4.0 x4 NVMe V-NAND M.2',
        categoryId: 'CAT_SSD',
        categoryName: 'Ổ cứng SSD NVMe',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_SAMSUNG',
        brandName: 'Samsung',
        unitPrice: 4590000,
    },
    {
        id: 'PRD_SSD_KC3000_1TB',
        sku: 'SSD-KGS-KC30001T',
        name: 'Ổ cứng SSD Kingston KC3000 1TB PCIe 4.0 x4 NVMe M.2 (7000MB/s)',
        categoryId: 'CAT_SSD',
        categoryName: 'Ổ cứng SSD NVMe',
        classificationId: 'CLS_MAINSTREAM',
        classificationName: 'Linh kiện Phổ thông (Mainstream Gaming)',
        brandId: 'BRD_KINGSTON',
        brandName: 'Kingston Fury',
        unitPrice: 2290000,
    },
    {
        id: 'PRD_PSU_RM1000E',
        sku: 'PSU-COR-RM1000E',
        name: 'Nguồn Corsair RM1000e 1000W 80 Plus Gold Full Modular ATX 3.0 PCIe 5.0',
        categoryId: 'CAT_PSU_COOL',
        categoryName: 'Nguồn & Tản nhiệt PC',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_CORSAIR',
        brandName: 'Corsair',
        unitPrice: 4190000,
    },
    {
        id: 'PRD_AIO_KRAKEN360',
        sku: 'AIO-NZXT-KR360',
        name: 'Tản nhiệt nước AIO NZXT Kraken Elite 360 RGB (Màn hình LCD IPS)',
        categoryId: 'CAT_PSU_COOL',
        categoryName: 'Nguồn & Tản nhiệt PC',
        classificationId: 'CLS_HIGHEND',
        classificationName: 'Linh kiện Cao cấp (High-End / Enthusiast)',
        brandId: 'BRD_NZXT',
        brandName: 'NZXT',
        unitPrice: 6890000,
    },
    {
        id: 'PRD_PC_SENTINEL_4080S',
        sku: 'PC-ROG-SENTINEL',
        name: 'PC Gaming Sentinel Ultra (Core i9-14900K / RTX 4080 Super / 64GB DDR5 / 2TB)',
        categoryId: 'CAT_PC_BUILD',
        categoryName: 'PC Gaming & Workstation',
        classificationId: 'CLS_CUSTOM_PC',
        classificationName: 'PC Bộ lắp sẵn (Custom Build PC)',
        brandId: 'BRD_ASUS',
        brandName: 'ASUS ROG / TUF',
        unitPrice: 68500000,
    },
    {
        id: 'PRD_PC_AORUS_7800X3D',
        sku: 'PC-AOR-CREATOR',
        name: 'PC Gaming AORUS Esport Pro (Ryzen 7 7800X3D / RTX 4070 Ti Super / 32GB DDR5)',
        categoryId: 'CAT_PC_BUILD',
        categoryName: 'PC Gaming & Workstation',
        classificationId: 'CLS_CUSTOM_PC',
        classificationName: 'PC Bộ lắp sẵn (Custom Build PC)',
        brandId: 'BRD_GIGABYTE',
        brandName: 'GIGABYTE AORUS',
        unitPrice: 43900000,
    },
    {
        id: 'PRD_MON_LG_27OLED',
        sku: 'MON-LG-27GR95QE',
        name: 'Màn hình LG UltraGear 27GR95QE-B 27" QHD OLED 240Hz 0.03ms G-Sync',
        categoryId: 'CAT_MONITOR',
        categoryName: 'Màn hình Gaming / Đồ họa',
        classificationId: 'CLS_DISPLAY_GEAR',
        classificationName: 'Thiết bị Hiển thị & Ngoại vi (Màn hình)',
        brandId: 'BRD_LG',
        brandName: 'LG UltraGear',
        unitPrice: 18990000,
    },
];

// Hàm tạo dữ liệu giao dịch tất định (Deterministic Seeded Generator) sát thực tế
function generateDeterministicRevenueRecords(): RevenueTransactionRecord[] {
    const records: RevenueTransactionRecord[] = [];
    const customerNames = [
        'Nguyễn Minh Tuấn',
        'Trần Hoàng Nam',
        'Lê Quang Huy',
        'Phạm Đức Anh',
        'Võ Thành Đạt',
        'Đặng Quốc Bảo',
        'Bùi Thanh Tùng',
        'Hoàng Gia Khánh',
        'Ngô Trọng Nghĩa',
        'Đỗ Phương Nam',
        'Lý Hải Đăng',
        'Dương Minh Khang',
    ];

    // Trải dữ liệu từ 01/01/2025 tới 12/11/2026 để hỗ trợ lọc Ngày / Tháng / Quý / Năm và so sánh kỳ trước
    const start = new Date('2025-01-05T00:00:00');
    const end = new Date('2026-11-12T00:00:00');

    let seq = 1001;
    let seed = 42;
    const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 2)) {
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Hệ số mùa vụ: Năm 2026 tăng trưởng tốt hơn 2025, các tháng cuối năm cao hơn
        const is2026 = year === 2026;
        const seasonalBoost = month >= 9 ? 3 : month >= 5 ? 2 : 2;
        const txCountForDay = (is2026 ? 2 : 1) + Math.floor(nextRand() * seasonalBoost);

        for (let t = 0; t < txCountForDay; t++) {
            const prodIndex = Math.floor(nextRand() * PC_PRODUCTS.length);
            const product = PC_PRODUCTS[prodIndex];

            // Số lượng mua: Linh kiện RAM/SSD/CPU phổ thông có thể mua 1-3, PC bộ/RTX 4090 thường 1-2
            const maxQty =
                product.unitPrice > 30000000 ? 1 : product.unitPrice > 12000000 ? 2 : 3;
            const quantity = 1 + Math.floor(nextRand() * maxQty);

            // Tỷ lệ trạng thái đơn hàng: ~86% Đã đưa tới khách hàng, ~9% Đơn đã hủy, ~5% Đơn hoàn trả
            const statusRoll = nextRand();
            let status: OrderRevenueStatus = 'DELIVERED';
            let statusLabel: RevenueTransactionRecord['statusLabel'] = 'Đã đưa tới khách hàng';

            if (statusRoll > 0.95) {
                status = 'RETURNED';
                statusLabel = 'Đơn hoàn trả';
            } else if (statusRoll > 0.86) {
                status = 'CANCELLED';
                statusLabel = 'Đơn đã hủy';
            }

            const grossAmount = product.unitPrice * quantity;
            // Nếu đơn bị hủy hoặc hoàn trả, toàn bộ giá trị đơn bị loại trừ khỏi doanh thu thuần thực tế
            // Nếu đơn hoàn tất ("Đã đưa tới khách hàng"), doanh thu thuần thực tế = grossAmount
            const deductionAmount = status === 'DELIVERED' ? 0 : grossAmount;
            const netActualRevenue = status === 'DELIVERED' ? grossAmount : 0;

            const customer = customerNames[Math.floor(nextRand() * customerNames.length)];
            const channel = nextRand() > 0.35 ? 'ONLINE' : 'SHOWROOM';

            records.push({
                id: `REV-${seq}`,
                orderCode: `ORD-${year}${String(month).padStart(2, '0')}-${seq}`,
                date: dateStr,
                customerName: customer,
                channel,
                status,
                statusLabel,
                productId: product.id,
                productSku: product.sku,
                productName: product.name,
                categoryId: product.categoryId,
                categoryName: product.categoryName,
                classificationId: product.classificationId,
                classificationName: product.classificationName,
                brandId: product.brandId,
                brandName: product.brandName,
                quantity,
                unitPrice: product.unitPrice,
                grossAmount,
                deductionAmount,
                netActualRevenue,
            });

            seq++;
        }
    }

    return records;
}

export const MOCK_REVENUE_TRANSACTIONS: RevenueTransactionRecord[] =
    generateDeterministicRevenueRecords();

/**
 * Định dạng mốc thời gian hiển thị và khóa sắp xếp theo chu kỳ gộp (Ngày / Tháng / Quý / Năm)
 */
export function getPeriodKeyAndLabel(
    dateStr: string,
    groupBy: PeriodGrouping
): { key: string; label: string; sortKey: string } {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (groupBy === 'DAY') {
        return {
            key: dateStr,
            label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
            sortKey: dateStr,
        };
    }
    if (groupBy === 'MONTH') {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        return {
            key,
            label: `Tháng ${String(m).padStart(2, '0')}/${y}`,
            sortKey: key,
        };
    }
    if (groupBy === 'QUARTER') {
        const q = Math.ceil(m / 3);
        const key = `${y}-Q${q}`;
        return {
            key,
            label: `Quý ${q}/${y}`,
            sortKey: key,
        };
    }
    // YEAR
    const key = `${y}`;
    return {
        key,
        label: `Năm ${y}`,
        sortKey: key,
    };
}

