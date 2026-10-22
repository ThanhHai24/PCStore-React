import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    getProductById,
    getProductBySlug,
    getProducts,
    formatProductToDetail,
} from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { brandService } from '../../../services/brandService';
import type { Product } from '../../../types/product';
import type { ProductResponse } from '../../../types/adminProduct';
import ProductGallery from '../../../components/storePage/detail/productGallery';
import ProductInfo from '../../../components/storePage/detail/productInfo';
import RecentlyViewed from '../../../components/storePage/detail/recentlyViewed';
import RelatedProducts from '../../../components/storePage/detail/relatedProduct';
import ProductTabs from '../../../components/storePage/detail/productTabs';
import ProductReviews from '../../../components/storePage/detail/productReviews';
import { Loader2, AlertCircle } from 'lucide-react';
import { getRecentlyViewedProducts, addRecentlyViewedProduct } from '../../../utils/recentlyViewed';

export const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (product?.title) {
            document.title = `${product.title} | PC Store`;
        }
    }, [product?.title]);

    useEffect(() => {
        let isMounted = true;

        async function fetchDetailData() {
            setLoading(true);
            setError(null);

            try {
                // 1. Lấy thông tin danh mục và thương hiệu để map tên hiển thị
                const [categoriesRes, brandsRes] = await Promise.allSettled([
                    categoryService.getCategories(),
                    brandService.getBrands(),
                ]);

                const categoryMap = new Map<number, { name: string; slug: string }>();
                if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.content) {
                    categoriesRes.value.content.forEach((cat) => {
                        categoryMap.set(cat.id, { name: cat.name, slug: cat.slug });
                    });
                }

                const brandMap = new Map<number, string>();
                if (brandsRes.status === 'fulfilled' && brandsRes.value?.content) {
                    brandsRes.value.content.forEach((b) => {
                        brandMap.set(b.id, b.name);
                    });
                }

                // 2. Lấy dữ liệu sản phẩm từ API theo ID hoặc Slug
                let rawProduct: ProductResponse | null = null;

                if (id) {
                    const isPureNumber = /^\d+$/.test(id.trim());
                    if (isPureNumber) {
                        try {
                            rawProduct = await getProductById(id.trim());
                        } catch {
                            // Nếu id là số nhưng không tìm thấy, thử tìm theo slug
                            rawProduct = await getProductBySlug(id.trim()).catch(() => null);
                        }
                    } else {
                        // Thử tìm theo slug trước, nếu không được thử theo id
                        try {
                            rawProduct = await getProductBySlug(id.trim());
                        } catch {
                            rawProduct = await getProductById(id.trim()).catch(() => null);
                        }
                    }
                } else {
                    // Nếu truy cập /product không có id: lấy sản phẩm mới nhất
                    const listRes = await getProducts({ size: 1, sort: ['id,desc'] });
                    if (listRes.content && listRes.content.length > 0) {
                        rawProduct = listRes.content[0];
                    }
                }

                if (!rawProduct) {
                    throw new Error('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.');
                }

                if (!isMounted) return;

                const catInfo = rawProduct.primaryCategoryId ? categoryMap.get(rawProduct.primaryCategoryId) : undefined;
                const brandName = rawProduct.brandId ? brandMap.get(rawProduct.brandId) : undefined;

                const formattedProduct = formatProductToDetail(
                    rawProduct,
                    catInfo?.name,
                    brandName
                );

                if (catInfo?.slug) {
                    formattedProduct.category = catInfo.slug;
                }

                setProduct(formattedProduct);

                // Thêm vào danh sách sản phẩm vừa xem
                addRecentlyViewedProduct(formattedProduct);

                // Cập nhật danh sách vừa xem (loại trừ sản phẩm đang hiển thị)
                const recentList = getRecentlyViewedProducts().filter(
                    (p) => String(p.id) !== String(formattedProduct.id)
                );
                setRecentlyViewedProducts(recentList);

                // 3. Lấy danh sách sản phẩm liên quan từ API
                try {
                    const relParams: any = { size: 9, sort: ['id,desc'] };
                    if (rawProduct.primaryCategoryId) {
                        relParams.categoryId = rawProduct.primaryCategoryId;
                    } else if (rawProduct.productType) {
                        relParams.productType = rawProduct.productType;
                    }

                    const relRes = await getProducts(relParams);
                    let relList = (relRes.content || []).filter(
                        (p) => String(p.id) !== String(rawProduct.id)
                    );

                    // Nếu không đủ 4 sản phẩm cùng danh mục, lấy thêm sản phẩm chung từ API
                    if (relList.length < 4) {
                        const fallbackRes = await getProducts({ size: 9, sort: ['id,desc'] });
                        const fallbackList = (fallbackRes.content || []).filter(
                            (p) => String(p.id) !== String(rawProduct.id) && !relList.some((r) => r.id === p.id)
                        );
                        relList = [...relList, ...fallbackList];
                    }

                    const mappedRelated = relList.slice(0, 8).map((p) => {
                        const pCat = p.primaryCategoryId ? categoryMap.get(p.primaryCategoryId) : undefined;
                        const pBrand = p.brandId ? brandMap.get(p.brandId) : undefined;
                        return formatProductToDetail(p, pCat?.name, pBrand);
                    });

                    if (isMounted) {
                        setRelatedProducts(mappedRelated);
                    }
                } catch (relErr) {
                    console.warn('Lỗi tải sản phẩm liên quan từ API:', relErr);
                }

            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Lỗi khi tải thông tin sản phẩm từ máy chủ.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchDetailData();

        return () => {
            isMounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-gray-500">Đang tải thông tin sản phẩm...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="max-w-[1250px] mx-auto px-4 py-16 text-center space-y-4">
                <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Không tìm thấy sản phẩm</h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                    {error || 'Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã ngừng kinh doanh.'}
                </p>
                <div className="pt-2">
                    <Link
                        to="/"
                        className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Quay lại trang chủ
                    </Link>
                </div>
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
                    {product.categoryName || 'SẢN PHẨM'}
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
