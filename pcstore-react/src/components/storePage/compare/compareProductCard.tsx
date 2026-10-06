import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Package, ShoppingCart, Loader2 } from 'lucide-react';
import type { Product } from '../../../types/product';
import { mockProducts } from '../../../data/mockProducts';

interface CompareProductCardProps {
    slotNumber: 1 | 2;
    product: Product | null;
    loading?: boolean;
    onSelectProduct: (product: Product) => void;
    onClearProduct: () => void;
    onAddToCart: (product: Product) => void;
}

export const CompareProductCard: React.FC<CompareProductCardProps> = ({
    slotNumber,
    product,
    loading = false,
    onSelectProduct,
    onClearProduct,
    onAddToCart,
}) => {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpenDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter static mockProducts when search query changes or dropdown opens
    useEffect(() => {
        if (!openDropdown) return;

        setIsSearching(true);
        const timer = setTimeout(() => {
            const query = search.trim().toLowerCase();
            const filtered = mockProducts.filter(
                (p) =>
                    !query ||
                    p.title.toLowerCase().includes(query) ||
                    p.id.toLowerCase().includes(query) ||
                    p.categoryName?.toLowerCase().includes(query)
            );
            setSearchResults(filtered);
            setIsSearching(false);
        }, 150);

        return () => clearTimeout(timer);
    }, [search, openDropdown]);

    const handleChoose = (p: Product) => {
        onSelectProduct(p);
        setOpenDropdown(false);
        setSearch('');
    };

    return (
        <div
            ref={containerRef}
            className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100 flex flex-col justify-between relative min-h-[220px]"
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-500 uppercase block">
                        SẢN PHẨM {slotNumber}:
                    </label>
                    {product && (
                        <button
                            onClick={onClearProduct}
                            className="text-[11px] text-red-600 hover:underline font-bold flex items-center space-x-0.5"
                        >
                            <X className="w-3 h-3" />
                            <span>Bỏ chọn</span>
                        </button>
                    )}
                </div>

                {/* Custom Search Input */}
                <div className="relative">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={search}
                            onFocus={() => setOpenDropdown(true)}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setOpenDropdown(true);
                            }}
                            placeholder={product ? product.title : `Nhập từ khóa tìm kiếm sản phẩm ${slotNumber}...`}
                            className="w-full border border-gray-300 rounded-xl py-2 pl-3 pr-8 text-xs font-medium bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-2.5 pointer-events-none" />
                        ) : (
                            <Search className="w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" />
                        )}
                    </div>

                    {/* Custom Floating Dropdown Menu with fixed height & scrolling */}
                    {openDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 max-h-[240px] overflow-y-auto divide-y divide-gray-100 p-1">
                            {isSearching ? (
                                <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center space-x-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span>Đang tìm kiếm sản phẩm...</span>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleChoose(p)}
                                        className="flex items-center space-x-3 p-2 hover:bg-blue-50/80 cursor-pointer rounded-lg transition-colors group"
                                    >
                                        <img
                                            src={p.images[0]}
                                            alt={p.title}
                                            className="w-10 h-10 object-contain rounded bg-gray-50 p-0.5 border border-gray-200 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-gray-800 group-hover:text-blue-600 truncate">
                                                {p.title}
                                            </h4>
                                            <span className="text-[11px] font-extrabold text-red-600 block">
                                                {p.price}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-3 text-center text-xs text-gray-400 font-medium">
                                    Không tìm thấy sản phẩm phù hợp
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Selected Product Card / Loading / Empty State */}
                {loading ? (
                    <div className="flex items-center justify-center py-8 space-x-2 text-xs text-gray-500">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <span>Đang tải thông tin sản phẩm...</span>
                    </div>
                ) : product ? (
                    <div className="flex items-center space-x-3 pt-2">
                        <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-20 h-20 object-contain bg-white rounded-lg p-1 border border-gray-200 shrink-0"
                        />
                        <div>
                            <h3 className="text-xs font-bold text-gray-900 line-clamp-2">{product.title}</h3>
                            <div className="text-sm font-extrabold text-red-600 mt-1">{product.price}</div>
                            <span className="text-[10px] text-emerald-600 font-bold">
                                {product.inStock ? 'Còn hàng' : 'Hết hàng'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center space-y-2 bg-white/50">
                        <Package className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="text-xs text-gray-400 font-bold">Chưa chọn sản phẩm {slotNumber}</p>
                        <p className="text-[11px] text-gray-400">Gõ tên sản phẩm vào ô tìm kiếm ở trên để chọn</p>
                    </div>
                )}
            </div>

            {product && !loading && (
                <button
                    onClick={() => onAddToCart(product)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow transition-colors mt-2"
                >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Thêm vào giỏ</span>
                </button>
            )}
        </div>
    );
};

export default CompareProductCard;
