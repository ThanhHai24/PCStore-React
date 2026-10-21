import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search,
    MapPin,
    Cpu,
    PhoneCall,
    Newspaper,
    ShoppingCart,
    User,
    Menu,
    ChevronDown,
    X,
    HardDrive,
    Flame,
    Sparkles,
    ChevronRight,
    ShieldCheck,
    Phone,
    PcCase,
    Truck
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
// import { getProducts } from '../../services/productService';
// import type { ApiProduct } from '../../types/apiProduct';

interface CategoryItem {
    id: string;
    name: string;
    icon: React.ReactNode;
    subcategories: {
        title: string;
        items: string[];
    }[];
}

const CATEGORIES: CategoryItem[] = [
    {
        id: 'pc',
        name: 'PC',
        icon: <PcCase className="w-4 h-4 text-blue-500" />,
        subcategories: [
            {
                title: 'PC Theo Nhu Cầu',
                items: ['PC Gaming', 'PC Đồ Họa - Render', 'PC Văn Phòng', 'PC Giả Lập - NOX', 'PC Server - Workstation'],
            },
            {
                title: 'PC Theo Giá',
                items: ['PC Dưới 10 Triệu', 'PC 10 - 20 Triệu', 'PC 20 - 40 Triệu', 'PC Cao Cấp > 50 Triệu'],
            },
        ],
    },
    {
        id: 'mini-pc',
        name: 'Mini PC',
        icon: <HardDrive className="w-4 h-4 text-blue-500" />,
        subcategories: [
            {
                title: 'Dòng Mini PC',
                items: ['Intel NUC Kit', 'ASUS NUC Series', 'Mac Mini M2/M3', 'Minisforum High Performance'],
            },
        ],
    },
    {
        id: 'pc-ai',
        name: 'PC AI',
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        subcategories: [
            {
                title: 'Trạm Xử Lý AI Workstation',
                items: ['PC AI Deep Learning Dual RTX 4090', 'PC AI Large Language Model (LLM)', 'Workstation NVIDIA RTX 6000 Ada'],
            },
        ],
    },
    {
        id: 'linh-kien-may-tinh',
        name: 'Linh kiện PC',
        icon: <Cpu className="w-4 h-4 text-blue-500" />,
        subcategories: [
            {
                title: 'CPU - Bộ Vi Xử Lý',
                items: ['CPU Intel', 'CPU AMD'],
            },
            {
                title: 'VGA - Card Màn Hình',
                items: ['VGA NVIDIA', 'VGA AMD', 'NVIDIA RTX 5000 Series', 'RTX 5090', 'RTX 5070', 'RTX 5060', 'RTX 3050', 'Hãng VGA', 'RTX PRO'],
            },
            {
                title: 'Mainboard - Bo Mạch Chủ',
                items: ['Mainboard Asus', 'Mainboard Gigabyte', 'Mainboard MSI', 'Mainboard ASRock', 'Mainboard Supermicro', 'Mainboard BIOSTAR'],
            },
            {
                title: 'RAM - Bộ Nhớ Trong',
                items: ['RAM DDR5', 'RAM DDR4', 'RAM 32GB', 'RAM 16GB', 'RAM theo hãng'],
            },
            {
                title: 'PSU - Nguồn Máy Tính',
                items: ['Nguồn ASUS', 'Nguồn NZXT', 'Nguồn XIGMATEK', 'Nguồn Thermaltake', 'Nguồn Super Flower', 'Nguồn Gigabyte', 'Nguồn Corsair', 'Nguồn Cooler Master', 'Nguồn Antec', 'Nguồn MSI', 'Nguồn Segotep', 'Nguồn Deepcool', 'Nguồn OCPC'],
            },
            {
                title: 'CASE - Vỏ Máy Tính',
                items: ['Case Asus', 'Case Montech', 'Case NZXT', 'Case Vitra', 'Case MSI', 'Case GIGABYTE', 'Case Jonsbo', 'Case Corsair', 'Case Cooler Master', 'Case Thermaltake', 'Case Xigmatek', 'Case Antec', 'Case MIK'],
            },
            {
                title: 'Tản Nhiệt PC - COOLING',
                items: ['Keo Tản nhiệt', 'Fan tản nhiệt', 'Tản Nhiệt nước AIO', 'Tản nhiệt khí', 'Tản nước CUSTOM'],
            },
        ],
    },
    {
        id: 'o-cung-hdd-ssd',
        name: 'Thiết bị lưu trữ',
        icon: <HardDrive className="w-4 h-4 text-blue-500" />,
        subcategories: [
            {
                title: 'Ổ cứng SSD',
                items: ['SSD M.2 PCIe NVMe', 'SSD Gen 5', 'SSD Gen 4', 'SSD 1TB', 'SSD 512GB', 'SSD SATA'],
            },
            {
                title: 'Ổ cứng HDD',
                items: ['HDD 1TB', 'HDD 2TB'],
            },
            {
                title: 'Chọn theo hãng',
                items: ['Western Digital', 'Seagate', 'Samsung', 'Kingston'],
            },
            {
                title: 'Chọn theo dung lượng',
                items: ['256GB', '512GB', '1TB', '2TB', '4TB'],
            },
        ],
    },
];

