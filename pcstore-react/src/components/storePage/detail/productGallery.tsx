import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface ProductGalleryProps {
    images: string[];
    title: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, title }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const currentImage = images[selectedIndex] || images[0];

    const handlePrev = () => {
        setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };


    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Upper Gallery Section (Thumbnails + Main Image) */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 relative w-full">
                {/* Left Thumbnail Column */}
                <div className="flex md:flex-col gap-2 shrink-0 overflow-x-auto md:overflow-y-auto max-h-[420px] py-1">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedIndex(idx)}
                            className={`w-14 h-14 rounded-lg border-2 p-1 bg-white overflow-hidden transition-all flex items-center justify-center ${selectedIndex === idx ? 'border-red-600 shadow-md' : 'border-gray-200 hover:border-gray-400'
                                }`}
                        >
                            <img src={img} alt={`${title} ${idx}`} className="max-h-full max-w-full object-contain" />
                        </button>
                    ))}
                </div>

                {/* Main Image Container */}
                <div className="relative flex-1 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-center min-h-[350px] sm:min-h-[420px] w-full group">
                    {/* Navigation Arrow Left */}
                    <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all z-10"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Main Image */}
                    <img
                        src={currentImage}
                        alt={title}
                        className="max-h-[380px] w-auto object-contain transition-all duration-300 transform group-hover:scale-105"
                    />

                    {/* Navigation Arrow Right */}
                    <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all z-10"
                        aria-label="Next image"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Lower Section (Chính sách mua hàng & Khách hàng vừa mua stacked vertically below Gallery) */}
            <div className="flex flex-col gap-3 w-full">
                {/* Chính sách mua hàng Box */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 w-full">
                    <h4 className="font-bold text-xs text-gray-900 uppercase">Chính sách mua hàng</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Cam kết giá tốt.</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Sản phẩm mới 100%.</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Lỗi 1 đổi 1 ngay lập tức.</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Hỗ trợ trả góp - Thủ tục nhanh gọn.</span>
                        </div>
                    </div>
                </div>

                {/* Khách hàng vừa mua notification banner */}
                {/* <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg font-medium w-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>
            <strong className="font-bold text-emerald-800">Khách hàng Hương (037 964 xxxx)</strong> Đã mua hàng 25 phút trước
          </span>
        </div> */}
            </div>
        </div>
    );
};


export default ProductGallery;
