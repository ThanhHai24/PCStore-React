import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Check,
    Package,
    PieChart,
    Copy,
    MapPin,
    RefreshCw,
    AlertCircle,
    Wrench,
    Loader2
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminUserService } from '../../../services/adminUserService';
import type {
    BackendUserResponse,
    BackendRole,
    BackendStatus,
    UserCreateRequest,
    UserUpdateRequest,
} from '../../../types/adminUser';

export interface UserItem {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    citizenIdentificationCard: string;
    role: BackendRole;
    status: BackendStatus;
    avatar: string;
    createdAt: string;
    ordersCount: number;
    totalSpent: string;
}

// Mapper
export const mapBackendUserToItem = (u: BackendUserResponse): UserItem => {
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        u.fullName || u.username
    )}&background=2563eb&color=fff&bold=true&size=128`;

    let formattedDate = 'Chưa cập nhật';
    if (u.createdDate) {
        try {
            formattedDate = new Date(u.createdDate).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            formattedDate = u.createdDate.split('T')[0] || 'Chưa cập nhật';
        }
    }

    return {
        id: String(u.id),
        username: u.username,
        fullName: u.fullName || u.username,
        email: u.email,
        phone: u.phoneNumber || 'Chưa cập nhật',
        address: u.address || 'Chưa cập nhật',
        citizenIdentificationCard: u.citizenIdentificationCard || 'Chưa cập nhật',
        role: u.role || 'CUSTOMER',
        status: u.status || 'ACTIVE',
        avatar: avatarUrl,
        createdAt: formattedDate,
        ordersCount: 0,
        totalSpent: '0 ₫',
    };
};

const ROLE_OPTIONS: Array<{
    role: BackendRole;
    title: string;
    desc: string;
    icon: React.ElementType;
    color: string;
}> = [
        {
            role: 'CUSTOMER',
            title: 'Khách hàng',
            desc: 'Mua sắm & xem đơn hàng',
            icon: User,
            color: 'border-blue-200 bg-blue-50/50 text-blue-700',
        },
        {
            role: 'STAFF_SALES',
            title: 'Nhân viên bán hàng',
            desc: 'Tư vấn & bán hàng',
            icon: UserCheck,
            color: 'border-amber-200 bg-amber-50/50 text-amber-700',
        },
        {
            role: 'STAFF_WAREHOUSE',
            title: 'Thủ kho',
            desc: 'Quản lý & xuất nhập kho',
            icon: Package,
            color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700',
        },
        {
            role: 'STAFF_TECH',
            title: 'Kỹ thuật viên',
            desc: 'Lắp ráp & bảo hành',
            icon: Wrench,
            color: 'border-cyan-200 bg-cyan-50/50 text-cyan-700',
        },
        {
            role: 'MANAGER',
            title: 'Quản lý',
            desc: 'Quản lý & báo cáo',
            icon: PieChart,
            color: 'border-purple-200 bg-purple-50/50 text-purple-700',
        },
        {
            role: 'ADMIN',
            title: 'Quản trị viên',
            desc: 'Toàn quyền hệ thống',
            icon: Shield,
            color: 'border-rose-200 bg-rose-50/50 text-rose-700',
        },
    ];

export const UserList: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const toastRef = useRef(toast);

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    // Data & Pagination States
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalElements, setTotalElements] = useState<number>(0);

    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [filterValues, setFilterValues] = useState<Record<string, any>>({
        role: '',
        status: '',
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [detailUser, setDetailUser] = useState<UserItem | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Delete Confirmation Popup State
    const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Lock/Unlock (Toggle Status) Confirmation Popup State
    const [statusTargetUser, setStatusTargetUser] = useState<UserItem | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

    // Form States
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        citizenIdentificationCard: '',
        role: 'CUSTOMER' as BackendRole,
        status: 'ACTIVE' as BackendStatus,
    });

    const [editFormData, setEditFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        citizenIdentificationCard: '',
        role: 'CUSTOMER' as BackendRole,
        status: 'ACTIVE' as BackendStatus,
    });

    const [roleFormRole, setRoleFormRole] = useState<BackendRole>('CUSTOMER');

    // Fetch users from backend API
    const loadUsers = useCallback(async () => {
        const storedToken = localStorage.getItem('pcstore_token');
        const storedRefresh = localStorage.getItem('pcstore_refresh_token');

        // If completely unauthenticated, avoid spamming the backend API
        if (!storedToken && !storedRefresh) {
            setLoading(false);
            setApiError('Phiên làm việc đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập tài khoản quản trị.');
            setUsers([]);
            setTotalElements(0);
            setTotalPages(1);
            return;
        }

        setLoading(true);
        setApiError(null);
        try {
            const res = await adminUserService.getAllUsers({
                keyword: debouncedSearch.trim() || undefined,
                role: filterValues.role || undefined,
                status: filterValues.status || undefined,
                page: currentPage - 1, // backend is 0-indexed
                size: pageSize,
                sort: ['createdDate,DESC'],
            });

            const content = res.content || [];
            const mappedUsers = content.map(mapBackendUserToItem);
            setUsers(mappedUsers);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements ?? mappedUsers.length);
        } catch (err: any) {
            const message = err.message || 'Không thể tải danh sách tài khoản từ máy chủ.';
            setApiError(message);
            setUsers([]);
            setTotalElements(0);
            setTotalPages(1);

            // Don't spam toast if it's an unauthenticated/session expiration error
            const isAuthError =
                message.includes('Phiên làm việc hết hạn') ||
                message.includes('chưa đăng nhập') ||
                message.includes('quyền quản trị') ||
                message.includes('401') ||
                message.includes('403');

            if (!isAuthError) {
                toastRef.current.error(message, 'Lỗi kết nối máy chủ');
            }
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterValues.role, filterValues.status, currentPage, pageSize]);

    // Re-fetch when dependencies change
    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Reset to page 1 when search or filter values change
    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleFilterChange = (vals: Record<string, any>) => {
        setFilterValues(vals);
        setCurrentPage(1);
    };

    // Copy to clipboard helper
    const handleCopyText = (text: string, fieldKey: string, label: string = 'thông tin') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        toast.info(`Đã sao chép ${label}: "${text}" vào bộ nhớ tạm!`, 'Sao chép thành công');
        setTimeout(() => {
            setCopiedField(null);
        }, 2000);
    };

    // Export CSV
    const handleExportUsers = () => {
        if (users.length === 0) {
            toast.info('Không có dữ liệu người dùng để xuất.', 'Thông báo');
            return;
        }
        const headers = ['ID,Tên đăng nhập,Họ và tên,Email,Số điện thoại,Vai trò,Trạng thái,Ngày tạo'];
        const rows = users.map(
            (u) =>
                `"${u.id}","${u.username}","${u.fullName}","${u.email}","${u.phone}","${u.role}","${u.status}","${u.createdAt}"`
        );
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `danh_sach_nguoi_dung_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Danh sách tài khoản đã được kết xuất ra file CSV thành công!', 'Xuất file thành công');
    };

    // Open detail modal
    const handleOpenDetailModal = (user: UserItem) => {
        setDetailUser(user);
        setIsDetailModalOpen(true);
    };

    // Open edit modal
    const handleOpenEditModal = (user: UserItem) => {
        setEditingUser(user);
        setEditFormData({
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone === 'Chưa cập nhật' ? '' : user.phone,
            password: '',
            address: user.address === 'Chưa cập nhật' ? '' : user.address,
            citizenIdentificationCard:
                user.citizenIdentificationCard === 'Chưa cập nhật' ? '' : user.citizenIdentificationCard,
            role: user.role,
            status: user.status,
        });
        setIsEditModalOpen(true);
    };

    // Open role change modal
    const handleOpenRoleModal = (user: UserItem) => {
        setSelectedUser(user);
        setRoleFormRole(user.role);
        setIsRoleModalOpen(true);
    };

    // Handlers: Add User via Real API
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.fullName.trim() || !formData.email.trim()) {
            toast.error('Vui lòng điền đầy đủ Tên đăng nhập, Họ tên và Email.', 'Dữ liệu chưa đủ');
            return;
        }

        const initialPassword = formData.password.trim() || 'Password123!';
        if (initialPassword.length < 8) {
            toast.error('Mật khẩu khởi tạo phải có ít nhất 8 ký tự.', 'Mật khẩu quá ngắn');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: UserCreateRequest = {
                username: formData.username.trim(),
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                password: initialPassword,
                phoneNumber: formData.phone.trim() || undefined,
                address: formData.address.trim() || undefined,
                citizenIdentificationCard: formData.citizenIdentificationCard.trim() || undefined,
                role: formData.role,
                status: formData.status,
            };

            const created = await adminUserService.createUser(payload);
            toast.success(`Đã thêm mới tài khoản "${created.fullName}" thành công!`, 'Tạo tài khoản');
            setIsAddModalOpen(false);
            setFormData({
                username: '',
                fullName: '',
                email: '',
                phone: '',
                password: '',
                address: '',
                citizenIdentificationCard: '',
                role: 'CUSTOMER',
                status: 'ACTIVE',
            });
            await loadUsers();
        } catch (err: any) {
            toast.error(err.message || 'Thêm người dùng không thành công.', 'Lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handlers: Update User via Real API
    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        if (!editFormData.username.trim() || !editFormData.fullName.trim() || !editFormData.email.trim()) {
            toast.error('Vui lòng điền đầy đủ Tên đăng nhập, Họ tên và Email.', 'Dữ liệu chưa đủ');
            return;
        }

        if (editFormData.password.trim() && editFormData.password.trim().length < 8) {
            toast.error('Mật khẩu mới phải có tối thiểu 8 ký tự.', 'Mật khẩu quá ngắn');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: UserUpdateRequest = {
                username: editFormData.username.trim(),
                fullName: editFormData.fullName.trim(),
                email: editFormData.email.trim(),
                phoneNumber: editFormData.phone.trim() || undefined,
                address: editFormData.address.trim() || undefined,
                citizenIdentificationCard: editFormData.citizenIdentificationCard.trim() || undefined,
                role: editFormData.role,
                status: editFormData.status,
                ...(editFormData.password.trim() ? { password: editFormData.password.trim() } : {}),
            };

            const updated = await adminUserService.updateUser(editingUser.id, payload);
            toast.success(`Đã cập nhật thông tin tài khoản "${updated.fullName}" thành công!`, 'Cập nhật thành công');
            setIsEditModalOpen(false);

            if (detailUser && detailUser.id === editingUser.id) {
                setDetailUser(mapBackendUserToItem(updated));
            }
            await loadUsers();
        } catch (err: any) {
            toast.error(err.message || 'Cập nhật tài khoản thất bại.', 'Lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handlers: Open Lock/Unlock Confirmation Modal
    const handleOpenToggleStatusModal = (user: UserItem) => {
        setStatusTargetUser(user);
    };

    // Handlers: Confirm Toggle status (ACTIVE <-> BANNED) via Real API
    const handleConfirmToggleStatus = async () => {
        if (!statusTargetUser) return;

        setIsTogglingStatus(true);
        const target = statusTargetUser;
        const willBeActive = target.status !== 'ACTIVE';
        const nextStatus: BackendStatus = willBeActive ? 'ACTIVE' : 'BANNED';

        try {
            const updated = await adminUserService.updateUserStatus(target.id, nextStatus);
            if (willBeActive) {
                toast.success(`Đã mở khóa tài khoản "${target.fullName}".`, 'Kích hoạt tài khoản');
            } else {
                toast.warning(`Đã tạm khóa tài khoản "${target.fullName}".`, 'Khóa tài khoản');
            }

            setUsers((prev) =>
                prev.map((u) => (u.id === target.id ? { ...u, status: updated.status } : u))
            );

            if (detailUser && detailUser.id === target.id) {
                setDetailUser({ ...detailUser, status: updated.status });
            }

            setStatusTargetUser(null);
        } catch (err: any) {
            toast.error(err.message || 'Không thể thay đổi trạng thái tài khoản.', 'Lỗi');
        } finally {
            setIsTogglingStatus(false);
        }
    };

    // Handlers: Save Role via Real API
    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setIsSubmitting(true);
        try {
            const payload: UserUpdateRequest = {
                username: selectedUser.username,
                fullName: selectedUser.fullName,
                email: selectedUser.email,
                role: roleFormRole,
            };

            const updated = await adminUserService.updateUser(selectedUser.id, payload);
            toast.success(
                `Đã cập nhật phân quyền "${roleFormRole}" cho tài khoản "${updated.fullName}"!`,
                'Phân quyền thành công'
            );
            setIsRoleModalOpen(false);

            setUsers((prev) =>
                prev.map((u) => (u.id === selectedUser.id ? { ...u, role: updated.role } : u))
            );

            if (detailUser && detailUser.id === selectedUser.id) {
                setDetailUser({ ...detailUser, role: updated.role });
            }
        } catch (err: any) {
            toast.error(err.message || 'Cập nhật phân quyền thất bại.', 'Lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handlers: Delete User via Real API (with confirmation popup)
    const handleOpenDeleteModal = (user: UserItem) => {
        setDeleteTargetUser(user);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetUser) return;

        setIsDeleting(true);
        try {
            await adminUserService.deleteUser(deleteTargetUser.id);
            toast.success(
                `Đã xóa tài khoản "${deleteTargetUser.fullName}" (@${deleteTargetUser.username}) khỏi hệ thống!`,
                'Xóa tài khoản thành công'
            );

            if (detailUser && detailUser.id === deleteTargetUser.id) {
                setIsDetailModalOpen(false);
                setDetailUser(null);
            }
            setDeleteTargetUser(null);
            await loadUsers();
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa tài khoản người dùng.', 'Lỗi xóa tài khoản');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter fields configuration
    const filterFields: FilterField[] = [
        {
            id: 'role',
            label: 'Vai trò',
            placeholder: 'Tất cả vai trò',
            icon: Shield,
            options: [
                { label: 'Tất cả vai trò', value: '' },
                { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                { label: 'Quản lý (MANAGER)', value: 'MANAGER' },
                { label: 'Khách hàng (CUSTOMER)', value: 'CUSTOMER' },
                { label: 'Nhân viên bán hàng (STAFF_SALES)', value: 'STAFF_SALES' },
                { label: 'Thủ kho (STAFF_WAREHOUSE)', value: 'STAFF_WAREHOUSE' },
                { label: 'Kỹ thuật viên (STAFF_TECH)', value: 'STAFF_TECH' },
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái',
            placeholder: 'Tất cả trạng thái',
            icon: Lock,
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
                { label: 'Ngưng hoạt động (INACTIVE)', value: 'INACTIVE' },
                { label: 'Bị khóa/cấm (BANNED)', value: 'BANNED' },
            ],
        },
    ];

    // Helper: Role badge rendering
    const renderRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Shield className="w-3.5 h-3.5 text-rose-600" /> ADMIN
                    </span>
                );
            case 'MANAGER':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <PieChart className="w-3.5 h-3.5 text-purple-600" /> QUẢN LÝ
                    </span>
                );
            case 'STAFF_WAREHOUSE':
            case 'WAREHOUSE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Package className="w-3.5 h-3.5 text-indigo-600" /> THỦ KHO
                    </span>
                );
            case 'STAFF_SALES':
            case 'SALES':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" /> BÁN HÀNG
                    </span>
                );
            case 'STAFF_TECH':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        <Wrench className="w-3.5 h-3.5 text-cyan-600" /> KỸ THUẬT
                    </span>
                );
            case 'STAFF':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> NHÂN VIÊN
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <User className="w-3.5 h-3.5 text-blue-600" /> KHÁCH HÀNG
                    </span>
                );
        }
    };

    // Helper: Status badge rendering
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                    </span>
                );
            case 'BANNED':
            case 'BLOCKED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" /> Bị khóa
                    </span>
                );
            case 'INACTIVE':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" /> Chưa kích hoạt
                    </span>
                );
        }
    };

    // Table columns definition
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
            render: (user) => renderRoleBadge(user.role),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (user) => renderStatusBadge(user.status),
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
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailModal(user);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        title="Xem chi tiết tài khoản"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(user);
                        }}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                        title="Chỉnh sửa tài khoản"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRoleModal(user);
                        }}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
                        title="Phân quyền tài khoản"
                    >
                        <Key className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenToggleStatusModal(user);
                        }}
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
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal(user);
                        }}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-600 transition-colors"
                        title="Xóa tài khoản"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    // Detail Modal Tabs
    const detailModalTabs: ModalTab[] = [
        { id: 'info', label: 'Thông tin cơ bản', icon: User },
        { id: 'contact', label: 'Thông tin liên hệ', icon: Mail },
        { id: 'security', label: 'Bảo mật & Trạng thái', icon: Shield },
    ];

    // Add / Edit Modal Tabs
    const userFormModalTabs: ModalTab[] = [
        { id: 'basic', label: 'Thông tin cơ bản', icon: User },
        { id: 'contact', label: 'Thông tin liên hệ', icon: Mail },
        { id: 'security', label: 'Phân quyền & Trạng thái', icon: Shield },
    ];

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
                        Quản lý người dùng, phân quyền truy cập hệ thống và theo dõi trạng thái tài khoản qua API máy chủ.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadUsers()}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors disabled:opacity-60"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportUsers}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors"
                    >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        <span className="hidden sm:inline">Xuất CSV</span>
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
                                address: '',
                                citizenIdentificationCard: '',
                                role: 'CUSTOMER',
                                status: 'ACTIVE',
                            });
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Thêm tài khoản</span>
                    </button>
                </div>
            </div>

            {/* Error Alert Banner */}
            {apiError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{apiError}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {apiError.includes('đăng nhập') || apiError.includes('hết hạn') ? (
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Đăng nhập lại</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => loadUsers()}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Thử lại</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Reusable Admin Filter Toolbar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Tìm kiếm tài khoản (tên, username, email, SĐT)..."
                fields={filterFields}
                values={filterValues}
                onChange={handleFilterChange}
            />

            {/* User Data Table */}
            <AdminTable
                columns={userTableColumns}
                data={users}
                rowKey="id"
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20]}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                onRowClick={(user) => handleOpenDetailModal(user)}
                itemUnitName="người dùng"
                emptyText={
                    loading
                        ? 'Đang tải danh sách người dùng...'
                        : 'Không tìm thấy tài khoản người dùng nào thỏa mãn điều kiện lọc.'
                }
            />

            {/* MODAL 1: THÊM TÀI KHOẢN MỚI */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title="Thêm tài khoản mới"
                subtitle="Tạo tài khoản quản trị hoặc người dùng mới trực tiếp vào hệ thống"
                icon={Plus}
                size="lg"
                tabs={userFormModalTabs}
                onSubmit={handleAddUser}
                submitText={isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Tên đăng nhập (Username) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="vd: nguyenvana (4 đến 50 ký tự)"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="vd: Nguyễn Văn A"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Mật khẩu khởi tạo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Tối thiểu 8 ký tự (để trống sẽ dùng mặc định: Password123!)"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Mật khẩu được mã hóa an toàn trên hệ thống máy chủ trước khi lưu.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Số Căn cước công dân (CCCD / CMND)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.citizenIdentificationCard}
                                        onChange={(e) =>
                                            setFormData({ ...formData, citizenIdentificationCard: e.target.value })
                                        }
                                        placeholder="vd: 001099012345"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Thông tin liên hệ */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="vd: user@example.com"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Số điện thoại
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="vd: 0912345678"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ liên hệ
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="vd: 123 Nguyễn Trãi, Hà Nội"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Phân quyền & Trạng thái */}
                        {activeTab === 'security' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Chọn vai trò hệ thống
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {ROLE_OPTIONS.map((r) => {
                                            const isSelected = formData.role === r.role;
                                            const IconComp = r.icon;
                                            return (
                                                <button
                                                    key={r.role}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: r.role })}
                                                    className={`p-3 rounded-xl border text-left transition-all ${isSelected
                                                        ? `${r.color} ring-2 ring-blue-500/20 shadow-sm font-bold`
                                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <IconComp className="w-4 h-4" />
                                                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                    </div>
                                                    <div className="text-xs font-bold">{r.title}</div>
                                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                                        {r.desc}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Trạng thái ban đầu
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            {
                                                status: 'ACTIVE' as BackendStatus,
                                                label: 'Hoạt động (ACTIVE)',
                                                color: 'emerald',
                                            },
                                            {
                                                status: 'INACTIVE' as BackendStatus,
                                                label: 'Ngưng (INACTIVE)',
                                                color: 'amber',
                                            },
                                            {
                                                status: 'BANNED' as BackendStatus,
                                                label: 'Khóa (BANNED)',
                                                color: 'rose',
                                            },
                                        ].map((s) => (
                                            <label
                                                key={s.status}
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${formData.status === s.status
                                                    ? `border-${s.color}-300 bg-${s.color}-50/60 font-semibold ring-2 ring-${s.color}-500/20`
                                                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="add-status"
                                                    checked={formData.status === s.status}
                                                    onChange={() => setFormData({ ...formData, status: s.status })}
                                                    className="sr-only"
                                                />
                                                <span className="text-xs">{s.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 2: XEM CHI TIẾT TÀI KHOẢN */}
            <AdminModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={detailUser ? `Chi tiết tài khoản: ${detailUser.fullName}` : 'Chi tiết tài khoản'}
                subtitle={detailUser ? `@${detailUser.username} • Mã: ${detailUser.id}` : undefined}
                icon={Eye}
                size="lg"
                tabs={detailModalTabs}
                footer={
                    detailUser && (
                        <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-gray-500 hidden sm:block">
                                Ngày tham gia: <span className="font-semibold text-gray-700">{detailUser.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleOpenDeleteModal(detailUser);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold text-xs rounded-xl transition-all"
                                    title="Xóa tài khoản này"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa tài khoản</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEditModal(detailUser);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Chỉnh sửa tài khoản</span>
                                </button>
                            </div>
                        </div>
                    )
                }
            >
                {(activeTab) => {
                    if (!detailUser) return null;

                    return (
                        <div>
                            {/* Tab 1: Thông tin cơ bản */}
                            {activeTab === 'info' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-purple-50/50 border border-blue-100/80">
                                        <div className="relative group flex-shrink-0">
                                            <img
                                                src={detailUser.avatar}
                                                alt={detailUser.fullName}
                                                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
                                            />
                                            <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow">
                                                {detailUser.status === 'ACTIVE' ? (
                                                    <span className="flex h-3 w-3 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                                    </span>
                                                ) : (
                                                    <span className="block h-3 w-3 rounded-full bg-rose-500"></span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                                    {detailUser.fullName}
                                                </h3>
                                                {renderRoleBadge(detailUser.role)}
                                                {renderStatusBadge(detailUser.status)}
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                                                <span>@{detailUser.username}</span>
                                                <span>•</span>
                                                <span>Mã ID: {detailUser.id}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Info grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Tên đăng nhập
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 font-mono">
                                                    @{detailUser.username}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailUser.username, 'username', 'Tên đăng nhập')}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Sao chép tên đăng nhập"
                                                >
                                                    {copiedField === 'username' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Mã tài khoản (User ID)
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 font-mono">
                                                    {detailUser.id}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailUser.id, 'id', 'Mã tài khoản')}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Sao chép mã tài khoản"
                                                >
                                                    {copiedField === 'id' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Số CCCD / CMND
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 font-mono">
                                                    {detailUser.citizenIdentificationCard}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Ngày tạo tài khoản
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-900">
                                                    {detailUser.createdAt}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Thông tin liên hệ */}
                            {activeTab === 'contact' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-gray-400">Địa chỉ Email</p>
                                                    <p className="text-xs font-bold text-gray-900">{detailUser.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {detailUser.email !== 'Chưa cập nhật' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyText(detailUser.email, 'email', 'Địa chỉ Email')}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                                                    >
                                                        {copiedField === 'email' ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{copiedField === 'email' ? 'Đã chép' : 'Chép'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-gray-400">Số điện thoại</p>
                                                    <p className="text-xs font-bold text-gray-900">{detailUser.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {detailUser.phone !== 'Chưa cập nhật' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyText(detailUser.phone, 'phone', 'Số điện thoại')}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                                                    >
                                                        {copiedField === 'phone' ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{copiedField === 'phone' ? 'Đã chép' : 'Chép'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                                            <MapPin className="w-4 h-4 text-rose-500" />
                                            <span>Địa chỉ liên hệ</span>
                                        </div>
                                        <p className="text-xs text-gray-600 pl-6">
                                            {detailUser.address}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Bảo mật & Trạng thái */}
                            {activeTab === 'security' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-900">Trạng thái kích hoạt</h4>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Khóa tài khoản sẽ vô hiệu hóa access token và thu hồi phiên đăng nhập
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenToggleStatusModal(detailUser)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${detailUser.status === 'ACTIVE'
                                                    ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                                                    : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                                    }`}
                                            >
                                                {detailUser.status === 'ACTIVE' ? (
                                                    <>
                                                        <Lock className="w-3.5 h-3.5" />
                                                        <span>Khóa tài khoản</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock className="w-3.5 h-3.5" />
                                                        <span>Mở khóa tài khoản</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>


                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* MODAL 3: CHỈNH SỬA TÀI KHOẢN */}
            <AdminModal
                isOpen={isEditModalOpen}
                onClose={() => !isSubmitting && setIsEditModalOpen(false)}
                title={editingUser ? `Chỉnh sửa: ${editingUser.fullName}` : 'Chỉnh sửa tài khoản'}
                subtitle="Cập nhật thông tin tài khoản, phân quyền và trạng thái hoạt động trên máy chủ"
                icon={Edit}
                size="lg"
                tabs={userFormModalTabs}
                onSubmit={handleUpdateUser}
                submitText={isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Tên đăng nhập (Username) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.username}
                                        onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.fullName}
                                        onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        value={editFormData.password}
                                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                        placeholder="Để trống nếu không muốn đổi mật khẩu"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Chỉ điền vào ô này nếu cần đặt lại mật khẩu mới (tối thiểu 8 ký tự).
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Số Căn cước công dân (CCCD / CMND)
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.citizenIdentificationCard}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                citizenIdentificationCard: e.target.value,
                                            })
                                        }
                                        placeholder="vd: 001099012345"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Thông tin liên hệ */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={editFormData.email}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, email: e.target.value })
                                            }
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Số điện thoại
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="tel"
                                            value={editFormData.phone}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, phone: e.target.value })
                                            }
                                            placeholder="vd: 0912345678"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ liên hệ
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.address}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, address: e.target.value })
                                        }
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Phân quyền & Trạng thái */}
                        {activeTab === 'security' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Chọn vai trò hệ thống
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {ROLE_OPTIONS.map((r) => {
                                            const isSelected = editFormData.role === r.role;
                                            const IconComp = r.icon;
                                            return (
                                                <button
                                                    key={r.role}
                                                    type="button"
                                                    onClick={() =>
                                                        setEditFormData({ ...editFormData, role: r.role })
                                                    }
                                                    className={`p-3 rounded-xl border text-left transition-all ${isSelected
                                                        ? `${r.color} ring-2 ring-blue-500/20 shadow-sm font-bold`
                                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <IconComp className="w-4 h-4" />
                                                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                    </div>
                                                    <div className="text-xs font-bold">{r.title}</div>
                                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                                        {r.desc}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Trạng thái tài khoản
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            {
                                                status: 'ACTIVE' as BackendStatus,
                                                label: 'Hoạt động (ACTIVE)',
                                                color: 'emerald',
                                            },
                                            {
                                                status: 'INACTIVE' as BackendStatus,
                                                label: 'Ngưng (INACTIVE)',
                                                color: 'amber',
                                            },
                                            {
                                                status: 'BANNED' as BackendStatus,
                                                label: 'Khóa (BANNED)',
                                                color: 'rose',
                                            },
                                        ].map((s) => (
                                            <label
                                                key={s.status}
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${editFormData.status === s.status
                                                    ? `border-${s.color}-300 bg-${s.color}-50/60 font-semibold ring-2 ring-${s.color}-500/20`
                                                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="edit-status"
                                                    checked={editFormData.status === s.status}
                                                    onChange={() =>
                                                        setEditFormData({ ...editFormData, status: s.status })
                                                    }
                                                    className="sr-only"
                                                />
                                                <span className="text-xs">{s.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 4: PHÂN QUYỀN HẠN NHANH */}
            {isRoleModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Key className="w-5 h-5 text-purple-600" /> Thiết Lập Phân Quyền
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsRoleModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
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
                                {ROLE_OPTIONS.map((r) => (
                                    <button
                                        key={r.role}
                                        type="button"
                                        onClick={() => setRoleFormRole(r.role)}
                                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${roleFormRole === r.role
                                            ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <r.icon className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs">{r.title}</span>
                                        </div>
                                        {roleFormRole === r.role && (
                                            <Check className="w-4 h-4 text-purple-600" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Phân Quyền'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: POPUP XÁC NHẬN XÓA TÀI KHOẢN (Thay thế alert/window.confirm) */}
            <AdminConfirmModal
                isOpen={Boolean(deleteTargetUser)}
                onClose={() => !isDeleting && setDeleteTargetUser(null)}
                onConfirm={handleConfirmDelete}
                variant="danger"
                title="Xác nhận xóa tài khoản"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa tài khoản{' '}
                        <strong className="text-gray-900 font-bold">
                            "{deleteTargetUser?.fullName}"
                        </strong>{' '}
                        khỏi hệ thống?
                    </span>
                }
                description="Hành động này sẽ đánh dấu xóa mềm tài khoản, vô hiệu hóa access token và thu hồi toàn bộ quyền đăng nhập. Thao tác này không thể hoàn tác."
                confirmText="Xác nhận xóa"
                cancelText="Hủy bỏ"
                isLoading={isDeleting}
                itemPreview={
                    deleteTargetUser
                        ? {
                            title: deleteTargetUser.fullName,
                            subtitle: `@${deleteTargetUser.username} • ${deleteTargetUser.email}`,
                            badge: deleteTargetUser.role,
                            avatar: deleteTargetUser.avatar,
                        }
                        : undefined
                }
            />

            {/* MODAL 6: POPUP XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN */}
            <AdminConfirmModal
                isOpen={Boolean(statusTargetUser)}
                onClose={() => !isTogglingStatus && setStatusTargetUser(null)}
                onConfirm={handleConfirmToggleStatus}
                variant={statusTargetUser?.status === 'ACTIVE' ? 'warning' : 'success'}
                icon={statusTargetUser?.status === 'ACTIVE' ? Lock : Unlock}
                title={
                    statusTargetUser?.status === 'ACTIVE'
                        ? 'Xác nhận khóa tài khoản'
                        : 'Xác nhận mở khóa tài khoản'
                }
                message={
                    <span>
                        Bạn có chắc chắn muốn{' '}
                        <strong
                            className={
                                statusTargetUser?.status === 'ACTIVE'
                                    ? 'text-amber-600 font-bold'
                                    : 'text-emerald-600 font-bold'
                            }
                        >
                            {statusTargetUser?.status === 'ACTIVE' ? 'tạm khóa' : 'mở khóa kích hoạt lại'}
                        </strong>{' '}
                        tài khoản{' '}
                        <strong className="text-gray-900 font-bold">
                            "{statusTargetUser?.fullName}"
                        </strong>{' '}
                        (@{statusTargetUser?.username}) không?
                    </span>
                }
                description={
                    statusTargetUser?.status === 'ACTIVE'
                        ? 'Tài khoản sau khi bị khóa sẽ không thể đăng nhập vào hệ thống, các phiên làm việc và mã truy cập hiện tại sẽ bị thu hồi ngay lập tức.'
                        : 'Sau khi mở khóa, người dùng sẽ có thể đăng nhập lại bình thường vào hệ thống với thông tin tài khoản và quyền hạn hiện tại.'
                }
                confirmText={
                    statusTargetUser?.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
                }
                cancelText="Hủy bỏ"
                isLoading={isTogglingStatus}
                itemPreview={
                    statusTargetUser
                        ? {
                            title: statusTargetUser.fullName,
                            subtitle: `@${statusTargetUser.username} • ${statusTargetUser.email}`,
                            badge: statusTargetUser.role,
                            avatar: statusTargetUser.avatar,
                        }
                        : undefined
                }
            />
        </div>
    );
};

export default UserList;