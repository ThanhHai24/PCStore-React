import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import {
    ChevronLeft,
    ChevronRight,
    Cpu,
    PcCase,
    Gamepad2,
    Monitor,
    Briefcase,
    Sparkles,
    Tv,
    CircuitBoard,
    MemoryStick,
    HardDrive,
    Loader2
} from 'lucide-react';
import DealProduct from '../../../components/storePage/dealProduct/dealProduct';
import BoxProductCategory from '../../../components/storePage/boxProductCategory/boxProductCategory';
import type { ProductCardProps } from '../../../components/storePage/boxProductCategory/productCard';
import type { DealProductCardProps } from '../../../components/storePage/dealProduct/dealProductCard';
// import {
//     getProducts,
//     formatProductToCardProps,
//     formatProductToDealCardProps
// } from '../../services/productService';
// import type { ApiProduct } from '../../types/apiProduct';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import banner1 from '../../../assets/images/slidebanner/1.jpg';
import banner2 from '../../../assets/images/slidebanner/2.jpg';
import banner3 from '../../../assets/images/slidebanner/3.gif';
import banner4 from '../../../assets/images/slidebanner/4.jpg';
import banner5 from '../../../assets/images/slidebanner/5.jpg';
import banner6 from '../../../assets/images/slidebanner/6.webp';
import banner7 from '../../../assets/images/slidebanner/7.jpg';
import banner8 from '../../../assets/images/slidebanner/8.jpg';
import banner9 from '../../../assets/images/slidebanner/9.jpg';
import banner10 from '../../../assets/images/slidebanner/10.jpg';
import banner11 from '../../../assets/images/slidebanner/11.jpg';

const slideBanners = [
    banner1, banner2, banner3, banner4, banner5,
    banner6, banner7, banner8, banner9, banner10, banner11
];

import cleanPcImg from '../../../assets/images/products/clean_pc.png';
import pcImg from '../../../assets/images/products/pc.jpg';
import rtxImg from '../../../assets/images/products/rtx.png';

const MOCK_DEALS: DealProductCardProps[] = [
    {
        id: 'deal-1',
        title: 'PC GAMING MIKU RYZEN 7 7700 / RTX 4060 8GB / RAM 32GB / SSD 1TB',
        price: '19.990.000đ',
        marketPrice: '24.990.000đ',
        discountPercent: '-20%',
        sold: 8,
        total: 10,
        image: cleanPcImg,
        link: '/product/deal-1'
    },
    {
        id: 'deal-2',
        title: 'PC GAMING INTEL I5 13400F / RTX 4060 Ti 8GB / RAM 16GB / SSD 512GB',
        price: '17.490.000đ',
        marketPrice: '20.990.000đ',
        discountPercent: '-17%',
        sold: 15,
        total: 20,
        image: pcImg,
        link: '/product/deal-2'
    },
    {
        id: 'deal-3',
        title: 'VGA ASUS ROG STRIX RTX 4080 SUPER 16GB GDDR6X',
        price: '32.990.000đ',
        marketPrice: '36.500.000đ',
        discountPercent: '-10%',
        sold: 5,
        total: 12,
        image: rtxImg,
        link: '/product/deal-3'
    },
    {
        id: 'deal-4',
        title: 'PC ULTRA AI WORKSTATION RYZEN 9 7950X / RTX 4090 24GB / RAM 64GB',
        price: '79.990.000đ',
        marketPrice: '89.990.000đ',
        discountPercent: '-11%',
        sold: 3,
        total: 5,
        image: cleanPcImg,
        link: '/product/deal-4'
    },
    {
        id: 'deal-5',
        title: 'PC VĂN PHÒNG CORE I3 12100 / RAM 16GB / SSD 256GB',
        price: '5.990.000đ',
        marketPrice: '7.500.000đ',
        discountPercent: '-20%',
        sold: 18,
        total: 25,
        image: pcImg,
        link: '/product/deal-5'
    }
];

