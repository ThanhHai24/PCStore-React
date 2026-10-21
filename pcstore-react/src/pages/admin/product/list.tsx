import React, { useState, useRef } from 'react';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Download,
    Calendar,
    Check,
    Upload,
    Camera,
    Copy,
    ExternalLink,
    Sparkles,
    Globe,
    FileText,
    TrendingUp,
    Layers,
    ArrowUpRight,
    Search,
    Info,
    RefreshCw,
    ShieldCheck,
    Star,
    DollarSign,
    Percent,
    Warehouse,
    AlertTriangle,
    Image as ImageIcon,
    Tag,
    Cpu,
    Flame,
    Zap
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';

export type ProductStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface AdminProductItem {
    id: string;
    name: string;
    sku: string;
    slug: string;
    brand: string;
    category: string;
    price: number;
    originalPrice: number;
    discountPercent: number;
    stock: number;
    salesCount: number;
    image: string;
    gallery: string[];
    warranty: string;
    status: ProductStatus;
    isFeatured: boolean;
    isHot: boolean;
    badge?: 'HOT' | 'NEW' | 'SALE' | 'BEST' | null;
    shortSpecs: string;
    description: string;
    createdAt: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
}

// Slug Generator
const generateSlug = (str: string) => {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Format currency
const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Initial Realistic Mock Data for PC Store
const INITIAL_PRODUCTS: AdminProductItem[] = [
    {
        id: 'prod-1',
        name: 'Bộ PC Hatsune Miku Ryzen 7 9800X3D, RAM 32GB, VGA RTX 5080 16GB',
        sku: 'PC-MIKU-9800X3D',
        slug: 'bo-pc-hatsune-miku-ryzen-7-9800x3d-rtx-5080',
        brand: 'ASUS',
        category: 'PC Gaming',
        price: 136000000,
        originalPrice: 145000000,
        discountPercent: 6,
        stock: 5,
        salesCount: 14,
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'HOT',
        shortSpecs: 'Ryzen 7 9800X3D | 32GB DDR5 | RTX 5080 16GB | NVMe 2TB',
        description: 'Bộ máy tính để bàn PC Gaming phiên bản giới hạn Hatsune Miku kết hợp sức mạnh vô địch từ AMD Ryzen 7 9800X3D và Card đồ họa RTX 5080 kiến trúc Blackwell mới nhất.',
        createdAt: '2024-01-10',
        metaTitle: 'Bộ PC Gaming Hatsune Miku Ryzen 7 9800X3D RTX 5080 | PCStore',
        metaDescription: 'Siêu phẩm PC Gaming Hatsune Miku cấu hình khủng Ryzen 7 9800X3D và RTX 5080 16GB bảo hành chính hãng 3 năm.',
        metaKeywords: 'pc gaming, hatsune miku, ryzen 7 9800x3d, rtx 5080',
    },
    {
        id: 'prod-2',
        name: 'Card màn hình ASUS ROG Strix GeForce RTX 4090 OC 24GB GDDR6X',
        sku: 'VGA-ASUS-4090-OC',
        slug: 'vga-asus-rog-strix-geforce-rtx-4090-oc-24gb',
        brand: 'ASUS',
        category: 'Card màn hình (VGA)',
        price: 56990000,
        originalPrice: 62000000,
        discountPercent: 8,
        stock: 12,
        salesCount: 38,
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'BEST',
        shortSpecs: '24GB GDDR6X | 384-bit | Boost 2640 MHz | Khung kim loại Diecast',
        description: 'Vua đồ họa thế giới trang bị hệ thống tản nhiệt buồng hơi Vapor Chamber độc quyền và quạt Axial-tech làm mát tối đa cho đồ họa 8K và AI Workstation.',
        createdAt: '2024-01-12',
        metaTitle: 'Card Màn Hình ASUS ROG Strix GeForce RTX 4090 OC 24GB | PCStore',
        metaDescription: 'VGA ASUS ROG Strix RTX 4090 OC 24GB chính hãng, hiệu năng đồ họa số 1 thế giới.',
        metaKeywords: 'rtx 4090, asus rog strix 4090, vga asus 4090',
    },
    {
        id: 'prod-3',
        name: 'Bộ vi xử lý Intel Core i9-14900K (Up to 6.0GHz, 24 Nhân 32 Luồng, 36MB Cache)',
        sku: 'CPU-INTEL-14900K',
        slug: 'cpu-intel-core-i9-14900k-up-to-6-0ghz',
        brand: 'Intel',
        category: 'Vi xử lý (CPU)',
        price: 15490000,
        originalPrice: 16990000,
        discountPercent: 9,
        stock: 20,
        salesCount: 65,
        image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: false,
        badge: 'HOT',
        shortSpecs: 'LGA 1700 | 24C/32T | Xung tối đa 6.0 GHz | TDP 125W-253W',
        description: 'CPU thế hệ thứ 14 đỉnh cao của Intel, xung nhịp tự động ép xung vượt ngưỡng 6.0 GHz mang lại trải nghiệm chiến game mượt mà và render 3D nhanh như chớp.',
        createdAt: '2024-01-15',
        metaTitle: 'CPU Intel Core i9-14900K Chính Hãng Giá Tốt | PCStore',
        metaDescription: 'Mua CPU Intel Core i9-14900K thế hệ 14 mới nhất với 24 nhân 32 luồng, xung nhịp 6.0GHz.',
        metaKeywords: 'intel core i9 14900k, cpu intel 14th, i9 14900k',
    },
    {
        id: 'prod-4',
        name: 'Bộ vi xử lý AMD Ryzen 7 7800X3D (4.2GHz Boost 5.0GHz, 8C/16T, 104MB Cache 3D V-Cache)',
        sku: 'CPU-AMD-7800X3D',
        slug: 'cpu-amd-ryzen-7-7800x3d-3d-vcache',
        brand: 'AMD',
        category: 'Vi xử lý (CPU)',
        price: 10890000,
        originalPrice: 11990000,
        discountPercent: 9,
        stock: 8,
        salesCount: 92,
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'HOT',
        shortSpecs: 'Socket AM5 | 8C/16T | 96MB 3D V-Cache | TDP 120W',
        description: 'Bộ vi xử lý chơi game đỉnh cao số 1 thế giới với bộ nhớ đệm 3D V-Cache khổng lồ 104MB, tiêu thụ điện năng cực thấp và hoạt động mát mẻ.',
        createdAt: '2024-01-18',
        metaTitle: 'CPU AMD Ryzen 7 7800X3D - Vua Game Thế Giới | PCStore',
        metaDescription: 'Bộ vi xử lý AMD Ryzen 7 7800X3D chính hãng socket AM5, công nghệ 3D V-Cache tối ưu cho game thủ.',
        metaKeywords: 'ryzen 7 7800x3d, amd 7800x3d, cpu amd ryzen',
    },
    {
        id: 'prod-5',
        name: 'Bo mạch chủ MSI MAG B760 TOMAHAWK WIFI DDR5',
        sku: 'MAIN-MSI-B760-TOMA',
        slug: 'bo-mach-chu-msi-mag-b760-tomahawk-wifi-ddr5',
        brand: 'MSI',
        category: 'Bo mạch chủ',
        price: 5290000,
        originalPrice: 5890000,
        discountPercent: 10,
        stock: 15,
        salesCount: 47,
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: false,
        isHot: true,
        badge: 'BEST',
        shortSpecs: 'Chipset B760 | LGA 1700 | 4x DDR5 7000+ MHz | WiFi 6E & 2.5G LAN',
        description: 'Dòng bo mạch chủ quốc dân với thiết kế tản nhiệt kim loại dày dặn, VRM 12+1+1 pha điện kỹ thuật số chịu tải hoàn hảo cho Intel Core i5 và Core i7.',
        createdAt: '2024-01-20',
        metaTitle: 'Mainboard MSI MAG B760 TOMAHAWK WIFI DDR5 | PCStore',
        metaDescription: 'Bo mạch chủ MSI B760 Tomahawk DDR5 hỗ trợ CPU Intel Gen 12, 13, 14.',
        metaKeywords: 'msi b760, b760 tomahawk, mainboard msi ddr5',
    },
    {
        id: 'prod-6',
        name: 'Bộ nhớ RAM Corsair Dominator Titanium RGB 32GB (2x16GB) DDR5 6000MHz White',
        sku: 'RAM-COR-DOM-32G',
        slug: 'ram-corsair-dominator-titanium-rgb-32gb-ddr5-6000mhz',
        brand: 'Corsair',
        category: 'Bộ nhớ RAM',
        price: 4990000,
        originalPrice: 5690000,
        discountPercent: 12,
        stock: 18,
        salesCount: 53,
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: 'Lifetime (Trọn đời)',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: false,
        badge: 'NEW',
        shortSpecs: '32GB (2x16GB) | DDR5 6000MHz | CL30 | LED RGB 11 vùng iCUE',
        description: 'Tuyệt tác RAM DDR5 cao cấp nhất từ Corsair với nắp tản nhiệt có thể thay thế mô-đun, chip nhớ chọn lọc thủ công cho khả năng ép xung tối đa.',
        createdAt: '2024-01-22',
        metaTitle: 'RAM Corsair Dominator Titanium RGB 32GB DDR5 6000MHz | PCStore',
        metaDescription: 'RAM Corsair Dominator Titanium DDR5 màu trắng cao cấp, tương thích Intel XMP 3.0 và AMD EXPO.',
        metaKeywords: 'ram corsair, dominator titanium, ram ddr5 6000mhz',
    },
    {
        id: 'prod-7',
        name: 'Ổ cứng SSD Samsung 990 Pro 2TB PCIe Gen 4.0 x4 NVMe M.2',
        sku: 'SSD-SSG-990PRO-2TB',
        slug: 'ssd-samsung-990-pro-2tb-pcie-gen-4-nvme',
        brand: 'Samsung',
        category: 'Ổ cứng SSD',
        price: 4890000,
        originalPrice: 5490000,
        discountPercent: 11,
        stock: 22,
        salesCount: 84,
        image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '60 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'BEST',
        shortSpecs: 'Dung lượng 2TB | Đọc 7450 MB/s | Ghi 6900 MB/s | V-NAND TLC',
        description: 'Ổ cứng thể rắn M.2 NVMe nhanh nhất phân khúc Gen 4, tối ưu hóa băng thông cho đồ họa 4K/8K, PS5 và load game không độ trễ.',
        createdAt: '2024-01-25',
        metaTitle: 'SSD Samsung 990 Pro 2TB NVMe M.2 Tốc Độ 7450MB/s | PCStore',
        metaDescription: 'Ổ cứng SSD Samsung 990 Pro 2TB chính hãng bảo hành 5 năm, tốc độ đọc 7450MB/s.',
        metaKeywords: 'ssd samsung 990 pro, samsung 990 pro 2tb, ssd m2 nvme',
    },
    {
        id: 'prod-8',
        name: 'Vỏ case Lian Li O11 Vision Chrome (3 mặt kính cường lực không viền)',
        sku: 'CASE-LL-O11-VIS-CR',
        slug: 'vo-case-lian-li-o11-vision-chrome',
        brand: 'Lian Li',
        category: 'Vỏ Case',
        price: 3690000,
        originalPrice: 4200000,
        discountPercent: 12,
        stock: 9,
        salesCount: 31,
        image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '12 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: false,
        badge: 'NEW',
        shortSpecs: 'Mid-Tower | 3 mặt kính tráng gương | Hỗ trợ 2x Radiator 360mm | Khay mainboard lùi',
        description: 'Sản phẩm hợp tác đỉnh cao giữa Lian Li và PCMR, thiết kế 3 mặt kính cường lực liền khối không cột góc cho góc nhìn toàn cảnh linh kiện máy tính.',
        createdAt: '2024-02-01',
        metaTitle: 'Vỏ Case Bể Cá Lian Li O11 Vision Chrome Chính Hãng | PCStore',
        metaDescription: 'Case máy tính Lian Li O11 Vision bản Chrome tráng gương phản chiếu tuyệt đẹp.',
        metaKeywords: 'lian li o11 vision, case be ca, o11 vision chrome',
    },
    {
        id: 'prod-9',
        name: 'Nguồn máy tính Corsair RM1000x Shift 1000W 80 Plus Gold Fully Modular',
        sku: 'PSU-COR-RM1000X-SH',
        slug: 'nguon-corsair-rm1000x-shift-1000w-80-plus-gold',
        brand: 'Corsair',
        category: 'Nguồn máy tính (PSU)',
        price: 5190000,
        originalPrice: 5690000,
        discountPercent: 9,
        stock: 14,
        salesCount: 29,
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '120 Tháng (10 Năm)',
        status: 'IN_STOCK',
        isFeatured: false,
        isHot: false,
        badge: null,
        shortSpecs: '1000W | 80 Plus Gold | Chuẩn ATX 3.0 & PCIe 5.0 | Cổng cắm bên hông',
        description: 'Thiết kế cổng cắm mô-đun xoay ngang bên hông mang tính đột phá giúp việc đi dây và quản lý cáp trong thùng máy trở nên dễ dàng chưa từng thấy.',
        createdAt: '2024-02-05',
        metaTitle: 'Nguồn Corsair RM1000x Shift 1000W ATX 3.0 Chuẩn Gold | PCStore',
        metaDescription: 'Nguồn Corsair RM1000x Shift 1000W chuẩn PCIe 5.0 12VHPWR cho card đồ họa RTX 4080/4090.',
        metaKeywords: 'corsair rm1000x shift, nguon 1000w, nguon corsair gold',
    },
    {
        id: 'prod-10',
        name: 'Màn hình Dell UltraSharp U2724D 27 inch 2K 120Hz IPS Black 100% sRGB',
        sku: 'MON-DELL-U2724D',
        slug: 'man-hinh-dell-ultrasharp-u2724d-27-inch-2k-120hz',
        brand: 'Dell',
        category: 'Màn hình máy tính',
        price: 10490000,
        originalPrice: 11990000,
        discountPercent: 13,
        stock: 7,
        salesCount: 42,
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'SALE',
        shortSpecs: '27 inch 2K QHD | IPS Black tương phản 2000:1 | 120Hz mượt mà | Cảm biến ánh sáng',
        description: 'Màn hình chuyên nghiệp dành cho thiết kế đồ họa cao cấp ứng dụng tấm nền IPS Black độc quyền của LG giúp màu đen sâu gấp đôi màn IPS thông thường.',
        createdAt: '2024-02-10',
        metaTitle: 'Màn Hình Đồ Họa Dell UltraSharp U2724D 2K 120Hz | PCStore',
        metaDescription: 'Màn hình Dell UltraSharp U2724D độ phân giải 2K 120Hz chuẩn màu đồ họa 100% sRGB 98% DCI-P3.',
        metaKeywords: 'dell u2724d, man hinh dell ultrasharp, u2724d 120hz',
    },
    {
        id: 'prod-11',
        name: 'Chuột Logitech G Pro X Superlight 2 Wireless Black (Cảm biến HERO 2 32.000 DPI)',
        sku: 'GEAR-LOGI-GPX2-BK',
        slug: 'chuot-logitech-g-pro-x-superlight-2-wireless-black',
        brand: 'Logitech',
        category: 'Phụ kiện & Gaming Gear',
        price: 3490000,
        originalPrice: 3890000,
        discountPercent: 10,
        stock: 3,
        salesCount: 115,
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '24 Tháng',
        status: 'LOW_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'HOT',
        shortSpecs: 'Siêu nhẹ 60g | Switch quang học lai LIGHTFORCE | Tần số quét 4000Hz | Pin 95 giờ',
        description: 'Vũ khí tối thượng của các game thủ bắn súng FPS chuyên nghiệp trên toàn thế giới, tốc độ phản hồi 0.25ms và trọng lượng siêu nhẹ 60 gram.',
        createdAt: '2024-02-15',
        metaTitle: 'Chuột Không Dây Logitech G Pro X Superlight 2 | PCStore',
        metaDescription: 'Chuột eSports Logitech GPX 2 Superlight bảo hành chính hãng 2 năm 1 đổi 1.',
        metaKeywords: 'logitech g pro x superlight 2, chuot gpx2, chuot gaming logitech',
    },
    {
        id: 'prod-12',
        name: 'Tản nhiệt khí Thermalright Peerless Assassin 120 SE ARGB',
        sku: 'COOL-THR-PA120-SE',
        slug: 'tan-nhiet-khi-thermalright-peerless-assassin-120-se-argb',
        brand: 'Thermalright',
        category: 'Tản nhiệt CPU',
        price: 850000,
        originalPrice: 1100000,
        discountPercent: 23,
        stock: 0,
        salesCount: 156,
        image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '24 Tháng',
        status: 'OUT_OF_STOCK',
        isFeatured: false,
        isHot: true,
        badge: 'BEST',
        shortSpecs: 'Tháp đôi Dual Tower | 6 ống đồng DTP AGHP Gen 4 | 2 quạt 120mm ARGB | TDP 245W',
        description: 'Vua tản nhiệt khí quốc dân với hiệu năng giải nhiệt tương đương các bộ tản nước AIO 240mm đắt tiền trong tầm giá dưới 1 triệu đồng.',
        createdAt: '2024-02-20',
        metaTitle: 'Tản Nhiệt Khí Thermalright Peerless Assassin 120 SE ARGB | PCStore',
        metaDescription: 'Tản tháp đôi Thermalright PA120 SE làm mát cực tốt cho CPU Intel Core i7 và Ryzen 7.',
        metaKeywords: 'peerless assassin 120, tan nhiet thermalright, pa120 se',
    },
    {
        id: 'prod-13',
        name: 'Bo mạch chủ ASUS ROG MAXIMUS Z790 HERO DDR5',
        sku: 'MAIN-ASUS-Z790-HERO',
        slug: 'bo-mach-chu-asus-rog-maximus-z790-hero-ddr5',
        brand: 'ASUS',
        category: 'Bo mạch chủ',
        price: 16990000,
        originalPrice: 18500000,
        discountPercent: 8,
        stock: 6,
        salesCount: 19,
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: false,
        badge: 'NEW',
        shortSpecs: 'Chipset Intel Z790 | 20+1 Power Stages | PCIe 5.0 | Màn hình Polymo Lighting',
        description: 'Bo mạch chủ cao cấp chuyên dụng cho các hệ thống PC Gaming và ép xung cao cấp đỉnh cao của ASUS ROG.',
        createdAt: '2024-02-25',
        metaTitle: 'Mainboard ASUS ROG MAXIMUS Z790 HERO DDR5 | PCStore',
        metaDescription: 'Bo mạch chủ ROG Maximus Z790 Hero đẳng cấp với dàn VRM 20+1 pha và cổng Thunderbolt 4.',
        metaKeywords: 'asus z790 hero, rog maximus z790, mainboard z790',
    },
    {
        id: 'prod-14',
        name: 'Card màn hình MSI GeForce RTX 4070 Ti SUPER 16G GAMING X SLIM',
        sku: 'VGA-MSI-4070TIS-SLIM',
        slug: 'vga-msi-geforce-rtx-4070-ti-super-16g-gaming-x-slim',
        brand: 'MSI',
        category: 'Card màn hình (VGA)',
        price: 24990000,
        originalPrice: 27500000,
        discountPercent: 9,
        stock: 11,
        salesCount: 34,
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: true,
        badge: 'HOT',
        shortSpecs: '16GB GDDR6X | 256-bit | TRI FROZR 3 tản nhiệt mỏng nhẹ | TORX FAN 5.0',
        description: 'Phiên bản Gaming X Slim mỏng nhẹ nhưng sở hữu sức mạnh đồ họa 16GB VRAM đáp ứng hoàn hảo game 2K/4K và dựng video.',
        createdAt: '2024-03-01',
        metaTitle: 'VGA MSI GeForce RTX 4070 Ti SUPER 16G GAMING X SLIM | PCStore',
        metaDescription: 'Card màn hình MSI RTX 4070 Ti Super Gaming X Slim chính hãng giá cực tốt.',
        metaKeywords: 'msi rtx 4070 ti super, vga msi slim, 4070 ti super 16gb',
    },
    {
        id: 'prod-15',
        name: 'Bộ nhớ RAM Kingston FURY Beast 32GB (2x16GB) DDR5 5600MHz RGB',
        sku: 'RAM-KST-FURY-32G',
        slug: 'ram-kingston-fury-beast-32gb-ddr5-5600mhz-rgb',
        brand: 'Kingston',
        category: 'Bộ nhớ RAM',
        price: 2890000,
        originalPrice: 3290000,
        discountPercent: 12,
        stock: 25,
        salesCount: 78,
        image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '36 Tháng',
        status: 'IN_STOCK',
        isFeatured: false,
        isHot: true,
        badge: 'SALE',
        shortSpecs: '32GB (2x16GB) | DDR5 5600MHz | CL36 | LED RGB đồng bộ Kingston FURY CTRL',
        description: 'Dòng RAM DDR5 quốc dân hiệu năng cao và độ ổn định bền bỉ vượt trội của Kingston.',
        createdAt: '2024-03-05',
        metaTitle: 'RAM Kingston FURY Beast RGB 32GB DDR5 5600MHz | PCStore',
        metaDescription: 'Bộ nhớ RAM Kingston FURY Beast DDR5 32GB bảo hành 3 năm 1 đổi 1.',
        metaKeywords: 'ram kingston fury, ddr5 5600mhz, ram fury beast',
    },
    {
        id: 'prod-16',
        name: 'Bàn phím cơ Razer Huntsman V3 Pro Tenkeyless Optical Switch Gen-2',
        sku: 'GEAR-RZR-HUNT-V3',
        slug: 'ban-phim-co-razer-huntsman-v3-pro-tkl',
        brand: 'Razer',
        category: 'Phụ kiện & Gaming Gear',
        price: 5290000,
        originalPrice: 5990000,
        discountPercent: 12,
        stock: 4,
        salesCount: 28,
        image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '24 Tháng',
        status: 'LOW_STOCK',
        isFeatured: true,
        isHot: false,
        badge: 'HOT',
        shortSpecs: 'Rapid Trigger 0.1-4.0mm | Switch Analog Quang Học | Keycap PBT Doubleshot',
        description: 'Bàn phím eSports đỉnh cao với tính năng kích hoạt tức thì Rapid Trigger mang lại lợi thế phản xạ tối đa trong game FPS.',
        createdAt: '2024-03-08',
        metaTitle: 'Bàn Phím Cơ Razer Huntsman V3 Pro TKL Rapid Trigger | PCStore',
        metaDescription: 'Bàn phím cơ gaming chuyên nghiệp Razer Huntsman V3 Pro TKL trang bị switch quang học analog.',
        metaKeywords: 'razer huntsman v3 pro, ban phim razer, rapid trigger',
    },
    {
        id: 'prod-17',
        name: 'Tản nhiệt khí Noctua NH-D15 chromax.black (Phiên bản đen huyền bí)',
        sku: 'COOL-NOC-D15-BLK',
        slug: 'tan-nhiet-khi-noctua-nh-d15-chromax-black',
        brand: 'Noctua',
        category: 'Tản nhiệt CPU',
        price: 3190000,
        originalPrice: 3500000,
        discountPercent: 9,
        stock: 8,
        salesCount: 45,
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '72 Tháng (6 Năm)',
        status: 'IN_STOCK',
        isFeatured: true,
        isHot: false,
        badge: 'BEST',
        shortSpecs: 'Dual Tower 6 Heatpipes | 2x Quạt NF-A15 140mm | Sơn đen tĩnh điện chromax',
        description: 'Vua tản khí thế giới đến từ nước Áo, hoạt động êm ái tuyệt đối và bảo hành chính hãng lên tới 6 năm.',
        createdAt: '2024-03-12',
        metaTitle: 'Tản Nhiệt Khí Noctua NH-D15 chromax.black Chính Hãng | PCStore',
        metaDescription: 'Tản nhiệt khí Noctua NH-D15 đen huyền bí cho CPU i9 và Ryzen 9.',
        metaKeywords: 'noctua nh-d15 chromax, tan nhiet noctua, nh-d15',
    },
    {
        id: 'prod-18',
        name: 'Vỏ case Corsair 5000D AIRFLOW Tempered Glass Mid-Tower White',
        sku: 'CASE-COR-5000D-WH',
        slug: 'vo-case-corsair-5000d-airflow-white',
        brand: 'Corsair',
        category: 'Vỏ Case',
        price: 3890000,
        originalPrice: 4290000,
        discountPercent: 9,
        stock: 10,
        salesCount: 37,
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
        ],
        warranty: '24 Tháng',
        status: 'IN_STOCK',
        isFeatured: false,
        isHot: false,
        badge: null,
        shortSpecs: 'Mid-Tower | Mặt lưới thông gió tối đa | Hỗ trợ 2x Radiator 360mm cùng lúc',
        description: 'Vỏ thùng máy tính chuẩn mực về luồng gió làm mát với thiết kế khoang cáp thông minh RapidRoute.',
        createdAt: '2024-03-15',
        metaTitle: 'Vỏ Case Corsair 5000D AIRFLOW Màu Trắng Chính Hãng | PCStore',
        metaDescription: 'Case máy tính Corsair 5000D Airflow rộng rãi, thoáng mát, kính cường lực sang trọng.',
        metaKeywords: 'corsair 5000d airflow, case corsair, 5000d trang',
    }
];

