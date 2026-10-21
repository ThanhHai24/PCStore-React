import React, { useState, useRef } from 'react';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    Download,
    Package,
    ExternalLink,
    Sparkles,
    CreditCard,
    Phone,
    Mail,
    MapPin,
    Star,
    DollarSign,
    FileText,
    Copy,
    Check,
    TrendingUp,
    AlertTriangle,
    Upload,
    ShieldCheck,
    Tag,
    Clock,
    Receipt,
    Layers,
    Users
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';

export type SupplierTier = 'STRATEGIC' | 'DIAMOND' | 'GOLD' | 'STANDARD';
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface BankAccount {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    branch: string;
}

export interface ContactPerson {
    name: string;
    phone: string;
    email: string;
    role: string;
}

export interface SupplierContract {
    contractNumber: string;
    startDate: string;
    endDate: string;
    discountRate: number; // e.g. 3.5 (%)
}

export interface SupplierImportHistory {
    id: string;
    orderCode: string;
    date: string;
    totalAmount: number;
    itemsCount: number;
    status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
    notes?: string;
}

export interface SupplierItem {
    id: string;
    code: string;
    name: string;
    companyName: string;
    taxCode: string;
    logo: string;
    email: string;
    phone: string;
    hotline?: string;
    website?: string;
    address: string;
    city: string;
    contactPerson: ContactPerson;
    categories: string[];
    brands: string[];
    tier: SupplierTier;
    status: SupplierStatus;
    rating: number;
    paymentTerms: string;
    debtLimit: number;
    currentDebt: number;
    totalPurchaseValue: number;
    totalOrdersCount: number;
    lastOrderDate: string;
    bankInfo: BankAccount;
    contract: SupplierContract;
    recentImports: SupplierImportHistory[];
    notes?: string;
    createdAt: string;
}