const MOCK_PC_GAMING: ProductCardProps[] = [
    {
        id: 'gaming-1',
        title: 'PC GAMING Core i5 12400F / RTX 3060 12GB / RAM 16GB / SSD 512GB',
        price: '12.990.000đ',
        marketPrice: '15.500.000đ',
        discountPercent: '-16%',
        badge: 'HOT',
        banner: { type: 'hot', title: 'BEST SELLER', badgeText: 'HOT' },
        promotion: { prefix: 'Tặng ', highlight: 'Bàn phím cơ & Chuột Gaming', prefixColor: 'red', highlightColor: 'blue' },
        inStock: true,
        image: cleanPcImg
    },
    {
        id: 'gaming-2',
        title: 'PC GAMING RYZEN 5 5600 / GTX 1660 Super 6GB / RAM 16GB / SSD 256GB',
        price: '9.990.000đ',
        marketPrice: '11.990.000đ',
        discountPercent: '-17%',
        badge: 'HOT',
        promotion: 'Tặng lót chuột phím cơ cao cấp',
        inStock: true,
        image: pcImg
    },
    {
        id: 'gaming-3',
        title: 'PC GAMING Miku White Ryzen 7 7700X / RTX 4070 Super 12GB / RAM 32GB DDR5',
        price: '27.990.000đ',
        marketPrice: '31.990.000đ',
        discountPercent: '-13%',
        badge: 'NEW',
        banner: { type: 'sale', title: 'GIÁ SỐC', badgeText: 'GIÁ' },
        promotion: { prefix: 'Voucher ', highlight: 'Giảm ngay 500k', prefixColor: 'black', highlightColor: 'red' },
        inStock: true,
        image: cleanPcImg
    },
    {
        id: 'gaming-4',
        title: 'PC GAMING Core i7 14700F / RTX 4070 Ti Super 16GB / RAM 32GB DDR5',
        price: '39.990.000đ',
        marketPrice: '44.500.000đ',
        discountPercent: '-10%',
        badge: 'HOT',
        promotion: 'Miễn phí giao hàng toàn quốc',
        inStock: true,
        image: pcImg
    }
];

const MOCK_PC_DO_HOA: ProductCardProps[] = [
    {
        id: 'dohoa-1',
        title: 'PC Đồ Họa Render Core i7 13700K / RTX 4070 12GB / RAM 32GB / SSD 1TB',
        price: '34.990.000đ',
        marketPrice: '39.000.000đ',
        discountPercent: '-10%',
        badge: 'HOT',
        promotion: 'Tặng tản nhiệt nước AIO 360mm',
        inStock: true,
        image: cleanPcImg
    },
    {
        id: 'dohoa-2',
        title: 'Server Máy Ảo Dual Xeon E5 2696 v4 / RAM 64GB / GTX 1060 6GB',
        price: '14.500.000đ',
        marketPrice: '17.000.000đ',
        discountPercent: '-15%',
        promotion: 'Bảo hành 1 đổi 1 trong 12 tháng',
        inStock: true,
        image: pcImg
    },
    {
        id: 'dohoa-3',
        title: 'PC Workstation Dual RTX 4090 24GB / AMD Threadripper PRO 5995WX / RAM 128GB',
        price: '159.000.000đ',
        marketPrice: '175.000.000đ',
        discountPercent: '-9%',
        badge: 'NEW',
        promotion: 'Hỗ trợ lắp đặt tận nơi',
        inStock: true,
        image: cleanPcImg
    }
];

const MOCK_PC_VAN_PHONG: ProductCardProps[] = [
    {
        id: 'vp-1',
        title: 'PC Văn Phòng Slim Intel Core i3 12100 / RAM 8GB / SSD 256GB / Main H610',
        price: '4.990.000đ',
        marketPrice: '6.200.000đ',
        discountPercent: '-20%',
        promotion: 'Tặng combo phím chuột văn phòng',
        inStock: true,
        image: pcImg
    },
    {
        id: 'vp-2',
        title: 'PC Văn Phòng Premium Core i5 13400 / RAM 16GB / SSD 512GB / Wifi Bluetooth',
        price: '8.490.000đ',
        marketPrice: '9.990.000đ',
        discountPercent: '-15%',
        promotion: 'Tặng USB Wifi tốc độ cao',
        inStock: true,
        image: pcImg
    },
    {
        id: 'vp-3',
        title: 'PC Đồng Bộ HP ProTower 280 G9 i5 12500 / RAM 16GB / SSD 512GB',
        price: '11.290.000đ',
        marketPrice: '13.000.000đ',
        discountPercent: '-13%',
        promotion: 'Bảo hành chính hãng 3 năm',
        inStock: true,
        image: pcImg
    }
];

