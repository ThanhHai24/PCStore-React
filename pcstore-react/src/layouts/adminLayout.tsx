import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/admin/header/header';
import { Sidebar } from '../components/admin/sidebar/sidebar';

interface AdminLayoutProps {
    children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
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
    );
};

export default AdminLayout;