const HORIZONTAL_CATEGORIES = [
    {
        id: 'pc',
        name: 'PC',
        icon: <PcCase className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />,
        subcategories: [
            {
                title: 'PC Theo Nhu Cầu',
                items: ['PC Gaming', 'PC Đồ Họa - Render', 'PC Văn Phòng', 'PC Giả Lập - NOX', 'PC Server - Workstation'],
            },
            {
                title: 'PC Theo Giá',
                items: ['PC Dưới 10 Triệu', 'PC 10 - 20 Triệu', 'PC 20 - 40 Triệu', 'PC Cao Cấp > 50 Triệu'],
            },
        ],
    },
    {
        id: 'mini-pc',
        name: 'Mini PC',
        icon: <HardDrive className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />,
        subcategories: [
            {
                title: 'Dòng Mini PC',
                items: ['Intel NUC Kit', 'ASUS NUC Series', 'Mac Mini M2/M3', 'Minisforum High Performance'],
            },
        ],
    },
    {
        id: 'pc-ai',
        name: 'PC AI',
        icon: <Sparkles className="w-4 h-4 text-amber-300 group-hover:text-amber-200 transition-colors" />,
        subcategories: [
            {
                title: 'Trạm Xử Lý AI Workstation',
                items: ['PC AI Deep Learning Dual RTX 4090', 'PC AI Large Language Model (LLM)', 'Workstation NVIDIA RTX 6000 Ada'],
            },
        ],
    },
    {
        id: 'linh-kien-may-tinh',
        name: 'Linh Kiện PC',
        icon: <Cpu className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />,
        subcategories: [
            {
                title: 'CPU - Bộ Vi Xử Lý',
                items: ['CPU Intel', 'CPU AMD'],
            },
            {
                title: 'VGA - Card Màn Hình',
                items: ['VGA NVIDIA', 'VGA AMD', 'RTX 5090', 'RTX 5070', 'RTX 5060'],
            },
            {
                title: 'Mainboard - Bo Mạch Chủ',
                items: ['Mainboard Asus', 'Mainboard Gigabyte', 'Mainboard MSI', 'Mainboard ASRock'],
            },
            {
                title: 'RAM - Bộ Nhớ Trong',
                items: ['RAM DDR5', 'RAM DDR4', 'RAM 32GB', 'RAM 16GB'],
            },
            {
                title: 'PSU - Nguồn Máy Tính',
                items: ['Nguồn ASUS', 'Nguồn Corsair', 'Nguồn Cooler Master', 'Nguồn MSI'],
            },
            {
                title: 'CASE - Vỏ Máy Tính',
                items: ['Case Asus', 'Case NZXT', 'Case MSI', 'Case Corsair'],
            },
        ],
    },
    {
        id: 'o-cung-hdd-ssd',
        name: 'Thiết Bị Lưu Trữ',
        icon: <HardDrive className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />,
        subcategories: [
            {
                title: 'Ổ cứng SSD',
                items: ['SSD M.2 PCIe NVMe', 'SSD Gen 5', 'SSD Gen 4', 'SSD 1TB', 'SSD 512GB'],
            },
            {
                title: 'Ổ cứng HDD',
                items: ['HDD 1TB', 'HDD 2TB'],
            },
            {
                title: 'Chọn theo hãng',
                items: ['Western Digital', 'Seagate', 'Samsung', 'Kingston'],
            },
            {
                title: 'Chọn theo dung lượng',
                items: ['256GB', '512GB', '1TB', '2TB', '4TB'],
            },
        ],
    },
];

