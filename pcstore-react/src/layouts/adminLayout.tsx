import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Header } from '../components/admin/header/header';
import { Sidebar } from '../components/admin/sidebar/sidebar';
import { ToastProvider } from '../components/admin/common/toast';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

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

    return (
        <ToastProvider position="bottom-right" defaultDuration={4000}>
            <div className="min-h-screen bg-gray-100 text-gray-900 flex transition-colors font-sans">
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
                    <main className="flex-1 p-4 lg:p-8 overflow-x-hidden overflow-y-auto bg-gray-100 min-w-0">
                        <div className="w-full mx-auto space-y-6 min-w-0">
                            {children ?? <Outlet />}
                        </div>
                    </main>
                </div>
            </div>
        </ToastProvider>
    );
};

export default AdminLayout;