const MOCK_MINI_PC: ProductCardProps[] = [
    {
        id: 'mini-1',
        title: 'Mini PC Intel NUC 13 Pro Kit Core i5 1340P / RAM 16GB / SSD 512GB',
        price: '9.990.000đ',
        marketPrice: '12.000.000đ',
        discountPercent: '-17%',
        promotion: 'Thiết kế siêu nhỏ gọn 4x4 inch',
        inStock: true,
        image: pcImg
    },
    {
        id: 'mini-2',
        title: 'Mini PC Minisforum UM790 Pro AMD Ryzen 9 7940HS / RAM 32GB / SSD 1TB',
        price: '14.990.000đ',
        marketPrice: '17.500.000đ',
        discountPercent: '-14%',
        badge: 'NEW',
        promotion: 'Đồ họa AMD Radeon 780M cực mạnh',
        inStock: true,
        image: pcImg
    }
];

const MOCK_PC_AI: ProductCardProps[] = [
    {
        id: 'ai-1',
        title: 'PC AI Workstation Ryzen 9 7950X / RTX 4090 24GB / RAM 64GB DDR5 / SSD 2TB',
        price: '84.990.000đ',
        marketPrice: '95.000.000đ',
        discountPercent: '-11%',
        badge: 'HOT',
        banner: { type: 'hot', title: 'AI POWERED', badgeText: 'AI' },
        promotion: 'Cài sẵn môi trường PyTorch & CUDA API',
        inStock: true,
        image: cleanPcImg
    },
    {
        id: 'ai-2',
        title: 'PC AI LLM Dual RTX 4080 Super 16GB / Core i9 14900K / RAM 128GB DDR5',
        price: '109.990.000đ',
        marketPrice: '125.000.000đ',
        discountPercent: '-12%',
        badge: 'NEW',
        promotion: 'Tối ưu chạy LLM DeepSeek / Llama 3 local',
        inStock: true,
        image: cleanPcImg
    }
];

const MOCK_RAM: ProductCardProps[] = [
    {
        id: 'ram-1',
        title: 'RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz White',
        price: '3.290.000đ',
        marketPrice: '3.800.000đ',
        discountPercent: '-13%',
        promotion: 'Hỗ trợ Intel XMP 3.0 & AMD EXPO',
        inStock: true,
        image: pcImg
    },
    {
        id: 'ram-2',
        title: 'RAM Kingston FURY Beast 16GB (1x16GB) DDR4 3200MHz',
        price: '990.000đ',
        marketPrice: '1.250.000đ',
        discountPercent: '-21%',
        promotion: 'Bảo hành chính hãng 36 tháng',
        inStock: true,
        image: pcImg
    }
];

const MOCK_VGA: ProductCardProps[] = [
    {
        id: 'vga-1',
        title: 'Card Màn Hình ASUS ROG Strix GeForce RTX 4080 Super 16GB GDDR6X',
        price: '33.990.000đ',
        marketPrice: '37.500.000đ',
        discountPercent: '-9%',
        badge: 'HOT',
        promotion: 'Tặng giá đỡ VGA ROG cao cấp',
        inStock: true,
        image: rtxImg
    },
    {
        id: 'vga-2',
        title: 'Card Màn Hình Gigabyte GeForce RTX 4060 EAGLE OC 8GB GDDR6',
        price: '7.890.000đ',
        marketPrice: '8.990.000đ',
        discountPercent: '-12%',
        promotion: 'Tản nhiệt 3 quạt Windforce hiệu năng cao',
        inStock: true,
        image: rtxImg
    }
];