// Initial Mock Suppliers (Top hardware distributors in Vietnam)
const INITIAL_SUPPLIERS: SupplierItem[] = [
    {
        id: 'sup-1',
        code: 'NCC-DGW',
        name: 'Digiworld Corporation',
        companyName: 'Công ty Cổ phần Thế Giới Số (Digiworld)',
        taxCode: '0302888999',
        logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=160&q=80',
        email: 'distribution@digiworld.com.vn',
        phone: '028 3929 0059',
        hotline: '1900 555 588',
        website: 'https://digiworld.com.vn',
        address: 'Tầng 16, Tòa nhà Centec Tower, 72-74 Nguyễn Thị Minh Khai, P. Võ Thị Sáu, Quận 3',
        city: 'TP. Hồ Chí Minh',
        contactPerson: {
            name: 'Nguyễn Văn Quang',
            phone: '0908 123 456',
            email: 'quang.nv@digiworld.com.vn',
            role: 'Trưởng phòng Phân phối Linh kiện PC'
        },
        categories: ['Linh kiện máy tính', 'Card màn hình (VGA)', 'Laptop & Màn hình', 'Bo mạch chủ'],
        brands: ['ASUS', 'MSI', 'Acer', 'Dell', 'HP', 'AMD'],
        tier: 'STRATEGIC',
        status: 'ACTIVE',
        rating: 4.9,
        paymentTerms: 'Công nợ 30 ngày',
        debtLimit: 1500000000,
        currentDebt: 450000000,
        totalPurchaseValue: 8420000000,
        totalOrdersCount: 64,
        lastOrderDate: '2024-03-20',
        bankInfo: {
            bankName: 'Vietcombank - CN Tân Bình',
            accountNumber: '0071000888999',
            accountHolder: 'CONG TY CO PHAN THE GIOI SO',
            branch: 'Chi nhánh Tân Bình, TP.HCM'
        },
        contract: {
            contractNumber: 'HDNT-DGW-PCSTORE-2024',
            startDate: '2024-01-01',
            endDate: '2025-12-31',
            discountRate: 4.0
        },
        recentImports: [
            {
                id: 'imp-101',
                orderCode: 'PO-2024-03-088',
                date: '2024-03-20',
                totalAmount: 185000000,
                itemsCount: 45,
                status: 'COMPLETED',
                notes: 'Nhập lô card màn hình ASUS ROG Strix RTX 4070 Ti Super'
            },
            {
                id: 'imp-102',
                orderCode: 'PO-2024-03-042',
                date: '2024-03-10',
                totalAmount: 265000000,
                itemsCount: 60,
                status: 'COMPLETED',
                notes: 'Lô bo mạch chủ MSI B760 và màn hình gaming Acer Predator'
            }
        ],
        notes: 'Đối tác chiến lược nhóm VGA và màn hình gaming. Hỗ trợ đổi mới bảo hành trong 30 ngày đầu.',
        createdAt: '2023-01-15'
    },
    {
        id: 'sup-2',
        code: 'NCC-FPT',
        name: 'Synnex FPT',
        companyName: 'Công ty TNHH Phân Phối Synnex FPT',
        taxCode: '0103607999',
        logo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=160&q=80',
        email: 'pcparts.contact@synnexfpt.com.vn',
        phone: '024 7300 6666',
        hotline: '1800 6601',
        website: 'https://synnexfpt.com',
        address: 'Tòa nhà FPT, Phố Duy Tân, P. Dịch Vọng Hậu, Q. Cầu Giấy',
        city: 'Hà Nội',
        contactPerson: {
            name: 'Trần Thị Thu Hà',
            phone: '0912 345 678',
            email: 'ha.ttt@synnexfpt.com.vn',
            role: 'Giám đốc Khách hàng Đại lý Doanh nghiệp'
        },
        categories: ['Vi xử lý (CPU)', 'Bo mạch chủ', 'Bộ nhớ RAM', 'Ổ cứng SSD', 'Mạng viễn thông'],
        brands: ['Intel', 'Kingston', 'Corsair', 'Gigabyte', 'Western Digital', 'Seagate'],
        tier: 'STRATEGIC',
        status: 'ACTIVE',
        rating: 4.9,
        paymentTerms: 'Công nợ 45 ngày',
        debtLimit: 2000000000,
        currentDebt: 680000000,
        totalPurchaseValue: 12600000000,
        totalOrdersCount: 92,
        lastOrderDate: '2024-03-22',
        bankInfo: {
            bankName: 'Techcombank - Hội sở',
            accountNumber: '19028889998888',
            accountHolder: 'CONG TY TNHH PHAN PHOI SYNNEX FPT',
            branch: 'Hội sở chính Hà Nội'
        },
        contract: {
            contractNumber: 'HDNT-FPT-PCSTORE-2024',
            startDate: '2024-01-01',
            endDate: '2026-01-01',
            discountRate: 4.5
        },
        recentImports: [
            {
                id: 'imp-201',
                orderCode: 'PO-2024-03-095',
                date: '2024-03-22',
                totalAmount: 320000000,
                itemsCount: 80,
                status: 'COMPLETED',
                notes: 'Nhập CPU Intel Core i7-14700K và i5-14600K chính hãng'
            },
            {
                id: 'imp-202',
                orderCode: 'PO-2024-03-018',
                date: '2024-03-05',
                totalAmount: 360000000,
                itemsCount: 120,
                status: 'COMPLETED',
                notes: 'Lô RAM Corsair Vengeance RGB DDR5 và SSD Kingston KC3000'
            }
        ],
        notes: 'Nhà phân phối độc quyền chính thức Intel & Kingston. Hạn mức công nợ cao nhất hệ thống.',
        createdAt: '2022-11-20'
    },
    {
        id: 'sup-3',
        code: 'NCC-VIENSON',
        name: 'Viễn Sơn Computer',
        companyName: 'Công ty TNHH MTV Công Nghệ Tin Học Viễn Sơn',
        taxCode: '0301438765',
        logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=160&q=80',
        email: 'sales@vienson.com.vn',
        phone: '028 3832 6085',
        hotline: '1900 636 123',
        website: 'https://vienson.com.vn',
        address: '162 Bùi Thị Xuân, Phường Phạm Ngũ Lão, Quận 1',
        city: 'TP. Hồ Chí Minh',
        contactPerson: {
            name: 'Lê Hoàng Long',
            phone: '0903 888 777',
            email: 'long.lh@vienson.com.vn',
            role: 'Trưởng ban Phát triển Kênh Bán buôn'
        },
        categories: ['Card màn hình (VGA)', 'Bo mạch chủ', 'Nguồn máy tính (PSU)', 'Vỏ Case', 'Tản nhiệt CPU'],
        brands: ['Gigabyte', 'Corsair', 'Kingmax', 'InWin', 'Seasonic', 'Zotac'],
        tier: 'DIAMOND',
        status: 'ACTIVE',
        rating: 4.8,
        paymentTerms: 'Gối đầu 15 ngày',
        debtLimit: 1000000000,
        currentDebt: 240000000,
        totalPurchaseValue: 5800000000,
        totalOrdersCount: 52,
        lastOrderDate: '2024-03-18',
        bankInfo: {
            bankName: 'MB Bank - CN Sài Gòn',
            accountNumber: '0880199999888',
            accountHolder: 'CONG TY TNHH MTV TIN HOC VIEN SON',
            branch: 'Chi nhánh Sài Gòn'
        },
        contract: {
            contractNumber: 'HD-VS-2024-PCSTORE',
            startDate: '2023-06-01',
            endDate: '2025-06-01',
            discountRate: 3.8
        },
        recentImports: [
            {
                id: 'imp-301',
                orderCode: 'PO-2024-03-075',
                date: '2024-03-18',
                totalAmount: 140000000,
                itemsCount: 35,
                status: 'COMPLETED',
                notes: 'Nhập nguồn Seasonic Focus GX-850 và case InWin cao cấp'
            }
        ],
        notes: 'Chính sách bảo hành đổi trả nhanh chóng, hỗ trợ đại lý mượn hàng bảo hành đối ứng.',
        createdAt: '2023-03-10'
    },
    {
        id: 'sup-4',
        code: 'NCC-VINHXUAN',
        name: 'Vĩnh Xuân (SPC)',
        companyName: 'Công ty Cổ phần Máy tính Vĩnh Xuân',
        taxCode: '0101142568',
        logo: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=160&q=80',
        email: 'info@spc.com.vn',
        phone: '024 3943 9121',
        hotline: '1900 558 877',
        website: 'https://spc.com.vn',
        address: 'Số 9 ngõ 117 Thái Hà, P. Trung Liệt, Q. Đống Đa',
        city: 'Hà Nội',
        contactPerson: {
            name: 'Vũ Đình Nam',
            phone: '0988 555 444',
            email: 'nam.vd@spc.com.vn',
            role: 'Trưởng bộ phận Phân phối Kênh Dự án & Bán lẻ'
        },
        categories: ['Bo mạch chủ', 'Card màn hình (VGA)', 'Tản nhiệt CPU', 'Màn hình Gaming'],
        brands: ['ASUS', 'MSI', 'Cooler Master', 'AOC', 'Philips'],
        tier: 'DIAMOND',
        status: 'ACTIVE',
        rating: 4.8,
        paymentTerms: 'Công nợ 30 ngày',
        debtLimit: 1200000000,
        currentDebt: 310000000,
        totalPurchaseValue: 6200000000,
        totalOrdersCount: 58,
        lastOrderDate: '2024-03-15',
        bankInfo: {
            bankName: 'BIDV - CN Quang Trung',
            accountNumber: '12310000889977',
            accountHolder: 'CONG TY CP MAY TINH VINH XUAN',
            branch: 'Chi nhánh Quang Trung, Hà Nội'
        },
        contract: {
            contractNumber: 'HD-SPC-2024-001',
            startDate: '2024-01-10',
            endDate: '2025-12-31',
            discountRate: 3.5
        },
        recentImports: [
            {
                id: 'imp-401',
                orderCode: 'PO-2024-03-062',
                date: '2024-03-15',
                totalAmount: 195000000,
                itemsCount: 50,
                status: 'COMPLETED',
                notes: 'Tản nhiệt nước Cooler Master MasterLiquid 360L Core ARGB'
            }
        ],
        notes: 'Nhà phân phối gạo cội tại miền Bắc. Thường xuyên có chương trình khuyến mãi bundle quà tặng.',
        createdAt: '2023-02-18'
    },
    {
        id: 'sup-5',
        code: 'NCC-THUYLINH',
        name: 'Thủy Linh (TLC)',
        companyName: 'Công ty TNHH Thương mại Quốc tế Thủy Linh',
        taxCode: '0101039871',
        logo: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=160&q=80',
        email: 'kinhdoanh@thuylinh.vn',
        phone: '024 3537 1525',
        hotline: '0904 999 555',
        website: 'https://thuylinh.vn',
        address: 'Số 33 Thái Hà, P. Trung Liệt, Q. Đống Đa',
        city: 'Hà Nội',
        contactPerson: {
            name: 'Đặng Minh Tuấn',
            phone: '0936 999 111',
            email: 'tuandm@thuylinh.vn',
            role: 'Quản lý Khu vực Phân phối Miền Bắc'
        },
        categories: ['Bo mạch chủ', 'Card màn hình (VGA)', 'Bộ nhớ RAM', 'Ổ cứng SSD', 'Nguồn máy tính (PSU)'],
        brands: ['Gigabyte', 'Antec', 'Kingmax', 'ADATA', 'GeIL', 'Dell'],
        tier: 'GOLD',
        status: 'ACTIVE',
        rating: 4.7,
        paymentTerms: 'Công nợ 30 ngày',
        debtLimit: 800000000,
        currentDebt: 0,
        totalPurchaseValue: 4100000000,
        totalOrdersCount: 42,
        lastOrderDate: '2024-03-08',
        bankInfo: {
            bankName: 'VietinBank - CN Đống Đa',
            accountNumber: '110000199988',
            accountHolder: 'CONG TY TNHH TM QUOC TE THUY LINH',
            branch: 'Chi nhánh Đống Đa, Hà Nội'
        },
        contract: {
            contractNumber: 'HDNT-TLC-2024-A',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            discountRate: 3.0
        },
        recentImports: [
            {
                id: 'imp-501',
                orderCode: 'PO-2024-03-025',
                date: '2024-03-08',
                totalAmount: 98000000,
                itemsCount: 40,
                status: 'COMPLETED',
                notes: 'Lô RAM ADATA XPG Lancer Blade RGB DDR5'
            }
        ],
        notes: 'Công nợ hiện tại 0đ, uy tín thanh toán tuyệt đối. Đại diện độc quyền hãng nguồn Antec.',
        createdAt: '2023-04-05'
    },
    {
        id: 'sup-6',
        code: 'NCC-MAIHOANG',
        name: 'Tin Học Mai Hoàng',
        companyName: 'Công ty Cổ phần Tin Học Mai Hoàng',
        taxCode: '0100789234',
        logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80',
        email: 'dealer@maihoang.com.vn',
        phone: '024 3537 7109',
        hotline: '1900 6868',
        website: 'https://maihoang.com.vn',
        address: 'Số 241 Phố Vọng, P. Đồng Tâm, Q. Hai Bà Trưng',
        city: 'Hà Nội',
        contactPerson: {
            name: 'Phạm Thị Bích Ngọc',
            phone: '0945 123 789',
            email: 'ngocpt@maihoang.com.vn',
            role: 'Kế toán Công nợ & Quản lý Phân phối'
        },
        categories: ['Gaming Gear', 'Bàn phím cơ', 'Chuột gaming', 'Tai nghe', 'Tản nhiệt CPU', 'Bộ nhớ RAM'],
        brands: ['Corsair', 'DareU', 'TeamGroup', 'DeepCool'],
        tier: 'GOLD',
        status: 'ACTIVE',
        rating: 4.7,
        paymentTerms: 'Công nợ 15 ngày',
        debtLimit: 600000000,
        currentDebt: 95000000,
        totalPurchaseValue: 3450000000,
        totalOrdersCount: 38,
        lastOrderDate: '2024-03-12',
        bankInfo: {
            bankName: 'ACB - PGD Hai Bà Trưng',
            accountNumber: '888999888241',
            accountHolder: 'CONG TY CP TIN HOC MAI HOANG',
            branch: 'Phòng giao dịch Hai Bà Trưng, Hà Nội'
        },
        contract: {
            contractNumber: 'HD-MH-2024-PCSTORE',
            startDate: '2023-11-01',
            endDate: '2024-11-01',
            discountRate: 3.2
        },
        recentImports: [
            {
                id: 'imp-601',
                orderCode: 'PO-2024-03-051',
                date: '2024-03-12',
                totalAmount: 95000000,
                itemsCount: 75,
                status: 'COMPLETED',
                notes: 'Nhập bàn phím cơ DareU EK75 và chuột gaming không dây'
            }
        ],
        notes: 'Phân phối số lượng lớn Gaming Gear quốc dân DareU và tản nhiệt DeepCool AK620 Digital.',
        createdAt: '2023-05-12'
    },
    {
        id: 'sup-7',
        code: 'NCC-VIETSON',
        name: 'Tin Học Viết Sơn',
        companyName: 'Công ty Cổ phần Tin học Viết Sơn',
        taxCode: '0304561234',
        logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=160&q=80',
        email: 'sales@vietson.com',
        phone: '028 3929 3770',
        hotline: '1900 6688',
        website: 'https://vietson.com',
        address: '150 Ter Bùi Thị Xuân, Phường Phạm Ngũ Lão, Quận 1',
        city: 'TP. Hồ Chí Minh',
        contactPerson: {
            name: 'Hoàng Quốc Việt',
            phone: '0977 456 123',
            email: 'viet.hq@vietson.com',
            role: 'Đại diện Kinh doanh Kênh Đại lý'
        },
        categories: ['Vi xử lý (CPU)', 'Bo mạch chủ', 'Ổ cứng SSD', 'Bộ nhớ RAM'],
        brands: ['AMD', 'ASRock', 'Crucial', 'Seasonic'],
        tier: 'GOLD',
        status: 'ACTIVE',
        rating: 4.8,
        paymentTerms: 'Công nợ 30 ngày',
        debtLimit: 900000000,
        currentDebt: 310000000,
        totalPurchaseValue: 4700000000,
        totalOrdersCount: 46,
        lastOrderDate: '2024-03-19',
        bankInfo: {
            bankName: 'Sacombank - CN Sài Gòn',
            accountNumber: '060012345678',
            accountHolder: 'CONG TY CP TIN HOC VIET SON',
            branch: 'Chi nhánh Sài Gòn'
        },
        contract: {
            contractNumber: 'HD-VS-AMD-2024',
            startDate: '2024-01-01',
            endDate: '2025-01-01',
            discountRate: 3.5
        },
        recentImports: [
            {
                id: 'imp-701',
                orderCode: 'PO-2024-03-082',
                date: '2024-03-19',
                totalAmount: 180000000,
                itemsCount: 40,
                status: 'COMPLETED',
                notes: 'Lô vi xử lý AMD Ryzen 7 7800X3D và Ryzen 5 7600'
            }
        ],
        notes: 'Nhà phân phối chính ngạch CPU AMD Ryzen và SSD Crucial P3 Plus tốc độ cao.',
        createdAt: '2023-06-20'
    },
    {
        id: 'sup-8',
        code: 'NCC-KHAITHIEN',
        name: 'Khải Thiên (KEEN)',
        companyName: 'Công ty TNHH Công nghệ Khải Thiên',
        taxCode: '0303891234',
        logo: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=160&q=80',
        email: 'contact@khaithien.com.vn',
        phone: '028 3822 0088',
        hotline: '1900 6006',
        website: 'https://khaithien.com.vn',
        address: '384 Nguyễn Thị Minh Khai, Phường 5, Quận 3',
        city: 'TP. Hồ Chí Minh',
        contactPerson: {
            name: 'Nguyễn Thành An',
            phone: '0918 789 654',
            email: 'an.nt@khaithien.com.vn',
            role: 'Chuyên viên Phát triển Thị trường'
        },
        categories: ['Màn hình Gaming', 'Ổ cứng SSD', 'Thiết bị lưu trữ & Thẻ nhớ'],
        brands: ['ViewSonic', 'Lexar', 'Hikvision', 'Dahua'],
        tier: 'STANDARD',
        status: 'ACTIVE',
        rating: 4.6,
        paymentTerms: 'Thanh toán ngay khi nhận hàng (COD)',
        debtLimit: 300000000,
        currentDebt: 50000000,
        totalPurchaseValue: 1800000000,
        totalOrdersCount: 24,
        lastOrderDate: '2024-03-02',
        bankInfo: {
            bankName: 'HDBank - CN TP.HCM',
            accountNumber: '003704070001234',
            accountHolder: 'CONG TY TNHH CONG NGHE KHAI THIEN',
            branch: 'Chi nhánh TP.HCM'
        },
        contract: {
            contractNumber: 'HD-KEEN-2023',
            startDate: '2023-08-01',
            endDate: '2024-08-01',
            discountRate: 2.2
        },
        recentImports: [
            {
                id: 'imp-801',
                orderCode: 'PO-2024-03-010',
                date: '2024-03-02',
                totalAmount: 50000000,
                itemsCount: 30,
                status: 'COMPLETED',
                notes: 'Nhập màn hình ViewSonic Omni VX2479 và thẻ nhớ Lexar'
            }
        ],
        notes: 'Chính sách chiết khấu tốt cho màn hình văn phòng và camera lưu trữ.',
        createdAt: '2023-08-14'
    },
    {
        id: 'sup-9',
        code: 'NCC-TANTHANHDANH',
        name: 'Tân Thành Danh',
        companyName: 'Công ty TNHH Thương mại Kỹ thuật Tân Thành Danh',
        taxCode: '0312678945',
        logo: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=160&q=80',
        email: 'info@tanthanhdanh.vn',
        phone: '0909 333 999',
        hotline: '028 3868 6868',
        website: 'https://tanthanhdanh.vn',
        address: '338 Đường 3/2, Phường 12, Quận 10',
        city: 'TP. Hồ Chí Minh',
        contactPerson: {
            name: 'Đoàn Hữu Danh',
            phone: '0909 333 999',
            email: 'danh@tanthanhdanh.vn',
            role: 'Giám đốc Kỹ thuật & Kinh doanh Modding PC'
        },
        categories: ['Vỏ Case', 'Tản nhiệt nước Custom', 'Quạt tản nhiệt', 'Dây nguồn Modding', 'Phụ kiện PC'],
        brands: ['Lian Li', 'EKWB', 'Bitspower', 'Thermalright', 'Bykski'],
        tier: 'GOLD',
        status: 'ACTIVE',
        rating: 4.9,
        paymentTerms: 'Đặt cọc 30% - 70% khi nhận hàng',
        debtLimit: 500000000,
        currentDebt: 85000000,
        totalPurchaseValue: 2750000000,
        totalOrdersCount: 32,
        lastOrderDate: '2024-03-14',
        bankInfo: {
            bankName: 'VPBank - CN Gia Định',
            accountNumber: '1999888777666',
            accountHolder: 'CONG TY TNHH TM KT TAN THANH DANH',
            branch: 'Chi nhánh Gia Định, TP.HCM'
        },
        contract: {
            contractNumber: 'HD-TTD-2024-MOD',
            startDate: '2024-01-01',
            endDate: '2025-01-01',
            discountRate: 4.5
        },
        recentImports: [
            {
                id: 'imp-901',
                orderCode: 'PO-2024-03-058',
                date: '2024-03-14',
                totalAmount: 85000000,
                itemsCount: 42,
                status: 'COMPLETED',
                notes: 'Nhập vỏ case Lian Li O11 Vision và quạt Lian Li SL-INF 120'
            }
        ],
        notes: 'Chuyên linh kiện Modding PC bể cá cao cấp và tản nhiệt nước Custom hàng đầu Việt Nam.',
        createdAt: '2023-09-01'
    },
    {
        id: 'sup-10',
        code: 'NCC-ELITE',
        name: 'Elite Technology',
        companyName: 'Công ty Cổ phần Công nghệ Elite',
        taxCode: '0301987654',
        logo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=160&q=80',
        email: 'sales-enterprise@elite.com.vn',
        phone: '028 3512 3959',
        hotline: '1900 636 888',
        website: 'https://elite.com.vn',
        address: 'Tòa nhà Elite, 289 Điện Biên Phủ, Phường 15, Q. Bình Thạnh',
        city: 'TP. Hồ Chí Minh',
        contactPerson: {
            name: 'Bùi Thị Mai Hương',
            phone: '0915 678 234',
            email: 'huong.bm@elite.com.vn',
            role: 'Quản lý Giải pháp Máy trạm & Server Doanh nghiệp'
        },
        categories: ['Máy trạm Workstation', 'Card màn hình chuyên dụng', 'CPU Server & Workstation', 'Hạ tầng mạng'],
        brands: ['HP Workstation', 'NVIDIA Enterprise', 'Cisco'],
        tier: 'DIAMOND',
        status: 'SUSPENDED',
        rating: 4.8,
        paymentTerms: 'Công nợ 45 ngày',
        debtLimit: 1200000000,
        currentDebt: 520000000,
        totalPurchaseValue: 5600000000,
        totalOrdersCount: 29,
        lastOrderDate: '2024-02-28',
        bankInfo: {
            bankName: 'Vietcombank - CN TP.HCM',
            accountNumber: '0011000999777',
            accountHolder: 'CONG TY CP CONG NGHE ELITE',
            branch: 'Chi nhánh TP.HCM'
        },
        contract: {
            contractNumber: 'HD-ELITE-WORKSTATION-2023',
            startDate: '2023-03-01',
            endDate: '2024-03-01',
            discountRate: 3.5
        },
        recentImports: [
            {
                id: 'imp-1001',
                orderCode: 'PO-2024-02-099',
                date: '2024-02-28',
                totalAmount: 520000000,
                itemsCount: 15,
                status: 'COMPLETED',
                notes: 'Lô máy trạm HP Z4 G5 và card đồ họa NVIDIA RTX 4000 Ada'
            }
        ],
        notes: 'Đang tạm dừng nhập hàng mới để đối soát công nợ cuối chu kỳ hợp đồng cũ và ký phụ lục mới.',
        createdAt: '2023-01-28'
    }
];

