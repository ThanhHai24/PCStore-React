import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Eye, MessageSquare, ShoppingBag, Cpu, Monitor, HardDrive, Plus, Minus, Scale, ShoppingCart } from 'lucide-react';
import type { Product } from '../../../types/product';
import { useCart } from '../../../context/CartContext';

interface ProductInfoProps {
    product: Product;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState<number>(1);
    const [selectedStorage] = useState<string>('');

    const maxStock = product.stockQuantity ?? 10;

    // Live countdown timer state
    const [timeLeft, setTimeLeft] = useState({
        hours: product.flashSale?.hours || 23,
        minutes: product.flashSale?.minutes || 33,
        seconds: product.flashSale?.seconds || 46,
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
                if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleDecreaseQuantity = () => {
        if (quantity > 1) setQuantity(quantity - 1);
    };

    const handleIncreaseQuantity = () => {
        if (quantity < maxStock) {
            setQuantity(quantity + 1);
        }
    };

    const handleAddToCart = () => {
        addToCart(product, quantity, selectedStorage || undefined);
    };

    const handleBuyNow = () => {
        addToCart(product, quantity, selectedStorage || undefined);
        navigate('/cart');
    };

    return (
        <div className="space-y-4 text-gray-800 relative">

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                {product.title}
            </h1>

            {/* Ratings & Stats bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-1 text-amber-400 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                    <span>{product.rating.toFixed(1)}</span>
                    <span className="text-blue-600 font-normal">({product.reviewCount} đánh giá)</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span>{product.viewCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <span>{product.commentCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <ShoppingBag className="w-4 h-4 text-gray-400" />
                    <span>{product.purchaseCount}</span>
                </div>
            </div>

            {/* Warranty & In-stock line */}
            <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm">
                <div>
                    <span className="text-gray-500">Bảo hành: </span>
                    <span className="text-red-600 font-semibold">{product.warrantyInfo}</span>
                </div>
                <div>
                    <span className="text-gray-500">Tình trạng: </span>
                    <span className={product.inStock && (product.stockQuantity === undefined || product.stockQuantity > 0) ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                        {product.inStock && (product.stockQuantity === undefined || product.stockQuantity > 0)
                            ? `Còn hàng ${product.stockQuantity !== undefined ? `(Còn ${product.stockQuantity} sản phẩm)` : ''}`
                            : 'Hết hàng'}
                    </span>
                </div>
            </div>


            {/* FLASH SALE Box */}
            <div className="border-1 border-red-300 rounded-2xl overflow-hidden bg-white shadow-sm">
                {/* Flash Sale Price Content */}
                <div className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Giá bán hiện tại */}
                        <span className="text-2xl sm:text-3xl font-extrabold text-red-600 tracking-tight">
                            {product.price}
                        </span>

                        {/* Giá niêm yết */}
                        {product.marketPrice && product.marketPrice !== product.price && (
                            <span className="text-sm sm:text-base text-gray-400 line-through font-medium">
                                {product.marketPrice}
                            </span>
                        )}

                        {/* % Giảm giá */}
                        {product.discountPercent && (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-md border border-red-200">
                                {product.discountPercent}
                            </span>
                        )}
                    </div>

                    {/* {product.installmentPrice && (
                        <div className="text-xs text-gray-600">
                            <span>Hoặc </span>
                            <span className="text-gray-900 font-bold">{product.installmentPrice}</span>
                        </div>
                    )} */}
                </div>
            </div>


            {/* Khuyến mại & Quà tặng khác Box */}
            <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/20">
                <div className="bg-red-600 text-white text-xs sm:text-sm font-bold px-4 py-2">
                    Khuyến mại & Quà tặng khác
                </div>
                <ul className="p-4 space-y-2 text-xs text-gray-700 list-disc list-inside leading-relaxed">
                    {product.promotions.map((promo, idx) => (
                        <li key={idx} className="marker:text-red-500 font-medium">
                            {promo}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Quantity & Action Buttons Row */}
            <div className="space-y-3 pt-2">
                {/* Quantity selector */}
                <div className="flex items-center space-x-3 text-xs font-bold text-gray-700">
                    <span>Số lượng:</span>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <button
                            onClick={handleDecreaseQuantity}
                            className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                            aria-label="Giảm số lượng"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-4 py-1 text-xs font-bold text-gray-900 border-x border-gray-200">
                            {quantity}
                        </span>
                        <button
                            onClick={handleIncreaseQuantity}
                            disabled={quantity >= maxStock}
                            className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Tăng số lượng"
                            title={quantity >= maxStock ? `Số lượng tồn kho tối đa: ${maxStock}` : ''}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <span className="text-[11px] text-gray-500 font-normal">
                        (Tồn kho: {product.stockQuantity !== undefined ? product.stockQuantity : 'Sẵn hàng'})
                    </span>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleBuyNow}
                        disabled={!product.inStock || product.stockQuantity === 0}
                        className="flex-1 min-w-[110px] bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-extrabold py-3 px-3 rounded-xl text-center text-xs uppercase shadow transition-colors disabled:cursor-not-allowed cursor-pointer"
                    >
                        {!product.inStock || product.stockQuantity === 0 ? 'HẾT HÀNG' : 'MUA NGAY'}
                    </button>
                    <button
                        onClick={handleAddToCart}
                        disabled={!product.inStock || product.stockQuantity === 0}
                        className="bg-white flex items-center gap-2 border-2 border-red-600 hover:bg-red-50 disabled:border-gray-300 disabled:text-gray-400 text-red-600 font-bold py-3 px-3 rounded-xl text-xs whitespace-nowrap transition-colors active:scale-95 disabled:cursor-not-allowed"
                    >
                        Thêm vào giỏ <ShoppingCart className='w-4 h-4 text-red-600' />
                    </button>

                    <Link
                        to={`/compare?id1=${product.id}`}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-bold py-3 px-3 rounded-xl text-xs flex items-center space-x-1 transition-colors"
                        title="So sánh với sản phẩm khác"
                    >
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span>So sánh</span>
                    </Link>
                </div>

            </div>


        </div>
    );
};

export default ProductInfo;
