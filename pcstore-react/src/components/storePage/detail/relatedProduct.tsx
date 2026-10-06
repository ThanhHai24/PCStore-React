import React, { useState } from 'react';
import type { Product } from '../../../types/product';
import ProductCard from '../boxProductCategory/productCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RelatedProductsProps {
    products: Product[];
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ products }) => {
    const [startIndex, setStartIndex] = useState<number>(0);
    const itemsPerPage = 4;

    if (!products || products.length === 0) return null;

    const handlePrev = () => {
        setStartIndex((prev) => Math.max(0, prev - itemsPerPage));
    };

    const handleNext = () => {
        setStartIndex((prev) =>
            prev + itemsPerPage < products.length ? prev + itemsPerPage : prev
        );
    };

    const visibleProducts = products.slice(startIndex, startIndex + itemsPerPage);
    const canGoPrev = startIndex > 0;
    const canGoNext = startIndex + itemsPerPage < products.length;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-gray-900">Sản phẩm liên quan</h3>
                {products.length > itemsPerPage && (
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={handlePrev}
                            disabled={!canGoPrev}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${canGoPrev
                                    ? 'border-gray-200 hover:border-red-500 hover:text-red-600 text-gray-700 cursor-pointer'
                                    : 'border-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                            title="Trang trước"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!canGoNext}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${canGoNext
                                    ? 'border-gray-200 hover:border-red-500 hover:text-red-600 text-gray-700 cursor-pointer'
                                    : 'border-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                            title="Trang tiếp"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 transition-all">
                {visibleProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        title={product.title}
                        image={product.images[0]}
                        price={product.price}
                        marketPrice={product.marketPrice}
                        discountPercent={product.discountPercent}
                        badge={product.badge}
                        inStock={product.inStock}
                        link={`/product/${product.id}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default RelatedProducts;