export default function SupplierList() {
    const { showToast, toast } = useToast();

    // Data State
    const [suppliers, setSuppliers] = useState<SupplierItem[]>(INITIAL_SUPPLIERS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [quickStatus, setQuickStatus] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

    // Active Tab in Modals
    const [activeAddTab, setActiveAddTab] = useState('basic');
    const [activeEditTab, setActiveEditTab] = useState('basic');
    const [activeDetailTab, setActiveDetailTab] = useState('overview');

    // Add Form State
    const initialAddFormState = {
        code: '',
        name: '',
        companyName: '',
        taxCode: '',
        logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=160&q=80',
        email: '',
        phone: '',
        hotline: '',
        website: '',
        address: '',
        city: 'TP. Hồ Chí Minh',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        contactRole: 'Trưởng phòng Kinh doanh',
        categories: ['Linh kiện máy tính'],
        brands: ['ASUS'],
        tier: 'GOLD' as SupplierTier,
        status: 'ACTIVE' as SupplierStatus,
        paymentTerms: 'Công nợ 30 ngày',
        debtLimit: 500000000,
        currentDebt: 0,
        bankName: 'Vietcombank',
        accountNumber: '',
        accountHolder: '',
        branch: '',
        contractNumber: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discountRate: 3.0,
        notes: ''
    };
    const [addForm, setAddForm] = useState(initialAddFormState);

    // Edit Form State
    const [editForm, setEditForm] = useState<SupplierItem | null>(null);

    // File input ref for mock logo upload
    const logoInputRef = useRef<HTMLInputElement>(null);
    const editLogoInputRef = useRef<HTMLInputElement>(null);

    // Available categories and brands pool
    const ALL_AVAILABLE_CATEGORIES = [
        'Linh kiện máy tính',
        'Vi xử lý (CPU)',
        'Card màn hình (VGA)',
        'Bo mạch chủ',
        'Bộ nhớ RAM',
        'Ổ cứng SSD',
        'Nguồn máy tính (PSU)',
        'Vỏ Case',
        'Tản nhiệt CPU',
        'Màn hình Gaming',
        'Gaming Gear',
        'Bàn phím cơ',
        'Máy trạm Workstation',
        'Mạng viễn thông'
    ];

    const ALL_AVAILABLE_BRANDS = [
        'ASUS',
        'MSI',
        'Gigabyte',
        'Intel',
        'AMD',
        'Corsair',
        'Kingston',
        'Western Digital',
        'Cooler Master',
        'Lian Li',
        'DareU',
        'Crucial',
        'ViewSonic',
        'Antec',
        'DeepCool'
    ];

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = [
        {
            id: 'tier',
            label: 'Cấp bậc đối tác',
            type: 'select',
            placeholder: 'Tất cả cấp bậc',
            options: [
                { label: 'Tất cả cấp bậc', value: '' },
                { label: '💎 Chiến lược (Strategic)', value: 'STRATEGIC' },
                { label: '💠 Kim Cương (Diamond)', value: 'DIAMOND' },
                { label: '🥇 Vàng (Gold)', value: 'GOLD' },
                { label: '🛡️ Tiêu chuẩn (Standard)', value: 'STANDARD' },
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang hợp tác (ACTIVE)', value: 'ACTIVE' },
                { label: 'Tạm ngưng (SUSPENDED)', value: 'SUSPENDED' },
                { label: 'Ngừng hợp tác (INACTIVE)', value: 'INACTIVE' },
            ],
        },
        {
            id: 'city',
            label: 'Khu vực / Tỉnh thành',
            type: 'select',
            placeholder: 'Tất cả khu vực',
            options: [
                { label: 'Tất cả khu vực', value: '' },
                { label: 'TP. Hồ Chí Minh', value: 'TP. Hồ Chí Minh' },
                { label: 'Hà Nội', value: 'Hà Nội' },
                { label: 'Đà Nẵng', value: 'Đà Nẵng' },
            ],
        },
        {
            id: 'paymentTerms',
            label: 'Điều khoản công nợ',
            type: 'select',
            placeholder: 'Tất cả điều khoản',
            options: [
                { label: 'Tất cả điều khoản', value: '' },
                { label: 'Công nợ 30 ngày', value: 'Công nợ 30 ngày' },
                { label: 'Công nợ 45 ngày', value: 'Công nợ 45 ngày' },
                { label: 'Công nợ 15 ngày / Gối đầu', value: '15 ngày' },
                { label: 'Thanh toán ngay (COD)', value: 'COD' },
            ],
        },
    ];

    // Filter Logic
    const filteredSuppliers = suppliers.filter((sup) => {
        // Quick status pills
        if (quickStatus === 'ACTIVE' && sup.status !== 'ACTIVE') return false;
        if (quickStatus === 'STRATEGIC' && sup.tier !== 'STRATEGIC') return false;
        if (quickStatus === 'IN_DEBT' && sup.currentDebt <= 0) return false;
        if (quickStatus === 'SUSPENDED' && sup.status !== 'SUSPENDED') return false;

        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            const matchName = sup.name.toLowerCase().includes(query);
            const matchCode = sup.code.toLowerCase().includes(query);
            const matchCompany = sup.companyName.toLowerCase().includes(query);
            const matchTax = sup.taxCode.toLowerCase().includes(query);
            const matchContact = sup.contactPerson.name.toLowerCase().includes(query);
            const matchPhone = sup.phone.toLowerCase().includes(query) || sup.contactPerson.phone.includes(query);
            const matchEmail = sup.email.toLowerCase().includes(query);
            if (!matchName && !matchCode && !matchCompany && !matchTax && !matchContact && !matchPhone && !matchEmail) {
                return false;
            }
        }

        // Filter dropdowns
        if (filters.tier && sup.tier !== filters.tier) return false;
        if (filters.status && sup.status !== filters.status) return false;
        if (filters.city && sup.city !== filters.city) return false;
        if (filters.paymentTerms && !sup.paymentTerms.toLowerCase().includes(filters.paymentTerms.toLowerCase())) return false;

        return true;
    });

    const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
    const paginatedSuppliers = filteredSuppliers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Summary Metrics
    const totalSuppliersCount = suppliers.length;
    const activeSuppliersCount = suppliers.filter(s => s.status === 'ACTIVE').length;
    const totalDebt = suppliers.reduce((acc, s) => acc + s.currentDebt, 0);
    const totalCreditLimit = suppliers.reduce((acc, s) => acc + s.debtLimit, 0);
    const totalProcurement = suppliers.reduce((acc, s) => acc + s.totalPurchaseValue, 0);

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
        setQuickStatus('ALL');
        setCurrentPage(1);
        showToast('Đã xóa toàn bộ bộ lọc nhà cung cấp', 'info');
    };

    const handleExportExcel = () => {
        // Create CSV export file
        const headers = ['Mã NCC', 'Tên Nhà Cung Cấp', 'Tên Pháp Nhân', 'Mã Số Thuế', 'Số Điện Thoại', 'Email', 'Người Đại Diện', 'SĐT Đại Diện', 'Tỉnh/TP', 'Cấp Bậc', 'Trạng Thái', 'Hạn Mức Nợ (VNĐ)', 'Công Nợ Hiện Tại (VNĐ)', 'Điều Khoản Thanh Toán'];
        const rows = filteredSuppliers.map(s => [
            `"${s.code}"`,
            `"${s.name}"`,
            `"${s.companyName}"`,
            `"${s.taxCode}"`,
            `"${s.phone}"`,
            `"${s.email}"`,
            `"${s.contactPerson.name}"`,
            `"${s.contactPerson.phone}"`,
            `"${s.city}"`,
            `"${s.tier}"`,
            `"${s.status}"`,
            s.debtLimit,
            s.currentDebt,
            `"${s.paymentTerms}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `danh_sach_nha_cung_cap_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Đã xuất thành công ${filteredSuppliers.length} nhà cung cấp ra file CSV/Excel!`, 'Xuất file thành công');
    };

    // Quick Toggle Status
    const handleToggleStatus = (supplier: SupplierItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextStatus: SupplierStatus = supplier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, status: nextStatus } : s));
        showToast(
            `Đã chuyển trạng thái nhà cung cấp "${supplier.name}" sang ${nextStatus === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm ngưng'}`,
            nextStatus === 'ACTIVE' ? 'success' : 'warning'
        );
    };

    // Open Detail Modal
    const handleOpenDetail = (supplier: SupplierItem) => {
        setSelectedSupplier(supplier);
        setActiveDetailTab('overview');
        setIsDetailModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (supplier: SupplierItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedSupplier(supplier);
        setEditForm({ ...supplier });
        setActiveEditTab('basic');
        setIsEditModalOpen(true);
    };

    // Open Delete Modal
    const handleOpenDelete = (supplier: SupplierItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedSupplier(supplier);
        setIsDeleteModalOpen(true);
    };

    // Confirm Delete
    const handleConfirmDelete = () => {
        if (!selectedSupplier) return;
        setSuppliers(prev => prev.filter(s => s.id !== selectedSupplier.id));
        setSelectedKeys(prev => prev.filter(k => k !== selectedSupplier.id));
        setIsDeleteModalOpen(false);
        showToast(`Đã xóa thành công nhà cung cấp "${selectedSupplier.name}"`, 'success');
        setSelectedSupplier(null);
    };

    // Save Edit Form
    const handleSaveEdit = () => {
        if (!editForm) return;
        if (!editForm.name.trim()) {
            showToast('Tên nhà cung cấp không được để trống', 'error');
            return;
        }
        if (!editForm.code.trim()) {
            showToast('Mã nhà cung cấp không được để trống', 'error');
            return;
        }
        if (!editForm.taxCode.trim()) {
            showToast('Mã số thuế không được để trống', 'error');
            return;
        }

        setSuppliers(prev => prev.map(s => s.id === editForm.id ? editForm : s));
        setIsEditModalOpen(false);
        showToast(`Đã cập nhật thông tin nhà cung cấp "${editForm.name}" thành công!`, 'success');
    };

    // Save Add Form
    const handleSaveAdd = () => {
        if (!addForm.name.trim()) {
            showToast('Vui lòng nhập tên nhà cung cấp', 'error');
            return;
        }
        if (!addForm.code.trim()) {
            showToast('Vui lòng nhập mã nhà cung cấp', 'error');
            return;
        }
        if (!addForm.taxCode.trim()) {
            showToast('Vui lòng nhập mã số thuế', 'error');
            return;
        }

        const newSupplier: SupplierItem = {
            id: `sup-${Date.now()}`,
            code: addForm.code.toUpperCase().trim(),
            name: addForm.name.trim(),
            companyName: addForm.companyName.trim() || addForm.name.trim(),
            taxCode: addForm.taxCode.trim(),
            logo: addForm.logo,
            email: addForm.email || 'lienhe@nhacungcap.vn',
            phone: addForm.phone || '028 3888 9999',
            hotline: addForm.hotline || addForm.phone,
            website: addForm.website,
            address: addForm.address || 'Hồ Chí Minh, Việt Nam',
            city: addForm.city,
            contactPerson: {
                name: addForm.contactName || 'Người đại diện',
                phone: addForm.contactPhone || addForm.phone,
                email: addForm.contactEmail || addForm.email,
                role: addForm.contactRole
            },
            categories: addForm.categories.length > 0 ? addForm.categories : ['Linh kiện máy tính'],
            brands: addForm.brands.length > 0 ? addForm.brands : ['Chính hãng'],
            tier: addForm.tier,
            status: addForm.status,
            rating: 5.0,
            paymentTerms: addForm.paymentTerms,
            debtLimit: Number(addForm.debtLimit) || 500000000,
            currentDebt: Number(addForm.currentDebt) || 0,
            totalPurchaseValue: 0,
            totalOrdersCount: 0,
            lastOrderDate: 'Chưa có đơn nhập',
            bankInfo: {
                bankName: addForm.bankName,
                accountNumber: addForm.accountNumber || '000012345678',
                accountHolder: addForm.accountHolder || addForm.companyName.toUpperCase(),
                branch: addForm.branch || addForm.city
            },
            contract: {
                contractNumber: addForm.contractNumber || `HDNT-${addForm.code.toUpperCase()}-2024`,
                startDate: addForm.startDate,
                endDate: addForm.endDate,
                discountRate: Number(addForm.discountRate) || 3.0
            },
            recentImports: [],
            notes: addForm.notes,
            createdAt: new Date().toISOString().split('T')[0]
        };

        setSuppliers(prev => [newSupplier, ...prev]);
        setIsAddModalOpen(false);
        setAddForm(initialAddFormState);
        showToast(`Đã thêm thành công nhà cung cấp "${newSupplier.name}" (${newSupplier.code})`, 'success');
    };

    // Bulk Actions
    const handleBulkStatusChange = (status: SupplierStatus) => {
        if (selectedKeys.length === 0) return;
        setSuppliers(prev => prev.map(s => selectedKeys.includes(s.id) ? { ...s, status } : s));
        showToast(`Đã chuyển trạng thái ${selectedKeys.length} nhà cung cấp sang ${status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm ngưng'}`, 'success');
        setSelectedKeys([]);
    };

    const handleBulkDelete = () => {
        if (selectedKeys.length === 0) return;
        if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedKeys.length} nhà cung cấp đã chọn?`)) {
            setSuppliers(prev => prev.filter(s => !selectedKeys.includes(s.id)));
            showToast(`Đã xóa ${selectedKeys.length} nhà cung cấp được chọn`, 'success');
            setSelectedKeys([]);
        }
    };

    // Copy Helper
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`Đã sao chép ${label}: ${text}`, 'info');
    };

    // Toggle Category in Form
    const handleToggleCategory = (cat: string, isEdit = false) => {
        if (isEdit) {
            if (!editForm) return;
            const exists = editForm.categories.includes(cat);
            const updated = exists
                ? editForm.categories.filter(c => c !== cat)
                : [...editForm.categories, cat];
            setEditForm({ ...editForm, categories: updated });
        } else {
            const exists = addForm.categories.includes(cat);
            const updated = exists
                ? addForm.categories.filter(c => c !== cat)
                : [...addForm.categories, cat];
            setAddForm(prev => ({ ...prev, categories: updated }));
        }
    };

    // Toggle Brand in Form
    const handleToggleBrand = (brand: string, isEdit = false) => {
        if (isEdit) {
            if (!editForm) return;
            const exists = editForm.brands.includes(brand);
            const updated = exists
                ? editForm.brands.filter(b => b !== brand)
                : [...editForm.brands, brand];
            setEditForm({ ...editForm, brands: updated });
        } else {
            const exists = addForm.brands.includes(brand);
            const updated = exists
                ? addForm.brands.filter(b => b !== brand)
                : [...addForm.brands, brand];
            setAddForm(prev => ({ ...prev, brands: updated }));
        }
    };

    // Handle Upload Mock Logo
    const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
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

    // Tier Badge Renderer
    const renderTierBadge = (tier: SupplierTier) => {
        switch (tier) {
            case 'STRATEGIC':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 text-blue-700 border border-blue-300/80 shadow-xs">
                        <Sparkles className="w-3 h-3 text-blue-600 animate-pulse" />
                        Chiến Lược
                    </span>
                );
            case 'DIAMOND':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
                        <ShieldCheck className="w-3 h-3 text-cyan-600" />
                        Kim Cương
                    </span>
                );
            case 'GOLD':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Đối Tác Vàng
                    </span>
                );
            case 'STANDARD':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <Tag className="w-3 h-3 text-slate-500" />
                        Tiêu Chuẩn
                    </span>
                );
        }
    };

    // Columns Configuration for AdminTable
    const columns: Column<SupplierItem>[] = [
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (sup) => (
                <div className="flex items-center gap-3.5 py-1">
                    <div className="relative group shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm p-1 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-md">
                            <img
                                src={sup.logo}
                                alt={sup.name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=160&q=80';
                                }}
                            />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm truncate max-w-[220px]">
                                {sup.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {sup.code}
                            </span>
                            {renderTierBadge(sup.tier)}
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[280px] mt-0.5" title={sup.companyName}>
                            {sup.companyName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                            <span>MST: <strong className="font-mono text-gray-600">{sup.taxCode}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {sup.rating}
                            </span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact',
            header: 'Người đại diện & Liên hệ',
            render: (sup) => (
                <div className="space-y-1 text-xs">
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{sup.contactPerson.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-normal">
                            {sup.contactPerson.role}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        <a
                            href={`tel:${sup.contactPerson.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-[11px]"
                        >
                            <Phone className="w-3 h-3 text-blue-500" />
                            {sup.contactPerson.phone}
                        </a>
                        <a
                            href={`mailto:${sup.contactPerson.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600 hover:underline text-[11px] truncate max-w-[150px]"
                            title={sup.contactPerson.email}
                        >
                            <Mail className="w-3 h-3 text-gray-400" />
                            {sup.contactPerson.email}
                        </a>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[200px]" title={sup.address}>{sup.city}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'categories',
            header: 'Ngành hàng & Hãng',
            render: (sup) => (
                <div className="space-y-1.5 max-w-[240px]">
                    <div className="flex flex-wrap gap-1">
                        {sup.categories.slice(0, 2).map((cat, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 border border-gray-200 truncate"
                            >
                                {cat}
                            </span>
                        ))}
                        {sup.categories.length > 2 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-gray-50 text-gray-500 border border-gray-200">
                                +{sup.categories.length - 2}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {sup.brands.slice(0, 3).map((brand, idx) => (
                            <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                            >
                                {brand}
                            </span>
                        ))}
                        {sup.brands.length > 3 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-50 text-gray-600">
                                +{sup.brands.length - 3}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'debt',
            header: 'Công nợ & Hạn mức',
            render: (sup) => {
                const debtPercent = Math.min(100, Math.round((sup.currentDebt / sup.debtLimit) * 100));
                const isOverWarning = debtPercent >= 80;
                const isHigh = debtPercent >= 50;

                return (
                    <div className="space-y-1.5 min-w-[170px]">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-900">
                                {sup.currentDebt.toLocaleString('vi-VN')} đ
                            </span>
                            <span className={`text-[10px] font-bold ${isOverWarning ? 'text-rose-600' : isHigh ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {debtPercent}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${isOverWarning ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${debtPercent}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>Hạn mức:</span>
                            <span className="font-mono text-gray-600">{sup.debtLimit.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'terms',
            header: 'Điều khoản TT',
            render: (sup) => (
                <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {sup.paymentTerms}
                    </span>
                    <div className="text-[11px] text-gray-400">
                        Chiết khấu: <strong className="text-emerald-600 font-semibold">{sup.contract.discountRate}%</strong>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (sup) => {
                const isActive = sup.status === 'ACTIVE';
                const isSuspended = sup.status === 'SUSPENDED';

                return (
                    <button
                        type="button"
                        onClick={(e) => handleToggleStatus(sup, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:shadow-xs ${isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : isSuspended
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                            }`}
                        title="Click để đổi nhanh trạng thái"
                    >
                        {isActive ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Đang hợp tác
                            </>
                        ) : isSuspended ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Tạm ngưng
                            </>
                        ) : (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                Ngừng hợp tác
                            </>
                        )}
                    </button>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (sup) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(sup)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Xem hồ sơ chi tiết NCC"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenEdit(sup, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Chỉnh sửa thông tin"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenDelete(sup, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa nhà cung cấp"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Tabs for Add Modal
    const addModalTabs: ModalTab[] = [
        { id: 'basic', label: '1. Thông tin doanh nghiệp', icon: Building2 },
        { id: 'contact', label: '2. Đại diện & Ngân hàng', icon: Users },
        { id: 'contract', label: '3. Hợp tác & Công nợ', icon: Receipt },
    ];

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        { id: 'overview', label: 'Hồ sơ pháp lý & Liên hệ', icon: Building2 },
        { id: 'finance', label: 'Công nợ & Hợp đồng', icon: CreditCard },
        { id: 'imports', label: 'Lịch sử nhập hàng', icon: Package },
        { id: 'catalog', label: 'Thương hiệu & Ngành hàng', icon: Layers },
    ];

    return (
        <div className="space-y-6">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        <span>Quản lý nhập hàng</span>
                        <span>/</span>
                        <span>Đối tác phân phối</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Building2 className="w-7 h-7 text-blue-600" />
                        Quản lý nhà cung cấp (Suppliers)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Quản lý mạng lưới các đối tác phân phối linh kiện máy tính, hãng sản xuất phần cứng, hợp đồng nguyên tắc và kiểm soát công nợ
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs"
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        Xuất Excel (CSV)
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-all shadow-xs"
                    >
                        <Upload className="w-4 h-4 text-blue-600" />
                        Nhập Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveAddTab('basic');
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm nhà cung cấp
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng nhà cung cấp</p>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{totalSuppliersCount}</h3>
                        <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{suppliers.filter(s => s.tier === 'STRATEGIC').length} đối tác chiến lược</span>
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Công nợ cần thanh toán</p>
                        <h3 className="text-2xl font-black text-rose-600 mt-1">
                            {totalDebt.toLocaleString('vi-VN')} đ
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Dùng {Math.round((totalDebt / totalCreditLimit) * 100)}% tổng hạn mức
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nhập hàng lũy kế</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">
                            {totalProcurement.toLocaleString('vi-VN')} đ
                        </h3>
                        <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Tổng toàn bộ hóa đơn nhập</span>
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đang hoạt động</p>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">
                            {activeSuppliersCount} <span className="text-sm font-normal text-gray-400">/ {totalSuppliersCount}</span>
                        </h3>
                        <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>Điểm uy tín TB: 4.8 / 5.0</span>
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Quick Status Tabs (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => { setQuickStatus('ALL'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${quickStatus === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                >
                    Tất cả ({suppliers.length})
                </button>
                <button
                    type="button"
                    onClick={() => { setQuickStatus('ACTIVE'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${quickStatus === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đang hợp tác ({suppliers.filter(s => s.status === 'ACTIVE').length})
                </button>
                <button
                    type="button"
                    onClick={() => { setQuickStatus('STRATEGIC'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${quickStatus === 'STRATEGIC'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Chiến lược ({suppliers.filter(s => s.tier === 'STRATEGIC').length})
                </button>
                <button
                    type="button"
                    onClick={() => { setQuickStatus('IN_DEBT'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${quickStatus === 'IN_DEBT'
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                >
                    <CreditCard className="w-3.5 h-3.5" />
                    Có dư nợ ({suppliers.filter(s => s.currentDebt > 0).length})
                </button>
                <button
                    type="button"
                    onClick={() => { setQuickStatus('SUSPENDED'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${quickStatus === 'SUSPENDED'
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Tạm ngưng ({suppliers.filter(s => s.status === 'SUSPENDED').length})
                </button>
            </div>

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                values={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm NCC theo tên, mã NCC, MST, người đại diện, số điện thoại hoặc email..."
            />

            {/* Bulk Selection Actions Bar */}
            {selectedKeys.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                            {selectedKeys.length}
                        </span>
                        <span className="text-xs font-bold text-blue-900">
                            Đã chọn {selectedKeys.length} nhà cung cấp
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleBulkStatusChange('ACTIVE')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-blue-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                            Đang hợp tác
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkStatusChange('SUSPENDED')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-blue-200 text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                            Tạm ngưng
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
                        >
                            Xóa đã chọn
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedKeys([])}
                            className="text-xs text-gray-500 hover:underline px-2"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {/* Suppliers Data Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={paginatedSuppliers}
                    rowKey="id"
                    selectable
                    selectedKeys={selectedKeys}
                    onSelectionChange={setSelectedKeys}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredSuppliers.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 15, 20]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    onRowClick={(item) => handleOpenDetail(item)}
                    itemUnitName="nhà cung cấp"
                    emptyText="Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc tìm kiếm hiện tại."
                />
            </div>

            {/* ========================================================================= */}
            {/* ADD SUPPLIER MODAL                                                        */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm nhà cung cấp mới"
                subtitle="Nhập thông tin pháp lý, đầu mối đại diện, tài khoản thanh toán và điều khoản công nợ"
                size="xl"
                tabs={addModalTabs}
                activeTab={activeAddTab}
                onTabChange={setActiveAddTab}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            {activeAddTab !== 'basic' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeAddTab === 'contract') setActiveAddTab('contact');
                                        else if (activeAddTab === 'contact') setActiveAddTab('basic');
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Quay lại
                                </button>
                            )}
                            {activeAddTab !== 'contract' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeAddTab === 'basic') setActiveAddTab('contact');
                                        else if (activeAddTab === 'contact') setActiveAddTab('contract');
                                    }}
                                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
                                >
                                    Tiếp theo: {activeAddTab === 'basic' ? 'Đại diện & Ngân hàng' : 'Hợp tác & Công nợ'}
                                </button>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAdd}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-500/20"
                            >
                                Lưu nhà cung cấp
                            </button>
                        </div>
                    </div>
                }
            >
                {activeAddTab === 'basic' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Tên hiển thị / Tên viết tắt <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Digiworld, Synnex FPT, Viễn Sơn..."
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Mã nhà cung cấp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: NCC-DGW, NCC-FPT..."
                                    value={addForm.code}
                                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                                    className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Tên pháp nhân đầy đủ theo ĐKKD <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Công ty Cổ phần Thế Giới Số"
                                value={addForm.companyName}
                                onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })}
                                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Mã số thuế (MST) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: 0302888999"
                                    value={addForm.taxCode}
                                    onChange={(e) => setAddForm({ ...addForm, taxCode: e.target.value })}
                                    className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Website chính thức
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com"
                                    value={addForm.website}
                                    onChange={(e) => setAddForm({ ...addForm, website: e.target.value })}
                                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Địa chỉ trụ sở / Kho xuất hàng
                                </label>
                                <input
                                    type="text"
                                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                                    value={addForm.address}
                                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Tỉnh / Thành phố
                                </label>
                                <select
                                    value={addForm.city}
                                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                >
                                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                    <option value="Hà Nội">Hà Nội</option>
                                    <option value="Đà Nẵng">Đà Nẵng</option>
                                    <option value="Hải Phòng">Hải Phòng</option>
                                    <option value="Cần Thơ">Cần Thơ</option>
                                </select>
                            </div>
                        </div>

                        {/* Logo Upload / URL */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                Logo thương hiệu nhà cung cấp
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={addForm.logo} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Nhập link URL ảnh logo hoặc tải file bên dưới"
                                        value={addForm.logo}
                                        onChange={(e) => setAddForm({ ...addForm, logo: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => logoInputRef.current?.click()}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                        >
                                            <Upload className="w-3.5 h-3.5 text-gray-500" />
                                            Chọn ảnh từ máy tính
                                        </button>
                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleUploadLogo(e, false)}
                                        />
                                        <span className="text-[11px] text-gray-400">Khuyên dùng logo vuông tỉ lệ 1:1</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Categories selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                Nhóm ngành hàng phân phối chính (chọn các mục áp dụng):
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                {ALL_AVAILABLE_CATEGORIES.map((cat) => {
                                    const isSelected = addForm.categories.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => handleToggleCategory(cat, false)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${isSelected
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Brands selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                Các hãng sản xuất đại diện phân phối chính:
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                {ALL_AVAILABLE_BRANDS.map((brand) => {
                                    const isSelected = addForm.brands.includes(brand);
                                    return (
                                        <button
                                            key={brand}
                                            type="button"
                                            onClick={() => handleToggleBrand(brand, false)}
                                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                            {brand}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeAddTab === 'contact' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-blue-600" />
                                Người đại diện liên hệ kinh doanh
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Họ và tên người liên hệ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={addForm.contactName}
                                        onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })}
                                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Chức vụ / Bộ phận
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Trưởng phòng phân phối đại lý"
                                        value={addForm.contactRole}
                                        onChange={(e) => setAddForm({ ...addForm, contactRole: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Số điện thoại di động <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Ví dụ: 0908 123 456"
                                        value={addForm.contactPhone}
                                        onChange={(e) => setAddForm({ ...addForm, contactPhone: e.target.value })}
                                        className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Email làm việc <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Ví dụ: contact@nhacungcap.vn"
                                        value={addForm.contactEmail}
                                        onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                Thông tin tài khoản ngân hàng thụ hưởng (Ủy nhiệm chi)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Tên ngân hàng
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Vietcombank, Techcombank, BIDV..."
                                        value={addForm.bankName}
                                        onChange={(e) => setAddForm({ ...addForm, bankName: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Số tài khoản (STK)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: 0071000888999"
                                        value={addForm.accountNumber}
                                        onChange={(e) => setAddForm({ ...addForm, accountNumber: e.target.value })}
                                        className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Tên chủ tài khoản (In hoa không dấu)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: CONG TY CO PHAN THE GIOI SO"
                                        value={addForm.accountHolder}
                                        onChange={(e) => setAddForm({ ...addForm, accountHolder: e.target.value.toUpperCase() })}
                                        className="w-full text-xs font-bold uppercase px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Chi nhánh ngân hàng
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Chi nhánh Tân Bình, TP.HCM"
                                        value={addForm.branch}
                                        onChange={(e) => setAddForm({ ...addForm, branch: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeAddTab === 'contract' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Cấp bậc đối tác
                                </label>
                                <select
                                    value={addForm.tier}
                                    onChange={(e) => setAddForm({ ...addForm, tier: e.target.value as SupplierTier })}
                                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="STRATEGIC">💎 Đối tác Chiến Lược (Strategic)</option>
                                    <option value="DIAMOND">💠 Đối tác Kim Cương (Diamond)</option>
                                    <option value="GOLD">🥇 Đối tác Vàng (Gold)</option>
                                    <option value="STANDARD">🛡️ Đối tác Tiêu Chuẩn (Standard)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Trạng thái ban đầu
                                </label>
                                <select
                                    value={addForm.status}
                                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as SupplierStatus })}
                                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
                                    <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
                                    <option value="INACTIVE">Ngừng hợp tác (INACTIVE)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Điều khoản thanh toán
                                </label>
                                <select
                                    value={addForm.paymentTerms}
                                    onChange={(e) => setAddForm({ ...addForm, paymentTerms: e.target.value })}
                                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="Công nợ 30 ngày">Công nợ 30 ngày</option>
                                    <option value="Công nợ 45 ngày">Công nợ 45 ngày</option>
                                    <option value="Gối đầu 15 ngày">Gối đầu 15 ngày</option>
                                    <option value="Thanh toán ngay khi nhận hàng (COD)">Thanh toán ngay khi nhận hàng (COD)</option>
                                    <option value="Đặt cọc 30% - 70% khi nhận hàng">Đặt cọc 30% - 70% khi nhận hàng</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Tỷ lệ chiết khấu thương mại (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={addForm.discountRate}
                                    onChange={(e) => setAddForm({ ...addForm, discountRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Hạn mức tín dụng / công nợ (VNĐ)
                                </label>
                                <input
                                    type="number"
                                    step="10000000"
                                    value={addForm.debtLimit}
                                    onChange={(e) => setAddForm({ ...addForm, debtLimit: parseInt(e.target.value) || 0 })}
                                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Số hợp đồng nguyên tắc
                                </label>
                                <input
                                    type="text"
                                    placeholder="HDNT-XXXX-2024"
                                    value={addForm.contractNumber}
                                    onChange={(e) => setAddForm({ ...addForm, contractNumber: e.target.value })}
                                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Ngày bắt đầu hợp đồng
                                </label>
                                <input
                                    type="date"
                                    value={addForm.startDate}
                                    onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Ngày hết hạn hợp đồng
                                </label>
                                <input
                                    type="date"
                                    value={addForm.endDate}
                                    onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
                                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Ghi chú nội bộ
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Ghi chú về chính sách bảo hành, cam kết chiết khấu hoặc thỏa thuận đặc biệt..."
                                value={addForm.notes}
                                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT SUPPLIER MODAL                                                       */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Chỉnh sửa: ${editForm.name}`}
                    subtitle={`Cập nhật thông tin chi tiết nhà cung cấp mã [${editForm.code}]`}
                    size="xl"
                    tabs={addModalTabs}
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-500/20"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    }
                >
                    {activeEditTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Tên nhà cung cấp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Mã nhà cung cấp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.code}
                                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                        className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Tên pháp nhân đầy đủ theo ĐKKD
                                </label>
                                <input
                                    type="text"
                                    value={editForm.companyName}
                                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Mã số thuế (MST) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.taxCode}
                                        onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                                        className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        value={editForm.website || ''}
                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Địa chỉ trụ sở / Kho xuất
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Tỉnh / Thành phố
                                    </label>
                                    <select
                                        value={editForm.city}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                        <option value="Hà Nội">Hà Nội</option>
                                        <option value="Đà Nẵng">Đà Nẵng</option>
                                        <option value="Hải Phòng">Hải Phòng</option>
                                        <option value="Cần Thơ">Cần Thơ</option>
                                    </select>
                                </div>
                            </div>

                            {/* Logo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Logo nhà cung cấp
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                        <img src={editForm.logo} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={editForm.logo}
                                            onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                                            className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => editLogoInputRef.current?.click()}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                            >
                                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                                Tải logo mới từ máy
                                            </button>
                                            <input
                                                ref={editLogoInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleUploadLogo(e, true)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Categories */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Nhóm ngành hàng:
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                    {ALL_AVAILABLE_CATEGORIES.map((cat) => {
                                        const isSelected = editForm.categories.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleToggleCategory(cat, true)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeEditTab === 'contact' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    Người đại diện liên hệ kinh doanh
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Họ và tên người đại diện
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.contactPerson.name}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                contactPerson: { ...editForm.contactPerson, name: e.target.value }
                                            })}
                                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Chức danh
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.contactPerson.role}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                contactPerson: { ...editForm.contactPerson, role: e.target.value }
                                            })}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            value={editForm.contactPerson.phone}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                contactPerson: { ...editForm.contactPerson, phone: e.target.value }
                                            })}
                                            className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Email làm việc
                                        </label>
                                        <input
                                            type="email"
                                            value={editForm.contactPerson.email}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                contactPerson: { ...editForm.contactPerson, email: e.target.value }
                                            })}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                    Tài khoản ngân hàng chuyển khoản
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Tên ngân hàng
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.bankInfo.bankName}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                bankInfo: { ...editForm.bankInfo, bankName: e.target.value }
                                            })}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Số tài khoản (STK)
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.bankInfo.accountNumber}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                bankInfo: { ...editForm.bankInfo, accountNumber: e.target.value }
                                            })}
                                            className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Chủ tài khoản
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.bankInfo.accountHolder}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                bankInfo: { ...editForm.bankInfo, accountHolder: e.target.value.toUpperCase() }
                                            })}
                                            className="w-full text-xs font-bold uppercase px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Chi nhánh
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.bankInfo.branch}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                bankInfo: { ...editForm.bankInfo, branch: e.target.value }
                                            })}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeEditTab === 'contract' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Cấp bậc đối tác
                                    </label>
                                    <select
                                        value={editForm.tier}
                                        onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as SupplierTier })}
                                        className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    >
                                        <option value="STRATEGIC">💎 Đối tác Chiến Lược (Strategic)</option>
                                        <option value="DIAMOND">💠 Đối tác Kim Cương (Diamond)</option>
                                        <option value="GOLD">🥇 Đối tác Vàng (Gold)</option>
                                        <option value="STANDARD">🛡️ Đối tác Tiêu Chuẩn (Standard)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Trạng thái hợp tác
                                    </label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SupplierStatus })}
                                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    >
                                        <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
                                        <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
                                        <option value="INACTIVE">Ngừng hợp tác (INACTIVE)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Hạn mức công nợ (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        step="10000000"
                                        value={editForm.debtLimit}
                                        onChange={(e) => setEditForm({ ...editForm, debtLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Công nợ hiện tại (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        step="10000000"
                                        value={editForm.currentDebt}
                                        onChange={(e) => setEditForm({ ...editForm, currentDebt: parseInt(e.target.value) || 0 })}
                                        className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Điều khoản thanh toán
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.paymentTerms}
                                        onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Tỷ lệ chiết khấu (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editForm.contract.discountRate}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            contract: { ...editForm.contract, discountRate: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Ghi chú đối tác
                                </label>
                                <textarea
                                    rows={2}
                                    value={editForm.notes || ''}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white"
                                />
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL SUPPLIER MODAL                                                     */}
            {/* ========================================================================= */}
            {selectedSupplier && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-3">
                            <span className="truncate">{selectedSupplier.name}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {selectedSupplier.code}
                            </span>
                        </div>
                    }
                    subtitle={`Hồ sơ chi tiết & Quản lý quan hệ đối tác cung ứng [${selectedSupplier.companyName}]`}
                    size="2xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={setActiveDetailTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                    Thêm vào hệ thống: <strong>{selectedSupplier.createdAt}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedSupplier);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    Chỉnh sửa hồ sơ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    }
                >
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-5">
                            {/* Company Summary Banner */}
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/60 border border-blue-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white p-1 border border-blue-200 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                                        <img src={selectedSupplier.logo} alt={selectedSupplier.name} className="w-full h-full object-cover rounded-xl" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-bold text-gray-900">{selectedSupplier.name}</h3>
                                            {renderTierBadge(selectedSupplier.tier)}
                                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white border border-gray-200 text-gray-700">
                                                ⭐ {selectedSupplier.rating} / 5.0
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">{selectedSupplier.companyName}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
                                            <span>Mã số thuế: <strong className="font-mono text-gray-800">{selectedSupplier.taxCode}</strong></span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-rose-500" />
                                                {selectedSupplier.city}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedSupplier.website && (
                                        <a
                                            href={selectedSupplier.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:border-blue-300 shadow-xs inline-flex items-center gap-1.5"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Website
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(selectedSupplier.taxCode, 'Mã số thuế')}
                                        className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs inline-flex items-center gap-1.5"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                        Copy MST
                                    </button>
                                </div>
                            </div>

                            {/* Contact & Banking Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Representative Card */}
                                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            Đầu mối liên hệ kinh doanh
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Họ và tên:</span>
                                            <span className="font-bold text-gray-900">{selectedSupplier.contactPerson.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Chức vụ:</span>
                                            <span className="font-medium text-gray-700">{selectedSupplier.contactPerson.role}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Điện thoại di động:</span>
                                            <a href={`tel:${selectedSupplier.contactPerson.phone}`} className="font-mono font-bold text-blue-600 hover:underline">
                                                {selectedSupplier.contactPerson.phone}
                                            </a>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Email:</span>
                                            <a href={`mailto:${selectedSupplier.contactPerson.email}`} className="text-blue-600 hover:underline">
                                                {selectedSupplier.contactPerson.email}
                                            </a>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                                            <span className="text-gray-500">Hotline công ty:</span>
                                            <span className="font-mono text-gray-800">{selectedSupplier.hotline || selectedSupplier.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Account Card */}
                                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                            <CreditCard className="w-4 h-4 text-emerald-600" />
                                            Tài khoản ngân hàng thanh toán
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(selectedSupplier.bankInfo.accountNumber, 'Số tài khoản')}
                                            className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            <Copy className="w-3 h-3" />
                                            Sao chép STK
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Ngân hàng:</span>
                                            <span className="font-bold text-gray-900">{selectedSupplier.bankInfo.bankName}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Số tài khoản:</span>
                                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                {selectedSupplier.bankInfo.accountNumber}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Chủ tài khoản:</span>
                                            <span className="font-bold text-gray-800 uppercase">{selectedSupplier.bankInfo.accountHolder}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Chi nhánh:</span>
                                            <span className="text-gray-700">{selectedSupplier.bankInfo.branch}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address & Notes */}
                            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                                <span className="text-xs font-bold text-gray-600 uppercase block">Trụ sở & Ghi chú quản lý:</span>
                                <p className="text-xs text-gray-700 flex items-start gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <span>{selectedSupplier.address}</span>
                                </p>
                                {selectedSupplier.notes && (
                                    <p className="text-xs text-gray-600 pt-2 border-t border-gray-200/60 italic">
                                        "{selectedSupplier.notes}"
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'finance' && (
                        <div className="space-y-5">
                            {/* Debt Gauges */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Hạn mức công nợ tối đa</p>
                                    <h4 className="text-xl font-bold text-gray-900 mt-1">
                                        {selectedSupplier.debtLimit.toLocaleString('vi-VN')} đ
                                    </h4>
                                    <span className="text-[11px] text-gray-500">Hạn mức tín dụng đại lý</span>
                                </div>
                                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Dư nợ hiện tại</p>
                                    <h4 className="text-xl font-bold text-rose-600 mt-1">
                                        {selectedSupplier.currentDebt.toLocaleString('vi-VN')} đ
                                    </h4>
                                    <span className="text-[11px] text-rose-500 font-semibold">
                                        Chiếm {Math.round((selectedSupplier.currentDebt / selectedSupplier.debtLimit) * 100)}% hạn mức
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Dư nợ còn lại có thể đặt</p>
                                    <h4 className="text-xl font-bold text-emerald-600 mt-1">
                                        {Math.max(0, selectedSupplier.debtLimit - selectedSupplier.currentDebt).toLocaleString('vi-VN')} đ
                                    </h4>
                                    <span className="text-[11px] text-emerald-600">Được phép đặt hàng tiếp</span>
                                </div>
                            </div>

                            {/* Contract Details Card */}
                            <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <h4 className="text-sm font-bold text-gray-900">Hợp đồng nguyên tắc & Điều khoản thanh toán</h4>
                                    </div>
                                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                        {selectedSupplier.contract.contractNumber}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                    <div className="space-y-1">
                                        <span className="text-gray-400">Điều khoản thanh toán:</span>
                                        <p className="font-bold text-gray-800">{selectedSupplier.paymentTerms}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400">Chiết khấu thương mại:</span>
                                        <p className="font-bold text-emerald-600 text-sm">+{selectedSupplier.contract.discountRate}%</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400">Ngày hiệu lực:</span>
                                        <p className="font-semibold text-gray-800">{selectedSupplier.contract.startDate}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400">Ngày hết hạn:</span>
                                        <p className="font-semibold text-gray-800">{selectedSupplier.contract.endDate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'imports' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase">
                                    Lịch sử các đơn nhập gần đây ({selectedSupplier.recentImports.length} đơn)
                                </span>
                                <span className="text-xs text-gray-500">
                                    Tổng tích lũy: <strong className="text-emerald-600">{selectedSupplier.totalPurchaseValue.toLocaleString('vi-VN')} đ</strong>
                                </span>
                            </div>

                            {selectedSupplier.recentImports.length > 0 ? (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-2.5">Mã đơn nhập</th>
                                                <th className="px-4 py-2.5">Ngày nhập</th>
                                                <th className="px-4 py-2.5">Số lượng</th>
                                                <th className="px-4 py-2.5">Tổng giá trị</th>
                                                <th className="px-4 py-2.5">Trạng thái</th>
                                                <th className="px-4 py-2.5">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedSupplier.recentImports.map((imp) => (
                                                <tr key={imp.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{imp.orderCode}</td>
                                                    <td className="px-4 py-3 text-gray-600">{imp.date}</td>
                                                    <td className="px-4 py-3 text-gray-800 font-semibold">{imp.itemsCount} SP</td>
                                                    <td className="px-4 py-3 font-bold text-gray-900">{imp.totalAmount.toLocaleString('vi-VN')} đ</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Đã hoàn tất
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 italic max-w-[200px] truncate" title={imp.notes}>
                                                        {imp.notes || '---'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">Chưa có lịch sử đơn nhập hàng được lưu trong hệ thống.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeDetailTab === 'catalog' && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Thương hiệu phần cứng được ủy quyền phân phối
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {selectedSupplier.brands.map((brand, idx) => (
                                        <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-white flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {brand.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-900">{brand}</p>
                                                <span className="text-[10px] text-gray-400">Chính hãng 100%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Nhóm ngành hàng cung cấp cho PCStore
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedSupplier.categories.map((cat, idx) => (
                                        <span key={idx} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DELETE CONFIRMATION MODAL                                                 */}
            {/* ========================================================================= */}
            {isDeleteModalOpen && selectedSupplier && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Xác nhận xóa nhà cung cấp?</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Bạn đang chuẩn bị xóa nhà cung cấp <strong>"{selectedSupplier.name}"</strong> ({selectedSupplier.code}).
                            </p>
                            {selectedSupplier.currentDebt > 0 && (
                                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-800">
                                    <span className="font-bold flex items-center gap-1 text-amber-900 mb-1">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Cảnh báo công nợ tồn đọng:
                                    </span>
                                    Nhà cung cấp này hiện đang có <strong>{selectedSupplier.currentDebt.toLocaleString('vi-VN')} đ</strong> công nợ chưa quyết toán.
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* IMPORT EXCEL MODAL                                                        */}
            {/* ========================================================================= */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                Nhập danh sách NCC từ Excel
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3 text-xs text-gray-600">
                            <p>Tải lên file định dạng <strong>.xlsx, .xls hoặc .csv</strong> theo đúng biểu mẫu chuẩn của hệ thống PCStore.</p>
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50">
                                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <p className="font-semibold text-gray-800">Kéo và thả file Excel vào đây, hoặc click để chọn file</p>
                                <span className="text-[11px] text-gray-400 mt-1 block">Dung lượng tối đa 10MB</span>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                                <span className="font-medium text-blue-900">Chưa có file mẫu Excel?</span>
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Tải file mẫu
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsImportModalOpen(false);
                                    showToast('Hệ thống đã nhận file và đang tiến hành đồng bộ dữ liệu nhà cung cấp', 'success');
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                            >
                                Bắt đầu nhập dữ liệu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
