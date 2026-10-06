import { Link } from "react-router-dom";
import { SquarePen, Trash2 } from "lucide-react";
import type { BuilderProduct } from "../../../data/builderProducts";

interface SelectedItemProps {
    product?: BuilderProduct;
    quantity?: number;
    maxQuantity?: number;
    onQuantityChange?: (qty: number) => void;
    onChangeProduct?: () => void;
    onRemove?: () => void;
}

function SelectedItem({
    product,
    quantity = 1,
    maxQuantity = 99,
    onQuantityChange,
    onChangeProduct,
    onRemove,
}: SelectedItemProps) {
    const unitPrice = product?.price || 1690000;
    const title = product?.title || "CPU AMD Ryzen 5 3400G 3.7 GHz (4.2 GHz with boost) / 6MB / 4 cores 8 threads / Radeon Vega 11 / 65W)";
    const warranty = product?.warranty || "36 tháng";
    const stockStatus = product?.stockStatus || "Còn hàng";
    const stockQuantity = product?.stockQuantity;
    const productCode = product?.productCode || "CPU000109H";
    const image = product?.image || "src/assets/images/products/pc.jpg";
    const saleFrame = product?.saleFrame;
    const productId = product?.id;
    const productDetailUrl = productId ? `/product/${productId}` : "#";

    return (
        <div className="contain-item-drive flex items-center justify-between gap-3 w-full py-1">
            {/* Left: Product Thumbnail & Details */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <Link
                    to={productDetailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative h-[80px] w-[80px] shrink-0 border border-[#e1e1e1] flex items-center justify-center p-1 bg-white rounded-sm overflow-hidden block"
                >
                    <img src={image} alt={title} className="w-full h-full object-contain" />
                    {saleFrame && (
                        <span className="p-icon-holder absolute inset-0 w-full h-full leading-none">
                            <img
                                src={saleFrame}
                                alt="Sale Frame"
                                className="w-full h-full object-contain pointer-events-none"
                            />
                        </span>
                    )}
                </Link>

                <div className="name text-[14px] text-[#000] leading-snug">
                    <Link
                        to={productDetailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-black hover:text-[#0f5b99] transition-colors block mb-1"
                    >
                        {title}
                    </Link>
                    <div className="text-[13px] text-[#464646]">
                        Bảo hành: <span className="font-normal">{warranty}</span>
                    </div>
                    <div className="text-[13px] text-[#464646] mt-0.5">
                        Kho hàng: <span className="text-[#d00] font-medium">{stockStatus}{stockQuantity !== undefined ? ` (tồn: ${stockQuantity})` : ''}</span> | Mã SP: <span className="text-[#d00] font-medium">{productCode}</span>
                    </div>
                </div>
            </div>

            {/* Right: Price, Quantity & Actions */}
            <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="price text-[14px] font-bold text-[#333]">
                    {unitPrice.toLocaleString('vi-VN')}
                </span>
                <span className="text-gray-500 text-[14px] px-0.5">x</span>
                <div className="flex flex-col items-center">
                    <input
                        type="number"
                        min={1}
                        max={maxQuantity}
                        value={quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            const clamped = Math.max(1, Math.min(maxQuantity, val));
                            if (onQuantityChange) onQuantityChange(clamped);
                        }}
                        name="quantity"
                        id="quantity"
                        className="w-[48px] h-[28px] border border-gray-400 text-center text-sm font-semibold rounded-[2px] focus:outline-none focus:border-[#0f5b99]"
                    />
                    {maxQuantity < 99 && (
                        <span className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5" title={`Tối đa cho phép: ${maxQuantity}`}>
                            (Tối đa: {maxQuantity})
                        </span>
                    )}
                </div>
                <span className="text-gray-500 text-xs px-0.5">=</span>
                <span className="sum-price text-[14px] font-bold text-[#d00]">
                    {(unitPrice * quantity).toLocaleString('vi-VN')}
                </span>

                <div className="flex items-center gap-2.5 ml-3">
                    <button
                        type="button"
                        title="Sửa"
                        onClick={onChangeProduct}
                        className="btn-action text-[#0f5b99] hover:opacity-80 transition-opacity cursor-pointer p-0.5"
                    >
                        <SquarePen size={19} />
                    </button>
                    <button
                        type="button"
                        title="Xóa"
                        onClick={onRemove}
                        className="btn-action text-[#d00] hover:opacity-80 transition-opacity cursor-pointer p-0.5"
                    >
                        <Trash2 size={19} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SelectedItem;

