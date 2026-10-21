import React, { useState, useRef } from 'react';
import {
    FolderTree,
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
    RefreshCw
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';

export interface CategoryItem {
    id: string;
    name: string;
    slug: string;
    description: string;
    parentId: string | null;
    parentName: string;
    image: string;
    order: number;
    productsCount: number;
    status: 'ACTIVE' | 'HIDDEN';
    isFeatured: boolean;
    showOnMenu: boolean;
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

// Initial Mock Categories
const INITIAL_CATEGORIES: CategoryItem[] = [
    {
        id: 'cat-1',
        name: 'PC Nguyên Bộ',
        slug: 'pc-nguyen-bo',
        description: 'Các dàn máy tính PC nguyên bộ tối ưu sẵn cho game thủ, văn phòng và đồ họa.',
        parentId: null,
        parentName: 'Danh mục gốc',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
        order: 1,
        productsCount: 156,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-10',
        metaTitle: 'PC Nguyên Bộ Chính Hãng - Giá Rẻ, Trả Góp 0% | PCStore',
        metaDescription: 'Mua PC nguyên bộ chính hãng cấu hình khủng, tối ưu cho Gaming, Đồ họa và Văn phòng. Bảo hành 36 tháng 1 đổi 1.',
        metaKeywords: 'pc nguyen bo, pc dong bo, pc rap san, may tinh ban',
    },
    {
        id: 'cat-2',
        name: 'PC Gaming',
        slug: 'pc-gaming',
        description: 'Dàn máy chiến mượt mọi tựa game AAA, Esport với card đồ họa RTX mới nhất.',
        parentId: 'cat-1',
        parentName: 'PC Nguyên Bộ',
        image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=400&q=80',
        order: 2,
        productsCount: 68,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-12',
        metaTitle: 'PC Gaming Chiến Game Đỉnh Cao | PCStore',
        metaDescription: 'Máy tính chơi game cấu hình cao, bảo hành tận nơi, hỗ trợ trả góp 0%.',
        metaKeywords: 'pc gaming, pc choi game, may tinh choi game',
    },
    {
        id: 'cat-3',
        name: 'PC Đồ Họa & Render',
        slug: 'pc-do-hoa',
        description: 'Chuyên dụng cho xử lý đồ họa 3D, dựng phim Premiere, After Effect, AutoCAD.',
        parentId: 'cat-1',
        parentName: 'PC Nguyên Bộ',
        image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=400&q=80',
        order: 3,
        productsCount: 42,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-15',
        metaTitle: 'PC Đồ Họa, Kiến Trúc, Render 3D Chuyên Nghiệp | PCStore',
        metaDescription: 'Máy trạm PC đồ họa cấu hình mạnh mẽ với CPU Intel Core i7/i9 và AMD Ryzen 9.',
        metaKeywords: 'pc do hoa, pc render, pc kien truc',
    },
    {
        id: 'cat-4',
        name: 'PC Văn Phòng',
        slug: 'pc-van-phong',
        description: 'Máy tính để bàn vận hành êm ái, bền bỉ, tiết kiệm điện năng cho văn phòng doanh nghiệp.',
        parentId: 'cat-1',
        parentName: 'PC Nguyên Bộ',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80',
        order: 4,
        productsCount: 34,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: true,
        createdAt: '2024-01-18',
        metaTitle: 'PC Văn Phòng Bền Bỉ, Giá Rẻ Nhất Thị Trường | PCStore',
        metaDescription: 'Cung cấp máy tính văn phòng giá sỉ cho công ty, trường học với dịch vụ cài đặt miễn phí.',
        metaKeywords: 'pc van phong, may tinh van phong, pc gia re',
    },
    {
        id: 'cat-5',
        name: 'PC AI Workstation',
        slug: 'pc-ai',
        description: 'Máy tính trạm chuyên dụng huấn luyện mô hình Deep Learning, Large Language Model.',
        parentId: 'cat-1',
        parentName: 'PC Nguyên Bộ',
        image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80',
        order: 5,
        productsCount: 12,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-02-01',
        metaTitle: 'PC AI & Deep Learning Workstation Hàng Đầu | PCStore',
        metaDescription: 'Máy trạm Workstation chuyên dụng cho trí tuệ nhân tạo, hỗ trợ nhiều card đồ họa RTX song song.',
        metaKeywords: 'pc ai, pc workstation, deep learning pc',
    },
    {
        id: 'cat-6',
        name: 'Linh Kiện Máy Tính',
        slug: 'linh-kien-may-tinh',
        description: 'Kho linh kiện phần cứng máy tính chính hãng đầy đủ CPU, VGA, RAM, Mainboard, SSD.',
        parentId: null,
        parentName: 'Danh mục gốc',
        image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80',
        order: 6,
        productsCount: 420,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-05',
        metaTitle: 'Linh Kiện Máy Tính Chính Hãng Giá Tốt Nhất | PCStore',
        metaDescription: 'Tổng đại lý linh kiện máy tính uy tín: CPU, VGA, Mainboard, RAM, SSD từ ASUS, MSI, Gigabyte.',
        metaKeywords: 'linh kien may tinh, phan cung pc, linh kien chinh hang',
    },
    {
        id: 'cat-7',
        name: 'CPU - Bo Vi Xử Lý',
        slug: 'cpu-bo-vi-xu-ly',
        description: 'Bộ vi xử lý trung tâm Intel Core Gen 13/14 và AMD Ryzen 7000/9000 Series.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&q=80',
        order: 7,
        productsCount: 86,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-08',
        metaTitle: 'CPU Máy Tính - Chip Vi Xử Lý Intel & AMD | PCStore',
        metaDescription: 'Bảng giá CPU Intel và AMD mới nhất, đầy đủ các dòng Core i5, i7, i9, Ryzen 5, 7, 9.',
        metaKeywords: 'cpu intel, cpu amd, bo vi xu ly',
    },
    {
        id: 'cat-8',
        name: 'VGA - Card Đồ Họa',
        slug: 'vga-card-do-hoa',
        description: 'Card màn hình đồ họa NVIDIA GeForce RTX 40 Series, RTX 50 Series và AMD Radeon RX.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=400&q=80',
        order: 8,
        productsCount: 110,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-09',
        metaTitle: 'VGA - Card Đồ Họa Rời NVIDIA & AMD Chính Hãng | PCStore',
        metaDescription: 'Card màn hình gaming và đồ họa chuyên nghiệp giá cạnh tranh, tặng kèm quà tặng hấp dẫn.',
        metaKeywords: 'vga rtx, card do hoa, card man hinh',
    },
    {
        id: 'cat-9',
        name: 'Mainboard - Bo Mạch Chủ',
        slug: 'mainboard-bo-mach-chu',
        description: 'Bo mạch chủ socket LGA1700, AM5 từ các thương hiệu ROG, TUF, MAG, AORUS.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        order: 9,
        productsCount: 74,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: true,
        createdAt: '2024-01-11',
        metaTitle: 'Mainboard Bo Mạch Chủ Hỗ Trợ Intel & AMD | PCStore',
        metaDescription: 'Bo mạch chủ Z790, B760, X670, B650 chính hãng bảo hành 36 tháng.',
        metaKeywords: 'mainboard, bo mach chu, main z790',
    },
    {
        id: 'cat-10',
        name: 'RAM - Bộ Nhớ Trong',
        slug: 'ram-bo-nho-trong',
        description: 'Bộ nhớ RAM DDR4, DDR5 tốc độ bus cao với tản nhiệt nhôm và LED RGB rực rỡ.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80',
        order: 10,
        productsCount: 95,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-13',
        metaTitle: 'RAM Máy Tính DDR4 & DDR5 Chính Hãng | PCStore',
        metaDescription: 'RAM PC Corsair, Kingston, G.Skill tốc độ cao, độ ổn định tuyệt đối.',
        metaKeywords: 'ram pc, ram ddr5, ram ddr4',
    },
    {
        id: 'cat-11',
        name: 'Ổ Cứng SSD / HDD',
        slug: 'o-cung-hdd-ssd',
        description: 'Ổ cứng thể rắn SSD NVMe PCIe Gen 4/5 và ổ cứng lưu trữ HDD dung lượng lớn.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80',
        order: 11,
        productsCount: 55,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: true,
        createdAt: '2024-01-14',
        metaTitle: 'Ổ Cứng SSD M.2 NVMe Tốc Độ Siêu Nhanh | PCStore',
        metaDescription: 'SSD Samsung 990 Pro, Kingston KC3000 tốc độ đọc ghi lên tới 7500MB/s.',
        metaKeywords: 'ssd nvme, o cung ssd, o cung hdd',
    },
    {
        id: 'cat-12',
        name: 'Nguồn Máy Tính (PSU)',
        slug: 'nguon-may-tinh-psu',
        description: 'Nguồn công suất thực chuẩn 80 Plus Bronze, Gold, Platinum chuẩn ATX 3.0.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&w=400&q=80',
        order: 12,
        productsCount: 38,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: false,
        createdAt: '2024-01-16',
        metaTitle: 'Nguồn Máy Tính PSU Chuẩn 80 Plus | PCStore',
        metaDescription: 'Bộ nguồn máy tính an toàn, bảo vệ quá dòng, quá áp từ Corsair, Cooler Master.',
        metaKeywords: 'nguon may tinh, psu pc, nguon 80 plus',
    },
    {
        id: 'cat-13',
        name: 'Vỏ Case Máy Tính',
        slug: 'case-vo-may-tinh',
        description: 'Vỏ case bể cá, case lưới thoáng khí Airflow, hỗ trợ tản nhiệt nước Custom.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
        order: 13,
        productsCount: 48,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: false,
        createdAt: '2024-01-20',
        metaTitle: 'Vỏ Case Máy Tính Đẹp - Bể Cá, Airflow Đỉnh Cao | PCStore',
        metaDescription: 'Case máy tính đa dạng kích thước ATX, M-ATX, ITX kính cường lực cao cấp.',
        metaKeywords: 'case may tinh, vo case, case be ca',
    },
    {
        id: 'cat-14',
        name: 'Tản Nhiệt CPU',
        slug: 'tan-nhiet-cpu',
        description: 'Tản nhiệt nước AIO 240/360 màn hình LCD và tản nhiệt tháp khí hiệu năng cao.',
        parentId: 'cat-6',
        parentName: 'Linh Kiện Máy Tính',
        image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=400&q=80',
        order: 14,
        productsCount: 32,
        status: 'HIDDEN',
        isFeatured: false,
        showOnMenu: false,
        createdAt: '2024-01-22',
        metaTitle: 'Tản Nhiệt Khí & Tản Nước AIO Làm Mát CPU | PCStore',
        metaDescription: 'Hệ thống làm mát CPU giảm nhiệt độ tối đa, vận hành êm ái, bảo hành chính hãng.',
        metaKeywords: 'tan nhiet cpu, tan nuoc aio, tan nhiet khi',
    },
    {
        id: 'cat-15',
        name: 'Thiết Bị Ngoại Vi',
        slug: 'thiet-bi-ngoai-vi',
        description: 'Các phụ kiện màn hình, bàn phím cơ, chuột gaming, tai nghe và bàn ghế gaming.',
        parentId: null,
        parentName: 'Danh mục gốc',
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80',
        order: 15,
        productsCount: 165,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-05',
        metaTitle: 'Thiết Bị Ngoại Vi & Gaming Gear Đỉnh Cao | PCStore',
        metaDescription: 'Phụ kiện máy tính, bàn phím cơ, chuột không dây, màn hình chất lượng cao.',
        metaKeywords: 'thiet bi ngoai vi, gaming gear, ban phim chuot',
    },
    {
        id: 'cat-16',
        name: 'Màn Hình Máy Tính',
        slug: 'man-hinh-may-tinh',
        description: 'Màn hình Gaming 144Hz - 240Hz, màn hình đồ họa chuẩn màu 4K IPS, OLED.',
        parentId: 'cat-15',
        parentName: 'Thiết Bị Ngoại Vi',
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80',
        order: 16,
        productsCount: 65,
        status: 'ACTIVE',
        isFeatured: true,
        showOnMenu: true,
        createdAt: '2024-01-12',
        metaTitle: 'Màn Hình Máy Tính 2K 4K Gaming & Đồ Họa | PCStore',
        metaDescription: 'Màn hình LG, Dell UltraSharp, ASUS ROG tần số quét cao, màu sắc trung thực.',
        metaKeywords: 'man hinh may tinh, man hinh 2k, man hinh 4k',
    },
    {
        id: 'cat-17',
        name: 'Bàn Phím Cơ & Chuột',
        slug: 'ban-phim-chuot',
        description: 'Bàn phím cơ Custom Hotswap và chuột gaming cảm biến quang học chuẩn thi đấu.',
        parentId: 'cat-15',
        parentName: 'Thiết Bị Ngoại Vi',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80',
        order: 17,
        productsCount: 78,
        status: 'ACTIVE',
        isFeatured: false,
        showOnMenu: true,
        createdAt: '2024-01-15',
        metaTitle: 'Bàn Phím Cơ & Chuột Gaming Cao Cấp | PCStore',
        metaDescription: 'Bàn phím cơ không dây, chuột công thái học từ Razer, Logitech, Akko.',
        metaKeywords: 'ban phim co, chuot gaming, ban phim hotswap',
    },
    {
        id: 'cat-18',
        name: 'Tai Nghe & Âm Thanh',
        slug: 'tai-nghe-loa',
        description: 'Tai nghe gaming vòm 7.1, mic lọc ồn và loa máy tính chất âm sống động.',
        parentId: 'cat-15',
        parentName: 'Thiết Bị Ngoại Vi',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80',
        order: 18,
        productsCount: 22,
        status: 'HIDDEN',
        isFeatured: false,
        showOnMenu: false,
        createdAt: '2024-01-25',
        metaTitle: 'Tai Nghe Gaming & Loa Máy Tính Âm Thanh Vòm | PCStore',
        metaDescription: 'Tai nghe chụp tai có dây và bluetooth chất lượng cao cho game thủ.',
        metaKeywords: 'tai nghe gaming, loa may tinh, tai nghe 7.1',
    },
];

export const CategoryList: React.FC = () => {
    const { toast } = useToast();
    const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailCategory, setDetailCategory] = useState<CategoryItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Form state for Add
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '' as string | null,
        image: '',
        order: 1,
        status: 'ACTIVE' as CategoryItem['status'],
        isFeatured: false,
        showOnMenu: true,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
    });

    // Form state for Edit
    const [editFormData, setEditFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '' as string | null,
        image: '',
        order: 1,
        status: 'ACTIVE' as CategoryItem['status'],
        isFeatured: false,
        showOnMenu: true,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
    });

    // Avatar / Image upload states & refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const editImageInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [isDraggingEditImage, setIsDraggingEditImage] = useState(false);

    // Copy to clipboard helper with toast
    const handleCopyText = (text: string, fieldKey: string, label: string = 'thông tin') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        toast.info(`Đã sao chép ${label}: "${text}" vào bộ nhớ tạm!`, 'Sao chép thành công');
        setTimeout(() => {
            setCopiedField(null);
        }, 2000);
    };

    // Open detail modal
    const handleOpenDetailModal = (category: CategoryItem) => {
        setDetailCategory(category);
        setIsDetailModalOpen(true);
    };

    // Open edit modal
    const handleOpenEditModal = (category: CategoryItem) => {
        setEditingCategory(category);
        setEditFormData({
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parentId || '',
            image: category.image,
            order: category.order,
            status: category.status,
            isFeatured: category.isFeatured,
            showOnMenu: category.showOnMenu,
            metaTitle: category.metaTitle || '',
            metaDescription: category.metaDescription || '',
            metaKeywords: category.metaKeywords || '',
        });
        if (editImageInputRef.current) {
            editImageInputRef.current.value = '';
        }
        setIsEditModalOpen(true);
    };

    // Toggle active status
    const handleToggleStatus = (id: string) => {
        const target = categories.find((c) => c.id === id);
        const willBeActive = target?.status !== 'ACTIVE';
        setCategories(
            categories.map((c) => {
                if (c.id === id) {
                    const updated: CategoryItem = {
                        ...c,
                        status: willBeActive ? 'ACTIVE' : 'HIDDEN',
                    };
                    if (detailCategory?.id === id) {
                        setDetailCategory(updated);
                    }
                    return updated;
                }
                return c;
            })
        );
        if (willBeActive) {
            toast.success(`Danh mục "${target?.name}" đã được hiển thị trên hệ thống.`, 'Hiển thị danh mục');
        } else {
            toast.warning(`Danh mục "${target?.name}" đã được tạm ẩn khỏi giao diện khách hàng.`, 'Tạm ẩn danh mục');
        }
    };

    // Delete category
    const handleDeleteCategory = (id: string) => {
        const target = categories.find((c) => c.id === id);
        if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${target?.name || ''}"?`)) {
            setCategories(categories.filter((c) => c.id !== id));
            if (detailCategory?.id === id) {
                setIsDetailModalOpen(false);
                setDetailCategory(null);
            }
            toast.error(`Đã xóa danh mục "${target?.name || ''}" thành công!`, 'Xóa danh mục');
        }
    };

    // Image Upload Handlers (Add Modal)
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã tải hình ảnh danh mục lên thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropImage = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingImage(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng kéo thả tệp hình ảnh hợp lệ', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã tải hình ảnh danh mục lên thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setFormData((prev) => ({ ...prev, image: '' }));
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        toast.info('Đã xóa hình ảnh danh mục.', 'Xóa ảnh');
    };

    // Image Upload Handlers (Edit Modal)
    const handleEditImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã cập nhật hình ảnh danh mục thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropEditImage = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingEditImage(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng kéo thả tệp hình ảnh hợp lệ', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã cập nhật hình ảnh danh mục thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveEditImage = () => {
        setEditFormData((prev) => ({ ...prev, image: '' }));
        if (editImageInputRef.current) {
            editImageInputRef.current.value = '';
        }
        toast.info('Đã xóa hình ảnh danh mục.', 'Xóa ảnh');
    };

    // Submit Add
    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const parent = categories.find((c) => c.id === formData.parentId);
        const newCat: CategoryItem = {
            id: `cat-${Date.now()}`,
            name: formData.name,
            slug: formData.slug || generateSlug(formData.name),
            description: formData.description || 'Chưa có mô tả chi tiết.',
            parentId: formData.parentId || null,
            parentName: parent ? parent.name : 'Danh mục gốc',
            image: formData.image || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
            order: Number(formData.order) || categories.length + 1,
            productsCount: 0,
            status: formData.status,
            isFeatured: formData.isFeatured,
            showOnMenu: formData.showOnMenu,
            createdAt: new Date().toISOString().split('T')[0],
            metaTitle: formData.metaTitle || `${formData.name} Chính Hãng - Giá Rẻ | PCStore`,
            metaDescription: formData.metaDescription || formData.description,
            metaKeywords: formData.metaKeywords || formData.slug,
        };
        setCategories([newCat, ...categories]);
        setIsAddModalOpen(false);
        toast.success(`Đã thêm mới danh mục "${newCat.name}" thành công!`, 'Thêm danh mục');
    };

    // Submit Edit
    const handleUpdateCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        const parent = categories.find((c) => c.id === editFormData.parentId);
        const updatedCategory: CategoryItem = {
            ...editingCategory,
            name: editFormData.name,
            slug: editFormData.slug || generateSlug(editFormData.name),
            description: editFormData.description,
            parentId: editFormData.parentId || null,
            parentName: parent ? parent.name : 'Danh mục gốc',
            image: editFormData.image || editingCategory.image,
            order: Number(editFormData.order),
            status: editFormData.status,
            isFeatured: editFormData.isFeatured,
            showOnMenu: editFormData.showOnMenu,
            metaTitle: editFormData.metaTitle,
            metaDescription: editFormData.metaDescription,
            metaKeywords: editFormData.metaKeywords,
        };
        setCategories(
            categories.map((c) => (c.id === editingCategory.id ? updatedCategory : c))
        );
        if (detailCategory?.id === editingCategory.id) {
            setDetailCategory(updatedCategory);
        }
        setIsEditModalOpen(false);
        toast.success(`Đã cập nhật thông tin danh mục "${updatedCategory.name}" thành công!`, 'Cập nhật thành công');
    };

    // Modal Tabs Definition
    const categoryModalTabs: ModalTab[] = [
        {
            id: 'basic',
            label: 'Thông tin cơ bản',
            icon: FolderTree,
        },
        {
            id: 'seo',
            label: 'Mô tả & Tối ưu SEO',
            icon: Globe,
        },
        {
            id: 'display',
            label: 'Hiển thị & Trạng thái',
            icon: Sparkles,
        },
    ];

    // Detail Modal Tabs
    const detailModalTabs: ModalTab[] = [
        {
            id: 'info',
            label: 'Thông tin chung',
            icon: FolderTree,
        },
        {
            id: 'products',
            label: 'Sản phẩm thuộc nhóm',
            icon: Package,
            badge: detailCategory?.productsCount || 0,
        },
        {
            id: 'seo',
            label: 'Nội dung & SEO',
            icon: Globe,
        },
        {
            id: 'status',
            label: 'Trạng thái & Vị trí',
            icon: Sparkles,
        },
    ];

    // Filter Fields Definition
    const rootCategories = categories.filter((c) => c.parentId === null);

    const filterFields: FilterField[] = [
        {
            id: 'parent',
            label: 'Nhóm danh mục',
            placeholder: 'Tất cả nhóm',
            icon: Layers,
            options: [
                { label: 'Tất cả nhóm', value: '' },
                { label: '⭐ Danh mục gốc (Cấp 1)', value: 'ROOT' },
                ...rootCategories.map((rc) => ({
                    label: `📂 ${rc.name}`,
                    value: rc.id,
                })),
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái',
            placeholder: 'Tất cả trạng thái',
            icon: Eye,
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang hiển thị (ACTIVE)', value: 'ACTIVE' },
                { label: 'Tạm ẩn (HIDDEN)', value: 'HIDDEN' },
            ],
        },
        {
            id: 'featured',
            label: 'Nổi bật trang chủ',
            placeholder: 'Tất cả',
            icon: Sparkles,
            options: [
                { label: 'Tất cả danh mục', value: '' },
                { label: '⭐ Danh mục nổi bật', value: 'FEATURED' },
                { label: 'Tiêu chuẩn', value: 'NORMAL' },
            ],
        },
        {
            id: 'createdDate',
            label: 'Ngày tạo',
            type: 'date',
            icon: Calendar,
        },
    ];

    // Filter Logic
    const filteredCategories = categories.filter((c) => {
        // Search
        const matchesSearch =
            !searchQuery ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.parentName.toLowerCase().includes(searchQuery.toLowerCase());

        // Parent filter
        let matchesParent = true;
        if (filterValues.parent === 'ROOT') {
            matchesParent = c.parentId === null;
        } else if (filterValues.parent) {
            matchesParent = c.parentId === filterValues.parent;
        }

        // Status filter
        const matchesStatus = !filterValues.status || c.status === filterValues.status;

        // Featured filter
        let matchesFeatured = true;
        if (filterValues.featured === 'FEATURED') {
            matchesFeatured = c.isFeatured;
        } else if (filterValues.featured === 'NORMAL') {
            matchesFeatured = !c.isFeatured;
        }

        // Date filter
        const matchesDate = !filterValues.createdDate || c.createdAt === filterValues.createdDate;

        return matchesSearch && matchesParent && matchesStatus && matchesFeatured && matchesDate;
    });

    const totalPages = Math.ceil(filteredCategories.length / pageSize) || 1;
    const paginatedCategories = filteredCategories.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Table Columns
    const categoryTableColumns: Column<CategoryItem>[] = [
        {
            key: 'category',
            header: 'Danh mục',
            render: (cat) => (
                <div className="flex items-center gap-3">
                    <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0"
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 text-xs truncate max-w-[200px]">
                                {cat.name}
                            </span>
                            {cat.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Nổi bật
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate max-w-[220px]">
                            /{cat.slug}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'parent',
            header: 'Nhóm danh mục',
            render: (cat) =>
                cat.parentId ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Layers className="w-3 h-3 text-indigo-500" /> {cat.parentName}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <FolderTree className="w-3 h-3 text-purple-600" /> Danh mục gốc (Cấp 1)
                    </span>
                ),
        },
        {
            key: 'productsCount',
            header: 'Số lượng sản phẩm',
            render: (cat) => (
                <div>
                    <span className="font-bold text-gray-900 text-xs flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-blue-600" />
                        <span>{cat.productsCount} sản phẩm</span>
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                        {cat.showOnMenu ? 'Hiển thị trên menu' : 'Không ghim menu'}
                    </span>
                </div>
            ),
        },
        {
            key: 'order',
            header: 'Thứ tự',
            align: 'center',
            render: (cat) => (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    {cat.order}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (cat) =>
                cat.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đang hiển thị
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <EyeOff className="w-3 h-3 text-rose-600" /> Tạm ẩn
                    </span>
                ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            accessorKey: 'createdAt',
            className: 'font-medium text-gray-600',
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (cat) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleOpenDetailModal(cat)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        title="Xem chi tiết danh mục"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenEditModal(cat)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                        title="Chỉnh sửa danh mục"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleToggleStatus(cat.id)}
                        className={`p-1.5 rounded-lg transition-colors border ${cat.status === 'ACTIVE'
                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                        title={cat.status === 'ACTIVE' ? 'Tạm ẩn danh mục' : 'Hiển thị danh mục'}
                    >
                        {cat.status === 'ACTIVE' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-600 transition-colors"
                        title="Xóa danh mục"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="w-full space-y-6 min-w-0 font-sans">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <FolderTree className="w-7 h-7 text-blue-600" />
                        <span>Quản lý danh mục</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Tổ chức hệ thống phân cấp danh mục sản phẩm, tối ưu đường dẫn tĩnh và hiển thị trang chủ.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => toast.success('Danh sách danh mục sản phẩm đã được xuất ra file Excel thành công!', 'Xuất file thành công')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors"
                    >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        <span className="hidden sm:inline">Xuất file</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData({
                                name: '',
                                slug: '',
                                description: '',
                                parentId: '',
                                image: '',
                                order: categories.length + 1,
                                status: 'ACTIVE',
                                isFeatured: false,
                                showOnMenu: true,
                                metaTitle: '',
                                metaDescription: '',
                                metaKeywords: '',
                            });
                            if (imageInputRef.current) {
                                imageInputRef.current.value = '';
                            }
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Thêm danh mục</span>
                    </button>
                </div>
            </div>

            {/* Reusable Admin Filter Toolbar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(query) => {
                    setSearchQuery(query);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm kiếm tên danh mục, slug, mô tả..."
                fields={filterFields}
                values={filterValues}
                onChange={(vals) => {
                    setFilterValues(vals);
                    setCurrentPage(1);
                }}
            />

            {/* Category Data Table */}
            <AdminTable
                columns={categoryTableColumns}
                data={paginatedCategories}
                rowKey="id"
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCategories.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20]}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                onRowClick={(cat) => handleOpenDetailModal(cat)}
                itemUnitName="danh mục"
                emptyText="Không tìm thấy danh mục sản phẩm nào thỏa mãn điều kiện."
            />

            {/* MODAL 1: THÊM DANH MỤC MỚI (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm danh mục sản phẩm mới"
                subtitle="Phân loại hàng hóa theo các thẻ tab trực quan để tránh biểu mẫu quá dài"
                icon={Plus}
                size="lg"
                tabs={categoryModalTabs}
                onSubmit={handleAddCategory}
                submitText="Tạo danh mục"
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Tên danh mục sản phẩm <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData({
                                                ...formData,
                                                name: val,
                                                slug: generateSlug(val),
                                                metaTitle: `${val} Chính Hãng - Giá Rẻ | PCStore`,
                                            });
                                        }}
                                        placeholder="vd: PC Gaming Khủng"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Đường dẫn tĩnh (Slug) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                value={formData.slug}
                                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                                placeholder="vd: pc-gaming-khung"
                                                className="w-full text-xs px-3.5 py-2.5 font-mono bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, slug: generateSlug(formData.name) })}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                title="Tạo lại từ tên danh mục"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">Đường dẫn thân thiện hiển thị trên thanh địa chỉ URL trình duyệt</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Nhóm danh mục cha
                                        </label>
                                        <select
                                            value={formData.parentId || ''}
                                            onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                                            className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        >
                                            <option value="">— Không có (Là danh mục gốc cấp 1) —</option>
                                            {rootCategories.map((rc) => (
                                                <option key={rc.id} value={rc.id}>
                                                    📂 {rc.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-gray-400 mt-1">Chọn danh mục cha để tạo cấu trúc phân cấp đa tầng</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Thứ tự ưu tiên hiển thị
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={formData.order}
                                            onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                                            className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">Số nhỏ hơn sẽ được ưu tiên xếp trước trên menu và bảng</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ảnh đại diện / Banner
                                        </label>
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageFileChange}
                                            className="hidden"
                                            id="category-image-input"
                                        />
                                        <div
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setIsDraggingImage(true);
                                            }}
                                            onDragLeave={() => setIsDraggingImage(false)}
                                            onDrop={handleDropImage}
                                            className={`flex items-center gap-3 p-2.5 rounded-2xl border border-dashed transition-all ${isDraggingImage
                                                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div
                                                onClick={() => imageInputRef.current?.click()}
                                                className="relative group w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center cursor-pointer shadow-sm"
                                                title="Bấm để tải ảnh"
                                            >
                                                {formData.image ? (
                                                    <img
                                                        src={formData.image}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <FolderTree className="w-5 h-5 text-gray-400" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Camera className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => imageInputRef.current?.click()}
                                                        className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[11px] rounded-lg border border-gray-200 shadow-sm"
                                                    >
                                                        Chọn ảnh
                                                    </button>
                                                    {formData.image && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveImage}
                                                            className="text-[11px] text-rose-600 hover:underline font-semibold"
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 truncate">Kéo thả ảnh hoặc bấm chọn (tối đa 5MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Mô tả & SEO */}
                        {activeTab === 'seo' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Mô tả chi tiết danh mục
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Mô tả công năng, đối tượng người dùng hoặc đặc tính nổi bật của nhóm sản phẩm..."
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        <span>Tối ưu hóa công cụ tìm kiếm (SEO)</span>
                                    </h4>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Tiêu đề SEO (Meta Title)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.metaTitle}
                                            onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                                            placeholder="vd: PC Gaming Chính Hãng - Giá Rẻ | PCStore"
                                            className="w-full text-xs px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Mô tả SEO (Meta Description)
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.metaDescription}
                                            onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                            placeholder="Đoạn văn ngắn 120-160 ký tự hiển thị trên kết quả tìm kiếm Google..."
                                            className="w-full text-xs px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Từ khóa SEO (Keywords)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.metaKeywords}
                                            onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                                            placeholder="vd: pc gaming, may tinh ban, pc gia re"
                                            className="w-full text-xs px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Hiển thị & Trạng thái */}
                        {activeTab === 'display' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Trạng thái hiển thị danh mục
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            className={`flex items-center gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.status === 'ACTIVE'
                                                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={formData.status === 'ACTIVE'}
                                                onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <div>
                                                <div className="text-xs font-bold">Đang hiển thị (ACTIVE)</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">Khách hàng có thể xem và lọc sản phẩm</div>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.status === 'HIDDEN'
                                                ? 'border-rose-300 bg-rose-50/60 text-rose-800 ring-2 ring-rose-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={formData.status === 'HIDDEN'}
                                                onChange={() => setFormData({ ...formData, status: 'HIDDEN' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                            <div>
                                                <div className="text-xs font-bold">Tạm ẩn (HIDDEN)</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">Ẩn khỏi menu và bộ lọc tìm kiếm</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <label className="flex items-start gap-3 p-3.5 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                <span>Đánh dấu là danh mục nổi bật</span>
                                            </span>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Danh mục sẽ được hiển thị ưu tiên tại mục "Danh mục nổi bật" trên trang chủ Store.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3.5 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.showOnMenu}
                                            onChange={(e) => setFormData({ ...formData, showOnMenu: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Ghim danh mục lên thanh điều hướng chính</span>
                                            </span>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Hiển thị nút truy cập nhanh trên Mega Menu thanh Header của trang web.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 2: XEM CHI TIẾT DANH MỤC (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={detailCategory ? `Chi tiết: ${detailCategory.name}` : 'Chi tiết danh mục'}
                subtitle={detailCategory ? `/${detailCategory.slug} • Mã: ${detailCategory.id}` : undefined}
                icon={Eye}
                size="lg"
                tabs={detailModalTabs}
                footer={
                    detailCategory && (
                        <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-gray-500 hidden sm:block">
                                Khởi tạo ngày: <span className="font-semibold text-gray-700">{detailCategory.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEditModal(detailCategory);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Chỉnh sửa danh mục</span>
                                </button>
                            </div>
                        </div>
                    )
                }
            >
                {(activeTab) => {
                    if (!detailCategory) return null;

                    return (
                        <div>
                            {/* Tab 1: Thông tin chung */}
                            {activeTab === 'info' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* Category Banner Card */}
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-purple-50/50 border border-blue-100/80">
                                        <img
                                            src={detailCategory.image}
                                            alt={detailCategory.name}
                                            className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md flex-shrink-0"
                                        />
                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                                    {detailCategory.name}
                                                </h3>
                                                {detailCategory.isFeatured && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        <Sparkles className="w-3 h-3 text-amber-600" /> Nổi bật
                                                    </span>
                                                )}
                                                {detailCategory.status === 'ACTIVE' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đang hiển thị
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                                                        <EyeOff className="w-3 h-3 text-rose-600" /> Tạm ẩn
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5 font-mono">
                                                <span>/{detailCategory.slug}</span>
                                                <span>•</span>
                                                <span>ID: {detailCategory.id}</span>
                                            </p>
                                            <p className="text-xs text-gray-600 mt-2 font-normal line-clamp-2">
                                                {detailCategory.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Grid of properties */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Đường dẫn tĩnh (Slug)
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-blue-600 font-mono">
                                                    /{detailCategory.slug}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailCategory.slug, 'slug', 'Đường dẫn slug')}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Sao chép slug"
                                                >
                                                    {copiedField === 'slug' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Mã định danh (ID)
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 font-mono">
                                                    {detailCategory.id}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailCategory.id, 'id', 'Mã danh mục')}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Sao chép ID"
                                                >
                                                    {copiedField === 'id' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Nhóm danh mục cha
                                            </span>
                                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>{detailCategory.parentName}</span>
                                            </span>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Thứ tự hiển thị
                                            </span>
                                            <span className="text-xs font-bold text-gray-900">
                                                Vị trí số #{detailCategory.order}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Sản phẩm thuộc nhóm */}
                            {activeTab === 'products' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
                                            <span className="text-[11px] font-semibold text-blue-600">Tổng sản phẩm</span>
                                            <p className="text-lg font-bold text-gray-900 mt-1">{detailCategory.productsCount} mặt hàng</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Thuộc 8 thương hiệu</p>
                                        </div>

                                        <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                                            <span className="text-[11px] font-semibold text-emerald-600">Còn hàng</span>
                                            <p className="text-lg font-bold text-emerald-700 mt-1">{Math.floor(detailCategory.productsCount * 0.85)} mặt hàng</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Sẵn sàng giao ngay</p>
                                        </div>

                                        <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50">
                                            <span className="text-[11px] font-semibold text-purple-600">Doanh số trung bình</span>
                                            <p className="text-lg font-bold text-purple-700 mt-1">Cao</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Tăng trưởng 18% tháng này</p>
                                        </div>
                                    </div>

                                    {/* Mock Product Samples */}
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                                        <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-700">Sản phẩm tiêu biểu trong danh mục</span>
                                            <span className="text-[11px] text-gray-400">Hiển thị 3 sản phẩm hàng đầu</span>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {[
                                                {
                                                    id: 'P-101',
                                                    name: 'PC Gaming Titan Dragon RTX 4070 Ti Super 16GB',
                                                    price: '38,900,000 ₫',
                                                    stock: 14,
                                                    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=100&q=80',
                                                },
                                                {
                                                    id: 'P-102',
                                                    name: 'PC Đồ Họa Master Workstation i9 14900K 64GB',
                                                    price: '54,500,000 ₫',
                                                    stock: 8,
                                                    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=100&q=80',
                                                },
                                                {
                                                    id: 'P-103',
                                                    name: 'PC Văn Phòng Pro Business Core i5 12400',
                                                    price: '11,200,000 ₫',
                                                    stock: 25,
                                                    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=100&q=80',
                                                },
                                            ].map((prod) => (
                                                <div key={prod.id} className="p-3.5 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={prod.image}
                                                            alt={prod.name}
                                                            className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                                                        />
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900">{prod.name}</p>
                                                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">Mã: {prod.id} • Còn lại: {prod.stock} bộ</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-blue-600">{prod.price}</p>
                                                        <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">Sẵn hàng</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Nội dung & SEO */}
                            {activeTab === 'seo' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* Google SERP Simulator */}
                                    <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                            Xem trước kết quả tìm kiếm Google (SERP Preview)
                                        </span>
                                        <div className="text-xs text-emerald-800 font-mono">
                                            https://pcstore.vn/category/{detailCategory.slug}
                                        </div>
                                        <h4 className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
                                            {detailCategory.metaTitle || `${detailCategory.name} Chính Hãng - Giá Rẻ | PCStore`}
                                        </h4>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {detailCategory.metaDescription || detailCategory.description}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400">Meta Title</span>
                                            <p className="text-xs font-bold text-gray-900">{detailCategory.metaTitle || 'Chưa thiết lập'}</p>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400">Meta Description</span>
                                            <p className="text-xs text-gray-700">{detailCategory.metaDescription || detailCategory.description}</p>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400">Meta Keywords</span>
                                            <p className="text-xs font-mono text-gray-800">{detailCategory.metaKeywords || detailCategory.slug}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Trạng thái & Vị trí */}
                            {activeTab === 'status' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-900">Trạng thái công khai danh mục</h4>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Khi ẩn, khách hàng sẽ không thấy danh mục này trên thanh menu và bộ lọc
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(detailCategory.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                                    detailCategory.status === 'ACTIVE'
                                                        ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                                                        : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                                }`}
                                            >
                                                {detailCategory.status === 'ACTIVE' ? (
                                                    <>
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                        <span>Tạm ẩn danh mục</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>Hiện danh mục</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400">Ghim Menu chính</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${detailCategory.showOnMenu ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                <span className="text-xs font-bold text-gray-900">
                                                    {detailCategory.showOnMenu ? 'Đang hiển thị trên Menu' : 'Không ghim trên Menu'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400">Trang chủ Store</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${detailCategory.isFeatured ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                                <span className="text-xs font-bold text-gray-900">
                                                    {detailCategory.isFeatured ? 'Nổi bật tại trang chủ' : 'Hiển thị bình thường'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* MODAL 3: CHỈNH SỬA DANH MỤC (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={editingCategory ? `Chỉnh sửa: ${editingCategory.name}` : 'Chỉnh sửa danh mục'}
                subtitle="Cập nhật cấu trúc phân nhóm, thông tin SEO và cài đặt hiển thị"
                icon={Edit}
                size="lg"
                tabs={categoryModalTabs}
                onSubmit={handleUpdateCategory}
                submitText="Lưu thay đổi"
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Tên danh mục sản phẩm <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        placeholder="vd: PC Gaming Khủng"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Đường dẫn tĩnh (Slug) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                value={editFormData.slug}
                                                onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value })}
                                                placeholder="vd: pc-gaming-khung"
                                                className="w-full text-xs px-3.5 py-2.5 font-mono bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditFormData({ ...editFormData, slug: generateSlug(editFormData.name) })}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                title="Tạo lại từ tên danh mục"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Nhóm danh mục cha
                                        </label>
                                        <select
                                            value={editFormData.parentId || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, parentId: e.target.value || null })}
                                            className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        >
                                            <option value="">— Không có (Là danh mục gốc cấp 1) —</option>
                                            {rootCategories
                                                .filter((rc) => rc.id !== editingCategory?.id)
                                                .map((rc) => (
                                                    <option key={rc.id} value={rc.id}>
                                                        📂 {rc.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Thứ tự ưu tiên hiển thị
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={editFormData.order}
                                            onChange={(e) => setEditFormData({ ...editFormData, order: Number(e.target.value) })}
                                            className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ảnh đại diện / Banner
                                        </label>
                                        <input
                                            ref={editImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditImageFileChange}
                                            className="hidden"
                                            id="edit-category-image-input"
                                        />
                                        <div
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setIsDraggingEditImage(true);
                                            }}
                                            onDragLeave={() => setIsDraggingEditImage(false)}
                                            onDrop={handleDropEditImage}
                                            className={`flex items-center gap-3 p-2.5 rounded-2xl border border-dashed transition-all ${isDraggingEditImage
                                                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div
                                                onClick={() => editImageInputRef.current?.click()}
                                                className="relative group w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center cursor-pointer shadow-sm"
                                                title="Bấm để đổi ảnh"
                                            >
                                                {editFormData.image ? (
                                                    <img
                                                        src={editFormData.image}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <FolderTree className="w-5 h-5 text-gray-400" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Camera className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => editImageInputRef.current?.click()}
                                                        className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[11px] rounded-lg border border-gray-200 shadow-sm"
                                                    >
                                                        Đổi ảnh
                                                    </button>
                                                    {editFormData.image && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveEditImage}
                                                            className="text-[11px] text-rose-600 hover:underline font-semibold"
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 truncate">Kéo thả ảnh hoặc chọn từ máy</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Mô tả & SEO */}
                        {activeTab === 'seo' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Mô tả chi tiết danh mục
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editFormData.description}
                                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                        placeholder="Mô tả công năng hoặc đặc tính nổi bật của danh mục..."
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        <span>Tối ưu hóa công cụ tìm kiếm (SEO)</span>
                                    </h4>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Tiêu đề SEO (Meta Title)
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.metaTitle}
                                            onChange={(e) => setEditFormData({ ...editFormData, metaTitle: e.target.value })}
                                            placeholder="Tiêu đề hiển thị trên Google..."
                                            className="w-full text-xs px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Mô tả SEO (Meta Description)
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={editFormData.metaDescription}
                                            onChange={(e) => setEditFormData({ ...editFormData, metaDescription: e.target.value })}
                                            placeholder="Mô tả kết quả tìm kiếm..."
                                            className="w-full text-xs px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Từ khóa SEO (Keywords)
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.metaKeywords}
                                            onChange={(e) => setEditFormData({ ...editFormData, metaKeywords: e.target.value })}
                                            placeholder="vd: pc gaming, pc gia re"
                                            className="w-full text-xs px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Hiển thị & Trạng thái */}
                        {activeTab === 'display' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Trạng thái hiển thị danh mục
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            className={`flex items-center gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-all ${editFormData.status === 'ACTIVE'
                                                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="edit-status"
                                                checked={editFormData.status === 'ACTIVE'}
                                                onChange={() => setEditFormData({ ...editFormData, status: 'ACTIVE' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <div>
                                                <div className="text-xs font-bold">Đang hiển thị (ACTIVE)</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">Khách hàng có thể xem và lọc sản phẩm</div>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-all ${editFormData.status === 'HIDDEN'
                                                ? 'border-rose-300 bg-rose-50/60 text-rose-800 ring-2 ring-rose-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="edit-status"
                                                checked={editFormData.status === 'HIDDEN'}
                                                onChange={() => setEditFormData({ ...editFormData, status: 'HIDDEN' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                            <div>
                                                <div className="text-xs font-bold">Tạm ẩn (HIDDEN)</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">Ẩn khỏi menu và bộ lọc tìm kiếm</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <label className="flex items-start gap-3 p-3.5 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={editFormData.isFeatured}
                                            onChange={(e) => setEditFormData({ ...editFormData, isFeatured: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                <span>Đánh dấu là danh mục nổi bật</span>
                                            </span>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Hiển thị tại khu vực danh mục nổi bật trên trang chủ Store.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3.5 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={editFormData.showOnMenu}
                                            onChange={(e) => setEditFormData({ ...editFormData, showOnMenu: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Ghim danh mục lên thanh điều hướng chính</span>
                                            </span>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Hiển thị nút điều hướng trên Mega Menu Header.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>
        </div>
    );
};

export default CategoryList;
