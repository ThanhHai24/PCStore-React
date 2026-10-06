import React from 'react';
import type { Product } from '../../../types/product';
import { Link } from 'react-router-dom';

interface RecentlyViewedProps {
    products: Product[];
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ products }) => {
    if (!products || products.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <h3 className="font-bold text-xs text-gray-900 border-b border-gray-100 pb-2">
                    Sản phẩm đã xem
                </h3>
                <p className="text-xs text-gray-400 text-center py-4">Chưa có sản phẩm đã xem</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="font-bold text-xs text-gray-900 border-b border-gray-100 pb-2">
                Sản phẩm đã xem
            </h3>
            <div className="space-y-3">
                {products.slice(0, 4).map((item) => (
                    <Link
                        key={item.id}
                        to={`/product/${item.id}`}
                        className="flex items-center space-x-3 p-2 rounded-xl border border-gray-100 hover:border-red-200 transition-all group"
                    >
                        <div className="w-14 h-14 bg-gray-50 rounded-lg shrink-0 flex items-center justify-center p-1 overflow-hidden">
                            <img
                                src={item.images?.[0] || ''}
                                alt={item.title}
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-gray-800 truncate group-hover:text-red-600 transition-colors">
                                {item.title}
                            </h4>
                            <div className="text-xs font-extrabold text-red-600 mt-0.5">
                                {item.price}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default RecentlyViewed;
