import React from 'react';
import { LayoutDashboard, Users, Package, ShoppingBag, BarChart3 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    return (
        <div className="max-w-[1250px] mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Trang Quản Trị (Admin Dashboard)</h1>
                    <p className="text-xs text-gray-500">Quản lý tổng quan hệ thống PCStore</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-blue-600">
                        <span className="text-xs font-semibold text-gray-500">Đơn Hàng</span>
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">128</p>
                    <span className="text-[11px] text-emerald-600 font-medium">+12% so với tháng trước</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-indigo-600">
                        <span className="text-xs font-semibold text-gray-500">Sản Phẩm</span>
                        <Package className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">1,450</p>
                    <span className="text-[11px] text-gray-400 font-medium">Đang kinh doanh</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-amber-600">
                        <span className="text-xs font-semibold text-gray-500">Khách Hàng</span>
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">3,820</p>
                    <span className="text-[11px] text-emerald-600 font-medium">+8% tài khoản mới</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-emerald-600">
                        <span className="text-xs font-semibold text-gray-500">Doanh Thu</span>
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">450.000.000đ</p>
                    <span className="text-[11px] text-emerald-600 font-medium">+15% tăng trưởng</span>
                </div>
            </div>

            {/* Dashboard Content Overview */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-gray-800 font-bold text-sm border-b pb-3 border-gray-100">
                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    <span>Tổng Quan Hệ Thống</span>
                </div>
                <p className="text-xs text-gray-600">
                    Chào mừng bạn đến với khu vực Quản trị viên. Bạn có thể mở rộng các chức năng quản lý sản phẩm, đơn hàng, người dùng và báo cáo tại đây.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboard;
