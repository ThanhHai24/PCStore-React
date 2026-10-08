import React, { useState } from 'react';
import {
    Users,
    UserCheck,
    Shield,
    Lock,
    Unlock,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    XCircle,
    X,
    Save,
    Mail,
    Phone,
    Key,
    User,
    ShieldCheck,
    Download,
    Calendar,
    Clock,
    AlertCircle,
    Check
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';

export interface UserItem {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
    status: 'ACTIVE' | 'BLOCKED' | 'UNVERIFIED';
    avatar: string;
    createdAt: string;
    ordersCount: number;
    totalSpent: string;
}

// Mock User Data
const INITIAL_USERS: UserItem[] = [
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },

];

export const UserList: React.FC = () => {
    const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'CUSTOMER' as 'ADMIN' | 'STAFF' | 'CUSTOMER',
        status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED' | 'UNVERIFIED',
    });

    const [roleFormRole, setRoleFormRole] = useState<'ADMIN' | 'STAFF' | 'CUSTOMER'>('CUSTOMER');

    // Filter Definition
    const filterFields: FilterField[] = [
        {
            id: 'role',
            label: 'Vai trò',
            placeholder: 'Tất cả vai trò',
            icon: Shield,
            options: [
                { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                { label: 'Nhân viên (STAFF)', value: 'STAFF' },
                { label: 'Khách hàng (CUSTOMER)', value: 'CUSTOMER' },
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái',
            placeholder: 'Tất cả trạng thái',
            icon: Lock,
            options: [
                { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
                { label: 'Tạm khóa (BLOCKED)', value: 'BLOCKED' },
                { label: 'Chưa xác thực (UNVERIFIED)', value: 'UNVERIFIED' },
            ],
        },
        {
            id: 'createdDate',
            label: 'Ngày tạo',
            type: 'date',
            icon: Calendar,
        },
    ];

    const userTableColumns: Column<UserItem>[] = [
        {
            key: 'user',
            header: 'Người dùng',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                        <p className="font-bold text-gray-900">{user.fullName}</p>
                        <p className="text-[11px] text-gray-400 font-medium">@{user.username}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact',
            header: 'Liên hệ',
            render: (user) => (
                <div>
                    <p className="text-gray-800 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" /> {user.email}
                    </p>
                    <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" /> {user.phone}
                    </p>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Vai trò',
            render: (user) =>
                user.role === 'ADMIN' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> ADMIN
                    </span>
                ) : user.role === 'STAFF' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" /> NHÂN VIÊN
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <User className="w-3.5 h-3.5 text-blue-600" /> KHÁCH HÀNG
                    </span>
                ),
        },
        {
            key: 'orders',
            header: 'Đơn hàng / Chi tiêu',
            render: (user) => (
                <div>
                    <p className="font-bold text-gray-900">{user.ordersCount} đơn mua</p>
                    <p className="text-[11px] font-semibold text-blue-600 mt-0.5">{user.totalSpent}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (user) =>
                user.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                    </span>
                ) : user.status === 'BLOCKED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" /> Đã khóa
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" /> Chưa xác thực
                    </span>
                ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            accessorKey: 'createdAt',
            className: 'font-medium text-gray-600',
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (user) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => handleOpenRoleModal(user)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200 flex items-center gap-1 px-2"
                        title="Phân quyền tài khoản"
                    >
                        <Key className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-1.5 rounded-lg transition-colors border ${user.status === 'ACTIVE'
                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                        title={user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                    >
                        {user.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-600 transition-colors"
                        title="Xóa tài khoản"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    // Filter Logic
    const filteredUsers = users.filter((u) => {
        // Search filter
        const matchesSearch =
            !searchQuery ||
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.phone.includes(searchQuery);

        // Role filter
        const matchesRole = !filterValues.role || u.role === filterValues.role;

        // Status filter
        const matchesStatus = !filterValues.status || u.status === filterValues.status;

        // Date filter
        const matchesDate = !filterValues.createdDate || u.createdAt === filterValues.createdDate;

        return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Handlers
    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: UserItem = {
            id: `u-${Date.now()}`,
            username: formData.username,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone || 'Chưa cập nhật',
            role: formData.role,
            status: formData.status,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            createdAt: new Date().toISOString().split('T')[0],
            ordersCount: 0,
            totalSpent: '0 ₫',
        };
        setUsers([newUser, ...users]);
        setIsAddModalOpen(false);
    };

    const handleToggleStatus = (id: string) => {
        setUsers(
            users.map((u) =>
                u.id === id
                    ? { ...u, status: u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' }
                    : u
            )
        );
    };

    const handleDeleteUser = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
            setUsers(users.filter((u) => u.id !== id));
        }
    };

    const handleOpenRoleModal = (user: UserItem) => {
        setSelectedUser(user);
        setRoleFormRole(user.role);
        setIsRoleModalOpen(true);
    };

    const handleSaveRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setUsers(
            users.map((u) =>
                u.id === selectedUser.id ? { ...u, role: roleFormRole } : u
            )
        );
        setIsRoleModalOpen(false);
    };

    // Metric Summary Calculation
    const totalCount = users.length;
    const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
    const adminStaffCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'STAFF').length;
    const blockedCount = users.filter((u) => u.status === 'BLOCKED').length;

    return (
        <div className="w-full space-y-6 min-w-0 font-sans">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Users className="w-7 h-7 text-blue-600" />
                        <span>Quản lý tài khoản</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Quản lý người dùng, phân quyền truy cập hệ thống và theo dõi trạng thái tài khoản.
                    </p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold">Tổng tài khoản</p>
                        <h3 className="text-xl font-bold text-gray-900">{totalCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold">Đang hoạt động</p>
                        <h3 className="text-xl font-bold text-emerald-600">{activeCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold">Admin & Nhân viên</p>
                        <h3 className="text-xl font-bold text-purple-700">{adminStaffCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold">Tài khoản bị khóa</p>
                        <h3 className="text-xl font-bold text-rose-600">{blockedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Reusable Admin Filter Toolbar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(query) => {
                    setSearchQuery(query);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm kiếm tài khoản"
                fields={filterFields}
                values={filterValues}
                onChange={(vals) => {
                    setFilterValues(vals);
                    setCurrentPage(1);
                }}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => alert('Xuất báo cáo danh sách tài khoản thành công!')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors"
                        >
                            <Download className="w-3.5 h-3.5 text-gray-500" />
                            <span className="hidden sm:inline">Xuất file</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({
                                    username: '',
                                    fullName: '',
                                    email: '',
                                    phone: '',
                                    password: '',
                                    role: 'CUSTOMER',
                                    status: 'ACTIVE',
                                });
                                setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4 text-white" />
                            <span>Thêm tài khoản</span>
                        </button>
                    </div>
                }
            />

            {/* User Data Table */}
            <AdminTable
                columns={userTableColumns}
                data={paginatedUsers}
                rowKey="id"
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={(page) => setCurrentPage(page)}
                itemUnitName="người dùng"
                emptyText="Không tìm thấy tài khoản người dùng nào thỏa điều kiện."
            />

            {/* MODAL 1: THÊM TÀI KHOẢN */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> Thêm Tài Khoản Mới
                            </h2>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên đăng nhập (Username) *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="vd: user123"
                                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và tên *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="vd: Nguyễn Văn A"
                                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="vd: user@pcstore.com"
                                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="vd: 0988.777.666"
                                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Vai trò</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-purple-600"
                                    >
                                        <option value="CUSTOMER">👤 Khách hàng</option>
                                        <option value="STAFF">👷 Nhân viên</option>
                                        <option value="ADMIN">🛡️ ADMIN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="ACTIVE">Hoạt động</option>
                                        <option value="BLOCKED">Tạm khóa</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold bg-[linear-gradient(180deg,#2E9BFB_0%,#1D52E7_100%)] text-white rounded-xl shadow flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Tạo Tài Khoản</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: PHÂN QUYỀN HẠN */}
            {isRoleModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Key className="w-5 h-5 text-purple-600" /> Thiết Lập Phân Quyền
                            </h2>
                            <button type="button" onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRole} className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
                                <img
                                    src={selectedUser.avatar}
                                    alt={selectedUser.fullName}
                                    className="w-10 h-10 rounded-full object-cover border border-purple-200"
                                />
                                <div>
                                    <h3 className="font-bold text-xs text-gray-900">{selectedUser.fullName}</h3>
                                    <p className="text-[11px] text-gray-500">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-800">Chọn vai trò mới:</label>
                                {(['CUSTOMER', 'STAFF', 'ADMIN'] as const).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRoleFormRole(r)}
                                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${roleFormRole === r
                                            ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span>
                                            {r === 'ADMIN' && '🛡️ Quản trị viên (ADMIN)'}
                                            {r === 'STAFF' && '👷 Nhân viên hệ thống (STAFF)'}
                                            {r === 'CUSTOMER' && '👤 Khách hàng thông thường'}
                                        </span>
                                        {roleFormRole === r && <Check className="w-4 h-4 text-purple-600" />}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Lưu Phân Quyền</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;