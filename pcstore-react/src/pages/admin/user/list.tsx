import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
    Briefcase,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminButton,
    AdminLabel,
    type ModalTab,
} from '../../../components/admin/common/modal';
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

export type AccountTabType = 'STAFF' | 'CUSTOMER';

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

const STAFF_ROLES: BackendRole[] = ['ADMIN', 'MANAGER', 'STAFF_SALES', 'STAFF_WAREHOUSE', 'STAFF_TECH'];
const STAFF_ROLE_OPTIONS = ROLE_OPTIONS.filter((r) => r.role !== 'CUSTOMER');

interface UserListProps {
    defaultTab?: AccountTabType;
}

export const UserList: React.FC<UserListProps> = ({ defaultTab }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toast } = useToast();
    const toastRef = useRef(toast);

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    // Active Account Tab: 'STAFF' | 'CUSTOMER'
    const getInitialTab = (): AccountTabType => {
        if (defaultTab) return defaultTab;
        const tabParam = searchParams.get('tab');
        if (tabParam === 'customer' || tabParam === 'customers' || location.pathname.includes('customer')) {
            return 'CUSTOMER';
        }
        return 'STAFF';
    };

    const [accountTab, setAccountTab] = useState<AccountTabType>(getInitialTab);

    // Sync tab when defaultTab or location changes
    useEffect(() => {
        if (defaultTab && defaultTab !== accountTab) {
            setAccountTab(defaultTab);
        } else if (location.pathname.includes('customer') && accountTab !== 'CUSTOMER') {
            setAccountTab('CUSTOMER');
        }
    }, [defaultTab, location.pathname]);

    // Tab counters & overview statistics
    const [staffTotalCount, setStaffTotalCount] = useState<number>(0);
    const [customerTotalCount, setCustomerTotalCount] = useState<number>(0);
    const [staffStats, setStaffStats] = useState({
        total: 0,
        managers: 0,
        operational: 0,
        active: 0,
    });
    const [customerStats, setCustomerStats] = useState({
        total: 0,
        active: 0,
        banned: 0,
    });

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

    // Lock/Unlock Confirmation Popup State
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
        role: (accountTab === 'STAFF' ? 'STAFF_SALES' : 'CUSTOMER') as BackendRole,
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

    const [roleFormRole, setRoleFormRole] = useState<BackendRole>('STAFF_SALES');

    // Load counts and summary statistics in background
    const loadCounts = useCallback(async () => {
        try {
            const [
                customerAllRes,
                customerActiveRes,
                customerBannedRes,
                ...staffResList
            ] = await Promise.all([
                adminUserService.getAllUsers({ role: 'CUSTOMER', size: 1 }).catch(() => null),
                adminUserService.getAllUsers({ role: 'CUSTOMER', status: 'ACTIVE', size: 1 }).catch(() => null),
                adminUserService.getAllUsers({ role: 'CUSTOMER', status: 'BANNED', size: 1 }).catch(() => null),
                ...STAFF_ROLES.map((r) => adminUserService.getAllUsers({ role: r, size: 50 }).catch(() => null)),
            ]);

            if (customerAllRes) {
                const totalCust = customerAllRes.totalElements || 0;
                setCustomerTotalCount(totalCust);
                setCustomerStats({
                    total: totalCust,
                    active: customerActiveRes?.totalElements || 0,
                    banned: customerBannedRes?.totalElements || 0,
                });
            }

            let staffSum = 0;
            let managersCount = 0;
            let opsCount = 0;
            let activeStaffCount = 0;

            staffResList.forEach((r, idx) => {
                const role = STAFF_ROLES[idx];
                const content = r?.content || [];
                const count = r?.totalElements ?? content.length;
                staffSum += count;
                if (role === 'ADMIN' || role === 'MANAGER') {
                    managersCount += count;
                } else {
                    opsCount += count;
                }
                content.forEach((u) => {
                    if (u.status === 'ACTIVE') activeStaffCount++;
                });
            });

            setStaffTotalCount(staffSum);
            setStaffStats({
                total: staffSum,
                managers: managersCount,
                operational: opsCount,
                active: activeStaffCount,
            });
        } catch {
            // Silently ignore background stats loading errors
        }
    }, []);

    // Initial load of counts
    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

    // Fetch users from backend API depending on active tab
    const loadUsers = useCallback(async () => {
        const storedToken = localStorage.getItem('pcstore_token');
        const storedRefresh = localStorage.getItem('pcstore_refresh_token');

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
            if (accountTab === 'CUSTOMER') {
                // Fetch Customers directly via backend role filter
                const res = await adminUserService.getAllUsers({
                    keyword: debouncedSearch.trim() || undefined,
                    role: 'CUSTOMER',
                    status: filterValues.status || undefined,
                    page: currentPage - 1,
                    size: pageSize,
                    sort: ['createdDate,DESC'],
                });

                const content = res.content || [];
                const mappedUsers = content.map(mapBackendUserToItem);
                setUsers(mappedUsers);
                setTotalPages(res.totalPages || 1);
                setTotalElements(res.totalElements ?? mappedUsers.length);

                if (!debouncedSearch.trim() && !filterValues.status) {
                    setCustomerTotalCount(res.totalElements ?? mappedUsers.length);
                }
            } else {
                // accountTab === 'STAFF'
                if (filterValues.role) {
                    // Filter by specific staff role
                    const res = await adminUserService.getAllUsers({
                        keyword: debouncedSearch.trim() || undefined,
                        role: filterValues.role,
                        status: filterValues.status || undefined,
                        page: currentPage - 1,
                        size: pageSize,
                        sort: ['createdDate,DESC'],
                    });

                    const content = res.content || [];
                    const mappedUsers = content.map(mapBackendUserToItem);
                    setUsers(mappedUsers);
                    setTotalPages(res.totalPages || 1);
                    setTotalElements(res.totalElements ?? mappedUsers.length);
                } else {
                    // All Staff roles: fetch all staff roles in parallel to prevent customer data pollution
                    const staffResList = await Promise.all(
                        STAFF_ROLES.map((r) =>
                            adminUserService.getAllUsers({
                                keyword: debouncedSearch.trim() || undefined,
                                role: r,
                                status: filterValues.status || undefined,
                                page: 0,
                                size: 100,
                                sort: ['createdDate,DESC'],
                            })
                        )
                    );

                    const allItems: UserItem[] = [];
                    staffResList.forEach((r) => {
                        (r.content || []).forEach((u) => {
                            allItems.push(mapBackendUserToItem(u));
                        });
                    });

                    // Deduplicate by ID
                    const uniqueItems = Array.from(new Map(allItems.map((item) => [item.id, item])).values());
                    // Sort DESC by ID
                    uniqueItems.sort((a, b) => Number(b.id) - Number(a.id));

                    const startIndex = (currentPage - 1) * pageSize;
                    const paged = uniqueItems.slice(startIndex, startIndex + pageSize);

                    setUsers(paged);
                    setTotalElements(uniqueItems.length);
                    setTotalPages(Math.max(1, Math.ceil(uniqueItems.length / pageSize)));

                    if (!debouncedSearch.trim() && !filterValues.status) {
                        setStaffTotalCount(uniqueItems.length);
                    }
                }
            }
        } catch (err: any) {
            const message = err.message || 'Không thể tải danh sách tài khoản từ máy chủ.';
            setApiError(message);
            setUsers([]);
            setTotalElements(0);
            setTotalPages(1);

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
    }, [accountTab, debouncedSearch, filterValues.role, filterValues.status, currentPage, pageSize]);

    // Trigger loadUsers whenever criteria change
    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Handle Tab Switch
    const handleTabChange = (newTab: AccountTabType) => {
        if (newTab === accountTab) return;
        setAccountTab(newTab);
        setSearchQuery('');
        setDebouncedSearch('');
        setFilterValues({ role: '', status: '' });
        setCurrentPage(1);

        // Update URL search query without reloading
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', newTab.toLowerCase());
        setSearchParams(newParams, { replace: true });
    };

    // Reset page on search or filter change
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
            toast.info(`Không có dữ liệu ${accountTab === 'STAFF' ? 'nhân viên' : 'khách hàng'} để xuất.`, 'Thông báo');
            return;
        }

        const isStaff = accountTab === 'STAFF';
        const headers = isStaff
            ? ['ID,Tên đăng nhập,Họ và tên,Email,Số điện thoại,Số CCCD,Vai trò,Trạng thái,Ngày tham gia']
            : ['ID,Tên đăng nhập,Họ và tên,Email,Số điện thoại,Địa chỉ,Trạng thái,Ngày đăng ký'];

        const rows = users.map((u) =>
            isStaff
                ? `"${u.id}","${u.username}","${u.fullName}","${u.email}","${u.phone}","${u.citizenIdentificationCard}","${u.role}","${u.status}","${u.createdAt}"`
                : `"${u.id}","${u.username}","${u.fullName}","${u.email}","${u.phone}","${u.address}","${u.status}","${u.createdAt}"`
        );

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `${isStaff ? 'danh_sach_nhan_vien' : 'danh_sach_khach_hang'}_${new Date().toISOString().split('T')[0]}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
            `Danh sách ${isStaff ? 'nhân viên' : 'khách hàng'} đã được xuất ra file CSV thành công!`,
            'Xuất file thành công'
        );
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

    // Open role modal
    const handleOpenRoleModal = (user: UserItem) => {
        setSelectedUser(user);
        setRoleFormRole(user.role);
        setIsRoleModalOpen(true);
    };

    // Add User via API
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
            const targetRole = accountTab === 'CUSTOMER' ? 'CUSTOMER' : formData.role;
            const payload: UserCreateRequest = {
                username: formData.username.trim(),
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                password: initialPassword,
                phoneNumber: formData.phone.trim() || undefined,
                address: formData.address.trim() || undefined,
                citizenIdentificationCard: formData.citizenIdentificationCard.trim() || undefined,
                role: targetRole,
                status: formData.status,
            };

            const created = await adminUserService.createUser(payload);
            const isStaff = accountTab === 'STAFF';
            toast.success(
                `Đã thêm mới ${isStaff ? 'nhân viên' : 'khách hàng'} "${created.fullName}" thành công!`,
                'Tạo tài khoản'
            );
            setIsAddModalOpen(false);
            setFormData({
                username: '',
                fullName: '',
                email: '',
                phone: '',
                password: '',
                address: '',
                citizenIdentificationCard: '',
                role: isStaff ? 'STAFF_SALES' : 'CUSTOMER',
                status: 'ACTIVE',
            });
            await loadUsers();
            loadCounts();
        } catch (err: any) {
            toast.error(err.message || 'Thêm tài khoản không thành công.', 'Lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update User via API
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
            loadCounts();
        } catch (err: any) {
            toast.error(err.message || 'Cập nhật tài khoản thất bại.', 'Lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Lock/Unlock Confirmation Modal
    const handleOpenToggleStatusModal = (user: UserItem) => {
        setStatusTargetUser(user);
    };

    // Confirm Toggle status (ACTIVE <-> BANNED)
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
            loadCounts();
        } catch (err: any) {
            toast.error(err.message || 'Không thể thay đổi trạng thái tài khoản.', 'Lỗi');
        } finally {
            setIsTogglingStatus(false);
        }
    };

    // Save Role via API
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
                `Đã cập nhật vai trò "${roleFormRole}" cho tài khoản "${updated.fullName}"!`,
                'Phân quyền thành công'
            );
            setIsRoleModalOpen(false);

            setUsers((prev) =>
                prev.map((u) => (u.id === selectedUser.id ? { ...u, role: updated.role } : u))
            );

            if (detailUser && detailUser.id === selectedUser.id) {
                setDetailUser({ ...detailUser, role: updated.role });
            }

            // If a customer was promoted to staff or vice versa, reload data
            await loadUsers();
            loadCounts();
        } catch (err: any) {
            toast.error(err.message || 'Cập nhật phân quyền thất bại.', 'Lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete User via API
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
            loadCounts();
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa tài khoản người dùng.', 'Lỗi xóa tài khoản');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter fields configuration for Staff Tab
    const staffFilterFields: FilterField[] = [
        {
            id: 'role',
            label: 'Vai trò nhân viên',
            placeholder: 'Tất cả vai trò nhân viên',
            icon: Shield,
            options: [
                { label: 'Tất cả vai trò nhân viên', value: '' },
                { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                { label: 'Quản lý (MANAGER)', value: 'MANAGER' },
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

    // Filter fields configuration for Customer Tab
    const customerFilterFields: FilterField[] = [
        {
            id: 'status',
            label: 'Trạng thái tài khoản',
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

    // Table columns for STAFF
    const staffTableColumns: Column<UserItem>[] = [
        {
            key: 'user',
            header: 'Nhân viên',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                    />
                    <div>
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{user.fullName}</p>
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
                    <p className="text-gray-800 flex items-center gap-1 text-xs">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" /> {user.email}
                    </p>
                    <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {user.phone}
                    </p>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Vai trò / Chức vụ',
            render: (user) => renderRoleBadge(user.role),
        },
        {
            key: 'citizenIdentificationCard',
            header: 'Số CCCD',
            render: (user) => (
                <span className="text-xs font-mono text-gray-700">
                    {user.citizenIdentificationCard !== 'Chưa cập nhật' ? (
                        user.citizenIdentificationCard
                    ) : (
                        <span className="text-gray-400 italic">Chưa có</span>
                    )}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (user) => renderStatusBadge(user.status),
        },
        {
            key: 'createdAt',
            header: 'Ngày tham gia',
            accessorKey: 'createdAt',
            className: 'font-medium text-gray-600 text-xs',
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (user) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetailModal(user)}
                    viewLabel="Xem chi tiết nhân viên"
                    onEdit={() => handleOpenEditModal(user)}
                    editLabel="Chỉnh sửa thông tin"
                    moreActions={[
                        {
                            key: 'role',
                            label: 'Phân quyền chức vụ',
                            description: 'Thay đổi chức vụ truy cập hệ thống',
                            icon: Key,
                            variant: 'primary',
                            onClick: () => handleOpenRoleModal(user),
                        },
                        {
                            key: 'toggle-status',
                            label: user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
                            description:
                                user.status === 'ACTIVE'
                                    ? 'Tạm ngưng quyền truy cập'
                                    : 'Khôi phục quyền truy cập',
                            icon: user.status === 'ACTIVE' ? Lock : Unlock,
                            variant: user.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: () => handleOpenToggleStatusModal(user),
                        },
                    ]}
                    onDelete={() => handleOpenDeleteModal(user)}
                    deleteLabel="Xóa tài khoản"
                    deleteDescription="Xóa nhân viên khỏi hệ thống"
                />
            ),
        },
    ];

    // Table columns for CUSTOMER
    const customerTableColumns: Column<UserItem>[] = [
        {
            key: 'user',
            header: 'Khách hàng',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                    />
                    <div>
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{user.fullName}</p>
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
                    <p className="text-gray-800 flex items-center gap-1 text-xs">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" /> {user.email}
                    </p>
                    <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {user.phone}
                    </p>
                </div>
            ),
        },
        {
            key: 'address',
            header: 'Địa chỉ giao hàng',
            render: (user) => (
                <div className="max-w-xs truncate text-xs text-gray-700 flex items-center gap-1" title={user.address}>
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">
                        {user.address !== 'Chưa cập nhật' ? (
                            user.address
                        ) : (
                            <span className="text-gray-400 italic">Chưa cập nhật</span>
                        )}
                    </span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (user) => renderStatusBadge(user.status),
        },
        {
            key: 'createdAt',
            header: 'Ngày đăng ký',
            accessorKey: 'createdAt',
            className: 'font-medium text-gray-600 text-xs',
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (user) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetailModal(user)}
                    viewLabel="Xem chi tiết khách hàng"
                    onEdit={() => handleOpenEditModal(user)}
                    editLabel="Chỉnh sửa thông tin"
                    moreActions={[
                        {
                            key: 'role',
                            label: 'Nâng quyền nhân viên',
                            description: 'Chuyển tài khoản khách thành nhân viên',
                            icon: ShieldCheck,
                            variant: 'primary',
                            onClick: () => handleOpenRoleModal(user),
                        },
                        {
                            key: 'toggle-status',
                            label: user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
                            description:
                                user.status === 'ACTIVE'
                                    ? 'Tạm ngưng quyền đăng nhập'
                                    : 'Khôi phục quyền đăng nhập',
                            icon: user.status === 'ACTIVE' ? Lock : Unlock,
                            variant: user.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: () => handleOpenToggleStatusModal(user),
                        },
                    ]}
                    onDelete={() => handleOpenDeleteModal(user)}
                    deleteLabel="Xóa tài khoản"
                    deleteDescription="Xóa khách hàng khỏi hệ thống"
                />
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

    const isStaffTab = accountTab === 'STAFF';

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
                        {isStaffTab
                            ? 'Quản lý tài khoản nhân viên, phân quyền chức vụ và giám sát hoạt động nhân sự.'
                            : 'Quản lý danh sách khách hàng, thông tin giao hàng và trạng thái tài khoản người dùng.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            loadUsers();
                            loadCounts();
                        }}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportUsers}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors cursor-pointer"
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
                                role: isStaffTab ? 'STAFF_SALES' : 'CUSTOMER',
                                status: 'ACTIVE',
                            });
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        <span>{isStaffTab ? 'Thêm nhân viên' : 'Thêm khách hàng'}</span>
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
                                onClick={() => {
                                    loadUsers();
                                    loadCounts();
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Thử lại</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* TAB SWITCHER: 2 TABS NHÂN VIÊN & KHÁCH HÀNG */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs w-fit">
                <button
                    type="button"
                    onClick={() => handleTabChange('STAFF')}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isStaffTab
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                    <ShieldCheck className={`w-4 h-4 ${isStaffTab ? 'text-white' : 'text-blue-600'}`} />
                    <span>Nhân viên</span>
                    <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                            isStaffTab ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                        }`}
                    >
                        {staffTotalCount}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('CUSTOMER')}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !isStaffTab
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                    <Users className={`w-4 h-4 ${!isStaffTab ? 'text-white' : 'text-emerald-600'}`} />
                    <span>Khách hàng</span>
                    <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                            !isStaffTab ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                        }`}
                    >
                        {customerTotalCount}
                    </span>
                </button>
            </div>

            {/* STATS OVERVIEW CARDS */}
            {isStaffTab ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tổng nhân viên</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{staffStats.total || staffTotalCount}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <PieChart className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Quản lý & Điều hành</p>
                            <p className="text-xl font-bold text-purple-700 mt-0.5">{staffStats.managers}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vận hành & Kỹ thuật</p>
                            <p className="text-xl font-bold text-cyan-700 mt-0.5">{staffStats.operational}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Đang hoạt động</p>
                            <p className="text-xl font-bold text-emerald-700 mt-0.5">{staffStats.active}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tổng khách hàng</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{customerStats.total || customerTotalCount}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Đang hoạt động</p>
                            <p className="text-xl font-bold text-emerald-700 mt-0.5">{customerStats.active}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tài khoản bị khóa</p>
                            <p className="text-xl font-bold text-rose-700 mt-0.5">{customerStats.banned}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reusable Admin Filter Toolbar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                searchPlaceholder={
                    isStaffTab
                        ? 'Tìm kiếm nhân viên (tên, username, email, SĐT)...'
                        : 'Tìm kiếm khách hàng (tên, username, email, SĐT)...'
                }
                fields={isStaffTab ? staffFilterFields : customerFilterFields}
                values={filterValues}
                onChange={handleFilterChange}
            />

            {/* Data Table */}
            <AdminTable
                columns={isStaffTab ? staffTableColumns : customerTableColumns}
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
                itemUnitName={isStaffTab ? 'nhân viên' : 'khách hàng'}
                emptyText={
                    loading
                        ? `Đang tải danh sách ${isStaffTab ? 'nhân viên' : 'khách hàng'}...`
                        : `Không tìm thấy tài khoản ${isStaffTab ? 'nhân viên' : 'khách hàng'} nào thỏa mãn điều kiện lọc.`
                }
            />

            {/* MODAL 1: THÊM TÀI KHOẢN MỚI */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title={isStaffTab ? 'Thêm nhân viên mới' : 'Thêm khách hàng mới'}
                subtitle={
                    isStaffTab
                        ? 'Tạo tài khoản nhân viên mới phục vụ quản trị và vận hành hệ thống'
                        : 'Tạo tài khoản khách hàng mới cho hệ thống'
                }
                icon={Plus}
                size="lg"
                tabs={userFormModalTabs}
                onSubmit={handleAddUser}
                submitText={
                    isSubmitting
                        ? 'Đang tạo...'
                        : isStaffTab
                        ? 'Tạo tài khoản nhân viên'
                        : 'Tạo tài khoản khách hàng'
                }
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <AdminInput
                                    label="Tên đăng nhập (Username)"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="vd: nguyenvana (4 đến 50 ký tự)"
                                />
                                <AdminInput
                                    label="Họ và tên"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="vd: Nguyễn Văn A"
                                />
                                <AdminInput
                                    label="Mật khẩu khởi tạo"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Tối thiểu 8 ký tự (để trống sẽ dùng mặc định: Password123!)"
                                    helperText="Mật khẩu được mã hóa an toàn trên hệ thống máy chủ trước khi lưu."
                                />
                                <AdminInput
                                    label="Số Căn cước công dân (CCCD / CMND)"
                                    value={formData.citizenIdentificationCard}
                                    onChange={(e) =>
                                        setFormData({ ...formData, citizenIdentificationCard: e.target.value })
                                    }
                                    placeholder="vd: 001099012345"
                                />
                            </div>
                        )}

                        {/* Tab 2: Thông tin liên hệ */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <AdminInput
                                    label="Địa chỉ Email"
                                    required
                                    type="email"
                                    prefixIcon={Mail}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="vd: user@example.com"
                                />
                                <AdminInput
                                    label="Số điện thoại"
                                    type="tel"
                                    prefixIcon={Phone}
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="vd: 0912345678"
                                />
                                <AdminInput
                                    label={isStaffTab ? 'Địa chỉ liên hệ' : 'Địa chỉ giao hàng mặc định'}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="vd: 123 Nguyễn Trãi, Hà Nội"
                                />
                            </div>
                        )}

                        {/* Tab 3: Phân quyền & Trạng thái */}
                        {activeTab === 'security' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                {isStaffTab ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                            Chọn vai trò nhân viên
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {STAFF_ROLE_OPTIONS.map((r) => {
                                                const isSelected = formData.role === r.role;
                                                const IconComp = r.icon;
                                                return (
                                                    <button
                                                        key={r.role}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, role: r.role })}
                                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                            isSelected
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
                                ) : (
                                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-blue-900">Vai trò: Khách hàng (CUSTOMER)</h4>
                                            <p className="text-[11px] text-blue-700/80 mt-0.5">
                                                Tài khoản sẽ được cấp quyền mua hàng trực tuyến, theo dõi đơn hàng và tra cứu bảo hành.
                                            </p>
                                        </div>
                                    </div>
                                )}

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
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                    formData.status === s.status
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
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleOpenDeleteModal(detailUser)}
                                    icon={Trash2}
                                >
                                    Xóa tài khoản
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEditModal(detailUser);
                                    }}
                                    icon={Edit}
                                >
                                    Chỉnh sửa
                                </AdminButton>
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
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
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
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
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
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors cursor-pointer"
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
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors cursor-pointer"
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
                                            <span>{isStaffTab ? 'Địa chỉ liên hệ' : 'Địa chỉ giao hàng'}</span>
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
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                                    detailUser.status === 'ACTIVE'
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
                                <AdminInput
                                    label="Tên đăng nhập (Username)"
                                    required
                                    value={editFormData.username}
                                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                />
                                <AdminInput
                                    label="Họ và tên"
                                    required
                                    value={editFormData.fullName}
                                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                />
                                <AdminInput
                                    label="Mật khẩu mới"
                                    type="password"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                    placeholder="Để trống nếu không muốn đổi mật khẩu"
                                    helperText="Chỉ điền vào ô này nếu cần đặt lại mật khẩu mới (tối thiểu 8 ký tự)."
                                />
                                <AdminInput
                                    label="Số Căn cước công dân (CCCD / CMND)"
                                    value={editFormData.citizenIdentificationCard}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            citizenIdentificationCard: e.target.value,
                                        })
                                    }
                                    placeholder="vd: 001099012345"
                                />
                            </div>
                        )}

                        {/* Tab 2: Thông tin liên hệ */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <AdminInput
                                    label="Địa chỉ Email"
                                    required
                                    type="email"
                                    prefixIcon={Mail}
                                    value={editFormData.email}
                                    onChange={(e) =>
                                        setEditFormData({ ...editFormData, email: e.target.value })
                                    }
                                />
                                <AdminInput
                                    label="Số điện thoại"
                                    type="tel"
                                    prefixIcon={Phone}
                                    value={editFormData.phone}
                                    onChange={(e) =>
                                        setEditFormData({ ...editFormData, phone: e.target.value })
                                    }
                                    placeholder="vd: 0912345678"
                                />
                                <AdminInput
                                    label={isStaffTab ? 'Địa chỉ liên hệ' : 'Địa chỉ giao hàng'}
                                    value={editFormData.address}
                                    onChange={(e) =>
                                        setEditFormData({ ...editFormData, address: e.target.value })
                                    }
                                    placeholder="vd: 123 Nguyễn Trãi, Hà Nội"
                                />
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
                                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                        isSelected
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
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                    editFormData.status === s.status
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
                <AdminModal
                    isOpen={isRoleModalOpen}
                    onClose={() => !isSubmitting && setIsRoleModalOpen(false)}
                    title="Thiết Lập Phân Quyền"
                    icon={Key}
                    size="sm"
                    footer={
                        <div className="flex items-center justify-end gap-3 w-full">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsRoleModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleSaveRole}
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                                loadingText="Đang lưu..."
                                icon={Save}
                            >
                                Lưu Phân Quyền
                            </AdminButton>
                        </div>
                    }
                >
                    <div className="space-y-4">
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
                            <AdminLabel>Chọn vai trò mới:</AdminLabel>
                            {ROLE_OPTIONS.map((r) => (
                                <button
                                    key={r.role}
                                    type="button"
                                    onClick={() => setRoleFormRole(r.role)}
                                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                        roleFormRole === r.role
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
                    </div>
                </AdminModal>
            )}

            {/* MODAL 5: POPUP XÁC NHẬN XÓA TÀI KHOẢN */}
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