export const Home: React.FC = () => {
    const [loading] = useState<boolean>(false);
    const [dealProducts] = useState<DealProductCardProps[]>(MOCK_DEALS);
    const [pcGamingProducts] = useState<ProductCardProps[]>(MOCK_PC_GAMING);
    const [pcDoHoaProducts] = useState<ProductCardProps[]>(MOCK_PC_DO_HOA);
    const [pcVanPhongProducts] = useState<ProductCardProps[]>(MOCK_PC_VAN_PHONG);
    const [pcAiProducts] = useState<ProductCardProps[]>(MOCK_PC_AI);
    const [ramProducts] = useState<ProductCardProps[]>(MOCK_RAM);
    const [vgaProducts] = useState<ProductCardProps[]>(MOCK_VGA);
    const [miniPcProducts] = useState<ProductCardProps[]>(MOCK_MINI_PC);

    return (
        <div className="max-w-[1250px] mx-auto px-4 py-6 space-y-8">
            {/* Banner / Hero Section */}
            <section className="space-y-4">
                <div>
                    <a href="#">
                        <img
                            className="rounded-xl w-full object-cover shadow-sm"
                            src="/src/assets/images/mainbanner.webp"
                            alt="Main Banner"
                        />
                    </a>
                </div>

                {/* Swiper Slider Section */}
                <div className="relative group -mt-[50px]">
                    <Swiper
                        modules={[Autoplay, Navigation, Pagination]}
                        spaceBetween={16}
                        slidesPerView={1}
                        breakpoints={{
                            640: { slidesPerView: 2, spaceBetween: 16 },
                        }}
                        loop={true}
                        autoplay={{
                            delay: 5000,
                            disableOnInteraction: false,
                        }}
                        navigation={{
                            prevEl: '.swiper-button-prev-custom',
                            nextEl: '.swiper-button-next-custom',
                        }}
                        className="rounded-xl overflow-hidden py-1"
                    >
                        {slideBanners.map((imgSrc, index) => (
                            <SwiperSlide key={index}>
                                <a href="#" className="block overflow-hidden rounded-xl">
                                    <img
                                        className="w-full h-[150px] object-cover rounded-xl hover:scale-[1.02] transition-transform duration-300"
                                        src={imgSrc}
                                        alt={`Slide Banner ${index + 1}`}
                                    />
                                </a>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Navigation Arrows */}
                    <button
                        className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg border border-gray-100 backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                        aria-label="Previous Slide"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg border border-gray-100 backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                        aria-label="Next Slide"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </section>

            {/* Daily Deals Section */}
            <DealProduct deals={dealProducts} />

            {/* Outstanding Categories Bar */}
            <div className="box-category-outstanding space-y-4">
                <div className="title-box flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                        Danh mục nổi bật
                    </h2>
                </div>
                <div className="list-category-outstanding grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                    {[
                        { title: 'PC Gaming', icon: <Gamepad2 className="w-6 h-6" />, href: '/category/pc-gaming' },
                        { title: 'PC Đồ Họa', icon: <Monitor className="w-6 h-6" />, href: '/category/pc-do-hoa' },
                        { title: 'PC Văn Phòng', icon: <Briefcase className="w-6 h-6" />, href: '/category/pc-van-phong' },
                        { title: 'PC AI', icon: <Sparkles className="w-6 h-6 text-amber-500" />, href: '/category/pc-ai' },
                        { title: 'CPU Vi Xử Lý', icon: <Cpu className="w-6 h-6" />, href: '/category/cpu-bo-vi-xu-ly' },
                        { title: 'VGA Card', icon: <Tv className="w-6 h-6" />, href: '/category/vga-card-do-hoa' },
                        { title: 'Mainboard', icon: <CircuitBoard className="w-6 h-6" />, href: '/category/mainboard-bo-mach-chu' },
                        { title: 'RAM Bộ Nhớ', icon: <MemoryStick className="w-6 h-6" />, href: '/category/ram-bo-nho-trong' },
                        { title: 'Ổ Cứng SSD', icon: <HardDrive className="w-6 h-6" />, href: '/category/o-cung-hdd-ssd' },
                        { title: 'Vỏ Case', icon: <PcCase className="w-6 h-6" />, href: '/category/case-vo-may-tinh' },
                    ].map((cat, idx) => (
                        <Link
                            key={idx}
                            to={cat.href}
                            className="group flex flex-col items-center justify-center p-3 rounded-xl hover:bg-blue-50/70 hover:border-blue-200 border border-transparent transition-all duration-300 cursor-pointer"
                        >
                            <div className="w-12 h-12 mb-2 rounded-full bg-gray-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-110 group-hover:shadow-md">
                                {cat.icon}
                            </div>
                            <span className="title text-xs font-semibold text-gray-700 group-hover:text-blue-600 text-center transition-colors line-clamp-1">
                                {cat.title}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="text-gray-500 text-sm font-medium">Đang tải danh sách sản phẩm...</span>
                </div>
            ) : (
                <>
                    {/* Box Product Category - PC GAMING */}
                    <BoxProductCategory
                        title="PC GAMING"
                        tabs={[
                            { name: "Chọn PC Gaming Theo Giá", link: "/category/pc-gaming" },
                        ]}
                        tabContent={pcGamingProducts}
                        viewAllLink="/category/pc-gaming"
                    />

                    {/* Box Product Category - PC ĐỒ HỌA */}
                    <BoxProductCategory
                        title="PC ĐỒ HỌA - LÀM VIỆC"
                        tabs={[
                            { name: "Server - Máy Ảo Hóa", link: "/category/pc-do-hoa?search=Server" },
                            { name: "Máy Tính Đồng Bộ", link: "/category/pc-do-hoa?search=Đồng%20bộ" },
                            { name: "Máy Tính Đồ Họa", link: "/category/pc-do-hoa" },
                            { name: "Build PC Custom", link: "/build-pc" },
                        ]}
                        tabContent={pcDoHoaProducts}
                        viewAllLink="/category/pc-do-hoa"
                    />

                    {/* Box Product Category - PC VĂN PHÒNG */}
                    <BoxProductCategory
                        title="PC VĂN PHÒNG"
                        tabs={[
                            { name: "PC Văn Phòng Giá Rẻ", link: "/category/pc-van-phong" },
                        ]}
                        tabContent={pcVanPhongProducts}
                        viewAllLink="/category/pc-van-phong"
                    />

                    {/* Box Product Category - MINI PC */}
                    {miniPcProducts.length > 0 && (
                        <BoxProductCategory
                            title="MINI PC"
                            tabs={[
                                { name: "Mini PC Intel", link: "/category/mini-pc?search=Intel" },
                                { name: "Mini PC AMD", link: "/category/mini-pc?search=AMD" },
                            ]}
                            tabContent={miniPcProducts}
                            viewAllLink="/category/mini-pc"
                        />
                    )}

                    {/* Box Product Category - PC AI */}
                    <BoxProductCategory
                        title="PC AI - TRÍ TUỆ NHÂN TẠO"
                        tabs={[
                            { name: "PC AI Workstation", link: "/category/pc-ai" },
                        ]}
                        tabContent={pcAiProducts}
                        viewAllLink="/category/pc-ai"
                    />

                    {/* Box Product Category - RAM - BỘ NHỚ TRONG */}
                    <BoxProductCategory
                        title="RAM - BỘ NHỚ TRONG"
                        tabs={[
                            { name: "RAM DDR5", link: "/category/ram-bo-nho-trong?search=DDR5" },
                            { name: "RAM DDR4", link: "/category/ram-bo-nho-trong?search=DDR4" },
                            { name: "RAM 32GB", link: "/category/ram-bo-nho-trong?search=32GB" },
                            { name: "RAM 16GB", link: "/category/ram-bo-nho-trong?search=16GB" },
                        ]}
                        tabContent={ramProducts}
                        viewAllLink="/category/ram-bo-nho-trong"
                    />

                    {/* Box Product Category - VGA - CARD ĐỒ HỌA */}
                    {vgaProducts.length > 0 && (
                        <BoxProductCategory
                            title="VGA - CARD ĐỒ HỌA"
                            tabs={[
                                { name: "NVIDIA RTX 50 Series", link: "/category/vga-card-do-hoa?search=RTX%2050" },
                                { name: "NVIDIA RTX 40 Series", link: "/category/vga-card-do-hoa?search=RTX%2040" },
                                { name: "AMD Radeon", link: "/category/vga-card-do-hoa?search=Radeon" },
                            ]}
                            tabContent={vgaProducts}
                            viewAllLink="/category/vga-card-do-hoa"
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default Home;
