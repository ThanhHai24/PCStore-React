import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { SpecItem } from '../../../types/product';
import { detectCategoryType } from '../../../config/specDefinitions';

interface ProductTabsProps {
    specsTable: SpecItem[];
    descriptionHtml?: string;
    categoryName?: string;
}

export const ProductTabs: React.FC<ProductTabsProps> = ({
    specsTable,
    descriptionHtml,
    categoryName = 'PC',
}) => {
    const [activeTab, setActiveTab] = useState<'specs' | 'desc'>('specs');
    const [isExpanded, setIsExpanded] = useState(false);

    const categoryType = detectCategoryType(categoryName);
    const isPcBuild = categoryType === 'PC' || specsTable.some((s) => s.productId);

    return (
        <div className="space-y-4">
            {/* Tabs Header Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl">
                <button
                    onClick={() => {
                        setActiveTab('specs');
                        setIsExpanded(false);
                    }}
                    className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all border ${activeTab === 'specs'
                        ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    Thông số kỹ thuật {categoryType !== 'Generic' && `(${categoryType})`}
                </button>
                <button
                    onClick={() => {
                        setActiveTab('desc');
                        setIsExpanded(false);
                    }}
                    className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all border ${activeTab === 'desc'
                        ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    Mô tả sản phẩm
                </button>
            </div>

            {/* Tab Content Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
                {/* Collapsible Content Wrapper */}
                <div className={`transition-all duration-300 relative ${!isExpanded ? 'max-h-[380px] overflow-hidden' : ''}`}>
                    {activeTab === 'specs' ? (
                        <div className="overflow-x-auto">
                            {isPcBuild ? (
                                /* PC Build Specifications Table (3 columns) */
                                <table className="w-full text-xs sm:text-sm border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-800 font-bold uppercase tracking-wider text-center">
                                            <th className="border border-gray-300 px-3 py-3 w-20 sm:w-28">MÃ</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center">TÊN LINH KIỆN</th>
                                            <th className="border border-gray-300 px-3 py-3 w-24 sm:w-32">BẢO HÀNH</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {specsTable.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="border border-gray-300 px-3 py-3 font-bold text-gray-800 text-center uppercase">
                                                    {item.key}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-red-600 font-semibold text-center leading-relaxed">
                                                    {item.productId ? (
                                                        <Link
                                                            to={`/product/${item.productId}`}
                                                            className="text-red-600 hover:text-blue-600 hover:underline transition-colors font-semibold flex items-center justify-center gap-1"
                                                        >
                                                            <span>{item.name}</span>
                                                            <span className="text-[10px] text-blue-500 font-normal bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                                                                Xem chi tiết ↗
                                                            </span>
                                                        </Link>
                                                    ) : (
                                                        item.name
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-3 text-gray-700 font-medium text-center">
                                                    {item.warranty || 'Chính hãng'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                /* Standalone Component Specifications Table (2 columns: Key - Value) */
                                <table className="w-full text-xs sm:text-sm border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-800 font-bold uppercase tracking-wider">
                                            <th className="border border-gray-300 px-4 py-3 text-left w-1/3">THÔNG SỐ KỸ THUẬT</th>
                                            <th className="border border-gray-300 px-4 py-3 text-left">GIÁ TRỊ CHI TIẾT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {specsTable.map((item, index) => (
                                            <tr
                                                key={index}
                                                className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'}
                                            >
                                                <td className="border border-gray-300 px-4 py-3 font-bold text-gray-900 uppercase">
                                                    {item.key}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-gray-800 font-medium text-center leading-relaxed">
                                                    {item.name}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : (
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                            {descriptionHtml ? (
                                <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                            ) : (
                                <p className="text-gray-500 italic">Đang cập nhật bài viết mô tả cho sản phẩm này...</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Gradient Blur Overlay when Collapsed */}
                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-10" />
                )}

                {/* Expand / Collapse Toggle Button */}
                <div className="flex justify-center pt-4 relative z-20">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="bg-white border border-blue-500 hover:bg-blue-50 text-blue-600 font-extrabold text-xs py-2.5 px-6 rounded-full shadow-md flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95"
                    >
                        <span>{isExpanded ? 'Thu gọn nội dung' : 'Xem thêm nội dung'}</span>
                        <ChevronDown
                            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductTabs;
