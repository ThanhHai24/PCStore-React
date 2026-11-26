import React, { useState, useEffect } from 'react';
import type { Product } from '../../../types/product';
import ProductCard from '../boxProductCategory/productCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RelatedProductsProps {
    products: Product[];
    frequentlyBoughtTogether?: Product[];
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({
    products,
    frequentlyBoughtTogether = [],
}) => {
    const [activeTab, setActiveTab] = useState<'similar' | 'fbt'>('similar');
    const [startIndex, setStartIndex] = useState<number>(0);
    const itemsPerPage = 4;

    const hasSimilar = products && products.length > 0;
    const hasFbt = frequentlyBoughtTogether && frequentlyBoughtTogether.length > 0;

    useEffect(() => {
        setStartIndex(0);
        if (!hasSimilar && hasFbt) {
            setActiveTab('fbt');
        } else if (hasSimilar && !hasFbt) {
            setActiveTab('similar');
        }
    }, [products, frequentlyBoughtTogether, hasSimilar, hasFbt]);

    if (!hasSimilar && !hasFbt) return null;

    const activeProducts =
        activeTab === 'fbt' && hasFbt ? frequentlyBoughtTogether : products;

    const handleTabChange = (tab: 'similar' | 'fbt') => {
        setActiveTab(tab);
        setStartIndex(0);
    };

    const handlePrev = () => {
        setStartIndex((prev) => Math.max(0, prev - itemsPerPage));
    };

    const handleNext = () => {
        setStartIndex((prev) =>
            prev + itemsPerPage < activeProducts.length ? prev + itemsPerPage : prev
        );
    };

    const visibleProducts = activeProducts.slice(startIndex, startIndex + itemsPerPage);
    const canGoPrev = startIndex > 0;
    const canGoNext = startIndex + itemsPerPage < activeProducts.length;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h3 className="font-bold text-base text-gray-900">Sản phẩm liên quan</h3>
                    {hasSimilar && hasFbt && (
                        <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => handleTabChange('similar')}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                    activeTab === 'similar'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Tương tự
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('fbt')}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                    activeTab === 'fbt'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Thường mua cùng
                            </button>
                        </div>
                    )}
                </div>
                {activeProducts.length > itemsPerPage && (
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
