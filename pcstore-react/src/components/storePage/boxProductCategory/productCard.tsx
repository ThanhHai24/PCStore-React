import React from "react";
import { Link } from "react-router-dom";
import { Check, ShoppingCart } from "lucide-react";
import defaultPcImg from "../../../assets/images/products/pc.jpg";
import { useCart } from "../../../context/CartContext";
import type { Product } from "../../../types/product";

export interface PromotionInfo {
    prefix?: string;
    highlight?: string;
    suffix?: string;
    prefixColor?: "red" | "black" | "gray";
    highlightColor?: "red" | "blue" | "black";
}

export interface ProductCardProps {
    id?: string | number;
    title: string;
    image?: string;
    price: string;
    marketPrice?: string;
    discountPercent?: string;
    badge?: "HOT" | "NEW" | string;
    banner?: {
        type: "hot" | "sale" | string;
        title: string;
        badgeText?: string;
    };
    promotion?: string | PromotionInfo;
    inStock?: boolean;
    link?: string;
}


export const ProductCard: React.FC<ProductCardProps> = ({
    id,
    title,
    image = defaultPcImg,
    price,
    marketPrice,
    discountPercent,
    badge,
    banner,
    promotion,
    inStock = true,
    link,
}) => {
    const { addToCart } = useCart();
    const targetLink = link && link !== "#" ? link : `/product/${id || "pc-miku-ryzen7"}`;

    const handleQuickAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!inStock) return;

        const numericPrice = Number(String(price).replace(/[^\d]/g, '')) || 0;
        const productObj: Product = {
            id: String(id || title),
            title,
            images: [image || defaultPcImg],
            price,
            numericPrice,
            marketPrice,
            discountPercent,
            badge,
            inStock: inStock ?? true,
            stockQuantity: 15,
            warrantyInfo: '36 Tháng',
            rating: 5,
            reviewCount: 10,
            viewCount: 100,
            commentCount: 5,
            purchaseCount: 20,
            promotions: typeof promotion === 'string' ? [promotion] : [],
            specsTable: [],
        };

        addToCart(productObj, 1);
    };

    return (
        <div className="group/card relative flex flex-col justify-between bg-white rounded-xl p-3 border border-gray-200 hover:shadow-lg transition-all duration-300 w-full h-full">
            {/* Top Right Ribbon Badge */}
            {badge && (
                <div className="absolute top-0 right-3 z-20">
                    <div
                        className="bg-[#be1f2d] text-white text-[10px] font-extrabold pt-1 pb-2.5 px-1.5 shadow-sm flex flex-col items-center justify-start min-w-[26px] tracking-wider uppercase"
                        style={{
                            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
                        }}
                    >
                        <span>{badge}</span>
                    </div>
                </div>
            )}

            {/* Product Image Box */}
            <div className="relative w-full pt-[85%] mb-3 bg-white rounded-lg overflow-hidden flex items-center justify-center">

                <Link to={targetLink} className="absolute inset-0 flex items-center justify-center p-2">
                    <img
                        src={image || defaultPcImg}
                        alt={title}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultPcImg;
                        }}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/card:scale-105"
                    />
                </Link>

                {/* Bottom Overlay Banner Badge */}
            </div>

            {/* Product Info */}
            <div className="flex flex-col flex-1 justify-between mt-1">
                <div>
                    <Link to={targetLink} className="block group/title">
                        <h3 className="text-[#333333] font-medium text-[13px] leading-snug line-clamp-2 min-h-[36px] group-hover/title:text-red-600 transition-colors">
                            {title}
                        </h3>
                    </Link>

                    {/* Price & Discount */}
                    <div className="mt-2">
                        <div className="flex items-center gap-1.5 min-h-[20px]">
                            {marketPrice && marketPrice !== price && (
                                <span className="text-xs text-gray-400 line-through font-normal">
                                    {marketPrice}
                                </span>
                            )}
                            {discountPercent && (
                                <span className="bg-[#be1f2d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded text-center leading-none">
                                    {discountPercent}
                                </span>
                            )}
                        </div>
                        <div className="text-[#d02c2c] text-lg font-bold tracking-tight mt-0.5">
                            {price}
                        </div>
                    </div>

                    {/* Promotion detail */}
                    <div className="mt-1.5 text-[12px] text-gray-600 leading-snug line-clamp-2 min-h-[34px]">
                        {typeof promotion === "string" ? (
                            promotion
                        ) : promotion ? (
                            <>
                                <span
                                    className={
                                        promotion.prefixColor === "red"
                                            ? "text-red-600 font-semibold"
                                            : promotion.prefixColor === "black"
                                                ? "text-gray-900 font-semibold"
                                                : "text-gray-600"
                                    }
                                >
                                    {promotion.prefix}
                                </span>
                                <span
                                    className={
                                        promotion.highlightColor === "blue"
                                            ? "text-blue-600 font-bold hover:underline cursor-pointer"
                                            : promotion.highlightColor === "red"
                                                ? "text-red-600 font-bold hover:underline cursor-pointer"
                                                : "text-gray-900 font-bold"
                                    }
                                >
                                    {promotion.highlight}
                                </span>
                                <span>{promotion.suffix}</span>
                            </>
                        ) : null}
                    </div>
                </div>

                {/* Stock Status & Quick Add Button */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[12px]">
                    <div className={`flex items-center gap-1 font-medium ${inStock ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{inStock ? "Còn hàng" : "Hết hàng"}</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleQuickAddToCart}
                        disabled={!inStock}
                        title={inStock ? "Thêm vào giỏ hàng" : "Hết hàng"}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                            inStock
                                ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-sm active:scale-90 cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        aria-label="Thêm vào giỏ hàng"
                    >
                        <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;