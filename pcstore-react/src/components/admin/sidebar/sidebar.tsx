import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    FolderTree,
    Award,
    Building2,
    ShieldCheck,
    Globe,
    ChevronDown,
    ChevronRight,
    UserCheck,
    User,
    CreditCard,
    FileText,
    PcCase,
    Ticket,
    Import,
    RotateCcw,
    Barcode,
    Box,
    Truck,
    Receipt,
    FileCheck,
    ClipboardList,
    Wrench,
    History,
    Component,
    PackageCheck,
    BarChart3,
    DollarSign,
    ShoppingBag,
    PieChart,
    TrendingUp,
    LineChart,
    FileSpreadsheet,
    Boxes,
    PackageSearch,
    ArrowLeftRight,
    Coins,
    AlertTriangle,
    Sparkles,
    Activity,
    Settings,
    Layers,
    Download,
    Warehouse,
} from 'lucide-react';

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

interface NavSubItem {
    path: string;
    label: string;
    icon?: React.ElementType;
    exact?: boolean;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    path?: string;
    exact?: boolean;
    children?: NavSubItem[];
}

const navItems: NavItem[] = [
    {
        id: 'dashboard',
        path: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        exact: true,
    },
    {
        id: 'system',
        label: 'Quản trị hệ thống',
        icon: Settings,
        children: [
            { path: '/admin/users', label: 'Quản lý tài khoản', icon: User },
            { path: '/admin/payment', label: 'Quản lý thanh toán', icon: CreditCard },
            { path: '/admin/logs', label: 'Nhật ký hệ thống', icon: FileText },

        ],
    },
    {
        id: 'product',
        label: 'Quản lý danh mục và sản phẩm',
        icon: Layers,
        children: [
            { path: '/admin/product', label: 'Quản lý sản phẩm', icon: Package },
            { path: '/admin/brand', label: 'Quản lý thương hiệu', icon: Award },
            { path: '/admin/category', label: 'Quản lý danh mục', icon: FolderTree },
            { path: '/admin/pcconfig', label: 'Quản lý cấu hình PC', icon: PcCase },

        ],
    },
    {
        id: 'procurement',
        label: 'Quản lý nhập hàng',
        icon: Download,
        children: [
            { path: '/admin/supplier', label: 'Quản lý NCC', icon: Building2 },
            { path: '/admin/import', label: 'Quản lý đơn nhập hàng', icon: Package },
            { path: '/admin/import-ticket', label: 'Quản lý phiếu nhập hàng', icon: Ticket },
        ],
    },
    {
        id: 'warehouse',
        label: 'Quản lý kho',
        icon: Warehouse,
        children: [
            { path: '/admin/warehouse/inbound', label: 'Quản lý nhập kho', icon: Import },
            { path: '/admin/warehouse/supplier-returns', label: 'Quản lý hoàn trả hàng lỗi', icon: RotateCcw },
            { path: '/admin/warehouse/inventory', label: 'Quản lý sản phẩm kho', icon: Package },
            { path: '/admin/warehouse/serials', label: 'Quản lý Serial', icon: Barcode },
            { path: '/admin/warehouse/packaging', label: 'Quản lý đóng gói hàng', icon: Box },
            { path: '/admin/warehouse/handover', label: 'Quản lý đơn bàn giao', icon: Truck },
        ],
    },
    {
        id: 'sales',
        label: 'Quản lý bán hàng',
        icon: ShoppingCart,
        children: [
            { path: '/admin/sales/orders', label: 'Quản lý đơn hàng', icon: ShoppingCart },
            { path: '/admin/sales/invoices', label: 'Quản lý hóa đơn', icon: Receipt },
            { path: '/admin/sales/customers', label: 'Quản lý khách hàng', icon: Users },
        ],
    },
    {
        id: 'warranty',
        label: 'Quản lý bảo hành và dịch vụ kỹ thuật',
        icon: ShieldCheck,
        children: [
            { path: '/admin/warranty/policies', label: 'Quản lý chính sách bảo hành', icon: FileCheck },
            { path: '/admin/warranty/products', label: 'Quản lý bảo hành sản phẩm', icon: ShieldCheck },
            { path: '/admin/warranty/requests', label: 'Quản lý yêu cầu bảo hành', icon: ClipboardList },
            { path: '/admin/warranty/technical-handling', label: 'Quản lý thông tin xử lý kỹ thuật', icon: Wrench },
            { path: '/admin/warranty/spare-parts', label: 'Quản lý linh kiện thay thế', icon: Component },
            { path: '/admin/warranty/history', label: 'Lịch sử bảo hành', icon: History },
        ],
    },
    {
        id: 'shipping',
        label: 'Quản lý giao hàng và đổi trả',
        icon: Truck,
        children: [
            {
                path: '/admin/shipping/deliveries',
                label: 'Quản lý đơn giao hàng',
                icon: PackageCheck
            },
            {
                path: '/admin/shipping/customer-returns',
                label: 'Quản lý đổi trả',
                icon: RotateCcw
            },
        ]
    },
    {
        id: 'sales-reports',
        label: 'Báo cáo bán hàng',
        icon: BarChart3,
        children: [
            { path: '/admin/reports/sales/revenue', label: 'Báo cáo doanh thu', icon: DollarSign },
            { path: '/admin/reports/sales/orders', label: 'Tình hình đơn hàng', icon: ShoppingBag },
            { path: '/admin/reports/sales/structure', label: 'Cơ cấu doanh thu sản phẩm', icon: PieChart },
            { path: '/admin/reports/sales/gross-profit', label: 'Lợi nhuận gộp', icon: TrendingUp },
            { path: '/admin/reports/sales/trends', label: 'Biểu đồ xu hướng', icon: LineChart },
            { path: '/admin/reports/sales/export', label: 'Xuất file báo cáo', icon: FileSpreadsheet },
        ]
    },
    {
        id: 'inventory-reports',
        label: 'Báo cáo tồn kho',
        icon: Boxes,
        children: [
            { path: '/admin/reports/inventory/stock', label: 'Báo cáo tồn kho', icon: PackageSearch },
            { path: '/admin/reports/inventory/movements', label: 'Biến động tồn kho', icon: ArrowLeftRight },
            { path: '/admin/reports/inventory/valuation', label: 'Giá trị hàng tồn kho', icon: Coins },
            { path: '/admin/reports/inventory/alerts', label: 'Cảnh báo tồn kho', icon: AlertTriangle },
            { path: '/admin/reports/inventory/export', label: 'Xuất báo cáo tồn kho', icon: FileSpreadsheet },
        ]
    },
    {
        id: 'customer-analytics',
        label: 'Phân tích hành vi khách hàng',
        icon: Users,
        children: [
            { path: '/admin/analytics/customers/purchasing-behavior', label: 'Dữ liệu hành vi mua sắm', icon: Activity },
            { path: '/admin/analytics/customers/spending-metrics', label: 'Chỉ số khách hàng', icon: UserCheck },
            { path: '/admin/analytics/customers/shopping-habits', label: 'Thói quen mua sắm', icon: Sparkles },
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
    const location = useLocation();
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

    // Auto expand parent menu if child path is active
    useEffect(() => {
        const newOpenState: Record<string, boolean> = { ...openSubmenus };
        navItems.forEach((item) => {
            if (item.children) {
                const hasActiveChild = item.children.some(
                    (sub) => location.pathname === sub.path || (sub.exact ? location.pathname === sub.path : location.pathname.startsWith(sub.path))
                );
                if (hasActiveChild) {
                    newOpenState[item.id] = true;
                }
            }
        });
        setOpenSubmenus(newOpenState);
    }, [location.pathname]);

    const toggleSubmenu = (id: string) => {
        if (collapsed && onToggle) {
            onToggle();
        }
        setOpenSubmenus((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    return (
        <aside
            className={`fixed top-0 left-0 bottom-0 bg-white border-r border-gray-200 z-40 transition-all duration-300 flex flex-col ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Brand Header */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[linear-gradient(180deg,#2E9BFB_0%,#1D52E7_100%)] flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0">
                        PC
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 whitespace-nowrap">
                            <h2 className="text-sm font-bold text-gray-900 leading-tight">PC Store</h2>
                            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-blue-600" /> Admin Portal
                            </span>
                        </div>
                    )}
                </div>
                <div className="w-6" />
            </div>

            {/* Navigation list */}
            <div className="flex-1 py-4 px-3 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        // 1-Level Item (Single Link)
                        if (!item.children && item.path) {
                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    end={item.exact}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                                            ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    {!collapsed && <span className="truncate">{item.label}</span>}
                                </NavLink>
                            );
                        }

                        // 2-Level Parent Item (Submenu Accordion)
                        const isOpen = !!openSubmenus[item.id];
                        const isChildActive = item.children?.some(
                            (sub) => location.pathname === sub.path || (sub.exact ? location.pathname === sub.path : location.pathname.startsWith(sub.path))
                        );

                        return (
                            <div key={item.id} className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => toggleSubmenu(item.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${isChildActive
                                        ? 'bg-blue-50/70 text-blue-600 font-bold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <item.icon className="w-4 h-4 flex-shrink-0" />
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </div>
                                    {!collapsed && (
                                        <div className="text-gray-400">
                                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </div>
                                    )}
                                </button>

                                {/* Submenu list */}
                                {isOpen && !collapsed && (
                                    <div className="pl-2 space-y-1 border-l-2 border-gray-100 ml-5 my-1">
                                        {item.children?.map((sub) => {
                                            const SubIcon = sub.icon;
                                            return (
                                                <NavLink
                                                    key={sub.path}
                                                    to={sub.path}
                                                    end={sub.exact}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${isActive
                                                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                                        }`
                                                    }
                                                >
                                                    {SubIcon && <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                                                    <span className="truncate">{sub.label}</span>
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Clickable area below nav items to toggle collapse/expand */}
                <div
                    onClick={onToggle}
                    className="flex-1 min-h-[60px] cursor-pointer rounded-xl transition-colors hover:bg-gray-50/80 flex items-end justify-center pb-3 my-2"
                    title={collapsed ? 'Bấm vào đây để mở rộng Sidebar' : 'Bấm vào đây để thu gọn Sidebar'}
                >
                    <span className="text-[10px] font-bold text-gray-300 opacity-0 hover:opacity-100 transition-opacity">
                        {collapsed ? '▶' : '◀ Click để thu gọn'}
                    </span>
                </div>
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-gray-100 space-y-2">
                {!collapsed && (
                    <NavLink
                        to="/"
                        target="_blank"
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                        <Globe className="w-4 h-4" />
                        <span>Trang bán hàng</span>
                    </NavLink>
                )}
            </div>
        </aside>
    );
};