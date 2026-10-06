import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { Product } from '../../../types/product';
import { mockProducts } from '../../../data/mockProducts';
import { useCart } from '../../../context/CartContext';
import { Scale, ArrowLeftRight } from 'lucide-react';
import CompareProductCard from '../../../components/storePage/compare/compareProductCard';
import CompareVsBadge from '../../../components/storePage/compare/compareVsBadge';
import CompareTable from '../../../components/storePage/compare/compareTable';

export const ProductCompare: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToCart } = useCart();

    const id1Param = searchParams.get('id1');
    const id2Param = searchParams.get('id2');

    const [product1, setProduct1] = useState<Product | null>(null);
    const [product2, setProduct2] = useState<Product | null>(null);
    const [loading1, setLoading1] = useState<boolean>(false);
    const [loading2, setLoading2] = useState<boolean>(false);

    // Load product 1 from static mockProducts
    useEffect(() => {
        setLoading1(true);
        const timer = setTimeout(() => {
            if (id1Param) {
                const found = mockProducts.find((p) => p.id === id1Param || p.id === `prod-${id1Param}`);
                setProduct1(found || mockProducts[0] || null);
            } else {
                setProduct1(mockProducts[0] || null);
            }
            setLoading1(false);
        }, 100);
        return () => clearTimeout(timer);
    }, [id1Param]);

    // Load product 2 from static mockProducts
    useEffect(() => {
        setLoading2(true);
        const timer = setTimeout(() => {
            if (id2Param) {
                const found = mockProducts.find((p) => p.id === id2Param || p.id === `prod-${id2Param}`);
                setProduct2(found || mockProducts[1] || null);
            } else {
                setProduct2(mockProducts[1] || mockProducts[0] || null);
            }
            setLoading2(false);
        }, 100);
        return () => clearTimeout(timer);
    }, [id2Param]);

    const updateUrlParams = (p1: Product | null, p2: Product | null) => {
        const params: { id1?: string; id2?: string } = {};
        if (p1) params.id1 = p1.id;
        if (p2) params.id2 = p2.id;
        setSearchParams(params);
    };

    const handleSelectProduct1 = (prod: Product) => {
        setProduct1(prod);
        updateUrlParams(prod, product2);
    };

    const handleSelectProduct2 = (prod: Product) => {
        setProduct2(prod);
        updateUrlParams(product1, prod);
    };

    const handleClearProduct1 = () => {
        setProduct1(null);
        updateUrlParams(null, product2);
    };

    const handleClearProduct2 = () => {
        setProduct2(null);
        updateUrlParams(product1, null);
    };

    const handleSwapProducts = () => {
        const temp = product1;
        setProduct1(product2);
        setProduct2(temp);
        updateUrlParams(product2, temp);
    };

    return (
        <div className="max-w-[1250px] mx-auto px-4 py-6 space-y-6">
            {/* Breadcrumb */}
            <nav className="text-xs text-gray-500 flex items-center space-x-1.5">
                <Link to="/" className="hover:text-blue-600 font-medium">Trang chủ</Link>
                <span>&gt;</span>
                <span className="text-gray-800 font-bold uppercase">SO SÁNH SẢN PHẨM</span>
            </nav>

            {/* Page Title Header */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg sm:text-xl font-black text-gray-900 flex items-center space-x-2">
                        <Scale className="w-6 h-6 text-blue-600" />
                        <span>So Sánh Cấu Hình & Thông Số Kỹ Thuật</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Nhập tên để chọn 2 sản phẩm bất kỳ từ hệ thống và đối chiếu thông số kỹ thuật chi tiết.
                    </p>
                </div>

                <Link
                    to="/products"
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-bold transition-colors w-fit flex items-center space-x-1.5"
                >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Chọn sản phẩm khác</span>
                </Link>
            </div>

            {/* Comparison Grid Header Cards */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-stretch border-b border-gray-200 pb-6">
                    {/* Product 1 Slot */}
                    <div className="md:col-span-5 flex flex-col">
                        <CompareProductCard
                            slotNumber={1}
                            product={product1}
                            loading={loading1}
                            onSelectProduct={handleSelectProduct1}
                            onClearProduct={handleClearProduct1}
                            onAddToCart={(p) => addToCart(p, 1)}
                        />
                    </div>

                    {/* Center VS Swap Badge */}
                    <div className="md:col-span-2 flex flex-col justify-center">
                        <CompareVsBadge
                            onSwap={handleSwapProducts}
                            disabled={!product1 && !product2}
                        />
                    </div>

                    {/* Product 2 Slot */}
                    <div className="md:col-span-5 flex flex-col">
                        <CompareProductCard
                            slotNumber={2}
                            product={product2}
                            loading={loading2}
                            onSelectProduct={handleSelectProduct2}
                            onClearProduct={handleClearProduct2}
                            onAddToCart={(p) => addToCart(p, 1)}
                        />
                    </div>
                </div>

                {/* Detailed Side-by-Side Specs Table */}
                <CompareTable product1={product1} product2={product2} />
            </div>
        </div>
    );
};

export default ProductCompare;
