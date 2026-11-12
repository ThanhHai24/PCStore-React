import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    LogOut,
    Menu,
    SlidersHorizontal,
    User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NotificationBell } from './notificationBell';

interface HeaderProps {
    onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-30 h-16 bg-[linear-gradient(180deg,#2E9BFB_0%,#1D52E7_100%)] text-white shadow-md px-4 lg:px-8 flex items-center justify-between">
            {/* Left side: Mobile/Desktop menu toggle */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors focus:outline-none"
                    title="Toggle Sidebar"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Right side: Storefront Link & Dropdowns */}
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Notification Dropdown (Prompt 074) */}
                <NotificationBell />

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowUserMenu(!showUserMenu);
                        }}
                        className="flex items-center gap-2 p-1 bg-white/15 hover:bg-white/25 rounded-full border border-white/30 transition-colors"
                    >
                        <img
                            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                            alt="Admin Profile"
                            className="w-7 h-7 rounded-full object-cover border border-white"
                        />
                        <ChevronDown className="w-3.5 h-3.5 text-white pr-1" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-2.5 border-b border-gray-100">
                                <p className="text-xs font-bold text-gray-900">{user?.fullName || 'Admin PCStore'}</p>
                                <p className="text-[11px] text-gray-500">{user?.email || 'admin@pcstore.com'}</p>
                                {user?.role && (
                                    <span className="inline-block mt-1 text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                        {user.role}
                                    </span>
                                )}
                            </div>
                            <div className="py-1">
                                <Link
                                    to="/admin/settings"
                                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                    <span>Hồ sơ cá nhân</span>
                                </Link>
                                <Link
                                    to="/admin/settings"
                                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                                    <span>Cấu hình hệ thống</span>
                                </Link>
                            </div>
                            <div className="border-t border-gray-100 pt-1">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};