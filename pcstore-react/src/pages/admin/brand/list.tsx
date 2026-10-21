import React, { useState, useRef } from 'react';
import {
    Award,
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
    Package,
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
    Building2,
    MapPin,
    Wrench,
    Tag,
    Image as ImageIcon
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';

export type PartnerTier = 'DIAMOND' | 'GOLD' | 'SILVER' | 'OFFICIAL';

export interface BrandItem {
    id: string;
    name: string;
    code: string;
    slug: string;
    logo: string;
    bannerImage: string;
    country: string;
    countryCode: string;
    website: string;
    supportUrl: string;
    warrantyPolicy: string;
    foundedYear: number;
    tier: PartnerTier;
    description: string;
    mainCategories: string[];
    productsCount: number;
    status: 'ACTIVE' | 'HIDDEN';
    isFeatured: boolean;
    showOnMenu: boolean;
    order: number;
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

// Mock Brands Data for PC Store
const INITIAL_BRANDS: BrandItem[] = [
    {
        id: 'brand-asus',
        name: 'ASUS',
        code: 'ASUS',
        slug: 'asus',
        logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: 'https://www.asus.com/vn/',
        supportUrl: 'https://www.asus.com/vn/support/',
        warrantyPolicy: 'Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 30 ngày',
        foundedYear: 1989,
        tier: 'DIAMOND',
        description: 'Tập đoàn đa quốc gia chuyên sản xuất phần cứng máy tính và điện tử tiêu dùng số 1 thế giới với các thương hiệu ROG, TUF Gaming, ProArt.',
        mainCategories: ['Mainboard', 'Card màn hình (VGA)', 'Laptop Gaming', 'Màn hình', 'Router WiFi'],
        productsCount: 148,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 1,
        createdAt: '2024-01-05',
        metaTitle: 'Thương hiệu ASUS Chính Hãng - Mainboard, VGA, Laptop ROG | PCStore',
        metaDescription: 'Phân phối chính hãng các dòng sản phẩm linh kiện máy tính, laptop và phụ kiện gaming cao cấp từ thương hiệu ASUS.',
        metaKeywords: 'asus, rog, tuf gaming, vga asus, mainboard asus, asus vietnam',
    },
    {
        id: 'brand-msi',
        name: 'MSI',
        code: 'MSI',
        slug: 'msi',
        logo: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: 'https://vn.msi.com/',
        supportUrl: 'https://vn.msi.com/support',
        warrantyPolicy: 'Bảo hành 36 tháng đối với linh kiện, 24 tháng cho laptop',
        foundedYear: 1986,
        tier: 'DIAMOND',
        description: 'Micro-Star International là thương hiệu hàng đầu thế giới trong lĩnh vực game và thể thao điện tử (eSports), nổi tiếng với bo mạch chủ và card đồ họa.',
        mainCategories: ['Card màn hình (VGA)', 'Bo mạch chủ', 'Màn hình Gaming', 'Tản nhiệt AIO', 'Nguồn máy tính'],
        productsCount: 112,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 2,
        createdAt: '2024-01-08',
        metaTitle: 'MSI Gaming Chính Hãng - VGA, Mainboard, Màn Hình | PCStore',
        metaDescription: 'Mua sắm linh kiện máy tính MSI chính hãng, giá cạnh tranh, bảo hành nhanh chóng tại PCStore.',
        metaKeywords: 'msi, msi gaming, vga msi ventus, mainboard msi tomahawk',
    },
    {
        id: 'brand-gigabyte',
        name: 'Gigabyte',
        code: 'GIGA',
        slug: 'gigabyte',
        logo: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: 'https://www.gigabyte.com/vn',
        supportUrl: 'https://www.gigabyte.com/vn/Support',
        warrantyPolicy: 'Bảo hành 36 tháng cho Mainboard và VGA, hỗ trợ bảo hành cháy nổ linh kiện',
        foundedYear: 1986,
        tier: 'DIAMOND',
        description: 'Gigabyte Technology với thương hiệu AORUS cao cấp mang đến hiệu suất đồ họa đỉnh cao, độ bền Ultra Durable nổi tiếng trong cộng đồng PC Master Race.',
        mainCategories: ['Mainboard AORUS', 'Card đồ họa Gaming OC', 'Màn hình', 'Nguồn PSU', 'SSD M.2'],
        productsCount: 95,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 3,
        createdAt: '2024-01-10',
        metaTitle: 'Thương Hiệu Gigabyte & AORUS Chính Hãng | PCStore',
        metaDescription: 'Đại lý phân phối Gigabyte chính thức. Cung cấp Mainboard Aorus, card đồ họa Gaming OC bảo hành 36 tháng.',
        metaKeywords: 'gigabyte, aorus, main gigabyte, vga aorus, gigabyte vietnam',
    },
    {
        id: 'brand-intel',
        name: 'Intel',
        code: 'INTC',
        slug: 'intel',
        logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.intel.vn/',
        supportUrl: 'https://www.intel.vn/content/www/vn/vi/support.html',
        warrantyPolicy: 'Bảo hành chính hãng 36 tháng theo serial number toàn cầu',
        foundedYear: 1968,
        tier: 'DIAMOND',
        description: 'Nhà sản xuất vi xử lý bán dẫn hàng đầu thế giới, kiến tạo sức mạnh điện toán với các dòng CPU Intel Core i3, i5, i7, i9, Core Ultra và Intel Arc GPU.',
        mainCategories: ['Vi xử lý (CPU)', 'Card đồ họa Intel Arc', 'Bo mạch chủ chipset Intel', 'SSD Intel Optane'],
        productsCount: 68,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 4,
        createdAt: '2024-01-12',
        metaTitle: 'Bộ Vi Xử Lý CPU Intel Core i3, i5, i7, i9, Core Ultra | PCStore',
        metaDescription: 'CPU Intel thế hệ mới nhất cho máy tính để bàn và máy trạm đồ họa. Đầy đủ hóa đơn VAT, bảo hành chính hãng.',
        metaKeywords: 'intel, cpu intel, intel core i5, intel core i7, core ultra',
    },
    {
        id: 'brand-amd',
        name: 'AMD',
        code: 'AMD',
        slug: 'amd',
        logo: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.amd.com/en.html',
        supportUrl: 'https://www.amd.com/en/support',
        warrantyPolicy: 'Bảo hành 36 tháng cho bộ vi xử lý và card màn hình',
        foundedYear: 1969,
        tier: 'DIAMOND',
        description: 'Advanced Micro Devices tiên phong với kiến trúc Zen tân tiến trên CPU Ryzen và vi kiến trúc RDNA trên card đồ họa Radeon RX, giải pháp số 1 cho game thủ và sáng tạo.',
        mainCategories: ['Bộ vi xử lý Ryzen (CPU)', 'Card màn hình Radeon (VGA)', 'Mainboard Socket AM4/AM5'],
        productsCount: 54,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 5,
        createdAt: '2024-01-14',
        metaTitle: 'CPU AMD Ryzen & Card Đồ Họa AMD Radeon Chính Hãng | PCStore',
        metaDescription: 'Cung cấp CPU AMD Ryzen 5, 7, 9 7000/9000 Series và card đồ họa Radeon RX cực mát, giá ưu đãi.',
        metaKeywords: 'amd, cpu amd, amd ryzen, ryzen 7, radeon rx',
    },
    {
        id: 'brand-corsair',
        name: 'Corsair',
        code: 'COR',
        slug: 'corsair',
        logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.corsair.com/',
        supportUrl: 'https://help.corsair.com/',
        warrantyPolicy: 'RAM bảo hành trọn đời giới hạn (Lifetime), Nguồn bảo hành tới 10 năm',
        foundedYear: 1994,
        tier: 'GOLD',
        description: 'Thương hiệu linh kiện và thiết bị ngoại vi gaming hàng đầu Hoa Kỳ, nổi bật với hệ sinh thái iCUE, RAM Dominator/Vengeance và nguồn chuẩn 80 Plus Gold/Platinum.',
        mainCategories: ['Bộ nhớ RAM', 'Nguồn máy tính (PSU)', 'Tản nhiệt nước AIO', 'Bàn phím cơ', 'Case máy tính'],
        productsCount: 86,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 6,
        createdAt: '2024-01-16',
        metaTitle: 'Linh Kiện Corsair - RAM Vengeance, Nguồn RM, Tản Nước iCUE | PCStore',
        metaDescription: 'Phân phối chính hãng hệ sinh thái Corsair: RAM DDR4/DDR5, tản nhiệt nước, case máy tính cao cấp.',
        metaKeywords: 'corsair, ram corsair, nguon corsair, tan nhiet nuoc corsair',
    },
    {
        id: 'brand-kingston',
        name: 'Kingston',
        code: 'KST',
        slug: 'kingston',
        logo: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.kingston.com/vn',
        supportUrl: 'https://www.kingston.com/vn/support',
        warrantyPolicy: 'RAM bảo hành 36 tháng hoặc trọn đời sản phẩm, SSD bảo hành 3 - 5 năm',
        foundedYear: 1987,
        tier: 'GOLD',
        description: 'Kingston Technology là hãng sản xuất bộ nhớ độc lập lớn nhất thế giới, nổi danh với các dòng sản phẩm Kingston FURY Beast, Renegade và ổ cứng SSD NVMe tốc độ cao.',
        mainCategories: ['RAM Kingston FURY', 'Ổ cứng SSD M.2 NVMe', 'USB Flash Drive', 'Thẻ nhớ SD'],
        productsCount: 62,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: true,
        order: 7,
        createdAt: '2024-01-20',
        metaTitle: 'Kingston Technology - Bộ Nhớ RAM & Ổ Cứng SSD FURY | PCStore',
        metaDescription: 'Bộ nhớ RAM Kingston và SSD Kingston NV2, KC3000 chính hãng bảo hành 3-5 năm tại PCStore.',
        metaKeywords: 'kingston, ram kingston, kingston fury, ssd kingston',
    },
    {
        id: 'brand-samsung',
        name: 'Samsung',
        code: 'SSG',
        slug: 'samsung',
        logo: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80',
        country: 'Hàn Quốc 🇰🇷',
        countryCode: 'KR',
        website: 'https://www.samsung.com/vn/',
        supportUrl: 'https://www.samsung.com/vn/support/',
        warrantyPolicy: 'SSD bảo hành 60 tháng (5 năm) chính hãng, màn hình bảo hành 24-36 tháng',
        foundedYear: 1938,
        tier: 'DIAMOND',
        description: 'Gã khổng lồ công nghệ toàn cầu dẫn đầu về chip nhớ V-NAND Flash với các dòng SSD 980 Pro, 990 Pro và màn hình gaming cong Samsung Odyssey OLED đỉnh cao.',
        mainCategories: ['Ổ cứng SSD NVMe', 'Màn hình Odyssey Gaming', 'Bộ nhớ RAM', 'Thẻ nhớ'],
        productsCount: 47,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 8,
        createdAt: '2024-01-22',
        metaTitle: 'Samsung Electronics - SSD 990 Pro, Màn Hình Odyssey Gaming | PCStore',
        metaDescription: 'Ổ cứng SSD Samsung 980 Pro, 990 Pro chính hãng với tốc độ đọc ghi đỉnh cao lên tới 7450MB/s.',
        metaKeywords: 'samsung, ssd samsung, samsung 990 pro, man hinh samsung odyssey',
    },
    {
        id: 'brand-logitech',
        name: 'Logitech',
        code: 'LOGI',
        slug: 'logitech',
        logo: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1200&q=80',
        country: 'Thụy Sĩ 🇨🇭',
        countryCode: 'CH',
        website: 'https://www.logitech.com/vi-vn',
        supportUrl: 'https://support.logi.com/hc/vi',
        warrantyPolicy: 'Bảo hành 24 tháng 1 đổi 1 chính hãng Digiworld / SPC',
        foundedYear: 1981,
        tier: 'GOLD',
        description: 'Hãng phụ kiện máy tính hàng đầu thế giới với dòng sản phẩm văn phòng MX Master trứ danh và thương hiệu Logitech G phục vụ các vận động viên eSports chuyên nghiệp.',
        mainCategories: ['Chuột gaming Logitech G', 'Bàn phím cơ', 'Tai nghe chơi game', 'Webcam Streamer', 'Vô lăng đua xe G29'],
        productsCount: 78,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 9,
        createdAt: '2024-01-25',
        metaTitle: 'Phụ Kiện Máy Tính Logitech & Logitech G Chính Hãng | PCStore',
        metaDescription: 'Chuột Logitech G Pro X Superlight, bàn phím G913, chuột văn phòng MX Master 3S giá tốt nhất.',
        metaKeywords: 'logitech, logitech g, chuot logitech, ban phim logitech, g pro x superlight',
    },
    {
        id: 'brand-razer',
        name: 'Razer',
        code: 'RZR',
        slug: 'razer',
        logo: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.razer.com/',
        supportUrl: 'https://support.razer.com/',
        warrantyPolicy: 'Bảo hành chính hãng 24 tháng',
        foundedYear: 2005,
        tier: 'GOLD',
        description: 'Biểu tượng phong cách sống dành cho game thủ thế giới với slogan For Gamers. By Gamers. Sở hữu hệ sinh thái đèn nền Chroma RGB huyền thoại.',
        mainCategories: ['Chuột DeathAdder / Viper', 'Bàn phím Huntsman / BlackWidow', 'Tai nghe BlackShark', 'Micro Seiren'],
        productsCount: 52,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 10,
        createdAt: '2024-02-01',
        metaTitle: 'Gaming Gear Razer Chính Hãng - Chuột, Phím, Tai Nghe | PCStore',
        metaDescription: 'Phụ kiện gaming Razer Chroma RGB độc quyền, bảo hành chính hãng 2 năm 1 đổi 1.',
        metaKeywords: 'razer, razer chroma, chuot razer, ban phim razer, viper v3 pro',
    },
    {
        id: 'brand-wd',
        name: 'Western Digital',
        code: 'WDC',
        slug: 'western-digital',
        logo: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.westerndigital.com/vi-vn',
        supportUrl: 'https://support.westerndigital.com/',
        warrantyPolicy: 'WD Blue bảo hành 36 tháng, WD Black bảo hành 60 tháng (5 năm)',
        foundedYear: 1970,
        tier: 'GOLD',
        description: 'Tập đoàn lưu trữ dữ liệu hàng đầu với các dòng sản phẩm WD Green (tiết kiệm), WD Blue (đa dụng), WD Black (hiệu năng cao) và WD Red (chuyên cho ổ NAS).',
        mainCategories: ['Ổ cứng SSD WD Black SN850X', 'Ổ cứng SSD WD Blue', 'Ổ cứng HDD 3.5 inch', 'Ổ cứng di động My Passport'],
        productsCount: 41,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: false,
        order: 11,
        createdAt: '2024-02-05',
        metaTitle: 'Ổ Cứng Western Digital (WD) - SSD & HDD Chính Hãng | PCStore',
        metaDescription: 'Ổ cứng SSD NVMe WD Black SN850X chuyên game và HDD WD chuyên lưu trữ bảo hành chính hãng 3-5 năm.',
        metaKeywords: 'western digital, wd, ssd wd black, sn850x, hdd wd blue',
    },
    {
        id: 'brand-lianli',
        name: 'Lian Li',
        code: 'LL',
        slug: 'lian-li',
        logo: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: 'https://lian-li.com/',
        supportUrl: 'https://lian-li.com/contact-us/',
        warrantyPolicy: 'Bảo hành 24 tháng cho quạt và tản nhiệt, 12 tháng cho vỏ case',
        foundedYear: 1983,
        tier: 'GOLD',
        description: 'Hãng sản xuất vỏ máy tính nhôm cao cấp và phụ kiện modding số một thế giới, định hình xu hướng bể cá O11 Dynamic và quạt ghép nối Uni Fan.',
        mainCategories: ['Vỏ Case O11 Dynamic / Lancool', 'Quạt Uni Fan SL/TL', 'Dây nguồn Strimer Plus', 'Tản nhiệt nước Galahad II'],
        productsCount: 38,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 12,
        createdAt: '2024-02-10',
        metaTitle: 'Lian Li - Vỏ Case Bể Cá O11 & Quạt Tản Nhiệt Uni Fan | PCStore',
        metaDescription: 'Trải nghiệm đỉnh cao modding PC với case Lian Li O11 Vision, O11 Dynamic EVO và quạt Uni Fan SL-INF.',
        metaKeywords: 'lian li, o11 dynamic, uni fan sl, vo case lian li',
    },
    {
        id: 'brand-noctua',
        name: 'Noctua',
        code: 'NOC',
        slug: 'noctua',
        logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
        country: 'Áo 🇦🇹',
        countryCode: 'AT',
        website: 'https://noctua.at/en/',
        supportUrl: 'https://noctua.at/en/support',
        warrantyPolicy: 'Bảo hành lên tới 72 tháng (6 năm) đổi mới chính hãng',
        foundedYear: 2005,
        tier: 'SILVER',
        description: 'Thương hiệu tản nhiệt cao cấp đến từ nước Áo, chuẩn mực vàng về khả năng làm mát êm ái, tĩnh lặng tuyệt đối và độ bền vượt trội qua năm tháng.',
        mainCategories: ['Tản nhiệt khí NH-D15', 'Quạt tản nhiệt NF-A12x25', 'Keo tản nhiệt NT-H1 / NT-H2'],
        productsCount: 26,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: false,
        order: 13,
        createdAt: '2024-02-15',
        metaTitle: 'Tản Nhiệt Khí Noctua Nước Áo - Siêu Êm, Siêu Bền | PCStore',
        metaDescription: 'Vua tản nhiệt khí Noctua NH-D15, NH-U12A và quạt tản nhiệt chromax.black chính hãng bảo hành 6 năm.',
        metaKeywords: 'noctua, nh-d15, quat noctua, keo tan nhiet nt-h1',
    },
    {
        id: 'brand-dell',
        name: 'Dell',
        code: 'DELL',
        slug: 'dell',
        logo: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        country: 'Hoa Kỳ 🇺🇸',
        countryCode: 'US',
        website: 'https://www.dell.com/vi-vn',
        supportUrl: 'https://www.dell.com/support/home/vi-vn',
        warrantyPolicy: 'Bảo hành tận nơi ProSupport 36 tháng, 1 đổi 1 trong thời gian bảo hành',
        foundedYear: 1984,
        tier: 'OFFICIAL',
        description: 'Tập đoàn công nghệ máy tính số 1 thế giới dành cho doanh nghiệp, dòng màn hình Dell UltraSharp chuẩn màu chuyên dụng cho kiến trúc sư và đồ họa gia.',
        mainCategories: ['Màn hình Dell UltraSharp', 'Màn hình Gaming Alienware', 'Laptop Doanh Nghiệp', 'Máy trạm Workstation'],
        productsCount: 35,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        order: 14,
        createdAt: '2024-02-20',
        metaTitle: 'Màn Hình Dell UltraSharp & Phụ Kiện Dell Chính Hãng | PCStore',
        metaDescription: 'Màn hình đồ họa Dell UltraSharp U2424H, U2724D với độ phủ màu 100% sRGB và bảo hành tận nơi 3 năm.',
        metaKeywords: 'dell, dell ultrasharp, man hinh dell, u2424h, dell vietnam',
    },
    {
        id: 'brand-coolermaster',
        name: 'Cooler Master',
        code: 'CM',
        slug: 'cooler-master',
        logo: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: 'https://www.coolermaster.com/vn/vi-vn/',
        supportUrl: 'https://account.coolermaster.com/',
        warrantyPolicy: 'Bảo hành 24-60 tháng tùy dòng sản phẩm nguồn và tản nhiệt',
        foundedYear: 1992,
        tier: 'SILVER',
        description: 'Thương hiệu giải pháp nhiệt máy tính lâu đời từ Đài Loan, nổi tiếng với các dòng tản MasterLiquid, nguồn MWE và vỏ case HAF, MasterBox.',
        mainCategories: ['Nguồn máy tính Cooler Master MWE', 'Tản nhiệt nước MasterLiquid', 'Vỏ Case', 'Ghế Gaming Caliber'],
        productsCount: 44,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: false,
        order: 15,
        createdAt: '2024-03-01',
        metaTitle: 'Cooler Master - Nguồn Máy Tính, Tản Nhiệt & Case | PCStore',
        metaDescription: 'Giải pháp tản nhiệt và linh kiện máy tính Cooler Master chính hãng giá cực tốt tại PCStore.',
        metaKeywords: 'cooler master, nguon mwe, tan nhiet cooler master, case cooler master',
    },
    {
        id: 'brand-thermalright',
        name: 'Thermalright',
        code: 'THR',
        slug: 'thermalright',
        logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: 'http://www.thermalright.com/',
        supportUrl: 'http://www.thermalright.com/support/',
        warrantyPolicy: 'Bảo hành chính hãng 24 - 36 tháng',
        foundedYear: 2001,
        tier: 'SILVER',
        description: 'Hãng tản nhiệt quốc dân với tỉ lệ hiệu năng trên giá thành (P/P) vô địch thế giới, gây sốt với Peerless Assassin 120 SE và Phantom Spirit 120.',
        mainCategories: ['Tản nhiệt khí Peerless Assassin', 'Tản nhiệt nước Frozen Notte AIO', 'Quạt tản nhiệt TL-C12C'],
        productsCount: 29,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: false,
        order: 16,
        createdAt: '2024-03-10',
        metaTitle: 'Tản Nhiệt Thermalright Peerless Assassin & Frozen Notte | PCStore',
        metaDescription: 'Tản nhiệt CPU Thermalright giá rẻ hiệu năng cao, cân mọi dòng CPU Intel Core i7 và AMD Ryzen 7.',
        metaKeywords: 'thermalright, peerless assassin 120, phantom spirit, tan nhiet thermalright',
    }
];

export default function BrandList() {
    const { showToast } = useToast();

    // Data State
    const [brands, setBrands] = useState<BrandItem[]>(INITIAL_BRANDS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<BrandItem | null>(null);

    // Active Tab in Modals
    const [activeAddTab, setActiveAddTab] = useState('basic');
    const [activeEditTab, setActiveEditTab] = useState('basic');
    const [activeDetailTab, setActiveDetailTab] = useState('info');

    // Add Form State
    const [addForm, setAddForm] = useState({
        name: '',
        code: '',
        slug: '',
        country: 'Đài Loan 🇹🇼',
        countryCode: 'TW',
        website: '',
        supportUrl: '',
        warrantyPolicy: 'Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 30 ngày',
        foundedYear: 1990,
        tier: 'GOLD' as PartnerTier,
        description: '',
        mainCategories: [] as string[],
        logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        order: 10,
        status: 'ACTIVE' as 'ACTIVE' | 'HIDDEN',
        isFeatured: false,
        showOnMenu: true,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
    });

    // Edit Form State
    const [editForm, setEditForm] = useState<BrandItem | null>(null);

    // File input references for Logo & Banner upload
    const addLogoInputRef = useRef<HTMLInputElement>(null);
    const addBannerInputRef = useRef<HTMLInputElement>(null);
    const editLogoInputRef = useRef<HTMLInputElement>(null);
    const editBannerInputRef = useRef<HTMLInputElement>(null);

    // Available Category Tags for selection
    const ALL_AVAILABLE_CATEGORIES = [
        'Mainboard',
        'Card màn hình (VGA)',
        'Vi xử lý (CPU)',
        'Bộ nhớ RAM',
        'Ổ cứng SSD',
        'Nguồn máy tính (PSU)',
        'Vỏ Case',
        'Tản nhiệt CPU',
        'Màn hình Gaming',
        'Chuột máy tính',
        'Bàn phím cơ',
        'Tai nghe Gaming',
        'Ghế công thái học',
        'Router WiFi'
    ];

    // Filter fields for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'country',
            label: 'Quốc gia / Xuất xứ',
            type: 'select',
            placeholder: 'Tất cả quốc gia',
            options: [
                { label: 'Tất cả quốc gia', value: '' },
                { label: 'Đài Loan 🇹🇼', value: 'Đài Loan' },
                { label: 'Hoa Kỳ 🇺🇸', value: 'Hoa Kỳ' },
                { label: 'Hàn Quốc 🇰🇷', value: 'Hàn Quốc' },
                { label: 'Thụy Sĩ 🇨🇭', value: 'Thụy Sĩ' },
                { label: 'Áo 🇦🇹', value: 'Áo' },
            ],
        },
        {
            name: 'tier',
            label: 'Cấp bậc đối tác',
            type: 'select',
            placeholder: 'Tất cả cấp bậc',
            options: [
                { label: 'Tất cả cấp bậc', value: '' },
                { label: '💎 Kim Cương (Diamond)', value: 'DIAMOND' },
                { label: '🥇 Vàng (Gold)', value: 'GOLD' },
                { label: '🥈 Bạc (Silver)', value: 'SILVER' },
                { label: '🛡️ Chính Hãng (Official)', value: 'OFFICIAL' },
            ],
        },
        {
            name: 'status',
            label: 'Trạng thái hiển thị',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang hoạt động (ACTIVE)', value: 'ACTIVE' },
                { label: 'Đang ẩn (HIDDEN)', value: 'HIDDEN' },
            ],
        },
        {
            name: 'featured',
            label: 'Nổi bật',
            type: 'select',
            placeholder: 'Tất cả',
            options: [
                { label: 'Tất cả', value: '' },
                { label: '⭐ Thương hiệu nổi bật', value: 'true' },
                { label: 'Bình thường', value: 'false' },
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
    const filteredBrands = brands.filter((brand) => {
        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            const matchName = brand.name.toLowerCase().includes(query);
            const matchCode = brand.code.toLowerCase().includes(query);
            const matchSlug = brand.slug.toLowerCase().includes(query);
            const matchWebsite = brand.website.toLowerCase().includes(query);
            if (!matchName && !matchCode && !matchSlug && !matchWebsite) return false;
        }

        // Country filter
        if (filters.country && !brand.country.includes(filters.country)) {
            return false;
        }

        // Tier filter
        if (filters.tier && brand.tier !== filters.tier) {
            return false;
        }

        // Status filter
        if (filters.status && brand.status !== filters.status) {
            return false;
        }

        // Featured filter
        if (filters.featured) {
            const isFeat = filters.featured === 'true';
            if (brand.isFeatured !== isFeat) return false;
        }

        // Date filter
        if (filters.createdDate && !brand.createdAt.startsWith(filters.createdDate)) {
            return false;
        }

        return true;
    });

    const totalPages = Math.ceil(filteredBrands.length / pageSize) || 1;
    const paginatedBrands = filteredBrands.slice(
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
        showToast('Đã xóa toàn bộ bộ lọc thương hiệu', 'info');
    };

    const handleExportExcel = () => {
        showToast(`Đã xuất thành công danh sách ${filteredBrands.length} thương hiệu ra file Excel`, 'success');
    };

    // Toggle Status
    const handleToggleStatus = (brand: BrandItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextStatus = brand.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
        setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, status: nextStatus } : b));
        showToast(
            `Đã chuyển trạng thái thương hiệu "${brand.name}" sang ${nextStatus === 'ACTIVE' ? 'Hoạt động' : 'Đang ẩn'}`,
            nextStatus === 'ACTIVE' ? 'success' : 'warning'
        );
    };

    // Delete Brand
    const handleDeleteBrand = (brand: BrandItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (brand.productsCount > 0) {
            showToast(`Không thể xóa thương hiệu "${brand.name}" vì đang có ${brand.productsCount} sản phẩm liên kết`, 'error');
            return;
        }
        setBrands(prev => prev.filter(b => b.id !== brand.id));
        showToast(`Đã xóa thành công thương hiệu "${brand.name}"`, 'success');
    };

    // Open Detail Modal
    const handleOpenDetail = (brand: BrandItem) => {
        setSelectedBrand(brand);
        setActiveDetailTab('info');
        setIsDetailModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (brand: BrandItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedBrand(brand);
        setEditForm({ ...brand });
        setActiveEditTab('basic');
        setIsEditModalOpen(true);
    };

    // Save Edit
    const handleSaveEdit = () => {
        if (!editForm) return;
        if (!editForm.name.trim()) {
            showToast('Tên thương hiệu không được để trống', 'error');
            return;
        }
        if (!editForm.code.trim()) {
            showToast('Mã thương hiệu không được để trống', 'error');
            return;
        }

        setBrands(prev => prev.map(b => b.id === editForm.id ? editForm : b));
        setIsEditModalOpen(false);
        showToast(`Cập nhật thông tin thương hiệu "${editForm.name}" thành công`, 'success');
        if (selectedBrand?.id === editForm.id) {
            setSelectedBrand(editForm);
        }
    };

    // Submit Add Form
    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) {
            showToast('Vui lòng nhập tên thương hiệu', 'error');
            return;
        }
        if (!addForm.code.trim()) {
            showToast('Vui lòng nhập mã thương hiệu (viết tắt)', 'error');
            return;
        }

        const newBrandId = `brand-${Date.now().toString(36)}`;
        const finalSlug = addForm.slug || generateSlug(addForm.name);

        const newBrandItem: BrandItem = {
            id: newBrandId,
            name: addForm.name.trim(),
            code: addForm.code.trim().toUpperCase(),
            slug: finalSlug,
            logo: addForm.logo,
            bannerImage: addForm.bannerImage,
            country: addForm.country,
            countryCode: addForm.countryCode,
            website: addForm.website || 'https://www.google.com',
            supportUrl: addForm.supportUrl || 'https://www.google.com',
            warrantyPolicy: addForm.warrantyPolicy,
            foundedYear: Number(addForm.foundedYear) || new Date().getFullYear(),
            tier: addForm.tier,
            description: addForm.description || 'Chưa có mô tả chi tiết cho thương hiệu này.',
            mainCategories: addForm.mainCategories.length > 0 ? addForm.mainCategories : ['Linh kiện máy tính'],
            productsCount: 0,
            status: addForm.status,
            isFeatured: addForm.isFeatured,
            showOnMenu: addForm.showOnMenu,
            order: Number(addForm.order) || 1,
            createdAt: new Date().toISOString().split('T')[0],
            metaTitle: addForm.metaTitle || `${addForm.name} Chính Hãng Giá Tốt Nhất | PCStore`,
            metaDescription: addForm.metaDescription || `Cung cấp linh kiện và sản phẩm ${addForm.name} chính hãng bảo hành uy tín.`,
            metaKeywords: addForm.metaKeywords || `${addForm.slug}, ${addForm.name.toLowerCase()}`,
        };

        setBrands(prev => [newBrandItem, ...prev]);
        setIsAddModalOpen(false);
        showToast(`Đã thêm mới thành công thương hiệu "${newBrandItem.name}"`, 'success');

        // Reset Add Form
        setAddForm({
            name: '',
            code: '',
            slug: '',
            country: 'Đài Loan 🇹🇼',
            countryCode: 'TW',
            website: '',
            supportUrl: '',
            warrantyPolicy: 'Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 30 ngày',
            foundedYear: 1990,
            tier: 'GOLD',
            description: '',
            mainCategories: [],
            logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80',
            bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
            order: 10,
            status: 'ACTIVE',
            isFeatured: false,
            showOnMenu: true,
            metaTitle: '',
            metaDescription: '',
            metaKeywords: '',
        });
        setActiveAddTab('basic');
    };

    // Image Upload Handlers
    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            if (isEditMode) {
                setEditForm(prev => prev ? { ...prev, logo: objectUrl } : null);
            } else {
                setAddForm(prev => ({ ...prev, logo: objectUrl }));
            }
            showToast(`Đã tải lên logo "${file.name}"`, 'info');
        }
    };

    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            if (isEditMode) {
                setEditForm(prev => prev ? { ...prev, bannerImage: objectUrl } : null);
            } else {
                setAddForm(prev => ({ ...prev, bannerImage: objectUrl }));
            }
            showToast(`Đã tải lên ảnh bìa "${file.name}"`, 'info');
        }
    };

    // Toggle Category Tag in Form
    const handleToggleCategoryTag = (cat: string, isEdit = false) => {
        if (isEdit) {
            if (!editForm) return;
            const exists = editForm.mainCategories.includes(cat);
            const updated = exists
                ? editForm.mainCategories.filter(c => c !== cat)
                : [...editForm.mainCategories, cat];
            setEditForm({ ...editForm, mainCategories: updated });
        } else {
            const exists = addForm.mainCategories.includes(cat);
            const updated = exists
                ? addForm.mainCategories.filter(c => c !== cat)
                : [...addForm.mainCategories, cat];
            setAddForm(prev => ({ ...prev, mainCategories: updated }));
        }
    };

    // Copy to clipboard helper
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`Đã sao chép ${label}: ${text}`, 'info');
    };

    // Tier Badge Renderer
    const renderTierBadge = (tier: PartnerTier) => {
        switch (tier) {
            case 'DIAMOND':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 text-cyan-700 border border-cyan-300/60 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                        Kim Cương
                    </span>
                );
            case 'GOLD':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300/80 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        Đối Tác Vàng
                    </span>
                );
            case 'SILVER':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        Đối Tác Bạc
                    </span>
                );
            case 'OFFICIAL':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Chính Hãng
                    </span>
                );
        }
    };

    // Table Columns Configuration
    const columns: Column<BrandItem>[] = [
        {
            key: 'brand',
            header: 'Thương hiệu',
            render: (brand) => (
                <div className="flex items-center gap-3.5 py-1">
                    <div className="relative group shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm p-1 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
                            <img
                                src={brand.logo}
                                alt={brand.name}
                                className="w-full h-full object-contain rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80';
                                }}
                            />
                        </div>
                        {brand.isFeatured && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white rounded-full flex items-center justify-center shadow-md text-[10px]">
                                ★
                            </span>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {brand.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-gray-100 text-gray-600 border border-gray-200">
                                {brand.code}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                            <span>/{brand.slug}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'country',
            header: 'Xuất xứ & Năm lập',
            render: (brand) => (
                <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        <span className="text-base">{brand.country}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>Năm {brand.foundedYear}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'tier',
            header: 'Cấp bậc đối tác',
            render: (brand) => renderTierBadge(brand.tier),
        },
        {
            key: 'productsCount',
            header: 'Sản phẩm',
            render: (brand) => (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                        {brand.productsCount} linh kiện
                    </span>
                </div>
            ),
        },
        {
            key: 'website',
            header: 'Website & Hỗ trợ',
            render: (brand) => (
                <div className="space-y-1 max-w-[200px]">
                    <a
                        href={brand.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                        title={brand.website}
                    >
                        <Globe className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <span className="truncate">{brand.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </a>
                    <a
                        href={brand.supportUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 truncate"
                        title="Trung tâm hỗ trợ / Bảo hành"
                    >
                        <Wrench className="w-3 h-3 shrink-0 text-gray-400" />
                        <span className="truncate">Hỗ trợ kỹ thuật</span>
                    </a>
                </div>
            ),
        },
        {
            key: 'order',
            header: 'Thứ tự',
            render: (brand) => (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 font-mono text-xs font-semibold text-gray-700 border border-gray-200">
                    #{brand.order}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (brand) => (
                <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${brand.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                >
                    {brand.status === 'ACTIVE' ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang hoạt động
                        </>
                    ) : (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Đang ẩn
                        </>
                    )}
                </span>
            ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            render: (brand) => (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{brand.createdAt}</span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (brand) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(brand)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Xem chi tiết thương hiệu"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenEdit(brand, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Chỉnh sửa thông tin"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleToggleStatus(brand, e)}
                        className={`p-1.5 rounded-lg transition-colors ${brand.status === 'ACTIVE'
                            ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                            : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                        title={brand.status === 'ACTIVE' ? 'Ẩn thương hiệu' : 'Kích hoạt thương hiệu'}
                    >
                        {brand.status === 'ACTIVE' ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDeleteBrand(brand, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa thương hiệu"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Tabs for Add Modal
    const addModalTabs: ModalTab[] = [
        { id: 'basic', label: 'Thông tin cơ bản', icon: Building2 },
        { id: 'seo', label: 'Cấu hình SEO', icon: Globe },
        { id: 'display', label: 'Hiển thị & Đối tác', icon: Layers },
    ];

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        { id: 'info', label: 'Tổng quan thương hiệu', icon: Building2 },
        { id: 'products', label: 'Sản phẩm tiêu biểu', icon: Package },
        { id: 'seo', label: 'Mô phỏng SEO Google', icon: Globe },
        { id: 'warranty', label: 'Bảo hành & Hợp tác', icon: ShieldCheck },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Award className="w-7 h-7 text-blue-600" />
                        Quản lý thương hiệu
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Quản lý hệ thống các đối tác, hãng sản xuất phần cứng và nhà cung cấp linh kiện máy tính chính hãng
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
                        Thêm thương hiệu
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng thương hiệu</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{brands.length}</h3>
                        <p className="text-xs text-blue-600 font-medium mt-1">Hãng sản xuất PC & Gear</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Award className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đối tác Kim Cương</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {brands.filter(b => b.tier === 'DIAMOND').length}
                        </h3>
                        <p className="text-xs text-cyan-600 font-medium mt-1">ASUS, MSI, Gigabyte, Intel...</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang hoạt động</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {brands.filter(b => b.status === 'ACTIVE').length}
                        </h3>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Hiển thị trực tuyến</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng sản phẩm liên kết</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {brands.reduce((acc, curr) => acc + curr.productsCount, 0)}
                        </h3>
                        <p className="text-xs text-indigo-600 font-medium mt-1">Sản phẩm trong kho</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm kiếm thương hiệu theo tên, mã viết tắt, URL hoặc website..."
            />

            {/* Brands Data Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={paginatedBrands}
                    rowKey="id"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredBrands.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 15, 20]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    onRowClick={(item) => handleOpenDetail(item)}
                    itemUnitName="thương hiệu"
                    emptyText="Không tìm thấy thương hiệu nào phù hợp với bộ lọc tìm kiếm hiện tại."
                />
            </div>

            {/* ========================================================================= */}
            {/* ADD BRAND MODAL                                                           */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm mới thương hiệu linh kiện"
                description="Tạo mới hãng sản xuất phần cứng và nhà phân phối chính hãng vào hệ thống cửa hàng"
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
                            Tạo thương hiệu
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* TAB 1: THÔNG TIN CƠ BẢN */}
                    {activeAddTab === 'basic' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tên thương hiệu <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: ASUS, Gigabyte, Intel..."
                                        value={addForm.name}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            setAddForm(prev => ({
                                                ...prev,
                                                name: newName,
                                                slug: generateSlug(newName),
                                                code: prev.code || newName.slice(0, 4).toUpperCase()
                                            }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mã viết tắt (Code) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: ASUS, MSI, GIGA, AMD..."
                                        value={addForm.code}
                                        onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono uppercase text-gray-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Slug URL */}
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
                                        pcstore.vn/thuong-hieu/
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        placeholder="asus"
                                        value={addForm.slug}
                                        onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Logo & Banner Upload */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Logo Upload */}
                                <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                        Logo thương hiệu
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 shadow-sm p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                                            <img
                                                src={addForm.logo}
                                                alt="Logo preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <input
                                                ref={addLogoInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleLogoFileChange(e, false)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addLogoInputRef.current?.click()}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                Tải lên logo
                                            </button>
                                            <p className="text-[11px] text-gray-400">Định dạng PNG, JPG, SVG trong suốt khuyến nghị</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Banner Upload */}
                                <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                        Ảnh bìa (Banner)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-16 rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden shrink-0">
                                            <img
                                                src={addForm.bannerImage}
                                                alt="Banner preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <input
                                                ref={addBannerInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleBannerFileChange(e, false)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addBannerInputRef.current?.click()}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                Đổi ảnh bìa
                                            </button>
                                            <p className="text-[11px] text-gray-400">Tỷ lệ 16:9 hoặc banner ngang chất lượng cao</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Country & Founded Year */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Quốc gia xuất xứ
                                    </label>
                                    <select
                                        value={addForm.country}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            let code = 'TW';
                                            if (val.includes('Hoa Kỳ')) code = 'US';
                                            else if (val.includes('Hàn Quốc')) code = 'KR';
                                            else if (val.includes('Thụy Sĩ')) code = 'CH';
                                            else if (val.includes('Áo')) code = 'AT';
                                            else if (val.includes('Nhật Bản')) code = 'JP';
                                            setAddForm({ ...addForm, country: val, countryCode: code });
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="Đài Loan 🇹🇼">Đài Loan 🇹🇼</option>
                                        <option value="Hoa Kỳ 🇺🇸">Hoa Kỳ 🇺🇸</option>
                                        <option value="Hàn Quốc 🇰🇷">Hàn Quốc 🇰🇷</option>
                                        <option value="Thụy Sĩ 🇨🇭">Thụy Sĩ 🇨🇭</option>
                                        <option value="Áo 🇦🇹">Áo 🇦🇹</option>
                                        <option value="Nhật Bản 🇯🇵">Nhật Bản 🇯🇵</option>
                                        <option value="Trung Quốc 🇨🇳">Trung Quốc 🇨🇳</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Năm thành lập
                                    </label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        value={addForm.foundedYear}
                                        onChange={(e) => setAddForm({ ...addForm, foundedYear: parseInt(e.target.value) || 1990 })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Website & Support URL */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Trang web chính thức
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://www.example.com"
                                        value={addForm.website}
                                        onChange={(e) => setAddForm({ ...addForm, website: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Trung tâm bảo hành / Hỗ trợ
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://www.example.com/support"
                                        value={addForm.supportUrl}
                                        onChange={(e) => setAddForm({ ...addForm, supportUrl: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Giới thiệu thương hiệu
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Mô tả tóm tắt lịch sử, dòng sản phẩm nổi bật và uy tín của hãng sản xuất này..."
                                    value={addForm.description}
                                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                />
                            </div>

                            {/* Main Product Categories tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Các danh mục sản phẩm chủ đạo
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_AVAILABLE_CATEGORIES.map((cat) => {
                                        const isSelected = addForm.mainCategories.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleToggleCategoryTag(cat, false)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SEO CONFIGURATION */}
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
                                    placeholder="Thương hiệu [Tên Hãng] Chính Hãng Giá Rẻ | PCStore"
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
                                    placeholder="Đại lý phân phối sản phẩm chính hãng với giá tốt nhất, đầy đủ hóa đơn chứng từ VAT và chế độ bảo hành vàng..."
                                    value={addForm.metaDescription}
                                    onChange={(e) => setAddForm({ ...addForm, metaDescription: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Từ khóa tìm kiếm (Meta Keywords)
                                </label>
                                <input
                                    type="text"
                                    placeholder="asus, vga asus, mainboard asus rog, pcstore"
                                    value={addForm.metaKeywords}
                                    onChange={(e) => setAddForm({ ...addForm, metaKeywords: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                                <p className="text-xs text-gray-400 mt-1">Phân tách các từ khóa bằng dấu phẩy (,)</p>
                            </div>

                            {/* SERP PREVIEW BOX */}
                            <div className="mt-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                    Xem trước kết quả trên Google Search
                                </div>
                                <div className="space-y-1 font-sans">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                            P
                                        </div>
                                        <span>pcstore.vn</span>
                                        <span className="text-gray-400">›</span>
                                        <span>thuong-hieu</span>
                                        <span className="text-gray-400">›</span>
                                        <span className="text-gray-400">{addForm.slug || 'asus'}</span>
                                    </div>
                                    <h4 className="text-base text-blue-800 font-medium hover:underline cursor-pointer line-clamp-1">
                                        {addForm.metaTitle || `${addForm.name || 'Thương hiệu'} Chính Hãng Giá Tốt Nhất | PCStore`}
                                    </h4>
                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                        {addForm.metaDescription || addForm.description || 'Mua sắm linh kiện máy tính và sản phẩm công nghệ chính hãng với ưu đãi hấp dẫn và chính sách bảo hành uy tín tại PCStore.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: HIỂN THỊ & ĐỐI TÁC */}
                    {activeAddTab === 'display' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Thứ tự ưu tiên hiển thị
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addForm.order}
                                        onChange={(e) => setAddForm({ ...addForm, order: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Số nhỏ hơn sẽ được xếp lên đầu tiên</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Cấp bậc đối tác phân phối
                                    </label>
                                    <select
                                        value={addForm.tier}
                                        onChange={(e) => setAddForm({ ...addForm, tier: e.target.value as PartnerTier })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="DIAMOND">💎 Đối tác Kim Cương (Diamond Partner)</option>
                                        <option value="GOLD">🥇 Đối tác Vàng (Gold Partner)</option>
                                        <option value="SILVER">🥈 Đối tác Bạc (Silver Partner)</option>
                                        <option value="OFFICIAL">🛡️ Nhà phân phối Chính Hãng (Official)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Chính sách bảo hành tiêu chuẩn của hãng
                                </label>
                                <input
                                    type="text"
                                    value={addForm.warrantyPolicy}
                                    onChange={(e) => setAddForm({ ...addForm, warrantyPolicy: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                            </div>

                            {/* Switches */}
                            <div className="space-y-3 pt-2">
                                <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">
                                            Đánh dấu Thương hiệu Nổi bật (Featured)
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Hiển thị trên Slider logo trang chủ và bộ lọc hot của cửa hàng
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={addForm.isFeatured}
                                        onChange={(e) => setAddForm({ ...addForm, isFeatured: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">
                                            Hiển thị trên Mega Menu
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Cho phép người dùng tra cứu nhanh trong menu chính ngoài trang chủ
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={addForm.showOnMenu}
                                        onChange={(e) => setAddForm({ ...addForm, showOnMenu: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">
                                            Kích hoạt trạng thái hoạt động (ACTIVE)
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Thương hiệu sẽ hiển thị và các sản phẩm thuộc hãng này được phép bán
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={addForm.status === 'ACTIVE'}
                                        onChange={(e) => setAddForm({ ...addForm, status: e.target.checked ? 'ACTIVE' : 'HIDDEN' })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT BRAND MODAL                                                          */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Chỉnh sửa thương hiệu: ${editForm.name}`}
                    description="Cập nhật các thông số thương hiệu, đường dẫn, logo và chính sách đối tác"
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Tên thương hiệu <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Mã viết tắt (Code) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.code}
                                            onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono uppercase text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Slug */}
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
                                            pcstore.vn/thuong-hieu/
                                        </span>
                                        <input
                                            type="text"
                                            value={editForm.slug}
                                            onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Logo & Banner Upload */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                            Logo thương hiệu
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 shadow-sm p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                                                <img
                                                    src={editForm.logo}
                                                    alt="Logo"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <input
                                                    ref={editLogoInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleLogoFileChange(e, true)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => editLogoInputRef.current?.click()}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Đổi logo
                                                </button>
                                                <p className="text-[11px] text-gray-400">PNG trong suốt khuyến nghị</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                            Ảnh bìa (Banner)
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-16 rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden shrink-0">
                                                <img
                                                    src={editForm.bannerImage}
                                                    alt="Banner"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <input
                                                    ref={editBannerInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleBannerFileChange(e, true)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => editBannerInputRef.current?.click()}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    Đổi banner
                                                </button>
                                                <p className="text-[11px] text-gray-400">Ảnh chất lượng cao</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Country & Founded Year */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Quốc gia xuất xứ
                                        </label>
                                        <select
                                            value={editForm.country}
                                            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="Đài Loan 🇹🇼">Đài Loan 🇹🇼</option>
                                            <option value="Hoa Kỳ 🇺🇸">Hoa Kỳ 🇺🇸</option>
                                            <option value="Hàn Quốc 🇰🇷">Hàn Quốc 🇰🇷</option>
                                            <option value="Thụy Sĩ 🇨🇭">Thụy Sĩ 🇨🇭</option>
                                            <option value="Áo 🇦🇹">Áo 🇦🇹</option>
                                            <option value="Nhật Bản 🇯🇵">Nhật Bản 🇯🇵</option>
                                            <option value="Trung Quốc 🇨🇳">Trung Quốc 🇨🇳</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Năm thành lập
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.foundedYear}
                                            onChange={(e) => setEditForm({ ...editForm, foundedYear: parseInt(e.target.value) || 1990 })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Website & Support URL */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Trang web chính thức
                                        </label>
                                        <input
                                            type="url"
                                            value={editForm.website}
                                            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Trung tâm bảo hành / Hỗ trợ
                                        </label>
                                        <input
                                            type="url"
                                            value={editForm.supportUrl}
                                            onChange={(e) => setEditForm({ ...editForm, supportUrl: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Giới thiệu thương hiệu
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                                    />
                                </div>

                                {/* Categories */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Danh mục sản phẩm chủ đạo
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_AVAILABLE_CATEGORIES.map((cat) => {
                                            const isSelected = editForm.mainCategories.includes(cat);
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => handleToggleCategoryTag(cat, true)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${isSelected
                                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SEO CONFIGURATION */}
                        {activeEditTab === 'seo' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Thẻ tiêu đề SEO (Meta Title)
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
                                        Thẻ mô tả SEO (Meta Description)
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
                                        Từ khóa tìm kiếm (Meta Keywords)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.metaKeywords || ''}
                                        onChange={(e) => setEditForm({ ...editForm, metaKeywords: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 3: HIỂN THỊ & ĐỐI TÁC */}
                        {activeEditTab === 'display' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Thứ tự ưu tiên hiển thị
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.order}
                                            onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Cấp bậc đối tác phân phối
                                        </label>
                                        <select
                                            value={editForm.tier}
                                            onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as PartnerTier })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="DIAMOND">💎 Đối tác Kim Cương (Diamond Partner)</option>
                                            <option value="GOLD">🥇 Đối tác Vàng (Gold Partner)</option>
                                            <option value="SILVER">🥈 Đối tác Bạc (Silver Partner)</option>
                                            <option value="OFFICIAL">🛡️ Nhà phân phối Chính Hãng (Official)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Chính sách bảo hành tiêu chuẩn
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.warrantyPolicy}
                                        onChange={(e) => setEditForm({ ...editForm, warrantyPolicy: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-sm font-medium text-gray-900 block">
                                                Đánh dấu Thương hiệu Nổi bật (Featured)
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Hiển thị trang chủ và danh sách đề xuất
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={editForm.isFeatured}
                                            onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-sm font-medium text-gray-900 block">
                                                Hiển thị trên Menu chính
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Gắn vào bảng điều hướng Mega Menu
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={editForm.showOnMenu}
                                            onChange={(e) => setEditForm({ ...editForm, showOnMenu: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-sm font-medium text-gray-900 block">
                                                Kích hoạt trạng thái hoạt động (ACTIVE)
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Cho phép bày bán sản phẩm của hãng
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={editForm.status === 'ACTIVE'}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.checked ? 'ACTIVE' : 'HIDDEN' })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL BRAND MODAL                                                        */}
            {/* ========================================================================= */}
            {selectedBrand && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={selectedBrand.name}
                    description={`Mã đối tác: ${selectedBrand.code} • Xuất xứ: ${selectedBrand.country}`}
                    size="2xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={setActiveDetailTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>Thêm vào hệ thống: {selectedBrand.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedBrand);
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
                        {/* BRAND COVER & HERO */}
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900 text-white">
                            <div className="h-32 w-full overflow-hidden opacity-60">
                                <img
                                    src={selectedBrand.bannerImage}
                                    alt="Brand Banner"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                            <div className="relative p-5 -mt-12 flex items-end justify-between">
                                <div className="flex items-end gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-white p-2 border-2 border-white shadow-xl flex items-center justify-center shrink-0">
                                        <img
                                            src={selectedBrand.logo}
                                            alt={selectedBrand.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold text-white tracking-tight">{selectedBrand.name}</h3>
                                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white/20 text-white backdrop-blur-md">
                                                {selectedBrand.code}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-300">
                                            <span>{selectedBrand.country}</span>
                                            <span>•</span>
                                            <span>Thành lập {selectedBrand.foundedYear}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    {renderTierBadge(selectedBrand.tier)}
                                    {selectedBrand.isFeatured && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                                            ★ Thương hiệu Hot
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TAB 1: TỔNG QUAN THƯƠNG HIỆU */}
                        {activeDetailTab === 'info' && (
                            <div className="space-y-5">
                                {/* Stats Metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Sản phẩm liên kết</span>
                                        <span className="text-lg font-bold text-blue-600 mt-0.5 block">{selectedBrand.productsCount} model</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Ưu tiên sắp xếp</span>
                                        <span className="text-lg font-bold text-gray-800 mt-0.5 block">Vị trí #{selectedBrand.order}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Trạng thái</span>
                                        <span className={`text-sm font-bold mt-1 block ${selectedBrand.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-500'}`}>
                                            {selectedBrand.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang ẩn'}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Hiển thị Menu</span>
                                        <span className="text-sm font-bold text-gray-800 mt-1 block">
                                            {selectedBrand.showOnMenu ? 'Có trên Menu' : 'Không'}
                                        </span>
                                    </div>
                                </div>

                                {/* Fast Copy Meta Identifiers */}
                                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Mã nhận diện hệ thống (ID):</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                {selectedBrand.id}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedBrand.id, 'ID thương hiệu')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép ID"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Đường dẫn tĩnh website (Slug):</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                /thuong-hieu/{selectedBrand.slug}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(`https://pcstore.vn/thuong-hieu/${selectedBrand.slug}`, 'Đường dẫn thương hiệu')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép link"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Trang chủ chính thức:</span>
                                        <a
                                            href={selectedBrand.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                        >
                                            {selectedBrand.website}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>

                                {/* Brand Bio */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Giới thiệu lịch sử & hồ sơ năng lực
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                                        {selectedBrand.description}
                                    </p>
                                </div>

                                {/* Main Categories */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Lĩnh vực phần cứng & linh kiện thế mạnh
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedBrand.mainCategories.map((cat, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                                            >
                                                <Tag className="w-3 h-3 text-blue-500" />
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SẢN PHẨM TIÊU BIỂU */}
                        {activeDetailTab === 'products' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Top các sản phẩm chủ lực và bán chạy nhất của <strong className="text-gray-900">{selectedBrand.name}</strong>
                                    </p>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                        {selectedBrand.productsCount} linh kiện có sẵn
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        {
                                            name: `${selectedBrand.name} Flagship Ultra Gaming Edition`,
                                            sku: `${selectedBrand.code}-FLG-01`,
                                            price: '24.990.000₫',
                                            stock: 18,
                                            status: 'Còn hàng'
                                        },
                                        {
                                            name: `${selectedBrand.name} Pro Creator OC High Performance`,
                                            sku: `${selectedBrand.code}-PRO-OC`,
                                            price: '16.490.000₫',
                                            stock: 25,
                                            status: 'Còn hàng'
                                        },
                                        {
                                            name: `${selectedBrand.name} Gaming Plus Standard Edition`,
                                            sku: `${selectedBrand.code}-STD-02`,
                                            price: '8.890.000₫',
                                            stock: 42,
                                            status: 'Còn hàng'
                                        },
                                        {
                                            name: `${selectedBrand.name} Essential Series Eco Friendly`,
                                            sku: `${selectedBrand.code}-ECO-V1`,
                                            price: '3.250.000₫',
                                            stock: 12,
                                            status: 'Sắp về thêm'
                                        }
                                    ].map((prod, idx) => (
                                        <div key={idx} className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-300 transition-all bg-white shadow-sm flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-gray-900 line-clamp-1">{prod.name}</div>
                                                <div className="text-[11px] text-gray-400 font-mono">Mã: {prod.sku}</div>
                                                <div className="text-xs font-bold text-rose-600">{prod.price}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Kho: {prod.stock}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: MÔ PHỎNG SEO GOOGLE SERP */}
                        {activeDetailTab === 'seo' && (
                            <div className="space-y-5">
                                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3 font-sans">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        Mô phỏng hiển thị trên công cụ tìm kiếm Google
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                                P
                                            </div>
                                            <span>https://pcstore.vn</span>
                                            <span className="text-gray-400">›</span>
                                            <span>thuong-hieu</span>
                                            <span className="text-gray-400">›</span>
                                            <span className="text-gray-500 font-medium">{selectedBrand.slug}</span>
                                        </div>

                                        <h4 className="text-lg text-blue-800 font-medium hover:underline cursor-pointer">
                                            {selectedBrand.metaTitle || `${selectedBrand.name} Chính Hãng Giá Tốt Nhất | PCStore`}
                                        </h4>

                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {selectedBrand.metaDescription || selectedBrand.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                            Meta Keywords đang sử dụng:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(selectedBrand.metaKeywords || `${selectedBrand.name}, ${selectedBrand.slug}`).split(',').map((kw, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-white text-gray-700 border border-gray-200 font-mono">
                                                    #{kw.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: BẢO HÀNH & HỢP TÁC */}
                        {activeDetailTab === 'warranty' && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                        Chính sách bảo hành & Đổi mới chính hãng
                                    </div>
                                    <p className="text-xs text-emerald-900 leading-relaxed">
                                        {selectedBrand.warrantyPolicy}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                                        <span className="text-xs font-semibold text-gray-500 uppercase block">
                                            Hỗ trợ kỹ thuật & Driver hãng
                                        </span>
                                        <a
                                            href={selectedBrand.supportUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium truncate"
                                        >
                                            <Wrench className="w-4 h-4 shrink-0 text-blue-500" />
                                            <span className="truncate">{selectedBrand.supportUrl}</span>
                                            <ExternalLink className="w-3 h-3 shrink-0" />
                                        </a>
                                        <p className="text-[11px] text-gray-400">Tải BIOS, Firmware và phần mềm điều khiển chính thức</p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                                        <span className="text-xs font-semibold text-gray-500 uppercase block">
                                            Cam kết phân phối PCStore
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-gray-800">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>Hàng nhập khẩu chính ngạch 100% VAT</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-800">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>Bảo hành tận nơi theo tiêu chuẩn quốc tế</span>
                                        </div>
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
