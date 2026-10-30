import { Flame, ShoppingCart } from "lucide-react";
import defaultPcImg from "../../../assets/images/products/pc.jpg";
import { useCart } from "../../../context/CartContext";
import type { Product } from "../../../types/product";

export interface DealProductCardProps {
    id?: string | number;
    image?: string;
    title?: string;
    price?: string;
    marketPrice?: string;
    discountPercent?: string;
    sold?: number;
    total?: number;
    link?: string;
}

export function DealProductCard({
    id,
    image,
    title,
    price,
    marketPrice,
    discountPercent,
    sold = 0,
    total = 10,
    link = "#"
}: DealProductCardProps) {
    if (!title || !price) return null;

    const { addToCart } = useCart();
    const percentage = total > 0 ? Math.min(100, Math.max(0, (sold / total) * 100)) : 50;

    const handleQuickAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const numericPrice = Number(String(price).replace(/[^\d]/g, '')) || 0;
        const productObj: Product = {
            id: String(id || title),
            title,
            images: [image || defaultPcImg],
            price,
            numericPrice,
            marketPrice,
            discountPercent,
            inStock: true,
            stockQuantity: total - sold > 0 ? total - sold : 10,
            warrantyInfo: '36 Tháng',
            rating: 5,
            reviewCount: 15,
            viewCount: 200,
            commentCount: 8,
            purchaseCount: sold || 10,
            promotions: ['Khuyến mãi Flash Sale giá sốc'],
            specsTable: [],
        };

        addToCart(productObj, 1);
    };

    return (
        <div className="group/card relative flex flex-col justify-between bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 w-full h-full border border-gray-100">
            <a href={link} className="block overflow-hidden mb-3">
                <img
                    src={image || defaultPcImg}
                    alt={title}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = defaultPcImg;
                    }}
                    className="w-full h-48 object-contain transition-transform duration-300 group-hover/card:scale-105"
                />
            </a>

            <div className="flex flex-col flex-1 justify-between">
                <a href={link} className="block mb-3">
                    <h3 className="text-[#333333] font-medium text-[15px] leading-snug line-clamp-2 min-h-[42px] group-hover/card:text-[#e31233] transition-colors">
                        {title}
                    </h3>
                </a>

                <div>
                    <div className="flex items-center gap-2 mb-1 min-h-[24px]">
                        {marketPrice && marketPrice !== price && (
                            <p className="product-market-price text-xs sm:text-sm text-gray-400 line-through font-medium">
                                {marketPrice}
                            </p>
                        )}
                        {discountPercent && (
                            <div className="product-percent-price text-xs font-bold text-white bg-[#be1f2d] border border-[#fbd5d5] px-1.5 py-0.5 rounded-md">
                                {discountPercent}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[#d02c2c] text-xl sm:text-2xl font-extrabold tracking-tight">
                            {price}
                        </div>
                        <button
                            type="button"
                            onClick={handleQuickAddToCart}
                            title="Thêm vào giỏ hàng"
                            className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
                            aria-label="Thêm vào giỏ hàng"
                        >
                            <ShoppingCart className="w-4 h-4" />
                        </button>
                    </div>

                    {total > 0 && (
                        <div className="relative w-full h-7 bg-[#e9ecef] rounded-full flex items-center overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#ff5e00] to-[#ffa800] rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />
                            <div className="absolute left-0 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#ff3c00] via-[#ff7700] to-[#ffaa00] shadow-sm">
                                <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300 stroke-[#ff2200]" />
                            </div>
                            <div className="absolute inset-0 z-10 flex items-center justify-center pl-5 text-[11px] font-bold text-gray-900 pointer-events-none">
                                Đã bán {sold}/{total}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DealProductCard;
