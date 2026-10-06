import React, { useId } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

import ProductCard, { type ProductCardProps } from "./productCard";

export interface TabItem {
    name: string;
    link?: string;
}

interface BoxProductCategoryProps {
    title: string;
    tabs?: (string | TabItem)[];
    tabContent?: ProductCardProps[];
    viewAllLink?: string;
}

export const BoxProductCategory: React.FC<BoxProductCategoryProps> = ({
    title,
    tabs = [],
    tabContent = [],
    viewAllLink = "#",
}) => {
    // Unique navigation class names per component instance
    const rawId = useId().replace(/:/g, "");
    const prevClass = `box-category-prev-${rawId}`;
    const nextClass = `box-category-next-${rawId}`;

    return (
        <div className="box-product-category space-y-4">
            {/* Header Section */}
            <div className="title-box flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">
                    {title}
                </h2>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                    {tabs.map((tab, idx) => {
                        const name = typeof tab === "string" ? tab : tab.name;
                        const link = typeof tab === "string"
                            ? (viewAllLink && viewAllLink !== "#" ? `${viewAllLink}?search=${encodeURIComponent(name)}` : `/products?search=${encodeURIComponent(name)}`)
                            : (tab.link || viewAllLink);

                        return (
                            <React.Fragment key={idx}>
                                <Link
                                    to={link}
                                    onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
                                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                                >
                                    {name}
                                </Link>
                                {idx < tabs.length - 1 && <span className="text-gray-300">|</span>}
                            </React.Fragment>
                        );
                    })}
                    {tabs.length > 0 && <span className="text-gray-300">|</span>}
                    <Link
                        to={viewAllLink}
                        onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
                        className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                        Xem Tất Cả <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Slider Section */}
            {tabContent.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm bg-white rounded-xl border border-gray-100 shadow-xs">
                    Chưa có sản phẩm nào trong danh mục này.
                </div>
            ) : (
                <div className="relative group/category-slider">
                    <Swiper
                        modules={[Autoplay, Navigation]}
                        spaceBetween={14}
                        slidesPerView={1}
                        loop={tabContent.length > 5}
                        breakpoints={{
                            480: { slidesPerView: 2, spaceBetween: 14 },
                            768: { slidesPerView: 3, spaceBetween: 14 },
                            1024: { slidesPerView: 4, spaceBetween: 14 },
                            1280: { slidesPerView: 5, spaceBetween: 14 },
                        }}
                        autoplay={{
                            delay: 5000,
                            disableOnInteraction: false,
                        }}
                        navigation={{
                            prevEl: `.${prevClass}`,
                            nextEl: `.${nextClass}`,
                        }}
                        className="py-1 px-0.5"
                    >
                        {tabContent.map((product, index) => (
                            <SwiperSlide key={product.id || index} className="h-auto">
                                <ProductCard {...product} />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Custom Left & Right Slider Arrows */}
                    <button
                        className={`${prevClass} absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-30 w-9 h-14 rounded-r-md bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs shadow-md transition-all cursor-pointer opacity-70 group-hover/category-slider:opacity-100 disabled:opacity-0 disabled:cursor-default`}
                        aria-label="Previous Products"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        className={`${nextClass} absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-30 w-9 h-14 rounded-l-md bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs shadow-md transition-all cursor-pointer opacity-70 group-hover/category-slider:opacity-100 disabled:opacity-0 disabled:cursor-default`}
                        aria-label="Next Products"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default BoxProductCategory;