const POPULAR_SEARCHES = [
    'RTX 4070 Super',
    'PC Gaming 15 triệu',
    'Core i5 14600K',
    'Màn hình 27 inch 180Hz',
    'Bàn phím cơ không dây',
    'SSD 1TB NVMe',
];

const SHOWROOMS = [
    { city: 'Hà Nội', address: '17 Hà Kế Tấn, Phường Phương Liệt, Q. Thanh Xuân', phone: '098.741.4899' },
    { city: 'Hà Nội', address: '83b Nguyễn Văn Cừ, Q. Long Biên', phone: '098.122.6969' },
    { city: 'TP. Hồ Chí Minh', address: '249 Lý Thường Kiệt, Phường 15, Quận 11', phone: '0707.08.6666' },
];

const getSubcategoryTitleLink = (title: string, parentCatSlug?: string): string => {
    const t = title.toLowerCase();
    if (t.includes('cpu')) return '/category/cpu-bo-vi-xu-ly';
    if (t.includes('vga') || t.includes('card màn hình')) return '/category/vga-card-do-hoa';
    if (t.includes('mainboard') || t.includes('bo mạch chủ')) return '/category/mainboard-bo-mach-chu';
    if (t.includes('ram')) return '/category/ram-bo-nho-trong';
    if (t.includes('psu') || t.includes('nguồn')) return '/category/psu-nguon-may-tinh';
    if (t.includes('case') || t.includes('vỏ')) return '/category/case-vo-may-tinh';
    if (t.includes('tản nhiệt')) return '/category/tan-nhiet-cpu';
    if (t.includes('ssd') || t.includes('hdd') || t.includes('lưu trữ')) return '/category/o-cung-hdd-ssd';
    if (t.includes('pc theo nhu cầu')) return '/category/pc';
    if (t.includes('mini pc')) return '/category/mini-pc';
    if (t.includes('ai workstation') || t.includes('pc ai')) return '/category/pc-ai';

    if (parentCatSlug) return `/category/${parentCatSlug}`;
    return '/products';
};

const getItemLink = (item: string, parentCatSlug?: string, subTitle?: string): string => {
    const itemLower = item.toLowerCase();

    if (itemLower === 'pc gaming') return '/category/pc-gaming';
    if (itemLower === 'pc đồ họa - render' || itemLower === 'pc đồ họa') return '/category/pc-do-hoa';
    if (itemLower === 'pc văn phòng') return '/category/pc-van-phong';
    if (itemLower === 'pc ai' || itemLower.includes('pc ai')) return '/category/pc-ai';
    if (itemLower === 'mini pc' || itemLower.includes('mini pc')) return '/category/mini-pc';

    if (itemLower.includes('dưới 10 triệu')) return '/products?categoryId=pc&maxPrice=10000000';
    if (itemLower.includes('10 - 20 triệu')) return '/products?categoryId=pc&minPrice=10000000&maxPrice=20000000';
    if (itemLower.includes('20 - 40 triệu')) return '/products?categoryId=pc&minPrice=20000000&maxPrice=40000000';
    if (itemLower.includes('cao cấp > 50 triệu') || itemLower.includes('trên 50 triệu')) return '/products?categoryId=pc&minPrice=50000000';

    if (subTitle) {
        const sTitle = subTitle.toLowerCase();
        if (sTitle.includes('cpu')) return `/category/cpu-bo-vi-xu-ly?search=${encodeURIComponent(item.replace(/^cpu\s+/i, ''))}`;
        if (sTitle.includes('vga')) return `/category/vga-card-do-hoa?search=${encodeURIComponent(item.replace(/^vga\s+/i, ''))}`;
        if (sTitle.includes('mainboard')) return `/category/mainboard-bo-mach-chu?search=${encodeURIComponent(item.replace(/^mainboard\s+/i, ''))}`;
        if (sTitle.includes('ram')) return `/category/ram-bo-nho-trong?search=${encodeURIComponent(item.replace(/^ram\s+/i, ''))}`;
        if (sTitle.includes('psu') || sTitle.includes('nguồn')) return `/category/psu-nguon-may-tinh?search=${encodeURIComponent(item.replace(/^nguồn\s+/i, ''))}`;
        if (sTitle.includes('case') || sTitle.includes('vỏ')) return `/category/case-vo-may-tinh?search=${encodeURIComponent(item.replace(/^case\s+/i, ''))}`;
        if (sTitle.includes('tản nhiệt')) return `/category/tan-nhiet-cpu?search=${encodeURIComponent(item)}`;
        if (sTitle.includes('ssd') || sTitle.includes('hdd')) return `/category/o-cung-hdd-ssd?search=${encodeURIComponent(item)}`;
    }

    if (parentCatSlug) {
        return `/category/${parentCatSlug}?search=${encodeURIComponent(item)}`;
    }
    return `/products?search=${encodeURIComponent(item)}`;
};

