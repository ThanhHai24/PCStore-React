import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Header } from '../components/admin/header/header';
import { Sidebar } from '../components/admin/sidebar/sidebar';
import { ToastProvider } from '../components/admin/common/toast';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { canAccessAdminPath } from '../utils/rbac';

interface AdminLayoutProps {
    children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { user, token, refreshToken, loading } = useAuth();

    // 1. If user has neither token nor refresh token, immediately redirect to /login
    if (!token && !refreshToken) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    // 2. If user is authenticated as CUSTOMER (not admin/manager/staff), redirect to storefront
    if (user && user.role === 'CUSTOMER') {
        return <Navigate to="/" replace />;
    }

    // 3. If there is a refresh token but user state is recovering
    if (!user && (token || refreshToken)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-600">Đang xác thực quyền truy cập...</p>
                </div>
            </div>
        );
    }

    // 4. Role-based access check for specific admin routes
    const isAuthorizedRoute = user ? canAccessAdminPath(user.role, location.pathname) : true;

    return (
        <ToastProvider position="bottom-right" defaultDuration={4000}>
            <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex transition-colors font-sans">
                {/* Sidebar */}
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

                {/* Main Content Area */}
                <div
                    className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'
                        }`}
                >
                    {/* Header */}
                    <Header onToggleSidebar={() => setCollapsed(!collapsed)} />

                    {/* Main Body */}
                    <main className="flex-1 p-4 lg:p-8 overflow-x-hidden overflow-y-auto bg-[#F8FAFC] min-w-0">
                        <div className="w-full mx-auto space-y-6 min-w-0">
                            {isAuthorizedRoute ? (
                                children ?? <Outlet />
                            ) : (
                                <div className="max-w-lg mx-auto mt-12 bg-white border border-red-200 rounded-xl p-8 text-center shadow-sm space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                                        <ShieldAlert className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900">Không có quyền truy cập</h2>
                                    <p className="text-sm text-slate-600">
                                        Tài khoản của bạn ({user?.role}) không được cấp quyền truy cập chức năng này.
                                    </p>
                                    <div className="pt-2">
                                        <Link
                                            to="/admin"
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            Quay về Dashboard
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </ToastProvider>
    );
};

export default AdminLayout;

