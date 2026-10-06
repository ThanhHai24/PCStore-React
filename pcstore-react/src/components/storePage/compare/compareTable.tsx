import React, { useMemo } from 'react';
import type { Product } from '../../../types/product';

interface CompareTableProps {
    product1: Product | null;
    product2: Product | null;
}

export const CompareTable: React.FC<CompareTableProps> = ({ product1, product2 }) => {
    // Collect unique spec keys from selected products
    const allSpecKeys = useMemo(() => {
        const keysSet = new Set<string>();
        if (product1) product1.specsTable.forEach((item) => keysSet.add(item.key));
        if (product2) product2.specsTable.forEach((item) => keysSet.add(item.key));
        return Array.from(keysSet);
    }, [product1, product2]);

    const getSpecValue = (prod: Product | null, key: string) => {
        if (!prod) return '---';
        const item = prod.specsTable.find((s) => s.key === key);
        if (!item) return '---';
        if (item.warranty && item.warranty !== 'Chính hãng') {
            return `${item.name} (Bảo hành: ${item.warranty})`;
        }
        return item.name;
    };

    const isCategoryMismatch =
        product1 &&
        product2 &&
        product1.categoryName &&
        product2.categoryName &&
        product1.categoryName.toLowerCase() !== product2.categoryName.toLowerCase();

    return (
        <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                    Bảng so sánh thông số chi tiết
                </h2>
                {isCategoryMismatch && (
                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-medium">
                        💡 <strong>Khác danh mục:</strong> {product1.categoryName} vs {product2.categoryName}
                    </span>
                )}
            </div>


            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-gray-800 font-bold uppercase">
                            <th className="border border-gray-200 p-3 w-1/4 text-left">THÔNG SỐ</th>
                            <th className="border border-gray-200 p-3 w-3/8 text-center text-blue-700">
                                {product1 ? product1.title : 'Sản phẩm 1 (Trống)'}
                            </th>
                            <th className="border border-gray-200 p-3 w-3/8 text-center text-blue-700">
                                {product2 ? product2.title : 'Sản phẩm 2 (Trống)'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Price comparison row */}
                        <tr className="hover:bg-gray-50">
                            <td className="border border-gray-200 p-3 font-bold text-gray-800">Giá niêm yết</td>
                            <td className="border border-gray-200 p-3 text-center font-extrabold text-red-600 text-sm">
                                {product1 ? product1.price : '---'}
                            </td>
                            <td className="border border-gray-200 p-3 text-center font-extrabold text-red-600 text-sm">
                                {product2 ? product2.price : '---'}
                            </td>
                        </tr>

                        {/* Warranty info row */}
                        <tr className="hover:bg-gray-50">
                            <td className="border border-gray-200 p-3 font-bold text-gray-800">Bảo hành tổng thể</td>
                            <td className="border border-gray-200 p-3 text-center font-semibold text-gray-700">
                                {product1 ? product1.warrantyInfo : '---'}
                            </td>
                            <td className="border border-gray-200 p-3 text-center font-semibold text-gray-700">
                                {product2 ? product2.warrantyInfo : '---'}
                            </td>
                        </tr>

                        {/* Dynamic Spec Rows */}
                        {allSpecKeys.length > 0 ? (
                            allSpecKeys.map((key) => {
                                const val1 = getSpecValue(product1, key);
                                const val2 = getSpecValue(product2, key);
                                const isDifferent = product1 && product2 && val1 !== val2;

                                return (
                                    <tr key={key} className={isDifferent ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50'}>
                                        <td className="border border-gray-200 p-3 font-bold text-gray-900 uppercase">
                                            {key}
                                        </td>
                                        <td className="border border-gray-200 p-3 text-center text-gray-800 font-medium leading-relaxed">
                                            {val1}
                                        </td>
                                        <td className="border border-gray-200 p-3 text-center text-gray-800 font-medium leading-relaxed">
                                            {val2}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-gray-400 font-medium italic border border-gray-200">
                                    Vui lòng nhập tên và chọn ít nhất 1 sản phẩm ở trên để hiển thị bảng so sánh thông số chi tiết.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CompareTable;