export const Header: React.FC = () => {
    const navigate = useNavigate();
    // const { totalItems: cartCount } = useCart();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<CategoryItem | null>(null);
    const [activeHorizontalCategory, setActiveHorizontalCategory] = useState<typeof HORIZONTAL_CATEGORIES[0] | null>(null);
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    // const [searchResults, setSearchResults] = useState<ApiProduct[]>([]);
    // const [isSearchLoading, setIsSearchLoading] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    // const userDropdownRef = useRef<HTMLDivElement>(null);

    // useEffect(() => {
    //     const query = searchQuery.trim();
    //     if (!query) {
    //         setSearchResults([]);
    //         setIsSearchLoading(false);
    //         return;
    //     }

    //     setIsSearchLoading(true);
    //     const timer = setTimeout(() => {
    //         getProducts({ search: query, limit: 6, status: 'ACTIVE' })
    //             .then((res) => {
    //                 setSearchResults(res.products || []);
    //             })
    //             .catch((err) => {
    //                 console.error('Live search error:', err);
    //                 setSearchResults([]);
    //             })
    //             .finally(() => {
    //                 setIsSearchLoading(false);
    //             });
    //     }, 300);

    //     return () => clearTimeout(timer);
    // }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
                setIsMegaMenuOpen(false);
                setActiveCategory(null);
            }
            // if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
            //     setIsUserDropdownOpen(false);
            // }
        };

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setIsScrolled((prev) => {
                let nextScrolled = prev;
                // Use Hysteresis to prevent continuous toggling jitter at scroll boundaries
                if (currentScrollY > 450) {
                    nextScrolled = true;
                } else if (currentScrollY < 300) {
                    nextScrolled = false;
                }

                if (prev !== nextScrolled) {
                    setIsMegaMenuOpen(false);
                    setActiveHorizontalCategory(null);
                    setIsLocationOpen(false);
                    setIsSearchOpen(false);
                }
                return nextScrolled;
            });
        };

        handleScroll();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Reusable Mega Menu Panel Renderer
    const renderMegaMenuDropdown = () => (
        <div
            onMouseLeave={() => {
                setIsMegaMenuOpen(false);
                setActiveCategory(null);
            }}
            className="absolute left-0 top-full mt-1.5 w-[1100px] xl:w-[1250px] bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 flex z-50 overflow-hidden animate-in fade-in duration-150"
        >
            {/* Left side: Category List */}
            <div className="w-1/5 bg-gray-50 border-r border-gray-200 py-2 shrink-0">
                {CATEGORIES.map((cat) => (
                    <Link
                        key={cat.id}
                        to={`/category/${cat.id}`}
                        onClick={() => {
                            setIsMegaMenuOpen(false);
                            setActiveCategory(null);
                        }}
                        onMouseEnter={() => setActiveCategory(cat)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors text-left ${activeCategory?.id === cat.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                    >
                        <div className="flex items-center space-x-2.5">
                            <span className={activeCategory?.id === cat.id ? 'text-white' : ''}>{cat.icon}</span>
                            <span>{cat.name}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${activeCategory?.id === cat.id ? 'text-white' : 'text-gray-400'}`} />
                    </Link>
                ))}
            </div>

            {/* Right side: Subcategories Content */}
            <div className="w-4/5 p-5 bg-white overflow-y-auto max-h-[420px] w-full">
                {activeCategory ? (
                    <div>
                        <Link
                            to={`/category/${activeCategory.id}`}
                            onClick={() => {
                                setIsMegaMenuOpen(false);
                                setActiveCategory(null);
                            }}
                            className="flex items-center space-x-2 pb-3 mb-4 border-b border-gray-100 font-bold text-sm text-blue-700 hover:underline"
                        >
                            <span className="text-blue-600">{activeCategory.icon}</span>
                            <span>{activeCategory.name}</span>
                        </Link>
                        <div className="grid grid-cols-4 gap-6">
                            {activeCategory.subcategories.map((sub, idx) => (
                                <div key={idx} className="space-y-2">
                                    <Link
                                        to={getSubcategoryTitleLink(sub.title, activeCategory.id)}
                                        onClick={() => {
                                            setIsMegaMenuOpen(false);
                                            setActiveCategory(null);
                                        }}
                                        className="font-bold text-xs text-gray-900 uppercase tracking-wide border-l-2 border-blue-600 pl-2 block hover:text-blue-600 transition-colors"
                                    >
                                        {sub.title}
                                    </Link>
                                    <ul className="space-y-1.5 text-xs text-gray-600 pl-2">
                                        {sub.items.map((item, itemIdx) => (
                                            <li key={itemIdx}>
                                                <Link
                                                    to={getItemLink(item, activeCategory.id, sub.title)}
                                                    onClick={() => {
                                                        setIsMegaMenuOpen(false);
                                                        setActiveCategory(null);
                                                    }}
                                                    className="hover:text-blue-600 hover:underline transition-colors block py-0.5"
                                                >
                                                    {item}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-12">
                        <Menu className="w-8 h-8 stroke-1 text-gray-300" />
                        <span className="text-xs">Rê chuột vào danh mục bên trái để xem chi tiết</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <header
                className={`w-full font-sans select-none sticky top-0 z-50 shadow-md bg-[linear-gradient(180deg,#2E9BFB_0%,#1D52E7_100%)] text-white transition-all duration-300 ${isScrolled ? 'py-0.5 shadow-xl border-b border-blue-400/30' : ''
                    }`}
            >
                <div className={`max-w-[1250px] mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 md:gap-4 relative transition-all duration-300 ${isScrolled ? 'py-1.5' : 'py-2.5'
                    }`}>
                    <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors focus:outline-none"
                            aria-label="Toggle Navigation"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>

                        {/* DESKTOP LEFT AREA: SCROLLED vs NORMAL */}
                        {isScrolled ? (
                            /* SCROLLED STATE: "DANH MỤC SẢN PHẨM" button replaces Logo & Location */
                            <div className="flex items-center space-x-2 hidden lg:flex">
                                <Link
                                    to="/"
                                    className="w-8 h-8 rounded-full border border-white/50 bg-white/15 hover:bg-white/25 flex items-center justify-center font-black text-xs text-white shrink-0 transition-colors"
                                    title="Trang chủ"
                                >
                                    PC
                                </Link>

                                <div ref={categoryRef} className="relative">
                                    <button
                                        onClick={() => {
                                            setIsMegaMenuOpen(!isMegaMenuOpen);
                                            if (!activeCategory) setActiveCategory(CATEGORIES[0]);
                                            setActiveHorizontalCategory(null);
                                        }}
                                        onMouseEnter={() => {
                                            setIsMegaMenuOpen(true);
                                            if (!activeCategory) setActiveCategory(CATEGORIES[0]);
                                            setActiveHorizontalCategory(null);
                                        }}
                                        className="bg-white text-[#1752e5] hover:bg-gray-100 font-bold text-xs px-3.5 py-2 rounded-md shadow flex items-center space-x-2 transition-all cursor-pointer uppercase tracking-wider border border-white/40"
                                    >
                                        <Menu className="w-4 h-4 text-[#1752e5]" />
                                        <span>DANH MỤC SẢN PHẨM</span>
                                    </button>

                                    {isMegaMenuOpen && renderMegaMenuDropdown()}
                                </div>
                            </div>
                        ) : (
                            /* NORMAL STATE: Logo + Location */
                            <>
                                <Link to="/" className="flex items-center space-x-2 group">
                                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition-all duration-300 shadow-inner">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/80 flex items-center justify-center font-extrabold text-xs sm:text-sm tracking-tighter">
                                            PC
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center leading-none">
                                        <span className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white drop-shadow-sm font-sans">
                                            PC<span className="text-amber-300 font-extrabold">STORE</span>
                                        </span>
                                    </div>
                                </Link>
                                <div className="relative hidden md:block">
                                    <button
                                        onClick={() => setIsLocationOpen(!isLocationOpen)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all duration-200"
                                        title="Hệ thống showroom Nguyễn Công PC"
                                    >
                                        <MapPin className="w-4 h-4" />
                                    </button>
                                    {isLocationOpen && (
                                        <div className="absolute left-0 mt-2 w-72 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 py-3 px-4 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 font-bold text-gray-900 text-sm">
                                                <div className="flex items-center space-x-1.5 text-blue-600">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>Hệ Thống Showroom</span>
                                                </div>
                                                <button onClick={() => setIsLocationOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                {SHOWROOMS.map((sr, idx) => (
                                                    <div key={idx} className="p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-blue-300 transition-colors">
                                                        <div className="font-bold text-blue-700 text-xs">{sr.city}</div>
                                                        <div className="text-gray-600 mt-0.5 text-[11px] leading-snug">{sr.address}</div>
                                                        <div className="text-blue-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            <a href={`tel:${sr.phone.replace(/\./g, '')}`} className="hover:underline">
                                                                {sr.phone}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Mobile logo on scroll */}
                        {isScrolled && (
                            <Link to="/" className="lg:hidden flex items-center space-x-1 font-black text-sm text-white">
                                <span>PC<span className="text-amber-300">STORE</span></span>
                            </Link>
                        )}
                    </div>
                    <div ref={searchRef} className="relative flex-1 max-w-xl mx-1 sm:mx-2">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (searchQuery.trim()) {
                                    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                                    setIsSearchOpen(false);
                                }
                            }}
                            className="relative flex items-center"
                        >
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchOpen(true)}
                                placeholder="Bạn cần tìm gì?"
                                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs sm:text-sm pl-4 pr-10 py-2 sm:py-2 rounded-2xl shadow-inner border border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-9 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : null}
                            <button
                                type="submit"
                                aria-label="Tìm kiếm"
                                className="absolute right-2 text-gray-500 hover:text-blue-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </form>
                        {isSearchOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150 max-h-[480px] overflow-y-auto">

                                <div>
                                    <div className="flex items-center space-x-1.5 font-bold text-gray-900 mb-2">
                                        <Flame className="w-4 h-4 text-red-500" />
                                        <span>Tìm kiếm phổ biến</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {POPULAR_SEARCHES.map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery(item);
                                                    setIsSearchOpen(false);
                                                    navigate(`/products?search=${encodeURIComponent(item)}`);
                                                }}
                                                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-xs font-medium transition-colors border border-gray-200/60"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-[11px] text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                            Cam kết chính hãng 100%
                                        </span>
                                        <Link
                                            to="/products"
                                            onClick={() => setIsSearchOpen(false)}
                                            className="text-blue-600 font-semibold cursor-pointer hover:underline"
                                        >
                                            Xem tất cả sản phẩm →
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center space-x-1 xl:space-x-3 text-xs font-medium">
                        {/* 1. XÂY DỰNG CẤU HÌNH */}
                        <Link
                            to="/build-pc"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-white/10 transition-all text-center group"
                        >
                            <PcCase className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                Xây Dựng Cấu Hình
                            </span>
                        </Link>

                        {/* 2. KHÁCH HÀNG LIÊN HỆ */}
                        <Link
                            to="/contact"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-white/10 transition-all text-center group"
                        >
                            <PhoneCall className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                Khách Hàng Liên Hệ
                            </span>
                        </Link>

                        {/* 3. TIN TỨC CÔNG NGHỆ */}
                        <Link
                            to="/news"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-white/10 transition-all text-center group"
                        >
                            <Newspaper className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                Tin Tức Công Nghệ
                            </span>
                        </Link>

                        {/* 4. GIỎ HÀNG */}
                        <Link
                            to="/cart"
                            className="relative flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-white/10 transition-all text-center group"
                        >
                            <div className="relative">
                                <ShoppingCart className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-blue-600 shadow">
                                    2
                                </span>
                            </div>
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                Giỏ Hàng
                            </span>
                        </Link>

                        {/* 5. TÀI KHOẢN / USER */}
                        <Link
                            to="/account"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-blue-700/50 transition-all text-center group max-w-[110px]"
                            title={user ? `Xin chào, ${user.fullName || user.username}` : 'Đăng nhập / Đăng ký'}
                        >
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.fullName || user.username}
                                    className="w-6 h-6 rounded-full object-cover mb-0.5 ring-1 ring-white/60"
                                />
                            ) : (
                                <User className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform shrink-0" />
                            )}
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white truncate w-full text-center">
                                {user ? (user.fullName || user.username) : 'Tài Khoản'}
                            </span>
                        </Link>
                    </div>

                    {/* MOBILE QUICK CARTS & USER */}
                    <div className="flex lg:hidden items-center space-x-2 shrink-0">
                        <Link to="/cart" className="relative p-2 text-white hover:bg-white/10 rounded-lg">
                            <ShoppingCart className="w-6 h-6" />
                            <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-blue-600">
                                2
                            </span>
                        </Link>
                        <Link
                            to="/account"
                            className="p-1.5 text-white hover:bg-white/10 rounded-lg flex items-center space-x-1"
                            title={user ? (user.fullName || user.username) : 'Tài Khoản'}
                        >
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.fullName || user.username}
                                    className="w-6 h-6 rounded-full object-cover ring-1 ring-white/60"
                                />
                            ) : (
                                <User className="w-6 h-6" />
                            )}
                            {user && (
                                <span className="text-[11px] font-bold text-white max-w-[70px] truncate hidden sm:inline-block">
                                    {user.fullName || user.username}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* MOBILE DRAWER NAVIGATION MENU */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden bg-white text-gray-900 border-t border-gray-200 shadow-xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-top duration-200">
                        {/* Quick Actions in Mobile Drawer */}
                        <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 border-b border-blue-100">
                            <Link
                                to="/build-pc"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <Cpu className="w-4 h-4 text-blue-600" />
                                <span>Xây Dựng Cấu Hình</span>
                            </Link>
                            <Link
                                to="/contact"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <PhoneCall className="w-4 h-4 text-blue-600" />
                                <span>Khách Hàng Liên Hệ</span>
                            </Link>
                            <Link
                                to="/news"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <Newspaper className="w-4 h-4 text-blue-600" />
                                <span>Tin Tức Công Nghệ</span>
                            </Link>
                            <Link
                                to="/account"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <User className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="truncate">{user ? (user.fullName || user.username) : 'Tài Khoản'}</span>
                            </Link>
                            <Link
                                to="/track-order"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <Truck className="w-4 h-4 text-blue-600" />
                                <span>Tra Cứu Đơn Hàng</span>
                            </Link>
                        </div>

                        {/* Categories List in Mobile Drawer */}
                        <div className="p-3">
                            <div className="font-extrabold text-xs text-gray-500 uppercase tracking-wider mb-2">
                                Danh Mục Sản Phẩm
                            </div>
                            <div className="space-y-1">
                                {CATEGORIES.map((cat) => (
                                    <div key={cat.id} className="border-b border-gray-100 pb-1">
                                        <Link
                                            to={`/category/${cat.id}`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center justify-between p-2 rounded-md font-bold text-xs text-gray-800 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center space-x-2">
                                                {cat.icon}
                                                <span>{cat.name}</span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        </Link>
                                        <div className="pl-6 space-y-1 pb-1">
                                            {cat.subcategories.flatMap(s => s.items.map(item => ({ item, subTitle: s.title }))).slice(0, 5).map((entry, idx) => (
                                                <Link
                                                    key={idx}
                                                    to={getItemLink(entry.item, cat.id, entry.subTitle)}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="block text-[11px] text-gray-600 hover:text-blue-600 py-0.5 transition-colors"
                                                >
                                                    • {entry.item}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* ========================================================================= */}
            {/* BOTTOM NAV BAR: CATEGORY NAVIGATION ROW (Only shown when NOT scrolled) */}
            {/* ========================================================================= */}
            {!isScrolled && (
                <nav
                    className="bg-[#2366EF] text-white hidden lg:block border-t border-blue-400/30 relative z-40 shadow-sm"
                    onMouseLeave={() => setActiveHorizontalCategory(null)}
                >
                    <div className="max-w-[1250px] mx-auto px-4 lg:px-6 flex items-center relative">
                        {/* MEGA MENU CATEGORIES BUTTON */}
                        <div ref={categoryRef} className="relative py-1.5 pr-3">
                            <button
                                onClick={() => {
                                    setIsMegaMenuOpen(!isMegaMenuOpen);
                                    if (!activeCategory) setActiveCategory(CATEGORIES[0]);
                                    setActiveHorizontalCategory(null);
                                }}
                                onMouseEnter={() => {
                                    setIsMegaMenuOpen(true);
                                    if (!activeCategory) setActiveCategory(CATEGORIES[0]);
                                    setActiveHorizontalCategory(null);
                                }}
                                className="bg-white text-[#1752e5] hover:bg-gray-100 font-bold text-xs px-3.5 py-2 rounded-md shadow flex items-center space-x-2 transition-all cursor-pointer uppercase tracking-wider"
                            >
                                <Menu className="w-4 h-4 text-[#1752e5]" />
                                <span>DANH MỤC SẢN PHẨM</span>
                            </button>

                            {/* MEGA MENU DROPDOWN PANEL */}
                            {isMegaMenuOpen && renderMegaMenuDropdown()}
                        </div>

                        {/* HORIZONTAL CATEGORIES LINKS */}
                        <nav className="flex-1 w-full flex items-center justify-between py-2 text-xs font-semibold ml-4 overflow-x-auto no-scrollbar gap-1">
                            {HORIZONTAL_CATEGORIES.map((cat) => (
                                <div key={cat.id} className="relative">
                                    <Link
                                        to={`/category/${cat.id}`}
                                        onClick={() => setActiveHorizontalCategory(null)}
                                        onMouseEnter={() => {
                                            setIsMegaMenuOpen(false);
                                            setActiveHorizontalCategory(cat);
                                        }}
                                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-white whitespace-nowrap transition-colors ${activeHorizontalCategory?.id === cat.id ? 'bg-white/20' : 'hover:bg-white/15'
                                            }`}
                                    >
                                        {cat.icon}
                                        <span>{cat.name}</span>
                                        <ChevronDown className={`w-3 h-3 text-blue-200 transition-transform duration-200 ${activeHorizontalCategory?.id === cat.id ? 'rotate-180 text-white' : ''
                                            }`} />
                                    </Link>
                                </div>
                            ))}
                        </nav>

                        {/* SHARED DROPDOWN PANEL FOR HORIZONTAL CATEGORIES */}
                        {activeHorizontalCategory && !isMegaMenuOpen && (
                            <div className="absolute left-0 top-full pt-1.5 w-full z-50 animate-in fade-in duration-150">
                                <div className="bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 p-6">
                                    <Link
                                        to={`/category/${activeHorizontalCategory.id}`}
                                        onClick={() => setActiveHorizontalCategory(null)}
                                        className="flex items-center space-x-2.5 pb-3 mb-4 border-b border-gray-100 font-bold text-sm text-blue-700 hover:underline"
                                    >
                                        <span className="text-blue-600">{activeHorizontalCategory.icon}</span>
                                        <span className="text-base">{activeHorizontalCategory.name}</span>
                                    </Link>

                                    <div className="grid grid-cols-4 gap-6 max-h-[400px] overflow-y-auto pr-2">
                                        {activeHorizontalCategory.subcategories.map((sub, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <Link
                                                    to={getSubcategoryTitleLink(sub.title, activeHorizontalCategory.id)}
                                                    onClick={() => setActiveHorizontalCategory(null)}
                                                    className="font-bold text-xs text-gray-900 uppercase tracking-wide border-l-2 border-blue-600 pl-2 block hover:text-blue-600 transition-colors"
                                                >
                                                    {sub.title}
                                                </Link>
                                                {sub.items && sub.items.length > 0 && (
                                                    <ul className="space-y-1.5 text-xs text-gray-600 pl-2">
                                                        {sub.items.map((item, itemIdx) => (
                                                            <li key={itemIdx}>
                                                                <Link
                                                                    to={getItemLink(item, activeHorizontalCategory.id, sub.title)}
                                                                    onClick={() => setActiveHorizontalCategory(null)}
                                                                    className="hover:text-blue-600 hover:underline transition-colors block py-0.5"
                                                                >
                                                                    {item}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            )}
        </>
    );
};

export default Header;