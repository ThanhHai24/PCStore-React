import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductById, mockProducts } from '../../../data/mockProducts';
import type { Product } from '../../../types/product';
import ProductGallery from '../../../components/storePage/detail/productGallery';
import ProductInfo from '../../../components/storePage/detail/productInfo';
import RecentlyViewed from '../../../components/storePage/detail/recentlyViewed';
import RelatedProducts from '../../../components/storePage/detail/relatedProduct';
import ProductTabs from '../../../components/storePage/detail/productTabs';
import ProductReviews from '../../../components/storePage/detail/productReviews';
import { Loader2 } from 'lucide-react';
import { getRecentlyViewedProducts, addRecentlyViewedProduct } from '../../../utils/recentlyViewed';

export const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product>(() => getProductById(id));
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (product?.title) {
            document.title = `${product.title} | PC Store`;
        }
    }, [product?.title]);

    useEffect(() => {
        if (id) {
            // Lấy sản phẩm tĩnh từ mock data theo id
            const currentProd = getProductById(id);
            setProduct(currentProd);

            // Thêm sản phẩm hiện tại vào danh sách vừa xem
            addRecentlyViewedProduct(currentProd);

            // Lấy danh sách sản phẩm đã xem (loại trừ sản phẩm hiện tại)
            const recentList = getRecentlyViewedProducts().filter((p) => String(p.id) !== String(id));
            setRecentlyViewedProducts(recentList);

            // Lấy danh sách sản phẩm liên quan tĩnh
            const fallbackRel = mockProducts.filter((p) => String(p.id) !== String(currentProd.id));
            setRelatedProducts(fallbackRel);
        } else {
            const defaultProd = mockProducts[0];
            setProduct(defaultProd);
            setRelatedProducts(mockProducts.filter((p) => String(p.id) !== String(defaultProd.id)));
        }
        setLoading(false);
    }, [id]);

    if (loading && !product.title) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1250px] mx-auto px-4 py-4 sm:py-6 space-y-6">
            {/* Breadcrumb */}
            <nav className="text-xs text-gray-500 flex items-center space-x-1.5 flex-wrap">
                <Link to="/" className="hover:text-blue-600 font-medium">Trang chủ</Link>
                <span>&gt;</span>
                <Link to={`/category/${product.category}`} className="hover:text-blue-600 uppercase font-semibold text-gray-700">
                    {product.categoryName || 'PC GAMING'}
                </Link>
                <span>&gt;</span>
                <span className="text-gray-800 font-medium truncate max-w-md">{product.title}</span>
            </nav>

            {/* Main Top Grid (Gallery on Left, Info on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <div className="lg:col-span-6">
                    <ProductGallery images={product.images} title={product.title} />
                </div>
                <div className="lg:col-span-6">
                    <ProductInfo product={product} />
                </div>
            </div>

            {/* Middle Row (Related & Recently Viewed Products) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <RelatedProducts products={relatedProducts} />
                </div>
                <div className="lg:col-span-4">
                    <RecentlyViewed products={recentlyViewedProducts} />
                </div>
            </div>

            {/* Bottom Tabs Section (Thông số kỹ thuật / Mô tả sản phẩm) */}
            <div className="pt-2">
                <ProductTabs
                    specsTable={product.specsTable}
                    descriptionHtml={product.descriptionHtml}
                    categoryName={product.categoryName}
                />
            </div>

            {/* Product Reviews Section */}
            <div className="pt-2">
                <ProductReviews product={product} />
            </div>
        </div>
    );
};

export default ProductDetail;
