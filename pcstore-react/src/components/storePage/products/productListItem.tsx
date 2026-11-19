import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ShoppingCart, Tag, Layers, ArrowRight } from 'lucide-react';
import type { ProductResponse } from '../../../types/adminProduct';
import type { Product } from '../../../types/product';
import {
  formatProductToCardProps,
  parseSpecsTable,
} from '../../../services/productService';
import { useCart } from '../../../context/CartContext';
import defaultPcImg from '../../../assets/images/products/pc.jpg';

interface ProductListItemProps {
  product: ProductResponse;
  categoryName?: string;
  brandName?: string;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  categoryName,
  brandName,
}) => {
  const { addToCart } = useCart();
  const card = formatProductToCardProps(product);
  const specs = parseSpecsTable(product.specification, product.name).slice(0, 4);
  const targetLink = card.link || `/product/${product.id}`;

  const handleQuickAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!card.inStock) return;

    const numericPrice = product.price != null ? Number(product.price) : 0;
    const productObj: Product = {
      id: String(product.id),
      title: product.name,
      images: [card.image || defaultPcImg],
      price: card.price,
      numericPrice,
      marketPrice: card.marketPrice,
      discountPercent: card.discountPercent,
      badge: card.badge,
      inStock: card.inStock ?? true,
      stockQuantity: 15,
      warrantyInfo: '36 Tháng',
      rating: 5,
      reviewCount: 10,
      viewCount: 100,
      commentCount: 5,
      purchaseCount: 20,
      promotions: typeof card.promotion === 'string' ? [card.promotion] : [],
      specsTable: specs,
    };

    addToCart(productObj, 1);
  };

  return (
    <div className="group/list relative flex flex-col sm:flex-row gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
      {/* Top Left Badge */}
      {card.badge && (
        <div className="absolute top-0 left-3 z-10">
          <div
            className="bg-[#be1f2d] text-white text-[10px] font-extrabold pt-1 pb-2 px-1.5 shadow-sm flex items-center justify-center min-w-[28px] tracking-wider uppercase"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
            }}
          >
            {card.badge}
          </div>
        </div>
      )}

      {/* Image */}
      <Link
        to={targetLink}
        className="w-full sm:w-44 h-44 shrink-0 bg-gray-50/70 rounded-lg border border-gray-100 flex items-center justify-center p-3 overflow-hidden"
      >
        <img
          src={card.image || defaultPcImg}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = defaultPcImg;
          }}
          className="max-h-full max-w-full object-contain group-hover/list:scale-105 transition-transform duration-300"
        />
      </Link>

      {/* Center Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="space-y-1.5">
          {/* Meta Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {product.code && (
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                Mã: {product.code}
              </span>
            )}
            {brandName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                <Tag className="w-3 h-3" />
                {brandName}
              </span>
            )}
            {categoryName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                <Layers className="w-3 h-3" />
                {categoryName}
              </span>
            )}
          </div>

          <Link to={targetLink} className="block">
            <h3 className="text-base font-bold text-gray-900 group-hover/list:text-blue-600 transition-colors line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Specs Preview */}
          {specs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs text-gray-600">
              {specs.map((sp, idx) => (
                <div key={idx} className="flex items-start gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span className="truncate">
                    <span className="font-semibold text-gray-700">{sp.key}:</span> {sp.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1 text-xs">
          <div
            className={`inline-flex items-center gap-1 font-semibold ${
              card.inStock ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{card.inStock ? 'Còn hàng' : 'Hết hàng'}</span>
          </div>
          {typeof card.promotion === 'string' && (
            <span className="text-gray-500 truncate hidden md:inline">• {card.promotion}</span>
          )}
        </div>
      </div>

      {/* Right Price & Actions */}
      <div className="sm:w-52 shrink-0 flex sm:flex-col justify-between sm:items-end border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4 gap-3">
        <div className="sm:text-right">
          <div className="flex sm:justify-end items-center gap-1.5 min-h-[20px]">
            {card.marketPrice && card.marketPrice !== card.price && (
              <span className="text-xs text-gray-400 line-through">{card.marketPrice}</span>
            )}
            {card.discountPercent && (
              <span className="bg-[#be1f2d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {card.discountPercent}
              </span>
            )}
          </div>
          <div className="text-[#d02c2c] text-xl font-extrabold tracking-tight mt-0.5">
            {card.price}
          </div>
        </div>

        <div className="flex sm:flex-col gap-2 w-auto sm:w-full">
          <button
            type="button"
            onClick={handleQuickAddToCart}
            disabled={!card.inStock}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              card.inStock
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-95 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{card.inStock ? 'Thêm vào giỏ' : 'Hết hàng'}</span>
          </button>
          <Link
            to={targetLink}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
          >
            <span>Chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductListItem;
