import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import {
    ChevronLeft,
    ChevronRight,
    Cpu,
    Gamepad2,
    Monitor,
    Briefcase,
    Sparkles,
    Tv,
    CircuitBoard,
    MemoryStick,
    HardDrive,
    Laptop,
    Loader2,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import DealProduct from '../../../components/storePage/dealProduct/dealProduct';
import BoxProductCategory from '../../../components/storePage/boxProductCategory/boxProductCategory';
import type { ProductCardProps } from '../../../components/storePage/boxProductCategory/productCard';
import type { DealProductCardProps } from '../../../components/storePage/dealProduct/dealProductCard';
import {
    getProducts,
    formatProductToCardProps,
    formatProductToDealCardProps,
} from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import type { ProductResponse } from '../../../types/adminProduct';
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

export const Home: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [dealProducts, setDealProducts] = useState<DealProductCardProps[]>([]);
    const [pcGamingProducts, setPcGamingProducts] = useState<ProductCardProps[]>([]);
    const [laptopProducts, setLaptopProducts] = useState<ProductCardProps[]>([]);
    const [pcDoHoaProducts, setPcDoHoaProducts] = useState<ProductCardProps[]>([]);
    const [pcVanPhongProducts, setPcVanPhongProducts] = useState<ProductCardProps[]>([]);
    const [pcAiProducts, setPcAiProducts] = useState<ProductCardProps[]>([]);
    const [vgaProducts, setVgaProducts] = useState<ProductCardProps[]>([]);
    const [ramProducts, setRamProducts] = useState<ProductCardProps[]>([]);
    const [cpuProducts, setCpuProducts] = useState<ProductCardProps[]>([]);
    const [linhKienProducts, setLinhKienProducts] = useState<ProductCardProps[]>([]);
    const [allProductsCount, setAllProductsCount] = useState<number>(0);

    const fetchHomeData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Lấy danh mục và danh sách sản phẩm song song từ API
            const [categoriesRes, productsRes] = await Promise.allSettled([
                categoryService.getCategories(),
                getProducts({ size: 100, sort: ['id,desc'] }),
            ]);

            // Xây dựng map ID danh mục -> tên danh mục
            const categoryMap = new Map<number, string>();
            if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.content) {
                categoriesRes.value.content.forEach((cat) => {
                    categoryMap.set(cat.id, cat.name);
                });
            }

            if (productsRes.status === 'rejected') {
                throw new Error(productsRes.reason?.message || 'Không thể tải danh sách sản phẩm');
            }

            const rawProducts: ProductResponse[] = productsRes.value?.content || [];
            setAllProductsCount(rawProducts.length);

            // 1. Phân bổ sản phẩm khuyến mãi (Deal / Flash Sale)
            // Lấy các sản phẩm có giá hoặc tối đa 8 sản phẩm đầu tiên
            const dealList = rawProducts
                .slice(0, 10)
                .map(formatProductToDealCardProps);
            setDealProducts(dealList);

            // 2. Phân loại sản phẩm vào các nhóm box category
            const gamingList: ProductCardProps[] = [];
            const laptopList: ProductCardProps[] = [];
            const doHoaList: ProductCardProps[] = [];
            const vanPhongList: ProductCardProps[] = [];
            const aiList: ProductCardProps[] = [];
            const vgaList: ProductCardProps[] = [];
            const ramList: ProductCardProps[] = [];
            const cpuList: ProductCardProps[] = [];
            const linhKienList: ProductCardProps[] = [];

            rawProducts.forEach((prod) => {
                const prodName = (prod.name || '').toLowerCase();
                const prodSlug = (prod.slug || '').toLowerCase();
                const prodType = (prod.productType || '').toUpperCase();
                const primaryCat = prod.primaryCategoryId ? (categoryMap.get(prod.primaryCategoryId) || '').toLowerCase() : '';
                const allCats = (prod.categoryIds || []).map((id) => (categoryMap.get(id) || '').toLowerCase()).join(' ');
                const text = `${prodName} ${prodSlug} ${prodType} ${primaryCat} ${allCats}`;

                const card = formatProductToCardProps(prod);

                // Laptop
                if (prodType === 'LAPTOP' || text.includes('laptop') || primaryCat.includes('laptop')) {
                    laptopList.push(card);
                    return;
                }

                // Card đồ họa (VGA)
                if (
                    prod.primaryCategoryId === 10006 ||
                    primaryCat.includes('card đồ họa') ||
                    text.includes('vga') ||
                    text.includes('rtx') ||
                    text.includes('gtx') ||
                    text.includes('gpu') ||
                    text.includes('radeon')
                ) {
                    vgaList.push(card);
                    return;
                }

                // RAM
                if (prod.primaryCategoryId === 10004 || primaryCat.includes('ram') || text.includes('ram')) {
                    ramList.push(card);
                    return;
                }

                // CPU
                if (prod.primaryCategoryId === 10002 || primaryCat.includes('cpu') || text.includes('cpu') || text.includes('intel core') || text.includes('ryzen')) {
                    cpuList.push(card);
                    return;
                }

                // PC Đồ họa / Workstation
                if (text.includes('đồ họa') || text.includes('workstation') || text.includes('render') || text.includes('máy ảo') || text.includes('server')) {
                    doHoaList.push(card);
                    return;
                }

                // PC Văn phòng
                if (text.includes('văn phòng') || text.includes('đồng bộ') || text.includes('slim')) {
                    vanPhongList.push(card);
                    return;
                }

                // PC AI
                if (text.includes('ai') || text.includes('trí tuệ nhân tạo') || text.includes('deepseek')) {
                    aiList.push(card);
                    return;
                }

                // PC Gaming & Bộ nâng cấp PC
                if (
                    prodType === 'PC' ||
                    prod.primaryCategoryId === 10009 ||
                    text.includes('pc') ||
                    text.includes('gaming') ||
                    text.includes('nâng cấp') ||
                    text.includes('máy tính')
                ) {
                    gamingList.push(card);
                    return;
                }

                // Linh kiện khác (Mainboard, SSD, Màn hình, Case, Nguồn, Phụ kiện...)
                linhKienList.push(card);
            });

            setPcGamingProducts(gamingList);
            setLaptopProducts(laptopList);
            setPcDoHoaProducts(doHoaList);
            setPcVanPhongProducts(vanPhongList);
            setPcAiProducts(aiList);
            setVgaProducts(vgaList);
            setRamProducts(ramList);
            setCpuProducts(cpuList);
            setLinhKienProducts(linhKienList);
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu sản phẩm trang chủ:', err);
            setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

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

            {/* Daily Deals Section (Hiển thị khi có sản phẩm deals) */}
            {dealProducts.length > 0 && <DealProduct deals={dealProducts} />}

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
                        { title: 'Laptop', icon: <Laptop className="w-6 h-6 text-indigo-600" />, href: '/category/laptop' },
                        { title: 'PC Đồ Họa', icon: <Monitor className="w-6 h-6" />, href: '/category/pc-do-hoa' },
                        { title: 'PC Văn Phòng', icon: <Briefcase className="w-6 h-6" />, href: '/category/pc-van-phong' },
                        { title: 'PC AI', icon: <Sparkles className="w-6 h-6 text-amber-500" />, href: '/category/pc-ai' },
                        { title: 'CPU Vi Xử Lý', icon: <Cpu className="w-6 h-6" />, href: '/category/cpu-bo-vi-xu-ly' },
                        { title: 'VGA Card', icon: <Tv className="w-6 h-6" />, href: '/category/vga-card-do-hoa' },
                        { title: 'Mainboard', icon: <CircuitBoard className="w-6 h-6" />, href: '/category/mainboard-bo-mach-chu' },
                        { title: 'RAM Bộ Nhớ', icon: <MemoryStick className="w-6 h-6" />, href: '/category/ram-bo-nho-trong' },
                        { title: 'Ổ Cứng SSD', icon: <HardDrive className="w-6 h-6" />, href: '/category/o-cung-hdd-ssd' },
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

            {/* Trạng thái Loading / Error / Empty / Nội dung sản phẩm */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <span className="text-gray-600 text-sm font-medium">Đang tải danh sách sản phẩm từ hệ thống...</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 bg-red-50/50 rounded-2xl border border-red-200 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Không thể tải dữ liệu sản phẩm</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-md">{error}</p>
                    </div>
                    <button
                        onClick={fetchHomeData}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Thử lại
                    </button>
                </div>
            ) : allProductsCount === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
                    <h3 className="text-lg font-bold text-gray-800">Chưa có sản phẩm nào trong hệ thống</h3>
                    <p className="text-sm text-gray-500 mt-1">Các sản phẩm sau khi được tạo trong trang Quản Trị sẽ tự động xuất hiện tại đây.</p>
                </div>
            ) : (
                <>
                    {/* Box Product Category - PC GAMING & BỘ NÂNG CẤP */}
                    {pcGamingProducts.length > 0 && (
                        <BoxProductCategory
                            title="PC GAMING & BỘ MÁY TÍNH"
                            tabs={[
                                { name: "PC Gaming", link: "/category/pc-gaming" },
                                { name: "Bộ Nâng Cấp PC", link: "/category/bo-nang-cap-pc" },
                                { name: "Build PC", link: "/build-pc" },
                            ]}
                            tabContent={pcGamingProducts}
                            viewAllLink="/category/pc-gaming"
                        />
                    )}

                    {/* Box Product Category - LAPTOP & MÁY TÍNH XÁCH TAY */}
                    {laptopProducts.length > 0 && (
                        <BoxProductCategory
                            title="LAPTOP & MÁY TÍNH XÁCH TAY"
                            tabs={[
                                { name: "Laptop ASUS", link: "/category/laptop?search=ASUS" },
                                { name: "Laptop Dell", link: "/category/laptop?search=Dell" },
                                { name: "Laptop HP", link: "/category/laptop?search=HP" },
                                { name: "Laptop Lenovo", link: "/category/laptop?search=Lenovo" },
                                { name: "Laptop MSI", link: "/category/laptop?search=MSI" },
                            ]}
                            tabContent={laptopProducts}
                            viewAllLink="/category/laptop"
                        />
                    )}

                    {/* Box Product Category - PC ĐỒ HỌA */}
                    {pcDoHoaProducts.length > 0 && (
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
                    )}

                    {/* Box Product Category - PC VĂN PHÒNG */}
                    {pcVanPhongProducts.length > 0 && (
                        <BoxProductCategory
                            title="PC VĂN PHÒNG"
                            tabs={[
                                { name: "PC Văn Phòng Giá Rẻ", link: "/category/pc-van-phong" },
                            ]}
                            tabContent={pcVanPhongProducts}
                            viewAllLink="/category/pc-van-phong"
                        />
                    )}

                    {/* Box Product Category - PC AI */}
                    {pcAiProducts.length > 0 && (
                        <BoxProductCategory
                            title="PC AI - TRÍ TUỆ NHÂN TẠO"
                            tabs={[
                                { name: "PC AI Workstation", link: "/category/pc-ai" },
                            ]}
                            tabContent={pcAiProducts}
                            viewAllLink="/category/pc-ai"
                        />
                    )}

                    {/* Box Product Category - VGA - CARD ĐỒ HỌA */}
                    {vgaProducts.length > 0 && (
                        <BoxProductCategory
                            title="VGA - CARD ĐỒ HỌA"
                            tabs={[
                                { name: "NVIDIA RTX Series", link: "/category/vga-card-do-hoa?search=RTX" },
                                { name: "NVIDIA GTX", link: "/category/vga-card-do-hoa?search=GTX" },
                                { name: "AMD Radeon", link: "/category/vga-card-do-hoa?search=Radeon" },
                            ]}
                            tabContent={vgaProducts}
                            viewAllLink="/category/vga-card-do-hoa"
                        />
                    )}

                    {/* Box Product Category - RAM - BỘ NHỚ TRONG */}
                    {ramProducts.length > 0 && (
                        <BoxProductCategory
                            title="RAM - BỘ NHỚ TRONG"
                            tabs={[
                                { name: "RAM DDR5", link: "/category/ram-bo-nho-trong?search=DDR5" },
                                { name: "RAM DDR4", link: "/category/ram-bo-nho-trong?search=DDR4" },
                                { name: "RAM 16GB", link: "/category/ram-bo-nho-trong?search=16GB" },
                                { name: "RAM 32GB", link: "/category/ram-bo-nho-trong?search=32GB" },
                            ]}
                            tabContent={ramProducts}
                            viewAllLink="/category/ram-bo-nho-trong"
                        />
                    )}

                    {/* Box Product Category - CPU - BỘ VI XỬ LÝ */}
                    {cpuProducts.length > 0 && (
                        <BoxProductCategory
                            title="CPU - BỘ VI XỬ LÝ"
                            tabs={[
                                { name: "Intel Core i5", link: "/category/cpu-bo-vi-xu-ly?search=Core%20i5" },
                                { name: "Intel Core i7", link: "/category/cpu-bo-vi-xu-ly?search=Core%20i7" },
                                { name: "AMD Ryzen 5", link: "/category/cpu-bo-vi-xu-ly?search=Ryzen%205" },
                                { name: "AMD Ryzen 7", link: "/category/cpu-bo-vi-xu-ly?search=Ryzen%207" },
                            ]}
                            tabContent={cpuProducts}
                            viewAllLink="/category/cpu-bo-vi-xu-ly"
                        />
                    )}

                    {/* Box Product Category - LINH KIỆN & PHỤ KIỆN */}
                    {linhKienProducts.length > 0 && (
                        <BoxProductCategory
                            title="LINH KIỆN & PHỤ KIỆN MÁY TÍNH"
                            tabs={[
                                { name: "Mainboard", link: "/category/mainboard-bo-mach-chu" },
                                { name: "Ổ Cứng SSD", link: "/category/o-cung-hdd-ssd" },
                                { name: "Màn Hình", link: "/category/man-hinh" },
                                { name: "Nguồn Máy Tính", link: "/category/psu-nguon-may-tinh" },
                                { name: "Vỏ Case", link: "/category/case-vo-may-tinh" },
                            ]}
                            tabContent={linhKienProducts}
                            viewAllLink="/category/linh-kien"
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default Home;
