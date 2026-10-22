import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
// import { getProducts, formatProductToDealCardProps } from "../../services/productService";

import "swiper/css";
import "swiper/css/navigation";

import DealProductCard, { type DealProductCardProps } from "./dealProductCard";

interface DealProductProps {
    deals?: DealProductCardProps[];
}

function DealProduct({ deals: initialDeals }: DealProductProps) {
    const [dealsList, setDealsList] = useState<DealProductCardProps[]>(initialDeals || []);
    const [loading] = useState<boolean>(false);

    useEffect(() => {
        if (initialDeals) {
            setDealsList(initialDeals);
        }
    }, [initialDeals]);

    // Dynamic timer state (Remaining time until end of day)
    const [timeLeft, setTimeLeft] = useState({ hours: "00", minutes: "00", seconds: "00" });

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const diff = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
            const hours = String(Math.floor(diff / 3600)).padStart(2, "0");
            const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
            const seconds = String(diff % 60).padStart(2, "0");

            setTimeLeft({ hours, minutes, seconds });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    // Sync initialDeals or fetch from API if not provided
    // useEffect(() => {
    //     if (initialDeals && initialDeals.length > 0) {
    //         setDealsList(initialDeals);
    //         setLoading(false);
    //         return;
    //     }

    //     let isMounted = true;
    //     setLoading(true);
    //     getProducts({ limit: 12, isFeatured: true })
    //         .then((res) => {
    //             if (!isMounted) return;
    //             const products = (res.products || []).filter((p) => Boolean(p.isFeatured));
    //             const formatted = products.map(formatProductToDealCardProps);
    //             setDealsList(formatted);
    //         })
    //         .catch((err) => {
    //             console.warn("Failed to fetch deal products:", err);
    //             if (isMounted) setDealsList([]);
    //         })
    //         .finally(() => {
    //             if (isMounted) setLoading(false);
    //         });

    //     return () => {
    //         isMounted = false;
    //     };
    // }, [initialDeals]);

    return (
        <div className="bg-gradient-to-b from-[#fe7112] to-[#ffdb68] rounded-xl p-5 shadow-md">
            <div className="box-title-deal flex items-center justify-between mb-4">
                <div className="title-deal flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Zap className="font-extrabold h-9 w-9 text-[#feea32] animate-bounce" />
                        <h2 className="font-black text-2xl sm:text-3xl text-[#feea32] tracking-tight">
                            GIÁ TỐT MỖI NGÀY
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs sm:text-sm">Kết thúc sau</span>
                        <div className="global-time-deal gap-1.5 flex items-center">
                            <span className="w-8 h-8 flex items-center justify-center bg-white text-[#e31233] font-black text-sm rounded-md shadow-inner">
                                {timeLeft.hours}
                            </span>
                            <span className="text-white font-extrabold">:</span>
                            <span className="w-8 h-8 flex items-center justify-center bg-white text-[#e31233] font-black text-sm rounded-md shadow-inner">
                                {timeLeft.minutes}
                            </span>
                            <span className="text-white font-extrabold">:</span>
                            <span className="w-8 h-8 flex items-center justify-center bg-white text-[#e31233] font-black text-sm rounded-md shadow-inner">
                                {timeLeft.seconds}
                            </span>
                        </div>
                    </div>
                </div>
                <Link to="/deals" className="text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 hover:underline">
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white/70 animate-pulse rounded-xl p-4 h-72 flex flex-col justify-between">
                            <div className="w-full h-36 bg-gray-200 rounded-lg mb-3" />
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                            <div className="h-6 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : dealsList.length === 0 ? (
                <div className="bg-white/90 rounded-xl p-8 text-center text-gray-500 font-medium text-xs">
                    Chưa có sản phẩm khuyến mãi nào trong hôm nay.
                </div>
            ) : (
                <div className="relative group/slider">
                    <Swiper
                        modules={[Autoplay, Navigation]}
                        spaceBetween={16}
                        slidesPerView={1}
                        breakpoints={{
                            480: { slidesPerView: 2, spaceBetween: 16 },
                            768: { slidesPerView: 3, spaceBetween: 16 },
                            1024: { slidesPerView: 4, spaceBetween: 16 },
                            1280: { slidesPerView: 5, spaceBetween: 16 },
                        }}
                        autoplay={{
                            delay: 4000,
                            disableOnInteraction: false,
                        }}
                        navigation={{
                            prevEl: ".deal-swiper-button-prev",
                            nextEl: ".deal-swiper-button-next",
                        }}
                        className="py-1"
                    >
                        {dealsList.map((item, index) => (
                            <SwiperSlide key={item.id || index}>
                                <DealProductCard {...item} />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Custom Navigation Arrows */}
                    <button
                        className="deal-swiper-button-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg border border-gray-100 opacity-80 group-hover/slider:opacity-100 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-auto"
                        aria-label="Previous Slide"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        className="deal-swiper-button-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg border border-gray-100 opacity-80 group-hover/slider:opacity-100 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-auto"
                        aria-label="Next Slide"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default DealProduct;