export default function ProductList() {
    const { showToast } = useToast();

    // Data State
    const [products, setProducts] = useState<AdminProductItem[]>(INITIAL_PRODUCTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<AdminProductItem | null>(null);

    // Active Tabs in Modals
    const [activeAddTab, setActiveAddTab] = useState('basic');
    const [activeEditTab, setActiveEditTab] = useState('basic');
    const [activeDetailTab, setActiveDetailTab] = useState('overview');

    // Add Form State
    const [addForm, setAddForm] = useState({
        name: '',
        sku: '',
        slug: '',
        brand: 'ASUS',
        category: 'PC Gaming',
        price: 15000000,
        originalPrice: 16500000,
        discountPercent: 9,
        stock: 10,
        warranty: '36 Tháng',
        status: 'IN_STOCK' as ProductStatus,
        isFeatured: false,
        isHot: false,
        badge: null as 'HOT' | 'NEW' | 'SALE' | 'BEST' | null,
        shortSpecs: '',
        description: '',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
    });

    // Edit Form State
    const [editForm, setEditForm] = useState<AdminProductItem | null>(null);

    // Image Input references
    const addImageInputRef = useRef<HTMLInputElement>(null);
    const editImageInputRef = useRef<HTMLInputElement>(null);

    // Filter fields configuration
    const filterFields: FilterField[] = [
        {
            name: 'category',
            label: 'Danh mục',
            type: 'select',
            placeholder: 'Tất cả danh mục',
            options: [
                { label: 'Tất cả danh mục', value: '' },
                { label: '🖥️ PC Gaming', value: 'PC Gaming' },
                { label: '🎮 Card màn hình (VGA)', value: 'Card màn hình (VGA)' },
                { label: '⚡ Vi xử lý (CPU)', value: 'Vi xử lý (CPU)' },
                { label: '🧩 Bo mạch chủ', value: 'Bo mạch chủ' },
                { label: '🚀 Bộ nhớ RAM', value: 'Bộ nhớ RAM' },
                { label: '💾 Ổ cứng SSD', value: 'Ổ cứng SSD' },
                { label: '📦 Vỏ Case', value: 'Vỏ Case' },
                { label: '🔌 Nguồn máy tính (PSU)', value: 'Nguồn máy tính (PSU)' },
                { label: '🖥️ Màn hình máy tính', value: 'Màn hình máy tính' },
                { label: '🖱️ Phụ kiện & Gaming Gear', value: 'Phụ kiện & Gaming Gear' },
                { label: '❄️ Tản nhiệt CPU', value: 'Tản nhiệt CPU' },
            ],
        },
        {
            name: 'brand',
            label: 'Thương hiệu',
            type: 'select',
            placeholder: 'Tất cả thương hiệu',
            options: [
                { label: 'Tất cả thương hiệu', value: '' },
                { label: 'ASUS', value: 'ASUS' },
                { label: 'MSI', value: 'MSI' },
                { label: 'Gigabyte', value: 'Gigabyte' },
                { label: 'Intel', value: 'Intel' },
                { label: 'AMD', value: 'AMD' },
                { label: 'Corsair', value: 'Corsair' },
                { label: 'Kingston', value: 'Kingston' },
                { label: 'Samsung', value: 'Samsung' },
                { label: 'Dell', value: 'Dell' },
                { label: 'Logitech', value: 'Logitech' },
                { label: 'Lian Li', value: 'Lian Li' },
                { label: 'Thermalright', value: 'Thermalright' },
            ],
        },
        {
            name: 'status',
            label: 'Tình trạng kho',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: '✅ Còn hàng (In Stock)', value: 'IN_STOCK' },
                { label: '⚠️ Sắp hết hàng (< 5 cái)', value: 'LOW_STOCK' },
                { label: '❌ Hết hàng (Out of Stock)', value: 'OUT_OF_STOCK' },
                { label: '⛔ Ngừng kinh doanh', value: 'DISCONTINUED' },
            ],
        },
        {
            name: 'badge',
            label: 'Nhãn sản phẩm',
            type: 'select',
            placeholder: 'Tất cả',
            options: [
                { label: 'Tất cả nhãn', value: '' },
                { label: '🔥 HOT', value: 'HOT' },
                { label: '✨ NEW', value: 'NEW' },
                { label: '🏷️ SALE', value: 'SALE' },
                { label: '⭐ BEST', value: 'BEST' },
            ],
        },
        {
            name: 'createdDate',
            label: 'Ngày thêm vào',
            type: 'date',
            placeholder: 'Chọn ngày',
        },
    ];

    // Filter Logic
    const filteredProducts = products.filter((p) => {
        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            const matchName = p.name.toLowerCase().includes(query);
            const matchSku = p.sku.toLowerCase().includes(query);
            const matchBrand = p.brand.toLowerCase().includes(query);
            const matchCat = p.category.toLowerCase().includes(query);
            if (!matchName && !matchSku && !matchBrand && !matchCat) return false;
        }

        // Category filter
        if (filters.category && p.category !== filters.category) {
            return false;
        }

        // Brand filter
        if (filters.brand && p.brand !== filters.brand) {
            return false;
        }

        // Status filter
        if (filters.status && p.status !== filters.status) {
            return false;
        }

        // Badge filter
        if (filters.badge && p.badge !== filters.badge) {
            return false;
        }

        // Date filter
        if (filters.createdDate && !p.createdAt.startsWith(filters.createdDate)) {
            return false;
        }

        return true;
    });

    const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Handlers
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleFilterChange = (newFilters: Record<string, string>) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleFilterReset = () => {
        setSearchQuery('');
        setFilters({});
        setCurrentPage(1);
        showToast('Đã xóa toàn bộ bộ lọc sản phẩm', 'info');
    };

    const handleExportExcel = () => {
        showToast(`Đã xuất danh sách ${filteredProducts.length} sản phẩm ra file Excel thành công`, 'success');
    };

    // Toggle Status / Stock
    const handleToggleStockStatus = (p: AdminProductItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextStatus: ProductStatus = p.status === 'IN_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK';
        setProducts(prev => prev.map(item => item.id === p.id ? { ...item, status: nextStatus } : item));
        showToast(
            `Đã chuyển trạng thái sản phẩm "${p.name.slice(0, 30)}..." sang ${nextStatus === 'IN_STOCK' ? 'Còn hàng' : 'Hết hàng'}`,
            nextStatus === 'IN_STOCK' ? 'success' : 'warning'
        );
    };

    // Delete Product
    const handleDeleteProduct = (p: AdminProductItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setProducts(prev => prev.filter(item => item.id !== p.id));
        showToast(`Đã xóa sản phẩm "${p.name}" khỏi hệ thống`, 'success');
    };

    // Open Modals
    const handleOpenDetail = (p: AdminProductItem) => {
        setSelectedProduct(p);
        setActiveDetailTab('overview');
        setIsDetailModalOpen(true);
    };

    const handleOpenEdit = (p: AdminProductItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedProduct(p);
        setEditForm({ ...p });
        setActiveEditTab('basic');
        setIsEditModalOpen(true);
    };

    // Save Edit
    const handleSaveEdit = () => {
        if (!editForm) return;
        if (!editForm.name.trim()) {
            showToast('Tên sản phẩm không được để trống', 'error');
            return;
        }
        if (!editForm.sku.trim()) {
            showToast('Mã SKU không được để trống', 'error');
            return;
        }

        setProducts(prev => prev.map(p => p.id === editForm.id ? editForm : p));
        setIsEditModalOpen(false);
        showToast(`Cập nhật thông tin sản phẩm "${editForm.name.slice(0, 30)}..." thành công`, 'success');
        if (selectedProduct?.id === editForm.id) {
            setSelectedProduct(editForm);
        }
    };

    // Add Product Submit
    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) {
            showToast('Vui lòng nhập tên sản phẩm', 'error');
            return;
        }
        if (!addForm.sku.trim()) {
            showToast('Vui lòng nhập mã SKU sản phẩm', 'error');
            return;
        }

        const newId = `prod-${Date.now().toString(36)}`;
        const finalSlug = addForm.slug || generateSlug(addForm.name);

        const newProduct: AdminProductItem = {
            id: newId,
            name: addForm.name.trim(),
            sku: addForm.sku.trim().toUpperCase(),
            slug: finalSlug,
            brand: addForm.brand,
            category: addForm.category,
            price: Number(addForm.price) || 0,
            originalPrice: Number(addForm.originalPrice) || Number(addForm.price),
            discountPercent: Number(addForm.discountPercent) || 0,
            stock: Number(addForm.stock) || 0,
            salesCount: 0,
            image: addForm.image,
            gallery: [addForm.image],
            warranty: addForm.warranty,
            status: addForm.status,
            isFeatured: addForm.isFeatured,
            isHot: addForm.isHot,
            badge: addForm.badge,
            shortSpecs: addForm.shortSpecs || 'Chưa cập nhật thông số nhanh',
            description: addForm.description || 'Chưa có bài viết mô tả chi tiết.',
            createdAt: new Date().toISOString().split('T')[0],
            metaTitle: addForm.metaTitle || `${addForm.name} Chính Hãng Giá Tốt | PCStore`,
            metaDescription: addForm.metaDescription || `Mua ngay ${addForm.name} tại PCStore giá ưu đãi, bảo hành ${addForm.warranty}.`,
            metaKeywords: addForm.metaKeywords || `${addForm.slug}, ${addForm.brand.toLowerCase()}`,
        };

        setProducts(prev => [newProduct, ...prev]);
        setIsAddModalOpen(false);
        showToast(`Đã thêm mới thành công sản phẩm "${newProduct.name}"`, 'success');

        // Reset Add Form
        setAddForm({
            name: '',
            sku: '',
            slug: '',
            brand: 'ASUS',
            category: 'PC Gaming',
            price: 15000000,
            originalPrice: 16500000,
            discountPercent: 9,
            stock: 10,
            warranty: '36 Tháng',
            status: 'IN_STOCK',
            isFeatured: false,
            isHot: false,
            badge: null,
            shortSpecs: '',
            description: '',
            image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
            metaTitle: '',
            metaDescription: '',
            metaKeywords: '',
        });
        setActiveAddTab('basic');
    };

    // Upload Image Handlers
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            if (isEditMode) {
                setEditForm(prev => prev ? { ...prev, image: objectUrl } : null);
            } else {
                setAddForm(prev => ({ ...prev, image: objectUrl }));
            }
            showToast(`Đã tải lên ảnh sản phẩm "${file.name}"`, 'info');
        }
    };

    // Copy Helper
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`Đã sao chép ${label}: ${text}`, 'info');
    };

    // Badge Renderer
    const renderBadge = (badge?: 'HOT' | 'NEW' | 'SALE' | 'BEST' | null) => {
        if (!badge) return null;
        switch (badge) {
            case 'HOT':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                        <Flame className="w-3 h-3 fill-white" /> HOT
                    </span>
                );
            case 'NEW':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">
                        <Zap className="w-3 h-3 fill-white" /> NEW
                    </span>
                );
            case 'SALE':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                        <Percent className="w-3 h-3" /> SALE
                    </span>
                );
            case 'BEST':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
                        <Star className="w-3 h-3 fill-white" /> BEST
                    </span>
                );
        }
    };

    // Stock Status Badge Renderer
    const renderStatusBadge = (status: ProductStatus, stock: number) => {
        switch (status) {
            case 'IN_STOCK':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Còn hàng ({stock})
                    </span>
                );
            case 'LOW_STOCK':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Sắp hết ({stock})
                    </span>
                );
            case 'OUT_OF_STOCK':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        Hết hàng
                    </span>
                );
            case 'DISCONTINUED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                        Ngừng bán
                    </span>
                );
        }
    };

    // Columns Configuration for AdminTable
    const columns: Column<AdminProductItem>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            render: (p) => (
                <div className="flex items-center gap-3.5 py-1 max-w-[340px]">
                    <div className="relative group shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 shadow-sm p-1 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
                            <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-contain rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';
                                }}
                            />
                        </div>
                        {p.isFeatured && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white rounded-full flex items-center justify-center shadow-md text-[9px]">
                                ★
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            {renderBadge(p.badge)}
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 text-[10px] font-mono border border-gray-200 font-semibold">
                                {p.sku}
                            </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors" title={p.name}>
                            {p.name}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 font-sans">
                            {p.shortSpecs}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'categoryBrand',
            header: 'Danh mục & Hãng',
            render: (p) => (
                <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {p.category}
                    </span>
                    <div className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span>{p.brand}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Giá bán & Giảm',
            render: (p) => (
                <div className="space-y-0.5">
                    <div className="text-sm font-bold text-rose-600">
                        {formatVND(p.price)}
                    </div>
                    {p.originalPrice > p.price && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-400 line-through">
                                {formatVND(p.originalPrice)}
                            </span>
                            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-1 rounded">
                                -{p.discountPercent}%
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'stock',
            header: 'Kho & Đã bán',
            render: (p) => (
                <div className="space-y-1">
                    {renderStatusBadge(p.status, p.stock)}
                    <div className="text-[11px] text-gray-500">
                        Đã bán: <strong className="text-gray-800">{p.salesCount}</strong>
                    </div>
                </div>
            ),
        },
        {
            key: 'warranty',
            header: 'Bảo hành',
            render: (p) => (
                <span className="inline-flex items-center gap-1 text-xs text-gray-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {p.warranty}
                </span>
            ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            render: (p) => (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {p.createdAt}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (p) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(p)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Xem chi tiết sản phẩm"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenEdit(p, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Chỉnh sửa sản phẩm"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleToggleStockStatus(p, e)}
                        className={`p-1.5 rounded-lg transition-colors ${p.status === 'IN_STOCK'
                            ? 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                        title={p.status === 'IN_STOCK' ? 'Đổi sang Hết hàng' : 'Đổi sang Còn hàng'}
                    >
                        {p.status === 'IN_STOCK' ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDeleteProduct(p, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa sản phẩm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Tabs for Add Modal
    const addModalTabs: ModalTab[] = [
        { id: 'basic', label: 'Thông tin cơ bản', icon: Package },
        { id: 'pricing', label: 'Giá & Tồn kho', icon: DollarSign },
        { id: 'media', label: 'Hình ảnh & Video', icon: ImageIcon },
        { id: 'seo', label: 'Cấu hình SEO & Mô tả', icon: Globe },
    ];

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        { id: 'overview', label: 'Tổng quan sản phẩm', icon: Package },
        { id: 'specs', label: 'Thông số kỹ thuật', icon: Cpu },
        { id: 'gallery', label: 'Bộ sưu tập ảnh', icon: ImageIcon },
        { id: 'seo', label: 'Mô phỏng SEO Google', icon: Globe },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Package className="w-7 h-7 text-blue-600" />
                        Quản lý sản phẩm & linh kiện PC
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Quản lý kho máy tính nguyên bộ, linh kiện phần cứng, giá bán, tồn kho và danh mục hiển thị
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        Xuất Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveAddTab('basic');
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm sản phẩm
                    </button>
                </div>
            </div>

            {/* Quick KPI Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng sản phẩm</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{products.length}</h3>
                        <p className="text-xs text-blue-600 font-medium mt-1">Đang quản lý trong kho</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang kinh doanh</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {products.filter(p => p.status === 'IN_STOCK').length}
                        </h3>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Sẵn sàng giao ngay</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cần nhập thêm</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {products.filter(p => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK').length}
                        </h3>
                        <p className="text-xs text-rose-500 font-medium mt-1">Sắp hết hoặc hết hàng</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giá trị tồn kho</p>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">
                            {formatVND(products.reduce((acc, curr) => acc + curr.price * curr.stock, 0))}
                        </h3>
                        <p className="text-xs text-indigo-600 font-medium mt-1">Định giá kho hiện tại</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Warehouse className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm kiếm linh kiện theo tên, mã SKU, thương hiệu, thông số..."
            />

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={paginatedProducts}
                    rowKey="id"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredProducts.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 15, 20]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    onRowClick={(item) => handleOpenDetail(item)}
                    itemUnitName="sản phẩm"
                    emptyText="Không tìm thấy sản phẩm hoặc linh kiện nào phù hợp với bộ lọc hiện tại."
                />
            </div>

            {/* ========================================================================= */}
            {/* ADD PRODUCT MODAL                                                         */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm mới sản phẩm / linh kiện máy tính"
                description="Nhập thông tin sản phẩm, định giá niêm yết, số lượng tồn kho và cấu hình SEO"
                size="2xl"
                tabs={addModalTabs}
                activeTab={activeAddTab}
                onTabChange={setActiveAddTab}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleAddSubmit}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo sản phẩm
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* TAB 1: THÔNG TIN CƠ BẢN */}
                    {activeAddTab === 'basic' && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tên sản phẩm <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Card màn hình ASUS ROG Strix GeForce RTX 4090 OC 24GB..."
                                    value={addForm.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setAddForm(prev => ({
                                            ...prev,
                                            name: newName,
                                            slug: generateSlug(newName),
                                            sku: prev.sku || `SKU-${Date.now().toString(36).slice(-5).toUpperCase()}`
                                        }));
                                    }}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mã SKU sản phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="VGA-ASUS-4090-OC"
                                        value={addForm.sku}
                                        onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono uppercase text-gray-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Thời hạn bảo hành chính hãng
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="36 Tháng"
                                        value={addForm.warranty}
                                        onChange={(e) => setAddForm({ ...addForm, warranty: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Slug */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Đường dẫn tĩnh (Slug URL) <span className="text-rose-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setAddForm(prev => ({ ...prev, slug: generateSlug(prev.name) }))}
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Tạo lại slug
                                    </button>
                                </div>
                                <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                                    <span className="inline-flex items-center px-3.5 bg-gray-50 text-gray-500 text-xs font-mono border-r border-gray-200">
                                        pcstore.vn/san-pham/
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={addForm.slug}
                                        onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Danh mục sản phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={addForm.category}
                                        onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="PC Gaming">🖥️ PC Gaming</option>
                                        <option value="PC Đồ Họa">🎨 PC Đồ Họa & Render</option>
                                        <option value="Card màn hình (VGA)">🎮 Card màn hình (VGA)</option>
                                        <option value="Vi xử lý (CPU)">⚡ Vi xử lý (CPU)</option>
                                        <option value="Bo mạch chủ">🧩 Bo mạch chủ</option>
                                        <option value="Bộ nhớ RAM">🚀 Bộ nhớ RAM</option>
                                        <option value="Ổ cứng SSD">💾 Ổ cứng SSD</option>
                                        <option value="Vỏ Case">📦 Vỏ Case</option>
                                        <option value="Nguồn máy tính (PSU)">🔌 Nguồn máy tính (PSU)</option>
                                        <option value="Màn hình máy tính">🖥️ Màn hình máy tính</option>
                                        <option value="Phụ kiện & Gaming Gear">🖱️ Phụ kiện & Gaming Gear</option>
                                        <option value="Tản nhiệt CPU">❄️ Tản nhiệt CPU</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Thương hiệu sản xuất <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={addForm.brand}
                                        onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="ASUS">ASUS</option>
                                        <option value="MSI">MSI</option>
                                        <option value="Gigabyte">Gigabyte</option>
                                        <option value="Intel">Intel</option>
                                        <option value="AMD">AMD</option>
                                        <option value="Corsair">Corsair</option>
                                        <option value="Kingston">Kingston</option>
                                        <option value="Samsung">Samsung</option>
                                        <option value="Dell">Dell</option>
                                        <option value="Logitech">Logitech</option>
                                        <option value="Razer">Razer</option>
                                        <option value="Lian Li">Lian Li</option>
                                        <option value="Thermalright">Thermalright</option>
                                        <option value="Noctua">Noctua</option>
                                    </select>
                                </div>
                            </div>

                            {/* Short Specs */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Thông số tóm tắt nhanh (Quick Specs)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: 24GB GDDR6X | 384-bit | Boost 2640 MHz | Khung kim loại"
                                    value={addForm.shortSpecs}
                                    onChange={(e) => setAddForm({ ...addForm, shortSpecs: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                                <p className="text-xs text-gray-400 mt-1">Xuất hiện ngay dưới tên sản phẩm ở bảng danh sách và card sản phẩm ngoài trang chủ</p>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: GIÁ & TỒN KHO */}
                    {activeAddTab === 'pricing' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Giá bán ưu đãi (VNĐ) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="10000"
                                            required
                                            value={addForm.price}
                                            onChange={(e) => {
                                                const p = Number(e.target.value) || 0;
                                                const orig = addForm.originalPrice || p;
                                                const disc = orig > p ? Math.round(((orig - p) / orig) * 100) : 0;
                                                setAddForm({ ...addForm, price: p, discountPercent: disc });
                                            }}
                                            className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-bold text-rose-600 transition-all"
                                        />
                                        <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 font-medium">VNĐ</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Hiển thị: {formatVND(addForm.price)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Giá gốc niêm yết (VNĐ)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="10000"
                                            value={addForm.originalPrice}
                                            onChange={(e) => {
                                                const orig = Number(e.target.value) || 0;
                                                const p = addForm.price;
                                                const disc = orig > p ? Math.round(((orig - p) / orig) * 100) : 0;
                                                setAddForm({ ...addForm, originalPrice: orig, discountPercent: disc });
                                            }}
                                            className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                        <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 font-medium">VNĐ</span>
                                    </div>
                                    <p className="text-xs text-rose-500 mt-1 font-medium">
                                        Giảm giá: {addForm.discountPercent}%
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Số lượng tồn kho ban đầu
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={addForm.stock}
                                        onChange={(e) => {
                                            const st = parseInt(e.target.value) || 0;
                                            let stt: ProductStatus = 'IN_STOCK';
                                            if (st === 0) stt = 'OUT_OF_STOCK';
                                            else if (st < 5) stt = 'LOW_STOCK';
                                            setAddForm({ ...addForm, stock: st, status: stt });
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tình trạng kho hàng
                                    </label>
                                    <select
                                        value={addForm.status}
                                        onChange={(e) => setAddForm({ ...addForm, status: e.target.value as ProductStatus })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="IN_STOCK">✅ Còn hàng sẵn sàng bán</option>
                                        <option value="LOW_STOCK">⚠️ Sắp hết hàng (&lt; 5 cái)</option>
                                        <option value="OUT_OF_STOCK">❌ Hết hàng trong kho</option>
                                        <option value="DISCONTINUED">⛔ Ngừng kinh doanh</option>
                                    </select>
                                </div>
                            </div>

                            {/* Badge and Featured */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Huy hiệu nổi bật (Badge)
                                    </label>
                                    <select
                                        value={addForm.badge || ''}
                                        onChange={(e) => setAddForm({ ...addForm, badge: (e.target.value || null) as any })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="">Không gắn nhãn</option>
                                        <option value="HOT">🔥 HOT (Bán chạy nhất)</option>
                                        <option value="NEW">✨ NEW (Hàng mới về)</option>
                                        <option value="SALE">🏷️ SALE (Khuyến mãi sốc)</option>
                                        <option value="BEST">⭐ BEST (Khuyên dùng)</option>
                                    </select>
                                </div>

                                <div className="space-y-3 pt-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={addForm.isFeatured}
                                            onChange={(e) => setAddForm({ ...addForm, isFeatured: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Đưa vào danh sách Sản phẩm Nổi bật (Featured)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: HÌNH ẢNH */}
                    {activeAddTab === 'media' && (
                        <div className="space-y-5">
                            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                    Ảnh đại diện chính sản phẩm
                                </label>
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="w-32 h-32 rounded-2xl bg-white border border-gray-200 shadow-sm p-2 flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                            src={addForm.image}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="space-y-2 text-center sm:text-left">
                                        <input
                                            ref={addImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageFileChange(e, false)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addImageInputRef.current?.click()}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Tải ảnh từ máy tính
                                        </button>
                                        <p className="text-xs text-gray-400">
                                            Hỗ trợ PNG, JPG, WebP. Nên dùng ảnh vuông nền trắng hoặc trong suốt chất lượng cao (tối thiểu 800x800px).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Hoặc dán đường link ảnh trực tiếp (URL)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://images.unsplash.com/..."
                                    value={addForm.image}
                                    onChange={(e) => setAddForm({ ...addForm, image: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SEO & MÔ TẢ */}
                    {activeAddTab === 'seo' && (
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Thẻ tiêu đề SEO (Meta Title)
                                    </label>
                                    <span className="text-xs text-gray-400">
                                        {addForm.metaTitle.length}/60 ký tự khuyến nghị
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="[Tên sản phẩm] Chính Hãng Giá Rẻ Nhất | PCStore"
                                    value={addForm.metaTitle}
                                    onChange={(e) => setAddForm({ ...addForm, metaTitle: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Thẻ mô tả SEO (Meta Description)
                                    </label>
                                    <span className="text-xs text-gray-400">
                                        {addForm.metaDescription.length}/160 ký tự khuyến nghị
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    placeholder="Mua ngay sản phẩm chính hãng với bảo hành uy tín, miễn phí giao hàng toàn quốc và hỗ trợ trả góp 0% tại PCStore..."
                                    value={addForm.metaDescription}
                                    onChange={(e) => setAddForm({ ...addForm, metaDescription: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Mô tả chi tiết sản phẩm
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Mô tả công nghệ nổi bật, hiệu năng thực tế, tính năng tản nhiệt và hướng dẫn sử dụng..."
                                    value={addForm.description}
                                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                />
                            </div>

                            {/* SERP Preview */}
                            <div className="mt-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1.5 font-sans">
                                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                    Xem trước kết quả trên Google Search
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                        P
                                    </div>
                                    <span>pcstore.vn</span>
                                    <span className="text-gray-400">›</span>
                                    <span>san-pham</span>
                                    <span className="text-gray-400">›</span>
                                    <span className="text-gray-400">{addForm.slug || 'san-pham'}</span>
                                </div>
                                <h4 className="text-base text-blue-800 font-medium hover:underline cursor-pointer line-clamp-1">
                                    {addForm.metaTitle || `${addForm.name || 'Sản phẩm máy tính'} Chính Hãng Giá Tốt Nhất | PCStore`}
                                </h4>
                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                    {addForm.metaDescription || addForm.description || 'Mua sắm linh kiện máy tính, PC Gaming chính hãng giá cạnh tranh nhất thị trường.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT PRODUCT MODAL                                                        */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Chỉnh sửa: ${editForm.name}`}
                    description={`Mã SKU: ${editForm.sku} • Hãng: ${editForm.brand}`}
                    size="2xl"
                    tabs={addModalTabs}
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    footer={
                        <div className="flex items-center justify-end gap-3 w-full">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                            >
                                <Check className="w-4 h-4" />
                                Lưu thay đổi
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* TAB 1: THÔNG TIN CƠ BẢN */}
                        {activeEditTab === 'basic' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tên sản phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Mã SKU <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.sku}
                                            onChange={(e) => setEditForm({ ...editForm, sku: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono uppercase text-gray-800 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Thời hạn bảo hành
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.warranty}
                                            onChange={(e) => setEditForm({ ...editForm, warranty: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Đường dẫn tĩnh (Slug URL)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm(prev => prev ? { ...prev, slug: generateSlug(prev.name) } : null)}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Tạo lại từ tên
                                        </button>
                                    </div>
                                    <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                                        <span className="inline-flex items-center px-3.5 bg-gray-50 text-gray-500 text-xs font-mono border-r border-gray-200">
                                            pcstore.vn/san-pham/
                                        </span>
                                        <input
                                            type="text"
                                            value={editForm.slug}
                                            onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Danh mục
                                        </label>
                                        <select
                                            value={editForm.category}
                                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="PC Gaming">🖥️ PC Gaming</option>
                                            <option value="PC Đồ Họa">🎨 PC Đồ Họa & Render</option>
                                            <option value="Card màn hình (VGA)">🎮 Card màn hình (VGA)</option>
                                            <option value="Vi xử lý (CPU)">⚡ Vi xử lý (CPU)</option>
                                            <option value="Bo mạch chủ">🧩 Bo mạch chủ</option>
                                            <option value="Bộ nhớ RAM">🚀 Bộ nhớ RAM</option>
                                            <option value="Ổ cứng SSD">💾 Ổ cứng SSD</option>
                                            <option value="Vỏ Case">📦 Vỏ Case</option>
                                            <option value="Nguồn máy tính (PSU)">🔌 Nguồn máy tính (PSU)</option>
                                            <option value="Màn hình máy tính">🖥️ Màn hình máy tính</option>
                                            <option value="Phụ kiện & Gaming Gear">🖱️ Phụ kiện & Gaming Gear</option>
                                            <option value="Tản nhiệt CPU">❄️ Tản nhiệt CPU</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Thương hiệu
                                        </label>
                                        <select
                                            value={editForm.brand}
                                            onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="ASUS">ASUS</option>
                                            <option value="MSI">MSI</option>
                                            <option value="Gigabyte">Gigabyte</option>
                                            <option value="Intel">Intel</option>
                                            <option value="AMD">AMD</option>
                                            <option value="Corsair">Corsair</option>
                                            <option value="Kingston">Kingston</option>
                                            <option value="Samsung">Samsung</option>
                                            <option value="Dell">Dell</option>
                                            <option value="Logitech">Logitech</option>
                                            <option value="Lian Li">Lian Li</option>
                                            <option value="Thermalright">Thermalright</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Thông số tóm tắt nhanh
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.shortSpecs}
                                        onChange={(e) => setEditForm({ ...editForm, shortSpecs: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 2: GIÁ & TỒN KHO */}
                        {activeEditTab === 'pricing' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Giá bán ưu đãi (VNĐ)
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.price}
                                            onChange={(e) => {
                                                const p = Number(e.target.value) || 0;
                                                const orig = editForm.originalPrice || p;
                                                const disc = orig > p ? Math.round(((orig - p) / orig) * 100) : 0;
                                                setEditForm({ ...editForm, price: p, discountPercent: disc });
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-bold text-rose-600 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Giá gốc niêm yết (VNĐ)
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.originalPrice}
                                            onChange={(e) => {
                                                const orig = Number(e.target.value) || 0;
                                                const p = editForm.price;
                                                const disc = orig > p ? Math.round(((orig - p) / orig) * 100) : 0;
                                                setEditForm({ ...editForm, originalPrice: orig, discountPercent: disc });
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Số lượng tồn kho
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.stock}
                                            onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Trạng thái kinh doanh
                                        </label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProductStatus })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="IN_STOCK">Còn hàng (In Stock)</option>
                                            <option value="LOW_STOCK">Sắp hết hàng (Low Stock)</option>
                                            <option value="OUT_OF_STOCK">Hết hàng (Out of Stock)</option>
                                            <option value="DISCONTINUED">Ngừng kinh doanh</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Huy hiệu nhãn
                                        </label>
                                        <select
                                            value={editForm.badge || ''}
                                            onChange={(e) => setEditForm({ ...editForm, badge: (e.target.value || null) as any })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="">Không gắn nhãn</option>
                                            <option value="HOT">HOT</option>
                                            <option value="NEW">NEW</option>
                                            <option value="SALE">SALE</option>
                                            <option value="BEST">BEST</option>
                                        </select>
                                    </div>

                                    <div className="space-y-3 pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.isFeatured}
                                                onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Sản phẩm Nổi bật</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: HÌNH ẢNH */}
                        {activeEditTab === 'media' && (
                            <div className="space-y-5">
                                <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <div className="w-32 h-32 rounded-2xl bg-white border border-gray-200 shadow-sm p-2 flex items-center justify-center shrink-0 overflow-hidden">
                                            <img
                                                src={editForm.image}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="space-y-2 text-center sm:text-left">
                                            <input
                                                ref={editImageInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageFileChange(e, true)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => editImageInputRef.current?.click()}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Đổi ảnh sản phẩm
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        URL ảnh đại diện
                                    </label>
                                    <input
                                        type="url"
                                        value={editForm.image}
                                        onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 4: SEO & MÔ TẢ */}
                        {activeEditTab === 'seo' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Meta Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.metaTitle || ''}
                                        onChange={(e) => setEditForm({ ...editForm, metaTitle: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Meta Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editForm.metaDescription || ''}
                                        onChange={(e) => setEditForm({ ...editForm, metaDescription: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mô tả chi tiết
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={editForm.description || ''}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL PRODUCT MODAL                                                      */}
            {/* ========================================================================= */}
            {selectedProduct && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={selectedProduct.name}
                    description={`SKU: ${selectedProduct.sku} • Danh mục: ${selectedProduct.category}`}
                    size="2xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={setActiveDetailTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>Thêm vào hệ thống: {selectedProduct.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedProduct);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    Chỉnh sửa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* PRODUCT HERO SUMMARY */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200">
                            <div className="w-28 h-28 rounded-2xl bg-white p-2 border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
                                <img
                                    src={selectedProduct.image}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    {renderBadge(selectedProduct.badge)}
                                    <span className="font-mono text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {selectedProduct.sku}
                                    </span>
                                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                                        {selectedProduct.brand}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                                    {selectedProduct.name}
                                </h3>
                                <div className="flex items-baseline gap-2.5 justify-center sm:justify-start">
                                    <span className="text-xl font-extrabold text-rose-600">
                                        {formatVND(selectedProduct.price)}
                                    </span>
                                    {selectedProduct.originalPrice > selectedProduct.price && (
                                        <span className="text-xs text-gray-400 line-through">
                                            {formatVND(selectedProduct.originalPrice)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TAB 1: TỔNG QUAN SẢN PHẨM */}
                        {activeDetailTab === 'overview' && (
                            <div className="space-y-5">
                                {/* Stats Matrix */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Số lượng kho</span>
                                        <span className="text-lg font-bold text-gray-900 mt-0.5 block">{selectedProduct.stock} sản phẩm</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Đã bán</span>
                                        <span className="text-lg font-bold text-emerald-600 mt-0.5 block">{selectedProduct.salesCount} chiếc</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Bảo hành</span>
                                        <span className="text-sm font-bold text-gray-800 mt-1 block">{selectedProduct.warranty}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Trạng thái</span>
                                        <span className="text-sm font-bold text-emerald-600 mt-1 block">
                                            {selectedProduct.status === 'IN_STOCK' ? 'Còn hàng' : 'Hết hàng'}
                                        </span>
                                    </div>
                                </div>

                                {/* Fast Copy Meta Identifiers */}
                                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Mã SKU:</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                {selectedProduct.sku}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedProduct.sku, 'Mã SKU')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép SKU"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Đường dẫn sản phẩm:</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                /san-pham/{selectedProduct.slug}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(`https://pcstore.vn/san-pham/${selectedProduct.slug}`, 'Đường dẫn sản phẩm')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép Link"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Mô tả chi tiết & Điểm nhấn công nghệ
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                                        {selectedProduct.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
                        {activeDetailTab === 'specs' && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                                        Bảng thông số phần cứng chi tiết
                                    </h4>
                                    <div className="divide-y divide-gray-100 text-xs">
                                        <div className="py-2.5 flex items-center justify-between">
                                            <span className="text-gray-500">Mã sản phẩm / SKU:</span>
                                            <span className="font-mono font-bold text-gray-800">{selectedProduct.sku}</span>
                                        </div>
                                        <div className="py-2.5 flex items-center justify-between">
                                            <span className="text-gray-500">Thương hiệu:</span>
                                            <span className="font-semibold text-blue-600">{selectedProduct.brand}</span>
                                        </div>
                                        <div className="py-2.5 flex items-center justify-between">
                                            <span className="text-gray-500">Danh mục phân loại:</span>
                                            <span className="font-medium text-gray-800">{selectedProduct.category}</span>
                                        </div>
                                        <div className="py-2.5 flex items-center justify-between">
                                            <span className="text-gray-500">Cấu hình vắn tắt:</span>
                                            <span className="font-medium text-gray-800 text-right">{selectedProduct.shortSpecs}</span>
                                        </div>
                                        <div className="py-2.5 flex items-center justify-between">
                                            <span className="text-gray-500">Chính sách bảo hành:</span>
                                            <span className="font-semibold text-emerald-600">{selectedProduct.warranty}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: BỘ SƯU TẬP ẢNH */}
                        {activeDetailTab === 'gallery' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {selectedProduct.gallery.map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-xl bg-white border border-gray-200 p-2 shadow-sm flex items-center justify-center overflow-hidden hover:scale-105 transition-transform duration-200">
                                            <img
                                                src={img}
                                                alt={`Gallery ${idx}`}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: MÔ PHỎNG SEO GOOGLE */}
                        {activeDetailTab === 'seo' && (
                            <div className="space-y-4 font-sans">
                                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        Mô phỏng hiển thị trên Google Search
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                                P
                                            </div>
                                            <span>https://pcstore.vn</span>
                                            <span className="text-gray-400">›</span>
                                            <span>san-pham</span>
                                            <span className="text-gray-400">›</span>
                                            <span className="text-gray-500 font-medium">{selectedProduct.slug}</span>
                                        </div>

                                        <h4 className="text-lg text-blue-800 font-medium hover:underline cursor-pointer">
                                            {selectedProduct.metaTitle || `${selectedProduct.name} Chính Hãng Giá Tốt | PCStore`}
                                        </h4>

                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {selectedProduct.metaDescription || selectedProduct.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
