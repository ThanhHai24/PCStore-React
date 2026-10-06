import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
    return (
        <div className="max-w-[1250px] mx-auto px-4 py-16 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">404 - Không Tìm Thấy Trang</h1>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
                Trang bạn đang truy cập không tồn tại hoặc đã được di chuyển. Vui lòng kiểm tra lại đường dẫn!
            </p>
            <div>
                <Link
                    to="/"
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-colors"
                >
                    <Home className="w-4 h-4" />
                    <span>Về trang chủ</span>
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
